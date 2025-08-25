.PHONY: help build run dev up down logs clean test

# Default target
help:
	@echo "Available commands:"
	@echo "  build     - Build production Docker image"
	@echo "  run       - Run production container"
	@echo "  dev       - Start development environment"
	@echo "  up        - Start production environment"
	@echo "  down      - Stop all environments"
	@echo "  logs      - View production logs"
	@echo "  logs-dev  - View development logs"
	@echo "  clean     - Clean up Docker resources"
	@echo "  test      - Run tests"

# Build production image
build:
	docker build -t logx-volumebot .

# Run production container
run:
	docker run -p 3000:3000 --env-file .env logx-volumebot

# Start development environment
dev:
	docker-compose -f docker-compose.dev.yml up -d

# Start production environment
up:
	docker-compose up -d

# Stop all environments
down:
	docker-compose down
	docker-compose -f docker-compose.dev.yml down

# View production logs
logs:
	docker-compose logs -f volumebot

# View development logs
logs-dev:
	docker-compose -f docker-compose.dev.yml logs -f volumebot-dev

# Clean up Docker resources
clean:
	docker system prune -f
	docker image prune -f
	docker volume prune -f

# Run tests (if available)
test:
	npm test

# Shell into production container
shell:
	docker-compose exec volumebot sh

# Shell into development container
shell-dev:
	docker-compose -f docker-compose.dev.yml exec volumebot-dev sh

# Rebuild and restart production
rebuild:
	docker-compose down
	docker-compose build --no-cache
	docker-compose up -d

# Rebuild and restart development
rebuild-dev:
	docker-compose -f docker-compose.dev.yml down
	docker-compose -f docker-compose.dev.yml build --no-cache
	docker-compose -f docker-compose.dev.yml up -d