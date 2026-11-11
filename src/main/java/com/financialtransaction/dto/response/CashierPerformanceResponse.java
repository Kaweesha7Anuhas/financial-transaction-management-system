package com.financialtransaction.dto.response;

import java.math.BigDecimal;

public class CashierPerformanceResponse {
    private String cashierName;
    private long transactionCount;
    private BigDecimal totalVolume;

    public CashierPerformanceResponse(String cashierName, long transactionCount, BigDecimal totalVolume) {
        this.cashierName = cashierName;
        this.transactionCount = transactionCount;
        this.totalVolume = totalVolume;
    }

    public String getCashierName() { return cashierName; }
    public long getTransactionCount() { return transactionCount; }
    public BigDecimal getTotalVolume() { return totalVolume; }
}