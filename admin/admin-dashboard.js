// admin-dashboard.js
(function() {
  'use strict';

  const token = localStorage.getItem('akmark_admin_token');
  if (!token) { window.location.href = 'admin-login.html'; return; }

  const admin = JSON.parse(localStorage.getItem('akmark_admin') || '{}');
  if (admin.full_name) {
    const nameEl = document.getElementById('adminNameBadge');
    if (nameEl) nameEl.textContent = 'Hi, ' + admin.full_name;
    const welcomeEl = document.getElementById('adminNameWelcome');
    if (welcomeEl) welcomeEl.textContent = admin.full_name;
  }

  const SUPABASE_URL = window.SUPABASE_URL;
  const SUPABASE_ANON_KEY = window.SUPABASE_ANON_KEY;
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) { alert('Supabase config missing!'); return; }
  const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  function formatCurrency(amount) {
    return 'MWK ' + Number(amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  const adminId = admin.admin_id;

  // DOM Elements (with null checks)
  const availableBalanceEl = document.getElementById('availableBalance');
  const totalEarningsEl = document.getElementById('totalEarnings');
  const queuedEarningsEl = document.getElementById('queuedEarnings');
  const revenueFeeEl = document.getElementById('revenueFee');
  const netFollowersEl = document.getElementById('netFollowers');
  const filmsTableBody = document.getElementById('filmsTableBody');
  const noFilmsEl = document.getElementById('noFilms');
  const allFilmsSection = document.getElementById('allFilmsSection');
  const allFilmsList = document.getElementById('allFilmsList');
  const filmsCountBadge = document.getElementById('filmsCountBadge');
  const sidebarFilmsCountBadge = document.getElementById('sidebarFilmsCount');
  const earningsChart = document.getElementById('earningsChart');

  const skeletonEl = document.getElementById('skeleton');
  const realContentEl = document.getElementById('realContent');

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

  function showSkeleton() {
    if (skeletonEl) skeletonEl.style.display = 'block';
    if (realContentEl) realContentEl.style.display = 'none';
  }

  function hideSkeleton() {
    if (skeletonEl) skeletonEl.style.display = 'none';
    if (realContentEl) realContentEl.style.display = 'block';
  }

  async function loadStats() {
    if (!adminId) { alert('Admin ID not found.'); return; }

    showSkeleton();

    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/admin-stats-api`, {
        method: 'GET',
        headers: { 'Authorization': 'Bearer ' + token }
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Failed to load stats');

      hideSkeleton();

      // 1. Available Balance
      if (availableBalanceEl) {
        const balance = Number(data.admin.wallet_balance || 0);
        availableBalanceEl.textContent = formatCurrency(balance);
        availableBalanceEl.style.color = 'var(--green-success)';
      }

      // 2. Total Earnings
      if (totalEarningsEl) {
        const totalEarnings = Number(data.total_earnings || 0);
        totalEarningsEl.textContent = formatCurrency(totalEarnings);
        totalEarningsEl.style.color = 'var(--accent-primary)';
      }

      // 3. Queue
      if (queuedEarningsEl) {
        const queuedEarnings = Number(data.admin.queued_earnings || 0);
        queuedEarningsEl.textContent = formatCurrency(queuedEarnings);
        queuedEarningsEl.style.color = 'var(--text-muted)';
      }

      // 4. Revenue Fee
      if (revenueFeeEl) revenueFeeEl.textContent = '30%';

      // 5. Net Followers
      if (netFollowersEl) netFollowersEl.textContent = '0';

      // 6. Films
      const films = data.films || [];
      if (filmsCountBadge) filmsCountBadge.textContent = films.length;
      if (sidebarFilmsCountBadge) sidebarFilmsCountBadge.textContent = films.length;
      loadFilmsTable(films);
      loadAllFilmsList(films);
      renderBarChart(films);

    } catch (error) {
      console.error('Error loading stats:', error);
      hideSkeleton();
      alert('Failed to load stats: ' + error.message);
    }
  }

  // Render bar chart with null check
  function renderBarChart(films) {
    if (!earningsChart) return;
    earningsChart.innerHTML = '';

    if (!films || films.length === 0) {
      earningsChart.innerHTML = '<div style="color:var(--text-muted); text-align:center; width:100%;">No data available</div>';
      return;
    }

    const maxEarnings = Math.max(...films.map(f => Number(f.total_earnings) || 0), 1);

    films.forEach(film => {
      const bar = document.createElement('div');
      bar.className = 'chart-bar';
      const earnings = Number(film.total_earnings) || 0;
      const height = Math.max(2, (earnings / maxEarnings) * 100);
      bar.style.height = height + 'px';

      const label = document.createElement('span');
      label.className = 'chart-bar-label';
      label.textContent = film.title.length > 8 ? film.title.substring(0, 7) + '…' : film.title;

      bar.appendChild(label);
      earningsChart.appendChild(bar);
    });
  }

  function loadFilmsTable(films) {
    if (!filmsTableBody) return;
    filmsTableBody.innerHTML = '';
    if (!films || films.length === 0) { if (noFilmsEl) noFilmsEl.style.display = 'block'; return; }
    if (noFilmsEl) noFilmsEl.style.display = 'none';

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

  function loadAllFilmsList(films) {
    if (!allFilmsList) return;
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
