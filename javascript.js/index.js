(function() {
    'use strict';

    // ================== CONSTANTS ==================
    var TOKEN_KEY = 'akmark_token';
    var SUPABASE_URL = window.SUPABASE_URL || 'https://jnqwvmxuieeelvukhcsq.supabase.co';
    var BLOCKED_PAGE = 'blocked.html';
    var HOME_PAGE = 'home.html';
    var NON_PAGE = 'non.html';
    var LOGIN_CHECKER_ENDPOINT = SUPABASE_URL + '/functions/v1/login-checker';
    var DEVICE_CHECK_ENDPOINT = SUPABASE_URL + '/functions/v1/security-api?action=verify_device';
    var GET_CHALLENGE_ENDPOINT = SUPABASE_URL + '/functions/v1/security-api?action=get_challenge';
    var VERIFY_ATTESTATION_ENDPOINT = SUPABASE_URL + '/functions/v1/security-api?action=verify_attestation';

    // Timeout for waiting attestation callback (10 seconds)
    var ATTESTATION_TIMEOUT = 10000;

    // ================== RISK SCORE ==================
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
        return;
    }

    // ================== CLEAR SESSION ==================
    function clearSession() {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem('akmark_refresh_token');
        localStorage.removeItem('akmark_user');
    }

    // ================== GLOBAL CALLBACK ==================
    // This function is called from Android after attestation result
    window.onAttestationResult = function(valid, reason) {
        // Clear timeout
        if (window._attestationTimeout) {
            clearTimeout(window._attestationTimeout);
            window._attestationTimeout = null;
        }

        if (valid) {
            window.location.href = HOME_PAGE;
        } else {
            // If reason indicates emulator, block; otherwise maybe go to non
            if (reason && (reason.indexOf('emulator') !== -1 || reason.indexOf('Emulator') !== -1)) {
                showBlockScreen();
            } else {
                // For other failures (network, etc.) go to non
                window.location.href = NON_PAGE;
            }
        }
    };

    // ================== PERFORM ATTESTATION ==================
    function performAttestation(token) {
        // Step 1: Get challenge from server
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

            // Step 2: Call Android to generate attestation and send to backend
            if (window.Android && typeof window.Android.requestAttestation === 'function') {
                // Set timeout in case Android doesn't call back
                window._attestationTimeout = setTimeout(function() {
                    console.error('Attestation timeout');
                    window.location.href = NON_PAGE;
                }, ATTESTATION_TIMEOUT);

                // Call Android method. It should send attestation to backend and then call onAttestationResult.
                window.Android.requestAttestation(challenge, token);
            } else {
                // No Android bridge – fallback to device check (maybe real phone without bridge)
                // We'll do device check via backend (verify_device) which uses risk score
                sendDeviceCheck(token);
            }
        })
        .catch(function(err) {
            console.error('Challenge fetch failed:', err);
            window.location.href = NON_PAGE;
        });
    }

    // ================== DEVICE CHECK FALLBACK ==================
    function sendDeviceCheck(token) {
        var deviceInfo = {
            risk_score: Math.max(getAndroidRiskScore(), getBrowserRiskScore()),
            build: (window.Android && window.Android.getBuild ? window.Android.getBuild() : ''),
            model: (window.Android && window.Android.getModel ? window.Android.getModel() : '')
        };

        fetch(DEVICE_CHECK_ENDPOINT, {
            method: 'POST',
            headers: {
                'Authorization': 'Bearer ' + token,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(deviceInfo)
        })
        .then(function(response) { return response.json(); })
        .then(function(data) {
            if (data.valid === true) {
                window.location.href = HOME_PAGE;
            } else {
                // If backend says emulator detected
                if (data.error && data.error.indexOf('Emulator') !== -1) {
                    showBlockScreen();
                } else {
                    window.location.href = NON_PAGE;
                }
            }
        })
        .catch(function() {
            window.location.href = NON_PAGE;
        });
    }

    // ================== MAIN LOGIN & REDIRECT ==================
    function checkLoginAndRedirect() {
        // 1. Local risk check
        var androidRisk = getAndroidRiskScore();
        var browserRisk = getBrowserRiskScore();
        var combinedRisk = Math.max(androidRisk, browserRisk);

        if (combinedRisk >= 60) {
            showBlockScreen();
            return;
        }

        // 2. Check token
        var token = localStorage.getItem(TOKEN_KEY);
        if (!token) {
            window.location.href = NON_PAGE;
            return;
        }

        // 3. Verify login with backend
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

            // 4. Login valid – proceed with attestation
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
