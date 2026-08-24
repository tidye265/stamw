// admin-manage.js
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
    document.getElementById('adminNameBadge').textContent = admin.full_name;
    document.getElementById('adminNameDisplay') && (document.getElementById('adminNameDisplay').textContent = admin.full_name);
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
  const filmListLoading = document.createElement('div'); // loading indicator

  // ===== SIDEBAR TOGGLE =====
  function openSidebar() {
    sidebar.classList.add('open');
    sidebarOverlay.classList.add('visible');
  }
  function closeSidebarFunc() {
    sidebar.classList.remove('open');
    sidebarOverlay.classList.remove('visible');
  }
  hamburgerBtn.addEventListener('click', openSidebar);
  closeSidebar.addEventListener('click', closeSidebarFunc);
  sidebarOverlay.addEventListener('click', closeSidebarFunc);

  // ===== OPERATION SELECT =====
  operationSelect.addEventListener('change', function() {
    if (this.value === 'continue') {
      filmListContainer.style.display = 'block';
      loadFilms();
    } else {
      filmListContainer.style.display = 'none';
      existingFilmSelect.innerHTML = '';
      // Reset form to empty for new film
      resetForm();
    }
  });

  // ===== LOAD FILMS (Continue) =====
  async function loadFilms() {
    // Show loading
    filmListLoading.className = 'text-center py-2';
    filmListLoading.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Loading films...';
    existingFilmSelect.innerHTML = '';
    existingFilmSelect.appendChild(filmListLoading);

    const { data, error } = await supabase
      .from('movies')
      .select('id, title, genre, year, duration, price, category, featured, description, poster_url');

    if (error) {
      console.error('Error loading films:', error);
      alert('Failed to load films: ' + error.message);
      return;
    }

    // Remove loading
    filmListLoading.remove();

    if (!data || data.length === 0) {
      existingFilmSelect.innerHTML = '<option value="">No films available</option>';
      return;
    }

    // Populate select
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
      resetForm();
      return;
    }

    // Fetch full film details (optional if we already have them, but safer)
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

    // Fill the form
    document.getElementById('filmTitle').value = data.title || '';
    document.getElementById('filmGenre').value = data.genre || '';
    document.getElementById('filmYear').value = data.year || '';
    document.getElementById('filmDuration').value = data.duration || '';
    document.getElementById('filmPrice').value = data.price || '';
    document.getElementById('filmCategory').value = data.category || '';
    document.getElementById('filmFeatured').value = data.featured ? 'true' : 'false';
    document.getElementById('filmDescription').value = data.description || '';
    // Optionally set poster URL
    if (data.poster_url) {
      document.getElementById('posterUrl').value = data.poster_url;
      // Show preview if we have the URL
      const previewImg = document.getElementById('previewImg');
      previewImg.src = data.poster_url;
      document.getElementById('preview').style.display = 'block';
    }
    // Note: We don't populate video file input (can't auto-fill file inputs)
  });

  // ===== RESET FORM =====
  function resetForm() {
    form.reset();
    document.getElementById('charCount') && (document.getElementById('charCount').textContent = '0');
    const preview = document.getElementById('preview');
    preview.style.display = 'none';
    previewImg.src = '';
    // Clear poster URL
    document.getElementById('posterUrl').value = '';
    // Reset operation? Maybe not
  }

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

  // ===== HELPERS =====
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
      btnText.textContent = 'Deploy to Cloudflare';
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
    const posterFileInput = posterFile.files[0];
    const videoFileInput = videoFile.files[0];
    const posterUrlInput = document.getElementById('posterUrl').value.trim();

    // Validation
    if (operation === 'continue' && !filmId) {
      alert('Please select a film to continue.');
      return;
    }
    if (!title || !genre || !year || !duration || !price) {
      alert('Please fill in all required fields.');
      return;
    }

    // Show button loading and progress
    showButtonLoading(true);
    progressWrap.classList.add('visible');
    updateProgress(5, 'Preparing upload...');

    try {
      // ===== 1. Handle Poster (Upload or URL) =====
      let posterUrl = posterUrlInput;

      if (!posterUrl && posterFileInput) {
        // Upload poster to Supabase Storage
        const fileName = `posters/${Date.now()}_${posterFileInput.name.replace(/[^a-z0-9.]/gi, '_')}`;
        const formData = new FormData();
        formData.append('file', posterFileInput);

        updateProgress(15, 'Uploading poster...');
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
        updateProgress(25, 'Poster uploaded! Preparing video...');
      } else if (!posterUrl && !posterFileInput) {
        // If continuing, maybe we already have a poster URL from the selected film; if not, require one
        throw new Error('Please provide a poster (URL or file) or select a film with existing poster.');
      }

      // ===== 2. Call Backend (upload-film-api) =====
      const payload = {
        title, genre, year, duration, quality: 'HD', price, poster_url: posterUrl, category, featured, description
      };
      if (filmId) {
        payload.film_id = filmId; // For update
      }

      updateProgress(35, 'Creating video upload URL...');
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
      try {
        data = JSON.parse(text);
      } catch (err) {
        throw new Error('Invalid server response: ' + text);
      }

      if (!res.ok) {
        throw new Error(data.error || 'Backend failed: ' + text);
      }

      const uploadUrl = data.uploadUrl;
      const videoUid = data.videoUid;

      // ===== 3. Upload Video (if provided) =====
      if (videoFileInput) {
        updateProgress(50, 'Uploading video to Cloudflare...');
        const vRes = await fetch(uploadUrl, {
          method: 'PUT',
          headers: { 'Content-Type': videoFileInput.type, 'x-amz-meta-title': title },
          body: videoFileInput
        });

        if (!vRes.ok) {
          const vt = await vRes.text();
          throw new Error('Video upload failed: ' + vt);
        }
      } else {
        // If no video file provided, we might skip upload (e.g., continue without changing video)
        updateProgress(70, 'Video not changed (using existing)');
      }

      // ===== 4. Success =====
      updateProgress(100, '✔ Upload Successful!');

      setTimeout(() => {
        progressWrap.classList.remove('visible');
        showButtonLoading(false);
        resetForm();
        if (operation === 'continue') {
          // Reload films list to reflect updates
          loadFilms();
        }
      }, 2000);

    } catch (error) {
      updateProgress(0, '❌ ' + error.message);
      console.error(error);
      showButtonLoading(false);
      alert('Error: ' + error.message);
    }
  });

  // ===== INITIAL SIDEBAR TOGGLE =====
  // (Sidebar toggle handled in inline UI script, but we ensure no duplicate)
})();
