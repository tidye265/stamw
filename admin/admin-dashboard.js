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

  // ===== HELPER: Format Currency (50,000.00) =====
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
  const revenueFeeEl = document.getElementById('revenueFee');
  const transactionsEl = document.getElementById('transactions');
  const netFollowersEl = document.getElementById('netFollowers');
  const filmsTableBody = document.getElementById('filmsTableBody');
  const noFilmsEl = document.getElementById('noFilms');
  const withdrawBtn = document.getElementById('withdrawBtn');

  // ===== FETCH ALL FILMS BY ADMIN =====
  async function fetchAdminFilms() {
    const { data, error } = await supabase
      .from('movies')
      .select('id, title, episode_number, price')
      .eq('admin_id', adminId);
    if (error) throw error;
    return data || [];
  }

  // ===== FETCH TOTAL EARNINGS FROM PURCHASES =====
  async function fetchTotalEarnings(filmIds) {
    if (!filmIds || filmIds.length === 0) return 0;
    const { data, error } = await supabase
      .from('film_purchases')
      .select('amount')
      .in('film_id', filmIds)
      .eq('status', 'success');
    if (error) throw error;
    return (data || []).reduce((sum, p) => sum + (p.amount || 0), 0);
  }

  // ===== FETCH TRANSACTION COUNT =====
  async function fetchTransactionCount(filmIds) {
    if (!filmIds || filmIds.length === 0) return 0;
    const { count, error } = await supabase
      .from('film_purchases')
      .select('id', { count: 'exact', head: true })
      .in('film_id', filmIds)
      .eq('status', 'success');
    if (error) throw error;
    return count || 0;
  }

  // ===== LOAD STATS =====
  async function loadStats() {
    if (!adminId) {
      console.error('Admin ID missing');
      alert('Admin ID not found. Please login again.');
      return;
    }

    try {
      // 1. Available Balance
      const { data: adminData, error: adminError } = await supabase
        .from('admins')
        .select('wallet_balance')
        .eq('admin_id', adminId)
        .single();

      if (adminError) throw adminError;
      const balance = adminData?.wallet_balance || 0;
      availableBalanceEl.textContent = formatCurrency(balance);

      // 2. Fetch all films by admin
      const films = await fetchAdminFilms();
      const filmIds = films.map(f => f.id);

      // 3. Today Earning (Actual from purchases)
      const todayEarningValue = await fetchTotalEarnings(filmIds);
      todayEarningEl.textContent = formatCurrency(todayEarningValue);
      todayEarningEl.classList.remove('red', 'green');
      if (todayEarningValue >= 1000) {
        todayEarningEl.classList.add('green');
      } else {
        todayEarningEl.classList.add('red');
      }

      // 4. Pending Withdraw (70% of total earnings) + Revenue Fee (30%)
      const revenueFee = todayEarningValue * 0.3;
      const pendingAmount = todayEarningValue * 0.7;
      pendingWithdrawEl.textContent = formatCurrency(pendingAmount);
      revenueFeeEl.textContent = formatCurrency(revenueFee);

      // 5. Transactions count (successful purchases)
      const txCount = await fetchTransactionCount(filmIds);
      transactionsEl.textContent = txCount;

      // 6. Net Followers (placeholder 0 – you can integrate real followers)
      netFollowersEl.textContent = '0';

      // 7. Load films table
      loadFilmsTable(films, filmIds);

    } catch (error) {
      console.error('Error loading stats:', error);
      alert('Failed to load stats: ' + error.message);
    }
  }

  // ===== LOAD FILMS TABLE =====
  function loadFilmsTable(films, filmIds) {
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
        <td>${formatCurrency(film.price)}</td>
        <td id="earnings-${film.id}">MWK 0.00</td>
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
      // Fetch earnings for each film
      fetchSingleFilmEarnings(film.id);
    });
  }

  // ===== FETCH SINGLE FILM EARNINGS =====
  async function fetchSingleFilmEarnings(filmId) {
    const { data, error } = await supabase
      .from('film_purchases')
      .select('amount')
      .eq('film_id', filmId)
      .eq('status', 'success');
    if (error) {
      console.error('Error fetching film earnings:', error);
      return;
    }
    const total = (data || []).reduce((sum, p) => sum + (p.amount || 0), 0);
    const el = document.getElementById('earnings-' + filmId);
    if (el) el.textContent = formatCurrency(total);
  }

  // ===== EDIT FILM (Redirect to admin-manage with film_id) =====
  window.editFilm = function(id) {
    window.location.href = 'admin-manage.html?film_id=' + id;
  };

  // ===== DELETE FILM (Using edit-delete-api) =====
  window.deleteFilm = async function(id) {
    if (!confirm('Are you sure you want to delete this film?')) return;

    try {
      const response = await fetch(`${SUPABASE_URL}/functions/v1/edit-delete-api`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + token
        },
        body: JSON.stringify({ action: 'delete', film_id: id })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Delete failed');

      alert('Film deleted successfully!');
      loadStats();
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

    alert('Withdrawal request of MWK ' + numAmount.toLocaleString('en-US', {minimumFractionDigits: 2}) + ' submitted! It will be processed within 24 hours.');
  });

  // ===== INITIALIZE =====
  loadStats();
})();
