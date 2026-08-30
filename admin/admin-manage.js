// admin-manage.js (updated)

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
    alert('Supabase configuration missing!');
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
  
  const priceLabel = document.getElementById('priceLabel');
  const latestCheck = document.getElementById('latestCheck');
  const filmPriceInput = document.getElementById('filmPrice');
  const filmYearInput = document.getElementById('filmYear');
  const filmTitleInput = document.getElementById('filmTitle');
  const filmGenreSelect = document.getElementById('filmGenre');
  const filmCategorySelect = document.getElementById('filmCategory');
  const filmDescriptionInput = document.getElementById('filmDescription');
  const episodeRangeInput = document.getElementById('episodeRange');

  // ===== PRICE LABEL DYNAMIC =====
  function updatePriceLabel() {
    if (operationSelect.value === 'continue') {
      priceLabel.textContent = 'Price per Episode (MWK) *';
    } else {
      priceLabel.textContent = 'Full Price (MWK) *';
    }
  }
  
  updatePriceLabel();
  operationSelect.addEventListener('change', function() {
    updatePriceLabel();
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

  // ===== SEARCH EXISTING FILM =====
  let allFilms = [];

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
    filmTitleInput.value = data.title || '';
    filmGenreSelect.value = data.genre ? data.genre.split(',') : [];
    filmCategorySelect.value = data.category ? data.category.split(',') : [];
    filmYearInput.value = data.year || '';
    filmPriceInput.value = data.price || '';
    filmDescriptionInput.value = data.description || '';
    if (latestCheck) latestCheck.checked = data.latest === true;
    preview.style.display = 'none';
    previewImg.src = '';
    posterFile.value = '';
  });

  function resetForm() {
    form.reset();
    preview.style.display = 'none';
    previewImg.src = '';
    if (latestCheck) latestCheck.checked = true;
    updatePriceLabel();
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

  // ===== MULTI-GENRE & CATEGORY =====
  function getSelectedGenres() {
    return Array.from(document.getElementById('filmGenre').selectedOptions).map(o => o.value).join(',');
  }
  function getSelectedCategories() {
    return Array.from(document.getElementById('filmCategory').selectedOptions).map(o => o.value).join(',');
  }

  // ===== EPISODE RANGE =====
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

  // ===== PROGRESS & BUTTON =====
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
    const title = filmTitleInput.value.trim();
    const year = parseInt(filmYearInput.value);
    const duration = 120; // default duration, you can change
    const price = parseFloat(filmPriceInput.value);
    const category = getSelectedCategories();
    const description = filmDescriptionInput.value.trim();
    const genres = getSelectedGenres();
    const episodeRange = episodeRangeInput.value.trim();
    const posterFileInput = posterFile.files[0];
    const translator_name = admin.full_name || null;
    const latest = latestCheck ? latestCheck.checked : false;

    const episodeNumbers = generateEpisodeNumbers(episodeRange);

    // Validation
    if (operation === 'continue' && !filmId) { alert('Please select a film to continue.'); return; }
    if (!title || !year || !price) { alert('Please fill in title, year, and price.'); return; }
    if (!posterFileInput) { alert('Please upload a poster file.'); return; }
    if (queue.length === 0) { alert('Please select at least one video file.'); return; }

    const verify = confirm(`Are you sure you want to upload ${queue.length} video(s)?\n\nTitle: ${title}\nGenres: ${genres}\nCategories: ${category}\nEpisodes: ${episodeNumbers.length > 1 ? episodeNumbers.join(', ') : 'Movie'}\nPrice: MWK ${price.toFixed(2)}\nLatest: ${latest ? 'Yes' : 'No'}`);
    if (!verify) return;

    showButtonLoading(true);
    progressWrap.classList.add('visible');
    updateProgress(5, 'Preparing upload...');

    // 1. Upload poster to Supabase Storage
    let posterUrl = '';
    if (posterFileInput) {
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
    }

    // 2. Upload each video
    let uploadedCount = 0;
    const totalVideos = queue.length;
    const totalEpisodes = episodeNumbers.length > 1 ? episodeNumbers.length : queue.length;

    for (let i = 0; i < queue.length; i++) {
      const file = queue[i];
      const episode = episodeNumbers.length > 1 ? episodeNumbers[i] : (i + 1);

      updateProgress(Math.round(((i) / totalVideos) * 100), `Uploading ${file.name} (${i+1}/${totalVideos})...`);

      // STEP 1: Get upload URL
      let uploadUrl, fileKey;
      try {
        const res = await fetch(`${SUPABASE_URL}/functions/v1/upload-film-api?action=get_upload_url`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + token
          },
          body: JSON.stringify({ file_name: file.name, file_type: file.type })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to get upload URL');
        uploadUrl = data.uploadUrl;
        fileKey = data.fileKey;
      } catch (err) {
        // Network error handling
        updateProgress(0, '❌ ' + err.message + ' - Click Resume to retry');
        await waitForResume();
        i--; // retry same file
        continue;
      }

      // STEP 2: Upload video directly to R2 (PUT)
      let vRes;
      try {
        vRes = await fetch(uploadUrl, {
          method: 'PUT',
          headers: { 'Content-Type': file.type },
          body: file
        });
      } catch (err) {
        updateProgress(0, '❌ Network error during video upload - Click Resume');
        await waitForResume();
        i--; // retry same file
        continue;
      }

      if (!vRes.ok) {
        const vt = await vRes.text();
        updateProgress(0, '❌ R2 upload failed: ' + vt);
        await waitForResume();
        i--; // retry same file
        continue;
      }

      // STEP 3: Create movie record
      const moviePayload = {
        title, genre: genres, year, duration, quality: 'HD', description,
        price, poster_url: posterUrl, category,
        featured: false, episode_number: episode,
        series_id: filmId || null, translator_name,
        latest, video_key: fileKey
      };

      const createRes = await fetch(`${SUPABASE_URL}/functions/v1/upload-film-api?action=create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + token
        },
        body: JSON.stringify(moviePayload)
      });
      const createData = await createRes.json();
      if (!createRes.ok) {
        alert('Failed to create movie record: ' + createData.error);
        continue; // skip this file, but move to next
      }

      uploadedCount++;
      updateProgress(Math.round(((uploadedCount) / totalVideos) * 100), `Uploaded ${uploadedCount}/${totalVideos}`);
    }

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

  // ===== WAIT FOR RESUME (Network retry) =====
  function waitForResume() {
    return new Promise(resolve => {
      const retryBtn = document.createElement('button');
      retryBtn.textContent = 'Resume Upload';
      retryBtn.className = 'btn btn-warning w-100 mt-2';
      retryBtn.onclick = () => { retryBtn.remove(); resolve(); };
      progressWrap.appendChild(retryBtn);
    });
  }
})();
