// admin/admin-dashboard.js
(function() {
    'use strict';

    // Check admin login
    const adminToken = localStorage.getItem('akmark_admin_token');
    if (!adminToken) {
        window.location.href = 'admin-login.html';
        return;
    }

    // Get admin info from localStorage (set during login/register)
    const adminData = JSON.parse(localStorage.getItem('akmark_admin') || '{}');

    // Fill greeting and stats
    if (adminData.full_name) {
        document.getElementById('adminGreeting').textContent = 'HELLO, ' + adminData.full_name.toUpperCase();
        document.getElementById('adminName').textContent = adminData.full_name;
    }
    if (adminData.email) {
        document.getElementById('adminEmail').textContent = adminData.email;
        document.getElementById('adminEmailStat').textContent = adminData.email;
    }
    if (adminData.wallet_balance) {
        document.getElementById('walletBalance').textContent = 'MK ' + Number(adminData.wallet_balance).toFixed(2);
    }
    document.getElementById('totalFilms').textContent = adminData.total_films || 0;

    // ==== Upload Film ====
    const uploadForm = document.getElementById('uploadFilmForm');
    const uploadBtn = document.getElementById('uploadBtn');
    const uploadProgress = document.getElementById('uploadProgress');
    const progressBar = document.getElementById('progressBar');
    const progressText = document.getElementById('progressText');
    const progressPercent = document.getElementById('progressPercent');
    const recentUploadsList = document.getElementById('recentUploadsList');

    // When form submits
    uploadForm.addEventListener('submit', async function(e) {
        e.preventDefault();

        // Collect data
        const title = document.getElementById('filmTitle').value.trim();
        const genre = document.getElementById('filmGenre').value;
        const year = parseInt(document.getElementById('filmYear').value);
        const duration = parseInt(document.getElementById('filmDuration').value);
        const quality = document.getElementById('filmQuality').value;
        const price = parseFloat(document.getElementById('filmPrice').value);
        const poster_url = document.getElementById('filmPosterUrl').value.trim();
        const category = document.getElementById('filmCategory').value.trim();
        const featured = document.getElementById('filmFeatured').value === 'true';
        const description = document.getElementById('filmDescription').value.trim();

        if (!title || !genre || !year || !duration || !poster_url || !category) {
            alert('Please fill in all required fields.');
            return;
        }

        // Show progress
        uploadBtn.disabled = true;
        uploadProgress.classList.add('visible');
        progressText.textContent = 'Uploading...';
        progressPercent.textContent = '0%';
        progressBar.style.width = '0%';

        // Simulate progress (for animation) – we'll animate to 90% then send request
        let progress = 0;
        const interval = setInterval(() => {
            progress += 10 + Math.random() * 15;
            if (progress >= 90) {
                clearInterval(interval);
                progress = 90;
            }
            progressBar.style.width = progress + '%';
            progressPercent.textContent = Math.floor(progress) + '%';
        }, 300);

        // Get Supabase URL & Key
        const SUPABASE_URL = window.SUPABASE_URL;
        const SUPABASE_ANON_KEY = window.SUPABASE_ANON_KEY;

        try {
            // Send upload request
            const response = await fetch(`${SUPABASE_URL}/functions/v1/admin-upload-film-api`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${adminToken}`
                },
                body: JSON.stringify({
                    title,
                    genre,
                    year,
                    duration,
                    quality,
                    description,
                    price,
                    poster_url,
                    category,
                    featured
                })
            });

            const text = await response.text();
            let data;
            try { data = JSON.parse(text); } catch (err) { throw new Error('Invalid server response'); }

            if (!response.ok) {
                throw new Error(data.error || 'Upload failed.');
            }

            // Finish progress to 100%
            clearInterval(interval);
            progressBar.style.width = '100%';
            progressPercent.textContent = '100%';
            progressText.textContent = 'Uploading...';

            // Show success check
            setTimeout(() => {
                progressText.innerHTML = '✔ Upload Successful!';
                // Reset after 2 seconds
                setTimeout(() => {
                    uploadProgress.classList.remove('visible');
                    progressBar.style.width = '0%';
                    progressPercent.textContent = '0%';
                    uploadBtn.disabled = false;
                    uploadForm.reset();

                    // Update total films count (increment)
                    const totalFilmsEl = document.getElementById('totalFilms');
                    const current = parseInt(totalFilmsEl.textContent) || 0;
                    totalFilmsEl.textContent = current + 1;

                    // Add to recent uploads
                    const item = document.createElement('div');
                    item.className = 'upload-item';
                    item.innerHTML = `
                        <div class="check-circle">
                            <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>
                        </div>
                        <span class="title">${title}</span>
                        <span class="time">Just now</span>
                    `;
                    recentUploadsList.prepend(item);
                }, 2000);
            }, 500);

        } catch (error) {
            clearInterval(interval);
            progressText.textContent = '❌ Upload Failed';
            progressPercent.textContent = 'Error';
            setTimeout(() => {
                uploadProgress.classList.remove('visible');
                uploadBtn.disabled = false;
            }, 2500);
            alert(error.message);
        }
    });
})();
