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
        if (!token) {
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
        .then(function(res) { return res.json(); })
        .then(function(data) {
            if (!data.valid) {
                // Token siyovomerezeka – chotsani zonse ndi kupita ku register
                clearSession();
                window.location.href = '/register';
                return;
            }

            // User info yachokera ku login-checker
            var user = data.user;
            if (user) {
                // Sungirani user info mu localStorage kuti mugwiritse ntchito pambuyo pake
                setUser(user);

                // Ikani zinthu pa page
                document.getElementById('accountFullName').textContent = user.full_name || 'No Name';
                document.getElementById('accountUserId').textContent = user.user_id || 'Unknown';
                document.getElementById('accountPhone').textContent = user.phone || 'Unknown';

                // Ikani user_id mu dataset kuti settings-api igwiritse ntchito
                document.body.dataset.userId = user.user_id || '';
            }
        })
        .catch(function(error) {
            // Network error – mwina server ilibe kugwira. Koma pali token? 
            // Tiyeni tiziyesera kumupititsa ku register kuti asagwire vuto lalikulu
            clearSession();
            window.location.href = '/register';
        });
    }

    // ===== LOGOUT =====
    function logout() {
        clearSession();
        window.location.href = '/register';
    }

    // ===== SETTINGS (Kutumiza ku settings-api) =====
    function updateSettings() {
        var token = getToken();
        var userId = document.body.dataset.userId;
        var phone = document.getElementById('accountPhone').textContent;

        if (!token || !userId) {
            showToast('Missing user info. Please login again.');
            return;
        }

        // Tumizani request ku settings-api
        fetch('https://jnqwvmxuieeelvukhcsq.supabase.co/functions/v1/settings-api', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + token
            },
            body: JSON.stringify({
                user_id: userId,
                phone: phone
            })
        })
        .then(function(res) { return res.json(); })
        .then(function(data) {
            if (data.success) {
                showToast('Settings updated successfully!');
            } else {
                showToast(data.error || 'Failed to update settings.');
            }
        })
        .catch(function() {
            showToast('Network error while updating settings.');
        });
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
        // Yang'anani ngati user ali login
        checkLogin();

        // Logout button
        document.getElementById('logoutBtn').addEventListener('click', function() {
            logout();
        });

        // Settings button (api update)
        document.getElementById('settingsBtn').addEventListener('click', function() {
            // Change phone number example (or you can make prompt)
            var newPhone = prompt('Enter new phone number:', document.getElementById('accountPhone').textContent);
            if (newPhone && newPhone.trim()) {
                document.getElementById('accountPhone').textContent = newPhone.trim();
                updateSettings();
            } else {
                showToast('No changes made.');
            }
        });

        // Logo click – go home
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
