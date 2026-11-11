package com.financialtransaction.dto.response;

import java.util.Set;

public class AuthResponse {
    private Long id;
    private String username;
    private String fullName;
    private String email;
    private Set<String> roles;

    public AuthResponse(Long id, String username, String fullName, String email, Set<String> roles) {
        this.id = id;
        this.username = username;
        this.fullName = fullName;
        this.email = email;
        this.roles = roles;
    }

    // Getters
    public Long getId() { return id; }
    public String getUsername() { return username; }
    public String getFullName() { return fullName; }
    public String getEmail() { return email; }
    public Set<String> getRoles() { return roles; }
}