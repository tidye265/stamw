// javascript.js/account.js
(function() {
    'use strict';

    // ===== LOGIN CHECKER =====
    function checkLogin() {
        var token = localStorage.getItem('akimark_token');
        if (!token) {
            window.location.href = '/register';
            return;
        }

        fetch('https://jnqwvmxuieeelvukhcsq.supabase.co/functions/v1/login-checker', {
            method: 'GET',
            headers: {
                'Authorization': 'Bearer ' + token
            }
        })
        .then(function(res) { return res.json(); })
        .then(function(data) {
            if (!data.valid) {
                localStorage.removeItem('akimark_token');
                localStorage.removeItem('akimark_refresh_token');
                localStorage.removeItem('akimark_session_id');
                localStorage.removeItem('akimark_user');
                window.location.href = '/register';
                return;
            }

            // User info yachokera ku login-checker response
            var user = data.user;
            if (user) {
                document.getElementById('accountFullName').textContent = user.full_name || 'No Name';
                document.getElementById('accountUserId').textContent = user.user_id || 'Unknown';
                document.getElementById('accountPhone').textContent = user.phone || 'Unknown';
            }
        })
        .catch(function() {
            // Ngati network error, tiyeni tiziyesera kumupititsa ku register? 
            // Mutha kusankha kuti user akhale koma mwina token yachepa.
            // Apa tikupanga kuti akhale, koma ngati mukufuna kumutumiza:
            // window.location.href = '/register';
        });
    }

    // ===== LOGOUT =====
    function logout() {
        localStorage.removeItem('akimark_token');
        localStorage.removeItem('akimark_refresh_token');
        localStorage.removeItem('akimark_session_id');
        localStorage.removeItem('akimark_user');
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

        // Logout button
        document.getElementById('logoutBtn').addEventListener('click', function() {
            logout();
        });

        // Settings button (placeholder)
        document.getElementById('settingsBtn').addEventListener('click', function() {
            showToast('Settings feature coming soon');
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
