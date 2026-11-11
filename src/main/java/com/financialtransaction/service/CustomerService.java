package com.financialtransaction.service;

import com.financialtransaction.dto.request.CustomerRequest;
import com.financialtransaction.dto.request.CustomerUpdateRequest;
import com.financialtransaction.dto.response.CustomerResponse;
import com.financialtransaction.enums.CustomerStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.List;

public interface CustomerService {
    CustomerResponse createCustomer(CustomerRequest request);
    List<CustomerResponse> getAllCustomers();
    CustomerResponse getCustomerById(Long id);
    CustomerResponse getCustomerByCode(String customerCode);
    
    // NEW METHODS
    CustomerResponse updateCustomer(Long id, CustomerUpdateRequest request);
    CustomerResponse changeStatus(Long id, CustomerStatus status);
    Page<CustomerResponse> searchCustomers(String keyword, Pageable pageable);
}