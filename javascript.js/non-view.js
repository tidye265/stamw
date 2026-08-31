// non-view.js
(function() {
    'use strict';

    const SUPABASE_URL = window.SUPABASE_URL;
    const SUPABASE_ANON_KEY = window.SUPABASE_ANON_KEY;
    const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    const urlParams = new URLSearchParams(window.location.search);
    const movieId = urlParams.get('id');
    if (!movieId) { window.location.href = '/'; return; }

    // DOM Elements
    const skeleton = document.getElementById('skeleton');
    const movieCard = document.getElementById('movieCard');
    const watchBtn = document.getElementById('watchBtn');
    const playIcon = document.getElementById('playIcon');
    const poster = document.getElementById('poster');
    const title = document.getElementById('title');
    const priceEl = document.getElementById('price');
    const yearEl = document.getElementById('year');
    const categoryEl = document.getElementById('category');
    const qualityBadge = document.getElementById('qualityBadge');
    const player = document.getElementById('player');
    const countdown = document.getElementById('countdown');

    const modalOverlay = document.getElementById('modalOverlay');
    const phoneInput = document.getElementById('phoneNumber');
    const confirmBtn = document.getElementById('confirmBtn');
    let selectedMethod = null;

    function detectNetwork(phone) {
        if (!phone) return null;
        const cleaned = phone.replace(/\D/g, '').replace(/^0+/, '');
        if (/^(88|89|81)/.test(cleaned)) return 'tnm';
        if (/^(99|98|97)/.test(cleaned)) return 'airtel';
        return null;
    }

    function selectMethod(method) {
        selectedMethod = method;
        document.querySelectorAll('.method-card').forEach(card => card.classList.toggle('selected', card.dataset.method === method));
    }

    function autoSelectNetwork() {
        const detected = detectNetwork(phoneInput.value);
        if (detected) selectMethod(detected);
    }

    phoneInput.addEventListener('input', autoSelectNetwork);

    async function ensureSession() {
        let { data: { session } } = await supabase.auth.getSession();
        if (!session) {
            const { error } = await supabase.auth.signInAnonymously();
            if (error) throw new Error("Anonymous auth failed. Please check Supabase settings.");
            session = (await supabase.auth.getSession()).data.session;
        }
        return session;
    }

    async function loadMovie() {
        try {
            const session = await ensureSession();
            const token = session.access_token;
            const res = await fetch(`${SUPABASE_URL}/functions/v1/non-viewing-film-api?action=get_movie`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ movie_id: movieId })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to load movie');

            skeleton.style.display = 'none';
            movieCard.style.display = 'block';

            poster.src = data.movie.poster_url || '';
            title.textContent = data.movie.title || 'Unknown Title';
            yearEl.textContent = data.movie.year || '2024';
            categoryEl.textContent = data.movie.category || 'Action';
            qualityBadge.textContent = data.movie.quality || 'HD';
            const price = Number(data.movie.price || 0);
            priceEl.textContent = 'MK ' + price.toLocaleString();
            watchBtn.innerHTML = `<svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg> WATCH NOW ${price.toLocaleString()}`;

            checkExistingView(session);
        } catch (err) {
            console.error("Error loading movie:", err);
            alert(err.message || "Failed to load movie.");
        }
    }

    async function checkExistingView(session) {
        try {
            const res = await fetch(`${SUPABASE_URL}/functions/v1/non-viewing-film-api?action=watch`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
                body: JSON.stringify({ movie_id: movieId })
            });
            const data = await res.json();
            if (data.success && data.video_url) {
                startPlayer(data.video_url, data.expire_at);
            }
        } catch (err) {
            console.error("Error checking existing view:", err);
        }
    }

    function openPaymentSheet() {
        if (player.style.display === 'block') return;
        modalOverlay.classList.add('active');
    }

    function closeModal(event) {
        if (event && event.target !== modalOverlay && event.target !== modalOverlay.firstChild) return;
        modalOverlay.classList.remove('active');
    }

    async function confirmPayment() {
        const phone = phoneInput.value.trim();
        const method = selectedMethod || detectNetwork(phone);
        if (!method) {
            alert('Select a payment method or enter a valid phone number.');
            return;
        }
        if (!/^0[89]\d{8}$/.test(phone) && !/^[89]\d{8}$/.test(phone)) {
            alert('Enter a valid phone number (09XXXXXXXX or 9XXXXXXXX).');
            return;
        }

        const price = Number(priceEl.textContent.replace(/[^0-9]/g, '')) || 0;

        confirmBtn.disabled = true;
        confirmBtn.textContent = 'PAYING...';

        try {
            const session = await ensureSession();
            const token = session.access_token;

            // Step 1: Initialize
            const initRes = await fetch(`${SUPABASE_URL}/functions/v1/non-deposit-api`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({
                    action: 'initialize',
                    amount: price,
                    phone,
                    method,
                    movie_id: movieId
                })
            });
            const initData = await initRes.json();
            if (!initData.success) throw new Error(initData.error || 'Payment initiation failed');

            const txRef = initData.tx_ref;

            // Step 2: Poll non-verify-api every 3 seconds
            const pollInterval = setInterval(async () => {
                const verifyRes = await fetch(`${SUPABASE_URL}/functions/v1/non-verify-api`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                    body: JSON.stringify({ tx_ref: txRef, movie_id: movieId })
                });
                const verifyData = await verifyRes.json();

                if (verifyData.success) {
                    clearInterval(pollInterval);
                    // Payment successful – start player
                    modalOverlay.classList.remove('active');
                    startPlayer(verifyData.video_url, verifyData.expire_at);
                    confirmBtn.disabled = false;
                    confirmBtn.textContent = 'PAY NOW';
                } else if (verifyData.status === 'failed') {
                    clearInterval(pollInterval);
                    alert('Payment failed. Please try again.');
                    confirmBtn.disabled = false;
                    confirmBtn.textContent = 'PAY NOW';
                }
                // If still pending, do nothing – keep polling
            }, 3000);

        } catch (err) {
            console.error("Payment error:", err);
            alert(err.message || 'Payment failed. Please try again.');
            confirmBtn.disabled = false;
            confirmBtn.textContent = 'PAY NOW';
        }
    }

    function startPlayer(videoUrl, expireAt) {
        movieCard.style.display = 'none';
        player.style.display = 'block';
        player.src = videoUrl;
        player.play();

        const interval = setInterval(() => {
            const now = new Date();
            const expire = new Date(expireAt);
            const diff = expire - now;
            if (diff <= 0) {
                clearInterval(interval);
                player.pause();
                countdown.textContent = 'Access expired. Please pay again.';
                movieCard.style.display = 'block';
            } else {
                const mins = Math.floor(diff / 60000);
                const secs = Math.floor((diff % 60000) / 1000);
                countdown.textContent = `Expires in ${mins}m ${secs}s`;
                if (diff < 30000) countdown.classList.add('warning');
            }
        }, 1000);
    }

    window.openPaymentSheet = openPaymentSheet;
    window.closeModal = closeModal;
    window.selectMethod = selectMethod;
    window.confirmPayment = confirmPayment;

    loadMovie();
})();
