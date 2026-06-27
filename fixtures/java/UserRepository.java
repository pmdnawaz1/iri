package com.example.auth;

import java.util.HashMap;
import java.util.Map;

public class UserRepository {

    private final Map<String, String> users = new HashMap<>();

    public UserRepository() {
        users.put("test@example.com", "user-1");
    }

    public String findByEmail(String email) {
        return users.get(email);
    }

    public void clearSession(String userId) {
        // Clear the session for this user
        users.values().remove(userId);
    }
}
