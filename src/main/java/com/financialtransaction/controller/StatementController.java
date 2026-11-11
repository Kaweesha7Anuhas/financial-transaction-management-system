package com.financialtransaction.controller;

import com.financialtransaction.dto.response.StatementResponse;
import com.financialtransaction.service.StatementService;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;

@RestController
@RequestMapping("/api/accounts")
public class StatementController {

    private final StatementService statementService;

    public StatementController(StatementService statementService) {
        this.statementService = statementService;
    }

    @GetMapping("/{accountNumber}/statement")
    @PreAuthorize("hasAnyRole('ADMIN', 'CASHIER', 'CUSTOMER')")
    public ResponseEntity<StatementResponse> getStatement(
            @PathVariable String accountNumber,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
            Authentication authentication) {
        return ResponseEntity.ok(statementService.generateStatement(accountNumber, startDate, endDate, authentication.getName()));
    }

    @GetMapping("/{accountNumber}/statement/csv")
    @PreAuthorize("hasAnyRole('ADMIN', 'CASHIER', 'CUSTOMER')")
    public ResponseEntity<byte[]> downloadStatementCsv(
            @PathVariable String accountNumber,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
            Authentication authentication) {
        String csvData = statementService.generateStatementCsv(accountNumber, startDate, endDate, authentication.getName());
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"statement_" + accountNumber + ".csv\"")
                .contentType(MediaType.parseMediaType("text/csv"))
                .body(csvData.getBytes(java.nio.charset.StandardCharsets.UTF_8));
    }

    @GetMapping("/{accountNumber}/statement/pdf")
    @PreAuthorize("hasAnyRole('ADMIN', 'CASHIER', 'CUSTOMER')")
    public ResponseEntity<byte[]> downloadStatementPdf(
            @PathVariable String accountNumber,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
            Authentication authentication) {
        byte[] pdfData = statementService.generateStatementPdf(accountNumber, startDate, endDate, authentication.getName());
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"statement_" + accountNumber + ".pdf\"")
                .contentType(MediaType.APPLICATION_PDF)
                .body(pdfData);
    }
}