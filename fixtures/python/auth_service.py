from user_repository import UserRepository


class AuthService:
    """Handles user authentication logic."""

    def __init__(self, repo: UserRepository) -> None:
        self.repo = repo
        self._sessions: dict = {}

    def login(self, email: str) -> str | None:
        """Authenticate a user by email and return a session token."""
        user = self.repo.find_by_email(email)
        if user is None:
            return None
        token = f"token-{email}"
        self._sessions[token] = user
        return token

    def logout(self, token: str) -> None:
        """Remove the session associated with the given token."""
        self._sessions.pop(token, None)
