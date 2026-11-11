let currentAccountNumber = null;

$(document).ready(function () {
    // Load User Name
    $.get('/api/auth/me', function (user) {
        $('#adminName').text(user.fullName);
    });

    // Logout
    $('#logoutBtn').on('click', function () {
        $.post('/api/auth/logout', function () { window.location.href = '/index.html'; });
    });

    // Allow Enter key in search input
    $('#searchAccountInput').on('keypress', function(e) {
        if (e.which === 13) searchAccount();
    });
});

// 1. Search for an account
function searchAccount() {
    const accNum = $('#searchAccountInput').val().trim();
    if (!accNum) return;

    $('#searchError').addClass('d-none');
    
    $.ajax({
        url: `/api/accounts/${accNum}`,
        type: 'GET',
        success: function (account) {
            if (account.status !== 'ACTIVE') {
                $('#searchError').removeClass('d-none').text(`Warning: This account is currently ${account.status}.`);
            }
            
            currentAccountNumber = account.accountNumber;
            
            // Populate details
            $('#accCustomerName').text(account.customerFullName);
            $('#accBalance').text(formatCurrency(account.balance));
            
            // Show form
            $('#actionCard').removeClass('d-none');
            
            // Load history
            loadHistory(account.accountNumber);
        },
        error: function () {
            $('#searchError').removeClass('d-none').text("Account not found.");
            $('#actionCard').addClass('d-none');
            $('#historyTableBody').html('<tr><td colspan="5" class="text-center text-muted py-5">Search an account to view transaction history.</td></tr>');
        }
    });
}

// 2. Load Recent Transactions (History)
function loadHistory(accountNumber) {
    $.ajax({
        url: `/api/transactions/account/${accountNumber}?page=0&size=10`,
        type: 'GET',
        success: function (pageData) {
            let html = '';
            if (pageData.content.length === 0) {
                html = '<tr><td colspan="5" class="text-center text-muted py-5">No transactions yet.</td></tr>';
            } else {
                pageData.content.forEach(tx => {
                    const isDeposit = tx.transactionType === 'DEPOSIT';
                    const typeBadge = isDeposit 
                        ? '<span class="badge bg-success">Deposit</span>' 
                        : '<span class="badge bg-danger">Withdraw</span>';
                    const amountColor = isDeposit ? 'text-success' : 'text-danger';
                    const sign = isDeposit ? '+' : '-';
                    
                    // Format date
                    const date = new Date(tx.transactionDate).toLocaleString();

                    html += `
                        <tr>
                            <td><small>${date}</small></td>
                            <td><small class="text-muted">${tx.transactionReference}</small></td>
                            <td>${typeBadge}</td>
                            <td class="fw-bold ${amountColor}">${sign} ${formatCurrency(tx.amount)}</td>
                            <td>${formatCurrency(tx.balanceAfter)}</td>
                        </tr>
                    `;
                });
            }
            $('#historyTableBody').html(html);
        }
    });
}

// 3. Process Transaction (Deposit or Withdraw)
function processTransaction(type) {
    if (!currentAccountNumber) return;

    // Determine which form is being submitted
    const isDeposit = type === 'DEPOSIT';
    const amountInput = isDeposit ? '#depositAmount' : '#withdrawAmount';
    const methodInput = isDeposit ? '#depositMethod' : '#withdrawMethod';
    const descInput = isDeposit ? '#depositDesc' : '#withdrawDesc';
    const btn = isDeposit ? '#btnDeposit' : '#btnWithdraw';

    const amount = parseFloat($(amountInput).val());
    if (!amount || amount <= 0) {
        alert("Please enter a valid amount greater than zero.");
        return;
    }

    // Generate a unique Idempotency Key for this request
    const idempotencyKey = crypto.randomUUID();

    const payload = {
        accountNumber: currentAccountNumber,
        amount: amount,
        paymentMethod: $(methodInput).val(),
        description: $(descInput).val(),
        idempotencyKey: idempotencyKey
    };

    const originalBtnText = $(btn).text();
    $(btn).prop('disabled', true).html('<span class="spinner-border spinner-border-sm me-2"></span>Processing...');

    const url = isDeposit ? '/api/transactions/deposits' : '/api/transactions/withdrawals';

    $.ajax({
        url: url,
        type: 'POST',
        contentType: 'application/json',
        data: JSON.stringify(payload),
        success: function (response) {
            // Reset form
            $(amountInput).val('');
            $(descInput).val('');
            $(btn).prop('disabled', false).text(originalBtnText);

            // Update Balance instantly
            $('#accBalance').text(formatCurrency(response.balanceAfter));

            // Show Success Alert
            alert(`Success!\n${isDeposit ? 'Deposited' : 'Withdrew'} ${formatCurrency(response.amount)}\nRef: ${response.transactionReference}`);

            // Reload history to show the new transaction
            loadHistory(currentAccountNumber);
        },
        error: function (xhr) {
            $(btn).prop('disabled', false).text(originalBtnText);
            const errorMsg = xhr.responseJSON ? xhr.responseJSON.message : "Transaction failed.";
            alert("Error: " + errorMsg);
        }
    });
}