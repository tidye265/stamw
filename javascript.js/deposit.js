(function() {
    'use strict';

    var TOKEN_KEY = 'akmark_token';
    var selectedMethod = null;
    var amountInput = null;
    var phoneInput = null;
    var pollInterval = null;

    function getToken() { return localStorage.getItem(TOKEN_KEY); }

    // Detect network based on Malawi phone numbers
    function detectNetwork(phone) {
        // Normalize: remove leading 0 if 9 digits, add 0 if 9 digits without leading 0
        var normalized = phone.replace(/\s/g, '');
        if (normalized.length === 9 && !normalized.startsWith('0')) {
            normalized = '0' + normalized;
        }

        var network = null;
        // Prefixes for TNM: 088, 099, 881, 888, 0999
        if (/^088/.test(normalized) || /^099/.test(normalized) || /^881/.test(normalized) || /^888/.test(normalized) || /^0999/.test(normalized)) {
            network = 'TNM';
        } else if (/^089/.test(normalized) || /^098/.test(normalized) || /^891/.test(normalized) || /^098/.test(normalized)) {
            network = 'AIRTEL';
        }

        if (network) {
            selectMethod(network);
        }
    }

    // Select method
    function selectMethod(method) {
        selectedMethod = method;
        var cards = document.querySelectorAll('.method-card');
        cards.forEach(function(card) {
            card.classList.toggle('selected', card.dataset.method === method);
        });
    }

    // Set quick amount
    function setAmount(amount) {
        if (amountInput) amountInput.value = amount;
    }

    // Show status message
    function showStatus(msg, success) {
        var statusEl = document.getElementById('statusMessage');
        if (!statusEl) return;
        statusEl.textContent = msg;
        statusEl.className = 'status-message show ' + (success ? 'success' : 'error');
    }

    // Initialize
    function init() {
        amountInput = document.getElementById('amount');
        phoneInput = document.getElementById('phoneNumber');

        var token = getToken();
        if (!token) {
            window.location.href = 'login.html';
            return;
        }
        // No skeleton, content visible instantly
    }

    // Submit deposit
    async function submitDeposit() {
        var amount = parseFloat(amountInput.value);
        var phone = phoneInput.value.trim();
        var submitBtn = document.getElementById('submitBtn');
        var submitText = document.getElementById('submitText');

        // Validation
        if (!amount || amount <= 0) {
            showStatus('Enter a valid amount', false);
            return;
        }
        if (!selectedMethod) {
            // Try to auto-detect from phone
            detectNetwork(phone);
            if (!selectedMethod) {
                showStatus('Select a payment method', false);
                return;
            }
        }
        if (!phone || phone.length < 10) {
            showStatus('Enter a valid phone number', false);
            return;
        }

        // Loading state – show only dots
        submitBtn.disabled = true;
        submitText.textContent = '';
        submitText.classList.add('loading-dots');
        showStatus('', true);

        try {
            // 1. Initialize deposit via backend
            var initRes = await fetch('https://jnqwvmxuieeelvukhcsq.supabase.co/functions/v1/deposit-api', {
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

            var initData = await initRes.json();
            if (!initRes.ok || !initData.success) {
                throw new Error(initData.error || 'Initialization failed');
            }

            var txRef = initData.tx_ref;

            // 2. Poll verification until success/failure
            pollInterval = setInterval(async function() {
                try {
                    var verifyRes = await fetch('https://jnqwvmxuieeelvukhcsq.supabase.co/functions/v1/deposit-api', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': 'Bearer ' + getToken()
                        },
                        body: JSON.stringify({
                            action: 'verify',
                            tx_ref: txRef
                        })
                    });

                    var verifyData = await verifyRes.json();
                    if (!verifyRes.ok) {
                        throw new Error(verifyData.error || 'Verification failed');
                    }

                    if (verifyData.success && verifyData.status === 'success') {
                        clearInterval(pollInterval);
                        // Success
                        submitBtn.disabled = true;
                        submitText.classList.remove('loading-dots');
                        submitText.textContent = 'DEPOSIT OF ' + amount.toLocaleString() + ' SUCCESSFUL';
                        submitText.style.color = '#4caf50';
                        showStatus('', true);
                        setTimeout(function() {
                            window.location.href = 'account.html';
                        }, 2000);
                    } else if (verifyData.status === 'failed') {
                        clearInterval(pollInterval);
                        // Failure
                        submitBtn.disabled = false;
                        submitText.classList.remove('loading-dots');
                        submitText.textContent = 'Deposit';
                        submitText.style.color = '';
                        showStatus('Deposit failed. Please try again.', false);
                    }
                    // If pending, keep polling
                } catch (pollErr) {
                    clearInterval(pollInterval);
                    submitBtn.disabled = false;
                    submitText.classList.remove('loading-dots');
                    submitText.textContent = 'Deposit';
                    showStatus(pollErr.message || 'Server error', false);
                }
            }, 3000); // Poll every 3 seconds

        } catch (err) {
            submitBtn.disabled = false;
            submitText.classList.remove('loading-dots');
            submitText.textContent = 'Deposit';
            showStatus(err.message || 'Server failed', false);
        }
    }

    // Expose functions globally
    window.selectMethod = selectMethod;
    window.setAmount = setAmount;
    window.detectNetwork = detectNetwork;
    window.submitDeposit = submitDeposit;

    // Start
    init();
})();
