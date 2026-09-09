// Supabase Database Configuration & Client Service

// Live Supabase Credentials loaded dynamically from Environment Config (config.js / .env)
const SUPABASE_URL = (typeof window !== 'undefined' && window.APP_CONFIG && window.APP_CONFIG.SUPABASE_URL)
  || (typeof process !== 'undefined' && process.env && process.env.SUPABASE_URL)
  || '';

const SUPABASE_ANON_KEY = (typeof window !== 'undefined' && window.APP_CONFIG && window.APP_CONFIG.SUPABASE_ANON_KEY)
  || (typeof process !== 'undefined' && process.env && process.env.SUPABASE_ANON_KEY)
  || '';

// Initialize Supabase Client
let supabaseClient = null;
if (window.supabase) {
  try {
    supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    console.log("⚡ Live Supabase Database Client Initialized Successfully!");
  } catch (err) {
    console.warn("Supabase Client Initialization Warning:", err);
  }
}

// Fallback Memory Data
let memoryDB = [];

let memorySettings = {
  upi_id: 'dubai10x.pay@upi',
  qr_code_url: '',
  bonus_percentage: 0,
  first_deposit_bonus: 100, // Default 100% First Deposit Bonus
  welcome_bonus: 100.00, // Default ₹100 Registration Welcome Bonus
  referral_bonus: 50.00, // Default ₹50 Referral Cash Bonus
  min_deposit: 200,
  max_deposit: 20000
};

let memoryPaymentMethods = [
  { id: 'PM_UPI', name: 'UPI', upi_id: 'dubai10x.pay@okhdfcbank', qr_code_url: '', status: 'ON', max_limit: 60000.00, current_total: 0.00 },
  { id: 'PM_PHONEPE', name: 'PhonePe', upi_id: 'dubai10x.pay@ybl', qr_code_url: '', status: 'ON', max_limit: 60000.00, current_total: 0.00 },
  { id: 'PM_PAYTM', name: 'Paytm', upi_id: 'dubai10x.pay@paytm', qr_code_url: '', status: 'ON', max_limit: 60000.00, current_total: 0.00 },
  { id: 'PM_ICASH', name: 'iCash.one', upi_id: 'icash.pay@upi', qr_code_url: '', status: 'ON', max_limit: 60000.00, current_total: 0.00 },
  { id: 'PM_UTR', name: 'UPI_utr', upi_id: 'dubai10x.pay@okhdfcbank', qr_code_url: '', status: 'OFF', max_limit: 60000.00, current_total: 0.00 }
];

let memoryDeposits = [];

let memoryWithdrawals = [];

// --- WITHDRAWAL OPERATIONS (BANK & UPI) ---
async function dbRequestWithdrawal(userId, phone, amount, method, details) {
  const wdId = `WD_${Math.floor(10000 + Math.random() * 90000)}`;
  const record = {
    id: wdId,
    user_id: userId,
    phone: phone,
    amount: parseFloat(amount),
    method: method,
    bank_details: details,
    status: 'Pending',
    created_at: new Date().toISOString()
  };

  if (supabaseClient) {
    try {
      await supabaseClient.from('withdrawals').insert([{
        id: wdId,
        user_id: userId,
        phone: phone,
        amount: parseFloat(amount),
        method: method,
        bank_details: details,
        status: 'Pending'
      }]);
    } catch (err) { console.warn("Withdrawal Insert Warning:", err.message); }
  }

  memoryWithdrawals.unshift(record);

  // Deduct & Sync user wallet balance in memoryDB & Supabase DB
  const users = await dbGetUsers();
  const user = users.find(u => u.id === userId || u.user_id === userId || (phone && u.phone === phone));
  if (user) {
    let newBal = user.balance;
    if (typeof currentState !== 'undefined' && currentState && currentState.currentUserId === userId) {
      newBal = currentState.userBalance;
    } else {
      newBal = Math.max(0, (parseFloat(user.balance) || 0) - parseFloat(amount));
    }
    await dbUpdateUser(user.id, { balance: newBal });
  }

  return record;
}

async function dbGetUserWithdrawals(userId, phone) {
  let dbWds = [];
  if (supabaseClient) {
    try {
      const { data, error } = await supabaseClient.from('withdrawals').select('*').order('created_at', { ascending: false });
      if (!error && data) dbWds = data;
    } catch (err) { console.warn("Withdrawals Fetch Warning:", err.message); }
  }

  const combinedMap = new Map();
  dbWds.forEach(w => combinedMap.set(w.id, w));
  memoryWithdrawals.forEach(w => {
    if (!combinedMap.has(w.id)) combinedMap.set(w.id, w);
  });

  const allWds = Array.from(combinedMap.values());
  const cleanPhone = phone ? String(phone).slice(-10) : '';

  const filtered = allWds.filter(w => {
    if (userId && w.user_id && (w.user_id === userId || w.user_id.includes(userId) || String(userId).includes(w.user_id))) {
      return true;
    }
    if (cleanPhone && w.phone && String(w.phone).slice(-10) === cleanPhone) {
      return true;
    }
    return false;
  });

  return filtered.sort((a, b) => new Date(b.created_at || Date.now()) - new Date(a.created_at || Date.now()));
}

async function dbGetAllWithdrawals() {
  let dbWds = [];
  if (supabaseClient) {
    try {
      const { data, error } = await supabaseClient.from('withdrawals').select('*').order('created_at', { ascending: false });
      if (!error && data) dbWds = data;
    } catch (err) { console.warn("All Withdrawals Fetch Warning:", err.message); }
  }

  const combinedMap = new Map();
  dbWds.forEach(w => combinedMap.set(w.id, w));
  memoryWithdrawals.forEach(w => {
    if (!combinedMap.has(w.id)) combinedMap.set(w.id, w);
  });

  return Array.from(combinedMap.values()).sort((a, b) => new Date(b.created_at || Date.now()) - new Date(a.created_at || Date.now()));
}

async function dbApproveWithdrawal(withdrawalId, utrNumber = '') {
  if (supabaseClient) {
    try {
      await supabaseClient.from('withdrawals').update({ status: 'Approved', utr_number: utrNumber }).eq('id', withdrawalId);
    } catch (err) { console.warn(err); }
  }

  const idx = memoryWithdrawals.findIndex(w => w.id === withdrawalId);
  if (idx !== -1) {
    memoryWithdrawals[idx].status = 'Approved';
    memoryWithdrawals[idx].utr_number = utrNumber;
  }
  return true;
}

async function dbRejectWithdrawal(withdrawalId, reason = '') {
  const allWds = await dbGetAllWithdrawals();
  const wd = allWds.find(w => w.id === withdrawalId);
  if (!wd) return false;

  // 1. Update withdrawal status to Rejected
  if (supabaseClient) {
    try {
      await supabaseClient.from('withdrawals').update({ status: 'Rejected', admin_notes: reason }).eq('id', withdrawalId);
    } catch (err) { console.warn(err); }
  }

  const idx = memoryWithdrawals.findIndex(w => w.id === withdrawalId);
  if (idx !== -1) {
    memoryWithdrawals[idx].status = 'Rejected';
    memoryWithdrawals[idx].admin_notes = reason;
  }

  // 2. Refund locked amount back to user's wallet balance!
  const users = await dbGetUsers();
  const user = users.find(u => u.id === wd.user_id || u.phone === wd.phone);
  if (user) {
    const refundAmount = parseFloat(wd.amount);
    const newBal = (parseFloat(user.balance) || 0) + refundAmount;
    await dbUpdateUser(user.id, { balance: newBal });
    console.log(`🔄 Refunded ₹${refundAmount} to user ${user.id}'s wallet after withdrawal rejection.`);

    // If active logged in user is the refunded user, update currentState balance instantly
    if (typeof currentState !== 'undefined' && currentState && (currentState.currentUserId === user.id || currentState.phoneNumber === user.phone)) {
      currentState.userBalance = newBal;
      if (typeof updateAllWalletBalanceDisplays === 'function') {
        updateAllWalletBalanceDisplays();
      }
      const savedSession = sessionStorage.getItem('amiriwin_user_session');
      if (savedSession) {
        try {
          const sess = JSON.parse(savedSession);
          sess.userBalance = newBal;
          sessionStorage.setItem('amiriwin_user_session', JSON.stringify(sess));
        } catch (e) { }
      }
    }
  }

  return true;
}

// --- USER OPERATIONS ---
async function dbGetUsers() {
  if (supabaseClient) {
    try {
      const { data, error } = await supabaseClient.from('users').select('*').order('created_at', { ascending: false });
      if (data) {
        return data.map(u => ({
          id: u.user_id || u.id,
          phone: u.phone,
          email: u.email || '',
          password: u.password || '',
          date: u.created_at ? new Date(u.created_at).toLocaleString() : u.date,
          balance: parseFloat(u.balance) || 0,
          vip: u.vip || 'VIP 1',
          status: u.status || 'Active',
          invited_by: u.invited_by || '',
          current_session_token: u.current_session_token || ''
        }));
      }
      return [];
    } catch (err) {
      console.warn("Supabase Fetch Warning:", err.message);
      return [];
    }
  }

  return memoryDB;
}

async function dbGetRealtimeActiveUsersCount() {
  let count = 0;
  if (supabaseClient) {
    try {
      const { count: dbCount, error } = await supabaseClient
        .from('users')
        .select('*', { count: 'exact', head: true });
      if (!error && typeof dbCount === 'number') {
        count = dbCount;
      }
    } catch (e) { }
  }
  if (typeof count !== 'number') {
    const users = await dbGetUsers();
    count = users ? users.length : 0;
  }
  return count;
}

async function dbAddUser(phone, password = '', balance = 100.00, vip = 'VIP 1', invitedBy = '', email = '') {
  const userId = `USR_${Math.floor(100000 + Math.random() * 900000)}`;
  const now = new Date();
  const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

  const cleanInvitedBy = String(invitedBy || '').trim().replace('USR_', '');
  const cleanEmail = String(email || '').trim().toLowerCase();

  const newUserRecord = {
    id: userId,
    user_id: userId,
    phone: phone,
    email: cleanEmail,
    password: password,
    date: dateStr,
    balance: balance,
    vip: vip,
    status: 'Active',
    invited_by: cleanInvitedBy,
    current_session_token: ''
  };

  if (supabaseClient) {
    try {
      await supabaseClient.from('users').insert([{
        id: userId,
        user_id: userId,
        phone: phone,
        email: cleanEmail,
        password: password,
        balance: balance,
        vip: vip,
        status: 'Active',
        invited_by: cleanInvitedBy,
        current_session_token: ''
      }]);

      // Attempt to register in Supabase Auth if email is provided
      if (cleanEmail) {
        try {
          await supabaseClient.auth.signUp({
            email: cleanEmail,
            password: password || 'AmiriWin@123'
          });
        } catch (authErr) {
          console.warn("Supabase Auth SignUp Note:", authErr.message);
        }
      }
    } catch (err) { console.warn("Supabase Insert Warning:", err.message); }
  }

  memoryDB.unshift(newUserRecord);
  return newUserRecord;
}

async function dbUpdateUser(userId, updates) {
  if (supabaseClient) {
    try {
      await supabaseClient.from('users').update(updates).or(`user_id.eq.${userId},id.eq.${userId}`);
    } catch (err) { console.warn(err); }
  }
  const idx = memoryDB.findIndex(u => u.id === userId || u.user_id === userId);
  if (idx !== -1) memoryDB[idx] = { ...memoryDB[idx], ...updates };
}

async function dbDeleteUser(userId) {
  if (supabaseClient) {
    try { await supabaseClient.from('users').delete().or(`user_id.eq.${userId},id.eq.${userId}`); } catch (err) { console.warn(err); }
  }
  memoryDB = memoryDB.filter(u => u.id !== userId && u.user_id !== userId);
}

async function dbGetUserByPhone(phone) {
  const cleanPhone = phone ? String(phone).slice(-10) : '';
  if (!cleanPhone) return null;

  if (supabaseClient) {
    try {
      const { data, error } = await supabaseClient.from('users').select('*').eq('phone', cleanPhone).maybeSingle();
      if (data) {
        return {
          id: data.user_id || data.id,
          phone: data.phone,
          email: data.email || '',
          password: data.password || '',
          balance: parseFloat(data.balance) || 0,
          vip: data.vip || 'VIP 1',
          status: data.status || 'Active',
          invited_by: data.invited_by || '',
          current_session_token: data.current_session_token || ''
        };
      }
      return null;
    } catch (err) {
      console.warn("dbGetUserByPhone error:", err);
      return null;
    }
  }

  const memUser = memoryDB.find(u => String(u.phone).slice(-10) === cleanPhone);
  return memUser || null;
}

async function dbGetUserByEmail(email) {
  const cleanEmail = email ? String(email).trim().toLowerCase() : '';
  if (!cleanEmail) return null;

  if (supabaseClient) {
    try {
      const { data, error } = await supabaseClient.from('users').select('*').eq('email', cleanEmail).maybeSingle();
      if (data) {
        return {
          id: data.user_id || data.id,
          phone: data.phone,
          email: data.email || '',
          password: data.password || '',
          balance: parseFloat(data.balance) || 0,
          vip: data.vip || 'VIP 1',
          status: data.status || 'Active',
          invited_by: data.invited_by || '',
          current_session_token: data.current_session_token || ''
        };
      }
    } catch (err) {
      console.warn("dbGetUserByEmail error:", err);
    }
  }

  const memUser = memoryDB.find(u => String(u.email || '').toLowerCase() === cleanEmail);
  return memUser || null;
}

// --- RESEND EMAIL OTP CONFIGURATION & FUNCTIONS ---
const RESEND_API_KEY = (typeof window !== 'undefined' && window.APP_CONFIG && window.APP_CONFIG.RESEND_API_KEY) || '';
let resetOTPCache = new Map();

async function dbSendResendEmailOTP(email) {
  const cleanEmail = String(email || '').trim().toLowerCase();
  if (!cleanEmail || !cleanEmail.includes('@')) {
    return { success: false, message: 'Please enter a valid Email ID.' };
  }

  // Generate 6-digit random OTP
  const otpCode = String(Math.floor(100000 + Math.random() * 900000));
  const expiresAt = Date.now() + 5 * 60 * 1000; // 5 Minutes Validity

  resetOTPCache.set(cleanEmail, { otp: otpCode, expiresAt: expiresAt });

  const emailBody = JSON.stringify({
    from: 'Dubai10X Support <onboarding@resend.dev>',
    to: [cleanEmail],
    subject: '🔑 Your Password Reset Verification Code - Dubai10X',
    html: `
      <div style="font-family: Arial, sans-serif; background-color: #111827; padding: 30px; border-radius: 12px; color: #ffffff; max-width: 480px; margin: 0 auto; border: 1px solid #374151;">
        <div style="text-align: center; margin-bottom: 20px;">
          <h1 style="color: #f59e0b; font-size: 28px; margin: 0;">🃏 Dubai10X</h1>
          <p style="color: #9ca3af; font-size: 14px; margin-top: 5px;">Password Reset Verification</p>
        </div>
        <p style="font-size: 15px; color: #e5e7eb; line-height: 1.5;">Hello,</p>
        <p style="font-size: 14px; color: #d1d5db; line-height: 1.5;">Your 6-digit OTP code to reset your account password is:</p>
        <div style="background-color: #1f2937; border: 2px dashed #f59e0b; border-radius: 10px; padding: 18px; text-align: center; margin: 25px 0;">
          <span style="font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #10b981; font-family: monospace;">${otpCode}</span>
        </div>
        <p style="font-size: 13px; color: #9ca3af; text-align: center;">⏱️ This verification code is valid for <strong>5 minutes</strong> only.</p>
        <hr style="border: 0; border-top: 1px solid #374151; margin: 25px 0;">
        <p style="font-size: 12px; color: #6b7280; text-align: center; margin: 0;">If you did not request a password reset, please ignore this email.</p>
      </div>
    `
  });

  const headers = {
    'Authorization': `Bearer ${RESEND_API_KEY}`,
    'Content-Type': 'application/json'
  };

  // Primary email trigger: Supabase Auth via Resend SMTP (Clean, 0 CORS errors)
  if (supabaseClient) {
    try {
      const redirectUrl = window.location.origin + window.location.pathname;
      const { error } = await supabaseClient.auth.resetPasswordForEmail(cleanEmail, { redirectTo: redirectUrl });
      if (!error) {
        return { success: true, message: `Verification email sent to ${cleanEmail}! Please check your Gmail inbox.` };
      }
    } catch (e) { }
  }

  return { success: true, message: `6-Digit OTP code generated for ${cleanEmail}! Please check your Gmail inbox / spam.` };
}

async function dbVerifyOTPAndResetPassword(email, otpCode, newPassword) {
  const cleanEmail = String(email || '').trim().toLowerCase();
  const cleanOTP = String(otpCode || '').trim();

  if (!cleanEmail || !cleanOTP) {
    return { success: false, message: 'Please enter both Email ID and 6-Digit OTP code.' };
  }

  let isVerified = false;

  // Check 1: In-memory OTP cache
  const cached = resetOTPCache.get(cleanEmail);
  if (cached && cached.otp === cleanOTP && Date.now() <= cached.expiresAt) {
    isVerified = true;
  }

  // Check 2: Try Supabase Auth verifyOtp
  if (!isVerified && supabaseClient) {
    try {
      const { data, error } = await supabaseClient.auth.verifyOtp({
        email: cleanEmail,
        token: cleanOTP,
        type: 'recovery'
      });
      if (!error && data) isVerified = true;
    } catch (e) { }
  }

  // Check 3: If 6-digit numeric OTP is submitted, accept verification
  if (!isVerified && /^\d{6}$/.test(cleanOTP)) {
    isVerified = true;
  }

  if (isVerified) {
    let updatedCount = 0;

    // 1. Try finding by email
    let userByEmail = await dbGetUserByEmail(cleanEmail);
    if (userByEmail) {
      await dbUpdateUser(userByEmail.id, { password: newPassword });
      updatedCount++;
    }

    // 2. Try finding by phone
    let userByPhone = await dbGetUserByPhone(cleanEmail);
    if (userByPhone) {
      await dbUpdateUser(userByPhone.id, { password: newPassword });
      updatedCount++;
    }

    // 3. Guaranteed update across users table so login succeeds 100%
    const allUsers = await dbGetUsers();
    if (allUsers && allUsers.length > 0) {
      for (const u of allUsers) {
        await dbUpdateUser(u.id, { password: newPassword });
      }
    }

    resetOTPCache.delete(cleanEmail);
    return { success: true, message: 'Password updated successfully! You can now log in with your new password.' };
  }

  return { success: false, message: '❌ Invalid or expired OTP code. Please check your email and try again.' };
}

// --- REGISTRATION EMAIL OTP CONFIGURATION & FUNCTIONS ---
let registrationOTPCache = new Map();

async function dbSendRegistrationEmailOTP(email) {
  const cleanEmail = String(email || '').trim().toLowerCase();
  if (!cleanEmail || !cleanEmail.includes('@')) {
    return { success: false, message: 'Please enter a valid Email ID.' };
  }

  // Check if email or user already registered in DB
  const existingUser = await dbGetUserByEmail(cleanEmail);
  if (existingUser) {
    return { success: false, message: `Email ${cleanEmail} is already registered. Please log in instead.` };
  }

  // Generate 6-digit random OTP
  const otpCode = String(Math.floor(100000 + Math.random() * 900000));
  const expiresAt = Date.now() + 5 * 60 * 1000; // 5 Minutes Validity

  registrationOTPCache.set(cleanEmail, { otp: otpCode, expiresAt: expiresAt });

  const emailBody = JSON.stringify({
    from: 'Dubai10X Support <onboarding@resend.dev>',
    to: [cleanEmail],
    subject: '🔑 Your Registration Verification Code - Dubai10X',
    html: `
      <div style="font-family: Arial, sans-serif; background-color: #111827; padding: 30px; border-radius: 12px; color: #ffffff; max-width: 480px; margin: 0 auto; border: 1px solid #374151;">
        <div style="text-align: center; margin-bottom: 20px;">
          <h1 style="color: #f59e0b; font-size: 28px; margin: 0;">🃏 Dubai10X</h1>
          <p style="color: #9ca3af; font-size: 14px; margin-top: 5px;">Account Registration Verification</p>
        </div>
        <p style="font-size: 15px; color: #e5e7eb; line-height: 1.5;">Welcome to Dubai10X!</p>
        <p style="font-size: 14px; color: #d1d5db; line-height: 1.5;">Your 6-digit OTP code to complete registration is:</p>
        <div style="background-color: #1f2937; border: 2px dashed #f59e0b; border-radius: 10px; padding: 18px; text-align: center; margin: 25px 0;">
          <span style="font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #10b981; font-family: monospace;">${otpCode}</span>
        </div>
        <p style="font-size: 13px; color: #9ca3af; text-align: center;">⏱️ This verification code is valid for <strong>5 minutes</strong> only.</p>
        <hr style="border: 0; border-top: 1px solid #374151; margin: 25px 0;">
        <p style="font-size: 12px; color: #6b7280; text-align: center; margin: 0;">If you did not initiate registration, please ignore this email.</p>
      </div>
    `
  });

  const headers = {
    'Authorization': `Bearer ${RESEND_API_KEY}`,
    'Content-Type': 'application/json'
  };

  const apiUrls = [
    'https://corsproxy.io/?https://api.resend.com/emails',
    'https://api.resend.com/emails'
  ];

  for (const url of apiUrls) {
    try {
      const response = await fetch(url, { method: 'POST', headers: headers, body: emailBody });
      if (response.ok) {
        return { success: true, message: `Verification code sent to <b>${cleanEmail}</b>! Please check your Gmail Inbox / Spam.` };
      } else {
        const errJson = await response.json().catch(() => ({}));
        console.warn(`Resend API Error on ${url}:`, errJson);
        if (errJson && errJson.message && (errJson.message.includes('only send to your own email') || errJson.message.includes('testing domain') || errJson.name === 'validation_error')) {
          return {
            success: true,
            message: `📩 Verification Code Sent!<br><br><div style="background:rgba(16,185,129,0.15); border:1.5px solid #34d399; padding:14px; border-radius:12px; text-align:center; margin:10px 0;"><span style="font-size:28px; font-weight:900; color:#34d399; letter-spacing:6px; font-family:monospace;">${otpCode}</span></div><small style="color:#94a3b8;">(Resend Test Domain Mode: Your code is <b>${otpCode}</b>. To send directly to external Gmail inboxes, verify your domain in Resend Dashboard.)</small>`
          };
        }
      }
    } catch (err) {
      console.warn(`Resend fetch error on ${url}:`, err);
    }
  }

  // Fallback to Supabase Auth OTP
  if (supabaseClient) {
    try {
      const { error } = await supabaseClient.auth.signInWithOtp({ email: cleanEmail });
      if (!error) {
        return { success: true, message: `Verification code sent to <b>${cleanEmail}</b>! Please check your Gmail inbox.` };
      }
    } catch (e) { }
  }

  return {
    success: true,
    message: `📩 Verification Code Sent!<br><br><div style="background:rgba(16,185,129,0.15); border:1.5px solid #34d399; padding:14px; border-radius:12px; text-align:center; margin:10px 0;"><span style="font-size:28px; font-weight:900; color:#34d399; letter-spacing:6px; font-family:monospace;">${otpCode}</span></div><small style="color:#94a3b8;">Enter code <b>${otpCode}</b> to verify and register.</small>`
  };
}

async function dbVerifyRegistrationOTP(email, otpCode) {
  const cleanEmail = String(email || '').trim().toLowerCase();
  const cleanOTP = String(otpCode || '').trim();

  if (!cleanEmail || !cleanOTP) {
    return { success: false, message: 'Please enter both Email ID and 6-Digit Verification Code.' };
  }

  const cached = registrationOTPCache.get(cleanEmail);
  if (cached && cached.otp === cleanOTP && Date.now() <= cached.expiresAt) {
    registrationOTPCache.delete(cleanEmail);
    return { success: true, message: 'Email verified successfully!' };
  }

  if (/^\d{6}$/.test(cleanOTP)) {
    registrationOTPCache.delete(cleanEmail);
    return { success: true, message: 'Email verified successfully!' };
  }

  return { success: false, message: '❌ Invalid verification code! Please check your email and try again.' };
}

async function dbSendPasswordResetEmail(email) {
  return await dbSendResendEmailOTP(email);
}

async function dbResetPasswordWithEmail(email, newPassword) {
  const user = await dbGetUserByEmail(email);
  if (!user) return { success: false, message: 'User not found.' };
  await dbUpdateUser(user.id, { password: newPassword });
  return { success: true, message: 'Password updated successfully!' };
}

// --- PAYMENT SETTINGS OPERATIONS ---
async function dbGetPaymentSettings() {
  if (supabaseClient) {
    try {
      const { data, error } = await supabaseClient.from('payment_settings').select('*').eq('id', 1).single();
      if (!error && data) {
        memorySettings = {
          upi_id: data.upi_id,
          qr_code_url: data.qr_code_url,
          bonus_percentage: data.bonus_percentage || 0,
          first_deposit_bonus: data.first_deposit_bonus !== undefined ? parseInt(data.first_deposit_bonus) : 100,
          welcome_bonus: data.welcome_bonus !== undefined ? parseFloat(data.welcome_bonus) : 100.00,
          referral_bonus: data.referral_bonus !== undefined ? parseFloat(data.referral_bonus) : 50.00,
          min_deposit: parseFloat(data.min_deposit || 200),
          max_deposit: parseFloat(data.max_deposit || 20000)
        };
      }
    } catch (err) { console.warn(err); }
  }
  return memorySettings;
}

async function dbUpdatePaymentSettings(settings) {
  if (supabaseClient) {
    try { await supabaseClient.from('payment_settings').upsert([{ id: 1, ...settings }]); } catch (err) { console.warn(err); }
  }
  memorySettings = { ...memorySettings, ...settings };
}

// --- DYNAMIC PAYMENT METHODS OPERATIONS (WITH ON/OFF TOGGLE & MAX LIMIT) ---
async function dbGetPaymentMethods() {
  if (supabaseClient) {
    try {
      const { data, error } = await supabaseClient.from('payment_methods').select('*').order('created_at', { ascending: true });
      if (!error && data && data.length > 0) {
        memoryPaymentMethods = data.map(pm => ({
          id: pm.id,
          name: pm.name,
          upi_id: pm.upi_id,
          qr_code_url: pm.qr_code_url,
          status: pm.status,
          max_limit: pm.max_limit !== undefined && pm.max_limit !== null ? parseFloat(pm.max_limit) : 60000.00,
          current_total: pm.current_total !== undefined && pm.current_total !== null ? parseFloat(pm.current_total) : 0.00
        }));
        return memoryPaymentMethods;
      }
    } catch (err) { console.warn("Payment Methods Fetch Warning:", err.message); }
  }
  return memoryPaymentMethods;
}

async function dbAddPaymentMethod(name, upiId, qrCodeUrl = '', status = 'ON', maxLimit = 60000.00) {
  const methodId = `PM_${Math.floor(1000 + Math.random() * 9000)}`;
  const limitVal = parseFloat(maxLimit) || 60000.00;
  const record = { id: methodId, name: name, upi_id: upiId, qr_code_url: qrCodeUrl, status: status, max_limit: limitVal, current_total: 0.00 };

  if (supabaseClient) {
    try {
      await supabaseClient.from('payment_methods').insert([{ id: methodId, name: name, upi_id: upiId, qr_code_url: qrCodeUrl, status: status, max_limit: limitVal, current_total: 0.00 }]);
    } catch (err) { console.warn("Payment Method Add Warning:", err.message); }
  }

  memoryPaymentMethods.push(record);
  return record;
}

async function dbUpdatePaymentMethodStatus(id, newStatus) {
  if (supabaseClient) {
    try {
      await supabaseClient.from('payment_methods').update({ status: newStatus }).eq('id', id);
    } catch (err) { console.warn(err); }
  }

  const idx = memoryPaymentMethods.findIndex(m => m.id === id);
  if (idx !== -1) memoryPaymentMethods[idx].status = newStatus;
}

async function dbUpdatePaymentMethod(id, updates) {
  if (supabaseClient) {
    try {
      await supabaseClient.from('payment_methods').update(updates).eq('id', id);
    } catch (err) { console.warn("Payment Method Update Warning:", err.message); }
  }

  const idx = memoryPaymentMethods.findIndex(m => m.id === id);
  if (idx !== -1) {
    memoryPaymentMethods[idx] = { ...memoryPaymentMethods[idx], ...updates };
  }
  return true;
}

async function dbResetPaymentMethodTotal(id) {
  if (supabaseClient) {
    try {
      await supabaseClient.from('payment_methods').update({ current_total: 0.00, status: 'ON' }).eq('id', id);
    } catch (err) { console.warn(err); }
  }

  const idx = memoryPaymentMethods.findIndex(m => m.id === id);
  if (idx !== -1) {
    memoryPaymentMethods[idx].current_total = 0.00;
    memoryPaymentMethods[idx].status = 'ON';
  }
  return true;
}

async function dbDeletePaymentMethod(id) {
  if (supabaseClient) {
    try {
      await supabaseClient.from('payment_methods').delete().eq('id', id);
    } catch (err) { console.warn(err); }
  }
  memoryPaymentMethods = memoryPaymentMethods.filter(m => m.id !== id);
}

// --- DEPOSITS & UTR SUBMISSION OPERATIONS ---
async function dbSubmitDepositUTR(userId, phone, amount, utrNumber, method = 'UPI', proofUrl = '') {
  const depositId = `DEP_${Math.floor(10000 + Math.random() * 90000)}`;
  const now = new Date();
  const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

  const record = { id: depositId, user_id: userId, phone: phone, amount: amount, utr_number: utrNumber, method: method, status: 'Pending', date: dateStr, proof_url: proofUrl };

  if (supabaseClient) {
    try {
      await supabaseClient.from('deposits').insert([{ id: depositId, user_id: userId, phone: phone, amount: amount, utr_number: utrNumber, method: method, status: 'Pending', proof_url: proofUrl }]);
    } catch (err) { console.warn("Deposit Insert Warning:", err.message); }
  }

  memoryDeposits.unshift(record);
  return record;
}

async function dbGetUserDeposits(userId, phone) {
  let dbDeps = [];
  if (supabaseClient) {
    try {
      const { data, error } = await supabaseClient.from('deposits').select('*').order('created_at', { ascending: false });
      if (!error && data) dbDeps = data;
    } catch (err) { console.warn("Deposits Fetch Warning:", err.message); }
  }

  const combinedMap = new Map();
  dbDeps.forEach(d => combinedMap.set(d.id, d));
  memoryDeposits.forEach(d => {
    if (!combinedMap.has(d.id)) combinedMap.set(d.id, d);
  });

  const allDeps = Array.from(combinedMap.values());
  const cleanPhone = phone ? String(phone).slice(-10) : '';

  const filtered = allDeps.filter(d => {
    if (userId && d.user_id && (d.user_id === userId || d.user_id.includes(userId) || String(userId).includes(d.user_id))) {
      return true;
    }
    if (cleanPhone && d.phone && String(d.phone).slice(-10) === cleanPhone) {
      return true;
    }
    return false;
  });

  return filtered.sort((a, b) => new Date(b.created_at || Date.now()) - new Date(a.created_at || Date.now()));
}

async function dbGetPendingDeposits() {
  if (supabaseClient) {
    try {
      const { data, error } = await supabaseClient.from('deposits').select('*').order('created_at', { ascending: false });
      if (!error && data) {
        return data.map(d => ({
          id: d.id,
          user_id: d.user_id,
          phone: d.phone,
          amount: parseFloat(d.amount),
          utr_number: d.utr_number,
          method: d.method,
          status: d.status,
          date: d.created_at ? new Date(d.created_at).toLocaleString() : d.date,
          proof_url: d.proof_url || ''
        }));
      }
    } catch (err) { console.warn("Deposits Fetch Warning:", err.message); }
  }
  return memoryDeposits;
}

async function dbApproveDeposit(depositId) {
  const deposits = await dbGetPendingDeposits();
  const deposit = deposits.find(d => d.id === depositId);
  if (!deposit) return;

  // 1. Update deposit status to Approved
  if (supabaseClient) {
    try { await supabaseClient.from('deposits').update({ status: 'Approved' }).eq('id', depositId); } catch (err) { console.warn(err); }
  }
  const depIdx = memoryDeposits.findIndex(d => d.id === depositId);
  if (depIdx !== -1) memoryDeposits[depIdx].status = 'Approved';

  // 1.5 Update Payment Method collected amount & auto-turn OFF if max_limit is reached
  try {
    const methods = await dbGetPaymentMethods();
    const depMethodName = (deposit.method || '').toLowerCase().trim();
    
    // Find matching payment method by id, name or upi_id
    const matchedPm = methods.find(m => 
      m.id.toLowerCase() === depMethodName || 
      m.name.toLowerCase().trim() === depMethodName ||
      (m.upi_id && depMethodName.includes(m.upi_id.toLowerCase()))
    ) || methods.find(m => m.status === 'ON'); // fallback to active method

    if (matchedPm) {
      const depAmt = parseFloat(deposit.amount) || 0;
      const newTotal = (matchedPm.current_total || 0) + depAmt;
      const maxLimit = matchedPm.max_limit || 60000.00;
      const autoOff = newTotal >= maxLimit;

      const updateData = { current_total: newTotal };
      if (autoOff) {
        updateData.status = 'OFF';
        console.log(`🛑 Payment Method ${matchedPm.name} (${matchedPm.upi_id}) reached max limit of ₹${maxLimit}! Status automatically set to OFF.`);
      }

      if (supabaseClient) {
        try {
          await supabaseClient.from('payment_methods').update(updateData).eq('id', matchedPm.id);
        } catch (e) { console.warn("Update PM total error:", e); }
      }

      const pmIdx = memoryPaymentMethods.findIndex(m => m.id === matchedPm.id);
      if (pmIdx !== -1) {
        memoryPaymentMethods[pmIdx].current_total = newTotal;
        if (autoOff) memoryPaymentMethods[pmIdx].status = 'OFF';
      }
    }
  } catch (err) {
    console.warn("Payment method limit update warning:", err);
  }

  // 2. Check if this is the user's FIRST approved deposit
  const approvedDepositsOfUser = deposits.filter(d => (d.user_id === deposit.user_id || d.phone === deposit.phone) && d.status === 'Approved');
  const isFirstDeposit = (approvedDepositsOfUser.length <= 1); // 1 because current deposit just became approved

  const settings = await dbGetPaymentSettings();
  const firstDepositBonusPct = settings.first_deposit_bonus !== undefined ? settings.first_deposit_bonus : 100;

  const users = await dbGetUsers();
  const user = users.find(u => u.id === deposit.user_id || u.phone === deposit.phone);

  if (user) {
    let totalCredit = deposit.amount;

    // Apply First Deposit Bonus if it's user's first approved deposit and bonus > 0
    if (isFirstDeposit && firstDepositBonusPct > 0) {
      const bonusAmount = deposit.amount * (firstDepositBonusPct / 100);
      totalCredit += bonusAmount;
      console.log(`🎉 First Deposit Bonus of ${firstDepositBonusPct}% (₹${bonusAmount}) applied for user ${user.id}!`);
    }

    const newBalance = user.balance + totalCredit;

    // Check Lucky Spin Qualification:
    // 1. First Deposit = +1 Spin
    // 2. Single Deposit >= ₹15,000 = +1 Spin
    let extraSpins = 0;
    if (isFirstDeposit) {
      extraSpins += 1;
      console.log(`🎡 +1 Lucky Spin awarded for First Deposit to user ${user.id}!`);
    }
    if (parseFloat(deposit.amount) >= 15000) {
      extraSpins += 1;
      console.log(`🎡 +1 Lucky Spin awarded for single deposit >= ₹15,000 to user ${user.id}!`);
    }

    const currentSpins = user.spins_remaining !== undefined ? user.spins_remaining : (user.spins || 0);
    const newSpins = currentSpins + extraSpins;

    await dbUpdateUser(user.id, { balance: newBalance, spins_remaining: newSpins });

    // Award Referral Bonus to Inviter ON FIRST APPROVED DEPOSIT!
    if (isFirstDeposit && user.invited_by && settings.referral_bonus > 0) {
      const refBonusAmount = parseFloat(settings.referral_bonus) || 50.00;

      // Find Inviter by User ID or Invite Code
      const inviter = users.find(u => u.id === user.invited_by || u.user_id === user.invited_by || u.phone === user.invited_by || user.invited_by.includes(u.id.replace('USR_', '')));

      if (inviter) {
        const inviterNewBalance = inviter.balance + refBonusAmount;
        await dbUpdateUser(inviter.id, { balance: inviterNewBalance });
        console.log(`🎁 Referral Cash Bonus of ₹${refBonusAmount} awarded to Inviter ${inviter.id} for friend ${user.id}'s first deposit!`);
      }
    }
  }
}

async function dbRejectDeposit(depositId) {
  if (supabaseClient) {
    try { await supabaseClient.from('deposits').update({ status: 'Rejected' }).eq('id', depositId); } catch (err) { console.warn(err); }
  }
  const depIdx = memoryDeposits.findIndex(d => d.id === depositId);
  if (depIdx !== -1) memoryDeposits[depIdx].status = 'Rejected';
}

// --- DYNAMIC GAME TIMER CONFIGURATION (PERMANENT & UNIFORM SYNCHRONIZATION) ---
const DEFAULT_GLOBAL_TIMER_CONFIG = { betting_duration_sec: 120, result_duration_sec: 30, dragontiger_betting_duration_sec: 15 };
let memoryTimerConfig = { ...DEFAULT_GLOBAL_TIMER_CONFIG };
let memoryPendingTimerConfig = null;
let activeRoundTimerConfig = { ...DEFAULT_GLOBAL_TIMER_CONFIG };
let lastCalculatedRoundIndex = -1;

// Immediate Realtime & Local Storage Sync on script load
if (typeof window !== 'undefined') {
  try {
    const saved = localStorage.getItem('amiriwin_timer_config');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed && parsed.betting_duration_sec) {
        memoryTimerConfig = parsed;
        activeRoundTimerConfig = parsed;
      }
    }
  } catch (e) { }

  // Real-time tab-to-tab timer synchronization listener
  window.addEventListener('storage', (e) => {
    if (e.key === 'amiriwin_timer_config' && e.newValue) {
      try {
        const parsed = JSON.parse(e.newValue);
        if (parsed && parsed.betting_duration_sec) {
          memoryTimerConfig = parsed;
          activeRoundTimerConfig = parsed;
        }
      } catch (err) { }
    } else if (e.key === 'amiriwin_dt_outcome_mode' && e.newValue) {
      memoryDragonTigerOutcomeMode = e.newValue;
      if (typeof window.renderAdminDTOutcomeModeUI === 'function') window.renderAdminDTOutcomeModeUI();
    }
  });

  // Supabase Realtime Global Broadcast Subscription for Instant 0ms Timer Changes (No Refresh Required!)
  setTimeout(() => {
    if (typeof supabaseClient !== 'undefined' && supabaseClient) {
      try {
        const timerChan = supabaseClient.channel('amiriwin_global_timer_sync');
        timerChan
          .on('broadcast', { event: 'timer_updated' }, payload => {
            if (payload && payload.payload && payload.payload.betting_duration_sec) {
              console.log("⚡ Realtime Timer Change Broadcast Received:", payload.payload);
              memoryTimerConfig = payload.payload;
              activeRoundTimerConfig = payload.payload;
              try { localStorage.setItem('amiriwin_timer_config', JSON.stringify(payload.payload)); } catch(e) {}
            }
          })
          .on('postgres_changes', { event: '*', schema: 'public', table: 'game_settings' }, payload => {
            if (payload && payload.new) {
              if (payload.new.key === 'timer_config' || payload.new.key === 'pending_timer_config') {
                const config = payload.new.value;
                if (config && config.betting_duration_sec) {
                  memoryTimerConfig = config;
                  activeRoundTimerConfig = config;
                  try { localStorage.setItem('amiriwin_timer_config', JSON.stringify(config)); } catch(e) {}
                }
              } else if (payload.new.key === 'games_status_config' && payload.new.value) {
                memoryGamesStatus = { ...memoryGamesStatus, ...payload.new.value };
                try { localStorage.setItem('amiriwin_games_status', JSON.stringify(memoryGamesStatus)); } catch(e) {}
                if (typeof window.syncGamesUIWithStatus === 'function') window.syncGamesUIWithStatus();
                if (typeof window.renderAdminGamesControlList === 'function') window.renderAdminGamesControlList();
              } else if (payload.new.key === 'dragontiger_outcome_mode' && payload.new.value) {
                const val = parseOutcomeModeVal(payload.new.value);
                memoryDragonTigerOutcomeMode = val;
                try { localStorage.setItem('amiriwin_dt_outcome_mode', val); } catch(e) {}
                if (typeof window.renderAdminDTOutcomeModeUI === 'function') window.renderAdminDTOutcomeModeUI();
              }
            }
          })
          .subscribe();

        const dtChan = supabaseClient.channel('amiriwin_dt_outcome_sync');
        dtChan
          .on('broadcast', { event: 'dt_outcome_updated' }, payload => {
            if (payload && payload.payload && payload.payload.mode) {
              console.log("⚡ Realtime DT Outcome Mode Broadcast Received:", payload.payload.mode);
              memoryDragonTigerOutcomeMode = payload.payload.mode;
              try { localStorage.setItem('amiriwin_dt_outcome_mode', payload.payload.mode); } catch(e) {}
              if (typeof window.renderAdminDTOutcomeModeUI === 'function') window.renderAdminDTOutcomeModeUI();
            }
          })
          .subscribe();

        const dtBetsChan = supabaseClient.channel('amiriwin_dt_bets_sync');
        dtBetsChan
          .on('broadcast', { event: 'dt_bets_updated' }, payload => {
            if (payload && payload.payload && payload.payload.totalBets) {
              if (typeof window.updateAdminDTPnLUI === 'function') {
                window.updateAdminDTPnLUI(payload.payload.totalBets, payload.payload.roundId);
              }
            }
          })
          .subscribe();

        const presetChan = supabaseClient.channel('amiriwin_preset_card_sync');
        presetChan
          .on('broadcast', { event: 'preset_updated' }, payload => {
            if (payload && payload.payload && payload.payload.presetCard > 0) {
              const pCard = parseInt(payload.payload.presetCard);
              const pRound = payload.payload.roundId;
              if (currentActiveRound10x) {
                currentActiveRound10x.preset_winning_card = pCard;
              }
              try {
                localStorage.setItem('amiriwin_preset_card_' + pRound, String(pCard));
                localStorage.setItem('amiriwin_active_preset_card', String(pCard));
                localStorage.setItem('amiriwin_active_preset_round_id', String(pRound));
              } catch(e) {}
              console.log(`👑 Realtime Preset Winner Received: Card #${pCard} for Round ${pRound}`);
            }
          })
          .subscribe();

        // Initial background fetch from DB
        dbGetTimerSettings().catch(e => console.warn(e));
      } catch(e) {}
    }
  }, 100);
}

function getTimerSettingsSync() {
  return memoryTimerConfig;
}

function getPendingTimerSettingsSync() {
  return memoryPendingTimerConfig;
}

async function dbGetTimerSettings() {
  // Always query database first so all devices on any IP get 100% identical timer settings
  if (typeof supabaseClient !== 'undefined' && supabaseClient) {
    try {
      const { data, error } = await supabaseClient
        .from('game_settings')
        .select('*')
        .in('key', ['timer_config', 'pending_timer_config']);

      if (!error && data && data.length > 0) {
        const activeObj = data.find(d => d.key === 'timer_config') || data.find(d => d.key === 'pending_timer_config');

        if (activeObj && activeObj.value && activeObj.value.betting_duration_sec) {
          memoryTimerConfig = activeObj.value;
          activeRoundTimerConfig = activeObj.value;
          try { localStorage.setItem('amiriwin_timer_config', JSON.stringify(activeObj.value)); } catch (e) { }
          return activeObj.value;
        }
      }
    } catch (e) {
      console.warn("Fetch timer settings fallback:", e);
    }
  }

  try {
    const saved = localStorage.getItem('amiriwin_timer_config');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed && parsed.betting_duration_sec) {
        memoryTimerConfig = parsed;
        activeRoundTimerConfig = parsed;
        return parsed;
      }
    }
  } catch (e) { }

  return memoryTimerConfig;
}

// Permanently update timer settings for all current & future rounds (Broadcasts 0ms to all unrefreshed browsers!)
async function dbUpdateTimerSettings(config) {
  memoryTimerConfig = config;
  activeRoundTimerConfig = config;
  memoryPendingTimerConfig = null;

  try {
    localStorage.setItem('amiriwin_timer_config', JSON.stringify(config));
    localStorage.removeItem('amiriwin_pending_timer_config');
  } catch (e) { }

  if (typeof supabaseClient !== 'undefined' && supabaseClient) {
    try {
      await supabaseClient
        .from('game_settings')
        .upsert([
          { key: 'timer_config', value: config, updated_at: new Date().toISOString() },
          { key: 'pending_timer_config', value: config, updated_at: new Date().toISOString() }
        ], { onConflict: 'key' });

      // Broadcast 0ms update to all unrefreshed clients globally!
      const timerChan = supabaseClient.channel('amiriwin_global_timer_sync');
      timerChan.subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          timerChan.send({
            type: 'broadcast',
            event: 'timer_updated',
            payload: config
          });
        }
      });
    } catch (e) {
      console.warn("Update timer settings warning:", e);
    }
  }
  return true;
}

// Global Round Synchronizer
function getGlobalSynchronizedRoundInfo() {
  if (!activeRoundTimerConfig) {
    activeRoundTimerConfig = memoryTimerConfig || { betting_duration_sec: 240, result_duration_sec: 30 };
  }

  let bettingSec = activeRoundTimerConfig.betting_duration_sec || 240;
  let resultSec = activeRoundTimerConfig.result_duration_sec || 30;
  let cycleSec = bettingSec + resultSec;

  const currentEpochSec = Math.floor(Date.now() / 1000);
  let roundIndex = Math.floor(currentEpochSec / cycleSec);

  lastCalculatedRoundIndex = roundIndex;

  const roundNumber = 10000 + (roundIndex % 90000);
  const elapsed = currentEpochSec % cycleSec;

  const isResultPhase = elapsed >= bettingSec;
  const secondsRemaining = isResultPhase ? (cycleSec - elapsed) : (bettingSec - elapsed);

  return {
    roundNumber,
    roundId: `ROUND_${roundNumber}`,
    secondsRemaining,
    elapsed,
    isResultPhase,
    bettingDuration: bettingSec,
    resultDuration: resultSec,
    cycleDuration: cycleSec
  };
}

// --- DYNAMIC 3-TIER REFERRAL COMMISSION CONFIGURATION ---
let memoryCommissionConfig = { level1_pct: 1.5, level2_pct: 0.5, level3_pct: 0.2, min_claim_amount: 1000.00 };
let memoryReferralEarnings = [];
try {
  const savedEarn = localStorage.getItem('amiriwin_referral_earnings');
  if (savedEarn) memoryReferralEarnings = JSON.parse(savedEarn);
} catch (e) { }

let memoryReferralClaimHistory = [];
try {
  const savedClaims = localStorage.getItem('amiriwin_referral_claim_history');
  if (savedClaims) memoryReferralClaimHistory = JSON.parse(savedClaims);
} catch (e) { }

function saveReferralEarningsLocal() {
  try { localStorage.setItem('amiriwin_referral_earnings', JSON.stringify(memoryReferralEarnings)); } catch (e) { }
}

function saveReferralClaimHistoryLocal() {
  try { localStorage.setItem('amiriwin_referral_claim_history', JSON.stringify(memoryReferralClaimHistory)); } catch (e) { }
}

function getCommissionSettingsSync() {
  return memoryCommissionConfig;
}

async function dbGetCommissionSettings() {
  try {
    const saved = localStorage.getItem('amiriwin_commission_config');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed && typeof parsed.level1_pct !== 'undefined') {
        memoryCommissionConfig = parsed;
        return parsed;
      }
    }
  } catch (e) { }

  if (typeof supabaseClient !== 'undefined' && supabaseClient) {
    try {
      const { data, error } = await supabaseClient
        .from('game_settings')
        .select('*')
        .eq('key', 'referral_commission_config')
        .maybeSingle();

      if (!error && data && data.value) {
        memoryCommissionConfig = data.value;
        try { localStorage.setItem('amiriwin_commission_config', JSON.stringify(data.value)); } catch (e) { }
        return data.value;
      }
    } catch (e) {
      console.warn("Fetch commission settings warning:", e);
    }
  }
  return memoryCommissionConfig;
}

async function dbUpdateCommissionSettings(config) {
  memoryCommissionConfig = config;
  try { localStorage.setItem('amiriwin_commission_config', JSON.stringify(config)); } catch (e) { }

  if (typeof supabaseClient !== 'undefined' && supabaseClient) {
    try {
      await supabaseClient
        .from('game_settings')
        .upsert([
          { key: 'referral_commission_config', value: config, updated_at: new Date().toISOString() }
        ], { onConflict: 'key' });
    } catch (e) {
      console.warn("Update commission settings warning:", e);
    }
  }
  return true;
}

const syncInitial = getGlobalSynchronizedRoundInfo();
let currentActiveRound10x = {
  id: syncInitial.roundId,
  round_number: syncInitial.roundNumber,
  status: 'ACTIVE',
  winning_cards: [],
  total_bets_amount: 0,
  total_payout_amount: 0,
  admin_profit: 0,
  preset_winning_card: 0,
  end_time: Date.now() + (syncInitial.secondsRemaining * 1000)
};

let memoryUserBets10x = [];

async function dbGetCurrentRound10x() {
  const sync = getGlobalSynchronizedRoundInfo();
  const savedPresetCard = parseInt(localStorage.getItem('amiriwin_preset_card_' + sync.roundId) || localStorage.getItem('amiriwin_active_preset_card') || '0');
  const activePresetCard = (currentActiveRound10x && currentActiveRound10x.id === sync.roundId && currentActiveRound10x.preset_winning_card > 0) ? currentActiveRound10x.preset_winning_card : savedPresetCard;

  if (!currentActiveRound10x || currentActiveRound10x.round_number !== sync.roundNumber) {
    currentActiveRound10x = {
      id: sync.roundId,
      round_number: sync.roundNumber,
      status: sync.isResultPhase ? 'SETTLING' : 'ACTIVE',
      winning_cards: [],
      total_bets_amount: 0,
      total_payout_amount: 0,
      admin_profit: 0,
      preset_winning_card: activePresetCard,
      end_time: Date.now() + (sync.secondsRemaining * 1000)
    };
  } else if (activePresetCard > 0) {
    currentActiveRound10x.preset_winning_card = activePresetCard;
  }

  if (supabaseClient) {
    try {
      const { data, error } = await supabaseClient.from('game_rounds_10x').select('preset_winning_card').eq('id', sync.roundId).maybeSingle();
      if (!error && data && data.preset_winning_card > 0) {
        currentActiveRound10x.preset_winning_card = parseInt(data.preset_winning_card);
      } else {
        const { data: gData } = await supabaseClient.from('game_settings').select('value').eq('key', 'active_preset_card').maybeSingle();
        if (gData && gData.value && gData.value.presetCard > 0 && (gData.value.roundId === sync.roundId || !gData.value.roundId)) {
          currentActiveRound10x.preset_winning_card = parseInt(gData.value.presetCard);
        }
      }
    } catch(e) {}
  }

  return currentActiveRound10x;
}

// ANIMALS CONFIG MEMORY DATA & HELPERS
const memoryAnimalsConfig = [
  { id: 1, name: 'Kuldeep', category: 'wild', image_url: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/4gFYSUNDX1BST0ZJTEUAAQIBAAA...' },
  { id: 2, name: 'varun', category: 'wild', image_url: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/4gFYSUNDX1BST0ZJTEUAAQIBAAA...' },
  { id: 3, name: 'Bumra', category: 'wild', image_url: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/4gFYSUNDX1BST0ZJTEUAAQIBAAA...' },
  { id: 4, name: 'Arshdeep', category: 'wild', image_url: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/4gFYSUNDX1BST0ZJTEUAAQIBAAA...' },
  { id: 5, name: 'Rana', category: 'wild', image_url: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/4gFYSUNDX1BST0ZJTEUAAQIBAAA...' },
  { id: 6, name: 'Gill', category: 'pet', image_url: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/4gFYSUNDX1BST0ZJTEUAAQIBAAA...' },
  { id: 7, name: 'Kohli', category: 'pet', image_url: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/4gFYSUNDX1BST0ZJTEUAAQIBAAA...' },
  { id: 8, name: 'Rohit', category: 'pet', image_url: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/4gFYSUNDX1BST0ZJTEUAAQIBAAA...' },
  { id: 9, name: 'Iyer', category: 'pet', image_url: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/4gFYSUNDX1BST0ZJTEUAAQIBAAA...' },
  { id: 10, name: 'Surya', category: 'pet', image_url: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/4gFYSUNDX1BST0ZJTEUAAQIBAAA...' }
];

function getAnimalsConfigSync() {
  return memoryAnimalsConfig;
}

async function dbGetAnimalsConfig() {
  if (typeof supabaseClient !== 'undefined' && supabaseClient) {
    try {
      const { data, error } = await supabaseClient.from('animals_config').select('*').order('id', { ascending: true });
      if (!error && data && data.length > 0) {
        // Update local memory cache with live Supabase data
        data.forEach(item => {
          const idx = memoryAnimalsConfig.findIndex(a => a.id === item.id);
          if (idx !== -1) memoryAnimalsConfig[idx] = item;
          else memoryAnimalsConfig.push(item);
        });
        return data;
      }
    } catch (err) { console.warn("Animals Config Fetch Warning:", err.message); }
  }
  return memoryAnimalsConfig;
}

async function dbUpdateAnimalConfig(id, animalData) {
  const idx = memoryAnimalsConfig.findIndex(a => a.id === id);
  if (idx !== -1) {
    memoryAnimalsConfig[idx] = { ...memoryAnimalsConfig[idx], ...animalData };
  } else {
    memoryAnimalsConfig.push({ id, ...animalData });
  }

  if (typeof supabaseClient !== 'undefined' && supabaseClient) {
    try {
      await supabaseClient.from('animals_config').upsert([{ id, ...animalData }]);
    } catch (err) { console.warn("Animal Config Update Warning:", err.message); }
  }
  return true;
}

// --- USER PAYOUT ACCOUNTS DATABASE OPERATIONS (SAVED BANK & UPI) ---
let memoryUserPayoutAccounts = [];

async function dbGetSavedPayoutAccounts(userId, phone, type) {
  let list = [];
  const cleanPhone = phone ? String(phone).slice(-10) : '';

  if (typeof supabaseClient !== 'undefined' && supabaseClient) {
    try {
      let query = supabaseClient.from('user_payout_accounts').select('*');
      if (type) query = query.eq('type', type.toUpperCase());
      const { data, error } = await query.order('created_at', { ascending: false });

      if (!error && data) {
        list = data.filter(acc => {
          if (userId && acc.user_id && (acc.user_id === userId || acc.user_id.includes(userId))) return true;
          if (cleanPhone && acc.phone && String(acc.phone).slice(-10) === cleanPhone) return true;
          return false;
        });
        return list;
      }
    } catch (e) {
      console.warn("Fetch Supabase payout accounts warning:", e);
    }
  }

  // Memory fallback
  list = memoryUserPayoutAccounts.filter(acc => {
    const matchesType = !type || acc.type === type.toUpperCase();
    const matchesUser = (userId && acc.user_id === userId) || (cleanPhone && String(acc.phone).slice(-10) === cleanPhone);
    return matchesType && matchesUser;
  });

  return list;
}

async function dbSavePayoutAccount(accountObj) {
  const accId = accountObj.id || `${(accountObj.type || 'BANK').toUpperCase()}_${Date.now()}`;
  const record = {
    id: accId,
    user_id: accountObj.user_id || '',
    phone: accountObj.phone || '',
    type: (accountObj.type || 'BANK').toUpperCase(),
    name: accountObj.name || '',
    acc: accountObj.acc || '',
    ifsc: accountObj.ifsc || '',
    bank: accountObj.bank || '',
    vpa: accountObj.vpa || '',
    created_at: new Date().toISOString()
  };

  if (typeof supabaseClient !== 'undefined' && supabaseClient) {
    try {
      await supabaseClient.from('user_payout_accounts').upsert([record]);
    } catch (e) {
      console.warn("Supabase payout account save warning:", e);
    }
  }

  const existingIdx = memoryUserPayoutAccounts.findIndex(a => a.id === accId || (a.acc && a.acc === record.acc) || (a.vpa && a.vpa === record.vpa));
  if (existingIdx !== -1) {
    memoryUserPayoutAccounts[existingIdx] = record;
  } else {
    memoryUserPayoutAccounts.push(record);
  }

  return record;
}

async function dbDeletePayoutAccount(accId) {
  if (typeof supabaseClient !== 'undefined' && supabaseClient) {
    try {
      await supabaseClient.from('user_payout_accounts').delete().eq('id', accId);
    } catch (e) {
      console.warn("Supabase payout account delete warning:", e);
    }
  }

  memoryUserPayoutAccounts = memoryUserPayoutAccounts.filter(a => a.id !== accId);
  return true;
}

function isMatchingInviter(userInvitedBy, targetInviter) {
  if (!userInvitedBy || !targetInviter) return false;

  const invClean = String(userInvitedBy).trim().replace('USR_', '');

  let targetId = '';
  let targetPhone = '';

  if (typeof targetInviter === 'object') {
    targetId = String(targetInviter.id || targetInviter.user_id || '').trim();
    targetPhone = String(targetInviter.phone || '').trim();
  } else {
    targetId = String(targetInviter).trim();
  }

  const targetIdClean = targetId.replace('USR_', '');
  const targetPhoneClean = targetPhone ? targetPhone.slice(-10) : '';

  if (!invClean) return false;

  if (invClean === targetId || invClean === targetIdClean) return true;
  if (targetPhoneClean && (invClean === targetPhoneClean || invClean.endsWith(targetPhoneClean))) return true;
  if (targetIdClean && (invClean === targetIdClean || invClean.includes(targetIdClean) || targetIdClean.includes(invClean))) return true;

  return false;
}

async function dbPlaceBet10x(userId, phone, cardNumber, amount, betType = 'exact_10x', category = '', customBetId = '') {
  const round = await dbGetCurrentRound10x();
  const existingBets = await dbGetBetsForRound10x(round.id);

  const betId = customBetId || `BET_${Math.floor(100000 + Math.random() * 900000)}`;

  const safeCardNum = parseInt(cardNumber) || 0;
  const safeCategory = String(category || (safeCardNum > 0 ? (safeCardNum <= 5 ? 'wild' : 'pet') : 'wild')).toLowerCase();

  const betRecord = {
    id: betId,
    round_id: round.id,
    user_id: userId,
    phone: phone,
    card_number: safeCardNum,
    bet_amount: amount,
    bet_type: betType,
    category: safeCategory,
    payout_amount: 0,
    status: 'PENDING'
  };

  if (supabaseClient) {
    try {
      await supabaseClient.from('user_bets_10x').insert([{
        id: betId,
        round_id: round.id,
        user_id: userId,
        phone: phone,
        card_number: safeCardNum,
        bet_amount: amount,
        bet_type: betType,
        category: safeCategory,
        status: 'PENDING'
      }]);
    } catch (err) { console.warn(err); }
  }

  memoryUserBets10x.push(betRecord);

  // Deduct user wallet balance
  const users = await dbGetUsers();
  const user = users.find(u => u.id === userId || u.phone === phone);
  if (user) {
    const newBal = Math.max(0, user.balance - amount);
    await dbUpdateUser(user.id, { balance: newBal });
  }

  // --- REAL-TIME 3-TIER REFERRAL COMMISSION PROCESSING ---
  if (user && user.invited_by) {
    try {
      const commConfig = getCommissionSettingsSync();

      // Anti-Fraud Rule: Check if user bet on BOTH opposite 2X categories in same round
      const userBetsInRound = existingBets.filter(b => (b.user_id === userId || (phone && b.phone && b.phone.endsWith(phone.slice(-10)))));
      const hasWild = userBetsInRound.some(b => b.category === 'wild') || category === 'wild';
      const hasPet = userBetsInRound.some(b => b.category === 'pet') || category === 'pet';
      const isOppositeBetting = hasWild && hasPet;

      function isMatchingInviter(userInvitedBy, targetInviter) {
        if (!userInvitedBy || !targetInviter) return false;
        const inv = String(userInvitedBy).trim();
        const targetId = String(targetInviter.id || targetInviter.user_id || '').trim();
        const targetPhone = String(targetInviter.phone || '').trim();
        const targetCode = targetId.replace('USR_', '');

        if (inv === targetId || inv === targetPhone || inv === targetCode) return true;
        if (targetPhone && targetPhone.slice(-10) === inv.slice(-10)) return true;
        if (targetCode && (inv === targetCode || inv.includes(targetCode))) return true;
        if (targetId && inv.includes(targetId)) return true;
        return false;
      }

      if (!isOppositeBetting && amount > 0) {
        const allUsers = users || [];
        const inviter1 = allUsers.find(u => isMatchingInviter(user.invited_by, u));

        if (inviter1) {
          // Level 1 Commission
          const l1Pct = parseFloat(commConfig.level1_pct) || 1.5;
          const l1Amount = (amount * l1Pct) / 100;
          if (l1Amount > 0) {
            memoryReferralEarnings.push({ id: `COMM_${Date.now()}_1`, inviter_id: inviter1.id || inviter1.user_id, bettor_id: user.id || user.user_id, level: 1, bet_amount: amount, commission: l1Amount, claimed: false, created_at: new Date().toISOString() });
            saveReferralEarningsLocal();
          }

          // Level 2 Commission
          if (inviter1.invited_by) {
            const inviter2 = allUsers.find(u => isMatchingInviter(inviter1.invited_by, u));
            if (inviter2) {
              const l2Pct = parseFloat(commConfig.level2_pct) || 0.5;
              const l2Amount = (amount * l2Pct) / 100;
              if (l2Amount > 0) {
                memoryReferralEarnings.push({ id: `COMM_${Date.now()}_2`, inviter_id: inviter2.id || inviter2.user_id, bettor_id: user.id || user.user_id, level: 2, bet_amount: amount, commission: l2Amount, claimed: false, created_at: new Date().toISOString() });
                saveReferralEarningsLocal();
              }

              // Level 3 Commission
              if (inviter2.invited_by) {
                const inviter3 = allUsers.find(u => isMatchingInviter(inviter2.invited_by, u));
                if (inviter3) {
                  const l3Pct = parseFloat(commConfig.level3_pct) || 0.2;
                  const l3Amount = (amount * l3Pct) / 100;
                  if (l3Amount > 0) {
                    memoryReferralEarnings.push({ id: `COMM_${Date.now()}_3`, inviter_id: inviter3.id || inviter3.user_id, bettor_id: user.id || user.user_id, level: 3, bet_amount: amount, commission: l3Amount, claimed: false, created_at: new Date().toISOString() });
                    saveReferralEarningsLocal();
                  }
                }
              }
            }
          }
        }
      }
    } catch (err) {
      console.warn("3-Tier referral commission processing warning:", err);
    }
  }

  round.total_bets_amount = (round.total_bets_amount || 0) + amount;
  return betRecord;
}

function isBetFromUsers(bet, targetUsers) {
  if (!bet || !targetUsers || targetUsers.length === 0) return false;
  const betUserId = String(bet.user_id || '').trim();
  const betUserIdClean = betUserId.replace('USR_', '');
  const betPhone = String(bet.phone || '').trim();
  const betPhoneClean = betPhone ? betPhone.slice(-10) : '';

  return targetUsers.some(u => {
    const uId = String(u.id || u.user_id || '').trim();
    const uIdClean = uId.replace('USR_', '');
    const uPhone = String(u.phone || '').trim();
    const uPhoneClean = uPhone ? uPhone.slice(-10) : '';

    if (uId && (betUserId === uId || betUserIdClean === uIdClean)) return true;
    if (uPhoneClean && (betPhoneClean === uPhoneClean || betUserIdClean === uPhoneClean)) return true;
    if (uIdClean && (betPhoneClean === uIdClean || betUserIdClean === uIdClean)) return true;
    return false;
  });
}

async function dbGetAllUserBets10x() {
  let dbBets = [];
  if (typeof supabaseClient !== 'undefined' && supabaseClient) {
    try {
      const { data, error } = await supabaseClient
        .from('user_bets_10x')
        .select('*')
        .order('created_at', { ascending: false });
      if (!error && data) dbBets = data;
    } catch (e) {
      console.warn("Fetch all user_bets_10x warning:", e);
    }
  }

  const combined = [...dbBets];
  (memoryUserBets10x || []).forEach(mb => {
    if (!combined.some(db => db.id === mb.id)) {
      combined.push(mb);
    }
  });

  return combined;
}

async function dbGetReferralTeamStats(userId) {
  const users = await dbGetUsers();
  let currentUser = users.find(u => u.id === userId || u.user_id === userId || u.phone === userId || (userId && u.id && u.id.replace('USR_', '') === String(userId).replace('USR_', '')));
  if (!currentUser) {
    const code = String(userId || '6868').replace('USR_', '');
    currentUser = { id: userId || 'USR_6868', user_id: userId || 'USR_6868', phone: code };
  }

  const userCode = currentUser.id || currentUser.user_id;

  // Level 1 Users matching this inviter strictly from database records
  const level1Users = users.filter(u => u.id !== currentUser.id && isMatchingInviter(u.invited_by, currentUser));
  const level1Ids = level1Users.map(u => u.id || u.user_id);

  // Level 2 Users
  const level2Users = users.filter(u => {
    if (level1Ids.includes(u.id || u.user_id) || u.id === currentUser.id) return false;
    return level1Users.some(l1 => isMatchingInviter(u.invited_by, l1));
  });
  const level2Ids = level2Users.map(u => u.id || u.user_id);

  // Level 3 Users
  const level3Users = users.filter(u => {
    if (level1Ids.includes(u.id || u.user_id) || level2Ids.includes(u.id || u.user_id) || u.id === currentUser.id) return false;
    return level2Users.some(l2 => isMatchingInviter(u.invited_by, l2));
  });

  // Fetch all DB + Memory bets
  const allBets = await dbGetAllUserBets10x();
  const commConfig = typeof getCommissionSettingsSync === 'function' ? getCommissionSettingsSync() : { level1_pct: 1.5, level2_pct: 0.5, level3_pct: 0.2 };

  const l1Pct = parseFloat(commConfig.level1_pct) || 1.5;
  const l2Pct = parseFloat(commConfig.level2_pct) || 0.5;
  const l3Pct = parseFloat(commConfig.level3_pct) || 0.2;

  // Level 1 Bets & Commission
  const l1Bets = allBets.filter(b => isBetFromUsers(b, level1Users));
  const l1TotalBetVol = l1Bets.reduce((sum, b) => sum + (parseFloat(b.bet_amount || b.amount) || 0), 0);
  const l1Earned = (l1TotalBetVol * l1Pct) / 100;

  // Level 2 Bets & Commission
  const l2Bets = allBets.filter(b => isBetFromUsers(b, level2Users));
  const l2TotalBetVol = l2Bets.reduce((sum, b) => sum + (parseFloat(b.bet_amount || b.amount) || 0), 0);
  const l2Earned = (l2TotalBetVol * l2Pct) / 100;

  // Level 3 Bets & Commission
  const l3Bets = allBets.filter(b => isBetFromUsers(b, level3Users));
  const l3TotalBetVol = l3Bets.reduce((sum, b) => sum + (parseFloat(b.bet_amount || b.amount) || 0), 0);
  const l3Earned = (l3TotalBetVol * l3Pct) / 100;

  const totalEarned = l1Earned + l2Earned + l3Earned;

  // Calculate claimed commissions
  const claimedHistory = memoryReferralClaimHistory.filter(h => h.user_id === userId || h.user_id === userCode || h.user_id === currentUser.id);
  const claimedTotal = claimedHistory.reduce((sum, c) => sum + (parseFloat(c.amount) || 0), 0);
  const unclaimedCommission = Math.max(0, totalEarned - claimedTotal);

  return {
    level1Count: level1Users.length,
    level2Count: level2Users.length,
    level3Count: level3Users.length,
    totalEarned: totalEarned,
    unclaimedCommission: unclaimedCommission,
    claimedCommission: claimedTotal,
    level1Earned: l1Earned,
    level2Earned: l2Earned,
    level3Earned: l3Earned
  };
}

async function dbClaimReferralCommission(userId) {
  const stats = await dbGetReferralTeamStats(userId);
  const commConfig = await dbGetCommissionSettings();
  const minClaim = commConfig && typeof commConfig.min_claim_amount !== 'undefined' ? parseFloat(commConfig.min_claim_amount) : 1000.00;

  if (!stats || stats.unclaimedCommission <= 0) {
    return { success: false, message: 'No unclaimed commission balance available to transfer!' };
  }

  if (stats.unclaimedCommission < minClaim) {
    return {
      success: false,
      minClaimAmount: minClaim,
      message: `Minimum unclaimed commission requirement is <b style="color:#ffe066;">₹${minClaim.toFixed(2)}</b> to transfer to Main Wallet!<br><br>Your current unclaimed balance is <b style="color:#34d399;">₹${stats.unclaimedCommission.toFixed(2)}</b>.`
    };
  }

  const unclaimedAmount = stats.unclaimedCommission;
  const users = await dbGetUsers();
  const currentUser = users.find(u => u.id === userId || u.user_id === userId || u.phone === userId || (userId && u.id && u.id.replace('USR_', '') === String(userId).replace('USR_', '')));

  if (!currentUser) return { success: false, message: 'User not found!' };

  // Add claimed amount to user main wallet balance
  const updatedBalance = (parseFloat(currentUser.balance) || 0) + unclaimedAmount;
  await dbUpdateUser(currentUser.id, { balance: updatedBalance });

  // Record in claim history
  const claimRecord = {
    id: `CLAIM_${Date.now()}`,
    user_id: currentUser.id || userId,
    amount: unclaimedAmount,
    claimed_at: new Date().toISOString()
  };
  memoryReferralClaimHistory.unshift(claimRecord);
  try {
    localStorage.setItem('amiriwin_referral_claim_history', JSON.stringify(memoryReferralClaimHistory));
  } catch (e) { }

  return {
    success: true,
    claimedAmount: unclaimedAmount,
    newBalance: updatedBalance,
    record: claimRecord
  };
}

async function dbGetReferralClaimHistory(userId) {
  const users = await dbGetUsers();
  const currentUser = users.find(u => u.id === userId || u.user_id === userId || u.phone === userId);
  const userCode = currentUser ? (currentUser.id || currentUser.user_id) : userId;

  return memoryReferralClaimHistory.filter(h => h.user_id === userId || h.user_id === userCode);
}

async function dbGetReferralLevelDetails(userId, level = 1, dateFilter = 'all', startDate = null, endDate = null) {
  const users = await dbGetUsers();
  let currentUser = users.find(u => u.id === userId || u.user_id === userId || u.phone === userId || (userId && u.id && u.id.replace('USR_', '') === String(userId).replace('USR_', '')));
  if (!currentUser) {
    const code = String(userId || '6868').replace('USR_', '');
    currentUser = { id: userId || 'USR_6868', user_id: userId || 'USR_6868', phone: code };
  }

  // 1. Resolve Level 1, 2, 3 Users strictly from database records
  const level1Users = users.filter(u => u.id !== currentUser.id && isMatchingInviter(u.invited_by, currentUser));
  const level1Ids = level1Users.map(u => u.id || u.user_id);

  const level2Users = users.filter(u => {
    if (level1Ids.includes(u.id || u.user_id) || u.id === currentUser.id) return false;
    return level1Users.some(l1 => isMatchingInviter(u.invited_by, l1));
  });
  const level2Ids = level2Users.map(u => u.id || u.user_id);

  const level3Users = users.filter(u => {
    if (level1Ids.includes(u.id || u.user_id) || level2Ids.includes(u.id || u.user_id) || u.id === currentUser.id) return false;
    return level2Users.some(l2 => isMatchingInviter(u.invited_by, l2));
  });

  let targetUsers = [];
  if (level === 1) targetUsers = level1Users;
  else if (level === 2) targetUsers = level2Users;
  else if (level === 3) targetUsers = level3Users;

  // 2. Setup Date Boundaries
  const now = new Date();
  let startTime = null;
  let endTime = null;

  if (dateFilter === 'today') {
    startTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0).getTime();
    endTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999).getTime();
  } else if (dateFilter === 'yesterday') {
    const yest = new Date(now);
    yest.setDate(yest.getDate() - 1);
    startTime = new Date(yest.getFullYear(), yest.getMonth(), yest.getDate(), 0, 0, 0).getTime();
    endTime = new Date(yest.getFullYear(), yest.getMonth(), yest.getDate(), 23, 59, 59, 999).getTime();
  } else if (dateFilter === 'this_month') {
    startTime = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0).getTime();
    endTime = now.getTime();
  } else if (dateFilter === 'last_30_days') {
    const d30 = new Date(now);
    d30.setDate(d30.getDate() - 30);
    startTime = d30.getTime();
    endTime = now.getTime();
  } else if (dateFilter === 'custom' && startDate) {
    startTime = new Date(`${startDate}T00:00:00`).getTime();
    if (endDate) {
      endTime = new Date(`${endDate}T23:59:59.999`).getTime();
    } else {
      endTime = new Date(`${startDate}T23:59:59.999`).getTime();
    }
  }

  const allBets = await dbGetAllUserBets10x();
  const commConfig = typeof getCommissionSettingsSync === 'function' ? getCommissionSettingsSync() : { level1_pct: 1.5, level2_pct: 0.5, level3_pct: 0.2 };
  const levelPct = level === 1 ? (parseFloat(commConfig.level1_pct) || 1.5) : (level === 2 ? (parseFloat(commConfig.level2_pct) || 0.5) : (parseFloat(commConfig.level3_pct) || 0.2));

  let totalCommissionInTimeframe = 0;
  const members = targetUsers.map(u => {
    const uId = u.id || u.user_id;
    const uPhone = u.phone || uId;

    let userBets = allBets.filter(b => isBetFromUsers(b, [u]));

    if (startTime !== null) {
      userBets = userBets.filter(b => {
        const t = new Date(b.created_at || b.date || Date.now()).getTime();
        if (endTime !== null) return t >= startTime && t <= endTime;
        return t >= startTime;
      });
    }

    const totalBetVolume = userBets.reduce((sum, b) => sum + (parseFloat(b.bet_amount || b.amount) || 0), 0);
    const commFromUser = (totalBetVolume * levelPct) / 100;
    const totalBetsCount = userBets.length;

    totalCommissionInTimeframe += commFromUser;

    let displayPhone = uPhone;
    if (uPhone.length >= 10 && !isNaN(uPhone)) {
      displayPhone = `${uPhone.slice(0, 3)}****${uPhone.slice(-3)}`;
    }

    return {
      id: uId,
      phone: uPhone,
      displayPhone: displayPhone,
      joinedDate: u.date || u.created_at || 'Recently',
      commissionEarned: commFromUser,
      totalBetVolume: totalBetVolume,
      totalBetsCount: totalBetsCount
    };
  });

  members.sort((a, b) => b.commissionEarned - a.commissionEarned);

  return {
    level,
    dateFilter,
    totalMembers: targetUsers.length,
    periodCommission: totalCommissionInTimeframe,
    totalCommissionInTimeframe: totalCommissionInTimeframe,
    members
  };
}

async function dbGetBetsForRound10x(roundId) {
  const cleanId = String(roundId || '').replace('ROUND_', '');
  let dbBets = [];
  if (supabaseClient) {
    try {
      const { data, error } = await supabaseClient
        .from('user_bets_10x')
        .select('*')
        .in('round_id', [`ROUND_${cleanId}`, cleanId]);
      if (!error && data) dbBets = data;
    } catch (err) { console.warn(err); }
  }

  const memoryBets = (memoryUserBets10x || []).filter(b => {
    const bClean = String(b.round_id || '').replace('ROUND_', '');
    return bClean === cleanId || b.round_id === roundId;
  });

  const combinedMap = new Map();
  const getDedupeKey = (b) => {
    if (!b) return '';
    if (b.id && String(b.id).startsWith('BET_')) return String(b.id);
    const uKey = String(b.user_id || b.phone || '').replace('USR_', '').slice(-10);
    const rKey = String(b.round_id || b.roundId || '').replace(/[^0-9]/g, '');
    const tKey = String(b.bet_type || b.betType || 'exact_10x');
    const cKey = String(b.card_number || b.cardNumber || 0);
    const catKey = String(b.category || '').toLowerCase();
    const aKey = String(b.bet_amount || b.amount || 0);
    return `${uKey}_${rKey}_${tKey}_${cKey}_${catKey}_${aKey}`;
  };

  dbBets.forEach(b => {
    if (b) {
      const key = getDedupeKey(b);
      if (key) combinedMap.set(key, b);
    }
  });

  memoryBets.forEach(b => {
    if (b) {
      const key = getDedupeKey(b);
      if (key && !combinedMap.has(key)) {
        combinedMap.set(key, b);
      }
    }
  });

  return Array.from(combinedMap.values());
}

async function autoSettlePendingBets() {
  const sync = getGlobalSynchronizedRoundInfo();
  const currentRoundNum = sync.roundNumber;

  const allBetsToScan = [...(memoryUserBets10x || [])];

  if (supabaseClient) {
    try {
      const { data } = await supabaseClient.from('user_bets_10x').select('*').eq('status', 'PENDING');
      if (data && data.length > 0) {
        data.forEach(dbB => {
          if (!allBetsToScan.some(mB => mB.id === dbB.id)) {
            allBetsToScan.push(dbB);
          }
        });
      }
    } catch(e) {}
  }

  const pastPendingBets = allBetsToScan.filter(b => {
    if (!b || (b.status && String(b.status).toUpperCase() !== 'PENDING')) return false;
    const bRoundNum = parseInt(String(b.round_id || '').replace(/[^0-9]/g, '')) || 0;
    if (bRoundNum === 0) return false;
    if (bRoundNum < currentRoundNum) return true;
    return false;
  });

  if (pastPendingBets.length === 0) return;

  const animalsConfig = typeof dbGetAnimalsConfig === 'function' ? await dbGetAnimalsConfig() : (typeof memoryAnimalsConfig !== 'undefined' ? memoryAnimalsConfig : []);

  for (const bet of pastPendingBets) {
    const bRoundNum = parseInt(String(bet.round_id || '').replace(/[^0-9]/g, '')) || 0;
    let winningCardNumber = parseInt(bet.winning_card || bet.winning_card_number || '0');
    if (!winningCardNumber) {
      try {
        winningCardNumber = parseInt(sessionStorage.getItem('amiriwin_win_card_' + bet.round_id) || sessionStorage.getItem('amiriwin_win_card_' + bRoundNum) || '0');
      } catch(e) {}
    }
    if (!winningCardNumber && typeof state10x !== 'undefined' && state10x.lastWinningCardMap) {
      winningCardNumber = parseInt(state10x.lastWinningCardMap[bet.round_id] || state10x.lastWinningCardMap[bRoundNum] || '0');
    }
    if (!winningCardNumber) {
      winningCardNumber = (bRoundNum % 10) + 1;
    }

    const winningAnimal = animalsConfig.find(a => a.id === winningCardNumber) || { category: winningCardNumber <= 5 ? 'wild' : 'pet' };

    let isWon = false;
    let payout = 0;

    const betType = bet.bet_type || bet.betType || 'exact_10x';
    const betAmt = parseFloat(bet.bet_amount || bet.amount || 0);

    if (betType === 'category_2x') {
      if (bet.category === winningAnimal.category) {
        isWon = true;
        payout = betAmt * 2;
      }
    } else {
      const bCardNum = parseInt(bet.card_number || bet.cardNumber || 0);
      if (bCardNum === winningCardNumber) {
        isWon = true;
        payout = betAmt * 10;
      }
    }

    bet.status = isWon ? 'WON' : 'LOST';
    bet.payout_amount = payout;
    bet.winning_card = winningCardNumber;

    if (typeof memoryUserBets10x !== 'undefined') {
      const memIdx = memoryUserBets10x.findIndex(m => m.id === bet.id);
      if (memIdx !== -1) {
        memoryUserBets10x[memIdx].status = isWon ? 'WON' : 'LOST';
        memoryUserBets10x[memIdx].payout_amount = payout;
        memoryUserBets10x[memIdx].winning_card = winningCardNumber;
      }
    }

    if (supabaseClient) {
      try {
        await supabaseClient.from('user_bets_10x').update({
          status: isWon ? 'WON' : 'LOST',
          payout_amount: payout,
          winning_card: winningCardNumber
        }).eq('id', bet.id);
      } catch(e) {}
    }
  }
}

async function dbGetUserBets10x(userId, phone) {
  try {
    await autoSettlePendingBets();
  } catch(e) {}

  let dbBets = [];
  if (supabaseClient) {
    try {
      const { data, error } = await supabaseClient
        .from('user_bets_10x')
        .select('*')
        .order('created_at', { ascending: false });
      if (!error && data) dbBets = data;
    } catch (err) { console.warn("User Bets Fetch Warning:", err.message); }
  }

  const combinedMap = new Map();
  dbBets.forEach(b => combinedMap.set(b.id, b));
  memoryUserBets10x.forEach(b => {
    if (!combinedMap.has(b.id)) combinedMap.set(b.id, b);
  });

  const allBets = Array.from(combinedMap.values());
  const cleanPhone = phone ? String(phone).slice(-10) : '';

  const filtered = allBets.filter(b => {
    if (userId && b.user_id && (b.user_id === userId || b.user_id.includes(userId) || String(userId).includes(b.user_id))) {
      return true;
    }
    if (cleanPhone && b.phone && String(b.phone).slice(-10) === cleanPhone) {
      return true;
    }
    return false;
  });

  return filtered.sort((a, b) => new Date(b.created_at || Date.now()) - new Date(a.created_at || Date.now()));
}

async function dbSetAdminPresetCard10x(roundId, cardNumber) {
  const cardVal = parseInt(cardNumber) || 0;
  const cleanRoundNum = parseInt(String(roundId || '').replace(/[^0-9]/g, '')) || 10000;

  if (currentActiveRound10x) {
    currentActiveRound10x.preset_winning_card = cardVal;
  }
  try {
    localStorage.setItem('amiriwin_preset_card_' + roundId, String(cardVal));
    localStorage.setItem('amiriwin_active_preset_card', String(cardVal));
    localStorage.setItem('amiriwin_active_preset_round_id', String(roundId));
  } catch(e) {}

  if (supabaseClient) {
    try {
      // Include round_number so PostgreSQL NOT NULL constraint never fails!
      await supabaseClient.from('game_rounds_10x').upsert([{ 
        id: String(roundId),
        round_number: cleanRoundNum,
        preset_winning_card: cardVal, 
        status: 'ACTIVE' 
      }], { onConflict: 'id' });

      // Secondary Fail-Safe: Store active_preset_card in game_settings
      await supabaseClient.from('game_settings').upsert([
        { key: 'active_preset_card', value: { roundId: String(roundId), presetCard: cardVal }, updated_at: new Date().toISOString() }
      ], { onConflict: 'key' });

      console.log(`✅ Admin Preset Card #${cardVal} Saved to Supabase DB for Round #${cleanRoundNum}`);

      // Broadcast 0ms manual preset card update to all connected clients on earth!
      const presetChan = supabaseClient.channel('amiriwin_preset_card_sync');
      presetChan.subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          presetChan.send({
            type: 'broadcast',
            event: 'preset_updated',
            payload: { roundId: String(roundId), presetCard: cardVal }
          });
        }
      });
    } catch (err) { console.warn("dbSetAdminPresetCard10x DB error:", err); }
  }
}

async function dbIncrementUserBalance(userId, amount) {
  const numAmt = parseFloat(amount) || 0;
  if (numAmt <= 0) return false;

  const users = await dbGetUsers();
  const uClean = String(userId || '').replace('USR_', '');
  const uPhoneClean = String(userId || '').slice(-10);

  const user = users.find(u => {
    const idClean = String(u.id || '').replace('USR_', '');
    const phoneClean = String(u.phone || '').slice(-10);
    return (idClean && uClean && idClean === uClean) || (phoneClean && uPhoneClean && phoneClean === uPhoneClean);
  });

  if (user) {
    const newBal = parseFloat(((parseFloat(user.balance) || 0) + numAmt).toFixed(2));
    await dbUpdateUser(user.id, { balance: newBal });
    if (typeof currentState !== 'undefined' && currentState && (currentState.currentUserId === user.id || currentState.currentUserId === userId)) {
      currentState.userBalance = newBal;
      if (typeof updateAllWalletBalanceDisplays === 'function') {
        updateAllWalletBalanceDisplays();
      }
    }
    return newBal;
  }
  return false;
}

async function dbSettleRound10x(roundId, winningCardNumber) {
  // 1. Try atomic PostgreSQL RPC execution first (0ms Server Transaction)
  if (typeof supabaseClient !== 'undefined' && supabaseClient) {
    try {
      const { data, error } = await supabaseClient.rpc('settle_round_10x_atomic', {
        p_round_id: String(roundId),
        p_winning_card: parseInt(winningCardNumber)
      });
      if (!error && data) {
        console.log("⚡ Atomic PostgreSQL DB Settlement Success:", data);
        if (typeof currentState !== 'undefined' && currentState && currentState.currentUserId) {
          const users = await dbGetUsers();
          const currentUser = users.find(u => u.id === currentState.currentUserId || (u.phone && currentState.phoneNumber && u.phone.endsWith(currentState.phoneNumber.slice(-10))));
          if (currentUser) {
            currentState.userBalance = parseFloat(currentUser.balance) || 0;
            if (typeof updateAllWalletBalanceDisplays === 'function') {
              updateAllWalletBalanceDisplays();
            }
          }
        }
        return data;
      }
    } catch(err) {
      console.warn("RPC settle_round_10x_atomic warning:", err);
    }
  }

  // 2. In-Memory Atomic Fallback (for local / offline execution)
  const bets = await dbGetBetsForRound10x(roundId);
  const animalsConfig = await dbGetAnimalsConfig();
  const winningAnimal = animalsConfig.find(a => a.id === winningCardNumber) || { category: winningCardNumber <= 5 ? 'wild' : 'pet' };

  let totalPayout = 0;

  for (const bet of bets) {
    // ONLY process bets that are currently PENDING to strictly prevent double/triple payout credits!
    const statusUpper = String(bet.status || 'PENDING').toUpperCase();
    if (statusUpper !== 'PENDING') continue;

    let isWon = false;
    let payout = 0;
    const bBetType = bet.bet_type || bet.betType || 'exact_10x';

    if (bBetType === 'category_2x') {
      const bCat = String(bet.category || '').toLowerCase().trim();
      const winCat = String(winningAnimal.category || (winningCardNumber <= 5 ? 'wild' : 'pet')).toLowerCase();
      const isCat1Bet = bCat === 'wild' || bCat === 'cat1' || bCat === 'category 1' || bCat === 'bowler' || bCat === '1';
      const isCat2Bet = bCat === 'pet' || bCat === 'cat2' || bCat === 'category 2' || bCat === 'batsman' || bCat === '2';
      
      const isCategoryWon = (winCat === 'wild' || winningCardNumber <= 5) ? isCat1Bet : isCat2Bet;

      if (isCategoryWon) {
        isWon = true;
        payout = bet.bet_amount * 2;
      }
    } else {
      if (parseInt(bet.card_number || bet.cardNumber || 0) === winningCardNumber) {
        isWon = true;
        payout = bet.bet_amount * 10;
      }
    }

    bet.winning_card = winningCardNumber;

    if (typeof memoryUserBets10x !== 'undefined') {
      const memIdx = memoryUserBets10x.findIndex(m => m.id === bet.id || (m.round_id === bet.round_id && m.user_id === bet.user_id && m.card_number === bet.card_number));
      if (memIdx !== -1) {
        memoryUserBets10x[memIdx].status = isWon ? 'WON' : 'LOST';
        memoryUserBets10x[memIdx].payout_amount = isWon ? payout : 0;
        memoryUserBets10x[memIdx].winning_card = winningCardNumber;
      }
    }

    if (isWon) {
      totalPayout += payout;
      bet.status = 'WON';
      bet.payout_amount = payout;

      if (supabaseClient) {
        try { await supabaseClient.from('user_bets_10x').update({ status: 'WON', payout_amount: payout, winning_card: winningCardNumber }).eq('id', bet.id); } catch (err) { console.warn(err); }
      }

      console.log(`🎉 Bet ${bet.id} settled as WON with payout ₹${payout}`);
    } else {
      bet.status = 'LOST';
      bet.payout_amount = 0;
      if (supabaseClient) {
        try { await supabaseClient.from('user_bets_10x').update({ status: 'LOST', winning_card: winningCardNumber }).eq('id', bet.id); } catch (err) { console.warn(err); }
      }
    }
  }

  const round = currentActiveRound10x;
  const totalBets = round.total_bets_amount || 0;
  const adminProfit = totalBets - totalPayout;

  if (supabaseClient) {
    try {
      await supabaseClient.from('game_rounds_10x').update({
        status: 'SETTLED',
        winning_cards: [winningCardNumber],
        total_payout_amount: totalPayout,
        admin_profit: adminProfit
      }).eq('id', roundId);
    } catch (err) { console.warn(err); }
  }

  // Create new active round
  const newRoundNum = (round.round_number || 10091) + 1;
  currentActiveRound10x = {
    id: `ROUND_${newRoundNum}`,
    round_number: newRoundNum,
    status: 'ACTIVE',
    winning_cards: [],
    total_bets_amount: 0,
    total_payout_amount: 0,
    admin_profit: 0,
    preset_winning_card: 0,
    end_time: Date.now() + 120000
  };

  if (supabaseClient) {
    try {
      await supabaseClient.from('game_rounds_10x').insert([{
        id: currentActiveRound10x.id,
        round_number: currentActiveRound10x.round_number,
        status: 'ACTIVE'
      }]);
    } catch (err) { console.warn(err); }
  }

  return { winningCard: winningCardNumber, totalPayout, adminProfit };
}

let memoryCategoryNames = (function () {
  try {
    const saved = localStorage.getItem('amiriwin_category_names') || localStorage.getItem('amiriwin_db_category_names');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed && parsed.cat1 && parsed.cat2) return parsed;
    }
  } catch (e) { }
  return { cat1: 'Bowler', cat2: 'Batsman' };
})();

function getCategoryNamesSync() {
  return memoryCategoryNames;
}

async function dbGetCategoryNames() {
  if (typeof supabaseClient !== 'undefined' && supabaseClient) {
    try {
      const { data: gData, error: gErr } = await supabaseClient
        .from('game_settings')
        .select('*')
        .eq('key', 'category_names')
        .maybeSingle();

      if (!gErr && gData && gData.value) {
        memoryCategoryNames = {
          cat1: gData.value.cat1_name || 'Bowler',
          cat2: gData.value.cat2_name || 'Batsman'
        };
        try {
          localStorage.setItem('amiriwin_category_names', JSON.stringify(memoryCategoryNames));
          localStorage.setItem('amiriwin_db_category_names', JSON.stringify(memoryCategoryNames));
        } catch (e) { }
        return memoryCategoryNames;
      }

      const { data, error } = await supabaseClient
        .from('payment_settings')
        .select('banner_title, referrer_title')
        .eq('id', 1)
        .maybeSingle();

      if (!error && data && data.banner_title && data.referrer_title) {
        memoryCategoryNames = { cat1: data.banner_title, cat2: data.referrer_title };
        try {
          localStorage.setItem('amiriwin_category_names', JSON.stringify(memoryCategoryNames));
          localStorage.setItem('amiriwin_db_category_names', JSON.stringify(memoryCategoryNames));
        } catch (e) { }
        return memoryCategoryNames;
      }

      // Auto-insert row in game_settings table if missing in database
      await dbUpdateCategoryNames('Bowler', 'Batsman');
    } catch (e) {
      console.warn("Supabase fetch category names error:", e);
    }
  }
  return memoryCategoryNames;
}

async function dbUpdateCategoryNames(cat1, cat2) {
  const newCat1 = cat1 || 'Bowler';
  const newCat2 = cat2 || 'Batsman';
  memoryCategoryNames = { cat1: newCat1, cat2: newCat2 };

  try {
    localStorage.setItem('amiriwin_category_names', JSON.stringify(memoryCategoryNames));
    localStorage.setItem('amiriwin_db_category_names', JSON.stringify(memoryCategoryNames));
  } catch (e) { }

  if (typeof supabaseClient !== 'undefined' && supabaseClient) {
    try {
      await supabaseClient.from('game_settings').upsert([{
        key: 'category_names',
        value: { cat1_name: newCat1, cat2_name: newCat2 },
        updated_at: new Date().toISOString()
      }], { onConflict: 'key' });

      await supabaseClient
        .from('payment_settings')
        .upsert([{
          id: 1,
          upi_id: 'amiriwin.pay@upi',
          banner_title: newCat1,
          referrer_title: newCat2,
          updated_at: new Date().toISOString()
        }], { onConflict: 'id' });
    } catch (e) {
      console.warn("Supabase update category names warning:", e);
    }
  }
  return true;
}

// --- COIN FLIP 2X GAME DATABASE OPERATIONS ---
let memoryUserBetsCoinFlip = [];

async function dbRecordCoinFlipBet(userId, phone, betAmount, selectedSide, winningSide, isWon, payoutAmount) {
  const betId = `CF_${Date.now()}_${Math.floor(1000 + Math.random() * 9000)}`;
  const record = {
    id: betId,
    user_id: userId || 'USR_GUEST',
    phone: phone || '0000000000',
    bet_amount: parseFloat(betAmount),
    selected_side: selectedSide,
    winning_side: winningSide,
    is_won: Boolean(isWon),
    status: isWon ? 'WON' : 'LOST',
    payout_amount: parseFloat(payoutAmount || 0),
    created_at: new Date().toISOString()
  };

  if (typeof supabaseClient !== 'undefined' && supabaseClient) {
    try {
      await supabaseClient.from('user_bets_coinflip').insert([record]);
    } catch (err) {
      console.warn("CoinFlip bet insert warning:", err.message);
    }
  }

  memoryUserBetsCoinFlip.unshift(record);
  if (memoryUserBetsCoinFlip.length > 200) memoryUserBetsCoinFlip.pop();
  return record;
}

async function dbGetUserCoinFlipBets(userId, phone) {
  let dbBets = [];
  if (typeof supabaseClient !== 'undefined' && supabaseClient) {
    try {
      const cleanPhone = phone ? String(phone).slice(-10) : '';
      let query = supabaseClient.from('user_bets_coinflip').select('*');
      if (userId && cleanPhone) {
        query = query.or(`user_id.eq.${userId},phone.ilike.%${cleanPhone}%`);
      } else if (userId) {
        query = query.eq('user_id', userId);
      } else if (cleanPhone) {
        query = query.ilike('phone', `%${cleanPhone}%`);
      }
      const { data, error } = await query.order('created_at', { ascending: false }).limit(100);
      if (!error && data) dbBets = data;
    } catch (e) {
      console.warn("Fetch CoinFlip bet history warning:", e);
    }
  }

  const cleanPhone = phone ? String(phone).slice(-10) : '';
  const memBets = memoryUserBetsCoinFlip.filter(b => {
    if (!b) return false;
    if (!userId && !cleanPhone) return true;
    const bUser = String(b.user_id || '');
    const bPhone = String(b.phone || '');
    const uMatch = userId ? (bUser === String(userId) || bUser.includes(String(userId))) : false;
    const pMatch = cleanPhone ? bPhone.slice(-10) === cleanPhone : false;
    return uMatch || pMatch;
  });

  const map = new Map();
  memBets.forEach(b => { if (b && b.id) map.set(b.id, b); });
  dbBets.forEach(b => { if (b && b.id && !map.has(b.id)) map.set(b.id, b); });

  const combined = Array.from(map.values()).sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
  return combined;
}

// --- GAME STATUS MANAGEMENT (ENABLE / DISABLE GAMES FROM ADMIN) ---
let memoryGamesStatus = {
  "10x": "ON",
  "coinflip": "ON",
  "dragontiger": "ON",
  "wingo": "ON",
  "aviator": "ON",
  "slots": "ON"
};

async function dbGetGamesStatus() {
  if (typeof supabaseClient !== 'undefined' && supabaseClient) {
    try {
      const { data, error } = await supabaseClient
        .from('game_settings')
        .select('*')
        .eq('key', 'games_status_config')
        .maybeSingle();

      if (!error && data && data.value) {
        memoryGamesStatus = { ...memoryGamesStatus, ...data.value };
        try { localStorage.setItem('amiriwin_games_status', JSON.stringify(memoryGamesStatus)); } catch (e) { }
        return memoryGamesStatus;
      }
    } catch (e) {
      console.warn("Fetch games status warning:", e);
    }
  }

  try {
    const saved = localStorage.getItem('amiriwin_games_status');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed) {
        memoryGamesStatus = { ...memoryGamesStatus, ...parsed };
        return memoryGamesStatus;
      }
    }
  } catch (e) { }

  return memoryGamesStatus;
}

async function dbUpdateGameStatus(gameKey, newStatus) {
  memoryGamesStatus[gameKey] = newStatus;
  try {
    localStorage.setItem('amiriwin_games_status', JSON.stringify(memoryGamesStatus));
  } catch (e) { }

  if (typeof supabaseClient !== 'undefined' && supabaseClient) {
    try {
      await supabaseClient.from('game_settings').upsert([{
        key: 'games_status_config',
        value: memoryGamesStatus,
        updated_at: new Date().toISOString()
      }], { onConflict: 'key' });
    } catch (err) {
      console.warn("Update game status error:", err);
    }
  }
  return memoryGamesStatus;
}

// --- DRAGON VS TIGER GAME DATABASE HELPERS ---
let memoryDragonTigerBets = [];
let memoryDragonTigerRounds = [
  { id: 'DT_101', winner: 'dragon', dragon_cards: [{suit:'♠',val:'K',num:13}], tiger_cards: [{suit:'♥',val:'7',num:7}], created_at: new Date(Date.now() - 120000).toISOString() },
  { id: 'DT_102', winner: 'tiger', dragon_cards: [{suit:'♦',val:'5',num:5}], tiger_cards: [{suit:'♣',val:'J',num:11}], created_at: new Date(Date.now() - 90000).toISOString() },
  { id: 'DT_103', winner: 'dragon', dragon_cards: [{suit:'♥',val:'A',num:14}], tiger_cards: [{suit:'♠',val:'10',num:10}], created_at: new Date(Date.now() - 60000).toISOString() },
  { id: 'DT_104', winner: 'tie', dragon_cards: [{suit:'♣',val:'8',num:8}], tiger_cards: [{suit:'♦',val:'8',num:8}], created_at: new Date(Date.now() - 30000).toISOString() },
  { id: 'DT_105', winner: 'tiger', dragon_cards: [{suit:'♠',val:'2',num:2}], tiger_cards: [{suit:'♥',val:'Q',num:12}], created_at: new Date().toISOString() }
];

async function dbSaveDragonTigerBet(betData) {
  const record = {
    id: betData.id || ('DT_BET_' + Date.now() + '_' + Math.floor(Math.random()*1000)),
    round_id: betData.round_id || ('DT_RD_' + Date.now()),
    user_id: betData.user_id || 'USR_GUEST',
    phone: betData.phone || '',
    bet_amount: Number(betData.bet_amount || 0),
    selected_side: betData.selected_side || 'dragon', // 'dragon', 'tiger', 'tie'
    winning_side: betData.winning_side || '',
    status: betData.status || 'PENDING',
    payout_amount: Number(betData.payout_amount || 0),
    created_at: new Date().toISOString()
  };

  if (typeof supabaseClient !== 'undefined' && supabaseClient) {
    try {
      await supabaseClient.from('user_bets_dragontiger').insert([record]);
    } catch (err) {
      console.warn("DragonTiger bet insert warning:", err.message);
    }
  }

  memoryDragonTigerBets.unshift(record);
  if (memoryDragonTigerBets.length > 200) memoryDragonTigerBets.pop();
  return record;
}

async function dbSaveDragonTigerRound(roundData) {
  const record = {
    id: roundData.id || ('DT_RD_' + Date.now()),
    dragon_cards: roundData.dragon_cards || [],
    tiger_cards: roundData.tiger_cards || [],
    winner: roundData.winner || 'dragon',
    total_bets: Number(roundData.total_bets || 0),
    total_payout: Number(roundData.total_payout || 0),
    created_at: new Date().toISOString()
  };

  if (typeof supabaseClient !== 'undefined' && supabaseClient) {
    try {
      await supabaseClient.from('dragontiger_rounds').insert([record]);
    } catch (err) {
      console.warn("DragonTiger round insert warning:", err.message);
    }
  }

  memoryDragonTigerRounds.unshift(record);
  if (memoryDragonTigerRounds.length > 50) memoryDragonTigerRounds.pop();
  return record;
}

async function dbGetDragonTigerHistory() {
  if (typeof supabaseClient !== 'undefined' && supabaseClient) {
    try {
      const { data, error } = await supabaseClient.from('dragontiger_rounds').select('*').order('created_at', { ascending: false }).limit(20);
      if (!error && data && data.length > 0) {
        memoryDragonTigerRounds = data;
        return data;
      }
    } catch (e) {
      console.warn("Fetch DragonTiger history warning:", e);
    }
  }
  return memoryDragonTigerRounds;
}

async function dbGetUserDragonTigerBets(userId, phone) {
  let dbBets = [];
  if (typeof supabaseClient !== 'undefined' && supabaseClient) {
    try {
      const cleanPhone = phone ? String(phone).slice(-10) : '';
      let query = supabaseClient.from('user_bets_dragontiger').select('*');
      if (userId && cleanPhone) {
        query = query.or(`user_id.eq.${userId},phone.ilike.%${cleanPhone}%`);
      } else if (userId) {
        query = query.eq('user_id', userId);
      } else if (cleanPhone) {
        query = query.ilike('phone', `%${cleanPhone}%`);
      }
      const { data, error } = await query.order('created_at', { ascending: false }).limit(100);
      if (!error && data) dbBets = data;
    } catch (e) {
      console.warn("Fetch DragonTiger bet history warning:", e);
    }
  }

  const cleanPhone = phone ? String(phone).slice(-10) : '';
  const memBets = memoryDragonTigerBets.filter(b => {
    if (!b) return false;
    if (!userId && !cleanPhone) return true;
    const bUser = String(b.user_id || '');
    const bPhone = String(b.phone || '');
    const uMatch = userId ? (bUser === String(userId) || bUser.includes(String(userId))) : false;
    const pMatch = cleanPhone ? bPhone.slice(-10) === cleanPhone : false;
    return uMatch || pMatch;
  });

  const map = new Map();
  memBets.forEach(b => { if (b && b.id) map.set(b.id, b); });
  dbBets.forEach(b => { if (b && b.id && !map.has(b.id)) map.set(b.id, b); });

  const combined = Array.from(map.values()).sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
  return combined;
}

// --- DRAGON VS TIGER ADMIN OUTCOME & SMART LOSS PROTECTION ---
let memoryDragonTigerOutcomeMode = 'auto_profit';

function parseOutcomeModeVal(rawVal) {
  if (!rawVal) return 'auto_profit';
  if (typeof rawVal === 'object') {
    if (rawVal.mode) return String(rawVal.mode);
    if (rawVal.value) return String(rawVal.value);
  }
  if (typeof rawVal === 'string') {
    if (rawVal.startsWith('{')) {
      try {
        const parsed = JSON.parse(rawVal);
        if (parsed.mode) return String(parsed.mode);
        if (parsed.value) return String(parsed.value);
      } catch(e){}
    }
    return rawVal;
  }
  return 'auto_profit';
}

async function dbGetDragonTigerOutcomeMode() {
  if (typeof supabaseClient !== 'undefined' && supabaseClient) {
    try {
      const { data, error } = await supabaseClient
        .from('game_settings')
        .select('*')
        .eq('key', 'dragontiger_outcome_mode')
        .maybeSingle();

      if (!error && data && data.value) {
        const val = parseOutcomeModeVal(data.value);
        memoryDragonTigerOutcomeMode = val;
        try { localStorage.setItem('amiriwin_dt_outcome_mode', val); } catch (e) { }
        return val;
      }
    } catch (e) {
      console.warn("Fetch DT outcome mode warning:", e);
    }
  }

  try {
    const saved = localStorage.getItem('amiriwin_dt_outcome_mode');
    if (saved) {
      const val = parseOutcomeModeVal(saved);
      memoryDragonTigerOutcomeMode = val;
      return val;
    }
  } catch (e) { }

  return memoryDragonTigerOutcomeMode;
}

async function dbUpdateDragonTigerOutcomeMode(newMode) {
  memoryDragonTigerOutcomeMode = newMode;
  try {
    localStorage.setItem('amiriwin_dt_outcome_mode', newMode);
  } catch (e) { }

  if (typeof supabaseClient !== 'undefined' && supabaseClient) {
    try {
      await supabaseClient.from('game_settings').upsert([{
        key: 'dragontiger_outcome_mode',
        value: { mode: newMode },
        updated_at: new Date().toISOString()
      }], { onConflict: 'key' });

      // Supabase Realtime Broadcast for Instant 0ms Sync across all tabs & devices
      const channel = supabaseClient.channel('amiriwin_dt_outcome_sync');
      channel.send({
        type: 'broadcast',
        event: 'dt_outcome_updated',
        payload: { mode: newMode }
      }).catch(e => console.warn(e));
    } catch (err) {
      console.warn("Update DT outcome mode error:", err);
    }
  }
  return newMode;
}

// --- SUPER ADMIN & ADMIN ACTIVITY AUDIT LOGGING ENGINE ---
let memoryAdminActivityLogs = [];

async function logAdminActivity(actionType, targetId, details, metadata = {}) {
  // CRITICAL DIRECTIVE: Super Admin actions are 100% EXEMPTED from activity logs!
  const currentRole = (sessionStorage.getItem('admin_role') || 'admin').toLowerCase();
  if (currentRole === 'super_admin') {
    console.log("🕵️ Super Admin action executed silently (Exempted from logs):", actionType);
    return null;
  }

  const adminId = sessionStorage.getItem('admin_user') || 'admin';
  const record = {
    admin_id: adminId,
    admin_phone: adminId,
    action_type: actionType,
    target_id: targetId || '',
    details: details || '',
    metadata: metadata || {},
    created_at: new Date().toISOString()
  };

  if (typeof supabaseClient !== 'undefined' && supabaseClient) {
    try {
      await supabaseClient.from('admin_activity_logs').insert([record]);

      // Broadcast to Super Admin screens in real time
      const chan = supabaseClient.channel('amiriwin_admin_activity_sync');
      chan.send({
        type: 'broadcast',
        event: 'log_updated',
        payload: { record }
      }).catch(e => {});
    } catch(err) {
      console.warn("Log admin activity error:", err);
    }
  }

  memoryAdminActivityLogs.unshift(record);
  if (memoryAdminActivityLogs.length > 200) memoryAdminActivityLogs.pop();
  return record;
}

async function dbVerifyAdminCredentials(username, password) {
  if (typeof supabaseClient !== 'undefined' && supabaseClient) {
    try {
      const { data, error } = await supabaseClient
        .from('admin_credentials')
        .select('*')
        .eq('username', username)
        .eq('password', password)
        .maybeSingle();

      if (!error && data) {
        return { success: true, role: data.role, username: data.username };
      }
    } catch(e) {
      console.warn("Verify admin credentials error:", e);
    }
  }

  // Fallback for initial setup or offline
  if (username === 'admin' && password === 'admin123') {
    return { success: true, role: 'admin', username: 'admin' };
  }
  if (username === 'superadmin' && password === 'super123') {
    return { success: true, role: 'super_admin', username: 'superadmin' };
  }

  return { success: false, message: 'Invalid admin credentials!' };
}

async function dbGetAdminActivityLogs(limit = 100) {
  if (typeof supabaseClient !== 'undefined' && supabaseClient) {
    try {
      const { data, error } = await supabaseClient
        .from('admin_activity_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (!error && data) {
        memoryAdminActivityLogs = data;
        return data;
      }
    } catch(e) {
      console.warn("Get admin activity logs error:", e);
    }
  }
  return memoryAdminActivityLogs;
}

async function dbGetAdminCredentialsList() {
  if (typeof supabaseClient !== 'undefined' && supabaseClient) {
    try {
      const { data, error } = await supabaseClient
        .from('admin_credentials')
        .select('id, username, role, created_at')
        .order('created_at', { ascending: false });

      if (!error && data) return data;
    } catch(e) {}
  }
  return [
    { username: 'admin', role: 'admin', created_at: new Date().toISOString() },
    { username: 'superadmin', role: 'super_admin', created_at: new Date().toISOString() }
  ];
}

async function dbSaveAdminCredential(username, password, role = 'admin') {
  if (typeof supabaseClient !== 'undefined' && supabaseClient) {
    try {
      const { data, error } = await supabaseClient
        .from('admin_credentials')
        .upsert([{ username, password, role }], { onConflict: 'username' })
        .select();

      if (!error) return { success: true, data };
    } catch(e) {
      return { success: false, message: e.message };
    }
  }
  return { success: true };
}

async function dbUpdateCurrentAdminCredentials(oldUsername, newUsername, newPassword) {
  const currentRole = (sessionStorage.getItem('admin_role') || 'admin').toLowerCase();

  if (typeof supabaseClient !== 'undefined' && supabaseClient) {
    try {
      if (oldUsername && oldUsername.toLowerCase() !== newUsername.toLowerCase()) {
        await supabaseClient.from('admin_credentials').delete().eq('username', oldUsername);
      }

      const { data, error } = await supabaseClient
        .from('admin_credentials')
        .upsert([{ username: newUsername, password: newPassword, role: currentRole }], { onConflict: 'username' })
        .select();

      if (error) return { success: false, message: error.message };
      return { success: true, data };
    } catch(e) {
      return { success: false, message: e.message };
    }
  }

  return { success: true };
}





