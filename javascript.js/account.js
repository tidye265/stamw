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

    // ===== LOGIN CHECKER - IMAFUNSA DIRECT =====
    function checkLogin() {
        // Tokensi ikhale yopanda kanthu ngati ilibe
        var token = getToken() || '';

        // Tumizani request ku login-checker - ngakhale token ilibe
        fetch('https://jnqwvmxuieeelvukhcsq.supabase.co/functions/v1/login-checker', {
            method: 'GET',
            headers: {
                'Authorization': 'Bearer ' + token,
                'Content-Type': 'application/json'
            }
        })
        .then(function(response) {
            console.log('Login-checker response status:', response.status);
            // Tiyeni tiwerenge text kuti tizindikire ngati si JSON
            return response.text().then(function(text) {
                var data;
                try {
                    data = JSON.parse(text);
                } catch (e) {
                    throw new Error('Invalid JSON response: ' + text);
                }
                return data;
            });
        })
        .then(function(data) {
            console.log('Login-checker data:', data);

            // Ngati valid - onetsani user
            if (data.valid) {
                var user = data.user;
                if (user) {
                    setUser(user);
                    document.getElementById('accountFullName').textContent = user.full_name || 'No Name';
                    document.getElementById('accountUserId').textContent = user.user_id || 'Unknown';
                    document.getElementById('accountPhone').textContent = user.phone || 'Unknown';
                    document.body.dataset.userId = user.user_id || '';
                    showToast('Welcome back, ' + (user.full_name || 'User'));
                }
                return;
            }

            // Ngati si valid - onetsani error yochokera ku backend
            var errorMsg = data.error || 'Session invalid';
            showToast(errorMsg, true); // show error style
            console.warn('Login-checker error:', errorMsg);

            // Musamangotumiza ku register - siyani user awone error
            // Mutha kusintha kuti: window.location.href = '/register';
            // Koma tsopano sizichitika
        })
        .catch(function(error) {
            console.error('Login-checker fetch error:', error);
            // Onetsani error yomwe yachitika
            showToast('Error: ' + error.message, true);
        });
    }

    // ===== LOGOUT =====
    function logout() {
        clearSession();
        window.location.href = '/register';
    }

    // ===== TOAST =====
    function showToast(msg, isError) {
        var toast = document.getElementById('toast');
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
        }, 4000);
    }

    // ===== INIT =====
    function init() {
        checkLogin(); // Imafunsa login-checker nthawi yomweyo

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
