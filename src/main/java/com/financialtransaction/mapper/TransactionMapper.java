package com.financialtransaction.mapper;

import com.financialtransaction.dto.response.TransactionResponse;
import com.financialtransaction.entity.Transaction;
import org.springframework.stereotype.Component;

@Component
public class TransactionMapper {
    public TransactionResponse toResponse(Transaction tx) {
        TransactionResponse response = new TransactionResponse();
        response.setId(tx.getId());
        response.setTransactionReference(tx.getTransactionReference());
        response.setAccountNumber(tx.getAccount().getAccountNumber());
        response.setTransactionType(tx.getTransactionType());
        response.setAmount(tx.getAmount());
        response.setBalanceBefore(tx.getBalanceBefore());
        response.setBalanceAfter(tx.getBalanceAfter());
        response.setStatus(tx.getStatus());
        response.setDescription(tx.getDescription());
        response.setPerformedBy(tx.getPerformedBy() != null ? tx.getPerformedBy().getUsername() : "System");
        response.setTransactionDate(tx.getTransactionDate());
        return response;
    }
}