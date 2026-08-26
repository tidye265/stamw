// forgot-password.js

// Supabase config from global
const SUPABASE_URL = window.SUPABASE_URL;

let currentEmail = '';

// DOM elements
const step1 = document.getElementById('step1');
const step2 = document.getElementById('step2');
const stepDot1 = document.getElementById('stepDot1');
const stepDot2 = document.getElementById('stepDot2');
const messageBox = document.getElementById('message');
const emailInput = document.getElementById('email');
const otpInput = document.getElementById('otp');
const newPasswordInput = document.getElementById('newPassword');
const confirmPasswordInput = document.getElementById('confirmPassword');
const sendOtpBtn = document.getElementById('sendOtpBtn');
const resetBtn = document.getElementById('resetBtn');

// Show message helper
function showMessage(text, type = 'info') {
    messageBox.textContent = text;
    messageBox.className = 'message ' + type;
}

// Set loading state on button
function setLoading(btn, loading, originalText) {
    if (loading) {
        btn.disabled = true;
        btn.innerHTML = '<span class="spinner"></span> ' + (originalText || 'Processing...');
    } else {
        btn.disabled = false;
        btn.innerHTML = originalText || 'Send Verification Code';
    }
}

// Password strength indicator
newPasswordInput.addEventListener('input', function() {
    const password = this.value;
    const strengthDiv = document.getElementById('passwordStrength');
    const strengthText = document.getElementById('strengthText');
    
    let strength = 0;
    if (password.length >= 8) strength++;
    if (/[A-Z]/.test(password)) strength++;
    if (/[0-9]/.test(password)) strength++;
    if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) strength++;
    
    strengthDiv.className = 'password-strength';
    if (strength <= 1) {
        strengthDiv.classList.add('strength-weak');
        strengthText.textContent = 'Weak password';
    } else if (strength <= 3) {
        strengthDiv.classList.add('strength-medium');
        strengthText.textContent = 'Medium strength';
    } else {
        strengthDiv.classList.add('strength-strong');
        strengthText.textContent = 'Strong password';
    }
});

// ===== STEP 1: Send OTP =====
async function sendOTP() {
    const email = emailInput.value.trim();
    if (!email) {
        showMessage('Please enter your email address.', 'error');
        return;
    }
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        showMessage('Please enter a valid email address.', 'error');
        return;
    }
    
    currentEmail = email;
    setLoading(sendOtpBtn, true, 'Send Verification Code');
    showMessage('', 'info');
    
    try {
        const res = await fetch(`${SUPABASE_URL}/functions/v1/admin-forgot-password-api`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'send_otp', email })
        });
        
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to send OTP');
        
        // Show step 2
        step1.style.display = 'none';
        step2.style.display = 'block';
        stepDot1.classList.remove('active');
        stepDot1.classList.add('completed');
        stepDot2.classList.add('active');
        
        showMessage('Verification code sent to your email. Check your inbox.', 'success');
    } catch (err) {
        showMessage(err.message, 'error');
    } finally {
        setLoading(sendOtpBtn, false, 'Send Verification Code');
    }
}

// ===== STEP 2: Reset Password =====
async function resetPassword() {
    const otp = otpInput.value.trim();
    const newPassword = newPasswordInput.value;
    const confirmPassword = confirmPasswordInput.value;
    
    if (!otp) {
        showMessage('Please enter the OTP code.', 'error');
        return;
    }
    if (!newPassword) {
        showMessage('Please enter a new password.', 'error');
        return;
    }
    if (newPassword.length < 8) {
        showMessage('Password must be at least 8 characters.', 'error');
        return;
    }
    if (newPassword !== confirmPassword) {
        showMessage('Passwords do not match.', 'error');
        return;
    }
    
    setLoading(resetBtn, true, 'Reset Password');
    showMessage('', 'info');
    
    try {
        const res = await fetch(`${SUPABASE_URL}/functions/v1/admin-forgot-password-api`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                action: 'reset_password', 
                email: currentEmail, 
                otp, 
                new_password: newPassword 
            })
        });
        
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to reset password');
        
        // Success - show success and redirect
        showMessage('Password reset successful! Redirecting to login...', 'success');
        
        // Update step indicators
        stepDot2.classList.remove('active');
        stepDot2.classList.add('completed');
        
        // Redirect after 2 seconds
        setTimeout(() => {
            window.location.href = 'super-admin.html';
        }, 2000);
    } catch (err) {
        showMessage(err.message, 'error');
    } finally {
        setLoading(resetBtn, false, 'Reset Password');
    }
}

// ===== GO BACK =====
function goBack() {
    step2.style.display = 'none';
    step1.style.display = 'block';
    stepDot1.classList.remove('completed');
    stepDot1.classList.add('active');
    stepDot2.classList.remove('active');
    stepDot2.classList.remove('completed');
    messageBox.textContent = '';
    otpInput.value = '';
    newPasswordInput.value = '';
    confirmPasswordInput.value = '';
}
