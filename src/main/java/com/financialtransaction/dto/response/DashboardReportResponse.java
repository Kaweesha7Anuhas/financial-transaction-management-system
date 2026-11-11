package com.financialtransaction.dto.response;

import java.math.BigDecimal;

public class DashboardReportResponse {
    private long totalCustomers;
    private long totalAccounts;
    private BigDecimal totalDeposits;
    private BigDecimal totalWithdrawals;
    private BigDecimal totalTransactionVolume;

    public DashboardReportResponse(long totalCustomers, long totalAccounts, BigDecimal totalDeposits, BigDecimal totalWithdrawals) {
        this.totalCustomers = totalCustomers;
        this.totalAccounts = totalAccounts;
        this.totalDeposits = totalDeposits;
        this.totalWithdrawals = totalWithdrawals;
        this.totalTransactionVolume = totalDeposits.add(totalWithdrawals);
    }

    // Getters
    public long getTotalCustomers() { return totalCustomers; }
    public long getTotalAccounts() { return totalAccounts; }
    public BigDecimal getTotalDeposits() { return totalDeposits; }
    public BigDecimal getTotalWithdrawals() { return totalWithdrawals; }
    public BigDecimal getTotalTransactionVolume() { return totalTransactionVolume; }
}