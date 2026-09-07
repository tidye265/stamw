(function() {
    'use strict';

    var TOKEN_KEY = 'akmark_token';
    var SUPABASE_URL = window.SUPABASE_URL || 'https://jnqwvmxuieeelvukhcsq.supabase.co';
    var HOME_PAGE = 'home.html';
    var NON_PAGE = 'non.html';
    var LOGIN_CHECKER_ENDPOINT = SUPABASE_URL + '/functions/v1/login-checker';
    var GET_CHALLENGE_ENDPOINT = SUPABASE_URL + '/functions/v1/security-api?action=get_challenge';
    var DEVICE_CHECK_ENDPOINT = SUPABASE_URL + '/functions/v1/security-api?action=verify_device';
    var ATTESTATION_TIMEOUT = 15000;

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
    }

    function clearSession() {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem('akmark_refresh_token');
        localStorage.removeItem('akmark_user');
    }

    var attestationDone = false;

    window.onAttestationResult = function(valid, reason) {
        if (attestationDone) return;
        attestationDone = true;
        if (window._attestationTimeout) clearTimeout(window._attestationTimeout);

        if (valid) {
            // Attestation successful – proceed to login
            checkLogin();
        } else {
            // Attestation failed – fallback to device risk check
            console.log("Attestation failed, falling back to device risk check");
            performDeviceCheck();
        }
    };

    function performDeviceCheck() {
        var riskScore = Math.max(getAndroidRiskScore(), getBrowserRiskScore());
        var token = localStorage.getItem(TOKEN_KEY) || '';

        fetch(DEVICE_CHECK_ENDPOINT, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + token
            },
            body: JSON.stringify({
                risk_score: riskScore,
                build: (window.Android && window.Android.getBuild) ? window.Android.getBuild() : '',
                model: (window.Android && window.Android.getModel) ? window.Android.getModel() : ''
            })
        })
        .then(response => response.json())
        .then(data => {
            if (data.valid === true) {
                // Device is real – proceed to login
                checkLogin();
            } else {
                // Device is emulator
                showBlockScreen();
            }
        })
        .catch(() => {
            // Network error – go to non
            window.location.href = NON_PAGE;
        });
    }

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
        .then(response => response.json())
        .then(data => {
            if (data.valid) {
                window.location.href = HOME_PAGE;
            } else {
                clearSession();
                window.location.href = NON_PAGE;
            }
        })
        .catch(() => {
            clearSession();
            window.location.href = NON_PAGE;
        });
    }

    function performAttestation() {
        fetch(GET_CHALLENGE_ENDPOINT, { method: 'POST', headers: { 'Content-Type': 'application/json' } })
        .then(response => response.json())
        .then(data => {
            if (!data.challenge) {
                console.error('No challenge received');
                performDeviceCheck();
                return;
            }
            var challenge = data.challenge;
            window._attestationTimeout = setTimeout(function() {
                if (!attestationDone) {
                    attestationDone = true;
                    window.onAttestationResult(false, 'timeout');
                }
            }, ATTESTATION_TIMEOUT);

            if (window.Android && typeof window.Android.requestAttestation === 'function') {
                window.Android.requestAttestation(challenge, '');
            } else {
                window.onAttestationResult(false, 'No Android bridge');
            }
        })
        .catch(() => performDeviceCheck());
    }

    function init() {
        var combinedRisk = Math.max(getAndroidRiskScore(), getBrowserRiskScore());
        if (combinedRisk >= 90) {
            showBlockScreen();
            return;
        }
        performAttestation();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
