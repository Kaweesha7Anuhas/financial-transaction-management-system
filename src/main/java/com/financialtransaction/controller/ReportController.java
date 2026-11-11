package com.financialtransaction.controller;

import com.financialtransaction.service.ReportService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/reports")
public class ReportController {

    private final ReportService reportService;

    public ReportController(ReportService reportService) {
        this.reportService = reportService;
    }

    @GetMapping("/dashboard")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> getDashboardReport() {
        return ResponseEntity.ok(reportService.getDashboardReport());
    }

    @GetMapping("/charts")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> getChartData() {
        return ResponseEntity.ok(reportService.getChartData());
    }

    // NEW: Monthly Charts
    @GetMapping("/charts/monthly")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> getMonthlyChartData() {
        return ResponseEntity.ok(reportService.getMonthlyChartData());
    }

    @GetMapping("/cashier-dashboard")
    @PreAuthorize("hasAnyRole('ADMIN', 'CASHIER')")
    public ResponseEntity<?> getCashierDashboard() {
        return ResponseEntity.ok(reportService.getCashierDashboard());
    }

    @GetMapping("/customer-dashboard")
    @PreAuthorize("hasRole('CUSTOMER')")
    public ResponseEntity<?> getCustomerDashboard(Authentication authentication) {
        return ResponseEntity.ok(reportService.getCustomerDashboard(authentication.getName()));
    }

    // NEW: Cashier Performance Report
    @GetMapping("/cashier-performance")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> getCashierPerformance() {
        return ResponseEntity.ok(reportService.getCashierPerformance());
    }
}