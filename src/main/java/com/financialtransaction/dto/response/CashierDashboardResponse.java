package com.financialtransaction.dto.response;

import java.math.BigDecimal;

public class CashierDashboardResponse {
    private BigDecimal todayDeposits;
    private BigDecimal todayWithdrawals;
    private long todayTransactionCount;

    public CashierDashboardResponse(BigDecimal todayDeposits, BigDecimal todayWithdrawals, long todayTransactionCount) {
        this.todayDeposits = todayDeposits;
        this.todayWithdrawals = todayWithdrawals;
        this.todayTransactionCount = todayTransactionCount;
    }

    public BigDecimal getTodayDeposits() { return todayDeposits; }
    public BigDecimal getTodayWithdrawals() { return todayWithdrawals; }
    public long getTodayTransactionCount() { return todayTransactionCount; }
}