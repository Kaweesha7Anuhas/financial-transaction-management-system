let currentPage = 0;
let totalPages = 0;

$(document).ready(function () {
    $.get('/api/auth/me', function (user) {
        $('#adminName').text(user.fullName);
    });

    $('#logoutBtn').on('click', function () {
        $.post('/api/auth/logout', function () { window.location.href = '/index.html'; });
    });

    loadLogs();
});

function changePage(direction) {
    currentPage += direction;
    loadLogs();
}

function loadLogs() {
    $.ajax({
        url: `/api/audit-logs?page=${currentPage}&size=15`,
        type: 'GET',
        success: function (data) {
            totalPages = data.totalPages;
            renderTable(data.content);
            updatePaginationUI();
        },
        error: function () {
            $('#auditTableBody').html('<tr><td colspan="5" class="text-center py-4 text-danger">Error loading audit logs.</td></tr>');
        }
    });
}

function renderTable(logs) {
    let html = '';
    if (logs.length === 0) {
        html = '<tr><td colspan="5" class="text-center py-4 text-muted">No audit logs found.</td></tr>';
    } else {
        logs.forEach(log => {
            const date = new Date(log.timestamp).toLocaleString();
            
            let badgeColor = 'bg-secondary';
            if (log.action.includes('LOGIN')) badgeColor = 'bg-info text-dark';
            else if (log.action.includes('DEPOSIT')) badgeColor = 'bg-success';
            else if (log.action.includes('WITHDRAWAL')) badgeColor = 'bg-danger';
            else if (log.action.includes('REVERSAL')) badgeColor = 'bg-warning text-dark';
            else if (log.action.includes('CREATED') || log.action.includes('REGISTERED')) badgeColor = 'bg-primary';

            html += `
                <tr>
                    <td class="ps-4"><small>${date}</small></td>
                    <td class="fw-semibold">${log.username}</td>
                    <td><span class="badge ${badgeColor}">${log.action}</span></td>
                    <td><small>${log.entityType || '-'} ${log.entityId ? '#' + log.entityId : ''}</small></td>
                    <td><small class="text-muted">${log.description}</small></td>
                </tr>
            `;
        });
    }
    $('#auditTableBody').html(html);
}

function updatePaginationUI() {
    $('#pageInfo').text(`Page ${currentPage + 1} of ${totalPages || 1}`);
    $('#prevBtn').prop('disabled', currentPage === 0);
    $('#nextBtn').prop('disabled', currentPage >= totalPages - 1);
}