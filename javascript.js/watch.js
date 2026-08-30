// watch.js
(function() {
    'use strict';

    const SUPABASE_URL = window.SUPABASE_URL;
    const SUPABASE_ANON_KEY = window.SUPABASE_ANON_KEY;
    const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    const urlParams = new URLSearchParams(window.location.search);
    const movieId = urlParams.get('id');
    if (!movieId) {
        showError('Missing movie ID');
        return;
    }

    const token = localStorage.getItem('akmark_token');
    if (!token) {
        window.location.href = '/register';
        return;
    }

    const video = document.getElementById('video');
    const playPauseBtn = document.getElementById('playPauseBtn');
    const seekBar = document.getElementById('seekBar');
    const timeDisplay = document.getElementById('timeDisplay');
    const muteBtn = document.getElementById('muteBtn');
    const fullscreenBtn = document.getElementById('fullscreenBtn');
    const loader = document.getElementById('loader');
    const controls = document.getElementById('controls');
    const titleEl = document.getElementById('title');
    const descEl = document.getElementById('desc');

    let isPlaying = false;
    let isMuted = false;
    let isFullscreen = false;

    // Load movie info and video
    async function init() {
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

            video.src = data.video_url;
            video.poster = data.movie.poster_url || '';
            video.load();
            showLoader(true);
        } catch (err) {
            showError(err.message);
        }
    }

    // Event listeners
    video.addEventListener('loadedmetadata', () => {
        seekBar.max = Math.floor(video.duration);
        updateTime();
        showLoader(false);
    });
    video.addEventListener('timeupdate', () => {
        const percent = (video.currentTime / video.duration) * 100;
        seekBar.value = percent;
        updateTime();
    });
    video.addEventListener('play', () => {
        isPlaying = true;
        playPauseBtn.textContent = '⏸';
    });
    video.addEventListener('pause', () => {
        isPlaying = false;
        playPauseBtn.textContent = '▶';
    });
    video.addEventListener('waiting', () => showLoader(true));
    video.addEventListener('playing', () => showLoader(false));
    video.addEventListener('error', () => {
        showLoader(false);
        showError('Video error. Please try again.');
    });

    // Controls
    playPauseBtn.addEventListener('click', () => {
        if (video.paused) video.play(); else video.pause();
    });
    seekBar.addEventListener('input', () => {
        video.currentTime = (seekBar.value / 100) * video.duration;
    });
    muteBtn.addEventListener('click', () => {
        video.muted = !video.muted;
        isMuted = video.muted;
        muteBtn.textContent = isMuted ? '🔇' : '🔊';
    });
    fullscreenBtn.addEventListener('click', toggleFullscreen);

    // Touch show/hide controls
    video.addEventListener('touchstart', () => controls.classList.add('touch'));
    video.addEventListener('touchend', () => setTimeout(() => controls.classList.remove('touch'), 2000));

    // Helpers
    function updateTime() {
        const current = formatTime(video.currentTime);
        const total = formatTime(video.duration);
        timeDisplay.textContent = `${current} / ${total}`;
    }
    function formatTime(seconds) {
        if (isNaN(seconds)) return '0:00';
        const m = Math.floor(seconds / 60);
        const s = Math.floor(seconds % 60).toString().padStart(2, '0');
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
        const playerContainer = document.getElementById('player-container');
        playerContainer.innerHTML = `<div class="error-box"><h1>Error</h1><p>${message}</p><button onclick="window.location.href='/home'">Go Home</button></div>`;
    }

    init();
})();
