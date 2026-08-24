// admin-manage.js
(function() {
  'use strict';

  const token = localStorage.getItem('akmark_admin_token');
  if (!token) { window.location.href = 'admin-login.html'; return; }

  const admin = JSON.parse(localStorage.getItem('akmark_admin') || '{}');
  if (admin.full_name) {
    document.getElementById('adminNameBadge').textContent = 'Hi, ' + admin.full_name;
  }

  // Supabase client
  const SUPABASE_URL = window.SUPABASE_URL;
  const SUPABASE_ANON_KEY = window.SUPABASE_ANON_KEY;
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    alert('Supabase configuration missing! Check javascript.js/supabase.js');
    return;
  }
  const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  // DOM elements
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

  // Operation select
  operationSelect.addEventListener('change', function() {
    if (this.value === 'continue') {
      filmListContainer.style.display = 'block';
      loadFilms();
    } else {
      filmListContainer.style.display = 'none';
      existingFilmSelect.innerHTML = '';
      resetForm();
    }
  });

  // Load films
  async function loadFilms() {
    existingFilmSelect.innerHTML = '<option value="">Loading...</option>';
    const { data, error } = await supabase.from('movies').select('id, title, genre, year, duration, price, category, featured, description, poster_url');
    if (error) {
      console.error('Error loading films:', error);
      alert('Failed to load films: ' + error.message);
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

  // Pre-fill form when film selected
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
    document.getElementById('filmFeatured').value = data.featured ? 'true' : 'false';
    document.getElementById('filmDescription').value = data.description || '';
    if (data.poster_url) {
      document.getElementById('posterUrl').value = data.poster_url;
      previewImg.src = data.poster_url;
      preview.style.display = 'block';
    }
  });

  // Reset form
  function resetForm() {
    form.reset();
    document.getElementById('charCount') && (document.getElementById('charCount').textContent = '0');
    preview.style.display = 'none';
    previewImg.src = '';
    document.getElementById('posterUrl').value = '';
  }

  // Poster preview
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

  // Video file
  videoDrop.addEventListener('click', () => videoFile.click());

  // Helpers
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

  // Submit
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

    if (operation === 'continue' && !filmId) {
      alert('Please select a film to continue.');
      return;
    }
    if (!title || !genre || !year || !duration || !price) {
      alert('Please fill in all required fields.');
      return;
    }

    showButtonLoading(true);
    progressWrap.classList.add('visible');
    updateProgress(5, 'Preparing upload...');

    try {
      let posterUrl = posterUrlInput;

      if (!posterUrl && posterFileInput) {
        // Use Supabase JS Client (WORKS) – same as old code
        const fileName = `posters/${Date.now()}_${posterFileInput.name.replace(/[^a-z0-9.]/gi, '_')}`;
        const { error: uploadError } = await supabase.storage
          .from('posters')
          .upload(fileName, posterFileInput, { upsert: true, contentType: posterFileInput.type });

        if (uploadError) {
          throw new Error('Poster upload failed: ' + uploadError.message);
        }

        const { data: pubData } = supabase.storage.from('posters').getPublicUrl(fileName);
        posterUrl = pubData.publicUrl;
        updateProgress(20, 'Poster uploaded! Preparing video...');
      } else if (!posterUrl && !posterFileInput) {
        throw new Error('Please provide a poster (URL or file) or select a film with existing poster.');
      }

      const payload = {
        title, genre, year, duration, quality: 'HD', price, poster_url: posterUrl, category, featured, description
      };
      if (filmId) payload.film_id = filmId;

      updateProgress(35, 'Creating video upload URL...');
      const res = await fetch(`${SUPABASE_URL}/functions/v1/upload-film-api`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
        body: JSON.stringify(payload)
      });

      const text = await res.text();
      let data;
      try { data = JSON.parse(text); } catch (err) { throw new Error('Invalid server response: ' + text); }
      if (!res.ok) throw new Error(data.error || 'Backend failed: ' + text);

      const uploadUrl = data.uploadUrl;
      const videoUid = data.videoUid;

      if (videoFileInput) {
        updateProgress(50, 'Uploading video to Cloudflare...');
        const vRes = await fetch(uploadUrl, {
          method: 'PUT',
          headers: { 'Content-Type': videoFileInput.type, 'x-amz-meta-title': title },
          body: videoFileInput
        });
        if (!vRes.ok) throw new Error('Video upload failed: ' + await vRes.text());
      } else {
        updateProgress(70, 'Video not changed (using existing)');
      }

      updateProgress(100, '✔ Upload Successful!');

      setTimeout(() => {
        progressWrap.classList.remove('visible');
        showButtonLoading(false);
        resetForm();
        if (operation === 'continue') loadFilms();
      }, 2000);

    } catch (error) {
      updateProgress(0, '❌ ' + error.message);
      console.error(error);
      showButtonLoading(false);
      alert('Error: ' + error.message);
    }
  });
})();
