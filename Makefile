PYTHON ?= python

.PHONY: api-schema
api-schema:
	SECRET_KEY=schema-generation-only $(PYTHON) backend/manage.py spectacular \
		--file backend/openapi.yml \
		--validate
