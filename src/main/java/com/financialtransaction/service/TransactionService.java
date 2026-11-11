package com.financialtransaction.service;

import com.financialtransaction.dto.request.TransactionRequest;
import com.financialtransaction.dto.response.TransactionResponse;
import com.financialtransaction.enums.TransactionType;
import com.financialtransaction.enums.TransactionStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.core.Authentication;

import java.time.LocalDate;

public interface TransactionService {
    TransactionResponse processDeposit(TransactionRequest request, Authentication authentication);
    TransactionResponse processWithdrawal(TransactionRequest request, Authentication authentication);
    
    // UPDATED: Added username for IDOR check
    Page<TransactionResponse> getTransactionsByAccount(String accountNumber, Pageable pageable, String username);
    
    TransactionResponse reverseTransaction(Long transactionId, Authentication authentication);
    
    Page<TransactionResponse> filterTransactions(String accountNumber, TransactionType type, TransactionStatus status, String cashierUsername, LocalDate startDate, LocalDate endDate, Pageable pageable);
    
    TransactionResponse getTransactionByReference(String reference);
}