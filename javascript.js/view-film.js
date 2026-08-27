function loadFilm() {
    // Get URL parameters again to make absolutely sure
    var params = new URLSearchParams(window.location.search);
    var currentFilmId = params.get('id');
    var currentSeriesId = params.get('series_id');

    console.log('=================================');
    console.log('🎬 VIEW FILM');
    console.log('🔗 Current URL:', window.location.href);
    console.log('🆔 Film ID:', currentFilmId);
    console.log('📺 Series ID:', currentSeriesId);
    console.log('=================================');

    // Validate film ID
    if (!currentFilmId) {
        showError('Film ID is missing from URL.');
        console.error('❌ No ?id= parameter found');
        return;
    }

    if (!isValidUUID(currentFilmId)) {
        showError('Invalid film ID format.');
        console.error('❌ Invalid Film UUID:', currentFilmId);
        return;
    }

    // Show skeleton
    if (skeletonLoader) skeletonLoader.classList.add('show');
    if (errorState) errorState.style.display = 'none';
    if (filmDetails) filmDetails.classList.remove('show');

    // Build API URL
    var url =
        'https://jnqwvmxuieeelvukhcsq.supabase.co/functions/v1/view-film-api?id=' +
        encodeURIComponent(currentFilmId);

    if (currentSeriesId) {
        url += '&series_id=' + encodeURIComponent(currentSeriesId);
    }

    console.log('🌐 API URL:', url);

    fetch(url, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + getToken()
        }
    })
    .then(function(response) {

        console.log('📡 API Status:', response.status);
        console.log('📡 API OK:', response.ok);

        return response.text().then(function(text) {

            console.log('📦 Raw API Response:', text);

            var data;

            try {
                data = JSON.parse(text);
            } catch (e) {
                throw new Error(
                    'Server returned invalid JSON. HTTP ' +
                    response.status
                );
            }

            // IMPORTANT:
            // Check response.ok HERE while response still exists
            if (!response.ok) {
                throw new Error(
                    data.error ||
                    data.message ||
                    'Failed to fetch film. HTTP ' + response.status
                );
            }

            return data;
        });
    })
    .then(function(data) {

        console.log('✅ Parsed API data:', data);

        if (!data.movie) {
            console.error('❌ API did not return movie:', data);

            throw new Error(
                data.error ||
                data.message ||
                'Film not found'
            );
        }

        filmData = data.movie;

        console.log('🎬 Film:', filmData);
        console.log('🎬 Title:', filmData.title);

        populateFilmData(filmData);

        if (skeletonLoader) {
            skeletonLoader.classList.remove('show');
        }

        if (filmDetails) {
            filmDetails.classList.add('show');
        }

        console.log('✅ Film loaded successfully');
    })
    .catch(function(err) {

        console.error('❌ LOAD FILM ERROR:', err);
        console.error('❌ Error message:', err.message);

        if (skeletonLoader) {
            skeletonLoader.classList.remove('show');
        }

        if (errorState) {
            errorState.style.display = 'flex';

            if (errorMessage) {
                errorMessage.textContent = err.message;
            }
        }

        if (filmDetails) {
            filmDetails.classList.remove('show');
        }
    });
}
