package com.financialtransaction.repository;

import com.financialtransaction.entity.Role;
import com.financialtransaction.enums.RoleName;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface RoleRepository extends JpaRepository<Role, Long> {
    
    // Spring Data JPA automatically writes the SQL for this:
    // SELECT * FROM roles WHERE name = ?
    Optional<Role> findByName(RoleName name);
}