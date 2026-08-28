(function() {
    'use strict';

    var TOKEN_KEY = 'akmark_token';
    var selectedMethod = null;
    var amountInput = null;
    var phoneInput = null;
    var txRef = null; // Stores PayChangu charge ID for polling
    var pollInterval = null;
    var pollTimeout = null;

    function getToken() { return localStorage.getItem(TOKEN_KEY); }

    // Network detection
    function detectNetwork(phone) {
        if (!phone) return null;
        var num = phone.replace(/\D/g, ''); // keep digits only
        if (num.length === 9 && num.charAt(0) === '0') num = num.substring(1); // remove leading 0
        if (num.length === 9 && num.charAt(0) === '0') num = num.substring(1); // for 09...
        // Now num is 9 digits without leading 0? Actually we want 8 or 9?
        // We'll do: if starts with '09', '08' etc.
        // Better: remove any leading 0 first, then check prefix.
        var cleaned = phone.replace(/\D/g, '').replace(/^0/, '');
        // Prefixes (common Malawi)
        // Airtel: 99, 98, 97
        // TNM: 88, 89, 81 (some use 081)
        if (/^99|^98|^97/.test(cleaned)) return 'airtel';
        if (/^88|^89|^81/.test(cleaned)) return 'tnm';
        return null;
    }

    // Select method (manual or auto)
    function selectMethod(method) {
        selectedMethod = method;
        document.querySelectorAll('.method-card').forEach(function(card) {
            card.classList.toggle('selected', card.dataset.method === method);
        });
    }

    // Auto-select based on phone input
    function autoSelectNetwork() {
        var phone = phoneInput.value;
        var detected = detectNetwork(phone);
        if (detected) {
            selectMethod(detected);
        }
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

    // Show content after skeleton (instant if token exists)
    function showContent() {
        document.getElementById('skeleton').classList.remove('show');
        document.getElementById('content').classList.add('show');
    }

    // Initialize
    function init() {
        amountInput = document.getElementById('amount');
        phoneInput = document.getElementById('phoneNumber');

        // Listen to phone input for auto network detection
        phoneInput.addEventListener('input', autoSelectNetwork);

        var token = getToken();
        if (!token) {
            window.location.href = 'login.html';
            return;
        }

        // Show content immediately (no delay)
        showContent();
    }

    // Poll verification status
    function startPolling(txRef) {
        var attempts = 0;
        var maxAttempts = 20; // 20 * 3s = 60s max
        pollInterval = setInterval(function() {
            attempts++;
            if (attempts > maxAttempts) {
                clearInterval(pollInterval);
                pollInterval = null;
                submitBtn.classList.remove('loading');
                submitText.textContent = 'Deposit';
                showStatus('Payment timed out. Check your phone and try again.', false);
                return;
            }
            verifyTransaction(txRef);
        }, 3000);
    }

    // Call verify API
    async function verifyTransaction(txRef) {
        try {
            var response = await fetch('https://jnqwvmxuieeelvukhcsq.supabase.co/functions/v1/deposit-api', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + getToken()
                },
                body: JSON.stringify({ action: 'verify', tx_ref: txRef })
            });

            var data = await response.json();
            if (!response.ok || !data.success) {
                // If error, keep polling? but if error is definite, stop
                if (data.error && data.error.includes('not found')) {
                    clearInterval(pollInterval);
                    submitBtn.classList.remove('loading');
                    submitText.textContent = 'Deposit';
                    showStatus('Transaction not found.', false);
                    return;
                }
                // else continue polling
                return;
            }

            // Success response
            if (data.status === 'success') {
                clearInterval(pollInterval);
                submitBtn.classList.remove('loading');
                submitBtn.disabled = true;
                submitText.textContent = 'DEPOSIT OF ' + Number(amountInput.value).toLocaleString() + ' SUCCESSFUL';
                showStatus('DEPOSIT OF ' + Number(amountInput.value).toLocaleString() + ' SUCCESSFUL', true);
                setTimeout(function() {
                    window.location.href = 'account.html';
                }, 2000);
            } else if (data.status === 'failed') {
                clearInterval(pollInterval);
                submitBtn.classList.remove('loading');
                submitBtn.disabled = false;
                submitText.textContent = 'Deposit';
                showStatus('Payment failed. Please try again.', false);
            }
            // if pending, continue polling
        } catch (err) {
            // network error, continue polling
            console.error('Polling error:', err);
        }
    }

    // Submit deposit
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
            // Auto-detect from phone if not selected
            var detected = detectNetwork(phone);
            if (detected) selectMethod(detected);
            else {
                showStatus('Select a deposit method', false);
                return;
            }
        }
        if (!/^0[89]\d{8}$/.test(phone)) {
            showStatus('Enter a valid phone number (09XXXXXXXX or 08XXXXXXXX)', false);
            return;
        }

        // Show loading state (dots only)
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
                throw new Error(data.error || 'Deposit failed');
            }

            // Store tx_ref and start polling
            txRef = data.tx_ref;
            submitText.textContent = 'PROCESSING';
            submitText.classList.add('loading-dots');
            startPolling(txRef);
        } catch (err) {
            submitBtn.classList.remove('loading');
            submitBtn.disabled = false;
            submitText.textContent = 'Deposit';
            submitText.classList.remove('loading-dots');
            showStatus(err.message || 'Server failed', false);
        }
    }

    // Expose functions
    window.selectMethod = selectMethod;
    window.setAmount = setAmount;
    window.submitDeposit = submitDeposit;

    // Start
    init();
})();
