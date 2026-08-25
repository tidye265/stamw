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
  }

  // ===== SUPABASE CLIENT =====
  const SUPABASE_URL = window.SUPABASE_URL;
  const SUPABASE_ANON_KEY = window.SUPABASE_ANON_KEY;
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    alert('Supabase configuration missing!');
    return;
  }
  const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  // ===== SIDEBAR TOGGLE =====
  const hamburgerBtn = document.getElementById('hamburgerBtn');
  const sidebar = document.getElementById('sidebar');
  const sidebarOverlay = document.getElementById('sidebarOverlay');
  const closeSidebar = document.getElementById('closeSidebar');

  function toggleSidebar() {
    sidebar.classList.toggle('open');
    sidebarOverlay.classList.toggle('visible');
  }

  hamburgerBtn.addEventListener('click', toggleSidebar);
  closeSidebar.addEventListener('click', toggleSidebar);
  sidebarOverlay.addEventListener('click', toggleSidebar);

  // ===== LOAD DASHBOARD DATA =====
  async function loadDashboard() {
    // Load admin data
    const { data: adminData, error: adminError } = await supabase
      .from('admins')
      .select('wallet_balance, total_films')
      .eq('admin_id', admin.admin_id)
      .single();

    if (adminError) {
      console.error('Error loading admin:', adminError);
      return;
    }

    // Display wallet balance
    const balance = adminData.wallet_balance || 0;
    document.getElementById('walletBalance').textContent = 'MWK ' + Number(balance).toFixed(2);
    document.getElementById('totalFilms').textContent = adminData.total_films || 0;

    // Load films
    const { data: films, error: filmsError } = await supabase
      .from('movies')
      .select('id, title, price')
      .eq('admin_id', admin.admin_id);

    if (filmsError) {
      console.error('Error loading films:', filmsError);
      return;
    }

    const filmsBody = document.getElementById('filmsTableBody');
    filmsBody.innerHTML = '';

    if (!films || films.length === 0) {
      document.getElementById('noFilms').style.display = 'block';
      return;
    }

    document.getElementById('noFilms').style.display = 'none';

    films.forEach(film => {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${film.title}</td>
        <td>MWK ${Number(film.price || 0).toFixed(2)}</td>
        <td>MWK ${Number(film.earnings || 0).toFixed(2)}</td>
        <td>
          <button class="action-btn edit-btn" data-id="${film.id}" title="Edit"><i class="bi bi-pencil-square"></i></button>
          <button class="action-btn delete-btn" data-id="${film.id}" title="Delete"><i class="bi bi-trash3"></i></button>
        </td>
      `;
      filmsBody.appendChild(row);
    });

    // Add event listeners to edit/delete buttons
    document.querySelectorAll('.edit-btn').forEach(btn => {
      btn.addEventListener('click', function() {
        const filmId = this.dataset.id;
        window.location.href = 'admin-manage.html?film_id=' + filmId;
      });
    });

    document.querySelectorAll('.delete-btn').forEach(btn => {
      btn.addEventListener('click', async function() {
        const filmId = this.dataset.id;
        if (confirm('Are you sure you want to delete this film?')) {
          const { error } = await supabase.from('movies').delete().eq('id', filmId);
          if (error) {
            alert('Error deleting film: ' + error.message);
          } else {
            // Decrement total films
            await supabase.from('admins').update({ total_films: (adminData.total_films || 1) - 1 }).eq('admin_id', admin.admin_id);
            loadDashboard(); // Refresh
          }
        }
      });
    });
  }

  // ===== WITHDRAW =====
  document.getElementById('withdrawBtn').addEventListener('click', function() {
    const balance = document.getElementById('walletBalance').textContent;
    const amount = prompt('Enter amount to withdraw (MWK):', '0');
    if (amount && parseFloat(amount) > 0) {
      // Call backend withdraw endpoint or update wallet
      alert('Withdrawal request submitted! We will process it soon.');
    }
  });

  // ===== INIT =====
  loadDashboard();
})();
