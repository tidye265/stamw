// view-film.js

const SUPABASE_URL = window.SUPABASE_URL;

// DOM elements
const skeletonLoader = document.getElementById('skeletonLoader');
const errorState = document.getElementById('errorState');
const errorMessage = document.getElementById('errorMessage');
const filmDetails = document.getElementById('filmDetails');
const payBtn = document.getElementById('payBtn');
const payBtnText = document.getElementById('payBtnText');
const watchNowBtn = document.getElementById('watchNowBtn'); // optional
const videoSection = document.getElementById('videoSection'); // optional

// Get film ID from URL (UUID string)
const urlParams = new URLSearchParams(window.location.search);
const filmId = urlParams.get('id');
const seriesId = urlParams.get('series_id'); // optional

// Store film data
let filmData = null;

// ===== UUID VALIDATION =====
function isValidUUID(uuid) {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
}

// ===== FETCH FILM DATA =====
async function fetchFilmData(id) {
    try {
        const response = await fetch(`${SUPABASE_URL}/functions/v1/view-film-api?id=${encodeURIComponent(id)}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + localStorage.getItem('akmark_token')
            }
        });

        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.error || 'Failed to fetch film');
        }

        return data.movie;
    } catch (err) {
        console.error('Error fetching film:', err);
        throw err;
    }
}

// ===== POPULATE FILM DETAILS =====
function populateFilmData(movie) {
    // Set poster
    const posterEl = document.getElementById('filmPoster');
    posterEl.src = movie.poster_url;
    posterEl.alt = movie.title;

    // Set title
    document.getElementById('filmTitle').textContent = movie.title;

    // Set tags
    const tags = [];
    if (movie.genre) tags.push(movie.genre);
    if (movie.category) tags.push(movie.category);
    if (movie.translator_name) tags.push('🎙️ ' + movie.translator_name);
    if (movie.quality) tags.push(movie.quality.toUpperCase());
    if (movie.episode_number) tags.push(`Episode ${movie.episode_number}`);

    document.getElementById('filmTags').innerHTML = tags.map(tag =>
        `<span class="tag ${tag.includes('🎙️') ? 'accent' : ''}">${tag}</span>`
    ).join('');

    // Set description
    document.getElementById('filmDescription').textContent = movie.description || 'No description available.';

    // Set meta
    document.getElementById('filmYear').textContent = movie.year || '-';
    document.getElementById('filmDuration').textContent = movie.duration ? movie.duration + ' min' : '-';
    document.getElementById('filmQuality').textContent = movie.quality || 'HD';
    document.getElementById('filmCategory').textContent = movie.category || '-';
    document.getElementById('filmTranslator').textContent = movie.translator_name || 'Original';

    // Set price
    const price = Number(movie.price || 0);
    document.getElementById('filmPrice').textContent = 'MK ' + price.toLocaleString();

    // If video exists, show watch button and store video uid
    if (movie.video_uid) {
        // Show watch now section
        const videoSection = document.getElementById('videoSection');
        if (videoSection) videoSection.style.display = 'block';

        // Store video_uid for play redirect
        filmData.video_uid = movie.video_uid;
    }
}

// ===== PAYMENT HANDLER =====
async function handlePayment() {
    if (!filmData) return;

    // Show loading state
    payBtn.classList.add('loading');
    payBtnText.textContent = 'Processing...';

    // Simulate payment processing (replace with actual API call)
    setTimeout(() => {
        // Payment success
        payBtn.classList.remove('loading');
        payBtnText.textContent = '✅ Payment Successful!';
        payBtn.disabled = true;

        // Redirect to player after 2 seconds
        setTimeout(() => {
            if (filmData.video_uid) {
                window.location.href = 'play-film.html?video_uid=' + filmData.video_uid;
            } else {
                window.location.href = 'home.html'; // fallback
            }
        }, 2000);
    }, 2000);
}

// ===== WATCH NOW HANDLER (if already purchased or free) =====
function handleWatchNow() {
    if (!filmData?.video_uid) {
        alert('Video not available yet.');
        return;
    }
    window.location.href = 'play-film.html?video_uid=' + filmData.video_uid;
}

// ===== INITIALIZE =====
async function init() {
    // Validate UUID format
    if (!filmId || !isValidUUID(filmId)) {
        // Show error
        skeletonLoader.classList.remove('show');
        errorState.style.display = 'flex';
        errorMessage.textContent = 'Invalid film ID format. Please use a valid UUID.';
        return;
    }

    // Show skeleton
    skeletonLoader.classList.add('show');
    errorState.style.display = 'none';
    filmDetails.classList.remove('show');

    try {
        filmData = await fetchFilmData(filmId);
        
        // Hide skeleton, show details
        skeletonLoader.classList.remove('show');
        filmDetails.classList.add('show');
        
        // Populate data
        populateFilmData(filmData);
    } catch (err) {
        // Show error
        skeletonLoader.classList.remove('show');
        errorState.style.display = 'flex';
        errorMessage.textContent = err.message;
    }
}

// Attach event listeners
payBtn.addEventListener('click', handlePayment);
if (watchNowBtn) watchNowBtn.addEventListener('click', handleWatchNow);

// Initialize on page load
init();
