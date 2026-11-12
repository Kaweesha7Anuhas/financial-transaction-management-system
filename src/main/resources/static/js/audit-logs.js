/* ==========================================================================
   audit-logs.js — FTM System
   --------------------------------------------------------------------------
   Preserved (unchanged):
     · Globals `currentPage` and `totalPages`
     · Global functions: changePage(direction), loadLogs(),
                         renderTable(logs), updatePaginationUI()
     · Endpoint: GET /api/audit-logs?page={p}&size=15
     · Element IDs: #auditTableBody, #pageInfo, #prevBtn, #nextBtn,
                    #adminName, #logoutBtn
     · Column order: Timestamp · User · Action · Entity · Description
     · Action-badge mapping (LOGIN/DEPOSIT/WITHDRAWAL/REVERSAL/
                             CREATED/REGISTERED → specific colors; else neutral)
     · Entity fallback: `entityType || '-'` plus `#entityId` when present
   Added:
     · Client-side filter chips (data-filter) — filter the CURRENT page only,
       they do not modify the endpoint or trigger a re-fetch
     · Toolbar search (auto-wired via app.js .search-wrap)
     · Skeleton loader, empty & error states, request de-dup guard
     · XSS-safe rendering via esc()
     · .audit-action pill classes for color-coded actions
     · ADMIN role guard
   ========================================================================== */

let currentPage = 0;
let totalPages  = 0;

/* Cache of the current page's rows + active filter (client-side only). */
let allLogs        = [];
let activeFilter   = '';
let requestSeq     = 0;

$(document).ready(function () {

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

    /* ---- Logout (sidebar + topbar) ---- */
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

    /* ---- Client-side filter chips ---- */
    $('.audit-chip').on('click', function () {
        $('.audit-chip').removeClass('active');
        $(this).addClass('active');
        activeFilter = String($(this).data('filter') || '').toUpperCase();
        // Reset the toolbar search input so its filter doesn't compound unexpectedly
        $('#tableSearchInput').val('');
        renderFilteredLogs();
    });

    /* ---- Initial load ---- */
    loadLogs();
});

/* ======================================================================
 * Public functions (preserved names / signatures)
 * ==================================================================== */
function changePage(direction) {
    currentPage += direction;
    loadLogs();
}

function loadLogs() {
    const seq = ++requestSeq;

    showSkeleton();

    $.ajax({
        url: '/api/audit-logs?page=' + currentPage + '&size=15',
        type: 'GET',
        success: function (data) {
            if (seq !== requestSeq) return;   // stale response, drop it

            totalPages = Number(data.totalPages) || 0;
            allLogs    = Array.isArray(data.content) ? data.content : [];

            renderFilteredLogs();
            updatePaginationUI();
        },
        error: function () {
            if (seq !== requestSeq) return;

            allLogs = [];
            $('#auditTableBody').html(errorStateRow());
            $('#resultsBadge').hide();
            if (window.toast) window.toast('Could not load audit logs.', 'danger');
        }
    });
}

function renderTable(logs) {
    if (!Array.isArray(logs) || logs.length === 0) {
        // Empty state depends on whether we have a filter applied
        const filtered = activeFilter !== '' || ($('#tableSearchInput').val() || '').trim() !== '';
        $('#auditTableBody').html(filtered ? noMatchRow() : emptyStateRow());
        updateResultsBadge(0);
        return;
    }

    let html = '';
    logs.forEach(function (log) {
        const ts = (window.FTM && FTM.fmtDateTime)
            ? FTM.fmtDateTime(log.timestamp)
            : new Date(log.timestamp).toLocaleString();

        const actionPill = renderActionPill(log.action);
        const entityHtml = renderEntity(log.entityType, log.entityId);

        html +=
            '<tr>' +
                '<td class="text-muted-2"><small>' + esc(ts) + '</small></td>' +
                '<td class="fw-semibold text-strong">' + esc(log.username || '—') + '</td>' +
                '<td>' + actionPill + '</td>' +
                '<td>' + entityHtml + '</td>' +
                '<td><span class="text-muted-2" style="font-size:.82rem; display:inline-block; max-width:44ch;">' +
                    esc(log.description || '—') +
                '</span></td>' +
            '</tr>';
    });

    $('#auditTableBody').html(html);
    updateResultsBadge(logs.length);
}

function updatePaginationUI() {
    $('#pageInfo').text('Page ' + (currentPage + 1) + ' of ' + (totalPages || 1));
    $('#prevBtn').prop('disabled', currentPage === 0);
    $('#nextBtn').prop('disabled', currentPage >= totalPages - 1);
}

/* ======================================================================
 * Additive helpers
 * ==================================================================== */

/**
 * Apply the active action-filter (from chips) and the toolbar search,
 * then hand the resulting list to renderTable().
 */
function renderFilteredLogs() {
    let list = allLogs.slice();

    // Chip filter
    if (activeFilter) {
        list = list.filter(function (log) {
            return String(log.action || '').toUpperCase().indexOf(activeFilter) !== -1;
        });
    }

    // Toolbar search (simple substring across visible fields)
    const q = ($('#tableSearchInput').val() || '').trim().toLowerCase();
    if (q) {
        list = list.filter(function (log) {
            return (
                String(log.username || '').toLowerCase().indexOf(q) !== -1 ||
                String(log.action   || '').toLowerCase().indexOf(q) !== -1 ||
                String(log.description || '').toLowerCase().indexOf(q) !== -1 ||
                String(log.entityType  || '').toLowerCase().indexOf(q) !== -1 ||
                String(log.entityId    == null ? '' : log.entityId).toLowerCase().indexOf(q) !== -1
            );
        });
    }

    renderTable(list);
}

/**
 * Map a raw audit action string to one of the pre-defined `.audit-action` variants
 * in app.css. This matches the original color intent:
 *   LOGIN → info, DEPOSIT → success, WITHDRAWAL → danger,
 *   REVERSAL → warning, CREATED/REGISTERED → primary, else → neutral.
 */
function renderActionPill(rawAction) {
    const action = String(rawAction || '').toUpperCase();

    let variant = 'action-update';   // default neutral-blue; will be overridden
    if (action.indexOf('LOGIN') !== -1 && action.indexOf('LOGOUT') === -1) {
        variant = 'action-login';
    } else if (action.indexOf('LOGOUT') !== -1) {
        variant = 'action-logout';
    } else if (action.indexOf('DEPOSIT') !== -1) {
        variant = 'action-create';
    } else if (action.indexOf('WITHDRAWAL') !== -1) {
        variant = 'action-delete';
    } else if (action.indexOf('REVERSAL') !== -1) {
        variant = 'action-transfer';
    } else if (action.indexOf('CREATED') !== -1 || action.indexOf('REGISTERED') !== -1) {
        variant = 'action-create';
    } else if (action.indexOf('UPDATED') !== -1) {
        variant = 'action-update';
    } else if (action.indexOf('DELETED') !== -1) {
        variant = 'action-delete';
    } else {
        variant = '';   // fallback — plain text
    }

    if (!variant) {
        return '<span class="text-muted-2" style="font-size:.78rem;">' + esc(rawAction) + '</span>';
    }

    return '<span class="audit-action ' + variant + '">' + esc(rawAction) + '</span>';
}

function renderEntity(type, id) {
    const typeStr = (type == null || type === '') ? '-' : String(type);
    const idStr   = (id == null || id === '') ? '' : String(id);

    if (!idStr) {
        return '<small class="text-muted-2">' + esc(typeStr) + '</small>';
    }
    return '<small class="text-muted-2">' +
        esc(typeStr) + ' <span class="mono">#' + esc(idStr) + '</span>' +
    '</small>';
}

function updateResultsBadge(count) {
    const $badge = $('#resultsBadge');
    if (!count) { $badge.hide(); return; }
    $('#resultsCount').text(count);
    $badge.css('display', 'inline-flex');
}

function showSkeleton() {
    let rows = '';
    for (let i = 0; i < 6; i++) {
        rows +=
            '<tr>' +
                '<td><span class="skeleton" style="display:inline-block;width:140px;height:14px;"></span></td>' +
                '<td><span class="skeleton" style="display:inline-block;width:100px;height:14px;"></span></td>' +
                '<td><span class="skeleton" style="display:inline-block;width:90px;height:22px;border-radius:6px;"></span></td>' +
                '<td><span class="skeleton" style="display:inline-block;width:120px;height:14px;"></span></td>' +
                '<td><span class="skeleton" style="display:inline-block;width:280px;height:14px;"></span></td>' +
            '</tr>';
    }
    $('#auditTableBody').html(rows);
    $('#resultsBadge').hide();
}

function emptyStateRow() {
    return '<tr><td colspan="5" class="py-5" style="border:0;">' +
        '<div class="empty-state" style="padding:0;">' +
            '<div class="empty-icon"><i class="bi bi-shield-check"></i></div>' +
            '<h4>No audit logs yet</h4>' +
            '<p>Activity will appear here as users interact with the system.</p>' +
        '</div>' +
    '</td></tr>';
}

function noMatchRow() {
    return '<tr><td colspan="5" class="py-5" style="border:0;">' +
        '<div class="empty-state" style="padding:0;">' +
            '<div class="empty-icon"><i class="bi bi-funnel"></i></div>' +
            '<h4>No matching logs on this page</h4>' +
            '<p>Try a different filter or use pagination to see more results.</p>' +
        '</div>' +
    '</td></tr>';
}

function errorStateRow() {
    return '<tr><td colspan="5" class="py-5" style="border:0;">' +
        '<div class="error-state" style="padding:0;">' +
            '<div class="empty-icon"><i class="bi bi-exclamation-triangle"></i></div>' +
            '<h4>Could not load audit logs</h4>' +
            '<p>Please check your connection and try again.</p>' +
        '</div>' +
    '</td></tr>';
}

/* Wire the toolbar search to re-render from cache (client-side only) */
$(document).on('input', '#tableSearchInput', renderFilteredLogs);

/* ======================================================================
 * Small utilities
 * ==================================================================== */
function esc(v) {
    return String(v == null ? '' : v)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}