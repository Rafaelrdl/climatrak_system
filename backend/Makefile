# Makefile for TrakSense Backend

.PHONY: help dev stop migrate seed provision-emqx check fmt fmt-check lint test test-cov ci ci-local clean migrations-check

help:
	@echo "TrakSense Backend - Available commands:"
	@echo ""
	@echo "Development:"
	@echo "  make dev              - Start all services with Docker Compose"
	@echo "  make stop             - Stop all services"
	@echo "  make migrate          - Run database migrations (migrate_schemas)"
	@echo "  make seed             - Seed development data (tenant + owner)"
	@echo "  make provision-emqx   - Provision EMQX (connector, action, rule)"
	@echo "  make check            - Run health checks and validations"
	@echo ""
	@echo "Code Quality:"
	@echo "  make fmt              - Format code with black and isort"
	@echo "  make fmt-check        - Check formatting without changing files"
	@echo "  make lint             - Run linters (ruff)"
	@echo ""
	@echo "Testing:"
	@echo "  make test             - Run test suite with pytest"
	@echo "  make test-cov         - Run tests with coverage report"
	@echo "  make migrations-check - Check for missing migrations"
	@echo ""
	@echo "CI:"
	@echo "  make ci               - Run full CI checks (lint + test)"
	@echo "  make ci-local         - Run CI checks locally (no Docker)"
	@echo ""
	@echo "Cleanup:"
	@echo "  make clean            - Clean Docker volumes and cache"

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

fmt-check:
	@echo "Checking code formatting..."
	docker compose -f docker/docker-compose.yml exec api black --check --diff apps/ config/
	docker compose -f docker/docker-compose.yml exec api isort --check-only --diff apps/ config/

lint:
	docker compose -f docker/docker-compose.yml exec api ruff check apps/ config/

test:
	@echo "Running test suite..."
	docker compose -f docker/docker-compose.yml exec api pytest apps/ -v --tb=short

test-cov:
	@echo "Running tests with coverage..."
	docker compose -f docker/docker-compose.yml exec api pytest apps/ -v --tb=short --cov=apps --cov-report=term-missing --cov-report=html

migrations-check:
	@echo "Checking for missing migrations..."
	docker compose -f docker/docker-compose.yml exec api python manage.py makemigrations --check --dry-run

ci: lint test
	@echo "✓ CI checks passed!"

ci-local:
	@echo "Running local CI checks (requires Python environment)..."
	ruff check apps/ config/
	black --check --diff apps/ config/
	isort --check-only --diff apps/ config/
	pytest apps/ -v --tb=short
	python manage.py makemigrations --check --dry-run
	@echo "✓ Local CI checks passed!"

clean:
	docker compose -f docker/docker-compose.yml down -v
	find . -type d -name __pycache__ -exec rm -rf {} + 2>/dev/null || true
	find . -type f -name "*.pyc" -delete 2>/dev/null || true
