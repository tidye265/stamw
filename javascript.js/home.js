// javascript.js/home.js
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

            // User valid – we can proceed (optionally store user info)
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

    // ===== MOVIE DATA =====
    var MOVIES = [
        { id: 1, title: 'The Last Horizon', genre: 'Sci-Fi', year: 2026, duration: 118, quality: '4K', description: 'A crew of astronauts embarks on a mission to the edge of the galaxy.', price: 1500, poster: 'https://images.unsplash.com/photo-1614726365723-49cfae92782e?w=400&h=600&fit=crop&crop=center&auto=format', category: 'actions', featured: true },
        { id: 2, title: 'Rising Tides', genre: 'Drama', year: 2025, duration: 104, quality: 'HD', description: 'In a small coastal town, a family struggles to keep their fishing business alive.', price: 1200, poster: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=400&h=600&fit=crop&crop=center&auto=format', category: 'indian', featured: true },
        { id: 3, title: 'Neon Dreams', genre: 'Thriller', year: 2025, duration: 96, quality: 'HD', description: 'A hacker in a dystopian city uncovers a conspiracy.', price: 1300, poster: 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=400&h=600&fit=crop&crop=center&auto=format', category: 'thriller', featured: true },
        { id: 4, title: 'The Forgotten Path', genre: 'Drama', year: 2024, duration: 112, quality: 'HD', description: 'A retired architect returns to his childhood village.', price: 1100, poster: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=400&h=600&fit=crop&crop=center&auto=format', category: 'indian', featured: false },
        { id: 5, title: 'Quantum Heist', genre: 'Action', year: 2026, duration: 128, quality: '4K', description: 'A team of elite thieves plans the most ambitious heist in history.', price: 1800, poster: 'https://images.unsplash.com/photo-1563986768609-322da13575f3?w=400&h=600&fit=crop&crop=center&auto=format', category: 'actions', featured: true },
        { id: 6, title: 'Summer Lights', genre: 'Romance', year: 2025, duration: 98, quality: 'HD', description: 'Two strangers meet at a music festival.', price: 1000, poster: 'https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?w=400&h=600&fit=crop&crop=center&auto=format', category: 'music', featured: false },
        { id: 7, title: 'Dark Matter', genre: 'Sci-Fi', year: 2024, duration: 135, quality: 'HD', description: 'A physicist discovers a way to manipulate dark matter.', price: 1400, poster: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=400&h=600&fit=crop&crop=center&auto=format', category: 'actions', featured: false },
        { id: 8, title: 'The Silent Echo', genre: 'Thriller', year: 2025, duration: 106, quality: 'HD', description: 'A journalist investigating a series of disappearances.', price: 1250, poster: 'https://images.unsplash.com/photo-1478720568477-152d9b164e63?w=400&h=600&fit=crop&crop=center&auto=format', category: 'thriller', featured: true },
        { id: 9, title: 'Laughing Under Rain', genre: 'Comedy', year: 2025, duration: 92, quality: 'HD', description: 'A group of old friends reunites for a weekend getaway.', price: 950, poster: 'https://images.unsplash.com/photo-1517486808906-6ca8b3f8e1c1?w=400&h=600&fit=crop&crop=center&auto=format', category: 'comedy', featured: false },
        { id: 10, title: 'The Last Stand', genre: 'Action', year: 2026, duration: 122, quality: '4K', description: 'A retired special forces operative is forced back into action.', price: 1600, poster: 'https://images.unsplash.com/photo-1514539079130-25950c84d65d?w=400&h=600&fit=crop&crop=center&auto=format', category: 'actions', featured: true },
        { id: 11, title: 'Midnight Express', genre: 'Thriller', year: 2024, duration: 100, quality: 'HD', description: 'A journalist boards a cross-country train and realizes one passenger is a fugitive.', price: 1150, poster: 'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?w=400&h=600&fit=crop&crop=center&auto=format', category: 'thriller', featured: false },
        { id: 12, title: 'Beyond the Stars', genre: 'Sci-Fi', year: 2025, duration: 145, quality: '4K', description: 'A team of explorers travels through a wormhole to a parallel universe.', price: 2000, poster: 'https://images.unsplash.com/photo-1462331940025-496dfbfc7564?w=400&h=600&fit=crop&crop=center&auto=format', category: 'actions', featured: true },
        { id: 13, title: 'The Garden of Words', genre: 'Romance', year: 2024, duration: 88, quality: 'HD', description: 'A landscape architect and a mysterious woman meet every day in a garden.', price: 900, poster: 'https://images.unsplash.com/photo-1518509562904-e7ef99cdcc93?w=400&h=600&fit=crop&crop=center&auto=format', category: 'koreans', featured: false },
        { id: 14, title: 'Crimson Tide', genre: 'Action', year: 2025, duration: 116, quality: 'HD', description: 'A naval officer must prevent a nuclear submarine from launching a missile.', price: 1350, poster: 'https://images.unsplash.com/photo-1517976487492-5750f3195933?w=400&h=600&fit=crop&crop=center&auto=format', category: 'actions', featured: false },
        { id: 15, title: 'Funny Bones', genre: 'Comedy', year: 2026, duration: 96, quality: 'HD', description: 'A struggling comedian inherits a run-down theater.', price: 1000, poster: 'https://images.unsplash.com/photo-1515187029135-18ee286d815b?w=400&h=600&fit=crop&crop=center&auto=format', category: 'comedy', featured: true },
        { id: 16, title: 'Echoes of Tomorrow', genre: 'Sci-Fi', year: 2026, duration: 130, quality: '4K', description: 'A time-traveling historian tries to prevent a catastrophic event.', price: 2100, poster: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=400&h=600&fit=crop&crop=center&auto=format', category: 'actions', featured: true },
        { id: 17, title: 'The Local Story', genre: 'Drama', year: 2025, duration: 108, quality: 'HD', description: 'A heartfelt story about a Malawian family.', price: 1100, poster: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=400&h=600&fit=crop&crop=center&auto=format', category: 'local', featured: false },
        { id: 18, title: 'K-Pop Love', genre: 'Romance', year: 2026, duration: 95, quality: 'HD', description: 'A romantic story set in the heart of Seoul.', price: 1300, poster: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&h=600&fit=crop&crop=center&auto=format', category: 'koreans', featured: true }
    ];

    var SERIES = [
        { id: 101, title: 'The Wire', genre: 'Drama', year: 2024, duration: 60, quality: 'HD', description: 'A gripping series about the lives of police officers.', price: 2500, poster: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=400&h=600&fit=crop&crop=center&auto=format', category: 'indian', featured: true },
        { id: 102, title: 'Space Frontier', genre: 'Sci-Fi', year: 2025, duration: 55, quality: '4K', description: 'In the year 2150, humanity has colonized the solar system.', price: 2800, poster: 'https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?w=400&h=600&fit=crop&crop=center&auto=format', category: 'actions', featured: true },
        { id: 103, title: 'City of Shadows', genre: 'Thriller', year: 2024, duration: 58, quality: 'HD', description: 'A detective in a corrupt city uncovers a conspiracy.', price: 2200, poster: 'https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?w=400&h=600&fit=crop&crop=center&auto=format', category: 'thriller', featured: false },
        { id: 104, title: 'Laugh Track', genre: 'Comedy', year: 2025, duration: 30, quality: 'HD', description: 'A behind-the-scenes look at a late-night comedy show.', price: 1800, poster: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&h=600&fit=crop&crop=center&auto=format', category: 'comedy', featured: false },
        { id: 105, title: 'Love in the City', genre: 'Romance', year: 2024, duration: 45, quality: 'HD', description: 'A romantic anthology series following different couples.', price: 1900, poster: 'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?w=400&h=600&fit=crop&crop=center&auto=format', category: 'koreans', featured: false }
    ];

    var currentMovie = null;
    var currentPage = 'home';
    var playbackInterval = null;
    var playbackProgress = 37;
    var selectedMovieId = null;
    var accessExpired = false;

    function $(sel) { return document.querySelector(sel); }
    function $$(sel) { return document.querySelectorAll(sel); }

    // ===== DOM ELEMENTS =====
    var homeGrid = $('#homeGrid');
    var moviesGrid = $('#moviesGrid');
    var seriesGrid = $('#seriesGrid');
    var categoriesGrid = $('#categoriesGrid');
    var movieDetail = $('#movieDetail');
    var accessExpiredEl = $('#accessExpired');
    var detailBack = $('#detailBack');
    var detailBackBtn = $('#detailBackBtn');
    var detailPoster = $('#detailPoster').querySelector('img');
    var detailTitle = $('#detailTitle');
    var detailTags = $('#detailTags');
    var detailDesc = $('#detailDesc');
    var detailPrice = $('#detailPrice');
    var detailWatchBtn = $('#detailWatchBtn');
    var expiredWatchBtn = $('#expiredWatchBtn');

    var paymentOverlay = $('#paymentOverlay');
    var paymentModal = $('#paymentModal');
    var closePayment = $('#closePayment');
    var pmThumb = $('#pmThumb');
    var pmTitle = $('#pmTitle');
    var pmMeta = $('#pmMeta');
    var pmPrice = $('#pmPrice');
    var payNowBtn = $('#payNowBtn');
    var paymentFormState = $('#paymentFormState');
    var paymentPending = $('#paymentPending');
    var paymentSuccess = $('#paymentSuccess');
    var paymentFailed = $('#paymentFailed');
    var checkPaymentStatusBtn = $('#checkPaymentStatus');
    var continueWatchBtn = $('#continueWatchBtn');
    var retryPaymentBtn = $('#retryPaymentBtn');

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

    var movieSearchInput = $('#movieSearchInput');
    var clearMovieSearch = $('#clearMovieSearch');
    var logoHome = $('#logoHome');
    var toast = $('#toast');
    var toastMsg = $('#toastMsg');

    var desktopNav = $$('#desktopNav a');
    var bottomNav = $$('#bottomNav a');
    var subheaderChips = $$('#subheader .category-chip');

    // Search elements (added in home.html)
    var searchNavBtn = $('#mobileSearchBtn');
    var searchSubheader = $('#searchSubheader');
    var searchInput = $('#searchInput');
    var searchResults = $('#searchResults');

    var TRANSLATORS = {
        akilla: { name: 'AKILLA INTERNTENMENT' },
        denmark: { name: 'DENMARK INTERNTENMENT' }
    };

    function getTranslatorForMovie(movieId) {
        return (movieId % 2 === 0) ? TRANSLATORS.akilla : TRANSLATORS.denmark;
    }

    function formatDuration(min) {
        var h = Math.floor(min / 60);
        var m = min % 60;
        return h > 0 ? h + 'h ' + m + 'm' : m + 'm';
    }

    function formatPrice(price) {
        return 'MK ' + price.toLocaleString();
    }

    function showToast(msg, icon) {
        icon = icon || 'bi-check-circle-fill';
        toastMsg.textContent = msg;
        toast.querySelector('i').className = icon;
        toast.classList.add('visible');
        clearTimeout(toast._hide);
        toast._hide = setTimeout(function() {
            toast.classList.remove('visible');
        }, 3000);
    }

    function getMovieById(id) {
        var movie = MOVIES.find(function(m) { return m.id === id; });
        if (movie) return movie;
        return SERIES.find(function(s) { return s.id === id; });
    }

    function movieCardHTML(movie) {
        return '<div class="movie-card" data-id="' + movie.id + '">' +
            '<div class="poster">' +
            '<img src="' + movie.poster + '" alt="' + movie.title + '" loading="lazy">' +
            '<span class="price-tag">' + formatPrice(movie.price) + '</span>' +
            '<span class="badge">' + movie.quality + '</span>' +
            '</div>' +
            '<div class="info">' +
            '<h3>' + movie.title + '</h3>' +
            '</div>' +
            '</div>';
    }

    function renderTranslatorGroups(container, items) {
        if (!items || items.length === 0) {
            container.innerHTML = '<div class="empty-state"><i class="bi bi-film"></i><h4>No movies found</h4><p>Try adjusting your search or filter.</p></div>';
            return;
        }

        var groups = {};
        items.forEach(function(movie) {
            var translator = getTranslatorForMovie(movie.id);
            if (!groups[translator.name]) {
                groups[translator.name] = { translator: translator, movies: [] };
            }
            groups[translator.name].movies.push(movie);
        });

        var html = '';
        for (var name in groups) {
            var group = groups[name];
            html += '<div class="translator-group">';
            html += '<div class="translator-header">';
            html += '<div class="profile-circle"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg></div>';
            html += '<span class="name">' + group.translator.name + '</span>';
            html += '</div>';
            html += '<div class="movie-grid">';
            for (var i = 0; i < group.movies.length; i++) {
                html += movieCardHTML(group.movies[i]);
            }
            html += '</div>';
            html += '</div>';
        }

        container.innerHTML = html;
    }

    function renderGrid(container, items) {
        renderTranslatorGroups(container, items);
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

    function navigateTo(page) {
        for (var key in pageSections) {
            if (pageSections.hasOwnProperty(key)) pageSections[key].classList.remove('active');
        }
        movieDetail.classList.remove('active');
        accessExpiredEl.classList.remove('active');

        if (page === 'detail') {
            movieDetail.classList.add('active');
            if (accessExpired) accessExpiredEl.classList.add('active');
            return;
        }

        if (page === 'account') {
            window.location.href = '/account';
            return;
        }

        if (page === 'search-mobile') {
            toggleSearchSubheader();
            return;
        }

        if (pageSections[page]) pageSections[page].classList.add('active');
        currentPage = page;
        desktopNav.forEach(function(a) { a.classList.toggle('active', a.dataset.page === page); });
        bottomNav.forEach(function(a) { a.classList.toggle('active', a.dataset.page === page); });
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    // ===== SEARCH SUBHEADER TOGGLE =====
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

    // ===== SEARCH FUNCTIONALITY =====
    function initSearch() {
        if (!searchInput) return;
        searchInput.addEventListener('input', function() {
            var query = this.value.toLowerCase().trim();
            if (!query) {
                searchResults.classList.remove('visible');
                return;
            }
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

        // Click on result to open movie detail
        searchResults.addEventListener('click', function(e) {
            var item = e.target.closest('.result-item');
            if (!item || !item.dataset.id) return;
            var id = parseInt(item.dataset.id);
            if (id) showMovieDetail(id);
            searchSubheader.classList.remove('open');
            searchResults.classList.remove('visible');
        });

        // Close search when clicking outside
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

        var expires = sessionStorage.getItem('akmark_access_expires_' + movieId);
        var paid = sessionStorage.getItem('akmark_paid_' + movieId);
        accessExpired = (paid && expires && Date.now() > Number(expires));

        detailPoster.src = movie.poster;
        detailTitle.textContent = movie.title;
        var cat = movie.genre || movie.category;
        detailTags.innerHTML = '<span>' + cat + '</span><span class="dot">•</span><span>' + formatDuration(movie.duration) + '</span><span class="dot">•</span><span>' + movie.quality + '</span><span class="dot">•</span><span>' + movie.year + '</span>';
        detailDesc.textContent = movie.description;
        detailPrice.innerHTML = formatPrice(movie.price) + ' <small>one-time access</small>';
        navigateTo('detail');
        if (accessExpired) accessExpiredEl.classList.add('active');
        else accessExpiredEl.classList.remove('active');
    }

    function openPayment(movie) {
        if (!movie) return;
        currentMovie = movie;
        selectedMovieId = movie.id;
        pmThumb.src = movie.poster;
        pmTitle.textContent = movie.title;
        pmMeta.textContent = formatDuration(movie.duration) + ' • ' + movie.quality;
        pmPrice.textContent = formatPrice(movie.price);
        paymentFormState.style.display = 'block';
        paymentPending.classList.remove('active');
        paymentSuccess.classList.remove('active');
        paymentFailed.classList.remove('active');
        paymentOverlay.classList.add('active');
    }

    function closePaymentModal() { paymentOverlay.classList.remove('active'); }

    function simulatePayment() {
        paymentFormState.style.display = 'none';
        paymentPending.classList.add('active');
        setTimeout(function() {
            var success = Math.random() < 0.85;
            paymentPending.classList.remove('active');
            if (success) {
                paymentSuccess.classList.add('active');
                sessionStorage.setItem('akmark_paid_' + selectedMovieId, 'true');
                sessionStorage.setItem('akmark_access_expires_' + selectedMovieId, String(Date.now() + 2.5 * 60 * 60 * 1000));
                showToast('Payment confirmed! Starting your movie...');
            } else {
                paymentFailed.classList.add('active');
                showToast('Payment failed. Please try again.', 'bi-x-circle-fill');
            }
        }, 2000);
    }

    function startPlayback() {
        closePaymentModal();
        if (!currentMovie) return;
        var expires = sessionStorage.getItem('akmark_access_expires_' + currentMovie.id);
        if (expires && Date.now() > Number(expires)) {
            accessExpired = true;
            if (movieDetail.classList.contains('active')) accessExpiredEl.classList.add('active');
            showToast('Access expired. Please purchase again.', 'bi-clock-history');
            return;
        }
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
                if (currentMovie) sessionStorage.setItem('akmark_access_expires_' + currentMovie.id, String(Date.now() - 1000));
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

    function renderAll() {
        var featured = MOVIES.filter(function(m) { return m.featured; });
        renderGrid(homeGrid, featured.length ? featured : MOVIES.slice(0, 6));
        renderGrid(moviesGrid, MOVIES);
        renderGrid(seriesGrid, SERIES);
        renderGrid(categoriesGrid, MOVIES);
    }

    function renderSkeleton() {
        var skeletonHTML = '';
        for (var i = 0; i < 6; i++) {
            skeletonHTML += '<div class="skeleton-card"></div>';
        }
        homeGrid.innerHTML = '<div class="movie-grid">' + skeletonHTML + '</div>';
        moviesGrid.innerHTML = '<div class="movie-grid">' + skeletonHTML + '</div>';
        seriesGrid.innerHTML = '<div class="movie-grid">' + skeletonHTML + '</div>';
        categoriesGrid.innerHTML = '<div class="movie-grid">' + skeletonHTML + '</div>';
    }

    // ===== INIT =====
    function init() {
        checkLogin();
        renderSkeleton();
        setTimeout(function() {
            renderAll();
        }, 800);

        initSearch();

        desktopNav.forEach(function(a) {
            a.addEventListener('click', function(e) {
                e.preventDefault();
                navigateTo(this.dataset.page);
            });
        });

        bottomNav.forEach(function(a) {
            a.addEventListener('click', function(e) {
                e.preventDefault();
                var page = this.dataset.page;
                if (page === 'search-mobile') {
                    toggleSearchSubheader();
                    return;
                }
                navigateTo(page);
            });
        });

        logoHome.addEventListener('click', function() { navigateTo('home'); });

        document.querySelectorAll('.movie-grid').forEach(function(grid) {
            grid.addEventListener('click', function(e) {
                var card = e.target.closest('.movie-card');
                if (!card) return;
                var id = parseInt(card.dataset.id);
                if (id) showMovieDetail(id);
            });
        });

        detailBack.addEventListener('click', function() { navigateTo(currentPage === 'detail' ? 'home' : currentPage); });
        detailBackBtn.addEventListener('click', function() { navigateTo(currentPage === 'detail' ? 'home' : currentPage); });

        detailWatchBtn.addEventListener('click', function() {
            if (!currentMovie) return;
            var paid = sessionStorage.getItem('akmark_paid_' + currentMovie.id);
            var expires = sessionStorage.getItem('akmark_access_expires_' + currentMovie.id);
            if (paid && expires && Date.now() < Number(expires)) { startPlayback(); return; }
            if (paid && expires && Date.now() > Number(expires)) { accessExpired = true; accessExpiredEl.classList.add('active'); showToast('Access expired. Please purchase again.', 'bi-clock-history'); return; }
            openPayment(currentMovie);
        });

        expiredWatchBtn.addEventListener('click', function() { if (!currentMovie) return; openPayment(currentMovie); });

        payNowBtn.addEventListener('click', simulatePayment);
        checkPaymentStatusBtn.addEventListener('click', function() {
            showToast('Checking payment status...', 'bi-hourglass-split');
            setTimeout(function() {
                var resolved = Math.random() < 0.6;
                if (resolved) {
                    paymentPending.classList.remove('active');
                    paymentSuccess.classList.add('active');
                    sessionStorage.setItem('akmark_paid_' + selectedMovieId, 'true');
                    sessionStorage.setItem('akmark_access_expires_' + selectedMovieId, String(Date.now() + 2.5 * 60 * 60 * 1000));
                    showToast('Payment confirmed!');
                } else {
                    showToast('Still waiting...', 'bi-hourglass-split');
                }
            }, 1500);
        });

        continueWatchBtn.addEventListener('click', startPlayback);
        retryPaymentBtn.addEventListener('click', function() {
            paymentFailed.classList.remove('active');
            paymentFormState.style.display = 'block';
        });

        closePayment.addEventListener('click', closePaymentModal);
        paymentOverlay.addEventListener('click', function(e) { if (e.target === this) closePaymentModal(); });
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
        clearMovieSearch.addEventListener('click', function() {
            movieSearchInput.value = '';
            renderGrid(moviesGrid, MOVIES);
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
