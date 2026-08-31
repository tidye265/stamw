// my-movies.js
(function() {
    'use strict';

    // Check login
    var token = localStorage.getItem('akmark_token');
    if (!token) {
        window.location.href = 'login.html';
        return;
    }

    var SUPABASE_URL = window.SUPABASE_URL;
    var grid = document.getElementById('moviesGrid');
    var emptyState = document.getElementById('emptyState');
    var toast = document.getElementById('toast');

    // Fetch my movies
    async function loadMyMovies() {
        try {
            var res = await fetch(`${SUPABASE_URL}/functions/v1/my-film-api`, {
                method: 'GET',
                headers: { 'Authorization': 'Bearer ' + token }
            });
            var data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to load');
            
            if (!data.films || data.films.length === 0) {
                grid.innerHTML = '';
                emptyState.style.display = 'flex';
                return;
            }
            emptyState.style.display = 'none';
            renderMovies(data.films);
        } catch (err) {
            console.error('Error:', err);
            showToast('Failed to load your movies');
            grid.innerHTML = '';
            emptyState.style.display = 'flex';
        }
    }

    function renderMovies(films) {
        grid.innerHTML = '';
        films.forEach(function(film) {
            var card = document.createElement('div');
            card.className = 'movie-card';
            card.dataset.id = film.id;
            card.dataset.expireAt = film.expire_at;
            
            var timeLeftStr = formatTimeLeft(film.time_left_seconds);
            var isExpired = film.time_left_seconds <= 0;
            var watchBtnClass = isExpired ? 'expired' : '';
            var watchBtnText = isExpired ? 'Expired' : 'WATCH NOW';

            card.innerHTML = `
                <div class="poster">
                    <img src="${film.poster_url}" alt="${film.title}" loading="lazy">
                    <span class="badge">${film.quality || 'HD'}</span>
                </div>
                <div class="info">
                    <h3>${film.title}</h3>
                    <span class="time-left" data-countdown>${timeLeftStr}</span>
                    <a href="watch.html?id=${film.id}" class="watch-btn ${watchBtnClass}" onclick="return !isExpired(event, this)">${watchBtnText}</a>
                </div>
            `;
            grid.appendChild(card);
        });

        // Start countdown timers for each card
        startCountdowns();
    }

    function formatTimeLeft(seconds) {
        if (seconds <= 0) return 'Expired';
        var h = Math.floor(seconds / 3600);
        var m = Math.floor((seconds % 3600) / 60);
        var s = seconds % 60;
        if (h > 0) return h + 'h ' + m + 'm ' + s + 's left';
        return m + 'm ' + s + 's left';
    }

    function startCountdowns() {
        // Clear any existing intervals
        if (window._countdownInterval) clearInterval(window._countdownInterval);
        window._countdownInterval = setInterval(function() {
            var cards = document.querySelectorAll('.movie-card');
            cards.forEach(function(card) {
                var expireAt = new Date(card.dataset.expireAt).getTime();
                var now = Date.now();
                var diff = Math.floor((expireAt - now) / 1000);
                var timeLeftEl = card.querySelector('[data-countdown]');
                var watchBtn = card.querySelector('.watch-btn');
                if (diff <= 0) {
                    timeLeftEl.textContent = 'Expired';
                    watchBtn.classList.add('expired');
                    watchBtn.textContent = 'Expired';
                    watchBtn.onclick = function(e) { e.preventDefault(); };
                } else {
                    timeLeftEl.textContent = formatTimeLeft(diff);
                }
            });
        }, 1000);
    }

    function showToast(msg) {
        toast.textContent = msg;
        toast.classList.add('visible');
        setTimeout(function() { toast.classList.remove('visible'); }, 3000);
    }

    // Prevent click if expired
    window.isExpired = function(event, el) {
        if (el.classList.contains('expired')) {
            event.preventDefault();
            showToast('This movie has expired. Please purchase again.');
            return false;
        }
        return true;
    };

    // Load on start
    loadMyMovies();
})();
