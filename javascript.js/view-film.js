// view-film.js

const SUPABASE_URL = window.SUPABASE_URL;

// DOM elements
const skeletonLoader = document.getElementById('skeletonLoader');
const errorState = document.getElementById('errorState');
const errorMessage = document.getElementById('errorMessage');
const filmDetails = document.getElementById('filmDetails');
const payBtn = document.getElementById('payBtn');
const payBtnText = document.getElementById('payBtnText');

// Get film ID from URL (UUID string)
const urlParams = new URLSearchParams(window.location.search);
const filmId = urlParams.get('id');

// Store film data
let filmData = null;

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
    document.getElementById('filmPoster').src = movie.poster_url;

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
}

// ===== PAYMENT HANDLER =====
async function handlePayment() {
    if (!filmData) return;

    payBtn.classList.add('loading');
    payBtnText.textContent = 'Processing...';

    setTimeout(() => {
        payBtn.classList.remove('loading');
        payBtnText.textContent = '✅ Payment Successful!';
        payBtn.disabled = true;

        setTimeout(() => {
            window.location.href = 'play-film.html?id=' + filmData.id;
        }, 2000);
    }, 2000);
}

// ===== INITIALIZE =====
async function init() {
    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    
    if (!filmId || !uuidRegex.test(filmId)) {
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

// Initialize on page load
init();
