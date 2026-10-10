/* =========================================================================
   APTV CARPLAY & WEB STREAM - MAIN LOGIC (app.js)
   Firebase Firestore Project ID: trungplay-12c60
   Tối ưu 100% cho Xe Dùng Con Lăn (Mazda / Mercedes / BMW) & Cảm Ứng
   ========================================================================= */

// 1. CẤU HÌNH FIREBASE FIRESTORE PROJECT
const firebaseConfig = {
  apiKey: "AIzaSyD_T8u2_fHLSVyrMnOvIRYJULuLrF5fxJA",
  authDomain: "trungplay-12c60.firebaseapp.com",
  projectId: "trungplay-12c60",
  storageBucket: "trungplay-12c60.firebasestorage.app",
  messagingSenderId: "642083340590",
  appId: "1:642083340590:web:151c35a53783ab31b93abf",
  measurementId: "G-4LG6EV6HM4"
};

// Khởi tạo Firebase SDK an toàn
let db = null;
function initFirebase() {
  try {
    if (window.firebase && !firebase.apps.length) {
      firebase.initializeApp(firebaseConfig);
    }
    if (window.firebase && firebase.apps.length) {
      db = firebase.firestore();
    }
  } catch (e) {
    console.warn("Lỗi khởi tạo Firebase:", e);
  }
}

// 2. CẤU HÌNH ỨNG DỤNG MẶC ĐỊNH
const DEFAULT_M3U_URL = 'https://raw.githubusercontent.com/iptv-org/iptv/master/streams/vn.m3u';
const KEY = 'trungplay_v2_data';

const defaults = {
  apiKey: '',
  proxyUrl: '',
  playlist: [
    { id: 'L_LUpnjgPso', title: 'Tuyển Tập Nhạc Sàn Xe Hơi CarPlay Hot 2026', channel: 'CarPlay Music', thumb: 'https://i.ytimg.com/vi/L_LUpnjgPso/mqdefault.jpg' },
    { id: 'dQw4w9WgXcQ', title: 'Nhạc Trẻ Remix Sôi Động Hay Nhất', channel: 'Music Official', thumb: 'https://i.ytimg.com/vi/dQw4w9WgXcQ/mqdefault.jpg' },
    { id: 'a9l_3ZzC2yY', title: 'Liên Khúc Bolero Trữ Tình Hay Nhất', channel: 'Bolero Tuyển Chọn', thumb: 'https://i.ytimg.com/vi/a9l_3ZzC2yY/mqdefault.jpg' },
    { id: '9vMh9f41PQE', title: 'Lofi Chill Buổi Tối Lái Xe Cực Thư Giãn', channel: 'Lofi Vietnam', thumb: 'https://i.ytimg.com/vi/9vMh9f41PQE/mqdefault.jpg' },
    { id: 'kJQP7kiw5Fk', title: 'Top Nhạc Trẻ EDM Sôi Động Bốc Lửa 2026', channel: 'Remix Official', thumb: 'https://i.ytimg.com/vi/kJQP7kiw5Fk/mqdefault.jpg' },
    { id: 'JGwWNGJdvx8', title: 'Acoustic Guitar Nhẹ Nhàng Thư Giãn Trên Xe', channel: 'Acoustic Chill', thumb: 'https://i.ytimg.com/vi/JGwWNGJdvx8/mqdefault.jpg' }
  ],
  favorites: [],
  history: [],
  tv: [],
  tvUrl: DEFAULT_M3U_URL,
  autoNext: true
};

let state = loadState();
let current = null;
let currentIndex = -1;
let hlsPlayer = null;
let realtimeUnsubscribe = null;

// HÀM CHUYỂN ĐỔI NGÀY HẾT HẠN CHUẨN XÁC KHÔNG BAO GIỜ LỖI F5
function parseExpireDate(raw) {
  if (!raw) return new Date(0);
  if (raw instanceof Date) return isNaN(raw.getTime()) ? new Date(0) : raw;

  if (typeof raw === 'object') {
    if (typeof raw.toDate === 'function') return raw.toDate();
    if (typeof raw.seconds === 'number') return new Date(raw.seconds * 1000);
    if (typeof raw._seconds === 'number') return new Date(raw._seconds * 1000);
  }

  if (typeof raw === 'number') {
    return new Date(raw < 1e11 ? raw * 1000 : raw);
  }

  if (typeof raw === 'string') {
    let str = raw.trim();
    if (!str) return new Date(0);

    if (/^\d+$/.test(str)) {
      const num = parseFloat(str);
      return new Date(num < 1e11 ? num * 1000 : num);
    }

    const viMatch = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?$/);
    if (viMatch) {
      const [, day, month, year, hh = '00', mm = '00', ss = '00'] = viMatch;
      const isoStr = `${year}-${month.padStart(2,'0')}-${day.padStart(2,'0')}T${hh.padStart(2,'0')}:${mm.padStart(2,'0')}:${ss.padStart(2,'0')}`;
      const d = new Date(isoStr);
      if (!isNaN(d.getTime())) return d;
    }

    if (str.includes(' ') && !str.includes('T')) {
      str = str.replace(' ', 'T');
    }

    const d = new Date(str);
    if (!isNaN(d.getTime())) return d;
  }

  return new Date(0);
}

function getAccountExpireDate(user) {
  if (!user) return new Date(0);
  const raw = user.expire_date || user.expireDate || user.expire || user.expired_at || user.expireTime;
  return parseExpireDate(raw);
}

// HÀM BĂM MẬT KHẨU BẢO MẬT (SHA-256 + SECRET SALT) VÀ MD5 TƯƠNG THÍCH NGƯỢC
function hashPassword(str) {
  if (window.CryptoJS && CryptoJS.SHA256) {
    return CryptoJS.SHA256(str + '@trungplay_secure_salt_2026').toString();
  }
  return hashMD5(str);
}

function hashMD5(str) {
  return CryptoJS.MD5(str).toString();
}

// TẠO MÃ ĐỊNH DANH DUY NHẤT CHO THIẾT BỊ / TRÌNH DUYỆT NÀY
function getDeviceId() {
  let id = localStorage.getItem('aptv_device_id');
  if (id) return id;

  const rand = Math.random().toString(36).substring(2, 8).toUpperCase();
  const time = Date.now().toString(36).toUpperCase();
  id = 'DEV_' + time + '_' + rand;
  try {
    localStorage.setItem('aptv_device_id', id);
  } catch(e){}
  return id;
}

// KHỞI TẠO STATE
function loadState() {
  try {
    const loaded = { ...defaults, ...JSON.parse(localStorage.getItem(KEY) || '{}') };
    if (!Array.isArray(loaded.favorites)) loaded.favorites = [];
    return loaded;
  } catch (e) {
    return { ...defaults, favorites: [] };
  }
}
function saveState() {
  localStorage.setItem(KEY, JSON.stringify(state));
}

function toast(t) {
  const e = document.getElementById('toast');
  if (!e) return;
  e.textContent = t;
  e.classList.add('show');
  clearTimeout(window.__toast);
  window.__toast = setTimeout(() => e.classList.remove('show'), 2600);
}

function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, m => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[m]));
}

function vidFromUrl(s) {
  s = (s || '').trim();
  if (/^[\w-]{11}$/.test(s)) return s;
  try {
    const u = new URL(s);
    if (u.hostname.includes('youtu.be')) return u.pathname.slice(1).split('/')[0];
    return u.searchParams.get('v') || ((u.pathname.match(/\/shorts\/([^/]+)/) || [])[1]) || ((u.pathname.match(/\/embed\/([^/]+)/) || [])[1]) || '';
  } catch (e) { return ''; }
}

function ytThumb(id) {
  return `https://i.ytimg.com/vi/${id}/mqdefault.jpg`;
}

/* =========================================================================
   3. QUẢN LÝ TÀI KHOẢN & ĐĂNG NHẬP / ĐĂNG KÝ (FIREBASE FIRESTORE)
   ========================================================================= */

function normalizePhone(p) {
  let s = String(p || '').trim().replace(/[\s\.\-\(\)]/g, '');
  if (s.startsWith('+84')) s = '0' + s.slice(3);
  if (s.startsWith('84') && s.length === 11) s = '0' + s.slice(2);
  if (/^[1-9]\d{8,9}$/.test(s)) s = '0' + s;
  return s;
}

function isAccountActive(user) {
  if (!user) return false;
  const s = String(user.status || '').trim().toUpperCase();
  if (s === 'ACTIVE' || s === 'PAID' || s === 'SUCCESS' || s === 'COMPLETED' || s === 'KÍCH HOẠT' || s === 'KICH HOAT') return true;
  if (user.is_active === true || user.isActive === true) return true;
  return false;
}

function showAuthModal() {
  const modal = document.getElementById('authModal');
  if (modal) {
    modal.classList.add('open');
    modal.style.display = 'grid';
    document.body.style.overflow = 'hidden';
  }
  document.body.classList.add('auth-locked');
}

function hideAuthModal() {
  const authModal = document.getElementById('authModal');
  const qrModal = document.getElementById('qrModal');
  const accountModal = document.getElementById('accountModal');
  const voiceModal = document.getElementById('voiceModal');

  if (authModal) {
    authModal.classList.remove('open');
    authModal.style.display = 'none';
  }
  if (qrModal) {
    qrModal.classList.remove('open');
    qrModal.style.display = 'none';
  }
  if (accountModal) {
    accountModal.classList.remove('open');
    accountModal.style.display = 'none';
  }
  if (voiceModal) {
    voiceModal.classList.remove('open');
    voiceModal.style.display = 'none';
  }

  document.querySelectorAll('.modal-back').forEach(m => {
    m.classList.remove('open');
    m.style.display = 'none';
  });

  document.body.style.overflow = '';
  document.body.classList.remove('auth-locked');
}

function showAuthError(msg) {
  const err = document.getElementById('authError');
  if (err) {
    err.textContent = msg;
    err.style.display = 'block';
  }
}

function clearAuthError() {
  const err = document.getElementById('authError');
  if (err) {
    err.style.display = 'none';
    err.textContent = '';
  }
}

// BIẾN LẮNG NGHE PHIÊN ĐĂNG NHẬP REALTIME
let userSessionUnsubscribe = null;

// HÀM XỬ LÝ KHI BỊ ĐĂNG XUẤT DO THIẾT BỊ KHÁC ĐĂNG NHẬP HOẶC HẾT HẠN
function handleKickedOut(msg) {
  if (userSessionUnsubscribe) {
    try { userSessionUnsubscribe(); } catch (e) {}
    userSessionUnsubscribe = null;
  }

  // Dừng phát nhạc / video ngay lập tức
  destroyPlayers(false);
  exitCinemaMode();
  stopVoiceSearch();

  current = null;
  currentIndex = -1;

  // Xóa session lưu trữ trên thiết bị này
  localStorage.removeItem('aptv_user');

  // Ẩn badge thông tin tài khoản
  const badge = document.getElementById('userBadge');
  if (badge) badge.style.display = 'none';

  // Đóng các modal khác nếu đang mở
  document.querySelectorAll('.modal-back').forEach(m => {
    if (m.id !== 'authModal') m.classList.remove('open');
  });

  // Hiển thị modal đăng nhập với thông báo rõ ràng
  showAuthModal();
  switchTab('login');
  const errorMsg = msg || '⚠️ Tài khoản của bạn vừa được đăng nhập trên một thiết bị khác. Bạn đã bị đăng xuất!';
  showAuthError(errorMsg);
  toast('⚠️ Tài khoản đã được đăng nhập ở thiết bị khác!');
}

// LẮNG NGHE THỜI GIAN THỰC (REALTIME FIRESTORE LISTENER) ĐỂ PHÁT HIỆN THIẾT BỊ KHÁC ĐĂNG NHẬP
function listenUserSession(phone) {
  phone = normalizePhone(phone);
  if (!phone) return;
  if (!db) {
    initFirebase();
    if (!db) return;
  }

  if (userSessionUnsubscribe) {
    try { userSessionUnsubscribe(); } catch (e) {}
    userSessionUnsubscribe = null;
  }

  userSessionUnsubscribe = db.collection('users').doc(phone).onSnapshot((docSnap) => {
    if (!docSnap.exists) {
      handleKickedOut('⚠️ Tài khoản không tồn tại hoặc đã bị xóa!');
      return;
    }

    const liveData = docSnap.data();
    const currentDevId = getDeviceId();

    // NẾU CÓ THIẾT BỊ KHÁC ĐĂNG NHẬP -> LOGOUT NGAY LẬP TỨC
    if (liveData.device_id && liveData.device_id !== "" && liveData.device_id !== currentDevId) {
      handleKickedOut('⚠️ Tài khoản của bạn vừa được đăng nhập trên một thiết bị khác. Bạn đã bị đăng xuất!');
      return;
    }

    const liveExpire = getAccountExpireDate(liveData);
    const now = new Date();

    if (isAccountActive(liveData) && (liveExpire > now || liveExpire.getTime() === 0)) {
      liveData.username = liveData.username || phone;
      liveData.expire_date = liveExpire.getTime() > 0 ? liveExpire.toISOString() : new Date(now.getTime() + 365 * 86400000).toISOString();
      localStorage.setItem('aptv_user', JSON.stringify(liveData));
      updateUserUI(liveData);
    } else if (!isAccountActive(liveData) || liveExpire <= now) {
      handleKickedOut(!isAccountActive(liveData) ? 'Tài khoản đang chờ thanh toán (PENDING).' : 'Tài khoản đã hết hạn sử dụng.');
    }
  }, (err) => {
    console.warn("Realtime user session listener warning:", err);
  });
}

// ĐỒNG BỘ SESSION CHÍNH XÁC KHI MỞ TRANG HOẶC F5
function checkPersistentSession() {
  const sessionStr = localStorage.getItem('aptv_user');
  if (!sessionStr) {
    showAuthModal();
    return false;
  }

  try {
    let user = JSON.parse(sessionStr);
    const now = new Date();
    let expireDate = getAccountExpireDate(user);
    const currentDevId = getDeviceId();

    // Kiểm tra nhanh trong cache cục bộ
    if (user.device_id && user.device_id !== "" && user.device_id !== currentDevId) {
      handleKickedOut('⚠️ Tài khoản này đã được đăng nhập trên thiết bị khác!');
      return false;
    }

    // Nếu status là ACTIVE nhưng expireDate không đọc được, fallback
    if (isAccountActive(user) && expireDate.getTime() === 0) {
      expireDate = new Date(now.getTime() + (user.plan_days || 365) * 86400000);
    }

    if (isAccountActive(user) && expireDate > now) {
      hideAuthModal();
      updateUserUI(user);
      // Bắt đầu lắng nghe thay đổi phiên đăng nhập theo thời gian thực
      listenUserSession(normalizePhone(user.username || user.phone));

      const savedMode = localStorage.getItem('aptv_car_mode');
      if (!savedMode) {
        setTimeout(() => openCarModeModal(), 400);
      } else {
        applyCarMode(savedMode);
      }
      return true;
    } else {
      showAuthModal();
      showAuthError(!isAccountActive(user) ? 'Tài khoản đang chờ thanh toán (PENDING).' : 'Tài khoản đã hết hạn sử dụng. Vui lòng gia hạn.');
      return false;
    }
  } catch (e) {
    showAuthModal();
    return false;
  }
}

function updateUserUI(user) {
  if (!user) return;
  const username = user.username || user.phone || 'Tài khoản';
  const expireDate = getAccountExpireDate(user);
  const isLifetime = (user.plan_days >= 3650) || (user.plan_name && user.plan_name.toLowerCase().includes('vĩnh viễn')) || (expireDate.getFullYear() > 2090);
  const expireStr = isLifetime ? '🟢 Vĩnh viễn (Trọn đời)' : (expireDate.getTime() > 0 ? (expireDate.toLocaleDateString('vi-VN') + ' ' + expireDate.toLocaleTimeString('vi-VN')) : 'Không xác định');
  const statusStr = user.status === 'ACTIVE' ? '🟢 Đã kích hoạt' : '🟡 Chờ kích hoạt';
  const devId = user.device_id || getDeviceId();

  // Topbar Badge
  const badge = document.getElementById('userBadge');
  const badgePhone = document.getElementById('badgePhone');
  if (badge) badge.style.display = 'inline-flex';
  if (badgePhone) badgePhone.textContent = `👤 ${username}`;

  // Account Modal Fields
  const accModalPhone = document.getElementById('accModalPhone');
  const accModalStatus = document.getElementById('accModalStatus');
  const accModalExpire = document.getElementById('accModalExpire');
  const accModalDevId = document.getElementById('accModalDevId');
  if (accModalPhone) accModalPhone.value = username;
  if (accModalStatus) accModalStatus.value = statusStr;
  if (accModalExpire) accModalExpire.value = expireStr;
  if (accModalDevId) accModalDevId.value = devId;
}

function openAccountModal() {
  const accountModal = document.getElementById('accountModal');
  if (!accountModal) return;
  const sessionStr = localStorage.getItem('aptv_user');
  if (sessionStr) {
    try {
      const u = JSON.parse(sessionStr);
      updateUserUI(u);
    } catch(e){}
  }
  accountModal.style.display = 'grid';
  accountModal.classList.add('open');
}
window.openAccountModal = openAccountModal;

function closeAccountModal() {
  const accountModal = document.getElementById('accountModal');
  if (accountModal) {
    accountModal.classList.remove('open');
    accountModal.style.display = 'none';
  }
}
window.closeAccountModal = closeAccountModal;

async function handleLogin() {
  clearAuthError();
  let phone = normalizePhone(document.getElementById('loginPhone') ? document.getElementById('loginPhone').value : '');
  const pass = (document.getElementById('loginPass') ? document.getElementById('loginPass').value : '').trim();
  const currentDevId = getDeviceId();

  if (!phone || !pass) {
    return showAuthError('Vui lòng nhập đầy đủ Số điện thoại và Mật khẩu.');
  }

  if (!db) {
    initFirebase();
    if (!db) return showAuthError('Không thể kết nối Firebase SDK. Vui lòng kiểm tra mạng.');
  }

  try {
    toast('Đang xác thực tài khoản...');
    const docRef = db.collection('users').doc(phone);
    const docSnap = await docRef.get();

    if (!docSnap.exists) {
      return showAuthError('Tài khoản chưa tồn tại. Vui lòng chọn Tab Đăng ký.');
    }

    const userData = docSnap.data();
    const storedPass = (userData.password_hash || userData.passwordHash || userData.password || '').toString().trim().toLowerCase();
    const inputShaWithSalt = hashPassword(pass).toLowerCase().trim();
    const inputShaPlain = (window.CryptoJS && CryptoJS.SHA256) ? CryptoJS.SHA256(pass).toString().toLowerCase().trim() : '';
    const inputMd5 = hashMD5(pass).toLowerCase().trim();
    const inputPlain = pass.trim().toLowerCase();

    const isMatch = (storedPass === inputShaWithSalt) || (storedPass === inputShaPlain) || (storedPass === inputMd5) || (storedPass === inputPlain);
    if (!isMatch) {
      return showAuthError('Mật khẩu không chính xác. Vui lòng thử lại.');
    }

    const now = new Date();
    let expireDate = getAccountExpireDate(userData);

    if (!isAccountActive(userData)) {
      showAuthError('Tài khoản đang chờ kích hoạt. Vui lòng quét mã VietQR để thanh toán.');
      switchTab('reg');
      if (document.getElementById('regPhone')) document.getElementById('regPhone').value = phone;
      await docRef.update({ device_id: currentDevId });
      const pendingPrice = userData.price || 100000;
      if (document.getElementById('regPlan')) {
        if (pendingPrice === 20000) document.getElementById('regPlan').value = 'trial_7d';
        else if (pendingPrice === 300000) document.getElementById('regPlan').value = 'lifetime';
        else document.getElementById('regPlan').value = '1y';
      }
      triggerQrGenerationForPhone(phone, pendingPrice);
      return;
    }

    if (expireDate.getTime() === 0) {
      expireDate = new Date(now.getTime() + (userData.plan_days || 365) * 86400000);
    }

    if (expireDate <= now) {
      showAuthError(`Tài khoản đã hết hạn vào ngày ${expireDate.toLocaleDateString('vi-VN')}. Vui lòng chọn gói cước để gia hạn.`);
      switchTab('reg');
      if (document.getElementById('regPhone')) document.getElementById('regPhone').value = phone;
      if (document.getElementById('regPass')) document.getElementById('regPass').value = pass;
      return;
    }

    // CHIẾM PHIÊN ĐĂNG NHẬP: Cập nhật device_id và nâng cấp bảo mật SHA-256 lên Firestore
    const updatePayload = { device_id: currentDevId };
    if (storedPass !== inputShaWithSalt) {
      updatePayload.password_hash = inputShaWithSalt;
    }
    await docRef.update(updatePayload);
    userData.device_id = currentDevId;

    // ĐĂNG NHẬP THÀNH CÔNG -> LƯU SESSION CHUẨN ISO STRING
    userData.status = 'ACTIVE';
    userData.expire_date = expireDate.toISOString();
    localStorage.setItem('aptv_user', JSON.stringify(userData));
    hideAuthModal();
    updateUserUI(userData);
    listenUserSession(phone);
    toast(`🎉 Đăng nhập thành công! Tài khoản: ${phone}`);

    const savedMode = localStorage.getItem('aptv_car_mode') || 'rotary';
    applyCarMode(savedMode);
    setTimeout(() => openCarModeModal(), 400);

  } catch (err) {
    showAuthError('Lỗi Firestore: ' + err.message);
  }
}

async function handleRegister() {
  clearAuthError();
  let phone = normalizePhone(document.getElementById('regPhone') ? document.getElementById('regPhone').value : '');
  const pass = (document.getElementById('regPass') ? document.getElementById('regPass').value : '').trim();
  const planSelect = document.getElementById('regPlan');

  // 1. Kiểm tra thông tin cơ bản
  if (!phone) {
    return showAuthError('Vui lòng nhập Số điện thoại của bạn.');
  }
  if (!/^0\d{8,10}$/.test(phone)) {
    return showAuthError('Số điện thoại không hợp lệ (Ví dụ: 0965512394).');
  }
  if (!pass) {
    return showAuthError('Vui lòng nhập Mật khẩu đăng nhập.');
  }
  if (pass.length < 3) {
    return showAuthError('Mật khẩu phải có từ 3 ký tự trở lên.');
  }

  // 2. Xác định gói cước chuẩn: Dùng thử 7 ngày (20k), 1 Năm (100k), Vĩnh viễn (300k)
  let planVal = planSelect ? planSelect.value : '1y';
  let price = 100000;
  let planDays = 365;
  let planName = 'Gói 1 Năm';

  if (planVal === 'trial_7d' || planVal === '7') {
    price = 20000;
    planDays = 7;
    planName = 'Gói Dùng Thử 7 Ngày';
  } else if (planVal === 'lifetime' || planVal === '36500' || planVal === '3650' || planVal === '200k_vinhvien' || planVal === '300k_vinhvien') {
    price = 300000;
    planDays = 36500;
    planName = 'Gói Vĩnh Viễn';
  } else {
    price = 100000;
    planDays = 365;
    planName = 'Gói 1 Năm';
  }

  if (planSelect && planSelect.selectedIndex >= 0) {
    const opt = planSelect.options[planSelect.selectedIndex];
    if (opt.dataset && opt.dataset.price) price = parseInt(opt.dataset.price, 10);
    if (opt.dataset && opt.dataset.days) planDays = parseInt(opt.dataset.days, 10);
  }

  // 3. GHI NHỚ THÔNG TIN ĐƠN ĐĂNG KÝ VÀ BẮT ĐẦU LẮNG NGHE REALTIME
  window.__pendingPhone = phone;
  window.__pendingPass = pass;
  window.__pendingPlanDays = planDays;
  window.__pendingPlanName = planName;
  window.__pendingPrice = price;
  try { localStorage.setItem('aptv_pending_phone', phone); } catch(e){}

  listenRealtimeStatus(phone);

  // 4. HIỂN THỊ POPUP VIETQR NGAY LẬP TỨC
  const transferContent = `TP ${phone}`;
  const qrUrl = `https://img.vietqr.io/image/TPB-15940510182-compact2.png?amount=${price}&addInfo=${encodeURIComponent(transferContent)}&accountName=${encodeURIComponent("DOAN QUANG TRUNG")}`;

  displayQrCode(qrUrl, price, transferContent);
  toast(`⚡ Đã tạo mã VietQR ${price.toLocaleString('vi-VN')} VNĐ cho số ${phone}!`);

  // 5. ĐỒNG BỘ FIRESTORE (CHÚ Ý: KHÔNG ĐƯỢC GHI ĐÈ PENDING NẾU TÀI KHOẢN ĐÃ ACTIVE!)
  if (!db) initFirebase();
  if (db) {
    const currentDevId = getDeviceId();
    const hashed = hashPassword(pass);
    const now = new Date();
    const expireDate = new Date(now.getTime() + planDays * 86400000).toISOString();

    try {
      const docRef = db.collection('users').doc(phone);
      const docSnap = await docRef.get();
      const exists = docSnap && docSnap.exists;
      const existingData = (exists && typeof docSnap.data === 'function') ? docSnap.data() : null;

      if (!exists || !existingData) {
        // Tạo tài khoản mới
        await docRef.set({
          username: phone,
          phone: phone,
          password_hash: hashed,
          device_id: currentDevId,
          expire_date: expireDate,
          price: price,
          plan_days: planDays,
          plan_name: planName,
          status: 'PENDING',
          created_at: now.toISOString()
        });
      } else {
        // Nếu đã được webhook kích hoạt ACTIVE rồi -> vào ứng dụng ngay!
        if (isAccountActive(existingData)) {
          let d = parseExpireDate(existingData.expire_date);
          if (d.getTime() === 0) d = new Date(Date.now() + (existingData.plan_days || 365) * 86400000);
          existingData.status = 'ACTIVE';
          existingData.expire_date = d.toISOString();
          existingData.device_id = currentDevId;
          await docRef.update({ device_id: currentDevId });
          localStorage.setItem('aptv_user', JSON.stringify(existingData));
          hideAuthModal();
          updateUserUI(existingData);
          listenUserSession(phone);
          toast('🎉 Tài khoản của bạn đã được kích hoạt thành công!');
          return;
        }

        // Nếu đang PENDING -> cập nhật mật khẩu, thiết bị, gói mới
        const updatePayload = {
          password_hash: hashed,
          device_id: currentDevId,
          expire_date: expireDate,
          price: price,
          plan_days: planDays,
          plan_name: planName,
          status: 'PENDING',
          updated_at: now.toISOString()
        };
        await docRef.set(updatePayload, { merge: true });
      }
    } catch (err) {
      console.warn("Lưu Firestore đơn hàng:", err);
    }
  }
}

function triggerQrGenerationForPhone(phone, price) {
  phone = normalizePhone(phone);
  const transferContent = `TP ${phone}`;
  const qrUrl = `https://img.vietqr.io/image/TPB-15940510182-compact2.png?amount=${price}&addInfo=${encodeURIComponent(transferContent)}&accountName=${encodeURIComponent("DOAN QUANG TRUNG")}`;
  displayQrCode(qrUrl, price, transferContent);
  listenRealtimeStatus(phone);
}

// HIỂN THỊ POPUP VIETQR CHÍNH GIỮA MÀN HÌNH (#qrModal)
function displayQrCode(qrUrl, price, contentText) {
  const qrModal = document.getElementById('qrModal');
  const qrImg = document.getElementById('qrImage');
  const qrAmountText = document.getElementById('qrAmountText');
  const qrContentText = document.getElementById('qrContentText');

  if (qrImg) {
    qrImg.src = qrUrl;
    qrImg.alt = `Mã VietQR ${price.toLocaleString('vi-VN')} VNĐ`;
  }
  if (qrAmountText) qrAmountText.textContent = price.toLocaleString('vi-VN') + ' VNĐ';
  if (qrContentText) qrContentText.textContent = contentText;

  if (qrModal) {
    qrModal.classList.add('open');
    qrModal.style.display = 'grid';
  }
}

// LẮNG NGHE THỜI GIAN THỰC TÀI KHOẢN KHI CHỜ CHUYỂN KHOẢN (WEBHOOK CASSO / SEPAY / TPBANK)
function listenRealtimeStatus(phone) {
  phone = normalizePhone(phone);
  if (!phone) return;

  if (realtimeUnsubscribe) {
    try { realtimeUnsubscribe(); } catch(e){}
    realtimeUnsubscribe = null;
  }
  if (!db) initFirebase();
  if (!db) return;

  console.log("Realtime listener bắt đầu theo dõi SĐT:", phone);

  realtimeUnsubscribe = db.collection('users').doc(phone).onSnapshot((docSnap) => {
    if (!docSnap || !docSnap.exists) return;
    const data = docSnap.data();
    if (!data) return;

    if (isAccountActive(data)) {
      console.log("Realtime nhận diện tài khoản đã kích hoạt ACTIVE:", data);
      if (realtimeUnsubscribe) {
        try { realtimeUnsubscribe(); } catch(e){}
        realtimeUnsubscribe = null;
      }
      let d = parseExpireDate(data.expire_date);
      if (d.getTime() === 0) {
        d = new Date(Date.now() + (data.plan_days || 365) * 86400000);
      }
      const currentDevId = getDeviceId();
      data.status = 'ACTIVE';
      data.expire_date = d.toISOString();
      data.device_id = currentDevId;

      try {
        db.collection('users').doc(phone).update({
          device_id: currentDevId,
          status: 'ACTIVE'
        });
      } catch(e){}

      localStorage.setItem('aptv_user', JSON.stringify(data));
      hideAuthModal();
      updateUserUI(data);
      listenUserSession(phone);
      toast('🎉 THANH TOÁN THÀNH CÔNG! Đang chuyển vào trang chính...');
      const savedMode = localStorage.getItem('aptv_car_mode') || 'rotary';
      applyCarMode(savedMode);
      setTimeout(() => openCarModeModal(), 400);
    }
  }, (err) => {
    console.error('Lỗi Realtime Listener:', err);
  });
}

// KIỂM TRA THỦ CÔNG KHI BẤM "TÔI ĐÃ CHUYỂN KHOẢN - VÀO ỨNG DỤNG NGAY"
async function checkPaymentNow(phone) {
  if (!phone) {
    phone = (document.getElementById('regPhone') ? document.getElementById('regPhone').value : '').trim() ||
            (document.getElementById('loginPhone') ? document.getElementById('loginPhone').value : '').trim();
  }
  phone = normalizePhone(phone);
  if (!phone) return toast('Vui lòng nhập số điện thoại');

  toast('🔍 Đang kiểm tra giao dịch chuyển khoản...');
  if (!db) initFirebase();
  if (!db) return toast('Lỗi kết nối Firebase');

  try {
    const docRef = db.collection('users').doc(phone);
    const docSnap = await docRef.get();
    if (!docSnap.exists) {
      return toast('⚠️ Chưa tìm thấy thông tin tài khoản trên hệ thống.');
    }
    const data = docSnap.data();
    if (isAccountActive(data)) {
      let d = parseExpireDate(data.expire_date);
      if (d.getTime() === 0) {
        d = new Date(Date.now() + (data.plan_days || 365) * 86400000);
      }
      const currentDevId = getDeviceId();
      data.status = 'ACTIVE';
      data.expire_date = d.toISOString();
      data.device_id = currentDevId;

      try {
        await docRef.update({
          device_id: currentDevId,
          status: 'ACTIVE'
        });
      } catch(e){}

      localStorage.setItem('aptv_user', JSON.stringify(data));
      hideAuthModal();
      updateUserUI(data);
      listenUserSession(phone);
      toast('🎉 KÍCH HOẠT THÀNH CÔNG! Chào mừng bạn vào ứng dụng!');
      const savedMode = localStorage.getItem('aptv_car_mode') || 'rotary';
      applyCarMode(savedMode);
      setTimeout(() => openCarModeModal(), 400);
    } else {
      toast('⏳ Ngân hàng đang xử lý giao dịch. Vui lòng đợi 5-10 giây rồi bấm lại...');
    }
  } catch (err) {
    toast('Lỗi kiểm tra: ' + err.message);
  }
}

function switchTab(tab) {
  clearAuthError();
  const loginBtn = document.getElementById('tabLoginBtn');
  const regBtn = document.getElementById('tabRegBtn');
  const formLogin = document.getElementById('formLogin');
  const formReg = document.getElementById('formReg');

  if (tab === 'login') {
    if (loginBtn) loginBtn.classList.add('active');
    if (regBtn) regBtn.classList.remove('active');
    if (formLogin) formLogin.style.display = 'grid';
    if (formReg) formReg.style.display = 'none';
  } else {
    if (regBtn) regBtn.classList.add('active');
    if (loginBtn) loginBtn.classList.remove('active');
    if (formReg) formReg.style.display = 'grid';
    if (formLogin) formLogin.style.display = 'none';
  }
}

/* =========================================================================
   4. TRÌNH PHÁT MEDIA CHÍNH (YOUTUBE EMBED & TV M3U8 STREAM)
   ========================================================================= */

let ytPlayer = null;

// =========================================================================
// CẤU HÌNH ĐỊNH TUYẾN ÂM THANH RA HỆ THỐNG LOA XE HƠI (CARPLAY / BLUETOOTH / USB)
// =========================================================================

// TẠO FILE ÂM THANH IM LẶNG 2 GIÂY CHUẨN PCM ĐỂ DUY TRÌ KÊNH ÂM THANH XE HƠI (CARPLAY STEREO)
function createSilentAudioBlobUrl() {
  try {
    const sampleRate = 8000;
    const numSamples = sampleRate * 2; // 2 giây im lặng
    const buffer = new Uint8Array(44 + numSamples);
    const view = new DataView(buffer.buffer);

    // RIFF identifier
    view.setUint32(0, 0x52494646, false); // "RIFF"
    view.setUint32(4, 36 + numSamples, true);
    view.setUint32(8, 0x57415645, false); // "WAVE"

    // "fmt " chunk
    view.setUint32(12, 0x666d7420, false); // "fmt "
    view.setUint32(16, 16, true);          // 16 bytes for PCM format
    view.setUint16(20, 1, true);           // AudioFormat 1 (PCM)
    view.setUint16(22, 1, true);           // Mono (1 channel)
    view.setUint32(24, sampleRate, true);  // Sample rate
    view.setUint32(28, sampleRate, true);  // Byte rate (SampleRate * 1 * 1)
    view.setUint16(32, 1, true);           // Block align
    view.setUint16(34, 8, true);           // Bits per sample (8-bit)

    // "data" chunk
    view.setUint32(36, 0x64617461, false); // "data"
    view.setUint32(40, numSamples, true);

    // Dữ liệu PCM 8-bit im lặng là 128 (0x80)
    buffer.fill(128, 44);

    const blob = new Blob([buffer], { type: 'audio/wav' });
    return URL.createObjectURL(blob);
  } catch (e) {
    return 'data:audio/wav;base64,UklGRqQ+AABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YYA+AACA';
  }
}

let carPlayAudioAnchor = null;
let silentAudioUrl = null;

function initCarPlayAudioAnchor() {
  if (!silentAudioUrl) {
    silentAudioUrl = createSilentAudioBlobUrl();
  }
  if (!carPlayAudioAnchor) {
    carPlayAudioAnchor = document.getElementById('carPlayAudioAnchor');
  }
  if (!carPlayAudioAnchor) {
    carPlayAudioAnchor = document.createElement('audio');
    carPlayAudioAnchor.id = 'carPlayAudioAnchor';
    document.body.appendChild(carPlayAudioAnchor);
  }

  carPlayAudioAnchor.setAttribute('playsinline', '');
  carPlayAudioAnchor.setAttribute('webkit-playsinline', '');
  carPlayAudioAnchor.setAttribute('x-webkit-airplay', 'allow');
  carPlayAudioAnchor.setAttribute('preload', 'auto');
  carPlayAudioAnchor.style.cssText = 'position:fixed;bottom:0;left:0;width:1px;height:1px;opacity:0.001;pointer-events:none;z-index:-9999;';

  if (!carPlayAudioAnchor.src || carPlayAudioAnchor.src.length < 20) {
    carPlayAudioAnchor.src = silentAudioUrl;
  }
  carPlayAudioAnchor.loop = true;

  if (window.WebKitPlaybackTargetAvailabilityEvent) {
    carPlayAudioAnchor.addEventListener('webkitplaybacktargetavailabilitychanged', (e) => {
      window._carPlayTargetAvailable = (e.availability === 'available');
    });
  }
}

// ĐẢM BẢO KHÔNG CÒN WEBAUDIO DUMMY NÀO CHẠY NGẦM GÂY XUNG ĐỘT LOA THOẠI
try {
  if (window._carAudioCtx) {
    window._carAudioCtx.close().catch(()=>{});
    window._carAudioCtx = null;
  }
  if (window._carAudioSource) {
    window._carAudioSource = null;
  }
} catch(e){}

// HÀM ÉP HỆ THỐNG IOS/SAFARI CHUYỂN TOÀN BỘ ÂM THANH RA LOA XE HƠI (CARPLAY / BLUETOOTH / CỔNG USB)
function forceCarAudioOutput() {
  // Ép Safari iOS sử dụng chế độ phát âm thanh độc quyền (AVAudioSessionCategoryPlayback)
  // Đây là chuẩn W3C WebKit chính thức để iOS tự động chuyển âm thanh ra hệ thống loa xe hơi qua CarPlay
  if ('audioSession' in navigator) {
    try {
      navigator.audioSession.type = 'playback';
    } catch (e) {}
  }
}


function destroyPlayers(keepAnchor = false) {
  if (ytPlayer) {
    try { ytPlayer.destroy(); } catch(e){}
    ytPlayer = null;
  }
  if (hlsPlayer) {
    try { hlsPlayer.destroy(); } catch(e){}
    hlsPlayer = null;
  }
  const wrap = document.getElementById('playerWrap');
  if (wrap) wrap.innerHTML = '';

  const playerContainer = document.getElementById('playerContainer');
  if (playerContainer) playerContainer.classList.remove('active');

  if (carPlayAudioAnchor) {
    try { carPlayAudioAnchor.pause(); } catch(e){}
  }
  if ('mediaSession' in navigator) {
    try { navigator.mediaSession.playbackState = 'none'; } catch(e){}
  }
  updatePlayPauseButton(false);
}

// CẬP NHẬT GIAO DIỆN MEDIA SESSION (HIỂN THỊ TRÊN MÀN HÌNH KHÓA & BẢNG ĐỒNG HỒ XE HƠI)
function updateMediaSession(item) {
  if (!('mediaSession' in navigator)) return;
  try {
    const title = item?.title || 'YouTube Video';
    const artist = item?.channel || 'Trung Play CarPlay';
    const thumb = item?.thumb || (item?.id ? ytThumb(item.id) : '');

    navigator.mediaSession.metadata = new MediaMetadata({
      title: title,
      artist: artist,
      album: 'Trung Play CarPlay',
      artwork: thumb ? [{ src: thumb, sizes: '512x512', type: 'image/jpeg' }] : []
    });

    // BẮT SỰ KIỆN PHÍM BẤM TRÊN VÔ LĂNG XE HƠI (STEERING WHEEL BUTTONS)
    navigator.mediaSession.setActionHandler('play', () => {
      togglePlayPause();
    });
    navigator.mediaSession.setActionHandler('pause', () => {
      togglePlayPause();
    });
    navigator.mediaSession.setActionHandler('previoustrack', () => {
      playPrev();
    });
    navigator.mediaSession.setActionHandler('nexttrack', () => {
      playNext();
    });
  } catch (e) {
    console.warn('MediaSession warning:', e);
  }
}

// ĐỒNG BỘ TRẠNG THÁI NÚT PHÁT / TẠM DỪNG
function updatePlayPauseButton(isPlaying) {
  const cinemaBtn = document.getElementById('cinemaPlayPauseBtn');
  if (cinemaBtn) {
    cinemaBtn.textContent = isPlaying ? '⏸ Tạm dừng' : '▶ Phát tiếp';
    cinemaBtn.title = isPlaying ? 'Tạm dừng bài hát' : 'Phát tiếp';
  }
}

function togglePlayPause() {
  if (ytPlayer && typeof ytPlayer.getPlayerState === 'function') {
    const s = ytPlayer.getPlayerState();
    if (s === 1) { // 1 = PLAYING
      try { ytPlayer.pauseVideo(); } catch(e){}
      updatePlayPauseButton(false);
      if (carPlayAudioAnchor) try { carPlayAudioAnchor.pause(); } catch(e){}
      if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'paused';
    } else {
      forceCarAudioOutput();
      try { ytPlayer.playVideo(); } catch(e){}
      updatePlayPauseButton(true);
      if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'playing';
    }
    return;
  }

  const tvVid = document.getElementById('tvVideo');
  if (tvVid) {
    if (tvVid.paused) {
      forceCarAudioOutput();
      tvVid.play().catch(() => {});
      updatePlayPauseButton(true);
      if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'playing';
    } else {
      tvVid.pause();
      updatePlayPauseButton(false);
      if (carPlayAudioAnchor) try { carPlayAudioAnchor.pause(); } catch(e){}
      if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'paused';
    }
    return;
  }

  const iframe = document.getElementById('ytPlayerFrame') || document.getElementById('ytIframe');
  if (iframe && iframe.contentWindow) {
    iframe.contentWindow.postMessage('{"event":"command","func":"pauseVideo","args":""}', '*');
  }
}

function fallbackIframePlay(videoId, wrap) {
  forceCarAudioOutput();
  const embedUrl = `https://www.youtube.com/embed/${encodeURIComponent(videoId)}?autoplay=1&playsinline=1&rel=0&modestbranding=1&fs=0&enablejsapi=1&origin=${encodeURIComponent(window.location.origin)}`;
  wrap.innerHTML = `
    <iframe id="ytPlayerFrame" 
      src="${embedUrl}" 
      allow="accelerometer; autoplay *; encrypted-media *; gyroscope; picture-in-picture; web-share; speaker-selection *; airplay *;" 
      x-webkit-airplay="allow"
      webkit-playsinline="1"
      playsinline="1"
      style="width:100%;height:100%;border:0;background:#000">
    </iframe>`;
}

function play(item, add = true) {
  let videoId = '';
  if (typeof item === 'string') {
    videoId = vidFromUrl(item) || item;
    item = findItem(videoId) || { id: videoId, title: 'YouTube Video', thumb: ytThumb(videoId) };
  } else if (item && item.id) {
    videoId = item.id;
  }

  if (!videoId) return toast('Không tìm thấy Video ID');

  // ĐẢM BẢO MICRO ĐÃ NGẮT HOÀN TOÀN VÀ KÊNH ÂM THANH Ở TRẠNG THÁI PLAYBACK CHO CARPLAY
  killRecognition();
  destroyPlayers(false);
  forceCarAudioOutput();

  current = item;
  currentIndex = state.playlist.findIndex(x => x.id === videoId);

  if (add) addHistory(item);

  // KÍCH HOẠT VÀ HIỂN THỊ CONTAINER TRƯỚC KHI TẠO IFRAME ĐỂ ĐẢM BẢO KHUNG HÌNH CÓ KÍCH THƯỚC TRÊN XE
  if (isTouchMode()) {
    const playerContainer = document.getElementById('playerContainer');
    if (playerContainer) {
      playerContainer.classList.add('active');
      playerContainer.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  } else {
    enterCinemaMode(); // TỰ ĐỘNG VÀO FULL SCREEN TOÀN MÀN HÌNH CHO XE DÙNG CON LĂN TRƯỚC KHI TẠO IFRAME
  }

  const wrap = document.getElementById('playerWrap');
  const validOrigin = (window.location.origin && window.location.origin !== 'null' && window.location.protocol.startsWith('http'))
    ? `&origin=${encodeURIComponent(window.location.origin)}`
    : '';
  const embedUrl = `https://www.youtube.com/embed/${encodeURIComponent(videoId)}?autoplay=1&playsinline=1&rel=0&modestbranding=1&fs=0&enablejsapi=1${validOrigin}`;

  // Tạo trực tiếp Iframe với đầy đủ đặc quyền phát âm thanh ra loa xe hơi (AirPlay / CarPlay)
  wrap.innerHTML = `
    <iframe id="ytPlayerFrame" 
      src="${embedUrl}" 
      referrerpolicy="strict-origin-when-cross-origin"
      allow="accelerometer; autoplay *; clipboard-write *; encrypted-media *; gyroscope; picture-in-picture; web-share; speaker-selection *; airplay *;" 
      x-webkit-airplay="allow"
      webkit-playsinline="1"
      playsinline="1"
      style="width:100%;height:100%;border:0;background:#000">
    </iframe>`;

  const onPlayerReady = (event) => {
    forceCarAudioOutput();
    try { event.target.playVideo(); } catch(e){}
    updatePlayPauseButton(true);
    if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'playing';
  };

  const onPlayerStateChange = (event) => {
    // 0 = YT.PlayerState.ENDED -> TỰ ĐỘNG CHUYỂN BÀI KẾ TIẾP KHI HẾT BÀI
    if (event.data === 0) {
      updatePlayPauseButton(false);
      if (state.autoNext) {
        toast('🔄 Hết bài, tự động phát bài kế tiếp...');
        setTimeout(() => playNext(), 600);
      }
    } else if (event.data === 1) { // 1 = PLAYING
      forceCarAudioOutput();
      updatePlayPauseButton(true);
      if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'playing';
    } else if (event.data === 2) { // 2 = PAUSED
      updatePlayPauseButton(false);
      if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'paused';
    }
  };

  const onPlayerError = (event) => {
    const errCode = event.data;
    console.warn('YouTube Player Error code:', errCode);
    if (errCode === 101 || errCode === 150 || errCode === 153 || errCode === 100 || errCode === 2 || errCode === 5) {
      toast('⚠️ Video này bị hạn chế phát (' + errCode + '), đang chuyển bài kế tiếp...');
      setTimeout(() => playNext(), 1200);
    }
  };

  if (window.YT && window.YT.Player) {
    try {
      ytPlayer = new YT.Player('ytPlayerFrame', {
        events: {
          onReady: onPlayerReady,
          onStateChange: onPlayerStateChange,
          onError: onPlayerError
        }
      });
    } catch(e) {
      console.warn('YT.Player attach warning:', e);
    }
  }

  toast('Đang phát: ' + (item.title || videoId));
  renderAll();
  updateMediaSession(item);

  const nowPlayingTitle = document.getElementById('nowPlayingTitle');
  if (nowPlayingTitle) nowPlayingTitle.textContent = item.title || videoId;
}

// BẮT SỰ KIỆN POSTMESSAGE TỪ YOUTUBE IFRAME
window.addEventListener('message', (e) => {
  try {
    const data = typeof e.data === 'string' ? JSON.parse(e.data) : e.data;
    if (!data) return;
    if (data.event === 'onStateChange') {
      if (data.info === 0 && state.autoNext) {
        toast('🔄 Hết bài, tự động phát bài kế tiếp...');
        setTimeout(() => playNext(), 600);
      } else if (data.info === 1) {
        updatePlayPauseButton(true);
        if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'playing';
      } else if (data.info === 2) {
        updatePlayPauseButton(false);
        if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'paused';
      }
    } else if (data.event === 'onError') {
      toast('⚠️ Video không phát được, tự chuyển bài kế tiếp...');
      setTimeout(() => playNext(), 1200);
    }
  } catch(err){}
});

function playNext() {
  if (!state.playlist.length) return toast('Danh sách bài hát đang trống');
  let i = currentIndex < 0 ? 0 : (currentIndex + 1) % state.playlist.length;
  play(state.playlist[i]);
}

function playPrev() {
  if (!state.playlist.length) return toast('Danh sách bài hát đang trống');
  let i = currentIndex <= 0 ? state.playlist.length - 1 : currentIndex - 1;
  play(state.playlist[i]);
}

function addHistory(item) {
  state.history = [item, ...state.history.filter(x => x.id !== item.id)].slice(0, 100);
  saveState();
}

function findItem(id) {
  return [current, ...state.playlist, ...state.favorites, ...state.history].filter(Boolean).find(x => x.id === id) || { id, title: 'YouTube video', thumb: ytThumb(id) };
}

function isFavorite(id) {
  return Array.isArray(state.favorites) && state.favorites.some(x => x.id === id);
}

function itemHtml(item, isFavList = false) {
  const isPlaying = current && current.id === item.id;
  const id = item?.id || '';
  const ytThumbUrl = id ? `https://i.ytimg.com/vi/${esc(id)}/mqdefault.jpg` : '';
  const fallbackThumbUrl = id ? `https://i.ytimg.com/vi/${esc(id)}/hqdefault.jpg` : '';
  let thumbUrl = ytThumbUrl;
  if (item.thumb && typeof item.thumb === 'string' && item.thumb.startsWith('http') && !item.thumb.includes('/vi/')) {
    thumbUrl = item.thumb;
  }
  if (!thumbUrl) thumbUrl = ytThumbUrl;

  const faved = isFavorite(id);
  const favBtnHtml = `
    <button type="button" class="btn-fav-item ${faved ? 'active' : ''}" data-fav-id="${esc(id)}"
      onclick="event.stopPropagation(); toggleFavorite('${esc(id)}');" 
      title="${faved ? 'Bỏ yêu thích' : 'Thêm vào yêu thích'}" tabindex="0">
      ${faved ? '❤️' : '🤍'}
    </button>`;

  return `
    <div class="item ${isPlaying ? 'active-play' : ''}" data-play-id="${esc(item.id)}" tabindex="0" title="Bấm để phát bài hát">
      <img class="thumb" referrerpolicy="no-referrer" src="${esc(thumbUrl)}" onerror="if(this.src!=='${fallbackThumbUrl}'){this.src='${fallbackThumbUrl}';}" decoding="async" alt="thumbnail">
      <div class="item-info">
        <div class="item-title" title="${esc(item.title || 'YouTube video')}">${esc(item.title || 'YouTube video')}</div>
        <div class="item-sub">${esc(item.channel || 'YouTube')}</div>
      </div>
      <div class="item-actions">
        ${favBtnHtml}
        <button class="btn-play-item" data-play="${esc(item.id)}" tabindex="0">▶ Phát</button>
      </div>
    </div>`;
}

function renderAll() {
  const listToRender = (state.playlist && state.playlist.length > 0) ? state.playlist : defaults.playlist;
  if (listToRender && listToRender.length > 0) {
    renderSearchResults(listToRender);
  }
  renderFavoritesList();
  updateFavoritesUI();
}

/* =========================================================================
   5. BỘ MÁY TÌM KIẾM YOUTUBE TỐI ƯU 100% SIÊU TỐC
   ========================================================================= */

async function fetchInvidiousInstances() {
  try {
    const cacheKey = 'aptv_discovered_instances';
    const cacheTimeKey = 'aptv_discovered_time';
    const cached = localStorage.getItem(cacheKey);
    const cachedTime = localStorage.getItem(cacheTimeKey);

    if (cached && cachedTime && (Date.now() - parseInt(cachedTime)) < 1800000) {
      return JSON.parse(cached);
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 3500);
    const res = await fetch('https://api.invidious.io/instances.json?sort_by=type,users', { signal: controller.signal });
    clearTimeout(timer);

    if (!res.ok) return [];
    const data = await res.json();
    const urls = [];

    if (Array.isArray(data)) {
      for (const item of data) {
        if (Array.isArray(item) && item[1] && item[1].type === 'https' && item[1].api === true && item[1].uri) {
          urls.push(item[1].uri);
        }
      }
    }

    if (urls.length > 0) {
      localStorage.setItem(cacheKey, JSON.stringify(urls));
      localStorage.setItem(cacheTimeKey, Date.now().toString());
    }
    return urls;
  } catch (e) {
    return [];
  }
}

async function searchSingleEndpoint(apiUrl, timeoutMs = 4500) {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    const res = await fetch(apiUrl, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (!res.ok) return [];

    const data = await res.json();
    if (!Array.isArray(data)) return [];

    const items = [];
    for (const item of data) {
      if (!item) continue;

      let id = item.videoId || item.id || '';
      if (!id && typeof item.url === 'string') {
        const match = item.url.match(/(?:v=|\/watch\?v=|\/embed\/|\/shorts\/)([\w-]{11})/);
        if (match) id = match[1];
      }

      if (id && /^[\w-]{11}$/.test(id)) {
        const title = item.title || 'YouTube Video';
        const channel = item.author || item.uploaderName || item.channel || 'YouTube';

        const thumb = ytThumb(id);
        items.push({ id, title, channel, thumb });
      }
    }

    return items;
  } catch (e) {
    return [];
  }
}

function firstSuccessfulResult(promises) {
  return new Promise((resolve) => {
    let pending = promises.length;
    if (!pending) return resolve([]);
    let resolved = false;

    promises.forEach(p => {
      Promise.resolve(p).then(res => {
        if (!resolved && Array.isArray(res) && res.length > 0) {
          resolved = true;
          resolve(res);
        } else {
          pending--;
          if (pending === 0 && !resolved) resolve([]);
        }
      }).catch(() => {
        pending--;
        if (pending === 0 && !resolved) resolve([]);
      });
    });
  });
}

async function search(q) {
  q = (q || '').trim();
  if (!q) return [];

  const directVid = vidFromUrl(q);
  if (directVid) {
    const item = { id: directVid, title: 'YouTube Video (' + directVid + ')', thumb: ytThumb(directVid), channel: 'YouTube' };
    play(item);
    return [item];
  }

  const out = document.getElementById('results');
  if (out) out.innerHTML = '<div class="empty-state">🔍 Đang tìm kiếm bài hát...</div>';

  if (state.apiKey) {
    try {
      const u = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&maxResults=20&q=${encodeURIComponent(q)}&key=${encodeURIComponent(state.apiKey)}`;
      const r = await fetch(u);
      const j = await r.json();
      if (r.ok && j.items) {
        const arr = j.items.map(x => ({
          id: x.id?.videoId || x.id,
          title: x.snippet?.title || 'YouTube Video',
          channel: x.snippet?.channelTitle || 'YouTube',
          thumb: ytThumb(x.id?.videoId || x.id)
        })).filter(x => x.id && /^[\w-]{11}$/.test(x.id));

        if (arr.length > 0) {
          renderSearchResults(arr);
          return arr;
        }
      }
    } catch(e){}
  }

  const encoded = encodeURIComponent(q);
  const discoveredBases = await fetchInvidiousInstances();
  const discoveredEndpoints = discoveredBases.map(b => `${b}/api/v1/search?q=${encoded}&type=video`);

  const primaryEndpoints = [
    `https://yewtu.be/api/v1/search?q=${encoded}&type=video`,
    `https://invidious.f5.si/api/v1/search?q=${encoded}&type=video`,
    `https://pipedapi.lunar.icu/search?q=${encoded}&filter=videos`,
    `https://invidious.nerdvpn.de/api/v1/search?q=${encoded}&type=video`,
    `https://vid.puffyan.us/api/v1/search?q=${encoded}&type=video`,
    ...discoveredEndpoints
  ];

  const uniqueEndpoints = Array.from(new Set(primaryEndpoints));
  const promises = uniqueEndpoints.map(url => searchSingleEndpoint(url, 4500));
  const results = await firstSuccessfulResult(promises);

  if (Array.isArray(results) && results.length > 0) {
    renderSearchResults(results);
    return results;
  }

  if (out) {
    out.innerHTML = `
      <div class="empty-state">
        <div style="font-weight:700;color:#ff3650;margin-bottom:8px">Không tìm thấy bài hát</div>
        <div>Vui lòng thử lại với từ khóa khác.</div>
      </div>`;
  }
  return [];
}

function renderSearchResults(arr) {
  const out = document.getElementById('results');
  if (!out) return;
  const countEl = document.getElementById('resultCount');
  if (countEl) countEl.textContent = arr.length ? `(${arr.length} bài hát)` : '';

  state.playlist = [...arr];

  out.innerHTML = arr.length ? arr.map(x => itemHtml(x)).join('') : `
    <div class="empty-state">
      <div>Không tìm thấy bài hát nào. Vui lòng thử tìm từ khóa khác.</div>
    </div>`;

  out.querySelectorAll('[data-play-id]').forEach(itemEl => {
    itemEl.onclick = (e) => {
      if (e.target.closest('.btn-fav-item')) return;
      const item = arr.find(x => x.id === itemEl.dataset.playId);
      if (item) play(item);
    };
  });
}

function showView(v) {
  // Giao diện đã được tối giản chỉ còn tìm kiếm và phát toàn màn hình
}

/* =========================================================================
   6. TÌM KIẾM GIỌNG NÓI & KÍCH HOẠT FULLSCREEN TỰ ĐỘNG
   ========================================================================= */

let voiceRecognition = null;
let voiceSilenceTimer = null;
let voiceMaxTimer = null;
let currentVoiceText = '';
let voiceSessionId = 0;
let voiceHandled = false;
let voiceCountdownInterval = null;

function requestPageFullscreen() {
  const el = document.documentElement;
  try {
    if (el.requestFullscreen) el.requestFullscreen().catch(()=>{});
    else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen();
    else if (el.msRequestFullscreen) el.msRequestFullscreen();
  } catch(e) {}
}

function exitPageFullscreen() {
  try {
    if (document.exitFullscreen && document.fullscreenElement) document.exitFullscreen().catch(()=>{});
    else if (document.webkitExitFullscreen && document.webkitFullscreenElement) document.webkitExitFullscreen();
    else if (document.msExitFullscreen && document.msFullscreenElement) document.msExitFullscreen();
  } catch(e) {}
}

function getCinemaBarButtons() {
  const bar = document.getElementById('cinemaBar');
  if (!bar) return [];
  return Array.from(bar.querySelectorAll('button:not([disabled])'));
}

function focusCinemaButton(indexOrElement) {
  const btns = getCinemaBarButtons();
  if (!btns.length) return;
  let target = null;
  if (typeof indexOrElement === 'number') {
    const idx = (indexOrElement + btns.length) % btns.length;
    target = btns[idx];
  } else if (indexOrElement && btns.includes(indexOrElement)) {
    target = indexOrElement;
  } else {
    target = btns[0];
  }
  if (target) {
    try { target.focus({ preventScroll: true }); } catch (e) {}
  }
}

// CHẾ ĐỘ XEM TOÀN MÀN HÌNH (CINEMA MODE)
function enterCinemaMode() {
  document.body.classList.add('cinema');
  requestPageFullscreen();
  forceCarAudioOutput();
  setTimeout(() => {
    const mic = document.getElementById('cinemaMicBtn');
    if (mic) {
      try { mic.focus({ preventScroll: true }); } catch (e) {}
    } else {
      focusCinemaButton(0);
    }
  }, 120);
}

function exitCinemaMode(skipFocus = false) {
  document.body.classList.remove('cinema');
  exitPageFullscreen();
  if (!isTouchMode()) {
    destroyPlayers(false); // Tắt nhạc khi thoát toàn màn hình theo đúng yêu cầu cho xe con lăn
  }
  const input = document.getElementById('searchInput');
  if (input && !skipFocus) {
    setTimeout(() => {
      try { input.focus(); } catch(e){}
    }, 120);
  }
}

/* =========================================================================
   6. GÓI TÌM KIẾM THÔNG MINH CHO XE CON LĂN (QUICK TAGS & VIẾT TẮT)
   ========================================================================= */

const ACRONYM_MAP = {
  'lq': 'Lệ Quyên Bolero',
  'st': 'Sơn Tùng M-TP',
  'mtp': 'Sơn Tùng M-TP',
  'ntr': 'Nhạc Trẻ Remix 2026',
  'bl': 'Bolero Tuyển Chọn Hay Nhất',
  'bolero': 'Bolero Tuyển Chọn Hay Nhất',
  'hat': 'Hà Anh Tuấn Acoustic',
  'dv': 'Đen Vâu Tuyển Tập',
  'vnh': 'Vinahouse Cực Căng Bass Mạnh',
  'edm': 'EDM Tik Tok Gây Nghiện',
  'ns': 'Nonstop Vinahouse 2026 Hay Nhất',
  'lofi': 'Lofi Chill Lái Xe Buổi Tối',
  'remix': 'Nhạc Trẻ Remix 2026',
  'nhactre': 'Nhạc Trẻ Hay Nhất Hiện Nay',
  'chua': 'Nhạc Thiền Tịnh Tâm Cửa Phật',
  'quehuong': 'Nhạc Quê Hương Dạt Dào',
  'tet': 'Nhạc Tết Remix Mới Nhất',
  'xuan': 'Nhạc Xuân Sôi Động 2026',
  'ballad': 'Nhạc Ballad Buồn Tâm Trạng'
};

function resolveQuery(raw) {
  if (!raw) return '';
  const clean = raw.trim().toLowerCase();
  return ACRONYM_MAP[clean] || raw.trim();
}

function saveRecentSearch(keyword) {}
function renderRecentSearches() {}
function clearRecentSearches() {}

/* =========================================================================
   7. QUẢN LÝ CHẾ ĐỘ XE (TOUCH VS ROTARY) & BÀI HÁT YÊU THÍCH
   ========================================================================= */

function getCarMode() {
  return localStorage.getItem('aptv_car_mode') || 'rotary';
}

function isTouchMode() {
  return getCarMode() === 'touch';
}

function setCarMode(mode) {
  if (mode !== 'touch' && mode !== 'rotary') mode = 'rotary';
  localStorage.setItem('aptv_car_mode', mode);
  applyCarMode(mode);
  closeCarModeModal();
  toast(`🚗 Đã chọn: ${mode === 'touch' ? 'Màn hình Cảm ứng 🖐' : 'Xe dùng Con Lăn 🎛'}`);
}
window.setCarMode = setCarMode;

function applyCarMode(mode) {
  const isTouch = (mode === 'touch');
  document.body.classList.toggle('mode-touch', isTouch);
  document.body.classList.toggle('mode-rotary', !isTouch);

  // ĐẢM BẢO #playerWrap NẰM ĐÚNG VỊ TRÍ CHO TỪNG CHẾ ĐỘ
  const playerWrap = document.getElementById('playerWrap');
  const playerContainer = document.getElementById('playerContainer');
  if (playerWrap) {
    if (isTouch) {
      if (playerContainer && playerWrap.parentElement !== playerContainer) {
        playerContainer.insertBefore(playerWrap, playerContainer.firstChild);
      }
    } else {
      if (playerWrap.parentElement !== document.body) {
        document.body.appendChild(playerWrap);
      }
    }
  }

  // Cập nhật Topbar Badge
  const iconEl = document.getElementById('modePillIcon');
  const textEl = document.getElementById('modePillText');
  const badgeEl = document.getElementById('modePillBadge');
  if (iconEl) iconEl.textContent = isTouch ? '🖐' : '🎛';
  if (textEl) textEl.textContent = isTouch ? 'Cảm ứng' : 'Con lăn';
  if (badgeEl) badgeEl.title = isTouch ? 'Đang ở chế độ Màn hình Cảm ứng (Bấm để đổi)' : 'Đang ở chế độ Con lăn / Phím xoay (Bấm để đổi)';

  // Nếu chuyển sang chế độ Con lăn thì thoát tab yêu thích về tìm kiếm
  if (!isTouch) {
    switchTouchTab('discover');
    if (playerContainer) playerContainer.classList.remove('active');
  }

  updateFavoritesUI();
  renderAll();
}

function openCarModeModal() {
  const modal = document.getElementById('carModeModal');
  if (modal) {
    modal.style.display = 'grid';
    modal.classList.add('open');
  }
}
window.openCarModeModal = openCarModeModal;

function closeCarModeModal() {
  const modal = document.getElementById('carModeModal');
  if (modal) {
    modal.classList.remove('open');
    modal.style.display = 'none';
  }
}
window.closeCarModeModal = closeCarModeModal;

function switchTouchTab(tab) {
  const discoverSection = document.getElementById('discoverSection');
  const favoritesSection = document.getElementById('favoritesSection');
  const tabDiscoverBtn = document.getElementById('tabDiscoverBtn');
  const tabFavoritesBtn = document.getElementById('tabFavoritesBtn');

  if (tab === 'favorites') {
    if (tabDiscoverBtn) tabDiscoverBtn.classList.remove('active');
    if (tabFavoritesBtn) tabFavoritesBtn.classList.add('active');
    if (discoverSection) discoverSection.style.display = 'none';
    if (favoritesSection) favoritesSection.style.display = 'block';
    renderFavoritesList();
  } else {
    if (tabDiscoverBtn) tabDiscoverBtn.classList.add('active');
    if (tabFavoritesBtn) tabFavoritesBtn.classList.remove('active');
    if (discoverSection) discoverSection.style.display = 'block';
    if (favoritesSection) favoritesSection.style.display = 'none';
  }
}
window.switchTouchTab = switchTouchTab;

function toggleFavorite(id) {
  const item = findItem(id);
  if (!item) return;

  if (!Array.isArray(state.favorites)) state.favorites = [];
  const idx = state.favorites.findIndex(x => x.id === id);
  if (idx >= 0) {
    state.favorites.splice(idx, 1);
    toast('Đã bỏ yêu thích: ' + (item.title || id));
  } else {
    state.favorites.unshift(item);
    toast('❤️ Đã thêm vào bài hát yêu thích!');
  }
  saveState();
  updateFavoritesUI();

  // Cập nhật ngay lập tức các nút trái tim đang có trên màn hình
  document.querySelectorAll(`.btn-fav-item[data-fav-id="${id}"]`).forEach(btn => {
    const isNowFav = isFavorite(id);
    btn.innerHTML = isNowFav ? '❤️' : '🤍';
    btn.classList.toggle('active', isNowFav);
    btn.title = isNowFav ? 'Bỏ yêu thích' : 'Thêm vào yêu thích';
  });

  const favoritesSection = document.getElementById('favoritesSection');
  if (favoritesSection && favoritesSection.style.display !== 'none') {
    renderFavoritesList();
  }
}
window.toggleFavorite = toggleFavorite;

function updateFavoritesUI() {
  const favs = state.favorites || [];
  const badge = document.getElementById('favBadgeCount');
  const subCount = document.getElementById('favSubCount');
  if (badge) badge.textContent = favs.length;
  if (subCount) subCount.textContent = `${favs.length} bài hát đã lưu`;
}

function renderFavoritesList() {
  const out = document.getElementById('favoritesList');
  if (!out) return;
  const favs = state.favorites || [];

  updateFavoritesUI();

  if (!favs.length) {
    out.innerHTML = `
      <div class="empty-state" style="padding:40px 20px;">
        <div style="font-size:42px;margin-bottom:12px;">🤍</div>
        <div style="font-weight:700;color:#fff;font-size:18px;margin-bottom:8px;">Chưa có bài hát yêu thích</div>
        <div style="color:var(--muted);font-size:14px;max-width:340px;margin:0 auto;line-height:1.5;">
          Khi tìm kiếm bài hát, hãy chạm vào biểu tượng trái tim <b>🤍</b> trên mỗi bài để lưu vào danh sách yêu thích của bạn!
        </div>
      </div>`;
    return;
  }

  out.innerHTML = favs.map(x => itemHtml(x, true)).join('');

  out.querySelectorAll('[data-play-id]').forEach(itemEl => {
    itemEl.onclick = (e) => {
      if (e.target.closest('.btn-fav-item')) return;
      const item = favs.find(x => x.id === itemEl.dataset.playId);
      if (item) {
        state.playlist = [...favs];
        play(item);
      }
    };
  });
}

function playAllFavorites() {
  const favs = state.favorites || [];
  if (!favs.length) {
    return toast('Chưa có bài hát nào trong danh sách yêu thích!');
  }
  state.playlist = [...favs];
  toast(`▶ Đang phát tất cả ${favs.length} bài yêu thích...`);
  play(favs[0], false);
}
window.playAllFavorites = playAllFavorites;

function closeInlinePlayer() {
  destroyPlayers(false);
  const container = document.getElementById('playerContainer');
  if (container) container.classList.remove('active');
}
window.closeInlinePlayer = closeInlinePlayer;

async function quickSearch(q, autoPlay = true) {
  q = (q || '').trim();
  if (!q) return;

  const resolved = resolveQuery(q);
  const input = document.getElementById('searchInput');
  if (input) input.value = resolved;

  if (resolved !== q) {
    toast(`⚡ Viết tắt: ${q.toUpperCase()} ➔ ${resolved}`);
  } else {
    toast('🔍 Đang tìm: ' + resolved);
  }

  saveRecentSearch(resolved);
  const results = await search(resolved);
  if (results && results.length > 0) {
    if (autoPlay && !isTouchMode()) {
      play(results[0], true);
      enterCinemaMode();
    }
  } else {
    toast('Không tìm thấy bài hát: ' + resolved);
  }
}
window.quickSearch = quickSearch;

function stopVoiceSearch() {}
function killRecognition() {}
function initVoiceSearch() {}
function initRotarySmartSearch() {}

function initCinemaControls() {
  const exitBtn = document.getElementById('cinemaExitBtn');
  if (exitBtn) exitBtn.onclick = exitCinemaMode;

  // Lắng nghe sự kiện thoát Fullscreen của trình duyệt để tự tắt nhạc
  const handleFullscreenChange = () => {
    const isFs = !!(document.fullscreenElement || document.webkitFullscreenElement || document.mozFullScreenElement);
    if (!isFs && document.body.classList.contains('cinema')) {
      exitCinemaMode();
    }
  };
  document.addEventListener('fullscreenchange', handleFullscreenChange);
  document.addEventListener('webkitfullscreenchange', handleFullscreenChange);

  // ĐIỀU KHIỂN BẰNG CON LĂN MAZDA / MERCEDES / BMW VÀ PHÍM BÀN PHÍM
  document.addEventListener('keydown', (e) => {
    // 1. Phím Back / Escape trên vô lăng hoặc xe: đóng modal / thoát toàn màn hình
    if (e.key === 'Escape' || e.key === 'BrowserBack' || e.key === 'GoBack') {
      const voiceModal = document.getElementById('voiceModal');
      const qrModal = document.getElementById('qrModal');
      const accountModal = document.getElementById('accountModal');
      if (voiceModal && voiceModal.classList.contains('open')) {
        stopVoiceSearch();
      } else if (accountModal && accountModal.classList.contains('open')) {
        accountModal.classList.remove('open');
      } else if (qrModal && qrModal.classList.remove('open')) {
        qrModal.classList.remove('open');
      } else if (document.body.classList.contains('cinema')) {
        exitCinemaMode();
      }
      return;
    }

    // 2. Khi đang ở chế độ toàn màn hình: điều khiển con lăn trực tiếp giữa các nút Cinema Bar
    if (!document.body.classList.contains('cinema')) return;
    const voiceModal = document.getElementById('voiceModal');
    if (voiceModal && voiceModal.classList.contains('open')) return;

    const btns = getCinemaBarButtons();
    if (!btns.length) return;

    const currentIdx = btns.indexOf(document.activeElement);

    // Xoay sang phải / gạt phải / gạt xuống / Tab: chuyển sang nút kế tiếp
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown' || (e.key === 'Tab' && !e.shiftKey)) {
      e.preventDefault();
      e.stopPropagation();
      const nextIdx = currentIdx < 0 ? 0 : (currentIdx + 1) % btns.length;
      focusCinemaButton(nextIdx);
    }
    // Xoay sang trái / gạt trái / gạt lên / Shift+Tab: chuyển về nút phía trước
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp' || (e.key === 'Tab' && e.shiftKey)) {
      e.preventDefault();
      e.stopPropagation();
      const prevIdx = currentIdx <= 0 ? btns.length - 1 : currentIdx - 1;
      focusCinemaButton(prevIdx);
    }
    // Nhấn con lăn (Enter hoặc Space):
    else if (e.key === 'Enter' || e.key === ' ') {
      if (currentIdx >= 0) {
        e.preventDefault();
        btns[currentIdx].click();
      } else {
        e.preventDefault();
        focusCinemaButton(0);
      }
    }
  });

  // Hỗ trợ sự kiện xoay con lăn (Wheel) trên màn hình xe hơi
  window.addEventListener('wheel', (e) => {
    if (!document.body.classList.contains('cinema')) return;
    const voiceModal = document.getElementById('voiceModal');
    if (voiceModal && voiceModal.classList.contains('open')) return;

    const btns = getCinemaBarButtons();
    if (!btns.length) return;

    const currentIdx = btns.indexOf(document.activeElement);
    if (e.deltaY > 15 || e.deltaX > 15) {
      const nextIdx = currentIdx < 0 ? 0 : (currentIdx + 1) % btns.length;
      focusCinemaButton(nextIdx);
    } else if (e.deltaY < -15 || e.deltaX < -15) {
      const prevIdx = currentIdx <= 0 ? btns.length - 1 : currentIdx - 1;
      focusCinemaButton(prevIdx);
    }
  }, { passive: true });
}

function initRotaryKnobScroll() {
  document.addEventListener('focusin', (e) => {
    if (e.target && typeof e.target.scrollIntoView === 'function') {
      e.target.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  });
}

/* =========================================================================
   7. BẮT SỰ KIỆN NÚT BẤM VÀ KHỞI TẠO ỨNG DỤNG
   ========================================================================= */

document.addEventListener('DOMContentLoaded', () => {

  initFirebase();
  checkPersistentSession();
  initRotaryKnobScroll();
  initCarPlayAudioAnchor();

  // Luôn đảm bảo kênh âm thanh ra loa xe trên mỗi tương tác người dùng (chạm màn hình, click chuột, phím/con lăn vô lăng)
  const maintainCarAudioOnUserAction = () => { forceCarAudioOutput(); };
  document.addEventListener('touchstart', maintainCarAudioOnUserAction, { passive: true });
  document.addEventListener('click', maintainCarAudioOnUserAction, { passive: true });
  document.addEventListener('keydown', maintainCarAudioOnUserAction, { passive: true });

  const loginTabBtn = document.getElementById('tabLoginBtn');
  const regTabBtn = document.getElementById('tabRegBtn');
  if (loginTabBtn) loginTabBtn.onclick = () => switchTab('login');
  if (regTabBtn) regTabBtn.onclick = () => switchTab('reg');

  const btnDoLogin = document.getElementById('btnDoLogin');
  const loginPassInput = document.getElementById('loginPass');
  if (btnDoLogin) btnDoLogin.onclick = handleLogin;
  if (loginPassInput) loginPassInput.onkeydown = (e) => { if (e.key === 'Enter') handleLogin(); };

  const btnCreateQr = document.getElementById('btnCreateQr');
  const regPassInput = document.getElementById('regPass');
  const regPhoneInput = document.getElementById('regPhone');
  if (btnCreateQr) btnCreateQr.onclick = handleRegister;
  if (regPassInput) regPassInput.onkeydown = (e) => { if (e.key === 'Enter') handleRegister(); };
  if (regPhoneInput) regPhoneInput.onkeydown = (e) => { if (e.key === 'Enter') handleRegister(); };

  const closeQrBtn = document.getElementById('closeQrBtn');
  const qrModalEl = document.getElementById('qrModal');
  if (closeQrBtn) {
    closeQrBtn.onclick = () => {
      if (qrModalEl) {
        qrModalEl.classList.remove('open');
        qrModalEl.style.display = 'none';
      }
    };
  }
  if (qrModalEl) {
    qrModalEl.onclick = (e) => {
      if (e.target === qrModalEl) {
        qrModalEl.classList.remove('open');
        qrModalEl.style.display = 'none';
      }
    };
  }

  const btnCheckPayment = document.getElementById('btnCheckPayment');
  if (btnCheckPayment) {
    btnCheckPayment.onclick = () => {
      checkPaymentNow();
    };
  }

  // Bắt sự kiện xem thông tin tài khoản (Topbar Badge)
  const userBadge = document.getElementById('userBadge');
  const accountModal = document.getElementById('accountModal');
  if (userBadge) {
    userBadge.onclick = (e) => {
      if (e && e.preventDefault) e.preventDefault();
      openAccountModal();
    };
    userBadge.onkeydown = (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        openAccountModal();
      }
    };
  }

  // Bắt sự kiện click toàn cục cho userBadge (hỗ trợ màn hình xe & con lăn)
  document.addEventListener('click', (e) => {
    if (e.target && (e.target.id === 'userBadge' || e.target.closest('#userBadge'))) {
      if (e.preventDefault) e.preventDefault();
      openAccountModal();
    }
  });

  if (accountModal) {
    accountModal.onclick = (e) => {
      if (e.target === accountModal) {
        closeAccountModal();
      }
    };
  }

  const logoutAction = () => {
    if (confirm('Bạn có chắc chắn muốn đăng xuất tài khoản?')) {
      localStorage.removeItem('aptv_user');
      location.reload();
    }
  };
  const btnLogout = document.getElementById('btnLogout');
  const accModalLogoutBtn = document.getElementById('accModalLogoutBtn');
  if (btnLogout) btnLogout.onclick = logoutAction;
  if (accModalLogoutBtn) accModalLogoutBtn.onclick = logoutAction;

  const searchForm = document.getElementById('searchForm');
  if (searchForm) {
    searchForm.onsubmit = async e => {
      e.preventDefault();
      const input = document.getElementById('searchInput');
      const raw = input ? input.value.trim() : '';
      if (!raw) return toast('Vui lòng nhập tên bài hát cần tìm');

      const resolved = resolveQuery(raw);
      if (resolved !== raw) {
        if (input) input.value = resolved;
        toast(`⚡ Viết tắt: ${raw.toUpperCase()} ➔ ${resolved}`);
      }
      saveRecentSearch(resolved);

      if (isTouchMode()) {
        switchTouchTab('discover');
        toast('🔍 Đang tìm kiếm: ' + resolved);
        await search(resolved);
      } else {
        toast('🔍 Đang tìm & tự phát: ' + resolved);
        const results = await search(resolved);
        if (results && results.length > 0) {
          play(results[0], true);
          if (typeof enterCinemaMode === 'function') enterCinemaMode();
        }
      }
    };
  }

  const carModeModal = document.getElementById('carModeModal');
  if (carModeModal) {
    carModeModal.onclick = (e) => {
      if (e.target === carModeModal) {
        closeCarModeModal();
      }
    };
  }

  const modePillBadge = document.getElementById('modePillBadge');
  if (modePillBadge) {
    modePillBadge.onclick = () => openCarModeModal();
  }

  document.querySelectorAll('[data-close]').forEach(b => b.onclick = () => {
    document.querySelectorAll('.modal-back').forEach(m => {
      if (m.id !== 'authModal') {
        m.classList.remove('open');
        m.style.display = 'none';
      }
    });
  });

  const initialCarMode = getCarMode();
  applyCarMode(initialCarMode);
  renderAll();
  initRotarySmartSearch();
  initCinemaControls();

  // Hỗ trợ tự tìm kiếm nếu URL có tham số ?q= hoặc ?search=
  try {
    const urlParams = new URLSearchParams(window.location.search);
    const qParam = urlParams.get('q') || urlParams.get('search') || urlParams.get('s');
    if (qParam && qParam.trim()) {
      setTimeout(() => {
        quickSearch(qParam.trim(), true);
      }, 500);
    }
  } catch (e) {}
});
