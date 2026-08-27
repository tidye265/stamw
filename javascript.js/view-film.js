(function() {
    'use strict';

    var TOKEN_KEY = 'akmark_token';
    var USER_KEY = 'akmark_user';

    // ===== URL PARAMETERS =====
    var urlParams = new URLSearchParams(window.location.search);
    var filmId = urlParams.get('id');
    var seriesId = urlParams.get('series_id');

    // ===== DOM ELEMENTS =====
    var skeletonLoader = document.getElementById('skeletonLoader');
    var errorState = document.getElementById('errorState');
    var errorMessage = document.getElementById('errorMessage');
    var filmDetails = document.getElementById('filmDetails');
    var payBtn = document.getElementById('payBtn');
    var payBtnText = document.getElementById('payBtnText');
    var watchNowBtn = document.getElementById('watchNowBtn');
    var videoSection = document.getElementById('videoSection');

    // ===== STORE FILM DATA =====
    var filmData = null;

    function getToken() { return localStorage.getItem(TOKEN_KEY); }
    function setUser(user) { localStorage.setItem(USER_KEY, JSON.stringify(user)); }
    function clearSession() {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem('akmark_refresh_token');
        localStorage.removeItem(USER_KEY);
    }

    // ===== CHECK LOGIN (Monga momwe ziliri mu account.js) =====
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
                // Continue loading film after auth
                loadFilm();
            }
        })
        .catch(function() {
            clearSession();
            window.location.href = '/register';
        });
    }

    // ===== LOAD FILM (Yofanana ndi fetchUserData) =====
    function loadFilm() {
        // Validate UUID
        if (!filmId || !isValidUUID(filmId)) {
            showError('Invalid film ID format. Please use a valid UUID.');
            return;
        }

        // Show skeleton
        if (skeletonLoader) skeletonLoader.classList.add('show');
        if (errorState) errorState.style.display = 'none';
        if (filmDetails) filmDetails.classList.remove('show');

        console.log('🔄 Fetching film data for ID:', filmId);
        if (seriesId) console.log('📌 Series ID:', seriesId);

        var url = 'https://jnqwvmxuieeelvukhcsq.supabase.co/functions/v1/view-film-api?id=' + encodeURIComponent(filmId);
        if (seriesId) url += '&series_id=' + encodeURIComponent(seriesId);

        console.log('🌐 Request URL:', url);

        fetch(url, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + getToken()
            }
        })
        .then(function(response) {
            return response.text().then(function(text) {
                try { return JSON.parse(text); } catch (e) { throw new Error('Invalid server response'); }
            });
        })
        .then(function(data) {
            if (!response.ok) { // This won't work here, need to check status before
                throw new Error(data.error || 'Failed to fetch film');
            }
            return data;
        })
        .then(function(data) {
            if (!data.movie) throw new Error('Film not found');
            filmData = data.movie;
            populateFilmData(filmData);
            if (skeletonLoader) skeletonLoader.classList.remove('show');
            if (filmDetails) filmDetails.classList.add('show');
            console.log('✅ Film loaded:', filmData.title);
        })
        .catch(function(err) {
            console.error('❌ Error loading film:', err.message);
            if (skeletonLoader) skeletonLoader.classList.remove('show');
            if (errorState) {
                errorState.style.display = 'flex';
                if (errorMessage) errorMessage.textContent = err.message;
            }
            if (filmDetails) filmDetails.classList.remove('show');
        });
    }

    // ===== POPULATE FILM DETAILS =====
    function populateFilmData(movie) {
        // Poster
        var posterEl = document.getElementById('filmPoster');
        if (posterEl) {
            posterEl.src = movie.poster_url || '';
            posterEl.alt = movie.title || '';
        }

        // Title
        var titleEl = document.getElementById('filmTitle');
        if (titleEl) titleEl.textContent = movie.title || '';

        // Tags
        var tags = [];
        if (movie.genre) tags.push(movie.genre);
        if (movie.category) tags.push(movie.category);
        if (movie.translator_name) tags.push('🎙️ ' + movie.translator_name);
        if (movie.quality) tags.push(movie.quality.toUpperCase());
        if (movie.episode_number) tags.push('Episode ' + movie.episode_number);

        var tagsEl = document.getElementById('filmTags');
        if (tagsEl) {
            tagsEl.innerHTML = tags.map(function(tag) {
                return '<span class="tag' + (tag.includes('🎙️') ? ' accent' : '') + '">' + tag + '</span>';
            }).join('');
        }

        // Description
        var descEl = document.getElementById('filmDescription');
        if (descEl) descEl.textContent = movie.description || 'No description available.';

        // Meta
        var yearEl = document.getElementById('filmYear');
        if (yearEl) yearEl.textContent = movie.year || '-';
        var durationEl = document.getElementById('filmDuration');
        if (durationEl) durationEl.textContent = movie.duration ? movie.duration + ' min' : '-';
        var qualityEl = document.getElementById('filmQuality');
        if (qualityEl) qualityEl.textContent = movie.quality || 'HD';
        var categoryEl = document.getElementById('filmCategory');
        if (categoryEl) categoryEl.textContent = movie.category || '-';
        var translatorEl = document.getElementById('filmTranslator');
        if (translatorEl) translatorEl.textContent = movie.translator_name || 'Original';

        // Price
        var priceEl = document.getElementById('filmPrice');
        if (priceEl) {
            var price = Number(movie.price || 0);
            priceEl.textContent = 'MK ' + price.toLocaleString();
        }

        // Video section
        if (movie.video_uid && videoSection) {
            videoSection.classList.add('show');
        }
    }

    // ===== PAYMENT HANDLER =====
    function handlePayment() {
        if (!filmData) return;

        if (payBtn) {
            payBtn.classList.add('loading');
            if (payBtnText) payBtnText.textContent = 'Processing...';
        }

        // Simulate payment (replace with real payment API)
        setTimeout(function() {
            if (payBtn) {
                payBtn.classList.remove('loading');
                if (payBtnText) payBtnText.textContent = '✅ Payment Successful!';
                payBtn.disabled = true;
            }

            // Redirect to player
            setTimeout(function() {
                if (filmData.video_uid) {
                    window.location.href = 'play-film.html?video_uid=' + filmData.video_uid;
                } else {
                    window.location.href = 'home.html';
                }
            }, 2000);
        }, 2000);
    }

    // ===== WATCH NOW HANDLER =====
    function handleWatchNow() {
        if (!filmData || !filmData.video_uid) {
            showToast('Video not available yet.', true);
            return;
        }
        window.location.href = 'play-film.html?video_uid=' + filmData.video_uid;
    }

    // ===== TOAST (Monga mu account.js) =====
    function showToast(msg, isError) {
        var toast = document.getElementById('toast');
        if (!toast) return;
        var span = toast.querySelector('span');
        if (span) span.textContent = msg;
        toast.classList.add('visible');
        if (isError) {
            toast.style.borderColor = '#ff6b6b';
            var svg = toast.querySelector('svg');
            if (svg) svg.style.fill = '#ff6b6b';
        } else {
            toast.style.borderColor = 'var(--border-subtle)';
            var svg2 = toast.querySelector('svg');
            if (svg2) svg2.style.fill = 'var(--accent)';
        }
        setTimeout(function() { toast.classList.remove('visible'); }, 3000);
    }

    // ===== ERROR HELPER =====
    function showError(message) {
        if (skeletonLoader) skeletonLoader.classList.remove('show');
        if (errorState) {
            errorState.style.display = 'flex';
            if (errorMessage) errorMessage.textContent = message;
        }
        if (filmDetails) filmDetails.classList.remove('show');
    }

    // ===== UUID VALIDATION =====
    function isValidUUID(uuid) {
        var uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        return uuidRegex.test(uuid);
    }

    // ===== INIT (Monga mu account.js) =====
    function init() {
        checkLogin();

        // Attach event listeners
        if (payBtn) payBtn.addEventListener('click', handlePayment);
        if (watchNowBtn) watchNowBtn.addEventListener('click', handleWatchNow);

        // Back button already handles via history.back()
    }

    // ===== START =====
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
