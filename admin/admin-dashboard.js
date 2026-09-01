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
    alert('Supabase configuration missing!');
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
  const revenueFeeEl = document.getElementById('revenueFee');
  const transactionsEl = document.getElementById('transactions');
  const netFollowersEl = document.getElementById('netFollowers');
  const filmsTableBody = document.getElementById('filmsTableBody');
  const noFilmsEl = document.getElementById('noFilms');
  const withdrawBtn = document.getElementById('withdrawBtn');

  // Modal elements
  const editModalOverlay = document.getElementById('editModalOverlay');
  const editFilmId = document.getElementById('editFilmId');
  const editTitle = document.getElementById('editTitle');
  const editGenre = document.getElementById('editGenre');
  const editYear = document.getElementById('editYear');
  const editPrice = document.getElementById('editPrice');
  const editCategory = document.getElementById('editCategory');
  const editDescription = document.getElementById('editDescription');
  const closeEditModal = document.getElementById('closeEditModal');
  const cancelEditModal = document.getElementById('cancelEditModal');
  const editFilmForm = document.getElementById('editFilmForm');

  // ===== FETCH DATA =====
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
        .select('wallet_balance, queued_earnings')
        .eq('admin_id', adminId)
        .single();

      if (adminError) throw adminError;
      const balance = adminData?.wallet_balance || 0;
      const queued = adminData?.queued_earnings || 0;
      availableBalanceEl.textContent = formatCurrency(balance);
      availableBalanceEl.classList.add('green'); // Balance ikhale green

      // 2. Fetch all films by this admin
      const { data: films, error: filmsError } = await supabase
        .from('movies')
        .select('id, title, episode_number, price, total_earnings')
        .eq('admin_id', adminId);

      if (filmsError) throw filmsError;

      // 3. Fetch all transactions for these films
      const filmIds = (films || []).map(f => f.id);
      let transactionsData = [];
      if (filmIds.length > 0) {
        const { data: txns, error: txnsError } = await supabase
          .from('transactions')
          .select('film_id, amount, status, created_at')
          .in('film_id', filmIds);

        if (txnsError) {
          console.warn('Failed to fetch transactions:', txnsError.message);
          transactionsData = [];
        } else {
          transactionsData = txns || [];
        }
      }

      // 4. Compute today earning (successful transactions today)
      const today = new Date().toISOString().split('T')[0];
      const todayTxns = transactionsData.filter(t => 
        t.status === 'success' && 
        t.created_at && t.created_at.startsWith(today)
      );
      const todayEarningValue = todayTxns.reduce((sum, t) => sum + (t.amount || 0), 0);
      todayEarningEl.textContent = formatCurrency(todayEarningValue);
      todayEarningEl.classList.remove('green', 'red');
      todayEarningEl.classList.add(todayEarningValue > 0 ? 'green' : 'red');

      // 5. Revenue Fee = 30%
      revenueFeeEl.textContent = '30%';

      // 6. Transactions count (successful)
      const successCount = transactionsData.filter(t => t.status === 'success').length;
      transactionsEl.textContent = successCount;

      // 7. Net Followers (placeholder)
      netFollowersEl.textContent = '0';

      // 8. Load films table with earnings per film
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
        <td>${formatCurrency(film.price)}</td>
        <td>${formatCurrency(film.total_earnings || 0)}</td>
        <td>
          <button class="action-btn edit" onclick="editFilm('${film.id}')" title="Edit film"><i class="bi bi-pencil-square"></i></button>
          <button class="action-btn delete" onclick="deleteFilm('${film.id}')" title="Delete film"><i class="bi bi-trash"></i></button>
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
      loadStats();
    } catch (error) {
      console.error('Delete error:', error);
      alert('Failed to delete film: ' + error.message);
    }
  };

  // ===== EDIT FILM (Open Modal) =====
  window.editFilm = async function(id) {
    try {
      const { data: film, error } = await supabase
        .from('movies')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;

      // Populate modal
      editFilmId.value = film.id;
      editTitle.value = film.title || '';
      editGenre.value = film.genre || '';
      editYear.value = film.year || '';
      editPrice.value = film.price || '';
      editCategory.value = film.category || '';
      editDescription.value = film.description || '';

      // Show modal
      editModalOverlay.classList.add('visible');
    } catch (error) {
      console.error('Edit fetch error:', error);
      alert('Failed to fetch film details: ' + error.message);
    }
  };

  // ===== CLOSE MODAL =====
  function closeModal() {
    editModalOverlay.classList.remove('visible');
  }

  closeEditModal.addEventListener('click', closeModal);
  cancelEditModal.addEventListener('click', closeModal);
  editModalOverlay.addEventListener('click', function(e) {
    if (e.target === editModalOverlay) closeModal();
  });

  // ===== SUBMIT EDIT =====
  editFilmForm.addEventListener('submit', async function(e) {
    e.preventDefault();

    const film_id = editFilmId.value;
    const updates = {
      title: editTitle.value.trim(),
      genre: editGenre.value.trim(),
      year: parseInt(editYear.value),
      price: parseFloat(editPrice.value),
      category: editCategory.value.trim(),
      description: editDescription.value.trim()
    };

    if (!updates.title || !updates.genre || !updates.year || !updates.price || !updates.category) {
      alert('Please fill all required fields.');
      return;
    }

    try {
      const response = await fetch(`${SUPABASE_URL}/functions/v1/edit-delete-api`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + token
        },
        body: JSON.stringify({ action: 'edit', film_id, ...updates })
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to update film');
      }

      alert('Film updated successfully!');
      closeModal();
      loadStats();
    } catch (error) {
      console.error('Edit submit error:', error);
      alert('Failed to update film: ' + error.message);
    }
  });

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
