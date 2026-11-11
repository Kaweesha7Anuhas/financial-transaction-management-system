package com.financialtransaction.service;

import com.financialtransaction.dto.request.UserCreationRequest;
import com.financialtransaction.dto.response.AuthResponse;
import com.financialtransaction.dto.response.UserResponse;

import java.util.List;

public interface UserService {
    AuthResponse createUser(UserCreationRequest request);
    void toggleUserStatus(Long userId, boolean enabled);
    List<UserResponse> getAllUsers();
}