$(document).ready(function () {
    
    $('#registerForm').on('submit', function (e) {
        e.preventDefault();

        const payload = {
            firstName: $('#firstName').val(),
            lastName: $('#lastName').val(),
            email: $('#email').val(),
            username: $('#username').val(),
            phoneNumber: $('#phoneNumber').val(),
            password: $('#password').val()
        };

        const $btn = $('#registerBtn');
        const $spinner = $('#registerSpinner');
        const $text = $('#registerText');
        const $error = $('#registerError');
        const $success = $('#registerSuccess');

        // Reset UI
        $error.addClass('d-none').text('');
        $success.addClass('d-none').text('');
        $btn.prop('disabled', true);
        $spinner.removeClass('d-none');
        $text.text('Registering...');

        $.ajax({
            url: '/api/auth/register',
            type: 'POST',
            contentType: 'application/json',
            data: JSON.stringify(payload),
            success: function (response) {
                // Show success message and redirect
                $success.removeClass('d-none');
                $text.text('Success!');
                setTimeout(() => {
                    window.location.href = '/index.html';
                }, 2000);
            },
            error: function (xhr) {
                $btn.prop('disabled', false);
                $spinner.addClass('d-none');
                $text.text('Register');
                
                let errorMsg = "Registration failed. Please try again.";
                if (xhr.responseJSON && xhr.responseJSON.message) {
                    errorMsg = xhr.responseJSON.message;
                }
                $error.removeClass('d-none').text(errorMsg);
            }
        });
    });
});