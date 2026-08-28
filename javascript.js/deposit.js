(function() {
    'use strict';

    var TOKEN_KEY = 'akmark_token';
    var selectedMethod = null;
    var amountInput = null;

    function getToken() { return localStorage.getItem(TOKEN_KEY); }

    function showSkeleton() {
        document.getElementById('skeleton').classList.add('show');
        document.getElementById('content').classList.remove('show');
    }

    function showContent() {
        document.getElementById('skeleton').classList.remove('show');
        document.getElementById('content').classList.add('show');
    }

    function selectMethod(method) {
        selectedMethod = method;
        document.querySelectorAll('.method-card').forEach(function(card) {
            card.classList.toggle('selected', card.dataset.method === method);
        });
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

    // Initialize
    function init() {
        amountInput = document.getElementById('amount');

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
        var submitBtn = document.getElementById('submitBtn');
        var submitText = document.getElementById('submitText');

        if (!amount || amount <= 0) {
            showStatus('Enter a valid amount', false);
            return;
        }
        if (!selectedMethod) {
            showStatus('Select a deposit method', false);
            return;
        }

        submitBtn.classList.add('loading');
        submitText.textContent = 'Processing...';
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
                    method: selectedMethod
                })
            });

            var data = await response.json();
            if (!response.ok || !data.success) {
                throw new Error(data.error || 'Deposit failed');
            }

            submitBtn.classList.remove('loading');
            submitText.textContent = '✅ Deposit Successful';
            submitBtn.disabled = true;
            showStatus('Money added to your wallet!', true);

            setTimeout(function() {
                window.location.href = 'account.html';
            }, 2000);
        } catch (err) {
            submitBtn.classList.remove('loading');
            submitText.textContent = 'Deposit';
            showStatus(err.message || 'Server failed', false);
        }
    }

    // Expose functions
    window.selectMethod = selectMethod;
    window.setAmount = setAmount;

    // Start
    init();
})();
