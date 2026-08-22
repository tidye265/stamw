// javascript.js/home.js
(function() {
    'use strict';

    // ===== LOGIN CHECKER =====
    // Imayamba kufunsa login-checker; ngati ili yovomerezeka, imalola kuti page ikhale yowonekera.
    // Ngati siyovomerezeka, imatumiza user ku /register.
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
                window.location.href = '/register';
            }
            // Ngati valid, page ikhala yowonekera (palibe kanthu kochitika apa)
        })
        .catch(function() {
            // Kodi pali vuto la network? Mutha kusankha kusiya user akhale, kapena kumutumiza ku register
            // Apa tikupanga kuti akhale, koma ngati mukufuna kumutumiza ku register, chitani:
            // window.location.href = '/register';
        });
    }

    // ===== DATA =====
    var MOVIES = [ ... ]; // Zomwe zinali kale
    var SERIES = [ ... ];

    // ===== LOGIC YONSE (render, navigation, payment, player, etc.) =====
    // Izi zonse zinali mu script ya home.html; tsopano zili pano.

    // ===== INIT =====
    function init() {
        checkLogin(); // Choyamba, yang'anani ngati user ali ndi session

        // Zina zonse zomwe zinali mu init (skeleton loading, event listeners, etc.)
        renderSkeleton();
        setTimeout(function() {
            renderAll();
        }, 800);

        // Add event listeners...
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
