(function() {
    'use strict';

    // ================== CONSTANTS ==================
    var TOKEN_KEY = 'akmark_token';
    var SUPABASE_URL = window.SUPABASE_URL || 'https://jnqwvmxuieeelvukhcsq.supabase.co';
    var HOME_PAGE = 'home.html';
    var NON_PAGE = 'non.html';
    var LOGIN_CHECKER_ENDPOINT = SUPABASE_URL + '/functions/v1/login-checker';
    var GET_CHALLENGE_ENDPOINT = SUPABASE_URL + '/functions/v1/security-api?action=get_challenge';
    var ATTESTATION_TIMEOUT = 15000; // 15 seconds

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
    var attestationDone = false; // Prevent double handling

    window.onAttestationResult = function(valid, reason) {
        if (attestationDone) return;
        attestationDone = true;
        // Clear timeout
        if (window._attestationTimeout) {
            clearTimeout(window._attestationTimeout);
            window._attestationTimeout = null;
        }

        if (valid) {
            // Device is real – now check login
            checkLogin();
        } else {
            // Attestation failed – block if emulator related, else go to non
            var reasonLower = (reason || '').toLowerCase();
            if (reasonLower.indexOf('emulator') !== -1 || reasonLower.indexOf('attest') !== -1) {
                showBlockScreen();
            } else {
                // Network error or other issues – for security, go to non (or block)
                // To be strict, we can block all failures, but we'll go to non for non-emulator errors.
                window.location.href = NON_PAGE;
            }
        }
    };

    // ================== CHECK LOGIN (after device verification) ==================
    function checkLogin() {
        var token = localStorage.getItem(TOKEN_KEY);
        if (!token) {
            window.location.href = NON_PAGE;
            return;
        }

        fetch(LOGIN_CHECKER_ENDPOINT, {
            method: 'GET',
            headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' }
        })
        .then(function(response) { return response.json(); })
        .then(function(data) {
            if (data.valid) {
                window.location.href = HOME_PAGE;
            } else {
                clearSession();
                window.location.href = NON_PAGE;
            }
        })
        .catch(function() {
            clearSession();
            window.location.href = NON_PAGE;
        });
    }

    // ================== PERFORM ATTESTATION (FIRST) ==================
    function performAttestation() {
        // 1. Get challenge from security-api
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

            // 2. Set timeout in case Android doesn't call back
            window._attestationTimeout = setTimeout(function() {
                console.error('Attestation timeout');
                if (!attestationDone) {
                    attestationDone = true;
                    window.onAttestationResult(false, 'timeout');
                }
            }, ATTESTATION_TIMEOUT);

            // 3. Call Android to generate attestation and send to backend
            if (window.Android && typeof window.Android.requestAttestation === 'function') {
                // Note: We don't pass token yet; token is only used in login check later.
                window.Android.requestAttestation(challenge, ''); // token is empty for device verification
            } else {
                // No Android bridge – cannot attest; block
                window.onAttestationResult(false, 'No Android bridge');
            }
        })
        .catch(function(err) {
            console.error('Challenge fetch failed:', err);
            window.location.href = NON_PAGE;
        });
    }

    // ================== MAIN INIT ==================
    function init() {
        // Step 0: Local risk check (optional, but we'll block only if extremely high)
        var combinedRisk = Math.max(getAndroidRiskScore(), getBrowserRiskScore());
        if (combinedRisk >= 90) {
            showBlockScreen();
            return;
        }

        // Step 1: Perform device attestation first
        performAttestation();
    }

    // ================== START ==================
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
