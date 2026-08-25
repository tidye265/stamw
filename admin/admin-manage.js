// admin-manage.js
(function() {
  'use strict';

  // ===== SECURITY: SANITIZE INPUT =====
  function sanitizeInput(str) {
    if (!str) return '';
    // Remove HTML tags, trim, and escape special characters
    return String(str).replace(/<[^>]*>/g, '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').trim();
  }

  function sanitizeFileName(name) {
    return String(name).replace(/[^a-zA-Z0-9.\-_]/g, '_').replace(/\.{2,}/g, '.').substring(0, 100);
  }

  // ===== VALIDATE FILE TYPE =====
  const ALLOWED_POSTER_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
  const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/ogg', 'video/quicktime', 'video/x-matroska', 'video/avi', 'video/mpeg', 'video/3gpp'];
  const MAX_POSTER_SIZE = 5 * 1024 * 1024; // 5MB
  const MAX_VIDEO_SIZE = 2 * 1024 * 1024 * 1024; // 2GB

  function validateFileType(file, allowedTypes, typeName) {
    if (!file) return true;
    if (!allowedTypes.includes(file.type)) {
      alert(`Invalid file type. Only ${typeName} files are allowed.`);
      return false;
    }
    return true;
  }

  function validateFileSize(file, maxSize, typeName) {
    if (!file) return true;
    if (file.size > maxSize) {
      alert(`File too large. Maximum ${typeName} size is ${Math.round(maxSize / (1024 * 1024))}MB.`);
      return false;
    }
    return true;
  }

  // ===== CHECK LOGIN =====
  const token = localStorage.getItem('akmark_admin_token');
  if (!token) {
    window.location.href = 'admin-login.html';
    return;
  }

  const admin = JSON.parse(localStorage.getItem('akmark_admin') || '{}');
  if (admin.full_name) {
    document.getElementById('adminNameBadge').textContent = 'Hi, ' + admin.full_name;
  } else {
    document.getElementById('adminNameBadge').textContent = 'Hi, Admin';
  }

  // ===== LOGOUT =====
  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', function() {
      // Call logout endpoint (if exists) or just clear local storage
      const confirmLogout = confirm('Are you sure you want to logout?');
      if (confirmLogout) {
        localStorage.removeItem('akmark_admin_token');
        localStorage.removeItem('akmark_admin');
        window.location.href = 'admin-login.html';
      }
    });
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
  const operationSelect = document.getElementById('operation');
  const filmListContainer = document.getElementById('filmListContainer');
  const existingFilmSelect = document.getElementById('existingFilm');
  const existingFilmSearch = document.getElementById('existingFilmSearch');
  const posterFile = document.getElementById('posterFile');
  const preview = document.getElementById('preview');
  const previewImg = document.getElementById('previewImg');
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
  const batchQueue = document.getElementById('batchQueue');
  const queueList = document.getElementById('queueList');

  // ===== FILE VALIDATION LISTENERS =====
  posterFile.addEventListener('change', function() {
    const file = this.files[0];
    if (file) {
      // Validate type and size
      if (!validateFileType(file, ALLOWED_POSTER_TYPES, 'Image (JPG, PNG, WebP, GIF)')) {
        this.value = '';
        return;
      }
      if (!validateFileSize(file, MAX_POSTER_SIZE, 'Poster')) {
        this.value = '';
        return;
      }
      const reader = new FileReader();
      reader.onload = (e) => {
        previewImg.src = e.target.result;
        preview.style.display = 'block';
      };
      reader.readAsDataURL(file);
    }
  });

  videoFile.addEventListener('change', function() {
    queue = Array.from(this.files);
    // Validate each file
    const validFiles = [];
    for (let i = 0; i < queue.length; i++) {
      const file = queue[i];
      if (!validateFileType(file, ALLOWED_VIDEO_TYPES, 'Video (MP4, WebM, etc.)')) {
        alert(`Skipping invalid file: ${file.name}`);
        continue;
      }
      if (!validateFileSize(file, MAX_VIDEO_SIZE, 'Video')) {
        alert(`Skipping oversized file: ${file.name}`);
        continue;
      }
      validFiles.push(file);
    }
    queue = validFiles;
    renderQueue();
  });

  // ===== 6. SEARCH EXISTING FILM =====
  let allFilms = [];

  operationSelect.addEventListener('change', function() {
    if (this.value === 'continue') {
      filmListContainer.style.display = 'block';
      loadFilms();
    } else {
      filmListContainer.style.display = 'none';
      existingFilmSelect.innerHTML = '';
      existingFilmSearch.value = '';
      resetForm();
    }
  });

  existingFilmSearch.addEventListener('input', function() {
    const q = this.value.toLowerCase();
    const filtered = allFilms.filter(f => f.title.toLowerCase().includes(q));
    renderFilmOptions(filtered);
  });

  async function loadFilms() {
    existingFilmSelect.innerHTML = '<option value="">Loading...</option>';
    const { data, error } = await supabase.from('movies').select('id, title');
    if (error) {
      console.error('Error loading films:', error);
      alert('Failed to load films: ' + error.message);
      return;
    }
    allFilms = data || [];
    renderFilmOptions(allFilms);
  }

  function renderFilmOptions(films) {
    existingFilmSelect.innerHTML = '<option value="">Select a film</option>';
    films.forEach(film => {
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
    const { data, error } = await supabase.from('movies').select('*').eq('id', filmId).single();
    if (error) {
      console.error('Error fetching film:', error);
      alert('Failed to fetch film details.');
      return;
    }
    document.getElementById('filmTitle').value = sanitizeInput(data.title || '');
    document.getElementById('filmGenre').value = data.genre || '';
    document.getElementById('filmYear').value = data.year || '';
    document.getElementById('filmDuration').value = data.duration || '';
    document.getElementById('filmPrice').value = data.price || '';
    document.getElementById('filmCategory').value = data.category || '';
    document.getElementById('filmDescription').value = sanitizeInput(data.description || '');
    if (data.poster_url) {
      document.getElementById('posterUrl').value = data.poster_url;
      previewImg.src = data.poster_url;
      preview.style.display = 'block';
    }
  });

  // ===== RESET FORM =====
  function resetForm() {
    form.reset();
    preview.style.display = 'none';
    previewImg.src = '';
    document.getElementById('posterUrl').value = '';
    document.getElementById('episodeRange').value = '';
    // Keep operation as is
    // Also clear file inputs properly
    posterFile.value = '';
    videoFile.value = '';
    queue = [];
    renderQueue();
  }

  // ===== POSTER PREVIEW =====
  const fileDrop = document.getElementById('fileDrop');
  fileDrop.addEventListener('click', () => posterFile.click());

  // ===== VIDEO FILE (Batch) =====
  const videoDrop = document.getElementById('videoDrop');
  videoDrop.addEventListener('click', () => videoFile.click());

  // ===== BATCH QUEUE =====
  let queue = [];

  function renderQueue() {
    if (queue.length === 0) {
      batchQueue.style.display = 'none';
      return;
    }
    batchQueue.style.display = 'block';
    queueList.innerHTML = queue.map((file, i) => {
      // Calculate size in MB
      const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
      return `
      <div class="queue-item d-flex justify-content-between align-items-center p-2 border-bottom">
        <div class="d-flex flex-column">
          <span class="text-truncate" style="max-width: 200px;">${file.name}</span>
          <small class="text-muted">${sizeMB} MB</small>
        </div>
        <button type="button" class="btn btn-sm btn-danger" onclick="removeFromQueue(${i})">&times;</button>
      </div>
    `;
    }).join('');
  }

  window.removeFromQueue = function(index) {
    queue.splice(index, 1);
    renderQueue();
    if (queue.length === 0) videoFile.value = '';
  };

  // ===== 4. MULTI-GENRE =====
  function getSelectedGenres() {
    const selected = Array.from(document.getElementById('filmGenre').selectedOptions).map(o => o.value);
    return selected.join(',');
  }

  // ===== 3. EPISODE RANGE =====
  function generateEpisodeNumbers(range) {
    if (!range) return [null]; // Movie
    if (range.includes('-')) {
      const [start, end] = range.split('-').map(Number);
      if (isNaN(start) || isNaN(end) || start > end) return [null];
      const nums = [];
      for (let i = start; i <= end; i++) nums.push(i);
      return nums;
    }
    return [Number(range) || null];
  }

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
      btnText.textContent = 'Upload to Server';
    }
  }

  // ===== FORM SUBMIT =====
  form.addEventListener('submit', async function(e) {
    e.preventDefault();

    // 1. Get operation
    const operation = operationSelect.value;
    const filmId = operation === 'continue' ? existingFilmSelect.value : null;

    // 2. Get form values
    const title = sanitizeInput(document.getElementById('filmTitle').value);
    const year = parseInt(document.getElementById('filmYear').value);
    const duration = document.getElementById('filmDuration').value ? parseInt(document.getElementById('filmDuration').value) : null;
    const price = parseFloat(document.getElementById('filmPrice').value);
    const category = sanitizeInput(document.getElementById('filmCategory').value);
    const description = sanitizeInput(document.getElementById('filmDescription').value);
    const genres = getSelectedGenres();
    const episodeRange = document.getElementById('episodeRange').value.trim();
    const posterFileInput = posterFile.files[0];
    const posterUrlInput = document.getElementById('posterUrl').value.trim();

    // 3. Generate episode numbers
    const episodeNumbers = generateEpisodeNumbers(episodeRange);

    // 4. Validation
    if (operation === 'continue' && !filmId) {
      alert('Please select a film to continue.');
      return;
    }
    if (!title) {
      alert('Please fill in title.');
      return;
    }
    if (!year || isNaN(year) || year < 1900 || year > new Date().getFullYear() + 1) {
      alert('Please enter a valid year.');
      return;
    }
    if (!price || isNaN(price) || price < 0) {
      alert('Please enter a valid price.');
      return;
    }
    if (!category) {
      alert('Please fill in category.');
      return;
    }
    if (queue.length === 0) {
      alert('Please select at least one video file.');
      return;
    }

    // 5. Preview & Verify
    const verify = confirm(
      `Are you sure you want to upload ${queue.length} video(s)?\n\n` +
      `Title: ${title}\n` +
      `Genres: ${genres}\n` +
      `Episodes: ${episodeNumbers.length > 1 ? episodeNumbers.join(', ') : 'Movie'}\n` +
      `Price: MWK ${price.toFixed(2)}\n` +
      `Category: ${category}`
    );
    if (!verify) return;

    // Start uploading
    showButtonLoading(true);
    progressWrap.classList.add('visible');
    updateProgress(5, 'Preparing upload...');

    // 6. Upload Poster (if provided)
    let posterUrl = posterUrlInput;
    if (!posterUrl && posterFileInput) {
      try {
        const safeFileName = sanitizeFileName(posterFileInput.name);
        const fileName = `posters/${Date.now()}_${safeFileName}`;
        const { error: uploadError } = await supabase.storage
          .from('posters')
          .upload(fileName, posterFileInput, { upsert: true, contentType: posterFileInput.type });
        if (uploadError) throw new Error('Poster upload failed: ' + uploadError.message);
        posterUrl = supabase.storage.from('posters').getPublicUrl(fileName).data.publicUrl;
        updateProgress(15, 'Poster uploaded!');
      } catch (err) {
        updateProgress(0, '❌ ' + err.message);
        alert(err.message);
        showButtonLoading(false);
        return;
      }
    } else if (!posterUrl && operation === 'new') {
      alert('Please provide a poster (URL or file) for new film.');
      return;
    }

    // 7. Upload each video in batch
    let uploadedCount = 0;
    const totalVideos = queue.length;
    const totalEpisodes = episodeNumbers.length > 1 ? episodeNumbers.length : queue.length;

    for (let i = 0; i < queue.length; i++) {
      const file = queue[i];
      const episode = episodeNumbers.length > 1 ? episodeNumbers[i] : (i + 1); // Assign episode number

      progressText.textContent = `Uploading ${file.name} (${i+1}/${totalVideos})...`;
      updateProgress(Math.round(((i) / totalVideos) * 100), `Uploading ${file.name}...`);

      // Call backend to get upload URL
      const payload = {
        title, year, duration, price, category, genre: genres, poster_url: posterUrl,
        episode_number: episode, description
      };
      if (filmId) payload.film_id = filmId;
      else payload.series_id = null;

      // If first video, create film. If continuing, update.
      // For simplicity, we'll create a new film for each episode unless continuing existing series.

      let res;
      try {
        res = await fetch(`${SUPABASE_URL}/functions/v1/upload-film-api`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + token
          },
          body: JSON.stringify(payload)
        });
      } catch (networkErr) {
        // 8. NETWORK RESUME
        progressText.textContent = 'Network error! Pausing... Click "Resume" to continue.';
        await new Promise(resolve => {
          const retryBtn = document.createElement('button');
          retryBtn.textContent = 'Resume Upload';
          retryBtn.className = 'btn btn-warning w-100 mt-2';
          retryBtn.onclick = () => { retryBtn.remove(); resolve(); };
          progressWrap.appendChild(retryBtn);
        });
        // Retry
        res = await fetch(`${SUPABASE_URL}/functions/v1/upload-film-api`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + token
          },
          body: JSON.stringify(payload)
        });
      }

      const text = await res.text();
      let data;
      try { data = JSON.parse(text); } catch (err) { throw new Error('Invalid server: ' + text); }
      if (!res.ok) throw new Error(data.error || 'Backend failed: ' + text);

      const uploadUrl = data.uploadUrl;

      // Upload video to Cloudflare
      progressText.textContent = `Uploading video ${i+1}/${totalVideos}...`;
      let vRes;
      try {
        vRes = await fetch(uploadUrl, {
          method: 'PUT',
          headers: { 'Content-Type': file.type, 'x-amz-meta-title': title },
          body: file
        });
      } catch (networkErr) {
        progressText.textContent = 'Network error during video upload! Pausing... Click "Resume" to continue.';
        await new Promise(resolve => {
          const retryBtn = document.createElement('button');
          retryBtn.textContent = 'Resume Upload';
          retryBtn.className = 'btn btn-warning w-100 mt-2';
          retryBtn.onclick = () => { retryBtn.remove(); resolve(); };
          progressWrap.appendChild(retryBtn);
        });
        vRes = await fetch(uploadUrl, {
          method: 'PUT',
          headers: { 'Content-Type': file.type, 'x-amz-meta-title': title },
          body: file
        });
      }

      if (!vRes.ok) {
        const vt = await vRes.text();
        throw new Error('Video upload failed: ' + vt);
      }

      uploadedCount++;
      updateProgress(Math.round(((uploadedCount) / totalVideos) * 100), `Uploaded ${uploadedCount}/${totalVideos}`);
    }

    // Done
    updateProgress(100, '✔ All Uploads Successful!');
    alert(`Batch upload completed! ${uploadedCount} video(s) uploaded.`);

    setTimeout(() => {
      progressWrap.classList.remove('visible');
      showButtonLoading(false);
      resetForm();
      queue = [];
      renderQueue();
      if (operation === 'continue') loadFilms();
    }, 2000);
  });
})();
