(function() {
    'use strict';

    var TOKEN_KEY = 'akmark_token';
    var selectedMethod = null;
    var amountInput = null;
    var phoneInput = null;

    function getToken() { return localStorage.getItem(TOKEN_KEY); }

    // Skeleton & content toggle
    function showSkeleton() {
        document.getElementById('skeleton').classList.add('show');
        document.getElementById('content').classList.remove('show');
    }

    function showContent() {
        document.getElementById('skeleton').classList.remove('show');
        document.getElementById('content').classList.add('show');
    }

    // Select method
    function selectMethod(method) {
        selectedMethod = method;
        document.querySelectorAll('.method-card').forEach(function(card) {
            card.classList.toggle('selected', card.dataset.method === method);
        });
    }

    // Set quick amount
    function setAmount(amount) {
        if (amountInput) amountInput.value = amount;
    }

    // Status display
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

        // Simulate auth check (replace with real call if needed)
        setTimeout(function() {
            showContent();
        }, 500);
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
            showStatus('Select a deposit method', false);
            return;
        }
        if (!phone || phone.length < 10) {
            showStatus('Enter a valid phone number', false);
            return;
        }

        // Show loading state
        submitBtn.classList.add('loading');
        submitBtn.disabled = true;
        submitText.innerHTML = 'PROCESSING<span class="loading-dots"></span>';
        showStatus('', true);

        try {
            var response = await fetch('https://jnqwvmxuieeelvukhcsq.supabase.co/functions/v1/deposit-api', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + getToken()
                },
                body: JSON.stringify({
                    amount: amount,
                    method: selectedMethod,
                    phone: phone
                })
            });

            var data = await response.json();
            if (!response.ok || !data.success) {
                throw new Error(data.error || 'Deposit failed');
            }

            // Success
            submitBtn.classList.remove('loading');
            submitBtn.disabled = true;
            submitText.textContent = '✅ Deposit Successful';
            showStatus('Money added to your wallet!', true);

            setTimeout(function() {
                window.location.href = 'account.html';
            }, 2000);
        } catch (err) {
            // Error
            submitBtn.classList.remove('loading');
            submitBtn.disabled = false;
            submitText.textContent = 'Deposit';
            showStatus(err.message || 'Server failed', false);
        }
    }

    // ===== EXPOSE FUNCTIONS TO GLOBAL SCOPE =====
    // This fixes the "submitDeposit is not defined" error!
    window.selectMethod = selectMethod;
    window.setAmount = setAmount;
    window.submitDeposit = submitDeposit;

    // Start
    init();
})();
