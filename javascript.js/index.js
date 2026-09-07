// index.js
(function() {
    'use strict';

    var TOKEN_KEY = 'akmark_token';
    var APP_TOKEN_KEY = 'akmark_app_token';
    var SUPABASE_URL = window.SUPABASE_URL || 'https://jnqwvmxuieeelvukhcsq.supabase.co';

    // ===== HELPER: GET CHALLENGE =====
    function getChallenge() {
        return fetch(`${SUPABASE_URL}/functions/v1/security-api?action=get_challenge`, {
            method: 'POST'
        }).then(res => res.json());
    }

    // ===== HELPER: GET PLAY INTEGRITY TOKEN =====
    function getIntegrityToken(nonce) {
        return new Promise((resolve, reject) => {
            if (typeof window.Android === 'undefined' || typeof window.Android.getPlayIntegrityToken !== 'function') {
                reject(new Error('Android interface not available'));
                return;
            }
            // Define a global callback
            window.onIntegrityResult = function(callbackId, token, error) {
                if (error) {
                    reject(new Error(error));
                } else {
                    resolve(token);
                }
            };
            window.Android.getPlayIntegrityToken(nonce, 'callback');
        });
    }

    // ===== SECURITY GATE =====
    async function verifyAppProof() {
        // Check if we already have a valid app token
        var storedToken = localStorage.getItem(APP_TOKEN_KEY);
        if (storedToken) {
            try {
                var verifyRes = await fetch(`${SUPABASE_URL}/functions/v1/security-api?action=verify_app_token`, {
                    headers: { 'x-app-proof': storedToken }
                });
                var verifyData = await verifyRes.json();
                if (verifyData.valid) return true;
                else localStorage.removeItem(APP_TOKEN_KEY);
            } catch(e) {
                localStorage.removeItem(APP_TOKEN_KEY);
            }
        }

        // Request challenge (includes nonce)
        var challengeData = await getChallenge();
        if (!challengeData.challenge || !challengeData.nonce) return false;

        // Ensure Android interface exists
        if (typeof window.Android === 'undefined' || typeof window.Android.registerDevice !== 'function') {
            console.error('App proof required. Only Akimark APK can access this site.');
            return false;
        }

        try {
            // 1. Register device (generates key with challenge, returns publicKey + certChain)
            var regResult = window.Android.registerDevice(challengeData.challenge);
            var regData = JSON.parse(regResult);
            if (regData.error) {
                console.error('Registration error:', regData.error);
                return false;
            }
            var publicKey = regData.public_key;
            var certChain = regData.certificate_chain;

            // 2. Sign the challenge
            var signature = window.Android.sign(challengeData.challenge);

            // 3. Get Play Integrity token (async)
            var integrityToken = await getIntegrityToken(challengeData.nonce);

            // 4. Send everything to backend
            var verifyProofRes = await fetch(`${SUPABASE_URL}/functions/v1/security-api?action=verify_proof`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    challenge: challengeData.challenge,
                    signature: signature,
                    public_key: publicKey,
                    certificate_chain: certChain,
                    integrity_token: integrityToken
                })
            });
            var verifyProofData = await verifyProofRes.json();
            if (verifyProofData.valid && verifyProofData.app_token) {
                localStorage.setItem(APP_TOKEN_KEY, verifyProofData.app_token);
                localStorage.setItem('akmark_device_id', verifyProofData.device_id);
                return true;
            } else {
                console.error('Verification failed:', verifyProofData.error || 'Unknown error');
                return false;
            }
        } catch (err) {
            console.error('Verification error:', err);
            return false;
        }
    }

    // ===== CHECK LOGIN & REDIRECT =====
    function checkLoginAndRedirect() {
        var token = localStorage.getItem(TOKEN_KEY);

        verifyAppProof().then(function(isValid) {
            if (!isValid) {
                window.location.href = 'blocked.html';
                return;
            }

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
        }).catch(function(err) {
            console.error('App proof verification failed:', err);
            window.location.href = 'blocked.html';
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
