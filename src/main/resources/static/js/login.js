$(document).ready(function () {
    
    // 1. Check if user is already logged in
    $.ajax({
        url: '/api/auth/me',
        type: 'GET',
        success: function (data) {
            redirectBasedOnRole(data.roles);
        },
        error: function () {
            // Not logged in, stay on login page
        }
    });

    // 2. Handle Form Submit
    $('#loginForm').on('submit', function (e) {
        e.preventDefault();

        const username = $('#username').val();
        const password = $('#password').val();
        const $btn = $('#loginBtn');
        const $spinner = $('#loginSpinner');
        const $text = $('#loginText');
        const $error = $('#loginError');

        // Reset UI
        $error.addClass('d-none').text('');
        $btn.prop('disabled', true);
        $spinner.removeClass('d-none');
        $text.text('Authenticating...');

        // 3. Send Login Request
        $.ajax({
            url: '/api/auth/login',
            type: 'POST',
            contentType: 'application/json',
            data: JSON.stringify({ username: username, password: password }),
            success: function (response) {
                redirectBasedOnRole(response.roles);
            },
            error: function (xhr) {
                $btn.prop('disabled', false);
                $spinner.addClass('d-none');
                $text.text('Sign In');
                
                let errorMsg = "Invalid username or password.";
                if (xhr.responseJSON && xhr.responseJSON.message) {
                    errorMsg = xhr.responseJSON.message;
                }
                $error.removeClass('d-none').text(errorMsg);
            }
        });
    });

    // 4. Redirect based on user role
    function redirectBasedOnRole(roles) {
        if (roles.includes('ADMIN')) {
            window.location.href = '/pages/admin/dashboard.html';
        } else if (roles.includes('CASHIER')) {
            window.location.href = '/pages/cashier/dashboard.html';
        } else if (roles.includes('CUSTOMER')) {
            window.location.href = '/pages/customer/dashboard.html';
        }
    }
});