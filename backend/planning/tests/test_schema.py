from django.test import SimpleTestCase

from drf_spectacular.generators import SchemaGenerator


class PlanningOpenApiSchemaTests(SimpleTestCase):
    def test_plan_item_snapshot_uses_typed_schema(self):
        schema = SchemaGenerator().get_schema(public=True)
        snapshot_schema = schema["components"]["schemas"]["PlanItem"]["properties"][
            "meal_snapshot"
        ]

        self.assertEqual(
            snapshot_schema["allOf"][0]["$ref"],
            "#/components/schemas/MealSnapshot",
        )
        self.assertEqual(
            set(schema["components"]["schemas"]["MealSnapshot"]["required"]),
            {"meal_id", "name", "source", "servings", "instructions", "tags"},
        )
