let accountModal;

$(document).ready(function () {
    accountModal = new bootstrap.Modal(document.getElementById('accountModal'));

    $.get('/api/auth/me', function (user) {
        $('#adminName').text(user.fullName);
    });

    $('#logoutBtn').on('click', function () {
        $.post('/api/auth/logout', function () { window.location.href = '/index.html'; });
    });

    loadAccounts();
});

function loadAccounts() {
    $.ajax({
        url: '/api/accounts',
        type: 'GET',
        success: function (accounts) {
            let html = '';
            if (accounts.length === 0) {
                html = '<tr><td colspan="6" class="text-center py-4 text-muted">No accounts found. Open one to get started.</td></tr>';
            } else {
                accounts.forEach(a => {
                    let statusBadge = '';
                    if (a.status === 'ACTIVE') statusBadge = '<span class="badge bg-success">Active</span>';
                    else if (a.status === 'FROZEN') statusBadge = '<span class="badge bg-warning text-dark">Frozen</span>';
                    else if (a.status === 'CLOSED') statusBadge = '<span class="badge bg-secondary">Closed</span>';
                    else statusBadge = '<span class="badge bg-danger">Inactive</span>';

                    html += `
                        <tr>
                            <td class="ps-4 fw-bold text-primary">${a.accountNumber}</td>
                            <td>${a.customerFullName}</td>
                            <td>${a.accountType}</td>
                            <td class="fw-semibold">${formatCurrency(a.balance)}</td>
                            <td>${statusBadge}</td>
                            <td class="text-end pe-4">
                                <button class="btn btn-sm btn-outline-warning me-1" onclick="toggleStatus('${a.accountNumber}', '${a.status}')" title="Freeze/Activate">
                                    <i class="bi bi-snow"></i>
                                </button>
                            </td>
                        </tr>
                    `;
                });
            }
            $('#accountTableBody').html(html);
        },
        error: function () {
            $('#accountTableBody').html('<tr><td colspan="6" class="text-center py-4 text-danger">Error loading accounts.</td></tr>');
        }
    });
}

function openCreateModal() {
    $('#customerSelect').html('<option value="">Loading customers...</option>');
    accountModal.show();

    $.ajax({
        url: '/api/customers',
        type: 'GET',
        success: function (response) {
            const customers = response.content ? response.content : response;
            let options = '<option value="">-- Select a Customer --</option>';
            
            customers.forEach(c => {
                if (c.status === 'ACTIVE') {
                    options += `<option value="${c.id}">${c.firstName} ${c.lastName} (${c.customerCode})</option>`;
                }
            });
            $('#customerSelect').html(options);
        },
        error: function () {
            $('#customerSelect').html('<option value="">Error loading customers</option>');
        }
    });
}

function saveAccount() {
    const payload = {
        customerId: $('#customerSelect').val(),
        accountType: $('#accountType').val(),
        accountName: $('#accountName').val()
    };

    if (!payload.customerId || !payload.accountName) {
        alert("Please select a customer and enter an account name.");
        return;
    }

    const $btn = $('#saveBtn');
    $btn.prop('disabled', true).text('Creating...');

    $.ajax({
        url: '/api/accounts',
        type: 'POST',
        contentType: 'application/json',
        data: JSON.stringify(payload),
        success: function (response) {
            accountModal.hide();
            $btn.prop('disabled', false).text('Create Account');
            $('#accountName').val('');
            loadAccounts(); 
            alert(`Account created successfully!\nAccount Number: ${response.accountNumber}`);
        },
        error: function (xhr) {
            alert("Error: " + (xhr.responseJSON ? xhr.responseJSON.message : "Could not create account"));
            $btn.prop('disabled', false).text('Create Account');
        }
    });
}

function toggleStatus(accountNumber, currentStatus) {
    let newStatus = currentStatus === 'ACTIVE' ? 'FROZEN' : 'ACTIVE';
    if (currentStatus === 'CLOSED') {
        alert("Closed accounts cannot be reactivated.");
        return;
    }

    if (!confirm(`Change account status to ${newStatus}?`)) return;

    $.ajax({
        url: `/api/accounts/${accountNumber}/status?status=${newStatus}`,
        type: 'PATCH',
        success: function () { loadAccounts(); },
        error: function () { alert("Failed to update account status."); }
    });
}