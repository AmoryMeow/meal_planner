import django.core.validators
from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [("meals", "0006_meal_instructions")]

    operations = [
        migrations.AddField(
            model_name="meal",
            name="servings",
            field=models.PositiveSmallIntegerField(
                default=1,
                validators=[django.core.validators.MinValueValidator(1)],
            ),
        ),
        migrations.AddConstraint(
            model_name="meal",
            constraint=models.CheckConstraint(
                check=models.Q(("servings__gt", 0)),
                name="meals_meal_servings_gt_zero",
            ),
        ),
    ]
