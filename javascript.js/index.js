(function() {
    'use strict';

    // ================== CONSTANTS ==================
    var TOKEN_KEY = 'akmark_token';
    var SUPABASE_URL = window.SUPABASE_URL || 'https://jnqwvmxuieeelvukhcsq.supabase.co';
    var HOME_PAGE = 'home.html';
    var NON_PAGE = 'non.html';
    var LOGIN_CHECKER_ENDPOINT = SUPABASE_URL + '/functions/v1/login-checker';
    var GET_CHALLENGE_ENDPOINT = SUPABASE_URL + '/functions/v1/security-api?action=get_challenge';

    // ================== RISK SCORE (LOCAL) ==================
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

    // ================== BLOCK SCREEN ==================
    function showBlockScreen() {
        document.body.innerHTML = `
            <div style="display:flex; justify-content:center; align-items:center; height:100vh; background:#000; color:#fff; font-family: Arial, sans-serif; text-align:center; padding:20px;">
                <div>
                    <h1 style="font-size:28px;">⛔ Access Denied</h1>
                    <p style="font-size:16px; margin-top:20px;">Your device appears to be an emulator. This app is not allowed on virtual environments.</p>
                    <p style="font-size:14px; color:#888;">If you are on a real device, please restart the app.</p>
                </div>
            </div>`;
    }

    // ================== CLEAR SESSION ==================
    function clearSession() {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem('akmark_refresh_token');
        localStorage.removeItem('akmark_user');
    }

    // ================== GLOBAL CALLBACK (from Android) ==================
    window.onAttestationResult = function(valid, reason) {
        // This function is called ONLY after backend has replied.
        if (valid) {
            window.location.href = HOME_PAGE;
        } else {
            // Backend says invalid – show block screen if emulator related, else go to non
            if (reason && reason.toLowerCase().indexOf('emulator') !== -1) {
                showBlockScreen();
            } else {
                // For other failures (network, etc.) go to non
                window.location.href = NON_PAGE;
            }
        }
    };

    // ================== PERFORM ATTESTATION ==================
    function performAttestation(token) {
        // Get challenge from backend
        fetch(GET_CHALLENGE_ENDPOINT, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        })
        .then(function(response) { return response.json(); })
        .then(function(data) {
            if (!data.challenge) {
                console.error('No challenge received');
                window.location.href = NON_PAGE;
                return;
            }

            var challenge = data.challenge;

            // Call Android to generate attestation and send to backend
            if (window.Android && typeof window.Android.requestAttestation === 'function') {
                // Wait for onAttestationResult to be called – no timeout here, we trust backend.
                window.Android.requestAttestation(challenge, token);
            } else {
                // No Android bridge – fallback to device check (but this is not ideal)
                // We'll just go to non (or block) – but high-end system wants backend verification.
                console.error('No Android bridge available');
                window.location.href = NON_PAGE;
            }
        })
        .catch(function(err) {
            console.error('Challenge fetch failed:', err);
            window.location.href = NON_PAGE;
        });
    }

    // ================== MAIN LOGIN & REDIRECT ==================
    function checkLoginAndRedirect() {
        // Local risk check (optional – but we can block if very high)
        var androidRisk = getAndroidRiskScore();
        var browserRisk = getBrowserRiskScore();
        var combinedRisk = Math.max(androidRisk, browserRisk);

        // If risk >= 60, block immediately (but this is a heuristic, not final)
        // However, high-end system wants backend decision. We'll only block if >= 80.
        if (combinedRisk >= 80) {
            showBlockScreen();
            return;
        }

        // Check token
        var token = localStorage.getItem(TOKEN_KEY);
        if (!token) {
            window.location.href = NON_PAGE;
            return;
        }

        // Verify login with backend
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

            // Login valid – proceed with attestation
            performAttestation(token);
        })
        .catch(function() {
            clearSession();
            window.location.href = NON_PAGE;
        });
    }

    // ================== INIT ==================
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', checkLoginAndRedirect);
    } else {
        checkLoginAndRedirect();
    }
})();
