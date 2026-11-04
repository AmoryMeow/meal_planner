import os
from datetime import date
from unittest.mock import patch

from django.core.management import call_command
from django.core.management.base import CommandError
from django.test import TestCase, override_settings

from accounts.models import User
from groups.models import Group
from meals.models import Meal
from planning.models import Plan, PlanItem


class SeedDemoDataCommandTests(TestCase):
    @override_settings(DEBUG=True)
    @patch.dict(os.environ, {"DEMO_USER_PASSWORD": "test-demo-password"})
    def test_command_recreates_complete_demo_dataset(self):
        for _ in range(2):
            call_command("seed_demo_data", week_start=date(2026, 11, 2))

        owner = User.objects.get(email="landing-demo@mealendar.local")

        self.assertEqual(User.objects.filter(email__startswith="landing-").count(), 2)
        self.assertEqual(Meal.objects.filter(owner=owner).count(), 8)
        self.assertEqual(Group.objects.filter(members=owner).count(), 2)
        self.assertEqual(
            Plan.objects.filter(owner=owner).count()
            + Plan.objects.filter(group__members=owner).distinct().count(),
            3,
        )
        self.assertEqual(PlanItem.objects.filter(meal__owner=owner).count(), 15)
        self.assertEqual(
            PlanItem.objects.filter(meal__owner=owner).earliest("date").date,
            date(2026, 11, 2),
        )

    @override_settings(DEBUG=False)
    @patch.dict(os.environ, {"DEMO_USER_PASSWORD": "test-demo-password"})
    def test_command_is_disabled_outside_debug(self):
        with self.assertRaisesMessage(
            CommandError,
            "Demo data requires DEBUG=True.",
        ):
            call_command("seed_demo_data")

    @override_settings(DEBUG=False)
    @patch.dict(os.environ, {"DEMO_USER_PASSWORD": "test-demo-password"})
    def test_command_can_be_forced_in_trusted_local_environment(self):
        call_command(
            "seed_demo_data",
            week_start=date(2026, 11, 2),
            force=True,
        )

        self.assertTrue(
            User.objects.filter(email="landing-demo@mealendar.local").exists()
        )

    @override_settings(DEBUG=True)
    @patch.dict(os.environ, {}, clear=True)
    def test_command_requires_password(self):
        with self.assertRaisesMessage(
            CommandError,
            "Set DEMO_USER_PASSWORD before seeding demo data.",
        ):
            call_command("seed_demo_data")
