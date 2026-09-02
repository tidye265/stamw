(function() {
  'use strict';

  const token = localStorage.getItem('akmark_admin_token');
  if (!token) { window.location.href = 'admin-login.html'; return; }

  const admin = JSON.parse(localStorage.getItem('akmark_admin') || '{}');
  const SUPABASE_URL = window.SUPABASE_URL;
  const SUPABASE_ANON_KEY = window.SUPABASE_ANON_KEY;
  const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  let selectedNetwork = 'TNM'; // default

  // Select network
  window.selectNetwork = function(el) {
    document.querySelectorAll('.network-option').forEach(opt => opt.classList.remove('active'));
    el.classList.add('active');
    selectedNetwork = el.dataset.network;
  };

  // Load balance and update calculator
  async function loadBalance() {
    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/admin-stats-api`, {
        method: 'GET',
        headers: { 'Authorization': 'Bearer ' + token }
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Failed to load balance');
      const balance = Number(data.admin.wallet_balance || 0);
      document.getElementById('availableBalance').textContent = 'MWK ' + balance.toLocaleString('en-US', { minimumFractionDigits: 2 });
      updateCalculator();
    } catch (err) {
      console.error('Balance load error:', err);
      document.getElementById('availableBalance').textContent = 'MWK 0.00';
    }
  }

  // Live calculator update
  function updateCalculator() {
    const amount = parseFloat(document.getElementById('amount').value) || 0;
    const youReceive = amount * 0.7;
    const platformFee = amount * 0.3;
    document.getElementById('youReceive').textContent = 'MWK ' + youReceive.toLocaleString('en-US', { minimumFractionDigits: 2 });
    document.getElementById('platformFee').textContent = 'MWK ' + platformFee.toLocaleString('en-US', { minimumFractionDigits: 2 });
  }

  document.getElementById('amount').addEventListener('input', updateCalculator);

  // Submit withdrawal
  document.getElementById('submitBtn').addEventListener('click', async function() {
    const amount = parseFloat(document.getElementById('amount').value);
    const phone = document.getElementById('phone').value.trim();
    const agree = document.getElementById('agreeTerms').checked;

    if (!selectedNetwork) { alert('Please select a network.'); return; }
    if (!amount || amount < 10000) { alert('Minimum amount is MWK 10,000.'); return; }
    if (amount > 750000) { alert('Maximum amount is MWK 750,000.'); return; }
    if (!phone) { alert('Please enter phone number.'); return; }
    if (!agree) { alert('You must agree to the terms and conditions.'); return; }

    // Check balance
    const balanceText = document.getElementById('availableBalance').textContent.replace(/[^0-9.]/g, '');
    const balance = parseFloat(balanceText) || 0;
    if (amount > balance) { alert('Insufficient balance.'); return; }

    const payload = {
      admin_id: admin.admin_id,
      amount: amount,
      phone: phone,
      network: selectedNetwork
    };

    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/admin-withdraw-api`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Withdrawal failed');
      alert('Withdrawal request submitted successfully!');
      document.getElementById('amount').value = '';
      document.getElementById('phone').value = '';
      loadBalance();
    } catch (err) {
      alert('Failed to submit: ' + err.message);
    }
  });

  // Terms modal
  window.showTermsModal = function() {
    const modal = new bootstrap.Modal(document.getElementById('termsModal'));
    modal.show();
  };

  // Init
  loadBalance();
})();
