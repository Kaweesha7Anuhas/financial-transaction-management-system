package com.financialtransaction.mapper;

import com.financialtransaction.dto.response.AccountResponse;
import com.financialtransaction.entity.Account;
import org.springframework.stereotype.Component;

@Component
public class AccountMapper {

    public AccountResponse toResponse(Account account) {
        AccountResponse response = new AccountResponse();
        response.setId(account.getId());
        response.setAccountNumber(account.getAccountNumber());
        response.setAccountType(account.getAccountType());
        response.setAccountName(account.getAccountName());
        response.setBalance(account.getBalance());
        response.setCurrency(account.getCurrency());
        response.setStatus(account.getStatus());
        response.setCreatedAt(account.getCreatedAt());
        
        if (account.getCustomer() != null) {
            response.setCustomerId(account.getCustomer().getId());
            response.setCustomerFullName(account.getCustomer().getFirstName() + " " + account.getCustomer().getLastName());
        }
        
        return response;
    }
}