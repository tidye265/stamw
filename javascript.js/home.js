(function() {
    'use strict';

    // ===== LOGIN CHECKER =====
    function checkLogin() {
        var token = localStorage.getItem('akmark_token');
        if (!token) {
            window.location.href = '/register';
            return;
        }

        fetch('https://jnqwvmxuieeelvukhcsq.supabase.co/functions/v1/login-checker', {
            method: 'GET',
            headers: {
                'Authorization': 'Bearer ' + token,
                'Content-Type': 'application/json'
            }
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
            if (data.user) {
                localStorage.setItem('akmark_user', JSON.stringify(data.user));
            }
        })
        .catch(function() {
            clearSession();
            window.location.href = '/register';
        });
    }

    function clearSession() {
        localStorage.removeItem('akmark_token');
        localStorage.removeItem('akmark_refresh_token');
        localStorage.removeItem('akmark_user');
    }

    var MOVIES = [];
    var SERIES = [];
    var allFilms = []; // combined for "All" section
    var currentMovie = null;
    var currentPage = 'home';
    var playbackInterval = null;
    var playbackProgress = 37;
    var selectedMovieId = null;
    var accessExpired = false;

    function $(sel) { return document.querySelector(sel); }
    function $$(sel) { return document.querySelectorAll(sel); }

    var homeGrid = $('#homeGrid');
    var latestGrid = $('#latestGrid'); // New element
    var moviesGrid = $('#moviesGrid');
    var seriesGrid = $('#seriesGrid');
    var categoriesGrid = $('#categoriesGrid');
    var movieDetail = $('#movieDetail');
    var detailBack = $('#detailBack');
    var detailBackBtn = $('#detailBackBtn');
    var detailPoster = $('#detailPoster').querySelector('img');
    var detailTitle = $('#detailTitle');
    var detailTags = $('#detailTags');
    var detailDesc = $('#detailDesc');
    var detailPrice = $('#detailPrice');
    var detailWatchBtn = $('#detailWatchBtn');

    var playerOverlay = $('#playerOverlay');
    var closePlayer = $('#closePlayer');
    var playerMovieTitle = $('#playerMovieTitle');
    var playPauseBtn = $('#playPauseBtn');
    var volumeBtn = $('#volumeBtn');
    var fullscreenBtn = $('#fullscreenBtn');
    var progressFill = $('#progressFill');
    var progressTrack = $('#progressTrack');
    var currentTimeEl = $('#currentTime');
    var totalDurationEl = $('#totalDuration');

    var searchNavBtn = $('#searchNavBtn');
    var searchSubheader = $('#searchSubheader');
    var searchInput = $('#searchInput');
    var searchResults = $('#searchResults');
    var movieSearchInput = $('#movieSearchInput');
    var logoHome = $('#logoHome');
    var toast = $('#toast');
    var toastMsg = $('#toastMsg');

    var desktopNav = $$('#desktopNav a');
    var bottomNav = $$('#bottomNav a');
    var subheaderChips = $$('#subheader .category-chip');

    function formatPrice(price) {
        return 'MK ' + Number(price || 0).toLocaleString();
    }

    function showToast(msg, icon) {
        icon = icon || 'bi-check-circle-fill';
        toastMsg.textContent = msg;
        toast.classList.add('visible');
        clearTimeout(toast._hide);
        toast._hide = setTimeout(function() { toast.classList.remove('visible'); }, 3000);
    }

    function getMovieById(id) {
        var movie = MOVIES.find(function(m) { return m.id === id; });
        if (movie) return movie;
        return SERIES.find(function(s) { return s.id === id; });
    }

    function movieCardHTML(movie) {
        // Only Price and Title (no translator name)
        return '<div class="movie-card" data-id="' + movie.id + '">' +
            '<div class="poster">' +
            '<img src="' + movie.poster_url + '" alt="' + movie.title + '" loading="lazy">' +
            '<span class="price-tag">' + formatPrice(movie.price) + '</span>' +
            '<span class="badge">' + movie.quality + '</span>' +
            '</div>' +
            '<div class="info">' +
            '<h3>' + movie.title + '</h3>' +
            '</div>' +
            '</div>';
    }

    function renderGrid(container, items) {
        if (!items || items.length === 0) {
            container.innerHTML = '<div class="empty-state"><i class="bi bi-film"></i><h4>No movies found</h4><p>Try adjusting your search or filter.</p></div>';
            return;
        }

        var html = '';
        for (var i = 0; i < items.length; i++) {
            html += movieCardHTML(items[i]);
        }
        container.innerHTML = html;
    }

    function filterByCategory(items, category) {
        if (category === 'all') return items;
        return items.filter(function(m) { return m.category === category; });
    }

    function filterBySearch(items, query) {
        if (!query.trim()) return items;
        var q = query.toLowerCase().trim();
        return items.filter(function(m) { return m.title.toLowerCase().includes(q) || m.genre.toLowerCase().includes(q); });
    }

    async function fetchMovies() {
        try {
            const SUPABASE_URL = window.SUPABASE_URL;
            const token = localStorage.getItem('akmark_token');
            const response = await fetch(`${SUPABASE_URL}/functions/v1/films-api`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + token
                }
            });
            const text = await response.text();
            let data;
            try { data = JSON.parse(text); } catch (e) { throw new Error('Invalid server response: ' + text); }
            if (!response.ok) throw new Error(data.error || 'Failed to fetch movies');

            const allMovies = data.movies || [];
            MOVIES = allMovies.filter(m => m.episode_number === null || m.episode_number === undefined);
            SERIES = allMovies.filter(m => m.episode_number !== null && m.episode_number !== undefined);
            // Combine all for "All" section (mixed movies + series)
            allFilms = allMovies.slice(); // copy all

            renderAll();
        } catch (error) {
            console.error('Error fetching movies:', error);
            MOVIES = [];
            SERIES = [];
            allFilms = [];
            renderAll();
            showToast('Failed to load movies', 'bi-exclamation-triangle-fill');
        }
    }

    function renderAll() {
        // Latest section – first 6 items from allFilms
        var latest = allFilms.slice(0, 6);
        renderGrid(latestGrid, latest);

        // Home "All" section – allFilms (mixed)
        renderGrid(homeGrid, allFilms);

        // Movies section
        renderGrid(moviesGrid, MOVIES);

        // Series section
        renderGrid(seriesGrid, SERIES);

        // Categories section (default: all movies)
        renderGrid(categoriesGrid, MOVIES);
    }

    function renderSkeleton() {
        var skeletonHTML = '';
        for (var i = 0; i < 6; i++) {
            skeletonHTML += '<div class="skeleton-card"></div>';
        }
        latestGrid.innerHTML = '<div class="movie-grid">' + skeletonHTML + '</div>';
        homeGrid.innerHTML = '<div class="movie-grid">' + skeletonHTML + '</div>';
        moviesGrid.innerHTML = '<div class="movie-grid">' + skeletonHTML + '</div>';
        seriesGrid.innerHTML = '<div class="movie-grid">' + skeletonHTML + '</div>';
        categoriesGrid.innerHTML = '<div class="movie-grid">' + skeletonHTML + '</div>';
    }

    function navigateTo(page) {
        if (page === 'account') { window.location.href = 'account.html'; return; }
        if (page === 'movies') { window.location.href = 'movies.html'; return; }
        if (page === 'series') { window.location.href = 'series.html'; return; }
        if (page === 'categories') { window.location.href = 'categories.html'; return; }

        var sections = {
            home: $('#pageHome'),
            movies: $('#pageMovies'),
            series: $('#pageSeries'),
            categories: $('#pageCategories')
        };

        for (var key in sections) {
            if (sections.hasOwnProperty(key)) sections[key].classList.remove('active');
        }
        movieDetail.classList.remove('active');

        if (page === 'detail') {
            movieDetail.classList.add('active');
            return;
        }

        if (sections[page]) sections[page].classList.add('active');
        currentPage = page;
        desktopNav.forEach(function(a) { a.classList.toggle('active', a.dataset.page === page); });
        bottomNav.forEach(function(a) { a.classList.toggle('active', a.dataset.page === page); });
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    function toggleSearchSubheader() {
        if (searchSubheader.classList.contains('open')) {
            searchSubheader.classList.remove('open');
            searchInput.value = '';
            searchResults.classList.remove('visible');
        } else {
            searchSubheader.classList.add('open');
            searchInput.focus();
        }
    }

    function initSearch() {
        searchNavBtn.addEventListener('click', function(e) {
            e.preventDefault();
            toggleSearchSubheader();
        });

        searchInput.addEventListener('input', function() {
            var query = this.value.toLowerCase().trim();
            if (!query) { searchResults.classList.remove('visible'); return; }
            var filtered = allFilms.filter(function(m) {
                return m.title.toLowerCase().includes(query) || m.genre.toLowerCase().includes(query);
            });
            if (filtered.length > 0) {
                searchResults.innerHTML = filtered.map(function(m) {
                    return '<div class="result-item" data-id="' + m.id + '">' + m.title + '</div>';
                }).join('');
                searchResults.classList.add('visible');
            } else {
                searchResults.innerHTML = '<div class="result-item">No movies found</div>';
                searchResults.classList.add('visible');
            }
        });

        searchResults.addEventListener('click', function(e) {
            var item = e.target.closest('.result-item');
            if (!item || !item.dataset.id) return;
            var id = parseInt(item.dataset.id);
            if (id) showMovieDetail(id);
            searchSubheader.classList.remove('open');
            searchResults.classList.remove('visible');
        });

        document.addEventListener('click', function(e) {
            if (!searchSubheader.contains(e.target)) {
                searchSubheader.classList.remove('open');
                searchResults.classList.remove('visible');
            }
        });
    }

    function showMovieDetail(movieId) {
        var movie = getMovieById(movieId);
        if (!movie) return;
        currentMovie = movie;
        selectedMovieId = movieId;

        detailPoster.src = movie.poster_url;
        detailTitle.textContent = movie.title;
        detailTags.innerHTML = '<span>' + (movie.genre || movie.category) + '</span>';
        detailDesc.textContent = movie.description;
        detailPrice.innerHTML = formatPrice(movie.price) + ' <small>one-time access</small>';
        navigateTo('detail');
    }

    // Watch button now redirects to view-film.html
    detailWatchBtn.addEventListener('click', function() {
        if (!currentMovie) return;
        window.location.href = 'view-film.html?id=' + currentMovie.id;
    });

    function openPlayer() {
        playerMovieTitle.textContent = currentMovie.title;
        playerOverlay.classList.add('active');
        simulatePlayback();
    }

    function simulatePlayback() {
        clearInterval(playbackInterval);
        playbackProgress = 37;
        progressFill.style.width = playbackProgress + '%';
        currentTimeEl.textContent = '0:49';
        playbackInterval = setInterval(function() {
            playbackProgress += 0.15;
            if (playbackProgress >= 100) {
                playbackProgress = 100;
                clearInterval(playbackInterval);
                playbackInterval = null;
                showToast('Movie ended. Access expired.', 'bi-clock-history');
                setTimeout(function() { closePlayer.click(); }, 2000);
                return;
            }
            progressFill.style.width = playbackProgress + '%';
            var totalSec = (currentMovie ? currentMovie.duration : 120) * 60;
            var currentSec = (playbackProgress / 100) * totalSec;
            var min = Math.floor(currentSec / 60);
            var sec = Math.floor(currentSec % 60);
            currentTimeEl.textContent = min + ':' + (sec < 10 ? '0' : '') + sec;
        }, 300);
    }

    function closePlayer() {
        clearInterval(playbackInterval);
        playbackInterval = null;
        playerOverlay.classList.remove('active');
    }

    function init() {
        checkLogin();
        renderSkeleton();
        fetchMovies();

        initSearch();

        desktopNav.forEach(function(a) {
            a.addEventListener('click', function(e) {
                e.preventDefault();
                var page = this.dataset.page;
                navigateTo(page);
            });
        });

        bottomNav.forEach(function(a) {
            a.addEventListener('click', function(e) {
                if (this.id === 'searchNavBtn') {
                    e.preventDefault();
                    toggleSearchSubheader();
                    return;
                }
            });
        });

        logoHome.addEventListener('click', function() {
            window.location.href = 'home.html';
        });

        document.querySelectorAll('.movie-grid').forEach(function(grid) {
            grid.addEventListener('click', function(e) {
                var card = e.target.closest('.movie-card');
                if (!card) return;
                var id = parseInt(card.dataset.id);
                if (id) showMovieDetail(id);
            });
        });

        detailBack.addEventListener('click', function() { navigateTo('home'); });
        detailBackBtn.addEventListener('click', function() { navigateTo('home'); });

        closePlayer.addEventListener('click', closePlayer);
        playPauseBtn.addEventListener('click', function() {
            var icon = this.querySelector('i');
            if (icon.classList.contains('bi-pause-fill')) {
                icon.className = 'bi-play-fill';
                clearInterval(playbackInterval); playbackInterval = null;
            } else {
                icon.className = 'bi-pause-fill';
                simulatePlayback();
            }
        });

        volumeBtn.addEventListener('click', function() {
            var icon = this.querySelector('i');
            icon.className = icon.classList.contains('bi-volume-up-fill') ? 'bi-volume-mute-fill' : 'bi-volume-up-fill';
        });

        fullscreenBtn.addEventListener('click', function() {
            if (!document.fullscreenElement) {
                if (document.documentElement.requestFullscreen) document.documentElement.requestFullscreen();
            } else {
                if (document.exitFullscreen) document.exitFullscreen();
            }
        });

        progressTrack.addEventListener('click', function(e) {
            var rect = this.getBoundingClientRect();
            var pct = (e.clientX - rect.left) / rect.width;
            playbackProgress = Math.min(100, Math.max(0, pct * 100));
            progressFill.style.width = playbackProgress + '%';
        });

        movieSearchInput.addEventListener('input', function() {
            renderGrid(moviesGrid, filterBySearch(MOVIES, this.value));
        });

        subheaderChips.forEach(function(chip) {
            chip.addEventListener('click', function() {
                subheaderChips.forEach(function(c) { c.classList.remove('active'); });
                this.classList.add('active');
                var cat = this.dataset.category;
                var filtered = filterByCategory(MOVIES, cat);
                renderGrid(homeGrid, filtered.length ? filtered : MOVIES.slice(0, 6));
                renderGrid(categoriesGrid, filtered);
            });
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
