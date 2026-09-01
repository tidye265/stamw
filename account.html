<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <title>Akimark Account</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
        :root {
            --bg-primary: #080808;
            --bg-surface: #151515;
            --bg-secondary: #1C1C1C;
            --accent: #c71515;
            --accent-soft: #a00f0f;
            --white: #FFFFFF;
            --text-muted: #A7A7A7;
            --border-subtle: rgba(255,255,255,0.08);
            --radius: 10px;
            --radius-sm: 8px;
            --shadow: 0 8px 24px rgba(0,0,0,0.5);
            --transition: 0.25s ease;
        }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: var(--bg-primary); color: var(--white); min-height: 100vh;
            overflow-x: hidden; user-select: none; -webkit-user-select: none; padding-bottom: 70px;
        }
        body::-webkit-scrollbar { display: none; }

        /* ===== HEADER (from home.html) ===== */
        .header { position: sticky; top:0; z-index:100; background:#080808; border-bottom:1px solid var(--border-subtle); padding:10px 0; }
        .header .container { display:flex; align-items:center; justify-content:space-between; max-width:1200px; margin:0 auto; padding:0 16px; }
        .logo img { height:36px; width:auto; object-fit:contain; }
        .header-actions { display:flex; align-items:center; gap:12px; }
        .notification-btn { position:relative; width:40px; height:40px; border-radius:50%; background:var(--bg-secondary); display:flex; align-items:center; justify-content:center; border:1px solid var(--border-subtle); margin:0 3px; cursor:pointer; }
        .notification-btn:hover { background:#2a2a2a; }
        .notification-btn svg { width:20px; height:20px; fill:var(--text-muted); }
        .notification-badge { position:absolute; top:-3px; right:-3px; background:var(--accent); color:#fff; font-size:0.65rem; font-weight:800; padding:2px 5px; border-radius:10px; min-width:16px; text-align:center; line-height:1; }

        /* ===== SEARCH SUBHEADER ===== */
        .search-subheader { background:#0e0e0e; padding:0; border-bottom:1px solid var(--border-subtle); max-height:0; overflow:hidden; transition:max-height 0.3s ease, padding 0.3s ease; z-index:200; }
        .search-subheader.open { max-height:400px; overflow:visible; padding:10px 16px; }
        .search-wrapper { position:relative; max-width:600px; margin:0 auto; }
        .search-wrapper input { width:100%; padding:8px 14px 8px 40px; border-radius:6px; border:1px solid var(--border-subtle); background:var(--bg-secondary); color:#fff; font-size:0.85rem; }
        .search-wrapper img { position:absolute; left:14px; top:50%; transform:translateY(-50%); width:18px; height:18px; filter:invert(0.6); }
        .search-results { position:absolute; top:100%; left:0; right:0; background:#151515; border:1px solid var(--border-subtle); border-radius:var(--radius-sm); max-height:250px; overflow-y:auto; z-index:1000; display:none; box-shadow:0 8px 20px rgba(0,0,0,0.6); }
        .search-results.visible { display:block; }
        .search-results .result-item { padding:12px 14px; border-bottom:1px solid var(--border-subtle); cursor:pointer; font-size:0.9rem; color:#fff; transition:background 0.2s; }
        .search-results .result-item:hover { background:var(--bg-secondary); }

        /* ===== ACCOUNT CONTENT ===== */
        .account-page { padding: 20px 16px 80px; max-width: 600px; margin: 0 auto; }
        .account-card { background: var(--bg-surface); border: 1px solid var(--border-subtle); border-radius: var(--radius); padding: 20px; box-shadow: var(--shadow); }
        .wallet-balance { background: linear-gradient(135deg, rgba(199,21,21,0.1), rgba(199,21,21,0.02)); border: 1px solid rgba(199,21,21,0.2); border-radius: var(--radius); padding: 12px; margin-bottom: 16px; display: flex; align-items: center; gap: 12px; }
        .wallet-icon { width: 44px; height: 44px; flex-shrink: 0; display: flex; align-items: center; justify-content: center; background: rgba(199,21,21,0.15); border-radius: 50%; }
        .wallet-icon img { width: 24px; height: 24px; }
        .wallet-info { flex: 1; }
        .wallet-label { font-size: 0.7rem; text-transform: uppercase; letter-spacing: 1px; color: var(--text-muted); margin-bottom: 2px; }
        .wallet-amount { font-size: 16px; font-weight: 800; color: var(--white); line-height: 1.2; }
        .wallet-currency { font-size: 12px; color: var(--accent); margin-left: 4px; }
        .add-cash-link { background: var(--accent); color: #fff; font-size: 0.8rem; font-weight: 800; padding: 10px 16px; border-radius: 6px; text-decoration: none; display: inline-block; transition: background 0.2s; }
        .add-cash-link:hover { background: var(--accent-soft); }
        .account-header { display: flex; align-items: center; gap: 14px; margin-bottom: 20px; border-bottom: 1px solid var(--border-subtle); padding-bottom: 14px; }
        .account-avatar { width: 56px; height: 56px; border-radius: 50%; background: var(--bg-secondary); border: 2px solid var(--accent); display: flex; align-items: center; justify-content: center; }
        .account-avatar svg { width: 28px; height: 28px; fill: var(--text-muted); }
        .account-title h2 { font-size: 1.1rem; font-weight: 800; margin-bottom: 2px; }
        .account-title p { color: var(--white); font-size: 1.1rem; font-weight: 600; }
        .account-detail { margin-bottom: 12px; }
        .account-detail-label { font-size: 0.7rem; text-transform: uppercase; letter-spacing: 0.5px; color: var(--text-muted); margin-bottom: 4px; }
        .account-detail-value { display: flex; align-items: center; gap: 12px; background: var(--bg-secondary); border: 1px solid var(--border-subtle); border-radius: var(--radius-sm); padding: 10px 12px; font-size: 0.9rem; font-weight: 600; word-break: break-all; min-height: 44px; }
        .account-detail-value svg { width: 20px; height: 20px; fill: var(--accent); flex-shrink: 0; }
        .copy-icon { background: transparent; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; padding: 4px; color: var(--text-muted); }
        .copy-icon:hover { color: var(--accent); }
        .copy-icon svg { width: 18px; height: 18px; fill: currentColor; }
        .account-actions { display: flex; gap: 12px; margin-top: 24px; justify-content: center; }
        .btn-accent {
            display: inline-flex; align-items: center; justify-content: center; gap: 8px;
            background: var(--accent); color: #fff; font-weight: 700; font-size: 0.85rem;
            padding: 10px 24px; border-radius: 50px; border: none;
            cursor: pointer; transition: background 0.2s, transform 0.2s;
        }
        .btn-accent:hover { background: var(--accent-soft); transform: scale(1.02); }
        .btn-accent svg { width: 16px; height: 16px; fill: currentColor; }

        /* ===== BOTTOM NAV (FIXED - Similar to home.html) ===== */
        .bottom-nav { position: fixed; bottom:0; left:0; right:0; z-index:200; background:#080808; border-top:1px solid var(--border-subtle); display:flex; justify-content:space-around; padding:8px 0 6px; height:62px; }
        .bottom-nav a { display:flex; flex-direction:column; align-items:center; justify-content:center; gap:2px; font-size:0.7rem; font-weight:500; color:var(--text-muted); transition:color var(--transition); padding:0 12px; min-width:56px; position:relative; }
        .bottom-nav a img { width:28px; height:28px; object-fit:contain; filter:invert(0.6); transition:filter var(--transition); }
        .bottom-nav a:hover img, .bottom-nav a.active img { filter:invert(0) sepia(1) saturate(5) hue-rotate(340deg); }
        .bottom-nav a:hover, .bottom-nav a.active { color:var(--accent); }
        .bottom-nav a:active { background:rgba(199,21,21,0.2); border-radius:8px; }

        /* TOAST */
        .toast { position: fixed; bottom: 80px; left: 50%; transform: translateX(-50%); background: var(--bg-surface); border: 1px solid var(--border-subtle); border-radius: 6px; padding: 12px 20px; box-shadow: var(--shadow); display: none; font-size: 0.9rem; z-index: 999; }
        .toast.show { display: block; }

        /* SKELETON */
        .skeleton-block { position: relative; overflow: hidden; background: var(--bg-secondary); border-radius: var(--radius-sm); }
        .skeleton-block::after { content: ''; position: absolute; inset: 0; background: linear-gradient(90deg, transparent, rgba(255,255,255,0.08), transparent); animation: shimmer 1.5s infinite; }
        .skeleton-circle { border-radius: 50%; }
        .skeleton-text { height: 14px; margin-bottom: 8px; }
        .skeleton-title { height: 20px; width: 60%; }
        .skeleton-btn { height: 44px; border-radius: 6px; width: 100%; }
        @keyframes shimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }
    </style>
</head>
<body>

    <!-- HEADER (like home.html) -->
    <header class="header">
        <div class="container">
            <div class="logo"><img src="images/logo-akimark.png" onerror="this.onerror=null; this.src='images/logo-akimark.jpg';" alt="Akimark"></div>
            <div class="header-actions">
                <a href="notifications.html" class="notification-btn" style="margin:0 3px;">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>
                    <span class="notification-badge" id="notificationBadge">0</span>
                </a>
            </div>
        </div>
    </header>

    <!-- SEARCH SUBHEADER -->
    <div class="search-subheader" id="searchSubheader">
        <div class="search-wrapper">
            <img src="images/akimark-search.svg" alt="Search icon">
            <input type="text" placeholder="Search movies, series..." id="searchInput">
            <div class="search-results" id="searchResults"></div>
        </div>
    </div>

    <!-- ACCOUNT PAGE -->
    <main class="account-page">
        <div class="account-card">
            <!-- SKELETON -->
            <div id="accountSkeleton">
                <div class="wallet-balance" style="background: var(--bg-surface); border: 1px solid var(--border-subtle);">
                    <div class="skeleton-block skeleton-circle" style="width:44px;height:44px;"></div>
                    <div style="flex:1;"><div class="skeleton-text" style="width:60px;"></div><div class="skeleton-title" style="width:80px;"></div></div>
                    <div class="skeleton-block skeleton-btn" style="width:80px;"></div>
                </div>
                <div class="account-header" style="border-bottom:1px solid var(--border-subtle);">
                    <div class="skeleton-block skeleton-circle" style="width:56px;height:56px;"></div>
                    <div><div class="skeleton-text" style="width:100px;"></div><div class="skeleton-title" style="width:120px;"></div></div>
                </div>
                <div class="account-detail"><div class="skeleton-text" style="width:60px;"></div><div class="skeleton-block" style="height:44px;margin-top:4px;"></div></div>
                <div class="account-detail"><div class="skeleton-text" style="width:80px;"></div><div class="skeleton-block" style="height:44px;margin-top:4px;"></div></div>
                <div class="account-actions"><div class="skeleton-block skeleton-btn" style="flex:1;"></div></div>
            </div>

            <!-- REAL -->
            <div id="accountReal" style="display:none;">
                <div class="wallet-balance">
                    <div class="wallet-icon"><img src="images/akimark-wallet.svg" alt="Wallet"></div>
                    <div class="wallet-info"><div class="wallet-label">Wallet Balance</div><div class="wallet-amount"><span id="walletValue">0.00</span><span class="wallet-currency">MK</span></div></div>
                    <a href="deposit.html" class="add-cash-link">ADD CASH</a>
                </div>
                <div class="account-header">
                    <div class="account-avatar"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg></div>
                    <div class="account-title"><h2>My Account</h2><p id="accountFullName">Loading...</p></div>
                </div>
                <div class="account-detail"><div class="account-detail-label">User ID</div><div class="account-detail-value"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M20 4H4c-1.11 0-2 .89-2 2v12c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V6c0-1.11-.89-2-2-2zm-8 6c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3zm-7 10c0-2.33 4.67-3.5 7-3.5s7 1.17 7 3.5v.5H5v-.5z"/></svg><span id="accountUserId">Loading...</span><button class="copy-icon" id="copyUserIdBtn" title="Copy User ID"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/></svg></button></div></div>
                <div class="account-detail"><div class="account-detail-label">Phone Number</div><div class="account-detail-value"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/></svg><span id="accountPhone">Loading...</span></div></div>
                <div class="account-actions">
                    <button class="btn-accent" id="logoutBtn">
                        <svg viewBox="0 0 24 24" fill="currentColor"><path d="M10 17l5-5-5-5v3H3v4h7v3zm8-14h-6v2h6v14h-6v2h6c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2z"/></svg>
                        Logout
                    </button>
                </div>
            </div>
        </div>
    </main>

    <!-- BOTTOM NAV (FIXED) -->
    <nav class="bottom-nav">
        <a href="home.html"><img src="images/akimark-movies.svg" alt="Movies"><span>Movies</span></a>
        <a href="#" id="searchNavBtn"><img src="images/akimark-search.svg" alt="Search"><span>Search</span></a>
        <a href="my-movies.html"><img src="images/my-films.svg" alt="My Movies"><span>My Movies</span></a>
        <a href="account.html" class="active"><img src="images/akimark-account.svg" alt="Account"><span>My Account</span></a>
    </nav>

    <div class="toast" id="toast"></div>

    <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
    <script src="javascript.js/supabase.js"></script>
    <script src="javascript.js/account.js"></script>
    <!-- Inline script for search toggle -->
    <script>
        document.addEventListener('DOMContentLoaded', function() {
            var searchNavBtn = document.getElementById('searchNavBtn');
            var searchSubheader = document.getElementById('searchSubheader');
            var searchInput = document.getElementById('searchInput');
            var searchResults = document.getElementById('searchResults');
            if (searchNavBtn) {
                searchNavBtn.addEventListener('click', function(e) {
                    e.preventDefault();
                    searchSubheader.classList.toggle('open');
                    if (searchSubheader.classList.contains('open')) {
                        searchInput.focus();
                    } else {
                        searchInput.value = '';
                        searchResults.classList.remove('visible');
                    }
                });
            }
            // Close search when clicking outside
            document.addEventListener('click', function(e) {
                if (!searchSubheader.contains(e.target) && e.target !== searchNavBtn) {
                    searchResults.classList.remove('visible');
                }
            });
            // Simple dummy search (redirect to home)
            searchInput.addEventListener('input', function() {
                // For now, just hide results; actual search is on home.js
                searchResults.classList.remove('visible');
            });
        });
    </script>
</body>
</html>
