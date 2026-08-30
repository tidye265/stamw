// watch.js
(function() {
    'use strict';

    const SUPABASE_URL = window.SUPABASE_URL || 'https://jnqwvmxuieeelvukhcsq.supabase.co';
    const movieId = new URLSearchParams(window.location.search).get('id');

    if (!movieId) {
        showError('Missing movie ID');
        return;
    }

    // DOM Elements
    const playerContainer = document.getElementById('player-container');
    const video = document.getElementById('video');
    const loader = document.getElementById('loader');
    const controls = document.getElementById('controls');
    const centerPlayBtn = document.getElementById('centerPlayBtn');
    const playPauseBtn = document.getElementById('playPauseBtn');
    const playIcon = document.getElementById('playIcon');
    const pauseIcon = document.getElementById('pauseIcon');
    const muteBtn = document.getElementById('muteBtn');
    const muteIcon = document.getElementById('muteIcon');
    const unmuteIcon = document.getElementById('unmuteIcon');
    const backwardBtn = document.getElementById('backwardBtn');
    const forwardBtn = document.getElementById('forwardBtn');
    const progressBar = document.getElementById('progressBar');
    const progressFill = document.getElementById('progressFill');
    const progressThumb = document.getElementById('progressThumb');
    const currentTimeEl = document.getElementById('currentTime');
    const durationTimeEl = document.getElementById('durationTime');
    const fullscreenBtn = document.getElementById('fullscreenBtn');
    const speedBtn = document.getElementById('speedBtn');
    const speedOptions = document.getElementById('speedOptions');

    let controlsTimeout = null;
    let isSeeking = false;

    // ===== SCRUBBER (Drag on Progress Bar) =====
    progressBar.addEventListener('pointerdown', (e) => {
        isSeeking = true;
        updateSeek(e);
        progressBar.setPointerCapture(e.pointerId);
        showControls();
    });

    progressBar.addEventListener('pointermove', (e) => {
        if (isSeeking) updateSeek(e);
    });

    progressBar.addEventListener('pointerup', (e) => {
        isSeeking = false;
        showControls();
    });

    function updateSeek(e) {
        const rect = progressBar.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const percent = Math.min(1, Math.max(0, x / rect.width));
        if (video.duration) {
            video.currentTime = percent * video.duration;
        }
        progressFill.style.width = `${percent * 100}%`;
        progressThumb.style.left = `${percent * 100}%`;
        currentTimeEl.textContent = formatTime(video.currentTime);
    }

    // ===== TAP ANYWHERE ON SCREEN (Pointer Events) =====
    let tapStartX = 0;
    let tapStartY = 0;
    let tapStartTime = 0;

    playerContainer.addEventListener('pointerdown', (e) => {
        // Ignore if tap is on controls or center button
        if (e.target.closest('.controls') || e.target.closest('#centerPlayBtn')) return;
        tapStartX = e.clientX;
        tapStartY = e.clientY;
        tapStartTime = Date.now();
    });

    playerContainer.addEventListener('pointerup', (e) => {
        if (e.target.closest('.controls') || e.target.closest('#centerPlayBtn')) return;
        const dx = e.clientX - tapStartX;
        const dy = e.clientY - tapStartY;
        const dt = Date.now() - tapStartTime;
        // If movement is small and time is short => tap
        if (Math.abs(dx) < 10 && Math.abs(dy) < 10 && dt < 500) {
            if (controls.classList.contains('visible')) {
                controls.classList.remove('visible');
            } else {
                showControls();
            }
        }
    });

    // ===== Load Movie =====
    async function init() {
        showLoader(true);
        centerPlayBtn.classList.add('hidden');
        try {
            const res = await fetch(`${SUPABASE_URL}/functions/v1/viewing-film-api?action=get_watch_info`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ movie_id: movieId })
            });
            const data = await res.json();
            if (!data.success) throw new Error(data.error || 'Failed to load');

            video.src = data.video_url;
            video.poster = data.movie.poster_url || '';
            video.load();

            video.play().catch(() => {
                centerPlayBtn.classList.remove('hidden');
            });

            showControls();
        } catch (err) {
            showError(err.message);
        }
    }

    // Video Events
    video.addEventListener('loadedmetadata', () => {
        durationTimeEl.textContent = formatTime(video.duration);
        updateProgress();
        showLoader(false);
    });

    video.addEventListener('timeupdate', updateProgress);

    video.addEventListener('play', () => {
        playIcon.style.display = 'none';
        pauseIcon.style.display = 'block';
        centerPlayBtn.classList.add('hidden');
        showLoader(false);
    });

    video.addEventListener('pause', () => {
        playIcon.style.display = 'block';
        pauseIcon.style.display = 'none';
        centerPlayBtn.classList.remove('hidden');
    });

    video.addEventListener('waiting', () => showLoader(true));
    video.addEventListener('playing', () => showLoader(false));
    video.addEventListener('ended', () => {
        playIcon.style.display = 'block';
        pauseIcon.style.display = 'none';
        centerPlayBtn.classList.remove('hidden');
    });

    video.addEventListener('error', () => {
        showLoader(false);
        showError('Video error. Please try again.');
    });

    // Controls
    playPauseBtn.addEventListener('click', () => {
        if (video.paused) video.play();
        else video.pause();
        showControls();
    });

    muteBtn.addEventListener('click', () => {
        video.muted = !video.muted;
        muteIcon.style.display = video.muted ? 'none' : 'block';
        unmuteIcon.style.display = video.muted ? 'block' : 'none';
        showControls();
    });

    backwardBtn.addEventListener('click', () => {
        video.currentTime = Math.max(0, video.currentTime - 10);
        showControls();
    });

    forwardBtn.addEventListener('click', () => {
        video.currentTime = Math.min(video.duration, video.currentTime + 10);
        showControls();
    });

    fullscreenBtn.addEventListener('click', toggleFullscreen);

    // Speed controls
    speedBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        speedOptions.classList.toggle('show');
        showControls();
    });

    speedOptions.querySelectorAll('.speed-option').forEach(option => {
        option.addEventListener('click', (e) => {
            e.stopPropagation();
            const speed = parseFloat(option.dataset.speed);
            video.playbackRate = speed;
            speedBtn.textContent = `${speed}x`;
            speedOptions.querySelectorAll('.speed-option').forEach(o => o.classList.remove('active'));
            option.classList.add('active');
            speedOptions.classList.remove('show');
            showControls();
        });
    });

    centerPlayBtn.addEventListener('click', () => {
        video.play();
        showControls();
    });

    // Auto-hide controls
    function showControls() {
        controls.classList.add('visible');
        clearTimeout(controlsTimeout);
        controlsTimeout = setTimeout(() => {
            if (!video.paused && !isSeeking) {
                controls.classList.remove('visible');
            }
        }, 3000);
    }

    // Hide speed menu on outside click
    document.addEventListener('click', (e) => {
        if (!speedOptions.contains(e.target) && e.target !== speedBtn) {
            speedOptions.classList.remove('show');
        }
    });

    // Helpers
    function updateProgress() {
        const percent = (video.currentTime / video.duration) * 100;
        progressFill.style.width = `${percent}%`;
        progressThumb.style.left = `${percent}%`;
        currentTimeEl.textContent = formatTime(video.currentTime);
    }

    function formatTime(seconds) {
        if (isNaN(seconds)) return '0:00';
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = Math.floor(seconds % 60).toString().padStart(2, '0');
        return h > 0 ? `${h}:${m.toString().padStart(2, '0')}:${s}` : `${m}:${s}`;
    }

    function showLoader(show) {
        loader.style.display = show ? 'block' : 'none';
    }

    function toggleFullscreen() {
        const container = document.getElementById('player-container');
        if (!document.fullscreenElement) {
            container.requestFullscreen();
        } else {
            document.exitFullscreen();
        }
    }

    function showError(message) {
        const container = document.getElementById('player-container');
        container.innerHTML = `<div class="error-state"><h2>Error</h2><p>${message}</p><button onclick="window.location.href='/'">Go Home</button></div>`;
    }

    init();
})();
