package com.financialtransaction.repository;

import com.financialtransaction.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, Long> {
    
    // Used by Spring Security to load the user during login
    Optional<User> findByUsername(String username);
    
    // Used during registration to prevent duplicate accounts
    boolean existsByUsername(String username);
    boolean existsByEmail(String email);
}