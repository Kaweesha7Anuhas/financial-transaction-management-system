package com.financialtransaction.controller;

import com.financialtransaction.dto.request.TransactionRequest;
import com.financialtransaction.dto.response.TransactionResponse;
import com.financialtransaction.enums.TransactionStatus;
import com.financialtransaction.enums.TransactionType;
import com.financialtransaction.service.TransactionService;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;

@RestController
@RequestMapping("/api/transactions")
public class TransactionController {

    private final TransactionService transactionService;

    public TransactionController(TransactionService transactionService) {
        this.transactionService = transactionService;
    }

    @PostMapping("/deposits")
    @PreAuthorize("hasAnyRole('ADMIN', 'CASHIER')")
    public ResponseEntity<TransactionResponse> deposit(@Valid @RequestBody TransactionRequest request, Authentication authentication) {
        return new ResponseEntity<>(transactionService.processDeposit(request, authentication), HttpStatus.CREATED);
    }

    @PostMapping("/withdrawals")
    @PreAuthorize("hasAnyRole('ADMIN', 'CASHIER')")
    public ResponseEntity<TransactionResponse> withdraw(@Valid @RequestBody TransactionRequest request, Authentication authentication) {
        return new ResponseEntity<>(transactionService.processWithdrawal(request, authentication), HttpStatus.CREATED);
    }

    // UPDATED: Added CUSTOMER role and Authentication parameter
    @GetMapping("/account/{accountNumber}")
    @PreAuthorize("hasAnyRole('ADMIN', 'CASHIER', 'CUSTOMER')")
    public ResponseEntity<Page<TransactionResponse>> getTransactionsByAccount(
            @PathVariable String accountNumber,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            Authentication authentication) {
        Pageable pageable = PageRequest.of(page, size);
        return ResponseEntity.ok(transactionService.getTransactionsByAccount(accountNumber, pageable, authentication.getName()));
    }

    @PostMapping("/{id}/reverse")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<TransactionResponse> reverseTransaction(@PathVariable Long id, Authentication authentication) {
        return ResponseEntity.ok(transactionService.reverseTransaction(id, authentication));
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'CASHIER')")
    public ResponseEntity<Page<TransactionResponse>> filterTransactions(
            @RequestParam(required = false) String accountNumber,
            @RequestParam(required = false) TransactionType type,
            @RequestParam(required = false) TransactionStatus status,
            @RequestParam(required = false) String cashierUsername,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        return ResponseEntity.ok(transactionService.filterTransactions(accountNumber, type, status, cashierUsername, startDate, endDate, PageRequest.of(page, size)));
    }

    @GetMapping("/reference/{reference}")
    @PreAuthorize("hasAnyRole('ADMIN', 'CASHIER')")
    public ResponseEntity<TransactionResponse> getTransactionByReference(@PathVariable String reference) {
        return ResponseEntity.ok(transactionService.getTransactionByReference(reference));
    }
}