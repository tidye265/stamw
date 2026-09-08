(function() {
    'use strict';

    const SUPABASE_URL = window.SUPABASE_URL || 'https://jnqwvmxuieeelvukhcsq.supabase.co';
    const movieId = new URLSearchParams(window.location.search).get('id');
    const TOKEN_KEY = 'akmark_token';

    if (!movieId) { showError('Missing movie ID'); return; }

    const video = document.getElementById('video');
    const loader = document.getElementById('loader');
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

    // MSE state
    let mediaSource = null;
    let sourceBuffer = null;
    let chunkUrlBase = '';
    let currentToken = '';
    let tokenExpireAt = 0;
    let fileSize = 0;
    let isAppending = false;
    let pendingChunks = [];

    const CHUNK_SIZE = 2 * 1024 * 1024; // 2 MB
    let totalSizeKnown = false;

    function getToken() {
        return localStorage.getItem(TOKEN_KEY) || '';
    }

    function clearSession() {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem('akmark_refresh_token');
        localStorage.removeItem('akmark_user');
        window.location.href = 'non.html';
    }

    async function fetchWatchInfo() {
        const token = getToken();
        if (!token) { clearSession(); return null; }

        const res = await fetch(`${SUPABASE_URL}/functions/v1/player-api?action=get_watch_info`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
            body: JSON.stringify({ movie_id: movieId })
        });
        const data = await res.json().catch(() => ({ error: 'Invalid JSON' }));
        if (!res.ok) {
            if (res.status === 401) { clearSession(); return null; }
            throw new Error(data.error || `API Error: ${res.status}`);
        }
        if (!data.success) throw new Error(data.error || 'Failed to fetch video info');
        return data;
    }

    // Setup MediaSource
    function setupMse(streamUrl, expiresIn) {
        mediaSource = new MediaSource();
        video.src = URL.createObjectURL(mediaSource);
        mediaSource.addEventListener('sourceopen', () => {
            sourceBuffer = mediaSource.addSourceBuffer('video/mp4');
            sourceBuffer.addEventListener('updateend', () => {
                isAppending = false;
                if (pendingChunks.length > 0) {
                    requestChunk(pendingChunks.shift());
                } else {
                    // Maybe video ended or can play?
                }
            });
            // Start fetching from byte 0
            requestChunk(0);
        });
    }

    async function requestChunk(offset) {
        if (!sourceBuffer || isAppending) return;
        if (!totalSizeKnown && offset > 0) {
            // We can try to get content-range from first request to know size
            // For simplicity, we'll just keep requesting until server returns less than chunk size
        }

        isAppending = true;
        const start = offset;
        const end = offset + CHUNK_SIZE - 1;

        const url = `${chunkUrlBase}&start=${start}&end=${end}`;
        try {
            const response = await fetch(url, {
                headers: { 'Range': `bytes=${start}-${end}` }
            });
            if (!response.ok) {
                if (response.status === 401) {
                    // Token expired – refresh token
                    await refreshPlaybackToken();
                    requestChunk(start);
                    return;
                }
                throw new Error('Chunk request failed');
            }

            const contentRange = response.headers.get('Content-Range');
            if (contentRange) {
                const total = contentRange.split('/')[1];
                if (total && !isNaN(total)) {
                    totalSizeKnown = true;
                    fileSize = parseInt(total);
                }
            }

            const buffer = await response.arrayBuffer();
            sourceBuffer.appendBuffer(new Uint8Array(buffer));
        } catch (err) {
            console.error('Chunk error:', err);
            isAppending = false;
            showError('Failed to load video chunk');
        }
    }

    async function refreshPlaybackToken() {
        const data = await fetchWatchInfo();
        if (!data) return;
        chunkUrlBase = data.stream_url;
        currentToken = chunkUrlBase.match(/token=([^&]+)/)[1];
        tokenExpireAt = data.expire_at;
        // Schedule next refresh
        const remaining = tokenExpireAt - Date.now();
        clearTimeout(refreshTimeout);
        refreshTimeout = setTimeout(refreshPlaybackToken, Math.max(1000, remaining - 30000));
    }

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

    // ===== INIT =====
    async function init() {
        showLoader(true);
        centerPlayBtn.classList.add('hidden');

        try {
            const data = await fetchWatchInfo();
            if (!data) return;

            chunkUrlBase = data.stream_url;
            currentToken = chunkUrlBase.match(/token=([^&]+)/)[1];
            tokenExpireAt = data.expire_at;
            const remaining = tokenExpireAt - Date.now();
            refreshTimeout = setTimeout(refreshPlaybackToken, Math.max(1000, remaining - 30000));

            setupMse(data.stream_url, data.expires_in);

            video.poster = data.movie.poster_url || '';
            video.load();
            showControls();
        } catch (err) {
            showError(err.message);
        } finally {
            showLoader(false);
        }
    }

    // ===== CONTROLS =====
    video.addEventListener('timeupdate', () => {
        if (isExpired) return;
        updateProgress();
        saveResumeTime(false);
    });

    video.addEventListener('pause', () => {
        saveResumeTime(true);
    });

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

    function saveResumeTime(force) {
        if (isExpired) return;
        const current = video.currentTime || 0;
        const now = Date.now();
        if (force || now - lastSaveTime > 2000) {
            localStorage.setItem(RESUME_KEY, JSON.stringify({ time: current, timestamp: now }));
            lastSaveTime = now;
        }
    }

    window.addEventListener('beforeunload', () => {
        if (mediaSource && mediaSource.sourceBuffers.length > 0) {
            mediaSource.sourceBuffers[0].removeEventListener('updateend', () => {});
        }
        if (refreshTimeout) clearTimeout(refreshTimeout);
    });

    init();
})();
