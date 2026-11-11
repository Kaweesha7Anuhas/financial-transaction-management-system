let customerModal;

$(document).ready(function () {
    customerModal = new bootstrap.Modal(document.getElementById('customerModal'));

    // Load User Name
    $.get('/api/auth/me', function (user) {
        $('#adminName').text(user.fullName);
    });

    // Logout
    $('#logoutBtn').on('click', function () {
        $.post('/api/auth/logout', function () { window.location.href = '/index.html'; });
    });

    // Search on Enter key
    $('#searchInput').on('keypress', function(e) {
        if (e.which === 13) loadCustomers();
    });

    // Initial Load
    loadCustomers();
});

// 1. Load Customers (with optional search)
function loadCustomers() {
    const keyword = $('#searchInput').val().trim();
    let url = '/api/customers';
    
    // If there is a keyword, use the search endpoint
    if (keyword) {
        url = `/api/customers/search?keyword=${encodeURIComponent(keyword)}`;
    }

    $.ajax({
        url: url,
        type: 'GET',
        success: function (response) {
            // Note: /api/customers returns a List, but /api/customers/search returns a Page object.
            // We handle both here.
            const customers = response.content ? response.content : response;
            renderTable(customers);
        },
        error: function () {
            $('#customerTableBody').html('<tr><td colspan="6" class="text-center py-4 text-danger">Error loading customers.</td></tr>');
        }
    });
}

// 2. Render Table Rows
function renderTable(customers) {
    let html = '';
    if (customers.length === 0) {
        html = '<tr><td colspan="6" class="text-center py-4 text-muted">No customers found.</td></tr>';
    } else {
        customers.forEach(c => {
            const statusBadge = c.status === 'ACTIVE' 
                ? '<span class="badge bg-success">Active</span>' 
                : '<span class="badge bg-danger">Inactive</span>';
            
            html += `
                <tr>
                    <td class="ps-4 fw-semibold text-primary">${c.customerCode}</td>
                    <td>${c.firstName} ${c.lastName}</td>
                    <td>${c.email}</td>
                    <td>${c.phoneNumber || '-'}</td>
                    <td>${statusBadge}</td>
                    <td class="text-end pe-4">
                        <button class="btn btn-sm btn-outline-primary me-1" onclick="openEditModal(${c.id})"><i class="bi bi-pencil"></i></button>
                        <button class="btn btn-sm btn-outline-danger" onclick="toggleStatus(${c.id}, '${c.status}')">
                            <i class="bi bi-power"></i>
                        </button>
                    </td>
                </tr>
            `;
        });
    }
    $('#customerTableBody').html(html);
}

// 3. Open Modal for Create
function openCreateModal() {
    $('#modalTitle').text('New Customer');
    $('#customerId').val('');
    $('#firstName').val('');
    $('#lastName').val('');
    $('#email').val('');
    $('#phoneNumber').val('');
    $('#city').val('');
    customerModal.show();
}

// 4. Open Modal for Edit
function openEditModal(id) {
    $.get(`/api/customers/${id}`, function (c) {
        $('#modalTitle').text('Edit Customer');
        $('#customerId').val(c.id);
        $('#firstName').val(c.firstName);
        $('#lastName').val(c.lastName);
        $('#email').val(c.email);
        $('#phoneNumber').val(c.phoneNumber);
        $('#city').val(c.city);
        customerModal.show();
    });
}

// 5. Save Customer (Create or Update)
function saveCustomer() {
    const id = $('#customerId').val();
    const isEdit = id !== '';
    
    const payload = {
        firstName: $('#firstName').val(),
        lastName: $('#lastName').val(),
        email: $('#email').val(),
        phoneNumber: $('#phoneNumber').val(),
        city: $('#city').val()
    };

    const $btn = $('#saveBtn');
    $btn.prop('disabled', true).text('Saving...');

    $.ajax({
        url: isEdit ? `/api/customers/${id}` : '/api/customers',
        type: isEdit ? 'PUT' : 'POST',
        contentType: 'application/json',
        data: JSON.stringify(payload),
        success: function () {
            customerModal.hide();
            $btn.prop('disabled', false).text('Save Customer');
            loadCustomers(); // Refresh table
        },
        error: function (xhr) {
            alert("Error: " + (xhr.responseJSON ? xhr.responseJSON.message : "Could not save customer"));
            $btn.prop('disabled', false).text('Save Customer');
        }
    });
}

// 6. Toggle Status (Activate/Deactivate)
function toggleStatus(id, currentStatus) {
    const newStatus = currentStatus === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    if (!confirm(`Are you sure you want to change status to ${newStatus}?`)) return;

    $.ajax({
        url: `/api/customers/${id}/status?status=${newStatus}`,
        type: 'PATCH',
        success: function () {
            loadCustomers(); // Refresh table
        },
        error: function () {
            alert("Failed to update status.");
        }
    });
}