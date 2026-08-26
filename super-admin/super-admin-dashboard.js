// super-admin-dashboard.js

const SUPABASE_URL = window.SUPABASE_URL;

// Get token from localStorage
const token = localStorage.getItem('akmark_super_admin_token');
if (!token) {
    window.location.href = 'super-admin.html';
}

// DOM elements
const loadingEl = document.getElementById('loading');
const errorBox = document.getElementById('errorBox');
const dashboardContent = document.getElementById('dashboardContent');
const sidebar = document.getElementById('sidebar');
const overlay = document.getElementById('overlay');

// ===== SIDEBAR FUNCTIONS =====
function toggleMenu() {
    sidebar.classList.toggle('open');
    overlay.classList.toggle('active');
}

function selectMenu(menu) {
    // Update active class
    const items = document.querySelectorAll('.sidebar-item');
    items.forEach(item => item.classList.remove('active'));
    
    // Add active class to clicked item (except logout)
    const clicked = document.querySelector(`.sidebar-item[onclick="selectMenu('${menu}')"]`);
    if (clicked) clicked.classList.add('active');

    // Close menu after selection
    toggleMenu();

    // Logic for different sections (placeholder for now)
    switch(menu) {
        case 'dashboard':
            // Show dashboard content
            loadingEl.style.display = 'block';
            dashboardContent.style.display = 'none';
            init(); // Re-fetch data
            break;
        case 'logins':
            alert('Logins Details coming soon');
            break;
        case 'users':
            alert('Users list coming soon');
            break;
        case 'admin_users':
            alert('Admin Users list coming soon');
            break;
    }
}

// ===== LOGOUT =====
function logout() {
    // Clear local storage
    localStorage.removeItem('akmark_super_admin_token');
    localStorage.removeItem('akmark_super_admin');
    // Redirect to login
    window.location.href = 'super-admin.html';
}

// ===== FETCH ADMIN DATA =====
async function fetchAdminData() {
    try {
        const response = await fetch(`${SUPABASE_URL}/functions/v1/super-admin-login-checker-api`, {
            method: 'GET',
            headers: {
                'Authorization': 'Bearer ' + token,
                'Content-Type': 'application/json'
            }
        });

        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.error || 'Failed to verify session');
        }

        return data;
    } catch (err) {
        throw err;
    }
}

// ===== POPULATE DASHBOARD =====
function populateDashboard(admin) {
    // Stats
    document.getElementById('totalAdmins').textContent = admin.total_admins || 0;
    document.getElementById('totalUsers').textContent = admin.total_users || 0;
    document.getElementById('adminBalance').textContent = Number(admin.admin_balance || 0).toFixed(2);
    document.getElementById('userBalance').textContent = Number(admin.user_balance || 0).toFixed(2);
    document.getElementById('adminFollowers').textContent = admin.admin_followers || 0;
}

// ===== INITIALIZE =====
async function init() {
    loadingEl.style.display = 'block';
    errorBox.style.display = 'none';

    try {
        const data = await fetchAdminData();
        populateDashboard(data.admin);
        loadingEl.style.display = 'none';
        dashboardContent.style.display = 'block';
    } catch (err) {
        loadingEl.style.display = 'none';
        errorBox.style.display = 'block';
        errorBox.innerHTML = `<div class="error-msg">${err.message}</div>`;
        // If unauthorized, redirect to login after 2 seconds
        if (err.message.includes('Invalid') || err.message.includes('expired')) {
            setTimeout(() => {
                window.location.href = 'super-admin.html';
            }, 2000);
        }
    }
}

// Call init
init();
