package com.financialtransaction.mapper;

import com.financialtransaction.dto.response.CustomerResponse;
import com.financialtransaction.entity.Customer;
import org.springframework.stereotype.Component;

@Component
public class CustomerMapper {

    public CustomerResponse toResponse(Customer customer) {
        CustomerResponse response = new CustomerResponse();
        response.setId(customer.getId());
        response.setCustomerCode(customer.getCustomerCode());
        response.setFirstName(customer.getFirstName());
        response.setLastName(customer.getLastName());
        response.setEmail(customer.getEmail());
        response.setPhoneNumber(customer.getPhoneNumber());
        response.setAddress(customer.getAddress());
        response.setCity(customer.getCity());
        response.setDateOfBirth(customer.getDateOfBirth());
        response.setStatus(customer.getStatus());
        response.setCreatedAt(customer.getCreatedAt());
        return response;
    }
}