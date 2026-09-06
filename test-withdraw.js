// admin-withdraw.js
(function() {
  'use strict';

  const token = localStorage.getItem('akmark_admin_token');
  if (!token) { window.location.href = 'admin-login.html'; return; }

  const admin = JSON.parse(localStorage.getItem('akmark_admin') || '{}');
  if (admin.full_name) {
    document.getElementById('adminNameBadge').textContent = 'Hi, ' + admin.full_name;
  }

  const SUPABASE_URL = window.SUPABASE_URL;
  const SUPABASE_ANON_KEY = window.SUPABASE_ANON_KEY;
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) { alert('Supabase config missing!'); return; }

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

    // Validation
    if (isNaN(amount) || amount < 100 || amount > 750000) {
      showToast('Please enter a valid amount (min 100, max 750,000).', 'error');
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
      const response = await fetch(`${SUPABASE_URL}/functions/v1/admin-withdraw-api`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + token
        },
        body: JSON.stringify({
          admin_id: admin.admin_id,
          amount: amount,
          phone: phone,
          network: selectedNetwork
        })
      });
      const data = await response.json();

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
