// test-withdraw.js
(function() {
  'use strict';

  const SUPABASE_URL = window.SUPABASE_URL;
  const SUPABASE_ANON_KEY = window.SUPABASE_ANON_KEY;

  let selectedNetwork = 'tnm'; // default

  // DOM Elements
  const amountInput = document.getElementById('amount');
  const phoneInput = document.getElementById('phone');
  const submitBtn = document.getElementById('submitBtn');
  const toastContainer = document.getElementById('toastContainer');

  // Toast function
  function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `custom-toast ${type}`;
    toast.innerHTML = `
      <div class="toast-icon"><i class="bi ${type === 'success' ? 'bi-check-circle-fill' : 'bi-x-circle-fill'}"></i></div>
      <div class="toast-content">
        <div class="toast-title">${type === 'success' ? 'Success' : 'Error'}</div>
        <div class="toast-msg">${message}</div>
      </div>
    `;
    toastContainer.appendChild(toast);
    setTimeout(() => {
      toast.style.animation = 'slideOutRight 0.4s ease';
      setTimeout(() => toast.remove(), 400);
    }, 5000);
  }

  // Network selection
  window.selectNetwork = function(network) {
    selectedNetwork = network;
    document.querySelectorAll('.network-option').forEach(opt => opt.classList.remove('selected'));
    const opt = document.querySelector(`.network-option[data-network="${network}"]`);
    if (opt) opt.classList.add('selected');
  };

  // Submit
  submitBtn.addEventListener('click', async function() {
    const amount = parseFloat(amountInput.value);
    const phone = phoneInput.value.trim();

    // Validation (Zasinthidwa kuti zigwirizane ndi Backend: Min 500, Max 1,000,000)
    if (isNaN(amount) || amount < 500 || amount > 1000000) {
      showToast('Please enter a valid amount (min 500, max 1,000,000).', 'error');
      return;
    }
    if (!/^0[89]\d{8}$/.test(phone)) {
      showToast('Please enter a valid phone number (e.g. 0991234567).', 'error');
      return;
    }

    // Show loading
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span> Processing...';

    try {
      const response = await fetch(`${SUPABASE_URL}/functions/v1/test-api-withdraw`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // ZOFUNIKA: Ma headers awa ndi amene amachotsa vuto la CORS
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
        },
        body: JSON.stringify({
          amount: amount,
          phone: phone,
          network: selectedNetwork
        })
      });

      // Werengani text kaye kuti muteteze ngati server yabweretsa HTML kapena text m'malo mwa JSON
      const responseText = await response.text();
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (e) {
        // Ngati sizinapange JSON, ndiye kuti vuto ndi la pa server (monga CORS kapena 404)
        throw new Error(`Server error (${response.status}). Please check logs.`);
      }

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Withdrawal failed');
      }

      showToast('Withdrawal initiated successfully! Check your phone for confirmation.', 'success');
      amountInput.value = '';
      phoneInput.value = '';
    } catch (error) {
      showToast(error.message || 'Failed to submit withdrawal request.', 'error');
    } finally {
      submitBtn.disabled = false;
      submitBtn.innerHTML = '<i class="bi bi-send me-2"></i> Withdraw';
    }
  });
})();
