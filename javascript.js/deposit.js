(function() {
    'use strict';

    var TOKEN_KEY = 'akmark_token';
    var selectedMethod = null;

    function getToken() { return localStorage.getItem(TOKEN_KEY); }

    function selectMethod(method) {
        selectedMethod = method;
        document.querySelectorAll('.method-card').forEach(function(card) {
            card.classList.toggle('selected', card.dataset.method === method);
        });
    }

    function showStatus(msg, success) {
        var statusEl = document.getElementById('statusMessage');
        if (!statusEl) return;
        statusEl.textContent = msg;
        statusEl.className = 'status-message show ' + (success ? 'success' : 'error');
    }

    async function submitDeposit() {
        var amountInput = document.getElementById('amount');
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

            // Redirect to account after 2 seconds
            setTimeout(function() {
                window.location.href = 'account.html';
            }, 2000);
        } catch (err) {
            submitBtn.classList.remove('loading');
            submitText.textContent = 'Deposit';
            showStatus(err.message || 'Server failed', false);
        }
    }

    // Expose selectMethod globally
    window.selectMethod = selectMethod;
})();
