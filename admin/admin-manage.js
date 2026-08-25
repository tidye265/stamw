(function() {
  'use strict';
  const token = localStorage.getItem('akmark_admin_token');
  if (!token) { window.location.href = 'admin-login.html'; return; }
  const admin = JSON.parse(localStorage.getItem('akmark_admin') || '{}');
  const supabase = window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);
  const SUPABASE_URL = window.SUPABASE_URL;

  // ===== DOM =====
  const operationSelect = document.getElementById('operation');
  const filmListContainer = document.getElementById('filmListContainer');
  const existingFilmSelect = document.getElementById('existingFilm');
  const existingFilmSearch = document.getElementById('existingFilmSearch');
  const posterFile = document.getElementById('posterFile');
  const videoFile = document.getElementById('videoFile');
  const previewImg = document.getElementById('previewImg');
  const form = document.getElementById('uploadFilmForm');
  const uploadBtn = document.getElementById('uploadBtn');
  const progressWrap = document.getElementById('progressWrap');
  const progressFill = document.getElementById('progressFill');
  const progressText = document.getElementById('progressText');
  const progressPercent = document.getElementById('progressPercent');
  const batchQueue = document.getElementById('batchQueue');
  const queueList = document.getElementById('queueList');

  // ===== 6. Searchable Existing Film =====
  let allFilms = [];
  operationSelect.addEventListener('change', function() {
    if (this.value === 'continue') { filmListContainer.style.display = 'block'; loadFilms(); }
    else { filmListContainer.style.display = 'none'; }
  });
  existingFilmSearch.addEventListener('input', function() {
    const q = this.value.toLowerCase();
    const filtered = allFilms.filter(f => f.title.toLowerCase().includes(q));
    renderFilmOptions(filtered);
  });
  async function loadFilms() {
    const { data } = await supabase.from('movies').select('id, title, genre, poster_url');
    allFilms = data;
    renderFilmOptions(data);
  }
  function renderFilmOptions(films) {
    existingFilmSelect.innerHTML = '<option value="">Select a film</option>';
    films.forEach(film => {
      const option = document.createElement('option');
      option.value = film.id;
      option.textContent = film.title;
      existingFilmSelect.appendChild(option);
    });
  }

  // ===== Batch Upload Queue =====
  let queue = [];
  videoFile.addEventListener('change', function() {
    queue = Array.from(this.files);
    renderQueue();
  });

  function renderQueue() {
    if (queue.length === 0) { batchQueue.style.display = 'none'; return; }
    batchQueue.style.display = 'block';
    queueList.innerHTML = queue.map((file, i) => `<div class="queue-item"><span>${file.name}</span><button type="button" onclick="removeFromQueue(${i})" class="btn btn-sm btn-danger">&times;</button></div>`).join('');
  }
  window.removeFromQueue = function(index) {
    queue.splice(index, 1);
    renderQueue();
    // Reset input value if empty
    if (queue.length === 0) videoFile.value = '';
  };

  // ===== Multi-Genre =====
  function getSelectedGenres() {
    return Array.from(document.getElementById('filmGenre').selectedOptions).map(o => o.value).join(',');
  }

  // ===== Submit (With Network Resume) =====
  form.addEventListener('submit', async function(e) {
    e.preventDefault();
    const title = document.getElementById('filmTitle').value.trim();
    const year = document.getElementById('filmYear').value;
    const price = document.getElementById('filmPrice').value;
    const episodeRange = document.getElementById('episodeRange').value;
    const duration = document.getElementById('filmDuration').value;
    const genres = getSelectedGenres();
    const poster = posterFile.files[0];

    if (queue.length === 0) { alert('Please select at least one video file.'); return; }

    // 3. Auto-rearrange episodes (1-10 => [1,2,3,4,5,6,7,8,9,10])
    let episodeNumbers = [];
    if (episodeRange.includes('-')) {
      const [start, end] = episodeRange.split('-').map(Number);
      for (let i = start; i <= end; i++) episodeNumbers.push(i);
    } else {
      episodeNumbers = [null]; // Movie
    }

    // 2. Preview & Verification
    if (!confirm(`Are you sure you want to upload ${queue.length} video(s)?\nGenres: ${genres}\nEpisodes: ${episodeNumbers.join(', ')}`)) return;

    // Start Batch
    uploadBtn.disabled = true;
    progressWrap.style.display = 'block';

    for (let i = 0; i < queue.length; i++) {
      const file = queue[i];
      let episode = episodeNumbers[0] === null ? null : (episodeNumbers[i] || (i + 1)); // Auto-increment if not specified
      let posterUrl = '';
      progressText.textContent = `Uploading Episode ${episode || 'Movie'} (${i+1}/${queue.length})`;
      
      // 1. Upload Poster (if new upload)
      if (!posterFile.value && existingFilmSelect.value) {
        // Continue: use existing poster
        const { data: existing } = await supabase.from('movies').select('poster_url').eq('id', existingFilmSelect.value).single();
        posterUrl = existing.poster_url;
      } else if (poster) {
        const fileName = `posters/${Date.now()}_${poster.name.replace(/[^a-z0-9.]/gi, '_')}`;
        const { error: upErr } = await supabase.storage.from('posters').upload(fileName, poster, { upsert: true });
        if (upErr) { alert('Poster error: ' + upErr.message); return; }
        posterUrl = supabase.storage.from('posters').getPublicUrl(fileName).data.publicUrl;
      }

      // 2. Call Backend to get URL
      const payload = {
        title, year, price, genre: genres, duration: duration || null, poster_url: posterUrl,
        episode_number: episode, film_id: existingFilmSelect.value || null
      };
      const res = await fetch(`${SUPABASE_URL}/functions/v1/upload-film-api`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
        body: JSON.stringify(payload)
      });
      const text = await res.text();
      let data; try { data = JSON.parse(text); } catch (err) { throw new Error('Invalid server: ' + text); }
      if (!res.ok) throw new Error('Backend: ' + data.error);

      // 3. Upload Video (With Resume Logic)
      let vRes;
      while (true) { // Retry loop for network resume
        try {
          vRes = await fetch(data.uploadUrl, { method: 'PUT', headers: { 'Content-Type': file.type }, body: file });
          if (vRes.ok) break;
          else throw new Error('Video failed: ' + await vRes.text());
        } catch (err) {
          progressText.textContent = 'Network error! Pausing... Click Resume to continue.';
          // Pause loop, wait for user to click (Simple simulation)
          await new Promise(resolve => {
            const retryBtn = document.createElement('button');
            retryBtn.textContent = 'Resume Upload';
            retryBtn.className = 'btn btn-warning w-100 mt-2';
            retryBtn.onclick = () => { retryBtn.remove(); resolve(); };
            progressWrap.appendChild(retryBtn);
          });
          progressText.textContent = `Retrying Episode ${episode}...`;
        }
      }

      // Update Progress
      const pct = Math.round(((i + 1) / queue.length) * 100);
      progressFill.style.width = pct + '%';
      progressPercent.textContent = pct + '%';
    }

    progressText.textContent = '✔ All Uploads Successful!';
    alert('Batch upload completed!');
    setTimeout(() => { location.reload(); }, 2000);
  });
})();
