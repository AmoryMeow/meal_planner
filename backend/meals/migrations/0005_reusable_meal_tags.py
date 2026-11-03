from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


def normalize_name(name):
    return " ".join(name.split()).casefold()


def move_tags_to_catalog(apps, schema_editor):
    Meal = apps.get_model("meals", "Meal")
    Tag = apps.get_model("meals", "Tag")

    for meal in Meal.objects.iterator():
        meal_tag_ids = set()
        for raw_name in meal.legacy_tags or []:
            name = " ".join(str(raw_name).split())
            if not name:
                continue
            tag, _created = Tag.objects.get_or_create(
                owner_id=meal.owner_id,
                normalized_name=normalize_name(name),
                defaults={"name": name},
            )
            if tag.id not in meal_tag_ids:
                meal.tags.add(tag)
                meal_tag_ids.add(tag.id)


def move_tags_to_json(apps, schema_editor):
    Meal = apps.get_model("meals", "Meal")

    for meal in Meal.objects.prefetch_related("tags").iterator():
        meal.legacy_tags = list(
            meal.tags.order_by("name", "id").values_list("name", flat=True)
        )
        meal.save(update_fields=("legacy_tags",))


class Migration(migrations.Migration):
    dependencies = [
        ("meals", "0004_mealshare"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.RenameField(
            model_name="meal",
            old_name="tags",
            new_name="legacy_tags",
        ),
        migrations.CreateModel(
            name="Tag",
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
                ("name", models.CharField(max_length=64)),
                ("normalized_name", models.CharField(editable=False, max_length=64)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "owner",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="meal_tags",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={"ordering": ("name", "id")},
        ),
        migrations.AddConstraint(
            model_name="tag",
            constraint=models.UniqueConstraint(
                fields=("owner", "normalized_name"),
                name="meals_tag_unique_normalized_name_per_owner",
            ),
        ),
        migrations.AddField(
            model_name="meal",
            name="tags",
            field=models.ManyToManyField(
                blank=True,
                related_name="meals",
                to="meals.tag",
            ),
        ),
        migrations.RunPython(move_tags_to_catalog, move_tags_to_json),
        migrations.RemoveField(model_name="meal", name="legacy_tags"),
    ]
