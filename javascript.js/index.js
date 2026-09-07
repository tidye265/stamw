(function() {
    'use strict';

    var TOKEN_KEY = 'akmark_token';
    var SUPABASE_URL = window.SUPABASE_URL || 'https://jnqwvmxuieeelvukhcsq.supabase.co';
    var HOME_PAGE = 'home.html';
    var NON_PAGE = 'non.html';
    var LOGIN_CHECKER_ENDPOINT = SUPABASE_URL + '/functions/v1/login-checker';
    var GET_CHALLENGE_ENDPOINT = SUPABASE_URL + '/functions/v1/security-api?action=get_challenge';
    var ATTESTATION_TIMEOUT = 15000;

    function getAndroidRiskScore() { ... } // same as before
    function getBrowserRiskScore() { ... } // same as before
    function showBlockScreen() { ... } // same as before
    function clearSession() { ... } // same as before

    var attestationDone = false;

    window.onAttestationResult = function(valid, reason) {
        if (attestationDone) return;
        attestationDone = true;
        if (window._attestationTimeout) clearTimeout(window._attestationTimeout);

        if (valid) {
            checkLogin();
        } else {
            var reasonLower = (reason || '').toLowerCase();
            if (reasonLower.indexOf('emulator') !== -1 || reasonLower.indexOf('attest') !== -1) {
                showBlockScreen();
            } else {
                window.location.href = NON_PAGE;
            }
        }
    };

    function checkLogin() {
        var token = localStorage.getItem(TOKEN_KEY);
        if (!token) { window.location.href = NON_PAGE; return; }
        fetch(LOGIN_CHECKER_ENDPOINT, {
            method: 'GET',
            headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' }
        })
        .then(r => r.json())
        .then(data => {
            if (data.valid) {
                window.location.href = HOME_PAGE;
            } else {
                clearSession();
                window.location.href = NON_PAGE;
            }
        })
        .catch(() => { clearSession(); window.location.href = NON_PAGE; });
    }

    function performAttestation() {
        fetch(GET_CHALLENGE_ENDPOINT, { method: 'POST', headers: { 'Content-Type': 'application/json' } })
        .then(r => r.json())
        .then(data => {
            if (!data.challenge) { console.error('No challenge'); window.location.href = NON_PAGE; return; }
            var challenge = data.challenge;
            window._attestationTimeout = setTimeout(function() {
                if (!attestationDone) { attestationDone = true; window.onAttestationResult(false, 'timeout'); }
            }, ATTESTATION_TIMEOUT);
            if (window.Android && typeof window.Android.requestAttestation === 'function') {
                window.Android.requestAttestation(challenge, '');
            } else {
                window.onAttestationResult(false, 'No Android bridge');
            }
        })
        .catch(() => window.location.href = NON_PAGE);
    }

    function init() {
        var combinedRisk = Math.max(getAndroidRiskScore(), getBrowserRiskScore());
        if (combinedRisk >= 90) { showBlockScreen(); return; }
        performAttestation();
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
})();
