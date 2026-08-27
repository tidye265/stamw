// view-film.js

const SUPABASE_URL = window.SUPABASE_URL;

// DOM elements
const skeletonLoader = document.getElementById('skeletonLoader');
const errorState = document.getElementById('errorState');
const errorMessage = document.getElementById('errorMessage');
const filmDetails = document.getElementById('filmDetails');
const payBtn = document.getElementById('payBtn');
const payBtnText = document.getElementById('payBtnText');
const watchNowBtn = document.getElementById('watchNowBtn');
const videoSection = document.getElementById('videoSection');

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
    console.log(`🔄 Fetching film data for ID: ${id}...`);
    
    const url = `${SUPABASE_URL}/functions/v1/view-film-api?id=${encodeURIComponent(id)}`;
    
    // If series_id exists, add it to URL
    const fullUrl = seriesId ? `${url}&series_id=${encodeURIComponent(seriesId)}` : url;
    
    console.log(`🌐 Request URL: ${fullUrl}`);
    
    try {
        const response = await fetch(fullUrl, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + localStorage.getItem('akmark_token')
            }
        });

        console.log(`📡 Response status: ${response.status}`);
        
        const data = await response.json();
        console.log(`📦 Response data:`, data);
        
        if (!response.ok) {
            throw new Error(data.error || `HTTP ${response.status}`);
        }

        return data.movie;
    } catch (err) {
        console.error(`❌ Error fetching film:`, err.message);
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
        filmData.video_uid = movie.video_uid;
        videoSection.style.display = 'block';
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

// ===== WATCH NOW HANDLER =====
function handleWatchNow() {
    if (!filmData?.video_uid) {
        alert('Video not available yet.');
        return;
    }
    window.location.href = 'play-film.html?video_uid=' + filmData.video_uid;
}

// ===== INITIALIZE =====
async function init() {
    console.log(`🔍 Initializing View Film page...`);
    console.log(`📌 ID from URL: ${filmId}`);
    console.log(`📌 Series ID from URL: ${seriesId}`);

    // Validate UUID format
    if (!filmId || !isValidUUID(filmId)) {
        console.error(`❌ Invalid film ID: ${filmId}`);
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
        
        console.log(`✅ Film loaded successfully: ${filmData.title}`);
    } catch (err) {
        // Show error
        skeletonLoader.classList.remove('show');
        errorState.style.display = 'flex';
        errorMessage.textContent = err.message;
        console.error(`❌ Failed to load film:`, err);
    }
}

// Attach event listeners
payBtn.addEventListener('click', handlePayment);
if (watchNowBtn) watchNowBtn.addEventListener('click', handleWatchNow);

// Initialize immediately on page load
init();
