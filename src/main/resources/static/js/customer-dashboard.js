/* ==========================================================================
   customer-dashboard.js — FTM Bank
   --------------------------------------------------------------------------
   Preserved (unchanged):
     · Role guard: CUSTOMER only → else redirect to /index.html
     · Endpoints:
         GET  /api/auth/me
         POST /api/auth/logout
         GET  /api/reports/customer-dashboard
     · Field IDs: #customerName, #totalBalance, #totalDeposits,
                  #totalWithdrawals, #accountsContainer, #logoutBtn
     · Global functions: loadDashboardData(), renderAccounts(accounts),
                         downloadStatement(accountNumber, startDate, endDate, type)
     · Default statement date range: first day of current month → today
     · Download URL: /api/accounts/{acc}/statement/{type}?startDate=&endDate=
     · Response shape: { totalBalance, totalDeposits, totalWithdrawals, accounts[] }
   Added:
     · "Bank card" style account rendering with gradient, masked number,
       status pill, and show/hide eye toggle for balance
     · Balance eye toggle on total balance (#totalBalanceToggle)
     · Prominent gradient Download PDF CTA + soft CSV secondary button
     · Animated count-up on the three summary numbers
     · Empty + error states, XSS-safe rendering
     · Conditional "recent activity" timeline if `data.recentTransactions` exists
     · Topbar dropdown logout sharing the same handler as #logoutBtn
   ========================================================================== */

$(document).ready(function () {

    /* ==================================================================
     * 1. Verify role (CUSTOMER only) & load user info
     * ================================================================ */
    $.ajax({
        url: '/api/auth/me',
        type: 'GET',
        success: function (user) {
            const roles = (user && Array.isArray(user.roles)) ? user.roles : [];
            if (!roles.includes('CUSTOMER')) {
                window.location.href = '/index.html';     // Block non-customers
                return;
            }
            const name = (user.fullName || 'Customer').trim();
            $('#customerName').text(name);
            $('#customerNameTop').text(name);
            $('#userInitial').text((name.charAt(0) || 'U').toUpperCase());

            loadDashboardData();
        },
        error: function () {
            window.location.href = '/index.html';
        }
    });

    /* ==================================================================
     * 2. Logout — sidebar #logoutBtn + topbar .js-logout
     * ================================================================ */
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

    /* ==================================================================
     * 3. Balance show/hide toggle — delegated so it works for both the
     *    hero balance and any per-card balance toggles
     * ================================================================ */
    $(document).on('click', '.balance-toggle', function () {
        const $btn = $(this);
        const target = $btn.data('target');
        const $value = $(target);
        if (!$value.length) return;

        const visible = $btn.attr('data-visible') !== 'false';

        if (visible) {
            // Store the real value if not stored yet, then mask it
            if (!$value.attr('data-full')) {
                $value.attr('data-full', $value.text());
            }
            $value.text('••••••').addClass('masked');
            $btn.attr('data-visible', 'false').attr('aria-label', 'Show balance');
            $btn.find('i').attr('class', 'bi bi-eye-slash');
        } else {
            const full = $value.attr('data-full') || $value.text();
            $value.text(full).removeClass('masked');
            $btn.attr('data-visible', 'true').attr('aria-label', 'Hide balance');
            $btn.find('i').attr('class', 'bi bi-eye');
        }
    });

});

/* ======================================================================
 * 2. Load dashboard data
 * ==================================================================== */
function loadDashboardData() {
    $.ajax({
        url: '/api/reports/customer-dashboard',
        type: 'GET',
        success: function (data) {
            data = data || {};

            const totalBalance    = Number(data.totalBalance)    || 0;
            const totalDeposits   = Number(data.totalDeposits)   || 0;
            const totalWithdrawals= Number(data.totalWithdrawals)|| 0;

            // Animated count-up (falls back to plain text)
            if (window.FTM && FTM.countUp) {
                FTM.countUp($('#totalBalance')[0],    totalBalance,    { formatter: formatCurrency });
                FTM.countUp($('#totalDeposits')[0],   totalDeposits,   { formatter: formatCurrency });
                FTM.countUp($('#totalWithdrawals')[0],totalWithdrawals,{ formatter: formatCurrency });
            } else {
                $('#totalBalance').text(formatCurrency(data.totalBalance));
                $('#totalDeposits').text(formatCurrency(data.totalDeposits));
                $('#totalWithdrawals').text(formatCurrency(data.totalWithdrawals));
            }

            // Remember the real values for the eye-toggle reveal
            $('#totalBalance').attr('data-full', formatCurrency(totalBalance));

            // Accounts + optional recent activity
            const accounts = Array.isArray(data.accounts) ? data.accounts : [];
            renderAccounts(accounts);
            if (Array.isArray(data.recentTransactions) && data.recentTransactions.length > 0) {
                renderRecentActivity(data.recentTransactions);
            } else {
                loadRecentTransactionsForAccounts(accounts);
            }
        },
        error: function () {
            $('#accountsContainer').html(
                '<div class="col-12">' +
                    '<div class="card">' +
                        '<div class="card-body py-5">' +
                            '<div class="error-state" style="padding:0;">' +
                                '<div class="empty-icon"><i class="bi bi-exclamation-triangle"></i></div>' +
                                '<h4>Could not load your dashboard</h4>' +
                                '<p>Please refresh the page or try again in a moment.</p>' +
                            '</div>' +
                        '</div>' +
                    '</div>' +
                '</div>'
            );
            if (window.toast) window.toast('Could not load your dashboard data.', 'danger');
        }
    });
}

/* ======================================================================
 * 3. Render bank accounts as premium "bank cards"
 * ==================================================================== */
function renderAccounts(accounts) {
    if (!accounts || accounts.length === 0) {
        $('#accountsContainer').html(
            '<div class="col-12">' +
                '<div class="card">' +
                    '<div class="card-body py-5">' +
                        '<div class="empty-state" style="padding:0;">' +
                            '<div class="empty-icon"><i class="bi bi-credit-card"></i></div>' +
                            '<h4>No bank accounts yet</h4>' +
                            '<p>Please visit a branch to open your first account. We\'ll display it here as soon as it\'s ready.</p>' +
                        '</div>' +
                    '</div>' +
                '</div>' +
            '</div>'
        );
        return;
    }

    // Preserved: default statement date range = first of month → today
    const today    = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    const toIso    = (window.FTM && FTM.toIsoDate) ? FTM.toIsoDate : function (d) {
        return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    };
    const startDate = toIso(firstDay);
    const endDate   = toIso(today);

    let html = '';
    accounts.forEach(function (acc, i) {
        const accNum = String(acc.accountNumber || '');
        const balId  = 'accBalance-' + i;
        const statusPill = renderStatusPill(acc.status);
        const typeLabel = (acc.accountType || 'ACCOUNT').toUpperCase();
        const balanceFormatted = formatCurrency(Number(acc.balance) || 0);

        html +=
            '<div class="col-lg-6">' +
                '<div class="bank-card h-100">' +

                    // ---- Top row: brand + chip ----
                    '<div class="bank-card-top">' +
                        '<span class="bank-card-brand">' +
                            '<i class="bi bi-bank2 me-1"></i>FTM · ' + esc(typeLabel) +
                        '</span>' +
                        '<span class="bank-card-chip" aria-hidden="true"></span>' +
                    '</div>' +

                    // ---- Card number ----
                    '<div class="bank-card-number d-flex align-items-center gap-2" aria-label="Account number">' +
                        '<span>' + esc(accNum) + '</span>' +
                        '<button type="button" class="btn btn-sm p-0 px-1" ' +
                                'onclick="copyCustomerAccount(\'' + escAttr(accNum) + '\')" ' +
                                'title="Copy account number" aria-label="Copy account number" ' +
                                'style="background:rgba(255,255,255,.15); color:#fff; border:1px solid rgba(255,255,255,.25); font-size:.75rem; line-height:1.4;">' +
                            '<i class="bi bi-clipboard"></i>' +
                        '</button>' +
                    '</div>' +

                    // ---- Balance + eye toggle ----
                    '<div class="balance-row mb-3">' +
                        '<span class="balance-value" id="' + balId + '" ' +
                              'data-full="' + esc(balanceFormatted) + '" ' +
                              'style="color:#fff; font-size:1.5rem;">' +
                            esc(balanceFormatted) +
                        '</span>' +
                        '<button type="button" class="balance-toggle" ' +
                                'aria-label="Hide balance" ' +
                                'data-target="#' + balId + '" ' +
                                'data-visible="true" ' +
                                'style="background: rgba(255,255,255,.15); color:#fff; border-color: rgba(255,255,255,.3);">' +
                            '<i class="bi bi-eye"></i>' +
                        '</button>' +
                    '</div>' +

                    // ---- Footer: status + download CTA ----
                    '<div class="bank-card-bottom">' +
                        '<div>' +
                            '<div class="bank-card-label">Status</div>' +
                            '<div class="bank-card-value">' + statusPill + '</div>' +
                        '</div>' +
                        '<div class="d-flex gap-2">' +
                            '<button type="button" class="btn btn-sm fw-bold" ' +
                                    'onclick="downloadStatement(\'' + escAttr(accNum) + '\', \'' + startDate + '\', \'' + endDate + '\', \'pdf\')" ' +
                                    'style="background:#fff; color:#4f46e5; border:0; box-shadow: 0 6px 18px -6px rgba(0,0,0,.35);">' +
                                '<i class="bi bi-file-earmark-pdf me-1"></i>Download PDF' +
                            '</button>' +
                            '<button type="button" class="btn btn-sm fw-bold" ' +
                                    'onclick="downloadStatement(\'' + escAttr(accNum) + '\', \'' + startDate + '\', \'' + endDate + '\', \'csv\')" ' +
                                    'style="background: rgba(255,255,255,.15); color:#fff; border:1px solid rgba(255,255,255,.3);">' +
                                '<i class="bi bi-file-earmark-spreadsheet me-1"></i>CSV' +
                            '</button>' +
                        '</div>' +
                    '</div>' +

                '</div>' +
            '</div>';
    });

    $('#accountsContainer').html(html);
}

/* ======================================================================
 * 4. Recent-activity timeline
 * ==================================================================== */
function loadRecentTransactionsForAccounts(accounts) {
    if (!Array.isArray(accounts) || accounts.length === 0) {
        renderRecentActivity([]);
        return;
    }
    const fetchFn = (window.FTM && FTM.fetch) ? FTM.fetch : fetch;
    const requests = accounts.slice(0, 5).map(function (acc) {
        const num = String(acc.accountNumber || '').trim();
        if (!num) return Promise.resolve([]);
        return fetchFn('/api/transactions/account/' + encodeURIComponent(num) + '?page=0&size=5')
            .then(function (res) { return res.ok ? res.json() : null; })
            .then(function (page) {
                return (page && Array.isArray(page.content)) ? page.content : [];
            })
            .catch(function () { return []; });
    });

    Promise.all(requests).then(function (lists) {
        const merged = [];
        lists.forEach(function (arr) {
            arr.forEach(function (tx) { merged.push(tx); });
        });
        merged.sort(function (a, b) {
            return new Date(b.transactionDate || 0).getTime() - new Date(a.transactionDate || 0).getTime();
        });
        renderRecentActivity(merged.slice(0, 8));
    });
}

function renderRecentActivity(txs) {
    const $section = $('#recentActivitySection');
    const $list    = $('#recentActivityList');

    if (!Array.isArray(txs) || txs.length === 0) {
        $section.addClass('d-none');
        $list.empty();
        return;
    }

    let html = '';
    txs.slice(0, 8).forEach(function (tx) {
        const isDeposit  = tx.transactionType === 'DEPOSIT';
        const isReversal = tx.transactionType === 'REVERSAL';
        const cls = isDeposit ? 'tl-in' : 'tl-out';
        const icon = isDeposit ? 'bi-arrow-down-circle' : (isReversal ? 'bi-arrow-counterclockwise' : 'bi-arrow-up-circle');
        const amountClass = isDeposit ? 'amount-positive' : (isReversal ? 'text-warning' : 'amount-negative');
        const sign = isDeposit ? '+' : (isReversal ? '↺' : '−');
        const date = (window.FTM && FTM.fmtDateTime)
            ? FTM.fmtDateTime(tx.transactionDate)
            : new Date(tx.transactionDate).toLocaleString();

        html +=
            '<li class="timeline-item ' + cls + '">' +
                '<span class="tl-icon"><i class="bi ' + icon + '"></i></span>' +
                '<div class="tl-body">' +
                    '<div class="tl-title">' + esc(tx.description || (isDeposit ? 'Deposit' : (isReversal ? 'Reversal' : 'Withdrawal'))) + '</div>' +
                    '<div class="tl-meta">' + esc(date) +
                        (tx.accountNumber ? ' · Acc ' + esc(tx.accountNumber) : '') +
                        (tx.transactionReference ? ' · ' + esc(tx.transactionReference) : '') +
                    '</div>' +
                '</div>' +
                '<span class="tl-amount ' + amountClass + '">' +
                    sign + ' ' + formatCurrency(Number(tx.amount) || 0) +
                '</span>' +
            '</li>';
    });

    $list.html(html);
    $section.removeClass('d-none');
}

/* ======================================================================
 * 5. Download statement (Preserved signature + safe Blob download)
 * ==================================================================== */
function downloadStatement(accountNumber, startDate, endDate, type) {
    const url = '/api/accounts/' + encodeURIComponent(accountNumber) +
                '/statement/' + encodeURIComponent(type) +
                '?startDate=' + encodeURIComponent(startDate) +
                '&endDate=' + encodeURIComponent(endDate);
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
            a.download = 'statement_' + accountNumber + '.' + String(type || 'pdf').toLowerCase();
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            setTimeout(function () { URL.revokeObjectURL(blobUrl); }, 5000);
        })
        .catch(function (err) {
            if (window.toast) window.toast(err.message || 'Could not download statement.', 'danger');
        });
}

function copyCustomerAccount(accNum) {
    if (!accNum) return;
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(accNum).then(function () {
            if (window.toast) window.toast('Account ' + accNum + ' copied to clipboard.', 'info', { duration: 2200 });
        });
    }
}

/* ======================================================================
 * Small helpers
 * ==================================================================== */
function renderStatusPill(status) {
    switch (status) {
        case 'ACTIVE':  return '<span class="status-pill status-success" style="background:rgba(255,255,255,.18); border-color:rgba(255,255,255,.3); color:#fff;">Active</span>';
        case 'FROZEN':  return '<span class="status-pill status-warning" style="background:rgba(255,255,255,.18); border-color:rgba(255,255,255,.3); color:#fff;">Frozen</span>';
        case 'CLOSED':  return '<span class="status-pill status-neutral" style="background:rgba(255,255,255,.15); border-color:rgba(255,255,255,.25); color:rgba(255,255,255,.8);">Closed</span>';
        default:        return '<span class="status-pill" style="background:rgba(255,255,255,.15); border-color:rgba(255,255,255,.25); color:rgba(255,255,255,.8);">' + esc(status || '—') + '</span>';
    }
}

function esc(v) {
    return String(v == null ? '' : v)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}
function escAttr(v) {
    return String(v == null ? '' : v).replace(/'/g, "\\'").replace(/</g, '');
}