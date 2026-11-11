$(document).ready(function () {
    
    // Verify Role & Load User Info
    $.ajax({
        url: '/api/auth/me',
        type: 'GET',
        success: function (user) {
            if (!user.roles.includes('CASHIER') && !user.roles.includes('ADMIN')) {
                window.location.href = '/index.html'; // Block unauthorized access
                return;
            }
            $('#cashierName').text(user.fullName);
        },
        error: function () {
            window.location.href = '/index.html';
        }
    });

    // Logout
    $('#logoutBtn').on('click', function () {
        $.post('/api/auth/logout', function () { window.location.href = '/index.html'; });
    });

    // Load Cashier Stats
    $.ajax({
        url: '/api/reports/cashier-dashboard',
        type: 'GET',
        success: function (data) {
            $('#todayDeposits').text(formatCurrency(data.todayDeposits));
            $('#todayWithdrawals').text(formatCurrency(data.todayWithdrawals));
            $('#todayCount').text(data.todayTransactionCount);
        },
        error: function() {
            console.error("Failed to load cashier stats.");
        }
    });
});