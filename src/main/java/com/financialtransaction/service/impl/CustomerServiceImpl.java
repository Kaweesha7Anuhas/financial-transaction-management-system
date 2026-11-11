package com.financialtransaction.service.impl;

import com.financialtransaction.dto.request.CustomerRequest;
import com.financialtransaction.dto.response.CustomerResponse;
import com.financialtransaction.entity.Customer;
import com.financialtransaction.enums.CustomerStatus;
import com.financialtransaction.exception.BusinessRuleException;
import com.financialtransaction.exception.ResourceNotFoundException;
import com.financialtransaction.mapper.CustomerMapper;
import com.financialtransaction.repository.CustomerRepository;
import com.financialtransaction.service.AuditLogService;
import com.financialtransaction.service.CustomerService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Random;
import java.util.stream.Collectors;

@Service
public class CustomerServiceImpl implements CustomerService {

    private final CustomerRepository customerRepository;
    private final CustomerMapper customerMapper;
    private final AuditLogService auditLogService;

    public CustomerServiceImpl(CustomerRepository customerRepository, CustomerMapper customerMapper, AuditLogService auditLogService) {
        this.customerRepository = customerRepository;
        this.customerMapper = customerMapper;
        this.auditLogService = auditLogService;
    }

    @Override
    @Transactional
    public CustomerResponse createCustomer(CustomerRequest request) {
        if (customerRepository.existsByEmail(request.getEmail())) {
            throw new BusinessRuleException("Email already in use by another customer.");
        }

        Customer customer = new Customer();
        customer.setCustomerCode(generateCustomerCode());
        customer.setFirstName(request.getFirstName());
        customer.setLastName(request.getLastName());
        customer.setEmail(request.getEmail());
        customer.setPhoneNumber(request.getPhoneNumber());
        customer.setAddress(request.getAddress());
        customer.setCity(request.getCity());
        customer.setDateOfBirth(request.getDateOfBirth());
        customer.setStatus(CustomerStatus.ACTIVE);

        Customer savedCustomer = customerRepository.save(customer);
        
        // Audit Log
        auditLogService.logAction(null, "CUSTOMER_CREATED", "Customer", savedCustomer.getId(), "Staff created customer: " + savedCustomer.getCustomerCode());

        return customerMapper.toResponse(savedCustomer);
    }

    @Override
    public List<CustomerResponse> getAllCustomers() {
        return customerRepository.findAll().stream()
                .map(customerMapper::toResponse)
                .collect(Collectors.toList());
    }

    @Override
    public CustomerResponse getCustomerById(Long id) {
        Customer customer = customerRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Customer not found with ID: " + id));
        return customerMapper.toResponse(customer);
    }

    @Override
    public CustomerResponse getCustomerByCode(String customerCode) {
        Customer customer = customerRepository.findByCustomerCode(customerCode)
                .orElseThrow(() -> new ResourceNotFoundException("Customer not found with code: " + customerCode));
        return customerMapper.toResponse(customer);
    }

    @Override
    @Transactional
    public CustomerResponse updateCustomer(Long id, com.financialtransaction.dto.request.CustomerUpdateRequest request) {
        Customer customer = customerRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Customer not found"));

        if (!customer.getEmail().equals(request.getEmail()) && customerRepository.existsByEmail(request.getEmail())) {
            throw new BusinessRuleException("Email is already in use by another customer.");
        }

        customer.setFirstName(request.getFirstName());
        customer.setLastName(request.getLastName());
        customer.setEmail(request.getEmail());
        customer.setPhoneNumber(request.getPhoneNumber());
        customer.setAddress(request.getAddress());
        customer.setCity(request.getCity());

        Customer updatedCustomer = customerRepository.save(customer);
        
        // Audit Log
        auditLogService.logAction(null, "CUSTOMER_UPDATED", "Customer", updatedCustomer.getId(), "Customer details updated");

        return customerMapper.toResponse(updatedCustomer);
    }

    @Override
    @Transactional
    public CustomerResponse changeStatus(Long id, CustomerStatus status) {
        Customer customer = customerRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Customer not found"));
        
        customer.setStatus(status);
        return customerMapper.toResponse(customerRepository.save(customer));
    }

    @Override
    public org.springframework.data.domain.Page<CustomerResponse> searchCustomers(String keyword, org.springframework.data.domain.Pageable pageable) {
        return customerRepository.searchCustomers(keyword, pageable)
                .map(customerMapper::toResponse);
    }

    private String generateCustomerCode() {
        String code;
        do {
            int number = 1000 + new Random().nextInt(9000);
            code = "CUS-" + number;
        } while (customerRepository.existsByCustomerCode(code));
        return code;
    }
}