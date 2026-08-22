// javascript.js/account.js
(function() {
    'use strict';

    var TOKEN_KEY = 'akmark_token';
    var USER_KEY = 'akmark_user';

    function getToken() {
        return localStorage.getItem(TOKEN_KEY);
    }

    function setUser(user) {
        localStorage.setItem(USER_KEY, JSON.stringify(user));
    }

    function clearSession() {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem('akmark_refresh_token');
        localStorage.removeItem(USER_KEY);
    }

    function checkLogin() {
        var token = getToken();
        if (!token) {
            // Palibe token – pitani ku register popanda kuwonetsa error
            window.location.href = '/register';
            return;
        }

        fetch('https://jnqwvmxuieeelvukhcsq.supabase.co/functions/v1/login-checker', {
            method: 'GET',
            headers: {
                'Authorization': 'Bearer ' + token,
                'Content-Type': 'application/json'
            }
        })
        .then(function(response) {
            return response.text().then(function(text) {
                var data;
                try {
                    data = JSON.parse(text);
                } catch (e) {
                    // Ngati response si JSON, tumizani ku register (kusawonetsa error)
                    throw new Error('Invalid response');
                }
                return data;
            });
        })
        .then(function(data) {
            if (!data.valid) {
                // Token siyovomerezeka – chotsani zonse ndi kupita ku register
                clearSession();
                window.location.href = '/register';
                return;
            }

            var user = data.user;
            if (user) {
                setUser(user);

                // --- Update UI (chotsani skeleton) ---
                // Full Name
                var fullNameEl = document.getElementById('accountFullName');
                fullNameEl.textContent = user.full_name || 'No Name';
                fullNameEl.classList.remove('skeleton', 'skeleton-text');

                // User ID
                var userIdEl = document.getElementById('accountUserId');
                userIdEl.textContent = user.user_id || 'Unknown';
                userIdEl.classList.remove('skeleton', 'skeleton-text');

                // Phone
                var phoneEl = document.getElementById('accountPhone');
                phoneEl.textContent = user.phone || 'Unknown';
                phoneEl.classList.remove('skeleton', 'skeleton-text');

                // Wallet Balance – default 0.00
                var balance = user.wallet_balance || 0;
                var walletValueEl = document.getElementById('walletValue');
                walletValueEl.textContent = Number(balance).toFixed(2);

                // Chotsani skeleton ya balance
                var skeletonBal = document.getElementById('walletAmountSkeleton');
                var actualBal = document.getElementById('walletAmount');
                if (skeletonBal) skeletonBal.style.display = 'none';
                if (actualBal) actualBal.style.display = 'block';

                // Store user_id for future use
                document.body.dataset.userId = user.user_id || '';

                // Palibe toast pa load
            }
        })
        .catch(function(error) {
            // Ngati pali vuto (network, JSON, etc.) – chotsani zonse ndi kupita ku register
            // Koma osawonetsa error pa frontend
            clearSession();
            window.location.href = '/register';
        });
    }

    function logout() {
        clearSession();
        window.location.href = '/register';
    }

    function showToast(msg, isError) {
        // Mutha kusiya function iyi ngati simukufuna kugwiritsa ntchito
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
        setTimeout(function() {
            toast.classList.remove('visible');
        }, 3000);
    }

    function init() {
        checkLogin();

        // Logout
        var logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', function() {
                logout();
            });
        }

        // Settings
        var settingsBtn = document.getElementById('settingsBtn');
        if (settingsBtn) {
            settingsBtn.addEventListener('click', function() {
                // Mutha kutumiza settings-api dala pano
                showToast('Settings feature coming soon');
            });
        }

        // Logo
        var logoHome = document.getElementById('logoHome');
        if (logoHome) {
            logoHome.addEventListener('click', function() {
                window.location.href = '/home';
            });
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
