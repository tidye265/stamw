(function() {
    'use strict';

    // ================== CONSTANTS ==================
    var TOKEN_KEY = 'akmark_token';
    var SUPABASE_URL = window.SUPABASE_URL || 'https://jnqwvmxuieeelvukhcsq.supabase.co';
    var BLOCKED_PAGE = 'blocked.html';  // Page to show when emulator detected
    var HOME_PAGE = 'home.html';
    var NON_PAGE = 'non.html';
    var LOGIN_CHECKER_ENDPOINT = SUPABASE_URL + '/functions/v1/login-checker';
    var DEVICE_CHECK_ENDPOINT = SUPABASE_URL + '/functions/v1/security-api?action=verify_device';

    // ================== EMULATOR DETECTION (LOCAL VIA ANDROID BRIDGE) ==================
    function getAndroidRiskScore() {
        if (window.Android && typeof window.Android.getEmulatorRisk === 'function') {
            try {
                var score = parseInt(window.Android.getEmulatorRisk());
                return isNaN(score) ? 0 : score;
            } catch (e) {
                return 0;
            }
        }
        return 0;
    }

    // ================== EMULATOR DETECTION (BROWSER HEURISTICS) ==================
    function getBrowserRiskScore() {
        var score = 0;
        var ua = navigator.userAgent.toLowerCase();
        var emulatorKeywords = ['emulator', 'simulator', 'bluestacks', 'nox', 'ldplayer', 'mumu', 'memu', 'genymotion'];
        for (var i = 0; i < emulatorKeywords.length; i++) {
            if (ua.indexOf(emulatorKeywords[i]) !== -1) {
                score += 40;
                break;
            }
        }
        // Check for missing touch support
        if (!('ontouchstart' in window) && !navigator.maxTouchPoints) {
            score += 15;
        }
        // Check screen resolution (many emulators have weird resolutions)
        if (window.screen.width === 320 && window.screen.height === 240) {
            score += 10;
        }
        return score;
    }

    // ================== BLOCK SCREEN ==================
    function showBlockScreen() {
        // Create a simple black screen with message
        document.body.innerHTML = `
            <div style="display:flex; justify-content:center; align-items:center; height:100vh; background:#000; color:#fff; font-family: Arial, sans-serif; text-align:center; padding:20px;">
                <div>
                    <h1 style="font-size:28px;">⛔ Access Denied</h1>
                    <p style="font-size:16px; margin-top:20px;">Your device appears to be an emulator. This app is not allowed on virtual environments.</p>
                    <p style="font-size:14px; color:#888;">If you are on a real device, please restart the app.</p>
                </div>
            </div>
        `;
        // Prevent redirect
        return;
    }

    // ================== CHECK LOGIN & DEVICE ==================
    function checkLoginAndRedirect() {
        // 1. Get local risk scores
        var androidRisk = getAndroidRiskScore();
        var browserRisk = getBrowserRiskScore();
        var combinedRisk = Math.max(androidRisk, browserRisk);

        // If risk is high (>=60), block immediately
        if (combinedRisk >= 60) {
            showBlockScreen();
            return;
        }

        // 2. If token missing – go to non.html (guest)
        var token = localStorage.getItem(TOKEN_KEY);
        if (!token) {
            // Even if no token, we still might want to block emulator, but we already checked risk.
            // However, if risk is between 30-59, we might send a server check.
            // If no token, we can still perform a server-side device check using a guest token? 
            // But for simplicity, if no token and risk <60, go to non.html (guest).
            // But we could also add a server check without token? We'll keep it simple.
            window.location.href = NON_PAGE;
            return;
        }

        // 3. Token exists – verify with backend (login-checker) and device verification
        // First, verify login
        fetch(LOGIN_CHECKER_ENDPOINT, {
            method: 'GET',
            headers: {
                'Authorization': 'Bearer ' + token,
                'Content-Type': 'application/json'
            }
        })
        .then(function(response) {
            return response.text().then(function(text) {
                try { return JSON.parse(text); } catch (e) { throw new Error('Invalid response'); }
            });
        })
        .then(function(data) {
            if (!data.valid) {
                clearSession();
                window.location.href = NON_PAGE;
                return;
            }

            // 4. Login is valid, now check device with server
            // Send device info (risk score, build, model) to security-api
            var deviceInfo = {
                risk_score: combinedRisk,
                build: (window.Android && window.Android.build ? window.Android.build : ''),
                model: (window.Android && window.Android.model ? window.Android.model : '')
            };

            fetch(DEVICE_CHECK_ENDPOINT, {
                method: 'POST',
                headers: {
                    'Authorization': 'Bearer ' + token,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(deviceInfo)
            })
            .then(function(response) {
                return response.json().then(function(json) {
                    return { status: response.status, json: json };
                });
            })
            .then(function(result) {
                if (result.status === 403 || result.json.valid === false) {
                    // Server says emulator – block
                    showBlockScreen();
                    return;
                }
                // Server OK – go to home
                window.location.href = HOME_PAGE;
            })
            .catch(function() {
                // Network error – go to non (or block? We'll go to non)
                clearSession();
                window.location.href = NON_PAGE;
            });
        })
        .catch(function() {
            // Login check failed – clear and go to non
            clearSession();
            window.location.href = NON_PAGE;
        });
    }

    // ================== CLEAR SESSION ==================
    function clearSession() {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem('akmark_refresh_token');
        localStorage.removeItem('akmark_user');
    }

    // ================== INITIALIZE ==================
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', checkLoginAndRedirect);
    } else {
        checkLoginAndRedirect();
    }
})();
