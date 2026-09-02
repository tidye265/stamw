// non-view.js (Updated for Matched Design + JS/CSS Errors)

(function() {
    'use strict';

    const SUPABASE_URL = window.SUPABASE_URL;
    const SUPABASE_ANON_KEY = window.SUPABASE_ANON_KEY;
    const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    const urlParams = new URLSearchParams(window.location.search);
    const movieId = urlParams.get('id');
    if (!movieId) { window.location.href = '/'; return; }

    // DOM Elements
    const skeletonLoader = document.getElementById('skeletonLoader');
    const errorState = document.getElementById('errorState');
    const errorMessage = document.getElementById('errorMessage');
    const filmDetails = document.getElementById('filmDetails');
    const watchBtn = document.getElementById('watchBtn');
    const watchBtnText = document.getElementById('watchBtnText');
    const statusMessage = document.getElementById('statusMessage');
    const translatorProfile = document.getElementById('translatorProfile');
    const translatorName = document.getElementById('translatorName');
    const translatorAvatar = document.getElementById('translatorAvatar');
    const translatorFollowers = document.getElementById('translatorFollowers');
    const followBtn = document.getElementById('followBtn');
    const poster = document.getElementById('filmPoster');
    const title = document.getElementById('filmTitle');

    const modalOverlay = document.getElementById('modalOverlay');
    const phoneInput = document.getElementById('phoneNumber');
    const confirmBtn = document.getElementById('confirmBtn');
    const toast = document.getElementById('toast');
    const toastIcon = document.getElementById('toastIcon');
    const toastMsg = document.getElementById('toastMsg');

    let selectedMethod = null;
    let movieData = null;
    let isFollowing = false;
    let adminId = null;

    const DEFAULT_AVATAR = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23A7A7A7'><path d='M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z'/></svg>";

    // ===== TOAST NOTIFICATION (JS/CSS) =====
    function showToast(msg, isError = false) {
        if (!toast) return;
        toastMsg.textContent = msg;
        toastIcon.innerHTML = isError ? '❌' : '✅';
        toast.className = 'toast ' + (isError ? 'error' : 'success') + ' visible';
        setTimeout(function() { toast.className = 'toast ' + (isError ? 'error' : 'success'); }, 4000);
    }

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

    // ===== ANONYMOUS AUTH =====
    async function ensureSession() {
        let { data: { session } } = await supabase.auth.getSession();
        if (!session) {
            const { error } = await supabase.auth.signInAnonymously();
            if (error) throw new Error("Anonymous auth failed. Please check Supabase settings.");
            session = (await supabase.auth.getSession()).data.session;
        }
        return session;
    }

    // ===== LOAD MOVIE =====
    async function loadMovie() {
        try {
            skeletonLoader.classList.add('show');
            errorState.style.display = 'none';
            filmDetails.classList.remove('show');

            const session = await ensureSession();
            const token = session.access_token;
            const res = await fetch(`${SUPABASE_URL}/functions/v1/non-viewing-film-api?action=get_movie`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ movie_id: movieId })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to load movie');

            movieData = data.movie;

            // Populate UI
            poster.src = movieData.poster_url || '';
            title.textContent = movieData.title || 'Unknown Title';
            const price = Number(movieData.price || 0);
            watchBtnText.textContent = 'WATCH NOW MK ' + price.toLocaleString();

            // Show translator profile if exists
            if (movieData.translator_name) {
                loadTranslatorProfile(movieData.translator_name);
            } else {
                translatorProfile.style.display = 'none';
            }

            skeletonLoader.classList.remove('show');
            filmDetails.classList.add('show');

            // Check if user already has access (auto redirect)
            checkExistingView(session);
        } catch (err) {
            console.error("Error loading movie:", err);
            skeletonLoader.classList.remove('show');
            errorState.style.display = 'flex';
            errorMessage.textContent = err.message || 'Failed to load movie.';
            showToast(err.message || 'Failed to load movie.', true);
        }
    }

    // ===== LOAD TRANSLATOR PROFILE =====
    function loadTranslatorProfile(translatorNameText) {
        translatorName.textContent = translatorNameText;
        translatorFollowers.textContent = '0 followers';
        translatorProfile.style.display = 'flex';
        translatorAvatar.src = DEFAULT_AVATAR;

        fetch(`${SUPABASE_URL}/functions/v1/v1-admin-api?action=get_profile_by_name&name=` + encodeURIComponent(translatorNameText), {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' }
        })
        .then(response => response.json())
        .then(data => {
            if (data.success && data.admin) {
                adminId = data.admin.id;
                translatorAvatar.src = data.admin.profile_image || DEFAULT_AVATAR;
                // Format followers: 1000 -> 1K
                const count = Number(data.admin.followers_count) || 0;
                translatorFollowers.textContent = (count >= 1000 ? (count % 1000 === 0 ? (count/1000).toFixed(0) : (count/1000).toFixed(1)) + 'K' : count) + ' followers';
                isFollowing = data.admin.is_following;
                updateFollowButton();
            }
        })
        .catch(err => console.error('Error loading translator profile:', err));
    }

    function updateFollowButton() {
        if (isFollowing) {
            followBtn.textContent = 'Following';
            followBtn.classList.add('following');
        } else {
            followBtn.textContent = 'Follow';
            followBtn.classList.remove('following');
        }
    }

    // ===== CHECK EXISTING VIEW – REDIRECT TO WATCH.HTML =====
    async function checkExistingView(session) {
        try {
            const res = await fetch(`${SUPABASE_URL}/functions/v1/non-viewing-film-api?action=watch`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
                body: JSON.stringify({ movie_id: movieId })
            });
            const data = await res.json();
            if (data.success && data.video_url) {
                window.location.href = 'watch.html?id=' + movieId;
            }
        } catch (err) {
            console.error("Error checking existing view:", err);
        }
    }

    // ===== OPEN PAYMENT SHEET =====
    function openPaymentSheet() {
        if (!movieData) return;
        modalOverlay.classList.add('active');
    }

    function closeModal(event) {
        if (event && event.target !== modalOverlay && event.target !== modalOverlay.firstChild) return;
        modalOverlay.classList.remove('active');
    }

    // ===== CONFIRM PAYMENT =====
    async function confirmPayment() {
        const phone = phoneInput.value.trim();
        const method = selectedMethod || detectNetwork(phone);
        if (!method) {
            showToast('Select a payment method or enter a valid phone number.', true);
            return;
        }
        if (!/^0[89]\d{8}$/.test(phone) && !/^[89]\d{8}$/.test(phone)) {
            showToast('Enter a valid phone number (09XXXXXXXX).', true);
            return;
        }

        const price = Number(movieData.price || 0);

        confirmBtn.disabled = true;
        confirmBtn.textContent = 'PAYING...';
        statusMessage.className = 'status-message';
        statusMessage.classList.remove('show');

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
                    // Payment successful – redirect to watch.html
                    statusMessage.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 6L9 17l-5-5"/></svg> Payment Success!';
                    statusMessage.className = 'status-message show success';
                    showToast('Payment successful! Redirecting...', false);
                    setTimeout(function() {
                        window.location.href = 'watch.html?id=' + movieId;
                    }, 1500);
                } else if (verifyData.status === 'failed') {
                    clearInterval(pollInterval);
                    statusMessage.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 6l12 12M18 6L6 18"/></svg> Payment Failed';
                    statusMessage.className = 'status-message show error';
                    showToast('Payment failed. Please try again.', true);
                    confirmBtn.disabled = false;
                    confirmBtn.textContent = 'PAY NOW';
                }
            }, 3000);

        } catch (err) {
            console.error("Payment error:", err);
            statusMessage.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 6l12 12M18 6L6 18"/></svg> Payment Failed';
            statusMessage.className = 'status-message show error';
            showToast(err.message || 'Payment failed. Please try again.', true);
            confirmBtn.disabled = false;
            confirmBtn.textContent = 'PAY NOW';
        }
    }

    // Expose functions to window for onclick handlers
    window.openPaymentSheet = openPaymentSheet;
    window.closeModal = closeModal;
    window.selectMethod = selectMethod;
    window.confirmPayment = confirmPayment;

    loadMovie();
})();
