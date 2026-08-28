(function() {
    'use strict';

    var TOKEN_KEY = 'akmark_token';

    // ===== CHECK LOGIN & REDIRECT IF LOGGED IN =====
    function checkLoginAndRedirect() {
        var token = localStorage.getItem(TOKEN_KEY);
        if (token) {
            window.location.href = 'home.html';
            return true;
        }
        return false;
    }

    // ===== FETCH MOVIES (NO LOGIN REQUIRED) =====
    var MOVIES = [];
    var SERIES = [];
    var allFilms = [];
    var currentCategory = 'all';
    var currentTranslator = 'all';

    function $(sel) { return document.querySelector(sel); }
    function $$(sel) { return document.querySelectorAll(sel); }

    var latestGrid = $('#latestGrid');
    var homeGrid = $('#homeGrid');
    var translatorContainer = $('#translatorContainer');

    function formatPrice(price) {
        return 'MK ' + Number(price || 0).toLocaleString();
    }

    function movieCardHTML(movie) {
        return '<div class="movie-card" data-id="' + movie.id + '">' +
            (movie.translator_name ? '<div class="translator-badge">' + movie.translator_name + '</div>' : '') +
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
            container.innerHTML = '<div class="empty-state"><i class="bi bi-film"></i><h4>No movies found</h4></div>';
            return;
        }
        var html = '';
        for (var i = 0; i < items.length; i++) {
            html += movieCardHTML(items[i]);
        }
        container.innerHTML = html;
    }

    function getUniqueTranslators() {
        var translators = {};
        allFilms.forEach(function(m) {
            if (m.translator_name) translators[m.translator_name] = true;
        });
        return Object.keys(translators);
    }

    function renderTranslatorBar() {
        var translators = getUniqueTranslators();
        var html = '<button class="translator-chip active" data-translator="all">All Translators</button>';
        translators.forEach(function(t) {
            html += '<button class="translator-chip" data-translator="' + t + '">' + t + '</button>';
        });
        translatorContainer.innerHTML = html;

        translatorContainer.querySelectorAll('.translator-chip').forEach(function(chip) {
            chip.addEventListener('click', function() {
                translatorContainer.querySelectorAll('.translator-chip').forEach(function(c) { c.classList.remove('active'); });
                this.classList.add('active');
                currentTranslator = this.dataset.translator;
                renderAll();
            });
        });
    }

    function getLatestFilms() {
        var latestFilms = allFilms.filter(function(m) { return m.latest === true; });
        if (latestFilms.length > 0) return latestFilms;
        return allFilms.slice(0, 6);
    }

    function getFilteredFilms() {
        var items = allFilms;
        if (currentCategory !== 'all') items = items.filter(function(m) { return m.category === currentCategory; });
        if (currentTranslator !== 'all') items = items.filter(function(m) { return m.translator_name === currentTranslator; });
        return items;
    }

    function renderAll() {
        var filtered = getFilteredFilms();
        var latest = getLatestFilms().filter(function(m) {
            return (currentCategory === 'all' || m.category === currentCategory) &&
                   (currentTranslator === 'all' || m.translator_name === currentTranslator);
        });
        if (latest.length === 0) latest = filtered.slice(0, 6);
        renderGrid(latestGrid, latest);
        renderGrid(homeGrid, filtered);
    }

    // ===== HIDE LOADER, SHOW CONTENT =====
    function showContent() {
        document.getElementById('fullLoader').classList.add('hidden');
        document.getElementById('mainContent').style.display = 'block';

        // Show header, subheader, translator, bottom nav
        $('#mainHeader').classList.add('visible');
        $('#subheader').classList.add('visible');
        $('#translatorBar').classList.add('visible');
        $('#bottomNav').classList.add('visible');
    }

    async function fetchMovies() {
        try {
            const SUPABASE_URL = window.SUPABASE_URL;
            const response = await fetch(`${SUPABASE_URL}/functions/v1/films-api`, {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' }
            });
            const text = await response.text();
            let data;
            try { data = JSON.parse(text); } catch (e) { throw new Error('Invalid server response'); }
            if (!response.ok) throw new Error(data.error || 'Failed to fetch movies');

            const allMovies = data.movies || [];
            MOVIES = allMovies.filter(m => m.episode_number === null || m.episode_number === undefined);
            SERIES = allMovies.filter(m => m.episode_number !== null && m.episode_number !== undefined);
            allFilms = allMovies.slice();

            renderTranslatorBar();
            renderAll();
            showContent();
        } catch (error) {
            console.error('Error fetching movies:', error);
            // Even on error, show content (empty state)
            latestGrid.innerHTML = '<div class="empty-state">Failed to load movies</div>';
            homeGrid.innerHTML = '<div class="empty-state">Failed to load movies</div>';
            showContent();
        }
    }

    // ===== SEARCH FUNCTIONALITY =====
    function initSearch() {
        var searchNavBtn = $('#searchNavBtn');
        var searchSubheader = $('#searchSubheader');
        var searchInput = $('#searchInput');
        var searchResults = $('#searchResults');

        if (searchNavBtn) {
            searchNavBtn.addEventListener('click', function(e) {
                e.preventDefault();
                searchSubheader.classList.toggle('open');
                if (searchSubheader.classList.contains('open')) {
                    searchInput.focus();
                } else {
                    searchInput.value = '';
                    searchResults.classList.remove('visible');
                }
            });
        }

        if (searchInput) {
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

            document.addEventListener('click', function(e) {
                if (!searchSubheader.contains(e.target)) {
                    searchResults.classList.remove('visible');
                }
            });
        }
    }

    // ===== CATEGORY CHIPS =====
    function initCategories() {
        var subheaderChips = $$('#subheader .category-chip');
        subheaderChips.forEach(function(chip) {
            chip.addEventListener('click', function() {
                subheaderChips.forEach(function(c) { c.classList.remove('active'); });
                this.classList.add('active');
                currentCategory = this.dataset.category;
                var filtered = getFilteredFilms();
                renderGrid(homeGrid, filtered);
                var latest = getLatestFilms().filter(function(m) {
                    return (currentCategory === 'all' || m.category === currentCategory) &&
                           (currentTranslator === 'all' || m.translator_name === currentTranslator);
                });
                if (latest.length === 0) latest = filtered.slice(0, 6);
                renderGrid(latestGrid, latest);
            });
        });
    }

    // ===== CARD CLICK (view film) =====
    function initCardClick() {
        document.querySelectorAll('.movie-grid').forEach(function(grid) {
            grid.addEventListener('click', function(e) {
                var card = e.target.closest('.movie-card');
                if (!card) return;
                var id = card.dataset.id;
                if (id) {
                    window.location.href = 'view-film.html?id=' + id;
                }
            });
        });
    }

    // ===== INIT =====
    function init() {
        // Check login immediately
        if (checkLoginAndRedirect()) {
            return; // Redirecting
        }

        // Fetch movies (public)
        fetchMovies();

        // Init search, categories, card click
        initSearch();
        initCategories();
        initCardClick();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
