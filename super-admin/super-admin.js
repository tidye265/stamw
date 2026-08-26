const SUPABASE_URL = window.SUPABASE_URL; // Izi zikuchokera ku javascript.js/supabase.js

let currentEmail = '';

function showMessage(text, type = 'error') {
    const msg = document.getElementById('message');
    msg.textContent = text;
    msg.className = 'message ' + type;
}

function setLoading(btn, loading) {
    if (loading) {
        btn.disabled = true;
        btn.innerHTML = '<span class="spinner"></span> Processing...';
    } else {
        btn.disabled = false;
        btn.innerHTML = 'Login';
    }
}

async function sendOTP() {
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    if (!email || !password) {
        showMessage('Please enter email and password.');
        return;
    }

    currentEmail = email;
    const loginBtn = document.getElementById('loginBtn');
    setLoading(loginBtn, true);
    showMessage('');

    try {
        const res = await fetch(`${SUPABASE_URL}/functions/v1/super-admin-login-api`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ step: 1, email, password })
        });
        const data = await res.json();
        if (!res.ok) {
            throw new Error(data.error || 'Login failed');
        }

        // Show OTP section
        document.getElementById('step1').style.display = 'none';
        document.getElementById('otpSection').style.display = 'block';
        showMessage('OTP sent to your email. Please enter it below.', 'success');
    } catch (err) {
        showMessage(err.message);
    } finally {
        setLoading(loginBtn, false);
    }
}

async function verifyOTP() {
    const otp = document.getElementById('otp').value.trim();
    if (!otp) {
        showMessage('Please enter OTP.');
        return;
    }

    const verifyBtn = document.getElementById('verifyBtn');
    verifyBtn.disabled = true;
    verifyBtn.innerHTML = '<span class="spinner"></span> Verifying...';
    showMessage('');

    try {
        const res = await fetch(`${SUPABASE_URL}/functions/v1/super-admin-login-api`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ step: 2, email: currentEmail, otp })
        });
        const data = await res.json();
        if (!res.ok) {
            throw new Error(data.error || 'OTP verification failed');
        }

        // Store token
        localStorage.setItem('akmark_super_admin_token', data.token);
        localStorage.setItem('akmark_super_admin', JSON.stringify(data.admin));

        // Redirect to dashboard
        window.location.href = 'super-admin-dashboard.html';
    } catch (err) {
        showMessage(err.message);
        verifyBtn.disabled = false;
        verifyBtn.innerHTML = 'Verify & Login';
    }
}
