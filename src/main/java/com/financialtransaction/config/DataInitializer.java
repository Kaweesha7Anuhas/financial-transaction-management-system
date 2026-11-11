package com.financialtransaction.config;

import com.financialtransaction.entity.Role;
import com.financialtransaction.entity.User;
import com.financialtransaction.enums.RoleName;
import com.financialtransaction.repository.RoleRepository;
import com.financialtransaction.repository.UserRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.util.Set;

@Component
public class DataInitializer implements CommandLineRunner {

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final PasswordEncoder passwordEncoder;

    public DataInitializer(UserRepository userRepository, RoleRepository roleRepository, PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.roleRepository = roleRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    public void run(String... args) throws Exception {
        // Check if the admin user exists
        if (!userRepository.existsByUsername("admin")) {
            
            // 1. Get the ADMIN role (seeded by Flyway V1)
            Role adminRole = roleRepository.findByName(RoleName.ADMIN)
                    .orElseThrow(() -> new RuntimeException("Error: Role ADMIN is not found."));

            // 2. Create the Admin user
            User admin = new User(
                    "admin",
                    "admin@financialsystem.com",
                    passwordEncoder.encode("Admin@123"), // Encrypt the password!
                    "System Administrator"
            );
            
            // 3. Assign role
            admin.setRoles(Set.of(adminRole));

            // 4. Save to database
            userRepository.save(admin);
            
            System.out.println(">>> Default Admin User Created! Username: admin, Password: Admin@123");
        }
    }
}