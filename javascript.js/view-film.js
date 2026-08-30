// view-film.js (Updated)
(function() {
    'use strict';

    var TOKEN_KEY = 'akmark_token';
    var USER_KEY = 'akmark_user';

    var urlParams = new URLSearchParams(window.location.search);
    var filmId = urlParams.get('id');
    var seriesId = urlParams.get('series_id');

    var skeletonLoader = document.getElementById('skeletonLoader');
    var errorState = document.getElementById('errorState');
    var errorMessage = document.getElementById('errorMessage');
    var filmDetails = document.getElementById('filmDetails');
    var payBtn = document.getElementById('payBtn');
    var payBtnText = document.getElementById('payBtnText');
    var statusMessage = document.getElementById('statusMessage');
    var translatorProfile = document.getElementById('translatorProfile');
    var translatorName = document.getElementById('translatorName');
    var translatorAvatar = document.getElementById('translatorAvatar');
    var translatorAvatarContainer = document.getElementById('translatorAvatarContainer');
    var translatorFollowers = document.getElementById('translatorFollowers');
    var followBtn = document.getElementById('followBtn');

    var filmData = null;
    var translatorData = null;
    var isFollowing = false;
    var adminId = null;

    function getToken() { return localStorage.getItem(TOKEN_KEY); }
    function setUser(user) { localStorage.setItem(USER_KEY, JSON.stringify(user)); }
    function clearSession() {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem('akmark_refresh_token');
        localStorage.removeItem(USER_KEY);
    }

    function checkLogin() {
        var token = getToken();
        if (!token) {
            window.location.href = '/register';
            return;
        }
        fetch('https://jnqwvmxuieeelvukhcsq.supabase.co/functions/v1/login-checker', {
            method: 'GET',
            headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' }
        })
        .then(response => response.text().then(text => { try { return JSON.parse(text); } catch (e) { throw new Error('Invalid'); } }))
        .then(data => {
            if (!data.valid) { clearSession(); window.location.href = '/register'; return; }
            var user = data.user;
            if (user) { setUser(user); loadFilm(); }
        })
        .catch(() => { clearSession(); window.location.href = '/register'; });
    }

    function loadFilm() {
        if (!filmId || !isValidUUID(filmId)) { showError('Invalid film ID format.'); return; }
        if (skeletonLoader) skeletonLoader.classList.add('show');
        if (errorState) errorState.style.display = 'none';
        if (filmDetails) filmDetails.classList.remove('show');

        var url = 'https://jnqwvmxuieeelvukhcsq.supabase.co/functions/v1/viewing-film-api?action=get_movie';
        fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + getToken() },
            body: JSON.stringify({ movie_id: filmId })
        })
        .then(response => response.json())
        .then(data => {
            if (!data.success || !data.movie) throw new Error(data.error || 'Film not found');
            filmData = data.movie;
            populateFilmData(filmData);
            loadTranslatorProfile();
            if (skeletonLoader) skeletonLoader.classList.remove('show');
            if (filmDetails) filmDetails.classList.add('show');
        })
        .catch(err => { console.error('Error loading film:', err.message); if (skeletonLoader) skeletonLoader.classList.remove('show'); showError(err.message); });
    }

    function populateFilmData(movie) {
        // Poster
        var posterImg = document.getElementById('filmPoster');
        if (posterImg) posterImg.src = movie.poster_url || '';
        else console.error('filmPoster element not found');

        // Title
        var titleEl = document.getElementById('filmTitle');
        if (titleEl) titleEl.textContent = movie.title || '';
        else console.error('filmTitle element not found');

        // Tags
        var tags = [];
        if (movie.genre) tags.push(movie.genre);
        if (movie.category) tags.push(movie.category);
        if (movie.quality) tags.push(movie.quality.toUpperCase());
        if (movie.episode_number) tags.push('Episode ' + movie.episode_number);
        var tagsEl = document.getElementById('filmTags');
        if (tagsEl) tagsEl.innerHTML = tags.map(function(tag) { return '<span class="tag">' + tag + '</span>'; }).join('');

        // Description
        var descEl = document.getElementById('filmDescription');
        if (descEl) descEl.textContent = movie.description || 'No description available.';

        // Meta
        var yearEl = document.getElementById('filmYear');
        if (yearEl) yearEl.textContent = movie.year || '-';
        var qualityEl = document.getElementById('filmQuality');
        if (qualityEl) qualityEl.textContent = movie.quality || 'HD';
        var categoryEl = document.getElementById('filmCategory');
        if (categoryEl) categoryEl.textContent = movie.category || '-';

        // Button text: "WATCH NOW MK [price]"
        var price = Number(movie.price || 0);
        if (payBtnText) payBtnText.textContent = 'WATCH NOW MK ' + price.toLocaleString();
    }

    function loadTranslatorProfile() {
        if (!filmData || !filmData.translator_name) {
            if (translatorProfile) translatorProfile.style.display = 'none';
            return;
        }

        // Show profile
        if (translatorProfile) translatorProfile.style.display = 'flex';
        if (translatorName) translatorName.textContent = filmData.translator_name;
        if (translatorFollowers) translatorFollowers.textContent = '0 followers';

        // Fetch profile details
        var url = 'https://jnqwvmxuieeelvukhcsq.supabase.co/functions/v1/v1-admin-api?action=get_profile_by_name&name=' + encodeURIComponent(filmData.translator_name);
        fetch(url, { method: 'GET', headers: { 'Authorization': 'Bearer ' + getToken(), 'Content-Type': 'application/json' } })
        .then(response => response.json())
        .then(data => {
            if (data.success && data.admin) {
                translatorData = data.admin;
                adminId = data.admin.id;

                // Handle avatar: if image exists, show img; else show default icon
                if (translatorAvatar && translatorAvatarContainer) {
                    if (data.admin.profile_image) {
                        translatorAvatar.src = data.admin.profile_image;
                        translatorAvatar.style.display = 'block';
                        translatorAvatarContainer.innerHTML = '';
                        translatorAvatarContainer.appendChild(translatorAvatar);
                    } else {
                        // Show default SVG icon
                        translatorAvatar.style.display = 'none';
                        translatorAvatarContainer.innerHTML = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>';
                    }
                }

                if (translatorFollowers) translatorFollowers.textContent = data.admin.followers_count + ' followers';
                isFollowing = data.admin.is_following;
                updateFollowButton();
            }
        })
        .catch(err => console.error('Error loading translator profile:', err));
    }

    function toggleFollow() {
        if (!adminId) return;
        var action = isFollowing ? 'unfollow' : 'follow';
        fetch('https://jnqwvmxuieeelvukhcsq.supabase.co/functions/v1/v1-admin-api?action=' + action + '&admin_id=' + adminId, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + getToken() },
            body: JSON.stringify({})
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                isFollowing = !isFollowing;
                translatorFollowers.textContent = data.followers_count + ' followers';
                updateFollowButton();
            } else {
                showToast(data.error || 'Follow failed', true);
            }
        })
        .catch(err => { console.error('Error toggling follow:', err); showToast('Server error', true); });
    }

    function updateFollowButton() {
        if (isFollowing) {
            followBtn.textContent = 'Following';
            followBtn.classList.add('following');
        } else {
            followBtn.textContent = 'Follow';
            followBtn.classList.remove('following');
        }
    }

    // REAL PAYMENT – Redirect to watch.html after success
    function handlePayment() {
        if (!filmData) return;
        var token = getToken();
        if (!token) return;

        payBtn.classList.add('loading');
        payBtnText.textContent = 'Processing...';
        statusMessage.classList.remove('show');

        fetch('https://jnqwvmxuieeelvukhcsq.supabase.co/functions/v1/update-balance-api', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
            body: JSON.stringify({ film_id: filmData.id })
        })
        .then(response => response.json())
        .then(data => {
            payBtn.classList.remove('loading');
            if (data.success) {
                payBtnText.textContent = 'PAYMENT SUCCESSFUL';
                payBtn.disabled = true;
                statusMessage.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 6L9 17l-5-5"/></svg> Payment Success!';
                statusMessage.className = 'status-message show success';
                // ➡️ AUTO REDIRECT TO WATCHER
                setTimeout(function() {
                    window.location.href = 'watch.html?id=' + filmData.id;
                }, 1000);
            } else {
                payBtnText.textContent = 'WATCH NOW MK ' + (filmData.price || 0).toLocaleString();
                statusMessage.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 6l12 12M18 6L6 18"/></svg> Server failed to Run';
                statusMessage.className = 'status-message show error';
                showToast(data.error || 'Server failed to Run', true);
            }
        })
        .catch(function(err) {
            payBtn.classList.remove('loading');
            payBtnText.textContent = 'WATCH NOW MK ' + (filmData.price || 0).toLocaleString();
            statusMessage.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 6l12 12M18 6L6 18"/></svg> Server failed to Run';
            statusMessage.className = 'status-message show error';
            showToast(err.message || 'Server failed to Run', true);
        });
    }

    function showToast(msg, isError) {
        var toast = document.getElementById('toast');
        if (!toast) return;
        var span = toast.querySelector('span');
        if (span) span.textContent = msg;
        toast.classList.add('visible');
        toast.style.borderColor = isError ? '#ff6b6b' : 'var(--border-subtle)';
        setTimeout(function() { toast.classList.remove('visible'); }, 3000);
    }

    function showError(message) {
        if (skeletonLoader) skeletonLoader.classList.remove('show');
        if (errorState) { errorState.style.display = 'flex'; if (errorMessage) errorMessage.textContent = message; }
        if (filmDetails) filmDetails.classList.remove('show');
    }

    function isValidUUID(uuid) {
        var uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        return uuidRegex.test(uuid);
    }

    function init() {
        checkLogin();
        if (payBtn) payBtn.addEventListener('click', handlePayment);
        if (followBtn) followBtn.addEventListener('click', toggleFollow);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
