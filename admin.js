// Admin Panel JavaScript Logic (Supabase Database Backend + Authentication)

// Initial Load & Auth Check
document.addEventListener('DOMContentLoaded', () => {
  checkAdminAuth();
});

// Check Admin Session Auth
// Check Admin Session Auth
function checkAdminAuth() {
  const isAuthenticated = sessionStorage.getItem('admin_authenticated') === 'true';
  const role = sessionStorage.getItem('admin_role') || 'admin';
  const loginScreen = document.getElementById('admin-login-screen');
  const dashboardScreen = document.getElementById('admin-dashboard-screen');
  const superNav = document.getElementById('nav-super-admin');

  if (isAuthenticated) {
    if (loginScreen) loginScreen.style.display = 'none';
    if (dashboardScreen) dashboardScreen.style.display = 'flex';

    if (superNav) {
      superNav.style.display = (role === 'super_admin') ? 'flex' : 'none';
    }

    const savedSection = sessionStorage.getItem('admin_active_section') || 'profit';
    if (savedSection === 'super-admin' && role !== 'super_admin') {
      switchAdminSection('profit');
    } else {
      switchAdminSection(savedSection);
    }
    loadAdminDashboardData();
  } else {
    if (loginScreen) loginScreen.style.display = 'flex';
    if (dashboardScreen) dashboardScreen.style.display = 'none';
  }
}

async function loadAdminDashboardData() {
  await renderAdminUsers();
  await renderAdminDeposits();
  await renderAdminPaymentMethods();
  await loadPaymentSettingsForm();
  await loadAdminAnimalsConfigForm();
}

async function loadPaymentSettingsForm() {
  const settings = await dbGetPaymentSettings();
  const welcomeInput = document.getElementById('setting-welcome-bonus');
  const bonusInput = document.getElementById('setting-first-deposit-bonus');
  const refInput = document.getElementById('setting-referral-bonus');

  if (welcomeInput) welcomeInput.value = settings.welcome_bonus !== undefined ? settings.welcome_bonus : 100;
  if (bonusInput) bonusInput.value = settings.first_deposit_bonus !== undefined ? settings.first_deposit_bonus : 100;
  if (refInput) refInput.value = settings.referral_bonus !== undefined ? settings.referral_bonus : 50;
}

async function saveBonusSettings(event) {
  event.preventDefault();
  const welcomeBonus = parseFloat(document.getElementById('setting-welcome-bonus').value) || 0;
  const bonusPct = parseInt(document.getElementById('setting-first-deposit-bonus').value) || 0;
  const refBonus = parseFloat(document.getElementById('setting-referral-bonus').value) || 0;

  await dbUpdatePaymentSettings({
    welcome_bonus: welcomeBonus,
    first_deposit_bonus: bonusPct,
    referral_bonus: refBonus
  });

  if (typeof logAdminActivity === 'function') {
    logAdminActivity('SETTINGS_CHANGE', 'PaymentBonus', `Updated Welcome Bonus: ₹${welcomeBonus}, Deposit Bonus: ${bonusPct}%, Referral: ₹${refBonus}`);
  }

  alert(`✅ Bonus Settings Saved!\nNew User Welcome Bonus: ₹${welcomeBonus}\nFirst Deposit Bonus: ${bonusPct}%\nPer Invite Referral Bonus: ₹${refBonus}`);
}

// Handle Admin Login Submit with DB verification
async function handleAdminLogin(event) {
  event.preventDefault();
  const username = document.getElementById('admin-username').value.trim();
  const password = document.getElementById('admin-password').value.trim();
  const errorEl = document.getElementById('admin-login-error');

  const res = typeof dbVerifyAdminCredentials === 'function' 
    ? await dbVerifyAdminCredentials(username, password)
    : (username === 'admin' && password === 'admin123' ? { success: true, role: 'admin', username: 'admin' } : { success: false });

  if (res && res.success) {
    if (errorEl) errorEl.style.display = 'none';
    sessionStorage.setItem('admin_authenticated', 'true');
    sessionStorage.setItem('admin_role', res.role || 'admin');
    sessionStorage.setItem('admin_user', res.username || username);
    checkAdminAuth();
  } else {
    if (errorEl) {
      errorEl.innerText = res.message || '⚠️ Invalid Admin Username or Password!';
      errorEl.style.display = 'block';
    }
  }
}

// Handle Admin Logout
function handleAdminLogout() {
  sessionStorage.removeItem('admin_authenticated');
  sessionStorage.removeItem('admin_role');
  sessionStorage.removeItem('admin_user');
  sessionStorage.removeItem('admin_active_section');
  checkAdminAuth();
}

// Password Visibility Toggle for Admin Login
function toggleAdminPassVisibility(inputId, btnElement) {
  const input = document.getElementById(inputId);
  if (!input) return;
  const icon = btnElement.querySelector('i');

  if (input.type === 'password') {
    input.type = 'text';
    icon.classList.remove('fa-eye-slash');
    icon.classList.add('fa-eye');
  } else {
    input.type = 'password';
    icon.classList.remove('fa-eye');
    icon.classList.add('fa-eye-slash');
  }
}

// Section Switcher (Users, Deposits, Withdrawals, Settings, 10x-game, game-settings, bet-history, profit)
function switchAdminSection(section) {
  sessionStorage.setItem('admin_active_section', section);
  const navItems = document.querySelectorAll('.admin-nav-item');
  navItems.forEach(item => item.classList.remove('active'));

  const navItem = document.getElementById(`nav-${section}`);
  if (navItem) navItem.classList.add('active');

  const secUsers = document.getElementById('section-users');
  const secDeposits = document.getElementById('section-deposits');
  const secWithdrawals = document.getElementById('section-withdrawals');
  const secSettings = document.getElementById('section-settings');
  const sec10x = document.getElementById('section-10x-game');
  const secGameSettings = document.getElementById('section-game-settings');
  const secBetHistory = document.getElementById('section-bet-history');
  const secProfit = document.getElementById('section-profit');
  const secSuperAdmin = document.getElementById('section-super-admin');
  const pageTitle = document.getElementById('admin-section-title');

  const currentRole = sessionStorage.getItem('admin_role') || 'admin';

  if (secUsers) secUsers.style.display = section === 'users' ? 'block' : 'none';
  if (secDeposits) secDeposits.style.display = section === 'deposits' ? 'block' : 'none';
  if (secWithdrawals) secWithdrawals.style.display = section === 'withdrawals' ? 'flex' : 'none';
  if (secSettings) secSettings.style.display = section === 'settings' ? 'flex' : 'none';
  if (sec10x) sec10x.style.display = section === '10x-game' ? 'flex' : 'none';
  if (secGameSettings) secGameSettings.style.display = section === 'game-settings' ? 'flex' : 'none';
  if (secBetHistory) secBetHistory.style.display = section === 'bet-history' ? 'flex' : 'none';
  if (secProfit) secProfit.style.display = section === 'profit' ? 'flex' : 'none';
  if (secSuperAdmin) secSuperAdmin.style.display = (section === 'super-admin' && currentRole === 'super_admin') ? 'flex' : 'none';

  if (section === 'users') {
    if (pageTitle) pageTitle.innerText = "Registered Users Dashboard";
    renderAdminUsers();
  } else if (section === 'deposits') {
    if (pageTitle) pageTitle.innerText = "Pending Deposit Payments";
    renderAdminDeposits();
  } else if (section === 'withdrawals') {
    if (pageTitle) pageTitle.innerText = "User Withdrawal Requests Manager";
    loadAdminWithdrawals();
  } else if (section === 'settings') {
    if (pageTitle) pageTitle.innerText = "Payment Methods & ON/OFF Toggles";
    renderAdminPaymentMethods();
  } else if (section === '10x-game') {
    if (pageTitle) pageTitle.innerText = "Live Games Outcome & Round Controller";
    load10xGameController();
    renderAdminDTOutcomeModeUI();
  } else if (section === 'game-settings') {
    if (pageTitle) pageTitle.innerText = "Game & Timer Duration Settings";
    renderAdminGamesControlList();
    renderAdminDTOutcomeModeUI();
    loadAdminTimerSettingsForm();
    loadAdminCommissionSettingsForm();
    loadAdminAnimalsConfigForm();
  } else if (section === 'bet-history') {
    if (pageTitle) pageTitle.innerText = "All Players 10X & 2X Bet History Monitor";
    renderAdminAllBetsHistory();
  } else if (section === 'profit') {
    if (pageTitle) pageTitle.innerText = "Daily Profit & Financial Analytics";
    renderAdminProfitAnalytics();
  } else if (section === 'super-admin') {
    if (currentRole !== 'super_admin') {
      switchAdminSection('profit');
      return;
    }
    if (pageTitle) pageTitle.innerText = "Super Admin Stealth Operations & Activity Audit Logs";
    renderSuperAdminAuditLogs();
    renderSuperAdminCredentials();
  }
}

// Render Users Table & Update Dashboard Counters from Supabase
async function renderAdminUsers() {
  const users = await dbGetUsers();
  const searchInput = document.getElementById('admin-user-search')?.value.toLowerCase() || '';
  const statusFilter = document.getElementById('status-filter')?.value || 'ALL';

  const filtered = users.filter(user => {
    const matchesSearch = user.phone.toLowerCase().includes(searchInput) || user.id.toLowerCase().includes(searchInput);
    const matchesStatus = statusFilter === 'ALL' || user.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const tbody = document.getElementById('users-table-body');
  if (!tbody) return;

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding: 24px; color: var(--color-text-muted);">No registered users found in Supabase Database.</td></tr>`;
  } else {
    tbody.innerHTML = filtered.map(user => `
      <tr>
        <td style="font-weight: 700; color: var(--color-text-gold);">${user.id}</td>
        <td>+91 ${user.phone}</td>
        <td style="color: var(--color-text-muted); font-size: 12px;">${user.date}</td>
        <td><span style="background: rgba(245,166,35,0.15); color: var(--color-text-gold); padding: 3px 8px; border-radius: 4px; font-weight: 700; font-size: 11px;">${user.vip}</span></td>
        <td style="font-weight: 800; color: #34d399;">₹ ${Number(user.balance).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
        <td>
          <span class="status-badge ${user.status === 'Active' ? 'status-active' : 'status-suspended'}">
            ${user.status}
          </span>
        </td>
        <td style="text-align: right;">
          <button class="table-action-btn" onclick="openEditUserModal('${user.id}')"><i class="fa-solid fa-pen-to-square"></i> Edit</button>
          <button class="table-action-btn" onclick="toggleUserStatus('${user.id}')">
            ${user.status === 'Active' ? '<i class="fa-solid fa-ban"></i> Suspend' : '<i class="fa-solid fa-check"></i> Activate'}
          </button>
          <button class="table-action-btn btn-danger-sm" onclick="deleteUser('${user.id}')"><i class="fa-solid fa-trash"></i></button>
        </td>
      </tr>
    `).join('');
  }

  // Update Stats
  const totalUsersEl = document.getElementById('stat-total-users');
  const activeUsersEl = document.getElementById('stat-active-users');
  if (totalUsersEl) totalUsersEl.innerText = users.length;
  if (activeUsersEl) activeUsersEl.innerText = users.filter(u => u.status === 'Active').length;
}

// Filter Users Live
function filterUsersTable() {
  renderAdminUsers();
}

let adminDepositsCache = [];

// Render Pending UTR Deposits Table
async function renderAdminDeposits() {
  const deposits = await dbGetPendingDeposits();
  adminDepositsCache = deposits;
  const tbody = document.getElementById('deposits-table-body');
  const pendingStat = document.getElementById('stat-pending-deposits');

  const pendingCount = deposits.filter(d => d.status === 'Pending').length;
  if (pendingStat) pendingStat.innerText = pendingCount;

  if (!tbody) return;

  if (deposits.length === 0) {
    tbody.innerHTML = `<tr><td colspan="9" style="text-align:center; padding: 24px; color: var(--color-text-muted);">No pending deposit requests.</td></tr>`;
  } else {
    tbody.innerHTML = deposits.map(dep => {
      const hasProof = dep.proof_url && dep.proof_url.length > 20;
      const proofBtnHtml = hasProof
        ? `<button type="button" class="table-action-btn" style="background: #0284c7; color: white; border: none; font-size: 11px; padding: 5px 10px; cursor: pointer; display: inline-flex; align-items: center; gap: 5px; border-radius: 6px;" onclick="viewDepositProof('${dep.id}')"><i class="fa-solid fa-image"></i> View Proof</button>`
        : `<span style="font-size: 11px; color: var(--color-text-muted);">No Proof</span>`;

      return `
        <tr>
          <td style="font-weight: 700; color: var(--color-text-gold);">${dep.id}</td>
          <td>${dep.user_id}<br><span style="font-size: 11px; color: var(--color-text-muted);">+91 ${dep.phone}</span></td>
          <td style="font-weight: 800; color: #34d399;">₹ ${Number(dep.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
          <td style="font-weight: 800; font-family: monospace; font-size: 14px; letter-spacing: 1px; color: #60a5fa;">${dep.utr_number}</td>
          <td>${proofBtnHtml}</td>
          <td>${dep.method}</td>
          <td style="font-size: 11px; color: var(--color-text-muted);">${dep.date}</td>
          <td>
            <span class="status-badge ${dep.status === 'Approved' ? 'status-active' : (dep.status === 'Rejected' ? 'status-suspended' : '')}" style="${dep.status === 'Pending' ? 'background: rgba(245,166,35,0.15); color: #f5a623;' : ''}">
              ${dep.status}
            </span>
          </td>
          <td style="text-align: right;">
            ${dep.status === 'Pending' ? `
              <button class="table-action-btn" style="background: #10b981; color: white; border: none;" onclick="approveDeposit('${dep.id}')"><i class="fa-solid fa-check"></i> Approve</button>
              <button class="table-action-btn btn-danger-sm" onclick="rejectDeposit('${dep.id}')"><i class="fa-solid fa-xmark"></i> Reject</button>
            ` : `<span style="font-size: 12px; color: var(--color-text-muted);">${dep.status}</span>`}
          </td>
        </tr>
      `;
    }).join('');
  }
}

let proofZoomState = {
  scale: 1,
  translateX: 0,
  translateY: 0,
  isDragging: false,
  startX: 0,
  startY: 0
};

function resetProofImageTransform() {
  proofZoomState = { scale: 1, translateX: 0, translateY: 0, isDragging: false, startX: 0, startY: 0 };
  updateProofImgTransform();
}

function zoomProofImage(delta) {
  proofZoomState.scale = Math.min(Math.max(0.5, proofZoomState.scale + delta), 5);
  updateProofImgTransform();
}

function updateProofImgTransform() {
  const img = document.getElementById('proof-modal-img');
  if (img) {
    img.style.transform = `translate(${proofZoomState.translateX}px, ${proofZoomState.translateY}px) scale(${proofZoomState.scale})`;
  }
}

function initProofImageInteractions() {
  const viewport = document.getElementById('proof-img-viewport');
  if (!viewport || viewport.dataset.initialized) return;
  viewport.dataset.initialized = 'true';

  // Mouse Wheel Zoom In / Out
  viewport.addEventListener('wheel', (e) => {
    e.preventDefault();
    const delta = e.deltaY < 0 ? 0.25 : -0.25;
    zoomProofImage(delta);
  }, { passive: false });

  // Mouse Drag / Pan / Movement
  viewport.addEventListener('mousedown', (e) => {
    e.preventDefault();
    proofZoomState.isDragging = true;
    proofZoomState.startX = e.clientX - proofZoomState.translateX;
    proofZoomState.startY = e.clientY - proofZoomState.translateY;
    viewport.style.cursor = 'grabbing';
  });

  window.addEventListener('mousemove', (e) => {
    if (!proofZoomState.isDragging) return;
    proofZoomState.translateX = e.clientX - proofZoomState.startX;
    proofZoomState.translateY = e.clientY - proofZoomState.startY;
    updateProofImgTransform();
  });

  window.addEventListener('mouseup', () => {
    if (proofZoomState.isDragging) {
      proofZoomState.isDragging = false;
      const vp = document.getElementById('proof-img-viewport');
      if (vp) vp.style.cursor = 'grab';
    }
  });

  // Touch Pinch & Drag for Mobile Devices
  let touchStartDist = 0;
  viewport.addEventListener('touchstart', (e) => {
    if (e.touches.length === 1) {
      proofZoomState.isDragging = true;
      proofZoomState.startX = e.touches[0].clientX - proofZoomState.translateX;
      proofZoomState.startY = e.touches[0].clientY - proofZoomState.translateY;
    } else if (e.touches.length === 2) {
      touchStartDist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
    }
  });

  viewport.addEventListener('touchmove', (e) => {
    if (e.touches.length === 1 && proofZoomState.isDragging) {
      proofZoomState.translateX = e.touches[0].clientX - proofZoomState.startX;
      proofZoomState.translateY = e.touches[0].clientY - proofZoomState.startY;
      updateProofImgTransform();
    } else if (e.touches.length === 2) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      const delta = (dist - touchStartDist) * 0.01;
      zoomProofImage(delta);
      touchStartDist = dist;
    }
  });

  viewport.addEventListener('touchend', () => {
    proofZoomState.isDragging = false;
  });
}

async function viewDepositProof(depositId) {
  let dep = adminDepositsCache.find(d => d.id === depositId);
  if (!dep || !dep.proof_url) {
    const allDeps = await dbGetPendingDeposits();
    adminDepositsCache = allDeps;
    dep = allDeps.find(d => d.id === depositId);
  }

  if (!dep || !dep.proof_url) {
    alert('No payment proof screenshot found for this deposit request.');
    return;
  }

  const modal = document.getElementById('proof-view-modal');
  const img = document.getElementById('proof-modal-img');
  const info = document.getElementById('proof-modal-info');
  if (!modal || !img) return;

  resetProofImageTransform();
  initProofImageInteractions();

  img.src = dep.proof_url;
  if (info) {
    info.innerHTML = `
      <div><strong>Deposit ID:</strong> <span style="color:#ffe066">${dep.id}</span></div>
      <div><strong>User Phone:</strong> +91 ${dep.phone}</div>
      <div><strong>Amount:</strong> ₹${Number(dep.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
      <div><strong>UTR Number:</strong> <span style="font-family:monospace; color:#60a5fa; font-weight:bold;">${dep.utr_number}</span></div>
      <div><strong>Submitted Date:</strong> ${dep.date}</div>
    `;
  }

  const approveBtn = document.getElementById('proof-btn-approve');
  const rejectBtn = document.getElementById('proof-btn-reject');

  if (dep.status === 'Pending') {
    if (approveBtn) {
      approveBtn.style.display = 'flex';
      approveBtn.onclick = async () => {
        closeAdminModal('proof-view-modal');
        await approveDeposit(dep.id);
      };
    }
    if (rejectBtn) {
      rejectBtn.style.display = 'flex';
      rejectBtn.onclick = async () => {
        closeAdminModal('proof-view-modal');
        await rejectDeposit(dep.id);
      };
    }
  } else {
    if (approveBtn) approveBtn.style.display = 'none';
    if (rejectBtn) rejectBtn.style.display = 'none';
  }

  modal.classList.add('active');
  modal.style.display = 'flex';
}

async function approveDeposit(depositId) {
  if (confirm(`Approve deposit ${depositId} and credit funds to user balance?`)) {
    await dbApproveDeposit(depositId);
    if (typeof logAdminActivity === 'function') {
      logAdminActivity('DEPOSIT_ACTION', depositId, `Approved Deposit #${depositId}`);
    }
    await renderAdminUsers();
    await renderAdminDeposits();
    alert('✅ Deposit approved and funds credited successfully!');
  }
}

async function rejectDeposit(depositId) {
  if (confirm(`Reject deposit ${depositId}?`)) {
    await dbRejectDeposit(depositId);
    if (typeof logAdminActivity === 'function') {
      logAdminActivity('DEPOSIT_ACTION', depositId, `Rejected Deposit #${depositId}`);
    }
    await renderAdminDeposits();
  }
}

async function loadAdminWithdrawals() {
  const tbody = document.getElementById('admin-withdrawals-table-body');
  if (!tbody) return;

  const wds = await dbGetAllWithdrawals();

  if (!wds || wds.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding: 24px; color: var(--color-text-muted);">No withdrawal requests found.</td></tr>`;
    return;
  }

  tbody.innerHTML = wds.map(w => {
    const isBank = w.method === 'BANK';
    const bd = w.bank_details || {};
    
    let detailsHtml = '';
    if (isBank) {
      detailsHtml = `
        <div style="font-size: 12px; font-weight: 700; color: white;">🏦 ${bd.bank || 'Bank Transfer'}</div>
        <div style="font-size: 11px; color: #cbd5e1;">Acc: <strong style="color: #ffe066;">${bd.acc || bd.account || 'N/A'}</strong></div>
        <div style="font-size: 10px; color: #94a3b8;">Holder: ${bd.name || 'N/A'} | IFSC: ${bd.ifsc || 'N/A'}</div>
      `;
    } else {
      const vpa = bd.vpa || 'N/A';
      const name = bd.name || 'N/A';
      const amount = parseFloat(w.amount || 0).toFixed(2);
      const upiPayload = `upi://pay?pa=${vpa}&pn=${encodeURIComponent(name)}&am=${amount}&cu=INR`;
      const thumbQr = vpa !== 'N/A' ? `https://api.qrserver.com/v1/create-qr-code/?size=80x80&data=${encodeURIComponent(upiPayload)}` : '';

      detailsHtml = `
        <div style="display: flex; align-items: center; gap: 10px;">
          ${thumbQr ? `<img src="${thumbQr}" onclick="openUpiQrModal('${w.id}')" title="Click to enlarge QR Code" style="width: 42px; height: 42px; border-radius: 6px; border: 1.5px solid var(--border-gold); cursor: pointer; background: white; padding: 2px; flex-shrink: 0; box-shadow: 0 2px 8px rgba(0,0,0,0.3);">` : ''}
          <div>
            <div style="font-size: 12px; font-weight: 800; color: #38bdf8;">UPI: ${vpa}</div>
            <div style="font-size: 11px; color: #cbd5e1;">Payee Name: <strong>${name}</strong></div>
            ${vpa !== 'N/A' ? `
              <button type="button" onclick="openUpiQrModal('${w.id}')" style="margin-top: 4px; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; border: none; padding: 3px 8px; border-radius: 6px; font-size: 10px; font-weight: 800; cursor: pointer; display: inline-flex; align-items: center; gap: 4px; box-shadow: 0 2px 6px rgba(16,185,129,0.3);">
                <i class="fa-solid fa-qrcode"></i> View Auto QR
              </button>
            ` : ''}
          </div>
        </div>
      `;
    }

    const isPending = (w.status || 'Pending').toUpperCase() === 'PENDING';
    const isApproved = (w.status || '').toUpperCase() === 'APPROVED';
    const isRejected = (w.status || '').toUpperCase() === 'REJECTED';

    let statusBadge = `<span class="status-badge status-suspended">⏳ Pending</span>`;
    if (isApproved) statusBadge = `<span class="status-badge status-active">🟢 Approved</span>`;
    if (isRejected) statusBadge = `<span class="status-badge" style="background: rgba(239,68,68,0.2); color: #f87171;">🔴 Rejected</span>`;

    const dateStr = w.created_at ? new Date(w.created_at).toLocaleString() : (w.date || 'Recent');

    return `
      <tr>
        <td style="font-weight: 700; color: var(--color-text-gold); font-size: 12px;">
          ${w.id}<br><span style="font-size: 10px; color: #94a3b8;">${dateStr}</span>
        </td>
        <td>${w.user_id}<br><span style="font-size: 11px; color: var(--color-text-muted);">+91 ${w.phone || ''}</span></td>
        <td><span style="font-size: 11px; font-weight: 800; padding: 2px 6px; border-radius: 4px; background: rgba(255,255,255,0.08); color: ${isBank ? '#38bdf8' : '#a855f7'};">${w.method}</span></td>
        <td>${detailsHtml}</td>
        <td style="font-weight: 900; color: #ffe066; font-size: 14px;">₹ ${parseFloat(w.amount || 0).toFixed(2)}</td>
        <td>${statusBadge}</td>
        <td style="text-align: right;">
          ${isPending ? `
            <button class="table-action-btn" style="background: #10b981; color: white;" onclick="adminApproveWithdrawal('${w.id}')">✅ Approve</button>
            <button class="table-action-btn btn-danger-sm" onclick="adminRejectWithdrawal('${w.id}')">❌ Reject</button>
          ` : `<span style="font-size: 11px; color: #64748b;">Processed</span>`}
        </td>
      </tr>
    `;
  }).join('');
}

async function adminApproveWithdrawal(id) {
  const utr = prompt('Enter UTR / Ref Number for this payout transfer:');
  if (utr === null) return;
  await dbApproveWithdrawal(id, utr);
  await loadAdminWithdrawals();
  alert('✅ Withdrawal Approved!');
}

async function adminRejectWithdrawal(id) {
  const reason = prompt('Enter rejection reason (funds will be refunded to user wallet):', 'Invalid Account Details');
  if (reason === null) return;
  await dbRejectWithdrawal(id, reason);
  await loadAdminWithdrawals();
  alert('🔴 Withdrawal Rejected & Funds Refunded to User Wallet!');
}

// --- DYNAMIC PAYMENT METHODS & ON/OFF TOGGLE MANAGER ---

async function renderAdminPaymentMethods() {
  const methods = await dbGetPaymentMethods();
  const tbody = document.getElementById('payment-methods-table-body');
  const activeStat = document.getElementById('stat-active-methods');

  const activeCount = methods.filter(m => m.status === 'ON' && (m.current_total < m.max_limit)).length;
  if (activeStat) activeStat.innerText = activeCount;

  if (!tbody) return;

  if (methods.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding: 24px; color: var(--color-text-muted);">No payment methods configured. Add one using the form above!</td></tr>`;
  } else {
    tbody.innerHTML = methods.map(pm => {
      const qrThumb = pm.qr_code_url ? pm.qr_code_url : `https://api.qrserver.com/v1/create-qr-code/?size=60x60&data=${encodeURIComponent('upi://pay?pa=' + pm.upi_id)}`;
      const isOn = pm.status === 'ON';
      const maxLimit = parseFloat(pm.max_limit || 60000);
      const collected = parseFloat(pm.current_total || 0);
      const isLimitReached = collected >= maxLimit;
      const pct = Math.min(100, Math.round((collected / maxLimit) * 100));

      const barColor = isLimitReached ? '#ef4444' : pct > 80 ? '#f59e0b' : '#10b981';

      return `
        <tr>
          <td style="font-weight: 800; font-size: 14px; color: white;">
            <i class="fa-solid fa-credit-card" style="color: var(--color-text-gold); margin-right: 6px;"></i> ${pm.name}
          </td>
          <td style="font-weight: 700; font-family: monospace; font-size: 13px; color: #60a5fa;">${pm.upi_id}</td>
          <td>
            <img src="${qrThumb}" alt="QR" style="width: 44px; height: 44px; border-radius: 6px; border: 1px solid rgba(255,255,255,0.2); background: white; padding: 2px;">
          </td>
          <td style="min-width: 170px;">
            <div style="display: flex; justify-content: space-between; font-size: 11px; font-weight: 700; color: #cbd5e1; margin-bottom: 3px;">
              <span>₹${collected.toLocaleString('en-IN')} / ₹${maxLimit.toLocaleString('en-IN')}</span>
              <span style="color: ${barColor}; font-weight: 900;">${pct}%</span>
            </div>
            <div style="width: 100%; height: 7px; background: rgba(255,255,255,0.1); border-radius: 4px; overflow: hidden;">
              <div style="width: ${pct}%; height: 100%; background: ${barColor}; border-radius: 4px; transition: width 0.4s ease;"></div>
            </div>
          </td>
          <td>
            <span class="status-badge ${isOn && !isLimitReached ? 'status-active' : 'status-suspended'}">
              ${isLimitReached ? '🛑 OFF (Limit Reached)' : isOn ? '🟢 ON (Visible)' : '🔴 OFF (Hidden)'}
            </span>
          </td>
          <td style="text-align: right; white-space: nowrap;">
            <button class="table-action-btn" style="background: rgba(245, 158, 11, 0.2); color: #fbbf24; border: 1px solid #f59e0b; font-weight: 700; margin-right: 4px;" onclick="openEditPaymentMethodModal('${pm.id}')" title="Edit method details, UPI ID or QR Code">
              ✏️ Edit
            </button>
            <button class="table-action-btn" style="background: rgba(59, 130, 246, 0.2); color: #60a5fa; border: 1px solid #3b82f6; font-weight: 700; margin-right: 4px;" onclick="resetPaymentCardTotal('${pm.id}', '${pm.name}')" title="Reset collected amount to ₹0">
              🔄 Reset Amount
            </button>
            <button class="table-action-btn" style="background: ${isOn ? '#ef4444' : '#10b981'}; color: white; border: none; font-weight: 700; margin-right: 4px;" onclick="togglePaymentMethodStatus('${pm.id}')">
              ${isOn ? '⏸️ Turn OFF' : '▶️ Turn ON'}
            </button>
            <button class="table-action-btn btn-danger-sm" onclick="deletePaymentCard('${pm.id}')">
              <i class="fa-solid fa-trash"></i>
            </button>
          </td>
        </tr>
      `;
    }).join('');
  }
}

async function openEditPaymentMethodModal(methodId) {
  const methods = await dbGetPaymentMethods();
  const pm = methods.find(m => m.id === methodId);
  if (!pm) return;

  document.getElementById('edit-pm-id').value = pm.id;
  document.getElementById('edit-pm-name').value = pm.name || '';
  document.getElementById('edit-pm-upi-id').value = pm.upi_id || '';
  document.getElementById('edit-pm-qr-url').value = pm.qr_code_url || '';
  document.getElementById('edit-pm-max-limit').value = pm.max_limit || 60000;
  document.getElementById('edit-pm-status').value = pm.status || 'ON';

  const modal = document.getElementById('edit-payment-method-modal');
  if (modal) {
    modal.style.display = 'flex';
    modal.classList.add('active');
  }
}

async function savePaymentMethodEdit() {
  const id = document.getElementById('edit-pm-id').value;
  const name = document.getElementById('edit-pm-name').value.trim();
  const upiId = document.getElementById('edit-pm-upi-id').value.trim();
  const qrUrl = document.getElementById('edit-pm-qr-url').value.trim();
  const maxLimit = parseFloat(document.getElementById('edit-pm-max-limit').value) || 60000.00;
  const status = document.getElementById('edit-pm-status').value;

  if (!name || !upiId) {
    alert('Please enter both Method Name and UPI ID.');
    return;
  }

  const updates = {
    name: name,
    upi_id: upiId,
    qr_code_url: qrUrl,
    max_limit: maxLimit,
    status: status
  };

  if (typeof dbUpdatePaymentMethod === 'function') {
    await dbUpdatePaymentMethod(id, updates);
  }

  closeAdminModal('edit-payment-method-modal');
  await renderAdminPaymentMethods();
  alert(`✅ Payment Card '${name}' updated successfully!`);
}

async function submitAddPaymentCard(event) {
  event.preventDefault();
  const name = document.getElementById('pm-name').value.trim();
  const upiId = document.getElementById('pm-upi-id').value.trim();
  const qrUrl = document.getElementById('pm-qr-url').value.trim();
  const maxLimit = parseFloat(document.getElementById('pm-max-limit')?.value) || 60000.00;
  const status = document.getElementById('pm-status').value;

  if (!name || !upiId) {
    alert('Please fill in both Method Name and UPI ID.');
    return;
  }

  await dbAddPaymentMethod(name, upiId, qrUrl, status, maxLimit);
  
  document.getElementById('pm-name').value = '';
  document.getElementById('pm-upi-id').value = '';
  document.getElementById('pm-qr-url').value = '';
  if (document.getElementById('pm-max-limit')) document.getElementById('pm-max-limit').value = '60000';

  await renderAdminPaymentMethods();
  alert(`✅ Payment Card '${name}' (${upiId}) saved! Max Limit: ₹${maxLimit.toLocaleString('en-IN')}, Status: ${status}`);
}

async function resetPaymentCardTotal(methodId, methodName) {
  if (confirm(`Reset collected deposit total for '${methodName}' back to ₹0? This will set status back to ON.`)) {
    await dbResetPaymentMethodTotal(methodId);
    await renderAdminPaymentMethods();
    alert(`✅ Total reset to ₹0 for ${methodName}! Status is ON.`);
  }
}

async function togglePaymentMethodStatus(methodId) {
  const methods = await dbGetPaymentMethods();
  const pm = methods.find(m => m.id === methodId);
  if (!pm) return;

  const newStatus = pm.status === 'ON' ? 'OFF' : 'ON';
  await dbUpdatePaymentMethodStatus(methodId, newStatus);
  await renderAdminPaymentMethods();
}

async function deletePaymentCard(methodId) {
  if (confirm('Are you sure you want to delete this payment card method?')) {
    await dbDeletePaymentMethod(methodId);
    await renderAdminPaymentMethods();
  }
}

// Edit User Modal
async function openEditUserModal(userId) {
  const users = await dbGetUsers();
  const user = users.find(u => u.id === userId);
  if (!user) return;

  const currentRole = (sessionStorage.getItem('admin_role') || 'admin').toLowerCase();
  const isSuperAdmin = (currentRole === 'super_admin');

  document.getElementById('edit-user-id').value = user.id;
  document.getElementById('edit-user-display').innerText = `${user.id} (+91 ${user.phone})`;

  const balInput = document.getElementById('edit-user-balance');
  const noticeEl = document.getElementById('edit-user-balance-notice');

  balInput.value = user.balance;

  if (isSuperAdmin) {
    balInput.disabled = false;
    balInput.style.opacity = '1';
    balInput.style.cursor = 'text';
    balInput.title = '';
    if (noticeEl) noticeEl.innerHTML = '';
  } else {
    balInput.disabled = true;
    balInput.style.opacity = '0.7';
    balInput.style.cursor = 'not-allowed';
    balInput.title = 'Wallet balance is view-only';
    if (noticeEl) noticeEl.innerHTML = `<span style="color: var(--color-text-muted); font-size: 11px;">(Wallet balance is managed by system)</span>`;
  }

  document.getElementById('edit-user-vip').value = user.vip;

  const modal = document.getElementById('edit-user-modal');
  if (modal) {
    modal.style.display = 'flex';
    modal.classList.add('active');
  }
}

async function saveUserEdit() {
  const userId = document.getElementById('edit-user-id').value;
  const users = await dbGetUsers();
  const user = users.find(u => u.id === userId);

  const currentRole = (sessionStorage.getItem('admin_role') || 'admin').toLowerCase();
  const isSuperAdmin = (currentRole === 'super_admin');

  const newBalanceInput = parseFloat(document.getElementById('edit-user-balance').value);
  const newVip = document.getElementById('edit-user-vip').value;

  let finalBalance = user ? user.balance : 0;

  if (isSuperAdmin && !isNaN(newBalanceInput)) {
    finalBalance = newBalanceInput;
  }

  await dbUpdateUser(userId, { balance: finalBalance, vip: newVip });

  if (typeof logAdminActivity === 'function') {
    logAdminActivity('USER_EDIT', userId, `Updated User ${userId} (VIP: ${newVip}${isSuperAdmin ? `, Balance: ₹${finalBalance.toFixed(2)}` : ''})`);
  }

  closeAdminModal('edit-user-modal');
  await renderAdminUsers();
}

// Toggle User Status
async function toggleUserStatus(userId) {
  const users = await dbGetUsers();
  const user = users.find(u => u.id === userId);
  if (user) {
    const newStatus = user.status === 'Active' ? 'Suspended' : 'Active';
    await dbUpdateUser(userId, { status: newStatus });
    if (typeof logAdminActivity === 'function') {
      logAdminActivity('USER_EDIT', userId, `Toggled User ${userId} status to ${newStatus}`);
    }
    await renderAdminUsers();
  }
}

// Delete User
async function deleteUser(userId) {
  if (confirm(`Are you sure you want to delete user ${userId}?`)) {
    await dbDeleteUser(userId);
    await renderAdminUsers();
  }
}

// Add New User Modal Handlers
function openAddUserModal() {
  const modal = document.getElementById('add-user-modal');
  if (modal) {
    modal.style.display = 'flex';
    modal.classList.add('active');
  }
}

async function submitAddUser() {
  const phone = document.getElementById('new-user-phone').value;
  const balance = parseFloat(document.getElementById('new-user-balance').value) || 100;
  const vip = document.getElementById('new-user-vip').value;

  if (!phone || phone.length < 10) {
    alert('Please enter a valid 10-digit mobile number.');
    return;
  }

  await dbAddUser(phone, balance, vip);
  closeAdminModal('add-user-modal');
  await renderAdminUsers();
}

function closeAdminModal(modalId) {
  const modal = document.getElementById(modalId);
  if (!modal) return;
  modal.classList.remove('active');
  modal.style.display = 'none';
}

let admin10xTimerInterval = null;
let lastBetSyncTime = 0;

function startAdmin10xTimer() {
  if (admin10xTimerInterval) clearInterval(admin10xTimerInterval);

  admin10xTimerInterval = setInterval(async () => {
    const sync = typeof getGlobalSynchronizedRoundInfo === 'function' ? getGlobalSynchronizedRoundInfo() : null;
    if (!sync) return;

    const timerEl = document.getElementById('admin-10x-timer');
    const timerLabelEl = document.getElementById('admin-10x-timer-label');
    const roundIdEl = document.getElementById('admin-10x-round-id');
    const statusTag = document.getElementById('admin-10x-status-tag');

    // Auto-detect round change
    if (roundIdEl && roundIdEl.innerText !== `#${sync.roundNumber}`) {
      roundIdEl.innerText = `#${sync.roundNumber}`;
      if (typeof load10xGameController === 'function') {
        await load10xGameController();
      }
    }

    // REAL-TIME AUTO SYNC BETS & TOTAL COLLECTED (Every 2 seconds)
    const nowMs = Date.now();
    if (nowMs - lastBetSyncTime >= 2000) {
      lastBetSyncTime = nowMs;
      if (typeof updateAdminLiveBetsRealtime === 'function') {
        updateAdminLiveBetsRealtime(sync.roundId);
      }
    }

    const mins = String(Math.floor(sync.secondsRemaining / 60)).padStart(2, '0');
    const secs = String(sync.secondsRemaining % 60).padStart(2, '0');
    if (timerEl) timerEl.innerText = `${mins}:${secs}`;

    if (sync.isResultPhase) {
      if (timerLabelEl) {
        timerLabelEl.innerText = 'NEXT ROUND IN';
        timerLabelEl.style.color = '#fbbf24';
      }
      if (statusTag) {
        statusTag.innerText = '🎉 Result Revealed (30s)';
        statusTag.style.background = 'rgba(245, 158, 11, 0.2)';
        statusTag.style.color = '#fbbf24';
      }
    } else {
      if (timerLabelEl) {
        timerLabelEl.innerText = 'COUNTDOWN';
        timerLabelEl.style.color = 'var(--color-text-muted)';
      }
      if (statusTag) {
        if (sync.secondsRemaining <= 20) {
          statusTag.innerText = '🔴 Betting Closed';
          statusTag.style.background = 'rgba(239, 68, 68, 0.15)';
          statusTag.style.color = '#f87171';
        } else {
          statusTag.innerText = '🟢 Betting Open';
          statusTag.style.background = 'rgba(16, 185, 129, 0.15)';
          statusTag.style.color = '#34d399';
        }
      }
    }
  }, 1000);
}

// REAL-TIME BETS & COLLECTION AUTO-SYNC FOR ADMIN PANEL (UNIFIED & IN-PLACE DOM UPDATES)
async function updateAdminLiveBetsRealtime(roundId) {
  try {
    const roundBets = await dbGetBetsForRound10x(roundId || `ROUND_${getGlobalSynchronizedRoundInfo().roundNumber}`);
    await renderAdmin10xBetsTable(roundBets);
    if (typeof renderAdminProfitAnalytics === 'function') {
      await renderAdminProfitAnalytics();
    }
  } catch(e) {
    console.warn("Real-time admin bets sync warning:", e);
  }
}

// UNIFIED 10X BETS DISTRIBUTION TABLE & PROFIT ADVISOR RENDERER
async function renderAdmin10xBetsTable(roundBets) {
  try {
    const totalBets = roundBets.reduce((sum, b) => sum + (parseFloat(b.bet_amount || b.amount) || 0), 0);

    const totalBetsEl = document.getElementById('admin-10x-total-bets');
    if (totalBetsEl && totalBetsEl.innerText !== `₹${totalBets.toFixed(2)}`) {
      totalBetsEl.innerText = `₹${totalBets.toFixed(2)}`;
    }

    const poolBadge = document.getElementById('admin-live-round-pool-badge');
    if (poolBadge && poolBadge.innerText !== `Total Round Pool: ₹${totalBets.toFixed(2)}`) {
      poolBadge.innerText = `Total Round Pool: ₹${totalBets.toFixed(2)}`;
    }

    const tbody = document.getElementById('admin-10x-bets-table-body');
    const suggestionContainer = document.getElementById('admin-profit-suggestion-container');
    if (!tbody) return;

    const animalsConfig = typeof dbGetAnimalsConfig === 'function' ? await dbGetAnimalsConfig() : [];
    const catNames = typeof dbGetCategoryNames === 'function' ? await dbGetCategoryNames() : { cat1: 'Category 1', cat2: 'Category 2' };

    const wild2xBetTotal = roundBets
      .filter(b => b.bet_type === 'category_2x' || b.betType === 'category_2x')
      .filter(b => b.category === 'wild' || (b.card_number && b.card_number <= 5))
      .reduce((sum, b) => sum + (parseFloat(b.bet_amount || b.amount) || 0), 0);

    const pet2xBetTotal = roundBets
      .filter(b => b.bet_type === 'category_2x' || b.betType === 'category_2x')
      .filter(b => b.category === 'pet' || (b.card_number && b.card_number > 5))
      .reduce((sum, b) => sum + (parseFloat(b.bet_amount || b.amount) || 0), 0);

    const wild2xBetsArr = roundBets.filter(b => (b.bet_type === 'category_2x' || b.betType === 'category_2x') && (b.category === 'wild' || (b.card_number && b.card_number <= 5)));
    const pet2xBetsArr = roundBets.filter(b => (b.bet_type === 'category_2x' || b.betType === 'category_2x') && (b.category === 'pet' || (b.card_number && b.card_number > 5)));

    let maxProfitCard = null;
    let maxProfitVal = -Infinity;
    const cardStats = [];

    for (let i = 1; i <= 10; i++) {
      const anim = animalsConfig.find(a => a.id === i) || { id: i, name: `Card #${i}`, category: i <= 5 ? 'wild' : 'pet', image_url: '' };
      
      const exactBetsArr = roundBets.filter(b => 
        b.card_number === i && (b.bet_type === 'exact_10x' || b.betType === 'exact_10x' || !b.bet_type)
      );
      const exactBetsAmt = exactBetsArr.reduce((sum, b) => sum + (parseFloat(b.bet_amount || b.amount) || 0), 0);
      const exactUsersCount = exactBetsArr.length;

      const category2xTotal = i <= 5 ? wild2xBetTotal : pet2xBetTotal;

      const exactPayout = exactBetsAmt * 10;
      const categoryPayout = category2xTotal * 2;
      const totalPayoutIfWins = exactPayout + categoryPayout;

      const houseProfit = totalBets - totalPayoutIfWins;

      const statObj = {
        id: i,
        name: anim.name,
        category: i <= 5 ? 'wild' : 'pet',
        categoryName: i <= 5 ? catNames.cat1 : catNames.cat2,
        image_url: anim.image_url,
        exactBetsAmt,
        exactUsersCount,
        category2xTotal,
        totalPayoutIfWins,
        houseProfit,
        hasRealBets: exactBetsAmt > 0 || category2xTotal > 0
      };

      cardStats.push(statObj);

      if (houseProfit > maxProfitVal) {
        maxProfitVal = houseProfit;
        maxProfitCard = statObj;
      }
    }

    // Check if initial full DOM structure is present
    const isBuilt = document.getElementById('live-card-row-1');
    if (!isBuilt) {
      // Build Full Table DOM ONCE with player profile images & 2X Category rows
      tbody.innerHTML = `
        <tr style="background: rgba(16, 185, 129, 0.1); border-bottom: 1px solid rgba(16, 185, 129, 0.3);">
          <td colspan="2" id="live-cat1-title" style="font-weight: 800; color: #34d399;">⚡ ${catNames.cat1} (2X Category Bet)</td>
          <td id="live-cat1-count" style="font-weight: 700; color: #94a3b8;">${wild2xBetsArr.length} Users</td>
          <td id="live-cat1-amt" style="font-weight: 800; color: #ffe066;">₹${wild2xBetTotal.toFixed(2)}</td>
          <td id="live-cat1-payout" style="font-weight: 700; color: #f87171;">₹${(wild2xBetTotal * 2).toFixed(2)}</td>
          <td><span style="background: rgba(16, 185, 129, 0.2); color: #34d399; padding: 2px 6px; border-radius: 4px; font-size: 10px; font-weight: 800;">2X MULTIPLIER</span></td>
        </tr>
        <tr style="background: rgba(56, 189, 248, 0.1); border-bottom: 2px solid rgba(56, 189, 248, 0.3);">
          <td colspan="2" id="live-cat2-title" style="font-weight: 800; color: #38bdf8;">⚡ ${catNames.cat2} (2X Category Bet)</td>
          <td id="live-cat2-count" style="font-weight: 700; color: #94a3b8;">${pet2xBetsArr.length} Users</td>
          <td id="live-cat2-amt" style="font-weight: 800; color: #ffe066;">₹${pet2xBetTotal.toFixed(2)}</td>
          <td id="live-cat2-payout" style="font-weight: 700; color: #f87171;">₹${(pet2xBetTotal * 2).toFixed(2)}</td>
          <td><span style="background: rgba(56, 189, 248, 0.2); color: #38bdf8; padding: 2px 6px; border-radius: 4px; font-size: 10px; font-weight: 800;">2X MULTIPLIER</span></td>
        </tr>
        ${cardStats.map(c => {
          const isProfit = c.houseProfit >= 0;
          const catBadgeColor = c.category === 'wild' ? '#34d399' : '#fbbf24';
          const rowStyle = c.exactBetsAmt > 0 
            ? 'background: rgba(16, 185, 129, 0.12); border-left: 4px solid #10b981;' 
            : '';

          return `
            <tr id="live-card-row-${c.id}" style="${rowStyle}">
              <td style="font-weight: 900; color: white;">
                <div style="display: flex; align-items: center; gap: 8px;">
                  <img id="live-card-${c.id}-img" src="${c.image_url}" style="width: 32px; height: 32px; border-radius: 6px; object-fit: cover;" onerror="this.src='https://via.placeholder.com/32'">
                  <span>Card #${c.id}</span>
                </div>
              </td>
              <td id="live-card-${c.id}-name" style="font-weight: 800; color: white;">
                ${c.name} 
                <span style="font-size: 10px; font-weight: 800; padding: 2px 6px; border-radius: 4px; background: rgba(255,255,255,0.08); color: ${catBadgeColor}; margin-left: 6px;">
                  ${c.categoryName}
                </span>
              </td>
              <td id="live-card-${c.id}-count">
                ${c.exactBetsAmt > 0 
                  ? `<span style="background: #10b981; color: white; font-weight: 900; font-size: 11px; padding: 3px 8px; border-radius: 12px; display: inline-flex; align-items: center; gap: 4px;"><i class="fa-solid fa-fire"></i> ${c.exactUsersCount} Users (REAL BET)</span>`
                  : `<span style="color: #64748b;">0 Users</span>`
                }
              </td>
              <td id="live-card-${c.id}-amt" style="font-weight: 800; color: ${c.exactBetsAmt > 0 ? '#ffe066' : '#94a3b8'};">
                ₹${c.exactBetsAmt.toFixed(2)}
              </td>
              <td id="live-card-${c.id}-payout" style="font-weight: 800; color: ${c.totalPayoutIfWins > 0 ? '#f87171' : '#94a3b8'};">
                ₹${c.totalPayoutIfWins.toFixed(2)}
                ${c.category2xTotal > 0 ? `<div style="font-size: 10px; color: #cbd5e1;">(Includes 2X: ₹${(c.category2xTotal * 2).toFixed(2)})</div>` : ''}
              </td>
              <td id="live-card-${c.id}-profit" style="font-weight: 900; font-size: 13px; color: ${isProfit ? '#34d399' : '#ef4444'};">
                ${isProfit ? '+' : ''}₹${c.houseProfit.toFixed(2)}
              </td>
            </tr>
          `;
        }).join('')}
      `;
    } else {
      // IN-PLACE updates (0 DOM destructions, 0 flickering, 0 jumping)
      const cat1Title = document.getElementById('live-cat1-title');
      const cat1Count = document.getElementById('live-cat1-count');
      const cat1Amt = document.getElementById('live-cat1-amt');
      const cat1Payout = document.getElementById('live-cat1-payout');

      if (cat1Title && cat1Title.innerText !== `⚡ ${catNames.cat1} (2X Category Bet)`) cat1Title.innerText = `⚡ ${catNames.cat1} (2X Category Bet)`;
      if (cat1Count && cat1Count.innerText !== `${wild2xBetsArr.length} Users`) cat1Count.innerText = `${wild2xBetsArr.length} Users`;
      if (cat1Amt && cat1Amt.innerText !== `₹${wild2xBetTotal.toFixed(2)}`) cat1Amt.innerText = `₹${wild2xBetTotal.toFixed(2)}`;
      if (cat1Payout && cat1Payout.innerText !== `₹${(wild2xBetTotal * 2).toFixed(2)}`) cat1Payout.innerText = `₹${(wild2xBetTotal * 2).toFixed(2)}`;

      const cat2Title = document.getElementById('live-cat2-title');
      const cat2Count = document.getElementById('live-cat2-count');
      const cat2Amt = document.getElementById('live-cat2-amt');
      const cat2Payout = document.getElementById('live-cat2-payout');

      if (cat2Title && cat2Title.innerText !== `⚡ ${catNames.cat2} (2X Category Bet)`) cat2Title.innerText = `⚡ ${catNames.cat2} (2X Category Bet)`;
      if (cat2Count && cat2Count.innerText !== `${pet2xBetsArr.length} Users`) cat2Count.innerText = `${pet2xBetsArr.length} Users`;
      if (cat2Amt && cat2Amt.innerText !== `₹${pet2xBetTotal.toFixed(2)}`) cat2Amt.innerText = `₹${pet2xBetTotal.toFixed(2)}`;
      if (cat2Payout && cat2Payout.innerText !== `₹${(pet2xBetTotal * 2).toFixed(2)}`) cat2Payout.innerText = `₹${(pet2xBetTotal * 2).toFixed(2)}`;

      cardStats.forEach(c => {
        const rowEl = document.getElementById(`live-card-row-${c.id}`);
        const imgEl = document.getElementById(`live-card-${c.id}-img`);
        const nameEl = document.getElementById(`live-card-${c.id}-name`);
        const countEl = document.getElementById(`live-card-${c.id}-count`);
        const amtEl = document.getElementById(`live-card-${c.id}-amt`);
        const payoutEl = document.getElementById(`live-card-${c.id}-payout`);
        const profitEl = document.getElementById(`live-card-${c.id}-profit`);

        const isProfit = c.houseProfit >= 0;
        const catBadgeColor = c.category === 'wild' ? '#34d399' : '#fbbf24';

        if (imgEl && c.image_url && imgEl.src !== c.image_url) imgEl.src = c.image_url;

        const expectedNameHtml = `${c.name} <span style="font-size: 10px; font-weight: 800; padding: 2px 6px; border-radius: 4px; background: rgba(255,255,255,0.08); color: ${catBadgeColor}; margin-left: 6px;">${c.categoryName}</span>`;
        if (nameEl && nameEl.innerHTML !== expectedNameHtml) nameEl.innerHTML = expectedNameHtml;

        const expectedCountHtml = c.exactBetsAmt > 0 
          ? `<span style="background: #10b981; color: white; font-weight: 900; font-size: 11px; padding: 3px 8px; border-radius: 12px; display: inline-flex; align-items: center; gap: 4px;"><i class="fa-solid fa-fire"></i> ${c.exactUsersCount} Users (REAL BET)</span>`
          : `<span style="color: #64748b;">0 Users</span>`;
        if (countEl && countEl.innerHTML !== expectedCountHtml) countEl.innerHTML = expectedCountHtml;

        const expectedAmtText = `₹${c.exactBetsAmt.toFixed(2)}`;
        if (amtEl && amtEl.innerText !== expectedAmtText) {
          amtEl.innerText = expectedAmtText;
          amtEl.style.color = c.exactBetsAmt > 0 ? '#ffe066' : '#94a3b8';
        }

        const expectedPayoutHtml = `₹${c.totalPayoutIfWins.toFixed(2)}${c.category2xTotal > 0 ? `<div style="font-size: 10px; color: #cbd5e1;">(Includes 2X: ₹${(c.category2xTotal * 2).toFixed(2)})</div>` : ''}`;
        if (payoutEl && payoutEl.innerHTML !== expectedPayoutHtml) {
          payoutEl.innerHTML = expectedPayoutHtml;
          payoutEl.style.color = c.totalPayoutIfWins > 0 ? '#f87171' : '#94a3b8';
        }

        const expectedProfitText = `${isProfit ? '+' : ''}₹${c.houseProfit.toFixed(2)}`;
        if (profitEl && profitEl.innerText !== expectedProfitText) {
          profitEl.innerText = expectedProfitText;
          profitEl.style.color = isProfit ? '#34d399' : '#ef4444';
        }
      });
    }

    // Render Admin Profit Advisor Suggestion Box
    if (suggestionContainer && maxProfitCard) {
      const isRecommendProfit = maxProfitCard.houseProfit >= 0;
      suggestionContainer.innerHTML = `
        <div style="background: linear-gradient(135deg, rgba(15, 23, 42, 0.95) 0%, rgba(30, 41, 59, 0.95) 100%); padding: 18px 22px; border-radius: 14px; border: 2px solid ${isRecommendProfit ? '#34d399' : '#fbbf24'}; box-shadow: 0 6px 24px rgba(0,0,0,0.4);">
          <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 16px;">
            <div style="flex: 1; min-width: 280px;">
              <div style="font-size: 11px; font-weight: 900; color: #f5a623; letter-spacing: 1px; text-transform: uppercase; display: flex; align-items: center; gap: 6px;">
                <i class="fa-solid fa-wand-magic-sparkles" style="color: #34d399;"></i> ADMIN MAXIMUM PROFIT ADVISOR
              </div>
              <div style="font-size: 19px; font-weight: 900; color: white; margin-top: 6px; display: flex; align-items: center; gap: 10px;">
                Recommended Winner: 
                <span style="color: #34d399; background: rgba(52, 211, 153, 0.15); padding: 2px 10px; border-radius: 8px; border: 1px solid rgba(52, 211, 153, 0.3);">
                  Card #${maxProfitCard.id} ${maxProfitCard.name}
                </span>
              </div>
              <div style="font-size: 12px; color: #cbd5e1; margin-top: 8px; display: flex; gap: 16px; flex-wrap: wrap;">
                <span>Total Pool Collected: <strong style="color: #ffe066;">₹${totalBets.toFixed(2)}</strong></span>
                <span>Payout if Wins: <strong style="color: #f87171;">₹${maxProfitCard.totalPayoutIfWins.toFixed(2)}</strong></span>
                <span>Expected House Profit: <strong style="color: ${isRecommendProfit ? '#34d399' : '#ef4444'}; font-size: 14px;">${isRecommendProfit ? '+' : ''}₹${maxProfitCard.houseProfit.toFixed(2)}</strong></span>
              </div>
            </div>

            <button onclick="setWinnerFromAdvisor(${maxProfitCard.id})" style="height: 38px; width: auto !important; max-width: max-content; padding: 0 18px; font-size: 12px; font-weight: 900; display: inline-flex; align-items: center; justify-content: center; gap: 8px; background: linear-gradient(135deg, #10b981 0%, #059669 100%); border: none; border-radius: 8px; cursor: pointer; box-shadow: 0 4px 12px rgba(16, 185, 129, 0.4); color: white; white-space: nowrap; margin: 0; flex: 0 0 auto !important;">
              <i class="fa-solid fa-crown" style="color: #fef08a;"></i> 1-Click Set Card #${maxProfitCard.id} as Winner
            </button>
          </div>
        </div>
      `;
    // Dynamic Manual Winner Dropdown with live profit values & highest profit star
    updateAdminManualSelectDropdown(cardStats, maxProfitCard);
    }
  } catch(e) {
    console.warn("Render admin bets table error:", e);
  }
}

window.lastCardStatsCache = [];
window.lastMaxProfitCardCache = null;

function toggleCustomCardSelectDropdown(event) {
  if (event) event.stopPropagation();
  const menu = document.getElementById('custom-card-select-menu');
  if (!menu) return;
  const isHidden = menu.style.display === 'none' || !menu.style.display;
  menu.style.display = isHidden ? 'block' : 'none';
}

async function selectCustomCardOption(cardId) {
  const cardSelectEl = document.getElementById('admin-10x-card-select');
  if (cardSelectEl) {
    cardSelectEl.value = String(cardId);
  }
  const menu = document.getElementById('custom-card-select-menu');
  if (menu) menu.style.display = 'none';

  updateCustomCardSelectTrigger();

  try {
    const round = await dbGetCurrentRound10x();
    if (round && round.id) {
      await dbSetAdminPresetCard10x(round.id, cardId);
      if (typeof logAdminActivity === 'function') {
        logAdminActivity('OUTCOME_OVERRIDE', '10xWheel', cardId > 0 ? `Set 10X Preset Card to #${cardId} FORCED WIN` : `Set 10X Outcome to AUTO SMART PROFIT`);
      }

      const modeStatusEl = document.getElementById('admin-10x-mode-status');
      const presetStatusEl = document.getElementById('admin-10x-preset-status');

      if (cardId > 0) {
        const cardStats = window.lastCardStatsCache || [];
        const cardObj = cardStats.find(c => c.id === cardId) || (typeof CARDS_13_DATA !== 'undefined' ? CARDS_13_DATA.find(c => c.id === cardId) : null);
        const cardName = cardObj ? (cardObj.name || cardObj.label || '') : '';
        
        if (modeStatusEl) {
          modeStatusEl.innerText = '🖐️ Manual Override Mode';
          modeStatusEl.style.color = '#38bdf8';
        }
        if (presetStatusEl) {
          presetStatusEl.innerText = `Card ${cardId} ${cardName ? '(' + cardName + ')' : ''} FORCED WIN`;
          presetStatusEl.style.color = '#ffe066';
        }
      } else {
        if (modeStatusEl) {
          modeStatusEl.innerText = '🤖 Auto Smart Profit';
          modeStatusEl.style.color = '#34d399';
        }
        if (presetStatusEl) {
          presetStatusEl.innerText = 'Auto (Guaranteed Profit)';
          presetStatusEl.style.color = '#38bdf8';
        }
      }
    }
  } catch (e) {
    console.warn("Auto-save custom card selection error:", e);
  }
}

function updateCustomCardSelectTrigger() {
  const cardSelectEl = document.getElementById('admin-10x-card-select');
  const selectedContainer = document.getElementById('custom-card-select-selected');
  if (!cardSelectEl || !selectedContainer) return;

  const val = parseInt(cardSelectEl.value) || 0;
  if (val === 0) {
    selectedContainer.innerHTML = `
      <span style="font-size: 18px; flex: 0 0 auto;">🤖</span>
      <div>
        <div style="font-size: 13px; font-weight: 700; color: #34d399;">AUTO MODE (Smart House Profit)</div>
        <div style="font-size: 10px; color: #94a3b8;">Admin Guaranteed Win</div>
      </div>
    `;
    return;
  }

  const cardStats = window.lastCardStatsCache || [];
  const cardObj = cardStats.find(c => c.id === val);

  if (cardObj) {
    const isProfit = cardObj.houseProfit >= 0;
    const profitSign = isProfit ? '+' : '';
    const catBadgeColor = cardObj.category === 'wild' ? '#34d399' : '#fbbf24';

    selectedContainer.innerHTML = `
      <img src="${cardObj.image_url}" style="width: 32px; height: 32px; border-radius: 6px; object-fit: cover; border: 1px solid rgba(255,255,255,0.2); flex: 0 0 auto;" onerror="this.src='https://via.placeholder.com/32'">
      <div style="flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
        <div style="font-size: 13px; font-weight: 800; color: white; display: flex; align-items: center; gap: 6px;">
          <span>Card #${cardObj.id} ${cardObj.name}</span>
          <span style="font-size: 10px; font-weight: 700; color: ${catBadgeColor};">(${cardObj.categoryName})</span>
        </div>
        <div style="font-size: 10px; color: #cbd5e1;">
          Expected Profit: <strong style="color: ${isProfit ? '#34d399' : '#ef4444'};">${profitSign}₹${cardObj.houseProfit.toFixed(2)}</strong>
        </div>
      </div>
    `;
  } else {
    selectedContainer.innerHTML = `<span style="font-size: 13px; color: white; font-weight: 700;">Card #${val} Selected</span>`;
  }
}

function renderCustomCardSelectMenu(cardStats, maxProfitCard) {
  const menu = document.getElementById('custom-card-select-menu');
  if (!menu) return;

  const currentVal = parseInt(document.getElementById('admin-10x-card-select')?.value) || 0;

  let html = `
    <div onclick="selectCustomCardOption(0)" style="padding: 10px 12px; border-radius: 8px; cursor: pointer; display: flex; align-items: center; gap: 10px; margin-bottom: 4px; background: ${currentVal === 0 ? 'rgba(52, 211, 153, 0.2)' : 'transparent'}; border: 1px solid ${currentVal === 0 ? '#34d399' : 'transparent'}; transition: all 0.2s;" onmouseover="if('${currentVal}' !== '0') this.style.background='rgba(255,255,255,0.05)'" onmouseout="if('${currentVal}' !== '0') this.style.background='transparent'">
      <div style="width: 34px; height: 34px; border-radius: 8px; background: rgba(52, 211, 153, 0.15); display: flex; align-items: center; justify-content: center; font-size: 18px; flex: 0 0 auto;">🤖</div>
      <div style="flex: 1;">
        <div style="font-size: 13px; font-weight: 800; color: #34d399;">AUTO MODE (Smart House Profit)</div>
        <div style="font-size: 10px; color: #94a3b8;">Admin Guaranteed Win - Automatic Max Profit Selection</div>
      </div>
    </div>
  `;

  cardStats.forEach(c => {
    const isSelected = currentVal === c.id;
    const isMax = maxProfitCard && maxProfitCard.id === c.id;
    const profitSign = c.houseProfit >= 0 ? '+' : '';
    const profitStr = `${profitSign}₹${c.houseProfit.toFixed(2)}`;
    const catBadgeColor = c.category === 'wild' ? '#34d399' : '#fbbf24';
    const isProfit = c.houseProfit >= 0;

    const bgStyle = isSelected 
      ? 'background: rgba(56, 189, 248, 0.2); border: 1px solid #38bdf8;' 
      : (isMax ? 'background: rgba(245, 166, 35, 0.1); border: 1px dashed rgba(245, 166, 35, 0.4);' : 'background: transparent; border: 1px solid transparent;');

    html += `
      <div onclick="selectCustomCardOption(${c.id})" style="padding: 8px 12px; border-radius: 8px; cursor: pointer; display: flex; align-items: center; gap: 12px; margin-bottom: 3px; ${bgStyle} transition: all 0.2s;" onmouseover="if('${isSelected}' !== 'true') this.style.background='rgba(255,255,255,0.06)'" onmouseout="if('${isSelected}' !== 'true') this.style.background='${isMax ? 'rgba(245, 166, 35, 0.1)' : 'transparent'}'">
        <img src="${c.image_url}" style="width: 36px; height: 36px; border-radius: 8px; object-fit: cover; border: 1.5px solid ${isMax ? '#f5a623' : 'rgba(255,255,255,0.2)'}; flex: 0 0 auto;" onerror="this.src='https://via.placeholder.com/36'">
        <div style="flex: 1; min-width: 0;">
          <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px;">
            <div style="font-size: 13px; font-weight: 800; color: white; display: flex; align-items: center; gap: 6px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
              <span>Card #${c.id} ${c.name}</span>
              <span style="font-size: 10px; font-weight: 700; padding: 1px 5px; border-radius: 4px; background: rgba(255,255,255,0.08); color: ${catBadgeColor};">${c.categoryName}</span>
            </div>
            ${isMax ? '<span style="font-size: 10px; font-weight: 900; background: linear-gradient(135deg, #f5a623, #d97706); color: black; padding: 2px 6px; border-radius: 4px; white-space: nowrap;">⭐ MAX PROFIT</span>' : ''}
          </div>
          <div style="font-size: 11px; color: #cbd5e1; margin-top: 2px; display: flex; align-items: center; gap: 12px;">
            <span>Expected Profit: <strong style="color: ${isProfit ? '#34d399' : '#ef4444'}; font-weight: 800;">${profitStr}</strong></span>
            ${c.exactBetsAmt > 0 ? `<span style="background: #10b981; color: white; font-weight: 900; font-size: 9px; padding: 1px 6px; border-radius: 10px;">🔥 ${c.exactUsersCount} bets (₹${c.exactBetsAmt.toFixed(0)})</span>` : '<span style="color: #64748b; font-size: 10px;">0 bets</span>'}
          </div>
        </div>
      </div>
    `;
  });

  menu.innerHTML = html;
}

// Close custom dropdown on outside click
document.addEventListener('click', function(e) {
  const container = document.getElementById('custom-card-select-trigger')?.parentElement;
  const menu = document.getElementById('custom-card-select-menu');
  if (menu && container && !container.contains(e.target)) {
    menu.style.display = 'none';
  }
});

// UPDATE MANUAL WINNER DROPDOWN WITH LIVE CARD NAMES, CATEGORIES & HOUSE PROFIT
function updateAdminManualSelectDropdown(cardStats, maxProfitCard) {
  try {
    window.lastCardStatsCache = cardStats;
    window.lastMaxProfitCardCache = maxProfitCard;

    const cardSelectEl = document.getElementById('admin-10x-card-select');
    if (cardSelectEl && cardSelectEl.options) {
      cardStats.forEach(c => {
        const opt = cardSelectEl.options[c.id]; // option 1..10
        if (opt) {
          const isMax = maxProfitCard && maxProfitCard.id === c.id;
          const profitSign = c.houseProfit >= 0 ? '+' : '';
          const profitStr = `${profitSign}₹${c.houseProfit.toFixed(2)}`;
          const starTag = isMax ? ' ⭐ [MAX PROFIT]' : '';
          const betTag = c.exactBetsAmt > 0 ? ` (${c.exactUsersCount} bets)` : '';
          
          const newText = `Card #${c.id} ${c.name} (${c.categoryName}) — Profit: ${profitStr}${betTag}${starTag}`;
          if (opt.text !== newText) {
            opt.text = newText;
          }
        }
      });
    }

    renderCustomCardSelectMenu(cardStats, maxProfitCard);
    updateCustomCardSelectTrigger();
  } catch(e) {
    console.warn("Update manual select dropdown warning:", e);
  }
}

// --- 13 CARD 10X GAME ADMIN CONTROLLER ---
async function load10xGameController() {
  startAdmin10xTimer();
  const sync = typeof getGlobalSynchronizedRoundInfo === 'function' ? getGlobalSynchronizedRoundInfo() : null;
  const roundIdEl = document.getElementById('admin-10x-round-id');
  if (roundIdEl && sync) roundIdEl.innerText = `#${sync.roundNumber}`;

  const round = await dbGetCurrentRound10x();
  const roundBets = await dbGetBetsForRound10x(round.id);

  if (roundIdEl) roundIdEl.innerText = `#${round.round_number || (sync ? sync.roundNumber : 60000)}`;

  const presetCard = round.preset_winning_card || 0;
  const modeStatusEl = document.getElementById('admin-10x-mode-status');
  const presetStatusEl = document.getElementById('admin-10x-preset-status');
  const cardSelectEl = document.getElementById('admin-10x-card-select');

  if (cardSelectEl) cardSelectEl.value = String(presetCard);
  updateCustomCardSelectTrigger();

  if (presetCard > 0) {
    const cardObj = typeof CARDS_13_DATA !== 'undefined' ? CARDS_13_DATA.find(c => c.id === presetCard) : null;
    if (modeStatusEl) {
      modeStatusEl.innerText = '🖐️ Manual Override Mode';
      modeStatusEl.style.color = '#38bdf8';
    }
    if (presetStatusEl) {
      presetStatusEl.innerText = `Card ${presetCard} ${cardObj ? '(' + cardObj.label + ')' : ''} FORCED WIN`;
      presetStatusEl.style.color = '#ffe066';
    }
  } else {
    if (modeStatusEl) {
      modeStatusEl.innerText = '🤖 Auto Smart Profit';
      modeStatusEl.style.color = '#34d399';
    }
    if (presetStatusEl) {
      presetStatusEl.innerText = 'Auto (Guaranteed Profit)';
      presetStatusEl.style.color = '#38bdf8';
    }
  }

  // Load timer settings form & animal cards config form
  await loadAdminTimerSettingsForm();
  await loadAdminAnimalsConfigForm();

  // Render unified bet distribution table
  await renderAdmin10xBetsTable(roundBets);

  // Also render global all-user bets history monitor
  await renderAdminAllBetsHistory();
}

const ALL_GAMES_LIST_DATA = [
  { key: '10x', name: '10 Card 10X Game', icon: '🐉', category: 'Multiplier Card Game' },
  { key: 'coinflip', name: 'Flip Coin 2X Game', icon: '🪙', category: 'Heads & Tails 3D' },
  { key: 'dragontiger', name: 'Dragon vs Tiger', icon: '🐯', category: '3-Card Poker Game' },
  { key: 'wingo', name: 'Wingo Color Prediction', icon: '🔮', category: '3Min Color Game' },
  { key: 'aviator', name: 'Aviator Pro Crash', icon: '🚀', category: 'Crash Multiplier' },
  { key: 'slots', name: '777 Empire Slots', icon: '🎰', category: 'Fortune Slots' }
];

async function renderAdminGamesControlList() {
  const container = document.getElementById('admin-games-control-list');
  if (!container) return;

  const gamesStatus = typeof dbGetGamesStatus === 'function' ? await dbGetGamesStatus() : {};

  container.innerHTML = ALL_GAMES_LIST_DATA.map(game => {
    const isON = (gamesStatus[game.key] !== 'OFF');
    const statusBadge = isON 
      ? `<span style="font-size: 11px; font-weight: 800; color: #10b981; background: rgba(16, 185, 129, 0.15); padding: 4px 10px; border-radius: 12px; border: 1px solid rgba(16, 185, 129, 0.3); display: inline-flex; align-items: center; gap: 4px;"><span style="width: 7px; height: 7px; border-radius: 50%; background: #10b981; display: inline-block;"></span> ONLINE (ACTIVE)</span>`
      : `<span style="font-size: 11px; font-weight: 800; color: #ef4444; background: rgba(239, 68, 68, 0.15); padding: 4px 10px; border-radius: 12px; border: 1px solid rgba(239, 68, 68, 0.3); display: inline-flex; align-items: center; gap: 4px;"><span style="width: 7px; height: 7px; border-radius: 50%; background: #ef4444; display: inline-block;"></span> OFFLINE (DISABLED)</span>`;

    const toggleBtn = isON
      ? `<button onclick="toggleAdminGameStatus('${game.key}')" class="btn-secondary-outline" style="height: 38px; border-color: rgba(239, 68, 68, 0.5); color: #f87171; font-weight: 700; font-size: 12px; width: 100%; display: flex; align-items: center; justify-content: center; gap: 6px;"><i class="fa-solid fa-pause"></i> TURN OFF (DISABLE)</button>`
      : `<button onclick="toggleAdminGameStatus('${game.key}')" class="btn-primary-gold" style="height: 38px; background: linear-gradient(135deg, #10b981, #059669); border: none; font-weight: 800; font-size: 12px; width: 100%; display: flex; align-items: center; justify-content: center; gap: 6px;"><i class="fa-solid fa-play"></i> TURN ON (ENABLE)</button>`;

    return `
      <div style="background: rgba(15, 23, 42, 0.8); border: 1px solid ${isON ? 'rgba(52, 211, 153, 0.3)' : 'rgba(239, 68, 68, 0.4)'}; border-radius: 14px; padding: 14px; display: flex; flex-direction: column; justify-content: space-between; gap: 12px; box-shadow: 0 4px 14px rgba(0,0,0,0.4);">
        <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px;">
          <div style="display: flex; align-items: center; gap: 10px;">
            <div style="font-size: 28px; background: rgba(255,255,255,0.05); width: 44px; height: 44px; border-radius: 10px; display: flex; align-items: center; justify-content: center;">${game.icon}</div>
            <div>
              <div style="font-size: 14px; font-weight: 800; color: #ffffff;">${game.name}</div>
              <div style="font-size: 11px; color: var(--color-text-muted);">${game.category}</div>
            </div>
          </div>
        </div>
        <div style="display: flex; align-items: center; justify-content: space-between; border-top: 1px dashed rgba(255,255,255,0.1); padding-top: 10px; margin-top: 2px;">
          <span style="font-size: 11px; color: #94a3b8; font-weight: 700;">Status:</span>
          ${statusBadge}
        </div>
        <div>
          ${toggleBtn}
        </div>
      </div>
    `;
  }).join('');
}

async function toggleAdminGameStatus(gameKey) {
  const currentStatusMap = typeof dbGetGamesStatus === 'function' ? await dbGetGamesStatus() : {};
  const currentStatus = currentStatusMap[gameKey] || 'ON';
  const newStatus = (currentStatus === 'ON') ? 'OFF' : 'ON';

  await dbUpdateGameStatus(gameKey, newStatus);
  await renderAdminGamesControlList();

  const gameObj = ALL_GAMES_LIST_DATA.find(g => g.key === gameKey);
  const name = gameObj ? gameObj.name : gameKey;
  alert(`📢 Game Status Updated!\n\n${name} is now turned ${newStatus}!\nAll connected user devices will instantly update.`);
}

window.renderAdminGamesControlList = renderAdminGamesControlList;

async function loadAdminTimerSettingsForm(force = false) {
  const bettingInput = document.getElementById('setting-betting-timer-sec');
  const resultInput = document.getElementById('setting-result-timer-sec');

  // Prevent overwriting form input while admin is actively typing
  const dtInput = document.getElementById('setting-dt-betting-timer-sec');

  if (!force && (document.activeElement === bettingInput || document.activeElement === resultInput || document.activeElement === dtInput)) {
    return;
  }

  const settings = typeof dbGetTimerSettings === 'function' ? await dbGetTimerSettings() : { betting_duration_sec: 240, result_duration_sec: 30, dragontiger_betting_duration_sec: 15 };

  if (bettingInput && (force || document.activeElement !== bettingInput)) {
    bettingInput.value = settings.betting_duration_sec || 240;
  }
  if (dtInput && (force || document.activeElement !== dtInput)) {
    dtInput.value = settings.dragontiger_betting_duration_sec || 15;
  }
  if (resultInput && (force || document.activeElement !== resultInput)) {
    resultInput.value = settings.result_duration_sec || 30;
  }
}

async function saveAdminTimerSettings(event) {
  event.preventDefault();
  const bettingSec = parseInt(document.getElementById('setting-betting-timer-sec').value) || 240;
  const dtSec = parseInt(document.getElementById('setting-dt-betting-timer-sec').value) || 15;
  const resultSec = parseInt(document.getElementById('setting-result-timer-sec').value) || 30;

  if (bettingSec < 10) {
    alert("⚠️ 10X Betting round timer must be at least 10 seconds!");
    return;
  }
  if (dtSec < 5) {
    alert("⚠️ Dragon vs Tiger timer must be at least 5 seconds!");
    return;
  }
  if (resultSec < 5) {
    alert("⚠️ Result reveal phase timer must be at least 5 seconds!");
    return;
  }

  const currentConfig = (typeof getTimerSettingsSync === 'function') ? getTimerSettingsSync() : {};
  await dbUpdateTimerSettings({
    ...currentConfig,
    betting_duration_sec: bettingSec,
    dragontiger_betting_duration_sec: dtSec,
    result_duration_sec: resultSec
  });

  if (document.activeElement && typeof document.activeElement.blur === 'function') {
    document.activeElement.blur();
  }

  await loadAdminTimerSettingsForm(true);

  alert(`✅ Permanent Timer Settings Saved!\n\n• 10X Game Round: ${bettingSec}s\n• Dragon vs Tiger Round: ${dtSec}s\n• Result Reveal: ${resultSec}s\n\nThis timer is now PERMANENTLY active for all current & future rounds!`);
}

async function loadAdminCommissionSettingsForm(force = false) {
  const l1Input = document.getElementById('setting-comm-level1-pct');
  const l2Input = document.getElementById('setting-comm-level2-pct');
  const l3Input = document.getElementById('setting-comm-level3-pct');
  const minClaimInput = document.getElementById('setting-comm-min-claim');

  if (!force && (document.activeElement === l1Input || document.activeElement === l2Input || document.activeElement === l3Input || document.activeElement === minClaimInput)) {
    return;
  }

  const settings = typeof dbGetCommissionSettings === 'function' ? await dbGetCommissionSettings() : { level1_pct: 1.5, level2_pct: 0.5, level3_pct: 0.2, min_claim_amount: 1000.00 };

  if (l1Input) l1Input.value = settings.level1_pct ?? 1.5;
  if (l2Input) l2Input.value = settings.level2_pct ?? 0.5;
  if (l3Input) l3Input.value = settings.level3_pct ?? 0.2;
  if (minClaimInput) minClaimInput.value = settings.min_claim_amount ?? 1000.00;
}

async function saveAdminCommissionSettings(event) {
  event.preventDefault();
  const l1Pct = parseFloat(document.getElementById('setting-comm-level1-pct').value) || 0;
  const l2Pct = parseFloat(document.getElementById('setting-comm-level2-pct').value) || 0;
  const l3Pct = parseFloat(document.getElementById('setting-comm-level3-pct').value) || 0;
  const minClaim = parseFloat(document.getElementById('setting-comm-min-claim').value) || 0;

  await dbUpdateCommissionSettings({
    level1_pct: l1Pct,
    level2_pct: l2Pct,
    level3_pct: l3Pct,
    min_claim_amount: minClaim
  });

  if (document.activeElement && typeof document.activeElement.blur === 'function') {
    document.activeElement.blur();
  }

  await loadAdminCommissionSettingsForm(true);
  alert(`✅ 3-Tier Referral Commission & Claim Settings Saved!\n\n• Level 1 (Direct Friends): ${l1Pct}%\n• Level 2 (2nd Generation): ${l2Pct}%\n• Level 3 (3rd Generation): ${l3Pct}%\n• Minimum Claim Limit: ₹${minClaim.toFixed(2)}\n\nNew rates and claim limits are now active!`);
}

async function setWinnerFromAdvisor(cardId) {
  const selectEl = document.getElementById('admin-10x-card-select');
  if (selectEl) {
    selectEl.value = cardId;
  }
  const round = await dbGetCurrentRound10x();
  await dbSetAdminPresetCard10x(round.id, cardId);
  alert(`🏆 Admin Profit Advisor Applied!\nCard #${cardId} has been locked in as the WINNER for Round #${round.round_number}!`);
  await load10xGameController();
}

async function saveAdmin10xPresetCard(event) {
  event.preventDefault();
  const selectEl = document.getElementById('admin-10x-card-select');
  const selectedCard = parseInt(selectEl.value) || 0;

  const round = await dbGetCurrentRound10x();
  await dbSetAdminPresetCard10x(round.id, selectedCard);

  if (selectedCard > 0) {
    alert(`👑 Preset Winner Saved!\nCard ${selectedCard} will WIN Round #${round.round_number}!`);
  } else {
    alert(`🤖 Auto Smart Profit Mode Activated!\nSystem will automatically calculate the best card for 100% Admin Profit.`);
  }

  await load10xGameController();
}

function handleAnimalImageUpload(id, inputElement) {
  const file = inputElement.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function(e) {
    const img = new Image();
    img.onload = function() {
      const canvas = document.createElement('canvas');
      const MAX_SIZE = 400;
      let width = img.width;
      let height = img.height;

      if (width > height) {
        if (width > MAX_SIZE) {
          height *= MAX_SIZE / width;
          width = MAX_SIZE;
        }
      } else {
        if (height > MAX_SIZE) {
          width *= MAX_SIZE / height;
          height = MAX_SIZE;
        }
      }

      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);

      const base64Data = canvas.toDataURL('image/jpeg', 0.85);

      const hiddenInput = document.getElementById(`animal-img-${id}`);
      const previewImg = document.getElementById(`animal-preview-${id}`);

      if (hiddenInput) hiddenInput.value = base64Data;
      if (previewImg) previewImg.src = base64Data;
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

async function loadAdminAnimalsConfigForm(force = false) {
  const cat1Input = document.getElementById('admin-cat1-name-input');
  const cat2Input = document.getElementById('admin-cat2-name-input');

  // Prevent overwriting form input values while admin is actively typing
  const activeEl = document.activeElement;
  const isTyping = activeEl && (
    activeEl === cat1Input ||
    activeEl === cat2Input ||
    (activeEl.id && activeEl.id.startsWith('animal-'))
  );

  if (!force && isTyping) {
    return;
  }

  const catNames = await dbGetCategoryNames();
  if (cat1Input && activeEl !== cat1Input) cat1Input.value = catNames.cat1;
  if (cat2Input && activeEl !== cat2Input) cat2Input.value = catNames.cat2;

  const sec1Title = document.getElementById('admin-sec1-title');
  const sec2Title = document.getElementById('admin-sec2-title');
  if (sec1Title) sec1Title.innerHTML = `<i class="fa-solid fa-layer-group"></i> SECTION 1: ${catNames.cat1.toUpperCase()} (#1..#5)`;
  if (sec2Title) sec2Title.innerHTML = `<i class="fa-solid fa-layer-group"></i> SECTION 2: ${catNames.cat2.toUpperCase()} (#6..#10)`;

  const animals = await dbGetAnimalsConfig();
  const wildContainer = document.getElementById('admin-wild-animals-inputs');
  const petContainer = document.getElementById('admin-pet-animals-inputs');

  if (!wildContainer || !petContainer) return;

  const wildList = animals.filter(a => a.category === 'wild' || a.id <= 5);
  const petList = animals.filter(a => a.category === 'pet' || a.id > 5);

  let wildHtml = '';
  wildList.forEach(a => {
    wildHtml += `
      <div style="display: flex; gap: 8px; align-items: center; background: rgba(30, 41, 59, 0.7); padding: 8px 10px; border-radius: 8px; border: 1px solid rgba(52, 211, 153, 0.2);">
        <div style="position: relative; width: 40px; height: 40px; flex-shrink: 0;">
          <img id="animal-preview-${a.id}" src="${a.image_url}" style="width: 40px; height: 40px; border-radius: 6px; object-fit: cover; border: 1.5px solid var(--border-gold);" onerror="this.src='https://via.placeholder.com/40'">
          <span style="position: absolute; bottom: -3px; right: -3px; background: #0f172a; color: #34d399; font-size: 9px; font-weight: 900; padding: 1px 4px; border-radius: 3px; border: 1px solid #34d399;">#${a.id}</span>
        </div>
        <input type="text" id="animal-name-${a.id}" class="form-input" style="width: 110px; flex-shrink: 0; height: 34px; padding: 0 8px; font-size: 11px; font-weight: 700;" value="${a.name}" placeholder="Name">
        <input type="text" id="animal-img-${a.id}" class="form-input" style="flex: 1; min-width: 60px; height: 34px; padding: 0 8px; font-size: 10px; font-family: monospace;" value="${a.image_url}" placeholder="URL / Base64" onchange="document.getElementById('animal-preview-${a.id}').src=this.value">
        <label for="animal-file-${a.id}" style="height: 34px; width: auto !important; padding: 0 12px; font-size: 11px; font-weight: 700; color: white; display: inline-flex; align-items: center; justify-content: center; gap: 5px; cursor: pointer; white-space: nowrap; flex: 0 0 auto !important; margin: 0; background: linear-gradient(135deg, #059669 0%, #10b981 100%); border: none; border-radius: 6px; box-shadow: 0 2px 6px rgba(16, 185, 129, 0.3);">
          <i class="fa-solid fa-cloud-arrow-up"></i> Upload
        </label>
        <input type="file" id="animal-file-${a.id}" accept="image/*" style="display: none;" onchange="handleAnimalImageUpload(${a.id}, this)">
      </div>
    `;
  });
  wildContainer.innerHTML = wildHtml;

  let petHtml = '';
  petList.forEach(a => {
    petHtml += `
      <div style="display: flex; gap: 8px; align-items: center; background: rgba(30, 41, 59, 0.7); padding: 8px 10px; border-radius: 8px; border: 1px solid rgba(251, 191, 36, 0.2);">
        <div style="position: relative; width: 40px; height: 40px; flex-shrink: 0;">
          <img id="animal-preview-${a.id}" src="${a.image_url}" style="width: 40px; height: 40px; border-radius: 6px; object-fit: cover; border: 1.5px solid var(--border-gold);" onerror="this.src='https://via.placeholder.com/40'">
          <span style="position: absolute; bottom: -3px; right: -3px; background: #0f172a; color: #fbbf24; font-size: 9px; font-weight: 900; padding: 1px 4px; border-radius: 3px; border: 1px solid #fbbf24;">#${a.id}</span>
        </div>
        <input type="text" id="animal-name-${a.id}" class="form-input" style="width: 110px; flex-shrink: 0; height: 34px; padding: 0 8px; font-size: 11px; font-weight: 700;" value="${a.name}" placeholder="Name">
        <input type="text" id="animal-img-${a.id}" class="form-input" style="flex: 1; min-width: 60px; height: 34px; padding: 0 8px; font-size: 10px; font-family: monospace;" value="${a.image_url}" placeholder="URL / Base64" onchange="document.getElementById('animal-preview-${a.id}').src=this.value">
        <label for="animal-file-${a.id}" style="height: 34px; width: auto !important; padding: 0 12px; font-size: 11px; font-weight: 700; color: white; display: inline-flex; align-items: center; justify-content: center; gap: 5px; cursor: pointer; white-space: nowrap; flex: 0 0 auto !important; margin: 0; background: linear-gradient(135deg, #059669 0%, #10b981 100%); border: none; border-radius: 6px; box-shadow: 0 2px 6px rgba(16, 185, 129, 0.3);">
          <i class="fa-solid fa-cloud-arrow-up"></i> Upload
        </label>
        <input type="file" id="animal-file-${a.id}" accept="image/*" style="display: none;" onchange="handleAnimalImageUpload(${a.id}, this)">
      </div>
    `;
  });
  petContainer.innerHTML = petHtml;
}

async function saveAdminAnimalsConfig(event) {
  event.preventDefault();
  
  // 1. Save Dynamic 2X Category Names
  const cat1Input = document.getElementById('admin-cat1-name-input');
  const cat2Input = document.getElementById('admin-cat2-name-input');
  if (cat1Input && cat2Input) {
    const val1 = cat1Input.value.trim();
    const val2 = cat2Input.value.trim();
    if (val1 && val2) {
      await dbUpdateCategoryNames(val1, val2);
    }
  }

  // 2. Save All 10 Animal Images and Names
  for (let i = 1; i <= 10; i++) {
    const nameEl = document.getElementById(`animal-name-${i}`);
    const imgEl = document.getElementById(`animal-img-${i}`);
    if (nameEl && imgEl) {
      const category = i <= 5 ? 'wild' : 'pet';
      await dbUpdateAnimalConfig(i, {
        name: nameEl.value,
        category: category,
        image_url: imgEl.value
      });
    }
  }

  if (document.activeElement && typeof document.activeElement.blur === 'function') {
    document.activeElement.blur();
  }

  alert('✅ 2X Category Names & All 10 Animal Images Updated Successfully!');
  await loadAdminAnimalsConfigForm(true);
}

// GLOBAL ALL-USER BET HISTORY MONITOR WITH SEARCH & DATE FILTERS
let allAdminBetsCache = [];

async function renderAdminAllBetsHistory() {
  const tbody = document.getElementById('admin-global-bets-table-body');
  if (!tbody) return;

  let bets = [];
  if (typeof supabaseClient !== 'undefined' && supabaseClient) {
    try {
      const { data, error } = await supabaseClient.from('user_bets_10x').select('*').order('created_at', { ascending: false }).limit(200);
      if (!error && data) bets = data;
    } catch (e) { console.warn(e); }
  }

  if (!bets || bets.length === 0) {
    if (typeof memoryUserBets10x !== 'undefined') {
      bets = memoryUserBets10x;
    }
  }

  allAdminBetsCache = bets;
  await filterAdminBetsTable();
}

function handleAdminDateFilterChange() {
  const val = document.getElementById('admin-bets-date-filter')?.value;
  const customBox = document.getElementById('admin-custom-date-box');
  if (customBox) {
    customBox.style.display = val === 'CUSTOM' ? 'flex' : 'none';
  }
  filterAdminBetsTable();
}

async function filterAdminBetsTable() {
  const tbody = document.getElementById('admin-global-bets-table-body');
  if (!tbody) return;

  const searchInput = (document.getElementById('admin-bets-search-input')?.value || '').toLowerCase().trim();
  const dateFilter = document.getElementById('admin-bets-date-filter')?.value || 'ALL';

  const catNames = typeof dbGetCategoryNames === 'function' ? await dbGetCategoryNames() : (typeof getCategoryNamesSync === 'function' ? getCategoryNamesSync() : { cat1: 'Bowler', cat2: 'Batsman' });
  const animalsConfig = typeof dbGetAnimalsConfig === 'function' ? await dbGetAnimalsConfig() : [];

  const nowMs = Date.now();

  let filtered = allAdminBetsCache.filter(b => {
    // Search matching
    const phone = (b.phone || '').toLowerCase();
    const userId = (b.user_id || '').toLowerCase();
    const roundId = (b.round_id || '').toLowerCase();
    const betType = (b.bet_type || '').toLowerCase();
    const category = (b.category || '').toLowerCase();
    const cardNum = String(b.card_number || '');

    const matchesSearch = !searchInput || 
      phone.includes(searchInput) || 
      userId.includes(searchInput) || 
      roundId.includes(searchInput) || 
      betType.includes(searchInput) ||
      category.includes(searchInput) ||
      cardNum.includes(searchInput);

    if (!matchesSearch) return false;

    // Date filtering
    if (dateFilter === 'ALL') return true;

    const bTime = b.created_at ? new Date(b.created_at).getTime() : nowMs;

    if (dateFilter === '24H') {
      return (nowMs - bTime) <= (24 * 60 * 60 * 1000);
    }
    if (dateFilter === '7D') {
      return (nowMs - bTime) <= (7 * 24 * 60 * 60 * 1000);
    }
    if (dateFilter === '30D') {
      return (nowMs - bTime) <= (30 * 24 * 60 * 60 * 1000);
    }
    if (dateFilter === '60D') {
      return (nowMs - bTime) <= (60 * 24 * 60 * 60 * 1000);
    }
    if (dateFilter === '90D') {
      return (nowMs - bTime) <= (90 * 24 * 60 * 60 * 1000);
    }
    if (dateFilter === 'CUSTOM') {
      const fromVal = document.getElementById('admin-bets-date-from')?.value;
      const toVal = document.getElementById('admin-bets-date-to')?.value;

      if (fromVal) {
        const fromTime = new Date(`${fromVal}T00:00:00`).getTime();
        if (bTime < fromTime) return false;
      }
      if (toVal) {
        const toTime = new Date(`${toVal}T23:59:59`).getTime();
        if (bTime > toTime) return false;
      }
      return true;
    }

    return true;
  });

  if (!filtered || filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="8" style="text-align: center; color: var(--color-text-muted); padding: 20px;">No bets found matching filter criteria!</td></tr>`;
    return;
  }

  const rowsHtml = filtered.map(b => {
    const is2X = b.bet_type === 'category_2x';
    const modeBadge = is2X 
      ? `<span style="background: rgba(16, 185, 129, 0.2); color: #34d399; padding: 3px 8px; border-radius: 6px; font-weight: 800; font-size: 11px;">2X Category</span>`
      : `<span style="background: rgba(245, 158, 11, 0.2); color: #fbbf24; padding: 3px 8px; border-radius: 6px; font-weight: 800; font-size: 11px;">10X Exact</span>`;

    let targetName = '';
    if (is2X) {
      targetName = b.category === 'wild' ? catNames.cat1 : catNames.cat2;
    } else {
      const anim = animalsConfig.find(a => a.id === b.card_number);
      targetName = anim ? anim.name : `Card #${b.card_number}`;
    }

    let statusBadge = '';
    const statusUpper = (b.status || 'PENDING').toUpperCase();
    if (statusUpper === 'WON') {
      statusBadge = `<span style="color: #34d399; font-weight: 900;">WON (+₹${(b.payout_amount || 0).toFixed(2)})</span>`;
    } else if (statusUpper === 'LOST') {
      statusBadge = `<span style="color: #f87171; font-weight: 800;">LOST (-₹${parseFloat(b.bet_amount).toFixed(2)})</span>`;
    } else {
      statusBadge = `<span style="color: #38bdf8; font-weight: 800;">PENDING</span>`;
    }

    const dateDisplay = b.created_at ? new Date(b.created_at).toLocaleString() : (b.date || 'Recent');

    return `
      <tr>
        <td style="font-size: 11px; color: #94a3b8;">${dateDisplay}</td>
        <td style="font-weight: 800; color: white;">${b.round_id || 'ROUND_10091'}</td>
        <td style="font-weight: 700; color: #cbd5e1;">${b.user_id || 'USR_000'} (+91 ${b.phone || '000'})</td>
        <td>${modeBadge}</td>
        <td style="font-weight: 800; color: #fbbf24;">${targetName}</td>
        <td style="font-weight: 700; color: #ffe066;">₹${parseFloat(b.bet_amount).toFixed(2)}</td>
        <td style="font-weight: 700; color: ${b.payout_amount > 0 ? '#34d399' : '#94a3b8'};">₹${(b.payout_amount || 0).toFixed(2)}</td>
        <td>${statusBadge}</td>
      </tr>
    `;
  }).join('');

  tbody.innerHTML = rowsHtml;
}

// ADMIN WITHDRAWAL REQUESTS MANAGER
async function loadAdminWithdrawals() {
  const tbody = document.getElementById('admin-withdrawals-table-body');
  if (!tbody) return;

  const wds = await dbGetAllWithdrawals();

  if (!wds || wds.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; padding: 24px; color: var(--color-text-muted);">No withdrawal requests recorded yet.</td></tr>`;
    return;
  }

  const rowsHtml = wds.map(w => {
    const isBank = w.method === 'BANK';
    const methodBadge = isBank
      ? `<span style="background: rgba(56, 189, 248, 0.2); color: #38bdf8; padding: 3px 8px; border-radius: 6px; font-weight: 800; font-size: 11px;">🏦 Bank Transfer</span>`
      : `<span style="background: rgba(168, 85, 247, 0.2); color: #a855f7; padding: 3px 8px; border-radius: 6px; font-weight: 800; font-size: 11px;">📲 UPI Direct</span>`;

    let detailsText = '';
    if (isBank && w.bank_details) {
      const accNo = w.bank_details.acc || w.bank_details.account || 'N/A';
      detailsText = `<div style="font-size: 12px; font-weight: 700; color: white;">A/C: ${accNo}</div>
                     <div style="font-size: 11px; color: #94a3b8;">IFSC: ${w.bank_details.ifsc || 'N/A'} | Bank: ${w.bank_details.bank || 'N/A'}</div>
                     <div style="font-size: 11px; color: #fbbf24;">Name: ${w.bank_details.name || 'N/A'}</div>`;
    } else if (w.bank_details) {
      const vpa = w.bank_details.vpa || 'N/A';
      const name = w.bank_details.name || 'N/A';
      const amount = parseFloat(w.amount || 0).toFixed(2);
      const upiPayload = `upi://pay?pa=${vpa}&pn=${encodeURIComponent(name)}&am=${amount}&cu=INR`;
      const thumbQr = vpa !== 'N/A' ? `https://api.qrserver.com/v1/create-qr-code/?size=80x80&data=${encodeURIComponent(upiPayload)}` : '';

      detailsText = `
        <div style="display: flex; align-items: center; gap: 10px;">
          ${thumbQr ? `<img src="${thumbQr}" onclick="openUpiQrModal('${w.id}')" title="Click to enlarge QR Code" style="width: 42px; height: 42px; border-radius: 6px; border: 1.5px solid var(--border-gold); cursor: pointer; background: white; padding: 2px; flex-shrink: 0; box-shadow: 0 2px 8px rgba(0,0,0,0.3);">` : ''}
          <div>
            <div style="font-size: 12px; font-weight: 800; color: #38bdf8;">UPI ID: ${vpa}</div>
            <div style="font-size: 11px; color: #fbbf24;">Payee Name: ${name}</div>
            ${vpa !== 'N/A' ? `
              <button type="button" onclick="openUpiQrModal('${w.id}')" style="margin-top: 4px; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; border: none; padding: 3px 8px; border-radius: 6px; font-size: 10px; font-weight: 800; cursor: pointer; display: inline-flex; align-items: center; gap: 4px; box-shadow: 0 2px 6px rgba(16,185,129,0.3);">
                <i class="fa-solid fa-qrcode"></i> View Auto QR
              </button>
            ` : ''}
          </div>
        </div>
      `;
    } else {
      detailsText = `<span style="color: #94a3b8; font-size: 11px;">Details Missing</span>`;
    }

    let statusBadge = '';
    const st = (w.status || 'Pending').toUpperCase();
    if (st === 'APPROVED') {
      const utrTag = w.utr_number ? `<div style="font-size: 11px; color: #60a5fa; font-family: monospace; font-weight: 800; margin-top: 4px;">UTR: ${w.utr_number}</div>` : '';
      statusBadge = `<span class="status-badge status-active">✅ Approved</span>${utrTag}`;
    } else if (st === 'REJECTED') {
      statusBadge = `<span class="status-badge status-suspended" title="${w.admin_notes || ''}">❌ Rejected & Refunded</span>`;
    } else {
      statusBadge = `<span style="background: rgba(245, 158, 11, 0.2); color: #fbbf24; border: 1px solid rgba(245, 158, 11, 0.4); padding: 3px 8px; border-radius: 6px; font-weight: 800; font-size: 11px;">⏳ Pending</span>`;
    }

    let actionsHtml = '';
    if (st === 'PENDING') {
      actionsHtml = `
        <button class="table-action-btn" style="background: #059669; color: white; border: none; padding: 4px 10px; margin-right: 4px;" onclick="approveAdminWithdrawal('${w.id}')">
          <i class="fa-solid fa-check"></i> Approve
        </button>
        <button class="table-action-btn btn-danger-sm" style="padding: 4px 10px;" onclick="rejectAdminWithdrawal('${w.id}')">
          <i class="fa-solid fa-xmark"></i> Reject
        </button>
      `;
    } else {
      actionsHtml = `<span style="font-size: 11px; color: #64748b;">Processed</span>`;
    }

    const dateDisplay = w.created_at ? new Date(w.created_at).toLocaleString() : (w.date || 'Recent');

    return `
      <tr>
        <td style="font-size: 11px; color: #94a3b8;">${w.id}<br><span style="font-size: 10px;">${dateDisplay}</span></td>
        <td style="font-weight: 700; color: white;">${w.user_id || 'USR_000'}<br><span style="font-size: 11px; color: #cbd5e1;">+91 ${w.phone || '000'}</span></td>
        <td>${methodBadge}</td>
        <td>${detailsText}</td>
        <td style="font-weight: 800; color: #ffe066; font-size: 14px;">₹${parseFloat(w.amount).toFixed(2)}</td>
        <td>${statusBadge}</td>
        <td style="text-align: right;">${actionsHtml}</td>
      </tr>
    `;
  }).join('');

  tbody.innerHTML = rowsHtml;
}

async function approveAdminWithdrawal(id) {
  const utr = prompt(`Enter UTR / Transaction Reference Number for withdrawal payout (${id}):`, '');
  if (utr === null) return;

  const utrTrimmed = utr.trim();
  if (!utrTrimmed) {
    alert('⚠️ Please enter a valid UTR / Transaction Reference Number to approve withdrawal!');
    return;
  }

  await dbApproveWithdrawal(id, utrTrimmed);
  if (typeof logAdminActivity === 'function') {
    logAdminActivity('WITHDRAWAL_ACTION', id, `Approved Withdrawal #${id} with UTR ${utrTrimmed}`);
  }
  alert(`✅ Withdrawal ${id} APPROVED successfully!\nUTR Number: ${utrTrimmed}`);
  await loadAdminWithdrawals();
  await renderAdminUsers();
}

async function rejectAdminWithdrawal(id) {
  const reason = prompt(`Enter rejection reason for withdrawal ${id} (Amount will be refunded back to user's wallet):`, 'Invalid Bank / UPI details');
  if (reason === null) return;

  await dbRejectWithdrawal(id, reason);
  if (typeof logAdminActivity === 'function') {
    logAdminActivity('WITHDRAWAL_ACTION', id, `Rejected Withdrawal #${id}. Reason: ${reason}`);
  }
  alert(`❌ Withdrawal ${id} REJECTED! Requested amount has been refunded back to user's wallet balance.`);
  await loadAdminWithdrawals();
  await renderAdminUsers();
}

// --- UPI QR CODE MODAL HANDLERS ---
async function openUpiQrModal(wdId) {
  const wds = await dbGetAllWithdrawals();
  const wd = wds.find(w => w.id === wdId);
  if (!wd) {
    alert("Withdrawal record not found!");
    return;
  }

  const bd = wd.bank_details || {};
  const vpa = bd.vpa || '';
  const name = bd.name || 'Payee';
  const amount = parseFloat(wd.amount || 0).toFixed(2);

  if (!vpa) {
    alert("⚠️ UPI ID missing for this withdrawal request!");
    return;
  }

  // Construct standard UPI payment deep link URL
  const upiPayload = `upi://pay?pa=${vpa}&pn=${encodeURIComponent(name)}&am=${amount}&cu=INR`;
  // Generate high quality QR code URL via free QR server API
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=260x260&margin=0&data=${encodeURIComponent(upiPayload)}`;

  const imgEl = document.getElementById('qr-modal-img');
  if (imgEl) imgEl.src = qrUrl;

  const amtEl = document.getElementById('qr-modal-amount');
  if (amtEl) amtEl.innerText = `₹${amount}`;

  const vpaEl = document.getElementById('qr-modal-vpa');
  if (vpaEl) vpaEl.innerText = vpa;

  const nameEl = document.getElementById('qr-modal-name');
  if (nameEl) nameEl.innerText = name;

  const userEl = document.getElementById('qr-modal-user');
  if (userEl) userEl.innerText = `${wd.user_id || 'USR_000'} (+91 ${wd.phone || ''})`;

  // Save values for copy helper
  window._currentQrData = { vpa, amount, id: wdId };

  // Configure UTR input & action buttons inside modal
  const utrBox = document.getElementById('qr-modal-utr-box');
  const utrInput = document.getElementById('qr-modal-utr-input');
  if (utrInput) utrInput.value = '';

  const btnApprove = document.getElementById('qr-modal-btn-approve');
  const btnReject = document.getElementById('qr-modal-btn-reject');
  const isPending = (wd.status || 'Pending').toUpperCase() === 'PENDING';

  if (utrBox) utrBox.style.display = isPending ? 'block' : 'none';

  if (btnApprove) {
    btnApprove.style.display = isPending ? 'block' : 'none';
    btnApprove.onclick = async function() {
      const utrVal = utrInput?.value.trim();
      if (!utrVal) {
        alert("⚠️ Please enter UTR / Transaction Reference Number to approve payout!");
        if (utrInput) utrInput.focus();
        return;
      }
      closeAdminModal('upi-qr-modal');
      await dbApproveWithdrawal(wdId, utrVal);
      alert(`✅ Withdrawal ${wdId} APPROVED successfully!\nUTR Number: ${utrVal}`);
      await loadAdminWithdrawals();
      await renderAdminUsers();
    };
  }

  if (btnReject) {
    btnReject.style.display = isPending ? 'block' : 'none';
    btnReject.onclick = async function() {
      closeAdminModal('upi-qr-modal');
      await rejectAdminWithdrawal(wdId);
    };
  }

  const modal = document.getElementById('upi-qr-modal');
  if (modal) modal.style.display = 'flex';
}

// RENDER ALL GAMES BET HISTORY (10X WHEEL, FLIP COIN, DRAGON VS TIGER)
async function renderAdminAllBetsHistory() {
  const tbody = document.getElementById('admin-global-bets-table-body');
  if (!tbody) return;

  let bets10x = [], betsCoinflip = [], betsDT = [];

  if (typeof supabaseClient !== 'undefined' && supabaseClient) {
    try {
      const [res10x, resCoinflip, resDT] = await Promise.all([
        supabaseClient.from('user_bets_10x').select('*').order('created_at', { ascending: false }).limit(200),
        supabaseClient.from('user_bets_coinflip').select('*').order('created_at', { ascending: false }).limit(200),
        supabaseClient.from('user_bets_dragontiger').select('*').order('created_at', { ascending: false }).limit(200)
      ]);

      if (!res10x.error && res10x.data) bets10x = res10x.data;
      if (!resCoinflip.error && resCoinflip.data) betsCoinflip = resCoinflip.data;
      if (!resDT.error && resDT.data) betsDT = resDT.data;
    } catch (e) { console.warn("Fetch bets history error:", e); }
  }

  if (bets10x.length === 0 && typeof memoryUserBets10x !== 'undefined') bets10x = memoryUserBets10x;
  if (betsCoinflip.length === 0 && typeof memoryUserBetsCoinFlip !== 'undefined') betsCoinflip = memoryUserBetsCoinFlip;
  if (betsDT.length === 0 && typeof memoryDragonTigerBets !== 'undefined') betsDT = memoryDragonTigerBets;

  bets10x.forEach(b => { b._game = '10x'; b._gameName = '10X Wheel'; });
  betsCoinflip.forEach(b => { b._game = 'coinflip'; b._gameName = 'Flip Coin'; });
  betsDT.forEach(b => { b._game = 'dragontiger'; b._gameName = 'Dragon vs Tiger'; });

  allAdminBetsCache = [...bets10x, ...betsCoinflip, ...betsDT].sort((a, b) => {
    const tA = a.created_at ? new Date(a.created_at).getTime() : 0;
    const tB = b.created_at ? new Date(b.created_at).getTime() : 0;
    return tB - tA;
  });

  await filterAdminBetsTable();
}

function handleAdminDateFilterChange() {
  const val = document.getElementById('admin-bets-date-filter')?.value;
  const customBox = document.getElementById('admin-custom-date-box');
  if (customBox) {
    customBox.style.display = val === 'CUSTOM' ? 'flex' : 'none';
  }
  filterAdminBetsTable();
}

async function filterAdminBetsTable() {
  const tbody = document.getElementById('admin-global-bets-table-body');
  if (!tbody) return;

  const searchInput = (document.getElementById('admin-bets-search-input')?.value || '').toLowerCase().trim();
  const gameFilter = document.getElementById('admin-bets-game-filter')?.value || 'ALL';
  const dateFilter = document.getElementById('admin-bets-date-filter')?.value || 'ALL';

  const catNames = typeof dbGetCategoryNames === 'function' ? await dbGetCategoryNames() : (typeof getCategoryNamesSync === 'function' ? getCategoryNamesSync() : { cat1: 'Bowler', cat2: 'Batsman' });
  const animalsConfig = typeof dbGetAnimalsConfig === 'function' ? await dbGetAnimalsConfig() : [];

  const nowMs = Date.now();

  let filtered = allAdminBetsCache.filter(b => {
    // Game filtering
    if (gameFilter !== 'ALL' && b._game !== gameFilter) return false;

    // Search matching
    const phone = (b.phone || '').toLowerCase();
    const userId = (b.user_id || '').toLowerCase();
    const roundId = (b.round_id || '').toLowerCase();
    const betType = (b.bet_type || '').toLowerCase();
    const category = (b.category || '').toLowerCase();
    const cardNum = String(b.card_number || '');
    const selectedSide = (b.selected_side || '').toLowerCase();

    const matchesSearch = !searchInput || 
      phone.includes(searchInput) || 
      userId.includes(searchInput) || 
      roundId.includes(searchInput) || 
      betType.includes(searchInput) ||
      category.includes(searchInput) ||
      selectedSide.includes(searchInput) ||
      cardNum.includes(searchInput);

    if (!matchesSearch) return false;

    // Date filtering
    if (dateFilter === 'ALL') return true;

    const bTime = b.created_at ? new Date(b.created_at).getTime() : nowMs;

    if (dateFilter === '24H') return (nowMs - bTime) <= (24 * 60 * 60 * 1000);
    if (dateFilter === '7D') return (nowMs - bTime) <= (7 * 24 * 60 * 60 * 1000);
    if (dateFilter === '30D') return (nowMs - bTime) <= (30 * 24 * 60 * 60 * 1000);
    if (dateFilter === '60D') return (nowMs - bTime) <= (60 * 24 * 60 * 60 * 1000);
    if (dateFilter === '90D') return (nowMs - bTime) <= (90 * 24 * 60 * 60 * 1000);
    if (dateFilter === 'CUSTOM') {
      const fromVal = document.getElementById('admin-bets-date-from')?.value;
      const toVal = document.getElementById('admin-bets-date-to')?.value;

      if (fromVal) {
        const fromTime = new Date(`${fromVal}T00:00:00`).getTime();
        if (bTime < fromTime) return false;
      }
      if (toVal) {
        const toTime = new Date(`${toVal}T23:59:59`).getTime();
        if (bTime > toTime) return false;
      }
      return true;
    }

    return true;
  });

  if (!filtered || filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="9" style="text-align: center; color: var(--color-text-muted); padding: 20px;">No bets found matching filter criteria!</td></tr>`;
    return;
  }

  const rowsHtml = filtered.map(b => {
    let gameBadge = '';
    if (b._game === 'coinflip') {
      gameBadge = `<span style="background: rgba(56, 189, 248, 0.2); color: #38bdf8; padding: 3px 8px; border-radius: 6px; font-weight: 800; font-size: 11px;">🪙 Flip Coin</span>`;
    } else if (b._game === 'dragontiger') {
      gameBadge = `<span style="background: rgba(239, 68, 68, 0.2); color: #f87171; padding: 3px 8px; border-radius: 6px; font-weight: 800; font-size: 11px;">🐉 Dragon Tiger</span>`;
    } else {
      gameBadge = `<span style="background: rgba(234, 179, 8, 0.2); color: #facc15; padding: 3px 8px; border-radius: 6px; font-weight: 800; font-size: 11px;">🎯 10X Wheel</span>`;
    }

    let modeBadge = '';
    let targetName = '';

    if (b._game === 'coinflip') {
      modeBadge = `<span style="background: rgba(56, 189, 248, 0.15); color: #38bdf8; padding: 3px 6px; border-radius: 4px; font-weight: 700; font-size: 10px;">2X COIN</span>`;
      targetName = String(b.selected_side || 'HEADS').toUpperCase();
    } else if (b._game === 'dragontiger') {
      const isTie = (b.selected_side || '').toLowerCase() === 'tie';
      modeBadge = isTie 
        ? `<span style="background: rgba(34, 197, 94, 0.2); color: #4ade80; padding: 3px 6px; border-radius: 4px; font-weight: 800; font-size: 10px;">9X TIE</span>`
        : `<span style="background: rgba(239, 68, 68, 0.15); color: #f87171; padding: 3px 6px; border-radius: 4px; font-weight: 700; font-size: 10px;">2X SIDE</span>`;
      targetName = String(b.selected_side || 'DRAGON').toUpperCase();
    } else {
      const is2X = b.bet_type === 'category_2x';
      modeBadge = is2X 
        ? `<span style="background: rgba(16, 185, 129, 0.2); color: #34d399; padding: 3px 6px; border-radius: 4px; font-weight: 800; font-size: 10px;">2X Category</span>`
        : `<span style="background: rgba(245, 158, 11, 0.2); color: #fbbf24; padding: 3px 6px; border-radius: 4px; font-weight: 800; font-size: 10px;">10X Exact</span>`;

      if (is2X) {
        targetName = b.category === 'wild' ? catNames.cat1 : catNames.cat2;
      } else {
        const anim = animalsConfig.find(a => a.id === b.card_number);
        targetName = anim ? anim.name : `Card #${b.card_number}`;
      }
    }

    let statusBadge = '';
    const statusUpper = (b.status || 'PENDING').toUpperCase();
    if (statusUpper === 'WON') {
      statusBadge = `<span style="color: #34d399; font-weight: 900;">WON (+₹${(b.payout_amount || 0).toFixed(2)})</span>`;
    } else if (statusUpper === 'LOST') {
      statusBadge = `<span style="color: #f87171; font-weight: 800;">LOST (-₹${parseFloat(b.bet_amount || 0).toFixed(2)})</span>`;
    } else {
      statusBadge = `<span style="color: #38bdf8; font-weight: 800;">PENDING</span>`;
    }

    const dateDisplay = b.created_at ? new Date(b.created_at).toLocaleString() : 'Recent';

    return `
      <tr>
        <td style="font-size: 11px; color: #94a3b8;">${dateDisplay}</td>
        <td>${gameBadge}</td>
        <td style="font-weight: 800; color: white;">${b.round_id || 'RD_101'}</td>
        <td style="font-weight: 700; color: #cbd5e1;">${b.user_id || 'USR_GUEST'} (+91 ${b.phone || '000'})</td>
        <td>${modeBadge}</td>
        <td style="font-weight: 800; color: #fbbf24;">${targetName}</td>
        <td style="font-weight: 700; color: #ffe066;">₹${parseFloat(b.bet_amount || 0).toFixed(2)}</td>
        <td style="font-weight: 700; color: ${b.payout_amount > 0 ? '#34d399' : '#94a3b8'};">₹${(b.payout_amount || 0).toFixed(2)}</td>
        <td>${statusBadge}</td>
      </tr>
    `;
  }).join('');

  tbody.innerHTML = rowsHtml;
}

function copyQrDetail(type) {
  if (!window._currentQrData) return;
  const val = type === 'vpa' ? window._currentQrData.vpa : window._currentQrData.amount;
  navigator.clipboard.writeText(val).then(() => {
    alert(`📋 Copied to clipboard: ${val}`);
  }).catch(() => {
    prompt("Copy text:", val);
  });
}

// RENDER ADMIN DAILY PROFIT & FINANCIAL ANALYTICS
async function renderAdminProfitAnalytics() {
  let bets10x = [], betsCoinflip = [], betsDT = [];

  if (typeof supabaseClient !== 'undefined' && supabaseClient) {
    try {
      const [res10x, resCoinflip, resDT] = await Promise.all([
        supabaseClient.from('user_bets_10x').select('*').order('created_at', { ascending: false }),
        supabaseClient.from('user_bets_coinflip').select('*').order('created_at', { ascending: false }),
        supabaseClient.from('user_bets_dragontiger').select('*').order('created_at', { ascending: false })
      ]);

      if (!res10x.error && res10x.data) bets10x = res10x.data;
      if (!resCoinflip.error && resCoinflip.data) betsCoinflip = resCoinflip.data;
      if (!resDT.error && resDT.data) betsDT = resDT.data;
    } catch (e) { console.warn("Fetch bets profit warning:", e); }
  }

  if (bets10x.length === 0 && typeof memoryUserBets10x !== 'undefined') bets10x = memoryUserBets10x;
  if (betsCoinflip.length === 0 && typeof memoryUserBetsCoinFlip !== 'undefined') betsCoinflip = memoryUserBetsCoinFlip;
  if (betsDT.length === 0 && typeof memoryDragonTigerBets !== 'undefined') betsDT = memoryDragonTigerBets;

  bets10x.forEach(b => b._game = '10x');
  betsCoinflip.forEach(b => b._game = 'coinflip');
  betsDT.forEach(b => b._game = 'dragontiger');

  const allBets = [...bets10x, ...betsCoinflip, ...betsDT];

  const now = new Date();
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const d7Start = now.getTime() - (7 * 24 * 60 * 60 * 1000);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();

  let todayIntake = 0, todayPayouts = 0;
  let d7Intake = 0, d7Payouts = 0;
  let monthIntake = 0, monthPayouts = 0;
  let totalIntake = 0, totalPayouts = 0;

  const gameStats = {
    '10x': { count: 0, intake: 0, payouts: 0 },
    'coinflip': { count: 0, intake: 0, payouts: 0 },
    'dragontiger': { count: 0, intake: 0, payouts: 0 }
  };

  const dailyMap = {};

  allBets.forEach(b => {
    const betAmt = parseFloat(b.bet_amount || 0);
    const payoutAmt = parseFloat(b.payout_amount || 0);
    const status = (b.status || '').toUpperCase();
    const bDate = b.created_at ? new Date(b.created_at) : new Date();
    const bTime = bDate.getTime();
    const dateKey = `${bDate.getFullYear()}-${String(bDate.getMonth() + 1).padStart(2, '0')}-${String(bDate.getDate()).padStart(2, '0')}`;
    const gKey = b._game || '10x';

    totalIntake += betAmt;
    if (status === 'WON') totalPayouts += payoutAmt;

    if (gameStats[gKey]) {
      gameStats[gKey].count += 1;
      gameStats[gKey].intake += betAmt;
      if (status === 'WON') gameStats[gKey].payouts += payoutAmt;
    }

    if (bTime >= todayStart) {
      todayIntake += betAmt;
      if (status === 'WON') todayPayouts += payoutAmt;
    }

    if (bTime >= d7Start) {
      d7Intake += betAmt;
      if (status === 'WON') d7Payouts += payoutAmt;
    }

    if (bTime >= monthStart) {
      monthIntake += betAmt;
      if (status === 'WON') monthPayouts += payoutAmt;
    }

    if (!dailyMap[dateKey]) {
      dailyMap[dateKey] = { count: 0, intake: 0, payouts: 0 };
    }
    dailyMap[dateKey].count += 1;
    dailyMap[dateKey].intake += betAmt;
    if (status === 'WON') {
      dailyMap[dateKey].payouts += payoutAmt;
    }
  });

  const todayNet = todayIntake - todayPayouts;
  const d7Net = d7Intake - d7Payouts;
  const monthNet = monthIntake - monthPayouts;
  const totalNet = totalIntake - totalPayouts;

  const todayMargin = todayIntake > 0 ? ((todayNet / todayIntake) * 100).toFixed(1) : '0.0';

  // Update Header Stat Cards
  const statTodayProfit = document.getElementById('stat-today-profit');
  const statTodayIntake = document.getElementById('stat-today-intake');
  const statTodayPayouts = document.getElementById('stat-today-payouts');
  const statTodayMargin = document.getElementById('stat-today-margin-badge');
  const statTotalProfit = document.getElementById('stat-total-profit');
  const statTotalIntake = document.getElementById('stat-total-intake');

  if (statTodayProfit) {
    statTodayProfit.innerText = `${todayNet >= 0 ? '+' : ''}₹${todayNet.toFixed(2)}`;
    statTodayProfit.style.color = todayNet >= 0 ? '#34d399' : '#f87171';
  }
  if (statTodayIntake) statTodayIntake.innerText = `₹${todayIntake.toFixed(2)}`;
  if (statTodayPayouts) statTodayPayouts.innerText = `₹${todayPayouts.toFixed(2)}`;
  if (statTodayMargin) statTodayMargin.innerText = `${todayMargin}% Margin`;

  if (statTotalProfit) {
    statTotalProfit.innerText = `${totalNet >= 0 ? '+' : ''}₹${totalNet.toFixed(2)}`;
    statTotalProfit.style.color = totalNet >= 0 ? '#ffe066' : '#f87171';
  }
  if (statTotalIntake) statTotalIntake.innerText = `₹${totalIntake.toFixed(2)}`;

  // Update Analytics Section Metric Cards
  const aTodayProfit = document.getElementById('analytics-today-profit');
  const aTodayMargin = document.getElementById('analytics-today-margin');
  const aD7Profit = document.getElementById('analytics-7d-profit');
  const aD7Intake = document.getElementById('analytics-7d-intake');
  const aMonthProfit = document.getElementById('analytics-month-profit');
  const aMonthIntake = document.getElementById('analytics-month-intake');
  const aTotalProfit = document.getElementById('analytics-total-profit');
  const aTotalIntake = document.getElementById('analytics-total-intake');

  if (aTodayProfit) {
    aTodayProfit.innerText = `${todayNet >= 0 ? '+' : ''}₹${todayNet.toFixed(2)}`;
    aTodayProfit.style.color = todayNet >= 0 ? '#34d399' : '#f87171';
  }
  if (aTodayMargin) aTodayMargin.innerText = `${todayMargin}%`;

  if (aD7Profit) {
    aD7Profit.innerText = `${d7Net >= 0 ? '+' : ''}₹${d7Net.toFixed(2)}`;
    aD7Profit.style.color = d7Net >= 0 ? '#38bdf8' : '#f87171';
  }
  if (aD7Intake) aD7Intake.innerText = `₹${d7Intake.toFixed(2)}`;

  if (aMonthProfit) {
    aMonthProfit.innerText = `${monthNet >= 0 ? '+' : ''}₹${monthNet.toFixed(2)}`;
    aMonthProfit.style.color = monthNet >= 0 ? '#fbbf24' : '#f87171';
  }
  if (aMonthIntake) aMonthIntake.innerText = `₹${monthIntake.toFixed(2)}`;

  if (aTotalProfit) {
    aTotalProfit.innerText = `${totalNet >= 0 ? '+' : ''}₹${totalNet.toFixed(2)}`;
    aTotalProfit.style.color = totalNet >= 0 ? '#c084fc' : '#f87171';
  }
  if (aTotalIntake) aTotalIntake.innerText = `₹${totalIntake.toFixed(2)}`;

  // Update Game-Wise Profit Cards Grid
  const updateGameCard = (prefix, gData) => {
    const elCount = document.getElementById(`gamewise-${prefix}-count`);
    const elProfit = document.getElementById(`gamewise-${prefix}-profit`);
    const elIntake = document.getElementById(`gamewise-${prefix}-intake`);
    const elPayouts = document.getElementById(`gamewise-${prefix}-payouts`);

    const gNet = gData.intake - gData.payouts;
    const sign = gNet >= 0 ? '+' : '';
    const color = gNet >= 0 ? '#34d399' : '#f87171';

    if (elCount) elCount.innerText = `${gData.count} bets`;
    if (elProfit) {
      elProfit.innerText = `${sign}₹${gNet.toFixed(2)}`;
      elProfit.style.color = color;
    }
    if (elIntake) elIntake.innerText = `₹${gData.intake.toFixed(2)}`;
    if (elPayouts) elPayouts.innerText = `₹${gData.payouts.toFixed(2)}`;
  };

  updateGameCard('10x', gameStats['10x']);
  updateGameCard('coinflip', gameStats['coinflip']);
  updateGameCard('dt', gameStats['dragontiger']);

  // Render Daily Profit Breakdown History Table
  const tbody = document.getElementById('admin-daily-profit-table-body');
  if (!tbody) return;

  const sortedDates = Object.keys(dailyMap).sort().reverse();
  if (sortedDates.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--color-text-muted); padding: 20px;">No bet history available for daily profit breakdown.</td></tr>`;
    return;
  }

  tbody.innerHTML = sortedDates.map(dateStr => {
    const d = dailyMap[dateStr];
    const net = d.intake - d.payouts;
    const margin = d.intake > 0 ? ((net / d.intake) * 100).toFixed(1) : '0.0';
    const isToday = dateStr === todayStr;

    return `
      <tr style="${isToday ? 'background: rgba(16, 185, 129, 0.1); border-left: 3px solid #34d399;' : ''}">
        <td style="font-weight: 700; color: #f1f5f9;">
          ${dateStr} ${isToday ? '<span style="background: rgba(52, 211, 153, 0.2); color: #34d399; font-size: 10px; padding: 2px 6px; border-radius: 4px; font-weight: 900; margin-left: 6px;">TODAY</span>' : ''}
        </td>
        <td style="font-weight: 700; color: #94a3b8;">${d.count} bets</td>
        <td style="font-weight: 700; color: #ffe066;">₹${d.intake.toFixed(2)}</td>
        <td style="font-weight: 700; color: #f87171;">₹${d.payouts.toFixed(2)}</td>
        <td style="font-weight: 900; color: ${net >= 0 ? '#34d399' : '#f87171'};">
          ${net >= 0 ? '+' : ''}₹${net.toFixed(2)}
        </td>
        <td style="font-weight: 800; color: #38bdf8;">${margin}%</td>
      </tr>
    `;
  }).join('');
}

// --- DRAGON VS TIGER ADMIN OUTCOME CONTROL ---
async function renderAdminDTOutcomeModeUI() {
  const activeMode = typeof dbGetDragonTigerOutcomeMode === 'function' ? await dbGetDragonTigerOutcomeMode() : 'auto_profit';
  const labelEl = document.getElementById('admin-dt-active-mode-label');

  const modeLabels = {
    'auto_profit': '🛡️ SMART AUTO PROFIT (Lowest Payout Wins)',
    'fair': '⚖️ FAIR 50-50 RNG',
    'force_dragon': '🐉 FORCE DRAGON WIN',
    'force_tiger': '🐯 FORCE TIGER WIN',
    'force_tie': '🤝 FORCE TIE WIN'
  };

  const modeColors = {
    'auto_profit': '#34d399',
    'fair': '#38bdf8',
    'force_dragon': '#f87171',
    'force_tiger': '#fbbf24',
    'force_tie': '#4ade80'
  };

  if (labelEl) {
    labelEl.innerText = modeLabels[activeMode] || '🛡️ SMART AUTO PROFIT';
    labelEl.style.color = modeColors[activeMode] || '#fbbf24';
  }

  ['auto', 'fair', 'dragon', 'tiger', 'tie'].forEach(m => {
    const btn = document.getElementById(`dt-mode-btn-${m}`);
    if (btn) {
      const modeKey = m === 'auto' ? 'auto_profit' : (m === 'dragon' ? 'force_dragon' : (m === 'tiger' ? 'force_tiger' : (m === 'tie' ? 'force_tie' : 'fair')));
      btn.style.borderColor = '';
      btn.style.background = '';
      if (activeMode === modeKey) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    }
  });
}

async function setAdminDTOutcomeMode(newMode) {
  if (typeof dbUpdateDragonTigerOutcomeMode === 'function') {
    await dbUpdateDragonTigerOutcomeMode(newMode);
  }
  if (typeof logAdminActivity === 'function') {
    logAdminActivity('OUTCOME_OVERRIDE', 'DragonTiger', `Changed Dragon vs Tiger outcome mode to ${newMode.toUpperCase()}`);
  }
  await renderAdminDTOutcomeModeUI();
  alert(`✅ Dragon vs Tiger Outcome Mode Updated!\n\nActive Mode: ${newMode.toUpperCase()}`);
}

window.renderAdminDTOutcomeModeUI = renderAdminDTOutcomeModeUI;
window.setAdminDTOutcomeMode = setAdminDTOutcomeMode;

function updateAdminDTPnLUI(totalBets, roundId) {
  if (!totalBets) return;
  const dBets = parseFloat(totalBets.dragon || 0);
  const tBets = parseFloat(totalBets.tiger || 0);
  const tieBets = parseFloat(totalBets.tie || 0);
  const pool = dBets + tBets + tieBets;

  const pnlDragon = pool - (dBets * 2.0);
  const pnlTiger = pool - (tBets * 2.0);
  const pnlTie = pool - (tieBets * 9.0);

  const elRound = document.getElementById('admin-dt-round-id');
  const elDBets = document.getElementById('admin-dt-bets-dragon');
  const elTBets = document.getElementById('admin-dt-bets-tiger');
  const elTieBets = document.getElementById('admin-dt-bets-tie');
  const elTotal = document.getElementById('admin-dt-bets-total');

  const elDPnl = document.getElementById('admin-dt-pnl-dragon');
  const elTPnl = document.getElementById('admin-dt-pnl-tiger');
  const elTiePnl = document.getElementById('admin-dt-pnl-tie');
  const elBest = document.getElementById('admin-dt-best-choice');

  if (elRound && roundId) elRound.innerText = roundId;
  if (elDBets) elDBets.innerText = `₹${dBets.toFixed(2)}`;
  if (elTBets) elTBets.innerText = `₹${tBets.toFixed(2)}`;
  if (elTieBets) elTieBets.innerText = `₹${tieBets.toFixed(2)}`;
  if (elTotal) elTotal.innerText = `₹${pool.toFixed(2)}`;

  const formatPnL = (val) => {
    const sign = val >= 0 ? '+' : '';
    const color = val >= 0 ? '#22c55e' : '#ef4444';
    return `<span style="color: ${color}; font-weight: 900;">${sign}₹${val.toFixed(2)}</span>`;
  };

  if (elDPnl) elDPnl.innerHTML = formatPnL(pnlDragon);
  if (elTPnl) elTPnl.innerHTML = formatPnL(pnlTiger);
  if (elTiePnl) elTiePnl.innerHTML = formatPnL(pnlTie);

  if (elBest) {
    let bestSide = 'AUTO';
    let maxPnL = -Infinity;
    if (pnlDragon > maxPnL) { maxPnL = pnlDragon; bestSide = 'DRAGON'; }
    if (pnlTiger > maxPnL) { maxPnL = pnlTiger; bestSide = 'TIGER'; }
    if (pnlTie > maxPnL) { maxPnL = pnlTie; bestSide = 'TIE'; }

    const bestColor = maxPnL >= 0 ? '#22c55e' : '#ef4444';
    const bestSign = maxPnL >= 0 ? '+' : '';
    elBest.innerHTML = `BEST: <span style="color: ${bestColor}; font-weight: 900;">${bestSide} (${bestSign}₹${maxPnL.toFixed(0)})</span>`;
  }
}

window.updateAdminDTPnLUI = updateAdminDTPnLUI;

// --- SUPER ADMIN PANEL RENDERING & CREDENTIAL MANAGERS ---
async function renderSuperAdminAuditLogs() {
  const tbody = document.getElementById('super-admin-logs-tbody');
  if (!tbody) return;

  const logs = typeof dbGetAdminActivityLogs === 'function' ? await dbGetAdminActivityLogs(150) : [];
  const filterType = document.getElementById('super-admin-log-filter')?.value || 'ALL';
  const searchInput = (document.getElementById('super-admin-log-search')?.value || '').toLowerCase().trim();

  let filtered = logs.filter(l => {
    if (filterType !== 'ALL' && l.action_type !== filterType) return false;
    if (!searchInput) return true;
    const admin = (l.admin_id || '').toLowerCase();
    const details = (l.details || '').toLowerCase();
    const target = (l.target_id || '').toLowerCase();
    return admin.includes(searchInput) || details.includes(searchInput) || target.includes(searchInput);
  });

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: #94a3b8; padding: 20px;">No regular admin activity logs found.</td></tr>`;
    return;
  }

  const rows = filtered.map(l => {
    const timeStr = l.created_at ? new Date(l.created_at).toLocaleString() : 'Recent';
    let typeBadge = `<span style="background: rgba(56, 189, 248, 0.2); color: #38bdf8; padding: 3px 8px; border-radius: 6px; font-weight: 800; font-size: 11px;">${l.action_type}</span>`;
    if (l.action_type === 'OUTCOME_OVERRIDE') {
      typeBadge = `<span style="background: rgba(245, 158, 11, 0.2); color: #fbbf24; padding: 3px 8px; border-radius: 6px; font-weight: 800; font-size: 11px;">🕹️ OVERRIDE</span>`;
    } else if (l.action_type === 'DEPOSIT_ACTION') {
      typeBadge = `<span style="background: rgba(52, 211, 153, 0.2); color: #34d399; padding: 3px 8px; border-radius: 6px; font-weight: 800; font-size: 11px;">💰 DEPOSIT</span>`;
    } else if (l.action_type === 'WITHDRAWAL_ACTION') {
      typeBadge = `<span style="background: rgba(239, 68, 68, 0.2); color: #f87171; padding: 3px 8px; border-radius: 6px; font-weight: 800; font-size: 11px;">💸 WITHDRAWAL</span>`;
    } else if (l.action_type === 'USER_EDIT') {
      typeBadge = `<span style="background: rgba(168, 85, 247, 0.2); color: #c084fc; padding: 3px 8px; border-radius: 6px; font-weight: 800; font-size: 11px;">👤 USER EDIT</span>`;
    } else if (l.action_type === 'GAME_TOGGLE') {
      typeBadge = `<span style="background: rgba(234, 179, 8, 0.2); color: #facc15; padding: 3px 8px; border-radius: 6px; font-weight: 800; font-size: 11px;">🎮 GAME TOGGLE</span>`;
    }

    return `
      <tr>
        <td style="font-size: 11px; color: #94a3b8;">${timeStr}</td>
        <td style="font-weight: 800; color: #f87171;">👤 ${l.admin_id}</td>
        <td>${typeBadge}</td>
        <td style="font-weight: 700; color: #cbd5e1;">${l.target_id || '--'}</td>
        <td style="font-weight: 700; color: #e2e8f0;">${l.details}</td>
      </tr>
    `;
  }).join('');

  tbody.innerHTML = rows;
}

async function renderSuperAdminCredentials() {
  const tbody = document.getElementById('super-admin-users-tbody');
  if (!tbody) return;

  const creds = typeof dbGetAdminCredentialsList === 'function' ? await dbGetAdminCredentialsList() : [];
  if (creds.length === 0) {
    tbody.innerHTML = `<tr><td colspan="4" style="text-align: center; color: #94a3b8; padding: 20px;">No admin credentials found.</td></tr>`;
    return;
  }

  const rows = creds.map(c => {
    const isSuper = c.role === 'super_admin';
    const roleBadge = isSuper
      ? `<span style="background: rgba(239, 68, 68, 0.2); color: #f87171; padding: 3px 8px; border-radius: 6px; font-weight: 900; font-size: 11px;">🕵️ SUPER ADMIN (Stealth & Exempted)</span>`
      : `<span style="background: rgba(56, 189, 248, 0.2); color: #38bdf8; padding: 3px 8px; border-radius: 6px; font-weight: 800; font-size: 11px;">👤 REGULAR ADMIN (Logged)</span>`;

    const timeStr = c.created_at ? new Date(c.created_at).toLocaleDateString() : 'Active';

    return `
      <tr>
        <td style="font-weight: 800; color: #f1f5f9;">${c.username}</td>
        <td>${roleBadge}</td>
        <td style="font-size: 11px; color: #94a3b8;">${timeStr}</td>
        <td><span style="color: #34d399; font-weight: 900;">ACTIVE</span></td>
      </tr>
    `;
  }).join('');

  tbody.innerHTML = rows;
}

async function handleCreateAdminCredential(event) {
  event.preventDefault();
  const username = document.getElementById('new-admin-username').value.trim();
  const password = document.getElementById('new-admin-password').value.trim();
  const role = document.getElementById('new-admin-role').value;

  if (!username || !password) {
    alert("⚠️ Please enter username and password!");
    return;
  }

  const res = typeof dbSaveAdminCredential === 'function' ? await dbSaveAdminCredential(username, password, role) : { success: true };
  if (res && res.success) {
    alert(`✅ New Admin Credential Saved!\n\nUsername: ${username}\nRole: ${role.toUpperCase()}`);
    document.getElementById('new-admin-username').value = '';
    document.getElementById('new-admin-password').value = '';
    await renderSuperAdminCredentials();
  } else {
    alert(`❌ Failed to save admin credential: ${res.message || 'Error'}`);
  }
}

window.renderSuperAdminAuditLogs = renderSuperAdminAuditLogs;
window.renderSuperAdminCredentials = renderSuperAdminCredentials;
window.handleCreateAdminCredential = handleCreateAdminCredential;

function openChangeAdminCredentialsModal() {
  const currentUsername = sessionStorage.getItem('admin_user') || 'admin';
  const oldPInput = document.getElementById('change-admin-old-password');
  const uInput = document.getElementById('change-admin-new-username');
  const pInput = document.getElementById('change-admin-new-password');
  const cInput = document.getElementById('change-admin-confirm-password');

  if (oldPInput) oldPInput.value = '';
  if (uInput) uInput.value = currentUsername;
  if (pInput) pInput.value = '';
  if (cInput) cInput.value = '';

  const modal = document.getElementById('change-admin-cred-modal');
  if (modal) {
    modal.style.display = 'flex';
    modal.classList.add('active');
  }
}

async function handleCurrentAdminCredUpdate(event) {
  event.preventDefault();
  const oldUsername = sessionStorage.getItem('admin_user') || 'admin';
  const oldPassword = (document.getElementById('change-admin-old-password')?.value || '').trim();
  const newUsername = document.getElementById('change-admin-new-username').value.trim();
  const newPassword = document.getElementById('change-admin-new-password').value.trim();
  const confirmPassword = document.getElementById('change-admin-confirm-password').value.trim();

  if (!oldPassword) {
    alert("⚠️ Please enter your Current (Old) Password!");
    return;
  }

  if (!newUsername || !newPassword) {
    alert("⚠️ Please enter both new username and new password!");
    return;
  }

  if (newPassword !== confirmPassword) {
    alert("⚠️ New Password and Confirm Password do not match!");
    return;
  }

  // 1. Verify Current (Old) Password first!
  const authVerify = typeof dbVerifyAdminCredentials === 'function'
    ? await dbVerifyAdminCredentials(oldUsername, oldPassword)
    : (oldPassword === 'admin123' || oldPassword === 'super123' ? { success: true } : { success: false });

  if (!authVerify || !authVerify.success) {
    alert("❌ Incorrect Current (Old) Password!\nPlease enter your correct current password to proceed.");
    return;
  }

  // 2. Update to New Username and Password
  const res = typeof dbUpdateCurrentAdminCredentials === 'function'
    ? await dbUpdateCurrentAdminCredentials(oldUsername, newUsername, newPassword)
    : { success: true };

  if (res && res.success) {
    sessionStorage.setItem('admin_user', newUsername);
    closeAdminModal('change-admin-cred-modal');
    alert(`✅ Admin Credentials Updated Successfully!\n\nNew Username: ${newUsername}\nNew Password: ${newPassword}`);
    if (typeof renderSuperAdminCredentials === 'function') {
      await renderSuperAdminCredentials();
    }
  } else {
    alert(`❌ Failed to update credentials: ${res.message || 'Error'}`);
  }
}

window.openChangeAdminCredentialsModal = openChangeAdminCredentialsModal;
window.handleCurrentAdminCredUpdate = handleCurrentAdminCredUpdate;



