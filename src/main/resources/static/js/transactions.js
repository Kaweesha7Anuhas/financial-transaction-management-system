/* ==========================================================================
   transactions.js — FTM System (shared by admin + cashier)
   --------------------------------------------------------------------------
   Update in this revision:
     · Role guard now allows CASHIER **or** ADMIN
       (previously ADMIN-only — which would bounce cashiers off the page)
     · Everything else is unchanged from the admin-step delivery
   Preserved:
     · Global `currentAccountNumber` + all globals
     · All endpoints:
         GET  /api/auth/me
         POST /api/auth/logout
         GET  /api/accounts/{accNum}
         GET  /api/transactions/account/{accountNumber}?page=0&size=10
         POST /api/transactions/deposits
         POST /api/transactions/withdrawals
     · Payload: { accountNumber, amount, paymentMethod, description, idempotencyKey }
     · Crypto UUID idempotency key
     · Bootstrap pill tabs, all form IDs, status-warning behavior,
       success reset + balance update + history reload
   ========================================================================== */

let currentAccountNumber = null;
let pendingTransaction = null;
let confirmTxnModal = null;

$(document).ready(function () {

    confirmTxnModal = new bootstrap.Modal(document.getElementById('confirmTxnModal'));

    /* ---- Load user info — CASHIER **or** ADMIN allowed ---- */
    $.ajax({
        url: '/api/auth/me',
        type: 'GET',
        success: function (user) {
            const roles = (user && Array.isArray(user.roles)) ? user.roles : [];
            if (!roles.includes('CASHIER') && !roles.includes('ADMIN')) {
                window.location.href = '/index.html';
                return;
            }
            const name = (user.fullName || 'User').trim();
            $('#adminName').text(name);
            $('#userInitial').text((name.charAt(0) || 'C').toUpperCase());
        },
        error: function () { window.location.href = '/index.html'; }
    });

    /* ---- Logout (sidebar + topbar) ---- */
    function doLogout(e) {
        if (e && e.preventDefault) e.preventDefault();
        $.ajax({
            url: '/api/auth/logout',
            type: 'POST',
            success: function () { window.location.href = '/index.html'; },
            error:   function () { window.location.href = '/index.html'; }
        });
    }
    $('#logoutBtn').on('click', doLogout);
    $('.js-logout').on('click', doLogout);

    /* ---- Enter key on search ---- */
    $('#searchAccountInput').on('keypress', function (e) {
        if (e.which === 13) searchAccount();
    });

    /* ---- Confirm transaction button ---- */
    $('#confirmTxnBtn').on('click', executeTransaction);

    /* ---- Reset form buttons if modal is dismissed ---- */
    const modalEl = document.getElementById('confirmTxnModal');
    if (modalEl) {
        modalEl.addEventListener('hidden.bs.modal', function () {
            if (pendingTransaction) {
                const p = pendingTransaction;
                pendingTransaction = null;
                $(p.btn).prop('disabled', false).text(p.originalBtnText);
            }
        });
    }
});

/* ======================================================================
 * 1. Search account
 * ==================================================================== */
function searchAccount() {
    const accNum = ($('#searchAccountInput').val() || '').trim();
    if (!accNum) {
        if (window.toast) window.toast('Please enter an account number.', 'warning');
        return;
    }

    hideSearchFeedback();

    const $searchBtn = $('#searchAccountBtn');
    $searchBtn.prop('disabled', true)
        .html('<span class="spinner-border spinner-border-sm me-1"></span>Searching…');

    $.ajax({
        url: '/api/accounts/' + encodeURIComponent(accNum),
        type: 'GET',
        success: function (account) {
            $searchBtn.prop('disabled', false).html('<i class="bi bi-search me-1"></i>Search');

            currentAccountNumber = account.accountNumber;

            if (account.status !== 'ACTIVE') {
                showSearchFeedback('warning', 'Warning: This account is currently ' + account.status + '.');
            }

            $('#accCustomerName').text(account.customerFullName || '—');
            $('#accBalance').text(formatCurrency(account.balance));
            $('#accNumberDisplay').text('···' + String(account.accountNumber).slice(-4));
            $('#accStatusPill').html(renderStatusPill(account.status));

            $('#actionCard').removeClass('d-none');
            $('#refreshHistoryBtn').prop('disabled', false);

            loadHistory(account.accountNumber);
        },
        error: function (xhr) {
            $searchBtn.prop('disabled', false).html('<i class="bi bi-search me-1"></i>Search');

            const msg = (xhr.status === 404)
                ? 'Account not found.'
                : (xhr.responseJSON && xhr.responseJSON.message)
                    ? xhr.responseJSON.message
                    : 'Account not found.';
            showSearchFeedback('error', msg);

            currentAccountNumber = null;
            $('#actionCard').addClass('d-none');
            $('#refreshHistoryBtn').prop('disabled', true);
            $('#historyTableBody').html(
                '<tr><td colspan="5" class="py-5" style="border:0;">' +
                    '<div class="empty-state" style="padding:0;">' +
                        '<div class="empty-icon"><i class="bi bi-search"></i></div>' +
                        '<h4>No account selected</h4>' +
                        '<p>Search an account to view transaction history.</p>' +
                    '</div>' +
                '</td></tr>'
            );
        }
    });
}

/* ======================================================================
 * 2. Load recent transactions
 * ==================================================================== */
function loadHistory(accountNumber) {
    if (!accountNumber) return;

    showHistorySkeleton();

    $.ajax({
        url: '/api/transactions/account/' + encodeURIComponent(accountNumber) + '?page=0&size=10',
        type: 'GET',
        success: function (pageData) {
            if (accountNumber !== currentAccountNumber) return;
            renderHistory(pageData);
        },
        error: function () {
            if (accountNumber !== currentAccountNumber) return;
            $('#historyTableBody').html(
                '<tr><td colspan="5" class="py-5" style="border:0;">' +
                    '<div class="error-state" style="padding:0;">' +
                        '<div class="empty-icon"><i class="bi bi-exclamation-triangle"></i></div>' +
                        '<h4>Could not load history</h4>' +
                        '<p>Please try refreshing.</p>' +
                    '</div>' +
                '</td></tr>'
            );
            if (window.toast) window.toast('Could not load transaction history.', 'danger');
        }
    });
}

function showHistorySkeleton() {
    let rows = '';
    for (let i = 0; i < 4; i++) {
        rows +=
            '<tr>' +
                '<td><span class="skeleton" style="display:inline-block;width:120px;height:14px;"></span></td>' +
                '<td><span class="skeleton" style="display:inline-block;width:90px;height:14px;"></span></td>' +
                '<td><span class="skeleton" style="display:inline-block;width:70px;height:22px;border-radius:999px;"></span></td>' +
                '<td class="text-end"><span class="skeleton" style="display:inline-block;width:90px;height:14px;"></span></td>' +
                '<td class="text-end"><span class="skeleton" style="display:inline-block;width:90px;height:14px;"></span></td>' +
            '</tr>';
    }
    $('#historyTableBody').html(rows);
}

function renderHistory(pageData) {
    if (!pageData || !Array.isArray(pageData.content) || pageData.content.length === 0) {
        $('#historyTableBody').html(
            '<tr><td colspan="5" class="py-5" style="border:0;">' +
                '<div class="empty-state" style="padding:0;">' +
                    '<div class="empty-icon"><i class="bi bi-receipt"></i></div>' +
                    '<h4>No transactions yet</h4>' +
                    '<p>Process a deposit or withdrawal to get started.</p>' +
                '</div>' +
            '</td></tr>'
        );
        return;
    }

    let html = '';
    pageData.content.forEach(function (tx) {
        const isDeposit    = tx.transactionType === 'DEPOSIT';
        const isWithdrawal = tx.transactionType === 'WITHDRAWAL';
        let typePill = isDeposit
            ? '<span class="status-pill status-success">Deposit</span>'
            : isWithdrawal
                ? '<span class="status-pill status-danger">Withdraw</span>'
                : '<span class="status-pill status-warning">Reversal</span>';
        if (tx.status === 'REVERSED') {
            typePill += ' <span class="status-pill status-neutral ms-1">Reversed</span>';
        }
        const amountClass = isDeposit ? 'amount-positive' : (isWithdrawal ? 'amount-negative' : '');
        const sign = isDeposit ? '+' : (isWithdrawal ? '−' : '↺');

        const date = (window.FTM && FTM.fmtDateTime)
            ? FTM.fmtDateTime(tx.transactionDate)
            : new Date(tx.transactionDate).toLocaleString();

        html +=
            '<tr>' +
                '<td class="text-muted-2"><small>' + esc(date) + '</small></td>' +
                '<td><span class="mono text-muted-2" style="font-size:.78rem;">' + esc(tx.transactionReference) + '</span></td>' +
                '<td>' + typePill + '</td>' +
                '<td class="amount ' + amountClass + '">' + sign + ' ' + formatCurrency(tx.amount) + '</td>' +
                '<td class="text-end tabular-nums">' + formatCurrency(tx.balanceAfter) + '</td>' +
            '</tr>';
    });

    $('#historyTableBody').html(html);
}

/* ======================================================================
 * 3. Initiate transaction — opens confirm modal
 * ==================================================================== */
function processTransaction(type) {
    if (!currentAccountNumber) return;

    const isDeposit   = type === 'DEPOSIT';
    const amountInput = isDeposit ? '#depositAmount' : '#withdrawAmount';
    const methodInput = isDeposit ? '#depositMethod' : '#withdrawMethod';
    const descInput   = isDeposit ? '#depositDesc'   : '#withdrawDesc';
    const btn         = isDeposit ? '#btnDeposit'    : '#btnWithdraw';
    const originalBtnText = isDeposit ? 'Process Deposit' : 'Process Withdrawal';

    const amount = parseFloat($(amountInput).val());
    if (!amount || amount <= 0) {
        if (window.toast) window.toast('Please enter a valid amount greater than zero.', 'warning');
        return;
    }

    const currentBalance = parseFloat(String($('#accBalance').text()).replace(/[^\d.-]/g, '')) || 0;
    const newBalance = isDeposit ? currentBalance + amount : currentBalance - amount;
    const willOverdraw = !isDeposit && newBalance < 0;

    const idempotencyKey = (window.crypto && typeof crypto.randomUUID === 'function')
        ? crypto.randomUUID()
        : 'ftm-' + Date.now() + '-' + Math.random().toString(36).slice(2, 10);

    pendingTransaction = {
        type: type,
        isDeposit: isDeposit,
        accountNumber: currentAccountNumber,
        amount: amount,
        paymentMethod: $(methodInput).val(),
        description: ($(descInput).val() || '').trim(),
        idempotencyKey: idempotencyKey,
        amountInput: amountInput,
        descInput: descInput,
        btn: btn,
        originalBtnText: originalBtnText
    };

    $('#confirmTxnTitle').text(isDeposit ? 'Confirm deposit' : 'Confirm withdrawal');
    $('#confirmType').text(isDeposit ? 'Deposit' : 'Withdrawal');
    $('#confirmAccount').text(currentAccountNumber);
    $('#confirmHolder').text($('#accCustomerName').text() || '—');
    $('#confirmAmount').text(formatCurrency(amount));
    $('#confirmMethod').text(pendingTransaction.paymentMethod);
    $('#confirmDesc').text(pendingTransaction.description || '—');
    $('#confirmBalance').text(formatCurrency(currentBalance));
    $('#confirmNewBalance').text(formatCurrency(newBalance));

    const $confirmBtn = $('#confirmTxnBtn');
    $confirmBtn
        .removeClass('btn-success btn-danger')
        .addClass(isDeposit ? 'btn-success' : 'btn-danger')
        .prop('disabled', false)
        .text(isDeposit ? 'Confirm deposit' : 'Confirm withdrawal');
    $('#cancelTxnBtn').prop('disabled', false);

    if (willOverdraw) {
        $('#confirmWarning').removeClass('d-none').text(
            'This withdrawal exceeds the current balance. The bank may decline the transaction.'
        );
    } else {
        $('#confirmWarning').addClass('d-none').text('');
    }

    confirmTxnModal.show();
}

/* ======================================================================
 * 4. Execute the confirmed transaction (AJAX)
 * ==================================================================== */
function executeTransaction() {
    if (!pendingTransaction) return;

    const p = pendingTransaction;

    const $btn = $(p.btn);
    const $confirmBtn = $('#confirmTxnBtn');
    const $cancelBtn = $('#cancelTxnBtn');

    $confirmBtn.prop('disabled', true)
        .html('<span class="spinner-border spinner-border-sm me-2"></span>Processing…');
    $cancelBtn.prop('disabled', true);
    $btn.prop('disabled', true)
        .html('<span class="spinner-border spinner-border-sm me-2"></span>Processing…');

    const url = p.isDeposit
        ? '/api/transactions/deposits'
        : '/api/transactions/withdrawals';

    const payload = {
        accountNumber:  p.accountNumber,
        amount:         p.amount,
        paymentMethod:  p.paymentMethod,
        description:    p.description,
        idempotencyKey: p.idempotencyKey
    };

    $.ajax({
        url: url,
        type: 'POST',
        contentType: 'application/json',
        data: JSON.stringify(payload),

        success: function (response) {
            pendingTransaction = null;
            confirmTxnModal.hide();

            $btn.prop('disabled', false).text(p.originalBtnText);
            $confirmBtn.prop('disabled', false)
                .removeClass('btn-success btn-danger')
                .text(p.isDeposit ? 'Confirm deposit' : 'Confirm withdrawal');
            $cancelBtn.prop('disabled', false);

            $(p.amountInput).val('');
            $(p.descInput).val('');

            $('#accBalance').text(formatCurrency(response.balanceAfter));

            if (window.toast) {
                const verb = p.isDeposit ? 'Deposited' : 'Withdrew';
                window.toast(
                    verb + ' ' + formatCurrency(response.amount) + ' · Ref: ' + response.transactionReference,
                    'success',
                    { duration: 6000 }
                );
            }

            loadHistory(currentAccountNumber);
        },

        error: function (xhr) {
            $btn.prop('disabled', false).text(p.originalBtnText);
            $confirmBtn.prop('disabled', false)
                .text(p.isDeposit ? 'Confirm deposit' : 'Confirm withdrawal');
            $cancelBtn.prop('disabled', false);

            const msg = (xhr.responseJSON && xhr.responseJSON.message)
                ? xhr.responseJSON.message
                : 'Transaction failed.';

            if (window.toast) window.toast(msg, 'danger');
        }
    });
}

/* ======================================================================
 * Small helpers
 * ==================================================================== */
function showSearchFeedback(kind, msg) {
    $('#searchError')
        .removeClass('d-none text-danger text-warning')
        .addClass(kind === 'warning' ? 'text-warning' : 'text-danger')
        .text(msg);
}
function hideSearchFeedback() {
    $('#searchError').addClass('d-none').removeClass('text-danger text-warning').text('');
}

function renderStatusPill(status) {
    switch (status) {
        case 'ACTIVE':  return '<span class="status-pill status-success">Active</span>';
        case 'FROZEN':  return '<span class="status-pill status-warning">Frozen</span>';
        case 'CLOSED':  return '<span class="status-pill status-neutral">Closed</span>';
        default:        return '<span class="status-pill status-danger">' + esc(status || 'Unknown') + '</span>';
    }
}

function esc(v) {
    return String(v == null ? '' : v)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}