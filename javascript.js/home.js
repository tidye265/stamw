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

    // ===== MOVIE DATA (keep as is) =====
    var MOVIES = [ ... ]; // fill with your existing data
    var SERIES = [ ... ]; // fill with your existing data

    // ===== DOM ELEMENTS (minus payment) =====
    var homeGrid = document.getElementById('homeGrid');
    var moviesGrid = document.getElementById('moviesGrid');
    var seriesGrid = document.getElementById('seriesGrid');
    var categoriesGrid = document.getElementById('categoriesGrid');
    var movieDetail = document.getElementById('movieDetail');
    var accessExpiredEl = document.getElementById('accessExpired');
    var detailBack = document.getElementById('detailBack');
    var detailBackBtn = document.getElementById('detailBackBtn');
    var detailPoster = document.querySelector('#detailPoster img');
    var detailTitle = document.getElementById('detailTitle');
    var detailTags = document.getElementById('detailTags');
    var detailDesc = document.getElementById('detailDesc');
    var detailPrice = document.getElementById('detailPrice');
    var detailWatchBtn = document.getElementById('detailWatchBtn');
    var expiredWatchBtn = document.getElementById('expiredWatchBtn');

    // Player elements (no payment)
    var playerOverlay = document.getElementById('playerOverlay');
    var closePlayer = document.getElementById('closePlayer');
    var playerMovieTitle = document.getElementById('playerMovieTitle');
    var playPauseBtn = document.getElementById('playPauseBtn');
    var volumeBtn = document.getElementById('volumeBtn');
    var fullscreenBtn = document.getElementById('fullscreenBtn');
    var progressFill = document.getElementById('progressFill');
    var progressTrack = document.getElementById('progressTrack');
    var currentTimeEl = document.getElementById('currentTime');
    var totalDurationEl = document.getElementById('totalDuration');

    // Search elements
    var searchNavBtn = document.getElementById('searchNavBtn'); // fixed id
    var searchSubheader = document.getElementById('searchSubheader');
    var searchInput = document.getElementById('searchInput');
    var searchResults = document.getElementById('searchResults');

    var movieSearchInput = document.getElementById('movieSearchInput');
    var clearMovieSearch = document.getElementById('clearMovieSearch');
    var logoHome = document.getElementById('logoHome');
    var toast = document.getElementById('toast');
    var toastMsg = document.getElementById('toastMsg');

    var desktopNav = document.querySelectorAll('#desktopNav a');
    var bottomNav = document.querySelectorAll('#bottomNav a');
    var subheaderChips = document.querySelectorAll('#subheader .category-chip');

    var TRANSLATORS = { ... }; // keep

    // ===== FUNCTIONS =====
    function showToast(msg) { ... }

    function getTranslatorForMovie(movieId) { ... }
    function formatDuration(min) { ... }
    function formatPrice(price) { ... }

    function movieCardHTML(movie) { ... }
    function renderTranslatorGroups(container, items) { ... }
    function renderGrid(container, items) { ... }

    function filterByCategory(items, category) { ... }
    function filterBySearch(items, query) { ... }

    // ===== NAVIGATION (simplified) =====
    function navigateTo(page) {
        // Let browser handle actual pages
        if (page === 'account') {
            window.location.href = 'account.html';
            return;
        }
        if (page === 'movies') {
            window.location.href = 'movies.html';
            return;
        }
        if (page === 'series') {
            window.location.href = 'series.html';
            return;
        }
        if (page === 'categories') {
            window.location.href = 'categories.html';
            return;
        }

        // Internal sections (home, detail)
        var sections = {
            home: document.getElementById('pageHome'),
            movies: document.getElementById('pageMovies'),
            series: document.getElementById('pageSeries'),
            categories: document.getElementById('pageCategories')
        };

        for (var key in sections) {
            if (sections.hasOwnProperty(key)) sections[key].classList.remove('active');
        }
        movieDetail.classList.remove('active');
        accessExpiredEl.classList.remove('active');

        if (page === 'detail') {
            movieDetail.classList.add('active');
            if (accessExpired) accessExpiredEl.classList.add('active');
            return;
        }

        if (sections[page]) sections[page].classList.add('active');
        currentPage = page;
        // Update nav active states
        desktopNav.forEach(function(a) { a.classList.toggle('active', a.dataset.page === page); });
        bottomNav.forEach(function(a) { a.classList.toggle('active', a.dataset.page === page); });
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    // ===== SEARCH =====
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
            var filtered = MOVIES.filter(function(m) {
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

    // ===== MOVIE DETAIL & PLAYER =====
    function showMovieDetail(movieId) {
        var movie = getMovieById(movieId);
        if (!movie) return;
        currentMovie = movie;
        selectedMovieId = movieId;
        // ... (fill detail)
        navigateTo('detail');
    }

    function openPlayer() {
        playerMovieTitle.textContent = currentMovie.title;
        playerOverlay.classList.add('active');
        simulatePlayback();
    }

    // (simulatePlayback, closePlayer as before)

    // ===== RENDER =====
    function renderAll() { ... }
    function renderSkeleton() { ... }

    // ===== INIT =====
    function init() {
        checkLogin();
        renderSkeleton();
        setTimeout(renderAll, 800);
        initSearch();

        // DESKTOP NAV
        desktopNav.forEach(function(a) {
            a.addEventListener('click', function(e) {
                e.preventDefault();
                var page = this.dataset.page;
                navigateTo(page);
            });
        });

        // BOTTOM NAV - FIXED
        bottomNav.forEach(function(a) {
            a.addEventListener('click', function(e) {
                // If it's search button, handle specially
                if (this.id === 'searchNavBtn') {
                    e.preventDefault();
                    toggleSearchSubheader();
                    return;
                }
                // For other links, do NOT preventDefault – let browser navigate to actual file
                // (href="movies.html" etc.)
                // No extra code needed.
            });
        });

        logoHome.addEventListener('click', function() {
            window.location.href = 'home.html';
        });

        // Movie grid click
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

        detailWatchBtn.addEventListener('click', function() {
            if (!currentMovie) return;
            openPlayer(); // direct open player, no payment
        });

        expiredWatchBtn.addEventListener('click', function() {
            if (!currentMovie) return;
            showToast('Access expired. Purchase needed.');
        });

        // Player controls
        closePlayer.addEventListener('click', closePlayer);
        playPauseBtn.addEventListener('click', function() { ... });
        volumeBtn.addEventListener('click', function() { ... });
        fullscreenBtn.addEventListener('click', function() { ... });
        progressTrack.addEventListener('click', function(e) { ... });

        // Movie search inside Movies section
        movieSearchInput.addEventListener('input', function() {
            renderGrid(moviesGrid, filterBySearch(MOVIES, this.value));
        });
        clearMovieSearch.addEventListener('click', function() {
            movieSearchInput.value = '';
            renderGrid(moviesGrid, MOVIES);
        });

        // Subheader chips
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
