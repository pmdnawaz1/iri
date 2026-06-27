package com.example.auth;

import com.example.auth.AuthService;

public class AuthController {

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    public String login(String email) {
        return authService.login(email);
    }

    public void logout(String userId) {
        authService.logout(userId);
    }
}
