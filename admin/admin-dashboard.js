// admin-dashboard.js
(function() {
    'use strict';

    // Check admin login
    const token = localStorage.getItem('akmark_admin_token');
    if (!token) {
        window.location.href = 'admin-login.html';
        return;
    }

    // Load admin info from localStorage
    const admin = JSON.parse(localStorage.getItem('akmark_admin') || '{}');

    // Populate UI
    if (admin.full_name) {
        document.getElementById('greeting').textContent = 'HELLO, ' + admin.full_name.toUpperCase();
        document.getElementById('adminName').textContent = admin.full_name;
    }
    if (admin.email) {
        document.getElementById('adminEmail').textContent = admin.email;
        document.getElementById('adminEmailStat').textContent = admin.email;
    }
    document.getElementById('walletBalance').textContent = 'MK ' + (admin.wallet_balance || 0).toFixed(2);
    document.getElementById('totalFilms').textContent = admin.total_films || 0;

    // Fetch latest data from backend (optional)
    const SUPABASE_URL = window.SUPABASE_URL;
    const SUPABASE_ANON_KEY = window.SUPABASE_ANON_KEY;

    fetch(`${SUPABASE_URL}/functions/v1/admin-dashboard-api`, {
        method: 'GET',
        headers: {
            'Authorization': 'Bearer ' + token
        }
    })
    .then(function(res) { return res.json(); })
    .then(function(data) {
        if (data.admin) {
            document.getElementById('greeting').textContent = 'HELLO, ' + data.admin.full_name.toUpperCase();
            document.getElementById('adminName').textContent = data.admin.full_name;
            document.getElementById('adminEmail').textContent = data.admin.email;
            document.getElementById('walletBalance').textContent = 'MK ' + (data.admin.wallet_balance || 0).toFixed(2);
            document.getElementById('totalFilms').textContent = data.admin.total_films || 0;
        }
    })
    .catch(function() {
        // Use local data if fetch fails
    });
})();
