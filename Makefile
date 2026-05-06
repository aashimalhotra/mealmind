.PHONY: help dev down backend-test frontend-test frontend-e2e lint migrate seed

help:
	@echo "Available targets:"
	@echo "  help          - Print available targets"
	@echo "  dev           - docker compose up --build"
	@echo "  down          - docker compose down"
	@echo "  backend-test  - cd backend && pytest"
	@echo "  frontend-test - cd frontend && pnpm test"
	@echo "  lint          - linting..."
	@echo "  migrate       - cd backend && alembic upgrade head"
	@echo "  seed          - cd backend && python scripts/seed.py"

dev:
	docker compose up --build -d

down:
	docker compose down

backend-test:
	cd backend && pytest

frontend-test:
	cd frontend && pnpm test

lint:
	@echo "linting..."

migrate:
	cd backend && uv run alembic upgrade head

seed:
	cd backend && uv run scripts/seed.py

frontend-e2e:
	cd frontend && pnpm exec playwright test