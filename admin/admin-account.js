// admin-account.js
(function() {
    'use strict';

    const token = localStorage.getItem('akmark_admin_token');
    if (!token) {
        window.location.href = 'admin-login.html';
        return;
    }

    const admin = JSON.parse(localStorage.getItem('akmark_admin') || '{}');

    if (admin.full_name) {
        document.getElementById('adminName').textContent = admin.full_name;
        document.getElementById('fullName').textContent = admin.full_name;
    }
    if (admin.email) {
        document.getElementById('adminEmail').textContent = admin.email;
        document.getElementById('email').textContent = admin.email;
    }
    document.getElementById('totalFilms').textContent = admin.total_films || 0;
    document.getElementById('walletBalance').textContent = 'MK ' + (admin.wallet_balance || 0).toFixed(2);

    // Logout
    document.getElementById('logoutBtn').addEventListener('click', function() {
        localStorage.removeItem('akmark_admin_token');
        localStorage.removeItem('akmark_admin_refresh_token');
        localStorage.removeItem('akmark_admin');
        window.location.href = 'admin-login.html';
    });
})();
