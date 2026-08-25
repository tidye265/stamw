// admin-dashboard.js
(function() {
  'use strict';

  // ===== CHECK LOGIN =====
  const token = localStorage.getItem('akmark_admin_token');
  if (!token) {
    window.location.href = 'admin-login.html';
    return;
  }

  // ===== LOAD ADMIN INFO =====
  const admin = JSON.parse(localStorage.getItem('akmark_admin') || '{}');
  if (admin.full_name) {
    document.getElementById('adminNameBadge').textContent = 'Hi, ' + admin.full_name;
    document.getElementById('adminNameWelcome').textContent = admin.full_name;
  }

  // ===== SUPABASE CLIENT =====
  const SUPABASE_URL = window.SUPABASE_URL;
  const SUPABASE_ANON_KEY = window.SUPABASE_ANON_KEY;
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    alert('Supabase configuration missing! Check javascript.js/supabase.js');
    return;
  }
  const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  // ===== DOM ELEMENTS =====
  const adminId = admin.admin_id; // Ensure admin_id is stored during login
  const availableBalanceEl = document.getElementById('availableBalance');
  const todayEarningEl = document.getElementById('todayEarning');
  const pendingWithdrawEl = document.getElementById('pendingWithdraw');
  const transactionsEl = document.getElementById('transactions');
  const netFollowersEl = document.getElementById('netFollowers');
  const filmsTableBody = document.getElementById('filmsTableBody');
  const noFilmsEl = document.getElementById('noFilms');
  const withdrawBtn = document.getElementById('withdrawBtn');

  // ===== LOAD STATS =====
  async function loadStats() {
    if (!adminId) {
      console.error('Admin ID missing');
      alert('Admin ID not found. Please login again.');
      return;
    }

    try {
      // 1. Available Balance (from admins table)
      const { data: adminData, error: adminError } = await supabase
        .from('admins')
        .select('wallet_balance')
        .eq('admin_id', adminId)
        .single();

      if (adminError) throw adminError;
      const balance = adminData?.wallet_balance || 0;
      availableBalanceEl.textContent = 'MWK ' + Number(balance).toFixed(2);

      // 2. Fetch all films by this admin
      const { data: films, error: filmsError } = await supabase
        .from('movies')
        .select('id, title, episode_number, price')
        .eq('admin_id', adminId);

      if (filmsError) throw filmsError;

      // 3. Today Earning (Sum of all film prices – simplified)
      const totalEarning = (films || []).reduce((sum, film) => sum + (film.price || 0), 0);
      todayEarningEl.textContent = 'MWK ' + Number(totalEarning).toFixed(2);

      // 4. Pending Withdraw (Simplified – 0 for now, replace with actual logic if needed)
      pendingWithdrawEl.textContent = 'MWK 0.00';

      // 5. Transactions count (number of films)
      transactionsEl.textContent = (films || []).length;

      // 6. Net Followers (Simplified – 0, you can replace with actual logic if needed)
      netFollowersEl.textContent = '0';

      // 7. Load films table
      loadFilmsTable(films);

    } catch (error) {
      console.error('Error loading stats:', error);
      alert('Failed to load stats: ' + error.message);
    }
  }

  // ===== LOAD FILMS TABLE =====
  function loadFilmsTable(films) {
    filmsTableBody.innerHTML = '';

    if (!films || films.length === 0) {
      noFilmsEl.style.display = 'block';
      return;
    }

    noFilmsEl.style.display = 'none';

    films.forEach(film => {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${film.title}</td>
        <td>${film.episode_number || 'Movie'}</td>
        <td>MWK ${Number(film.price || 0).toFixed(2)}</td>
        <td style="color:#22C55E; font-weight:600;">MWK ${Number(film.price || 0).toFixed(2)}</td>
        <td>
          <button class="action-btn delete" onclick="deleteFilm('${film.id}')" title="Delete film">
            <i class="bi bi-trash"></i>
          </button>
        </td>
      `;
      filmsTableBody.appendChild(row);
    });
  }

  // ===== DELETE FILM =====
  window.deleteFilm = async function(id) {
    if (!confirm('Are you sure you want to delete this film?')) return;

    try {
      const { error } = await supabase
        .from('movies')
        .delete()
        .eq('id', id);

      if (error) throw error;

      alert('Film deleted successfully!');
      loadStats(); // Reload stats and table
    } catch (error) {
      console.error('Delete error:', error);
      alert('Failed to delete film: ' + error.message);
    }
  };

  // ===== WITHDRAW BUTTON =====
  withdrawBtn.addEventListener('click', function() {
    const amount = prompt('Enter withdrawal amount (MWK):');
    if (!amount) return;

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      alert('Please enter a valid amount.');
      return;
    }

    // Placeholder: You can integrate actual withdrawal logic here (e.g., call an edge function)
    alert('Withdrawal request of MWK ' + numAmount.toFixed(2) + ' submitted! It will be processed within 24 hours.');
  });

  // ===== INITIALIZE =====
  loadStats();
})();
