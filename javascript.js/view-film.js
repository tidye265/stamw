// view-film.js (Updated to handle series episodes)
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
    var watchBtn = document.getElementById('watchBtn');
    var watchBtnText = document.getElementById('watchBtnText');
    var statusMessage = document.getElementById('statusMessage');
    var translatorProfile = document.getElementById('translatorProfile');
    var translatorName = document.getElementById('translatorName');
    var translatorAvatar = document.getElementById('translatorAvatar');
    var translatorFollowers = document.getElementById('translatorFollowers');
    var followBtn = document.getElementById('followBtn');
    var episodesSection = document.getElementById('episodesSection');
    var episodesList = document.getElementById('episodesList');

    var filmData = null;
    var translatorData = null;
    var isFollowing = false;
    var adminId = null;
    var episodes = []; // All episodes of the series (if any)
    var currentMovieId = null; // The currently selected episode/movie id

    // Default avatar (SVG data URI)
    var DEFAULT_AVATAR = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23A7A7A7'><path d='M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z'/></svg>";

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
            episodes = data.episodes || [];
            currentMovieId = filmData.id;

            // If series, set up episode selector
            if (episodes.length > 0) {
                renderEpisodes();
                episodesSection.style.display = 'block';
            } else {
                episodesSection.style.display = 'none';
            }

            populateFilmData(filmData);
            loadTranslatorProfile();
            if (skeletonLoader) skeletonLoader.classList.remove('show');
            if (filmDetails) filmDetails.classList.add('show');
        })
        .catch(err => { console.error('Error loading film:', err.message); if (skeletonLoader) skeletonLoader.classList.remove('show'); showError(err.message); });
    }

    function populateFilmData(movie) {
        // Set poster
        var posterEl = document.getElementById('filmPoster');
        if (posterEl) posterEl.src = movie.poster_url || '';
        // Set title
        var titleEl = document.getElementById('filmTitle');
        if (titleEl) titleEl.textContent = movie.title || '';
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
        // Button text
        var price = Number(movie.price || 0);
        var btnText = document.getElementById('watchBtnText');
        if (btnText) btnText.textContent = 'WATCH NOW MK ' + price.toLocaleString();
    }

    function renderEpisodes() {
        episodesList.innerHTML = '';
        episodes.forEach(function(ep, index) {
            var btn = document.createElement('button');
            btn.className = 'episode-btn' + (ep.id === currentMovieId ? ' active' : '');
            btn.textContent = 'Part ' + (ep.episode_number || (index + 1));
            btn.dataset.id = ep.id;
            btn.addEventListener('click', function() {
                // Switch to this episode
                currentMovieId = ep.id;
                filmData = ep; // update filmData to this episode
                populateFilmData(ep);
                // Update active class
                document.querySelectorAll('.episode-btn').forEach(function(b) { b.classList.remove('active'); });
                btn.classList.add('active');
            });
            episodesList.appendChild(btn);
        });
    }

    function loadTranslatorProfile() {
        if (!filmData || !filmData.translator_name) {
            if (translatorProfile) translatorProfile.style.display = 'none';
            return;
        }
        if (translatorName) translatorName.textContent = filmData.translator_name;
        if (translatorFollowers) translatorFollowers.textContent = '0 followers';
        if (translatorProfile) translatorProfile.style.display = 'flex';
        if (translatorAvatar) translatorAvatar.src = DEFAULT_AVATAR;

        var url = 'https://jnqwvmxuieeelvukhcsq.supabase.co/functions/v1/v1-admin-api?action=get_profile_by_name&name=' + encodeURIComponent(filmData.translator_name);
        fetch(url, { method: 'GET', headers: { 'Authorization': 'Bearer ' + getToken(), 'Content-Type': 'application/json' } })
        .then(response => response.json())
        .then(data => {
            if (data.success && data.admin) {
                translatorData = data.admin;
                adminId = data.admin.id;
                if (translatorAvatar) translatorAvatar.src = data.admin.profile_image || DEFAULT_AVATAR;
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
                if (translatorFollowers) translatorFollowers.textContent = data.followers_count + ' followers';
                updateFollowButton();
            } else {
                showToast(data.error || 'Follow failed', true);
            }
        })
        .catch(err => { console.error('Error toggling follow:', err); showToast('Server error', true); });
    }

    function updateFollowButton() {
        if (!followBtn) return;
        if (isFollowing) {
            followBtn.textContent = 'Following';
            followBtn.classList.add('following');
        } else {
            followBtn.textContent = 'Follow';
            followBtn.classList.remove('following');
        }
    }

    // WATCH NOW / PAYMENT – Redirect to watch.html after success
    function handleWatch() {
        if (!filmData) return;
        var token = getToken();
        if (!token) return;

        watchBtn.classList.add('loading');
        watchBtnText.textContent = 'Processing...';
        statusMessage.classList.remove('show');

        fetch('https://jnqwvmxuieeelvukhcsq.supabase.co/functions/v1/update-balance-api', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
            body: JSON.stringify({ film_id: currentMovieId || filmData.id })
        })
        .then(response => response.json())
        .then(data => {
            watchBtn.classList.remove('loading');
            if (data.success) {
                watchBtnText.textContent = 'PAYMENT SUCCESSFUL';
                watchBtn.disabled = true;
                statusMessage.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 6L9 17l-5-5"/></svg> Payment Success!';
                statusMessage.className = 'status-message show success';
                setTimeout(function() {
                    window.location.href = 'watch.html?id=' + (currentMovieId || filmData.id);
                }, 1000);
            } else {
                watchBtnText.textContent = 'WATCH NOW MK ' + (filmData.price || 0).toLocaleString();
                statusMessage.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 6l12 12M18 6L6 18"/></svg> Server failed to Run';
                statusMessage.className = 'status-message show error';
                showToast(data.error || 'Server failed to Run', true);
            }
        })
        .catch(function(err) {
            watchBtn.classList.remove('loading');
            watchBtnText.textContent = 'WATCH NOW MK ' + (filmData.price || 0).toLocaleString();
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
        if (watchBtn) watchBtn.addEventListener('click', handleWatch);
        if (followBtn) followBtn.addEventListener('click', toggleFollow);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
