/* ==========================================================================
   FTM — Financial Transaction Management
   app.js  ·  Global front-end runtime
   ========================================================================== */

(function () {
    'use strict';

    const FTM = (window.FTM = window.FTM || {});

    function qs(sel, root) { return (root || document).querySelector(sel); }
    function qsa(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }

    /* ======================================================================
     * 02. CSRF + fetch wrapper
     * ==================================================================== */
    function readCookie(name) {
        if (!document.cookie) return null;
        const cookies = document.cookie.split(';');
        const prefix = name + '=';
        for (let i = 0; i < cookies.length; i++) {
            const cookie = cookies[i].trim();
            if (cookie.substring(0, prefix.length) === prefix) {
                return decodeURIComponent(cookie.substring(prefix.length));
            }
        }
        return null;
    }
    FTM.readCookie = readCookie;

    (function setupCsrfAjax() {
        if (typeof window.jQuery === 'undefined') return;
        window.jQuery.ajaxSetup({
            beforeSend: function (xhr, settings) {
                if (!(/^(GET|HEAD|OPTIONS|TRACE)$/.test(settings.type)) && !this.crossDomain) {
                    const cookieValue = readCookie('XSRF-TOKEN');
                    if (cookieValue) {
                        xhr.setRequestHeader('X-XSRF-TOKEN', cookieValue);
                    }
                }
            }
        });
    })();

    FTM.fetch = function (url, options) {
        const opts = Object.assign({ credentials: 'same-origin' }, options || {});
        const method = (opts.method || 'GET').toUpperCase();
        const headers = new Headers(opts.headers || {});

        if (!/^(GET|HEAD|OPTIONS|TRACE)$/.test(method)) {
            const token = readCookie('XSRF-TOKEN');
            if (token) headers.set('X-XSRF-TOKEN', token);
        }
        if (opts.body
            && typeof opts.body === 'string'
            && !headers.has('Content-Type')
            && !(opts.body instanceof FormData)) {
            headers.set('Content-Type', 'application/json');
        }

        return fetch(url, Object.assign({}, opts, { method: method, headers: headers }))
            .then(function (res) {
                if (res.status === 401) handleUnauthorized();
                return res;
            });
    };

    /* ======================================================================
     * 03. Formatters
     * ==================================================================== */
    function formatCurrency(amount) {
        return new Intl.NumberFormat('en-LK', { style: 'currency', currency: 'LKR' }).format(amount);
    }
    window.formatCurrency = formatCurrency;

    FTM.fmtMoney = function (amount) {
        if (amount === null || amount === undefined || isNaN(amount)) {
            return formatCurrency(0);
        }
        return formatCurrency(Number(amount));
    };

    FTM.fmtNumber = function (n, digits) {
        const max = (typeof digits === 'number') ? digits : 2;
        return new Intl.NumberFormat('en-LK', { maximumFractionDigits: max })
            .format(n === null || n === undefined || isNaN(n) ? 0 : Number(n));
    };

    FTM.fmtInt = function (n) {
        return FTM.fmtNumber(Math.round(n === null || n === undefined || isNaN(n) ? 0 : Number(n)), 0);
    };

    FTM.toIsoDate = function (value) {
        const d = value instanceof Date ? value : new Date(value || Date.now());
        if (isNaN(d.getTime())) return '';
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        return yyyy + '-' + mm + '-' + dd;
    };

    FTM.fmtDate = function (value) {
        if (!value) return '—';
        const dt = value instanceof Date ? value : new Date(value);
        if (isNaN(dt.getTime())) return '—';
        return new Intl.DateTimeFormat('en-LK', {
            year: 'numeric', month: 'short', day: '2-digit'
        }).format(dt);
    };

    FTM.fmtDateTime = function (value) {
        if (!value) return '—';
        const dt = value instanceof Date ? value : new Date(value);
        if (isNaN(dt.getTime())) return '—';
        return new Intl.DateTimeFormat('en-LK', {
            year: 'numeric', month: 'short', day: '2-digit',
            hour: '2-digit', minute: '2-digit'
        }).format(dt);
    };

    /* ======================================================================
     * 04. Toast notifications
     * ==================================================================== */
    const TOAST_ICONS = {
        success: 'bi-check-circle-fill',
        danger:  'bi-x-circle-fill',
        warning: 'bi-exclamation-triangle-fill',
        info:    'bi-info-circle-fill'
    };
    const TOAST_DEFAULT_MS = 4500;

    function ensureToastContainer() {
        let c = document.getElementById('toastContainer');
        if (c) return c;
        c = document.createElement('div');
        c.id = 'toastContainer';
        c.className = 'toast-container';
        c.setAttribute('aria-live', 'polite');
        c.setAttribute('aria-atomic', 'false');
        document.body.appendChild(c);
        return c;
    }

    FTM.toast = function (message, type, opts) {
        type = TOAST_ICONS[type] ? type : 'info';
        opts = opts || {};
        const duration = (typeof opts.duration === 'number') ? opts.duration : TOAST_DEFAULT_MS;

        const container = ensureToastContainer();
        const el = document.createElement('div');
        el.className = 'toast toast-' + type;
        el.setAttribute('role', type === 'danger' ? 'alert' : 'status');
        el.innerHTML =
            '<div class="toast-body">' +
                '<span class="toast-icon"><i class="bi ' + TOAST_ICONS[type] + '"></i></span>' +
                '<span class="toast-msg"></span>' +
                '<button type="button" class="toast-close" aria-label="Dismiss">' +
                    '<i class="bi bi-x-lg"></i>' +
                '</button>' +
            '</div>';
        el.querySelector('.toast-msg').textContent = message == null ? '' : String(message);
        container.appendChild(el);

        let dismissed = false;
        function dismiss() {
            if (dismissed) return;
            dismissed = true;
            el.classList.add('hide');
            setTimeout(function () {
                if (el.parentNode) el.parentNode.removeChild(el);
            }, 260);
        }

        el.querySelector('.toast-close').addEventListener('click', dismiss);
        if (duration > 0) setTimeout(dismiss, duration);

        return el;
    };

    FTM.toastSuccess = function (m, o) { return FTM.toast(m, 'success', o); };
    FTM.toastError   = function (m, o) { return FTM.toast(m, 'danger',  o); };
    FTM.toastWarning = function (m, o) { return FTM.toast(m, 'warning', o); };
    FTM.toastInfo    = function (m, o) { return FTM.toast(m, 'info',    o); };

    window.toast = FTM.toast;

    /* ======================================================================
     * 05. Loading buttons
     * ==================================================================== */
    FTM.setLoading = function (btnOrSelector, loading) {
        const btn = typeof btnOrSelector === 'string' ? qs(btnOrSelector) : btnOrSelector;
        if (!btn) return;
        if (loading) {
            btn.classList.add('is-loading');
            btn.setAttribute('aria-busy', 'true');
            btn.disabled = true;
        } else {
            btn.classList.remove('is-loading');
            btn.removeAttribute('aria-busy');
            btn.disabled = false;
        }
    };

    /* ======================================================================
     * 06. Theme (light / dark)
     * ==================================================================== */
    const THEME_KEY = 'ftm-theme';

    function currentTheme() {
        return document.documentElement.getAttribute('data-bs-theme') === 'dark' ? 'dark' : 'light';
    }

    function applyTheme(theme, persist) {
        document.documentElement.setAttribute('data-bs-theme', theme);
        if (persist !== false) {
            try { localStorage.setItem(THEME_KEY, theme); } catch (e) { /* ignore */ }
        }
        document.dispatchEvent(new CustomEvent('ftm:themechange', { detail: { theme: theme } }));
    }

    FTM.getTheme = currentTheme;
    FTM.setTheme = applyTheme;
    FTM.toggleTheme = function () {
        applyTheme(currentTheme() === 'dark' ? 'light' : 'dark');
    };

    function initTheme() {
        if (!document.documentElement.getAttribute('data-bs-theme')) {
            let stored = null;
            try { stored = localStorage.getItem(THEME_KEY); } catch (e) { /* ignore */ }
            const prefersDark = window.matchMedia
                && window.matchMedia('(prefers-color-scheme: dark)').matches;
            applyTheme(stored || (prefersDark ? 'dark' : 'light'), false);
        }

        qsa('.theme-toggle').forEach(function (btn) {
            btn.addEventListener('click', FTM.toggleTheme);
        });

        if (window.matchMedia) {
            const mq = window.matchMedia('(prefers-color-scheme: dark)');
            const listener = function (e) {
                let stored = null;
                try { stored = localStorage.getItem(THEME_KEY); } catch (err) { /* ignore */ }
                if (!stored) applyTheme(e.matches ? 'dark' : 'light', false);
            };
            if (mq.addEventListener) mq.addEventListener('change', listener);
            else if (mq.addListener) mq.addListener(listener);
        }
    }

    /* ======================================================================
     * 07. Sidebar — collapsible desktop + mobile off-canvas drawer
     * ==================================================================== */
    const SIDEBAR_KEY = 'ftm-sidebar-collapsed';
    const DESKTOP_MQ  = '(min-width: 992px)';

    function isDesktop() {
        return window.matchMedia(DESKTOP_MQ).matches;
    }

    function initSidebar() {
        const shell = qs('.app-shell');
        const sidebar = qs('.sidebar');
        if (!shell || !sidebar) return;

        const toggle = qs('.sidebar-toggle');

        if (isDesktop()) {
            try {
                if (localStorage.getItem(SIDEBAR_KEY) === '1') {
                    shell.classList.add('sidebar-collapsed');
                }
            } catch (e) { /* ignore */ }
        }

        let backdrop = qs('.sidebar-backdrop');
        if (!backdrop) {
            backdrop = document.createElement('div');
            backdrop.className = 'sidebar-backdrop';
            document.body.appendChild(backdrop);
        }

        function openDrawer() {
            sidebar.classList.add('show');
            backdrop.classList.add('show');
            document.body.style.overflow = 'hidden';
        }
        function closeDrawer() {
            sidebar.classList.remove('show');
            backdrop.classList.remove('show');
            document.body.style.overflow = '';
        }

        if (toggle) {
            toggle.addEventListener('click', function () {
                if (isDesktop()) {
                    shell.classList.toggle('sidebar-collapsed');
                    try {
                        localStorage.setItem(
                            SIDEBAR_KEY,
                            shell.classList.contains('sidebar-collapsed') ? '1' : '0'
                        );
                    } catch (e) { /* ignore */ }
                } else {
                    if (sidebar.classList.contains('show')) closeDrawer();
                    else openDrawer();
                }
            });
        }

        backdrop.addEventListener('click', closeDrawer);

        qsa('.nav-item', sidebar).forEach(function (link) {
            link.addEventListener('click', function () {
                if (!isDesktop()) closeDrawer();
            });
        });

        document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape') closeDrawer();
        });

        if (window.matchMedia) {
            const mq = window.matchMedia(DESKTOP_MQ);
            const onChange = function () {
                closeDrawer();
            };
            if (mq.addEventListener) mq.addEventListener('change', onChange);
            else if (mq.addListener) mq.addListener(onChange);
        }
    }

    /* ======================================================================
     * 08. Page-enter animation
     * ==================================================================== */
    function initPageEnter() {
        const main = qs('.main-content') || qs('.content-inner');
        if (!main) return;
        if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
        main.classList.add('page-enter');
    }

    /* ======================================================================
     * 09. Count-up animation
     * ==================================================================== */
    FTM.countUp = function (el, target, options) {
        if (!el) return;
        options = options || {};
        if (el._ftmCountUpRaf) {
            cancelAnimationFrame(el._ftmCountUpRaf);
            el._ftmCountUpRaf = null;
        }
        const rawText = String(el.textContent || '').replace(/\u2212/g, '-').replace(/[^\d.-]/g, '');
        const from = parseFloat(rawText) || 0;
        const to   = Number(target) || 0;
        const duration = typeof options.duration === 'number' ? options.duration : 900;
        const formatter = options.formatter || FTM.fmtInt;
        const finalFormatted = formatter(to);

        if (el.hasAttribute('data-full') || el.classList.contains('masked')) {
            el.setAttribute('data-full', finalFormatted);
        }

        const reduce = window.matchMedia
            && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        if (reduce || duration <= 0) {
            if (!el.classList.contains('masked')) {
                el.textContent = finalFormatted;
            }
            return;
        }

        const start = performance.now();
        function tick(now) {
            const t = Math.min(1, (now - start) / duration);
            const eased = 1 - Math.pow(1 - t, 3);
            const currentVal = t < 1 ? (from + (to - from) * eased) : to;
            if (!el.classList.contains('masked')) {
                el.textContent = formatter(currentVal);
            }
            if (t < 1) {
                el._ftmCountUpRaf = requestAnimationFrame(tick);
            } else {
                el._ftmCountUpRaf = null;
            }
        }
        el._ftmCountUpRaf = requestAnimationFrame(tick);
    };

    function initCountUps() {
        qsa('[data-countup]').forEach(function (el) {
            const target = parseFloat(el.getAttribute('data-countup'));
            if (isNaN(target)) return;
            const formatter = el.getAttribute('data-countup-currency') === '1'
                ? FTM.fmtMoney
                : null;
            FTM.countUp(el, target, formatter ? { formatter: formatter } : undefined);
        });
    }

    /* ======================================================================
     * 10. Password toggle + strength meter
     * ==================================================================== */
    function initPasswordToggles() {
        qsa('.password-toggle').forEach(function (btn) {
            const scope = btn.closest('.password-field')
                || btn.closest('.input-group')
                || btn.parentElement;
            const target = (btn.dataset.target && qs(btn.dataset.target))
                || (scope && scope.querySelector('input'));
            if (!target) return;

            btn.addEventListener('click', function () {
                const isPwd = target.type === 'password';
                target.type = isPwd ? 'text' : 'password';
                btn.setAttribute('aria-label', isPwd ? 'Hide password' : 'Show password');
                const icon = btn.querySelector('i');
                if (icon) {
                    icon.classList.toggle('bi-eye', !isPwd);
                    icon.classList.toggle('bi-eye-slash', isPwd);
                }
            });
        });
    }

    function scorePassword(pwd) {
        if (!pwd) return 0;
        let s = 0;
        if (pwd.length >= 8) s++;
        if (/[A-Z]/.test(pwd) && /[a-z]/.test(pwd)) s++;
        if (/\d/.test(pwd)) s++;
        if (/[^A-Za-z0-9]/.test(pwd)) s++;
        if (pwd.length >= 12) s = Math.min(4, s + 1);
        return Math.min(4, s);
    }

    function initStrengthMeters() {
        const LABELS = ['Too weak', 'Weak', 'Fair', 'Good', 'Strong'];
        qsa('[data-strength-meter]').forEach(function (input) {
            const meter = qs(input.getAttribute('data-strength-meter'));
            if (!meter) return;
            const label = meter.parentElement
                && meter.parentElement.querySelector('.strength-label');
            function update() {
                const s = scorePassword(input.value);
                meter.setAttribute('data-score', String(s));
                if (label) label.textContent = input.value ? LABELS[s] : '';
            }
            input.addEventListener('input', update);
            update();
        });
    }

    /* ======================================================================
     * 11. Sortable tables + table search
     * ==================================================================== */
    function parseSortableNumber(str) {
        if (!str) return NaN;
        const cleaned = String(str)
            .replace(/\u2212/g, '-')
            .replace(/\b(LKR|Rs\.?|USD)\b/gi, '')
            .replace(/[\s,+]/g, '')
            .trim();
        if (/^-?\d+(\.\d+)?$/.test(cleaned)) {
            return parseFloat(cleaned);
        }
        return NaN;
    }

    FTM.initSortable = function (table) {
        if (!table || !table.tBodies || !table.tBodies[0]) return;
        const tbody = table.tBodies[0];
        const headers = qsa('th.sortable', table);
        if (!headers.length) return;

        headers.forEach(function (th) {
            th.addEventListener('click', function () {
                const colIdx = typeof th.cellIndex === 'number' ? th.cellIndex : 0;
                const direction = th.classList.contains('sort-asc') ? 'desc' : 'asc';
                headers.forEach(function (h) { h.classList.remove('sort-asc', 'sort-desc'); });
                th.classList.add('sort-' + direction);

                const allRows = Array.prototype.slice.call(tbody.rows);
                const dataRows = [];
                const specialRows = [];

                allRows.forEach(function (r) {
                    if (r.cells.length <= 1 || (r.cells[0] && r.cells[0].colSpan > 1)) {
                        specialRows.push(r);
                    } else {
                        dataRows.push(r);
                    }
                });

                dataRows.sort(function (a, b) {
                    const av = (a.cells[colIdx] && a.cells[colIdx].innerText || '').trim();
                    const bv = (b.cells[colIdx] && b.cells[colIdx].innerText || '').trim();
                    const an = parseSortableNumber(av);
                    const bn = parseSortableNumber(bv);
                    let cmp;
                    if (!isNaN(an) && !isNaN(bn)) {
                        cmp = an - bn;
                    } else {
                        const ad = Date.parse(av);
                        const bd = Date.parse(bv);
                        if (!isNaN(ad) && !isNaN(bd) && /[a-zA-Z]|\d{4}[-/]\d{2}/.test(av)) {
                            cmp = ad - bd;
                        } else {
                            cmp = av.localeCompare(bv, undefined, { numeric: true, sensitivity: 'base' });
                        }
                    }
                    return direction === 'asc' ? cmp : -cmp;
                });

                dataRows.forEach(function (r) { tbody.appendChild(r); });
                specialRows.forEach(function (r) { tbody.appendChild(r); });
            });
        });
    };

    FTM.initTableSearch = function (input, table) {
        if (!input || !table || !table.tBodies || !table.tBodies[0]) return;
        if (input._ftmSearchBound) return;
        input._ftmSearchBound = true;

        const tbody = table.tBodies[0];
        const colCount = (table.tHead && table.tHead.rows[0] && table.tHead.rows[0].cells.length) || 6;

        function applyFilter() {
            const q = input.value.trim().toLowerCase();
            let dataRowCount = 0;
            let visibleCount = 0;

            Array.prototype.forEach.call(tbody.rows, function (row) {
                if (row.classList.contains('ftm-no-match-row')) return;
                if (row.cells.length <= 1 || (row.cells[0] && row.cells[0].colSpan > 1)) {
                    row.style.display = '';
                    return;
                }
                dataRowCount++;
                const text = (row.innerText || '').toLowerCase();
                const match = !q || text.indexOf(q) !== -1;
                row.style.display = match ? '' : 'none';
                if (match) visibleCount++;
            });

            let noMatchEl = tbody.querySelector('tr.ftm-no-match-row');
            if (dataRowCount > 0 && visibleCount === 0 && q) {
                if (!noMatchEl) {
                    noMatchEl = document.createElement('tr');
                    noMatchEl.className = 'ftm-no-match-row';
                    noMatchEl.innerHTML =
                        '<td colspan="' + colCount + '" class="py-4 text-center text-muted">' +
                            '<i class="bi bi-search me-2"></i>No matching records found' +
                        '</td>';
                    tbody.appendChild(noMatchEl);
                }
                noMatchEl.style.display = '';
            } else if (noMatchEl) {
                noMatchEl.style.display = 'none';
            }
        }

        input.addEventListener('input', applyFilter);
        input._ftmApplyFilter = applyFilter;
    };

    function initTables() {
        qsa('table').forEach(function (table) {
            if (table.querySelector('th.sortable')) FTM.initSortable(table);
        });

        qsa('.table-toolbar .search-wrap input, [data-table-search]').forEach(function (input) {
            if (input.id === 'tableSearchInput' && document.getElementById('logsTableBody')) {
                return; // Handled directly by audit-logs.js
            }
            if (input.getAttribute('data-custom-search') === 'true') {
                return;
            }
            const scope = input.closest('.table-card') || input.closest('[data-table-scope]') || document;
            const table = scope.querySelector('table');
            if (table) FTM.initTableSearch(input, table);
        });
    }

    /* ======================================================================
     * 12. Chart.js theme bridge (UPDATED WITH SAFE FALLBACKS)
     * ==================================================================== */
    FTM.chartColors = function () {
        const cs = getComputedStyle(document.documentElement);
        
        // Bulletproof fallback helper
        const get = function (name, fallback) { 
            const val = cs.getPropertyValue(name).trim(); 
            return val || fallback;
        };
        
        const isDark = document.documentElement.getAttribute('data-bs-theme') === 'dark';

        return {
            primary: get('--chart-1', isDark ? '#818cf8' : '#4f46e5'),
            accent:  get('--chart-2', isDark ? '#a78bfa' : '#7c3aed'),
            info:    get('--chart-3', isDark ? '#60a5fa' : '#3b82f6'),
            success: get('--chart-4', isDark ? '#34d399' : '#10b981'),
            warning: get('--chart-5', isDark ? '#fbbf24' : '#f59e0b'),
            danger:  get('--chart-6', isDark ? '#f87171' : '#ef4444'),
            grid:    get('--chart-grid', isDark ? 'rgba(255,255,255,.08)' : 'rgba(15,23,42,.08)'),
            text:    get('--chart-text', isDark ? '#94a3b8' : '#64748b'),
            fillTop:    get('--chart-fill-top', isDark ? 'rgba(129,140,248,.35)' : 'rgba(79,70,229,.28)'),
            fillBottom: get('--chart-fill-bottom', isDark ? 'rgba(129,140,248,0)' : 'rgba(79,70,229,0)'),
            palette: [
                get('--chart-1', isDark ? '#818cf8' : '#4f46e5'), 
                get('--chart-2', isDark ? '#a78bfa' : '#7c3aed'), 
                get('--chart-3', isDark ? '#60a5fa' : '#3b82f6'),
                get('--chart-4', isDark ? '#34d399' : '#10b981'), 
                get('--chart-5', isDark ? '#fbbf24' : '#f59e0b'), 
                get('--chart-6', isDark ? '#f87171' : '#ef4444')
            ]
        };
    };

    function syncChartDefaults() {
        if (!window.Chart) return;
        const c = FTM.chartColors();
        Chart.defaults.color = c.text;
        Chart.defaults.borderColor = c.grid;
        Chart.defaults.font.family = "'Inter', 'Plus Jakarta Sans', sans-serif";
        Chart.defaults.font.size = 12;
    }

    document.addEventListener('ftm:themechange', syncChartDefaults);

    /* ======================================================================
     * 13. Global auth handling
     * ==================================================================== */
    function isAuthPage() {
        const p = window.location.pathname.toLowerCase();
        return (
            p === '/' ||
            p.endsWith('/index.html') ||
            p.endsWith('/login') ||
            p.endsWith('/login.html') ||
            p.endsWith('/register') ||
            p.endsWith('/register.html')
        );
    }

    function handleUnauthorized() {
        if (isAuthPage()) return;
        try { sessionStorage.setItem('ftm:authExpired', '1'); } catch (e) { /* ignore */ }
        window.location.replace('/index.html?expired=1');
    }

    FTM.handleUnauthorized = handleUnauthorized;

    FTM.handleForbidden = function (message) {
        FTM.toast(message || 'You do not have permission to perform this action.', 'warning');
    };

    if (window.jQuery) {
        window.jQuery(document).ajaxError(function (_event, xhr) {
            if (xhr && xhr.status === 401) handleUnauthorized();
        });
    }

    function initAuthExpiredToast() {
        if (!isAuthPage()) return;
        try {
            if (sessionStorage.getItem('ftm:authExpired') === '1') {
                sessionStorage.removeItem('ftm:authExpired');
                setTimeout(function () {
                    FTM.toast('Your session has expired. Please sign in again.', 'warning');
                }, 300);
            }
        } catch (e) { /* ignore */ }
    }

    /* ======================================================================
     * 13b. Global User Profile & Password Modal
     * ==================================================================== */
    function ensureProfileModal() {
        let modalEl = document.getElementById('ftmProfileModal');
        if (modalEl) return modalEl;

        const wrapper = document.createElement('div');
        wrapper.innerHTML =
            '<div class="modal fade" id="ftmProfileModal" tabindex="-1" aria-labelledby="ftmProfileModalLabel" aria-hidden="true">' +
                '<div class="modal-dialog modal-dialog-centered">' +
                    '<div class="modal-content">' +
                        '<div class="modal-header">' +
                            '<h5 class="modal-title" id="ftmProfileModalLabel"><i class="bi bi-person-circle me-2"></i>Account Profile</h5>' +
                            '<button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>' +
                        '</div>' +
                        '<div class="modal-body">' +
                            '<ul class="nav nav-pills nav-fill segmented mb-3" role="tablist">' +
                                '<li class="nav-item" role="presentation">' +
                                    '<button class="nav-link active" id="ftm-prof-details-tab" data-bs-toggle="pill" data-bs-target="#ftm-prof-details" type="button" role="tab">Profile Details</button>' +
                                '</li>' +
                                '<li class="nav-item" role="presentation">' +
                                    '<button class="nav-link" id="ftm-prof-pwd-tab" data-bs-toggle="pill" data-bs-target="#ftm-prof-pwd" type="button" role="tab">Change Password</button>' +
                                '</li>' +
                            '</ul>' +
                            '<div class="tab-content">' +
                                '<div class="tab-pane fade show active" id="ftm-prof-details" role="tabpanel">' +
                                    '<form id="ftmProfileForm" novalidate>' +
                                        '<div class="mb-3">' +
                                            '<label class="form-label" for="ftmProfUsername">Username</label>' +
                                            '<input type="text" class="form-control" id="ftmProfUsername" disabled>' +
                                        '</div>' +
                                        '<div class="mb-3">' +
                                            '<label class="form-label" for="ftmProfRole">Role</label>' +
                                            '<input type="text" class="form-control" id="ftmProfRole" disabled>' +
                                        '</div>' +
                                        '<div class="mb-3">' +
                                            '<label class="form-label" for="ftmProfFullName">Full Name</label>' +
                                            '<input type="text" class="form-control" id="ftmProfFullName" required>' +
                                        '</div>' +
                                        '<div class="mb-3">' +
                                            '<label class="form-label" for="ftmProfEmail">Email Address</label>' +
                                            '<input type="email" class="form-control" id="ftmProfEmail" required>' +
                                        '</div>' +
                                        '<div class="d-flex justify-content-end gap-2">' +
                                            '<button type="button" class="btn btn-ghost" data-bs-dismiss="modal">Close</button>' +
                                            '<button type="submit" class="btn btn-primary" id="ftmSaveProfileBtn">Save Changes</button>' +
                                        '</div>' +
                                    '</form>' +
                                '</div>' +
                                '<div class="tab-pane fade" id="ftm-prof-pwd" role="tabpanel">' +
                                    '<form id="ftmPasswordForm" novalidate>' +
                                        '<div class="mb-3">' +
                                            '<label class="form-label" for="ftmOldPassword">Current Password</label>' +
                                            '<input type="password" class="form-control" id="ftmOldPassword" required autocomplete="current-password">' +
                                        '</div>' +
                                        '<div class="mb-3">' +
                                            '<label class="form-label" for="ftmNewPassword">New Password</label>' +
                                            '<input type="password" class="form-control" id="ftmNewPassword" required minlength="6" autocomplete="new-password">' +
                                            '<div class="form-hint">Minimum 6 characters.</div>' +
                                        '</div>' +
                                        '<div class="mb-3">' +
                                            '<label class="form-label" for="ftmConfirmPassword">Confirm New Password</label>' +
                                            '<input type="password" class="form-control" id="ftmConfirmPassword" required minlength="6" autocomplete="new-password">' +
                                        '</div>' +
                                        '<div class="d-flex justify-content-end gap-2">' +
                                            '<button type="button" class="btn btn-ghost" data-bs-dismiss="modal">Close</button>' +
                                            '<button type="submit" class="btn btn-primary" id="ftmSavePasswordBtn">Update Password</button>' +
                                        '</div>' +
                                    '</form>' +
                                '</div>' +
                            '</div>' +
                        '</div>' +
                    '</div>' +
                '</div>' +
            '</div>';

        modalEl = wrapper.firstElementChild;
        document.body.appendChild(modalEl);

        const profileForm = modalEl.querySelector('#ftmProfileForm');
        profileForm.addEventListener('submit', function (e) {
            e.preventDefault();
            const fullName = modalEl.querySelector('#ftmProfFullName').value.trim();
            const email = modalEl.querySelector('#ftmProfEmail').value.trim();
            if (!fullName) {
                FTM.toastWarning('Full name is required.');
                return;
            }
            if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
                FTM.toastWarning('Please enter a valid email address.');
                return;
            }
            const btn = modalEl.querySelector('#ftmSaveProfileBtn');
            FTM.setLoading(btn, true);
            FTM.fetch('/api/auth/profile', {
                method: 'PUT',
                body: JSON.stringify({ fullName: fullName, email: email })
            })
                .then(function (res) {
                    return res.json().catch(function () { return {}; }).then(function (body) {
                        if (!res.ok) throw new Error(body.message || 'Could not update profile.');
                        return body;
                    });
                })
                .then(function () {
                    FTM.toastSuccess('Profile updated successfully.');
                    ['#adminName', '#cashierName', '#customerName'].forEach(function (sel) {
                        const el = qs(sel);
                        if (el) el.textContent = fullName;
                    });
                    const initialEl = qs('#userInitial');
                    if (initialEl && fullName) {
                        initialEl.textContent = fullName.charAt(0).toUpperCase();
                    }
                })
                .catch(function (err) {
                    FTM.toastError(err.message || 'Could not update profile.');
                })
                .finally(function () {
                    FTM.setLoading(btn, false);
                });
        });

        const pwdForm = modalEl.querySelector('#ftmPasswordForm');
        pwdForm.addEventListener('submit', function (e) {
            e.preventDefault();
            const oldPassword = modalEl.querySelector('#ftmOldPassword').value;
            const newPassword = modalEl.querySelector('#ftmNewPassword').value;
            const confirmPassword = modalEl.querySelector('#ftmConfirmPassword').value;

            if (!oldPassword) {
                FTM.toastWarning('Please enter your current password.');
                return;
            }
            if (!newPassword || newPassword.length < 6) {
                FTM.toastWarning('New password must be at least 6 characters.');
                return;
            }
            if (newPassword !== confirmPassword) {
                FTM.toastWarning('New passwords do not match.');
                return;
            }

            const btn = modalEl.querySelector('#ftmSavePasswordBtn');
            FTM.setLoading(btn, true);
            FTM.fetch('/api/auth/change-password', {
                method: 'PUT',
                body: JSON.stringify({ oldPassword: oldPassword, newPassword: newPassword })
            })
                .then(function (res) {
                    return res.json().catch(function () { return {}; }).then(function (body) {
                        if (!res.ok) throw new Error(body.message || 'Could not change password.');
                        return body;
                    });
                })
                .then(function () {
                    FTM.toastSuccess('Password updated successfully.');
                    pwdForm.reset();
                })
                .catch(function (err) {
                    FTM.toastError(err.message || 'Could not change password.');
                })
                .finally(function () {
                    FTM.setLoading(btn, false);
                });
        });

        return modalEl;
    }

    FTM.openProfileModal = function () {
        const modalEl = ensureProfileModal();
        FTM.fetch('/api/auth/me')
            .then(function (res) {
                if (!res.ok) throw new Error('Failed to load profile.');
                return res.json();
            })
            .then(function (user) {
                modalEl.querySelector('#ftmProfUsername').value = user.username || '';
                modalEl.querySelector('#ftmProfRole').value = Array.isArray(user.roles) ? user.roles.join(', ') : '';
                modalEl.querySelector('#ftmProfFullName').value = user.fullName || '';
                modalEl.querySelector('#ftmProfEmail').value = user.email || '';
                modalEl.querySelector('#ftmPasswordForm').reset();
                if (window.bootstrap && window.bootstrap.Modal) {
                    window.bootstrap.Modal.getOrCreateInstance(modalEl).show();
                }
            })
            .catch(function (err) {
                FTM.toastError(err.message || 'Unable to load profile details.');
            });
    };

    function initProfileLinks() {
        if (isAuthPage()) return;
        qsa('.dropdown-menu .dropdown-item').forEach(function (link) {
            if (link.classList.contains('js-logout')) return;
            if (link.querySelector('.bi-person') || /profile/i.test(link.textContent || '')) {
                link.addEventListener('click', function (e) {
                    e.preventDefault();
                    FTM.openProfileModal();
                });
            }
        });
    }

    /* ======================================================================
     * 14. DOM ready wiring
     * ==================================================================== */
    function init() {
        initTheme();            
        initSidebar();          
        initPageEnter();
        initCountUps();
        initPasswordToggles();
        initStrengthMeters();
        initTables();
        syncChartDefaults();    
        initAuthExpiredToast();
        initProfileLinks();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();