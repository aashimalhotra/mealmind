# Proxmox Deployment Runbook - MealMind

## Prerequisites

- Proxmox VE 8.x host with:
  - At least 4GB RAM available for containers
  - 20GB storage available
  - Network access to Tailscale subnet
- Tailscale account and auth key
- Domain name pointing to Tailscale IP (optional, Caddy can handle local access)

## Architecture

```
┌─────────────────────────────────────────────────┐
│              Proxmox Host                       │
│                                                 │
│  ┌──────────────────────────────────────────┐  │
│  │         LXC Container (Debian 12)         │  │
│  │                                          │  │
│  │  ┌─────────┐  ┌─────────┐  ┌─────────┐  │  │
│  │  │  Caddy  │  │  API    │  │  Web    │  │  │
│  │  │ :80/443 │  │ :8000   │  │ :5173   │  │  │
│  │  └────┬────┘  └────┬───┘  └────┬───┘  │  │
│  │       │             │           │        │  │
│  │       └─────────────┴───────────┘        │  │
│  │              Docker Compose               │  │
│  └──────────────────────────────────────────┘  │
│                                                 │
└─────────────────────────────────────────────────┘
```

## Step 1: Create LXC Container

```bash
# On Proxmox host
pct create 100 local:vztmpl/debian-12-standard-amd64.tar.zst \
  --cores 2 \
  --memory 4096 \
  --swap 1024 \
  --rootfs local-lvm:20 \
  --net0 name=eth0,bridge=vmbr0,ip=dhcp \
  --hostname mealmind \
  --unprivileged 1

pct start 100
pct enter 100
```

## Step 2: Install Dependencies in Container

```bash
# Inside LXC container
apt update && apt upgrade -y

# Install Docker
install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/debian/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
chmod a+r /etc/apt/keyrings/docker.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/debian $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null
apt update
apt install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

# Install Tailscale
curl -fsSL https://tailscale.com/install.sh | sh

# Install Node.js 20 LTS and pnpm
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs
npm install -g pnpm

# Install git
apt install -y git
```

## Step 3: Setup Tailscale

```bash
# Inside LXC container
tailscale up --advertise-exit-node --ssh

# Note the Tailscale IP (e.g., 100.64.1.2)
tailscale ip -4
```

## Step 4: Clone and Build MealMind

```bash
# Inside LXC container
cd /opt
git clone https://github.com/YOUR_USERNAME/mealmind.git
cd mealmind

# Checkout production branch
git checkout main

# Copy environment files
cp .env.example .env
# Edit .env with production values
nano .env

# Build frontend
cd frontend
pnpm install
pnpm build
cd ..

# Build and start with production compose
docker compose -f docker-compose.yml -f docker-compose.prod.yml build
```

## Step 5: Configure Caddy

```bash
# Inside LXC container
mkdir -p /opt/mealmind/deploy/caddy

# Create Caddyfile
cat > /opt/mealmind/deploy/caddy/Caddyfile << 'EOF'
# MealMind Production Caddyfile
# Serves on Tailscale interface

:80 {
    # API backend
    handle_path /api/* {
        reverse_proxy mealmind-api:8000
    }

    # WebSocket for SSE
    handle_path /api/plans/generate {
        reverse_proxy mealmind-api:8000 {
            flush_interval -1
        }
    }

    # Static frontend
    handle {
        reverse_proxy mealmind-web:5173
    }
}
EOF
```

## Step 6: Start Services

```bash
# Inside LXC container
cd /opt/mealmind

# Create external network for container communication
docker network create mealmind-net || true

# Start with production overlay
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d

# Verify services are running
docker compose ps

# Check logs
docker compose logs -f
```

## Step 7: Verify Deployment

```bash
# Check if services are accessible via Tailscale IP
curl http://TAILSCALE_IP/api/health

# Check frontend
curl http://TAILSCALE_IP/

# Run Lighthouse audit (from local machine with access to Tailscale)
npx lighthouse http://TAILSCALE_IP --preset=desktop --only-categories=pwa
```

## Step 8: SSL/TLS with Caddy (Optional)

If you have a domain name:

```bash
# Update Caddyfile to use domain
cat > /opt/mealmind/deploy/caddy/Caddyfile << 'EOF'
your-domain.com {
    tls internal

    handle_path /api/* {
        reverse_proxy mealmind-api:8000
    }

    handle_path /api/plans/generate {
        reverse_proxy mealmind-api:8000 {
            flush_interval -1
        }
    }

    handle {
        reverse_proxy mealmind-web:5173
    }
}
EOF

# Restart Caddy
docker compose restart caddy
```

## Maintenance

### View Logs
```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml logs -f [service_name]
```

### Restart Services
```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml restart [service_name]
```

### Update Deployment
```bash
cd /opt/mealmind
git pull origin main
cd frontend && pnpm install && pnpm build && cd ..
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
```

### Backup Database
```bash
# SQLite backup (if using SQLite)
docker cp mealmind-api:/app/data/mealmind.db /opt/backups/mealmind-$(date +%Y%m%d).db

# Or use the backup script (see backup script documentation)
```

## Troubleshooting

### Container can't access internet
```bash
# Check DNS
pct exec 100 -- cat /etc/resolv.conf

# Check Tailscale status
pct exec 100 -- tailscale status
```

### Services not starting
```bash
# Check Docker logs
pct exec 100 -- docker compose logs mealmind-api
pct exec 100 -- docker compose logs mealmind-web
```

### Caddy can't connect to backend
```bash
# Verify Docker network
pct exec 100 -- docker network inspect mealmind_default

# Test internal connectivity
pct exec 100 -- docker exec mealmind-web curl http://mealmind-api:8000/api/health
```

## Rollback Procedure

```bash
# If deployment fails, rollback to previous version
cd /opt/mealmind
git log --oneline -5  # Find last working commit
git checkout <previous_commit>
cd frontend && pnpm build && cd ..
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
```
