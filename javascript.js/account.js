// javascript.js/account.js
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

                // Remove Skeleton from Containers
                var walletContainer = document.getElementById('walletContainer');
                var accountHeader = document.getElementById('accountHeader');
                var userContainer = document.getElementById('userContainer');
                var phoneContainer = document.getElementById('phoneContainer');

                if (walletContainer) walletContainer.classList.remove('skeleton');
                if (accountHeader) accountHeader.classList.remove('skeleton');
                if (userContainer) userContainer.classList.remove('skeleton');
                if (phoneContainer) phoneContainer.classList.remove('skeleton');

                // Inject Real Data
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

        var logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) logoutBtn.addEventListener('click', function() { logout(); });

        var settingsBtn = document.getElementById('settingsBtn');
        if (settingsBtn) settingsBtn.addEventListener('click', function() { showToast('Settings feature coming soon'); });

        var logoHome = document.getElementById('logoHome');
        if (logoHome) logoHome.addEventListener('click', function() { window.location.href = '/home'; });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
