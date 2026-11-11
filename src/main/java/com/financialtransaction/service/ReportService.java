package com.financialtransaction.service;

import com.financialtransaction.dto.response.CashierDashboardResponse;
import com.financialtransaction.dto.response.CashierPerformanceResponse;
import com.financialtransaction.dto.response.ChartDataResponse;
import com.financialtransaction.dto.response.CustomerDashboardResponse;
import com.financialtransaction.dto.response.DashboardReportResponse;

import java.util.List;

public interface ReportService {
    DashboardReportResponse getDashboardReport();
    ChartDataResponse getChartData();           // Daily Charts
    ChartDataResponse getMonthlyChartData();    // Monthly Charts (NEW)
    CashierDashboardResponse getCashierDashboard();
    CustomerDashboardResponse getCustomerDashboard(String username);
    List<CashierPerformanceResponse> getCashierPerformance(); // Cashier Performance (NEW)
}