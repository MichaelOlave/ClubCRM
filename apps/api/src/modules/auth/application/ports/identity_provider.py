from abc import ABC, abstractmethod

from src.modules.auth.domain.entities import CurrentUser


class AuthIdentityProviderError(Exception):
    """Raised when an external identity provider request fails."""


class AuthIdentityProvider(ABC):
    @abstractmethod
    async def build_login_url(self, redirect_uri: str, state: str) -> str:
        """Return the external login URL for the current authentication flow."""

    @abstractmethod
    async def exchange_code_for_user(self, code: str, redirect_uri: str) -> CurrentUser:
        """Exchange an authorization code for the authenticated user."""

    @abstractmethod
    def build_logout_url(self, return_to_url: str) -> str:
        """Return the external logout URL for the current session."""
