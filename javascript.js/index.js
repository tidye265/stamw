// index.js
(function() {
    'use strict';

    var TOKEN_KEY = 'akmark_token';
    var APP_TOKEN_KEY = 'akmark_app_token';
    var SUPABASE_URL = window.SUPABASE_URL || 'https://jnqwvmxuieeelvukhcsq.supabase.co';

    // ===== SECURITY GATE (BEFORE ANY REDIRECT) =====
    async function verifyAppProof() {
        // Check if we already have a valid app token
        var storedToken = localStorage.getItem(APP_TOKEN_KEY);
        if (storedToken) {
            var verifyRes = await fetch(`${SUPABASE_URL}/functions/v1/security-api?action=verify_app_token`, {
                headers: { 'x-app-proof': storedToken }
            });
            var verifyData = await verifyRes.json();
            if (verifyData.valid) return true;
            else localStorage.removeItem(APP_TOKEN_KEY);
        }

        // Request challenge
        var challengeRes = await fetch(`${SUPABASE_URL}/functions/v1/security-api?action=get_challenge`, {
            method: 'POST'
        });
        var challengeData = await challengeRes.json();
        if (!challengeData.challenge) return false;

        // Get proof from Android native interface
        if (typeof window.Android === 'undefined' || typeof window.Android.getProof !== 'function') {
            console.error('App proof required. Only Akimark APK can access this site.');
            return false;
        }

        var proof = window.Android.getProof(challengeData.challenge);

        // Verify proof with backend
        var verifyProofRes = await fetch(`${SUPABASE_URL}/functions/v1/security-api?action=verify_proof`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ challenge: challengeData.challenge, proof: proof })
        });
        var verifyProofData = await verifyProofRes.json();
        if (verifyProofData.valid && verifyProofData.app_token) {
            localStorage.setItem(APP_TOKEN_KEY, verifyProofData.app_token);
            return true;
        }
        return false;
    }

    // ===== CHECK LOGIN & REDIRECT =====
    function checkLoginAndRedirect() {
        var token = localStorage.getItem(TOKEN_KEY);

        // First, verify app proof (must be real APK)
        verifyAppProof().then(function(isValid) {
            if (!isValid) {
                window.location.href = 'blocked.html'; // or show error "BASOPU!"
                return;
            }

            // Now proceed with login check
            if (!token) {
                window.location.href = 'non.html';
                return;
            }

            fetch(`${SUPABASE_URL}/functions/v1/login-checker`, {
                method: 'GET',
                headers: {
                    'Authorization': 'Bearer ' + token,
                    'Content-Type': 'application/json'
                }
            })
            .then(function(response) {
                return response.text().then(function(text) {
                    try { return JSON.parse(text); } catch (e) { throw new Error('Invalid'); }
                });
            })
            .then(function(data) {
                if (data.valid) {
                    window.location.href = 'home.html';
                } else {
                    clearSession();
                    window.location.href = 'non.html';
                }
            })
            .catch(function() {
                clearSession();
                window.location.href = 'non.html';
            });
        });
    }

    function clearSession() {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem('akmark_refresh_token');
        localStorage.removeItem('akmark_user');
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', checkLoginAndRedirect);
    } else {
        checkLoginAndRedirect();
    }
})();
