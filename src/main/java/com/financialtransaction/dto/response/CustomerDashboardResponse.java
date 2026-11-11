package com.financialtransaction.dto.response;

import java.math.BigDecimal;
import java.util.List;

public class CustomerDashboardResponse {
    private String fullName;
    private BigDecimal totalBalance;
    private List<AccountResponse> accounts;
    private BigDecimal totalDeposits;
    private BigDecimal totalWithdrawals;

    public CustomerDashboardResponse(String fullName, BigDecimal totalBalance, List<AccountResponse> accounts, BigDecimal totalDeposits, BigDecimal totalWithdrawals) {
        this.fullName = fullName;
        this.totalBalance = totalBalance;
        this.accounts = accounts;
        this.totalDeposits = totalDeposits;
        this.totalWithdrawals = totalWithdrawals;
    }

    public String getFullName() { return fullName; }
    public BigDecimal getTotalBalance() { return totalBalance; }
    public List<AccountResponse> getAccounts() { return accounts; }
    public BigDecimal getTotalDeposits() { return totalDeposits; }
    public BigDecimal getTotalWithdrawals() { return totalWithdrawals; }
}