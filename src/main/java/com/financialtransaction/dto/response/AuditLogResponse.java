package com.financialtransaction.dto.response;

import java.time.LocalDateTime;

public class AuditLogResponse {
    private Long id;
    private String username;
    private String action;
    private String entityType;
    private Long entityId;
    private String description;
    private LocalDateTime timestamp;

    public AuditLogResponse(Long id, String username, String action, String entityType, Long entityId, String description, LocalDateTime timestamp) {
        this.id = id;
        this.username = username;
        this.action = action;
        this.entityType = entityType;
        this.entityId = entityId;
        this.description = description;
        this.timestamp = timestamp;
    }

    // Getters
    public Long getId() { return id; }
    public String getUsername() { return username; }
    public String getAction() { return action; }
    public String getEntityType() { return entityType; }
    public Long getEntityId() { return entityId; }
    public String getDescription() { return description; }
    public LocalDateTime getTimestamp() { return timestamp; }
}