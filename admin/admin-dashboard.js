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

  // ===== HELPER: Format Currency =====
  function formatCurrency(amount) {
    return 'MWK ' + Number(amount || 0).toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }

  // ===== DOM ELEMENTS =====
  const adminId = admin.admin_id;
  const availableBalanceEl = document.getElementById('availableBalance');
  const todayEarningEl = document.getElementById('todayEarning');
  const pendingWithdrawEl = document.getElementById('pendingWithdraw');
  const transactionsEl = document.getElementById('transactions');
  const netFollowersEl = document.getElementById('netFollowers');
  const filmsTableBody = document.getElementById('filmsTableBody');
  const noFilmsEl = document.getElementById('noFilms');
  const withdrawBtn = document.getElementById('withdrawBtn');

  // ===== FETCH FILMS AND EARNINGS =====
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
      availableBalanceEl.textContent = formatCurrency(balance);

      // 2. Fetch all films by this admin
      const { data: films, error: filmsError } = await supabase
        .from('movies')
        .select('id, title, episode_number, price')
        .eq('admin_id', adminId);

      if (filmsError) throw filmsError;

      // 3. Fetch all transactions for these films (assume transactions table has film_id)
      const filmIds = (films || []).map(f => f.id);
      let transactionsData = [];
      if (filmIds.length > 0) {
        const { data: txns, error: txnsError } = await supabase
          .from('transactions')
          .select('film_id, amount, status')
          .in('film_id', filmIds);

        if (txnsError) {
          console.warn('Failed to fetch transactions:', txnsError.message);
          // If transactions table doesn't have film_id, fallback to 0
          transactionsData = [];
        } else {
          transactionsData = txns || [];
        }
      }

      // 4. Compute today earning (sum of successful transactions today)
      const today = new Date().toISOString().split('T')[0];
      const todayTxns = transactionsData.filter(t => 
        t.status === 'success' && 
        t.created_at && t.created_at.startsWith(today)
      );
      const todayEarningValue = todayTxns.reduce((sum, t) => sum + (t.amount || 0), 0);
      todayEarningEl.textContent = formatCurrency(todayEarningValue);
      todayEarningEl.classList.remove('red', 'green');
      todayEarningEl.classList.add(todayEarningValue >= 1000 ? 'green' : 'red');

      // 5. Pending Withdrawal = 30% of TOTAL EARNINGS
      const totalEarnings = transactionsData
        .filter(t => t.status === 'success')
        .reduce((sum, t) => sum + (t.amount || 0), 0);
      const pendingFee = totalEarnings * 0.30; // 30%
      pendingWithdrawEl.textContent = formatCurrency(pendingFee);

      // 6. Transactions count (successful)
      const successCount = transactionsData.filter(t => t.status === 'success').length;
      transactionsEl.textContent = successCount;

      // 7. Net Followers (placeholder 0)
      netFollowersEl.textContent = '0';

      // 8. Load films table with earnings per film
      loadFilmsTable(films, transactionsData);

    } catch (error) {
      console.error('Error loading stats:', error);
      alert('Failed to load stats: ' + error.message);
    }
  }

  // ===== LOAD FILMS TABLE (Price vs Earnings) =====
  function loadFilmsTable(films, transactions) {
    filmsTableBody.innerHTML = '';

    if (!films || films.length === 0) {
      noFilmsEl.style.display = 'block';
      return;
    }

    noFilmsEl.style.display = 'none';

    films.forEach(film => {
      // Calculate earnings for this film (sum amount of successful transactions)
      const filmEarnings = transactions
        .filter(t => t.film_id === film.id && t.status === 'success')
        .reduce((sum, t) => sum + (t.amount || 0), 0);

      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${film.title}</td>
        <td>${film.episode_number || 'Movie'}</td>
        <td>${formatCurrency(film.price)}</td>
        <td>${formatCurrency(filmEarnings)}</td>
        <td>
          <button class="action-btn edit" onclick="editFilm('${film.id}')" title="Edit film">
            <i class="bi bi-pencil-square"></i>
          </button>
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

  // ===== EDIT FILM (Redirect to admin-manage with film ID) =====
  window.editFilm = function(id) {
    // Redirect to manage page with film id
    window.location.href = 'admin-manage.html?edit=' + id;
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

    alert('Withdrawal request of MWK ' + numAmount.toLocaleString('en-US', {minimumFractionDigits: 2}) + ' submitted! It will be processed within 24 hours.');
  });

  // ===== INITIALIZE =====
  loadStats();
})();
