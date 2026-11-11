package com.financialtransaction.service.impl;

import com.financialtransaction.dto.response.*;
import com.financialtransaction.entity.Customer;
import com.financialtransaction.entity.User;
import com.financialtransaction.enums.TransactionStatus;
import com.financialtransaction.enums.TransactionType;
import com.financialtransaction.exception.ResourceNotFoundException;
import com.financialtransaction.mapper.AccountMapper;
import com.financialtransaction.repository.AccountRepository;
import com.financialtransaction.repository.CustomerRepository;
import com.financialtransaction.repository.TransactionRepository;
import com.financialtransaction.repository.UserRepository;
import com.financialtransaction.service.ReportService;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.TreeSet;

@Service
public class ReportServiceImpl implements ReportService {

    private final CustomerRepository customerRepository;
    private final AccountRepository accountRepository;
    private final TransactionRepository transactionRepository;
    private final UserRepository userRepository;
    private final AccountMapper accountMapper;

    public ReportServiceImpl(CustomerRepository customerRepository, AccountRepository accountRepository, 
                             TransactionRepository transactionRepository, UserRepository userRepository, AccountMapper accountMapper) {
        this.customerRepository = customerRepository;
        this.accountRepository = accountRepository;
        this.transactionRepository = transactionRepository;
        this.userRepository = userRepository;
        this.accountMapper = accountMapper;
    }

    @Override
    public DashboardReportResponse getDashboardReport() {
        long totalCustomers = customerRepository.count();
        long totalAccounts = accountRepository.count();
        var totalDeposits = transactionRepository.sumTotalAmountByTypeAndStatus(TransactionType.DEPOSIT, TransactionStatus.COMPLETED);
        var totalWithdrawals = transactionRepository.sumTotalAmountByTypeAndStatus(TransactionType.WITHDRAWAL, TransactionStatus.COMPLETED);
        return new DashboardReportResponse(totalCustomers, totalAccounts, totalDeposits, totalWithdrawals);
    }

    @Override
    public ChartDataResponse getChartData() {
        var deposits = transactionRepository.getDailyDeposits();
        var withdrawals = transactionRepository.getDailyWithdrawals();

        Set<String> allDates = new TreeSet<>();
        Map<String, BigDecimal> depMap = new HashMap<>();
        Map<String, BigDecimal> wthMap = new HashMap<>();

        for (Object[] row : deposits) {
            String date = String.valueOf(row[0]);
            allDates.add(date);
            depMap.put(date, (BigDecimal) row[1]);
        }
        for (Object[] row : withdrawals) {
            String date = String.valueOf(row[0]);
            allDates.add(date);
            wthMap.put(date, (BigDecimal) row[1]);
        }

        List<String> labels = new ArrayList<>(allDates);
        List<BigDecimal> depData = labels.stream().map(d -> depMap.getOrDefault(d, BigDecimal.ZERO)).toList();
        List<BigDecimal> wthData = labels.stream().map(d -> wthMap.getOrDefault(d, BigDecimal.ZERO)).toList();

        return new ChartDataResponse(labels, depData, wthData);
    }

    @Override
    public ChartDataResponse getMonthlyChartData() {
        var deposits = transactionRepository.getMonthlyDeposits();
        var withdrawals = transactionRepository.getMonthlyWithdrawals();

        Set<String> allDates = new TreeSet<>();
        Map<String, BigDecimal> depMap = new HashMap<>();
        Map<String, BigDecimal> wthMap = new HashMap<>();

        for (Object[] row : deposits) {
            int year = ((Number) row[0]).intValue();
            int month = ((Number) row[1]).intValue();
            String date = String.format("%d-%02d", year, month);
            allDates.add(date);
            depMap.put(date, (BigDecimal) row[2]);
        }
        for (Object[] row : withdrawals) {
            int year = ((Number) row[0]).intValue();
            int month = ((Number) row[1]).intValue();
            String date = String.format("%d-%02d", year, month);
            allDates.add(date);
            wthMap.put(date, (BigDecimal) row[2]);
        }

        List<String> labels = new ArrayList<>(allDates);
        List<BigDecimal> depData = labels.stream().map(d -> depMap.getOrDefault(d, BigDecimal.ZERO)).toList();
        List<BigDecimal> wthData = labels.stream().map(d -> wthMap.getOrDefault(d, BigDecimal.ZERO)).toList();

        return new ChartDataResponse(labels, depData, wthData);
    }

    @Override
    public CashierDashboardResponse getCashierDashboard() {
        return new CashierDashboardResponse(
            transactionRepository.getTodayDeposits(),
            transactionRepository.getTodayWithdrawals(),
            transactionRepository.getTodayTransactionCount()
        );
    }

    @Override
    public CustomerDashboardResponse getCustomerDashboard(String username) {
        User user = userRepository.findByUsername(username).orElseThrow(() -> new ResourceNotFoundException("User not found"));
        Customer customer = customerRepository.findByUser(user).orElseThrow(() -> new ResourceNotFoundException("Customer not found"));

        List<AccountResponse> accounts = accountRepository.findByCustomer(customer)
                .stream().map(accountMapper::toResponse).toList();

        BigDecimal totalBalance = accounts.stream().map(AccountResponse::getBalance).reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal totalDeposits = transactionRepository.sumTotalAmountByCustomerAndTypeAndStatus(customer.getId(), TransactionType.DEPOSIT, TransactionStatus.COMPLETED);
        BigDecimal totalWithdrawals = transactionRepository.sumTotalAmountByCustomerAndTypeAndStatus(customer.getId(), TransactionType.WITHDRAWAL, TransactionStatus.COMPLETED);

        return new CustomerDashboardResponse(customer.getFirstName() + " " + customer.getLastName(), totalBalance, accounts, totalDeposits, totalWithdrawals);
    }

    @Override
    public List<CashierPerformanceResponse> getCashierPerformance() {
        return transactionRepository.getCashierPerformance().stream()
                .map(row -> new CashierPerformanceResponse(
                        (String) row[0],
                        (Long) row[1],
                        (BigDecimal) row[2]
                ))
                .toList();
    }
}