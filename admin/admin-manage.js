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

  // Video File (select only, no preview)
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
    progressFill.style.width = '5%';
    progressText.textContent = 'Uploading poster...';

    // 1. Upload poster to Supabase
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
      progressText.textContent = 'Failed to upload poster';
      uploadBtn.disabled = false;
      return;
    }
    const posterUrl = `${SUPABASE_URL}/storage/v1/object/public/posters/${fileName}`;

    progressFill.style.width = '20%';
    progressText.textContent = 'Creating upload URL...';

    // 2. Call backend to get Cloudflare Stream upload URL
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
    try { data = JSON.parse(text); } catch (err) { throw new Error('Invalid server response'); }
    if (!response.ok) throw new Error(data.error || 'Failed to create upload URL');

    const uploadUrl = data.uploadUrl;
    const videoUid = data.videoUid;

    // 3. Upload video directly to Cloudflare Stream
    progressFill.style.width = '30%';
    progressText.textContent = 'Uploading video to Cloudflare...';

    const videoUploadResponse = await fetch(uploadUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': video.type,
        'x-amz-meta-title': title // Optional, for Cloudflare metadata
      },
      body: video
    });

    if (!videoUploadResponse.ok) {
      progressText.textContent = 'Video upload failed';
      uploadBtn.disabled = false;
      return;
    }

    // 4. Success
    progressFill.style.width = '100%';
    progressText.textContent = '✔ Upload Successful!';

    setTimeout(() => {
      progressWrap.classList.remove('visible');
      progressFill.style.width = '0%';
      progressText.textContent = 'Uploading...';
      uploadBtn.disabled = false;
      form.reset();
      preview.style.display = 'none';
      videoFile.value = '';
    }, 2000);
  });
})();
