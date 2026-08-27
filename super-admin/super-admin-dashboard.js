// super-admin-dashboard.js

const SUPABASE_URL = window.SUPABASE_URL;
const token = localStorage.getItem('akmark_super_admin_token');
if (!token) {
    window.location.href = 'super-admin.html';
}

let currentSection = 'dashboard';
let chartInstance = null;

// DOM elements
const loadingEl = document.getElementById('loading');
const errorBox = document.getElementById('errorBox');
const sections = document.querySelectorAll('.section');

// ===== SIDEBAR =====
function toggleMenu() {
    document.getElementById('sidebar').classList.toggle('open');
    document.getElementById('overlay').classList.toggle('active');
}

function selectMenu(section) {
    // Close sidebar
    toggleMenu();
    // Hide all sections
    sections.forEach(s => s.classList.remove('active'));
    // Show selected
    document.getElementById(section + 'Section').classList.add('active');
    currentSection = section;
    // Load data
    loadData();
}

function logout() {
    localStorage.removeItem('akmark_super_admin_token');
    localStorage.removeItem('akmark_super_admin');
    window.location.href = 'super-admin.html';
}

// ===== API CALLS =====
async function fetchData(section) {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/collect-data-api?section=${section}`, {
        headers: { 'Authorization': 'Bearer ' + token }
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to fetch');
    return data;
}

async function postAction(action, payload) {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/collect-data-api?action=${action}`, {
        method: 'POST',
        headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Action failed');
    return data;
}

// ===== RENDER FUNCTIONS =====
function renderDashboard(data) {
    document.getElementById('adminEmail').textContent = data.admin.email || 'Admin';
    document.getElementById('totalAdmins').textContent = data.stats.total_admins;
    document.getElementById('totalUsers').textContent = data.stats.total_users;
    document.getElementById('adminBalance').textContent = data.stats.admin_balance.toFixed(2);
    document.getElementById('userBalance').textContent = data.stats.user_balance.toFixed(2);
    document.getElementById('allMovies').textContent = data.stats.all_movies;
    document.getElementById('adminMovies').textContent = data.stats.admin_movies;

    // Graph
    const ctx = document.getElementById('growthChart').getContext('2d');
    if (chartInstance) chartInstance.destroy();
    chartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: data.graph.dates,
            datasets: [
                {
                    label: 'New Users',
                    data: data.graph.users,
                    borderColor: '#e63946',
                    tension: 0.3,
                    fill: false
                },
                {
                    label: 'New Admins',
                    data: data.graph.admins,
                    borderColor: '#2196f3',
                    tension: 0.3,
                    fill: false
                }
            ]
        },
        options: {
            responsive: true,
            plugins: { legend: { labels: { color: '#fff' } } },
            scales: { x: { ticks: { color: '#888' } }, y: { ticks: { color: '#888' } } }
        }
    });
}

function renderLogins(data) {
    const body = document.getElementById('loginsBody');
    body.innerHTML = data.sessions.map(s => `
        <tr>
            <td>${s.token.substring(0,8)}...</td>
            <td>${s.ip_address || '-'}</td>
            <td>${s.device_info || '-'}</td>
            <td>${new Date(s.last_seen_at).toLocaleString()}</td>
            <td>${s.is_active ? '✅' : '❌'}</td>
        </tr>
    `).join('');
}

function renderUsers(data) {
    const body = document.getElementById('usersBody');
    body.innerHTML = data.users.map(u => `
        <tr>
            <td>${u.full_name}</td>
            <td>${u.phone}</td>
            <td>MK ${Number(u.wallet_balance).toFixed(2)}</td>
            <td>${new Date(u.created_at).toLocaleDateString()}</td>
            <td>
                <button class="btn btn-edit" onclick="adjustBalance('${u.user_id}')">Adjust</button>
                <button class="btn btn-warn" onclick="deactivateUser('${u.user_id}')">Deactivate</button>
                <button class="btn btn-danger" onclick="deleteUser('${u.user_id}')">Delete</button>
            </td>
        </tr>
    `).join('');
}

function renderAdmins(data) {
    const body = document.getElementById('adminsBody');
    body.innerHTML = data.admins.map(a => `
        <tr>
            <td>${a.full_name}</td>
            <td>${a.email}</td>
            <td>MK ${Number(a.wallet_balance).toFixed(2)}</td>
            <td>${a.total_films}</td>
            <td>
                <button class="btn btn-edit" onclick="adjustAdminBalance('${a.admin_id}')">Balance</button>
                <button class="btn btn-danger" onclick="deleteAdmin('${a.admin_id}')">Delete</button>
                <button class="btn btn-warn" onclick="deactivateAdmin('${a.admin_id}')">Deactivate</button>
            </td>
        </tr>
    `).join('');
}

// ===== ACTIONS =====
async function deleteUser(userId) {
    if (!confirm('Delete this user?')) return;
    try {
        await postAction('delete_user', { user_id: userId });
        alert('User deleted');
        loadData();
    } catch (e) { alert(e.message); }
}

async function deactivateUser(userId) {
    if (!confirm('Deactivate this user?')) return;
    try {
        await postAction('deactivate_user', { user_id: userId });
        alert('User deactivated');
        loadData();
    } catch (e) { alert(e.message); }
}

async function adjustBalance(userId) {
    const newBalance = prompt('Enter new balance (MK):');
    if (newBalance === null) return;
    try {
        await postAction('update_user_balance', { user_id: userId, balance: parseFloat(newBalance) });
        alert('Balance updated');
        loadData();
    } catch (e) { alert(e.message); }
}

async function deleteAdmin(adminId) {
    if (!confirm('Delete this admin?')) return;
    try {
        await postAction('delete_admin', { admin_id: adminId });
        alert('Admin deleted');
        loadData();
    } catch (e) { alert(e.message); }
}

async function deactivateAdmin(adminId) {
    if (!confirm('Deactivate this admin?')) return;
    try {
        await postAction('deactivate_admin', { admin_id: adminId });
        alert('Admin deactivated');
        loadData();
    } catch (e) { alert(e.message); }
}

async function adjustAdminBalance(adminId) {
    const newBalance = prompt('Enter new balance (MK):');
    if (newBalance === null) return;
    try {
        await postAction('update_admin_balance', { admin_id: adminId, balance: parseFloat(newBalance) });
        alert('Balance updated');
        loadData();
    } catch (e) { alert(e.message); }
}

// ===== LOAD DATA =====
async function loadData() {
    loadingEl.style.display = 'block';
    errorBox.style.display = 'none';
    try {
        const data = await fetchData(currentSection);
        switch(currentSection) {
            case 'dashboard': renderDashboard(data); break;
            case 'logins': renderLogins(data); break;
            case 'users': renderUsers(data); break;
            case 'admin_users': renderAdmins(data); break;
        }
    } catch (err) {
        errorBox.style.display = 'block';
        errorBox.innerHTML = `<div class="error-msg">${err.message}</div>`;
        if (err.message.includes('Invalid') || err.message.includes('expired')) {
            setTimeout(() => window.location.href = 'super-admin.html', 2000);
        }
    } finally {
        loadingEl.style.display = 'none';
    }
}

// Initial load
loadData();
