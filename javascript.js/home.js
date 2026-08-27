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
    var allFilms = [];
    var currentMovie = null;
    var currentPage = 'home';
    var playbackInterval = null;
    var playbackProgress = 37;
    var selectedMovieId = null;
    var accessExpired = false;
    var currentCategory = 'all';
    var currentTranslator = 'all';

    function $(sel) { return document.querySelector(sel); }
    function $$(sel) { return document.querySelectorAll(sel); }

    var homeGrid = $('#homeGrid');
    var latestGrid = $('#latestGrid');
    var moviesGrid = $('#moviesGrid');
    var seriesGrid = $('#seriesGrid');
    var categoriesGrid = $('#categoriesGrid');
    var searchNavBtn = $('#searchNavBtn');
    var searchSubheader = $('#searchSubheader');
    var searchInput = $('#searchInput');
    var searchResults = $('#searchResults');
    var movieSearchInput = $('#movieSearchInput');
    var logoHome = $('#logoHome');
    var toast = $('#toast');
    var toastMsg = $('#toastMsg');
    var translatorContainer = $('#translatorContainer');
    var refreshBtn = $('#refreshBtn');

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

    function filterByTranslator(items, translator) {
        if (translator === 'all') return items;
        return items.filter(function(m) { return m.translator_name === translator; });
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
            allFilms = allMovies.slice();

            renderTranslatorBar();
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
        items = filterByCategory(items, currentCategory);
        items = filterByTranslator(items, currentTranslator);
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
        renderGrid(moviesGrid, filterByCategory(MOVIES, currentCategory).filter(function(m) {
            return currentTranslator === 'all' || m.translator_name === currentTranslator;
        }));
        renderGrid(seriesGrid, filterByCategory(SERIES, currentCategory).filter(function(m) {
            return currentTranslator === 'all' || m.translator_name === currentTranslator;
        }));
        renderGrid(categoriesGrid, filtered);
    }

    function renderSkeleton() {
        var skeletonHTML = '';
        for (var i = 0; i < 6; i++) {
            skeletonHTML += '<div class="skeleton-card"></div>';
        }
        latestGrid.innerHTML = skeletonHTML;
        homeGrid.innerHTML = skeletonHTML;
        moviesGrid.innerHTML = skeletonHTML;
        seriesGrid.innerHTML = skeletonHTML;
        categoriesGrid.innerHTML = skeletonHTML;
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

        if (sections[page]) sections[page].classList.add('active');
        currentPage = page;
        desktopNav.forEach(function(a) { a.classList.toggle('active', a.dataset.page === page); });
        bottomNav.forEach(function(a) { a.classList.toggle('active', a.dataset.page === page); });
        // Uchotse smooth scroll - use auto
        window.scrollTo({ top: 0, behavior: 'auto' });
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
            if (id) window.location.href = 'view-film.html?id=' + id;
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

    // ===== CARD CLICK -> REDIRECT TO view-film.html =====
    function handleCardClick(e) {
        var card = e.target.closest('.movie-card');
        if (!card) return;
        var id = card.dataset.id;
        if (id) {
            window.location.href = 'view-film.html?id=' + id;
        }
    }

    function initSecurity() {
        document.addEventListener('contextmenu', function(e) {
            e.preventDefault();
            showToast('Right-click disabled', 'bi-shield-lock-fill');
        });

        document.addEventListener('keydown', function(e) {
            if (e.key === 'F12') {
                e.preventDefault();
                showToast('Developer tools are blocked', 'bi-shield-lock-fill');
                return false;
            }
            if (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'J' || e.key === 'C')) {
                e.preventDefault();
                showToast('Developer tools are blocked', 'bi-shield-lock-fill');
                return false;
            }
            if (e.ctrlKey && e.key === 'u') {
                e.preventDefault();
                showToast('View source is blocked', 'bi-shield-lock-fill');
                return false;
            }
        });

        document.addEventListener('selectstart', function(e) {
            e.preventDefault();
        });

        document.addEventListener('keyup', function(e) {
            if (e.key === 'PrintScreen') {
                var wm = document.getElementById('watermark');
                wm.classList.add('active');
                setTimeout(function() { wm.classList.remove('active'); }, 1000);
            }
        });

        document.querySelectorAll('img').forEach(function(img) {
            img.addEventListener('dragstart', function(e) {
                e.preventDefault();
            });
        });
    }

    // ===== REFRESH FUNCTION =====
    function refreshMovies() {
        renderSkeleton();
        fetchMovies();
        showToast('Refreshing...', 'bi-arrow-repeat');
    }

    // ===== VISIBILITY CHANGE (for APK resume) =====
    document.addEventListener('visibilitychange', function() {
        if (document.visibilityState === 'visible') {
            refreshMovies();
        }
    });

    function init() {
        checkLogin();
        renderSkeleton();
        fetchMovies();

        initSearch();
        initSecurity();

        // Click on any movie grid -> redirect
        document.querySelectorAll('.movie-grid').forEach(function(grid) {
            grid.addEventListener('click', handleCardClick);
        });

        // Refresh button
        if (refreshBtn) {
            refreshBtn.addEventListener('click', refreshMovies);
        }

        logoHome.addEventListener('click', function() {
            window.location.href = 'home.html';
        });

        subheaderChips.forEach(function(chip) {
            chip.addEventListener('click', function() {
                subheaderChips.forEach(function(c) { c.classList.remove('active'); });
                this.classList.add('active');
                currentCategory = this.dataset.category;
                
                var filtered = filterByCategory(allFilms, currentCategory).filter(function(m) {
                    return currentTranslator === 'all' || m.translator_name === currentTranslator;
                });
                
                renderGrid(homeGrid, filtered);
                renderGrid(categoriesGrid, filtered);
                renderGrid(moviesGrid, filterByCategory(MOVIES, currentCategory).filter(function(m) {
                    return currentTranslator === 'all' || m.translator_name === currentTranslator;
                }));
                renderGrid(seriesGrid, filterByCategory(SERIES, currentCategory).filter(function(m) {
                    return currentTranslator === 'all' || m.translator_name === currentTranslator;
                }));
                
                var latest = getLatestFilms().filter(function(m) {
                    return (currentCategory === 'all' || m.category === currentCategory) &&
                           (currentTranslator === 'all' || m.translator_name === currentTranslator);
                });
                if (latest.length === 0) latest = filtered.slice(0, 6);
                renderGrid(latestGrid, latest);
            });
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
