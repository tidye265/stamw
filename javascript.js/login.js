// javascript.js/login.js
(function() {
    'use strict';

    var form = document.getElementById('loginForm');
    var phoneInput = document.getElementById('phone');
    var passwordInput = document.getElementById('password');
    var togglePassword = document.getElementById('togglePassword');
    var submitBtn = document.getElementById('submitBtn');
    var btnText = submitBtn.querySelector('.btn-text');
    var errorMsg = document.getElementById('errorMessage');
    var successMsg = document.getElementById('successMessage');

    // Password toggle
    togglePassword.addEventListener('click', function() {
        if (passwordInput.type === 'password') {
            passwordInput.type = 'text';
            togglePassword.querySelector('svg').innerHTML = '<path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>';
        } else {
            passwordInput.type = 'password';
            togglePassword.querySelector('svg').innerHTML = '<path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>';
        }
    });

    // Hide error on input
    form.addEventListener('input', function() {
        errorMsg.style.display = 'none';
    });

    // Submit
    form.addEventListener('submit', async function(e) {
        e.preventDefault();

        var phone = phoneInput.value.trim();
        var password = passwordInput.value.trim();

        if (!phone || !password) {
            errorMsg.textContent = 'Please fill in all fields.';
            errorMsg.style.display = 'block';
            return;
        }

        // Show processing
        submitBtn.disabled = true;
        submitBtn.classList.add('processing');
        btnText.textContent = 'PROCESSING';

        try {
            // Get Supabase URL & Anon Key from supabase.js (window variables)
            var SUPABASE_URL = window.SUPABASE_URL;
            var SUPABASE_ANON_KEY = window.SUPABASE_ANON_KEY;

            // Call login-api
            var response = await fetch(SUPABASE_URL + '/functions/v1/login-api', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + SUPABASE_ANON_KEY
                },
                body: JSON.stringify({ phone: phone, password: password })
            });

            var text = await response.text();
            var data;
            try { data = JSON.parse(text); } catch (err) { throw new Error('Invalid response from server'); }

            if (!response.ok) {
                throw new Error(data.error || 'Login failed. Please try again.');
            }

            // Success - store token & user
            if (data.session && data.session.token) {
                localStorage.setItem('akmark_token', data.session.token);
                localStorage.setItem('akmark_refresh_token', data.session.refresh_token || data.session.token);
            }
            if (data.user) {
                localStorage.setItem('akmark_user', JSON.stringify(data.user));
            }

            // Show success message
            successMsg.style.display = 'block';
            errorMsg.style.display = 'none';

            // Redirect to home after short delay
            setTimeout(function() {
                window.location.href = 'home.html';
            }, 1000);

        } catch (error) {
            errorMsg.textContent = error.message || 'Network error. Please try again.';
            errorMsg.style.display = 'block';
        } finally {
            submitBtn.disabled = false;
            submitBtn.classList.remove('processing');
            btnText.textContent = 'Login';
        }
    });
})();
