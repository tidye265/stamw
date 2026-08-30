// watch.js
(function() {
    'use strict';

    const SUPABASE_URL = window.SUPABASE_URL;
    const SUPABASE_ANON_KEY = window.SUPABASE_ANON_KEY;
    const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    const urlParams = new URLSearchParams(window.location.search);
    const movieId = urlParams.get('id');
    if (!movieId) {
        alert('Missing movie ID');
        window.location.href = '/';
        return;
    }

    const token = localStorage.getItem('akmark_token');
    if (!token) {
        window.location.href = '/register';
        return;
    }

    // DOM Elements
    const video = document.getElementById('video');
    const loader = document.getElementById('loader');
    const controls = document.getElementById('controls');
    const playPauseBtn = document.getElementById('playPauseBtn');
    const muteBtn = document.getElementById('muteBtn');
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
    const titleEl = document.getElementById('title');
    const descEl = document.getElementById('desc');

    // State
    let isPlaying = false;
    let isMuted = false;
    let isFullscreen = false;
    let currentSpeed = 1;

    // Load movie
    async function init() {
        showLoader(true);
        try {
            const response = await fetch(`${SUPABASE_URL}/functions/v1/viewing-film-api?action=get_watch_info`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ movie_id: movieId })
            });
            const data = await response.json();
            if (!data.success) throw new Error(data.error || 'Failed to load movie');

            titleEl.textContent = data.movie.title;
            descEl.textContent = data.movie.description || '';

            // Set video source
            video.src = data.video_url;
            video.poster = data.movie.poster_url || '';
            video.load();
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
        isPlaying = true;
        playPauseBtn.textContent = '⏸';
        showLoader(false);
    });

    video.addEventListener('pause', () => {
        isPlaying = false;
        playPauseBtn.textContent = '▶';
    });

    video.addEventListener('waiting', () => showLoader(true));
    video.addEventListener('playing', () => showLoader(false));
    video.addEventListener('ended', () => {
        playPauseBtn.textContent = '▶';
        isPlaying = false;
    });

    video.addEventListener('error', () => {
        showLoader(false);
        showError('Video error. Please try again.');
    });

    // Controls
    playPauseBtn.addEventListener('click', () => {
        if (video.paused) video.play(); else video.pause();
    });

    muteBtn.addEventListener('click', () => {
        video.muted = !video.muted;
        isMuted = video.muted;
        muteBtn.textContent = isMuted ? '🔇' : '🔊';
    });

    backwardBtn.addEventListener('click', () => {
        video.currentTime = Math.max(0, video.currentTime - 10);
    });

    forwardBtn.addEventListener('click', () => {
        video.currentTime = Math.min(video.duration, video.currentTime + 10);
    });

    progressBar.addEventListener('click', (e) => {
        const rect = progressBar.getBoundingClientRect();
        const pos = (e.clientX - rect.left) / rect.width;
        video.currentTime = pos * video.duration;
    });

    fullscreenBtn.addEventListener('click', toggleFullscreen);

    // Speed controls
    speedBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        speedOptions.classList.toggle('show');
    });

    speedOptions.querySelectorAll('.speed-option').forEach(option => {
        option.addEventListener('click', (e) => {
            e.stopPropagation();
            const speed = parseFloat(option.dataset.speed);
            video.playbackRate = speed;
            currentSpeed = speed;
            speedBtn.textContent = `${speed}x`;
            speedOptions.querySelectorAll('.speed-option').forEach(o => o.classList.remove('active'));
            option.classList.add('active');
            speedOptions.classList.remove('show');
        });
    });

    // Hide speed menu when clicking outside
    document.addEventListener('click', (e) => {
        if (!speedOptions.contains(e.target) && e.target !== speedBtn) {
            speedOptions.classList.remove('show');
        }
    });

    // Touch/Show controls
    video.addEventListener('touchstart', () => controls.classList.add('touch'));
    video.addEventListener('touchend', () => setTimeout(() => controls.classList.remove('touch'), 2000));

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
        if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s}`;
        return `${m}:${s}`;
    }

    function showLoader(show) {
        loader.style.display = show ? 'block' : 'none';
    }

    function toggleFullscreen() {
        const container = document.getElementById('player-container');
        if (!isFullscreen) {
            if (container.requestFullscreen) container.requestFullscreen();
            else if (container.webkitRequestFullscreen) container.webkitRequestFullscreen();
            isFullscreen = true;
        } else {
            if (document.exitFullscreen) document.exitFullscreen();
            isFullscreen = false;
        }
    }

    function showError(message) {
        const container = document.getElementById('player-container');
        container.innerHTML = `<div style="display:flex;align-items:center;justify-content:center;height:80vh;text-align:center;padding:20px;">
            <div><h2 style="color:#ff4d4d;margin-bottom:10px;">Error</h2><p>${message}</p><button onclick="window.location.href='/'" style="margin-top:16px;padding:10px 20px;background:#E11D48;color:white;border:none;border-radius:6px;font-size:1rem;">Go Home</button></div>
        </div>`;
    }

    // Start
    init();
})();
