// view-film.js

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
const seriesId = urlParams.get('series_id');

let filmData = null;

// ===== CHECK SUPABASE URL =====
const SUPABASE_URL = window.SUPABASE_URL;
console.log('🌐 SUPABASE_URL:', SUPABASE_URL);
if (!SUPABASE_URL) {
    console.error('❌ SUPABASE_URL is undefined!');
    showError('Supabase configuration missing. Check supabase.js');
} else {
    // Initialize
    init();
}

// ===== UUID VALIDATION =====
function isValidUUID(uuid) {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
}

// ===== FETCH FILM DATA =====
async function fetchFilmData(id) {
    console.log(`🔄 Fetching film data for ID: ${id}...`);
    
    const url = `${SUPABASE_URL}/functions/v1/view-film-api?id=${encodeURIComponent(id)}`;
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
    document.getElementById('filmPoster').src = movie.poster_url;
    document.getElementById('filmTitle').textContent = movie.title;

    const tags = [];
    if (movie.genre) tags.push(movie.genre);
    if (movie.category) tags.push(movie.category);
    if (movie.translator_name) tags.push('🎙️ ' + movie.translator_name);
    if (movie.quality) tags.push(movie.quality.toUpperCase());
    if (movie.episode_number) tags.push(`Episode ${movie.episode_number}`);

    document.getElementById('filmTags').innerHTML = tags.map(tag =>
        `<span class="tag ${tag.includes('🎙️') ? 'accent' : ''}">${tag}</span>`
    ).join('');

    document.getElementById('filmDescription').textContent = movie.description || 'No description available.';
    document.getElementById('filmYear').textContent = movie.year || '-';
    document.getElementById('filmDuration').textContent = movie.duration ? movie.duration + ' min' : '-';
    document.getElementById('filmQuality').textContent = movie.quality || 'HD';
    document.getElementById('filmCategory').textContent = movie.category || '-';
    document.getElementById('filmTranslator').textContent = movie.translator_name || 'Original';

    const price = Number(movie.price || 0);
    document.getElementById('filmPrice').textContent = 'MK ' + price.toLocaleString();

    if (movie.video_uid) {
        filmData.video_uid = movie.video_uid;
        videoSection.classList.add('show');
    }
}

// ===== ERROR HELPER =====
function showError(message) {
    skeletonLoader.classList.remove('show');
    errorState.style.display = 'flex';
    errorMessage.textContent = message;
}

// ===== PAYMENT =====
async function handlePayment() {
    if (!filmData) return;
    payBtn.classList.add('loading');
    payBtnText.textContent = 'Processing...';
    setTimeout(() => {
        payBtn.classList.remove('loading');
        payBtnText.textContent = '✅ Payment Successful!';
        payBtn.disabled = true;
        setTimeout(() => {
            if (filmData.video_uid) {
                window.location.href = 'play-film.html?video_uid=' + filmData.video_uid;
            } else {
                window.location.href = 'home.html';
            }
        }, 2000);
    }, 2000);
}

function handleWatchNow() {
    if (!filmData?.video_uid) {
        alert('Video not available yet.');
        return;
    }
    window.location.href = 'play-film.html?video_uid=' + filmData.video_uid;
}

// ===== INITIALIZE =====
async function init() {
    console.log('🔍 Initializing View Film...');
    console.log(`📌 ID: ${filmId}`);
    console.log(`📌 Series ID: ${seriesId}`);

    if (!filmId || !isValidUUID(filmId)) {
        console.error(`❌ Invalid film ID: ${filmId}`);
        showError('Invalid film ID format. Please use a valid UUID.');
        return;
    }

    skeletonLoader.classList.add('show');
    errorState.style.display = 'none';
    filmDetails.classList.remove('show');

    try {
        filmData = await fetchFilmData(filmId);
        skeletonLoader.classList.remove('show');
        filmDetails.classList.add('show');
        populateFilmData(filmData);
        console.log(`✅ Film loaded: ${filmData.title}`);
    } catch (err) {
        showError(err.message);
        console.error(`❌ Failed to load film:`, err);
    }
}

// Event listeners
payBtn.addEventListener('click', handlePayment);
if (watchNowBtn) watchNowBtn.addEventListener('click', handleWatchNow);
