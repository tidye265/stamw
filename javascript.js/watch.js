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

    function getToken() { return localStorage.getItem(TOKEN_KEY) || ''; }

    function clearSession() {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem('akmark_refresh_token');
        localStorage.removeItem('akmark_user');
        window.location.href = 'non.html';
    }

    async function fetchStreamUrl() {
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
        if (!data.success) throw new Error(data.error || 'Failed to fetch video');
        return data;
    }

    function setupPlayback(streamUrl, isHls) {
        if (isHls) {
            if (Hls.isSupported()) {
                const hls = new Hls({ enableWorker: true });
                hls.loadSource(streamUrl);
                hls.attachMedia(video);
                hls.on(Hls.Events.MANIFEST_PARSED, () => {
                    video.play().catch(() => { if (!isExpired) centerPlayBtn.classList.remove('hidden'); });
                });
                hls.on(Hls.Events.ERROR, (event, data) => {
                    if (data.fatal) showError('Stream error. Please refresh.');
                });
                window.hls = hls;
            } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
                video.src = streamUrl;
                video.addEventListener('loadedmetadata', () => video.play());
            } else {
                showError('HLS not supported.');
            }
        } else {
            video.src = streamUrl;
            video.play().catch(() => { if (!isExpired) centerPlayBtn.classList.remove('hidden'); });
        }
    }

    async function refreshStreamUrl() {
        if (isExpired || isRefreshing) return;
        isRefreshing = true;
        try {
            const data = await fetchStreamUrl();
            if (!data || !data.stream_url) throw new Error('No stream url');
            setupPlayback(data.stream_url, data.is_hls);
            expireTime = data.expire_at ? new Date(data.expire_at).getTime() : null;
            if (expireTime && expireTime > Date.now()) {
                const remaining = expireTime - Date.now();
                const refreshIn = Math.max(1000, remaining - 30000);
                clearTimeout(refreshTimeout);
                refreshTimeout = setTimeout(refreshStreamUrl, refreshIn);
            } else {
                refreshTimeout = setTimeout(refreshStreamUrl, 210000);
            }
        } catch (err) {
            console.error('Refresh failed:', err);
            if (err.message.toLowerCase().includes('unauthorized')) { clearSession(); return; }
            refreshTimeout = setTimeout(refreshStreamUrl, 5000);
        } finally {
            isRefreshing = false;
        }
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

    video.addEventListener('error', (e) => {
        console.error('Video error:', e);
        showLoader(false);
        if (!isExpired) showError('Video failed to load. Please check your connection.');
    });

    async function init() {
        showLoader(true);
        centerPlayBtn.classList.add('hidden');
        try {
            const data = await fetchStreamUrl();
            if (!data) return;
            setupPlayback(data.stream_url, data.is_hls);
            expireTime = data.expire_at ? new Date(data.expire_at).getTime() : null;
            if (expireTime && expireTime <= Date.now()) { onExpire(); return; }
            if (expireTime) {
                const remaining = expireTime - Date.now();
                refreshTimeout = setTimeout(refreshStreamUrl, Math.max(1000, remaining - 30000));
            } else {
                refreshTimeout = setTimeout(refreshStreamUrl, 210000);
            }
            showControls();
        } catch (err) {
            showError(err.message);
        } finally {
            showLoader(false);
        }
    }

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

    window.addEventListener('beforeunload', () => {
        if (window.hls) window.hls.destroy();
        if (refreshTimeout) clearTimeout(refreshTimeout);
    });

    init();
})();
