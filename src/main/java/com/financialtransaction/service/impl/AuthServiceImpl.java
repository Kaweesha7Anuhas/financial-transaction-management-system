package com.financialtransaction.service.impl;

import com.financialtransaction.dto.request.ChangePasswordRequest;
import com.financialtransaction.dto.request.LoginRequest;
import com.financialtransaction.dto.request.ProfileUpdateRequest;
import com.financialtransaction.dto.request.RegisterRequest;
import com.financialtransaction.dto.response.AuthResponse;
import com.financialtransaction.entity.Customer;
import com.financialtransaction.entity.Role;
import com.financialtransaction.entity.User;
import com.financialtransaction.enums.CustomerStatus;
import com.financialtransaction.enums.RoleName;
import com.financialtransaction.exception.BusinessRuleException;
import com.financialtransaction.repository.CustomerRepository;
import com.financialtransaction.repository.RoleRepository;
import com.financialtransaction.repository.UserRepository;
import com.financialtransaction.service.AuditLogService;
import com.financialtransaction.service.AuthService;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.Random;
import java.util.Set;
import java.util.stream.Collectors;

@Service
public class AuthServiceImpl implements AuthService {

    private final AuthenticationManager authenticationManager;
    private final UserRepository userRepository;
    private final CustomerRepository customerRepository;
    private final RoleRepository roleRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuditLogService auditLogService;

    public AuthServiceImpl(AuthenticationManager authenticationManager,
                           UserRepository userRepository,
                           CustomerRepository customerRepository,
                           RoleRepository roleRepository,
                           PasswordEncoder passwordEncoder,
                           AuditLogService auditLogService) {
        this.authenticationManager = authenticationManager;
        this.userRepository = userRepository;
        this.customerRepository = customerRepository;
        this.roleRepository = roleRepository;
        this.passwordEncoder = passwordEncoder;
        this.auditLogService = auditLogService;
    }

    @Override
    public AuthResponse login(LoginRequest loginRequest) {
        Authentication authentication = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(
                        loginRequest.getUsername(),
                        loginRequest.getPassword()
                )
        );
        SecurityContextHolder.getContext().setAuthentication(authentication);
        User user = userRepository.findByUsername(loginRequest.getUsername()).orElseThrow();
        
        // Audit Log
        auditLogService.logAction(user, "LOGIN_SUCCESS", "User", user.getId(), "User logged in successfully");
        
        return mapToAuthResponse(user);
    }

    @Override
    public AuthResponse getCurrentUser(String username) {
        User user = userRepository.findByUsername(username).orElseThrow();
        return mapToAuthResponse(user);
    }

    @Override
    public AuthResponse register(RegisterRequest request) {
        if (userRepository.existsByUsername(request.getUsername())) {
            throw new BusinessRuleException("Username is already taken.");
        }
        if (customerRepository.existsByEmail(request.getEmail())) {
            throw new BusinessRuleException("Email is already registered.");
        }

        User user = new User();
        user.setUsername(request.getUsername());
        user.setEmail(request.getEmail());
        user.setPasswordHash(passwordEncoder.encode(request.getPassword()));
        user.setFullName(request.getFirstName() + " " + request.getLastName());
        
        Role customerRole = roleRepository.findByName(RoleName.CUSTOMER)
                .orElseThrow(() -> new BusinessRuleException("Role CUSTOMER not found"));
        user.setRoles(Set.of(customerRole));
        
        User savedUser = userRepository.save(user);

        Customer customer = new Customer();
        customer.setCustomerCode(generateCustomerCode());
        customer.setFirstName(request.getFirstName());
        customer.setLastName(request.getLastName());
        customer.setEmail(request.getEmail());
        customer.setPhoneNumber(request.getPhoneNumber());
        customer.setStatus(CustomerStatus.ACTIVE);
        customer.setUser(savedUser);

        Customer savedCustomer = customerRepository.save(customer);

        // Audit Log
        auditLogService.logAction(savedUser, "CUSTOMER_REGISTERED", "Customer", savedCustomer.getId(), "Customer self-registered");

        return mapToAuthResponse(savedUser);
    }

    @Override
    public void changePassword(String username, ChangePasswordRequest request) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new BusinessRuleException("User not found"));
        
        if (!passwordEncoder.matches(request.getOldPassword(), user.getPasswordHash())) {
            throw new BusinessRuleException("Incorrect old password.");
        }
        
        user.setPasswordHash(passwordEncoder.encode(request.getNewPassword()));
        userRepository.save(user);
    }

    @Override
    public void updateProfile(String username, ProfileUpdateRequest request) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new BusinessRuleException("User not found"));
        
        if (!user.getEmail().equals(request.getEmail()) && userRepository.existsByEmail(request.getEmail())) {
            throw new BusinessRuleException("Email already in use.");
        }
        
        user.setFullName(request.getFullName());
        user.setEmail(request.getEmail());
        userRepository.save(user);
    }

    private AuthResponse mapToAuthResponse(User user) {
        var roleNames = user.getRoles().stream()
                .map(role -> role.getName().name())
                .collect(Collectors.toSet());

        return new AuthResponse(
                user.getId(),
                user.getUsername(),
                user.getFullName(),
                user.getEmail(),
                roleNames
        );
    }

    private String generateCustomerCode() {
        String code;
        do {
            int number = 1000 + new Random().nextInt(9000);
            code = "CUS-" + number;
        } while (customerRepository.existsByCustomerCode(code));
        return code;
    }
}