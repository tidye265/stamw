// javascript.js/register.js
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

    // Form submit - REAL registration using fetch to Cloudflare Function
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

        try {
            // Send request to Cloudflare Function (relative path!)
            const response = await fetch('/register-api', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    full_name: fullName,
                    phone: phone,
                    password: password
                })
            });

            // Read response as text first
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

            // Success
            successMsg.style.display = 'block';
            form.style.display = 'none';
            errorMsg.style.display = 'none';
        } catch (error) {
            if (error.message === 'Failed to fetch') {
                errorMsg.textContent = 'Unable to connect to server. Please check your connection.';
            } else {
                errorMsg.textContent = error.message || 'Network error. Please try again.';
            }
            errorMsg.style.display = 'block';
        } finally {
            if (form.style.display !== 'none') {
                submitBtn.disabled = false;
                submitBtn.textContent = 'Register';
            }
        }
    });

    // Logo click
    document.getElementById('logoHome').addEventListener('click', function() {
        window.location.href = 'index.html';
    });

    updatePhoneFlag();
})();
