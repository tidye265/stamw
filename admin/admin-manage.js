// admin-manage.js
(function() {
  'use strict';

  // ===== CHECK LOGIN =====
  const token = localStorage.getItem('akmark_admin_token');
  if (!token) {
    window.location.href = 'admin-login.html';
    return;
  }

  const admin = JSON.parse(localStorage.getItem('akmark_admin') || '{}');
  if (admin.full_name) {
    document.getElementById('adminNameBadge').textContent = 'Hi, ' + admin.full_name;
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
    document.getElementById('filmTitle').value = data.title || '';
    document.getElementById('filmGenre').value = data.genre || '';
    document.getElementById('filmYear').value = data.year || '';
    document.getElementById('filmDuration').value = data.duration || '';
    document.getElementById('filmPrice').value = data.price || '';
    document.getElementById('filmCategory').value = data.category || '';
    document.getElementById('filmDescription').value = data.description || '';
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
  }

  // ===== POSTER PREVIEW =====
  const fileDrop = document.getElementById('fileDrop');
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

  // ===== VIDEO FILE (Batch) =====
  const videoDrop = document.getElementById('videoDrop');
  videoDrop.addEventListener('click', () => videoFile.click());

  // ===== BATCH QUEUE =====
  let queue = [];
  videoFile.addEventListener('change', function() {
    queue = Array.from(this.files);
    renderQueue();
  });

  function renderQueue() {
    if (queue.length === 0) {
      batchQueue.style.display = 'none';
      return;
    }
    batchQueue.style.display = 'block';
    queueList.innerHTML = queue.map((file, i) => `
      <div class="queue-item d-flex justify-content-between align-items-center p-2 border-bottom">
        <span>${file.name}</span>
        <button type="button" class="btn btn-sm btn-danger" onclick="removeFromQueue(${i})">&times;</button>
      </div>
    `).join('');
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

    const operation = operationSelect.value;
    const filmId = operation === 'continue' ? existingFilmSelect.value : null;
    const title = document.getElementById('filmTitle').value.trim();
    const year = parseInt(document.getElementById('filmYear').value);
    const duration = document.getElementById('filmDuration').value ? parseInt(document.getElementById('filmDuration').value) : null;
    const price = parseFloat(document.getElementById('filmPrice').value);
    const category = document.getElementById('filmCategory').value.trim();
    const description = document.getElementById('filmDescription').value.trim();
    const genres = getSelectedGenres();
    const episodeRange = document.getElementById('episodeRange').value.trim();
    const posterFileInput = posterFile.files[0];
    const posterUrlInput = document.getElementById('posterUrl').value.trim();

    const episodeNumbers = generateEpisodeNumbers(episodeRange);

    // Validation
    if (operation === 'continue' && !filmId) {
      alert('Please select a film to continue.');
      return;
    }
    if (!title || !year || !price) {
      alert('Please fill in title, year, and price.');
      return;
    }
    if (queue.length === 0) {
      alert('Please select at least one video file.');
      return;
    }

    // 2. Preview & Verify
    const verify = confirm(
      `Are you sure you want to upload ${queue.length} video(s)?\n\n` +
      `Title: ${title}\n` +
      `Genres: ${genres}\n` +
      `Episodes: ${episodeNumbers.length > 1 ? episodeNumbers.join(', ') : 'Movie'}\n` +
      `Price: MWK ${price.toFixed(2)}\n` +
      `Translator: ${admin.full_name || 'Admin'}\n` +
      `Mark as Latest: Yes`
    );
    if (!verify) return;

    // Start uploading
    showButtonLoading(true);
    progressWrap.classList.add('visible');
    updateProgress(5, 'Preparing upload...');

    // 1. Upload Poster (if provided)
    let posterUrl = posterUrlInput;
    if (!posterUrl && posterFileInput) {
      try {
        const fileName = `posters/${Date.now()}_${posterFileInput.name.replace(/[^a-z0-9.]/gi, '_')}`;
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

    // 2. Upload each video in batch
    let uploadedCount = 0;
    const totalVideos = queue.length;
    const totalEpisodes = episodeNumbers.length > 1 ? episodeNumbers.length : queue.length;

    for (let i = 0; i < queue.length; i++) {
      const file = queue[i];
      const episode = episodeNumbers.length > 1 ? episodeNumbers[i] : (i + 1); // Assign episode number

      progressText.textContent = `Uploading ${file.name} (${i+1}/${totalVideos})...`;
      updateProgress(Math.round(((i) / totalVideos) * 100), `Uploading ${file.name}...`);

      // Call backend to get upload URL
      // NEW: Added translator_name and latest to payload
      const payload = {
        title, year, duration, price, category, genre: genres, poster_url: posterUrl,
        episode_number: episode, description,
        translator_name: admin.full_name || 'Admin', // New field: admin name as translator
        latest: true // New field: mark as latest for new uploads (or continue)
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
