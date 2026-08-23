// javascript/register.js
(function() {
    'use strict';

    // Country data with real flags from flagcdn.com
    const countries = {
        MW: { name: 'Malawi', flagUrl: 'https://flagcdn.com/w40/mw.png' },
        ZM: { name: 'Zambia', flagUrl: 'https://flagcdn.com/w40/zm.png' },
        MZ: { name: 'Mozambique', flagUrl: 'https://flagcdn.com/w40/mz.png' },
        ZW: { name: 'Zimbabwe', flagUrl: 'https://flagcdn.com/w40/zw.png' },
        ZA: { name: 'South Africa', flagUrl: 'https://flagcdn.com/w40/za.png' },
        TZ: { name: 'Tanzania', flagUrl: 'https://flagcdn.com/w40/tz.png' }
    };

    const phoneFlag = document.getElementById('phoneFlag');

    function detectCountryCode() {
        const lang = navigator.language || navigator.userLanguage || '';
        const map = {
            'en-MW': 'MW', 'en-ZM': 'ZM', 'en-MZ': 'MZ', 'en-ZW': 'ZW', 'en-ZA': 'ZA', 'en-TZ': 'TZ'
        };
        if (map[lang]) {
            return map[lang];
        }
        return 'MW';
    }

    function updatePhoneFlag() {
        const code = detectCountryCode();
        const country = countries[code];
        if (country) {
            phoneFlag.innerHTML = `<img src="${country.flagUrl}" alt="${country.name} flag">`;
        } else {
            phoneFlag.innerHTML = '<img src="https://flagcdn.com/w40/mw.png" alt="Malawi flag">';
        }
    }

    // Password toggle
    const togglePassword = document.getElementById('togglePassword');
    const passwordInput = document.getElementById('password');

    togglePassword.addEventListener('click', function() {
        const icon = this.querySelector('i');
        if (passwordInput.type === 'password') {
            passwordInput.type = 'text';
            icon.className = 'bi bi-eye-slash';
        } else {
            passwordInput.type = 'password';
            icon.className = 'bi bi-eye';
        }
    });

    // Form submit - REAL registration using fetch to Supabase Edge Function
    const form = document.getElementById('registerForm');
    const successMsg = document.getElementById('successMessage');
    const errorMsg = document.getElementById('errorMessage');
    const submitBtn = form.querySelector('.submit-btn');

    form.addEventListener('input', function() {
        errorMsg.style.display = 'none';
    });

    form.addEventListener('submit', async function(e) {
        e.preventDefault();

        const fullName = document.getElementById('fullName').value.trim();
        const phone = document.getElementById('phoneNumber').value.trim();
        const password = document.getElementById('password').value.trim();

        if (!fullName || !phone || !password) {
            errorMsg.textContent = 'Please fill in all fields.';
            errorMsg.style.display = 'block';
            return;
        }

        submitBtn.disabled = true;
        submitBtn.textContent = 'PROCESSING';

        // Kugwiritsa ntchito URL ndi Anon Key kuchokera ku supabase.js
        const SUPABASE_URL = window.SUPABASE_URL;
        const SUPABASE_ANON_KEY = window.SUPABASE_ANON_KEY;

        try {
            // Send request to Supabase Edge Function
            const response = await fetch(`${SUPABASE_URL}/functions/v1/register-api`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
                },
                body: JSON.stringify({
                    full_name: fullName,
                    phone: phone,
                    password: password
                })
            });

            // Read response as text first (kuti mupewe "Empty response" error)
            const text = await response.text();

            // Try to parse JSON
            let data;
            try {
                data = JSON.parse(text);
            } catch (parseError) {
                throw new Error(`Server returned invalid response: ${text || 'Empty response'}`);
            }

            if (!response.ok) {
                throw new Error(data.error || 'Registration failed. Please try again.');
            }

            // ----- SUCCESS: Store token & user in localStorage -----
            if (data.session && data.session.token) {
                // Store session token (yomwe idzakhala pa users table)
                localStorage.setItem('akmark_token', data.session.token);
                // Store refresh token (chifukwa ndi chofanana ndi token)
                localStorage.setItem('akmark_refresh_token', data.session.refresh_token || data.session.token);
            }

            // Store user info (without password)
            if (data.user) {
                localStorage.setItem('akmark_user', JSON.stringify(data.user));
            }

            // Redirect to clean URL "home"
            window.location.href = '/home';

        } catch (error) {
            // Error handling (kuwona vuto la network kapena server)
            if (error.message === 'Failed to fetch') {
                errorMsg.textContent = 'Unable to connect to Supabase. Please check your connection.';
            } else {
                errorMsg.textContent = error.message || 'Network error. Please try again.';
            }
            errorMsg.style.display = 'block';
        } finally {
            // Re-enable submit button if form still visible (not redirected)
            if (form.style.display !== 'none') {
                // Mu register.js, pansi pa submit:
var submitBtn = form.querySelector('.submit-btn');
var btnText = submitBtn.querySelector('.btn-text');
var spinner = submitBtn.querySelector('.spinner');

submitBtn.disabled = true;
submitBtn.classList.add('processing');
btnText.textContent = 'PROCESSING';

// ... Fetch logic ...

// Katundu watha:
submitBtn.classList.remove('processing');
submitBtn.disabled = false;
btnText.textContent = 'Register';
        }
    });

    // Logo click
    document.getElementById('logoHome').addEventListener('click', function() {
        window.location.href = '/home';
    });

    updatePhoneFlag();
})();
