// non-view.js
(function() {
    'use strict';

    const SUPABASE_URL = window.SUPABASE_URL;
    const SUPABASE_ANON_KEY = window.SUPABASE_ANON_KEY;
    const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    const urlParams = new URLSearchParams(window.location.search);
    const movieId = urlParams.get('id');
    if (!movieId) { window.location.href = '/'; return; }

    const watchBtn = document.getElementById('watchBtn');
    const poster = document.getElementById('poster');
    const title = document.getElementById('title');
    const priceEl = document.getElementById('price');
    const player = document.getElementById('player');
    const countdown = document.getElementById('countdown');

    // Ensure anonymous session
    async function ensureSession() {
        let { data: { session } } = await supabase.auth.getSession();
        if (!session) {
            await supabase.auth.signInAnonymously();
            session = (await supabase.auth.getSession()).data.session;
        }
        return session;
    }

    // Load movie details
    async function loadMovie() {
        const session = await ensureSession();
        const token = session.access_token;

        const res = await fetch(`${SUPABASE_URL}/functions/v1/non-viewing-film-api?action=get_movie`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ movie_id: movieId })
        });
        const data = await res.json();
        if (!data.success) { alert(data.error); return; }

        poster.src = data.movie.poster_url;
        title.textContent = data.movie.title;
        priceEl.textContent = `Price: ${data.movie.price}`;
        watchBtn.textContent = `WATCH NOW [MK ${data.movie.price}]`;

        // Check if already has active view
        checkExistingView(session);
    }

    async function checkExistingView(session) {
        // Call watch action – if already active, it will return video_url
        const res = await fetch(`${SUPABASE_URL}/functions/v1/non-viewing-film-api?action=watch`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
            body: JSON.stringify({ movie_id: movieId, price_paid: 0 })
        });
        const data = await res.json();
        if (data.success) {
            // Already has active view (from payment or existing)
            startPlayer(data.video_url, data.expire_at);
        }
    }

    async function handlePayment() {
        const session = await ensureSession();
        // Simulate PayChangu payment – replace with actual integration
        // For now, we'll just call watch with price
        const res = await fetch(`${SUPABASE_URL}/functions/v1/non-viewing-film-api?action=watch`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
            body: JSON.stringify({ movie_id: movieId, price_paid: 0 }) // price_paid will be updated in real integration
        });
        const data = await res.json();
        if (!data.success) { alert(data.error); return; }
        startPlayer(data.video_url, data.expire_at);
    }

    function startPlayer(videoUrl, expireAt) {
        watchBtn.style.display = 'none';
        player.style.display = 'block';
        player.src = videoUrl;
        player.play();

        // Countdown
        const interval = setInterval(() => {
            const now = new Date();
            const expire = new Date(expireAt);
            const diff = expire - now;
            if (diff <= 0) {
                clearInterval(interval);
                player.pause();
                countdown.textContent = 'Access expired. Please pay again.';
                watchBtn.style.display = 'block';
            } else {
                const mins = Math.floor(diff / 60000);
                const secs = Math.floor((diff % 60000) / 1000);
                countdown.textContent = `Expires in ${mins}m ${secs}s`;
            }
        }, 1000);
    }

    watchBtn.addEventListener('click', handlePayment);
    loadMovie();
})();
