package com.financialtransaction.controller;

import com.financialtransaction.dto.response.AuditLogResponse;
import com.financialtransaction.entity.AuditLog;
import com.financialtransaction.repository.AuditLogRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/audit-logs")
public class AuditLogController {

    private final AuditLogRepository auditLogRepository;

    public AuditLogController(AuditLogRepository auditLogRepository) {
        this.auditLogRepository = auditLogRepository;
    }

    @GetMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Page<AuditLogResponse>> getAuditLogs(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        
        Page<AuditLogResponse> logs = auditLogRepository.findAll(PageRequest.of(page, size))
                .map(log -> new AuditLogResponse(
                        log.getId(),
                        log.getUser() != null ? log.getUser().getUsername() : "SYSTEM",
                        log.getAction(),
                        log.getEntityType(),
                        log.getEntityId(),
                        log.getDescription(),
                        log.getTimestamp()
                ));

        return ResponseEntity.ok(logs);
    }
}