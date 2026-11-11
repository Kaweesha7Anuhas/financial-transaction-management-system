package com.financialtransaction.service.impl;

import com.financialtransaction.dto.response.StatementResponse;
import com.financialtransaction.entity.Account;
import com.financialtransaction.entity.Customer;
import com.financialtransaction.entity.Transaction;
import com.financialtransaction.entity.User;
import com.financialtransaction.enums.TransactionType;
import com.financialtransaction.exception.BusinessRuleException;
import com.financialtransaction.exception.ResourceNotFoundException;
import com.financialtransaction.mapper.TransactionMapper;
import com.financialtransaction.repository.AccountRepository;
import com.financialtransaction.repository.CustomerRepository;
import com.financialtransaction.repository.TransactionRepository;
import com.financialtransaction.repository.UserRepository;
import com.financialtransaction.service.StatementService;
import com.lowagie.text.*;
import com.lowagie.text.pdf.PdfPCell;
import com.lowagie.text.pdf.PdfPTable;
import com.lowagie.text.pdf.PdfWriter;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class StatementServiceImpl implements StatementService {

    private final AccountRepository accountRepository;
    private final TransactionRepository transactionRepository;
    private final TransactionMapper transactionMapper;
    private final UserRepository userRepository;
    private final CustomerRepository customerRepository;

    public StatementServiceImpl(AccountRepository accountRepository, TransactionRepository transactionRepository, 
                                TransactionMapper transactionMapper, UserRepository userRepository, 
                                CustomerRepository customerRepository) {
        this.accountRepository = accountRepository;
        this.transactionRepository = transactionRepository;
        this.transactionMapper = transactionMapper;
        this.userRepository = userRepository;
        this.customerRepository = customerRepository;
    }

    @Override
    public StatementResponse generateStatement(String accountNumber, LocalDate startDate, LocalDate endDate, String username) {
        Account account = accountRepository.findByAccountNumber(accountNumber)
                .orElseThrow(() -> new ResourceNotFoundException("Account not found"));
        
        verifyOwnership(account, username);

        LocalDateTime startDateTime = startDate.atStartOfDay();
        LocalDateTime endDateTime = endDate.atTime(LocalTime.MAX);

        List<Transaction> transactions = transactionRepository.findByAccountAndTransactionDateBetweenOrderByTransactionDateAsc(
                account, startDateTime, endDateTime);

        StatementResponse response = new StatementResponse();
        response.setAccountNumber(account.getAccountNumber());
        response.setCustomerName(account.getCustomer().getFirstName() + " " + account.getCustomer().getLastName());
        response.setStartDate(startDate);
        response.setEndDate(endDate);

        if (transactions.isEmpty()) {
            response.setOpeningBalance(account.getBalance());
            response.setClosingBalance(account.getBalance());
            response.setTotalDeposits(BigDecimal.ZERO);
            response.setTotalWithdrawals(BigDecimal.ZERO);
        } else {
            response.setOpeningBalance(transactions.get(0).getBalanceBefore());
            response.setClosingBalance(transactions.get(transactions.size() - 1).getBalanceAfter());

            BigDecimal totalDeposits = transactions.stream()
                    .filter(tx -> tx.getTransactionType() == TransactionType.DEPOSIT)
                    .map(Transaction::getAmount).reduce(BigDecimal.ZERO, BigDecimal::add);

            BigDecimal totalWithdrawals = transactions.stream()
                    .filter(tx -> tx.getTransactionType() == TransactionType.WITHDRAWAL)
                    .map(Transaction::getAmount).reduce(BigDecimal.ZERO, BigDecimal::add);

            response.setTotalDeposits(totalDeposits);
            response.setTotalWithdrawals(totalWithdrawals);
        }

        response.setTransactions(transactions.stream().map(transactionMapper::toResponse).collect(Collectors.toList()));
        return response;
    }

    @Override
    public String generateStatementCsv(String accountNumber, LocalDate startDate, LocalDate endDate, String username) {
        StatementResponse statement = generateStatement(accountNumber, startDate, endDate, username);
        StringBuilder csv = new StringBuilder();
        csv.append("Transaction Date,Reference,Type,Amount,Balance Before,Balance After,Description\n");
        for (var tx : statement.getTransactions()) {
            csv.append(tx.getTransactionDate()).append(",")
               .append(tx.getTransactionReference()).append(",")
               .append(tx.getTransactionType()).append(",")
               .append(tx.getAmount()).append(",")
               .append(tx.getBalanceBefore()).append(",")
               .append(tx.getBalanceAfter()).append(",")
               .append(tx.getDescription() != null ? tx.getDescription().replace(",", " ") : "").append("\n");
        }
        csv.append("\nSummary\nOpening Balance,").append(statement.getOpeningBalance())
           .append("\nTotal Deposits,").append(statement.getTotalDeposits())
           .append("\nTotal Withdrawals,").append(statement.getTotalWithdrawals())
           .append("\nClosing Balance,").append(statement.getClosingBalance()).append("\n");
        return csv.toString();
    }

    @Override
    public byte[] generateStatementPdf(String accountNumber, LocalDate startDate, LocalDate endDate, String username) {
        StatementResponse statement = generateStatement(accountNumber, startDate, endDate, username);
        ByteArrayOutputStream out = new ByteArrayOutputStream();

        try {
            Document document = new Document(PageSize.A4);
            PdfWriter.getInstance(document, out);
            document.open();

            Font titleFont = new Font(Font.HELVETICA, 18, Font.BOLD);
            Paragraph title = new Paragraph("Financial Statement", titleFont);
            title.setAlignment(Element.ALIGN_CENTER);
            document.add(title);

            document.add(new Paragraph("Account Number: " + statement.getAccountNumber()));
            document.add(new Paragraph("Customer Name: " + statement.getCustomerName()));
            document.add(new Paragraph("Statement Period: " + startDate + " to " + endDate));
            document.add(new Paragraph(" "));

            PdfPTable table = new PdfPTable(5);
            table.setWidthPercentage(100);
            table.addCell(new PdfPCell(new Phrase("Date")));
            table.addCell(new PdfPCell(new Phrase("Reference")));
            table.addCell(new PdfPCell(new Phrase("Type")));
            table.addCell(new PdfPCell(new Phrase("Amount")));
            table.addCell(new PdfPCell(new Phrase("Balance After")));

            for (var tx : statement.getTransactions()) {
                table.addCell(tx.getTransactionDate().toString().substring(0, 10));
                table.addCell(tx.getTransactionReference());
                table.addCell(tx.getTransactionType().toString());
                table.addCell(tx.getAmount().toString());
                table.addCell(tx.getBalanceAfter().toString());
            }
            document.add(table);

            document.add(new Paragraph(" "));
            document.add(new Paragraph("Opening Balance: LKR " + statement.getOpeningBalance()));
            document.add(new Paragraph("Total Deposits: LKR " + statement.getTotalDeposits()));
            document.add(new Paragraph("Total Withdrawals: LKR " + statement.getTotalWithdrawals()));
            document.add(new Paragraph("Closing Balance: LKR " + statement.getClosingBalance()));

            document.close();
        } catch (Exception e) {
            e.printStackTrace();
        }
        return out.toByteArray();
    }

    private void verifyOwnership(Account account, String username) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        
        boolean isCustomer = user.getRoles().stream().anyMatch(r -> r.getName().name().equals("CUSTOMER"));
        if (isCustomer) {
            Customer customer = customerRepository.findByUser(user)
                    .orElseThrow(() -> new ResourceNotFoundException("Customer profile not found"));
            if (!account.getCustomer().getId().equals(customer.getId())) {
                throw new BusinessRuleException("Access Denied: You do not own this account.");
            }
        }
    }
}