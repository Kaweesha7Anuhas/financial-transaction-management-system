let jsonModal;

$(document).ready(function () {
    jsonModal = new bootstrap.Modal(document.getElementById('jsonModal'));

    $.get('/api/auth/me', function (user) {
        $('#adminName').text(user.fullName);
    });

    $('#logoutBtn').on('click', function () {
        $.post('/api/auth/logout', function () { window.location.href = '/index.html'; });
    });

    // Set default dates for statement (first day of current month to today)
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    $('#stmtStart').val(firstDay.toISOString().split('T')[0]);
    $('#stmtEnd').val(today.toISOString().split('T')[0]);

    loadMonthlyChart();
    loadCashierPerformance();
});

// 1. Load Monthly Chart
function loadMonthlyChart() {
    $.ajax({
        url: '/api/reports/charts/monthly',
        type: 'GET',
        success: function (data) {
            const ctx = document.getElementById('monthlyChart').getContext('2d');
            new Chart(ctx, {
                type: 'line',
                data: {
                    labels: data.labels,
                    datasets: [
                        {
                            label: 'Deposits',
                            data: data.deposits,
                            borderColor: '#2563eb',
                            backgroundColor: 'rgba(37, 99, 235, 0.1)',
                            fill: true,
                            tension: 0.4
                        },
                        {
                            label: 'Withdrawals',
                            data: data.withdrawals,
                            borderColor: '#dc3545',
                            backgroundColor: 'rgba(220, 53, 69, 0.1)',
                            fill: true,
                            tension: 0.4
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { position: 'top' }
                    }
                }
            });
        }
    });
}

// 2. Load Cashier Performance Table
function loadCashierPerformance() {
    $.ajax({
        url: '/api/reports/cashier-performance',
        type: 'GET',
        success: function (data) {
            let html = '';
            if (data.length === 0) {
                html = '<tr><td colspan="3" class="text-center py-4 text-muted">No transactions processed yet.</td></tr>';
            } else {
                data.forEach(row => {
                    html += `
                        <tr>
                            <td class="fw-semibold text-primary">${row.cashierName}</td>
                            <td>${row.transactionCount}</td>
                            <td class="fw-bold text-success">${formatCurrency(row.totalVolume)}</td>
                        </tr>
                    `;
                });
            }
            $('#cashierPerfBody').html(html);
        }
    });
}

// 3. Download Statement (PDF or CSV)
function downloadStatement(type) {
    const accNum = $('#stmtAccount').val().trim();
    const start = $('#stmtStart').val();
    const end = $('#stmtEnd').val();

    if (!accNum || !start || !end) {
        alert("Please enter an account number and select a date range.");
        return;
    }

    // Since GET requests don't require CSRF and we need a file download, 
    // the easiest way is to navigate the window to the download endpoint.
    const url = `/api/accounts/${accNum}/statement/${type}?startDate=${start}&endDate=${end}`;
    window.location.href = url;
}

// 4. View Statement as JSON (for preview)
function viewStatementJson() {
    const accNum = $('#stmtAccount').val().trim();
    const start = $('#stmtStart').val();
    const end = $('#stmtEnd').val();

    if (!accNum || !start || !end) {
        alert("Please enter an account number and select a date range.");
        return;
    }

    $.ajax({
        url: `/api/accounts/${accNum}/statement?startDate=${start}&endDate=${end}`,
        type: 'GET',
        success: function (response) {
            $('#jsonContent').text(JSON.stringify(response, null, 2));
            jsonModal.show();
        },
        error: function (xhr) {
            alert("Error: " + (xhr.responseJSON ? xhr.responseJSON.message : "Could not generate statement."));
        }
    });
}