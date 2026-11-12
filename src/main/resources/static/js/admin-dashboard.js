/* ==========================================================================
   admin-dashboard.js — FTM System
   ========================================================================== */

$(document).ready(function () {

    const countFmt = (window.FTM && FTM.fmtInt)
        ? FTM.fmtInt
        : function (n) { return String(Math.round(Number(n) || 0)); };

    const moneyFmt = (window.FTM && FTM.fmtMoney)
        ? FTM.fmtMoney
        : formatCurrency; 

    function escapeHtml(str) {
        return String(str == null ? '' : str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    let myChart = null;

    /* 1. Verify role & load user info */
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

            const initial = (name.charAt(0) || 'A').toUpperCase();
            $('#userInitial').text(initial);
        },
        error: function () {
            window.location.href = '/index.html';       
        }
    });

    /* 2. Logout */
    function handleLogout(e) {
        if (e && e.preventDefault) e.preventDefault();
        if (window.toast) window.toast('Signing out…', 'info', { duration: 1200 });
        $.ajax({
            url: '/api/auth/logout',
            type: 'POST',
            success: function () { window.location.href = '/index.html'; },
            error:   function () { window.location.href = '/index.html'; }
        });
    }
    $('#logoutBtn').on('click', handleLogout);
    $('.js-logout').on('click', handleLogout);

    /* 3. Load dashboard stats */
    $.ajax({
        url: '/api/reports/dashboard',
        type: 'GET',
        success: function (data) {
            data = data || {};
            const $tc = $('#totalCustomers');
            const $ta = $('#totalAccounts');
            const $td = $('#totalDeposits');
            const $tw = $('#totalWithdrawals');

            if (window.FTM && FTM.countUp) {
                FTM.countUp($tc[0], Number(data.totalCustomers)   || 0, { formatter: countFmt });
                FTM.countUp($ta[0], Number(data.totalAccounts)    || 0, { formatter: countFmt });
                FTM.countUp($td[0], Number(data.totalDeposits)    || 0, { formatter: moneyFmt });
                FTM.countUp($tw[0], Number(data.totalWithdrawals) || 0, { formatter: moneyFmt });
            } else {
                $tc.text(data.totalCustomers ?? 0);
                $ta.text(data.totalAccounts ?? 0);
                $td.text(formatCurrency(data.totalDeposits ?? 0));
                $tw.text(formatCurrency(data.totalWithdrawals ?? 0));
            }
        },
        error: function () {
            if (window.toast) window.toast('Could not load dashboard statistics.', 'danger');
        }
    });

    /* 4. Load cashier performance */
    $.ajax({
        url: '/api/reports/cashier-performance',
        type: 'GET',
        success: function (data) {
            const $list = $('#cashierPerformanceList');

            if (!Array.isArray(data) || data.length === 0) {
                $list.html(
                    '<li style="display:block; border:0; padding:2rem 0;">' +
                        '<div class="empty-state" style="padding:0;">' +
                            '<div class="empty-icon"><i class="bi bi-person-badge"></i></div>' +
                            '<h4>No data yet</h4>' +
                            '<p>Completed transactions will appear here once cashiers process payments.</p>' +
                        '</div>' +
                    '</li>'
                );
                return;
            }

            const rows = data.map(function (row, i) {
                const name  = escapeHtml(row.cashierName || '—');
                const count = Number(row.transactionCount) || 0;
                const vol   = formatCurrency(Number(row.totalVolume) || 0);
                return (
                    '<li>' +
                        '<span class="lb-rank">' + (i + 1) + '</span>' +
                        '<div>' +
                            '<div class="lb-name">' + name + '</div>' +
                            '<div class="lb-meta">' + count + ' transaction' + (count === 1 ? '' : 's') + '</div>' +
                        '</div>' +
                        '<span class="lb-value">' + vol + '</span>' +
                    '</li>'
                );
            }).join('');

            $list.html(rows);
        },
        error: function () {
            $('#cashierPerformanceList').html(
                '<li style="display:block; border:0; padding:1.5rem 0;">' +
                    '<div class="error-state" style="padding:0;">' +
                        '<div class="empty-icon"><i class="bi bi-exclamation-triangle"></i></div>' +
                        '<h4>Unable to load</h4>' +
                        '<p>We couldn\'t fetch cashier performance. Please refresh to try again.</p>' +
                    '</div>' +
                '</li>'
            );
            if (window.toast) window.toast('Could not load cashier performance.', 'danger');
        }
    });

    /* 5. Chart */
    function getChartCtx() {
        return document.getElementById('transactionChart').getContext('2d');
    }

    function setChartOverlay(mode) {
        const $o = $('#chartOverlay');
        if (mode === 'hide') {
            $o.addClass('d-none');
            return;
        }

        $o.removeClass('d-none');

        if (mode === 'loading') {
            $o.html(
                '<div class="spinner-border text-primary" role="status" aria-hidden="true"></div>' +
                '<p class="text-muted mt-3 mb-0" style="font-size:.875rem;">Loading chart…</p>'
            );
        } else if (mode === 'empty') {
            $o.html(
                '<div class="empty-icon"><i class="bi bi-graph-up"></i></div>' +
                '<h4>No transaction data yet</h4>' +
                '<p>Charts will appear once deposits or withdrawals are processed.</p>'
            );
        } else if (mode === 'error') {
            $o.html(
                '<div class="empty-icon" style="background: rgba(var(--ftm-danger-rgb),.12); color: var(--ftm-danger);">' +
                    '<i class="bi bi-exclamation-triangle"></i>' +
                '</div>' +
                '<h4>Unable to load chart</h4>' +
                '<p>Please refresh the page or try again later.</p>'
            );
        }
    }

    function buildChartConfig(data) {
        const c = (window.FTM && FTM.chartColors) ? FTM.chartColors() : {};
        
        const primary = c.primary || '#4f46e5';
        const danger  = c.danger || '#ef4444';
        const text    = c.text || '#64748b';
        const grid    = c.grid || 'rgba(15,23,42,.08)';

        return {
            type: 'bar',
            data: {
                labels: data.labels,
                datasets: [
                    {
                        label: 'Deposits',
                        data: data.deposits,
                        backgroundColor: primary,
                        borderRadius: 8,
                        borderSkipped: false,
                        maxBarThickness: 28
                    },
                    {
                        label: 'Withdrawals',
                        data: data.withdrawals,
                        backgroundColor: danger,
                        borderRadius: 8,
                        borderSkipped: false,
                        maxBarThickness: 28
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                animation: { duration: 600, easing: 'easeOutQuart' },
                interaction: { intersect: false, mode: 'index' },
                plugins: {
                    legend: {
                        position: 'top',
                        align: 'end',
                        labels: {
                            usePointStyle: true,
                            pointStyle: 'circle',
                            boxWidth: 8,
                            boxHeight: 8,
                            padding: 16,
                            color: text,
                            font: { family: "'Inter', sans-serif", size: 12, weight: '600' }
                        }
                    },
                    tooltip: {
                        backgroundColor: 'rgba(15,23,42,.95)',
                        titleColor: '#f1f5f9',
                        bodyColor:  '#e2e8f0',
                        padding: 12,
                        cornerRadius: 10,
                        usePointStyle: true,
                        callbacks: {
                            label: function (ctx) {
                                return ' ' + ctx.dataset.label + ': ' + formatCurrency(ctx.raw);
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        grid:   { display: false },
                        border: { display: false },
                        ticks:  { color: text, font: { size: 12, weight: '500' } }
                    },
                    y: {
                        beginAtZero: true,
                        grid:   { color: grid, drawBorder: false },
                        border: { display: false },
                        ticks:  {
                            color: text,
                            font: { size: 12 },
                            callback: function (v) { return 'LKR ' + Number(v).toLocaleString(); }
                        }
                    }
                }
            }
        };
    }

    function loadChart(type) {
        const url = (type === 'daily')
            ? '/api/reports/charts'
            : '/api/reports/charts/monthly';

        if (!myChart) setChartOverlay('loading');

        $.ajax({
            url: url,
            type: 'GET',
            success: function (data) {
                if (myChart) {
                    myChart.destroy();
                    myChart = null;
                }

                if (!data || !Array.isArray(data.labels) || data.labels.length === 0) {
                    setChartOverlay('empty');
                    return;
                }

                setChartOverlay('hide');
                myChart = new Chart(getChartCtx(), buildChartConfig(data));
            },
            error: function () {
                if (myChart) {
                    myChart.destroy();
                    myChart = null;
                }
                setChartOverlay('error');
                if (window.toast) window.toast('Could not load transaction chart.', 'danger');
            }
        });
    }

    loadChart('daily');

    $('#chartType').on('change', function () {
        loadChart($(this).val());
    });

    /* 6. Theme update */
    document.addEventListener('ftm:themechange', function () {
        if (!myChart || !(window.FTM && FTM.chartColors)) return;

        const c = FTM.chartColors();
        const primary = c.primary || '#4f46e5';
        const danger  = c.danger || '#ef4444';
        const text    = c.text || '#64748b';
        const grid    = c.grid || 'rgba(15,23,42,.08)';

        myChart.data.datasets[0].backgroundColor = primary;
        myChart.data.datasets[1].backgroundColor = danger;
        myChart.options.plugins.legend.labels.color = text;
        myChart.options.scales.x.ticks.color = text;
        myChart.options.scales.y.ticks.color = text;
        myChart.options.scales.y.grid.color  = grid;
        myChart.update();
    });

});