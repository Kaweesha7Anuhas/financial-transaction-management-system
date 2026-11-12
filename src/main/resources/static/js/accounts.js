/* ==========================================================================
   accounts.js — FTM System
   --------------------------------------------------------------------------
   Preserved (unchanged):
     · Global `accountModal` variable + all global functions
     · Endpoints
     · Field IDs
     · Status values: ACTIVE / FROZEN / CLOSED / INACTIVE
     · Toggle logic
   Added:
     · Fixed "SAVINGS" badge using native Bootstrap 5.3 subtle colors
     · Toast notifications
     · Bootstrap confirm modal for toggleStatus
     · Skeleton loader, empty + error states
     · XSS-safe rendering
     · ADMIN role guard
   ========================================================================== */

let accountModal;
let confirmToggleModal;
let pendingToggle = null;

$(document).ready(function () {

    accountModal       = new bootstrap.Modal(document.getElementById('accountModal'));
    confirmToggleModal = new bootstrap.Modal(document.getElementById('confirmToggleModal'));

    /* ---- Load user info + admin guard ---- */
    $.ajax({
        url: '/api/auth/me',
        type: 'GET',
        success: function (user) {
            if (!user || !Array.isArray(user.roles) || !user.roles.includes('ADMIN')) {
                window.location.href = '/index.html';
                return;
            }
            const name = (user.fullName || 'Administrator').trim();
            $('#adminName').text(name);
            $('#userInitial').text((name.charAt(0) || 'A').toUpperCase());
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

    /* ---- Confirm toggle handler ---- */
    $('#confirmToggleBtn').on('click', function () {
        if (!pendingToggle) return;
        const accountNumber = pendingToggle.accountNumber;
        const newStatus     = pendingToggle.newStatus;
        pendingToggle = null;
        confirmToggleModal.hide();
        executeToggle(accountNumber, newStatus);
    });

    /* ---- Initial load ---- */
    loadAccounts();
});

/* ======================================================================
 * 1. Load accounts
 * ==================================================================== */
function loadAccounts() {
    showSkeleton();

    $.ajax({
        url: '/api/accounts',
        type: 'GET',
        success: function (accounts) {
            renderTable(Array.isArray(accounts) ? accounts : []);
        },
        error: function () {
            $('#accountTableBody').html(
                '<tr><td colspan="6" class="py-5" style="border:0;">' +
                    '<div class="error-state" style="padding:0;">' +
                        '<div class="empty-icon"><i class="bi bi-exclamation-triangle"></i></div>' +
                        '<h4>Could not load accounts</h4>' +
                        '<p>Please check your connection and try again.</p>' +
                    '</div>' +
                '</td></tr>'
            );
            if (window.toast) window.toast('Could not load accounts.', 'danger');
        }
    });
}

function showSkeleton() {
    let rows = '';
    for (let i = 0; i < 5; i++) {
        rows +=
            '<tr>' +
                '<td><span class="skeleton" style="display:inline-block;width:130px;height:14px;"></span></td>' +
                '<td><span class="skeleton" style="display:inline-block;width:160px;height:14px;"></span></td>' +
                '<td><span class="skeleton" style="display:inline-block;width:80px;height:14px;"></span></td>' +
                '<td><span class="skeleton" style="display:inline-block;width:110px;height:14px;"></span></td>' +
                '<td><span class="skeleton" style="display:inline-block;width:80px;height:22px;border-radius:999px;"></span></td>' +
                '<td class="text-end"><span class="skeleton" style="display:inline-block;width:36px;height:28px;"></span></td>' +
            '</tr>';
    }
    $('#accountTableBody').html(rows);
}

/* ======================================================================
 * 2. Render table rows
 * ==================================================================== */
function renderTable(accounts) {
    if (!Array.isArray(accounts) || accounts.length === 0) {
        $('#accountTableBody').html(
            '<tr><td colspan="6" class="py-5" style="border:0;">' +
                '<div class="empty-state" style="padding:0;">' +
                    '<div class="empty-icon"><i class="bi bi-credit-card"></i></div>' +
                    '<h4>No accounts found</h4>' +
                    '<p>Open a new account to get started.</p>' +
                '</div>' +
            '</td></tr>'
        );
        return;
    }

    let html = '';
    accounts.forEach(function (a) {
        const statusPill = renderStatus(a.status);
        const isClosed   = a.status === 'CLOSED';
        const toggleTitle = isClosed
            ? 'Closed accounts cannot be reactivated'
            : (a.status === 'ACTIVE' ? 'Freeze account' : 'Activate account');

        // Using native Bootstrap 5.3 subtle colors so it works in light/dark mode without custom CSS
        const typeBadge = '<span class="badge bg-info-subtle text-info-emphasis border border-info-subtle">' + esc(a.accountType || '—') + '</span>';

        html +=
            '<tr>' +
                '<td class="fw-semibold"><span class="text-gradient">' + esc(a.accountNumber) + '</span></td>' +
                '<td class="text-strong fw-semibold">' + esc(a.customerFullName || '—') + '</td>' +
                '<td>' + typeBadge + '</td>' +
                '<td class="tabular-nums fw-semibold text-strong">' + formatCurrency(a.balance) + '</td>' +
                '<td>' + statusPill + '</td>' +
                '<td class="text-end">' +
                    '<div class="row-actions">' +
                        '<button type="button" class="btn btn-ghost btn-icon" ' +
                            'onclick="toggleStatus(\'' + escAttr(a.accountNumber) + '\', \'' + escAttr(a.status) + '\')" ' +
                            'title="' + escAttr(toggleTitle) + '" ' +
                            'aria-label="' + escAttr(toggleTitle) + '">' +
                            '<i class="bi ' + (isClosed ? 'bi-lock' : 'bi-snow') + '"></i>' +
                        '</button>' +
                    '</div>' +
                '</td>' +
            '</tr>';
    });

    $('#accountTableBody').html(html);
    const searchEl = document.getElementById('accountSearchInput');
    if (searchEl && typeof searchEl._ftmApplyFilter === 'function') {
        searchEl._ftmApplyFilter();
    }
}

function renderStatus(status) {
    switch (status) {
        case 'ACTIVE':
            return '<span class="status-pill status-success">Active</span>';
        case 'FROZEN':
            return '<span class="status-pill status-warning">Frozen</span>';
        case 'CLOSED':
            return '<span class="status-pill status-neutral">Closed</span>';
        default:
            return '<span class="status-pill status-danger">Inactive</span>';
    }
}

/* ======================================================================
 * 3. Open modal — Create
 * ==================================================================== */
function openCreateModal() {
    // Reset form
    $('#customerSelect').html('<option value="">Loading customers…</option>');
    $('#accountType').val('SAVINGS');
    $('#accountName').val('');
    $('#saveBtn').prop('disabled', false).text('Create Account');

    accountModal.show();

    $.ajax({
        url: '/api/customers?size=200',
        type: 'GET',
        success: function (response) {
            const customers = response && response.content ? response.content : response;
            const active = Array.isArray(customers)
                ? customers.filter(function (c) { return c.status === 'ACTIVE'; })
                : [];

            let options = '<option value="">— Select a customer —</option>';
            if (active.length === 0) {
                options += '<option value="" disabled>No active customers available</option>';
            } else {
                active.forEach(function (c) {
                    const fullName = ((c.firstName || '') + ' ' + (c.lastName || '')).trim();
                    options += '<option value="' + escAttr(c.id) + '">' +
                        esc(fullName) + ' (' + esc(c.customerCode || '') + ')' +
                    '</option>';
                });
            }
            $('#customerSelect').html(options);
        },
        error: function () {
            $('#customerSelect').html('<option value="" disabled>Error loading customers</option>');
            if (window.toast) window.toast('Could not load customers for the dropdown.', 'danger');
        }
    });
}

/* ======================================================================
 * 4. Save account
 * ==================================================================== */
function saveAccount() {
    const payload = {
        customerId:  $('#customerSelect').val(),
        accountType: $('#accountType').val(),
        accountName: ($('#accountName').val() || '').trim()
    };

    if (!payload.customerId) {
        if (window.toast) window.toast('Please select a customer.', 'warning');
        return;
    }
    if (!payload.accountName) {
        if (window.toast) window.toast('Please enter an account name.', 'warning');
        return;
    }

    const $btn = $('#saveBtn');
    $btn.prop('disabled', true)
        .html('<span class="spinner-border spinner-border-sm me-2"></span>Creating…');

    $.ajax({
        url: '/api/accounts',
        type: 'POST',
        contentType: 'application/json',
        data: JSON.stringify(payload),
        success: function (response) {
            accountModal.hide();
            $btn.prop('disabled', false).text('Create Account');
            $('#accountName').val('');

            const accNo = response && response.accountNumber
                ? response.accountNumber
                : '';
            const msg = accNo
                ? 'Account created successfully — Number: ' + accNo
                : 'Account created successfully.';
            if (window.toast) window.toast(msg, 'success', { duration: 6000 });

            loadAccounts();
        },
        error: function (xhr) {
            const msg = (xhr.responseJSON && xhr.responseJSON.message)
                ? xhr.responseJSON.message
                : 'Could not create account.';
            if (window.toast) window.toast(msg, 'danger');
            $btn.prop('disabled', false).text('Create Account');
        }
    });
}

/* ======================================================================
 * 5. Toggle status — confirm modal, then PATCH
 *    Signature preserved: toggleStatus(accountNumber, currentStatus)
 * ==================================================================== */
function toggleStatus(accountNumber, currentStatus) {
    // Blocked states (matches original behavior)
    if (currentStatus === 'CLOSED') {
        if (window.toast) window.toast('Closed accounts cannot be reactivated.', 'warning');
        return;
    }

    const newStatus = currentStatus === 'ACTIVE' ? 'FROZEN' : 'ACTIVE';
    const isFreeze  = newStatus === 'FROZEN';

    // Configure confirm modal
    $('#confirmMessage').text(
        isFreeze
            ? 'Freezing this account will block all transactions until it is reactivated. Continue?'
            : 'Reactivating this account will restore the customer\'s access. Continue?'
    );

    $('#confirmIcon')
        .css({
            background: isFreeze ? 'rgba(245,158,11,.15)' : 'rgba(16,185,129,.15)',
            color:      isFreeze ? 'var(--ftm-warning)'    : 'var(--ftm-success)'
        })
        .find('i')
        .attr('class', isFreeze ? 'bi bi-snow' : 'bi bi-check-circle');

    $('#confirmToggleBtn')
        .removeClass('btn-danger btn-success btn-warning')
        .addClass(isFreeze ? 'btn-warning' : 'btn-success')
        .prop('disabled', false)
        .text(isFreeze ? 'Freeze account' : 'Activate account');

    pendingToggle = { accountNumber: accountNumber, newStatus: newStatus };
    confirmToggleModal.show();
}

function executeToggle(accountNumber, newStatus) {
    const $btn = $('#confirmToggleBtn');
    $btn.prop('disabled', true)
        .html('<span class="spinner-border spinner-border-sm me-2"></span>Updating…');

    $.ajax({
        url: '/api/accounts/' + encodeURIComponent(accountNumber) +
             '/status?status=' + encodeURIComponent(newStatus),
        type: 'PATCH',
        success: function () {
            if (window.toast) {
                window.toast(
                    'Account ' + (newStatus === 'FROZEN' ? 'frozen' : 'activated') + ' successfully.',
                    'success'
                );
            }
            loadAccounts();
        },
        error: function () {
            if (window.toast) window.toast('Failed to update account status.', 'danger');
        },
        complete: function () {
            $btn.prop('disabled', false)
                .text(newStatus === 'FROZEN' ? 'Freeze account' : 'Activate account');
        }
    });
}

/* ======================================================================
 * Small utilities (XSS safety)
 * ==================================================================== */
function esc(v) {
    return String(v == null ? '' : v)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}
function escAttr(v) {
    return String(v == null ? '' : v).replace(/'/g, "\\'").replace(/</g, '');
}