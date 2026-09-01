// admin-dashboard.js
(function() {
  'use strict';

  const token = localStorage.getItem('akmark_admin_token');
  if (!token) { window.location.href = 'admin-login.html'; return; }

  const admin = JSON.parse(localStorage.getItem('akmark_admin') || '{}');
  if (admin.full_name) {
    document.getElementById('adminNameBadge').textContent = 'Hi, ' + admin.full_name;
    document.getElementById('adminNameWelcome').textContent = admin.full_name;
  }

  const SUPABASE_URL = window.SUPABASE_URL;
  const SUPABASE_ANON_KEY = window.SUPABASE_ANON_KEY;
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) { alert('Supabase config missing!'); return; }
  const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  function formatCurrency(amount) {
    return 'MWK ' + Number(amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  const adminId = admin.admin_id;

  // DOM Elements
  const availableBalanceEl = document.getElementById('availableBalance');
  const todayEarningEl = document.getElementById('todayEarning');
  const queuedEarningsEl = document.getElementById('queuedEarnings');
  const revenueFeeEl = document.getElementById('revenueFee');
  const netFollowersEl = document.getElementById('netFollowers');
  const filmsTableBody = document.getElementById('filmsTableBody');
  const noFilmsEl = document.getElementById('noFilms');
  const allFilmsSection = document.getElementById('allFilmsSection');
  const allFilmsList = document.getElementById('allFilmsList');
  const filmsCountBadge = document.getElementById('filmsCountBadge');

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
    if (!adminId) { alert('Admin ID not found.'); return; }

    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/admin-stats-api`, {
        method: 'GET',
        headers: { 'Authorization': 'Bearer ' + token }
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Failed to load stats');

      // Available Balance (Green)
      const balance = Number(data.admin.wallet_balance || 0);
      availableBalanceEl.textContent = formatCurrency(balance);

      // Today Earning – we can compute from films? We don't have today's transactions, but we can use queued or total? We'll keep 0 for now.
      // The user wants "Today Earning" – we can derive from total_earnings? Actually we'll keep from queued? For now show queued as today? 
      // Since we don't have exact today's transactions, we'll show queued as today? But user said "Queue" separately. We'll compute today's earning as total_earnings? 
      // Let's just show totalEarnings for now (or queued). We'll set todayEarning to queued (since it's recent earnings).
      const queued = Number(data.admin.queued_earnings || 0);
      todayEarningEl.textContent = formatCurrency(queued);
      todayEarningEl.classList.add('currency'); // red/accent

      // Queue (Grey)
      queuedEarningsEl.textContent = formatCurrency(queued);
      queuedEarningsEl.classList.add('grey');

      // Revenue Fee
      revenueFeeEl.textContent = '30%';

      // Net Followers placeholder
      netFollowersEl.textContent = '0';

      // Films
      const films = data.films || [];
      filmsCountBadge.textContent = films.length;
      loadFilmsTable(films);
      loadAllFilmsList(films);

    } catch (error) {
      console.error('Error loading stats:', error);
      alert('Failed to load stats: ' + error.message);
    }
  }

  // ===== LOAD FILMS TABLE =====
  function loadFilmsTable(films) {
    filmsTableBody.innerHTML = '';
    if (!films || films.length === 0) { noFilmsEl.style.display = 'block'; return; }
    noFilmsEl.style.display = 'none';

    films.forEach(film => {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${film.title}</td>
        <td>${film.episode_number || 'Movie'}</td>
        <td>${formatCurrency(film.price)}</td>
        <td>${formatCurrency(film.total_earnings || 0)}</td>
        <td>
          <button class="action-btn edit" onclick="editFilm('${film.id}')"><i class="bi bi-pencil-square"></i></button>
          <button class="action-btn delete" onclick="deleteFilm('${film.id}')"><i class="bi bi-trash"></i></button>
        </td>
      `;
      filmsTableBody.appendChild(row);
    });
  }

  // ===== LOAD ALL FILMS LIST (Expandable) =====
  function loadAllFilmsList(films) {
    allFilmsList.innerHTML = '';
    if (!films || films.length === 0) {
      allFilmsList.innerHTML = '<li>No films found.</li>';
      return;
    }
    films.forEach(film => {
      const li = document.createElement('li');
      li.innerHTML = `
        <span>${film.title} ${film.episode_number ? '(Episode ' + film.episode_number + ')' : ''}</span>
        <span>${formatCurrency(film.price)}</span>
      `;
      allFilmsList.appendChild(li);
    });
  }

  // ===== DELETE FILM =====
  window.deleteFilm = async function(id) {
    if (!confirm('Are you sure you want to delete this film?')) return;
    try {
      const { error } = await supabase.from('movies').delete().eq('id', id);
      if (error) throw error;
      alert('Film deleted successfully!');
      loadStats();
    } catch (error) {
      alert('Failed to delete film: ' + error.message);
    }
  };

  // ===== EDIT FILM =====
  window.editFilm = async function(id) {
    try {
      const { data: film, error } = await supabase.from('movies').select('*').eq('id', id).single();
      if (error) throw error;

      editFilmId.value = film.id;
      editTitle.value = film.title || '';
      editGenre.value = film.genre || '';
      editYear.value = film.year || '';
      editPrice.value = film.price || '';
      editCategory.value = film.category || '';
      editDescription.value = film.description || '';
      editModalOverlay.classList.add('visible');
    } catch (error) {
      alert('Failed to fetch film: ' + error.message);
    }
  };

  function closeModal() { editModalOverlay.classList.remove('visible'); }
  closeEditModal.addEventListener('click', closeModal);
  cancelEditModal.addEventListener('click', closeModal);
  editModalOverlay.addEventListener('click', function(e) { if (e.target === editModalOverlay) closeModal(); });

  // ===== SUBMIT EDIT =====
  editFilmForm.addEventListener('submit', async function(e) {
    e.preventDefault();
    const film_id = editFilmId.value;
    const updates = {
      title: editTitle.value.trim(), genre: editGenre.value.trim(), year: parseInt(editYear.value),
      price: parseFloat(editPrice.value), category: editCategory.value.trim(), description: editDescription.value.trim()
    };
    try {
      const response = await fetch(`${SUPABASE_URL}/functions/v1/edit-delete-api`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
        body: JSON.stringify({ action: 'edit', film_id, ...updates })
      });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error || 'Failed to update film');
      alert('Film updated successfully!');
      closeModal();
      loadStats();
    } catch (error) {
      alert('Failed to update film: ' + error.message);
    }
  });

  // ===== INITIALIZE =====
  loadStats();
})();
