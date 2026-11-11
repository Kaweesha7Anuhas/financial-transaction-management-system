package com.financialtransaction.service.impl;

import com.financialtransaction.dto.request.AccountRequest;
import com.financialtransaction.dto.response.AccountResponse;
import com.financialtransaction.entity.Account;
import com.financialtransaction.entity.Customer;
import com.financialtransaction.entity.User;
import com.financialtransaction.enums.AccountStatus;
import com.financialtransaction.exception.BusinessRuleException;
import com.financialtransaction.exception.ResourceNotFoundException;
import com.financialtransaction.mapper.AccountMapper;
import com.financialtransaction.repository.AccountRepository;
import com.financialtransaction.repository.CustomerRepository;
import com.financialtransaction.repository.UserRepository;
import com.financialtransaction.service.AccountService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;
import java.util.Random;
import java.util.stream.Collectors;

@Service
public class AccountServiceImpl implements AccountService {

    private final AccountRepository accountRepository;
    private final CustomerRepository customerRepository;
    private final UserRepository userRepository;
    private final AccountMapper accountMapper;

    public AccountServiceImpl(AccountRepository accountRepository, CustomerRepository customerRepository, UserRepository userRepository, AccountMapper accountMapper) {
        this.accountRepository = accountRepository;
        this.customerRepository = customerRepository;
        this.userRepository = userRepository;
        this.accountMapper = accountMapper;
    }

    @Override
    @Transactional
    public AccountResponse createAccount(AccountRequest request) {
        Customer customer = customerRepository.findById(request.getCustomerId())
                .orElseThrow(() -> new ResourceNotFoundException("Customer not found with ID: " + request.getCustomerId()));

        Account account = new Account();
        account.setAccountNumber(generateAccountNumber());
        account.setAccountType(request.getAccountType());
        account.setAccountName(request.getAccountName());
        account.setBalance(BigDecimal.ZERO);
        account.setCurrency("LKR");
        account.setStatus(AccountStatus.ACTIVE);
        account.setCustomer(customer);

        return accountMapper.toResponse(accountRepository.save(account));
    }

    @Override
    @Transactional(readOnly = true) // FIXED: Keeps session open for Lazy Loading
    public List<AccountResponse> getAllAccounts() {
        return accountRepository.findAll().stream()
                .map(accountMapper::toResponse)
                .collect(Collectors.toList());
    }

    @Override
    public AccountResponse getAccountByNumber(String accountNumber) {
        Account account = accountRepository.findByAccountNumber(accountNumber)
                .orElseThrow(() -> new ResourceNotFoundException("Account not found: " + accountNumber));
        return accountMapper.toResponse(account);
    }

    @Override
    @Transactional(readOnly = true) // FIXED
    public List<AccountResponse> getAccountsByCustomerId(Long customerId) {
        Customer customer = customerRepository.findById(customerId)
                .orElseThrow(() -> new ResourceNotFoundException("Customer not found with ID: " + customerId));
        return accountRepository.findByCustomer(customer).stream()
                .map(accountMapper::toResponse)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional
    public AccountResponse changeStatus(String accountNumber, AccountStatus status) {
        Account account = accountRepository.findByAccountNumber(accountNumber)
                .orElseThrow(() -> new ResourceNotFoundException("Account not found"));
        
        if (account.getStatus() == AccountStatus.CLOSED && status == AccountStatus.ACTIVE) {
            throw new BusinessRuleException("Cannot reactivate a CLOSED account.");
        }
        account.setStatus(status);
        return accountMapper.toResponse(accountRepository.save(account));
    }

    @Override
    @Transactional(readOnly = true) // FIXED
    public List<AccountResponse> getMyAccounts(String username) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        Customer customer = customerRepository.findByUser(user)
                .orElseThrow(() -> new ResourceNotFoundException("Customer profile not found"));
        
        return accountRepository.findByCustomer(customer).stream()
                .map(accountMapper::toResponse)
                .collect(Collectors.toList());
    }

    private String generateAccountNumber() {
        String accountNumber;
        do {
            long number = 1000000000L + (long)(new Random().nextDouble() * 9000000000L);
            accountNumber = String.valueOf(number);
        } while (accountRepository.findByAccountNumber(accountNumber).isPresent());
        return accountNumber;
    }
}