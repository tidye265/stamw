(function() {
    'use strict';

    var TOKEN_KEY = 'akmark_token';
    var USER_KEY = 'akmark_user';

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

                // Wallet icon – replace skeleton with real icon
                var walletIcon = document.getElementById('walletIcon');
                if (walletIcon) {
                    walletIcon.classList.remove('skeleton-circle');
                    walletIcon.innerHTML = '<img src="images/akimark-wallet.svg" alt="Wallet">';
                }

                // Balance – show real value
                var balance = user.wallet_balance || 0;
                var walletSkeleton = document.getElementById('walletSkeleton');
                var walletReal = document.getElementById('walletRealValue');
                if (walletSkeleton) walletSkeleton.style.display = 'none';
                if (walletReal) {
                    walletReal.style.display = 'block';
                    document.getElementById('walletValue').textContent = Number(balance).toFixed(2);
                }

                // Account avatar – replace skeleton
                var accountAvatar = document.getElementById('accountAvatar');
                if (accountAvatar) {
                    accountAvatar.classList.remove('skeleton-circle');
                    accountAvatar.innerHTML = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>';
                }

                // Full name – replace skeleton
                var fullNameEl = document.getElementById('accountFullName');
                if (fullNameEl) {
                    fullNameEl.textContent = user.full_name || '';
                    fullNameEl.classList.remove('skeleton-text');
                }

                // User ID – replace skeleton
                var userIdEl = document.getElementById('accountUserId');
                if (userIdEl) {
                    userIdEl.textContent = user.user_id || '';
                    userIdEl.classList.remove('skeleton-text');
                }

                // Phone – replace skeleton
                var phoneEl = document.getElementById('accountPhone');
                if (phoneEl) {
                    phoneEl.textContent = user.phone || '';
                    phoneEl.classList.remove('skeleton-text');
                }

                document.body.dataset.userId = user.user_id || '';
            }
        })
        .catch(function() {
            clearSession();
            window.location.href = '/register';
        });
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

        // Add Cash Button
        var addCashBtn = document.getElementById('addCashBtn');
        if (addCashBtn) addCashBtn.addEventListener('click', function() { showToast('Top-up feature coming soon'); });

        // Logout
        var logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) logoutBtn.addEventListener('click', function() { logout(); });

        // Settings
        var settingsBtn = document.getElementById('settingsBtn');
        if (settingsBtn) settingsBtn.addEventListener('click', function() { showToast('Settings feature coming soon'); });

        // Search Input (placeholder – maybe future functionality)
        var searchInput = document.getElementById('accountSearchInput');
        if (searchInput) {
            searchInput.addEventListener('input', function(e) {
                // Filter logic can be added here, e.g., redirect to movies page
                // For now, just placeholder
            });
        }

        // Logo
        var logoHome = document.getElementById('logoHome');
        if (logoHome) logoHome.addEventListener('click', function() { window.location.href = '/home'; });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
