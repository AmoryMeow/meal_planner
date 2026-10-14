from django.urls import reverse

from rest_framework import status
from rest_framework.test import APITestCase

from .models import User


class RegistrationTests(APITestCase):
    def test_registration_creates_user_and_returns_tokens(self):
        response = self.client.post(
            reverse("register"),
            {
                "username": "new-user",
                "email": "new-user@example.com",
                "password": "A-secure-password-123",
                "password_confirm": "A-secure-password-123",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn("access", response.data)
        self.assertIn("refresh", response.data)
        self.assertNotIn("password", response.data["user"])
        self.assertTrue(
            User.objects.get(username="new-user").check_password(
                "A-secure-password-123"
            )
        )

    def test_registration_rejects_different_passwords(self):
        response = self.client.post(
            reverse("register"),
            {
                "username": "new-user",
                "email": "new-user@example.com",
                "password": "A-secure-password-123",
                "password_confirm": "A-different-password-456",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertFalse(User.objects.filter(username="new-user").exists())


class UserProfileTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="existing-user",
            email="existing-user@example.com",
            password="A-secure-password-123",
        )

    def test_profile_requires_authentication(self):
        response = self.client.get(reverse("user-profile"))

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_authenticated_user_can_update_own_profile(self):
        self.client.force_authenticate(user=self.user)

        response = self.client.patch(
            reverse("user-profile"), {"first_name": "Alex"}, format="json"
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.user.refresh_from_db()
        self.assertEqual(self.user.first_name, "Alex")


class UserListPermissionTests(APITestCase):
    def test_regular_user_cannot_list_users(self):
        user = User.objects.create_user(
            username="regular-user",
            email="regular-user@example.com",
            password="A-secure-password-123",
        )
        self.client.force_authenticate(user=user)

        response = self.client.get(reverse("user-list"))

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
