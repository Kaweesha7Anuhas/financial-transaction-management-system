package com.financialtransaction.service.impl;

import com.financialtransaction.dto.request.UserCreationRequest;
import com.financialtransaction.dto.response.AuthResponse;
import com.financialtransaction.dto.response.UserResponse;
import com.financialtransaction.entity.Role;
import com.financialtransaction.entity.User;
import com.financialtransaction.exception.BusinessRuleException;
import com.financialtransaction.exception.ResourceNotFoundException;
import com.financialtransaction.repository.RoleRepository;
import com.financialtransaction.repository.UserRepository;
import com.financialtransaction.service.UserService;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@Service
public class UserServiceImpl implements UserService {

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final PasswordEncoder passwordEncoder;

    public UserServiceImpl(UserRepository userRepository, RoleRepository roleRepository, PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.roleRepository = roleRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    public AuthResponse createUser(UserCreationRequest request) {
        if (userRepository.existsByUsername(request.getUsername())) {
            throw new BusinessRuleException("Username is already taken.");
        }
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new BusinessRuleException("Email is already in use.");
        }

        User user = new User();
        user.setUsername(request.getUsername());
        user.setEmail(request.getEmail());
        user.setPasswordHash(passwordEncoder.encode(request.getPassword()));
        user.setFullName(request.getFullName());
        user.setEnabled(true);
        user.setAccountNonLocked(true);

        Set<Role> roles = request.getRoles().stream()
                .map(roleName -> roleRepository.findByName(roleName)
                        .orElseThrow(() -> new ResourceNotFoundException("Role not found: " + roleName)))
                .collect(Collectors.toSet());
        user.setRoles(roles);

        User savedUser = userRepository.save(user);

        return new AuthResponse(
                savedUser.getId(),
                savedUser.getUsername(),
                savedUser.getFullName(),
                savedUser.getEmail(),
                savedUser.getRoles().stream().map(r -> r.getName().name()).collect(Collectors.toSet())
        );
    }

    @Override
    @Transactional
    public void toggleUserStatus(Long userId, boolean enabled) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        
        // Prevent Admin from disabling themselves
        if (user.getUsername().equals("admin") && !enabled) {
            throw new BusinessRuleException("Cannot disable the primary admin account.");
        }
        
        user.setEnabled(enabled);
        userRepository.save(user);
    }

    @Override
    public List<UserResponse> getAllUsers() {
        return userRepository.findAll().stream()
                .map(user -> new UserResponse(
                        user.getId(),
                        user.getUsername(),
                        user.getEmail(),
                        user.getFullName(),
                        user.isEnabled(),
                        user.getRoles().stream().map(r -> r.getName().name()).collect(Collectors.toSet())
                ))
                .collect(Collectors.toList());
    }
}