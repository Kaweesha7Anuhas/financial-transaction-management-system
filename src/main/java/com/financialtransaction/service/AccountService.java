package com.financialtransaction.service;

import com.financialtransaction.dto.request.AccountRequest;
import com.financialtransaction.dto.response.AccountResponse;
import java.util.List;

public interface AccountService {
    AccountResponse createAccount(AccountRequest request);
    AccountResponse getAccountByNumber(String accountNumber);
    List<AccountResponse> getAccountsByCustomerId(Long customerId);
    AccountResponse changeStatus(String accountNumber, com.financialtransaction.enums.AccountStatus status);
    List<AccountResponse> getMyAccounts(String username);
    
    // NEW: For Admin table
    List<AccountResponse> getAllAccounts();
}