package com.example.auth;

import com.example.auth.UserRepository;

public class AuthService {

    private final UserRepository userRepository;

    public AuthService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    public String login(String email) {
        String user = userRepository.findByEmail(email);
        if (user == null) {
            return null;
        }
        return "token-" + email;
    }

    public void logout(String userId) {
        userRepository.clearSession(userId);
    }
}
