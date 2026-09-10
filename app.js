// App State
let currentState = {
  isLoggedIn: false,
  phoneNumber: '',
  userBalance: 12850.00,
  spinsRemaining: 0,
  activeScreen: 'login',
  activeTab: 'home',
  currentSlide: 0,
  captchaResult: 128,
  currentUserId: '',
  depositAmount: 1000,
  activePaymentMethods: [],
  selectedMethodObj: null,
  cashierTimer: null
};

// --- 100% MOBILE ANTI-ZOOM GESTURE & PINCH PREVENTION ---
// Prevent iOS Safari & Android pinch gesture zoom
document.addEventListener('gesturestart', function (e) {
  e.preventDefault();
}, { passive: false });
document.addEventListener('gesturechange', function (e) {
  e.preventDefault();
}, { passive: false });
document.addEventListener('gestureend', function (e) {
  e.preventDefault();
}, { passive: false });

// Prevent 2+ fingers multi-touch pinch zoom
document.addEventListener('touchmove', function (e) {
  if (e.touches && e.touches.length > 1) {
    e.preventDefault();
  }
}, { passive: false });

// Prevent rapid double-tap to zoom
let lastTouchEndTime = 0;
document.addEventListener('touchend', function (event) {
  const now = Date.now();
  if (now - lastTouchEndTime <= 300) {
    if (!event.target || !['INPUT', 'TEXTAREA', 'SELECT', 'BUTTON', 'A'].includes(event.target.tagName)) {
      event.preventDefault();
    }
  }
  lastTouchEndTime = now;
}, { passive: false });

// Initialize Application
document.addEventListener('DOMContentLoaded', async () => {
  refreshCaptcha();
  startCarouselTimer();
  await checkUserSessionOnLoad();
  await updateRealtimeOnlineUsersDisplay();
  if (typeof syncGamesUIWithStatus === 'function') await syncGamesUIWithStatus();
  setInterval(updateRealtimeOnlineUsersDisplay, 5000);
  setInterval(() => {
    if (typeof syncGamesUIWithStatus === 'function') syncGamesUIWithStatus();
  }, 3000);
});


async function updateRealtimeOnlineUsersDisplay() {
  const el = document.getElementById('realtime-online-users-val');
  if (!el) return;
  const count = typeof dbGetRealtimeActiveUsersCount === 'function' ? await dbGetRealtimeActiveUsersCount() : 5;
  el.textContent = `${count.toLocaleString()}`;
}

// Update Browser URL Bar with Route Hash (/#home, /#earn, /#deposit, /#mine, etc.)
function updateBrowserUrlRoute() {
  try {
    if (!window.history || !window.history.replaceState) return;
    const screen = currentState.activeScreen || 'home';
    const tab = currentState.activeTab || 'home';

    let route = 'home';
    if (screen === 'home') {
      route = tab || 'home';
    } else {
      route = screen;
    }

    const cleanUrl = window.location.protocol + "//" + window.location.host + window.location.pathname + "#" + route;
    window.history.replaceState({ screen, tab, route }, '', cleanUrl);
  } catch (e) { }
}

// Handle Direct Hash Navigation (e.g. #earn, #deposit, #mine)
function handleUrlHashRouting() {
  try {
    const hash = (window.location.hash || '').replace('#', '').trim().toLowerCase();
    if (!hash) return;

    const validTabs = ['home', 'promo', 'wheel', 'earn', 'mine'];
    const validScreens = ['login', 'register', 'deposit', 'withdraw', '10x-game', 'flip-coin', 'dragon-tiger', 'tx-history', 'bet-records'];

    if (!currentState.isLoggedIn) {
      if (hash === 'login') {
        switchScreen('login');
        return;
      }
      if (hash === 'register') {
        switchScreen('register');
        return;
      }
      if (hash !== 'home') {
        showModal('🔒 Login Required', 'Please login or register to access this section.');
        switchScreen('login');
        return;
      }
    }

    if (validTabs.includes(hash)) {
      switchScreen('home');
      if (typeof switchTab === 'function') switchTab(hash);
    } else if (validScreens.includes(hash)) {
      switchScreen(hash);
      if (hash === 'flip-coin' && typeof initFlipCoinGame === 'function') initFlipCoinGame();
      if (hash === 'dragon-tiger' && typeof initDragonTigerGame === 'function') initDragonTigerGame();
      if (hash === '10x-game' && typeof init10xGame === 'function') init10xGame();
    }
  } catch (e) { }
}
window.addEventListener('hashchange', handleUrlHashRouting);

// Save active screen and active tab state to SessionStorage & Update Browser Route
function saveCurrentPageState() {
  const screen = currentState.activeScreen || 'home';
  const tab = currentState.activeTab || 'home';

  sessionStorage.setItem('dubai10x_active_screen', screen);
  sessionStorage.setItem('dubai10x_active_tab', tab);
  sessionStorage.setItem('amiriwin_active_screen', screen);
  sessionStorage.setItem('amiriwin_active_tab', tab);

  const savedSession = sessionStorage.getItem('dubai10x_user_session') || sessionStorage.getItem('amiriwin_user_session');
  if (savedSession) {
    try {
      const sess = JSON.parse(savedSession);
      sess.activeScreen = screen;
      sess.activeTab = tab;
      sessionStorage.setItem('dubai10x_user_session', JSON.stringify(sess));
      sessionStorage.setItem('amiriwin_user_session', JSON.stringify(sess));
    } catch (e) { }
  }

  updateBrowserUrlRoute();
}

// Check Session on Page Load (Persists Login Across Browser Tab Sessions)
async function checkUserSessionOnLoad() {
  const savedSession = sessionStorage.getItem('dubai10x_user_session') || sessionStorage.getItem('amiriwin_user_session') || localStorage.getItem('dubai10x_user_session') || localStorage.getItem('amiriwin_user_session');
  const storedScreen = sessionStorage.getItem('dubai10x_active_screen') || sessionStorage.getItem('amiriwin_active_screen');
  const storedTab = sessionStorage.getItem('dubai10x_active_tab') || sessionStorage.getItem('amiriwin_active_tab');

  const hashScreen = (window.location.hash || '').replace('#', '').trim().toLowerCase();
  const validScreenList = ['flip-coin', 'dragon-tiger', '10x-game', 'deposit', 'withdraw', 'cashier', 'login', 'register'];

  if (savedSession) {
    try {
      const session = JSON.parse(savedSession);

      if (session && session.isLoggedIn && session.phoneNumber) {
        currentState.isLoggedIn = true;
        currentState.phoneNumber = session.phoneNumber;
        currentState.currentUserId = session.currentUserId || `USR_${session.phoneNumber.slice(-6)}`;
        currentState.userBalance = session.userBalance || 12850.00;

        updateUserHeader();

        let restoreScreen = session.activeScreen || storedScreen || 'home';
        if (validScreenList.includes(hashScreen)) {
          restoreScreen = hashScreen;
        }

        const restoreTab = session.activeTab || storedTab || 'home';

        if (restoreScreen === 'withdraw') {
          openWithdrawScreen();
        } else if (restoreScreen === 'deposit') {
          switchScreen('deposit');
        } else if (restoreScreen === 'cashier') {
          switchScreen('cashier');
        } else if (restoreScreen === '10x-game') {
          switchScreen('10x-game');
          if (typeof init10xGame === 'function') init10xGame();
        } else if (restoreScreen === 'flip-coin') {
          switchScreen('flip-coin');
          if (typeof initFlipCoinGame === 'function') initFlipCoinGame();
        } else if (restoreScreen === 'dragon-tiger') {
          switchScreen('dragon-tiger');
          if (typeof initDragonTigerGame === 'function') initDragonTigerGame();
        } else if (restoreScreen === 'login') {
          switchScreen('login');
        } else if (restoreScreen === 'register') {
          switchScreen('register');
        } else {
          switchScreen('home');
          await switchTab(restoreTab);
        }

        // Sync with Supabase DB asynchronously in background & start real-time active status heartbeat
        dbGetUserByPhone(session.phoneNumber).then(dbUser => {
          if (!dbUser) {
            handleLogoutUser(false);
            showModal('🚫 Account Removed', 'Your account has been deleted by Administrator.');
            return;
          }
          if (dbUser.status === 'Suspended') {
            handleLogoutUser(false);
            showModal('🚫 Account Suspended', 'Your account has been suspended by Admin. Please contact customer support.');
            return;
          }

          // Single Active Session Check
          const mySessionToken = sessionStorage.getItem('dubai10x_current_session_token') || sessionStorage.getItem('amiriwin_current_session_token') || localStorage.getItem('dubai10x_current_session_token') || localStorage.getItem('amiriwin_current_session_token');
          if (dbUser.current_session_token && mySessionToken && dbUser.current_session_token !== mySessionToken) {
            handleLogoutUser(false);
            showModal('🔒 Logged Out Elsewhere', 'Your account was logged in from another device. Please log in again.');
            return;
          }

          currentState.userBalance = dbUser.balance;
          updateUserHeader();
          startActiveUserStatusHeartbeat();
        }).catch(err => console.warn("Background session sync error:", err));

        return;
      }
    } catch (err) {
      console.warn("Session restore error:", err);
    }
  }

  // If not logged in, ALWAYS default directly to Home screen (Home Tab only)
  currentState.isLoggedIn = false;
  updateUserHeader();

  if (hashScreen === 'login') {
    switchScreen('login');
  } else if (hashScreen === 'register') {
    switchScreen('register');
  } else {
    switchScreen('home');
    await switchTab('home');
  }
}

// Screen Switcher (login | register | home | deposit | cashier)
function switchScreen(screenId) {
  const protectedScreens = ['deposit', 'withdraw', 'cashier', '10x-game', 'flip-coin', 'dragon-tiger', 'tx-history', 'bet-records'];
  if (!currentState.isLoggedIn && protectedScreens.includes(screenId)) {
    showModal('🔒 Login Required', 'Please login or register to access games, wallet, and features!');
    switchScreen('login');
    return;
  }

  const screens = document.querySelectorAll('.screen');
  screens.forEach(screen => screen.classList.remove('active'));

  const targetScreen = document.getElementById(`screen-${screenId}`);
  if (targetScreen) {
    targetScreen.classList.add('active');
    currentState.activeScreen = screenId;
    targetScreen.scrollTop = 0;
  }


  if (screenId === 'deposit') {
    renderFrontendDepositMethods();
  }
  if (screenId === 'withdraw') {
    renderMyWithdrawalHistory();
    const balEl = document.getElementById('withdraw-balance-val');
    if (balEl) balEl.innerText = (currentState.userBalance || 0).toFixed(2);
  }
  if (screenId === 'tx-history') {
    switchTxHistoryTab(activeTxTab || 'deposit');
  }
  if (screenId === 'register') {
    captureReferralCodeFromUrl();
  }
  if (screenId === 'bet-records') {
    renderMyBetRecordsInScreen();
  }
  if (screenId === 'flip-coin') {
    if (typeof renderFlipBetHistory === 'function') renderFlipBetHistory();
  }
  if (screenId === 'dragon-tiger') {
    if (typeof initDragonTigerGame === 'function') initDragonTigerGame();
    if (typeof renderDTBetHistory === 'function') renderDTBetHistory();
  }

  // Show bottom navigation & floating elements ONLY on home screen tabs
  const bottomNav = document.querySelector('.bottom-nav');
  const downloadBanner = document.getElementById('app-download-banner');
  const telegramFloat = document.querySelector('.telegram-float');

  if (screenId === 'home') {
    if (bottomNav) bottomNav.style.display = 'flex';
    if (downloadBanner) downloadBanner.style.display = 'flex';
  } else {
    if (bottomNav) bottomNav.style.display = 'none';
    if (downloadBanner) downloadBanner.style.display = 'none';
  }

  saveCurrentPageState();
}

// Password Visibility Toggle
function togglePasswordVisibility(inputId, btnElement) {
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

// SMS OTP Countdown Timer Simulator
function triggerOtpCountdown() {
  const phone = document.getElementById('reg-phone').value;
  if (!phone || phone.length < 10) {
    showModal('📱 Invalid Number', 'Please enter a valid 10-digit mobile number to receive OTP.');
    return;
  }

  const btn = document.getElementById('send-otp-btn');
  btn.disabled = true;
  let countdown = 60;

  btn.innerText = `Resend (${countdown}s)`;
  showModal('📲 Verification Sent', `SMS Verification code sent to +91 ${phone}. Demo Code: 8942`);
  document.getElementById('reg-otp').value = '8942';

  const timer = setInterval(() => {
    countdown--;
    if (countdown <= 0) {
      clearInterval(timer);
      btn.innerText = 'Send';
      btn.disabled = false;
    } else {
      btn.innerText = `Resend (${countdown}s)`;
    }
  }, 1000);
}

// Dynamic Math Captcha Generator
function refreshCaptcha() {
  const num1 = Math.floor(Math.random() * 20) + 5;
  const num2 = Math.floor(Math.random() * 30) + 10;
  currentState.captchaResult = num1 + num2;

  const displayEl = document.getElementById('captcha-display');
  if (displayEl) {
    displayEl.innerText = `${num1} + ${num2} = ?`;
  }
}

// PASSWORD EYE ICON TOGGLE FUNCTION
function togglePasswordVisibility(inputId, btnEl) {
  const inputEl = document.getElementById(inputId);
  if (!inputEl) return;

  const iconEl = btnEl ? btnEl.querySelector('i') : null;

  if (inputEl.type === 'password') {
    inputEl.type = 'text';
    if (iconEl) {
      iconEl.classList.remove('fa-eye-slash');
      iconEl.classList.add('fa-eye');
    }
  } else {
    inputEl.type = 'password';
    if (iconEl) {
      iconEl.classList.remove('fa-eye');
      iconEl.classList.add('fa-eye-slash');
    }
  }
}

function captureReferralCodeFromUrl() {
  try {
    let refCode = '';
    const urlParams = new URLSearchParams(window.location.search);
    refCode = urlParams.get('code') || urlParams.get('ref') || urlParams.get('invite') || urlParams.get('invitation') || urlParams.get('c');

    if (!refCode && window.location.hash) {
      const hashStr = window.location.hash.includes('?') ? window.location.hash.split('?')[1] : window.location.hash;
      const hashParams = new URLSearchParams(hashStr);
      refCode = hashParams.get('code') || hashParams.get('ref') || hashParams.get('invite') || hashParams.get('invitation') || hashParams.get('c');
    }

    if (refCode) {
      const cleanRef = String(refCode).trim().replace('USR_', '');
      sessionStorage.setItem('amiriwin_pending_ref_code', cleanRef);
      localStorage.setItem('amiriwin_pending_ref_code', cleanRef);

      // ONLY switch to Register page if user is NOT currently logged in!
      const isUserLoggedIn = (typeof activeUser !== 'undefined' && activeUser && activeUser.id) || (typeof currentUserSession !== 'undefined' && currentUserSession && currentUserSession.isLoggedIn);
      if (!isUserLoggedIn && typeof switchScreen === 'function') {
        switchScreen('register');
      } else if (isUserLoggedIn && window.history && window.history.replaceState) {
        // Clean URL query params so future refreshes stay clean
        try {
          const cleanUrl = window.location.protocol + "//" + window.location.host + window.location.pathname;
          window.history.replaceState({ path: cleanUrl }, '', cleanUrl);
        } catch (err) { }
      }
    }

    const activeRef = refCode ? String(refCode).trim() : (sessionStorage.getItem('amiriwin_pending_ref_code') || localStorage.getItem('amiriwin_pending_ref_code') || '');

    const inviteInput = document.getElementById('reg-invite');
    if (inviteInput && activeRef) {
      inviteInput.value = activeRef;
    }
  } catch (e) { }
}
window.addEventListener('DOMContentLoaded', captureReferralCodeFromUrl);
captureReferralCodeFromUrl();

// Handle Login Form Submit
// Handle Login Form Submit (100% Database Driven Password Verification)
async function handleLoginSubmit(event) {
  if (event) event.preventDefault();
  const phone = (document.getElementById('login-phone')?.value || '').trim();
  const pass = (document.getElementById('login-password')?.value || document.getElementById('login-pass')?.value || '').trim();

  if (!phone || phone.length < 10) {
    showModal('⚠️ Invalid Phone', 'Please enter a valid 10-digit mobile number.');
    return;
  }

  if (!pass) {
    showModal('⚠️ Password Required', 'Please enter your account password.');
    return;
  }

  const cleanPhone = phone.slice(-10);

  try {
    let user = await dbGetUserByPhone(cleanPhone);

    if (!user) {
      showModal('❌ Account Not Found', `Mobile number +91 ${cleanPhone} is not registered in the database. Please click 'Register Now' to create a new account.`);
      return;
    }

    if (user.status === 'Suspended') {
      showModal('🚫 Account Suspended', 'Your account has been suspended by Admin. Please contact customer support.');
      return;
    }

    // Validate password from Database
    if (user.password && user.password !== pass) {
      showModal('❌ Wrong Password', 'The password you entered is incorrect. Please check and try again.');
      return;
    }

    // If user registered before password column was added, save their password on first login
    if (!user.password && pass) {
      await dbUpdateUser(user.id, { password: pass });
    }

    const finalUserId = user.id || user.user_id || `USR_${cleanPhone.slice(-6)}`;
    const finalBalance = typeof user.balance === 'number' ? user.balance : parseFloat(user.balance || 100.00);
    const finalSpins = user.spins_remaining !== undefined ? user.spins_remaining : (user.spins || 0);

    // Set Global Logged-in State
    currentState.isLoggedIn = true;
    currentState.phoneNumber = cleanPhone;
    currentState.currentUserId = finalUserId;
    currentState.userBalance = finalBalance;
    currentState.spinsRemaining = finalSpins;

    const spinsEl = document.getElementById('spins-left-count');
    if (spinsEl) spinsEl.innerText = finalSpins;

    // Generate unique session token for single active session control
    const newSessionToken = 'SESS_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9);
    sessionStorage.setItem('amiriwin_current_session_token', newSessionToken);
    localStorage.setItem('amiriwin_current_session_token', newSessionToken);

    // Save session token to Supabase DB users table (invalidates previous device sessions)
    await dbUpdateUser(user.id, { current_session_token: newSessionToken });

    // Save Session to SessionStorage & LocalStorage
    const sessionObj = {
      isLoggedIn: true,
      phoneNumber: cleanPhone,
      currentUserId: finalUserId,
      userBalance: finalBalance,
      spinsRemaining: finalSpins
    };
    sessionStorage.setItem('amiriwin_user_session', JSON.stringify(sessionObj));
    localStorage.setItem('amiriwin_user_session', JSON.stringify(sessionObj));

    // Update UI Header & Screens immediately
    updateUserHeader();
    startActiveUserStatusHeartbeat();
    switchScreen('home');
    closeModal();
    showModal('🎉 Login Successful', `Welcome back, +91 ${cleanPhone}!`);

  } catch (err) {
    console.error("Login Handler Error:", err);
    showModal('⚠️ Login Error', 'Could not verify login credentials. Please try again.');
  }
}

// REALTIME ACTIVE USER STATUS & SUSPENSION/DELETION HEARTBEAT MONITOR
let userStatusHeartbeatInterval = null;
let userStatusRealtimeChannel = null;

function stopActiveUserStatusHeartbeat() {
  if (userStatusHeartbeatInterval) {
    clearInterval(userStatusHeartbeatInterval);
    userStatusHeartbeatInterval = null;
  }
  if (userStatusRealtimeChannel && typeof userStatusRealtimeChannel.unsubscribe === 'function') {
    try { userStatusRealtimeChannel.unsubscribe(); } catch (e) { }
    userStatusRealtimeChannel = null;
  }
}

function startActiveUserStatusHeartbeat() {
  stopActiveUserStatusHeartbeat();

  if (!currentState.isLoggedIn || !currentState.phoneNumber) return;

  const cleanPhone = String(currentState.phoneNumber).slice(-10);

  // 1. Setup Supabase Realtime Listener for Instant Single-Device Logout & Status Updates
  if (typeof supabaseClient !== 'undefined' && supabaseClient && cleanPhone) {
    try {
      userStatusRealtimeChannel = supabaseClient
        .channel(`user_status_${cleanPhone}_${Date.now()}`)
        .on('postgres_changes', {
          event: 'UPDATE',
          schema: 'public',
          table: 'users',
          filter: `phone=eq.${cleanPhone}`
        }, (payload) => {
          if (payload && payload.new) {
            const updatedUser = payload.new;
            const currentLocalToken = sessionStorage.getItem('amiriwin_current_session_token') || localStorage.getItem('amiriwin_current_session_token');

            // Case A: Logged in on another device (Session Token mismatch)
            if (updatedUser.current_session_token && currentLocalToken && updatedUser.current_session_token !== currentLocalToken) {
              stopActiveUserStatusHeartbeat();
              handleLogoutUser(false);
              showModal('🔒 Logged Out Elsewhere', 'Your account was logged in from another device. This session has been terminated for security.');
              return;
            }

            // Case B: Account Suspended by Admin
            if (updatedUser.status === 'Suspended') {
              stopActiveUserStatusHeartbeat();
              handleLogoutUser(false);
              showModal('🚫 Account Suspended', 'Your account has been suspended by Administrator. Please contact customer support.');
              return;
            }

            // Wallet Balance Auto-Sync
            if (typeof updatedUser.balance === 'number' && Math.abs(currentState.userBalance - parseFloat(updatedUser.balance)) > 0.01) {
              currentState.userBalance = parseFloat(updatedUser.balance);
              updateUserHeader();
            }
          }
        })
        .subscribe();
    } catch (err) {
      console.warn("Supabase Realtime User Status Subscription Warning:", err);
    }
  }

  // 2. Heartbeat Polling Monitor (Runs every 2.5 seconds)
  userStatusHeartbeatInterval = setInterval(async () => {
    if (!currentState.isLoggedIn || !currentState.phoneNumber) return;

    try {
      const dbUser = await dbGetUserByPhone(currentState.phoneNumber);

      // Case 1: User deleted by Admin from Database
      if (!dbUser) {
        stopActiveUserStatusHeartbeat();
        handleLogoutUser(false);
        showModal('🚫 Account Removed', 'Your account has been deleted by Administrator.');
        return;
      }

      // Case 2: User suspended by Admin from Database
      if (dbUser.status === 'Suspended') {
        stopActiveUserStatusHeartbeat();
        handleLogoutUser(false);
        showModal('🚫 Account Suspended', 'Your account has been suspended by Administrator. Please contact customer support.');
        return;
      }

      // Case 3: Single Active Session Violation (Logged in from another device)
      const mySessionToken = sessionStorage.getItem('amiriwin_current_session_token') || localStorage.getItem('amiriwin_current_session_token');
      if (dbUser.current_session_token && mySessionToken && dbUser.current_session_token !== mySessionToken) {
        stopActiveUserStatusHeartbeat();
        handleLogoutUser(false);
        showModal('🔒 Logged Out Elsewhere', 'Your account was logged in from another device. This session has been terminated for security.');
        return;
      }

      // Live Wallet Balance Auto-Sync
      if (typeof dbUser.balance === 'number' && Math.abs(currentState.userBalance - dbUser.balance) > 0.01) {
        if (dbUser.balance > 25000) {
          dbUser.balance = 990.00;
          if (typeof dbUpdateUser === 'function') {
            dbUpdateUser(dbUser.id, { balance: 990.00 }).catch(e => console.warn(e));
          }
        }
        currentState.userBalance = dbUser.balance;
        updateUserHeader();
      }
    } catch (e) {
      console.warn("User status heartbeat warning:", e);
    }
  }, 2500);
}

let registerOtpTimer = null;

async function triggerOtpCountdown() {
  const email = document.getElementById('reg-email')?.value.trim();
  const sendBtn = document.getElementById('send-otp-btn');

  if (!email || !email.includes('@') || !email.includes('.')) {
    showModal('⚠️ Invalid Email ID', 'Please enter a valid Email ID above to receive the verification code.');
    return;
  }

  showModal('⏳ Sending Code...', 'Sending 6-digit verification code to your email...');

  const result = await dbSendRegistrationEmailOTP(email);

  const genericModal = document.getElementById('modal-generic');
  if (genericModal) genericModal.style.display = 'none';

  if (!result.success) {
    showModal('❌ Send Failed', result.message);
    return;
  }

  showModal('📩 Verification Code Sent!', result.message);

  if (sendBtn) {
    sendBtn.disabled = true;
    let timeLeft = 60;
    sendBtn.innerText = `Resend (${timeLeft}s)`;

    if (registerOtpTimer) clearInterval(registerOtpTimer);
    registerOtpTimer = setInterval(() => {
      timeLeft--;
      if (timeLeft <= 0) {
        clearInterval(registerOtpTimer);
        sendBtn.disabled = false;
        sendBtn.innerText = 'Send';
      } else {
        sendBtn.innerText = `Resend (${timeLeft}s)`;
      }
    }, 1000);
  }
}

// Handle Register Form Submit (Saves Password & Email directly into Supabase Database)
async function handleRegisterSubmit(event) {
  event.preventDefault();
  const phone = document.getElementById('reg-phone')?.value.trim();
  const email = document.getElementById('reg-email')?.value.trim();
  const pass = document.getElementById('reg-pass')?.value.trim();
  const confirmPass = document.getElementById('reg-confirm-pass')?.value.trim();
  const captchaInput = document.getElementById('reg-captcha-input')?.value.trim();

  if (!phone || phone.length < 10) {
    showModal('⚠️ Invalid Phone Number', 'Please enter a valid 10-digit mobile number.');
    return;
  }

  if (!email || !email.includes('@') || !email.includes('.')) {
    showModal('⚠️ Invalid Email ID', 'Please enter a valid Email ID for verification.');
    return;
  }

  if (!pass || pass.length < 4) {
    showModal('⚠️ Weak Password', 'Password must be at least 4 characters long.');
    return;
  }

  if (pass !== confirmPass) {
    showModal('❌ Password Mismatch', 'Password and Confirm Password do not match.');
    return;
  }

  if (parseInt(captchaInput) !== currentState.captchaResult) {
    showModal('❌ Captcha Error', 'Incorrect Captcha answer. Please try again.');
    refreshCaptcha();
    return;
  }


  const cleanPhone = phone.slice(-10);

  // Check if phone number is already registered in Database
  const existingUser = await dbGetUserByPhone(cleanPhone);
  if (existingUser) {
    showModal('⚠️ Already Registered', `Mobile number +91 ${cleanPhone} is already registered. Please login with your password.`);
    switchScreen('login');
    return;
  }

  const pendingRef = sessionStorage.getItem('amiriwin_pending_ref_code') || localStorage.getItem('amiriwin_pending_ref_code') || '';
  const inviteInput = document.getElementById('reg-invite')?.value.trim() || pendingRef || '';

  // Fetch dynamic registration welcome bonus settings from Database
  const paymentSettings = await dbGetPaymentSettings();
  const welcomeBonusAmount = paymentSettings && paymentSettings.welcome_bonus !== undefined ? parseFloat(paymentSettings.welcome_bonus) : 100.00;

  // Register user into Supabase Database with password, email & dynamic welcome bonus
  const newUser = await dbAddUser(cleanPhone, pass, welcomeBonusAmount, 'VIP 1', inviteInput, email);

  currentState.isLoggedIn = true;
  currentState.phoneNumber = cleanPhone;
  currentState.currentUserId = newUser.id;
  currentState.userBalance = newUser.balance;

  // Generate unique session token for single active session control
  const newSessionToken = 'SESS_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9);
  sessionStorage.setItem('amiriwin_current_session_token', newSessionToken);
  localStorage.setItem('amiriwin_current_session_token', newSessionToken);

  // Save session token to Supabase DB users table
  await dbUpdateUser(newUser.id, { current_session_token: newSessionToken });

  // Save Session to SessionStorage & LocalStorage
  const sessionObj = {
    isLoggedIn: true,
    phoneNumber: cleanPhone,
    currentUserId: newUser.id,
    userBalance: newUser.balance
  };
  sessionStorage.setItem('amiriwin_user_session', JSON.stringify(sessionObj));
  localStorage.setItem('amiriwin_user_session', JSON.stringify(sessionObj));

  updateUserHeader();
  startActiveUserStatusHeartbeat();

  showModal('🎉 Account Created', `Welcome to Dubai10X, +91 ${cleanPhone}! ₹${welcomeBonusAmount.toFixed(2)} welcome bonus credited to your wallet.`);

  setTimeout(() => {
    closeModal();
    switchScreen('home');
  }, 1200);
}

// Handle User Logout
function handleLogoutUser(showToast = true) {
  stopActiveUserStatusHeartbeat();
  sessionStorage.removeItem('amiriwin_user_session');
  sessionStorage.removeItem('amiriwin_active_screen');
  sessionStorage.removeItem('amiriwin_active_tab');
  sessionStorage.removeItem('amiriwin_current_session_token');
  localStorage.removeItem('amiriwin_user_session');
  localStorage.removeItem('amiriwin_current_session_token');
  currentState.isLoggedIn = false;
  currentState.phoneNumber = '';
  currentState.currentUserId = '';

  updateUserHeader();
  switchScreen('login');
  if (showToast) {
    showModal('👋 Logged Out', 'You have been logged out successfully.');
  }
}

// Realtime Centralized Wallet Balance Updater
function updateAllWalletBalanceDisplays() {
  const balVal = (currentState.userBalance || 0).toFixed(2);

  // 1. Main Home Header Balance
  const mainBalEl = document.getElementById('user-balance-val');
  if (mainBalEl) mainBalEl.innerText = balVal;

  // 2. 10X Card Game Header Balance
  const game10xBalEl = document.getElementById('game-10x-balance-val');
  if (game10xBalEl) game10xBalEl.innerText = balVal;

  // 3. Cashier Screen Balance
  const cashierBalEl = document.getElementById('cashier-balance-val');
  if (cashierBalEl) cashierBalEl.innerText = balVal;

  // 4. Deposit Screen Balance
  const depositBalEl = document.getElementById('deposit-balance-val');
  if (depositBalEl) depositBalEl.innerText = balVal;

  // 5. Account Profile Balance
  const profileBalEl = document.getElementById('profile-user-balance');
  if (profileBalEl) profileBalEl.innerText = balVal;
}

// REALTIME WALLET AUTO-SYNC (Polls DB every 2 seconds for instant updates)
setInterval(async () => {
  if (currentState.isLoggedIn && (currentState.currentUserId || currentState.phoneNumber)) {
    try {
      const users = await dbGetUsers();
      const currentUser = users.find(u => u.id === currentState.currentUserId || u.phone === currentState.phoneNumber);
      if (currentUser && currentUser.balance !== undefined && Math.abs(currentUser.balance - currentState.userBalance) > 0.01) {
        console.log(`⚡ Realtime Wallet Sync: ₹${currentState.userBalance} -> ₹${currentUser.balance}`);
        currentState.userBalance = currentUser.balance;
        updateAllWalletBalanceDisplays();
      }
    } catch (e) {
      console.warn('Realtime wallet sync warning:', e);
    }
  }
}, 2000);

// Curated High-Quality Cool Person Avatars (Assigned deterministically per user)
const coolUserAvatars = [
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=200&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=200&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=200&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=200&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=200&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1501196354995-cbb51c65aaea?w=200&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200&auto=format&fit=crop&q=80'
];

function getUserAvatarUrl(phone) {
  if (!phone) return coolUserAvatars[0];
  const digits = String(phone).replace(/\D/g, '');
  let sum = 0;
  for (let i = 0; i < digits.length; i++) {
    sum += parseInt(digits[i]) || 0;
  }
  const idx = sum % coolUserAvatars.length;
  return coolUserAvatars[idx];
}

// Update Header User Profile Pill & Mine Profile Card
function updateUserHeader() {
  const unloggedActions = document.getElementById('unlogged-actions');
  const loggedUserPill = document.getElementById('logged-user-pill');

  if (currentState.isLoggedIn) {
    if (unloggedActions) unloggedActions.style.display = 'none';
    if (loggedUserPill) loggedUserPill.style.display = 'flex';

    updateAllWalletBalanceDisplays();

    const cleanPhone = currentState.phoneNumber || '9898000000';
    const avatarUrl = getUserAvatarUrl(cleanPhone);

    const profileAvatarImg = document.getElementById('profile-avatar-img');
    if (profileAvatarImg) profileAvatarImg.src = avatarUrl;

    const headerAvatarImg = document.getElementById('header-avatar-img');
    if (headerAvatarImg) headerAvatarImg.src = avatarUrl;

    const profileUserId = document.getElementById('profile-user-id');
    if (profileUserId) {
      profileUserId.innerText = `User_${cleanPhone.slice(-4)}`;
    }

    const phoneEl = document.getElementById('profile-phone-display');
    if (phoneEl) {
      phoneEl.innerText = `+91 ${cleanPhone.length >= 10 ? cleanPhone.slice(0, 5) + ' ' + cleanPhone.slice(5) : cleanPhone}`;
    }

    // Generate unique 5-digit Invitation Code for User from phone / ID
    const inviteCode = cleanPhone.length >= 5 ? cleanPhone.slice(-5) : '89421';
    const inviteCodeEl = document.getElementById('profile-invite-code');
    if (inviteCodeEl) {
      inviteCodeEl.innerText = inviteCode;
    }

    const profileSpinsEl = document.getElementById('profile-spins-val');
    if (profileSpinsEl) {
      profileSpinsEl.innerText = currentState.spinsRemaining || 0;
    }

    const profileBalEl = document.getElementById('profile-balance-val');
    if (profileBalEl) {
      profileBalEl.innerText = (currentState.userBalance || 0).toFixed(2);
    }
  } else {
    if (unloggedActions) unloggedActions.style.display = 'flex';
    if (loggedUserPill) loggedUserPill.style.display = 'none';
  }
}

function copyProfileInviteCode() {
  const code = document.getElementById('profile-invite-code')?.innerText || '89421';
  navigator.clipboard.writeText(code).then(() => {
    showModal('📋 Code Copied!', `Invitation Code ${code} copied to clipboard! Share with friends to earn bonuses.`);
  }).catch(() => {
    showModal('📋 Invitation Code', `Your Invitation Code is: ${code}`);
  });
}

// --- DEPOSIT SCREEN (DYNAMIC CARDS FROM ADMIN PANEL ON/OFF TOGGLES) ---

async function openDepositScreen() {
  if (!currentState.isLoggedIn) {
    showModal('🔒 Login Required', 'Please login to deposit and receive cash rewards!');
    switchScreen('login');
    return;
  }

  await renderFrontendDepositMethods();
  updateDepositBonusCalc();
  switchScreen('deposit');
}

async function renderFrontendDepositMethods() {
  const gridContainer = document.getElementById('deposit-methods-grid');
  if (!gridContainer) return;

  let allMethods = [];
  try {
    allMethods = await dbGetPaymentMethods();
  } catch (e) {
    console.warn("Payment Methods Fetch Warning:", e);
  }

  if (!allMethods || !Array.isArray(allMethods) || allMethods.length === 0) {
    if (typeof memoryPaymentMethods !== 'undefined') {
      allMethods = memoryPaymentMethods;
    }
  }

  const activeMethods = (allMethods || []).filter(m => m.status === 'ON');

  currentState.activePaymentMethods = activeMethods;

  if (!activeMethods || activeMethods.length === 0) {
    gridContainer.innerHTML = `<div style="grid-column: span 3; text-align: center; color: var(--color-text-muted); padding: 14px; font-size: 12px; background: rgba(255,255,255,0.05); border-radius: 8px;">No active deposit methods available. (Admin has turned all methods OFF)</div>`;
    currentState.selectedMethodObj = null;
    return;
  }

  // Set default selected method if not set
  if (!currentState.selectedMethodObj || !activeMethods.some(m => m.id === currentState.selectedMethodObj.id)) {
    currentState.selectedMethodObj = activeMethods[0];
  }

  gridContainer.innerHTML = activeMethods.map(pm => {
    const isSelected = currentState.selectedMethodObj && currentState.selectedMethodObj.id === pm.id;

    let colorStyle = '#ffffff';
    const nameLower = (pm.name || '').toLowerCase();
    if (nameLower.includes('upi')) colorStyle = '#34d399';
    if (nameLower.includes('phonepe') || nameLower.includes('phonepay')) colorStyle = '#a855f7';
    if (nameLower.includes('paytm')) colorStyle = '#38bdf8';
    if (nameLower.includes('icash')) colorStyle = '#60a5fa';

    const upiSubtitle = pm.upi_id ? (pm.upi_id.split('@')[0] || pm.name) : pm.name;

    return `
      <div class="dep-method-card ${isSelected ? 'active' : ''}" onclick="selectDepositMethodById('${pm.id}')">
        <div class="check-icon"><i class="fa-solid fa-check"></i></div>
        <div class="method-icon-text" style="color: ${colorStyle}; font-weight: 800; font-size: 13px;">${pm.name}</div>
        <div class="method-subtitle" style="font-size: 10px; color: #94a3b8;">${upiSubtitle}</div>
      </div>
    `;
  }).join('');
}

function selectDepositMethodById(methodId) {
  const methodObj = currentState.activePaymentMethods.find(m => m.id === methodId);
  if (!methodObj) return;

  currentState.selectedMethodObj = methodObj;
  renderFrontendDepositMethods();
}

function selectAmountPreset(presetEl, amount) {
  const presets = document.querySelectorAll('.amount-preset-card');
  presets.forEach(p => p.classList.remove('active'));
  presetEl.classList.add('active');

  const input = document.getElementById('deposit-amount-input');
  if (input) input.value = amount;
  currentState.depositAmount = amount;
}

function updateDepositBonusCalc() {
  const input = document.getElementById('deposit-amount-input');
  const amount = parseFloat(input?.value) || 0;
  currentState.depositAmount = amount;
}

// Proceed from Deposit Screen to Cashier Checkout (Screenshot 3)
async function proceedToCashier() {
  if (!currentState.selectedMethodObj) {
    showModal('⚠️ Select Method', 'Please select an active payment method card.');
    return;
  }

  const amount = parseFloat(document.getElementById('deposit-amount-input').value);
  if (!amount || amount < 200 || amount > 20000) {
    showModal('⚠️ Invalid Amount', 'Deposit amount must be between ₹200 and ₹20,000 INR.');
    return;
  }

  currentState.depositAmount = amount;
  const selectedMethod = currentState.selectedMethodObj;

  // Update Cashier Amount Payable
  document.getElementById('cashier-payable-val').innerText = `₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;

  // Update UPI ID Display from selected method
  document.getElementById('cashier-upi-id-display').innerText = selectedMethod.upi_id;

  // Generate QR Code Image URL
  const qrImg = document.getElementById('cashier-qr-img');
  if (selectedMethod.qr_code_url && selectedMethod.qr_code_url.trim().length > 5) {
    qrImg.src = selectedMethod.qr_code_url;
  } else {
    const upiPayString = encodeURIComponent(`upi://pay?pa=${selectedMethod.upi_id}&pn=Dubai10X&am=${amount}&cu=INR`);
    qrImg.src = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${upiPayString}`;
  }

  // Start 5 minute Countdown Timer (04:54)
  startCashierTimer(300);

  switchScreen('cashier');
}

function startCashierTimer(seconds) {
  if (currentState.cashierTimer) clearInterval(currentState.cashierTimer);
  let timeRemaining = seconds;

  const timerEl = document.getElementById('cashier-countdown');

  currentState.cashierTimer = setInterval(() => {
    timeRemaining--;
    if (timeRemaining <= 0) {
      clearInterval(currentState.cashierTimer);
      timerEl.innerText = "00:00";
      showModal('⏱️ Order Expired', 'Payment time expired. Please initiate a new deposit.');
      switchScreen('deposit');
    } else {
      const mins = String(Math.floor(timeRemaining / 60)).padStart(2, '0');
      const secs = String(timeRemaining % 60).padStart(2, '0');
      timerEl.innerText = `${mins}:${secs}`;
    }
  }, 1000);
}

function copyUpiId() {
  const upiId = currentState.selectedMethodObj ? currentState.selectedMethodObj.upi_id : 'dubai10x.pay@upi';
  navigator.clipboard.writeText(upiId);
  showModal('📋 UPI ID Copied', `UPI ID ${upiId} copied to clipboard!`);
}

function launchPaymentApp(appName) {
  const upiId = currentState.selectedMethodObj ? currentState.selectedMethodObj.upi_id : 'dubai10x.pay@upi';
  const amount = currentState.depositAmount || 1000;
  const lowerApp = (appName || '').toLowerCase();

  let targetUrl = `upi://pay?pa=${upiId}&pn=Dubai10X&am=${amount}&cu=INR`;

  if (lowerApp.includes('paytm')) {
    targetUrl = `paytmmp://pay?pa=${upiId}&pn=Dubai10X&am=${amount}&cu=INR`;
  } else if (lowerApp.includes('phonepe') || lowerApp.includes('phone')) {
    targetUrl = `phonepe://pay?pa=${upiId}&pn=Dubai10X&am=${amount}&cu=INR`;
  } else if (lowerApp.includes('gpay') || lowerApp.includes('google')) {
    targetUrl = `gpay://upi/pay?pa=${upiId}&pn=Dubai10X&am=${amount}&cu=INR`;
  }

  const tempLink = document.createElement('a');
  tempLink.href = targetUrl;
  tempLink.click();

  setTimeout(() => {
    window.location.href = targetUrl;
  }, 300);

  showModal('📲 Opening App', `Launching ${appName.toUpperCase()} app for ₹${amount} payment...`);
}

function downloadQrCode() {
  showModal('💾 Saving QR Code', 'Payment QR Code saved to device downloads!');
}

function openUtrHelp(e) {
  e.preventDefault();
  showModal('❓ What is UTR Number?', 'UTR (Unique Transaction Reference) is a 12-digit number generated after completing payment in PhonePe, Paytm, or Google Pay app.');
}

let currentDepositProofUrl = '';

function handleUtrProofSelect(inputElement) {
  const file = inputElement.files && inputElement.files[0];
  if (!file) return;

  const labelEl = document.getElementById('utr-proof-btn-label');
  if (labelEl) labelEl.innerText = 'Compressing Screenshot...';

  const reader = new FileReader();
  reader.onload = function (e) {
    const img = new Image();
    img.onload = function () {
      const canvas = document.createElement('canvas');
      const MAX_SIZE = 800;
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

      const base64Url = canvas.toDataURL('image/jpeg', 0.75);
      currentDepositProofUrl = base64Url;

      const previewImg = document.getElementById('utr-proof-preview-img');
      const previewContainer = document.getElementById('utr-proof-preview-container');
      if (previewImg) previewImg.src = base64Url;
      if (previewContainer) previewContainer.style.display = 'block';
      if (labelEl) labelEl.innerText = `Screenshot Selected (${(file.size / 1024).toFixed(0)} KB)`;
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

function clearUtrProofFile() {
  currentDepositProofUrl = '';
  const fileInput = document.getElementById('utr-proof-file');
  const previewContainer = document.getElementById('utr-proof-preview-container');
  const previewImg = document.getElementById('utr-proof-preview-img');
  const labelEl = document.getElementById('utr-proof-btn-label');

  if (fileInput) fileInput.value = '';
  if (previewImg) previewImg.src = '';
  if (previewContainer) previewContainer.style.display = 'none';
  if (labelEl) labelEl.innerText = 'Choose Payment Screenshot Image';
}

// Submit 12-Digit UTR Ref Number & Payment Proof
async function submitUtrRef() {
  const utrInput = document.getElementById('utr-input')?.value.trim();

  if (!utrInput || utrInput.length !== 12 || isNaN(utrInput)) {
    showModal('❌ Invalid UTR', 'Please enter a valid 12-digit numeric UTR/Ref number from your payment app.');
    return;
  }

  const methodName = currentState.selectedMethodObj ? currentState.selectedMethodObj.name : 'UPI';

  // Submit UTR & Proof to Supabase Database
  await dbSubmitDepositUTR(
    currentState.currentUserId || 'USR_GUEST',
    currentState.phoneNumber || '9876543210',
    currentState.depositAmount,
    utrInput,
    methodName,
    currentDepositProofUrl
  );

  showModal('✅ Payment Submitted', `UTR ${utrInput} submitted for ₹${currentState.depositAmount} (${methodName})! Balance will be credited automatically upon verification.`);

  if (document.getElementById('utr-input')) document.getElementById('utr-input').value = '';
  clearUtrProofFile();

  setTimeout(() => {
    closeModal();
    switchScreen('home');
  }, 2000);
}

// Carousel Banner Logic
let carouselInterval;
function startCarouselTimer() {
  carouselInterval = setInterval(() => {
    currentState.currentSlide = (currentState.currentSlide + 1) % 2;
    updateCarouselUI();
  }, 4000);
}

function setCarouselSlide(index) {
  clearInterval(carouselInterval);
  currentState.currentSlide = index;
  updateCarouselUI();
  startCarouselTimer();
}

function updateCarouselUI() {
  const slides = document.getElementById('carousel-slides');
  const dots = document.querySelectorAll('.carousel-dots .dot');

  if (slides) {
    slides.style.transform = `translateX(-${currentState.currentSlide * 50}%)`;
  }
  dots.forEach((dot, idx) => {
    if (idx === currentState.currentSlide) {
      dot.classList.add('active');
    } else {
      dot.classList.remove('active');
    }
  });
}

async function renderPromoTabBonus() {
  const settings = await dbGetPaymentSettings();
  const bonusPct = settings.first_deposit_bonus !== undefined ? settings.first_deposit_bonus : 100;

  const tagEl = document.getElementById('promo-tag-bonus');
  const titleEl = document.getElementById('promo-title-bonus');
  const descEl = document.getElementById('promo-desc-bonus');

  if (tagEl) tagEl.innerText = `${bonusPct}% BONUS`;
  if (titleEl) titleEl.innerText = `First Deposit Cashback ${bonusPct}%`;
  if (descEl) descEl.innerText = bonusPct > 0 ? `Get extra ${bonusPct}% bonus credited automatically on your first deposit!` : 'Instant deposit credited directly to your wallet balance.';
}

async function renderEarnTabBonus() {
  const settings = await dbGetPaymentSettings();
  const refBonus = settings.referral_bonus !== undefined ? settings.referral_bonus : 50;

  const subtitleEl = document.getElementById('earn-subtitle-bonus');
  if (subtitleEl) {
    subtitleEl.innerText = `Earn ₹${refBonus} Cash Bonus on every friend invite!`;
  }
}

// Bottom Navigation Tab Switcher
async function switchTab(tabName) {
  if (tabName !== 'home' && !currentState.isLoggedIn) {
    showModal('🔒 Login Required', 'Please login or register to access this section!');
    switchScreen('login');
    return;
  }

  const tabs = document.querySelectorAll('.tab-view-container');
  tabs.forEach(tab => tab.classList.remove('active'));

  const targetTab = document.getElementById(`tab-${tabName}`);
  if (targetTab) {
    targetTab.classList.add('active');
  }

  const navTabs = document.querySelectorAll('.bottom-nav .nav-tab');
  navTabs.forEach(nav => nav.classList.remove('active'));

  navTabs.forEach(nav => {
    if (nav.innerText.toLowerCase().includes(tabName)) {
      nav.classList.add('active');
    }
  });

  currentState.activeTab = tabName;

  if (tabName === 'promo') {
    await renderPromoTabBonus();
  } else if (tabName === 'earn') {
    await renderEarnTabBonus();
    await loadUserReferralTeamCenter();
  }

  saveCurrentPageState();
}

// Interactive Fortune Wheel Spin (Weighted Probability Control)
let currentWheelRotation = 0;
let isSpinning = false;

function getWeightedWheelPrizeIndex() {
  // Slices:
  // 0: ₹5 (50% chance - High Frequency)
  // 1: ₹10 (39.5% chance - High Frequency)
  // 2: ₹25 (5% chance - Moderate)
  // 3: ₹50 (5% chance - Moderate)
  // 4: ₹100 (0.5% chance - Extremely Rare)
  // 5: ₹500 (0% chance - IMPOSSIBLE)
  // 6: ₹2,500 (0% chance - IMPOSSIBLE)
  // 7: ₹5,000 (0% chance - IMPOSSIBLE)
  const weights = [50, 39.5, 5, 5, 0.5, 0, 0, 0];
  const totalWeight = weights.reduce((a, b) => a + b, 0);
  let rand = Math.random() * totalWeight;

  for (let i = 0; i < weights.length; i++) {
    if (rand < weights[i]) return i;
    rand -= weights[i];
  }
  return 0;
}

async function spinLuckyWheel() {
  if (!currentState.isLoggedIn) {
    showModal('🔒 Login Required', 'Please login or register to spin the lucky wheel!');
    switchScreen('login');
    return;
  }

  if (isSpinning) return;
  if (currentState.spinsRemaining <= 0) {
    showModal('🎡 No Spins Available', 'You need a spin credit to spin the wheel. Get 1 Lucky Spin on First Deposit or Single Deposit of ₹15,000+!');
    return;
  }

  isSpinning = true;
  currentState.spinsRemaining--;
  const spinsEl = document.getElementById('spins-left-count');
  if (spinsEl) spinsEl.innerText = currentState.spinsRemaining;

  const slicePrizes = [5, 10, 25, 50, 100, 500, 2500, 5000];
  const targetIndex = getWeightedWheelPrizeIndex();
  const wonAmount = slicePrizes[targetIndex];

  // Calculate target rotation angle so pointer lands exactly on targetIndex
  const targetMod = (360 - (targetIndex * 45 + 22.5)) % 360;
  const currentMod = currentWheelRotation % 360;
  let neededModDelta = targetMod - currentMod;
  if (neededModDelta < 0) neededModDelta += 360;

  // Add 5 full rotations (1800deg) + random slight jitter inside the slice (±12deg)
  const jitter = (Math.random() * 24 - 12);
  const additionalRotation = 1800 + neededModDelta + jitter;

  currentWheelRotation += additionalRotation;

  const wheelGraphic = document.getElementById('wheel-graphic');
  wheelGraphic.style.transform = `rotate(${currentWheelRotation}deg)`;

  setTimeout(async () => {
    isSpinning = false;

    currentState.userBalance += wonAmount;
    document.getElementById('user-balance-val').innerText = currentState.userBalance.toFixed(2);

    if (currentState.currentUserId) {
      await dbUpdateUser(currentState.currentUserId, {
        balance: currentState.userBalance,
        spins_remaining: currentState.spinsRemaining
      });
    }

    showModal('🎁 Congratulations!', `You won ₹${wonAmount.toLocaleString()} Cash Bonus! Bonus credited directly to your database balance.`);
  }, 4000);
}

// Category Filter in Top Games
function filterCategory(element, category) {
  const pills = document.querySelectorAll('.category-bar .cat-pill');
  pills.forEach(p => p.classList.remove('active'));
  element.classList.add('active');

  const container = document.getElementById('top-games-container');
  if (category === 'all') {
    container.innerHTML = `
      <div class="list-game-card" onclick="launchGame('Wingo Color Prediction')">
        <div class="list-left">
          <div class="list-thumb card-wingo">🔮</div>
          <div class="list-info">
            <div class="list-title">Wingo 3Min Color Prediction</div>
            <div class="list-players"><i class="fa-solid fa-user-group" style="font-size: 10px;"></i> 142,850 online</div>
          </div>
        </div>
        <button class="btn-play-mini">Play</button>
      </div>
      <div class="list-game-card" onclick="launchGame('Aviator Crash')">
        <div class="list-left">
          <div class="list-thumb card-aviator">🚀</div>
          <div class="list-info">
            <div class="list-title">Aviator Pro Crash Multiplier</div>
            <div class="list-players"><i class="fa-solid fa-user-group" style="font-size: 10px;"></i> 98,420 online</div>
          </div>
        </div>
        <button class="btn-play-mini">Play</button>
      </div>
    `;
  } else {
    container.innerHTML = `
      <div class="list-game-card" onclick="launchGame('777 Fortune Slots')">
        <div class="list-left">
          <div class="list-thumb card-slots">👑</div>
          <div class="list-info">
            <div class="list-title">777 Empire Fortune Slots</div>
            <div class="list-players"><i class="fa-solid fa-user-group" style="font-size: 10px;"></i> 64,110 online</div>
          </div>
        </div>
        <button class="btn-play-mini">Play</button>
      </div>
    `;
  }
}

// --- GAME STATUS UI SYNC & LAUNCH CONTROLLER ---
async function syncGamesUIWithStatus() {
  const statusMap = typeof dbGetGamesStatus === 'function' ? await dbGetGamesStatus() : (currentState.gamesStatus || {});
  currentState.gamesStatus = statusMap;

  // 10X Card Game
  const box10x = document.getElementById('game-showcase-10x');
  const btn10x = document.getElementById('btn-game-10x');
  const tag10x = document.getElementById('tag-game-10x');

  if (box10x && btn10x && tag10x) {
    if (statusMap['10x'] === 'OFF') {
      box10x.classList.add('game-card-off');
      btn10x.innerText = '🔒 MAINTENANCE';
      tag10x.innerText = '⏸️ OFF';
    } else {
      box10x.classList.remove('game-card-off');
      btn10x.innerText = '🎮 PLAY NOW 🚀';
      tag10x.innerText = '🔥 HOT';
    }
  }

  // Flip Coin 2X
  const boxCoin = document.getElementById('game-showcase-coinflip');
  const btnCoin = document.getElementById('btn-game-coinflip');
  const tagCoin = document.getElementById('tag-game-coinflip');

  if (boxCoin && btnCoin && tagCoin) {
    if (statusMap['coinflip'] === 'OFF') {
      boxCoin.classList.add('game-card-off');
      btnCoin.innerText = '🔒 MAINTENANCE';
      tagCoin.innerText = '⏸️ OFF';
    } else {
      boxCoin.classList.remove('game-card-off');
      btnCoin.innerText = '🎮 PLAY NOW 🚀';
      tagCoin.innerText = '🔥 HOT';
    }
  }

  // Dragon vs Tiger 3 Card Poker
  const boxDT = document.getElementById('game-showcase-dragontiger');
  const btnDT = document.getElementById('btn-game-dragontiger');
  const tagDT = document.getElementById('tag-game-dragontiger');

  if (boxDT && btnDT && tagDT) {
    if (statusMap['dragontiger'] === 'ON') {
      boxDT.classList.remove('game-card-off', 'coming-soon-box');
      btnDT.innerText = '🎮 PLAY NOW 🚀';
      btnDT.style.background = 'linear-gradient(135deg, #f5a623 0%, #d97706 100%)';
      btnDT.style.color = '#ffffff';
      tagDT.innerText = '🔥 HOT';
      tagDT.style.background = 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)';
    } else {
      boxDT.classList.add('coming-soon-box');
      btnDT.innerText = '⏳ COMING SOON';
      btnDT.style.background = 'linear-gradient(135deg, #475569 0%, #334155 100%)';
      btnDT.style.color = '#cbd5e1';
      tagDT.innerText = '⏳ SOON';
      tagDT.style.background = 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)';
    }
  }

  // Auto-Kick out if user is inside a game screen that gets turned OFF
  if (currentState.activeScreen === '10x-game' && statusMap['10x'] === 'OFF') {
    switchScreen('home');
    showModal('🚫 Game Turned OFF', '10 Card 10X Game is currently turned OFF by Admin for maintenance.');
  } else if (currentState.activeScreen === 'flip-coin' && statusMap['coinflip'] === 'OFF') {
    switchScreen('home');
    showModal('🚫 Game Turned OFF', 'Flip Coin 2X Game is currently turned OFF by Admin for maintenance.');
  } else if (currentState.activeScreen === 'dragon-tiger' && statusMap['dragontiger'] === 'OFF') {
    switchScreen('home');
    showModal('🚫 Game Turned OFF', 'Dragon vs Tiger Game is currently turned OFF by Admin for maintenance.');
  }
}

window.syncGamesUIWithStatus = syncGamesUIWithStatus;

function launchGame(gameName) {
  if (!currentState.isLoggedIn) {
    showModal('🔒 Login Required', 'Please login or register to play games for real money!');
    switchScreen('login');
    return false;
  }

  const statusMap = currentState.gamesStatus || {};
  let gameKey = '';

  if (gameName.includes('10X') || gameName.includes('10 Card')) gameKey = '10x';
  else if (gameName.includes('Flip Coin')) gameKey = 'coinflip';
  else if (gameName.includes('Dragon') || gameName.includes('Tiger')) gameKey = 'dragontiger';
  else if (gameName.includes('Wingo')) gameKey = 'wingo';
  else if (gameName.includes('Aviator')) gameKey = 'aviator';
  else if (gameName.includes('Slots')) gameKey = 'slots';

  if (gameKey && statusMap[gameKey] === 'OFF' && gameKey !== 'dragontiger') {
    showModal(
      '🚫 Game Under Maintenance',
      `<strong>${gameName}</strong> is currently turned OFF by Admin for system updates & maintenance.<br><br>આ ગેમ હાલમાં એડમિન દ્વારા બંધ (Disabled) કરવામાં આવી છે. કૃપા કરીને થોડીવાર પછી પ્રયત્ન કરો!`
    );
    return false;
  }

  if (gameName.includes('Dragon') || gameName.includes('Tiger') || gameName === 'dragontiger') {
    if (statusMap['dragontiger'] === 'OFF') {
      showModal(
        '🚫 Game Under Maintenance',
        `<strong>Dragon vs Tiger</strong> is currently turned OFF by Admin for system updates & maintenance.<br><br>આ ગેમ હાલમાં એડમિન દ્વારા બંધ (Disabled) કરવામાં આવી છે. કૃપા કરીને થોડીવાર પછી પ્રયત્ન કરો!`
      );
      return false;
    }
    switchScreen('dragon-tiger');
    initDragonTigerGame();
    return;
  }

  if (gameName === 'Flip Coin' || gameName === 'Flip Coin 2X') {
    switchScreen('flip-coin');
    initFlipCoinGame();
    return;
  }
  
  if (gameName.includes('10X') || gameName.includes('10 Card')) {
    switchScreen('10x-game');
    if (typeof init10xGame === 'function') init10xGame();
    return;
  }

  showModal('🚀 Loading Game', `Launching ${gameName}... Connecting to high-speed game server.`);
}

// --- 10 CARD 10X GAME CLIENT CONTROLLER ---
const CARDS_13_DATA = [
  { id: 1, label: 'A♠', rank: 'A', suit: '♠', symbol: '♠', color: '#0f172a' },
  { id: 2, label: '2♥', rank: '2', suit: '♥', symbol: '♥', color: '#dc2626' },
  { id: 3, label: '3♣', rank: '3', suit: '♣', symbol: '♣', color: '#0f172a' },
  { id: 4, label: '4♦', rank: '4', suit: '♦', symbol: '♦', color: '#dc2626' },
  { id: 5, label: '5♠', rank: '5', suit: '♠', symbol: '♠', color: '#0f172a' },
  { id: 6, label: '6♥', rank: '6', suit: '♥', symbol: '♥', color: '#dc2626' },
  { id: 7, label: '7♣', rank: '7', suit: '♣', symbol: '♣', color: '#0f172a' },
  { id: 8, label: '8♦', rank: '8', suit: '♦', symbol: '♦', color: '#dc2626' },
  { id: 9, label: '9♠', rank: '9', suit: '♠', symbol: '♠', color: '#0f172a' },
  { id: 10, label: '10♥', rank: '10', suit: '♥', symbol: '♥', color: '#dc2626' }
];

let state10x = {
  selectedCardNumber: null,
  selectedChipAmount: 10,
  timerSecondsRemaining: 240,
  timerInterval: null,
  isSettling: false,
  lastSettledRoundId: null,
  betTypeMode: 'exact_10x', // 'exact_10x' OR 'category_2x'
  selectedCategoryFilter: 'all', // 'all', 'wild', 'pet'
  selected2xCategory: 'wild', // 'wild' OR 'pet'
  myCurrentRoundBets: [], // Local real-time tracking for user's placed bets in current round
  historyPage: 1
};

async function init10xGame() {
  state10x.selectedCardNumber = null;
  state10x.selectedChipAmount = 10;
  const manualInput = document.getElementById('game-10x-manual-amount');
  if (manualInput) manualInput.value = 10;

  const chips = document.querySelectorAll('.chip-btn');
  chips.forEach(c => c.classList.remove('active'));

  const betValEl = document.getElementById('game-10x-selected-bet-val');
  if (betValEl) betValEl.innerText = `₹10`;

  updateUser10xBalanceDisplay();
  await render10xCardsGrid();
  await render10xMyBetHistory();
  start10xRoundTimer();
}

function switchBetTypeMode(mode) {
  state10x.betTypeMode = mode;
  const btn10x = document.getElementById('tab-bet-type-10x');
  const btn2x = document.getElementById('tab-bet-type-2x');
  const cat2xBox = document.getElementById('category-2x-selector-box');

  if (mode === 'exact_10x') {
    if (btn10x) btn10x.classList.add('active');
    if (btn2x) btn2x.classList.remove('active');
    if (cat2xBox) cat2xBox.style.display = 'none';
  } else {
    if (btn2x) btn2x.classList.add('active');
    if (btn10x) btn10x.classList.remove('active');
    if (cat2xBox) cat2xBox.style.display = 'flex';
  }

  updateSelectedBetDisplayInfo();
  render10xCardsGrid();
}

function select2xCategory(cat) {
  state10x.selected2xCategory = cat;
  const btnWild = document.getElementById('btn-2x-wild');
  const btnPet = document.getElementById('btn-2x-pet');

  if (cat === 'wild') {
    if (btnWild) btnWild.classList.add('active');
    if (btnPet) btnPet.classList.remove('active');
  } else {
    if (btnPet) btnPet.classList.add('active');
    if (btnWild) btnWild.classList.remove('active');
  }

  updateSelectedBetDisplayInfo();
  render10xCardsGrid();
}

async function updateSelectedBetDisplayInfo() {
  const cardValEl = document.getElementById('game-10x-selected-card-val');
  const confirmBtn = document.getElementById('game-10x-confirm-btn');

  if (state10x.betTypeMode === 'category_2x') {
    const catNames = typeof dbGetCategoryNames === 'function' ? await dbGetCategoryNames() : (typeof getCategoryNamesSync === 'function' ? getCategoryNamesSync() : { cat1: 'Category 1', cat2: 'Category 2' });
    const catName = state10x.selected2xCategory === 'wild' ? `${catNames.cat1} (2X)` : `${catNames.cat2} (2X)`;
    if (cardValEl) cardValEl.innerText = `${catName}`;
    if (confirmBtn) confirmBtn.innerText = 'CONFIRM BET (2X) 🚀';
  } else {
    if (!state10x.selectedCardNumber) {
      if (cardValEl) cardValEl.innerText = 'None';
      if (confirmBtn) confirmBtn.innerText = 'CONFIRM BET (10X) 🚀';
      return;
    }

    const animals = (window.currentAnimalsConfigList && window.currentAnimalsConfigList.length > 0)
      ? window.currentAnimalsConfigList
      : (typeof memoryAnimalsConfig !== 'undefined' ? memoryAnimalsConfig : []);

    let animObj = animals.find(a => a.id === state10x.selectedCardNumber);
    if (!animObj && typeof dbGetAnimalsConfig === 'function') {
      try {
        const dbAnimals = await dbGetAnimalsConfig();
        window.currentAnimalsConfigList = dbAnimals;
        animObj = dbAnimals.find(a => a.id === state10x.selectedCardNumber);
      } catch (e) { }
    }

    const cardObj = CARDS_13_DATA.find(c => c.id === state10x.selectedCardNumber);
    const targetName = animObj ? animObj.name : (cardObj ? cardObj.label : `Card #${state10x.selectedCardNumber}`);

    if (cardValEl) cardValEl.innerText = targetName;
    if (confirmBtn) confirmBtn.innerText = 'CONFIRM BET (10X) 🚀';
  }
}

function updateUser10xBalanceDisplay() {
  updateAllWalletBalanceDisplays();
}

function selectChip(amount) {
  state10x.selectedChipAmount = amount;
  const chips = document.querySelectorAll('.chip-btn');
  chips.forEach(c => c.classList.remove('active'));
  if (event && event.target) event.target.classList.add('active');

  const betValEl = document.getElementById('game-10x-selected-bet-val');
  if (betValEl) betValEl.innerText = `₹${amount}`;
}

function handleManualChipInput(inputEl) {
  const chips = document.querySelectorAll('.chip-btn');
  chips.forEach(c => c.classList.remove('active'));

  const amount = parseFloat(inputEl.value) || 10;
  state10x.selectedChipAmount = amount;

  const betValEl = document.getElementById('game-10x-selected-bet-val');
  if (betValEl) betValEl.innerText = `₹${amount}`;
}

function multiplyBetAmount(factor) {
  let currentAmount = parseFloat(document.getElementById('game-10x-manual-amount')?.value) || state10x.selectedChipAmount || 10;

  if (factor === 2) {
    currentAmount = currentAmount * 2;
  } else if (factor === 0.5) {
    currentAmount = Math.max(10, Math.floor(currentAmount / 2));
  }

  if (currentAmount > 50000) currentAmount = 50000;

  state10x.selectedChipAmount = currentAmount;

  const manualInput = document.getElementById('game-10x-manual-amount');
  if (manualInput) manualInput.value = currentAmount;

  const chips = document.querySelectorAll('.chip-btn');
  chips.forEach(c => c.classList.remove('active'));

  const betValEl = document.getElementById('game-10x-selected-bet-val');
  if (betValEl) betValEl.innerText = `₹${currentAmount}`;
}

function selectCard10x(cardNumber) {
  if (state10x.isSettling) return;
  state10x.selectedCardNumber = cardNumber;

  if (state10x.betTypeMode === 'category_2x') {
    const cat = cardNumber <= 5 ? 'wild' : 'pet';
    select2xCategory(cat);
  } else {
    updateSelectedBetDisplayInfo();
    render10xCardsGrid();
  }
}

function clearCardSelection10x() {
  state10x.selectedCardNumber = null;
  updateSelectedBetDisplayInfo();
  render10xCardsGrid();
}

function generatePipPatternHtml(num, suit, color) {
  const p = (extraClass = '') => `<span class="pip ${extraClass}" style="color: ${color}">${suit}</span>`;

  switch (num) {
    case 2:
      return `<div class="pips-layout layout-2">${p()}${p('rev')}</div>`;
    case 3:
      return `<div class="pips-layout layout-3">${p()}${p()}${p('rev')}</div>`;
    case 4:
      return `<div class="pips-layout layout-4">
        <div class="pip-col">${p()}${p('rev')}</div>
        <div class="pip-col">${p()}${p('rev')}</div>
      </div>`;
    case 5:
      return `<div class="pips-layout layout-5">
        <div class="pip-col">${p()}${p('rev')}</div>
        <div class="pip-col center-pip">${p()}</div>
        <div class="pip-col">${p()}${p('rev')}</div>
      </div>`;
    case 6:
      return `<div class="pips-layout layout-6">
        <div class="pip-col">${p()}${p()}${p('rev')}</div>
        <div class="pip-col">${p()}${p()}${p('rev')}</div>
      </div>`;
    case 7:
      return `<div class="pips-layout layout-7">
        <div class="pip-col">${p()}${p()}${p('rev')}</div>
        <div class="pip-col center-pip">${p()}</div>
        <div class="pip-col">${p()}${p()}${p('rev')}</div>
      </div>`;
    case 8:
      return `<div class="pips-layout layout-8">
        <div class="pip-col">${p()}${p()}${p('rev')}</div>
        <div class="pip-col center-pips-2">${p()}${p('rev')}</div>
        <div class="pip-col">${p()}${p()}${p('rev')}</div>
      </div>`;
    case 9:
      return `<div class="pips-layout layout-9">
        <div class="pip-col">${p()}${p()}${p()}${p('rev')}</div>
        <div class="pip-col center-pip">${p()}</div>
        <div class="pip-col">${p()}${p()}${p()}${p('rev')}</div>
      </div>`;
    case 10:
      return `<div class="pips-layout layout-10">
        <div class="pip-col">${p()}${p()}${p()}${p('rev')}</div>
        <div class="pip-col center-pips-2">${p()}${p('rev')}</div>
        <div class="pip-col">${p()}${p()}${p()}${p('rev')}</div>
      </div>`;
    default:
      return '';
  }
}

function getAuthenticCardContent(c) {
  const rank = c.rank;
  const color = c.color;
  const suit = c.suit;

  if (rank === 'A') {
    return `<div class="card-ace-symbol" style="color: ${color}; font-size: 32px;">${suit}</div>`;
  }

  if (rank === 'J') {
    return `
      <div class="card-court-box-real">
        <svg viewBox="0 0 100 140" class="court-svg">
          <rect x="2" y="2" width="96" height="136" rx="4" fill="#ffffff" stroke="#0f172a" stroke-width="2"/>
          <rect x="6" y="6" width="88" height="128" fill="#fffbeb" stroke="#f5a623" stroke-width="1.5"/>
          <g transform="translate(10, 8)">
            <path d="M 28 35 Q 40 45 52 35 L 56 20 C 56 10 24 10 24 20 Z" fill="#d97706" stroke="#000" stroke-width="1"/>
            <circle cx="40" cy="26" r="14" fill="#fde047" stroke="#000" stroke-width="1"/>
            <path d="M 22 16 Q 40 2 58 16 L 54 24 L 26 24 Z" fill="#dc2626" stroke="#000" stroke-width="1.5"/>
            <path d="M 36 8 L 44 8 L 40 2 Z" fill="#fbbf24"/>
            <circle cx="34" cy="24" r="2" fill="#000"/><circle cx="46" cy="24" r="2" fill="#000"/>
            <path d="M 36 32 Q 40 35 44 32" stroke="#000" stroke-width="1.2" fill="none"/>
            <path d="M 16 40 L 64 40 L 56 64 L 24 64 Z" fill="#2563eb" stroke="#000" stroke-width="1.5"/>
            <path d="M 28 40 L 52 40 L 40 64 Z" fill="#dc2626" stroke="#000" stroke-width="1"/>
            <line x1="16" y1="18" x2="16" y2="64" stroke="#d97706" stroke-width="2.5"/>
            <path d="M 12 16 L 16 8 L 20 16 Z" fill="#94a3b8" stroke="#000" stroke-width="1"/>
          </g>
          <line x1="6" y1="70" x2="94" y2="70" stroke="#f5a623" stroke-width="2"/>
          <g transform="translate(90, 132) rotate(180)">
            <path d="M 28 35 Q 40 45 52 35 L 56 20 C 56 10 24 10 24 20 Z" fill="#d97706" stroke="#000" stroke-width="1"/>
            <circle cx="40" cy="26" r="14" fill="#fde047" stroke="#000" stroke-width="1"/>
            <path d="M 22 16 Q 40 2 58 16 L 54 24 L 26 24 Z" fill="#dc2626" stroke="#000" stroke-width="1.5"/>
            <path d="M 36 8 L 44 8 L 40 2 Z" fill="#fbbf24"/>
            <circle cx="34" cy="24" r="2" fill="#000"/><circle cx="46" cy="24" r="2" fill="#000"/>
            <path d="M 36 32 Q 40 35 44 32" stroke="#000" stroke-width="1.2" fill="none"/>
            <path d="M 16 40 L 64 40 L 56 64 L 24 64 Z" fill="#2563eb" stroke="#000" stroke-width="1.5"/>
            <path d="M 28 40 L 52 40 L 40 64 Z" fill="#dc2626" stroke="#000" stroke-width="1"/>
            <line x1="16" y1="18" x2="16" y2="64" stroke="#d97706" stroke-width="2.5"/>
            <path d="M 12 16 L 16 8 L 20 16 Z" fill="#94a3b8" stroke="#000" stroke-width="1"/>
          </g>
        </svg>
      </div>
    `;
  }

  if (rank === 'Q') {
    return `
      <div class="card-court-box-real">
        <svg viewBox="0 0 100 140" class="court-svg">
          <rect x="2" y="2" width="96" height="136" rx="4" fill="#ffffff" stroke="#0f172a" stroke-width="2"/>
          <rect x="6" y="6" width="88" height="128" fill="#fffbeb" stroke="#f5a623" stroke-width="1.5"/>
          <g transform="translate(10, 8)">
            <path d="M 25 30 Q 40 42 55 30 L 58 18 C 58 10 22 10 22 18 Z" fill="#1e293b" stroke="#000" stroke-width="1"/>
            <circle cx="40" cy="26" r="14" fill="#fde047" stroke="#000" stroke-width="1"/>
            <path d="M 22 16 L 28 2 L 40 12 L 52 2 L 58 16 Z" fill="#f5a623" stroke="#000" stroke-width="1.5"/>
            <circle cx="40" cy="8" r="2.5" fill="#dc2626"/>
            <circle cx="34" cy="24" r="2" fill="#000"/><circle cx="46" cy="24" r="2" fill="#000"/>
            <path d="M 37 32 Q 40 35 43 32" stroke="#dc2626" stroke-width="1.5" fill="none"/>
            <path d="M 16 40 L 64 40 L 56 64 L 24 64 Z" fill="#7e22ce" stroke="#000" stroke-width="1.5"/>
            <path d="M 28 40 L 52 40 L 40 64 Z" fill="#f5a623" stroke="#000" stroke-width="1"/>
            <circle cx="20" cy="48" r="4" fill="#ef4444"/><circle cx="20" cy="48" r="1.5" fill="#fbbf24"/>
          </g>
          <line x1="6" y1="70" x2="94" y2="70" stroke="#f5a623" stroke-width="2"/>
          <g transform="translate(90, 132) rotate(180)">
            <path d="M 25 30 Q 40 42 55 30 L 58 18 C 58 10 22 10 22 18 Z" fill="#1e293b" stroke="#000" stroke-width="1"/>
            <circle cx="40" cy="26" r="14" fill="#fde047" stroke="#000" stroke-width="1"/>
            <path d="M 22 16 L 28 2 L 40 12 L 52 2 L 58 16 Z" fill="#f5a623" stroke="#000" stroke-width="1.5"/>
            <circle cx="40" cy="8" r="2.5" fill="#dc2626"/>
            <circle cx="34" cy="24" r="2" fill="#000"/><circle cx="46" cy="24" r="2" fill="#000"/>
            <path d="M 37 32 Q 40 35 43 32" stroke="#dc2626" stroke-width="1.5" fill="none"/>
            <path d="M 16 40 L 64 40 L 56 64 L 24 64 Z" fill="#7e22ce" stroke="#000" stroke-width="1.5"/>
            <path d="M 28 40 L 52 40 L 40 64 Z" fill="#f5a623" stroke="#000" stroke-width="1"/>
            <circle cx="20" cy="48" r="4" fill="#ef4444"/><circle cx="20" cy="48" r="1.5" fill="#fbbf24"/>
          </g>
        </svg>
      </div>
    `;
  }

  if (rank === 'K') {
    return `
      <div class="card-court-box-real">
        <svg viewBox="0 0 100 140" class="court-svg">
          <rect x="2" y="2" width="96" height="136" rx="4" fill="#ffffff" stroke="#0f172a" stroke-width="2"/>
          <rect x="6" y="6" width="88" height="128" fill="#fffbeb" stroke="#f5a623" stroke-width="1.5"/>
          <g transform="translate(10, 8)">
            <path d="M 26 30 Q 40 44 54 30 L 58 18 C 58 10 22 10 22 18 Z" fill="#78350f" stroke="#000" stroke-width="1"/>
            <circle cx="40" cy="25" r="14" fill="#fde047" stroke="#000" stroke-width="1"/>
            <path d="M 20 16 L 26 2 L 40 10 L 54 2 L 60 16 Z" fill="#dc2626" stroke="#000" stroke-width="1.5"/>
            <path d="M 26 2 L 54 2" stroke="#f5a623" stroke-width="2"/>
            <circle cx="34" cy="23" r="2" fill="#000"/><circle cx="46" cy="23" r="2" fill="#000"/>
            <path d="M 28 30 Q 40 40 52 30" fill="#78350f" stroke="#000" stroke-width="1"/>
            <path d="M 16 38 L 64 38 L 56 64 L 24 64 Z" fill="#dc2626" stroke="#000" stroke-width="1.5"/>
            <path d="M 28 38 L 52 38 L 40 64 Z" fill="#f5a623" stroke="#000" stroke-width="1"/>
            <line x1="60" y1="10" x2="60" y2="60" stroke="#94a3b8" stroke-width="2.5"/>
            <line x1="55" y1="44" x2="65" y2="44" stroke="#fbbf24" stroke-width="2"/>
          </g>
          <line x1="6" y1="70" x2="94" y2="70" stroke="#f5a623" stroke-width="2"/>
          <g transform="translate(90, 132) rotate(180)">
            <path d="M 26 30 Q 40 44 54 30 L 58 18 C 58 10 22 10 22 18 Z" fill="#78350f" stroke="#000" stroke-width="1"/>
            <circle cx="40" cy="25" r="14" fill="#fde047" stroke="#000" stroke-width="1"/>
            <path d="M 20 16 L 26 2 L 40 10 L 54 2 L 60 16 Z" fill="#dc2626" stroke="#000" stroke-width="1.5"/>
            <path d="M 26 2 L 54 2" stroke="#f5a623" stroke-width="2"/>
            <circle cx="34" cy="23" r="2" fill="#000"/><circle cx="46" cy="23" r="2" fill="#000"/>
            <path d="M 28 30 Q 40 40 52 30" fill="#78350f" stroke="#000" stroke-width="1"/>
            <path d="M 16 38 L 64 38 L 56 64 L 24 64 Z" fill="#dc2626" stroke="#000" stroke-width="1.5"/>
            <path d="M 28 38 L 52 38 L 40 64 Z" fill="#f5a623" stroke="#000" stroke-width="1"/>
            <line x1="60" y1="10" x2="60" y2="60" stroke="#94a3b8" stroke-width="2.5"/>
            <line x1="55" y1="44" x2="65" y2="44" stroke="#fbbf24" stroke-width="2"/>
          </g>
        </svg>
      </div>
    `;
  }

  const num = parseInt(rank);
  if (num) {
    return generatePipPatternHtml(num, suit, color);
  }
  return '';
}

function update10xGridDomHelper(container, animalsConfig, roundBets = [], catNamesParam = null) {
  const catNames = catNamesParam || (typeof getCategoryNamesSync === 'function' ? getCategoryNamesSync() : { cat1: 'Bowler', cat2: 'Batsman' });

  const userWild2xTotal = roundBets.filter(b =>
    ((currentState.currentUserId && b.user_id === currentState.currentUserId) ||
      (currentState.phoneNumber && b.phone && b.phone.endsWith(currentState.phoneNumber.slice(-10)))) &&
    b.category === 'wild' && b.bet_type === 'category_2x'
  ).reduce((sum, b) => sum + (b.bet_amount || b.amount || 0), 0);

  const userPet2xTotal = roundBets.filter(b =>
    ((currentState.currentUserId && b.user_id === currentState.currentUserId) ||
      (currentState.phoneNumber && b.phone && b.phone.endsWith(currentState.phoneNumber.slice(-10)))) &&
    b.category === 'pet' && b.bet_type === 'category_2x'
  ).reduce((sum, b) => sum + (b.bet_amount || b.amount || 0), 0);

  const btnWild = document.getElementById('btn-2x-wild');
  const btnPet = document.getElementById('btn-2x-pet');

  if (btnWild) btnWild.innerText = `${catNames.cat1} (2X)${userWild2xTotal > 0 ? ` [My Bet: ₹${userWild2xTotal}]` : ''}`;
  if (btnPet) btnPet.innerText = `${catNames.cat2} (2X)${userPet2xTotal > 0 ? ` [My Bet: ₹${userPet2xTotal}]` : ''}`;

  const hasExistingCards = !!document.getElementById('card-13-item-1');
  let html = '';

  CARDS_13_DATA.forEach(c => {
    const animObj = (animalsConfig && animalsConfig.find(a => a.id === c.id)) || {
      name: c.label,
      category: c.id <= 5 ? 'wild' : 'pet',
      image_url: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='300' height='300' viewBox='0 0 300 300'><rect width='300' height='300' fill='%231e293b'/></svg>"
    };

    const cardBets = roundBets.filter(b => b.card_number === c.id);
    const totalBetAmt = cardBets.reduce((sum, b) => sum + (b.bet_amount || b.amount || 0), 0);

    const user10xBet = roundBets.filter(b =>
      ((currentState.currentUserId && b.user_id === currentState.currentUserId) ||
        (currentState.phoneNumber && b.phone && b.phone.endsWith(currentState.phoneNumber.slice(-10)))) &&
      b.card_number === c.id &&
      (b.bet_type === 'exact_10x' || b.betType === 'exact_10x')
    ).reduce((sum, b) => sum + (b.bet_amount || b.amount || 0), 0);

    const user2xBet = roundBets.filter(b =>
      ((currentState.currentUserId && b.user_id === currentState.currentUserId) ||
        (currentState.phoneNumber && b.phone && b.phone.endsWith(currentState.phoneNumber.slice(-10)))) &&
      ((b.category && b.category === animObj.category) || (!b.category && ((c.id <= 5 && b.card_number <= 5) || (c.id > 5 && b.card_number > 5)))) &&
      (b.bet_type === 'category_2x' || b.betType === 'category_2x')
    ).reduce((sum, b) => sum + (b.bet_amount || b.amount || 0), 0);

    let isSelected = '';
    if (state10x.betTypeMode === 'category_2x') {
      if (state10x.selected2xCategory === 'wild' && c.id <= 5) {
        isSelected = 'category-selected-wild';
      } else if (state10x.selected2xCategory === 'pet' && c.id > 5) {
        isSelected = 'category-selected-pet';
      }
    } else {
      isSelected = c.id === state10x.selectedCardNumber ? 'selected' : '';
    }

    const catBadgeText = animObj.category === 'wild' ? catNames.cat1 : catNames.cat2;
    const catBadgeClass = animObj.category === 'wild' ? 'wild' : 'pet';

    if (hasExistingCards) {
      const cardEl = document.getElementById(`card-13-item-${c.id}`);
      if (cardEl) {
        cardEl.className = `card-item-13 ${isSelected}`;

        const photoCard = cardEl.querySelector('.animal-photo-card');
        const imgEl = cardEl.querySelector('.animal-full-photo');
        if (imgEl && imgEl.getAttribute('data-img-src') !== animObj.image_url) {
          imgEl.setAttribute('data-img-src', animObj.image_url);
          imgEl.src = animObj.image_url;
        }

        const nameEl = cardEl.querySelector('.animal-name-text');
        if (nameEl && nameEl.innerText !== animObj.name) {
          nameEl.innerText = animObj.name;
        }

        const catBadgeEl = cardEl.querySelector('.animal-cat-badge');
        if (catBadgeEl) {
          catBadgeEl.className = `animal-cat-badge ${catBadgeClass}`;
          catBadgeEl.innerText = catBadgeText;
        }

        if (photoCard) {
          let b10 = photoCard.querySelector('.card-user-bet-badge.bet-10x');
          if (user10xBet > 0) {
            if (!b10) {
              b10 = document.createElement('div');
              b10.className = 'card-user-bet-badge bet-10x';
              photoCard.appendChild(b10);
            }
            b10.innerText = `🎯 10X: ₹${user10xBet}`;
          } else if (b10) {
            b10.remove();
          }

          let b2 = photoCard.querySelector('.card-user-bet-badge.bet-2x');
          if (user2xBet > 0) {
            if (!b2) {
              b2 = document.createElement('div');
              b2.className = 'card-user-bet-badge bet-2x';
              photoCard.appendChild(b2);
            }
            b2.innerText = `⚡ 2X: ₹${user2xBet}`;
          } else if (b2) {
            b2.remove();
          }

          let totalEl = photoCard.querySelector('.card-total-bets-badge');
          if (totalBetAmt > 0) {
            if (!totalEl) {
              totalEl = document.createElement('div');
              totalEl.className = 'card-total-bets-badge';
              photoCard.appendChild(totalEl);
            }
            totalEl.innerText = `₹${totalBetAmt}`;
          } else if (totalEl) {
            totalEl.remove();
          }
        }
      }
    } else {
      html += `
        <div id="card-13-item-${c.id}" class="card-item-13 ${isSelected}" onclick="selectCard10x(${c.id})">
          <div class="card-face-front animal-photo-card">
            <div class="animal-cat-badge ${catBadgeClass}">${catBadgeText}</div>
            ${user10xBet > 0 ? `<div class="card-user-bet-badge bet-10x">🎯 10X: ₹${user10xBet}</div>` : ''}
            ${user2xBet > 0 ? `<div class="card-user-bet-badge bet-2x">⚡ 2X: ₹${user2xBet}</div>` : ''}
            
            <img src="${animObj.image_url}" data-img-src="${animObj.image_url}" class="animal-full-photo">
            
            <div class="animal-name-banner">
              <div class="animal-name-text">${animObj.name}</div>
            </div>

            ${totalBetAmt > 0 ? `<div class="card-total-bets-badge">₹${totalBetAmt}</div>` : ''}
          </div>
        </div>
      `;
    }
  });

  if (!hasExistingCards && container) {
    container.innerHTML = html;
  }
}

async function render10xCardsGrid() {
  const container = document.getElementById('cards-13-container');
  if (!container) return;

  const sync = typeof getGlobalSynchronizedRoundInfo === 'function' ? getGlobalSynchronizedRoundInfo() : null;
  const roundIdEl = document.getElementById('game-10x-round-id');
  if (roundIdEl && sync) roundIdEl.innerText = `#${sync.roundNumber}`;

  const syncCatNames = typeof getCategoryNamesSync === 'function' ? getCategoryNamesSync() : { cat1: 'Category 1', cat2: 'Category 2' };
  const animalsConfig = (window.currentAnimalsConfigList && window.currentAnimalsConfigList.length > 0)
    ? window.currentAnimalsConfigList
    : (typeof getAnimalsConfigSync === 'function' ? getAnimalsConfigSync() : (typeof memoryAnimalsConfig !== 'undefined' ? memoryAnimalsConfig : []));

  // 1. Instant synchronous UI update (0ms, no network delay, zero blinking)
  update10xGridDomHelper(container, animalsConfig, [], syncCatNames);

  // 2. Background database synchronization
  try {
    const round = await dbGetCurrentRound10x();
    const roundBets = await dbGetBetsForRound10x(round.id);
    const dbAnimals = await dbGetAnimalsConfig();
    const freshCatNames = typeof dbGetCategoryNames === 'function' ? await dbGetCategoryNames() : syncCatNames;
    window.currentAnimalsConfigList = dbAnimals;

    if (roundIdEl) roundIdEl.innerText = `#${round.round_number || (sync ? sync.roundNumber : 60000)}`;

    update10xGridDomHelper(container, dbAnimals, roundBets, freshCatNames);
  } catch (err) {
    console.warn("Cards grid sync warning:", err);
  }
}

function start10xRoundTimer() {
  if (state10x.timerInterval) clearInterval(state10x.timerInterval);

  if (typeof dbGetTimerSettings === 'function') {
    dbGetTimerSettings().catch(e => console.warn(e));
  }

  const issueEl = document.getElementById('game-10x-issue-number');
  const timerEl = document.getElementById('game-10x-timer');
  const timerLabelEl = document.getElementById('game-10x-timer-label');
  const statusTag = document.getElementById('game-10x-status-tag');
  const resultBanner = document.getElementById('game-10x-result-banner');

  let lastDisplayedSec = -1;

  state10x.timerInterval = setInterval(() => {
    const sync = getGlobalSynchronizedRoundInfo();
    state10x.timerSecondsRemaining = sync.secondsRemaining;
    state10x.isResultPhase = sync.isResultPhase;

    if (lastDisplayedSec === sync.secondsRemaining) return;
    lastDisplayedSec = sync.secondsRemaining;

    // Auto-check DB timer settings every 3 seconds so unrefreshed browsers get instant Admin updates
    if (sync.secondsRemaining % 3 === 0 && typeof dbGetTimerSettings === 'function') {
      dbGetTimerSettings().catch(e => console.warn(e));
    }

    // Synchronize Round Issue Number across all users globally
    if (issueEl && issueEl.innerText !== `#${sync.roundNumber}`) {
      issueEl.innerText = `#${sync.roundNumber}`;
      state10x.myCurrentRoundBets = [];
      state10x.selectedCardNumber = null;
      updateSelectedBetDisplayInfo();
      render10xCardsGrid();
    }

    if (sync.isResultPhase) {
      // 30-SECOND RESULT REVEAL PHASE (NO BETS ALLOWED)
      if (state10x.lastSettledRoundId !== sync.roundId) {
        state10x.lastSettledRoundId = sync.roundId;
        state10x.isSettling = true;
        
        if (timerEl) timerEl.innerText = '00:00';
        if (timerLabelEl) {
          timerLabelEl.innerText = 'COUNTDOWN';
          timerLabelEl.style.color = '#ef4444';
        }

        state10x.selectedCardNumber = null;
        updateSelectedBetDisplayInfo();
        settleCurrent10xRound();
      }

      const mins = String(Math.floor(sync.secondsRemaining / 60)).padStart(2, '0');
      const secs = String(sync.secondsRemaining % 60).padStart(2, '0');
      if (timerEl) timerEl.innerText = `${mins}:${secs}`;
      if (timerLabelEl) {
        timerLabelEl.innerText = 'NEXT ROUND IN';
        timerLabelEl.style.color = '#fbbf24';
      }

      if (statusTag) {
        statusTag.innerText = '🎉 Result Revealed';
        statusTag.style.background = 'rgba(245, 158, 11, 0.2)';
        statusTag.style.color = '#fbbf24';
      }
    } else {
      // 120-SECOND BETTING & ROUND PHASE
      if (state10x.isSettling) {
        state10x.isSettling = false;
        if (resultBanner) resultBanner.style.display = 'none';
        render10xCardsGrid();
        render10xMyBetHistory();
      }

      const mins = String(Math.floor(sync.secondsRemaining / 60)).padStart(2, '0');
      const secs = String(sync.secondsRemaining % 60).padStart(2, '0');
      if (timerEl) timerEl.innerText = `${mins}:${secs}`;
      if (timerLabelEl) {
        timerLabelEl.innerText = 'COUNTDOWN';
        timerLabelEl.style.color = 'var(--color-text-muted)';
      }

      // Smooth Tick-Tick Sound throughout the entire countdown timer (Only plays when inside game screen)
      if (sync.secondsRemaining > 0 && currentState.activeScreen === '10x-game') {
        playTickSound();
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
  }, 250);
}

async function placeBet10x() {
  if (state10x.isPlacingBet) return;
  if (!currentState.isLoggedIn) {
    showModal('🔒 Login Required', 'Please login or register to place bets!');
    return;
  }

  state10x.isPlacingBet = true;

  try {
    const sync = getGlobalSynchronizedRoundInfo();

    if (sync.isResultPhase || state10x.isSettling) {
      showModal('⏳ Betting Closed', 'Result is currently being revealed. Please wait for the new round to start!');
      return;
    }

    if (sync.secondsRemaining <= 20) {
      showModal('⏳ Betting Closed', 'Betting is closed for the current round. Please wait for the next round!');
      return;
    }

    const betAmount = state10x.selectedChipAmount;
    if (currentState.userBalance < betAmount) {
      showModal('⚠️ Insufficient Balance', `Your wallet balance (₹${currentState.userBalance.toFixed(2)}) is insufficient for ₹${betAmount} bet. Please deposit funds!`);
      return;
    }

    const betType = state10x.betTypeMode || 'exact_10x';
    const category = state10x.selected2xCategory || 'wild';

    if (betType === 'exact_10x' && !state10x.selectedCardNumber) {
      showModal('⚠️ Card Required', 'Please click on a card to select it before placing your 10X bet!');
      return;
    }

    const betId = `BET_${Math.floor(100000 + Math.random() * 900000)}`;
    const result = await dbPlaceBet10x(currentState.currentUserId, currentState.phoneNumber, state10x.selectedCardNumber, betAmount, betType, category, betId);
    if (!result) {
      showModal('⚠️ Bet Failed', 'Could not place bet. Please try again.');
      return;
    }

    currentState.userBalance = Math.max(0, currentState.userBalance - betAmount);
    updateAllWalletBalanceDisplays();

    // Push to local round bets tracking for instant guaranteed popup trigger
    if (!state10x.myCurrentRoundBets) state10x.myCurrentRoundBets = [];
    state10x.myCurrentRoundBets.push({
      id: betId,
      cardNumber: state10x.selectedCardNumber || 0,
      card_number: state10x.selectedCardNumber || 0,
      amount: betAmount,
      bet_amount: betAmount,
      betType: betType,
      bet_type: betType,
      category: category,
      roundId: sync.roundId,
      round_id: sync.roundId
    });

  try {
    sessionStorage.setItem('amiriwin_pending_bets_' + sync.roundId, JSON.stringify(state10x.myCurrentRoundBets));
  } catch(e) {}

  const animals = window.currentAnimalsConfigList || [];
  const animObj = animals.find(a => a.id === state10x.selectedCardNumber);
  const animalName = animObj ? animObj.name : `Card ${state10x.selectedCardNumber}`;

  if (betType === 'category_2x') {
    const catNames = typeof dbGetCategoryNames === 'function' ? await dbGetCategoryNames() : (typeof getCategoryNamesSync === 'function' ? getCategoryNamesSync() : { cat1: 'Bowler', cat2: 'Batsman' });
    const catLabel = category === 'wild' ? `${catNames.cat1} (5 Items)` : `${catNames.cat2} (5 Items)`;
    showModal('🚀 2X Bet Placed!', `₹${betAmount} bet placed on ${catLabel}! 2X payout if any card in this section wins! Good luck!`);
  } else {
    showModal('🚀 10X Bet Placed!', `₹${betAmount} bet placed on ${animalName}! 10X payout if exact animal wins! Good luck!`);
  }

  await render10xCardsGrid();
  await render10xMyBetHistory();
  } catch(err) {
    console.warn("placeBet10x error:", err);
  } finally {
    state10x.isPlacingBet = false;
  }
}

async function render10xMyBetHistory() {
  const container = document.getElementById('game-10x-bet-history-list') || document.getElementById('game-10x-history-container');
  if (!container) return;

  const currentUserId = currentState.currentUserId;
  const phone = currentState.phoneNumber;

  if (!currentState.isLoggedIn || (!currentUserId && !phone)) {
    container.innerHTML = `<div style="padding: 18px; text-align: center; color: var(--color-text-muted); font-size: 12px; font-weight: 600;">Please login to view your bet history.</div>`;
    return;
  }

  try {
    if (typeof autoSettlePendingBets === 'function') {
      try { await autoSettlePendingBets(); } catch(e) {}
    }
    const catNames = await dbGetCategoryNames();
    const animalsConfig = await dbGetAnimalsConfig();

    let dbBets = [];
    if (typeof supabaseClient !== 'undefined' && supabaseClient) {
      try {
        const { data, error } = await supabaseClient
          .from('user_bets_10x')
          .select('*')
          .or(`user_id.eq.${currentUserId},phone.eq.${phone}`)
          .order('created_at', { ascending: false })
          .limit(100);

        if (!error && data) dbBets = data;
      } catch (e) { console.warn("Fetch bet history warning:", e); }
    }

    if (!dbBets || dbBets.length === 0) {
      dbBets = (typeof memoryUserBets10x !== 'undefined' ? memoryUserBets10x : []).filter(b =>
        (currentUserId && b.user_id === currentUserId) ||
        (phone && (b.phone === phone || (b.phone && b.phone.endsWith(phone.slice(-10)))))
      );
    }

    // Combine with local active round bets for instant zero-latency rendering (only for CURRENT active round!)
    const currentSyncInfo = typeof getGlobalSynchronizedRoundInfo === 'function' ? getGlobalSynchronizedRoundInfo() : null;
    const currentActiveRoundId = currentSyncInfo ? currentSyncInfo.roundId : '';

    const activeBets = (state10x.myCurrentRoundBets || [])
      .filter(b => !b.roundId || !currentActiveRoundId || b.roundId === currentActiveRoundId)
      .map(b => ({
        round_id: currentActiveRoundId || 'Active Round',
        bet_type: b.betType,
        category: b.category,
        card_number: b.cardNumber,
        bet_amount: b.amount,
        payout_amount: 0,
        status: 'PENDING',
        created_at: new Date().toISOString()
      }));

    // Exclude duplicate active bets from dbBets to prevent double rendering
    const dbBetsFiltered = dbBets.filter(dB => {
      const dBRoundNum = parseInt(String(dB.round_id || '').replace(/[^0-9]/g, '')) || 0;
      const activeRoundNum = currentSyncInfo ? currentSyncInfo.roundNumber : 0;
      if (dBRoundNum === activeRoundNum && activeBets.length > 0) return false;
      return true;
    });

    const allBetsCombined = [...activeBets, ...dbBetsFiltered];

    if (!allBetsCombined || allBetsCombined.length === 0) {
      container.innerHTML = `<div style="padding: 18px; text-align: center; color: var(--color-text-muted); font-size: 12px; font-weight: 600;">No bets placed yet. Select a card or category above to place your first bet!</div>`;
      return;
    }

    // 10 Items per Page Pagination Math
    const pageSize = 10;
    const totalBetsCount = allBetsCombined.length;
    const totalPages = Math.max(1, Math.ceil(totalBetsCount / pageSize));

    if (!state10x.historyPage || state10x.historyPage < 1) state10x.historyPage = 1;
    if (state10x.historyPage > totalPages) state10x.historyPage = totalPages;

    const currentPage = state10x.historyPage;
    const startIndex = (currentPage - 1) * pageSize;
    const pageBets = allBetsCombined.slice(startIndex, startIndex + pageSize);

    let html = `
      <table class="bet-history-table" style="width: 100%; border-collapse: collapse; margin-top: 6px; table-layout: auto;">
        <thead>
          <tr style="border-bottom: 1px solid rgba(255,255,255,0.1); font-size: 10px; color: #94a3b8;">
            <th style="padding: 6px 4px; white-space: nowrap; text-align: left;">Round</th>
            <th style="padding: 6px 4px; white-space: nowrap; text-align: center;">Mode</th>
            <th style="padding: 6px 4px; white-space: nowrap; text-align: left;">Target</th>
            <th style="padding: 6px 4px; white-space: nowrap; text-align: center;">Winner</th>
            <th style="padding: 6px 4px; white-space: nowrap; text-align: right;">Amount</th>
            <th style="padding: 6px 4px; white-space: nowrap; text-align: right;">Result</th>
          </tr>
        </thead>
        <tbody>
    `;

    pageBets.forEach(b => {
      const is2X = b.bet_type === 'category_2x';
      const modeBadge = is2X
        ? `<span style="background: rgba(16, 185, 129, 0.2); color: #34d399; padding: 2px 5px; border-radius: 4px; font-size: 10px; font-weight: 800; white-space: nowrap;">2X</span>`
        : `<span style="background: rgba(245, 158, 11, 0.2); color: #fbbf24; padding: 2px 5px; border-radius: 4px; font-size: 10px; font-weight: 800; white-space: nowrap;">10X</span>`;

      let targetName = '';
      if (is2X) {
        targetName = b.category === 'wild' ? catNames.cat1 : catNames.cat2;
      } else {
        const anim = animalsConfig.find(a => a.id === b.card_number);
        targetName = anim ? anim.name : `Card #${b.card_number}`;
      }

      const statusUpper = (b.status || 'PENDING').toUpperCase();
      const bRoundNum = parseInt(String(b.round_id || '').replace(/[^0-9]/g, '')) || 0;
      const activeRoundNum = currentSyncInfo ? currentSyncInfo.roundNumber : 0;
      const isPastOrResult = bRoundNum > 0 && (bRoundNum < activeRoundNum || (bRoundNum === activeRoundNum && currentSyncInfo && currentSyncInfo.isResultPhase));

      let effectiveWinCard = parseInt(b.winning_card || b.winning_card_number || 0);
      if (!effectiveWinCard) {
        try {
          effectiveWinCard = parseInt(sessionStorage.getItem('amiriwin_win_card_' + b.round_id) || sessionStorage.getItem('amiriwin_win_card_' + bRoundNum) || '0');
        } catch(e) {}
      }
      if (!effectiveWinCard && state10x.lastWinningCardMap) {
        effectiveWinCard = parseInt(state10x.lastWinningCardMap[b.round_id] || state10x.lastWinningCardMap[bRoundNum] || 0);
      }
      if (!effectiveWinCard && bRoundNum > 0) {
        effectiveWinCard = (bRoundNum % 10) + 1;
      }

      let effectiveStatus = statusUpper;
      let effectivePayout = b.payout_amount || 0;

      if (effectiveStatus === 'PENDING' && isPastOrResult && effectiveWinCard > 0) {
        const winAnimObj = animalsConfig.find(a => a.id === effectiveWinCard) || { category: effectiveWinCard <= 5 ? 'wild' : 'pet' };
        
        let isWon = false;
        if (is2X) {
          isWon = b.category === winAnimObj.category;
          effectivePayout = isWon ? (parseFloat(b.bet_amount || 0) * 2) : 0;
        } else {
          isWon = parseInt(b.card_number) === effectiveWinCard;
          effectivePayout = isWon ? (parseFloat(b.bet_amount || 0) * 10) : 0;
        }
        effectiveStatus = isWon ? 'WON' : 'LOST';
      }

      let statusBadge = '';
      if (effectiveStatus === 'WON') {
        statusBadge = `<span style="color: #34d399; font-weight: 900; font-size: 11px; white-space: nowrap; display: inline-block;">+₹${effectivePayout.toFixed(2)}</span>`;
      } else if (effectiveStatus === 'LOST') {
        statusBadge = `<span style="color: #f87171; font-weight: 800; font-size: 11px; white-space: nowrap; display: inline-block;">-₹${parseFloat(b.bet_amount || 0).toFixed(2)}</span>`;
      } else {
        statusBadge = `<span style="color: #38bdf8; font-weight: 800; font-size: 10px; white-space: nowrap; display: inline-block;">PENDING</span>`;
      }

      let winnerDisplay = `<span style="color: #64748b; font-size: 10px;">⏳ Pending</span>`;
      if (effectiveStatus !== 'PENDING') {
        const winCardId = effectiveWinCard;
        if (winCardId) {
          const winAnim = animalsConfig.find(a => a.id === parseInt(winCardId));
          const wName = winAnim ? winAnim.name : `Card #${winCardId}`;
          winnerDisplay = `<span style="color: #a7f3d0; font-weight: 800; font-size: 11px; white-space: nowrap;">${wName}</span>`;
        } else {
          winnerDisplay = `<span style="color: #94a3b8; font-size: 10px;">Result</span>`;
        }
      }

      const roundDisplay = (b.round_id || 'Current').replace('ROUND_', '#');

      html += `
        <tr style="border-bottom: 1px solid rgba(255,255,255,0.05); font-size: 11px;">
          <td style="padding: 6px 4px; font-weight: 700; color: #f1f5f9; white-space: nowrap;">${roundDisplay}</td>
          <td style="padding: 6px 4px; text-align: center; white-space: nowrap;">${modeBadge}</td>
          <td style="padding: 6px 4px; font-weight: 800; color: #fbbf24; white-space: nowrap;">${targetName}</td>
          <td style="padding: 6px 4px; text-align: center; white-space: nowrap;">${winnerDisplay}</td>
          <td style="padding: 6px 4px; font-weight: 700; color: #ffe066; text-align: right; white-space: nowrap;">₹${parseFloat(b.bet_amount).toFixed(2)}</td>
          <td style="padding: 6px 4px; text-align: right; white-space: nowrap;">${statusBadge}</td>
        </tr>
      `;
    });

    html += `</tbody></table>`;

    // Pagination Controls Bar (10 items per page)
    if (totalPages > 1) {
      html += `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 10px; padding: 4px 2px;">
          <button type="button" onclick="change10xBetHistoryPage(-1)" ${currentPage <= 1 ? 'disabled' : ''} style="background: rgba(30, 41, 59, 0.9); border: 1px solid ${currentPage <= 1 ? 'rgba(255,255,255,0.1)' : 'rgba(56, 189, 248, 0.4)'}; color: ${currentPage <= 1 ? '#64748b' : '#38bdf8'}; padding: 4px 12px; border-radius: 6px; font-weight: 700; font-size: 11px; cursor: ${currentPage <= 1 ? 'not-allowed' : 'pointer'};">
            ◀ Prev
          </button>

          <span style="color: #94a3b8; font-weight: 700; font-size: 11px;">
            Page <strong style="color: #ffe066; font-size: 12px;">${currentPage}</strong> of <strong style="color: #f1f5f9;">${totalPages}</strong>
          </span>

          <button type="button" onclick="change10xBetHistoryPage(1)" ${currentPage >= totalPages ? 'disabled' : ''} style="background: rgba(30, 41, 59, 0.9); border: 1px solid ${currentPage >= totalPages ? 'rgba(255,255,255,0.1)' : 'rgba(56, 189, 248, 0.4)'}; color: ${currentPage >= totalPages ? '#64748b' : '#38bdf8'}; padding: 4px 12px; border-radius: 6px; font-weight: 700; font-size: 11px; cursor: ${currentPage >= totalPages ? 'not-allowed' : 'pointer'};">
            Next ▶
          </button>
        </div>
      `;
    }

    container.innerHTML = html;
  } catch (err) {
    console.error('Error rendering bet history:', err);
    container.innerHTML = `<div style="padding: 16px; text-align: center; color: var(--color-text-muted); font-size: 12px;">Unable to load bet history.</div>`;
  }
}

function change10xBetHistoryPage(delta) {
  if (!state10x.historyPage) state10x.historyPage = 1;
  state10x.historyPage += delta;
  render10xMyBetHistory();
}

// 100% GLOBALLY SYNCHRONIZED WINNING CARD CALCULATOR (IDENTICAL FOR ALL USERS)
async function calculateSmartWinningCard(round, bets) {
  const roundNumClean = parseInt(String(round ? (round.round_number || round.id || '10000') : '10000').replace(/[^0-9]/g, '')) || 10000;
  const cleanRoundId = round ? (round.id || `ROUND_${roundNumClean}`) : `ROUND_${roundNumClean}`;

  // 0. Lock Check: If winning card was ALREADY determined/preset for this round, return it 100% consistently!
  if (!state10x.lastWinningCardMap) state10x.lastWinningCardMap = {};
  if (round && (round.id || round.round_number)) {
    const existing = state10x.lastWinningCardMap[cleanRoundId] || 
                     state10x.lastWinningCardMap[String(roundNumClean)] ||
                     parseInt(sessionStorage.getItem('amiriwin_win_card_' + cleanRoundId) || sessionStorage.getItem('amiriwin_win_card_' + roundNumClean) || '0');
    if (existing > 0) {
      return existing;
    }
  }

  // 1. Check Live Database for Manual Admin Preset Winner (Direct Query from DB)
  let presetCard = (round && round.preset_winning_card > 0) ? round.preset_winning_card : 0;
  
  if (!presetCard && typeof supabaseClient !== 'undefined' && supabaseClient) {
    try {
      // Check 1: game_rounds_10x table
      const { data: rData } = await supabaseClient
        .from('game_rounds_10x')
        .select('preset_winning_card')
        .eq('id', cleanRoundId)
        .maybeSingle();
      if (rData && rData.preset_winning_card > 0) {
        presetCard = parseInt(rData.preset_winning_card);
      }

      // Check 2: game_settings table (active_preset_card)
      if (!presetCard) {
        const { data: gData } = await supabaseClient
          .from('game_settings')
          .select('value')
          .eq('key', 'active_preset_card')
          .maybeSingle();
        if (gData && gData.value && gData.value.presetCard > 0) {
          const gRound = String(gData.value.roundId || '');
          if (!gRound || gRound === cleanRoundId || gRound.includes(String(roundNumClean))) {
            presetCard = parseInt(gData.value.presetCard);
          }
        }
      }
    } catch(e) {
      console.warn("Error fetching live preset from Supabase DB:", e);
    }
  }

  // Check 3: Local storage fallbacks
  if (!presetCard) {
    const storedPresetRoundId = localStorage.getItem('amiriwin_active_preset_round_id');
    const storedPresetCard = parseInt(localStorage.getItem('amiriwin_active_preset_card') || '0');
    const storedRoundSpecificCard = parseInt(localStorage.getItem('amiriwin_preset_card_' + cleanRoundId) || '0');
    
    if (storedRoundSpecificCard > 0) {
      presetCard = storedRoundSpecificCard;
    } else if (storedPresetCard > 0 && (!storedPresetRoundId || storedPresetRoundId === cleanRoundId || storedPresetRoundId.includes(String(roundNumClean)))) {
      presetCard = storedPresetCard;
    }
  }

  if (presetCard > 0) {
    console.log(`👑 ADMIN MANUAL OVERRIDE WINNER for Round #${roundNumClean}: Card #${presetCard}`);
    state10x.lastWinningCardMap[cleanRoundId] = presetCard;
    state10x.lastWinningCardMap[String(roundNumClean)] = presetCard;
    try {
      sessionStorage.setItem('amiriwin_win_card_' + cleanRoundId, String(presetCard));
      sessionStorage.setItem('amiriwin_win_card_' + roundNumClean, String(presetCard));
    } catch(e) {}
    return presetCard;
  }

  // 2. Pure 100% Globally Synchronized Deterministic Winner derived strictly from Round Number
  // Mulberry32 PRNG Algorithm: Produces the EXACT identical winning card on every client device across the world!
  let t = (roundNumClean + 0x6D2B79F5) | 0;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  const rnd = ((t ^ (t >>> 14)) >>> 0) / 4294967296;

  const winningCard = 1 + (Math.floor(rnd * 10) % 10);
  console.log(`🎲 100% Globally Synchronized Winning Card for Round #${roundNumClean}: Card #${winningCard}`);

  state10x.lastWinningCardMap[cleanRoundId] = winningCard;
  state10x.lastWinningCardMap[String(roundNumClean)] = winningCard;
  try {
    sessionStorage.setItem('amiriwin_win_card_' + cleanRoundId, String(winningCard));
    sessionStorage.setItem('amiriwin_win_card_' + roundNumClean, String(winningCard));
  } catch(e) {}

  return winningCard;
}


function is2xCategoryMatch(betCategory, betCardNumber, winningCardNumber, winningCategory) {
  const winCat = String(winningCategory || (winningCardNumber <= 5 ? 'wild' : 'pet')).toLowerCase();
  const bCat = String(betCategory || '').toLowerCase().trim();
  const bCard = parseInt(betCardNumber || 0);

  if (bCard > 0) {
    return (winCat === 'wild' || winningCardNumber <= 5) ? (bCard <= 5) : (bCard > 5);
  }

  const isCat1Bet = bCat === 'wild' || bCat === 'cat1' || bCat === 'category 1' || bCat === 'bowler' || bCat === '1';
  const isCat2Bet = bCat === 'pet' || bCat === 'cat2' || bCat === 'category 2' || bCat === 'batsman' || bCat === '2';

  if (winCat === 'wild' || winningCardNumber <= 5) {
    return isCat1Bet;
  } else {
    return isCat2Bet;
  }
}

async function settleCurrent10xRound() {
  state10x.isSettling = true;
  const syncInfo = typeof getGlobalSynchronizedRoundInfo === 'function' ? getGlobalSynchronizedRoundInfo() : { roundId: 'ROUND_10000', roundNumber: 10000 };
  let round = { id: syncInfo.roundId, round_number: syncInfo.roundNumber, preset_winning_card: 0 };
  
  if (typeof dbGetCurrentRound10x === 'function') {
    try {
      const dbRoundObj = await dbGetCurrentRound10x();
      if (dbRoundObj && dbRoundObj.preset_winning_card > 0) {
        round.preset_winning_card = parseInt(dbRoundObj.preset_winning_card);
      }
    } catch(e) {}
  }
  
  const bets = (memoryUserBets10x || []).filter(b => {
    const bClean = String(b.round_id || '').replace(/[^0-9]/g, '');
    const currentClean = String(round.id || round.round_number || '').replace(/[^0-9]/g, '');
    return bClean === currentClean || !b.round_id;
  });

  const winningCardNumber = await calculateSmartWinningCard(round, bets);

  if (!state10x.lastWinningCardMap) state10x.lastWinningCardMap = {};
  state10x.lastWinningCardMap[round.id] = winningCardNumber;
  state10x.lastWinningCardMap[String(round.round_number)] = winningCardNumber;

  try {
    sessionStorage.setItem('amiriwin_win_card_' + round.id, String(winningCardNumber));
    sessionStorage.setItem('amiriwin_win_card_' + round.round_number, String(winningCardNumber));
  } catch(e) {}

  const animalsConfig = typeof getAnimalsConfigSync === 'function' ? getAnimalsConfigSync() : (typeof memoryAnimalsConfig !== 'undefined' ? memoryAnimalsConfig : []);
  const catNames = typeof getCategoryNamesSync === 'function' ? getCategoryNamesSync() : { cat1: 'Category 1', cat2: 'Category 2' };

  const winningAnimal = animalsConfig.find(a => a.id === winningCardNumber) || {
    name: `Card ${winningCardNumber}`,
    category: winningCardNumber <= 5 ? 'wild' : 'pet',
    image_url: 'https://images.unsplash.com/photo-1546182990-dffeafbe841d?w=300'
  };

  // Highlight Winning Card in UI
  const winningCardEl = document.getElementById(`card-13-item-${winningCardNumber}`);
  if (winningCardEl) {
    winningCardEl.classList.remove('card-back-flipped');
    winningCardEl.classList.add('winner');
  }

  playResultSound();

  const resultBanner = document.getElementById('game-10x-result-banner');
  const resultDisplay = document.getElementById('game-10x-winning-card-display');
  if (resultBanner && resultDisplay) {
    const catBadgeText = winningAnimal.category === 'wild' ? catNames.cat1 : catNames.cat2;
    const catBadgeClass = winningAnimal.category === 'wild' ? 'wild' : 'pet';

    resultDisplay.innerHTML = `
      <div class="winning-card-reveal-box">
        <div class="card-item-13 winner-reveal-card animal-photo-card" style="width: 68px; height: 92px;">
          <div class="animal-cat-badge ${catBadgeClass}">${catBadgeText}</div>
          <img src="${winningAnimal.image_url}" class="animal-full-photo" onerror="this.src='https://images.unsplash.com/photo-1546182990-dffeafbe841d?w=300'">
          <div class="animal-name-banner">
            <div class="animal-name-text">${winningAnimal.name}</div>
          </div>
        </div>
        <div class="winner-reveal-info">
          <div style="font-size: 11px; color: #a7f3d0; text-transform: uppercase; font-weight: 800; letter-spacing: 0.5px;">🎉 ROUND WINNING CARD</div>
          <div style="font-size: 17px; font-weight: 900; color: #ffe066; margin: 2px 0;">${winningAnimal.name}</div>
          <div class="winner-payout-tag">${winningAnimal.category === 'wild' ? `${catNames.cat1} Category (2X)` : `${catNames.cat2} Category (2X)`} & 🎯 10X Exact Payout</div>
        </div>
      </div>
    `;
    resultBanner.style.display = 'block';
  }

  // Multi-Source User Bets Retrieval (Guarantees Popup Modal & Wallet Payout 100%)
  let sessionSavedBets = [];
  try {
    const rawSaved = sessionStorage.getItem('amiriwin_pending_bets_' + round.id);
    if (rawSaved) sessionSavedBets = JSON.parse(rawSaved) || [];
  } catch(e) {}

  const currentUserIdClean = currentState.currentUserId ? String(currentState.currentUserId).replace('USR_', '') : '';
  const currentPhoneClean = currentState.phoneNumber ? String(currentState.phoneNumber).slice(-10) : '';
  const targetRoundNum = parseInt(String(round.id || round.round_number || '').replace(/[^0-9]/g, '')) || 0;

  // Combine local state, session storage, and memory DB bets for user in current round
  const rawUserBetsList = [
    ...(state10x.myCurrentRoundBets || []),
    ...(sessionSavedBets || []),
    ...(typeof memoryUserBets10x !== 'undefined' ? memoryUserBets10x : []).filter(b => {
      const bIdClean = String(b.user_id || '').replace('USR_', '');
      const bPhoneClean = String(b.phone || '').slice(-10);
      return (currentUserIdClean && bIdClean && (bIdClean === currentUserIdClean || bIdClean.includes(currentUserIdClean))) ||
             (currentPhoneClean && bPhoneClean && bPhoneClean === currentPhoneClean);
    })
  ];

  const activeBetsToEvaluate = [];
  const seenBetsKeySet = new Set();

  rawUserBetsList.forEach(b => {
    const bRoundNum = parseInt(String(b.roundId || b.round_id || '').replace(/[^0-9]/g, '')) || 0;
    if (targetRoundNum === 0 || bRoundNum === 0 || bRoundNum === targetRoundNum) {
      const bType = b.betType || b.bet_type || 'exact_10x';
      const bCard = parseInt(b.cardNumber || b.card_number || 0);
      const bAmt = parseFloat(b.amount || b.bet_amount || 0);
      const bCat = String(b.category || (bCard > 0 ? (bCard <= 5 ? 'wild' : 'pet') : 'wild')).toLowerCase();
      const dedupeKey = `${bType}_${bCard}_${bCat}_${bAmt}`;

      if (!seenBetsKeySet.has(dedupeKey) && bAmt > 0) {
        seenBetsKeySet.add(dedupeKey);
        activeBetsToEvaluate.push({
          cardNumber: bCard,
          amount: bAmt,
          betType: bType,
          category: bCat
        });
      }
    }
  });

  const winningCatName = winningAnimal.category === 'wild' ? catNames.cat1 : catNames.cat2;
  const winCatLower = String(winningAnimal.category || (winningCardNumber <= 5 ? 'wild' : 'pet')).toLowerCase();

  let totalWinPayout = 0;
  let totalBetAmountPlaced = 0;
  let betBreakdownList = [];

  activeBetsToEvaluate.forEach(b => {
    totalBetAmountPlaced += b.amount;

    if (b.betType === 'category_2x') {
      const isCat1 = b.category === 'wild' || b.category === 'cat1' || b.category === 'bowler';
      const bCatName = isCat1 ? catNames.cat1 : catNames.cat2;
      const isWon = is2xCategoryMatch(b.category, b.cardNumber, winningCardNumber, winningAnimal.category);

      if (isWon) {
        const payout = b.amount * 2;
        totalWinPayout += payout;
        betBreakdownList.push({
          type: '⚡ 2X Category Bet',
          target: bCatName,
          betAmount: b.amount,
          winAmount: payout,
          isWon: true
        });
      } else {
        betBreakdownList.push({
          type: '⚡ 2X Category Bet',
          target: bCatName,
          betAmount: b.amount,
          winAmount: 0,
          isWon: false
        });
      }
    } else {
      const targetAnim = animalsConfig.find(a => a.id === b.cardNumber) || { name: `Card #${b.cardNumber}` };
      if (b.cardNumber === winningCardNumber) {
        const payout = b.amount * 10;
        totalWinPayout += payout;
        betBreakdownList.push({
          type: '🎯 10X Exact Bet',
          target: targetAnim.name,
          betAmount: b.amount,
          winAmount: payout,
          isWon: true
        });
      } else {
        betBreakdownList.push({
          type: '🎯 10X Exact Bet',
          target: targetAnim.name,
          betAmount: b.amount,
          winAmount: 0,
          isWon: false
        });
      }
    }
  });

  // Update memory user bets status instantly so history table updates immediately
  if (typeof memoryUserBets10x !== 'undefined' && Array.isArray(memoryUserBets10x)) {
    memoryUserBets10x.forEach(mB => {
      const bRoundNum = parseInt(String(mB.round_id || '').replace(/[^0-9]/g, '')) || 0;
      if (targetRoundNum > 0 && bRoundNum === targetRoundNum) {
        const bType = mB.bet_type || mB.betType || 'exact_10x';
        const mBCatLower = String(mB.category || '').toLowerCase();
        const isWon = bType === 'category_2x' ? mBCatLower === winCatLower : parseInt(mB.card_number || mB.cardNumber || 0) === winningCardNumber;
        mB.status = isWon ? 'WON' : 'LOST';
        mB.winning_card = winningCardNumber;
        mB.payout_amount = isWon ? (bType === 'category_2x' ? mB.bet_amount * 2 : mB.bet_amount * 10) : 0;
      }
    });
  }

  // 1. Credit Win Payout to User Balance & Persist to DB
  if (activeBetsToEvaluate.length > 0) {
    if (totalWinPayout > 0) {
      currentState.userBalance = parseFloat((currentState.userBalance + totalWinPayout).toFixed(2));
      updateAllWalletBalanceDisplays();

      if (currentState.currentUserId && typeof dbUpdateUser === 'function') {
        dbUpdateUser(currentState.currentUserId, { balance: currentState.userBalance }).catch(e => console.warn(e));
      }

      animateWalletBalanceAddition(totalWinPayout);
      console.log("🎉 Triggering 10X Win Modal with payout:", totalWinPayout);
      show10xWinModal(totalWinPayout, totalBetAmountPlaced, betBreakdownList, winningAnimal, winningCatName);
    } else {
      console.log("💔 Triggering 10X Loss Modal with bet amount:", totalBetAmountPlaced);
      show10xLossModal(totalBetAmountPlaced, betBreakdownList, winningAnimal, winningCatName);
    }
  } else {
    updateAllWalletBalanceDisplays();
  }

  // 2. Persist Round DB Settlement
  if (typeof dbSettleRound10x === 'function') {
    dbSettleRound10x(round.id, winningCardNumber).catch(err => console.warn("dbSettleRound10x background error:", err));
  }

  // 3. Re-render history table instantly
  render10xMyBetHistory();

  // Reset local bets array for next round
  state10x.myCurrentRoundBets = [];
  state10x.selectedCardNumber = null;
  updateSelectedBetDisplayInfo();

  await render10xMyBetHistory();

  // 30-Second Result Reveal Display Duration (User requested 30s reveal duration after result is shown)
  setTimeout(async () => {
    if (resultBanner) resultBanner.style.display = 'none';
    state10x.isSettling = false;
    state10x.selectedCardNumber = null;
    updateSelectedBetDisplayInfo();
    await render10xCardsGrid();
    await render10xMyBetHistory();
  }, 30000); // 30 SECONDS REVEAL DURATION!
}

// --- AUDIO SYNTHESIZER & FLIP-COIN ANIMATION ENGINE ---
let audioCtx = null;
function getAudioContext() {
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (AudioContextClass) audioCtx = new AudioContextClass();
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

// 1. Tick-Tick Countdown Sound (Only plays when user is actively inside the game screen)
function playTickSound() {
  if (currentState.activeScreen !== '10x-game') return;
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(850, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(350, ctx.currentTime + 0.03);
    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.03);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.03);
  } catch(e) {}
}

// 2. Result Reveal Victory Chime Sound (Only plays when user is inside the game screen)
function playResultSound() {
  if (currentState.activeScreen !== '10x-game') return;
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.08);
      gain.gain.setValueAtTime(0.2, ctx.currentTime + idx * 0.08);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + idx * 0.08 + 0.25);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime + idx * 0.08);
      osc.stop(ctx.currentTime + idx * 0.08 + 0.25);
    });
  } catch(e) {}
}

// 3. Metallic Coin Ding Sound
function playCoinSound() {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    [987.77, 1318.51, 1567.98].forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.07);
      gain.gain.setValueAtTime(0.22, ctx.currentTime + idx * 0.07);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + idx * 0.07 + 0.3);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime + idx * 0.07);
      osc.stop(ctx.currentTime + idx * 0.07 + 0.3);
    });
  } catch(e) {}
}

// 4. Flying Flip-Coin Animation to Wallet
function spawnFlyingCoinsToWallet(targetEl, count = 8) {
  const targetRect = targetEl ? targetEl.getBoundingClientRect() : { left: window.innerWidth - 80, top: 20 };
  const targetX = targetRect.left > 0 ? targetRect.left + (targetRect.width / 2) - 15 : window.innerWidth - 80;
  const targetY = targetRect.top > 0 ? targetRect.top + (targetRect.height / 2) - 15 : 20;

  const startX = window.innerWidth / 2 - 15;
  const startY = window.innerHeight / 2 - 15;

  for (let i = 0; i < count; i++) {
    setTimeout(() => {
      const coin = document.createElement('div');
      coin.innerHTML = `
        <div style="width: 30px; height: 30px; border-radius: 50%; background: radial-gradient(circle at 35% 35%, #ffe066 0%, #f59e0b 60%, #b45309 100%); border: 2.5px solid #fef08a; box-shadow: 0 4px 14px rgba(245, 158, 11, 0.9), inset 0 0 6px rgba(255,255,255,0.7); display: flex; align-items: center; justify-content: center; color: #78350f; font-weight: 900; font-size: 15px; font-family: 'Outfit', sans-serif;">₹</div>
      `;
      const initX = startX + (Math.random() * 80 - 40);
      const initY = startY + (Math.random() * 80 - 40);

      coin.style.cssText = `
        position: fixed;
        left: ${initX}px;
        top: ${initY}px;
        z-index: 999999;
        pointer-events: none;
        opacity: 1;
        transform: scale(0.7) rotate(0deg);
        transition: left 0.75s cubic-bezier(0.2, 0.8, 0.2, 1), top 0.75s cubic-bezier(0.2, 0.8, 0.2, 1), transform 0.75s ease-out, opacity 0.75s ease-in;
      `;
      document.body.appendChild(coin);

      setTimeout(() => {
        coin.style.left = `${targetX}px`;
        coin.style.top = `${targetY}px`;
        coin.style.transform = `scale(1.1) rotate(720deg)`;
        coin.style.opacity = '0.2';
      }, 40);

      setTimeout(() => coin.remove(), 850);
    }, i * 80);
  }
}

// WALLET BALANCE ANIMATION & WIN/LOSS MODAL HANDLERS
function animateWalletBalanceAddition(amount) {
  playCoinSound();

  const startBal = Math.max(0, currentState.userBalance - amount);
  const targetBal = currentState.userBalance;

  const flipWalletBadge = document.getElementById('flip-coin-balance-val')?.parentElement;
  const walletBadge10x = document.getElementById('game-10x-balance-val')?.parentElement;
  const mainWalletBadge = document.getElementById('user-balance-val')?.parentElement;

  const activeBadge = flipWalletBadge || walletBadge10x || mainWalletBadge;

  if (activeBadge) {
    spawnFlyingCoinsToWallet(activeBadge, 8);
  }

  [flipWalletBadge, walletBadge10x, mainWalletBadge].forEach(badge => {
    if (badge) {
      badge.classList.add('wallet-badge-pulse');
      setTimeout(() => badge.classList.remove('wallet-badge-pulse'), 2500);

      const rect = badge.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        const floatingEl = document.createElement('div');
        floatingEl.className = 'floating-wallet-credit';
        floatingEl.innerText = `+₹${amount.toFixed(2)} 🎉`;
        floatingEl.style.left = `${Math.max(10, rect.left + rect.width / 2 - 40)}px`;
        floatingEl.style.top = `${Math.max(10, rect.top - 10)}px`;
        document.body.appendChild(floatingEl);

        setTimeout(() => floatingEl.remove(), 2000);
      }
    }
  });

  // Smooth Count-Up Animation
  let startTime = null;
  const duration = 1200;

  function step(timestamp) {
    if (!startTime) startTime = timestamp;
    const progress = Math.min((timestamp - startTime) / duration, 1);
    const currentVal = startBal + (targetBal - startBal) * progress;

    const balDisplays = document.querySelectorAll('#user-balance-val, #flip-coin-balance-val, #dt-balance-val, #game-10x-balance-val, #cashier-balance-val, #deposit-balance-val, #profile-user-balance, .wallet-display-val');
    balDisplays.forEach(el => {
      if (el) el.innerText = currentVal.toFixed(2);
    });

    if (progress < 1) {
      window.requestAnimationFrame(step);
    } else {
      updateAllWalletBalanceDisplays();
    }
  }

  window.requestAnimationFrame(step);
}

function showCoinFlipFloatingResult(isWon, amount, side) {
  const container = document.querySelector('.flip-coin-stage');
  if (!container) return;

  const floatBadge = document.createElement('div');
  floatBadge.style.cssText = `
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%) scale(0.5);
    background: ${isWon ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' : 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)'};
    color: #ffffff;
    font-size: ${isWon ? '18px' : '15px'};
    font-weight: 900;
    padding: 6px 16px;
    border-radius: 20px;
    box-shadow: 0 8px 24px ${isWon ? 'rgba(16, 185, 129, 0.6)' : 'rgba(239, 68, 68, 0.5)'};
    z-index: 500;
    pointer-events: none;
    opacity: 0;
    transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
    white-space: nowrap;
  `;

  floatBadge.innerHTML = isWon 
    ? `+₹${amount.toFixed(2)} WIN! 🌟` 
    : `-₹${amount.toFixed(2)}`;

  container.appendChild(floatBadge);

  requestAnimationFrame(() => {
    floatBadge.style.opacity = '1';
    floatBadge.style.transform = 'translate(-50%, -110%) scale(1.1)';
  });

  setTimeout(() => {
    floatBadge.style.opacity = '0';
    floatBadge.style.transform = 'translate(-50%, -160%) scale(0.8)';
  }, 1100);

  setTimeout(() => {
    floatBadge.remove();
  }, 1600);
}

function show10xWinModal(totalWinPayout, totalBetAmountPlaced, betBreakdownList, winningAnimal, winningCatName) {
  const netProfit = totalWinPayout - totalBetAmountPlaced;

  const breakdownRowsHtml = betBreakdownList.map(b => `
    <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px 12px; background: rgba(30, 41, 59, 0.7); border-radius: 8px; margin-top: 6px; border: 1px solid ${b.isWon ? 'rgba(52, 211, 153, 0.4)' : 'rgba(239, 68, 68, 0.3)'};">
      <div style="text-align: left;">
        <span style="font-weight: 800; font-size: 12px; color: ${b.type.includes('10X') ? '#fbbf24' : '#34d399'};">${b.type}</span>
        <div style="font-size: 11px; color: #cbd5e1;">Placed: <strong>₹${b.betAmount.toFixed(2)}</strong> on ${b.target}</div>
      </div>
      <div style="font-weight: 900; font-size: 13px; color: ${b.isWon ? '#34d399' : '#f87171'};">
        ${b.isWon ? `+₹${b.winAmount.toFixed(2)} WIN 🎉` : `-₹${b.betAmount.toFixed(2)} LOST`}
      </div>
    </div>
  `).join('');

  showModal(
    '🎉 YOU WON!',
    `
      <div style="text-align: center; padding: 4px 0;">
        <div style="font-size: 38px; margin-bottom: 2px;">👑 🏆 🎉</div>
        <div style="font-size: 11px; font-weight: 700; color: #94a3b8; text-transform: uppercase;">Winning Card & Category</div>
        <div style="font-size: 19px; font-weight: 900; color: #fbbf24; margin: 2px 0;">${winningAnimal.name} (${winningCatName})</div>
        
        <div style="background: rgba(16, 185, 129, 0.15); border: 1.5px solid #34d399; padding: 12px; border-radius: 12px; margin: 10px 0;">
          <div style="font-size: 11px; color: #a7f3d0; font-weight: 700; text-transform: uppercase;">Total Win Payout Credited</div>
          <div style="font-size: 28px; font-weight: 900; color: #34d399;">+₹${totalWinPayout.toFixed(2)}</div>
          <div style="font-size: 11px; color: #cbd5e1; margin-top: 2px;">Net Round Profit: <strong style="color: #34d399;">${netProfit >= 0 ? '+' : ''}₹${netProfit.toFixed(2)}</strong></div>
        </div>

        <div style="text-align: left; font-size: 11px; font-weight: 800; color: #94a3b8; margin-bottom: 2px;">YOUR BETS SUMMARY:</div>
        <div style="max-height: 150px; overflow-y: auto; text-align: left;">
          ${breakdownRowsHtml}
        </div>
      </div>
    `
  );
}

function show10xLossModal(totalBetAmountPlaced, betBreakdownList, winningAnimal, winningCatName) {
  const breakdownRowsHtml = betBreakdownList.map(b => `
    <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px 12px; background: rgba(30, 41, 59, 0.7); border-radius: 8px; margin-top: 6px; border: 1px solid rgba(239, 68, 68, 0.3);">
      <div style="text-align: left;">
        <span style="font-weight: 800; font-size: 12px; color: ${b.type.includes('10X') ? '#fbbf24' : '#34d399'};">${b.type}</span>
        <div style="font-size: 11px; color: #cbd5e1;">Placed: <strong>₹${b.betAmount.toFixed(2)}</strong> on ${b.target}</div>
      </div>
      <div style="font-weight: 900; font-size: 13px; color: #f87171;">
        -₹${b.betAmount.toFixed(2)} LOST
      </div>
    </div>
  `).join('');

  showModal(
    '💔 Round Ended',
    `
      <div style="text-align: center; padding: 4px 0;">
        <div style="font-size: 34px; margin-bottom: 2px;">🎯 🐾</div>
        <div style="font-size: 11px; font-weight: 700; color: #94a3b8; text-transform: uppercase;">Winning Animal for this Round</div>
        <div style="font-size: 19px; font-weight: 900; color: #fbbf24; margin: 2px 0;">${winningAnimal.name} (${winningCatName})</div>
        
        <div style="background: rgba(239, 68, 68, 0.15); border: 1.5px solid #f87171; padding: 10px; border-radius: 12px; margin: 10px 0;">
          <div style="font-size: 11px; color: #fca5a5; font-weight: 700; text-transform: uppercase;">Total Round Amount Lost</div>
          <div style="font-size: 24px; font-weight: 900; color: #f87171;">-₹${totalBetAmountPlaced.toFixed(2)}</div>
        </div>

        <div style="text-align: left; font-size: 11px; font-weight: 800; color: #94a3b8; margin-bottom: 2px;">YOUR BETS SUMMARY:</div>
        <div style="max-height: 150px; overflow-y: auto; text-align: left;">
          ${breakdownRowsHtml}
        </div>
      </div>
    `
  );
}

// Global Modal Alert System
function showModal(title, message, icon = 'ℹ️') {
  let modal = document.getElementById('global-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'global-modal';
    modal.className = 'modal-overlay';
    modal.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.8); display: flex; align-items: center; justify-content: center; z-index: 999999;';
    modal.innerHTML = `
      <div class="modal-card" style="width: 90%; max-width: 360px; background: #1a1e29; border: 1px solid rgba(212, 175, 55, 0.5); border-radius: 16px; padding: 24px; color: #fff; text-align: center; box-shadow: 0 10px 30px rgba(0,0,0,0.8);">
        <div id="modal-icon" style="font-size: 40px; margin-bottom: 10px;">${icon}</div>
        <h3 id="modal-title" style="margin: 0 0 8px 0; font-size: 18px; color: #ffd700;">${title}</h3>
        <div id="modal-desc" style="font-size: 13px; color: #ccc; line-height: 1.5; margin-bottom: 20px;">${message}</div>
        <button type="button" class="btn-primary-gold" style="width: 100%; padding: 12px; font-weight: bold; border-radius: 8px; cursor: pointer;" onclick="closeModal()">OK</button>
      </div>
    `;
    document.body.appendChild(modal);
  } else {
    const titleEl = document.getElementById('modal-title');
    const descEl = document.getElementById('modal-desc');
    const iconEl = document.getElementById('modal-icon');
    if (titleEl) titleEl.innerText = title;
    if (descEl) descEl.innerHTML = message;
    if (iconEl) iconEl.innerText = icon;
    modal.style.display = 'flex';
    modal.style.zIndex = '999999';
  }

  // Auto-close modal after 5.5 seconds
  if (window.modalAutoCloseTimeout) clearTimeout(window.modalAutoCloseTimeout);
  window.modalAutoCloseTimeout = setTimeout(() => {
    closeModal();
  }, 5500);
}

function closeModal() {
  if (window.modalAutoCloseTimeout) {
    clearTimeout(window.modalAutoCloseTimeout);
    window.modalAutoCloseTimeout = null;
  }
  const modal = document.getElementById('global-modal');
  if (modal) modal.style.display = 'none';
}

// Reward & Modal Handlers
async function claimDailyReward() {
  currentState.userBalance += 100;
  document.getElementById('user-balance-val').innerText = currentState.userBalance.toFixed(2);

  if (currentState.currentUserId) {
    await dbUpdateUser(currentState.currentUserId, { balance: currentState.userBalance });
  }

  showModal('🎁 Daily Reward Claimed', '₹100 Daily bonus added to your Supabase wallet balance!');
}

function openWithdrawModal() {
  showModal('🏧 Withdraw Funds', 'Fast 24/7 Withdrawal directly to Bank account / UPI.');
}

function openSupportModal() {
  showModal('🎧 Customer Service', '24/7 Live Support available via Telegram & WhatsApp.');
}

function openForgotModal(e) {
  if (e) e.preventDefault();
  const modal = document.getElementById('modal-forgot-pass');
  const step1 = document.getElementById('forgot-step-1');
  const step2 = document.getElementById('forgot-step-2');
  if (step1) step1.style.display = 'block';
  if (step2) step2.style.display = 'none';
  if (modal) modal.style.display = 'flex';
}

function closeForgotModal() {
  const modal = document.getElementById('modal-forgot-pass');
  if (modal) modal.style.display = 'none';
}

function openSetNewPasswordModal(email = '') {
  const modal = document.getElementById('modal-set-new-pass');
  const emailInput = document.getElementById('reset-verified-email');
  if (emailInput) emailInput.value = email;
  if (modal) modal.style.display = 'flex';
}

function closeSetNewPasswordModal() {
  const modal = document.getElementById('modal-set-new-pass');
  if (modal) modal.style.display = 'none';
}

async function handleSendResetEmailSubmit(e) {
  if (e) e.preventDefault();
  const emailInput = document.getElementById('forgot-email-input')?.value.trim();

  if (!emailInput || !emailInput.includes('@') || !emailInput.includes('.')) {
    showModal('⚠️ Invalid Email ID', 'Please enter a valid registered email address.');
    return;
  }

  showModal('⏳ Sending OTP...', 'Sending 6-digit verification code to your email via Resend...');

  const result = await dbSendResendEmailOTP(emailInput);

  closeModal();

  if (!result.success) {
    showModal('❌ OTP Send Failed', result.message);
    return;
  }

  const step1 = document.getElementById('forgot-step-1');
  const step2 = document.getElementById('forgot-step-2');
  if (step1) step1.style.display = 'none';
  if (step2) step2.style.display = 'block';
}

async function handleConfirmResetPasswordSubmit(e) {
  if (e) e.preventDefault();
  const emailInput = document.getElementById('forgot-email-input')?.value.trim();
  const otpInput = document.getElementById('reset-otp-input')?.value.trim();
  const newPass = document.getElementById('reset-new-pass')?.value.trim();
  const confirmPass = document.getElementById('reset-confirm-pass')?.value.trim();

  if (!otpInput || otpInput.length < 6) {
    showModal('⚠️ Invalid OTP', 'Please enter the 6-digit OTP code received on your email.');
    return;
  }

  if (!newPass || newPass.length < 4) {
    showModal('⚠️ Weak Password', 'New password must be at least 4 characters long.');
    return;
  }

  if (newPass !== confirmPass) {
    showModal('❌ Password Mismatch', 'New Password and Confirm Password do not match.');
    return;
  }

  showModal('⏳ Verifying...', 'Verifying OTP code and updating password...');

  const result = await dbVerifyOTPAndResetPassword(emailInput, otpInput, newPass);

  closeModal();

  if (!result.success) {
    showModal('❌ Verification Failed', result.message);
    return;
  }

  closeForgotModal();
  showModal('🎉 Password Updated!', 'Your password has been changed successfully! You can now log in with your new password.');
  switchScreen('login');
}

// Automatically detect recovery link from email click (URL Hash contain type=recovery or access_token)
window.addEventListener('DOMContentLoaded', () => {
  const hash = window.location.hash;
  if (hash && (hash.includes('type=recovery') || hash.includes('access_token'))) {
    setTimeout(() => {
      openSetNewPasswordModal();
    }, 500);
  }
});

function openTelegramSupport() {
  showModal('💬 Telegram Support', 'Opening Official Dubai10X Support Channel (@Dubai10XSupport)...');
}

async function loadUserReferralTeamCenter() {
  const activeUserId = currentState.currentUserId || (currentState.phoneNumber ? `USR_${currentState.phoneNumber.slice(-6)}` : 'USR_6868');
  const userCode = activeUserId.replace('USR_', '');

  const codeDisplay1 = document.getElementById('earn-invite-code-display');
  if (codeDisplay1) codeDisplay1.innerText = userCode;

  const commConfig = typeof getCommissionSettingsSync === 'function' ? getCommissionSettingsSync() : { level1_pct: 1.5, level2_pct: 0.5, level3_pct: 0.2 };

  const l1PctEl = document.getElementById('earn-level1-pct-display');
  const l2PctEl = document.getElementById('earn-level2-pct-display');
  const l3PctEl = document.getElementById('earn-level3-pct-display');
  if (l1PctEl) l1PctEl.innerText = `${commConfig.level1_pct || 1.5}%`;
  if (l2PctEl) l2PctEl.innerText = `${commConfig.level2_pct || 0.5}%`;
  if (l3PctEl) l3PctEl.innerText = `${commConfig.level3_pct || 0.2}%`;

  if (typeof dbGetReferralTeamStats === 'function') {
    try {
      const stats = await dbGetReferralTeamStats(activeUserId);

      const totalEl = document.getElementById('earn-total-commission-amount');
      const unclaimedEl = document.getElementById('earn-unclaimed-commission-amount');
      const claimBtn = document.getElementById('btn-claim-referral-commission');
      const l1CountEl = document.getElementById('earn-level1-count');
      const l1IncEl = document.getElementById('earn-level1-income');
      const l2CountEl = document.getElementById('earn-level2-count');
      const l2IncEl = document.getElementById('earn-level2-income');
      const l3CountEl = document.getElementById('earn-level3-count');
      const l3IncEl = document.getElementById('earn-level3-income');

      if (totalEl) totalEl.innerText = `₹${stats.totalEarned.toFixed(2)}`;
      if (unclaimedEl) unclaimedEl.innerText = `₹${(stats.unclaimedCommission || 0).toFixed(2)}`;

      const commConfig = typeof dbGetCommissionSettings === 'function' ? await dbGetCommissionSettings() : { min_claim_amount: 1000.00 };
      const minClaim = commConfig && typeof commConfig.min_claim_amount !== 'undefined' ? parseFloat(commConfig.min_claim_amount) : 1000.00;

      const minNoteEl = document.getElementById('earn-min-claim-note');
      if (minNoteEl) {
        minNoteEl.innerText = `(💡 Min ₹${Number(minClaim).toLocaleString('en-IN')} required to transfer to Main Wallet)`;
      }

      if (claimBtn) {
        const unclaimed = stats.unclaimedCommission || 0;
        if (unclaimed >= minClaim && unclaimed > 0) {
          claimBtn.disabled = false;
          claimBtn.style.opacity = '1';
          claimBtn.style.cursor = 'pointer';
          claimBtn.style.background = 'linear-gradient(135deg, #10b981, #059669)';
          claimBtn.innerHTML = `➕ Add to Main Wallet (₹${unclaimed.toFixed(2)})`;
        } else if (unclaimed > 0) {
          claimBtn.disabled = false;
          claimBtn.style.opacity = '0.9';
          claimBtn.style.cursor = 'pointer';
          claimBtn.style.background = 'linear-gradient(135deg, #f59e0b, #d97706)';
          claimBtn.innerHTML = `🔒 Min ₹${Number(minClaim).toLocaleString('en-IN')} Required (₹${unclaimed.toFixed(2)})`;
        } else {
          claimBtn.disabled = true;
          claimBtn.style.opacity = '0.5';
          claimBtn.style.cursor = 'not-allowed';
          claimBtn.style.background = 'linear-gradient(135deg, #10b981, #059669)';
          claimBtn.innerHTML = `➕ Add to Main Wallet (₹0.00)`;
        }
      }

      if (l1CountEl) l1CountEl.innerText = `${stats.level1Count} Members`;
      if (l1IncEl) l1IncEl.innerText = `+₹${stats.level1Earned.toFixed(2)}`;
      if (l2CountEl) l2CountEl.innerText = `${stats.level2Count} Members`;
      if (l2IncEl) l2IncEl.innerText = `+₹${stats.level2Earned.toFixed(2)}`;
      if (l3CountEl) l3CountEl.innerText = `${stats.level3Count} Members`;
      if (l3IncEl) l3IncEl.innerText = `+₹${stats.level3Earned.toFixed(2)}`;
    } catch (e) {
      console.warn("Load referral team stats error:", e);
    }
  }

  // Load Claim History
  if (typeof dbGetReferralClaimHistory === 'function') {
    try {
      const historyList = await dbGetReferralClaimHistory(activeUserId);
      const historyContainer = document.getElementById('referral-claim-history-list');
      if (historyContainer) {
        if (!historyList || historyList.length === 0) {
          historyContainer.innerHTML = `<div style="text-align: center; color: #64748b; font-size: 12px; padding: 12px;">No commission claims yet.</div>`;
        } else {
          historyContainer.innerHTML = historyList.map(h => `
            <div style="background: rgba(15, 23, 42, 0.7); border: 1px solid rgba(245, 166, 35, 0.2); border-radius: 8px; padding: 10px 12px; display: flex; align-items: center; justify-content: space-between;">
              <div>
                <div style="font-size: 14px; font-weight: 900; color: #ffe066;">+₹${parseFloat(h.amount).toFixed(2)}</div>
                <div style="font-size: 10px; color: #94a3b8; margin-top: 2px;">Transferred to Main Wallet</div>
              </div>
              <div style="text-align: right;">
                <span style="font-size: 10px; background: rgba(16,185,129,0.2); color: #34d399; border: 1px solid rgba(52,211,153,0.3); padding: 2px 6px; border-radius: 4px; font-weight: 700;">✅ Success</span>
                <div style="font-size: 10px; color: #64748b; margin-top: 3px;">${new Date(h.claimed_at).toLocaleString()}</div>
              </div>
            </div>
          `).join('');
        }
      }
    } catch (err) {
      console.warn("Load claim history error:", err);
    }
  }
}

// --- REFERRED MEMBERS BREAKDOWN MODAL & DATE FILTERS ---
let currentReferralModalState = {
  level: 1,
  dateFilter: 'all',
  startDate: null,
  endDate: null,
  searchQuery: ''
};

async function openReferralMemberDetailsModal(level = 1) {
  currentReferralModalState.level = level;
  currentReferralModalState.dateFilter = 'all';
  currentReferralModalState.startDate = null;
  currentReferralModalState.endDate = null;
  currentReferralModalState.searchQuery = '';

  const modal = document.getElementById('modal-referral-level-details');
  if (!modal) return;

  const levelTitle = document.getElementById('ref-modal-level-title');
  if (levelTitle) {
    const icon = level === 1 ? '🥇' : (level === 2 ? '🥈' : '🥉');
    levelTitle.innerText = `${icon} Level ${level} Referred Members List`;
  }

  const customBox = document.getElementById('ref-custom-date-container');
  if (customBox) customBox.style.display = 'none';

  const searchInput = document.getElementById('ref-member-search-input');
  if (searchInput) searchInput.value = '';

  updateReferralFilterButtonsUI('all');

  modal.style.display = 'flex';
  await renderReferralMemberDetailsList();
}

function closeReferralMemberDetailsModal() {
  const modal = document.getElementById('modal-referral-level-details');
  if (modal) modal.style.display = 'none';
}

function setReferralDateFilter(filterType) {
  currentReferralModalState.dateFilter = filterType;
  updateReferralFilterButtonsUI(filterType);

  const customBox = document.getElementById('ref-custom-date-container');
  if (filterType === 'custom') {
    if (customBox) customBox.style.display = 'flex';
  } else {
    if (customBox) customBox.style.display = 'none';
    renderReferralMemberDetailsList();
  }
}

function updateReferralFilterButtonsUI(activeFilter) {
  const filters = ['all', 'today', 'yesterday', 'this_month', 'last_30_days', 'custom'];
  filters.forEach(f => {
    const btn = document.getElementById(`ref-filter-btn-${f}`);
    if (btn) {
      if (f === activeFilter) {
        btn.style.background = 'linear-gradient(135deg, #f5a623 0%, #d97706 100%)';
        btn.style.color = '#0f172a';
        btn.style.borderColor = '#f5a623';
      } else {
        btn.style.background = 'rgba(255,255,255,0.05)';
        btn.style.color = '#94a3b8';
        btn.style.borderColor = 'rgba(255,255,255,0.15)';
      }
    }
  });
}

function applyCustomReferralDateFilter() {
  const startInput = document.getElementById('ref-custom-start-date');
  const endInput = document.getElementById('ref-custom-end-date');

  const startVal = startInput?.value;
  const endVal = endInput?.value;

  if (!startVal || !endVal) {
    showModal('⚠️ Custom Date Range', 'Please select both From Date and To Date!');
    return;
  }

  currentReferralModalState.startDate = startVal;
  currentReferralModalState.endDate = endVal;
  renderReferralMemberDetailsList();
}

function filterReferralMembersSearch(query) {
  currentReferralModalState.searchQuery = (query || '').toLowerCase().trim();
  renderReferralMemberDetailsList();
}

async function renderReferralMemberDetailsList() {
  const container = document.getElementById('referral-members-list-container');
  if (!container) return;

  const activeUserId = currentState.currentUserId || (currentState.phoneNumber ? `USR_${currentState.phoneNumber.slice(-6)}` : 'USR_6868');

  try {
    const details = typeof dbGetReferralLevelDetails === 'function'
      ? await dbGetReferralLevelDetails(
        activeUserId,
        currentReferralModalState.level,
        currentReferralModalState.dateFilter,
        currentReferralModalState.startDate,
        currentReferralModalState.endDate
      )
      : { members: [], totalMembers: 0, periodCommission: 0, totalCommissionInTimeframe: 0 };

    const totalMembersEl = document.getElementById('ref-modal-total-members');
    const periodCommEl = document.getElementById('ref-modal-period-commission');

    const totalCount = details.totalMembers !== undefined ? details.totalMembers : (details.members ? details.members.length : 0);
    const totalComm = details.periodCommission !== undefined ? details.periodCommission : (details.totalCommissionInTimeframe || 0);

    if (totalMembersEl) totalMembersEl.innerText = totalCount;
    if (periodCommEl) periodCommEl.innerText = `₹${parseFloat(totalComm || 0).toFixed(2)}`;

    let members = details.members || [];
    if (currentReferralModalState.searchQuery) {
      const q = currentReferralModalState.searchQuery;
      members = members.filter(m =>
        (m.id && m.id.toLowerCase().includes(q)) ||
        (m.phone && m.phone.includes(q)) ||
        (m.displayPhone && m.displayPhone.includes(q))
      );
    }

    if (!members || members.length === 0) {
      container.innerHTML = `
        <div style="padding: 30px 16px; text-align: center; color: #64748b;">
          <div style="font-size: 28px; margin-bottom: 6px;">👥</div>
          <div style="font-size: 13px; font-weight: 700;">No Members Found</div>
          <div style="font-size: 11px; margin-top: 2px;">No level ${currentReferralModalState.level} members match the selected filter criteria.</div>
        </div>
      `;
      return;
    }

    container.innerHTML = members.map(m => {
      const regDate = m.joinedDate || (m.date ? new Date(m.date).toLocaleDateString() : 'Recent');
      const userPhoneDisplay = m.displayPhone || (m.phone ? `+91 ${m.phone.slice(0, 3)}****${m.phone.slice(-3)}` : (m.id || 'Member'));
      const commissionVal = parseFloat(m.commissionEarned || 0).toFixed(2);
      const betsVal = parseFloat(m.totalBetVolume || m.totalBetsAmount || 0).toFixed(2);

      return `
        <div style="background: rgba(15, 23, 42, 0.7); border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; padding: 10px 14px; display: flex; align-items: center; justify-content: space-between;">
          <div>
            <div style="font-size: 13px; font-weight: 800; color: #ffffff; display: flex; align-items: center; gap: 6px;">
              <span>${userPhoneDisplay}</span>
              <span style="font-size: 9px; background: rgba(56, 189, 248, 0.2); color: #38bdf8; padding: 1px 6px; border-radius: 4px; font-weight: 700;">${m.id || 'USR'}</span>
            </div>
            <div style="font-size: 10px; color: #94a3b8; margin-top: 2px;">Joined: ${regDate} | Total Bets: <strong style="color: #ffe066;">₹${betsVal}</strong></div>
          </div>
          <div style="text-align: right;">
            <div style="font-size: 9px; color: #94a3b8; font-weight: 700; text-transform: uppercase;">Your Commission</div>
            <div style="font-size: 15px; font-weight: 900; color: #34d399;">+₹${commissionVal}</div>
          </div>
        </div>
      `;
    }).join('');

  } catch (err) {
    console.error("Render referral member details error:", err);
    container.innerHTML = `<div style="padding: 20px; text-align: center; color: #ef4444; font-size: 12px;">Failed to load breakdown details.</div>`;
  }
}

async function claimReferralCommissionToWallet() {
  const activeUserId = currentState.currentUserId || (currentState.phoneNumber ? `USR_${currentState.phoneNumber.slice(-6)}` : 'USR_6868');
  if (typeof dbClaimReferralCommission !== 'function') return;

  const res = await dbClaimReferralCommission(activeUserId);
  if (!res.success) {
    showModal('⚠️ Claim Notice', res.message || 'No unclaimed commission balance available!');
    return;
  }

  // Sync wallet balance
  currentState.userBalance = res.newBalance;
  if (currentState.user) currentState.user.balance = res.newBalance;
  if (typeof updateAllWalletBalanceDisplays === 'function') {
    updateAllWalletBalanceDisplays();
  }

  showModal(
    '🎁 Bonus Claimed Successfully!',
    `✅ Transferred <b style="color: #34d399; font-size: 16px;">₹${res.claimedAmount.toFixed(2)}</b> referral commission to your Main Wallet Balance!<br><br><b>New Balance: ₹${res.newBalance.toFixed(2)}</b>`
  );

  loadUserReferralTeamCenter();
}

// --- REFERRED MEMBER BREAKDOWN & TIME-FILTER HANDLERS ---
let currentRefModalState = {
  level: 1,
  dateFilter: 'this_month',
  startDate: null,
  endDate: null,
  cachedMembers: []
};

async function openReferralMemberDetailsModal(level = 1) {
  currentRefModalState.level = level;
  currentRefModalState.dateFilter = 'all';
  currentRefModalState.startDate = null;
  currentRefModalState.endDate = null;

  const modal = document.getElementById('modal-referral-level-details');
  if (modal) modal.style.display = 'flex';

  const titleEl = document.getElementById('ref-modal-level-title');
  if (titleEl) {
    if (level === 1) titleEl.innerHTML = `🥇 Level 1 Referred Members`;
    else if (level === 2) titleEl.innerHTML = `🥈 Level 2 Referred Members`;
    else if (level === 3) titleEl.innerHTML = `🥉 Level 3 Referred Members`;
  }

  const searchEl = document.getElementById('ref-member-search-input');
  if (searchEl) searchEl.value = '';

  setReferralDateFilter('all', false);
  await renderReferralMemberDetailsList();
}

function closeReferralMemberDetailsModal() {
  const modal = document.getElementById('modal-referral-level-details');
  if (modal) modal.style.display = 'none';
}

async function setReferralDateFilter(filterType, triggerRender = true) {
  currentRefModalState.dateFilter = filterType;

  ['all', 'today', 'yesterday', 'this_month', 'last_30_days', 'custom'].forEach(f => {
    const btn = document.getElementById(`ref-filter-btn-${f}`);
    if (btn) {
      if (f === filterType) {
        btn.style.background = 'linear-gradient(135deg, #f5a623, #d97706)';
        btn.style.borderColor = '#ffe066';
        btn.style.color = '#ffffff';
        btn.style.boxShadow = '0 2px 8px rgba(245, 166, 35, 0.4)';
      } else {
        btn.style.background = 'rgba(255,255,255,0.05)';
        btn.style.borderColor = 'rgba(255,255,255,0.15)';
        btn.style.color = '#94a3b8';
        btn.style.boxShadow = 'none';
      }
    }
  });

  const customContainer = document.getElementById('ref-custom-date-container');
  if (customContainer) {
    customContainer.style.display = filterType === 'custom' ? 'flex' : 'none';
  }

  if (triggerRender && filterType !== 'custom') {
    await renderReferralMemberDetailsList();
  }
}

async function applyCustomReferralDateFilter() {
  const startEl = document.getElementById('ref-custom-start-date');
  const endEl = document.getElementById('ref-custom-end-date');

  if (!startEl || !startEl.value) {
    showModal('⚠️ Invalid Date', 'Please select a Start Date for custom range.');
    return;
  }

  currentRefModalState.startDate = startEl.value;
  currentRefModalState.endDate = endEl ? endEl.value : startEl.value;
  await renderReferralMemberDetailsList();
}

async function renderReferralMemberDetailsList() {
  const activeUserId = currentState.currentUserId || (currentState.phoneNumber ? `USR_${currentState.phoneNumber.slice(-6)}` : 'USR_6868');
  const container = document.getElementById('referral-members-list-container');
  if (!container) return;

  container.innerHTML = `<div style="padding: 20px; text-align: center; color: #64748b; font-size: 12px;">Loading referred members...</div>`;

  if (typeof dbGetReferralLevelDetails !== 'function') return;

  try {
    const details = await dbGetReferralLevelDetails(
      activeUserId,
      currentRefModalState.level,
      currentRefModalState.dateFilter,
      currentRefModalState.startDate,
      currentRefModalState.endDate
    );

    currentRefModalState.cachedMembers = details.members || [];

    const totalMemEl = document.getElementById('ref-modal-total-members');
    const periodCommEl = document.getElementById('ref-modal-period-commission');

    if (totalMemEl) totalMemEl.innerText = `${details.totalMembers}`;
    if (periodCommEl) periodCommEl.innerText = `₹${details.totalCommissionInTimeframe.toFixed(2)}`;

    renderReferralMemberCards(details.members);

  } catch (err) {
    console.warn("Render referral member details error:", err);
    container.innerHTML = `<div style="padding: 20px; text-align: center; color: #ef4444; font-size: 12px;">Error loading member list.</div>`;
  }
}

function renderReferralMemberCards(members) {
  const container = document.getElementById('referral-members-list-container');
  if (!container) return;

  if (!members || members.length === 0) {
    container.innerHTML = `<div style="padding: 24px; text-align: center; color: #64748b; font-size: 12px; background: rgba(15, 23, 42, 0.4); border-radius: 12px;">No referred members found in this level for selected period.</div>`;
    return;
  }

  container.innerHTML = members.map(m => `
    <div style="background: rgba(15, 23, 42, 0.8); border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; padding: 12px 14px; display: flex; align-items: center; justify-content: space-between;">
      <div>
        <div style="font-size: 13px; font-weight: 800; color: #ffffff; display: flex; align-items: center; gap: 6px;">
          📱 ${m.displayPhone}
          <span style="font-size: 9px; background: rgba(245,166,35,0.15); color: #ffe066; padding: 1px 6px; border-radius: 8px; border: 1px solid rgba(245,166,35,0.3); font-weight: 700;">Level ${currentRefModalState.level} Member</span>
        </div>
        <div style="font-size: 10px; color: #94a3b8; margin-top: 4px;">
          Joined: <span style="color: #cbd5e1;">${m.joinedDate}</span>
          ${m.totalBetsCount > 0 ? ` • Bets: <span style="color: #cbd5e1;">${m.totalBetsCount}</span> (Vol: ₹${m.totalBetVolume.toFixed(2)})` : ''}
        </div>
      </div>
      <div style="text-align: right;">
        <div style="font-size: 10px; color: #94a3b8; font-weight: 600; text-transform: uppercase;">Commission Earned</div>
        <div style="font-size: 15px; font-weight: 900; color: ${m.commissionEarned > 0 ? '#34d399' : '#64748b'}; margin-top: 2px;">
          ${m.commissionEarned > 0 ? `+₹${m.commissionEarned.toFixed(2)}` : '₹0.00'}
        </div>
      </div>
    </div>
  `).join('');
}

function filterReferralMembersSearch(query) {
  const q = (query || '').trim().toLowerCase();
  if (!currentRefModalState.cachedMembers) return;

  if (!q) {
    renderReferralMemberCards(currentRefModalState.cachedMembers);
    return;
  }

  const filtered = currentRefModalState.cachedMembers.filter(m =>
    (m.phone && m.phone.toLowerCase().includes(q)) ||
    (m.displayPhone && m.displayPhone.toLowerCase().includes(q)) ||
    (m.id && m.id.toLowerCase().includes(q))
  );

  renderReferralMemberCards(filtered);
}

function copyRefLink() {
  const activeUserId = currentState.currentUserId || (currentState.phoneNumber ? `USR_${currentState.phoneNumber.slice(-6)}` : 'USR_6868');
  const userCode = activeUserId.replace('USR_', '');
  const url = `${window.location.origin}${window.location.pathname}?code=${userCode}`;
  navigator.clipboard.writeText(url);
  showModal('📋 Link Copied', `Invitation link copied to clipboard!<br><br><span style="color:#ffe066; font-size:12px; font-weight:700;">${url}</span>`);
}

function shareRefWhatsApp() {
  const activeUserId = currentState.currentUserId || (currentState.phoneNumber ? `USR_${currentState.phoneNumber.slice(-6)}` : 'USR_6868');
  const userCode = activeUserId.replace('USR_', '');
  const url = `${window.location.origin}${window.location.pathname}?code=${userCode}`;
  const text = encodeURIComponent(`🔥 Join me on AmiriWin & earn daily cash! Use my invitation code: ${userCode}\nPlay now: ${url}`);
  window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
}

function downloadApp() {
  showModal('📲 Downloading APK', 'AmiriWin_Official_v2.4.apk download started!');
}

function closeAppBar() {
  const banner = document.getElementById('app-download-banner');
  if (banner) banner.style.display = 'none';
}

function openNoticeModal() {
  showModal('📢 Notice Details', 'Dubai10X Official Announcement: All deposits get instant 10% extra cash bonus today!');
}

function showModal(title, desc) {
  const titleEl = document.getElementById('modal-title');
  const descEl = document.getElementById('modal-desc');
  if (titleEl) titleEl.innerText = title;
  if (descEl) descEl.innerHTML = desc;
  const modal = document.getElementById('global-modal');
  if (modal) modal.classList.add('active');

  // Prevent horizontal layout shift
  window.scrollTo(0, window.scrollY);
  document.body.scrollLeft = 0;
  const mobileFrame = document.querySelector('.mobile-frame');
  if (mobileFrame) mobileFrame.scrollLeft = 0;
  const activeScreen = document.querySelector('.screen.active');
  if (activeScreen) activeScreen.scrollLeft = 0;
}

function closeModal() {
  const modal = document.getElementById('global-modal');
  if (modal) modal.classList.remove('active');

  // Reset horizontal layout shift
  document.body.scrollLeft = 0;
  const mobileFrame = document.querySelector('.mobile-frame');
  if (mobileFrame) mobileFrame.scrollLeft = 0;
  const activeScreen = document.querySelector('.screen.active');
  if (activeScreen) activeScreen.scrollLeft = 0;
}

// --- FRONTEND DEPOSIT SYSTEM WITH DYNAMIC AUTO-ROTATION & 60K MAX LIMIT ---
let selectedDepositMethodId = null;
let currentCashierMethod = null;
let currentCashierAmount = 1000;

async function renderFrontendDepositMethods() {
  const container = document.getElementById('deposit-methods-grid');
  if (!container) return;

  const methods = await dbGetPaymentMethods();
  
  // Filter active methods that have not reached max_limit
  const activeMethods = (methods || []).filter(m => m.status === 'ON' && (parseFloat(m.current_total || 0) < parseFloat(m.max_limit || 60000)));

  if (!activeMethods || activeMethods.length === 0) {
    container.innerHTML = `
      <div style="grid-column: 1 / -1; padding: 20px 14px; text-align: center; background: rgba(239, 68, 68, 0.12); border: 1px solid rgba(239, 68, 68, 0.4); border-radius: 12px; color: #fca5a5;">
        <div style="font-size: 24px; margin-bottom: 4px;">⚠️</div>
        <div style="font-size: 13px; font-weight: 800; color: #f87171;">Deposit Channels Under Maintenance</div>
        <div style="font-size: 11px; margin-top: 4px; color: #cbd5e1;">All QR/UPI deposit limits reached for today (Max ₹60,000/QR). Please contact live support.</div>
      </div>
    `;
    selectedDepositMethodId = null;
    return;
  }

  // Auto-select first active method if none selected or if selected became inactive
  if (!selectedDepositMethodId || !activeMethods.some(m => m.id === selectedDepositMethodId)) {
    selectedDepositMethodId = activeMethods[0].id;
  }

  container.innerHTML = activeMethods.map(pm => {
    const isSelected = pm.id === selectedDepositMethodId;
    const subtitle = pm.upi_id ? pm.upi_id.split('@')[0] : pm.name;

    return `
      <div class="dep-method-card ${isSelected ? 'active' : ''}" onclick="selectDepositMethodById('${pm.id}')" style="cursor: pointer;">
        <div class="check-icon"><i class="fa-solid fa-check"></i></div>
        <div class="method-icon-text" style="color: #34d399; font-weight: 800; font-size: 13px;">${pm.name}</div>
        <div class="method-subtitle" style="font-size: 10px; color: #94a3b8;">${subtitle}</div>
      </div>
    `;
  }).join('');
}

function selectDepositMethodById(methodId) {
  selectedDepositMethodId = methodId;
  renderFrontendDepositMethods();
}

function selectAmountPreset(btnEl, amount) {
  const input = document.getElementById('deposit-amount-input');
  if (input) input.value = amount;

  const parent = btnEl?.parentElement;
  if (parent) {
    parent.querySelectorAll('.amount-preset-card').forEach(b => b.classList.remove('active'));
    if (btnEl && btnEl.classList) btnEl.classList.add('active');
  }
}

async function proceedToCashier() {
  if (!currentState.isLoggedIn) {
    showModal('🔒 Login Required', 'Please login to make a deposit.');
    switchScreen('login');
    return;
  }

  const amountInput = document.getElementById('deposit-amount-input');
  const amount = parseFloat(amountInput?.value) || 0;

  if (amount < 200) {
    showModal('⚠️ Minimum Deposit', 'Minimum deposit amount is ₹200.00.');
    return;
  }

  if (amount > 60000) {
    showModal('⚠️ Maximum Limit Exceeded', 'Maximum deposit limit per transaction is ₹60,000.00.');
    return;
  }

  const methods = await dbGetPaymentMethods();
  const activeMethods = (methods || []).filter(m => m.status === 'ON' && (parseFloat(m.current_total || 0) < parseFloat(m.max_limit || 60000)));

  if (!activeMethods || activeMethods.length === 0) {
    showModal('⚠️ Channels Maintenance', 'All QR deposit channels have reached daily limit (₹60,000 max per QR). Please contact customer support.');
    return;
  }

  const selectedPm = activeMethods.find(m => m.id === selectedDepositMethodId) || activeMethods[0];
  const remainingLimit = (parseFloat(selectedPm.max_limit) || 60000) - (parseFloat(selectedPm.current_total) || 0);

  if (amount > remainingLimit) {
    showModal('⚠️ QR Channel Limit Warning', `This payment method (${selectedPm.name}) has ₹${remainingLimit.toLocaleString('en-IN')} limit remaining.<br><br>Please deposit <b>₹${remainingLimit.toLocaleString('en-IN')}</b> or less, or select another active method.`);
    return;
  }

  currentCashierMethod = selectedPm;
  currentCashierAmount = amount;

  renderCashierPaymentScreen(selectedPm, amount);
  switchScreen('cashier');
}

function renderCashierPaymentScreen(pm, amount) {
  const payableEl = document.getElementById('cashier-payable-val');
  const upiDisplayEl = document.getElementById('cashier-upi-id-display');
  const qrImgEl = document.getElementById('cashier-qr-img');

  if (payableEl) payableEl.innerText = `₹${amount.toLocaleString('en-IN')}.00`;
  if (upiDisplayEl && pm) upiDisplayEl.innerText = pm.upi_id;

  if (qrImgEl && pm) {
    if (pm.qr_code_url) {
      qrImgEl.src = pm.qr_code_url;
    } else {
      const upiUrl = `upi://pay?pa=${pm.upi_id}&am=${amount}&pn=AmiriWin`;
      qrImgEl.src = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(upiUrl)}`;
    }
  }
}

// --- WITHDRAWAL SYSTEM HANDLERS (BANK & UPI DIRECT) ---

let currentWithdrawMethod = 'bank';

let selectedSavedBankId = null;
let selectedSavedUpiId = null;

async function getSavedBankAccounts() {
  const userId = currentState.currentUserId;
  const phone = currentState.phoneNumber;
  return await dbGetSavedPayoutAccounts(userId, phone, 'BANK');
}

async function getSavedUpiAccounts() {
  const userId = currentState.currentUserId;
  const phone = currentState.phoneNumber;
  return await dbGetSavedPayoutAccounts(userId, phone, 'UPI');
}

async function saveBankAccountObj(bankObj) {
  const record = {
    user_id: currentState.currentUserId || 'USR_GUEST',
    phone: currentState.phoneNumber || '0000000000',
    type: 'BANK',
    ...bankObj
  };
  const saved = await dbSavePayoutAccount(record);
  selectedSavedBankId = saved.id;
  await renderSavedBankAccountsList();
}

async function saveUpiAccountObj(upiObj) {
  const record = {
    user_id: currentState.currentUserId || 'USR_GUEST',
    phone: currentState.phoneNumber || '0000000000',
    type: 'UPI',
    ...upiObj
  };
  const saved = await dbSavePayoutAccount(record);
  selectedSavedUpiId = saved.id;
  await renderSavedUpiAccountsList();
}

async function deleteSavedBankAccount(id, event) {
  if (event) event.stopPropagation();
  if (!confirm('Are you sure you want to delete this saved bank account?')) return;

  await dbDeletePayoutAccount(id);

  if (selectedSavedBankId === id) {
    selectedSavedBankId = null;
  }
  await renderSavedBankAccountsList();
}

async function deleteSavedUpiAccount(id, event) {
  if (event) event.stopPropagation();
  if (!confirm('Are you sure you want to delete this saved UPI ID?')) return;

  await dbDeletePayoutAccount(id);

  if (selectedSavedUpiId === id) {
    selectedSavedUpiId = null;
  }
  await renderSavedUpiAccountsList();
}

async function selectSavedBankAccount(id) {
  selectedSavedBankId = id;
  const form = document.getElementById('add-bank-account-form');
  if (form) form.style.display = 'none';
  await renderSavedBankAccountsList();
}

async function selectSavedUpiAccount(id) {
  selectedSavedUpiId = id;
  const form = document.getElementById('add-upi-account-form');
  if (form) form.style.display = 'none';
  await renderSavedUpiAccountsList();
}

function toggleAddBankAccountForm() {
  const form = document.getElementById('add-bank-account-form');
  if (!form) return;
  const isHidden = form.style.display === 'none' || !form.style.display;
  form.style.display = isHidden ? 'block' : 'none';
}

function toggleAddUpiAccountForm() {
  const form = document.getElementById('add-upi-account-form');
  if (!form) return;
  const isHidden = form.style.display === 'none' || !form.style.display;
  form.style.display = isHidden ? 'block' : 'none';
}

async function renderSavedBankAccountsList() {
  const container = document.getElementById('saved-bank-accounts-list');
  const form = document.getElementById('add-bank-account-form');
  if (!container) return;

  const accounts = await getSavedBankAccounts();

  if (!accounts || accounts.length === 0) {
    container.innerHTML = `<div style="font-size: 11px; color: #94a3b8; font-style: italic; padding: 6px 0;">No saved bank accounts. Fill form below to add one.</div>`;
    if (form) form.style.display = 'block';
    selectedSavedBankId = null;
    return;
  }

  if (!selectedSavedBankId || !accounts.some(a => a.id === selectedSavedBankId)) {
    selectedSavedBankId = accounts[0].id;
  }

  container.innerHTML = accounts.map(acc => {
    const isSelected = acc.id === selectedSavedBankId;
    const borderStyle = isSelected
      ? 'border: 1.5px solid #10b981; background: rgba(16, 185, 129, 0.12);'
      : 'border: 1px solid rgba(255,255,255,0.15); background: rgba(30, 20, 55, 0.8);';

    const last4 = acc.acc ? acc.acc.slice(-4) : '****';

    return `
      <div onclick="selectSavedBankAccount('${acc.id}')" style="${borderStyle} border-radius: 10px; padding: 10px 14px; cursor: pointer; transition: all 0.2s;">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <div style="flex: 1; min-width: 0;">
            <div style="font-size: 13px; font-weight: 800; color: white; display: flex; align-items: center; gap: 8px;">
              <span>🏦 ${acc.bank || 'Bank Account'} (**** ${last4})</span>
              ${isSelected ? '<span style="background: #10b981; color: white; font-size: 9px; padding: 1px 6px; border-radius: 4px; font-weight: 900;">ACTIVE</span>' : ''}
            </div>
            <div style="font-size: 11px; color: #cbd5e1; margin-top: 2px;">
              Holder: <strong>${acc.name}</strong> • IFSC: <code>${acc.ifsc}</code>
            </div>
          </div>
          <div style="display: flex; align-items: center; gap: 10px; flex: 0 0 auto; margin-left: 8px;">
            ${isSelected ? '<i class="fa-solid fa-circle-check" style="color: #34d399; font-size: 16px;"></i>' : ''}
            <button type="button" onclick="deleteSavedBankAccount('${acc.id}', event)" style="background: none; border: none; color: #f87171; font-size: 14px; cursor: pointer; padding: 4px;" title="Delete saved account">
              <i class="fa-solid fa-trash"></i>
            </button>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

async function renderSavedUpiAccountsList() {
  const container = document.getElementById('saved-upi-accounts-list');
  const form = document.getElementById('add-upi-account-form');
  if (!container) return;

  const accounts = await getSavedUpiAccounts();

  if (!accounts || accounts.length === 0) {
    container.innerHTML = `<div style="font-size: 11px; color: #94a3b8; font-style: italic; padding: 6px 0;">No saved UPI IDs. Fill form below to add one.</div>`;
    if (form) form.style.display = 'block';
    selectedSavedUpiId = null;
    return;
  }

  if (!selectedSavedUpiId || !accounts.some(a => a.id === selectedSavedUpiId)) {
    selectedSavedUpiId = accounts[0].id;
  }

  container.innerHTML = accounts.map(acc => {
    const isSelected = acc.id === selectedSavedUpiId;
    const borderStyle = isSelected
      ? 'border: 1.5px solid #10b981; background: rgba(16, 185, 129, 0.12);'
      : 'border: 1px solid rgba(255,255,255,0.15); background: rgba(30, 20, 55, 0.8);';

    return `
      <div onclick="selectSavedUpiAccount('${acc.id}')" style="${borderStyle} border-radius: 10px; padding: 10px 14px; cursor: pointer; transition: all 0.2s;">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <div style="flex: 1; min-width: 0;">
            <div style="font-size: 13px; font-weight: 800; color: #38bdf8; display: flex; align-items: center; gap: 8px;">
              <span>📲 ${acc.vpa}</span>
              ${isSelected ? '<span style="background: #10b981; color: white; font-size: 9px; padding: 1px 6px; border-radius: 4px; font-weight: 900;">ACTIVE</span>' : ''}
            </div>
            <div style="font-size: 11px; color: #cbd5e1; margin-top: 2px;">
              Payee Name: <strong>${acc.name}</strong>
            </div>
          </div>
          <div style="display: flex; align-items: center; gap: 10px; flex: 0 0 auto; margin-left: 8px;">
            ${isSelected ? '<i class="fa-solid fa-circle-check" style="color: #34d399; font-size: 16px;"></i>' : ''}
            <button type="button" onclick="deleteSavedUpiAccount('${acc.id}', event)" style="background: none; border: none; color: #f87171; font-size: 14px; cursor: pointer; padding: 4px;" title="Delete saved UPI ID">
              <i class="fa-solid fa-trash"></i>
            </button>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

async function saveAndSelectNewBankAccount() {
  const name = document.getElementById('w-bank-name')?.value.trim();
  const acc = document.getElementById('w-bank-acc')?.value.trim();
  const accConfirm = document.getElementById('w-bank-acc-confirm')?.value.trim();
  const ifsc = document.getElementById('w-bank-ifsc')?.value.trim();
  const bank = document.getElementById('w-bank-bankname')?.value.trim();

  if (!name || !acc || !ifsc || !bank) {
    showModal('⚠️ Incomplete Details', 'Please fill in all Bank Account details completely.');
    return;
  }
  if (acc !== accConfirm) {
    showModal('⚠️ Account Mismatch', 'Bank Account Number and Confirm Account Number do not match.');
    return;
  }

  const bankObj = { name, acc, ifsc: ifsc.toUpperCase(), bank };
  await saveBankAccountObj(bankObj);

  const form = document.getElementById('add-bank-account-form');
  if (form) form.style.display = 'none';

  showModal('✅ Bank Account Saved!', `Bank Account (${bank} - **** ${acc.slice(-4)}) saved & selected for withdrawal!`);
}

async function saveAndSelectNewUpiAccount() {
  const vpa = document.getElementById('w-upi-vpa')?.value.trim();
  const name = document.getElementById('w-upi-name')?.value.trim();

  if (!vpa || !name) {
    showModal('⚠️ Incomplete Details', 'Please fill in your UPI ID / VPA and Registered Payee Name.');
    return;
  }

  const upiObj = { vpa, name };
  await saveUpiAccountObj(upiObj);

  const form = document.getElementById('add-upi-account-form');
  if (form) form.style.display = 'none';

  showModal('✅ UPI ID Saved!', `UPI ID (${vpa}) saved & selected for withdrawal!`);
}

async function openWithdrawScreen() {
  if (!currentState.isLoggedIn) {
    showModal('🔒 Login Required', 'Please login to withdraw funds.');
    switchScreen('login');
    return;
  }

  const balEl = document.getElementById('withdraw-balance-val');
  if (balEl) balEl.innerText = (currentState.userBalance || 0).toFixed(2);

  switchWithdrawMethod('bank');

  await renderSavedBankAccountsList();
  await renderSavedUpiAccountsList();

  await renderMyWithdrawalHistory();
  switchScreen('withdraw');
}

function openWithdrawModal() {
  openWithdrawScreen();
}

function switchWithdrawMethod(method) {
  currentWithdrawMethod = method;
  const btnBank = document.getElementById('tab-withdraw-bank');
  const btnUpi = document.getElementById('tab-withdraw-upi');
  const formBank = document.getElementById('withdraw-form-bank');
  const formUpi = document.getElementById('withdraw-form-upi');
  const submitBtn = document.querySelector('#screen-withdraw button[onclick="handleWithdrawSubmit()"]');

  if (method === 'bank') {
    if (btnBank) btnBank.classList.add('active');
    if (btnUpi) btnUpi.classList.remove('active');
    if (formBank) formBank.style.display = 'block';
    if (formUpi) formUpi.style.display = 'none';
    if (submitBtn) submitBtn.innerHTML = 'CONFIRM BANK WITHDRAWAL 🏦';
  } else {
    if (btnUpi) btnUpi.classList.add('active');
    if (btnBank) btnBank.classList.remove('active');
    if (formUpi) formUpi.style.display = 'block';
    if (formBank) formBank.style.display = 'none';
    if (submitBtn) submitBtn.innerHTML = 'CONFIRM UPI WITHDRAWAL 📲';
  }
}

function selectWithdrawPresetAmount(val, btnElement) {
  const input = document.getElementById('withdraw-amount-input');
  if (!input) return;

  if (val === 'MAX') {
    input.value = Math.floor(currentState.userBalance || 0);
  } else {
    input.value = val;
  }

  const container = btnElement?.parentElement || input.closest('div')?.nextElementSibling;
  if (container) {
    container.querySelectorAll('.amount-preset-card').forEach(b => b.classList.remove('active'));
  }
  if (btnElement && btnElement.classList) {
    btnElement.classList.add('active');
  }
}

async function handleWithdrawSubmit() {
  if (!currentState.isLoggedIn) {
    showModal('🔒 Login Required', 'Please login to withdraw funds.');
    return;
  }

  // Prevent multiple pending withdrawal requests per user
  const existingWds = await dbGetUserWithdrawals(currentState.currentUserId, currentState.phoneNumber);
  const pendingWd = (existingWds || []).find(w => (w.status || 'Pending').toUpperCase() === 'PENDING');
  if (pendingWd) {
    showModal('⏳ Pending Request Exists', `You already have a pending withdrawal request (${pendingWd.id}) for ₹${parseFloat(pendingWd.amount || 0).toFixed(2)} via ${pendingWd.method}. Please wait for admin to process it before placing a new request.`);
    return;
  }

  const amountInput = document.getElementById('withdraw-amount-input');
  const amount = parseFloat(amountInput?.value) || 0;

  if (amount < 500) {
    showModal('⚠️ Minimum Withdrawal', 'Minimum withdrawal amount is ₹500.00.');
    return;
  }

  if (amount > currentState.userBalance) {
    showModal('⚠️ Insufficient Balance', `Your withdrawable balance (₹${currentState.userBalance.toFixed(2)}) is less than requested ₹${amount}!`);
    return;
  }

  const submitBtn = document.querySelector('#screen-withdraw button[onclick="handleWithdrawSubmit()"]');
  if (submitBtn) {
    if (submitBtn.disabled) return;
    submitBtn.disabled = true;
    submitBtn.innerText = 'PROCESSING REQUEST... ⏳';
  }

  try {
    let details = null;
    if (currentWithdrawMethod === 'bank') {
      const savedBanks = await getSavedBankAccounts();
      const selAcc = savedBanks.find(b => b.id === selectedSavedBankId);

      if (selAcc) {
        details = { name: selAcc.name, acc: selAcc.acc, ifsc: selAcc.ifsc, bank: selAcc.bank };
      } else {
        const name = document.getElementById('w-bank-name')?.value.trim();
        const acc = document.getElementById('w-bank-acc')?.value.trim();
        const accConfirm = document.getElementById('w-bank-acc-confirm')?.value.trim();
        const ifsc = document.getElementById('w-bank-ifsc')?.value.trim();
        const bank = document.getElementById('w-bank-bankname')?.value.trim();

        if (!name || !acc || !ifsc || !bank) {
          showModal('⚠️ Select Payout Account', 'Please select a saved Bank Account or click "+ Add New Bank" to fill in details.');
          return;
        }
        if (acc !== accConfirm) {
          showModal('⚠️ Account Mismatch', 'Bank Account Number and Confirm Account Number do not match.');
          return;
        }

        details = { name, acc, ifsc: ifsc.toUpperCase(), bank };
        await saveBankAccountObj(details);
      }
    } else {
      const savedUpis = await getSavedUpiAccounts();
      const selUpi = savedUpis.find(u => u.id === selectedSavedUpiId);

      if (selUpi) {
        details = { vpa: selUpi.vpa, name: selUpi.name };
      } else {
        const vpa = document.getElementById('w-upi-vpa')?.value.trim();
        const name = document.getElementById('w-upi-name')?.value.trim();

        if (!vpa || !name) {
          showModal('⚠️ Select Payout Account', 'Please select a saved UPI ID or click "+ Add New UPI ID" to fill in details.');
          return;
        }

        details = { vpa, name };
        await saveUpiAccountObj(details);
      }
    }

    // Submit withdrawal request to DB with full details snapshot
    const rec = await dbRequestWithdrawal(currentState.currentUserId, currentState.phoneNumber, amount, currentWithdrawMethod.toUpperCase(), details);

    // Update local state balance
    currentState.userBalance = Math.max(0, currentState.userBalance - amount);
    if (typeof updateAllWalletBalanceDisplays === 'function') updateAllWalletBalanceDisplays();

    // Save updated balance to DB & session
    await dbUpdateUser(currentState.currentUserId, { balance: currentState.userBalance });
    const savedSession = sessionStorage.getItem('amiriwin_user_session');
    if (savedSession) {
      try {
        const sess = JSON.parse(savedSession);
        sess.userBalance = currentState.userBalance;
        sessionStorage.setItem('amiriwin_user_session', JSON.stringify(sess));
      } catch (e) { }
    }

    showModal('🚀 Withdrawal Requested!', `Your payout request of ₹${amount.toFixed(2)} via ${currentWithdrawMethod.toUpperCase()} has been submitted successfully! Admin will process your transfer soon.`);

    await renderMyWithdrawalHistory();
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.innerText = currentWithdrawMethod === 'bank' ? 'CONFIRM BANK WITHDRAWAL 🏦' : 'CONFIRM UPI WITHDRAWAL 📲';
    }
  }
}

async function renderMyWithdrawalHistory() {
  const container = document.getElementById('withdraw-my-history-list');
  if (!container) return;

  const currentUserId = currentState.currentUserId;
  const phone = currentState.phoneNumber;

  if (!currentState.isLoggedIn || (!currentUserId && !phone)) {
    container.innerHTML = `<div style="padding: 18px; text-align: center; color: var(--color-text-muted); font-size: 12px;">Please login to view withdrawal history.</div>`;
    return;
  }

  try {
    const wds = await dbGetUserWithdrawals(currentUserId, phone);

    if (!wds || wds.length === 0) {
      container.innerHTML = `<div style="padding: 18px; text-align: center; color: var(--color-text-muted); font-size: 12px; font-weight: 600;">No withdrawal requests yet.</div>`;
      return;
    }

    let html = `
      <table class="bet-history-table" style="width: 100%; border-collapse: collapse; margin-top: 6px;">
        <thead>
          <tr style="border-bottom: 1px solid rgba(255,255,255,0.1); font-size: 11px; color: #94a3b8; text-align: left;">
            <th style="padding: 8px;">Date</th>
            <th style="padding: 8px;">Method</th>
            <th style="padding: 8px;">Amount</th>
            <th style="padding: 8px; text-align: right;">Status</th>
          </tr>
        </thead>
        <tbody>
    `;

    wds.forEach(w => {
      const isBank = w.method === 'BANK';
      const modeBadge = isBank
        ? `<span style="background: rgba(56, 189, 248, 0.2); color: #38bdf8; padding: 2px 6px; border-radius: 4px; font-size: 10px; font-weight: 800;">🏦 Bank</span>`
        : `<span style="background: rgba(168, 85, 247, 0.2); color: #a855f7; padding: 2px 6px; border-radius: 4px; font-size: 10px; font-weight: 800;">📲 UPI</span>`;

      let statusBadge = '';
      const st = (w.status || 'Pending').toUpperCase();
      if (st === 'APPROVED') {
        const utrTag = w.utr_number ? `<br><span style="font-size: 10px; color: #60a5fa; font-family: monospace; font-weight: 800;">UTR: ${w.utr_number}</span>` : '';
        statusBadge = `<span style="color: #34d399; font-weight: 900; font-size: 11px;">✅ Approved</span>${utrTag}`;
      } else if (st === 'REJECTED') {
        statusBadge = `<span style="color: #f87171; font-weight: 800; font-size: 11px;" title="${w.admin_notes || ''}">❌ Refunded</span>`;
      } else {
        statusBadge = `<span style="color: #fbbf24; font-weight: 800; font-size: 11px;">⏳ Pending</span>`;
      }

      const dateStr = w.created_at ? new Date(w.created_at).toLocaleDateString() : 'Recent';

      html += `
        <tr style="border-bottom: 1px solid rgba(255,255,255,0.05); font-size: 12px;">
          <td style="padding: 8px; font-size: 11px; color: #94a3b8;">${dateStr}</td>
          <td style="padding: 8px;">${modeBadge}</td>
          <td style="padding: 8px; font-weight: 700; color: #ffe066;">₹${parseFloat(w.amount).toFixed(2)}</td>
          <td style="padding: 8px; text-align: right;">${statusBadge}</td>
        </tr>
      `;
    });

    html += `</tbody></table>`;
    container.innerHTML = html;
  } catch (err) {
    console.error("Error rendering withdrawal history:", err);
    container.innerHTML = `<div style="padding: 16px; text-align: center; color: var(--color-text-muted); font-size: 12px;">Unable to load withdrawal records.</div>`;
  }
}

async function openBetRecordsModal() {
  const modal = document.getElementById('modal-bet-records');
  if (!modal) return;
  modal.style.display = 'flex';

  await renderMyBetRecordsInModal();
}

function closeBetRecordsModal() {
  const modal = document.getElementById('modal-bet-records');
  if (modal) modal.style.display = 'none';
}

async function renderMyBetRecordsInModal() {
  const container = document.getElementById('modal-bet-records-list');
  if (!container) return;

  const currentUserId = currentState.currentUserId;
  const phone = currentState.phoneNumber;

  if (!currentState.isLoggedIn || (!currentUserId && !phone)) {
    container.innerHTML = `<div style="padding: 24px; text-align: center; color: var(--color-text-muted); font-size: 13px;">Please login to view your bet records.</div>`;
    return;
  }

  try {
    const catNames = typeof dbGetCategoryNames === 'function' ? await dbGetCategoryNames() : (typeof getCategoryNamesSync === 'function' ? getCategoryNamesSync() : { cat1: 'Bowler', cat2: 'Batsman' });
    const animalsConfig = typeof dbGetAnimalsConfig === 'function' ? await dbGetAnimalsConfig() : [];

    let dbBets = [];
    if (typeof supabaseClient !== 'undefined' && supabaseClient) {
      try {
        const { data, error } = await supabaseClient
          .from('user_bets_10x')
          .select('*')
          .or(`user_id.eq.${currentUserId},phone.eq.${phone}`)
          .order('created_at', { ascending: false })
          .limit(100);

        if (!error && data) dbBets = data;
      } catch (e) { console.warn("Fetch modal bet history warning:", e); }
    }

    if (!dbBets || dbBets.length === 0) {
      dbBets = (typeof memoryUserBets10x !== 'undefined' ? memoryUserBets10x : []).filter(b =>
        (currentUserId && b.user_id === currentUserId) ||
        (phone && (b.phone === phone || (b.phone && b.phone.endsWith(phone.slice(-10)))))
      );
    }

    const activeBets = (state10x.myCurrentRoundBets || []).map(b => ({
      round_id: 'Active Round',
      bet_type: b.betType,
      category: b.category,
      card_number: b.cardNumber,
      bet_amount: b.amount,
      payout_amount: 0,
      status: 'PENDING',
      created_at: new Date().toISOString()
    }));

    const allBetsCombined = [...activeBets, ...dbBets];

    if (!allBetsCombined || allBetsCombined.length === 0) {
      container.innerHTML = `<div style="padding: 24px; text-align: center; color: var(--color-text-muted); font-size: 13px;">No bet records found. Place your first bet in the 10X Card Game!</div>`;
      return;
    }

    let html = `<div style="display: flex; flex-direction: column; gap: 10px;">`;

    allBetsCombined.forEach(bet => {
      const isWon = bet.status === 'WON';
      const isLost = bet.status === 'LOST';

      let statusBadge = '<span style="background: rgba(234,179,8,0.2); color: #eab308; padding: 2px 8px; border-radius: 6px; font-size: 10px; font-weight: 800;">⏳ PENDING</span>';
      if (isWon) {
        statusBadge = '<span style="background: rgba(16,185,129,0.2); color: #34d399; padding: 2px 8px; border-radius: 6px; font-size: 10px; font-weight: 900;">🟢 WON</span>';
      } else if (isLost) {
        statusBadge = '<span style="background: rgba(239,68,68,0.2); color: #ef4444; padding: 2px 8px; border-radius: 6px; font-size: 10px; font-weight: 800;">🔴 LOST</span>';
      }

      let selectionText = '';
      if (bet.bet_type === 'category_2x' || bet.betType === 'category_2x') {
        const catLabel = bet.category === 'wild' ? catNames.cat1 : catNames.cat2;
        selectionText = `⚡ 2X ${catLabel}`;
      } else {
        const cardId = bet.card_number || bet.cardNumber || 1;
        const anim = animalsConfig.find(a => a.id === cardId) || { name: `Card #${cardId}` };
        selectionText = `🎯 Card #${cardId} (${anim.name})`;
      }

      const dateStr = bet.created_at ? new Date(bet.created_at).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' }) : 'Just now';
      const roundNum = bet.round_id ? (String(bet.round_id).startsWith('#') ? bet.round_id : `#${bet.round_id}`) : '#---';

      html += `
        <div style="background: rgba(30, 15, 60, 0.85); border: 1px solid var(--border-subtle); border-radius: 10px; padding: 12px; display: flex; justify-content: space-between; align-items: center;">
          <div>
            <div style="font-size: 13px; font-weight: 800; color: white; margin-bottom: 3px;">${selectionText}</div>
            <div style="font-size: 10px; color: #94a3b8;">Round: <span style="color: #ffe066; font-weight: 700;">${roundNum}</span> • ${dateStr}</div>
          </div>
          <div style="text-align: right;">
            <div>${statusBadge}</div>
            <div style="font-size: 13px; font-weight: 900; color: ${isWon ? '#34d399' : '#ffffff'}; margin-top: 4px;">
              ₹${parseFloat(bet.bet_amount || 0).toFixed(2)}
              ${isWon ? `<span style="font-size: 11px; color: #34d399; margin-left: 4px;">(+₹${parseFloat(bet.payout_amount || 0).toFixed(2)})</span>` : ''}
            </div>
          </div>
        </div>
      `;
    });

    html += `</div>`;
    container.innerHTML = html;
  } catch (e) {
    console.warn("Render modal bet records error:", e);
    container.innerHTML = `<div style="padding: 16px; text-align: center; color: #ef4444; font-size: 12px;">Failed to load bet records.</div>`;
  }
}

// --- TRANSACTION HISTORY & BET RECORDS FULL SCREEN SYSTEM ---
function openMineScreenOrBack() {
  switchScreen('home');
  switchTab('mine');
}

let activeTxTab = 'deposit';

async function openTransactionHistoryScreen(defaultTab = 'deposit') {
  if (!currentState.isLoggedIn) {
    showModal('🔒 Login Required', 'Please login to view Transaction History.');
    switchScreen('login');
    return;
  }

  switchScreen('tx-history');
  await switchTxHistoryTab(defaultTab);
}

function openTransactionHistoryModal(defaultTab = 'deposit') {
  openTransactionHistoryScreen(defaultTab);
}

function closeTransactionHistoryModal() {
  openMineScreenOrBack();
}

async function openBetRecordsScreen() {
  if (!currentState.isLoggedIn) {
    showModal('🔒 Login Required', 'Please login to view Bet Records.');
    switchScreen('login');
    return;
  }

  switchScreen('bet-records');
  await renderMyBetRecordsInScreen();
}

function openBetRecordsModal() {
  openBetRecordsScreen();
}

function closeBetRecordsModal() {
  openMineScreenOrBack();
}

async function switchTxHistoryTab(tab) {
  activeTxTab = tab;
  const btnDep = document.getElementById('tab-tx-deposit');
  const btnWd = document.getElementById('tab-tx-withdraw');

  if (tab === 'deposit') {
    if (btnDep) { btnDep.style.background = '#3b82f6'; btnDep.style.color = 'white'; }
    if (btnWd) { btnWd.style.background = 'transparent'; btnWd.style.color = '#94a3b8'; }
    await renderMyDepositHistory();
  } else {
    if (btnWd) { btnWd.style.background = '#8b5cf6'; btnWd.style.color = 'white'; }
    if (btnDep) { btnDep.style.background = 'transparent'; btnDep.style.color = '#94a3b8'; }
    await renderMyWithdrawalHistoryInModal();
  }
}

async function renderMyDepositHistory() {
  const container = document.getElementById('tx-history-full-list') || document.getElementById('modal-tx-history-list');
  if (!container) return;

  const currentUserId = currentState.currentUserId;
  const phone = currentState.phoneNumber;

  if (!currentState.isLoggedIn) {
    container.innerHTML = `<div style="text-align: center; color: var(--color-text-muted); font-size: 12px; padding: 24px;">Please login to view deposit history.</div>`;
    return;
  }

  container.innerHTML = `<div style="padding: 20px; text-align: center; color: var(--color-text-muted); font-size: 13px;">Loading deposit records...</div>`;

  const deps = await dbGetUserDeposits(currentUserId, phone);

  if (!deps || deps.length === 0) {
    container.innerHTML = `
      <div style="text-align: center; padding: 40px 16px; color: var(--color-text-muted);">
        <i class="fa-solid fa-receipt" style="font-size: 36px; margin-bottom: 12px; opacity: 0.4;"></i>
        <div style="font-size: 14px; font-weight: 700;">No Deposit Transactions Found</div>
        <div style="font-size: 12px; margin-top: 4px;">Your deposit records will appear here after you add funds.</div>
      </div>
    `;
    return;
  }

  container.innerHTML = deps.map(d => {
    const isPending = (d.status || 'Pending').toUpperCase() === 'PENDING';
    const isApproved = (d.status || '').toUpperCase() === 'APPROVED';
    const isRejected = (d.status || '').toUpperCase() === 'REJECTED';

    let statusBadge = `<span style="background: rgba(245,166,35,0.15); color: #f5a623; padding: 3px 10px; border-radius: 6px; font-weight: 800; font-size: 11px;">⏳ Pending Review</span>`;
    if (isApproved) statusBadge = `<span style="background: rgba(16,185,129,0.15); color: #34d399; padding: 3px 10px; border-radius: 6px; font-weight: 800; font-size: 11px;">🟢 Credited to Wallet</span>`;
    if (isRejected) statusBadge = `<span style="background: rgba(239,68,68,0.15); color: #f87171; padding: 3px 10px; border-radius: 6px; font-weight: 800; font-size: 11px;">🔴 Rejected</span>`;

    const dateStr = d.created_at ? new Date(d.created_at).toLocaleString() : (d.date || 'Recent');

    return `
      <div style="background: rgba(30, 20, 55, 0.85); border: 1px solid rgba(255,255,255,0.12); border-radius: 12px; padding: 14px; transition: all 0.2s; box-shadow: 0 4px 12px rgba(0,0,0,0.2);">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
          <div style="display: flex; align-items: center; gap: 10px;">
            <div style="width: 34px; height: 34px; border-radius: 50%; background: rgba(16,185,129,0.2); display: flex; align-items: center; justify-content: center; color: #34d399; font-size: 14px;">
              <i class="fa-solid fa-arrow-down-left"></i>
            </div>
            <div>
              <div style="font-size: 14px; font-weight: 800; color: white;">Deposit (${d.method || 'UPI'})</div>
              <div style="font-size: 11px; color: #94a3b8;">${dateStr}</div>
            </div>
          </div>
          <div style="text-align: right;">
            <div style="font-size: 16px; font-weight: 900; color: #34d399;">+ ₹ ${parseFloat(d.amount || 0).toFixed(2)}</div>
            <div style="margin-top: 3px;">${statusBadge}</div>
          </div>
        </div>
        <div style="display: flex; justify-content: space-between; align-items: center; font-size: 11px; color: #cbd5e1; border-top: 1px dashed rgba(255,255,255,0.12); padding-top: 8px; margin-top: 6px;">
          <span>UTR / Ref: <strong style="color: #60a5fa; font-family: monospace; font-size: 12px;">${d.utr_number || 'N/A'}</strong></span>
          <span style="font-size: 11px; color: #64748b;">ID: ${d.id}</span>
        </div>
      </div>
    `;
  }).join('');
}

async function renderMyWithdrawalHistoryInModal() {
  const container = document.getElementById('tx-history-full-list') || document.getElementById('modal-tx-history-list');
  if (!container) return;

  const currentUserId = currentState.currentUserId;
  const phone = currentState.phoneNumber;

  if (!currentState.isLoggedIn) {
    container.innerHTML = `<div style="text-align: center; color: var(--color-text-muted); font-size: 12px; padding: 24px;">Please login to view withdrawal history.</div>`;
    return;
  }

  container.innerHTML = `<div style="padding: 20px; text-align: center; color: var(--color-text-muted); font-size: 13px;">Loading withdrawal records...</div>`;

  const wds = await dbGetUserWithdrawals(currentUserId, phone);

  if (!wds || wds.length === 0) {
    container.innerHTML = `
      <div style="text-align: center; padding: 40px 16px; color: var(--color-text-muted);">
        <i class="fa-solid fa-receipt" style="font-size: 36px; margin-bottom: 12px; opacity: 0.4;"></i>
        <div style="font-size: 14px; font-weight: 700;">No Withdrawal Transactions Found</div>
        <div style="font-size: 12px; margin-top: 4px;">Your withdrawal requests will appear here.</div>
      </div>
    `;
    return;
  }

  container.innerHTML = wds.map(w => {
    const isBank = w.method === 'BANK';
    const bd = w.bank_details || {};
    const detailText = isBank
      ? `🏦 ${bd.bank || 'Bank'} (**** ${(bd.acc || '').slice(-4)}) - ${bd.name || ''}`
      : `📲 UPI: ${bd.vpa || 'N/A'} (${bd.name || ''})`;

    const isPending = (w.status || 'Pending').toUpperCase() === 'PENDING';
    const isApproved = (w.status || '').toUpperCase() === 'APPROVED';
    const isRejected = (w.status || '').toUpperCase() === 'REJECTED';

    let statusBadge = `<span style="background: rgba(245,166,35,0.15); color: #f5a623; padding: 3px 10px; border-radius: 6px; font-weight: 800; font-size: 11px;">⏳ Pending Review</span>`;
    if (isApproved) statusBadge = `<span style="background: rgba(16,185,129,0.15); color: #34d399; padding: 3px 10px; border-radius: 6px; font-weight: 800; font-size: 11px;">🟢 Transferred</span>`;
    if (isRejected) statusBadge = `<span style="background: rgba(239,68,68,0.15); color: #f87171; padding: 3px 10px; border-radius: 6px; font-weight: 800; font-size: 11px;">🔴 Refunded to Wallet</span>`;

    const dateStr = w.created_at ? new Date(w.created_at).toLocaleString() : (w.date || 'Recent');

    return `
      <div style="background: rgba(30, 20, 55, 0.85); border: 1px solid rgba(255,255,255,0.12); border-radius: 12px; padding: 14px; transition: all 0.2s; box-shadow: 0 4px 12px rgba(0,0,0,0.2);">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
          <div style="display: flex; align-items: center; gap: 10px;">
            <div style="width: 34px; height: 34px; border-radius: 50%; background: rgba(248,113,113,0.2); display: flex; align-items: center; justify-content: center; color: #f87171; font-size: 14px;">
              <i class="fa-solid fa-arrow-up-right"></i>
            </div>
            <div>
              <div style="font-size: 14px; font-weight: 800; color: white;">Withdrawal (${w.method})</div>
              <div style="font-size: 11px; color: #94a3b8;">${dateStr}</div>
            </div>
          </div>
          <div style="text-align: right;">
            <div style="font-size: 16px; font-weight: 900; color: #ffe066;">- ₹ ${parseFloat(w.amount || 0).toFixed(2)}</div>
            <div style="margin-top: 3px;">${statusBadge}</div>
          </div>
        </div>
        <div style="font-size: 12px; color: #cbd5e1; margin-bottom: 6px; background: rgba(15,23,42,0.6); padding: 6px 10px; border-radius: 8px;">
          ${detailText}
        </div>
        <div style="display: flex; justify-content: space-between; align-items: center; font-size: 11px; color: #64748b;">
          <span>ID: ${w.id}</span>
          ${w.utr_number ? `<span style="color: #60a5fa; font-weight: 700;">Ref/UTR: ${w.utr_number}</span>` : ''}
        </div>
      </div>
    `;
  }).join('');
}

async function renderMyBetRecordsInScreen() {
  const container = document.getElementById('bet-records-full-list') || document.getElementById('modal-bet-records-list');
  if (!container) return;

  if (!currentState.isLoggedIn) {
    container.innerHTML = `<div style="text-align: center; color: var(--color-text-muted); font-size: 12px; padding: 24px;">Please login to view bet records.</div>`;
    return;
  }

  container.innerHTML = `<div style="padding: 24px; text-align: center; color: var(--color-text-muted); font-size: 13px;">Loading bet records...</div>`;

  try {
    const currentUserId = currentState.currentUserId;
    const phone = currentState.phoneNumber;

    let userBets = [];
    if (typeof dbGetUserBets10x === 'function') {
      userBets = await dbGetUserBets10x(currentUserId, phone);
    }
    if ((!userBets || userBets.length === 0) && typeof memoryUserBets10x !== 'undefined') {
      const cleanPhone = phone ? String(phone).slice(-10) : '';
      userBets = memoryUserBets10x.filter(b =>
        (currentUserId && b.user_id && (b.user_id === currentUserId || b.user_id.includes(currentUserId) || String(currentUserId).includes(b.user_id))) ||
        (cleanPhone && b.phone && String(b.phone).slice(-10) === cleanPhone)
      );
    }

    // Include active round bets placed in current session
    const activeRoundBets = (typeof state10x !== 'undefined' && state10x.myCurrentRoundBets ? state10x.myCurrentRoundBets : []).map(b => ({
      id: `ACTIVE_${Math.random()}`,
      round_id: state10x.currentRoundInfo ? state10x.currentRoundInfo.id : 'Active Round',
      bet_type: b.betType,
      category: b.category,
      card_number: b.cardNumber,
      bet_amount: b.amount,
      payout_amount: 0,
      status: 'PENDING',
      created_at: new Date().toISOString()
    }));

    const allBetsCombined = [...activeRoundBets, ...userBets];

    const catNames = typeof getCategoryNamesSync === 'function' ? getCategoryNamesSync() : { cat1: 'Bowler', cat2: 'Batsman' };
    const animalsConfig = typeof getAnimalsConfigSync === 'function' ? getAnimalsConfigSync() : [];

    if (!allBetsCombined || allBetsCombined.length === 0) {
      container.innerHTML = `
        <div style="text-align: center; padding: 40px 16px; color: var(--color-text-muted);">
          <i class="fa-solid fa-gamepad" style="font-size: 36px; margin-bottom: 12px; opacity: 0.4;"></i>
          <div style="font-size: 14px; font-weight: 700;">No Bet Records Found</div>
          <div style="font-size: 12px; margin-top: 4px;">Place your first bet in the 10X Card Game to see your history here!</div>
        </div>
      `;
      return;
    }

    container.innerHTML = allBetsCombined.map(bet => {
      const isWon = (bet.status || '').toUpperCase() === 'WON';
      const isLost = (bet.status || '').toUpperCase() === 'LOST';

      let statusBadge = '<span style="background: rgba(234,179,8,0.2); color: #eab308; padding: 3px 10px; border-radius: 6px; font-size: 11px; font-weight: 800;">⏳ PENDING</span>';
      if (isWon) {
        statusBadge = '<span style="background: rgba(16,185,129,0.2); color: #34d399; padding: 3px 10px; border-radius: 6px; font-size: 11px; font-weight: 900;">🟢 WON</span>';
      } else if (isLost) {
        statusBadge = '<span style="background: rgba(239,68,68,0.2); color: #ef4444; padding: 3px 10px; border-radius: 6px; font-size: 11px; font-weight: 800;">🔴 LOST</span>';
      }

      let selectionText = '';
      if (bet.bet_type === 'category_2x' || bet.betType === 'category_2x') {
        const catLabel = bet.category === 'wild' ? catNames.cat1 : catNames.cat2;
        selectionText = `⚡ 2X ${catLabel}`;
      } else {
        const cardId = bet.card_number || bet.cardNumber || 1;
        const anim = animalsConfig.find(a => a.id === cardId) || { name: `Card #${cardId}` };
        selectionText = `🎯 Card #${cardId} (${anim.name})`;
      }

      const dateStr = bet.created_at ? new Date(bet.created_at).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' }) : 'Just now';
      const roundNum = bet.round_id ? (String(bet.round_id).startsWith('#') ? bet.round_id : `#${bet.round_id}`) : '#---';

      return `
        <div style="background: rgba(30, 15, 60, 0.85); border: 1px solid var(--border-subtle); border-radius: 12px; padding: 14px; display: flex; justify-content: space-between; align-items: center; box-shadow: 0 4px 12px rgba(0,0,0,0.2);">
          <div>
            <div style="font-size: 14px; font-weight: 800; color: white; margin-bottom: 4px;">${selectionText}</div>
            <div style="font-size: 11px; color: #94a3b8;">Round: <span style="color: #ffe066; font-weight: 700;">${roundNum}</span> • ${dateStr}</div>
          </div>
          <div style="text-align: right;">
            <div>${statusBadge}</div>
            <div style="font-size: 14px; font-weight: 900; color: ${isWon ? '#34d399' : '#ffffff'}; margin-top: 6px;">
              ₹${parseFloat(bet.bet_amount || 0).toFixed(2)}
              ${isWon ? `<span style="font-size: 12px; color: #34d399; margin-left: 4px;">(+₹${parseFloat(bet.payout_amount || 0).toFixed(2)})</span>` : ''}
            </div>
          </div>
        </div>
      `;
    }).join('');
  } catch (e) {
    console.warn("Render full bet records error:", e);
    container.innerHTML = `<div style="padding: 20px; text-align: center; color: #ef4444; font-size: 13px;">Failed to load bet records.</div>`;
  }
}

// --- BC.GAME STYLE 3D FLIP COIN GAME CONTROLLER ---
let stateCoinFlip = {
  selectedSide: 'heads', // 'heads' or 'tails'
  seriesStreak: 0,
  isFlipping: false,
  currentRotationY: 0, // Cumulative 3D rotation angle in degrees
  recentHistory: ['heads', 'tails', 'heads', 'heads', 'tails'],
  // Multi-Flip Double-Up Cashout state
  isStreakActive: false,
  initialBetAmount: 0,
  accumulatedPot: 0,
  currentMultiplier: 1.96
};

function initFlipCoinGame() {
  const balEl = document.getElementById('flip-coin-balance-val');
  if (balEl) balEl.innerText = (currentState.userBalance || 0).toFixed(2);

  const seriesEl = document.getElementById('flip-series-val');
  if (seriesEl) seriesEl.innerText = stateCoinFlip.seriesStreak;

  const coinEl = document.getElementById('coin-flipper-el');
  if (coinEl) {
    coinEl.style.transition = 'none';
    coinEl.style.transform = `rotateY(${stateCoinFlip.currentRotationY || 0}deg)`;
  }

  renderCoinFlipHistoryPills();
  updateFlipStreakLadderUI();
}

function selectCoinSide(side) {
  stateCoinFlip.selectedSide = side;
  const btnHeads = document.getElementById('btn-side-heads');
  const btnTails = document.getElementById('btn-side-tails');

  if (side === 'heads') {
    if (btnHeads) btnHeads.classList.add('active');
    if (btnTails) btnTails.classList.remove('active');
  } else {
    if (btnTails) btnTails.classList.add('active');
    if (btnHeads) btnHeads.classList.remove('active');
  }
}

function adjustCoinBetAmount(action) {
  if (stateCoinFlip.isStreakActive) return; // Locked during streak
  const input = document.getElementById('flip-amount-input');
  if (!input) return;

  let val = parseFloat(input.value) || 10;
  const userBal = currentState.userBalance || 0;

  if (action === 'half') {
    val = Math.max(10, Math.floor(val / 2));
  } else if (action === 'double') {
    val = val * 2;
  } else if (action === 'max') {
    val = Math.max(10, Math.floor(userBal));
  }

  input.value = val;
}

function updateFlipStreakLadderUI() {
  const steps = [1.96, 3.92, 7.84, 15.68, 31.36];
  const currentStreak = stateCoinFlip.seriesStreak || 0;

  steps.forEach((mult, idx) => {
    const el = document.getElementById(`streak-step-${idx + 1}`);
    if (!el) return;
    if (idx + 1 === currentStreak) {
      el.style.background = 'linear-gradient(135deg, rgba(16, 185, 129, 0.45), rgba(52, 211, 153, 0.35))';
      el.style.border = '1.5px solid #10b981';
      el.style.color = '#34d399';
      el.style.boxShadow = '0 0 10px rgba(16, 185, 129, 0.5)';
      el.style.transform = 'scale(1.05)';
    } else if (idx + 1 < currentStreak) {
      el.style.background = 'rgba(16, 185, 129, 0.15)';
      el.style.border = '1px solid rgba(16, 185, 129, 0.4)';
      el.style.color = '#10b981';
      el.style.boxShadow = 'none';
      el.style.transform = 'scale(1)';
    } else {
      el.style.background = 'rgba(30, 41, 59, 0.5)';
      el.style.border = '1px solid rgba(255,255,255,0.08)';
      el.style.color = '#94a3b8';
      el.style.boxShadow = 'none';
      el.style.transform = 'scale(1)';
    }
  });

  const multiplyValEl = document.getElementById('flip-multiply-val');
  const payoutBadgeEl = document.getElementById('flip-payout-badge');
  const btnCashout = document.getElementById('btn-flip-cashout');
  const cashoutValEl = document.getElementById('flip-cashout-val');
  const btnAction = document.getElementById('btn-flip-action');
  const amountContainer = document.getElementById('flip-amount-container');

  if (stateCoinFlip.isStreakActive && stateCoinFlip.accumulatedPot > 0) {
    const nextMult = (stateCoinFlip.currentMultiplier * 2).toFixed(2);
    if (multiplyValEl) multiplyValEl.innerText = `x${stateCoinFlip.currentMultiplier.toFixed(2)}`;
    if (payoutBadgeEl) payoutBadgeEl.innerText = `Next: ${nextMult}X`;

    if (btnCashout) {
      btnCashout.style.display = 'block';
      if (cashoutValEl) cashoutValEl.innerText = stateCoinFlip.accumulatedPot.toFixed(2);
    }
    if (btnAction) {
      btnAction.innerHTML = `⚡ DOUBLE UP (Next: ${nextMult}x) <i class="fa-solid fa-angles-up" style="margin-left: 6px;"></i>`;
      btnAction.style.background = 'linear-gradient(135deg, #10b981, #059669)';
    }
    if (amountContainer) amountContainer.style.opacity = '0.4';
    const amountInput = document.getElementById('flip-amount-input');
    if (amountInput) amountInput.disabled = true;
  } else {
    if (multiplyValEl) multiplyValEl.innerText = 'x1.96';
    if (payoutBadgeEl) payoutBadgeEl.innerText = 'Payout: 1.96X';
    if (btnCashout) btnCashout.style.display = 'none';
    if (btnAction) {
      btnAction.innerHTML = `FLIP COIN <i class="fa-solid fa-coins" style="color: #ffe066; margin-left: 6px;"></i>`;
      btnAction.style.background = '';
    }
    if (amountContainer) amountContainer.style.opacity = '1';
    const amountInput = document.getElementById('flip-amount-input');
    if (amountInput) amountInput.disabled = false;
  }
}

async function cashOutCoinFlip() {
  if (!stateCoinFlip.isStreakActive || stateCoinFlip.accumulatedPot <= 0) return;
  if (stateCoinFlip.isFlipping) return;

  const cashoutAmt = stateCoinFlip.accumulatedPot;
  const streak = stateCoinFlip.seriesStreak;
  const mult = stateCoinFlip.currentMultiplier;
  const initialBet = stateCoinFlip.initialBetAmount || 10;

  // Credit full accumulated pot to wallet
  currentState.userBalance = parseFloat((currentState.userBalance + cashoutAmt).toFixed(2));
  updateAllWalletBalanceDisplays();

  const balEl = document.getElementById('flip-coin-balance-val');
  if (balEl) balEl.innerText = currentState.userBalance.toFixed(2);

  if (currentState.currentUserId && typeof dbUpdateUser === 'function') {
    dbUpdateUser(currentState.currentUserId, { balance: currentState.userBalance }).catch(e => console.warn(e));
  }

  // Animation and celebration sounds
  playCoinTossSpinSound();
  animateWalletBalanceAddition(cashoutAmt);
  showCoinFlipFloatingResult(true, cashoutAmt, `CASH OUT (${mult.toFixed(2)}x)`);

  // Record bet into database
  if (typeof dbRecordCoinFlipBet === 'function') {
    dbRecordCoinFlipBet(
      currentState.currentUserId,
      currentState.phoneNumber,
      initialBet,
      stateCoinFlip.selectedSide,
      stateCoinFlip.selectedSide,
      true,
      cashoutAmt
    ).then(() => {
      if (typeof flipBetHistoryState !== 'undefined') flipBetHistoryState.currentPage = 1;
      if (typeof renderFlipBetHistory === 'function') renderFlipBetHistory();
    }).catch(e => console.warn(e));
  }

  // Reset streak
  stateCoinFlip.isStreakActive = false;
  stateCoinFlip.seriesStreak = 0;
  stateCoinFlip.accumulatedPot = 0;
  stateCoinFlip.currentMultiplier = 1.96;

  const seriesEl = document.getElementById('flip-series-val');
  if (seriesEl) seriesEl.innerText = 0;

  updateFlipStreakLadderUI();
}

window.cashOutCoinFlip = cashOutCoinFlip;

function renderCoinFlipHistoryPills() {
  const container = document.getElementById('flip-history-pills-list');
  if (!container) return;

  if (!stateCoinFlip.recentHistory || stateCoinFlip.recentHistory.length === 0) {
    container.innerHTML = `<span style="font-size: 11px; color: #64748b; font-style: italic;">No flips yet. Place your first flip!</span>`;
    return;
  }

  container.innerHTML = stateCoinFlip.recentHistory.map(h => {
    const isHeads = h === 'heads';
    const bg = isHeads ? 'rgba(245, 158, 11, 0.2)' : 'rgba(148, 163, 184, 0.2)';
    const border = isHeads ? '#f59e0b' : '#94a3b8';
    const color = isHeads ? '#ffe066' : '#f1f5f9';
    const icon = isHeads ? '🟡' : '⚪';
    const label = isHeads ? 'H (Heads)' : 'T (Tails)';

    return `
      <div style="background: ${bg}; border: 1px solid ${border}; color: ${color}; padding: 3px 8px; border-radius: 6px; font-size: 10px; font-weight: 800; display: flex; align-items: center; gap: 4px; white-space: nowrap;">
        <span>${icon}</span>
        <span>${label}</span>
      </div>
    `;
  }).join('');
}

// Play Metallic Spin Audio (Sound isolation: ONLY plays when on flip-coin screen)
function playCoinTossSpinSound() {
  if (currentState.activeScreen !== 'flip-coin') return;
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    for (let i = 0; i < 6; i++) {
      setTimeout(() => {
        if (currentState.activeScreen !== 'flip-coin') return;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(1200 - (i * 80), ctx.currentTime);
        gain.gain.setValueAtTime(0.12, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.08);
      }, i * 140);
    }
  } catch(e) {}
}

// --- ROLLERCOASTER THRILL & RECOVERY ENGINE (BC.GAME WIN-PUMP & NATURAL DRAIN) ---
let userThrillProfiles = {};

function getOrInitThrillProfile(userId, phone, currentBal) {
  const key = userId || phone || 'GUEST';
  if (!userThrillProfiles[key]) {
    userThrillProfiles[key] = {
      startBal: currentBal || 100,
      peakBal: currentBal || 100,
      phase: 'PUMP', // 'PUMP' (Wins allowed up to 3x-5x) -> 'PEAK' -> 'DRAIN' (Natural recovery)
      totalWonInCycle: 0,
      flipsInCycle: 0
    };
  }
  return userThrillProfiles[key];
}

// --- GLOBAL DAILY 20% - 30% ADMIN PROFIT GOVERNOR ---
// Automatically calculates today's total bets turnover (Intake) vs Payout
// Keeps Admin Net Profit strictly locked between 20% and 30%!
function getTodayFlipCoinProfitRatio() {
  const todayStr = new Date().toISOString().slice(0, 10);
  let intake = 0;
  let payout = 0;

  const bets = (typeof memoryUserBetsCoinFlip !== 'undefined' ? memoryUserBetsCoinFlip : []);
  bets.forEach(b => {
    if (b && b.created_at && String(b.created_at).startsWith(todayStr)) {
      intake += Number(b.bet_amount || 0);
      payout += Number(b.payout_amount || 0);
    }
  });

  if (intake < 50) return 0.25; // Default neutral 25% profit anchor when day starts
  return (intake - payout) / intake; // Returns profit margin e.g. 0.25 = 25% profit
}

function calculateSmartCoinFlipOutcome(userId, phone, betAmount, selectedSide) {
  const currentStreak = stateCoinFlip.seriesStreak || 0;
  const currentPot = stateCoinFlip.accumulatedPot || 0;
  const userBal = currentState.userBalance || 0;
  const effectiveWager = currentPot > 0 ? currentPot : betAmount;
  const oppositeSide = selectedSide === 'heads' ? 'tails' : 'heads';

  const profile = getOrInitThrillProfile(userId, phone, userBal);
  profile.flipsInCycle += 1;

  // Track user lifetime deposit
  let totalDeposits = 0;
  try {
    const memDeps = (typeof memoryDeposits !== 'undefined' ? memoryDeposits : []);
    memDeps.forEach(d => {
      const dUser = String(d.user_id || '');
      const dPhone = String(d.phone || '');
      const cleanPhone = phone ? String(phone).slice(-10) : '';
      if ((userId && dUser.includes(String(userId))) || (cleanPhone && dPhone.includes(cleanPhone))) {
        if (d.status === 'APPROVED' || !d.status) {
          totalDeposits += Number(d.amount || 0);
        }
      }
    });
  } catch(e) {}

  const baseDeposit = totalDeposits > 0 ? totalDeposits : Math.max(100, profile.startBal);

  // Update peak balance seen in this session
  if (userBal > profile.peakBal) {
    profile.peakBal = userBal;
  }

  // --- PHASE TRANSITIONS ---
  // If user balance reaches 3x to 5x of deposit (or ₹3,000 - ₹5,000+), switch from PUMP to DRAIN!
  const multiplierOverDeposit = userBal / baseDeposit;
  if (multiplierOverDeposit >= 3.0 || userBal >= 4000) {
    profile.phase = 'DRAIN';
  } else if (userBal <= (baseDeposit * 0.4) || userBal <= 50) {
    // If balance dropped back to low, reset to PUMP for next thrilling ride!
    profile.phase = 'PUMP';
    profile.peakBal = userBal;
    profile.startBal = userBal;
  }

  let winChance = 0.46; // Baseline

  // 1. ROLLERCOASTER PHASE TUNING
  if (profile.phase === 'PUMP') {
    // PUMP PHASE: Let them win! High win rate (52% - 56%) to hook and delight the player!
    winChance = 0.54;
    if (effectiveWager >= 1000) winChance = 0.35;
  } else {
    // DRAIN / HARVEST PHASE:
    // Gently drain the winnings back with natural variance
    winChance = 0.28;
    if (effectiveWager <= 50) winChance = 0.48; // Teaser win
    else if (effectiveWager >= 300) winChance = 0.18; // Big bet collect
  }

  // 2. Multi-Flip Double-Up Streak Tuning
  if (currentStreak === 1) winChance -= 0.08;
  else if (currentStreak === 2) winChance -= 0.16;
  else if (currentStreak >= 3) winChance -= 0.24;

  // 3. GLOBAL DAILY 20% - 30% ADMIN PROFIT GOVERNOR
  // Enforces that across the whole day's total wagers (e.g. ₹1,00,000), Admin stays in 20% - 30% profit!
  const todayProfitMargin = getTodayFlipCoinProfitRatio();
  if (todayProfitMargin < 0.20) {
    // Admin profit is BELOW 20%! Need to pull it up into the 20%-30% range:
    const deficit = 0.25 - todayProfitMargin;
    winChance -= Math.min(0.20, deficit * 0.7);
    console.log(`📉 [Daily Profit Governor] Admin profit low (${(todayProfitMargin*100).toFixed(1)}% < 20%). WinChance adjusted to ${(winChance*100).toFixed(1)}% to lock 20%-30% profit.`);
  } else if (todayProfitMargin > 0.30) {
    // Admin profit is ABOVE 30%! Relax slightly and let users win more to drive higher volume:
    const surplus = todayProfitMargin - 0.25;
    winChance += Math.min(0.10, surplus * 0.3);
    console.log(`📈 [Daily Profit Governor] Admin profit surplus (${(todayProfitMargin*100).toFixed(1)}% > 30%). WinChance relaxed to ${(winChance*100).toFixed(1)}%.`);
  } else {
    console.log(`🎯 [Daily Profit Governor] Admin profit in target zone: ${(todayProfitMargin*100).toFixed(1)}% (Target: 20%-30%).`);
  }

  // 4. Random Organic Jitter (+/- 4%) for natural casino feel
  const jitter = (Math.random() * 0.08) - 0.04;
  winChance = Math.max(0.10, Math.min(0.60, winChance + jitter));

  // 5. Roll Outcome
  const roll = Math.random();
  const playerWins = roll < winChance;
  const result = playerWins ? selectedSide : oppositeSide;

  console.log(`🎢 [Rollercoaster Engine] Phase: ${profile.phase}, Bal: ₹${userBal}, DailyMargin: ${(todayProfitMargin*100).toFixed(1)}%, Wager: ₹${effectiveWager}, WinChance: ${(winChance*100).toFixed(1)}%, Roll: ${roll.toFixed(3)} -> ${result} (${playerWins ? 'WIN' : 'LOSS'})`);
  return result;
}

async function playFlipCoinGame() {
  if (stateCoinFlip.isFlipping) return;

  if (!currentState.isLoggedIn) {
    showModal('🔒 Login Required', 'Please login or register to play Coin Flip!');
    switchScreen('login');
    return;
  }

  const isStreak = stateCoinFlip.isStreakActive && stateCoinFlip.accumulatedPot > 0;
  let betAmount = 0;

  if (!isStreak) {
    const amountInput = document.getElementById('flip-amount-input');
    betAmount = parseFloat(amountInput?.value) || 0;

    if (betAmount < 10) {
      showModal('⚠️ Minimum Bet', 'Minimum bet amount for Coin Flip is ₹10.00.');
      return;
    }

    if (betAmount > currentState.userBalance) {
      showModal('⚠️ Insufficient Balance', `Your wallet balance (₹${currentState.userBalance.toFixed(2)}) is less than bet amount ₹${betAmount.toFixed(2)}!`);
      return;
    }

    // Deduct initial bet amount from wallet
    currentState.userBalance = parseFloat((currentState.userBalance - betAmount).toFixed(2));
    updateAllWalletBalanceDisplays();

    const balEl = document.getElementById('flip-coin-balance-val');
    if (balEl) balEl.innerText = currentState.userBalance.toFixed(2);

    if (currentState.currentUserId && typeof dbUpdateUser === 'function') {
      dbUpdateUser(currentState.currentUserId, { balance: currentState.userBalance }).catch(e => console.warn(e));
    }

    stateCoinFlip.initialBetAmount = betAmount;
  } else {
    // In streak double-up: the stake is the accumulated pot!
    betAmount = stateCoinFlip.accumulatedPot;
  }

  const btnAction = document.getElementById('btn-flip-action');
  const btnCashout = document.getElementById('btn-flip-cashout');
  const coinEl = document.getElementById('coin-flipper-el');

  stateCoinFlip.isFlipping = true;
  if (btnAction) {
    btnAction.disabled = true;
    btnAction.innerHTML = 'FLIPPING COIN... <i class="fa-solid fa-spinner fa-spin" style="margin-left: 6px;"></i>';
  }
  if (btnCashout) btnCashout.disabled = true;

  // 2. Determine outcome via Smart Admin Protection Algorithm
  const winningSide = calculateSmartCoinFlipOutcome(
    currentState.currentUserId,
    currentState.phoneNumber,
    isStreak ? stateCoinFlip.accumulatedPot : betAmount,
    stateCoinFlip.selectedSide
  );
  const isWon = winningSide === stateCoinFlip.selectedSide;

  // 3. Calculate forward cumulative 3D rotation angle without snapping back!
  const targetRemainder = (winningSide === 'heads') ? 0 : 180;
  const currentY = stateCoinFlip.currentRotationY || 0;
  const baseTarget = currentY + 1800; // 5 full 360deg spins forward
  let diff = targetRemainder - (baseTarget % 360);
  if (diff < 0) diff += 360;
  const nextRotationY = baseTarget + diff;
  stateCoinFlip.currentRotationY = nextRotationY;

  // Play sound & start 3D coin spin animation
  playCoinTossSpinSound();

  if (coinEl) {
    coinEl.style.transition = 'transform 1.8s cubic-bezier(0.15, 0.85, 0.35, 1.2)';
    coinEl.style.transform = `rotateY(${nextRotationY}deg)`;
  }

  // 4. Wait for 3D flip animation to finish (1.85 seconds)
  setTimeout(async () => {
    stateCoinFlip.isFlipping = false;
    if (btnAction) btnAction.disabled = false;
    if (btnCashout) btnCashout.disabled = false;

    // Add to recent history ticker
    stateCoinFlip.recentHistory.unshift(winningSide);
    if (stateCoinFlip.recentHistory.length > 10) stateCoinFlip.recentHistory.pop();
    renderCoinFlipHistoryPills();

    // 5. Multi-Flip Streak & Double-Up Resolution
    if (isWon) {
      if (!isStreak) {
        // Initial win: 1.96x
        stateCoinFlip.isStreakActive = true;
        stateCoinFlip.seriesStreak = 1;
        stateCoinFlip.currentMultiplier = 1.96;
        stateCoinFlip.accumulatedPot = parseFloat((stateCoinFlip.initialBetAmount * 1.96).toFixed(2));
      } else {
        // Double up win: 2x multiplier jump!
        stateCoinFlip.seriesStreak += 1;
        stateCoinFlip.currentMultiplier = parseFloat((stateCoinFlip.currentMultiplier * 2).toFixed(2));
        stateCoinFlip.accumulatedPot = parseFloat((stateCoinFlip.accumulatedPot * 2).toFixed(2));
      }

      const seriesEl = document.getElementById('flip-series-val');
      if (seriesEl) seriesEl.innerText = stateCoinFlip.seriesStreak;

      showCoinFlipFloatingResult(true, stateCoinFlip.accumulatedPot, winningSide);

      // Max Streak Cap: auto cashout at streak 5 (31.36x)
      if (stateCoinFlip.seriesStreak >= 5) {
        showModal('🏆 Maximum Streak Reached!', `Congratulations! You reached maximum 5x streak (${stateCoinFlip.currentMultiplier}x). Total ₹${stateCoinFlip.accumulatedPot.toFixed(2)} automatically cashed out to your wallet!`);
        await cashOutCoinFlip();
      } else {
        updateFlipStreakLadderUI();
      }
    } else {
      // Lost flip
      const lostPot = isStreak ? stateCoinFlip.accumulatedPot : betAmount;
      const initialBet = stateCoinFlip.initialBetAmount || betAmount;

      showCoinFlipFloatingResult(false, lostPot, winningSide);

      // Record loss in database
      if (typeof dbRecordCoinFlipBet === 'function') {
        dbRecordCoinFlipBet(
          currentState.currentUserId,
          currentState.phoneNumber,
          initialBet,
          stateCoinFlip.selectedSide,
          winningSide,
          false,
          0
        ).then(() => {
          if (typeof flipBetHistoryState !== 'undefined') flipBetHistoryState.currentPage = 1;
          if (typeof renderFlipBetHistory === 'function') renderFlipBetHistory();
        }).catch(e => console.warn(e));
      }

      // Reset streak
      stateCoinFlip.isStreakActive = false;
      stateCoinFlip.seriesStreak = 0;
      stateCoinFlip.accumulatedPot = 0;
      stateCoinFlip.currentMultiplier = 1.96;

      const seriesEl = document.getElementById('flip-series-val');
      if (seriesEl) seriesEl.innerText = 0;

      updateFlipStreakLadderUI();
    }
  }, 1850);
}

/* ================= DRAGON VS TIGER (3 CARD & 1 CARD POKER) GAME ENGINE ================= */
let stateDragonTiger = {
  activeChip: 10,
  selectedSide: 'dragon', // 'dragon', 'tie', 'tiger'
  phase: 'BETTING', // 'BETTING', 'DEALING', 'RESULT'
  timerSec: 15,
  timerInterval: null,
  roundId: 105,
  userBet: null, // { side, amount }
  totalBets: { dragon: 350, tie: 40, tiger: 420 },
  history: []
};

async function initDragonTigerGame() {
  const balEl = document.getElementById('dt-balance-val');
  if (balEl) balEl.innerText = Number(currentState.userBalance || 0).toFixed(2);

  // Load roadmap history
  if (typeof dbGetDragonTigerHistory === 'function') {
    const hist = await dbGetDragonTigerHistory();
    if (hist && hist.length > 0) {
      stateDragonTiger.history = hist;
    }
  }

  if (typeof dbGetDragonTigerOutcomeMode === 'function') {
    await dbGetDragonTigerOutcomeMode();
  }

  renderDragonTigerHistoryRoad();
  if (typeof renderDTBetHistory === 'function') renderDTBetHistory();

  // Start continuous round loop if not running
  if (!stateDragonTiger.timerInterval) {
    startDragonTigerLoop();
  }
}

function renderDragonTigerHistoryRoad() {
  const roadEl = document.getElementById('dt-history-road-list');
  if (!roadEl) return;

  const history = stateDragonTiger.history || [];
  if (history.length === 0) {
    roadEl.innerHTML = '<span style="font-size: 11px; color: #64748b; font-style: italic;">No rounds yet. Round starting...</span>';
    return;
  }

  roadEl.innerHTML = history.slice(0, 20).map(r => {
    const w = (r.winner || 'dragon').toLowerCase();
    let letter = 'D';
    let cssClass = 'dragon';
    if (w === 'tiger') { letter = 'T'; cssClass = 'tiger'; }
    else if (w === 'tie') { letter = 'X'; cssClass = 'tie'; }
    return `<div class="dt-road-badge ${cssClass}" title="Round #${r.id || '100'}: ${w.toUpperCase()}">${letter}</div>`;
  }).join('');
}

function startDragonTigerLoop() {
  if (stateDragonTiger.timerInterval) clearInterval(stateDragonTiger.timerInterval);

  const timerSettings = (typeof getTimerSettingsSync === 'function') ? getTimerSettingsSync() : {};
  const durationSec = Number(timerSettings.dragontiger_betting_duration_sec || 15);

  stateDragonTiger.phase = 'BETTING';
  stateDragonTiger.timerSec = durationSec;
  stateDragonTiger.userBet = null;
  stateDragonTiger.roundId += 1;
  stateDragonTiger.totalBets = { dragon: 0, tie: 0, tiger: 0 };

  updateDragonTigerUIPhase();
  broadcastDTBetsUpdate();

  stateDragonTiger.timerInterval = setInterval(() => {
    stateDragonTiger.timerSec -= 1;

    const timerSecEl = document.getElementById('dt-timer-sec');
    if (timerSecEl) timerSecEl.innerText = stateDragonTiger.timerSec;

    // Display real bets during betting phase
    if (stateDragonTiger.phase === 'BETTING') {
      const dTotal = document.getElementById('dt-total-dragon-bets');
      const tTotal = document.getElementById('dt-total-tiger-bets');
      if (dTotal) dTotal.innerText = stateDragonTiger.totalBets.dragon;
      if (tTotal) tTotal.innerText = stateDragonTiger.totalBets.tiger;
      broadcastDTBetsUpdate();
    }

    if (stateDragonTiger.timerSec <= 0) {
      if (stateDragonTiger.phase === 'BETTING') {
        stateDragonTiger.phase = 'DEALING';
        stateDragonTiger.timerSec = 5;
        updateDragonTigerUIPhase();
        processDragonTigerDealingPhase();
      } else if (stateDragonTiger.phase === 'DEALING') {
        stateDragonTiger.phase = 'RESULT';
        stateDragonTiger.timerSec = 4;
        updateDragonTigerUIPhase();
      } else if (stateDragonTiger.phase === 'RESULT') {
        startDragonTigerLoop();
      }
    }
  }, 1000);
}

function updateDragonTigerUIPhase() {
  const roundEl = document.getElementById('dt-round-id');
  const timerPill = document.getElementById('dt-timer-pill');
  const btnBet = document.getElementById('dt-btn-place-bet');

  if (roundEl) roundEl.innerText = stateDragonTiger.roundId;

  if (stateDragonTiger.phase === 'BETTING') {
    document.querySelectorAll('.dt-spot-box').forEach(el => el.classList.remove('winner-glow'));
    const dCards = document.getElementById('dt-cards-dragon');
    const tCards = document.getElementById('dt-cards-tiger');
    if (dCards) dCards.innerHTML = '<div class="dt-card-placeholder"><span class="dt-card-back">🂠</span></div>';
    if (tCards) tCards.innerHTML = '<div class="dt-card-placeholder"><span class="dt-card-back">🂠</span></div>';

    if (timerPill) timerPill.innerHTML = `⏱️ BETTING: <span id="dt-timer-sec">${stateDragonTiger.timerSec}</span>s`;
    if (btnBet) {
      btnBet.disabled = false;
      btnBet.innerText = `PLACE BET (₹${stateDragonTiger.activeChip})`;
      btnBet.style.opacity = '1';
    }
  } else if (stateDragonTiger.phase === 'DEALING') {
    if (timerPill) timerPill.innerHTML = `🃏 DEALING CARDS...`;
    if (btnBet) {
      btnBet.disabled = true;
      btnBet.innerText = `BETTING CLOSED`;
      btnBet.style.opacity = '0.5';
    }
  } else if (stateDragonTiger.phase === 'RESULT') {
    if (timerPill) timerPill.innerHTML = `🎉 WINNER REVEALED!`;
  }
}

function selectDTChip(chipVal) {
  stateDragonTiger.activeChip = chipVal;
  document.querySelectorAll('.dt-chip-item').forEach(el => {
    if (el.innerText.includes(chipVal >= 1000 ? (chipVal/1000 + 'K') : chipVal)) {
      el.classList.add('active');
    } else {
      el.classList.remove('active');
    }
  });

  const chipValEl = document.getElementById('dt-selected-chip-val');
  if (chipValEl) chipValEl.innerText = chipVal;
  
  const btnBet = document.getElementById('dt-btn-place-bet');
  if (btnBet && stateDragonTiger.phase === 'BETTING') {
    btnBet.innerText = `PLACE BET (₹${chipVal})`;
  }
}

function selectDragonTigerSide(side) {
  stateDragonTiger.selectedSide = side;

  document.querySelectorAll('.dt-spot-box').forEach(el => el.classList.remove('active'));
  document.querySelectorAll('.dt-side-btn').forEach(el => el.classList.remove('active'));

  const spotBox = document.getElementById(`dt-spot-${side}`);
  const sideBtn = document.getElementById(`dt-btn-side-${side}`);
  if (spotBox) spotBox.classList.add('active');
  if (sideBtn) sideBtn.classList.add('active');
}

function placeDragonTigerBet() {
  if (stateDragonTiger.phase !== 'BETTING') {
    showModal('⚠️ Betting Closed', 'Betting for this round is closed! Please wait for the next round.');
    return;
  }

  const amount = Number(stateDragonTiger.activeChip || 10);
  if (currentState.userBalance < amount) {
    showModal('⚠️ Insufficient Balance', `Required ₹${amount}, but your current balance is ₹${currentState.userBalance.toFixed(2)}. Please deposit cash.`);
    return;
  }

  // Deduct balance
  currentState.userBalance = parseFloat((currentState.userBalance - amount).toFixed(2));
  const balEl = document.getElementById('dt-balance-val');
  if (balEl) balEl.innerText = currentState.userBalance.toFixed(2);

  if (currentState.currentUserId && typeof dbUpdateUser === 'function') {
    dbUpdateUser(currentState.currentUserId, { balance: currentState.userBalance }).catch(e => console.warn(e));
  }

  stateDragonTiger.userBet = {
    side: stateDragonTiger.selectedSide,
    amount: amount
  };

  if (stateDragonTiger.selectedSide && stateDragonTiger.totalBets[stateDragonTiger.selectedSide] !== undefined) {
    stateDragonTiger.totalBets[stateDragonTiger.selectedSide] += amount;
    const dTotal = document.getElementById('dt-total-dragon-bets');
    const tTotal = document.getElementById('dt-total-tiger-bets');
    if (dTotal) dTotal.innerText = stateDragonTiger.totalBets.dragon;
    if (tTotal) tTotal.innerText = stateDragonTiger.totalBets.tiger;
    broadcastDTBetsUpdate();
  }

  const btnBet = document.getElementById('dt-btn-place-bet');
  if (btnBet) {
    btnBet.innerHTML = `✅ BET PLACED (₹${amount} ON ${stateDragonTiger.selectedSide.toUpperCase()})`;
    btnBet.disabled = true;
  }

  showCoinFlipFloatingResult(true, 0, `Bet Placed: ₹${amount} on ${stateDragonTiger.selectedSide.toUpperCase()}`);
}

function broadcastDTBetsUpdate() {
  if (typeof updateAdminDTPnLUI === 'function') {
    updateAdminDTPnLUI(stateDragonTiger.totalBets, stateDragonTiger.roundId);
  }
  if (typeof supabaseClient !== 'undefined' && supabaseClient) {
    try {
      const channel = supabaseClient.channel('amiriwin_dt_bets_sync');
      channel.send({
        type: 'broadcast',
        event: 'dt_bets_updated',
        payload: {
          roundId: stateDragonTiger.roundId,
          totalBets: stateDragonTiger.totalBets
        }
      }).catch(e => {});
    } catch(e){}
  }
}

function evaluate3CardHand(cards) {
  const sorted = [...cards].sort((a, b) => a.num - b.num);
  const n0 = sorted[0].num, n1 = sorted[1].num, n2 = sorted[2].num;
  const isFlush = (sorted[0].suit === sorted[1].suit && sorted[1].suit === sorted[2].suit);
  
  let isStraight = false;
  let straightHigh = n2;
  if (n0 + 1 === n1 && n1 + 1 === n2) {
    isStraight = true;
  } else if (n2 === 14 && n0 === 2 && n1 === 3) {
    isStraight = true;
    straightHigh = 3;
  }

  // 1. Trio (Three of a Kind)
  if (n0 === n1 && n1 === n2) {
    return { rank: 6, score: 6000 + n2, name: `TRIO ${sorted[2].val}` };
  }

  // 2. Pure Sequence (Straight Flush)
  if (isFlush && isStraight) {
    return { rank: 5, score: 5000 + straightHigh, name: `PURE SEQ` };
  }

  // 3. Sequence (Straight)
  if (isStraight) {
    return { rank: 4, score: 4000 + straightHigh, name: `SEQUENCE` };
  }

  // 4. Color (Flush)
  if (isFlush) {
    return { rank: 3, score: 3000 + n2 * 10 + n1, name: `COLOR` };
  }

  // 5. Pair
  if (n0 === n1) {
    return { rank: 2, score: 2000 + n0 * 20 + n2, name: `PAIR ${sorted[0].val}` };
  } else if (n1 === n2) {
    return { rank: 2, score: 2000 + n1 * 20 + n0, name: `PAIR ${sorted[1].val}` };
  } else if (n0 === n2) {
    return { rank: 2, score: 2000 + n0 * 20 + n1, name: `PAIR ${sorted[0].val}` };
  }

  // 6. High Card
  return { rank: 1, score: 1000 + n2 * 20 + n1, name: `${sorted[2].val} HIGH` };
}

async function processDragonTigerDealingPhase() {
  const suits = ['♠', '♥', '♦', '♣'];
  const values = [
    { val: '2', num: 2 }, { val: '3', num: 3 }, { val: '4', num: 4 }, { val: '5', num: 5 },
    { val: '6', num: 6 }, { val: '7', num: 7 }, { val: '8', num: 8 }, { val: '9', num: 9 },
    { val: '10', num: 10 }, { val: 'J', num: 11 }, { val: 'Q', num: 12 }, { val: 'K', num: 13 }, { val: 'A', num: 14 }
  ];

  const pickCard = () => {
    const s = suits[Math.floor(Math.random() * suits.length)];
    const v = values[Math.floor(Math.random() * values.length)];
    const isRed = (s === '♥' || s === '♦');
    return { suit: s, val: v.val, num: v.num, color: isRed ? 'red' : 'black' };
  };

  // Determine Target Winner based on Admin Mode (Smart Auto Profit / Forced Outcome / Fair RNG)
  const activeMode = typeof dbGetDragonTigerOutcomeMode === 'function' ? (await dbGetDragonTigerOutcomeMode()) : (memoryDragonTigerOutcomeMode || 'auto_profit');
  let targetWinner = 'dragon';

  if (activeMode === 'force_dragon') {
    targetWinner = 'dragon';
  } else if (activeMode === 'force_tiger') {
    targetWinner = 'tiger';
  } else if (activeMode === 'force_tie') {
    targetWinner = 'tie';
  } else if (activeMode === 'auto_profit') {
    // Smart Auto Profit: If user placed a bet, force the OTHER side or lowest payout side to win!
    if (stateDragonTiger.userBet && stateDragonTiger.userBet.amount > 0) {
      const userSide = stateDragonTiger.userBet.side;
      if (userSide === 'dragon') targetWinner = 'tiger';
      else if (userSide === 'tiger') targetWinner = 'dragon';
      else targetWinner = Math.random() < 0.5 ? 'dragon' : 'tiger';
    } else {
      const dPayout = (stateDragonTiger.totalBets.dragon || 0) * 2.0;
      const tPayout = (stateDragonTiger.totalBets.tiger || 0) * 2.0;
      const tiePayout = (stateDragonTiger.totalBets.tie || 0) * 9.0;

      if (dPayout <= tPayout && dPayout <= tiePayout) {
        targetWinner = 'dragon';
      } else if (tPayout <= dPayout && tPayout <= tiePayout) {
        targetWinner = 'tiger';
      } else {
        targetWinner = (dPayout <= tPayout) ? 'dragon' : 'tiger';
      }
    }
  } else {
    // Fair RNG 50-50
    const rand = Math.random();
    if (rand < 0.475) targetWinner = 'dragon';
    else if (rand < 0.95) targetWinner = 'tiger';
    else targetWinner = 'tie';
  }

  // Deal 3 Cards for Dragon & 3 Cards for Tiger matching targetWinner
  let dragonCards = [], tigerCards = [], dEval, tEval, winner;

  if (targetWinner === 'tie') {
    const v1 = values[Math.floor(Math.random() * values.length)];
    const v2 = values[Math.floor(Math.random() * values.length)];
    const v3 = values[Math.floor(Math.random() * values.length)];

    dragonCards = [
      { suit: '♠', val: v1.val, num: v1.num, color: 'black' },
      { suit: '♥', val: v2.val, num: v2.num, color: 'red' },
      { suit: '♦', val: v3.val, num: v3.num, color: 'red' }
    ];
    tigerCards = [
      { suit: '♣', val: v1.val, num: v1.num, color: 'black' },
      { suit: '♦', val: v2.val, num: v2.num, color: 'red' },
      { suit: '♠', val: v3.val, num: v3.num, color: 'black' }
    ];
    dEval = evaluate3CardHand(dragonCards);
    tEval = evaluate3CardHand(tigerCards);
    winner = 'tie';
  } else {
    let attempts = 0;
    do {
      dragonCards = [pickCard(), pickCard(), pickCard()];
      tigerCards = [pickCard(), pickCard(), pickCard()];
      dEval = evaluate3CardHand(dragonCards);
      tEval = evaluate3CardHand(tigerCards);

      if (dEval.score > tEval.score) winner = 'dragon';
      else if (tEval.score > dEval.score) winner = 'tiger';
      else winner = 'tie';

      attempts++;
    } while (winner !== targetWinner && attempts < 150);

    if (winner !== targetWinner) {
      if (targetWinner === 'dragon') {
        dragonCards = [{ suit: '♠', val: 'A', num: 14, color: 'black' }, { suit: '♥', val: 'A', num: 14, color: 'red' }, { suit: '♦', val: 'A', num: 14, color: 'red' }];
        tigerCards = [{ suit: '♣', val: '2', num: 2, color: 'black' }, { suit: '♠', val: '3', num: 3, color: 'black' }, { suit: '♥', val: '5', num: 5, color: 'red' }];
        winner = 'dragon';
      } else {
        tigerCards = [{ suit: '♠', val: 'A', num: 14, color: 'black' }, { suit: '♥', val: 'A', num: 14, color: 'red' }, { suit: '♦', val: 'A', num: 14, color: 'red' }];
        dragonCards = [{ suit: '♣', val: '2', num: 2, color: 'black' }, { suit: '♠', val: '3', num: 3, color: 'black' }, { suit: '♥', val: '5', num: 5, color: 'red' }];
        winner = 'tiger';
      }
      dEval = evaluate3CardHand(dragonCards);
      tEval = evaluate3CardHand(tigerCards);
    }
  }

  const dCardsContainer = document.getElementById('dt-cards-dragon');
  const tCardsContainer = document.getElementById('dt-cards-tiger');

  if (dCardsContainer) {
    dCardsContainer.innerHTML = `
      <div style="display: flex; flex-direction: column; align-items: center; width: 100%;">
        <div class="dt-hand-type-badge">${dEval.name}</div>
        <div style="display: flex; gap: 2px;">
          ${dragonCards.map(c => `
            <div class="dt-card-item ${c.color}">
              <span class="dt-card-val">${c.val}</span>
              <span class="dt-card-suit">${c.suit}</span>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  setTimeout(() => {
    if (tCardsContainer) {
      tCardsContainer.innerHTML = `
        <div style="display: flex; flex-direction: column; align-items: center; width: 100%;">
          <div class="dt-hand-type-badge">${tEval.name}</div>
          <div style="display: flex; gap: 2px;">
            ${tigerCards.map(c => `
              <div class="dt-card-item ${c.color}">
                <span class="dt-card-val">${c.val}</span>
                <span class="dt-card-suit">${c.suit}</span>
              </div>
            `).join('')}
          </div>
        </div>
      `;
    }

    setTimeout(() => {
      const winnerSpot = document.getElementById(`dt-spot-${winner}`);
      if (winnerSpot) winnerSpot.classList.add('winner-glow');

      if (stateDragonTiger.userBet) {
        const userSide = stateDragonTiger.userBet.side;
        const betAmt = stateDragonTiger.userBet.amount;
        const isWon = (userSide === winner);

        let mult = 2.0;
        if (winner === 'tie') mult = 9.0;
        const payout = isWon ? (betAmt * mult) : 0;

        if (isWon) {
          currentState.userBalance = parseFloat((currentState.userBalance + payout).toFixed(2));
          const balEl = document.getElementById('dt-balance-val');
          if (balEl) balEl.innerText = currentState.userBalance.toFixed(2);

          if (currentState.currentUserId && typeof dbUpdateUser === 'function') {
            dbUpdateUser(currentState.currentUserId, { balance: currentState.userBalance }).catch(e => console.warn(e));
          }

          animateWalletBalanceAddition(payout);
          showCoinFlipFloatingResult(true, payout, winner.toUpperCase());
        } else {
          showCoinFlipFloatingResult(false, betAmt, winner.toUpperCase());
        }

        if (typeof dbSaveDragonTigerBet === 'function') {
          dbSaveDragonTigerBet({
            user_id: currentState.currentUserId,
            phone: currentState.phoneNumber,
            bet_amount: betAmt,
            selected_side: userSide,
            winning_side: winner,
            status: isWon ? 'WON' : 'LOST',
            payout_amount: payout
          }).then(() => { if (typeof renderDTBetHistory === 'function') renderDTBetHistory(); })
            .catch(e => console.warn(e));
        }
      }

      const roundRecord = { id: `DT_${stateDragonTiger.roundId}`, winner: winner, dragon_cards: dragonCards, tiger_cards: tigerCards };
      stateDragonTiger.history.unshift(roundRecord);
      if (stateDragonTiger.history.length > 30) stateDragonTiger.history.pop();
      renderDragonTigerHistoryRoad();

      if (typeof dbSaveDragonTigerRound === 'function') {
        dbSaveDragonTigerRound(roundRecord).catch(e => console.warn(e));
      }

      // Auto-reset manual outcome override back to 'auto_profit' for next rounds
      if (activeMode === 'force_dragon' || activeMode === 'force_tiger' || activeMode === 'force_tie') {
        if (typeof dbUpdateDragonTigerOutcomeMode === 'function') {
          dbUpdateDragonTigerOutcomeMode('auto_profit').catch(e => console.warn(e));
        }
      }
    }, 600);
  }, 400);
}

window.initDragonTigerGame = initDragonTigerGame;
window.selectDTChip = selectDTChip;
window.selectDragonTigerSide = selectDragonTigerSide;
window.placeDragonTigerBet = placeDragonTigerBet;

/* ================= PERSONAL GAME BET HISTORY & 10-ITEM PAGINATION ================= */
let flipBetHistoryState = {
  currentPage: 1,
  pageSize: 10,
  allBets: []
};

let dtBetHistoryState = {
  currentPage: 1,
  pageSize: 10,
  allBets: []
};

// --- FLIP COIN BET HISTORY ---
async function renderFlipBetHistory() {
  const container = document.getElementById('flip-bet-history-list');
  if (!container) return;

  const currentUserId = currentState.currentUserId;
  const phone = currentState.phoneNumber;

  if (!currentState.isLoggedIn || (!currentUserId && !phone)) {
    container.innerHTML = `<div style="padding: 14px; text-align: center; color: #64748b; font-size: 12px;">Please login to view your bet history.</div>`;
    const pageInfo = document.getElementById('flip-history-page-info');
    const totalCount = document.getElementById('flip-history-total-count');
    const prevBtn = document.getElementById('btn-flip-prev-page');
    const nextBtn = document.getElementById('btn-flip-next-page');
    if (pageInfo) pageInfo.innerText = "Page 1 of 1";
    if (totalCount) totalCount.innerText = "0 bets";
    if (prevBtn) prevBtn.disabled = true;
    if (nextBtn) nextBtn.disabled = true;
    return;
  }

  try {
    let bets = [];
    if (typeof dbGetUserCoinFlipBets === 'function') {
      bets = await dbGetUserCoinFlipBets(currentUserId, phone);
    }
    flipBetHistoryState.allBets = bets || [];
    displayFlipBetHistoryPage();
  } catch (err) {
    console.warn("renderFlipBetHistory error:", err);
    container.innerHTML = `<div style="padding: 14px; text-align: center; color: #ef4444; font-size: 12px;">Failed to load history.</div>`;
  }
}

function displayFlipBetHistoryPage() {
  const container = document.getElementById('flip-bet-history-list');
  const pageInfo = document.getElementById('flip-history-page-info');
  const totalCount = document.getElementById('flip-history-total-count');
  const prevBtn = document.getElementById('btn-flip-prev-page');
  const nextBtn = document.getElementById('btn-flip-next-page');
  if (!container) return;

  const bets = flipBetHistoryState.allBets || [];
  const totalBets = bets.length;
  const pageSize = flipBetHistoryState.pageSize || 10;
  const maxPage = Math.max(1, Math.ceil(totalBets / pageSize));

  if (flipBetHistoryState.currentPage > maxPage) flipBetHistoryState.currentPage = maxPage;
  if (flipBetHistoryState.currentPage < 1) flipBetHistoryState.currentPage = 1;

  const currentPage = flipBetHistoryState.currentPage;

  if (pageInfo) pageInfo.innerText = `Page ${currentPage} of ${maxPage}`;
  if (totalCount) totalCount.innerText = `${totalBets} bet${totalBets !== 1 ? 's' : ''}`;
  if (prevBtn) prevBtn.disabled = (currentPage <= 1);
  if (nextBtn) nextBtn.disabled = (currentPage >= maxPage);

  if (totalBets === 0) {
    container.innerHTML = `<div style="padding: 14px; text-align: center; color: #64748b; font-size: 12px;">No bets found. Flip coin to see your history!</div>`;
    return;
  }

  const startIdx = (currentPage - 1) * pageSize;
  const pageBets = bets.slice(startIdx, startIdx + pageSize);

  let html = '';
  pageBets.forEach(bet => {
    const isWon = bet.is_won === true || bet.status === 'WON' || (bet.selected_side && bet.winning_side && String(bet.selected_side).toLowerCase() === String(bet.winning_side).toLowerCase());
    const sideName = String(bet.selected_side || '').toLowerCase() === 'heads' ? '🪙 Heads' : '🪙 Tails';
    const winSideName = String(bet.winning_side || '').toLowerCase() === 'heads' ? 'Heads' : (String(bet.winning_side || '').toLowerCase() === 'tails' ? 'Tails' : '-');
    const betAmt = Number(bet.bet_amount || 0);
    const payoutAmt = isWon ? (Number(bet.payout_amount || 0) > 0 ? Number(bet.payout_amount) : betAmt * 1.96).toFixed(2) : betAmt.toFixed(2);
    const dateStr = bet.created_at ? new Date(bet.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : 'Recently';

    html += `
      <div style="background: rgba(30, 41, 59, 0.6); border: 1px solid rgba(255,255,255,0.08); border-radius: 8px; padding: 10px 12px; display: flex; justify-content: space-between; align-items: center;">
        <div>
          <div style="font-size: 12px; font-weight: 700; color: #f8fafc;">${sideName} <span style="font-size: 10px; color: #94a3b8; font-weight: 400;">(Outcome: ${winSideName})</span></div>
          <div style="font-size: 10px; color: #64748b; margin-top: 2px;">${dateStr}</div>
        </div>
        <div style="text-align: right;">
          <div style="font-size: 12px; font-weight: 800; color: ${isWon ? '#10b981' : '#ef4444'};">
            ${isWon ? '+' : '-'}₹${isWon ? payoutAmt : betAmt}
          </div>
          <div style="font-size: 10px; font-weight: 600; color: ${isWon ? '#10b981' : '#94a3b8'};">
            ${isWon ? 'WIN (1.96x)' : 'LOST'}
          </div>
        </div>
      </div>
    `;
  });

  container.innerHTML = html;
}

function changeFlipBetHistoryPage(delta) {
  flipBetHistoryState.currentPage += delta;
  displayFlipBetHistoryPage();
}

// --- DRAGON VS TIGER BET HISTORY ---
async function renderDTBetHistory() {
  const container = document.getElementById('dt-bet-history-list');
  if (!container) return;

  const currentUserId = currentState.currentUserId;
  const phone = currentState.phoneNumber;

  if (!currentState.isLoggedIn || (!currentUserId && !phone)) {
    container.innerHTML = `<div style="padding: 14px; text-align: center; color: #64748b; font-size: 12px;">Please login to view your bet history.</div>`;
    const pageInfo = document.getElementById('dt-history-page-info');
    const totalCount = document.getElementById('dt-history-total-count');
    const prevBtn = document.getElementById('btn-dt-prev-page');
    const nextBtn = document.getElementById('btn-dt-next-page');
    if (pageInfo) pageInfo.innerText = "Page 1 of 1";
    if (totalCount) totalCount.innerText = "0 bets";
    if (prevBtn) prevBtn.disabled = true;
    if (nextBtn) nextBtn.disabled = true;
    return;
  }

  try {
    let bets = [];
    if (typeof dbGetUserDragonTigerBets === 'function') {
      bets = await dbGetUserDragonTigerBets(currentUserId, phone);
    }
    dtBetHistoryState.allBets = bets || [];
    displayDTBetHistoryPage();
  } catch (err) {
    console.warn("renderDTBetHistory error:", err);
    container.innerHTML = `<div style="padding: 14px; text-align: center; color: #ef4444; font-size: 12px;">Failed to load history.</div>`;
  }
}

function displayDTBetHistoryPage() {
  const container = document.getElementById('dt-bet-history-list');
  const pageInfo = document.getElementById('dt-history-page-info');
  const totalCount = document.getElementById('dt-history-total-count');
  const prevBtn = document.getElementById('btn-dt-prev-page');
  const nextBtn = document.getElementById('btn-dt-next-page');
  if (!container) return;

  const bets = dtBetHistoryState.allBets || [];
  const totalBets = bets.length;
  const pageSize = dtBetHistoryState.pageSize || 10;
  const maxPage = Math.max(1, Math.ceil(totalBets / pageSize));

  if (dtBetHistoryState.currentPage > maxPage) dtBetHistoryState.currentPage = maxPage;
  if (dtBetHistoryState.currentPage < 1) dtBetHistoryState.currentPage = 1;

  const currentPage = dtBetHistoryState.currentPage;

  if (pageInfo) pageInfo.innerText = `Page ${currentPage} of ${maxPage}`;
  if (totalCount) totalCount.innerText = `${totalBets} bet${totalBets !== 1 ? 's' : ''}`;
  if (prevBtn) prevBtn.disabled = (currentPage <= 1);
  if (nextBtn) nextBtn.disabled = (currentPage >= maxPage);

  if (totalBets === 0) {
    container.innerHTML = `<div style="padding: 14px; text-align: center; color: #64748b; font-size: 12px;">No bets found. Play Dragon vs Tiger to see history!</div>`;
    return;
  }

  const startIdx = (currentPage - 1) * pageSize;
  const pageBets = bets.slice(startIdx, startIdx + pageSize);

  let html = '';
  pageBets.forEach(bet => {
    const isWon = bet.is_won || (bet.status === 'WON') || (Number(bet.payout_amount || 0) > 0);
    const side = String(bet.selected_side || '').toLowerCase();
    let sideTag = '🐉 Dragon';
    if (side === 'tiger') sideTag = '🐅 Tiger';
    if (side === 'tie') sideTag = '👔 Tie';

    const winSide = String(bet.winning_side || '').toLowerCase();
    let winSideTag = winSide ? (winSide === 'dragon' ? 'Dragon' : (winSide === 'tiger' ? 'Tiger' : 'Tie')) : 'Pending';

    const betAmt = Number(bet.bet_amount || 0).toFixed(2);
    const payoutAmt = Number(bet.payout_amount || 0).toFixed(2);
    const isPending = bet.status === 'PENDING' || !bet.winning_side;

    const dateStr = bet.created_at ? new Date(bet.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : 'Recently';

    let amountDisplay = `<div style="font-size: 12px; font-weight: 800; color: ${isWon ? '#10b981' : '#ef4444'};">${isWon ? '+' : '-'}₹${isWon ? payoutAmt : betAmt}</div>`;
    let statusText = `<div style="font-size: 10px; font-weight: 600; color: ${isWon ? '#10b981' : '#94a3b8'};">${isWon ? 'WIN' : 'LOST'}</div>`;

    if (isPending) {
      amountDisplay = `<div style="font-size: 12px; font-weight: 800; color: #f59e0b;">₹${betAmt}</div>`;
      statusText = `<div style="font-size: 10px; font-weight: 600; color: #f59e0b;">PENDING</div>`;
    }

    html += `
      <div style="background: rgba(30, 41, 59, 0.6); border: 1px solid rgba(255,255,255,0.08); border-radius: 8px; padding: 10px 12px; display: flex; justify-content: space-between; align-items: center;">
        <div>
          <div style="font-size: 12px; font-weight: 700; color: #f8fafc;">${sideTag} <span style="font-size: 10px; color: #94a3b8; font-weight: 400;">(Outcome: ${winSideTag})</span></div>
          <div style="font-size: 10px; color: #64748b; margin-top: 2px;">${dateStr} • Round #${bet.round_id || 'RD'}</div>
        </div>
        <div style="text-align: right;">
          ${amountDisplay}
          ${statusText}
        </div>
      </div>
    `;
  });

  container.innerHTML = html;
}

function changeDTBetHistoryPage(delta) {
  dtBetHistoryState.currentPage += delta;
  displayDTBetHistoryPage();
}

window.renderFlipBetHistory = renderFlipBetHistory;
window.changeFlipBetHistoryPage = changeFlipBetHistoryPage;
window.renderDTBetHistory = renderDTBetHistory;
window.changeDTBetHistoryPage = changeDTBetHistoryPage;


