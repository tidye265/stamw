(function() {
    'use strict';

    var TOKEN_KEY = 'akmark_token';
    var selectedMethod = null;
    var amountInput = null;
    var phoneInput = null;
    var txRef = null;
    var pollInterval = null;
    var pollTimeout = null;

    function getToken() { return localStorage.getItem(TOKEN_KEY); }

    // ===== NETWORK DETECTION (Handles 9 digits without 0, e.g., 99, 98, 88, 89) =====
    function detectNetwork(phone) {
        if (!phone) return null;
        var cleaned = phone.replace(/\D/g, '').replace(/^0+/, ''); // Remove leading zeros completely
        // TNM: 88, 89, 81, 088, 089, 081
        if (/^(88|89|81)/.test(cleaned)) return 'tnm';
        // Airtel: 99, 98, 97, 099, 098, 097
        if (/^(99|98|97)/.test(cleaned)) return 'airtel';
        return null;
    }

    function selectMethod(method) {
        selectedMethod = method;
        document.querySelectorAll('.method-card').forEach(function(card) {
            card.classList.toggle('selected', card.dataset.method === method);
        });
    }

    function autoSelectNetwork() {
        var detected = detectNetwork(phoneInput.value);
        if (detected) selectMethod(detected);
    }

    function setAmount(amount) {
        if (amountInput) amountInput.value = amount;
    }

    function showStatus(msg, success) {
        var statusEl = document.getElementById('statusMessage');
        if (!statusEl) return;
        statusEl.textContent = msg;
        statusEl.className = 'status-message show ' + (success ? 'success' : 'error');
    }

    function showContent() {
        document.getElementById('skeleton').classList.remove('show');
        document.getElementById('content').classList.add('show');
    }

    // ===== BUTTON RESET FUNCTION (Fixes "Deposit button restore") =====
    function resetButton(button, text) {
        button.classList.remove('loading');
        button.disabled = false;
        text.textContent = 'Deposit';
        text.classList.remove('loading-dots');
    }

    function init() {
        amountInput = document.getElementById('amount');
        phoneInput = document.getElementById('phoneNumber');
        phoneInput.addEventListener('input', autoSelectNetwork);

        var token = getToken();
        if (!token) {
            window.location.href = 'login.html';
            return;
        }
        showContent();
    }

    // ===== POLLING =====
    function startPolling(txRef) {
        var attempts = 0;
        var maxAttempts = 20; // 60 seconds
        pollInterval = setInterval(function() {
            attempts++;
            if (attempts > maxAttempts) {
                clearInterval(pollInterval);
                pollInterval = null;
                resetButton(submitBtn, submitText);
                showStatus('Payment timed out. Check your phone and try again.', false);
                return;
            }
            verifyTransaction(txRef);
        }, 3000);
    }

    async function verifyTransaction(txRef) {
        try {
            var response = await fetch('https://jnqwvmxuieeelvukhcsq.supabase.co/functions/v1/transaction-service', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + getToken()
                },
                body: JSON.stringify({ action: 'verify', tx_ref: txRef })
            });

            var data = await response.json();

            // If HTTP error or API returns success: false, show exact error and reset button
            if (!response.ok || !data.success) {
                clearInterval(pollInterval);
                pollInterval = null;
                resetButton(document.getElementById('submitBtn'), document.getElementById('submitText'));
                showStatus(data.error || 'Verification failed. Please try again.', false);
                return;
            }

            // If API returns success: true
            if (data.status === 'success') {
                clearInterval(pollInterval);
                pollInterval = null;
                document.getElementById('submitBtn').disabled = true;
                document.getElementById('submitText').textContent = 'DEPOSIT OF ' + Number(amountInput.value).toLocaleString() + ' SUCCESSFUL';
                showStatus('DEPOSIT OF ' + Number(amountInput.value).toLocaleString() + ' SUCCESSFUL', true);
                setTimeout(function() {
                    window.location.href = 'account.html';
                }, 2000);
            } else if (data.status === 'failed') {
                clearInterval(pollInterval);
                pollInterval = null;
                resetButton(document.getElementById('submitBtn'), document.getElementById('submitText'));
                showStatus('Payment failed. Please try again.', false);
            }
            // If pending, continue polling
        } catch (err) {
            console.error('Polling error:', err);
            // Network issue: continue polling but don't show error immediately
        }
    }

    // ===== SUBMIT DEPOSIT =====
    async function submitDeposit() {
        var amount = parseFloat(amountInput.value);
        var phone = phoneInput.value.trim();
        var submitBtn = document.getElementById('submitBtn');
        var submitText = document.getElementById('submitText');

        // Validation
        if (!amount || amount < 100 || amount > 100000) {
            showStatus('Enter amount between 100 and 100,000', false);
            return;
        }
        if (!selectedMethod) {
            var detected = detectNetwork(phone);
            if (detected) selectMethod(detected);
            else {
                showStatus('Select a deposit method', false);
                return;
            }
        }
        if (!/^0[89]\d{8}$/.test(phone) && !/^[89]\d{8}$/.test(phone)) { // Accept both 09... and 9...
            showStatus('Enter a valid phone number (09XXXXXXXX or 9XXXXXXXX)', false);
            return;
        }

        // Show loading state
        submitBtn.classList.add('loading');
        submitBtn.disabled = true;
        submitText.textContent = 'PROCESSING';
        submitText.classList.add('loading-dots');
        showStatus('', true);

        try {
            var response = await fetch('https://jnqwvmxuieeelvukhcsq.supabase.co/functions/v1/deposit-api', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + getToken()
                },
                body: JSON.stringify({
                    action: 'initialize',
                    amount: amount,
                    phone: phone,
                    method: selectedMethod
                })
            });

            var data = await response.json();
            if (!response.ok || !data.success) {
                // Reset button on failure
                resetButton(submitBtn, submitText);
                showStatus(data.error || 'Deposit failed. Insufficient funds.', false); // Use exact error
                return;
            }

            // Store tx_ref and start polling
            txRef = data.tx_ref;
            submitText.textContent = 'PROCESSING';
            submitText.classList.add('loading-dots');
            startPolling(txRef);
        } catch (err) {
            // Reset button on network error
            resetButton(submitBtn, submitText);
            showStatus(err.message || 'Server failed. Please try again.', false);
        }
    }

    window.selectMethod = selectMethod;
    window.setAmount = setAmount;
    window.submitDeposit = submitDeposit;

    init();
})();
