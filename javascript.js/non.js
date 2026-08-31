(function() {
    'use strict';

    var TOKEN_KEY = 'akmark_token';
    var searchInitialized = false;

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

    // Infinite scroll – 12 initial, +12 on scroll
    var visibleCount = 12;
    var SCROLL_STEP = 12;
    var sentinel = null;
    var isLoadingMore = false;

    function $(sel) { return document.querySelector(sel); }
    function $$(sel) { return document.querySelectorAll(sel); }

    var latestGrid = $('#latestGrid');
    var homeGrid = $('#homeGrid');
    var translatorContainer = $('#translatorContainer');
    var myMoviesBadge = $('#myMoviesBadge');
    var pullRefreshEl = $('#pullRefresh');
    var startY = 0;
    var pulling = false;

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

    // ===== DEDUPLICATION (TRIM NAMES) =====
    function getUniqueTranslators() {
        var translators = {};
        allFilms.forEach(function(m) {
            if (m.translator_name) {
                var name = m.translator_name.trim();
                if (name) translators[name] = true;
            }
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
                resetAndRender();
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

        var visibleItems = filtered.slice(0, visibleCount);
        renderGrid(homeGrid, visibleItems);
    }

    function resetAndRender() {
        visibleCount = 12; // Reset to 12
        renderAll();
    }

    function showContent() {
        document.getElementById('fullLoader').classList.add('hidden');
        document.getElementById('mainContent').style.display = 'block';

        $('#mainHeader').classList.add('visible');
        $('#subheader').classList.add('visible');
        $('#translatorBar').classList.add('visible');
        $('#bottomNav').classList.add('visible');

        initSearch();
        initInfiniteScroll();
        initPullToRefresh();
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

            if (myMoviesBadge) myMoviesBadge.textContent = '0';

            renderTranslatorBar();
            renderAll();
            showContent();
        } catch (error) {
            console.error('Error fetching movies:', error);
            latestGrid.innerHTML = '<div class="empty-state">Failed to load movies</div>';
            homeGrid.innerHTML = '<div class="empty-state">Failed to load movies</div>';
            showContent();
        }
    }

    // ===== INFINITE SCROLL (12 step) =====
    function initInfiniteScroll() {
        sentinel = document.getElementById('scrollSentinel');
        if (!sentinel) return;

        var observer = new IntersectionObserver(function(entries) {
            if (entries[0].isIntersecting && !isLoadingMore) {
                isLoadingMore = true;
                setTimeout(function() {
                    var filtered = getFilteredFilms();
                    if (visibleCount < filtered.length) {
                        visibleCount += SCROLL_STEP;
                        renderAll();
                    }
                    isLoadingMore = false;
                }, 500);
            }
        }, { root: null, rootMargin: '0px', threshold: 0.1 });

        observer.observe(sentinel);
    }

    // ===== SEARCH FUNCTIONALITY =====
    function initSearch() {
        if (searchInitialized) return;
        searchInitialized = true;

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
                    return (m.title && m.title.toLowerCase().includes(query)) ||
                           (m.translator_name && m.translator_name.toLowerCase().includes(query));
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
                var id = item.dataset.id;
                if (id) {
                    window.location.href = 'view-film.html?id=' + id;
                }
                searchSubheader.classList.remove('open');
                searchResults.classList.remove('visible');
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
                resetAndRender();
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
                    window.location.href = 'non-view.html?id=' + id;
                }
            });
        });
    }

    // ===== PULL TO REFRESH =====
    function initPullToRefresh() {
        if ('ontouchstart' in window) {
            document.addEventListener('touchstart', function(e) {
                if (window.scrollY === 0) {
                    startY = e.touches[0].clientY;
                    pulling = true;
                }
            }, { passive: true });

            document.addEventListener('touchmove', function(e) {
                if (!pulling) return;
                var currentY = e.touches[0].clientY;
                var delta = currentY - startY;
                if (delta > 80 && window.scrollY === 0) {
                    pullRefreshEl.classList.add('show');
                }
            }, { passive: true });

            document.addEventListener('touchend', function() {
                if (pulling && pullRefreshEl.classList.contains('show')) {
                    pullRefreshEl.classList.remove('show');
                    // Refresh: reset view and fetch again
                    resetAndRender();
                    fetchMovies();
                }
                pulling = false;
            }, { passive: true });
        }
    }

    // ===== SECURITY (Right-click, DevTools, Watermark) =====
    function initSecurity() {
        document.addEventListener('contextmenu', function(e) {
            e.preventDefault();
        });

        document.addEventListener('keydown', function(e) {
            if (e.key === 'F12' ||
                (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'J' || e.key === 'C')) ||
                (e.ctrlKey && e.key === 'u')) {
                e.preventDefault();
                return false;
            }
        });

        document.addEventListener('keyup', function(e) {
            if (e.key === 'PrintScreen') {
                var watermark = document.getElementById('watermark');
                watermark.classList.add('active');
                setTimeout(function() {
                    watermark.classList.remove('active');
                }, 1000);
            }
        });
    }

    // ===== INIT =====
    function init() {
        if (checkLoginAndRedirect()) {
            return;
        }

        initCategories();
        initCardClick();
        initSecurity();
        fetchMovies();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
