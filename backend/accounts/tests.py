from django.conf import settings
from django.test import TestCase
from django.urls import reverse

from rest_framework import status
from rest_framework.test import APITestCase
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.tokens import RefreshToken

from .models import User


class UserManagerTests(TestCase):
    def test_email_is_required(self):
        with self.assertRaisesMessage(ValueError, "email address"):
            User.objects.create_user(email="", password="A-secure-password-123")

    def test_create_superuser_sets_required_flags(self):
        user = User.objects.create_superuser(
            email="admin@example.com",
            password="A-secure-password-123",
        )

        self.assertTrue(user.is_staff)
        self.assertTrue(user.is_superuser)
        self.assertTrue(user.is_active)


class RefreshCookieAssertionsMixin:
    def assert_refresh_cookie(self, response):
        cookie = response.cookies[settings.AUTH_REFRESH_COOKIE_NAME]
        self.assertTrue(cookie["httponly"])
        self.assertEqual(bool(cookie["secure"]), settings.AUTH_REFRESH_COOKIE_SECURE)
        self.assertEqual(cookie["samesite"], settings.AUTH_REFRESH_COOKIE_SAMESITE)
        self.assertEqual(cookie["path"], settings.AUTH_REFRESH_COOKIE_PATH)
        self.assertEqual(cookie["max-age"], settings.AUTH_REFRESH_COOKIE_MAX_AGE)
        return cookie.value


class RegistrationTests(RefreshCookieAssertionsMixin, APITestCase):
    def test_registration_creates_user_and_sets_refresh_cookie(self):
        response = self.client.post(
            reverse("register"),
            {
                "email": "new-user@example.com",
                "first_name": "New",
                "last_name": "User",
                "password": "A-secure-password-123",
                "password_confirm": "A-secure-password-123",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn("access", response.data)
        self.assertNotIn("refresh", response.data)
        self.assert_refresh_cookie(response)
        self.assertEqual(response["Cache-Control"], "no-store")
        self.assertNotIn("password", response.data["user"])
        self.assertNotIn("username", response.data["user"])
        self.assertTrue(
            User.objects.get(email="new-user@example.com").check_password(
                "A-secure-password-123"
            )
        )

    def test_registration_rejects_different_passwords(self):
        response = self.client.post(
            reverse("register"),
            {
                "email": "new-user@example.com",
                "password": "A-secure-password-123",
                "password_confirm": "A-different-password-456",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertFalse(User.objects.filter(email="new-user@example.com").exists())


class LoginTests(RefreshCookieAssertionsMixin, APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            email="existing-user@example.com",
            password="A-secure-password-123",
        )

    def test_user_can_log_in_with_email(self):
        response = self.client.post(
            reverse("token_obtain_pair"),
            {
                "email": self.user.email,
                "password": "A-secure-password-123",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("access", response.data)
        self.assertNotIn("refresh", response.data)
        self.assert_refresh_cookie(response)
        self.assertEqual(response["Cache-Control"], "no-store")

    def test_login_rejects_invalid_password(self):
        response = self.client.post(
            reverse("token_obtain_pair"),
            {"email": self.user.email, "password": "incorrect-password"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)


class TokenLifecycleTests(RefreshCookieAssertionsMixin, APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            email="existing-user@example.com",
            password="A-secure-password-123",
        )

    def login(self):
        response = self.client.post(
            reverse("token_obtain_pair"),
            {
                "email": self.user.email,
                "password": "A-secure-password-123",
            },
            format="json",
        )
        return self.assert_refresh_cookie(response)

    def test_refresh_uses_cookie_and_rotates_token(self):
        previous_refresh = self.login()

        response = self.client.post(reverse("token_refresh"), {}, format="json")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("access", response.data)
        self.assertNotIn("refresh", response.data)
        rotated_refresh = self.assert_refresh_cookie(response)
        self.assertNotEqual(rotated_refresh, previous_refresh)
        with self.assertRaises(TokenError):
            RefreshToken(previous_refresh).check_blacklist()

    def test_refresh_rejects_request_without_cookie(self):
        response = self.client.post(reverse("token_refresh"), {}, format="json")

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_logout_blacklists_token_and_deletes_cookie(self):
        refresh = self.login()

        response = self.client.post(reverse("logout"), {}, format="json")

        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertEqual(
            response.cookies[settings.AUTH_REFRESH_COOKIE_NAME]["max-age"], 0
        )
        with self.assertRaises(TokenError):
            RefreshToken(refresh).check_blacklist()


class UserProfileTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
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
            email="regular-user@example.com",
            password="A-secure-password-123",
        )
        self.client.force_authenticate(user=user)

        response = self.client.get(reverse("user-list"))

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
