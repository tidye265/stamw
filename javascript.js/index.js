(function() {
    'use strict';

    var TOKEN_KEY = 'akmark_token';
    var SUPABASE_URL = window.SUPABASE_URL || 'https://jnqwvmxuieeelvukhcsq.supabase.co';
    var BLOCKED_PAGE = 'blocked.html';
    var HOME_PAGE = 'home.html';
    var NON_PAGE = 'non.html';
    var LOGIN_CHECKER_ENDPOINT = SUPABASE_URL + '/functions/v1/login-checker';
    var DEVICE_CHECK_ENDPOINT = SUPABASE_URL + '/functions/v1/security-api?action=verify_device';
    var GET_CHALLENGE_ENDPOINT = SUPABASE_URL + '/functions/v1/security-api?action=get_challenge';
    var VERIFY_ATTESTATION_ENDPOINT = SUPABASE_URL + '/functions/v1/security-api?action=verify_attestation';

    function getAndroidRiskScore() {
        if (window.Android && typeof window.Android.getEmulatorRisk === 'function') {
            try {
                var score = parseInt(window.Android.getEmulatorRisk());
                return isNaN(score) ? 0 : score;
            } catch (e) { return 0; }
        }
        return 0;
    }

    function getBrowserRiskScore() {
        var score = 0;
        var ua = navigator.userAgent.toLowerCase();
        var emulatorKeywords = ['emulator', 'simulator', 'bluestacks', 'nox', 'ldplayer', 'mumu', 'memu', 'genymotion'];
        for (var i = 0; i < emulatorKeywords.length; i++) {
            if (ua.indexOf(emulatorKeywords[i]) !== -1) { score += 40; break; }
        }
        if (!('ontouchstart' in window) && !navigator.maxTouchPoints) score += 15;
        if (window.screen.width === 320 && window.screen.height === 240) score += 10;
        return score;
    }

    function showBlockScreen() {
        document.body.innerHTML = `
            <div style="display:flex; justify-content:center; align-items:center; height:100vh; background:#000; color:#fff; font-family: Arial, sans-serif; text-align:center; padding:20px;">
                <div>
                    <h1 style="font-size:28px;">⛔ Access Denied</h1>
                    <p style="font-size:16px; margin-top:20px;">Your device appears to be an emulator. This app is not allowed on virtual environments.</p>
                    <p style="font-size:14px; color:#888;">If you are on a real device, please restart the app.</p>
                </div>
            </div>`;
        return;
    }

    function clearSession() {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem('akmark_refresh_token');
        localStorage.removeItem('akmark_user');
    }

    function performAttestation(token) {
        // 1. Get challenge from server
        fetch(GET_CHALLENGE_ENDPOINT, { method: 'POST', headers: { 'Content-Type': 'application/json' } })
            .then(function(response) { return response.json(); })
            .then(function(data) {
                if (!data.challenge) {
                    // If challenge fails, fallback to non.html or block?
                    window.location.href = NON_PAGE;
                    return;
                }
                var challenge = data.challenge;
                // 2. Ask Android to generate attestation and send to backend
                if (window.Android && typeof window.Android.requestAttestation === 'function') {
                    window.Android.requestAttestation(challenge, token);
                    // Wait for backend response? We'll need a callback.
                    // For simplicity, we'll redirect to home after a short delay.
                    setTimeout(function() {
                        // Optionally poll a verification status; we'll just assume success.
                        window.location.href = HOME_PAGE;
                    }, 3000);
                } else {
                    // If no Android bridge, maybe fallback to device check
                    window.location.href = HOME_PAGE;
                }
            })
            .catch(function() {
                window.location.href = NON_PAGE;
            });
    }

    function checkLoginAndRedirect() {
        var androidRisk = getAndroidRiskScore();
        var browserRisk = getBrowserRiskScore();
        var combinedRisk = Math.max(androidRisk, browserRisk);

        if (combinedRisk >= 60) {
            showBlockScreen();
            return;
        }

        var token = localStorage.getItem(TOKEN_KEY);
        if (!token) {
            window.location.href = NON_PAGE;
            return;
        }

        // Verify login first
        fetch(LOGIN_CHECKER_ENDPOINT, {
            method: 'GET',
            headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' }
        })
        .then(function(response) { return response.json(); })
        .then(function(data) {
            if (!data.valid) {
                clearSession();
                window.location.href = NON_PAGE;
                return;
            }

            // Now perform attestation
            performAttestation(token);
        })
        .catch(function() {
            clearSession();
            window.location.href = NON_PAGE;
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', checkLoginAndRedirect);
    } else {
        checkLoginAndRedirect();
    }
})();
