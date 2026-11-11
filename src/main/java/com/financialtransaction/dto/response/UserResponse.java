package com.financialtransaction.dto.response;

import java.util.Set;

public class UserResponse {
    private Long id;
    private String username;
    private String email;
    private String fullName;
    private boolean enabled;
    private Set<String> roles;

    public UserResponse(Long id, String username, String email, String fullName, boolean enabled, Set<String> roles) {
        this.id = id;
        this.username = username;
        this.email = email;
        this.fullName = fullName;
        this.enabled = enabled;
        this.roles = roles;
    }

    public Long getId() { return id; }
    public String getUsername() { return username; }
    public String getEmail() { return email; }
    public String getFullName() { return fullName; }
    public boolean isEnabled() { return enabled; }
    public Set<String> getRoles() { return roles; }
}