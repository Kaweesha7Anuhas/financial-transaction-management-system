package com.financialtransaction.service.impl;

import com.financialtransaction.entity.AuditLog;
import com.financialtransaction.entity.User;
import com.financialtransaction.repository.AuditLogRepository;
import com.financialtransaction.service.AuditLogService;
import org.springframework.stereotype.Service;

@Service
public class AuditLogServiceImpl implements AuditLogService {

    private final AuditLogRepository auditLogRepository;

    public AuditLogServiceImpl(AuditLogRepository auditLogRepository) {
        this.auditLogRepository = auditLogRepository;
    }

    @Override
    public void logAction(User user, String action, String entityType, Long entityId, String description) {
        AuditLog log = new AuditLog();
        log.setUser(user);
        log.setAction(action);
        log.setEntityType(entityType);
        log.setEntityId(entityId);
        log.setDescription(description);
        // In a real app, we would get the IP address from the HttpServletRequest
        log.setIpAddress("127.0.0.1"); 
        
        auditLogRepository.save(log);
    }
}