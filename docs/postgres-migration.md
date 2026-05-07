# PostgreSQL Migration Notes

This document outlines the steps required to migrate MealMind from SQLite to PostgreSQL for production deployment.

## Why Migrate?

- **Concurrency**: PostgreSQL handles concurrent connections better than SQLite
- **Scalability**: Better performance with multiple workers (Gunicorn)
- **JSON Support**: Native JSONB type for plan_data field
- **Backup**: Standard `pg_dump` tooling
- **Extensions**: Potential for vector extensions (pgvector) for recipe similarity

## Pre-Migration Checklist

1. [ ] Verify all SQLAlchemy models are compatible with PostgreSQL
2. [ ] Update `backend/app/database.py` to support PostgreSQL connection
3. [ ] Test all queries with PostgreSQL - SQLite and PostgreSQL have subtle differences
4. [ ] Plan downtime window (migration requires database lock)
5. [ ] Create full SQLite backup before starting

## Step 1: Update Dependencies

```bash
cd backend
# Add PostgreSQL driver
poetry add psycopg2-binary  # or psycopg[binary]
# or if using pip
pip install psycopg2-binary
```

Update `pyproject.toml`:
```toml
[tool.poetry.dependencies]
psycopg2-binary = "^2.9"
```

## Step 2: Update Database Configuration

Create `backend/app/database.py` with multi-database support:

```python
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.ext.declarative import declarative_base
import os

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./data/mealmind.db")

# Detect if using SQLite
IS_SQLITE = DATABASE_URL.startswith("sqlite")

# Configure engine based on database type
if IS_SQLITE:
    engine = create_engine(
        DATABASE_URL,
        connect_args={"check_same_thread": False},
        echo=False
    )
else:
    # PostgreSQL configuration
    engine = create_engine(
        DATABASE_URL,
        pool_size=10,
        max_overrides=20,
        pool_pre_ping=True,
        echo=False
    )

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
```

## Step 3: Update Environment Configuration

Update `.env` for PostgreSQL:

```env
# SQLite (development)
# DATABASE_URL=sqlite:///./data/mealmind.db

# PostgreSQL (production)
DATABASE_URL=postgresql://mealmind:secure_password@localhost:5432/mealmind
```

Update `docker-compose.prod.yml` to add PostgreSQL service:

```yaml
services:
  mealmind-db:
    image: postgres:16-alpine
    restart: unless-stopped
    environment:
      POSTGRES_USER: mealmind
      POSTGRES_PASSWORD: ${DB_PASSWORD}  # Set in .env
      POSTGRES_DB: mealmind
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U mealmind"]
      interval: 10s
      timeout: 5s
      retries: 5

  mealmind-api:
    # ... existing config ...
    depends_on:
      mealmind-db:
        condition: service_healthy
    environment:
      DATABASE_URL: "postgresql://mealmind:${DB_PASSWORD}@mealmind-db:5432/mealmind"
    # ... rest of config ...

volumes:
  postgres_data:
```

## Step 4: Schema Compatibility

### Known Differences

1. **Auto-increment**: SQLite uses `INTEGER PRIMARY KEY AUTOINCREMENT`, PostgreSQL uses `SERIAL` or `GENERATED ALWAYS AS IDENTITY`
2. **JSON**: SQLite uses `JSON`, PostgreSQL should use `JSONB` for better performance
3. **Case sensitivity**: PostgreSQL is case-sensitive for string comparisons by default
4. **Concurrent writes**: SQLite uses write locks, PostgreSQL uses MVCC

### Update Models for PostgreSQL

In `backend/app/models.py`:

```python
from sqlalchemy import Column, Integer, String, JSON, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.sql import func

class Plan(Base):
    __tablename__ = "plans"

    id = Column(String, primary_key=True, index=True)
    user_id = Column(String, index=True)
    # Use JSONB for PostgreSQL, fallback to JSON for SQLite
    plan_data = Column(JSONB if not IS_SQLITE else JSON)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
```

## Step 5: Data Migration

### Export SQLite Data

```bash
# Using Python script for accurate conversion
cat > /tmp/export_sqlite.py << 'EOF'
import sqlite3
import json

conn = sqlite3.connect('/opt/mealmind/backend/data/mealmind.db')
conn.row_factory = sqlite3.Row

tables = ['plans', 'grocery_items', 'users']  # Add all your tables

for table in tables:
    cursor = conn.execute(f"SELECT * FROM {table}")
    rows = [dict(row) for row in cursor.fetchall()]
    with open(f'/tmp/{table}_export.json', 'w') as f:
        json.dump(rows, f, default=str)

conn.close()
print("Export complete!")
EOF

python3 /tmp/export_sqlite.py
```

### Import to PostgreSQL

```bash
# Create PostgreSQL database and tables
cd /opt/mealmind/backend
DATABASE_URL=postgresql://mealmind:password@localhost:5432/mealmind \
  python -c "from app.database import Base, engine; Base.metadata.create_all(bind=engine)"

# Import data using Python
cat > /tmp/import_postgres.py << 'EOF'
import json
import os
from sqlalchemy import create_engine, text

DATABASE_URL = os.getenv("DATABASE_URL")
engine = create_engine(DATABASE_URL)

tables = ['plans', 'grocery_items', 'users']

with engine.connect() as conn:
    for table in tables:
        with open(f'/tmp/{table}_export.json') as f:
            rows = json.load(f)

        if not rows:
            continue

        # Build insert query
        columns = rows[0].keys()
        placeholders = ','.join([f':{col}' for col in columns])
        query = text(f"INSERT INTO {table} ({','.join(columns)}) VALUES ({placeholders})")

        conn.execute(query, rows)
        conn.commit()
        print(f"Imported {len(rows)} rows into {table}")

print("Import complete!")
EOF

DATABASE_URL=postgresql://mealmind:password@localhost:5432/mealmind \
  python /tmp/import_postgres.py
```

## Step 6: Testing

```bash
# Test API with PostgreSQL
cd /opt/mealmind/backend
DATABASE_URL=postgresql://mealmind:password@localhost:5432/mealmind \
  pytest tests/ -v

# Test specific endpoints
curl http://localhost:8000/api/plans/current
```

## Step 7: Switch Production

1. Stop services: `docker compose -f docker-compose.yml -f docker-compose.prod.yml down`
2. Update `.env` with PostgreSQL URL
3. Start with PostgreSQL: `docker compose ... up -d`
4. Monitor logs: `docker compose logs -f mealmind-api`
5. Verify functionality

## Rollback Plan

If issues occur:
```bash
# Stop PostgreSQL setup
docker compose down

# Restore from SQLite backup
cp /opt/backups/mealmind_latest.db /opt/mealmind/backend/data/mealmind.db

# Start with SQLite
DATABASE_URL=sqlite:///./data/mealmind.db docker compose up -d
```

## Notes

- SQLite backup script (`scripts/backup-sqlite.sh`) is still useful for development
- For PostgreSQL backups, use: `pg_dump -U mealmind mealmind > backup_$(date +%Y%m%d).sql`
- Consider using Alembic for future schema migrations with PostgreSQL
- Monitor PostgreSQL performance with `pg_stat_statements`

## References

- [SQLAlchemy PostgreSQL Notes](https://docs.sqlalchemy.org/en/20/dialects/postgresql.html)
- [Psycopg Documentation](https://www.psycopg.org/docs/)
- [PostgreSQL JSONB](https://www.postgresql.org/docs/current/datatype-json.html)
