package com.financialtransaction.controller;

import com.financialtransaction.dto.request.ChangePasswordRequest;
import com.financialtransaction.dto.request.LoginRequest;
import com.financialtransaction.dto.request.ProfileUpdateRequest;
import com.financialtransaction.dto.request.RegisterRequest;
import com.financialtransaction.dto.response.AuthResponse;
import com.financialtransaction.service.AuthService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.logout.SecurityContextLogoutHandler;
import org.springframework.security.web.context.SecurityContextRepository;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService authService;
    private final SecurityContextRepository securityContextRepository;

    public AuthController(AuthService authService, SecurityContextRepository securityContextRepository) {
        this.authService = authService;
        this.securityContextRepository = securityContextRepository;
    }

    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(@Valid @RequestBody LoginRequest loginRequest, HttpServletRequest request, HttpServletResponse response) {
        AuthResponse authResponse = authService.login(loginRequest);
        
        // Save the authentication to the HTTP session
        SecurityContext context = SecurityContextHolder.getContext();
        securityContextRepository.saveContext(context, request, response);
        
        return ResponseEntity.ok(authResponse);
    }

    // --- THIS WAS MISSING ---
    @PostMapping("/register")
    public ResponseEntity<AuthResponse> register(@Valid @RequestBody RegisterRequest request) {
        return new ResponseEntity<>(authService.register(request), HttpStatus.CREATED);
    }

    @GetMapping("/me")
    public ResponseEntity<AuthResponse> getCurrentUser(Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated()) {
            return ResponseEntity.status(401).build();
        }
        AuthResponse response = authService.getCurrentUser(authentication.getName());
        return ResponseEntity.ok(response);
    }

    @PostMapping("/logout")
    public ResponseEntity<String> logout(HttpServletRequest request, HttpServletResponse response, Authentication authentication) {
        if (authentication != null) {
            new SecurityContextLogoutHandler().logout(request, response, authentication);
        }
        return ResponseEntity.ok("Logged out successfully");
    }

    @PutMapping("/change-password")
    public ResponseEntity<String> changePassword(Authentication authentication, @Valid @RequestBody ChangePasswordRequest request) {
        authService.changePassword(authentication.getName(), request);
        return ResponseEntity.ok("Password changed successfully");
    }

    @PutMapping("/profile")
    public ResponseEntity<String> updateProfile(Authentication authentication, @Valid @RequestBody ProfileUpdateRequest request) {
        authService.updateProfile(authentication.getName(), request);
        return ResponseEntity.ok("Profile updated successfully");
    }
}