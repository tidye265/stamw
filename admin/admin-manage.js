// admin-manage.js
(function() {
  'use strict';

  // Check admin login
  const token = localStorage.getItem('akmark_admin_token');
  if (!token) { window.location.href = 'admin-login.html'; return; }

  const admin = JSON.parse(localStorage.getItem('akmark_admin') || '{}');
  if (admin.full_name) {
    document.getElementById('adminNameDisplay').textContent = admin.full_name;
  }

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
  function updateProgress(p, msg) {
    progressFill.style.width = p + '%';
    progressText.textContent = msg;
  }

  // ===== Poster Preview =====
  fileDrop.addEventListener('click', () => posterFile.click());
  posterFile.addEventListener('change', function() {
    const file = this.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => { previewImg.src = e.target.result; preview.style.display = 'block'; };
      reader.readAsDataURL(file);
    }
  });

  // ===== Video File =====
  videoDrop.addEventListener('click', () => videoFile.click());
  videoFile.addEventListener('change', function() {
    // No preview needed for video
  });

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
    const video = videoFile.files[0];

    if (!video || !title) {
      alert('Please select a video file and enter a title.');
      return;
    }

    uploadBtn.disabled = true;
    progressWrap.classList.add('visible');
    updateProgress(5, 'Creating upload URL...');

    try {
      // ===== 1. Call Backend to get Cloudflare upload URL =====
      const response = await fetch(`${SUPABASE_URL}/functions/v1/upload-film-api`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
        body: JSON.stringify({
          title, genre, year, duration, quality: 'HD', price,
          poster_url: '', // Empty for now, will add later
          category, featured, description
        })
      });

      const text = await response.text();
      let data;
      try { data = JSON.parse(text); } catch (err) { throw new Error('Invalid server response: ' + text); }

      if (!response.ok) {
        throw new Error(data.error || 'Backend failed: ' + text);
      }

      const uploadUrl = data.uploadUrl;
      updateProgress(30, 'Video upload URL created! Uploading video...');

      // ===== 2. Upload Video =====
      const videoUploadResponse = await fetch(uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': video.type, 'x-amz-meta-title': title },
        body: video
      });

      if (!videoUploadResponse.ok) {
        const errText = await videoUploadResponse.text();
        throw new Error('Video upload failed: ' + errText);
      }

      // ===== 3. Success =====
      updateProgress(100, '✔ Upload Successful!');
      setTimeout(() => {
        progressWrap.classList.remove('visible');
        uploadBtn.disabled = false;
        form.reset();
        videoFile.value = '';
      }, 2000);

    } catch (error) {
      updateProgress(0, '❌ ' + error.message);
      console.error(error);
      uploadBtn.disabled = false;
    }
  });
})();
