package auth

import (
	"fmt"
)

// AuthService handles authentication logic.
type AuthService struct {
	repo *UserRepository
}

// NewAuthService creates a new AuthService with the given repository.
func NewAuthService(repo *UserRepository) *AuthService {
	return &AuthService{repo: repo}
}

// Login authenticates a user by email and returns a session token.
func (s *AuthService) Login(email string) (string, error) {
	userID, ok := s.repo.FindByEmail(email)
	if !ok {
		return "", fmt.Errorf("user not found: %s", email)
	}
	return "token-" + userID, nil
}

// Logout removes the session for the given user.
func (s *AuthService) Logout(userID string) {
	s.repo.ClearSession(userID)
	fmt.Printf("logged out user: %s\n", userID)
}
