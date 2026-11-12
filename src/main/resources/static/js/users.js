/* ==========================================================================
   users.js — FTM System
   --------------------------------------------------------------------------
   Preserved (unchanged):
     · Global `userModal` variable
     · Global functions: loadUsers(), openCreateModal(), saveUser(),
                         toggleStatus(id, enabled)
     · Endpoints:
         GET   /api/auth/me
         POST  /api/auth/logout
         GET   /api/users
         POST  /api/users
         PATCH /api/users/{id}/status?enabled={true|false}
     · Field IDs: #fullName, #role, #username, #email, #password, #saveBtn,
                  #userTableBody, #adminName, #logoutBtn, #userModal
     · **Bouncer**: non-ADMIN users redirect to /pages/cashier/dashboard.html
                    (preserved exactly — differs from other admin pages)
     · **Primary admin protection**: button hidden when `u.username === 'admin'`
     · Payload shape: { fullName, username, email, password, roles: [role] }
     · Status logic: `u.enabled` boolean; toggle sends `enabled=!u.enabled`
     · Role display: 'ADMIN' → dark badge, else info badge for CASHIER
   Added:
     · Toast notifications (replaces alert() + confirm())
     · Bootstrap confirm modal for toggleStatus (danger-styled)
     · Skeleton loader, empty + error states
     · Client-side search + sortable headers (auto-wired via app.js)
     · XSS-safe rendering
     · Client-side validation with helpful warnings
     · Loading button states on save + confirm
     · Password show/hide toggle (via app.js .password-toggle)
   ========================================================================== */

let userModal;
let confirmToggleModal;
let pendingToggle = null;

$(document).ready(function () {

    userModal          = new bootstrap.Modal(document.getElementById('userModal'));
    confirmToggleModal = new bootstrap.Modal(document.getElementById('confirmToggleModal'));

    /* ---- Bouncer: verify role BEFORE loading data ---- */
    $.ajax({
        url: '/api/auth/me',
        type: 'GET',
        success: function (user) {
            if (!user || !Array.isArray(user.roles) || !user.roles.includes('ADMIN')) {
                // Preserved: non-admins go to the cashier dashboard
                window.location.href = '/pages/cashier/dashboard.html';
                return;
            }
            const name = (user.fullName || 'Administrator').trim();
            $('#adminName').text(name);
            $('#userInitial').text((name.charAt(0) || 'A').toUpperCase());

            // Only load data if they are Admin
            loadUsers();
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
        const id      = pendingToggle.id;
        const enabled = pendingToggle.enabled;
        pendingToggle = null;
        confirmToggleModal.hide();
        executeToggle(id, enabled);
    });
});

/* ======================================================================
 * 1. Load users
 * ==================================================================== */
function loadUsers() {
    showSkeleton();

    $.ajax({
        url: '/api/users',
        type: 'GET',
        success: function (users) {
            renderTable(Array.isArray(users) ? users : []);
        },
        error: function () {
            $('#userTableBody').html(
                '<tr><td colspan="6" class="py-5" style="border:0;">' +
                    '<div class="error-state" style="padding:0;">' +
                        '<div class="empty-icon"><i class="bi bi-exclamation-triangle"></i></div>' +
                        '<h4>Could not load users</h4>' +
                        '<p>Please check your connection and try again.</p>' +
                    '</div>' +
                '</td></tr>'
            );
            if (window.toast) window.toast('Could not load users.', 'danger');
        }
    });
}

function showSkeleton() {
    let rows = '';
    for (let i = 0; i < 4; i++) {
        rows +=
            '<tr>' +
                '<td><span class="skeleton" style="display:inline-block;width:100px;height:14px;"></span></td>' +
                '<td><span class="skeleton" style="display:inline-block;width:140px;height:14px;"></span></td>' +
                '<td><span class="skeleton" style="display:inline-block;width:180px;height:14px;"></span></td>' +
                '<td><span class="skeleton" style="display:inline-block;width:70px;height:22px;border-radius:999px;"></span></td>' +
                '<td><span class="skeleton" style="display:inline-block;width:70px;height:22px;border-radius:999px;"></span></td>' +
                '<td class="text-end"><span class="skeleton" style="display:inline-block;width:36px;height:28px;"></span></td>' +
            '</tr>';
    }
    $('#userTableBody').html(rows);
}

/* ======================================================================
 * 2. Render table rows
 * ==================================================================== */
function renderTable(users) {
    if (!Array.isArray(users) || users.length === 0) {
        $('#userTableBody').html(
            '<tr><td colspan="6" class="py-5" style="border:0;">' +
                '<div class="empty-state" style="padding:0;">' +
                    '<div class="empty-icon"><i class="bi bi-person-badge"></i></div>' +
                    '<h4>No users found</h4>' +
                    '<p>Add a staff member to get started.</p>' +
                '</div>' +
            '</td></tr>'
        );
        return;
    }

    let html = '';
    users.forEach(function (u) {
        // Preserved: enabled boolean → status pill
        const statusPill = u.enabled
            ? '<span class="status-pill status-success">Active</span>'
            : '<span class="status-pill status-danger">Disabled</span>';

        // Preserved: ADMIN → dark, else cashier info
        const isAdmin = Array.isArray(u.roles) && u.roles.includes('ADMIN');
        const rolePill = isAdmin
            ? '<span class="badge badge-soft-primary">ADMIN</span>'
            : '<span class="badge badge-soft-info">CASHIER</span>';

        // Preserved: primary admin protection
        let actionBtn = '';
        if (u.username !== 'admin') {
            const toggleTitle = u.enabled ? 'Disable user' : 'Enable user';
            const toggleIcon  = u.enabled ? 'bi-power' : 'bi-check-circle';
            actionBtn =
                '<button type="button" class="btn btn-ghost btn-icon" ' +
                    'onclick="toggleStatus(' + u.id + ', ' + (!u.enabled) + ')" ' +
                    'title="' + toggleTitle + '" aria-label="' + toggleTitle + '">' +
                    '<i class="bi ' + toggleIcon + '"></i>' +
                '</button>';
        } else {
            actionBtn =
                '<button type="button" class="btn btn-ghost btn-icon" disabled ' +
                    'title="Primary admin cannot be disabled" aria-label="Primary admin protected">' +
                    '<i class="bi bi-shield-lock text-muted"></i>' +
                '</button>';
        }

        const initials = (u.fullName || '')
            .trim().split(/\s+/).map(function (s) { return s.charAt(0); })
            .slice(0, 2).join('').toUpperCase() || (u.username || '?').charAt(0).toUpperCase();

        html +=
            '<tr>' +
                '<td class="fw-semibold">' +
                    '<div class="d-flex align-items-center gap-2">' +
                        '<span class="user-avatar" style="width:32px;height:32px;font-size:.72rem;">' + esc(initials) + '</span>' +
                        '<span class="text-gradient">' + esc(u.username) + '</span>' +
                    '</div>' +
                '</td>' +
                '<td class="text-strong fw-semibold">' + esc(u.fullName || '—') + '</td>' +
                '<td class="text-muted-2">' + esc(u.email || '—') + '</td>' +
                '<td>' + rolePill + '</td>' +
                '<td>' + statusPill + '</td>' +
                '<td class="text-end">' +
                    '<div class="row-actions">' + actionBtn + '</div>' +
                '</td>' +
            '</tr>';
    });

    $('#userTableBody').html(html);
    const searchEl = document.getElementById('userSearchInput');
    if (searchEl && typeof searchEl._ftmApplyFilter === 'function') {
        searchEl._ftmApplyFilter();
    }
}

/* ======================================================================
 * 3. Open create-user modal
 * ==================================================================== */
function openCreateModal() {
    $('#fullName').val('');
    $('#username').val('');
    $('#email').val('');
    $('#password').val('');
    
    // FIXED: Reset to placeholder instead of forcing CASHIER
    $('#role').val(''); 
    
    $('#saveBtn').prop('disabled', false).text('Create User');
    userModal.show();
}

/* ======================================================================
 * 4. Save user
 * ==================================================================== */
function saveUser() {
    const payload = {
        fullName: ($('#fullName').val() || '').trim(),
        username: ($('#username').val() || '').trim(),
        email:    ($('#email').val() || '').trim(),
        password: $('#password').val() || '',
        roles:    [$('#role').val()]
    };

    // Client-side validation (fails fast, no round-trip)
    if (!payload.roles[0]) return warn('Please select a role.'); // FIXED: Added role validation
    
    if (!payload.fullName) return warn('Please enter the full name.');
    if (!payload.username) return warn('Please enter a username.');
    if (payload.username.length < 4 || payload.username.length > 50) return warn('Username must be between 4 and 50 characters.');
    if (!payload.email)    return warn('Please enter an email address.');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.email)) {
        return warn('Please enter a valid email address.');
    }
    if (!payload.password) return warn('Please enter a password.');
    if (payload.password.length < 8) return warn('Password must be at least 8 characters.');

    const $btn = $('#saveBtn');
    $btn.prop('disabled', true)
        .html('<span class="spinner-border spinner-border-sm me-2"></span>Creating…');

    $.ajax({
        url: '/api/users',
        type: 'POST',
        contentType: 'application/json',
        data: JSON.stringify(payload),
        success: function () {
            userModal.hide();
            $btn.prop('disabled', false).text('Create User');
            if (window.toast) window.toast('Staff member created successfully.', 'success');
            loadUsers();
        },
        error: function (xhr) {
            let msg = 'Could not create user.';
            if (xhr.status === 409) msg = 'That username or email is already in use.';
            else if (xhr.responseJSON && xhr.responseJSON.message) msg = xhr.responseJSON.message;
            if (window.toast) window.toast(msg, 'danger');
            $btn.prop('disabled', false).text('Create User');
        }
    });

    function warn(msg) {
        if (window.toast) window.toast(msg, 'warning');
        return false;
    }
}

/* ======================================================================
 * 5. Toggle status — opens confirm modal, then PATCH on confirm
 *    Signature preserved: toggleStatus(id, enabled)
 *    Note: `enabled` is the TARGET state (matches the caller's !u.enabled)
 * ==================================================================== */
function toggleStatus(id, enabled) {
    const isEnabling = !!enabled;

    $('#confirmMessage').text(
        isEnabling
            ? 'Enabling this user will restore their access to the system. Continue?'
            : 'Disabling this user will immediately block their access. Continue?'
    );

    $('#confirmIcon')
        .css({
            background: isEnabling ? 'rgba(16,185,129,.12)' : 'rgba(239,68,68,.12)',
            color:      isEnabling ? 'var(--ftm-success)'   : 'var(--ftm-danger)'
        })
        .find('i')
        .attr('class', isEnabling ? 'bi bi-check-circle' : 'bi bi-power');

    $('#confirmToggleBtn')
        .removeClass('btn-danger btn-success')
        .addClass(isEnabling ? 'btn-success' : 'btn-danger')
        .prop('disabled', false)
        .text(isEnabling ? 'Enable user' : 'Disable user');

    pendingToggle = { id: id, enabled: enabled };
    confirmToggleModal.show();
}

function executeToggle(id, enabled) {
    const $btn = $('#confirmToggleBtn');
    $btn.prop('disabled', true)
        .html('<span class="spinner-border spinner-border-sm me-2"></span>Updating…');

    $.ajax({
        url: '/api/users/' + id + '/status?enabled=' + (enabled ? 'true' : 'false'),
        type: 'PATCH',
        success: function () {
            if (window.toast) {
                window.toast(
                    'User ' + (enabled ? 'enabled' : 'disabled') + ' successfully.',
                    'success'
                );
            }
            loadUsers();
        },
        error: function () {
            if (window.toast) window.toast('Failed to update user status.', 'danger');
        },
        complete: function () {
            $btn.prop('disabled', false)
                .text(enabled ? 'Enable user' : 'Disable user');
        }
    });
}

/* ======================================================================
 * Small utilities
 * ==================================================================== */
function esc(v) {
    return String(v == null ? '' : v)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}