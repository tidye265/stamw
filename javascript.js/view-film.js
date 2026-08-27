// view-film.js

// Supabase config
const SUPABASE_URL = window.SUPABASE_URL;

// DOM elements
const loadingState = document.getElementById('loadingState');
const errorState = document.getElementById('errorState');
const errorMessage = document.getElementById('errorMessage');
const filmDetails = document.getElementById('filmDetails');
const payBtn = document.getElementById('payBtn');
const payBtnText = document.getElementById('payBtnText');

// Get film ID from URL
const urlParams = new URLSearchParams(window.location.search);
const filmId = urlParams.get('id');

// Store film data
let filmData = null;

// ===== FETCH FILM DATA =====
async function fetchFilmData(id) {
    try {
        const response = await fetch(`${SUPABASE_URL}/functions/v1/view-film-api?id=${id}`, {
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

    // Add quality tag
    if (movie.quality) tags.push(movie.quality.toUpperCase());

    // Add episode tag if series
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
            window.location.href = 'play-film.html?id=' + filmData.id;
        }, 2000);
    }, 2000);
}

// ===== INITIALIZE =====
async function init() {
    if (!filmId) {
        // Show error
        loadingState.style.display = 'none';
        errorState.style.display = 'flex';
        errorMessage.textContent = 'No film ID provided.';
        return;
    }

    try {
        filmData = await fetchFilmData(filmId);
        // Hide loading
        loadingState.style.display = 'none';
        // Show film details
        filmDetails.style.display = 'block';
        // Populate data
        populateFilmData(filmData);
    } catch (err) {
        // Show error
        loadingState.style.display = 'none';
        errorState.style.display = 'flex';
        errorMessage.textContent = err.message;
    }
}

// Initialize on page load
init();
