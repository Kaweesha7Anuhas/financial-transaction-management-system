/* ==========================================================================
   login.js — FTM System
   --------------------------------------------------------------------------
   Preserved:
     · GET  /api/auth/me        → redirect if already signed in
     · POST /api/auth/login     → JSON body { username, password }
     · Role redirect: ADMIN / CASHIER / CUSTOMER → dashboard
     · All UI IDs: #loginForm #username #password #loginBtn
                    #loginText #loginSpinner #loginError
   Added:
     · Toast notifications (window.toast via js/app.js)
     · Friendlier error messages (network / rate-limit / unknown role)
     · Trimmed username + safe role-array guard
   ========================================================================== */

$(document).ready(function () {

    /* ------------------------------------------------------------------
     * 1. If already signed in, skip the form and go straight to dashboard
     * ---------------------------------------------------------------- */
    $.ajax({
        url: '/api/auth/me',
        type: 'GET',
        success: function (data) {
            if (data && Array.isArray(data.roles)) {
                redirectBasedOnRole(data.roles);
            }
        },
        error: function () {
            // Not signed in — stay on the login page (expected path)
        }
    });

    /* ------------------------------------------------------------------
     * 2. Submit handler
     * ---------------------------------------------------------------- */
    $('#loginForm').on('submit', function (e) {
        e.preventDefault();

        const username = ($('#username').val() || '').trim();
        const password = $('#password').val() || '';

        const $btn     = $('#loginBtn');
        const $spinner = $('#loginSpinner');
        const $text    = $('#loginText');
        const $error   = $('#loginError');

        // Reset inline error + enter loading state
        $error.addClass('d-none').text('');
        $btn.prop('disabled', true);
        $spinner.removeClass('d-none');
        $text.text('Authenticating…');

        /* --------------------------------------------------------------
         * 3. POST credentials (CSRF header injected by app.js $.ajaxSetup)
         * ------------------------------------------------------------ */
        $.ajax({
            url: '/api/auth/login',
            type: 'POST',
            contentType: 'application/json',
            data: JSON.stringify({ username: username, password: password }),

            success: function (response) {
                if (response && Array.isArray(response.roles)) {
                    redirectBasedOnRole(response.roles);
                } else {
                    // Unexpected payload — verify via /me as a fallback
                    $.ajax({
                        url: '/api/auth/me',
                        type: 'GET',
                        success: function (data) {
                            if (data && Array.isArray(data.roles)) {
                                redirectBasedOnRole(data.roles);
                            } else {
                                fail('Signed in, but your account role could not be resolved.');
                            }
                        },
                        error: function () {
                            fail('Signed in, but your account role could not be resolved.');
                        }
                    });
                }
            },

            error: function (xhr) {
                let msg = 'Invalid username or password.';

                if (xhr.status === 0) {
                    msg = 'Network error. Please check your connection and try again.';
                } else if (xhr.status === 429) {
                    msg = 'Too many attempts. Please wait a moment and try again.';
                } else if (xhr.responseJSON && xhr.responseJSON.message) {
                    msg = xhr.responseJSON.message;
                }

                fail(msg);
            }
        });

        /* ------------------------------------------------------------------
         * Reset button + surface error (inline alert AND premium toast)
         * ---------------------------------------------------------------- */
        function fail(msg) {
            $btn.prop('disabled', false);
            $spinner.addClass('d-none');
            $text.text('Sign In');
            $error.removeClass('d-none').text(msg);
            if (window.toast) window.toast(msg, 'danger');
        }
    });

    /* ------------------------------------------------------------------
     * 4. Role-based redirect (unchanged destinations)
     * ---------------------------------------------------------------- */
    function redirectBasedOnRole(roles) {
        if (!Array.isArray(roles) || roles.length === 0) {
            if (window.toast) {
                window.toast('Your account has no dashboard assigned. Please contact support.', 'warning');
            }
            return;
        }

        if (roles.includes('ADMIN')) {
            window.location.href = '/pages/admin/dashboard.html';
        } else if (roles.includes('CASHIER')) {
            window.location.href = '/pages/cashier/dashboard.html';
        } else if (roles.includes('CUSTOMER')) {
            window.location.href = '/pages/customer/dashboard.html';
        } else if (window.toast) {
            window.toast('Unrecognised account role. Please contact support.', 'warning');
        }
    }

});