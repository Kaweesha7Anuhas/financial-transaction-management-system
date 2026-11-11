let currentPage = 0;
let totalPages = 0;

$(document).ready(function () {
    $.get('/api/auth/me', function (user) {
        $('#adminName').text(user.fullName);
    });

    $('#logoutBtn').on('click', function () {
        $.post('/api/auth/logout', function () { window.location.href = '/index.html'; });
    });

    loadTransactions();
});

function applyFilters() {
    currentPage = 0; // Reset to first page
    loadTransactions();
}

function changePage(direction) {
    currentPage += direction;
    loadTransactions();
}

function loadTransactions() {
    // Build query string from filters
    let url = `/api/transactions?page=${currentPage}&size=15`;
    
    const acc = $('#filterAccount').val().trim();
    const type = $('#filterType').val();
    const status = $('#filterStatus').val();
    const cashier = $('#filterCashier').val().trim();
    const start = $('#filterStartDate').val();
    const end = $('#filterEndDate').val();

    if (acc) url += `&accountNumber=${acc}`;
    if (type) url += `&type=${type}`;
    if (status) url += `&status=${status}`;
    if (cashier) url += `&cashierUsername=${cashier}`;
    if (start) url += `&startDate=${start}`;
    if (end) url += `&endDate=${end}`;

    $('#historyTableBody').html('<tr><td colspan="7" class="text-center py-4 text-muted"><div class="spinner-border spinner-border-sm me-2"></div> Loading...</td></tr>');

    $.ajax({
        url: url,
        type: 'GET',
        success: function (data) {
            totalPages = data.totalPages;
            renderTable(data.content);
            updatePaginationUI();
        },
        error: function () {
            $('#historyTableBody').html('<tr><td colspan="7" class="text-center py-4 text-danger">Error loading transactions.</td></tr>');
        }
    });
}

function renderTable(transactions) {
    let html = '';
    if (transactions.length === 0) {
        html = '<tr><td colspan="7" class="text-center py-4 text-muted">No transactions found matching your filters.</td></tr>';
    } else {
        transactions.forEach(tx => {
            let typeBadge = '';
            if (tx.transactionType === 'DEPOSIT') typeBadge = '<span class="badge bg-success">Deposit</span>';
            else if (tx.transactionType === 'WITHDRAWAL') typeBadge = '<span class="badge bg-danger">Withdrawal</span>';
            else typeBadge = '<span class="badge bg-warning text-dark">Reversal</span>';

            let statusBadge = '';
            if (tx.status === 'COMPLETED') statusBadge = '<span class="badge bg-success bg-opacity-75">Completed</span>';
            else if (tx.status === 'REVERSED') statusBadge = '<span class="badge bg-secondary">Reversed</span>';
            else statusBadge = '<span class="badge bg-danger">Failed</span>';

            const date = new Date(tx.transactionDate).toLocaleString();

            html += `
                <tr>
                    <td class="ps-4"><small>${date}</small></td>
                    <td><small class="text-muted">${tx.transactionReference}</small></td>
                    <td class="fw-semibold text-primary">${tx.accountNumber}</td>
                    <td>${typeBadge}</td>
                    <td class="fw-bold">${formatCurrency(tx.amount)}</td>
                    <td>${tx.performedBy ? tx.performedBy : 'System'}</td>
                    <td>${statusBadge}</td>
                </tr>
            `;
        });
    }
    $('#historyTableBody').html(html);
}

function updatePaginationUI() {
    $('#pageInfo').text(`Page ${currentPage + 1} of ${totalPages || 1}`);
    $('#prevBtn').prop('disabled', currentPage === 0);
    $('#nextBtn').prop('disabled', currentPage >= totalPages - 1);
}