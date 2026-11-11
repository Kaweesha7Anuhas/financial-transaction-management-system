package com.financialtransaction.util;

import org.springframework.stereotype.Component;
import java.util.UUID;

@Component
public class ReferenceGenerator {
    public String generateTransactionReference() {
        // Generates a unique string like: TXN-3F8A9B2C
        return "TXN-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();
    }
}