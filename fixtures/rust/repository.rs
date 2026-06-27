use std::collections::HashMap;

/// UserRepository stores and retrieves user records by email.
pub struct UserRepository {
    db: HashMap<String, String>,
}

impl UserRepository {
    /// Create a new UserRepository with a seeded user.
    pub fn new() -> Self {
        let mut db = HashMap::new();
        db.insert("test@example.com".to_string(), "user-1".to_string());
        UserRepository { db }
    }

    /// Find a user ID by email address.
    pub fn find_by_email(&self, email: &str) -> Option<&str> {
        self.db.get(email).map(|s| s.as_str())
    }

    /// Clear the session for a given user ID.
    pub fn clear_session(&mut self, user_id: &str) {
        self.db.retain(|_, v| v != user_id);
    }
}
