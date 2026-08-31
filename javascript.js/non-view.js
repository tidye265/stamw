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

    // ===== ENSURE ANONYMOUS SESSION (Safety Fix) =====
    async function ensureSession() {
        // Check if session exists
        let { data: { session } } = await supabase.auth.getSession();
        
        // If no session, create one
        if (!session) {
            const { error } = await supabase.auth.signInAnonymously();
            if (error) {
                console.error("Anonymous auth failed:", error.message);
                throw new Error("Anonymous auth failed. Please check Supabase settings.");
            }
            // Re-fetch session after sign-in
            session = (await supabase.auth.getSession()).data.session;
        }
        
        return session;
    }

    // ===== LOAD MOVIE =====
    async function loadMovie() {
        try {
            const session = await ensureSession();
            if (!session || !session.access_token) {
                throw new Error("No valid session token");
            }

            const token = session.access_token;

            // Fetch movie details
            const res = await fetch(`${SUPABASE_URL}/functions/v1/non-viewing-film-api?action=get_movie`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ movie_id: movieId })
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to load movie');

            // Update UI with movie details
            poster.src = data.movie.poster_url || '';
            title.textContent = data.movie.title || 'Unknown Title';
            const price = Number(data.movie.price || 0);
            priceEl.textContent = `Price: MK ${price.toLocaleString()}`;
            watchBtn.textContent = `WATCH NOW [MK ${price.toLocaleString()}]`;
            
            // Check if user already paid for this movie
            checkExistingView(session);
        } catch (err) {
            console.error("Error loading movie:", err);
            alert(err.message || "Failed to load movie. Please refresh.");
        }
    }

    // ===== CHECK EXISTING ACTIVE VIEW =====
    async function checkExistingView(session) {
        try {
            const res = await fetch(`${SUPABASE_URL}/functions/v1/non-viewing-film-api?action=watch`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session.access_token}`
                },
                body: JSON.stringify({ movie_id: movieId, price_paid: 0 })
            });
            const data = await res.json();
            if (data.success && data.video_url) {
                startPlayer(data.video_url, data.expire_at);
            }
        } catch (err) {
            console.error("Error checking existing view:", err);
        }
    }

    // ===== HANDLE PAYMENT =====
    async function handlePayment() {
        try {
            const session = await ensureSession();
            if (!session || !session.access_token) throw new Error("Invalid session");

            // NOTE: Simulating PayChangu success here.
            // In real integration, await PayChangu response first.
            const res = await fetch(`${SUPABASE_URL}/functions/v1/non-viewing-film-api?action=watch`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session.access_token}`
                },
                body: JSON.stringify({ movie_id: movieId, price_paid: 0 }) // Replace 0 with real price if charging
            });
            const data = await res.json();
            if (!data.success) throw new Error(data.error || 'Payment failed');

            startPlayer(data.video_url, data.expire_at);
        } catch (err) {
            console.error("Payment error:", err);
            alert(err.message || "Payment failed. Please try again.");
        }
    }

    // ===== START PLAYER =====
    function startPlayer(videoUrl, expireAt) {
        watchBtn.style.display = 'none';
        player.style.display = 'block';
        player.src = videoUrl;
        player.play();

        // Countdown timer
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

    // Event listeners
    watchBtn.addEventListener('click', handlePayment);
    
    // Initialize
    loadMovie();
})();
