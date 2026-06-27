use crate::repository::UserRepository;

/// AuthService handles user authentication using the repository.
pub struct AuthService {
    repo: UserRepository,
}

impl AuthService {
    /// Create a new AuthService backed by the given repository.
    pub fn new(repo: UserRepository) -> Self {
        AuthService { repo }
    }

    /// Authenticate a user by email and return a session token.
    pub fn login(&self, email: &str) -> Option<String> {
        let user_id = self.repo.find_by_email(email)?;
        Some(format!("token-{}", user_id))
    }

    /// Logout the user associated with the given token.
    pub fn logout(&mut self, user_id: &str) {
        self.repo.clear_session(user_id);
    }
}
