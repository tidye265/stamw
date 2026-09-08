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
    let isExpired = false;
    let lastSaveTime = 0;

    const RESUME_KEY = 'akimark_resume_' + movieId;

    // ===== MSE + MP4Box variables =====
    let mediaSource = null;
    let sourceBuffer = null;
    let mp4boxFile = null;
    let chunkBaseUrl = '';
    let currentToken = '';
    let tokenExpireAt = 0;
    let totalSize = 0;
    let fetchedUpTo = 0; // bytes fetched so far
    let isPending = false;
    let queue = [];
    const CHUNK_SIZE = 2 * 1024 * 1024; // 2 MB

    function getToken() { return localStorage.getItem(TOKEN_KEY) || ''; }
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

    function setupMse(streamUrl) {
        mediaSource = new MediaSource();
        video.src = URL.createObjectURL(mediaSource);
        mediaSource.addEventListener('sourceopen', () => {
            // Create source buffer for mp4
            sourceBuffer = mediaSource.addSourceBuffer('video/mp4');
            sourceBuffer.mode = 'segments'; // IMPORTANT for non-fragmented MP4
            sourceBuffer.addEventListener('updateend', () => {
                isPending = false;
                processQueue();
            });
            // Initialize MP4Box
            mp4boxFile = MP4Box.createFile();
            mp4boxFile.onError = (e) => console.error('MP4Box error', e);
            mp4boxFile.onReady = (info) => {
                // Set duration
                video.duration = info.duration / info.timescale;
                // Start fetching chunks
                fetchNextChunk(0);
            };
            // Start by fetching first chunk
            fetchChunk(0).then(buffer => {
                // Feed to MP4Box to parse init segment
                buffer.fileStart = 0;
                mp4boxFile.appendBuffer(buffer);
                mp4boxFile.flush();
            });
        });
    }

    async function fetchChunk(offset) {
        const start = offset;
        const end = offset + CHUNK_SIZE - 1;
        const url = `${chunkBaseUrl}&start=${start}&end=${end}`;
        const response = await fetch(url, { headers: { 'Range': `bytes=${start}-${end}` } });
        if (response.status === 401) {
            await refreshToken();
            return fetchChunk(offset);
        }
        if (!response.ok) throw new Error('Chunk fetch failed');
        const contentRange = response.headers.get('Content-Range');
        if (contentRange) totalSize = parseInt(contentRange.split('/')[1]);
        return await response.arrayBuffer();
    }

    async function fetchNextChunk(offset) {
        if (isExpired) return;
        try {
            const buffer = await fetchChunk(offset);
            // Feed buffer to MP4Box to get sample data
            buffer.fileStart = offset;
            mp4boxFile.appendBuffer(buffer);
            mp4boxFile.flush();
            fetchedUpTo = offset + buffer.byteLength;
            // If we haven't reached end, schedule next fetch
            if (fetchedUpTo < totalSize) {
                fetchNextChunk(fetchedUpTo);
            }
        } catch (e) {
            console.error(e);
            showError('Failed to load video');
        }
    }

    // MP4Box creates samples -> feed to SourceBuffer
    mp4boxFile = null; // We'll set it inside setupMse
    // Override onReady -> set up data flow
    mp4boxFile.onReady = (info) => {
        // Get the track
        const track = info.videoTracks[0];
        // Use mp4box to extract samples
        mp4boxFile.onSamples = (id, user, samples) => {
            // Append samples to sourceBuffer
            const data = samples.map(s => s.data);
            // Concatenate all sample data
            const totalLength = data.reduce((sum, arr) => sum + arr.byteLength, 0);
            const combined = new Uint8Array(totalLength);
            let offset = 0;
            for (const arr of data) {
                combined.set(arr, offset);
                offset += arr.byteLength;
            }
            if (sourceBuffer && !sourceBuffer.updating) {
                sourceBuffer.appendBuffer(combined);
            } else {
                queue.push(combined);
            }
        };
        // Start processing after we have initial info
        // Fetch from byte 0, but we already did first fetch.
        // This is handled in setupMse.
    };

    function processQueue() {
        if (isPending || queue.length === 0) return;
        isPending = true;
        const data = queue.shift();
        sourceBuffer.appendBuffer(data);
    }

    async function refreshToken() {
        const data = await fetchWatchInfo();
        if (!data) return;
        chunkBaseUrl = data.chunk_url;
        currentToken = chunkBaseUrl.match(/token=([^&]+)/)[1];
        tokenExpireAt = data.expire_at;
        const remaining = tokenExpireAt - Date.now();
        clearTimeout(refreshTimeout);
        refreshTimeout = setTimeout(refreshToken, Math.max(1000, remaining - 30000));
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

    async function init() {
        showLoader(true);
        centerPlayBtn.classList.add('hidden');
        try {
            const data = await fetchWatchInfo();
            if (!data) return;
            chunkBaseUrl = data.chunk_url;
            currentToken = chunkBaseUrl.match(/token=([^&]+)/)[1];
            tokenExpireAt = data.expire_at;
            const remaining = tokenExpireAt - Date.now();
            refreshTimeout = setTimeout(refreshToken, Math.max(1000, remaining - 30000));
            setupMse(data.chunk_url);
            video.poster = data.movie.poster_url || '';
            showControls();
        } catch (err) {
            showError(err.message);
        } finally {
            showLoader(false);
        }
    }

    // Event listeners
    video.addEventListener('timeupdate', () => { if (!isExpired) updateProgress(); });
    video.addEventListener('pause', () => saveResumeTime(true));
    centerPlayBtn.addEventListener('click', () => { if (!isExpired) video.play(); });
    video.addEventListener('error', () => { showError('Video failed to load'); });

    function updateProgress() {
        const pct = (video.currentTime / video.duration) * 100;
        progressFill.style.width = `${pct}%`;
        currentTimeEl.textContent = formatTime(video.currentTime);
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
    function showControls() {
        controls.classList.add('visible');
        setTimeout(() => controls.classList.remove('visible'), 3000);
    }

    window.addEventListener('beforeunload', () => {
        if (mediaSource) mediaSource.endOfStream();
        if (refreshTimeout) clearTimeout(refreshTimeout);
    });

    init();
})();
