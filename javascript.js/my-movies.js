// my-movies.js
(function() {
    'use strict';

    var TOKEN_KEY = 'akmark_token';
    var token = localStorage.getItem(TOKEN_KEY);
    if (!token) {
        window.location.href = 'login.html';
        return;
    }

    var SUPABASE_URL = window.SUPABASE_URL;
    var movieListEl = document.getElementById('movieList');
    var emptyStateEl = document.getElementById('emptyState');
    var summaryBar = document.getElementById('summaryBar');
    var toast = document.getElementById('toast');
    var skeletonEl = document.getElementById('skeleton'); // Add this element in HTML if not present

    // ===== SHOW SKELETON =====
    function showSkeleton() {
        if (skeletonEl) skeletonEl.style.display = 'block';
        if (movieListEl) movieListEl.style.display = 'none';
        if (emptyStateEl) emptyStateEl.style.display = 'none';
    }

    // ===== HIDE SKELETON =====
    function hideSkeleton() {
        if (skeletonEl) skeletonEl.style.display = 'none';
    }

    // ===== FETCH MY MOVIES =====
    async function loadMyMovies() {
        showSkeleton();
        try {
            var res = await fetch(`${SUPABASE_URL}/functions/v1/my-film-api`, {
                method: 'GET',
                headers: { 'Authorization': 'Bearer ' + token }
            });
            var data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to load');

            hideSkeleton();

            if (!data.films || data.films.length === 0) {
                movieListEl.innerHTML = '';
                emptyStateEl.style.display = 'flex';
                summaryBar.innerHTML = '<span>0 VIDEOS</span><span>0.0 GB</span>';
                return;
            }
            emptyStateEl.style.display = 'none';
            renderList(data.films);
            updateSummary(data.films);
        } catch (err) {
            console.error('Error:', err);
            hideSkeleton();
            movieListEl.innerHTML = '';
            emptyStateEl.style.display = 'flex';
            showToast('Failed to load your movies');
        }
    }

    // ===== UPDATE SUMMARY =====
    function updateSummary(films) {
        var count = films.length;
        var totalSizeGB = (count * 0.2).toFixed(1); // estimation
        summaryBar.innerHTML = '<span>' + count + ' VIDEOS</span><span>' + totalSizeGB + ' GB</span>';
    }

    // ===== RENDER MOVIE LIST =====
    function renderList(films) {
        movieListEl.innerHTML = '';
        films.forEach(function(film) {
            var item = document.createElement('div');
            item.className = 'movie-item';
            item.dataset.id = film.id;
            item.dataset.expireAt = film.expire_at;

            var timeLeft = film.time_left_seconds || 0;
            var isExpired = timeLeft <= 0;
            var totalSeconds = 600; // 10 minutes
            var progressPercent = Math.min(100, Math.max(0, (timeLeft / totalSeconds) * 100));
            var timeLeftStr = formatTimeLeft(timeLeft);

            var watchClass = isExpired ? 'watch-link disabled' : 'watch-link';
            var watchText = isExpired ? 'Expired' : 'WATCH NOW';

            item.innerHTML = `
                <div class="thumb">
                    <img src="${film.poster_url}" alt="${film.title}" loading="lazy">
                    <span class="duration">${timeLeftStr}</span>
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${progressPercent}%"></div>
                    </div>
                </div>
                <div class="info">
                    <h3>${film.title}</h3>
                    <p>${film.quality || 'HD'}</p>
                    <a href="watch.html?id=${film.id}" class="${watchClass}" onclick="return !isExpired(event, this)">${watchText}</a>
                </div>
                <button class="menu-btn" onclick="showMenu('${film.id}')">⋮</button>
            `;
            movieListEl.appendChild(item);
        });

        startCountdowns();
    }

    // ===== FORMAT TIME =====
    function formatTimeLeft(seconds) {
        if (seconds <= 0) return '00:00';
        var h = Math.floor(seconds / 3600);
        var m = Math.floor((seconds % 3600) / 60);
        var s = seconds % 60;
        if (h > 0) {
            return (h < 10 ? '0' + h : h) + ':' + (m < 10 ? '0' + m : m) + ':' + (s < 10 ? '0' + s : s);
        }
        return (m < 10 ? '0' + m : m) + ':' + (s < 10 ? '0' + s : s);
    }

    // ===== COUNTDOWN UPDATER =====
    function startCountdowns() {
        if (window._countdownInterval) clearInterval(window._countdownInterval);
        window._countdownInterval = setInterval(function() {
            var items = document.querySelectorAll('.movie-item');
            items.forEach(function(item) {
                var expireAt = new Date(item.dataset.expireAt).getTime();
                var now = Date.now();
                var diff = Math.floor((expireAt - now) / 1000);
                var durationEl = item.querySelector('.duration');
                var progressFill = item.querySelector('.progress-fill');
                var watchLink = item.querySelector('.watch-link');

                if (diff <= 0) {
                    durationEl.textContent = '00:00';
                    progressFill.style.width = '0%';
                    watchLink.classList.add('disabled');
                    watchLink.textContent = 'Expired';
                } else {
                    durationEl.textContent = formatTimeLeft(diff);
                    var totalSeconds = 600;
                    var pct = Math.min(100, Math.max(0, (diff / totalSeconds) * 100));
                    progressFill.style.width = pct + '%';
                }
            });
        }, 1000);
    }

    // ===== SHOW MENU =====
    function showMenu(movieId) {
        showToast('Menu for movie ' + movieId);
    }

    // ===== SHOW TOAST =====
    function showToast(msg) {
        toast.textContent = msg;
        toast.classList.add('visible');
        setTimeout(function() { toast.classList.remove('visible'); }, 3000);
    }

    // ===== PREVENT CLICK IF EXPIRED =====
    window.isExpired = function(event, el) {
        if (el.classList.contains('disabled')) {
            event.preventDefault();
            showToast('This movie has expired. Please purchase again.');
            return false;
        }
        return true;
    };

    // ===== INIT =====
    loadMyMovies();
})();
