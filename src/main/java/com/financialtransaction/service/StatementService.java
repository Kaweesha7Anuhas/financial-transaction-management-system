package com.financialtransaction.service;

import com.financialtransaction.dto.response.StatementResponse;
import java.time.LocalDate;

public interface StatementService {
    StatementResponse generateStatement(String accountNumber, LocalDate startDate, LocalDate endDate, String username);
    String generateStatementCsv(String accountNumber, LocalDate startDate, LocalDate endDate, String username);
    byte[] generateStatementPdf(String accountNumber, LocalDate startDate, LocalDate endDate, String username);
}