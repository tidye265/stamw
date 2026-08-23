// admin-manage.js
(function() {
    'use strict';

    const token = localStorage.getItem('akmark_admin_token');
    if (!token) {
        window.location.href = 'admin-login.html';
        return;
    }

    // File upload preview
    const fileDrop = document.getElementById('fileDrop');
    const posterFile = document.getElementById('posterFile');
    const preview = document.getElementById('preview');
    const previewImg = document.getElementById('previewImg');

    fileDrop.addEventListener('click', function() {
        posterFile.click();
    });

    posterFile.addEventListener('change', function() {
        const file = this.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function(e) {
                previewImg.src = e.target.result;
                preview.style.display = 'block';
            };
            reader.readAsDataURL(file);
        }
    });

    // Upload film
    const form = document.getElementById('uploadFilmForm');
    const uploadBtn = document.getElementById('uploadBtn');
    const progressWrap = document.getElementById('progressWrap');
    const progressFill = document.getElementById('progressFill');
    const progressText = document.getElementById('progressText');

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
        const file = posterFile.files[0];

        if (!file) {
            alert('Please select a poster image.');
            return;
        }

        // Show progress
        uploadBtn.disabled = true;
        progressWrap.classList.add('visible');
        progressFill.style.width = '0%';
        progressText.textContent = 'Uploading...';

        // Upload image to Supabase Storage
        const SUPABASE_URL = window.SUPABASE_URL;
        const SUPABASE_ANON_KEY = window.SUPABASE_ANON_KEY;

        const fileName = `posters/${Date.now()}_${file.name}`;

        // Upload file using Supabase Storage (REST)
        const uploadResponse = await fetch(`${SUPABASE_URL}/storage/v1/object/public/posters/${fileName}`, {
            method: 'POST',
            headers: {
                'Authorization': 'Bearer ' + SUPABASE_ANON_KEY,
                'Content-Type': file.type,
                'x-upsert': 'true'
            },
            body: file
        });

        if (!uploadResponse.ok) {
            progressText.textContent = 'Failed to upload image';
            uploadBtn.disabled = false;
            return;
        }

        const posterUrl = `${SUPABASE_URL}/storage/v1/object/public/posters/${fileName}`;

        // Then upload film data
        const response = await fetch(`${SUPABASE_URL}/functions/v1/admin-upload-film-api`, {
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
        try { data = JSON.parse(text); } catch (err) { throw new Error('Invalid response'); }

        if (!response.ok) {
            throw new Error(data.error || 'Upload failed');
        }

        // Progress 100%
        progressFill.style.width = '100%';
        progressText.textContent = '✔ Upload Successful!';

        setTimeout(() => {
            progressWrap.classList.remove('visible');
            uploadBtn.disabled = false;
            form.reset();
            preview.style.display = 'none';
        }, 2000);
    });
})();
