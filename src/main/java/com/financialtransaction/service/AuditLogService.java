package com.financialtransaction.service;

import com.financialtransaction.entity.User;

public interface AuditLogService {
    void logAction(User user, String action, String entityType, Long entityId, String description);
}