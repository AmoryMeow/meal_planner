from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):
    """
    Custom user model with unique email field
    """
    email = models.EmailField(
        unique=True,
        verbose_name="Email address",
        help_text="Required. Must be unique."
    )
    
    # Make email a required field
    REQUIRED_FIELDS = ['email']
    
    class Meta:
        verbose_name = "User"
        verbose_name_plural = "Users"
        
    def __str__(self):
        return self.email