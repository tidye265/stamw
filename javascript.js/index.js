// index.js
(function() {
  'use strict';

  var SUPABASE_URL = window.SUPABASE_URL;
  var APP_TOKEN_KEY = 'akimark_app_token';

  async function verifyAppProof() {
    // Check for existing token
    var storedToken = localStorage.getItem(APP_TOKEN_KEY);
    if (storedToken) {
      var verifyRes = await fetch(`${SUPABASE_URL}/functions/v1/security-api?action=verify_app_token`, {
        headers: { 'x-app-proof': storedToken }
      });
      var verifyData = await verifyRes.json();
      if (verifyData.valid) return true;
      else localStorage.removeItem(APP_TOKEN_KEY);
    }

    // Get challenge + nonce
    var challengeRes = await fetch(`${SUPABASE_URL}/functions/v1/security-api?action=get_challenge`, {
      method: 'POST'
    });
    var challengeData = await challengeRes.json();
    if (!challengeData.challenge) return false;

    // Call native methods
    if (typeof window.Android === 'undefined') return false;
    var publicKey = window.Android.getPublicKey();
    var signature = window.Android.sign(challengeData.challenge);

    // Get Play Integrity token (asynchronous callback)
    var integrityToken = await new Promise((resolve, reject) => {
      window.onIntegrityResult = (id, token, error) => {
        if (error) reject(error);
        else resolve(token);
      };
      window.Android.getPlayIntegrityToken(challengeData.nonce, 'test');
    });

    // Generate device_id (persist in localStorage)
    var deviceId = localStorage.getItem('akmark_device_id');
    if (!deviceId) {
      deviceId = 'dev-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
      localStorage.setItem('akmark_device_id', deviceId);
    }

    // Verify with backend
    var verifyRes = await fetch(`${SUPABASE_URL}/functions/v1/security-api?action=verify_proof`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        challenge: challengeData.challenge,
        signature: signature,
        public_key: publicKey,
        integrity_token: integrityToken,
        device_id: deviceId
      })
    });
    var verifyData = await verifyRes.json();
    if (verifyData.valid && verifyData.app_token) {
      localStorage.setItem(APP_TOKEN_KEY, verifyData.app_token);
      return true;
    }
    return false;
  }

  function checkLoginAndRedirect() {
    var token = localStorage.getItem('akmark_token');
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
        headers: { 'Authorization': 'Bearer ' + token }
      }).then(r => r.json()).then(data => {
        if (data.valid) window.location.href = 'home.html';
        else { clearSession(); window.location.href = 'non.html'; }
      }).catch(() => { clearSession(); window.location.href = 'non.html'; });
    });
  }

  // ...
})();
