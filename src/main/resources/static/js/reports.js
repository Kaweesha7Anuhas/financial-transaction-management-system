/* ==========================================================================
   reports.js — FTM System
   ========================================================================== */

let jsonModal;
let monthlyChart = null;

$(document).ready(function () {

    jsonModal = new bootstrap.Modal(document.getElementById('jsonModal'));

    /* ---- Admin role guard ---- */
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

    /* ---- Logout ---- */
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

    /* ---- Default dates ---- */
    const today    = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    const toIso    = (window.FTM && FTM.toIsoDate) ? FTM.toIsoDate : function (d) {
        return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    };
    $('#stmtStart').val(toIso(firstDay));
    $('#stmtEnd').val(toIso(today));

    /* ---- Copy JSON ---- */
    $('#copyJsonBtn').on('click', function () {
        const text = $('#jsonContent').text();
        if (!text) return;
        const done = function () {
            if (window.toast) window.toast('JSON copied to clipboard.', 'success');
        };
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(text).then(done).catch(function () {
                if (window.toast) window.toast('Could not copy to clipboard.', 'warning');
            });
        } else {
            const ta = document.createElement('textarea');
            ta.value = text;
            document.body.appendChild(ta);
            ta.select();
            try { document.execCommand('copy'); done(); }
            catch (e) { if (window.toast) window.toast('Could not copy to clipboard.', 'warning'); }
            document.body.removeChild(ta);
        }
    });

    loadMonthlyChart();
    loadCashierPerformance();
});

/* 1. Chart */
function loadMonthlyChart() {
    setChartOverlay('loading');

    $.ajax({
        url: '/api/reports/charts/monthly',
        type: 'GET',
        success: function (data) {
            if (monthlyChart) {
                monthlyChart.destroy();
                monthlyChart = null;
            }

            if (!data || !Array.isArray(data.labels) || data.labels.length === 0) {
                setChartOverlay('empty');
                return;
            }

            setChartOverlay('hide');
            const ctx = document.getElementById('monthlyChart').getContext('2d');
            monthlyChart = new Chart(ctx, buildChartConfig(data));
        },
        error: function () {
            setChartOverlay('error');
            if (window.toast) window.toast('Could not load monthly chart.', 'danger');
        }
    });
}

function buildChartConfig(data) {
    const c = (window.FTM && FTM.chartColors) ? FTM.chartColors() : {};
    
    const primary = c.primary || '#4f46e5';
    const danger  = c.danger || '#ef4444';
    const text    = c.text || '#64748b';
    const grid    = c.grid || 'rgba(15,23,42,.08)';

    const ctx = document.getElementById('monthlyChart').getContext('2d');

    const depositGrad = ctx.createLinearGradient(0, 0, 0, 320);
    depositGrad.addColorStop(0, c.fillTop || 'rgba(79,70,229,.28)');
    depositGrad.addColorStop(1, c.fillBottom || 'rgba(79,70,229,0)');

    const withdrawGrad = ctx.createLinearGradient(0, 0, 0, 320);
    withdrawGrad.addColorStop(0, 'rgba(239,68,68,.25)');
    withdrawGrad.addColorStop(1, 'rgba(239,68,68,0)');

    return {
        type: 'line',
        data: {
            labels: data.labels,
            datasets: [
                {
                    label: 'Deposits',
                    data: data.deposits,
                    borderColor: primary,
                    backgroundColor: depositGrad,
                    fill: true,
                    tension: 0.4,
                    borderWidth: 2.5,
                    pointRadius: 0,
                    pointHoverRadius: 5,
                    pointHoverBackgroundColor: primary,
                    pointHoverBorderColor: '#fff',
                    pointHoverBorderWidth: 2
                },
                {
                    label: 'Withdrawals',
                    data: data.withdrawals,
                    borderColor: danger,
                    backgroundColor: withdrawGrad,
                    fill: true,
                    tension: 0.4,
                    borderWidth: 2.5,
                    pointRadius: 0,
                    pointHoverRadius: 5,
                    pointHoverBackgroundColor: danger,
                    pointHoverBorderColor: '#fff',
                    pointHoverBorderWidth: 2
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: { duration: 700, easing: 'easeOutQuart' },
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
                        label: function (context) {
                            return ' ' + context.dataset.label + ': ' + formatCurrency(context.raw);
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

function setChartOverlay(mode) {
    const $o = $('#monthlyChartOverlay');
    if (mode === 'hide') { $o.addClass('d-none'); return; }
    $o.removeClass('d-none');

    if (mode === 'loading') {
        $o.html(
            '<div class="spinner-border text-primary" role="status" aria-hidden="true"></div>' +
            '<p class="text-muted mt-3 mb-0" style="font-size:.875rem;">Loading chart…</p>'
        );
    } else if (mode === 'empty') {
        $o.html(
            '<div class="empty-icon"><i class="bi bi-graph-up"></i></div>' +
            '<h4>No monthly data yet</h4>' +
            '<p>Charts will appear once transactions are processed.</p>'
        );
    } else if (mode === 'error') {
        $o.html(
            '<div class="empty-icon" style="background: rgba(var(--ftm-danger-rgb),.12); color: var(--ftm-danger);">' +
                '<i class="bi bi-exclamation-triangle"></i>' +
            '</div>' +
            '<h4>Could not load chart</h4>' +
            '<p>Please refresh the page or try again later.</p>'
        );
    }
}

/* 2. Cashier performance table */
function loadCashierPerformance() {
    showPerfSkeleton();

    $.ajax({
        url: '/api/reports/cashier-performance',
        type: 'GET',
        success: function (data) {
            if (!Array.isArray(data) || data.length === 0) {
                $('#cashierPerfBody').html(
                    '<tr><td colspan="4" class="py-5" style="border:0;">' +
                        '<div class="empty-state" style="padding:0;">' +
                            '<div class="empty-icon"><i class="bi bi-person-badge"></i></div>' +
                            '<h4>No performance data yet</h4>' +
                            '<p>Completed transactions will appear here.</p>' +
                        '</div>' +
                    '</td></tr>'
                );
                return;
            }

            let html = '';
            data.forEach(function (row, i) {
                const rank = i + 1;
                const rankClass = rank <= 3 ? 'lb-rank' : '';
                const name = esc(row.cashierName || '—');
                const count = Number(row.transactionCount) || 0;
                const vol = formatCurrency(Number(row.totalVolume) || 0);

                html +=
                    '<tr>' +
                        '<td><span class="' + rankClass + '" style="display:inline-flex;width:30px;height:30px;border-radius:8px;align-items:center;justify-content:center;font-weight:800;font-size:.78rem;background:var(--ftm-bg-soft);color:var(--ftm-muted);">' + rank + '</span></td>' +
                        '<td class="fw-semibold text-strong">' + name + '</td>' +
                        '<td class="text-end tabular-nums">' + count + '</td>' +
                        '<td class="text-end tabular-nums fw-bold text-strong">' + vol + '</td>' +
                    '</tr>';
            });

            $('#cashierPerfBody').html(html);
            $('#cashierPerfBody tr').each(function (i) {
                if (i === 0) $(this).find('.lb-rank').css({ background: 'linear-gradient(135deg, #fbbf24, #f59e0b)', color: '#fff' });
                else if (i === 1) $(this).find('.lb-rank').css({ background: 'linear-gradient(135deg, #cbd5e1, #94a3b8)', color: '#fff' });
                else if (i === 2) $(this).find('.lb-rank').css({ background: 'linear-gradient(135deg, #fda47a, #ea580c)', color: '#fff' });
            });
        },
        error: function () {
            $('#cashierPerfBody').html(
                '<tr><td colspan="4" class="py-5" style="border:0;">' +
                    '<div class="error-state" style="padding:0;">' +
                        '<div class="empty-icon"><i class="bi bi-exclamation-triangle"></i></div>' +
                        '<h4>Could not load performance</h4>' +
                        '<p>Please refresh the page or try again later.</p>' +
                    '</div>' +
                '</td></tr>'
            );
            if (window.toast) window.toast('Could not load cashier performance.', 'danger');
        }
    });
}

function showPerfSkeleton() {
    let rows = '';
    for (let i = 0; i < 4; i++) {
        rows +=
            '<tr>' +
                '<td><span class="skeleton" style="display:inline-block;width:30px;height:30px;border-radius:8px;"></span></td>' +
                '<td><span class="skeleton" style="display:inline-block;width:150px;height:14px;"></span></td>' +
                '<td class="text-end"><span class="skeleton" style="display:inline-block;width:60px;height:14px;"></span></td>' +
                '<td class="text-end"><span class="skeleton" style="display:inline-block;width:100px;height:14px;"></span></td>' +
            '</tr>';
    }
    $('#cashierPerfBody').html(rows);
}

/* 3. Download statement */
function downloadStatement(type) {
    const accNum = ($('#stmtAccount').val() || '').trim();
    const start  = $('#stmtStart').val();
    const end    = $('#stmtEnd').val();

    if (!accNum || !start || !end) {
        if (window.toast) window.toast('Please enter an account number and select a date range.', 'warning');
        return;
    }
    if (start > end) {
        if (window.toast) window.toast('Start date cannot be after end date.', 'warning');
        return;
    }

    const url = '/api/accounts/' + encodeURIComponent(accNum) +
                '/statement/' + encodeURIComponent(type) +
                '?startDate=' + encodeURIComponent(start) +
                '&endDate='   + encodeURIComponent(end);

    if (window.toast) {
        window.toast('Preparing your ' + type.toUpperCase() + ' download…', 'info', { duration: 2000 });
    }

    const fetchFn = (window.FTM && FTM.fetch) ? FTM.fetch : fetch;
    fetchFn(url)
        .then(function (res) {
            if (!res.ok) {
                return res.json().catch(function () { return {}; }).then(function (body) {
                    throw new Error(body.message || 'Could not download statement.');
                });
            }
            return res.blob();
        })
        .then(function (blob) {
            const blobUrl = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = blobUrl;
            a.download = 'statement_' + accNum + '.' + type.toLowerCase();
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            setTimeout(function () { URL.revokeObjectURL(blobUrl); }, 5000);
        })
        .catch(function (err) {
            if (window.toast) window.toast(err.message || 'Could not download statement.', 'danger');
        });
}

/* 4. View statement as JSON */
function viewStatementJson() {
    const accNum = ($('#stmtAccount').val() || '').trim();
    const start  = $('#stmtStart').val();
    const end    = $('#stmtEnd').val();

    if (!accNum || !start || !end) {
        if (window.toast) window.toast('Please enter an account number and select a date range.', 'warning');
        return;
    }

    const $btn = $('#btnViewJson');
    const original = $btn.html();
    $btn.prop('disabled', true).html('<span class="spinner-border spinner-border-sm me-2"></span>Loading…');

    $.ajax({
        url: '/api/accounts/' + encodeURIComponent(accNum) +
             '/statement?startDate=' + encodeURIComponent(start) +
             '&endDate=' + encodeURIComponent(end),
        type: 'GET',
        success: function (response) {
            $('#jsonContent').text(JSON.stringify(response, null, 2));
            jsonModal.show();
        },
        error: function (xhr) {
            const msg = (xhr.responseJSON && xhr.responseJSON.message)
                ? xhr.responseJSON.message
                : 'Could not generate statement.';
            if (window.toast) window.toast(msg, 'danger');
        },
        complete: function () {
            $btn.prop('disabled', false).html(original);
        }
    });
}

/* Theme update */
document.addEventListener('ftm:themechange', function () {
    if (!monthlyChart || !(window.FTM && FTM.chartColors)) return;

    const c = FTM.chartColors();
    const primary = c.primary || '#4f46e5';
    const danger  = c.danger || '#ef4444';
    const text    = c.text || '#64748b';
    const grid    = c.grid || 'rgba(15,23,42,.08)';
    
    const ctx = document.getElementById('monthlyChart').getContext('2d');

    const depositGrad = ctx.createLinearGradient(0, 0, 0, 320);
    depositGrad.addColorStop(0, c.fillTop || 'rgba(79,70,229,.28)');
    depositGrad.addColorStop(1, c.fillBottom || 'rgba(79,70,229,0)');

    const withdrawGrad = ctx.createLinearGradient(0, 0, 0, 320);
    withdrawGrad.addColorStop(0, 'rgba(239,68,68,.25)');
    withdrawGrad.addColorStop(1, 'rgba(239,68,68,0)');

    monthlyChart.data.datasets[0].borderColor     = primary;
    monthlyChart.data.datasets[0].backgroundColor = depositGrad;
    monthlyChart.data.datasets[1].borderColor     = danger;
    monthlyChart.data.datasets[1].backgroundColor = withdrawGrad;
    monthlyChart.options.plugins.legend.labels.color = text;
    monthlyChart.options.scales.x.ticks.color = text;
    monthlyChart.options.scales.y.ticks.color = text;
    monthlyChart.options.scales.y.grid.color  = grid;
    monthlyChart.update();
});

/* Utilities */
function esc(v) {
    return String(v == null ? '' : v)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}