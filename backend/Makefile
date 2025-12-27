# Makefile for TrakSense Backend

.PHONY: help dev stop migrate seed provision-emqx check fmt lint test ci clean

help:
	@echo "TrakSense Backend - Available commands:"
	@echo "  make dev            - Start all services with Docker Compose"
	@echo "  make stop           - Stop all services"
	@echo "  make migrate        - Run database migrations (migrate_schemas)"
	@echo "  make seed           - Seed development data (tenant + owner)"
	@echo "  make provision-emqx - Provision EMQX (connector, action, rule)"
	@echo "  make check          - Run health checks and validations"
	@echo "  make fmt            - Format code with black and isort"
	@echo "  make lint           - Run linters (ruff)"
	@echo "  make test           - Run test suite (placeholder)"
	@echo "  make ci             - Run CI checks (lint + test)"
	@echo "  make clean          - Clean Docker volumes and cache"

dev:
	docker compose -f docker/docker-compose.yml up -d

stop:
	docker compose -f docker/docker-compose.yml down

migrate:
	docker compose -f docker/docker-compose.yml exec api python manage.py migrate_schemas --noinput

seed:
	docker compose -f docker/docker-compose.yml exec api python manage.py seed_dev

provision-emqx:
	@echo "Provisioning EMQX (Rule Engine)..."
	bash docker/scripts/provision-emqx.sh

check:
	@echo "Running health checks..."
	@curl -f http://localhost/health || (echo "Health check failed" && exit 1)
	@echo "\nChecking OpenAPI schema..."
	@curl -f http://localhost/api/schema/ > /dev/null || (echo "Schema check failed" && exit 1)
	@echo "\nValidating tenant creation..."
	docker compose -f docker/docker-compose.yml exec api python manage.py shell -c "from apps.tenants.models import Tenant, Domain; assert Tenant.objects.filter(schema_name='uberlandia_medical_center').exists(), 'Tenant not found'; assert Domain.objects.filter(domain='umc.localhost').exists(), 'Domain not found'; print('✓ Tenant and domain validated')"
	@echo "\n✓ All checks passed!"

fmt:
	docker compose -f docker/docker-compose.yml exec api black apps/ config/
	docker compose -f docker/docker-compose.yml exec api isort apps/ config/

lint:
	docker compose -f docker/docker-compose.yml exec api ruff check apps/ config/

test:
	@echo "Test suite placeholder - will be implemented in future phases"

ci: lint test

clean:
	docker compose -f docker/docker-compose.yml down -v
	find . -type d -name __pycache__ -exec rm -rf {} + 2>/dev/null || true
	find . -type f -name "*.pyc" -delete 2>/dev/null || true
