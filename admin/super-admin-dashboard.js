// super-admin-dashboard.js

const SUPABASE_URL = window.SUPABASE_URL;
const token = localStorage.getItem('akmark_super_admin_token');
if (!token) {
    window.location.href = 'super-admin.html';
}

let currentSection = 'dashboard';
let chartInstance = null;
let adminEmail = 'Super Admin';

// Data caches for search
let cachedSessions = [];
let cachedUsers = [];
let cachedAdmins = [];

// DOM elements
const loadingEl = document.getElementById('skeletonLoader');
const errorBox = document.getElementById('errorBox');
const sections = document.querySelectorAll('.section');
const toast = document.getElementById('toast');

// ===== SIDEBAR =====
function toggleMenu() {
    document.getElementById('sidebar').classList.toggle('open');
    document.getElementById('overlay').classList.toggle('active');
}

function navigate(section) {
    window.history.pushState({}, '', `?section=${section}`);
    selectMenu(section);
}

function selectMenu(section) {
    toggleMenu();
    sections.forEach(s => s.classList.remove('active'));
    const target = document.getElementById(section + 'Section');
    if (target) target.classList.add('active');
    currentSection = section;
    document.querySelectorAll('.sidebar-item').forEach(item => {
        item.classList.toggle('active', item.dataset.section === section);
    });
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

// ===== TOAST =====
function showToast(message, type = 'success') {
    toast.textContent = message;
    toast.className = 'toast show ' + type;
    setTimeout(() => toast.classList.remove('show'), 3000);
}

// ===== SKELETON =====
function showSkeleton() {
    loadingEl.style.display = 'block';
    sections.forEach(s => s.classList.remove('active'));
}

function hideSkeleton() {
    loadingEl.style.display = 'none';
    if (currentSection === 'dashboard') document.getElementById('dashboardSection').classList.add('active');
    else if (currentSection === 'logins') document.getElementById('loginsSection').classList.add('active');
    else if (currentSection === 'users') document.getElementById('usersSection').classList.add('active');
    else if (currentSection === 'adminUsers') document.getElementById('adminUsersSection').classList.add('active');
    else if (currentSection === 'verify') document.getElementById('verifySection').classList.add('active');
}

// ===== RENDER FUNCTIONS =====
function renderDashboard(data) {
    adminEmail = data.admin.email || 'Super Admin';
    document.getElementById('greeting').innerHTML = `Hello 👋 <span>${adminEmail}</span>`;
    document.getElementById('totalAdmins').textContent = data.stats.total_admins || 0;
    document.getElementById('totalUsers').textContent = data.stats.total_users || 0;
    document.getElementById('adminBalance').textContent = Number(data.stats.admin_balance).toFixed(2);
    document.getElementById('userBalance').textContent = Number(data.stats.user_balance).toFixed(2);
    document.getElementById('allMovies').textContent = data.stats.all_movies || 0;
    document.getElementById('adminMovies').textContent = data.stats.admin_movies || 0;
    document.getElementById('totalCommissions').textContent = Number(data.stats.total_commissions || 0).toFixed(2);

    const ctx = document.getElementById('growthChart').getContext('2d');
    if (chartInstance) chartInstance.destroy();
    chartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: data.graph.dates,
            datasets: [
                { label: 'New Users', data: data.graph.users, borderColor: '#e63946', tension: 0.3, fill: false },
                { label: 'New Admins', data: data.graph.admins, borderColor: '#2196f3', tension: 0.3, fill: false }
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
    cachedSessions = data.sessions || [];
    const body = document.getElementById('loginsBody');
    body.innerHTML = cachedSessions.map(s => `
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
    cachedUsers = data.users || [];
    const body = document.getElementById('usersBody');
    body.innerHTML = cachedUsers.map(u => {
        const isDeactivated = u.is_deactivated === true;
        const actionBtn = isDeactivated 
            ? `<button class="btn btn-activate" onclick="activateUser('${u.user_id}')">Activate</button>`
            : `<button class="btn btn-warn" onclick="deactivateUser('${u.user_id}')">Deactivate</button>`;
        return `
        <tr>
            <td class="id-col">${u.user_id}</td>
            <td>${u.full_name}</td>
            <td>${u.phone}</td>
            <td>MK ${Number(u.wallet_balance).toFixed(2)}</td>
            <td>${new Date(u.created_at).toLocaleDateString()}</td>
            <td>
                <button class="btn btn-edit" onclick="openBalanceModal('user', '${u.user_id}', '${u.wallet_balance}')">Balance</button>
                ${actionBtn}
                <button class="btn btn-danger" onclick="deleteUser('${u.user_id}')">Delete</button>
            </td>
        </tr>
    `;
    }).join('');
}

function renderAdmins(data) {
    cachedAdmins = data.admins || [];
    const body = document.getElementById('adminsBody');
    body.innerHTML = cachedAdmins.map(a => {
        const isDeactivated = a.is_deactivated === true;
        const actionBtn = isDeactivated 
            ? `<button class="btn btn-activate" onclick="activateAdmin('${a.admin_id}')">Activate</button>`
            : `<button class="btn btn-warn" onclick="deactivateAdmin('${a.admin_id}')">Deactivate</button>`;

        // Safe handling of films
        const filmsList = (a.films && a.films.length > 0) 
            ? a.films.map(f => f.title).join(', ') 
            : 'No films';

        return `
        <tr>
            <td class="id-col">${a.admin_id}</td>
            <td>${a.full_name}</td>
            <td>${a.email}</td>
            <td>MK ${Number(a.wallet_balance).toFixed(2)}</td>
            <td>${a.total_films || 0} (${filmsList})</td>
            <td>
                <button class="btn btn-edit" onclick="openBalanceModal('admin', '${a.admin_id}', '${a.wallet_balance}')">Balance</button>
                ${actionBtn}
                <button class="btn btn-danger" onclick="deleteAdmin('${a.admin_id}')">Delete</button>
            </td>
        </tr>
    `;
    }).join('');
}

function renderVerify(data) {
    const admins = data.admins || [];
    const body = document.getElementById('verifyBody');
    body.innerHTML = admins.map(a => `
        <tr>
            <td class="id-col">${a.admin_id}</td>
            <td>${a.full_name}</td>
            <td>${a.email}</td>
            <td>${a.admins_verify ? 'Verified ✅' : 'Pending ❌'}</td>
            <td>
                ${!a.admins_verify 
                    ? `<button class="btn btn-approve" onclick="approveAdmin('${a.admin_id}')">Approve</button>
                       <button class="btn btn-decline" onclick="declineAdmin('${a.admin_id}')">Decline</button>` 
                    : `<button class="btn btn-warn" onclick="declineAdmin('${a.admin_id}')">Revoke</button>`}
            </td>
        </tr>
    `).join('');
}

// ===== SEARCH FUNCTIONS =====
function filterLogins() {
    const query = document.getElementById('searchLogins').value.toLowerCase();
    const filtered = cachedSessions.filter(s => 
        s.token.toLowerCase().includes(query) || 
        (s.ip_address || '').toLowerCase().includes(query) || 
        (s.device_info || '').toLowerCase().includes(query)
    );
    document.getElementById('loginsBody').innerHTML = filtered.map(s => `
        <tr>
            <td>${s.token.substring(0,8)}...</td>
            <td>${s.ip_address || '-'}</td>
            <td>${s.device_info || '-'}</td>
            <td>${new Date(s.last_seen_at).toLocaleString()}</td>
            <td>${s.is_active ? '✅' : '❌'}</td>
        </tr>
    `).join('');
}

function filterUsers() {
    const query = document.getElementById('searchUsers').value.toLowerCase();
    const filtered = cachedUsers.filter(u => 
        u.full_name.toLowerCase().includes(query) || 
        u.phone.toLowerCase().includes(query) || 
        u.user_id.toLowerCase().includes(query)
    );
    document.getElementById('usersBody').innerHTML = filtered.map(u => {
        const isDeactivated = u.is_deactivated === true;
        const actionBtn = isDeactivated 
            ? `<button class="btn btn-activate" onclick="activateUser('${u.user_id}')">Activate</button>`
            : `<button class="btn btn-warn" onclick="deactivateUser('${u.user_id}')">Deactivate</button>`;
        return `
        <tr>
            <td class="id-col">${u.user_id}</td>
            <td>${u.full_name}</td>
            <td>${u.phone}</td>
            <td>MK ${Number(u.wallet_balance).toFixed(2)}</td>
            <td>${new Date(u.created_at).toLocaleDateString()}</td>
            <td>
                <button class="btn btn-edit" onclick="openBalanceModal('user', '${u.user_id}', '${u.wallet_balance}')">Balance</button>
                ${actionBtn}
                <button class="btn btn-danger" onclick="deleteUser('${u.user_id}')">Delete</button>
            </td>
        </tr>
    `;
    }).join('');
}

function filterAdmins() {
    const query = document.getElementById('searchAdmins').value.toLowerCase();
    const filtered = cachedAdmins.filter(a => 
        a.full_name.toLowerCase().includes(query) || 
        a.email.toLowerCase().includes(query) || 
        a.admin_id.toLowerCase().includes(query)
    );
    document.getElementById('adminsBody').innerHTML = filtered.map(a => {
        const isDeactivated = a.is_deactivated === true;
        const actionBtn = isDeactivated 
            ? `<button class="btn btn-activate" onclick="activateAdmin('${a.admin_id}')">Activate</button>`
            : `<button class="btn btn-warn" onclick="deactivateAdmin('${a.admin_id}')">Deactivate</button>`;
        const filmsList = (a.films && a.films.length > 0) 
            ? a.films.map(f => f.title).join(', ') 
            : 'No films';
        return `
        <tr>
            <td class="id-col">${a.admin_id}</td>
            <td>${a.full_name}</td>
            <td>${a.email}</td>
            <td>MK ${Number(a.wallet_balance).toFixed(2)}</td>
            <td>${a.total_films || 0} (${filmsList})</td>
            <td>
                <button class="btn btn-edit" onclick="openBalanceModal('admin', '${a.admin_id}', '${a.wallet_balance}')">Balance</button>
                ${actionBtn}
                <button class="btn btn-danger" onclick="deleteAdmin('${a.admin_id}')">Delete</button>
            </td>
        </tr>
    `;
    }).join('');
}

// ===== VERIFY ACTIONS =====
async function approveAdmin(adminId) {
    if (!confirm('Approve this admin?')) return;
    try {
        await postAction('verify_admin', { admin_id: adminId, verify: true });
        showToast('Admin approved ✅');
        loadData();
    } catch (e) { showToast(e.message, 'error'); }
}

async function declineAdmin(adminId) {
    if (!confirm('Decline/Revoke this admin?')) return;
    try {
        await postAction('verify_admin', { admin_id: adminId, verify: false });
        showToast('Admin declined/revoked ❌');
        loadData();
    } catch (e) { showToast(e.message, 'error'); }
}

// ===== BALANCE MODAL =====
let balanceTarget = { type: '', id: '', current: 0 };

function openBalanceModal(type, id, currentBalance) {
    balanceTarget = { type, id, current: parseFloat(currentBalance) || 0 };
    document.getElementById('currentBalance').textContent = balanceTarget.current.toFixed(2);
    document.getElementById('balanceAmount').value = '';
    document.getElementById('balanceOperation').value = 'add';
    document.getElementById('balanceModal').classList.add('open');
}

function closeModal() {
    document.getElementById('balanceModal').classList.remove('open');
}

async function submitBalanceAdjust() {
    const operation = document.getElementById('balanceOperation').value;
    const amount = parseFloat(document.getElementById('balanceAmount').value);
    if (!amount || amount <= 0) {
        showToast('Invalid amount', 'error');
        return;
    }
    try {
        if (balanceTarget.type === 'user') {
            await postAction('update_user_balance', { user_id: balanceTarget.id, amount, operation });
        } else if (balanceTarget.type === 'admin') {
            await postAction('update_admin_balance', { admin_id: balanceTarget.id, amount, operation });
        }
        showToast('Balance updated successfully');
        closeModal();
        loadData();
    } catch (e) {
        showToast(e.message, 'error');
    }
}

// ===== ACTIONS =====
async function deleteUser(userId) {
    if (!confirm('Delete this user?')) return;
    try {
        await postAction('delete_user', { user_id: userId });
        showToast('User deleted');
        loadData();
    } catch (e) { showToast(e.message, 'error'); }
}

async function deactivateUser(userId) {
    if (!confirm('Deactivate this user?')) return;
    try {
        await postAction('deactivate_user', { user_id: userId });
        showToast('User deactivated');
        loadData();
    } catch (e) { showToast(e.message, 'error'); }
}

async function activateUser(userId) {
    if (!confirm('Activate this user?')) return;
    try {
        await postAction('activate_user', { user_id: userId });
        showToast('Congratulations 🎉👏 Welcome back', 'success');
        loadData();
    } catch (e) { showToast(e.message, 'error'); }
}

async function deleteAdmin(adminId) {
    if (!confirm('Delete this admin?')) return;
    try {
        await postAction('delete_admin', { admin_id: adminId });
        showToast('Admin deleted');
        loadData();
    } catch (e) { showToast(e.message, 'error'); }
}

async function deactivateAdmin(adminId) {
    if (!confirm('Deactivate this admin?')) return;
    try {
        await postAction('deactivate_admin', { admin_id: adminId });
        showToast('Admin deactivated');
        loadData();
    } catch (e) { showToast(e.message, 'error'); }
}

async function activateAdmin(adminId) {
    if (!confirm('Activate this admin?')) return;
    try {
        await postAction('activate_admin', { admin_id: adminId });
        showToast('Congratulations 🎉👏 Welcome back', 'success');
        loadData();
    } catch (e) { showToast(e.message, 'error'); }
}

// ===== LOAD DATA =====
async function loadData() {
    showSkeleton();
    errorBox.style.display = 'none';
    try {
        const data = await fetchData(currentSection);
        hideSkeleton();
        switch(currentSection) {
            case 'dashboard': renderDashboard(data); break;
            case 'logins': renderLogins(data); break;
            case 'users': renderUsers(data); break;
            case 'adminUsers': renderAdmins(data); break;
            case 'verify': renderVerify(data); break;
        }
    } catch (err) {
        hideSkeleton();
        errorBox.style.display = 'block';
        errorBox.innerHTML = `<div class="error-msg">${err.message}</div>`;
        if (err.message.includes('Invalid') || err.message.includes('expired')) {
            setTimeout(() => window.location.href = 'super-admin.html', 2000);
        }
    }
}

// ===== INITIALIZATION =====
function init() {
    const urlParams = new URLSearchParams(window.location.search);
    const section = urlParams.get('section') || 'dashboard';
    document.querySelectorAll('.sidebar-item').forEach(item => {
        item.classList.toggle('active', item.dataset.section === section);
    });
    sections.forEach(s => s.classList.remove('active'));
    const target = document.getElementById(section + 'Section');
    if (target) target.classList.add('active');
    currentSection = section;
    loadData();
}

window.addEventListener('popstate', function() {
    const urlParams = new URLSearchParams(window.location.search);
    const section = urlParams.get('section') || 'dashboard';
    sections.forEach(s => s.classList.remove('active'));
    document.querySelectorAll('.sidebar-item').forEach(item => {
        item.classList.toggle('active', item.dataset.section === section);
    });
    const target = document.getElementById(section + 'Section');
    if (target) target.classList.add('active');
    currentSection = section;
    loadData();
});

init();
