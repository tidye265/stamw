// admin-manage.js
(function() {
  'use strict';

  // ===== CHECK LOGIN =====
  const token = localStorage.getItem('akmark_admin_token');
  if (!token) {
    window.location.href = 'admin-login.html';
    return;
  }

  // ===== LOAD ADMIN =====
  const admin = JSON.parse(localStorage.getItem('akmark_admin') || '{}');
  if (admin.full_name) {
    document.getElementById('adminNameBadge').textContent = admin.full_name;
    document.getElementById('adminNameDisplay').textContent = admin.full_name; // (if exists in DOM)
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
  const hamburgerBtn = document.getElementById('hamburgerBtn');
  const sidebar = document.getElementById('sidebar');
  const sidebarOverlay = document.getElementById('sidebarOverlay');
  const closeSidebar = document.getElementById('closeSidebar');
  const operationSelect = document.getElementById('operation');
  const filmListContainer = document.getElementById('filmListContainer');
  const existingFilmSelect = document.getElementById('existingFilm');
  const fileDrop = document.getElementById('fileDrop');
  const posterFile = document.getElementById('posterFile');
  const preview = document.getElementById('preview');
  const previewImg = document.getElementById('previewImg');
  const videoDrop = document.getElementById('videoDrop');
  const videoFile = document.getElementById('videoFile');
  const form = document.getElementById('uploadFilmForm');
  const uploadBtn = document.getElementById('uploadBtn');
  const btnSpinner = document.getElementById('btnSpinner');
  const btnIcon = document.getElementById('btnIcon');
  const btnText = document.getElementById('btnText');
  const progressWrap = document.getElementById('progressWrap');
  const progressFill = document.getElementById('progressFill');
  const progressText = document.getElementById('progressText');
  const progressPercent = document.getElementById('progressPercent');

  // ===== SIDEBAR TOGGLE =====
  function openSidebar() {
    sidebar.classList.add('open');
    sidebarOverlay.style.display = 'block';
  }
  function closeSidebarFunc() {
    sidebar.classList.remove('open');
    sidebarOverlay.style.display = 'none';
  }
  hamburgerBtn.addEventListener('click', openSidebar);
  closeSidebar.addEventListener('click', closeSidebarFunc);
  sidebarOverlay.addEventListener('click', closeSidebarFunc);

  // ===== OPERATION SELECT HANDLER =====
  operationSelect.addEventListener('change', function() {
    if (this.value === 'continue') {
      filmListContainer.style.display = 'block';
      loadFilms();
    } else {
      filmListContainer.style.display = 'none';
      existingFilmSelect.innerHTML = '';
    }
  });

  // ===== LOAD FILMS =====
  async function loadFilms() {
    const { data, error } = await supabase
      .from('movies')
      .select('id, title');
    if (error) {
      console.error('Error loading films:', error);
      alert('Failed to load films. Check console.');
      return;
    }
    existingFilmSelect.innerHTML = '<option value="">Select a film</option>';
    data.forEach(film => {
      const option = document.createElement('option');
      option.value = film.id;
      option.textContent = film.title;
      existingFilmSelect.appendChild(option);
    });
  }

  // ===== PRE-FILL FORM WHEN FILM SELECTED =====
  existingFilmSelect.addEventListener('change', async function() {
    const filmId = this.value;
    if (!filmId) {
      // Reset fields if no selection
      document.getElementById('filmTitle').value = '';
      document.getElementById('filmGenre').value = '';
      document.getElementById('filmYear').value = '';
      document.getElementById('filmDuration').value = '';
      document.getElementById('filmPrice').value = '';
      document.getElementById('filmCategory').value = '';
      document.getElementById('filmFeatured').value = 'false';
      document.getElementById('filmDescription').value = '';
      return;
    }
    const { data, error } = await supabase
      .from('movies')
      .select('*')
      .eq('id', filmId)
      .single();
    if (error) {
      console.error('Error fetching film:', error);
      alert('Failed to fetch film details.');
      return;
    }
    document.getElementById('filmTitle').value = data.title || '';
    document.getElementById('filmGenre').value = data.genre || '';
    document.getElementById('filmYear').value = data.year || '';
    document.getElementById('filmDuration').value = data.duration || '';
    document.getElementById('filmPrice').value = data.price || '';
    document.getElementById('filmCategory').value = data.category || '';
    document.getElementById('filmFeatured').value = data.featured ? 'true' : 'false';
    document.getElementById('filmDescription').value = data.description || '';
    // Optionally set poster URL hidden for later use
    // Could show existing poster preview
  });

  // ===== POSTER PREVIEW =====
  fileDrop.addEventListener('click', () => posterFile.click());
  posterFile.addEventListener('change', function() {
    const file = this.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        previewImg.src = e.target.result;
        preview.style.display = 'block';
      };
      reader.readAsDataURL(file);
    }
  });

  // ===== VIDEO FILE =====
  videoDrop.addEventListener('click', () => videoFile.click());

  // ===== HELPER FUNCTIONS =====
  function updateProgress(percent, message) {
    progressFill.style.width = percent + '%';
    progressPercent.textContent = Math.round(percent) + '%';
    progressText.textContent = message;
  }

  function showButtonLoading(loading) {
    if (loading) {
      uploadBtn.disabled = true;
      btnSpinner.style.display = 'inline-block';
      btnIcon.style.display = 'none';
      btnText.textContent = 'Uploading...';
    } else {
      uploadBtn.disabled = false;
      btnSpinner.style.display = 'none';
      btnIcon.style.display = 'inline-block';
      btnText.textContent = 'Upload to Cloudflare';
    }
  }

  // ===== FORM SUBMIT =====
  form.addEventListener('submit', async function(e) {
    e.preventDefault();

    const operation = operationSelect.value;
    const filmId = operation === 'continue' ? existingFilmSelect.value : null;
    const title = document.getElementById('filmTitle').value.trim();
    const genre = document.getElementById('filmGenre').value;
    const year = parseInt(document.getElementById('filmYear').value);
    const duration = parseInt(document.getElementById('filmDuration').value);
    const price = parseFloat(document.getElementById('filmPrice').value);
    const category = document.getElementById('filmCategory').value.trim();
    const featured = document.getElementById('filmFeatured').value === 'true';
    const description = document.getElementById('filmDescription').value.trim();
    const poster = posterFile.files[0];
    const video = videoFile.files[0];

    // Validation
    if (operation === 'continue' && !filmId) {
      alert('Please select a film to continue.');
      return;
    }
    if (!title || !poster || !video) {
      alert('Please fill in title, poster, and video.');
      return;
    }

    // Show loading
    showButtonLoading(true);
    progressWrap.classList.add('visible');
    updateProgress(5, 'Uploading poster...');

    try {
      // ===== 1. UPLOAD POSTER =====
      let posterUrl = '';
      const fileName = `posters/${Date.now()}_${poster.name.replace(/[^a-z0-9.]/gi, '_')}`;
      const formData = new FormData();
      formData.append('file', poster);

      const uploadRes = await fetch(`${SUPABASE_URL}/storage/v1/object/public/posters/${fileName}`, {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer ' + SUPABASE_ANON_KEY,
          'x-upsert': 'true'
        },
        body: formData
      });

      if (!uploadRes.ok) {
        const errText = await uploadRes.text();
        throw new Error('Poster upload failed: ' + errText);
      }

      posterUrl = `${SUPABASE_URL}/storage/v1/object/public/posters/${fileName}`;
      updateProgress(20, 'Poster uploaded! Creating video upload URL...');

      // ===== 2. CALL BACKEND =====
      const payload = {
        title, genre, year, duration, quality: 'HD', price, poster_url: posterUrl, category, featured, description
      };
      if (filmId) {
        payload.film_id = filmId; // for update
      }

      const res = await fetch(`${SUPABASE_URL}/functions/v1/upload-film-api`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + token
        },
        body: JSON.stringify(payload)
      });

      const text = await res.text();
      let data;
      try { data = JSON.parse(text); } catch (err) { throw new Error('Invalid server: ' + text); }

      if (!res.ok) throw new Error(data.error || 'Backend failed: ' + text);

      const uploadUrl = data.uploadUrl;
      updateProgress(30, 'Video upload URL created! Uploading video...');

      // ===== 3. UPLOAD VIDEO =====
      const vRes = await fetch(uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': video.type, 'x-amz-meta-title': title },
        body: video
      });

      if (!vRes.ok) {
        const vt = await vRes.text();
        throw new Error('Video upload failed: ' + vt);
      }

      updateProgress(100, '✔ Upload Successful!');

      setTimeout(() => {
        progressWrap.classList.remove('visible');
        showButtonLoading(false);
        form.reset();
        preview.style.display = 'none';
        posterFile.value = '';
        videoFile.value = '';
        operationSelect.value = 'new';
        filmListContainer.style.display = 'none';
        existingFilmSelect.innerHTML = '';
      }, 2000);

    } catch (error) {
      updateProgress(0, '❌ ' + error.message);
      console.error(error);
      showButtonLoading(false);
      alert('Error: ' + error.message);
    }
  });
})();
