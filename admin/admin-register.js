// admin/admin-register.js
(function() {
    'use strict';

    const form = document.getElementById('adminRegisterForm');
    const fullNameInput = document.getElementById('fullName');
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const togglePassword = document.getElementById('togglePassword');
    const submitBtn = document.getElementById('submitBtn');
    const btnText = submitBtn.querySelector('.btn-text');
    const spinner = submitBtn.querySelector('.spinner');
    const errorMsg = document.getElementById('errorMessage');

    // Password toggle
    togglePassword.addEventListener('click', function() {
        const svg = this.querySelector('svg');
        if (passwordInput.type === 'password') {
            passwordInput.type = 'text';
            if (svg) svg.innerHTML = '<path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>';
        } else {
            passwordInput.type = 'password';
            if (svg) svg.innerHTML = '<path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>';
        }
    });

    // Hide error when typing
    form.addEventListener('input', function() {
        errorMsg.style.display = 'none';
    });

    // Submit
    form.addEventListener('submit', async function(e) {
        e.preventDefault();

        const fullName = fullNameInput.value.trim();
        const email = emailInput.value.trim();
        const password = passwordInput.value.trim();

        if (!fullName || !email || !password) {
            errorMsg.textContent = 'Please fill in all fields.';
            errorMsg.style.display = 'block';
            return;
        }

        // Show processing
        submitBtn.disabled = true;
        submitBtn.classList.add('processing');
        btnText.textContent = 'PROCESSING';

        const SUPABASE_URL = window.SUPABASE_URL;
        const SUPABASE_ANON_KEY = window.SUPABASE_ANON_KEY;

        try {
            const response = await fetch(`${SUPABASE_URL}/functions/v1/admin-register-api`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
                },
                body: JSON.stringify({ full_name: fullName, email, password })
            });

            const text = await response.text();
            let data;
            try { data = JSON.parse(text); } catch (err) { throw new Error('Invalid server response'); }

            if (!response.ok) {
                throw new Error(data.error || 'Registration failed. Please try again.');
            }

            // Store admin session & info
            if (data.session && data.session.token) {
                localStorage.setItem('akmark_admin_token', data.session.token);
                localStorage.setItem('akmark_admin_refresh_token', data.session.refresh_token || data.session.token);
            }
            if (data.admin) {
                localStorage.setItem('akmark_admin', JSON.stringify(data.admin));
            }

            // Redirect to admin dashboard
            window.location.href = 'admin-dashboard.html';

        } catch (error) {
            errorMsg.textContent = error.message || 'Network error. Please try again.';
            errorMsg.style.display = 'block';
        } finally {
            submitBtn.disabled = false;
            submitBtn.classList.remove('processing');
            btnText.textContent = 'Register';
        }
    });
})();
