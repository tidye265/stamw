// admin-withdraw.js
(function() {
  'use strict';

  // ===== CHECK LOGIN =====
  const token = localStorage.getItem('akmark_admin_token');
  if (!token) {
    window.location.href = 'admin-login.html';
    return;
  }

  const admin = JSON.parse(localStorage.getItem('akmark_admin') || '{}');
  if (admin.full_name) {
    document.getElementById('adminNameBadge').textContent = 'Hi, ' + admin.full_name;
  }

  // ===== SUPABASE CLIENT =====
  const SUPABASE_URL = window.SUPABASE_URL;
  const SUPABASE_ANON_KEY = window.SUPABASE_ANON_KEY;
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    alert('Supabase configuration missing!');
    return;
  }
  const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  // ===== DOM ELEMENTS =====
  const amountInput = document.getElementById('amount');
  const phoneInput = document.getElementById('phone');
  const agreeTerms = document.getElementById('agreeTerms');
  const submitBtn = document.getElementById('submitBtn');
  const toastContainer = document.getElementById('toastContainer');

  let selectedNetwork = 'tnm'; // default

  // ===== TOAST =====
  function showToast({ type = 'success', title = '', message = '' }) {
    const toast = document.createElement('div');
    toast.className = `custom-toast ${type}`;
    const icon = type === 'success' ? 'bi-check-circle-fill' : 'bi-x-circle-fill';
    toast.innerHTML = `
      <div class="toast-icon"><i class="bi ${icon}"></i></div>
      <div class="toast-content">
        <div class="toast-title">${title}</div>
        <div class="toast-msg">${message}</div>
      </div>
    `;
    toastContainer.appendChild(toast);
    setTimeout(() => {
      toast.style.animation = 'slideOutRight 0.4s ease';
      setTimeout(() => toast.remove(), 400);
    }, 5000);
  }

  // ===== NETWORK SELECTION =====
  window.selectNetwork = function(network) {
    selectedNetwork = network;
    document.querySelectorAll('.network-option').forEach(opt => {
      opt.classList.remove('selected');
    });
    const opt = document.querySelector(`.network-option[data-network="${network}"]`);
    if (opt) opt.classList.add('selected');
  };

  // ===== TERMS MODAL =====
  const termsModal = document.getElementById('termsModal');
  const closeTermsModal = document.getElementById('closeTermsModal');
  const agreeAndClose = document.getElementById('agreeAndClose');
  const termsLink = document.getElementById('termsLink');

  termsLink.addEventListener('click', function(e) {
    e.preventDefault();
    termsModal.style.display = 'flex';
  });
  closeTermsModal.addEventListener('click', function() {
    termsModal.style.display = 'none';
  });
  agreeAndClose.addEventListener('click', function() {
    agreeTerms.checked = true;
    termsModal.style.display = 'none';
    showToast({ type: 'success', title: 'Agreed', message: 'You have agreed to the terms.' });
  });
  termsModal.addEventListener('click', function(e) {
    if (e.target === termsModal) termsModal.style.display = 'none';
  });

  // ===== VALIDATION =====
  function validateForm() {
    const amount = parseFloat(amountInput.value);
    const phone = phoneInput.value.trim();
    const phoneRegex = /^0[89]\d{8}$/; // Malawi numbers start with 09 or 08

    if (isNaN(amount)) { showToast({ type: 'error', title: 'Error', message: 'Please enter a valid amount.' }); return false; }
    if (amount < 100) { showToast({ type: 'error', title: 'Error', message: 'Minimum withdrawal is MWK 100.' }); return false; }
    if (amount > 750000) { showToast({ type: 'error', title: 'Error', message: 'Maximum withdrawal is MWK 750,000.' }); return false; }
    if (!phoneRegex.test(phone)) { showToast({ type: 'error', title: 'Error', message: 'Please enter a valid phone number (e.g. 0991234567).' }); return false; }
    if (!agreeTerms.checked) { showToast({ type: 'error', title: 'Error', message: 'You must agree to the Terms & Conditions.' }); return false; }
    return true;
  }

  // ===== SUBMIT WITHDRAWAL =====
  submitBtn.addEventListener('click', async function() {
    if (!validateForm()) return;

    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span> Processing...';

    const amount = parseFloat(amountInput.value);
    const phone = phoneInput.value.trim();
    const network = selectedNetwork;

    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/admin-withdraw-api`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + token
        },
        body: JSON.stringify({
          admin_id: admin.admin_id,
          amount: amount,
          phone: phone,
          network: network
        })
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Withdrawal failed');
      }

      showToast({
        type: 'success',
        title: 'Withdrawal Successful!',
        message: `MWK ${amount.toLocaleString()} sent to ${network.toUpperCase()} ${phone}.`
      });

      // Reset form
      amountInput.value = '';
      phoneInput.value = '';
      agreeTerms.checked = false;
      submitBtn.disabled = false;
      submitBtn.innerHTML = '<i class="bi bi-send me-2"></i> WITHDRAW';

    } catch (error) {
      console.error('Withdrawal error:', error);
      showToast({ type: 'error', title: 'Error', message: error.message || 'Failed to submit withdrawal request.' });
      submitBtn.disabled = false;
      submitBtn.innerHTML = '<i class="bi bi-send me-2"></i> WITHDRAW';
    }
  });
})();
