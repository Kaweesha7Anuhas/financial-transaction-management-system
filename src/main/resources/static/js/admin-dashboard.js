$(document).ready(function () {
    
    let myChart = null; // Store chart instance to destroy before re-rendering

    // 1. Verify Role & Load User Info
    $.ajax({
        url: '/api/auth/me',
        type: 'GET',
        success: function (user) {
            if (!user.roles.includes('ADMIN')) {
                window.location.href = '/index.html'; // Block non-admins
                return;
            }
            $('#adminName').text(user.fullName);
        },
        error: function () {
            window.location.href = '/index.html'; // Not logged in
        }
    });

    // 2. Logout Handler
    $('#logoutBtn').on('click', function () {
        $.ajax({
            url: '/api/auth/logout',
            type: 'POST',
            success: function () {
                window.location.href = '/index.html';
            }
        });
    });

    // 3. Load Dashboard Stats
    $.ajax({
        url: '/api/reports/dashboard',
        type: 'GET',
        success: function (data) {
            $('#totalCustomers').text(data.totalCustomers);
            $('#totalAccounts').text(data.totalAccounts);
            $('#totalDeposits').text(formatCurrency(data.totalDeposits));
            $('#totalWithdrawals').text(formatCurrency(data.totalWithdrawals));
        },
        error: function() {
            console.error("Failed to load dashboard stats.");
        }
    });

    // 4. Load Cashier Performance
    $.ajax({
        url: '/api/reports/cashier-performance',
        type: 'GET',
        success: function (data) {
            let html = '';
            if (data.length === 0) {
                html = '<div class="text-center py-4 text-muted">No completed transactions yet.</div>';
            } else {
                data.forEach(row => {
                    html += `
                        <div class="list-group-item d-flex justify-content-between align-items-center px-0 border-0">
                            <div>
                                <h6 class="mb-0 fw-bold text-dark">${row.cashierName}</h6>
                                <small class="text-muted">${row.transactionCount} Transactions</small>
                            </div>
                            <span class="badge bg-primary rounded-pill px-3 py-2">${formatCurrency(row.totalVolume)}</span>
                        </div>
                    `;
                });
            }
            $('#cashierPerformanceList').html(html);
        },
        error: function() {
            $('#cashierPerformanceList').html('<div class="text-danger">Failed to load performance data.</div>');
        }
    });

    // 5. Load Chart Data
    function loadChart(type) {
        let url = type === 'daily' ? '/api/reports/charts' : '/api/reports/charts/monthly';
        
        $.ajax({
            url: url,
            type: 'GET',
            success: function (data) {
                if (myChart) {
                    myChart.destroy(); // Destroy previous chart
                }

                // If no data, display empty state
                if (data.labels.length === 0) {
                    $('#transactionChart').parent().html('<div class="text-center py-5 text-muted">No transaction data available to display chart.</div>');
                    return;
                }

                const ctx = document.getElementById('transactionChart').getContext('2d');
                myChart = new Chart(ctx, {
                    type: 'bar',
                    data: {
                        labels: data.labels,
                        datasets: [
                            {
                                label: 'Deposits',
                                data: data.deposits,
                                backgroundColor: 'rgba(37, 99, 235, 0.85)',
                                borderRadius: 6
                            },
                            {
                                label: 'Withdrawals',
                                data: data.withdrawals,
                                backgroundColor: 'rgba(220, 53, 69, 0.85)',
                                borderRadius: 6
                            }
                        ]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            legend: { position: 'top', labels: { usePointStyle: true, boxWidth: 8 } },
                            tooltip: {
                                callbacks: {
                                    label: function(context) {
                                        return context.dataset.label + ': ' + formatCurrency(context.raw);
                                    }
                                }
                            }
                        },
                        scales: {
                            y: { 
                                beginAtZero: true,
                                ticks: {
                                    callback: function(value) {
                                        return 'LKR ' + value.toLocaleString();
                                    }
                                }
                            }
                        }
                    }
                });
            }
        });
    }

    // Load initial daily chart
    loadChart('daily');

    // Handle Chart Type Change
    $('#chartType').on('change', function() {
        loadChart($(this).val());
    });

});