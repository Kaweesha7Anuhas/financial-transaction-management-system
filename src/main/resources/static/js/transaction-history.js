/* ==========================================================================
   transaction-history.js — FTM System (shared by admin + cashier)
   --------------------------------------------------------------------------
   Update in this revision:
     · Role guard now allows CASHIER **or** ADMIN
       (previously ADMIN-only — which would bounce cashiers off the page)
     · Everything else is unchanged from the admin-step delivery
   Preserved:
     · Globals `currentPage` and `totalPages`
     · Global functions: applyFilters(), changePage(direction),
                         loadTransactions(), renderTable(transactions),
                         updatePaginationUI()
     · Endpoint: GET /api/transactions?page=&size=15
         Optional query params (same order as original):
         accountNumber, type, status, cashierUsername, startDate, endDate
     · Filter IDs: #filterAccount, #filterType, #filterStatus,
                   #filterCashier, #filterStartDate, #filterEndDate
     · Table body ID: #historyTableBody
     · Pagination IDs: #pageInfo, #prevBtn, #nextBtn
     · Admin ID: #adminName   ·   Logout: #logoutBtn
     · applyFilters() resets currentPage = 0
     · Page size fixed at 15
   ========================================================================== */

let currentPage = 0;
let totalPages  = 0;
let requestSeq  = 0;
let isAdminUser = false;
let lastTransactions = null;

$(document).ready(function () {

    /* ---- Role guard — CASHIER **or** ADMIN allowed ---- */
    $.ajax({
        url: '/api/auth/me',
        type: 'GET',
        success: function (user) {
            const roles = (user && Array.isArray(user.roles)) ? user.roles : [];
            if (!roles.includes('CASHIER') && !roles.includes('ADMIN')) {
                window.location.href = '/index.html';
                return;
            }
            const wasAdmin = isAdminUser;
            isAdminUser = roles.includes('ADMIN');
            const name = (user.fullName || 'User').trim();
            $('#adminName').text(name);
            $('#userInitial').text((name.charAt(0) || 'C').toUpperCase());
            if (!wasAdmin && isAdminUser && Array.isArray(lastTransactions)) {
                renderTable(lastTransactions);
            }
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

    /* ---- Enter on text filters triggers Apply ---- */
    $('#filterAccount, #filterCashier').on('keypress', function (e) {
        if (e.which === 13) applyFilters();
    });

    /* ---- Reset filters ---- */
    $('#resetFiltersBtn').on('click', resetFilters);

    /* ---- Initial load ---- */
    loadTransactions();
});

/* ======================================================================
 * Public functions (preserved names / signatures)
 * ==================================================================== */
function applyFilters() {
    currentPage = 0;
    loadTransactions();
}

function changePage(direction) {
    currentPage += direction;
    loadTransactions();
}

function loadTransactions() {
    const seq = ++requestSeq;

    // --- Build URL (same order as original) ---
    let url = '/api/transactions?page=' + currentPage + '&size=15';

    const acc     = ($('#filterAccount').val() || '').trim();
    const type    = $('#filterType').val();
    const status  = $('#filterStatus').val();
    const cashier = ($('#filterCashier').val() || '').trim();
    const start   = $('#filterStartDate').val();
    const end     = $('#filterEndDate').val();

    if (acc)     url += '&accountNumber='     + encodeURIComponent(acc);
    if (type)    url += '&type='              + encodeURIComponent(type);
    if (status)  url += '&status='            + encodeURIComponent(status);
    if (cashier) url += '&cashierUsername='   + encodeURIComponent(cashier);
    if (start)   url += '&startDate='         + encodeURIComponent(start);
    if (end)     url += '&endDate='           + encodeURIComponent(end);

    showSkeleton();

    $.ajax({
        url: url,
        type: 'GET',
        success: function (data) {
            if (seq !== requestSeq) return;

            totalPages = Number(data.totalPages) || 0;
            const list = Array.isArray(data.content) ? data.content : [];
            lastTransactions = list;

            renderTable(list);
            updatePaginationUI();
            updateResultsBadge(list.length);
        },
        error: function () {
            if (seq !== requestSeq) return;

            $('#historyTableBody').html(errorStateRow());
            updateResultsBadge(0);
            if (window.toast) window.toast('Could not load transactions.', 'danger');
        }
    });
}

function renderTable(transactions) {
    if (!Array.isArray(transactions) || transactions.length === 0) {
        $('#historyTableBody').html(emptyStateRow());
        return;
    }

    let html = '';
    transactions.forEach(function (tx) {
        const isDeposit    = tx.transactionType === 'DEPOSIT';
        const isWithdrawal = tx.transactionType === 'WITHDRAWAL';

        const typePill = isDeposit
            ? '<span class="status-pill status-success">Deposit</span>'
            : isWithdrawal
                ? '<span class="status-pill status-danger">Withdrawal</span>'
                : '<span class="status-pill status-warning">Reversal</span>';

        const statusPill = tx.status === 'COMPLETED'
            ? '<span class="status-pill status-success">Completed</span>'
            : tx.status === 'REVERSED'
                ? '<span class="status-pill status-neutral">Reversed</span>'
                : '<span class="status-pill status-danger">Failed</span>';

        const date = (window.FTM && FTM.fmtDateTime)
            ? FTM.fmtDateTime(tx.transactionDate)
            : new Date(tx.transactionDate).toLocaleString();

        const amountClass = isDeposit
            ? 'amount-positive'
            : isWithdrawal
                ? 'amount-negative'
                : '';

        let statusCell = statusPill;
        if (isAdminUser && tx.status === 'COMPLETED' && (isDeposit || isWithdrawal) && tx.id) {
            statusCell +=
                ' <button type="button" class="btn btn-ghost btn-sm py-0 px-2 ms-1 text-danger" ' +
                    'onclick="reverseTransaction(' + Number(tx.id) + ', \'' + esc(tx.transactionReference || '') + '\')" ' +
                    'title="Reverse transaction">' +
                    '<i class="bi bi-arrow-counterclockwise"></i>' +
                '</button>';
        }

        html +=
            '<tr>' +
                '<td class="text-muted-2"><small>' + esc(date) + '</small></td>' +
                '<td><span class="mono text-muted-2" style="font-size:.78rem;">' + esc(tx.transactionReference) + '</span></td>' +
                '<td class="fw-semibold"><span class="text-gradient">' + esc(tx.accountNumber) + '</span></td>' +
                '<td>' + typePill + '</td>' +
                '<td class="amount text-end ' + amountClass + '">' + formatCurrency(tx.amount) + '</td>' +
                '<td class="text-muted-2">' + esc(tx.performedBy || 'System') + '</td>' +
                '<td><div class="d-inline-flex align-items-center gap-1">' + statusCell + '</div></td>' +
            '</tr>';
    });

    $('#historyTableBody').html(html);
}

function reverseTransaction(txId, ref) {
    if (!txId) return;
    if (!window.confirm('Are you sure you want to reverse transaction ' + (ref || ('#' + txId)) + '? This action will restore the account balance.')) {
        return;
    }
    $.ajax({
        url: '/api/transactions/' + encodeURIComponent(txId) + '/reverse',
        type: 'POST',
        success: function () {
            if (window.toast) window.toast('Transaction ' + (ref || '') + ' reversed successfully.', 'success');
            loadTransactions();
        },
        error: function (xhr) {
            const msg = (xhr.responseJSON && xhr.responseJSON.message)
                ? xhr.responseJSON.message
                : 'Could not reverse transaction.';
            if (window.toast) window.toast(msg, 'danger');
        }
    });
}

function updatePaginationUI() {
    $('#pageInfo').text('Page ' + (currentPage + 1) + ' of ' + (totalPages || 1));
    $('#prevBtn').prop('disabled', currentPage === 0);
    $('#nextBtn').prop('disabled', currentPage >= totalPages - 1);
}

/* ======================================================================
 * Additive helpers
 * ==================================================================== */
function resetFilters() {
    $('#filterAccount').val('');
    $('#filterType').val('');
    $('#filterStatus').val('');
    $('#filterCashier').val('');
    $('#filterStartDate').val('');
    $('#filterEndDate').val('');
    applyFilters();
}

function updateResultsBadge(count) {
    const $badge = $('#resultsBadge');
    if (!count) { $badge.hide(); return; }
    $('#resultsCount').text(count);
    $badge.css('display', 'inline-flex');
}

function showSkeleton() {
    let rows = '';
    for (let i = 0; i < 6; i++) {
        rows +=
            '<tr>' +
                '<td><span class="skeleton" style="display:inline-block;width:140px;height:14px;"></span></td>' +
                '<td><span class="skeleton" style="display:inline-block;width:100px;height:14px;"></span></td>' +
                '<td><span class="skeleton" style="display:inline-block;width:120px;height:14px;"></span></td>' +
                '<td><span class="skeleton" style="display:inline-block;width:80px;height:22px;border-radius:999px;"></span></td>' +
                '<td class="text-end"><span class="skeleton" style="display:inline-block;width:100px;height:14px;"></span></td>' +
                '<td><span class="skeleton" style="display:inline-block;width:80px;height:14px;"></span></td>' +
                '<td><span class="skeleton" style="display:inline-block;width:90px;height:22px;border-radius:999px;"></span></td>' +
            '</tr>';
    }
    $('#historyTableBody').html(rows);
}

function emptyStateRow() {
    return '<tr><td colspan="7" class="py-5" style="border:0;">' +
        '<div class="empty-state" style="padding:0;">' +
            '<div class="empty-icon"><i class="bi bi-inbox"></i></div>' +
            '<h4>No transactions found</h4>' +
            '<p>Try adjusting your filters or date range.</p>' +
        '</div>' +
    '</td></tr>';
}

function errorStateRow() {
    return '<tr><td colspan="7" class="py-5" style="border:0;">' +
        '<div class="error-state" style="padding:0;">' +
            '<div class="empty-icon"><i class="bi bi-exclamation-triangle"></i></div>' +
            '<h4>Could not load transactions</h4>' +
            '<p>Please try again or refresh the page.</p>' +
        '</div>' +
    '</td></tr>';
}

function esc(v) {
    return String(v == null ? '' : v)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}