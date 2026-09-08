(function() {
    'use strict';

    const SUPABASE_URL = window.SUPABASE_URL || 'https://jnqwvmxuieeelvukhcsq.supabase.co';
    const movieId = new URLSearchParams(window.location.search).get('id');
    const TOKEN_KEY = 'akmark_token';

    if (!movieId) { showError('Missing movie ID'); return; }

    const video = document.getElementById('video');
    const loader = document.getElementById('loader');
    const centerPlayBtn = document.getElementById('centerPlayBtn');
    const controls = document.getElementById('controls');
    const progressBar = document.getElementById('progressBar');
    const progressFill = document.getElementById('progressFill');
    const currentTimeEl = document.getElementById('currentTime');
    const durationTimeEl = document.getElementById('durationTime');

    let refreshTimeout = null;
    let expireTime = null;
    let isExpired = false;
    let lastSaveTime = 0;
    let isRefreshing = false;

    const RESUME_KEY = 'akimark_resume_' + movieId;

    function getToken() {
        return localStorage.getItem(TOKEN_KEY) || '';
    }

    function clearSession() {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem('akmark_refresh_token');
        localStorage.removeItem('akmark_user');
        window.location.href = 'non.html';
    }

    // Fetch watch info – returns stream_url
    async function fetchStreamUrl() {
        const token = getToken();
        if (!token) { clearSession(); return null; }

        const res = await fetch(`${SUPABASE_URL}/functions/v1/viewing-film-api?action=get_watch_info`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + token
            },
            body: JSON.stringify({ movie_id: movieId })
        });
        const data = await res.json().catch(() => ({ error: 'Invalid JSON' }));
        if (!res.ok) {
            if (res.status === 401) { clearSession(); return null; }
            throw new Error(data.error || `API Error: ${res.status}`);
        }
        if (!data.success) throw new Error(data.error || 'Failed to fetch video');
        return data; // contains stream_url, expire_at
    }

    // Refresh the stream URL before expiry
    async function refreshStreamUrl() {
        if (isExpired || isRefreshing) return;
        isRefreshing = true;
        const currentTime = video.currentTime;
        const wasPlaying = !video.paused;

        try {
            const data = await fetchStreamUrl();
            if (!data || !data.stream_url) throw new Error('No stream url');
            video.src = data.stream_url;
            video.currentTime = currentTime;
            if (wasPlaying) video.play();

            expireTime = data.expire_at ? new Date(data.expire_at).getTime() : null;
            if (expireTime && expireTime > Date.now()) {
                const remaining = expireTime - Date.now();
                const refreshIn = Math.max(1000, remaining - 30000); // 30s before expiry
                clearTimeout(refreshTimeout);
                refreshTimeout = setTimeout(refreshStreamUrl, refreshIn);
            } else {
                refreshTimeout = setTimeout(refreshStreamUrl, 210000); // default 3.5 min
            }
        } catch (err) {
            console.error('Refresh failed:', err);
            if (err.message.toLowerCase().includes('unauthorized')) {
                clearSession();
                return;
            }
            // Retry in 5 seconds
            refreshTimeout = setTimeout(refreshStreamUrl, 5000);
        } finally {
            isRefreshing = false;
        }
    }

    // Expired overlay
    function onExpire() {
        isExpired = true;
        video.pause();
        if (refreshTimeout) clearTimeout(refreshTimeout);
        localStorage.removeItem(RESUME_KEY);
        const overlay = document.createElement('div');
        overlay.style.cssText = `position:absolute;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.85);display:flex;justify-content:center;align-items:center;z-index:20;color:white;text-align:center;flex-direction:column;padding:20px;`;
        overlay.innerHTML = `<div style="font-size:3rem;margin-bottom:10px;">⏱️</div><h2 style="margin-bottom:10px;">Access Expired</h2><p style="color:#aaa;margin-bottom:20px;">Your viewing time has ended. Please refresh or contact support.</p><button onclick="window.location.reload()" style="background:#c71515;color:#fff;border:none;padding:12px 24px;border-radius:8px;cursor:pointer;">Reload</button>`;
        document.body.appendChild(overlay);
    }

    // ===== VIDEO ERROR HANDLER =====
    video.addEventListener('error', () => {
        console.error('Video error:', video.error);
        showLoader(false);
        if (!isExpired) {
            // Try one retry after 2 seconds
            setTimeout(() => {
                video.load();
                video.play().catch(() => {
                    showError('Video failed to load. Please check your connection and retry.');
                });
            }, 2000);
        }
    });

    // ===== INIT =====
    async function init() {
        showLoader(true);
        centerPlayBtn.classList.add('hidden');
        try {
            const data = await fetchStreamUrl();
            if (!data) return;

            video.src = data.stream_url;
            video.poster = data.movie.poster_url || '';
            video.load();

            expireTime = data.expire_at ? new Date(data.expire_at).getTime() : null;
            if (expireTime && expireTime <= Date.now()) { onExpire(); return; }

            // Schedule refresh
            if (expireTime) {
                const remaining = expireTime - Date.now();
                refreshTimeout = setTimeout(refreshStreamUrl, Math.max(1000, remaining - 30000));
            } else {
                refreshTimeout = setTimeout(refreshStreamUrl, 210000);
            }

            // Try to play
            video.play().catch(() => {
                if (!isExpired) {
                    centerPlayBtn.classList.remove('hidden');
                }
            });
            showControls();
        } catch (err) {
            showError(err.message);
        } finally {
            showLoader(false);
        }
    }

    // ===== VIDEO EVENTS =====
    video.addEventListener('loadedmetadata', () => {
        durationTimeEl.textContent = formatTime(video.duration);
        const resume = loadResumeTime();
        if (resume > 0 && resume < video.duration - 5) video.currentTime = resume;
        updateProgress();
    });

    video.addEventListener('timeupdate', () => {
        if (isExpired) return;
        updateProgress();
        saveResumeTime(false);
        if (expireTime && Date.now() > expireTime) onExpire();
    });

    video.addEventListener('pause', () => saveResumeTime(true));

    // ===== PLAY BUTTON CLICK =====
    centerPlayBtn.addEventListener('click', () => {
        if (isExpired) return;
        video.play();
        centerPlayBtn.classList.add('hidden');
    });

    // ===== HELPERS =====
    function showLoader(show) { loader.style.display = show ? 'block' : 'none'; }
    function showError(msg) {
        const container = document.getElementById('player-container');
        container.innerHTML = `<div class="error-state"><h2>Error</h2><p>${msg}</p><button onclick="window.location.reload()" style="background:#c71515;color:#fff;border:none;padding:12px 24px;border-radius:8px;cursor:pointer;margin-top:10px;">Retry</button></div>`;
    }
    function formatTime(s) {
        if (isNaN(s)) return '0:00';
        const h = Math.floor(s/3600), m = Math.floor((s%3600)/60), sec = Math.floor(s%60).toString().padStart(2,'0');
        return h ? `${h}:${m.toString().padStart(2,'0')}:${sec}` : `${m}:${sec}`;
    }
    function updateProgress() {
        const pct = (video.currentTime / video.duration) * 100;
        progressFill.style.width = `${pct}%`;
        currentTimeEl.textContent = formatTime(video.currentTime);
    }
    function showControls() {
        controls.classList.add('visible');
        setTimeout(() => controls.classList.remove('visible'), 3000);
    }

    // ===== CLEANUP =====
    window.addEventListener('beforeunload', () => {
        saveResumeTime(true);
        if (refreshTimeout) clearTimeout(refreshTimeout);
    });

    init();
})();
