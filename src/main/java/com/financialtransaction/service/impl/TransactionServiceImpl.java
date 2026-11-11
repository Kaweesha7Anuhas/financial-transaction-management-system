package com.financialtransaction.service.impl;

import com.financialtransaction.dto.request.TransactionRequest;
import com.financialtransaction.dto.response.TransactionResponse;
import com.financialtransaction.entity.Account;
import com.financialtransaction.entity.Customer;
import com.financialtransaction.entity.Transaction;
import com.financialtransaction.entity.User;
import com.financialtransaction.enums.AccountStatus;
import com.financialtransaction.enums.CustomerStatus;
import com.financialtransaction.enums.TransactionStatus;
import com.financialtransaction.enums.TransactionType;
import com.financialtransaction.exception.BusinessRuleException;
import com.financialtransaction.exception.DuplicateRequestException;
import com.financialtransaction.exception.ResourceNotFoundException;
import com.financialtransaction.mapper.TransactionMapper;
import com.financialtransaction.repository.AccountRepository;
import com.financialtransaction.repository.CustomerRepository;
import com.financialtransaction.repository.TransactionRepository;
import com.financialtransaction.repository.UserRepository;
import com.financialtransaction.service.AuditLogService;
import com.financialtransaction.service.TransactionService;
import com.financialtransaction.util.ReferenceGenerator;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;

@Service
public class TransactionServiceImpl implements TransactionService {

    private final AccountRepository accountRepository;
    private final TransactionRepository transactionRepository;
    private final UserRepository userRepository;
    private final CustomerRepository customerRepository;
    private final TransactionMapper transactionMapper;
    private final ReferenceGenerator referenceGenerator;
    private final AuditLogService auditLogService;

    public TransactionServiceImpl(AccountRepository accountRepository, TransactionRepository transactionRepository,
                                  UserRepository userRepository, CustomerRepository customerRepository,
                                  TransactionMapper transactionMapper, ReferenceGenerator referenceGenerator, 
                                  AuditLogService auditLogService) {
        this.accountRepository = accountRepository;
        this.transactionRepository = transactionRepository;
        this.userRepository = userRepository;
        this.customerRepository = customerRepository;
        this.transactionMapper = transactionMapper;
        this.referenceGenerator = referenceGenerator;
        this.auditLogService = auditLogService;
    }

    @Override
    @Transactional
    public TransactionResponse processDeposit(TransactionRequest request, Authentication authentication) {
        if (transactionRepository.findByIdempotencyKey(request.getIdempotencyKey()).isPresent()) {
            throw new DuplicateRequestException("Duplicate request detected.");
        }

        Account account = accountRepository.findByAccountNumberForUpdate(request.getAccountNumber())
                .orElseThrow(() -> new ResourceNotFoundException("Account not found"));

        if (account.getStatus() != AccountStatus.ACTIVE) {
            throw new BusinessRuleException("Account is not ACTIVE.");
        }
        if (account.getCustomer().getStatus() != CustomerStatus.ACTIVE) {
            throw new BusinessRuleException("Customer is not ACTIVE.");
        }

        BigDecimal balanceBefore = account.getBalance();
        BigDecimal balanceAfter = balanceBefore.add(request.getAmount());
        account.setBalance(balanceAfter);
        accountRepository.save(account);

        User staffUser = userRepository.findByUsername(authentication.getName()).orElseThrow();
        
        Transaction transaction = new Transaction();
        transaction.setTransactionReference(referenceGenerator.generateTransactionReference());
        transaction.setAccount(account);
        transaction.setTransactionType(TransactionType.DEPOSIT);
        transaction.setAmount(request.getAmount());
        transaction.setBalanceBefore(balanceBefore);
        transaction.setBalanceAfter(balanceAfter);
        transaction.setPaymentMethod(request.getPaymentMethod());
        transaction.setStatus(TransactionStatus.COMPLETED);
        transaction.setDescription(request.getDescription());
        transaction.setPerformedBy(staffUser);
        transaction.setIdempotencyKey(request.getIdempotencyKey());

        Transaction savedTx = transactionRepository.save(transaction);
        
        auditLogService.logAction(staffUser, "DEPOSIT", "Transaction", savedTx.getId(), 
                "Deposited " + request.getAmount() + " to " + account.getAccountNumber());

        return transactionMapper.toResponse(savedTx);
    }

    @Override
    @Transactional
    public TransactionResponse processWithdrawal(TransactionRequest request, Authentication authentication) {
        if (transactionRepository.findByIdempotencyKey(request.getIdempotencyKey()).isPresent()) {
            throw new DuplicateRequestException("Duplicate request detected.");
        }

        Account account = accountRepository.findByAccountNumberForUpdate(request.getAccountNumber())
                .orElseThrow(() -> new ResourceNotFoundException("Account not found"));

        if (account.getStatus() != AccountStatus.ACTIVE) {
            throw new BusinessRuleException("Account is not ACTIVE.");
        }

        BigDecimal balanceBefore = account.getBalance();
        if (balanceBefore.compareTo(request.getAmount()) < 0) {
            throw new BusinessRuleException("Insufficient funds. Balance: " + balanceBefore);
        }
        
        BigDecimal balanceAfter = balanceBefore.subtract(request.getAmount());
        account.setBalance(balanceAfter);
        accountRepository.save(account);

        User staffUser = userRepository.findByUsername(authentication.getName()).orElseThrow();
        
        Transaction transaction = new Transaction();
        transaction.setTransactionReference(referenceGenerator.generateTransactionReference());
        transaction.setAccount(account);
        transaction.setTransactionType(TransactionType.WITHDRAWAL);
        transaction.setAmount(request.getAmount());
        transaction.setBalanceBefore(balanceBefore);
        transaction.setBalanceAfter(balanceAfter);
        transaction.setPaymentMethod(request.getPaymentMethod());
        transaction.setStatus(TransactionStatus.COMPLETED);
        transaction.setDescription(request.getDescription());
        transaction.setPerformedBy(staffUser);
        transaction.setIdempotencyKey(request.getIdempotencyKey());

        Transaction savedTx = transactionRepository.save(transaction);
        
        auditLogService.logAction(staffUser, "WITHDRAWAL", "Transaction", savedTx.getId(), 
                "Withdrew " + request.getAmount() + " from " + account.getAccountNumber());

        return transactionMapper.toResponse(savedTx);
    }

    @Override
    public Page<TransactionResponse> getTransactionsByAccount(String accountNumber, Pageable pageable, String username) {
        Account account = accountRepository.findByAccountNumber(accountNumber)
                .orElseThrow(() -> new ResourceNotFoundException("Account not found"));

        // IDOR Protection: Customers can only view their own accounts
        User user = userRepository.findByUsername(username).orElseThrow();
        boolean isCustomer = user.getRoles().stream().anyMatch(r -> r.getName().name().equals("CUSTOMER"));
        if (isCustomer) {
            Customer customer = customerRepository.findByUser(user).orElseThrow();
            if (!account.getCustomer().getId().equals(customer.getId())) {
                throw new BusinessRuleException("Access Denied: You do not own this account.");
            }
        }

        return transactionRepository.findByAccountAccountNumberOrderByTransactionDateDesc(account.getAccountNumber(), pageable)
                .map(transactionMapper::toResponse);
    }

    @Override
    @Transactional
    public TransactionResponse reverseTransaction(Long transactionId, Authentication authentication) {
        Transaction originalTx = transactionRepository.findById(transactionId)
                .orElseThrow(() -> new ResourceNotFoundException("Transaction not found"));

        if (originalTx.getStatus() == TransactionStatus.REVERSED || transactionRepository.existsByReversalOf(originalTx)) {
            throw new BusinessRuleException("Transaction has already been reversed.");
        }

        Account account = accountRepository.findByAccountNumberForUpdate(originalTx.getAccount().getAccountNumber())
                .orElseThrow(() -> new ResourceNotFoundException("Account not found"));

        BigDecimal reverseAmount;
        TransactionType reverseType;
        
        if (originalTx.getTransactionType() == TransactionType.DEPOSIT) {
            reverseType = TransactionType.WITHDRAWAL;
            reverseAmount = originalTx.getAmount();
            if (account.getBalance().compareTo(reverseAmount) < 0) {
                throw new BusinessRuleException("Insufficient funds to reverse this deposit.");
            }
        } else if (originalTx.getTransactionType() == TransactionType.WITHDRAWAL) {
            reverseType = TransactionType.DEPOSIT;
            reverseAmount = originalTx.getAmount();
        } else {
            throw new BusinessRuleException("Only DEPOSIT and WITHDRAWAL can be reversed.");
        }

        BigDecimal balanceBefore = account.getBalance();
        BigDecimal balanceAfter = reverseType == TransactionType.DEPOSIT 
                ? balanceBefore.add(reverseAmount) 
                : balanceBefore.subtract(reverseAmount);
                
        account.setBalance(balanceAfter);
        accountRepository.save(account);

        User staffUser = userRepository.findByUsername(authentication.getName()).orElseThrow();
        
        Transaction reversalTx = new Transaction();
        reversalTx.setTransactionReference(referenceGenerator.generateTransactionReference());
        reversalTx.setAccount(account);
        reversalTx.setTransactionType(reverseType);
        reversalTx.setAmount(reverseAmount);
        reversalTx.setBalanceBefore(balanceBefore);
        reversalTx.setBalanceAfter(balanceAfter);
        reversalTx.setPaymentMethod(originalTx.getPaymentMethod());
        reversalTx.setStatus(TransactionStatus.COMPLETED);
        reversalTx.setDescription("Reversal of " + originalTx.getTransactionReference());
        reversalTx.setPerformedBy(staffUser);
        reversalTx.setReversalOf(originalTx);

        Transaction savedReversal = transactionRepository.save(reversalTx);

        originalTx.setStatus(TransactionStatus.REVERSED);
        transactionRepository.save(originalTx);

        auditLogService.logAction(staffUser, "REVERSAL", "Transaction", savedReversal.getId(),
                "Reversed transaction " + originalTx.getTransactionReference());

        return transactionMapper.toResponse(savedReversal);
    }

    @Override
    public Page<TransactionResponse> filterTransactions(String accountNumber, TransactionType type, TransactionStatus status, String cashierUsername, LocalDate startDate, LocalDate endDate, Pageable pageable) {
        LocalDateTime start = (startDate != null) ? startDate.atStartOfDay() : null;
        LocalDateTime end = (endDate != null) ? endDate.atTime(LocalTime.MAX) : null;

        return transactionRepository.filterTransactions(accountNumber, type, status, cashierUsername, start, end, pageable)
                .map(transactionMapper::toResponse);
    }

    @Override
    public TransactionResponse getTransactionByReference(String reference) {
        Transaction tx = transactionRepository.findByTransactionReference(reference)
                .orElseThrow(() -> new ResourceNotFoundException("Transaction not found with reference: " + reference));
        return transactionMapper.toResponse(tx);
    }
}