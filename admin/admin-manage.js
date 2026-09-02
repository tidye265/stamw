// admin-manage.js (updated: fixed multi-select population, search filter, and minor bugs)

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
  const filmLoadingIndicator = document.getElementById('filmLoadingIndicator');
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
  const toastContainer = document.getElementById('toastContainer');
  
  const latestCheck = document.getElementById('latestCheck');
  const filmPriceInput = document.getElementById('filmPrice');
  const filmYearInput = document.getElementById('filmYear');
  const filmTitleInput = document.getElementById('filmTitle');
  const filmGenreSelect = document.getElementById('filmGenre');
  const filmCategorySelect = document.getElementById('filmCategory');
  const filmDescriptionInput = document.getElementById('filmDescription');
  const episodeRangeInput = document.getElementById('episodeRange');

  let allFilms = []; // All films by this admin
  let selectedSeriesId = null; // Stores the series_id of the selected existing film (or its own ID if series_id is null)
  let existingPosterUrl = null; // Store existing poster URL when continuing

  // ===== TOAST NOTIFICATION =====
  function showToast({ type = 'success', title = '', message = '' }) {
    const toast = document.createElement('div');
    toast.className = `custom-toast ${type}`;
    const icon = type === 'success' ? 'bi-check-circle-fill' : 'bi-x-circle-fill';
    toast.innerHTML = `
      <div class="toast-icon"><i class="bi ${icon}"></i></div>
      <div class="toast-content">
        <div class="toast-title">${title}</div>
        <div class="toast-msg">${message}</div>
      </div>
    `;
    toastContainer.appendChild(toast);
    setTimeout(() => {
      toast.style.animation = 'slideOutRight 0.4s ease';
      setTimeout(() => toast.remove(), 400);
    }, 5000);
  }

  // ===== HELPER: Set values for multi-select =====
  function setMultiSelectValues(selectElement, valuesArray) {
    // valuesArray is an array of strings (e.g., ['Action', 'Comedy'])
    const options = selectElement.options;
    for (let i = 0; i < options.length; i++) {
      options[i].selected = false;
    }
    if (!valuesArray) return;
    valuesArray.forEach(val => {
      for (let i = 0; i < options.length; i++) {
        if (options[i].value === val) {
          options[i].selected = true;
          break;
        }
      }
    });
  }

  // ===== LOAD FILMS (Group by series_id/title) =====
  async function loadFilms() {
    existingFilmSelect.innerHTML = '';
    filmLoadingIndicator.style.display = 'flex';
    existingFilmSelect.disabled = true;
    existingFilmSearch.disabled = true;

    const { data, error } = await supabase
      .from('movies')
      .select('id, title, series_id')
      .eq('admin_id', admin.admin_id);
    
    filmLoadingIndicator.style.display = 'none';
    existingFilmSelect.disabled = false;
    existingFilmSearch.disabled = false;

    if (error) {
      console.error('Error loading films:', error);
      showToast({ type: 'error', title: 'Error', message: 'Failed to load films: ' + error.message });
      return;
    }

    // Group films by series_id (or id if series_id is null)
    const filmGroups = {};
    (data || []).forEach(film => {
      const key = film.series_id || film.id;
      if (!filmGroups[key]) {
        filmGroups[key] = {
          seriesId: key,
          title: film.title,
          firstFilmId: film.id
        };
      }
    });

    allFilms = Object.values(filmGroups);
    renderFilmOptions(allFilms);
  }

  function renderFilmOptions(films) {
    existingFilmSelect.innerHTML = '<option value="">Select a film</option>';
    films.forEach(film => {
      const option = document.createElement('option');
      option.value = film.firstFilmId;
      option.textContent = film.title;
      existingFilmSelect.appendChild(option);
    });
  }

  // ===== SEARCH FILTER =====
  existingFilmSearch.addEventListener('input', function() {
    const query = this.value.trim().toLowerCase();
    if (!query) {
      renderFilmOptions(allFilms);
      return;
    }
    const filtered = allFilms.filter(film => film.title.toLowerCase().includes(query));
    renderFilmOptions(filtered);
  });

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
      showToast({ type: 'error', title: 'Error', message: 'Failed to fetch film details.' });
      return;
    }
    filmTitleInput.value = data.title || '';
    // Set multi-select values properly
    setMultiSelectValues(filmGenreSelect, data.genre ? data.genre.split(',') : []);
    setMultiSelectValues(filmCategorySelect, data.category ? data.category.split(',') : []);
    filmYearInput.value = data.year || '';
    filmPriceInput.value = data.price || '';
    filmDescriptionInput.value = data.description || '';
    if (latestCheck) latestCheck.checked = data.latest === true;

    // Show existing poster preview and store URL
    if (data.poster_url) {
      previewImg.src = data.poster_url;
      preview.style.display = 'block';
      existingPosterUrl = data.poster_url;
    } else {
      preview.style.display = 'none';
      previewImg.src = '';
      existingPosterUrl = null;
    }
    posterFile.value = ''; // Clear file input (optional new poster)

    // Determine the correct series_id for future episodes
    selectedSeriesId = data.series_id || data.id;
  });

  function resetForm() {
    form.reset();
    preview.style.display = 'none';
    previewImg.src = '';
    existingPosterUrl = null;
    if (latestCheck) latestCheck.checked = true;
    episodeRangeInput.value = '';
    filmPriceInput.value = '';
    selectedSeriesId = null;
    // Clear multi-selects
    setMultiSelectValues(filmGenreSelect, []);
    setMultiSelectValues(filmCategorySelect, []);
    // Clear search input if resetting due to operation change?
    // We'll leave search as is, but if op changes it will clear anyway.
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
    } else {
      // If file cleared, revert to existing poster if available
      if (existingPosterUrl) {
        previewImg.src = existingPosterUrl;
        preview.style.display = 'block';
      } else {
        preview.style.display = 'none';
        previewImg.src = '';
      }
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
        <span class="flex-grow-1 text-truncate">${file.name}</span>
        <span class="mx-2 progress-text" id="progressText_${i}">0%</span>
        <span class="mx-2 progress-bar-custom" style="width:100px; height:6px; background:#333; border-radius:3px;">
          <span class="progress-fill-custom" id="progressFill_${i}" style="width:0%; display:block; height:100%; background:#E11D48; border-radius:3px;"></span>
        </span>
        <button type="button" class="btn btn-sm btn-danger ms-2" onclick="removeFromQueue(${i})">&times;</button>
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
    if (!range) return [null];
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

  // ===== UPLOAD WITH PROGRESS USING XHR =====
  function uploadFileWithProgress(url, file, onProgress, headers = {}) {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('PUT', url, true);
      for (const [key, value] of Object.entries(headers)) {
        xhr.setRequestHeader(key, value);
      }
      xhr.upload.onprogress = function(e) {
        if (e.lengthComputable) {
          const percent = (e.loaded / e.total) * 100;
          onProgress(percent);
        }
      };
      xhr.onload = function() {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve();
        } else {
          reject(new Error('Upload failed: ' + xhr.status));
        }
      };
      xhr.onerror = function() { reject(new Error('Network error during upload')); };
      xhr.send(file);
    });
  }

  // ===== CUSTOM CONFIRMATION MODAL =====
  function showConfirmModal({ title, message, confirmText = 'Confirm', cancelText = 'Cancel' }) {
    return new Promise((resolve) => {
      const modal = document.getElementById('confirmModal');
      const modalTitle = document.getElementById('confirmModalTitle');
      const modalMessage = document.getElementById('confirmModalMessage');
      const confirmBtn = document.getElementById('confirmModalConfirm');
      const cancelBtn = document.getElementById('confirmModalCancel');

      modalTitle.textContent = title;
      modalMessage.textContent = message;
      confirmBtn.textContent = confirmText;
      cancelBtn.textContent = cancelText;

      modal.classList.add('show');
      modal.style.display = 'block';
      document.body.classList.add('modal-open');

      const closeModal = (result) => {
        modal.classList.remove('show');
        modal.style.display = 'none';
        document.body.classList.remove('modal-open');
        confirmBtn.removeEventListener('click', onConfirm);
        cancelBtn.removeEventListener('click', onCancel);
        resolve(result);
      };

      const onConfirm = () => closeModal(true);
      const onCancel = () => closeModal(false);

      confirmBtn.addEventListener('click', onConfirm);
      cancelBtn.addEventListener('click', onCancel);
    });
  }

  // ===== OPERATION CHANGE =====
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

  // ===== FORM SUBMIT =====
  form.addEventListener('submit', async function(e) {
    e.preventDefault();

    const operation = operationSelect.value;
    const filmId = operation === 'continue' ? existingFilmSelect.value : null;
    const title = filmTitleInput.value.trim();
    const year = parseInt(filmYearInput.value);
    const duration = 120;
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
    if (operation === 'continue' && !filmId) { showToast({ type: 'error', title: 'Error', message: 'Please select a film to continue.' }); return; }
    if (!title || !year || !price) { showToast({ type: 'error', title: 'Error', message: 'Please fill in title, year, and price.' }); return; }
    if (queue.length === 0) { showToast({ type: 'error', title: 'Error', message: 'Please select at least one video file.' }); return; }

    // Determine poster URL:
    // If user uploaded a new poster, we'll upload it and use the new URL.
    // If not, and operation is 'continue', we use existingPosterUrl.
    // For 'new' operation, poster is required.
    let finalPosterUrl = existingPosterUrl; // default to existing if any
    if (posterFileInput) {
      // We'll upload the new poster and use it later.
      // But we need to handle failure and fallback to existing.
      finalPosterUrl = null; // will be set after upload
    } else if (operation === 'new' || !existingPosterUrl) {
      showToast({ type: 'error', title: 'Error', message: 'Please upload a poster file.' }); return;
    }

    // Custom confirmation modal
    const confirmMessage = `Are you sure you want to upload ${queue.length} video(s)?\n\nTitle: ${title}\nGenres: ${genres}\nCategories: ${category}\nEpisodes: ${episodeNumbers.length > 1 ? episodeNumbers.join(', ') : 'Movie'}\nPrice: MK ${price}\nLatest: ${latest ? 'Yes' : 'No'}\nPoster: ${posterFileInput ? 'New upload' : 'Existing'}`;
    const confirmed = await showConfirmModal({
      title: 'Confirm Upload',
      message: confirmMessage,
      confirmText: 'Yes, Upload',
      cancelText: 'Cancel'
    });
    if (!confirmed) return;

    showButtonLoading(true);
    progressWrap.classList.add('visible');
    updateProgress(5, 'Preparing upload...');

    // 1. Upload poster if new file provided
    let posterUrl = existingPosterUrl;
    if (posterFileInput) {
      try {
        updateProgress(10, 'Uploading poster...');
        const fileName = `posters/${Date.now()}_${posterFileInput.name.replace(/[^a-z0-9.]/gi, '_')}`;
        const { error: uploadError } = await supabase.storage
          .from('posters')
          .upload(fileName, posterFileInput, { upsert: true, contentType: posterFileInput.type });
        if (uploadError) throw new Error('Poster upload failed: ' + uploadError.message);
        posterUrl = supabase.storage.from('posters').getPublicUrl(fileName).data.publicUrl;
        updateProgress(15, 'Poster uploaded!');
      } catch (err) {
        updateProgress(0, '❌ ' + err.message);
        showToast({ type: 'error', title: 'Upload Failed', message: err.message });
        showButtonLoading(false);
        return;
      }
    } else {
      // No new poster, use existing
      updateProgress(15, 'Using existing poster');
    }

    // Determine series_id
    let seriesId = null;
    const isSeries = (episodeNumbers.length > 1 && episodeNumbers[0] !== null) || (queue.length > 1 && operation === 'new');
    
    if (operation === 'continue') {
      seriesId = selectedSeriesId;
    } else if (isSeries) {
      seriesId = crypto.randomUUID();
      updateProgress(20, `Assigning Series ID: ${seriesId.slice(0,8)}...`);
    }

    // 2. Upload each video and create movie records
    let uploadedCount = 0;
    const totalVideos = queue.length;

    for (let i = 0; i < queue.length; i++) {
      const file = queue[i];
      const episode = episodeNumbers.length > 1 ? episodeNumbers[i] : (i + 1);

      // Update per-file progress UI
      const progressTextEl = document.getElementById(`progressText_${i}`);
      const progressFillEl = document.getElementById(`progressFill_${i}`);
      if (progressTextEl && progressFillEl) {
        progressTextEl.textContent = '0%';
        progressTextEl.classList.remove('text-success', 'text-danger');
        progressFillEl.style.width = '0%';
        progressFillEl.style.background = '#E11D48';
        progressFillEl.parentElement.classList.add('skeleton');
      }

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
        updateProgress(0, '❌ ' + err.message);
        await waitForResume();
        i--;
        continue;
      }

      // STEP 2: Upload video directly to R2 (PUT) with progress
      try {
        await uploadFileWithProgress(uploadUrl, file, (percent) => {
          if (progressTextEl && progressFillEl) {
            progressTextEl.textContent = Math.round(percent) + '%';
            progressFillEl.style.width = percent + '%';
          }
          const overall = ((i + (percent / 100)) / totalVideos) * 100;
          updateProgress(overall, `Uploading ${file.name}...`);
        }, { 'Content-Type': file.type });
      } catch (err) {
        updateProgress(0, '❌ ' + err.message);
        if (progressTextEl && progressFillEl) {
          progressTextEl.textContent = '✖ Failed';
          progressTextEl.classList.add('text-danger');
          progressFillEl.style.background = '#dc3545';
          progressFillEl.style.width = '100%';
        }
        await waitForResume();
        i--;
        continue;
      }

      // STEP 3: Create movie record
      const moviePayload = {
        title, genre: genres, year, duration, quality: 'HD', description,
        price, poster_url: posterUrl, category,
        featured: false, episode_number: episode,
        series_id: seriesId,
        translator_name, latest, video_key: fileKey
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
        if (progressTextEl && progressFillEl) {
          progressTextEl.textContent = '✖ Error';
          progressTextEl.classList.add('text-danger');
          progressFillEl.style.background = '#dc3545';
          progressFillEl.style.width = '100%';
        }
        showToast({ type: 'error', title: 'Create Failed', message: createData.error });
        continue;
      }

      uploadedCount++;
      if (progressTextEl && progressFillEl) {
        progressTextEl.innerHTML = '<i class="bi bi-check-circle-fill text-success"></i> Success';
        progressTextEl.classList.add('text-success');
        progressFillEl.style.background = '#4caf50';
        progressFillEl.style.width = '100%';
      }
      updateProgress(Math.round(((uploadedCount) / totalVideos) * 100), `Uploaded ${uploadedCount}/${totalVideos}`);
    }

    // Success message
    updateProgress(100, '✔ All Uploads Successful!');
    showToast({
      type: 'success',
      title: '🎉 Successfully Uploaded!',
      message: `${uploadedCount} video(s) uploaded successfully${seriesId ? ' (Series ID: ' + seriesId.slice(0,8) + '...)' : ''}`
    });

    setTimeout(() => {
      progressWrap.classList.remove('visible');
      showButtonLoading(false);
      resetForm();
      queue = [];
      renderQueue();
      if (operation === 'continue') loadFilms();
    }, 2000);
  });

  // ===== WAIT FOR RESUME =====
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
