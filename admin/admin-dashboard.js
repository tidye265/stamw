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
  const availableBalanceEl = document.getElementById('availableBalance');
  const totalEarningsEl = document.getElementById('totalEarnings');
  const queuedEarningsEl = document.getElementById('queuedEarnings');
  const revenueFeeEl = document.getElementById('revenueFee');
  const netFollowersEl = document.getElementById('netFollowers');
  const filmsTableBody = document.getElementById('filmsTableBody');
  const noFilmsEl = document.getElementById('noFilms');
  const sidebarFilmsCountBadge = document.getElementById('sidebarFilmsCount');
  const earningsChart = document.getElementById('earningsChart');

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

  async function loadStats() {
    if (!adminId) { alert('Admin ID not found.'); return; }

    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/admin-stats-api`, {
        method: 'GET',
        headers: { 'Authorization': 'Bearer ' + token }
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Failed to load stats');

      // Balance
      if (availableBalanceEl) availableBalanceEl.textContent = formatCurrency(data.admin.wallet_balance || 0);
      // Total earnings
      if (totalEarningsEl) totalEarningsEl.textContent = formatCurrency(data.total_earnings || 0);
      // Queue
      if (queuedEarningsEl) queuedEarningsEl.textContent = formatCurrency(data.admin.queued_earnings || 0);
      // Revenue fee
      if (revenueFeeEl) revenueFeeEl.textContent = '30%';
      // Net followers
      if (netFollowersEl) netFollowersEl.textContent = '0';

      // Films
      const films = data.films || [];
      if (sidebarFilmsCountBadge) sidebarFilmsCountBadge.textContent = films.length;
      loadFilmsTable(films);
      renderBarChart(films);

    } catch (error) {
      console.error('Error loading stats:', error);
      alert('Failed to load stats: ' + error.message);
    }
  }

  function renderBarChart(films) {
    if (!earningsChart) return;
    earningsChart.innerHTML = '';
    if (!films || films.length === 0) {
      earningsChart.innerHTML = '<div style="color:var(--text-muted); text-align:center; width:100%;">No data</div>';
      return;
    }
    const maxEarnings = Math.max(...films.map(f => Number(f.total_earnings) || 0), 1);
    films.forEach(film => {
      const bar = document.createElement('div');
      bar.style.flex = '1';
      bar.style.height = Math.max(2, (Number(film.total_earnings) / maxEarnings) * 100) + 'px';
      bar.style.background = 'var(--accent-primary)';
      bar.style.borderRadius = '4px 4px 0 0';
      bar.style.position = 'relative';
      const label = document.createElement('span');
      label.style.position = 'absolute';
      label.style.bottom = '-20px';
      label.style.left = '50%';
      label.style.transform = 'translateX(-50%)';
      label.style.fontSize = '0.6rem';
      label.style.color = 'var(--text-muted)';
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
      editModalOverlay.style.display = 'flex';
    } catch (error) {
      alert('Failed to fetch film: ' + error.message);
    }
  };

  function closeModal() { editModalOverlay.style.display = 'none'; }
  closeEditModal.addEventListener('click', closeModal);
  cancelEditModal.addEventListener('click', closeModal);
  editModalOverlay.addEventListener('click', function(e) { if (e.target === editModalOverlay) closeModal(); });

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

  loadStats();
})();
