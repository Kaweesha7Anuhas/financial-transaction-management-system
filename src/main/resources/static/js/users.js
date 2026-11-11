let userModal;

$(document).ready(function () {
    userModal = new bootstrap.Modal(document.getElementById('userModal'));

    // 1. Check Role First (The Bouncer)
    $.get('/api/auth/me', function (user) {
        if (!user.roles.includes('ADMIN')) {
            // If not Admin, kick them out to the Cashier Dashboard
            window.location.href = '/pages/cashier/dashboard.html';
            return; 
        }
        $('#adminName').text(user.fullName);
        loadUsers(); // Only load data if they are Admin
    }).fail(function() {
        window.location.href = '/index.html';
    });

    $('#logoutBtn').on('click', function () {
        $.post('/api/auth/logout', function () { window.location.href = '/index.html'; });
    });
});

function loadUsers() {
    $.ajax({
        url: '/api/users',
        type: 'GET',
        success: function (users) {
            let html = '';
            users.forEach(u => {
                let statusBadge = u.enabled 
                    ? '<span class="badge bg-success">Active</span>' 
                    : '<span class="badge bg-danger">Disabled</span>';
                
                let roleBadge = u.roles.includes('ADMIN') 
                    ? '<span class="badge bg-dark">ADMIN</span>' 
                    : '<span class="badge bg-info text-dark">CASHIER</span>';

                // Don't allow disabling the primary admin
                let actionBtn = '';
                if (u.username !== 'admin') {
                    actionBtn = `
                        <button class="btn btn-sm btn-outline-danger" onclick="toggleStatus(${u.id}, ${!u.enabled})" title="Toggle Status">
                            <i class="bi bi-power"></i>
                        </button>
                    `;
                }

                html += `
                    <tr>
                        <td class="ps-4 fw-bold text-primary">${u.username}</td>
                        <td>${u.fullName}</td>
                        <td>${u.email}</td>
                        <td>${roleBadge}</td>
                        <td>${statusBadge}</td>
                        <td class="text-end pe-4">${actionBtn}</td>
                    </tr>
                `;
            });
            $('#userTableBody').html(html);
        },
        error: function () {
            $('#userTableBody').html('<tr><td colspan="6" class="text-center py-4 text-danger">Error loading users.</td></tr>');
        }
    });
}

function openCreateModal() {
    $('#fullName').val('');
    $('#username').val('');
    $('#email').val('');
    $('#password').val('');
    $('#role').val('CASHIER');
    userModal.show();
}

function saveUser() {
    const payload = {
        fullName: $('#fullName').val(),
        username: $('#username').val(),
        email: $('#email').val(),
        password: $('#password').val(),
        roles: [$('#role').val()]
    };

    const $btn = $('#saveBtn');
    $btn.prop('disabled', true).text('Creating...');

    $.ajax({
        url: '/api/users',
        type: 'POST',
        contentType: 'application/json',
        data: JSON.stringify(payload),
        success: function () {
            userModal.hide();
            $btn.prop('disabled', false).text('Create User');
            loadUsers();
        },
        error: function (xhr) {
            alert("Error: " + (xhr.responseJSON ? xhr.responseJSON.message : "Could not create user"));
            $btn.prop('disabled', false).text('Create User');
        }
    });
}

function toggleStatus(id, enabled) {
    if (!confirm(`Are you sure you want to ${enabled ? 'enable' : 'disable'} this user?`)) return;

    $.ajax({
        url: `/api/users/${id}/status?enabled=${enabled}`,
        type: 'PATCH',
        success: function () {
            loadUsers();
        },
        error: function () {
            alert("Failed to update user status.");
        }
    });
}