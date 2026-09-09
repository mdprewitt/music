# Thin wrappers around the package.json scripts (all run through bun).
# Run `make` or `make help` for the list.

.DEFAULT_GOAL := help
.PHONY: help install dev build preview test test-watch type-check lint format check clean

help: ## List the available targets
	@grep -E '^[a-zA-Z_-]+:.*## ' $(MAKEFILE_LIST) \
		| awk -F':.*## ' '{ printf "  %-12s %s\n", $$1, $$2 }'

install: ## Install dependencies
	bun install

dev: ## Start the Vite dev server (http://localhost:5173)
	bun dev

build: ## Type-check and build for production into dist/
	bun run build

preview: ## Serve the production build from dist/
	bun run preview

test: ## Run the unit tests once
	bun test:unit --run

test-watch: ## Run the unit tests in watch mode
	bun test:unit

type-check: ## Type-check with vue-tsc
	bun run type-check

lint: ## Lint and autofix (oxlint then eslint)
	bun lint

format: ## Format src/ with Prettier
	bun run format

check: type-check lint test ## Run the full pre-commit gate

clean: ## Remove build output and tool caches
	rm -rf dist node_modules/.tmp .eslintcache
