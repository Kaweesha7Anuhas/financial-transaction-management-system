/* ==========================================================================
   cashier-dashboard.js — FTM System
   --------------------------------------------------------------------------
   Preserved (unchanged):
     · Role check — allows CASHIER **or** ADMIN, else redirects to /index.html
     · Endpoints:
         GET  /api/auth/me
         POST /api/auth/logout
         GET  /api/reports/cashier-dashboard
     · Field IDs: #cashierName, #todayDeposits, #todayWithdrawals,
                  #todayCount, #logoutBtn
     · Response shape: { todayDeposits, todayWithdrawals, todayTransactionCount }
     · All three values formatted via formatCurrency() / raw count
   Added:
     · Animated count-up on all three stats (falls back gracefully)
     · Toast notifications on fetch error
     · Topbar dropdown logout sharing the same handler as #logoutBtn
     · User initial in the topbar avatar
   ========================================================================== */

$(document).ready(function () {

    /* ==================================================================
     * 1. Verify role & load user info (CASHIER or ADMIN allowed)
     * ================================================================ */
    $.ajax({
        url: '/api/auth/me',
        type: 'GET',
        success: function (user) {
            const roles = (user && Array.isArray(user.roles)) ? user.roles : [];
            if (!roles.includes('CASHIER') && !roles.includes('ADMIN')) {
                window.location.href = '/index.html';     // Block unauthorized access
                return;
            }
            const name = (user.fullName || 'Cashier').trim();
            $('#cashierName').text(name);
            $('#userInitial').text((name.charAt(0) || 'C').toUpperCase());
        },
        error: function () {
            window.location.href = '/index.html';         // Not logged in
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
     * 3. Load cashier stats (with count-up animation)
     * ================================================================ */
    $.ajax({
        url: '/api/reports/cashier-dashboard',
        type: 'GET',
        success: function (data) {
            data = data || {};

            const deposits    = Number(data.todayDeposits)         || 0;
            const withdrawals = Number(data.todayWithdrawals)      || 0;
            const count       = Number(data.todayTransactionCount) || 0;

            if (window.FTM && FTM.countUp) {
                FTM.countUp($('#todayDeposits')[0],    deposits,    { formatter: formatCurrency });
                FTM.countUp($('#todayWithdrawals')[0], withdrawals, { formatter: formatCurrency });
                FTM.countUp($('#todayCount')[0],       count,       { formatter: FTM.fmtInt });
            } else {
                // Graceful fallback to original behavior
                $('#todayDeposits').text(formatCurrency(data.todayDeposits));
                $('#todayWithdrawals').text(formatCurrency(data.todayWithdrawals));
                $('#todayCount').text(data.todayTransactionCount);
            }
        },
        error: function () {
            if (window.toast) {
                window.toast("Could not load today's stats. Please refresh.", 'danger');
            }
        }
    });

});