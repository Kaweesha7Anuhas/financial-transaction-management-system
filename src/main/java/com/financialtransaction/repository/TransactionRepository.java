package com.financialtransaction.repository;

import com.financialtransaction.entity.Account;
import com.financialtransaction.entity.Transaction;
import com.financialtransaction.enums.TransactionStatus;
import com.financialtransaction.enums.TransactionType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface TransactionRepository extends JpaRepository<Transaction, Long> {
    
    Optional<Transaction> findByTransactionReference(String transactionReference);
    Optional<Transaction> findByIdempotencyKey(String idempotencyKey);
    List<Transaction> findByAccountOrderByTransactionDateDesc(Account account);
    boolean existsByReversalOf(Transaction transaction);

    Page<Transaction> findByAccountAccountNumberOrderByTransactionDateDesc(String accountNumber, Pageable pageable);

    List<Transaction> findByAccountAndTransactionDateBetweenOrderByTransactionDateAsc(
            Account account, LocalDateTime start, LocalDateTime end);

    @Query("SELECT COALESCE(SUM(t.amount), 0) FROM Transaction t WHERE t.transactionType = :type AND t.status = :status")
    BigDecimal sumTotalAmountByTypeAndStatus(@Param("type") TransactionType type, @Param("status") TransactionStatus status);

    @Query("SELECT COALESCE(SUM(t.amount), 0) FROM Transaction t WHERE t.account.customer.id = :customerId AND t.transactionType = :type AND t.status = :status")
    BigDecimal sumTotalAmountByCustomerAndTypeAndStatus(@Param("customerId") Long customerId, @Param("type") TransactionType type, @Param("status") TransactionStatus status);

    @Query("SELECT COALESCE(SUM(t.amount), 0) FROM Transaction t WHERE t.transactionType = 'DEPOSIT' AND t.status = 'COMPLETED' AND DATE(t.transactionDate) = CURRENT_DATE")
    BigDecimal getTodayDeposits();

    @Query("SELECT COALESCE(SUM(t.amount), 0) FROM Transaction t WHERE t.transactionType = 'WITHDRAWAL' AND t.status = 'COMPLETED' AND DATE(t.transactionDate) = CURRENT_DATE")
    BigDecimal getTodayWithdrawals();

    @Query("SELECT COUNT(t) FROM Transaction t WHERE DATE(t.transactionDate) = CURRENT_DATE")
    long getTodayTransactionCount();

    // Daily Reports for Chart.js
    @Query("SELECT FUNCTION('DATE', t.transactionDate), SUM(t.amount) FROM Transaction t " +
           "WHERE t.transactionType = 'DEPOSIT' AND t.status = 'COMPLETED' " +
           "GROUP BY FUNCTION('DATE', t.transactionDate) ORDER BY FUNCTION('DATE', t.transactionDate) ASC")
    List<Object[]> getDailyDeposits();

    @Query("SELECT FUNCTION('DATE', t.transactionDate), SUM(t.amount) FROM Transaction t " +
           "WHERE t.transactionType = 'WITHDRAWAL' AND t.status = 'COMPLETED' " +
           "GROUP BY FUNCTION('DATE', t.transactionDate) ORDER BY FUNCTION('DATE', t.transactionDate) ASC")
    List<Object[]> getDailyWithdrawals();

    // Monthly Reports for Chart.js (FIXED FOR MYSQL STRICT MODE)
    @Query("SELECT YEAR(t.transactionDate), MONTH(t.transactionDate), SUM(t.amount) FROM Transaction t " +
           "WHERE t.transactionType = 'DEPOSIT' AND t.status = 'COMPLETED' " +
           "GROUP BY YEAR(t.transactionDate), MONTH(t.transactionDate) " +
           "ORDER BY YEAR(t.transactionDate) ASC, MONTH(t.transactionDate) ASC")
    List<Object[]> getMonthlyDeposits();

    @Query("SELECT YEAR(t.transactionDate), MONTH(t.transactionDate), SUM(t.amount) FROM Transaction t " +
           "WHERE t.transactionType = 'WITHDRAWAL' AND t.status = 'COMPLETED' " +
           "GROUP BY YEAR(t.transactionDate), MONTH(t.transactionDate) " +
           "ORDER BY YEAR(t.transactionDate) ASC, MONTH(t.transactionDate) ASC")
    List<Object[]> getMonthlyWithdrawals();

    @Query("SELECT t.performedBy.username, COUNT(t), COALESCE(SUM(t.amount), 0) FROM Transaction t " +
           "WHERE t.status = 'COMPLETED' GROUP BY t.performedBy.username")
    List<Object[]> getCashierPerformance();

    // Global Filtering
    @Query("SELECT t FROM Transaction t WHERE " +
           "(:accountNumber IS NULL OR t.account.accountNumber = :accountNumber) AND " +
           "(:type IS NULL OR t.transactionType = :type) AND " +
           "(:status IS NULL OR t.status = :status) AND " +
           "(:cashierUsername IS NULL OR t.performedBy.username = :cashierUsername) AND " +
           "(:startDate IS NULL OR t.transactionDate >= :startDate) AND " +
           "(:endDate IS NULL OR t.transactionDate <= :endDate) " +
           "ORDER BY t.transactionDate DESC")
    Page<Transaction> filterTransactions(
            @Param("accountNumber") String accountNumber,
            @Param("type") TransactionType type,
            @Param("status") TransactionStatus status,
            @Param("cashierUsername") String cashierUsername,
            @Param("startDate") LocalDateTime startDate,
            @Param("endDate") LocalDateTime endDate,
            Pageable pageable);
}