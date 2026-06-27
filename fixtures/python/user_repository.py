from typing import Optional


class UserRepository:
    """Stores and retrieves user records by email."""

    def __init__(self) -> None:
        self._store: dict = {
            "test@example.com": {"id": "user-1", "email": "test@example.com"},
        }

    def find_by_email(self, email: str) -> Optional[dict]:
        """Return the user record for the given email, or None."""
        return self._store.get(email)

    def save(self, user: dict) -> None:
        """Persist a user record."""
        self._store[user["email"]] = user

    def delete(self, email: str) -> None:
        """Remove the user record for the given email."""
        self._store.pop(email, None)
