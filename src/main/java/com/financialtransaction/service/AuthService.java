package com.financialtransaction.service;

import com.financialtransaction.dto.request.ChangePasswordRequest;
import com.financialtransaction.dto.request.LoginRequest;
import com.financialtransaction.dto.request.ProfileUpdateRequest;
import com.financialtransaction.dto.request.RegisterRequest;
import com.financialtransaction.dto.response.AuthResponse;

public interface AuthService {
    AuthResponse login(LoginRequest loginRequest);
    AuthResponse getCurrentUser(String username);
    AuthResponse register(RegisterRequest request);
    void changePassword(String username, ChangePasswordRequest request);
    void updateProfile(String username, ProfileUpdateRequest request);
}