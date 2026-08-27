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
    var translatorProfile = document.getElementById('translatorProfile');
    var translatorName = document.getElementById('translatorName');
    var translatorAvatar = document.getElementById('translatorAvatar');
    var translatorFollowers = document.getElementById('translatorFollowers');
    var followBtn = document.getElementById('followBtn');

    var filmData = null;
    var translatorData = null;
    var isFollowing = false;

    function getToken() { return localStorage.getItem(TOKEN_KEY); }
    function setUser(user) { localStorage.setItem(USER_KEY, JSON.stringify(user)); }
    function clearSession() {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem('akmark_refresh_token');
        localStorage.removeItem(USER_KEY);
    }

    // CHECK LOGIN
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
        .then(function(response) {
            return response.text().then(function(text) {
                try { return JSON.parse(text); } catch (e) { throw new Error('Invalid'); }
            });
        })
        .then(function(data) {
            if (!data.valid) {
                clearSession();
                window.location.href = '/register';
                return;
            }
            var user = data.user;
            if (user) {
                setUser(user);
                loadFilm();
            }
        })
        .catch(function() {
            clearSession();
            window.location.href = '/register';
        });
    }

    // LOAD FILM
    function loadFilm() {
        if (!filmId || !isValidUUID(filmId)) {
            showError('Invalid film ID format. Please use a valid UUID.');
            return;
        }

        if (skeletonLoader) skeletonLoader.classList.add('show');
        if (errorState) errorState.style.display = 'none';
        if (filmDetails) filmDetails.classList.remove('show');

        var url = 'https://jnqwvmxuieeelvukhcsq.supabase.co/functions/v1/view-film-api?id=' + encodeURIComponent(filmId);
        if (seriesId) url += '&series_id=' + encodeURIComponent(seriesId);

        fetch(url, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + getToken() }
        })
        .then(function(response) {
            if (!response.ok) {
                return response.text().then(function(text) {
                    throw new Error('HTTP ' + response.status + ': ' + text);
                });
            }
            return response.json();
        })
        .then(function(data) {
            if (!data.success || !data.movie) throw new Error(data.error || 'Film not found');
            filmData = data.movie;
            populateFilmData(filmData);
            loadTranslatorProfile();
            if (skeletonLoader) skeletonLoader.classList.remove('show');
            if (filmDetails) filmDetails.classList.add('show');
        })
        .catch(function(err) {
            console.error('Error loading film:', err.message);
            if (skeletonLoader) skeletonLoader.classList.remove('show');
            showError(err.message);
        });
    }

    // POPULATE FILM DETAILS
    function populateFilmData(movie) {
        document.getElementById('filmPoster').src = movie.poster_url || '';
        document.getElementById('filmTitle').textContent = movie.title || '';

        var tags = [];
        if (movie.genre) tags.push(movie.genre);
        if (movie.category) tags.push(movie.category);
        if (movie.quality) tags.push(movie.quality.toUpperCase());
        if (movie.episode_number) tags.push('Episode ' + movie.episode_number);

        document.getElementById('filmTags').innerHTML = tags.map(function(tag) {
            return '<span class="tag">' + tag + '</span>';
        }).join('');

        document.getElementById('filmDescription').textContent = movie.description || 'No description available.';
        document.getElementById('filmYear').textContent = movie.year || '-';
        document.getElementById('filmQuality').textContent = movie.quality || 'HD';
        document.getElementById('filmCategory').textContent = movie.category || '-';

        var price = Number(movie.price || 0);
        payBtnText.textContent = 'PAY NOW MK ' + price.toLocaleString();
    }

    // LOAD TRANSLATOR PROFILE (social-api)
    function loadTranslatorProfile() {
        if (!filmData || !filmData.translator_name) return;

        var url = 'https://jnqwvmxuieeelvukhcsq.supabase.co/functions/v1/social-api?translator_name=' + encodeURIComponent(filmData.translator_name);
        fetch(url, {
            method: 'GET',
            headers: { 'Authorization': 'Bearer ' + getToken(), 'Content-Type': 'application/json' }
        })
        .then(function(response) { return response.json(); })
        .then(function(data) {
            if (data.success) {
                translatorData = data.translator;
                translatorAvatar.src = translatorData.profile_image || 'default-avatar.png';
                translatorFollowers.textContent = translatorData.followers_count + ' followers';
                isFollowing = translatorData.is_following;
                translatorProfile.style.display = 'flex';
                updateFollowButton();
            }
        })
        .catch(function(err) { console.error('Error loading translator profile:', err); });
    }

    // FOLLOW / UNFOLLOW
    function toggleFollow() {
        if (!translatorData) return;
        var action = isFollowing ? 'unfollow' : 'follow';

        fetch('https://jnqwvmxuieeelvukhcsq.supabase.co/functions/v1/counter-api', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + getToken() },
            body: JSON.stringify({ translator_id: translatorData.id, action: action })
        })
        .then(function(response) { return response.json(); })
        .then(function(data) {
            if (data.success) {
                isFollowing = !isFollowing;
                translatorFollowers.textContent = data.followers_count + ' followers';
                updateFollowButton();
            }
        })
        .catch(function(err) { console.error('Error toggling follow:', err); });
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

    // REAL PAYMENT (update-balance-api)
    function handlePayment() {
        if (!filmData) return;
        var token = getToken();
        if (!token) return;

        payBtn.classList.add('loading');
        payBtnText.textContent = 'Processing...';

        fetch('https://jnqwvmxuieeelvukhcsq.supabase.co/functions/v1/update-balance-api', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
            body: JSON.stringify({ film_id: filmData.id })
        })
        .then(function(response) { return response.json(); })
        .then(function(data) {
            if (!data.success) throw new Error(data.error || 'Payment failed');
            payBtn.classList.remove('loading');
            payBtnText.textContent = '✅ Payment Successful!';
            payBtn.disabled = true;
            if (data.video_uid) {
                setTimeout(function() { window.location.href = 'play-film.html?video_uid=' + data.video_uid; }, 1500);
            } else {
                setTimeout(function() { window.location.href = 'home.html'; }, 1500);
            }
        })
        .catch(function(err) {
            payBtn.classList.remove('loading');
            payBtnText.textContent = 'Insufficient Balance';
            showToast(err.message, true);
            setTimeout(function() { payBtnText.textContent = 'PAY NOW MK ' + (filmData.price || 0).toLocaleString(); }, 3000);
        });
    }

    // PLAY VIDEO
    function playVideo() {
        if (filmData && filmData.video_uid) {
            window.location.href = 'play-film.html?video_uid=' + filmData.video_uid;
        } else {
            alert('Video not available yet.');
        }
    }

    // TOAST
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
        if (errorState) {
            errorState.style.display = 'flex';
            if (errorMessage) errorMessage.textContent = message;
        }
        if (filmDetails) filmDetails.classList.remove('show');
    }

    function isValidUUID(uuid) {
        var uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        return uuidRegex.test(uuid);
    }

    // INIT
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
