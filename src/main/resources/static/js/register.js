/* ==========================================================================
   register.js — FTM System
   --------------------------------------------------------------------------
   Preserved:
     · POST /api/auth/register  (JSON body — same keys, same order, same trim semantics)
         { firstName, lastName, email, username, phoneNumber, password }
     · Success flow: inline success alert → 2s delay → redirect to /index.html
     · Error flow:  inline #registerError alert populated with server message
     · All UI IDs: #registerForm #firstName #lastName #email #username
                    #phoneNumber #password #registerBtn #registerText
                    #registerSpinner #registerError #registerSuccess
   Added:
     · Toast notifications (window.toast)
     · Client-side required + email validation before submit
     · Double-submit guard while request is in flight
     · Password-strength live feedback (wired by js/app.js via data-strength-meter)
   ========================================================================== */

$(document).ready(function () {

    const $form    = $('#registerForm');
    const $btn     = $('#registerBtn');
    const $spinner = $('#registerSpinner');
    const $text    = $('#registerText');
    const $error   = $('#registerError');
    const $success = $('#registerSuccess');

    const REDIRECT_MS = 2000;   // preserved
    let submitting = false;      // double-submit guard

    $form.on('submit', function (e) {
        e.preventDefault();

        if (submitting) return;

        /* ------------------------------------------------------------------
         * 1. Collect + trim payload (same keys the backend expects)
         * ---------------------------------------------------------------- */
        const payload = {
            firstName:   ($('#firstName').val()   || '').trim(),
            lastName:    ($('#lastName').val()    || '').trim(),
            email:       ($('#email').val()       || '').trim(),
            username:    ($('#username').val()    || '').trim(),
            phoneNumber: ($('#phoneNumber').val() || '').trim(),
            password:    $('#password').val() || ''
        };

        /* ------------------------------------------------------------------
         * 2. Client-side validation — fail fast with a toast
         * ---------------------------------------------------------------- */
        const invalid = validate(payload);
        if (invalid) {
            $error.removeClass('d-none').text(invalid);
            if (window.toast) window.toast(invalid, 'warning');
            return;
        }

        /* ------------------------------------------------------------------
         * 3. Loading state
         * ---------------------------------------------------------------- */
        $error.addClass('d-none').text('');
        $success.addClass('d-none');
        $btn.prop('disabled', true);
        $spinner.removeClass('d-none');
        $text.text('Creating account…');
        submitting = true;

        /* ------------------------------------------------------------------
         * 4. POST /api/auth/register  (CSRF header injected by app.js)
         * ---------------------------------------------------------------- */
        $.ajax({
            url: '/api/auth/register',
            type: 'POST',
            contentType: 'application/json',
            data: JSON.stringify(payload),

            success: function () {
                // Show success + toast, then redirect after the original delay
                $success.text('Registration successful! Redirecting to sign in…').removeClass('d-none');
                $text.text('Success!');
                if (window.toast) {
                    window.toast('Account created. Redirecting to sign in…', 'success');
                }
                setTimeout(function () {
                    window.location.href = '/index.html';
                }, REDIRECT_MS);
            },

            error: function (xhr) {
                submitting = false;
                $btn.prop('disabled', false);
                $spinner.addClass('d-none');
                $text.text('Create account');

                let msg = 'Registration failed. Please try again.';
                if (xhr.status === 0) {
                    msg = 'Network error. Please check your connection and try again.';
                } else if (xhr.status === 429) {
                    msg = 'Too many attempts. Please wait a moment and try again.';
                } else if (xhr.responseJSON && xhr.responseJSON.message) {
                    msg = xhr.responseJSON.message;
                } else if (xhr.status === 409) {
                    msg = 'That username or email is already in use.';
                }

                $error.removeClass('d-none').text(msg);
                if (window.toast) window.toast(msg, 'danger');
            }
        });
    });

    /* ------------------------------------------------------------------
     * Helpers
     * ---------------------------------------------------------------- */

    function validate(p) {
        if (!p.firstName)   return 'Please enter your first name.';
        if (!p.lastName)    return 'Please enter your last name.';
        if (!p.email)       return 'Please enter your email address.';
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(p.email)) {
            return 'Please enter a valid email address.';
        }
        if (!p.username)    return 'Please choose a username.';
        if (p.username.length < 4 || p.username.length > 50) return 'Username must be between 4 and 50 characters.';
        if (!p.phoneNumber) return 'Please enter your phone number.';
        if (!p.password)    return 'Please choose a password.';
        if (p.password.length < 8) return 'Password must be at least 8 characters.';
        return null;
    }

});