// admin-manage.js
(function() {
  'use strict';

  const token = localStorage.getItem('akmark_admin_token');
  if (!token) { window.location.href = 'admin-login.html'; return; }

  const admin = JSON.parse(localStorage.getItem('akmark_admin') || '{}');
  if (admin.full_name) {
    document.getElementById('adminNameDisplay').textContent = admin.full_name;
  }

  // Poster Preview
  const fileDrop = document.getElementById('fileDrop');
  const posterFile = document.getElementById('posterFile');
  const preview = document.getElementById('preview');
  const previewImg = document.getElementById('previewImg');
  fileDrop.addEventListener('click', () => posterFile.click());

  posterFile.addEventListener('change', function() {
    const file = this.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => { previewImg.src = e.target.result; preview.style.display = 'block'; };
      reader.readAsDataURL(file);
    }
  });

  // Video File (no preview)
  const videoDrop = document.getElementById('videoDrop');
  const videoFile = document.getElementById('videoFile');
  videoDrop.addEventListener('click', () => videoFile.click());

  const form = document.getElementById('uploadFilmForm');
  const uploadBtn = document.getElementById('uploadBtn');
  const progressWrap = document.getElementById('progressWrap');
  const progressFill = document.getElementById('progressFill');
  const progressText = document.getElementById('progressText');

  const SUPABASE_URL = window.SUPABASE_URL;
  const SUPABASE_ANON_KEY = window.SUPABASE_ANON_KEY;

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    alert('Supabase configuration missing! Check supabase.js');
    return;
  }

  // Helper function to show progress
  function updateProgress(percent, message) {
    progressFill.style.width = percent + '%';
    progressText.textContent = message;
  }

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

    // Show progress
    uploadBtn.disabled = true;
    progressWrap.classList.add('visible');
    updateProgress(5, 'Uploading poster...');

    try {
      // ===== 1. Upload Poster =====
      const fileName = `posters/${Date.now()}_${poster.name}`;
      const uploadResponse = await fetch(`${SUPABASE_URL}/storage/v1/object/public/posters/${fileName}`, {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer ' + SUPABASE_ANON_KEY,
          'Content-Type': poster.type,
          'x-upsert': 'true'
        },
        body: poster
      });

      if (!uploadResponse.ok) {
        const errText = await uploadResponse.text();
        throw new Error('Poster upload failed: ' + (errText || uploadResponse.statusText));
      }

      const posterUrl = `${SUPABASE_URL}/storage/v1/object/public/posters/${fileName}`;
      updateProgress(20, 'Poster uploaded! Creating video upload URL...');

      // ===== 2. Call Backend =====
      const response = await fetch(`${SUPABASE_URL}/functions/v1/upload-film-api`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + token
        },
        body: JSON.stringify({
          title,
          genre,
          year,
          duration,
          quality: 'HD',
          price,
          poster_url: posterUrl,
          category,
          featured,
          description
        })
      });

      const text = await response.text();
      let data;
      try { data = JSON.parse(text); } catch (err) { throw new Error('Invalid server response: ' + text); }

      if (!response.ok) {
        throw new Error(data.error || 'Backend failed: ' + text);
      }

      const uploadUrl = data.uploadUrl;
      const videoUid = data.videoUid;
      updateProgress(30, 'Video upload URL created! Uploading video...');

      // ===== 3. Upload Video =====
      const videoUploadResponse = await fetch(uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': video.type, 'x-amz-meta-title': title },
        body: video
      });

      if (!videoUploadResponse.ok) {
        const errText = await videoUploadResponse.text();
        throw new Error('Video upload failed: ' + (errText || videoUploadResponse.statusText));
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
      updateProgress(0, '❌ ' + error.message);
      progressWrap.classList.add('visible');
      uploadBtn.disabled = false;
      console.error(error);
    }
  });
})();
