(function() {
    'use strict';

    var TOKEN_KEY = 'akmark_token';
    var USER_KEY = 'akmark_user';

    // Sample movie list for search (can be replaced with Supabase data)
    var ALL_MOVIES = [
        'The Last Horizon', 'Rising Tides', 'Neon Dreams', 'The Forgotten Path',
        'Quantum Heist', 'Summer Lights', 'Dark Matter', 'The Silent Echo',
        'Laughing Under Rain', 'The Last Stand', 'Midnight Express', 'Beyond the Stars',
        'The Garden of Words', 'Crimson Tide', 'Funny Bones', 'Echoes of Tomorrow',
        'The Local Story', 'K-Pop Love', 'The Wire', 'Space Frontier', 'City of Shadows',
        'Laugh Track', 'Love in the City'
    ];

    function getToken() { return localStorage.getItem(TOKEN_KEY); }
    function setUser(user) { localStorage.setItem(USER_KEY, JSON.stringify(user)); }
    function clearSession() {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem('akmark_refresh_token');
        localStorage.removeItem(USER_KEY);
    }

    function checkLogin() {
        var token = getToken();
        if (!token) {
            window.location.href = '/register';
            return;
        }

        fetch('https://jnqwvmxuieeelvukhcsq.supabase.co/functions/v1/login-checker', {
            method: 'GET',
            headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' }
        })
        .then(function(response) {
            return response.text().then(function(text) {
                try { return JSON.parse(text); } catch (e) { throw new Error('Invalid'); }
            });
        })
        .then(function(data) {
            if (!data.valid) {
                clearSession();
                window.location.href = '/register';
                return;
            }

            var user = data.user;
            if (user) {
                setUser(user);

                // Hide skeleton, show real content
                document.getElementById('accountSkeleton').style.display = 'none';
                document.getElementById('accountReal').style.display = 'block';

                // Set real data
                document.getElementById('accountFullName').textContent = user.full_name || '';
                document.getElementById('accountUserId').textContent = user.user_id || '';
                document.getElementById('accountPhone').textContent = user.phone || '';
                var balance = user.wallet_balance || 0;
                document.getElementById('walletValue').textContent = Number(balance).toFixed(2);

                document.body.dataset.userId = user.user_id || '';
            }
        })
        .catch(function() {
            clearSession();
            window.location.href = '/register';
        });
    }

    // Search Subheader Toggle
    function initSearch() {
        var searchNavBtn = document.getElementById('searchNavBtn');
        var searchSubheader = document.getElementById('searchSubheader');
        var searchInput = document.getElementById('searchInput');
        var searchResults = document.getElementById('searchResults');

        if (searchNavBtn) {
            searchNavBtn.addEventListener('click', function(e) {
                e.preventDefault();
                searchSubheader.classList.toggle('open');
                if (searchSubheader.classList.contains('open')) {
                    searchInput.focus();
                } else {
                    searchInput.value = '';
                    searchResults.classList.remove('visible');
                }
            });
        }

        // Search functionality
        if (searchInput) {
            searchInput.addEventListener('input', function() {
                var query = this.value.toLowerCase().trim();
                if (!query) {
                    searchResults.classList.remove('visible');
                    return;
                }
                var filtered = ALL_MOVIES.filter(function(title) {
                    return title.toLowerCase().includes(query);
                });
                if (filtered.length > 0) {
                    searchResults.innerHTML = filtered.map(function(title) {
                        return '<div class="result-item" data-title="' + title + '">' + title + '</div>';
                    }).join('');
                    searchResults.classList.add('visible');
                } else {
                    searchResults.innerHTML = '<div class="result-item">No movies found</div>';
                    searchResults.classList.add('visible');
                }
            });

            // Close results when clicking outside
            document.addEventListener('click', function(e) {
                if (!searchSubheader.contains(e.target)) {
                    searchResults.classList.remove('visible');
                }
            });
        }
    }

    function logout() {
        clearSession();
        window.location.href = '/register';
    }

    function showToast(msg, isError) {
        var toast = document.getElementById('toast');
        if (!toast) return;
        toast.querySelector('span').textContent = msg;
        toast.classList.add('visible');
        if (isError) {
            toast.style.borderColor = '#ff6b6b';
            toast.querySelector('svg').style.fill = '#ff6b6b';
        } else {
            toast.style.borderColor = 'var(--border-subtle)';
            toast.querySelector('svg').style.fill = 'var(--accent)';
        }
        setTimeout(function() { toast.classList.remove('visible'); }, 3000);
    }

    function init() {
        checkLogin();
        initSearch();

        var logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) logoutBtn.addEventListener('click', function() { logout(); });

        var settingsBtn = document.getElementById('settingsBtn');
        if (settingsBtn) settingsBtn.addEventListener('click', function() { showToast('Settings feature coming soon'); });

        var addCashBtn = document.getElementById('addCashBtn');
        if (addCashBtn) addCashBtn.addEventListener('click', function() { showToast('Top-up feature coming soon'); });

        var logoHome = document.getElementById('logoHome');
        if (logoHome) logoHome.addEventListener('click', function() { window.location.href = '/home'; });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
