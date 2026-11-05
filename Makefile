PYTHON ?= python

.PHONY: api-schema api-types
api-schema:
	SECRET_KEY=schema-generation-only $(PYTHON) backend/manage.py spectacular \
		--file backend/openapi.yml \
		--validate

api-types: api-schema
	yarn --cwd frontend generate:api-types
