// admin-manage.js
(function() {
  'use strict';

  const token = localStorage.getItem('akmark_admin_token');
  if (!token) { window.location.href = 'admin-login.html'; return; }

  const admin = JSON.parse(localStorage.getItem('akmark_admin') || '{}');
  if (admin.full_name) {
    document.getElementById('adminNameDisplay').textContent = admin.full_name;
  }

  // ===== Supabase Config =====
  const SUPABASE_URL = window.SUPABASE_URL;
  const SUPABASE_ANON_KEY = window.SUPABASE_ANON_KEY;

  // Check if Supabase client loaded
  if (!window.supabase) {
    alert('Supabase JS Client not loaded! Check CDN.');
    return;
  }
  const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  // ===== DOM Elements =====
  const fileDrop = document.getElementById('fileDrop');
  const posterFile = document.getElementById('posterFile');
  const preview = document.getElementById('preview');
  const previewImg = document.getElementById('previewImg');
  const videoDrop = document.getElementById('videoDrop');
  const videoFile = document.getElementById('videoFile');
  const form = document.getElementById('uploadFilmForm');
  const uploadBtn = document.getElementById('uploadBtn');
  const progressWrap = document.getElementById('progressWrap');
  const progressFill = document.getElementById('progressFill');
  const progressText = document.getElementById('progressText');

  // ===== Helpers =====
  function updateProgress(percent, message) {
    progressFill.style.width = percent + '%';
    progressText.textContent = message;
  }

  function showError(error) {
    let message = error.message || 'Unknown error';
    updateProgress(0, '❌ ' + message);
    console.error('Upload error:', error);
    alert('Error: ' + message);
  }

  function sanitizeFileName(name) {
    return name.replace(/[^a-z0-9.]/gi, '_').toLowerCase();
  }

  // ===== Poster Preview =====
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

  // ===== Video File =====
  videoDrop.addEventListener('click', () => videoFile.click());

  // ===== Form Submit =====
  form.addEventListener('submit', async function(e) {
    e.preventDefault();

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

    if (!poster || !video || !title) {
      alert('Please select a poster and a video file.');
      return;
    }

    uploadBtn.disabled = true;
    progressWrap.classList.add('visible');
    updateProgress(5, 'Uploading poster...');

    try {
      // ===== 1. Upload Poster via Supabase Client =====
      const fileName = `posters/${Date.now()}_${sanitizeFileName(poster.name)}`;

      const { error: uploadError } = await supabase.storage
        .from('posters')
        .upload(fileName, poster, {
          upsert: true,
          cacheControl: '3600',
          contentType: poster.type
        });

      if (uploadError) {
        // Custom error for missing bucket
        if (uploadError.message.includes('Bucket not found')) {
          throw new Error('Bucket "posters" not found! Ensure bucket name is "posters" (lowercase) and set to Public.');
        }
        throw new Error('Poster upload failed: ' + uploadError.message);
      }

      // Get public URL
      const { data: pubData } = supabase.storage.from('posters').getPublicUrl(fileName);
      const posterUrl = pubData.publicUrl;

      updateProgress(20, 'Poster uploaded! Creating video upload URL...');

      // ===== 2. Call Backend (upload-film-api) =====
      const response = await fetch(`${SUPABASE_URL}/functions/v1/upload-film-api`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + token
        },
        body: JSON.stringify({
          title, genre, year, duration, quality: 'HD', price, poster_url: posterUrl, category, featured, description
        })
      });

      const text = await response.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch (err) {
        throw new Error('Invalid server response: ' + text);
      }

      if (!response.ok) {
        throw new Error(data.error || 'Backend failed: ' + text);
      }

      const uploadUrl = data.uploadUrl;
      updateProgress(30, 'Video upload URL created! Uploading video...');

      // ===== 3. Upload Video to Cloudflare =====
      const videoUploadResponse = await fetch(uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': video.type, 'x-amz-meta-title': title },
        body: video
      });

      if (!videoUploadResponse.ok) {
        const errText = await videoUploadResponse.text();
        throw new Error('Video upload failed: ' + errText);
      }

      updateProgress(100, '✔ Upload Successful!');

      setTimeout(() => {
        progressWrap.classList.remove('visible');
        uploadBtn.disabled = false;
        form.reset();
        preview.style.display = 'none';
        posterFile.value = '';
        videoFile.value = '';
      }, 2000);

    } catch (error) {
      showError(error);
      uploadBtn.disabled = false;
    }
  });
})();
