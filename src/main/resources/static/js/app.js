// Global AJAX Setup to handle CSRF tokens dynamically
$.ajaxSetup({
    beforeSend: function (xhr, settings) {
        // Only apply to state-changing requests
        if (!(/^(GET|HEAD|OPTIONS|TRACE)$/.test(settings.type)) && !this.crossDomain) {
            
            // Read the XSRF-TOKEN cookie dynamically
            let cookieValue = null;
            if (document.cookie && document.cookie !== '') {
                const cookies = document.cookie.split(';');
                for (let i = 0; i < cookies.length; i++) {
                    const cookie = cookies[i].trim();
                    if (cookie.substring(0, 'XSRF-TOKEN'.length + 1) === ('XSRF-TOKEN' + '=')) {
                        cookieValue = decodeURIComponent(cookie.substring('XSRF-TOKEN'.length + 1));
                        break;
                    }
                }
            }
            
            // Attach it to the header if it exists
            if (cookieValue) {
                xhr.setRequestHeader("X-XSRF-TOKEN", cookieValue);
            }
        }
    }
});

// Helper function to format currency
function formatCurrency(amount) {
    return new Intl.NumberFormat('en-LK', { style: 'currency', currency: 'LKR' }).format(amount);
}