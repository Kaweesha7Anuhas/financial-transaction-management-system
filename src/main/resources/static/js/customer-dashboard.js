$(document).ready(function () {
    
    // 1. Verify Role & Load Data
    $.ajax({
        url: '/api/auth/me',
        type: 'GET',
        success: function (user) {
            if (!user.roles.includes('CUSTOMER')) {
                window.location.href = '/index.html'; // Block non-customers
                return;
            }
            $('#customerName').text(user.fullName);
            loadDashboardData();
        },
        error: function () {
            window.location.href = '/index.html';
        }
    });

    // Logout
    $('#logoutBtn').on('click', function () {
        $.post('/api/auth/logout', function () { window.location.href = '/index.html'; });
    });
});

// 2. Load Dashboard Data
function loadDashboardData() {
    $.ajax({
        url: '/api/reports/customer-dashboard',
        type: 'GET',
        success: function (data) {
            $('#totalBalance').text(formatCurrency(data.totalBalance));
            $('#totalDeposits').text(formatCurrency(data.totalDeposits));
            $('#totalWithdrawals').text(formatCurrency(data.totalWithdrawals));
            
            renderAccounts(data.accounts);
        },
        error: function () {
            $('#accountsContainer').html('<div class="text-danger">Failed to load dashboard data.</div>');
        }
    });
}

// 3. Render Account Cards
function renderAccounts(accounts) {
    if (accounts.length === 0) {
        $('#accountsContainer').html('<div class="text-muted text-center py-4">You do not have any bank accounts yet. Please visit a branch to open one.</div>');
        return;
    }

    let html = '';
    accounts.forEach(acc => {
        // We will set the default date range for the statement to the beginning of this month
        const today = new Date();
        const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
        const startDate = firstDay.toISOString().split('T')[0];
        const endDate = today.toISOString().split('T')[0];

        html += `
            <div class="col-md-6 mb-3">
                <div class="card border shadow-sm h-100">
                    <div class="card-body p-4">
                        <div class="d-flex justify-content-between align-items-start mb-3">
                            <div>
                                <h6 class="text-muted mb-1">${acc.accountType} ACCOUNT</h6>
                                <h5 class="fw-bold text-primary mb-0">${acc.accountNumber}</h5>
                            </div>
                            <span class="badge bg-success">${acc.status}</span>
                        </div>
                        <h3 class="fw-bold mb-4">${formatCurrency(acc.balance)}</h3>
                        
                        <div class="d-flex gap-2">
                            <button class="btn btn-sm btn-outline-primary" onclick="downloadStatement('${acc.accountNumber}', '${startDate}', '${endDate}', 'pdf')">
                                <i class="bi bi-file-earmark-pdf me-1"></i> PDF
                            </button>
                            <button class="btn btn-sm btn-outline-secondary" onclick="downloadStatement('${acc.accountNumber}', '${startDate}', '${endDate}', 'csv')">
                                <i class="bi bi-file-earmark-spreadsheet me-1"></i> CSV
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    });
    $('#accountsContainer').html(html);
}

// 4. Download Statement
function downloadStatement(accountNumber, startDate, endDate, type) {
    // Navigate to the download URL (this triggers the file download)
    const url = `/api/accounts/${accountNumber}/statement/${type}?startDate=${startDate}&endDate=${endDate}`;
    window.location.href = url;
}