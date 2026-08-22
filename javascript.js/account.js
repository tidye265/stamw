// javascript.js/account.js
(function() {
    'use strict';

    // ===== TOKEN & USER STORAGE =====
    var TOKEN_KEY = 'akimark_token';
    var USER_KEY = 'akimark_user';

    function getToken() {
        return localStorage.getItem(TOKEN_KEY);
    }

    function setUser(user) {
        localStorage.setItem(USER_KEY, JSON.stringify(user));
    }

    function clearSession() {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem('akimark_refresh_token');
        localStorage.removeItem('akimark_session_id');
        localStorage.removeItem(USER_KEY);
    }

    // ===== LOGIN CHECKER =====
    function checkLogin() {
        var token = getToken();

        // Ngati token ilibe, pitani ku register (komabe, isanapite, onani console)
        if (!token) {
            console.warn('No token found. Redirecting to /register');
            window.location.href = '/register';
            return;
        }

        console.log('Token found:', token.substring(0, 10) + '...');

        // Tumizani request ku login-checker
        fetch('https://jnqwvmxuieeelvukhcsq.supabase.co/functions/v1/login-checker', {
            method: 'GET',
            headers: {
                'Authorization': 'Bearer ' + token,
                'Content-Type': 'application/json'
            }
        })
        .then(function(response) {
            console.log('Login-checker response status:', response.status);
            return response.json().catch(function() {
                // Ngati response si JSON, bwezani error
                throw new Error('Invalid response from login-checker');
            });
        })
        .then(function(data) {
            console.log('Login-checker data:', data);

            if (!data.valid) {
                console.warn('Session invalid. Clearing and redirecting to /register');
                clearSession();
                window.location.href = '/register';
                return;
            }

            // User info yachokera ku login-checker
            var user = data.user;
            if (user) {
                setUser(user);
                document.getElementById('accountFullName').textContent = user.full_name || 'No Name';
                document.getElementById('accountUserId').textContent = user.user_id || 'Unknown';
                document.getElementById('accountPhone').textContent = user.phone || 'Unknown';
                document.body.dataset.userId = user.user_id || '';
            }
        })
        .catch(function(error) {
            console.error('Login-checker error:', error);
            // Ngati pali network error, siyeni kupita ku register – koma onani pa console
            // Inu mungasankhe kumutumiza ku register kapena kusiya
            // Apa tikupanga: ngati vuto ndi network, siyani user akhale koma onetsani error
            // Koma ngati vuto ndi token invalid, imapitani ku register
            // Chonde onani pa console kuti muwone chomwe chikuchitika
            // Mutha kusintha kuti: window.location.href = '/register';
            // Koma kuti zikhale bwino, tiyeni tiziyesera kumupititsa ku register:
            clearSession();
            window.location.href = '/register';
        });
    }

    // ===== LOGOUT =====
    function logout() {
        clearSession();
        window.location.href = '/register';
    }

    // ===== TOAST =====
    function showToast(msg) {
        var toast = document.getElementById('toast');
        toast.querySelector('span').textContent = msg;
        toast.classList.add('visible');
        setTimeout(function() {
            toast.classList.remove('visible');
        }, 3000);
    }

    // ===== INIT =====
    function init() {
        checkLogin();

        document.getElementById('logoutBtn').addEventListener('click', function() {
            logout();
        });

        document.getElementById('settingsBtn').addEventListener('click', function() {
            showToast('Settings feature coming soon');
        });

        document.getElementById('logoHome').addEventListener('click', function() {
            window.location.href = '/home';
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
