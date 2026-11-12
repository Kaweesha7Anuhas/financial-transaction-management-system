/* ==========================================================================
   customers.js — FTM System
   --------------------------------------------------------------------------
   Preserved (unchanged):
     · Global `customerModal` variable + all global functions:
         loadCustomers(), renderTable(customers), openCreateModal(),
         openEditModal(id), saveCustomer(), toggleStatus(id, status)
     · Endpoints:
         GET    /api/auth/me
         POST   /api/auth/logout
         GET    /api/customers
         GET    /api/customers/search?keyword=
         GET    /api/customers/{id}
         POST   /api/customers
         PUT    /api/customers/{id}
         PATCH  /api/customers/{id}/status?status=
     · Form field IDs: #customerId, #firstName, #lastName, #email,
                       #phoneNumber, #city, #saveBtn
     · Enter key on #searchInput triggers loadCustomers()
     · Handles both List and Page responses (`response.content || response`)
     · Status uses `c.status === 'ACTIVE'`
   Added:
     · Toast notifications (replaces alert() + confirm())
     · Bootstrap confirm modal for toggleStatus (replaces confirm())
     · Skeleton loader while fetching; empty + error states
     · XSS-safe rendering via `esc()`
     · Client-side validation for required fields before save
     · Loading state on #saveBtn
     · Avatar initials per row
   ========================================================================== */

let customerModal;
let confirmToggleModal;
let pendingToggle = null;

$(document).ready(function () {

    customerModal      = new bootstrap.Modal(document.getElementById('customerModal'));
    confirmToggleModal = new bootstrap.Modal(document.getElementById('confirmToggleModal'));

    /* ---- Load user name ---- */
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

    /* ---- Search on Enter ---- */
    $('#searchInput').on('keypress', function (e) {
        if (e.which === 13) loadCustomers();
    });

    /* ---- Confirm toggle handler ---- */
    $('#confirmToggleBtn').on('click', function () {
        if (!pendingToggle) return;
        const id = pendingToggle.id;
        const newStatus = pendingToggle.newStatus;
        pendingToggle = null;
        confirmToggleModal.hide();
        executeToggle(id, newStatus);
    });

    /* ---- Initial load ---- */
    loadCustomers();
});

/* ======================================================================
 * 1. Load customers (server-side search)
 * ==================================================================== */
function loadCustomers() {
    const keyword = ($('#searchInput').val() || '').trim();
    const url = keyword
        ? '/api/customers/search?keyword=' + encodeURIComponent(keyword)
        : '/api/customers';

    showSkeleton();

    $.ajax({
        url: url,
        type: 'GET',
        success: function (response) {
            // Handles both List and Page shapes
            const customers = response && response.content ? response.content : response;
            renderTable(Array.isArray(customers) ? customers : []);
        },
        error: function () {
            $('#customerTableBody').html(
                '<tr><td colspan="6" class="py-5" style="border:0;">' +
                    '<div class="error-state" style="padding:0;">' +
                        '<div class="empty-icon"><i class="bi bi-exclamation-triangle"></i></div>' +
                        '<h4>Could not load customers</h4>' +
                        '<p>Please check your connection and try again.</p>' +
                    '</div>' +
                '</td></tr>'
            );
            if (window.toast) window.toast('Could not load customers.', 'danger');
        }
    });
}

function showSkeleton() {
    let rows = '';
    for (let i = 0; i < 5; i++) {
        rows +=
            '<tr>' +
                '<td><span class="skeleton" style="display:inline-block;width:80px;height:14px;"></span></td>' +
                '<td><span class="skeleton" style="display:inline-block;width:150px;height:14px;"></span></td>' +
                '<td><span class="skeleton" style="display:inline-block;width:180px;height:14px;"></span></td>' +
                '<td><span class="skeleton" style="display:inline-block;width:110px;height:14px;"></span></td>' +
                '<td><span class="skeleton" style="display:inline-block;width:70px;height:22px;border-radius:999px;"></span></td>' +
                '<td class="text-end"><span class="skeleton" style="display:inline-block;width:70px;height:28px;"></span></td>' +
            '</tr>';
    }
    $('#customerTableBody').html(rows);
}

/* ======================================================================
 * 2. Render table rows
 * ==================================================================== */
function renderTable(customers) {
    if (!Array.isArray(customers) || customers.length === 0) {
        $('#customerTableBody').html(
            '<tr><td colspan="6" class="py-5" style="border:0;">' +
                '<div class="empty-state" style="padding:0;">' +
                    '<div class="empty-icon"><i class="bi bi-people"></i></div>' +
                    '<h4>No customers found</h4>' +
                    '<p>Try adjusting your search, or add a new customer to get started.</p>' +
                '</div>' +
            '</td></tr>'
        );
        return;
    }

    let html = '';
    customers.forEach(function (c) {
        const isActive   = c.status === 'ACTIVE';
        const statusPill = isActive
            ? '<span class="status-pill status-success">Active</span>'
            : '<span class="status-pill status-danger">Inactive</span>';

        const initials = ((c.firstName || '') + ' ' + (c.lastName || ''))
            .trim().split(/\s+/).map(function (s) { return s.charAt(0); })
            .slice(0, 2).join('').toUpperCase() || '?';

        const toggleTitle = isActive ? 'Deactivate customer' : 'Activate customer';

        html +=
            '<tr>' +
                '<td class="fw-semibold"><span class="text-gradient">' + esc(c.customerCode) + '</span></td>' +
                '<td>' +
                    '<div class="d-flex align-items-center gap-2">' +
                        '<span class="user-avatar" style="width:32px;height:32px;font-size:.72rem;">' + esc(initials) + '</span>' +
                        '<span class="fw-semibold text-strong">' + esc(c.firstName) + ' ' + esc(c.lastName) + '</span>' +
                    '</div>' +
                '</td>' +
                '<td class="text-muted-2">' + esc(c.email) + '</td>' +
                '<td class="text-muted-2">' + esc(c.phoneNumber || '—') + '</td>' +
                '<td>' + statusPill + '</td>' +
                '<td class="text-end">' +
                    '<div class="row-actions">' +
                        '<button type="button" class="btn btn-ghost btn-icon" onclick="openEditModal(' + c.id + ')" title="Edit" aria-label="Edit">' +
                            '<i class="bi bi-pencil"></i>' +
                        '</button>' +
                        '<button type="button" class="btn btn-ghost btn-icon" onclick="toggleStatus(' + c.id + ', \'' + escAttr(c.status) + '\')" title="' + toggleTitle + '" aria-label="' + toggleTitle + '">' +
                            '<i class="bi bi-power"></i>' +
                        '</button>' +
                    '</div>' +
                '</td>' +
            '</tr>';
    });

    $('#customerTableBody').html(html);
}

/* ======================================================================
 * 3. Open modal — Create
 * ==================================================================== */
function openCreateModal() {
    $('#modalTitle').text('New Customer');
    $('#customerId').val('');
    $('#firstName').val('');
    $('#lastName').val('');
    $('#email').val('');
    $('#phoneNumber').val('');
    $('#city').val('');
    $('#saveBtn').prop('disabled', false).text('Save Customer');
    customerModal.show();
}

/* ======================================================================
 * 4. Open modal — Edit
 * ==================================================================== */
function openEditModal(id) {
    $.ajax({
        url: '/api/customers/' + id,
        type: 'GET',
        success: function (c) {
            $('#modalTitle').text('Edit Customer');
            $('#customerId').val(c.id);
            $('#firstName').val(c.firstName || '');
            $('#lastName').val(c.lastName || '');
            $('#email').val(c.email || '');
            $('#phoneNumber').val(c.phoneNumber || '');
            $('#city').val(c.city || '');
            $('#saveBtn').prop('disabled', false).text('Save Customer');
            customerModal.show();
        },
        error: function () {
            if (window.toast) window.toast('Could not load customer details.', 'danger');
        }
    });
}

/* ======================================================================
 * 5. Save (create or update)
 * ==================================================================== */
function saveCustomer() {
    const id     = $('#customerId').val();
    const isEdit = id !== '';

    const payload = {
        firstName:   ($('#firstName').val() || '').trim(),
        lastName:    ($('#lastName').val() || '').trim(),
        email:       ($('#email').val() || '').trim(),
        phoneNumber: ($('#phoneNumber').val() || '').trim(),
        city:        ($('#city').val() || '').trim()
    };

    // Fail-fast client validation (matches original `required` behavior)
    if (!payload.firstName) return warn('Please enter the first name.');
    if (!payload.lastName)  return warn('Please enter the last name.');
    if (!payload.email)     return warn('Please enter the email address.');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.email)) {
        return warn('Please enter a valid email address.');
    }

    const $btn = $('#saveBtn');
    $btn.prop('disabled', true)
        .html('<span class="spinner-border spinner-border-sm me-2"></span>Saving…');

    $.ajax({
        url: isEdit ? '/api/customers/' + id : '/api/customers',
        type: isEdit ? 'PUT' : 'POST',
        contentType: 'application/json',
        data: JSON.stringify(payload),
        success: function () {
            customerModal.hide();
            $btn.prop('disabled', false).text('Save Customer');
            if (window.toast) {
                window.toast(isEdit ? 'Customer updated successfully.' : 'Customer created successfully.', 'success');
            }
            loadCustomers();
        },
        error: function (xhr) {
            const msg = (xhr.responseJSON && xhr.responseJSON.message)
                ? xhr.responseJSON.message
                : 'Could not save customer.';
            if (window.toast) window.toast(msg, 'danger');
            $btn.prop('disabled', false).text('Save Customer');
        }
    });

    function warn(msg) {
        if (window.toast) window.toast(msg, 'warning');
        return false;
    }
}

/* ======================================================================
 * 6. Toggle status — opens confirm modal, then PATCHes on confirm
 *    (Signature preserved: toggleStatus(id, currentStatus))
 * ==================================================================== */
function toggleStatus(id, currentStatus) {
    const newStatus   = currentStatus === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    const isDeactivate = newStatus === 'INACTIVE';

    $('#confirmMessage').text(
        isDeactivate
            ? 'Deactivating this customer will block them from future transactions. Do you want to continue?'
            : 'This will reactivate the customer and restore their access. Continue?'
    );

    // Style the confirm dialog based on the action
    $('#confirmIcon')
        .css({
            background: isDeactivate ? 'rgba(239,68,68,.12)' : 'rgba(16,185,129,.12)',
            color:      isDeactivate ? 'var(--ftm-danger)'   : 'var(--ftm-success)'
        })
        .find('i')
        .attr('class', isDeactivate ? 'bi bi-power' : 'bi bi-check-circle');

    $('#confirmToggleBtn')
        .removeClass('btn-danger btn-success')
        .addClass(isDeactivate ? 'btn-danger' : 'btn-success')
        .prop('disabled', false)
        .text(isDeactivate ? 'Deactivate' : 'Activate');

    pendingToggle = { id: id, newStatus: newStatus };
    confirmToggleModal.show();
}

function executeToggle(id, newStatus) {
    const $btn = $('#confirmToggleBtn');
    $btn.prop('disabled', true)
        .html('<span class="spinner-border spinner-border-sm me-2"></span>Updating…');

    $.ajax({
        url: '/api/customers/' + id + '/status?status=' + encodeURIComponent(newStatus),
        type: 'PATCH',
        success: function () {
            if (window.toast) {
                window.toast('Customer ' + newStatus.toLowerCase() + ' successfully.', 'success');
            }
            loadCustomers();
        },
        error: function () {
            if (window.toast) window.toast('Failed to update status.', 'danger');
        },
        complete: function () {
            $btn.prop('disabled', false)
                .text(newStatus === 'INACTIVE' ? 'Deactivate' : 'Activate');
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
    // Used inside single-quoted JS string arguments in inline onclick
    return String(v == null ? '' : v).replace(/'/g, "\\'").replace(/</g, '');
}