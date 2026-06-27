package auth

import (
	"fmt"
)

// UserRepository stores and retrieves user records.
type UserRepository struct {
	db map[string]string
}

// NewUserRepository creates a new UserRepository instance.
func NewUserRepository() *UserRepository {
	return &UserRepository{
		db: map[string]string{
			"test@example.com": "user-1",
		},
	}
}

// FindByEmail retrieves a user ID by email address.
func (r *UserRepository) FindByEmail(email string) (string, bool) {
	userID, ok := r.db[email]
	if !ok {
		fmt.Printf("user not found: %s\n", email)
	}
	return userID, ok
}

// ClearSession removes session data for a given user.
func (r *UserRepository) ClearSession(userID string) {
	for email, id := range r.db {
		if id == userID {
			delete(r.db, email)
			return
		}
	}
}
