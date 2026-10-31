from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


def split_ingredients(apps, schema_editor):
    Ingredient = apps.get_model("meals", "Ingredient")
    MealIngredient = apps.get_model("meals", "MealIngredient")

    for meal_ingredient in MealIngredient.objects.select_related("meal").iterator():
        name = " ".join(meal_ingredient.name.split())
        normalized_name = name.casefold()
        ingredient, _ = Ingredient.objects.get_or_create(
            owner_id=meal_ingredient.meal.owner_id,
            normalized_name=normalized_name,
            defaults={"name": name},
        )
        meal_ingredient.ingredient_id = ingredient.id
        meal_ingredient.save(update_fields=("ingredient",))


def join_ingredients(apps, schema_editor):
    MealIngredient = apps.get_model("meals", "MealIngredient")

    for meal_ingredient in MealIngredient.objects.select_related("ingredient").iterator():
        meal_ingredient.name = meal_ingredient.ingredient.name
        meal_ingredient.save(update_fields=("name",))


class Migration(migrations.Migration):
    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ("meals", "0002_ingredient_and_more"),
    ]

    operations = [
        migrations.RenameModel(
            old_name="Ingredient",
            new_name="MealIngredient",
        ),
        migrations.CreateModel(
            name="Ingredient",
            fields=[
                (
                    "id",
                    models.BigAutoField(
                        auto_created=True,
                        primary_key=True,
                        serialize=False,
                        verbose_name="ID",
                    ),
                ),
                ("name", models.CharField(max_length=255)),
                ("normalized_name", models.CharField(editable=False, max_length=255)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "owner",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="ingredients",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={"ordering": ("name", "id")},
        ),
        migrations.AddField(
            model_name="mealingredient",
            name="ingredient",
            field=models.ForeignKey(
                null=True,
                on_delete=django.db.models.deletion.RESTRICT,
                related_name="meal_ingredients",
                to="meals.ingredient",
            ),
        ),
        migrations.RunPython(split_ingredients, join_ingredients),
        migrations.AlterField(
            model_name="mealingredient",
            name="ingredient",
            field=models.ForeignKey(
                on_delete=django.db.models.deletion.RESTRICT,
                related_name="meal_ingredients",
                to="meals.ingredient",
            ),
        ),
        migrations.AlterField(
            model_name="mealingredient",
            name="name",
            field=models.CharField(default="", max_length=255),
        ),
        migrations.RemoveField(
            model_name="mealingredient",
            name="name",
        ),
        migrations.RemoveConstraint(
            model_name="mealingredient",
            name="meals_ingredient_quantity_gt_zero",
        ),
        migrations.AddConstraint(
            model_name="ingredient",
            constraint=models.UniqueConstraint(
                fields=("owner", "normalized_name"),
                name="meals_ingredient_unique_normalized_name_per_owner",
            ),
        ),
        migrations.AddConstraint(
            model_name="mealingredient",
            constraint=models.CheckConstraint(
                check=models.Q(("quantity__gt", 0)),
                name="meals_mealingredient_quantity_gt_zero",
            ),
        ),
    ]
