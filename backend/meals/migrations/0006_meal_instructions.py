from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [("meals", "0005_reusable_meal_tags")]

    operations = [
        migrations.AddField(
            model_name="meal",
            name="instructions",
            field=models.TextField(blank=True, default=""),
        ),
    ]
