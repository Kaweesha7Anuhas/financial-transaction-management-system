package com.financialtransaction.dto.response;

import java.math.BigDecimal;
import java.util.List;

public class ChartDataResponse {
    private List<String> labels;
    private List<BigDecimal> deposits;
    private List<BigDecimal> withdrawals;

    public ChartDataResponse(List<String> labels, List<BigDecimal> deposits, List<BigDecimal> withdrawals) {
        this.labels = labels;
        this.deposits = deposits;
        this.withdrawals = withdrawals;
    }

    public List<String> getLabels() { return labels; }
    public List<BigDecimal> getDeposits() { return deposits; }
    public List<BigDecimal> getWithdrawals() { return withdrawals; }
}