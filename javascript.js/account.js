// javascript.js/account.js
(function() {
    'use strict';

    // ===== TOKEN & USER STORAGE =====
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

    // ===== LOGIN CHECKER =====
    function checkLogin() {
        var token = getToken();

        // Ngati token ilibe, onetsani uthenga ndi kupita ku register
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

            if (!data.valid) {
                // Token siyovomerezeka – chotsani zonse ndi kupita ku register
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
                showToast('Welcome back, ' + (user.full_name || 'User'));
            }
        })
        .catch(function(error) {
            console.error('Login-checker fetch error:', error);
            // Ngati pali vuto la network kapena JSON, chotsani zonse ndi kupita ku register
            // Izi zidzathandiza kuti token yokhazikitsidwa iwonongeke
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
