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
let analytics = null;
function initFirebase() {
  try {
    if (window.firebase && !firebase.apps.length) {
      firebase.initializeApp(firebaseConfig);
    }
    if (window.firebase && firebase.apps.length) {
      db = firebase.firestore();
      if (typeof firebase.analytics === 'function') {
        analytics = firebase.analytics();
        console.log("✅ Firebase Analytics đã kích hoạt:", firebaseConfig.measurementId);
      }
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
    { id: '3cWWUr6w7z8', title: 'Nonstop Nhạc Trend TikTok Remix 2026 - Bass Cực Căng Lái Xe Đường Dài', channel: 'Việt Mix Official', thumb: 'https://i.ytimg.com/vi/3cWWUr6w7z8/mqdefault.jpg' },
    { id: 'ri9GuMiNIy0', title: 'Deep House MIX 2026 - Best Music for Night Drive | Luxury Car Music', channel: 'Deep House Nation', thumb: 'https://i.ytimg.com/vi/ri9GuMiNIy0/mqdefault.jpg' },
    { id: 'WzKS0KJIMl4', title: 'NONSTOP 2026 VINAHOUSE BASS CỰC MẠNH | Tuyển Chọn Lái Xe Đường Dài', channel: 'Vinahouse DJ', thumb: 'https://i.ytimg.com/vi/WzKS0KJIMl4/mqdefault.jpg' },
    { id: 'kcuXE8euHNg', title: 'DRAVYN - Bass Boosted Night Drive Mix Deep House (Nhạc Nghe Trên Xe)', channel: 'DRAVYN Music', thumb: 'https://i.ytimg.com/vi/kcuXE8euHNg/mqdefault.jpg' },
    { id: 'GP59_ecBABk', title: 'Lái Xe Là Phải Nghe - DJ HYENA REMIX Liên Khúc Nhạc Trẻ Hot Trend', channel: 'DJ Hyena Remix', thumb: 'https://i.ytimg.com/vi/GP59_ecBABk/mqdefault.jpg' },
    { id: 'k7zgGmpypf0', title: 'Midnight Executive — Luxury Deep House Night Drive Mix 2026', channel: 'Night Drive Mix', thumb: 'https://i.ytimg.com/vi/k7zgGmpypf0/mqdefault.jpg' },
    { id: 'dN66qkXDeyc', title: 'Nonstop Vinahouse 2026 - Nhạc Sàn Siêu Xe Bass Cực Căng Đập Tung Loa', channel: 'Car Audio Club', thumb: 'https://i.ytimg.com/vi/dN66qkXDeyc/mqdefault.jpg' },
    { id: 'cucMdYrlOVE', title: 'Nhạc Nghe Trên Xe Cực Chill 2026 - Mixtape Deep Chill Roadtrip', channel: 'Chill Music VN', thumb: 'https://i.ytimg.com/vi/cucMdYrlOVE/mqdefault.jpg' },
    { id: 'sjQgYzkXjW8', title: 'Nhạc Trẻ Remix Triệu View 2026 - Nonstop Vinahouse Bay Phòng Lái Xe', channel: 'Nonstop Việt', thumb: 'https://i.ytimg.com/vi/sjQgYzkXjW8/mqdefault.jpg' },
    { id: 'FkdP-OcvT30', title: 'Chạy Qua Những Ngày Đẹp Trời - Playlist Chill Lái Xe Đường Dài Không Buồn Ngủ', channel: 'Acoustic Chill Lofi', thumb: 'https://i.ytimg.com/vi/FkdP-OcvT30/mqdefault.jpg' }
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

    // Tự động nâng cấp danh sách mặc định lên tuyển tập liên khúc nhạc dài xe hơi (TikTok Remix, Deep House, Vinahouse)
    const PLAYLIST_CACHE_VERSION = 'aptv_carmix_long_v3';
    const isOldPlaylist = !loaded.playlist || !loaded.playlist.length || loaded.playlist.some(x => x.id === 'abPmZCZZrFA' || x.id === 'GpmOn4RyzZI' || x.id === 'L_LUpnjgPso' || x.id === 'a9l_3ZzC2yY');
    if (localStorage.getItem('aptv_playlist_ver') !== PLAYLIST_CACHE_VERSION || isOldPlaylist) {
      loaded.playlist = [...defaults.playlist];
      localStorage.setItem('aptv_playlist_ver', PLAYLIST_CACHE_VERSION);
      try {
        localStorage.setItem(KEY, JSON.stringify(loaded));
      } catch(e){}
    }

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
    return showAuthError('Số điện thoại không hợp lệ.');
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
let ytApiReady = false;
let pendingVideoRequest = null;

const HD_IS_IOS_CARPLAY = /iPad|iPhone|iPod/.test(navigator.userAgent || '') ||
  (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1) ||
  /aptv/i.test(navigator.userAgent || '');

// =========================================================================
// QUẢN LÝ PLAYER YOUTUBE ĐƠN LUỒNG CHUẨN HDC_NATURAL_AUDIO_V13 (IOS / CARPLAY)
// 1. Không ghi audioSession.type
// 2. Không tạo audio im lặng (silentBridge: false)
// 3. Không chạm vào parent navigator.mediaSession trên iOS (parentSessionPolicy: 'untouched-on-ios')
// 4. Không hủy/tạo lại iframe hoặc xóa DOM khi bấm chọn bài (playerRebuild: false)
// =========================================================================

function initCarPlayAudioAnchor() {}

function forceWebKitPlaybackSession() {
  try {
    if (navigator.audioSession) {
      // Trong WebKit C++ (DOMAudioSession.cpp), setType('playback') sẽ bị bỏ qua nếu m_type đã là 'playback'.
      // Chuyển trạng thái 'ambient' -> 'playback' ngay trong User Gesture buộc WebKit gọi lại
      // AudioSession::sharedSession().setCategory(AudioSession::CategoryType::Playback) ở tầng iOS!
      navigator.audioSession.type = 'ambient';
      navigator.audioSession.type = 'playback';
    }
  } catch (e) {}
}

function forceCarAudioOutput() {}

function destroyPlayers(keepAnchor = false) {
  pauseMusicForVoiceSearch();
  if (!HD_IS_IOS_CARPLAY && 'mediaSession' in navigator) {
    try { navigator.mediaSession.playbackState = 'paused'; } catch (e) {}
  }
  updatePlayPauseButton(false);
}

// CẬP NHẬT GIAO DIỆN MEDIA SESSION
// QUAN TRỌNG (từ test.html HDC_NATIVE_YOUTUBE_QUEUE_V1):
// Trên iOS/CarPlay, TUYỆT ĐỐI KHÔNG ghi đè navigator.mediaSession ở trang cha!
// Để nguyên cho iframe YouTube nắm quyền điều khiển MediaSession & định tuyến âm thanh A2DP.
function updateMediaSession(item) {
  if (HD_IS_IOS_CARPLAY) return;
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

function updateActivePlayingItemUI(videoId) {
  document.querySelectorAll('.item[data-play-id]').forEach((el) => {
    el.classList.toggle('active-play', el.dataset.playId === videoId);
  });
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
  if (window.hdVoiceBusy && window.hdVoiceBusy()) return;
  forceWebKitPlaybackSession();
  if (window.hdVoiceAudio && typeof window.hdVoiceAudio.allowPlayback === 'function') {
    window.hdVoiceAudio.allowPlayback();
  }
  if (ytPlayer && ytApiReady && typeof ytPlayer.getPlayerState === 'function') {
    const s = ytPlayer.getPlayerState();
    if (s === 1) { // 1 = PLAYING
      if (window.hdVoiceAudio) window.hdVoiceAudio.notePlayback(false);
      try { ytPlayer.pauseVideo(); } catch (e) {}
      updatePlayPauseButton(false);
      if (!HD_IS_IOS_CARPLAY && 'mediaSession' in navigator) navigator.mediaSession.playbackState = 'paused';
    } else {
      if (window.hdVoiceAudio) window.hdVoiceAudio.notePlayback(true);
      try {
        if (typeof ytPlayer.unMute === 'function') ytPlayer.unMute();
        if (typeof ytPlayer.setVolume === 'function') ytPlayer.setVolume(100);
        ytPlayer.playVideo();
      } catch (e) {}
      updatePlayPauseButton(true);
      if (!HD_IS_IOS_CARPLAY && 'mediaSession' in navigator) navigator.mediaSession.playbackState = 'playing';
    }
    return;
  }

  const iframe = document.getElementById('ytPlayerFrame');
  if (iframe && iframe.contentWindow) {
    iframe.contentWindow.postMessage('{"event":"command","func":"pauseVideo","args":""}', '*');
  }
}

function onYoutubePlayerReady(event) {
  if (event && event.target && ytPlayer && event.target !== ytPlayer) return;
  if (event && event.target) ytPlayer = event.target;
  ytApiReady = true;

  try {
    if (event && event.target) {
      if (typeof event.target.unMute === 'function') event.target.unMute();
      if (typeof event.target.setVolume === 'function') event.target.setVolume(100);
    }
  } catch (e) {}

  if (pendingVideoRequest && pendingVideoRequest.id) {
    const req = pendingVideoRequest;
    pendingVideoRequest = null;
    hdDismissPlayerReload();
    try {
      if (typeof event.target.unMute === 'function') event.target.unMute();
      if (typeof event.target.setVolume === 'function') event.target.setVolume(100);
      event.target.loadVideoById({ videoId: req.id, startSeconds: req.time || 0 });
      if (typeof event.target.playVideo === 'function') event.target.playVideo();
      if (window.hdVoiceAudio) window.hdVoiceAudio.notePlayback(true);
      updatePlayPauseButton(true);
    } catch (e) {}
    return;
  }

  if (typeof hdHandlePlayerReloadReady === 'function' && hdHandlePlayerReloadReady(event)) {
    return;
  }
}

function onYoutubePlayerStateChange(event) {
  if (!ytPlayer || (event && event.target && event.target !== ytPlayer)) return;
  if (window.hdVoiceBusy && window.hdVoiceBusy() && (event.data === 1 || event.data === 3)) {
    try { ytPlayer.pauseVideo(); } catch (e) {}
    updatePlayPauseButton(false);
    return;
  }
  if (event.data === 1 && hdPlayerReloadRequest) {
    hdDismissPlayerReload();
  }
  if (event.data === 0) { // ENDED
    if (window.hdVoiceAudio) window.hdVoiceAudio.notePlayback(false);
    updatePlayPauseButton(false);
    if (state.autoNext) {
      toast('🔄 Hết bài, tự động phát bài kế tiếp...');
      setTimeout(() => playNext(), 600);
    }
  } else if (event.data === 1) { // PLAYING
    window.hdVoiceMusicPaused = false;
    if (window.hdVoiceAudio) window.hdVoiceAudio.notePlayback(true);
    updatePlayPauseButton(true);
    if (!HD_IS_IOS_CARPLAY && 'mediaSession' in navigator) navigator.mediaSession.playbackState = 'playing';
  } else if (event.data === 2) { // PAUSED
    if (window.hdVoiceAudio) window.hdVoiceAudio.notePlayback(false);
    updatePlayPauseButton(false);
    if (!HD_IS_IOS_CARPLAY && 'mediaSession' in navigator) navigator.mediaSession.playbackState = 'paused';
  }
}

function onYoutubePlayerError(event) {
  if (event && event.target && ytPlayer && event.target !== ytPlayer) return;
  const errCode = event ? Number(event.data) : 0;
  console.warn('YouTube Player Error code:', errCode);
  if (errCode === 101 || errCode === 150 || errCode === 153 || errCode === 100 || errCode === 2 || errCode === 5) {
    toast('⚠️ Video này bị hạn chế phát (' + errCode + '), đang chuyển bài kế tiếp...');
    setTimeout(() => playNext(), 1200);
  }
}

window.onYouTubeIframeAPIReady = function () {
  const frame = document.getElementById('ytPlayerFrame');
  if (ytPlayer || !frame) return;
  if (!window.YT || typeof window.YT.Player !== 'function') return;
  try {
    ytPlayer = new YT.Player('ytPlayerFrame', {
      events: {
        onReady: onYoutubePlayerReady,
        onStateChange: onYoutubePlayerStateChange,
        onError: onYoutubePlayerError
      }
    });
  } catch (e) {
    console.warn('YT.Player init warning:', e);
  }
};

function play(item, add = true, startSeconds = 0) {
  let videoId = '';
  if (typeof item === 'string') {
    videoId = vidFromUrl(item) || item;
    item = findItem(videoId) || { id: videoId, title: 'YouTube Video', thumb: ytThumb(videoId) };
  } else if (item && item.id) {
    videoId = item.id;
  }

  if (!videoId) return toast('Không tìm thấy Video ID');
  if (window.hdVoiceBusy && window.hdVoiceBusy()) return false;

  if (hdPlayerReloadRequest) {
    hdDismissPlayerReload();
  }

  // Ép WebKit chuyển trạng thái AudioSession về Playback ngay trong User Gesture
  forceWebKitPlaybackSession();

  if (window.hdVoiceAudio && typeof window.hdVoiceAudio.allowPlayback === 'function') {
    window.hdVoiceAudio.allowPlayback();
  }
  if (window.hdVoiceAudio && typeof window.hdVoiceAudio.notePlayback === 'function') {
    window.hdVoiceAudio.notePlayback(true);
  }

  const pos = Math.max(0, Math.floor(Number(startSeconds) || 0));

  // BƯỚC 1 (QUAN TRỌNG NHẤT): Gọi loadVideoById + playVideo NGAY ĐẦU TIÊN đồng bộ trong User Gesture
  // trước khi thay đổi bất kỳ class DOM hay cuộn trang nào để bảo toàn 100% User Activation cho iframe YouTube!
  if (ytApiReady && ytPlayer && typeof ytPlayer.loadVideoById === 'function') {
    try {
      if (typeof ytPlayer.unMute === 'function') ytPlayer.unMute();
      if (typeof ytPlayer.setVolume === 'function') ytPlayer.setVolume(100);
      ytPlayer.loadVideoById({ videoId: videoId, startSeconds: pos });
      if (typeof ytPlayer.playVideo === 'function') ytPlayer.playVideo();
      updatePlayPauseButton(true);
    } catch (e) {
      console.warn('loadVideoById error:', e);
    }
  } else {
    pendingVideoRequest = { id: videoId, time: pos };
    const iframe = document.getElementById('ytPlayerFrame');
    if (iframe && iframe.contentWindow) {
      try {
        iframe.contentWindow.postMessage('{"event":"command","func":"unMute","args":""}', '*');
        iframe.contentWindow.postMessage('{"event":"command","func":"setVolume","args":[100]}', '*');
        iframe.contentWindow.postMessage('{"event":"command","func":"playVideo","args":""}', '*');
      } catch (e) {}
    }
    if (window.YT && typeof window.YT.Player === 'function') {
      window.onYouTubeIframeAPIReady();
    }
  }

  // BƯỚC 2: Cập nhật trạng thái bài đang phát mà KHÔNG xóa/vẽ lại innerHTML của danh sách (#results)
  current = item;
  currentIndex = state.playlist.findIndex(x => x.id === videoId);
  if (add) addHistory(item);

  updateActivePlayingItemUI(videoId);
  updateMediaSession(item);

  const nowPlayingTitle = document.getElementById('nowPlayingTitle');
  if (nowPlayingTitle) nowPlayingTitle.textContent = item.title || videoId;

  if (isTouchMode()) {
    const playerContainer = document.getElementById('playerContainer');
    if (playerContainer) {
      playerContainer.classList.add('active');
    }
  } else {
    enterCinemaMode();
  }

  toast('Đang phát: ' + (item.title || videoId));
}

// BẮT SỰ KIỆN POSTMESSAGE TỪ YOUTUBE IFRAME
window.addEventListener('message', (e) => {
  try {
    const data = typeof e.data === 'string' ? JSON.parse(e.data) : e.data;
    if (!data) return;
    if (data.event === 'onStateChange') {
      if (data.info === 1) {
        updatePlayPauseButton(true);
      } else if (data.info === 2) {
        updatePlayPauseButton(false);
      }
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
        <button class="btn-play-item" data-play="${esc(item.id)}" tabindex="-1">▶ Phát</button>
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
      if (item) {
        play(item);
        if (window.hdVoiceReloadHint && typeof window.hdVoiceReloadHint.selected === 'function') {
          window.hdVoiceReloadHint.selected(itemEl, e);
        }
      }
    };
    itemEl.onkeydown = (e) => {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'NumpadEnter') {
        e.preventDefault();
        const item = arr.find(x => x.id === itemEl.dataset.playId);
        if (item) {
          play(item);
          if (window.hdVoiceReloadHint && typeof window.hdVoiceReloadHint.selected === 'function') {
            window.hdVoiceReloadHint.selected(itemEl, { type: 'click', target: itemEl });
          }
        }
      }
    };
  });

  if (typeof autoHighlightFirstSongInRotary === 'function') {
    autoHighlightFirstSongInRotary();
  }
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
  // Theo chuẩn test.html (HD_VIDEO_EXPAND_MODULE): Trên iOS / APTV dùng phóng to trong trang (CSS position: fixed),
  // KHÔNG gọi webkitRequestFullscreen vì sẽ chiếm mất User Activation và làm WebKit khởi tạo lại layer iframe.
  if (HD_IS_IOS_CARPLAY) return;
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
  if (!isTouchMode() && !skipFocus) {
    setTimeout(() => {
      if (current && current.id) {
        const itemEl = document.querySelector(`.item[data-play-id="${current.id}"]`);
        if (itemEl && typeof setRotaryFocus === 'function') {
          setRotaryFocus(itemEl, true);
          return;
        }
      }
      if (typeof autoHighlightFirstSongInRotary === 'function') {
        autoHighlightFirstSongInRotary();
      }
    }, 150);
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

  // HDC_NATURAL_AUDIO_V13: KHÔNG BAO GIỜ di chuyển #playerWrap trong DOM
  // vì di chuyển thẻ chứa iframe sẽ làm WebKit tải lại iframe và làm hỏng kết nối YT.Player!
  const playerContainer = document.getElementById('playerContainer');

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
    if (playerContainer && !document.body.classList.contains('cinema')) {
      playerContainer.classList.remove('active');
    }
    setTimeout(() => {
      if (typeof autoHighlightFirstSongInRotary === 'function') {
        autoHighlightFirstSongInRotary();
      }
    }, 150);
  } else if (current && playerContainer) {
    playerContainer.classList.add('active');
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
    itemEl.onkeydown = (e) => {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'NumpadEnter') {
        e.preventDefault();
        const item = favs.find(x => x.id === itemEl.dataset.playId);
        if (item) {
          state.playlist = [...favs];
          play(item);
        }
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

/* =========================================================================
   6B. HỆ THỐNG TÌM KIẾM GIỌNG NÓI CHỐNG KẸT MIC & KHÔI PHỤC ÂM THANH IOS/CARPLAY
       (HDC_NATURAL_AUDIO_V13 + HD_VOICE_RELOAD_HINT_V1 + HDC_MANUAL_PLAYER_RELOAD_V14)
   ========================================================================= */

const HD_AUDIO_IS_IOS = /iPad|iPhone|iPod/.test(navigator.userAgent || '') ||
  (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const HD_BLUETOOTH_NATIVE_ONLY = HD_AUDIO_IS_IOS || /aptv/i.test(navigator.userAgent || '');
const HD_VOICE_SILENCE_DELAY = 1400;

let hdVoiceListening = false;
let hdVoiceClosing = false;
let hdVoiceSearchSubmitting = false;
let hdVoiceFinalText = '';
let hdVoiceLastText = '';
let hdVoiceQueuedText = '';
let hdVoiceSearchTimer = null;
let hdMainVoiceSession = null;
let hdVoiceRecognition = null;
let hdVoiceAudioTrace = [];
window.hdVoiceMusicPaused = false;

function hdTraceVoiceAudio(event, detail) {
  hdVoiceAudioTrace.push({ time: Date.now(), event: String(event), detail: detail || '' });
  if (hdVoiceAudioTrace.length > 180) hdVoiceAudioTrace.shift();
}

function getVoiceSearchButton() {
  return document.getElementById('btnVoiceSearch');
}

function setVoiceSearchListening(isListening) {
  hdVoiceListening = !!isListening;
  const button = getVoiceSearchButton();
  const label = document.getElementById('btnVoiceSearchLabel');
  const cinemaBtn = document.getElementById('cinemaMicBtn');
  const notice = document.getElementById('searchVoiceNotice');

  if (button) {
    button.classList.toggle('is-listening', hdVoiceListening);
    button.setAttribute('aria-pressed', hdVoiceListening ? 'true' : 'false');
    button.title = hdVoiceListening ? 'Đang lắng nghe... Bấm để dừng' : 'Tìm kiếm bằng giọng nói';
  }
  if (label) {
    label.textContent = hdVoiceListening ? 'Đang nghe...' : 'Giọng nói';
  }
  if (cinemaBtn) {
    cinemaBtn.classList.toggle('is-listening', hdVoiceListening);
    cinemaBtn.textContent = hdVoiceListening ? '🛑 Dừng nghe' : '🎤 Giọng nói';
  }
  if (notice) {
    notice.classList.toggle('listening', hdVoiceListening);
  }
}

let hdNoticeHideTimer = null;
function setVoiceSearchNotice(message, autoHideMs = 0) {
  const notice = document.getElementById('searchVoiceNotice');
  if (hdNoticeHideTimer) {
    clearTimeout(hdNoticeHideTimer);
    hdNoticeHideTimer = null;
  }
  if (!notice) return;
  if (!message) {
    notice.textContent = '';
    notice.classList.remove('show', 'listening');
    return;
  }
  notice.textContent = message;
  notice.classList.add('show');
  if (autoHideMs > 0) {
    hdNoticeHideTimer = setTimeout(() => {
      if (!hdVoiceListening) {
        notice.classList.remove('show', 'listening');
      }
    }, autoHideMs);
  }
}

function pauseMusicForVoiceSearch() {
  if (window.hdVoiceAudio) window.hdVoiceAudio.notePlayback(false);
  try {
    if (ytPlayer && typeof ytPlayer.pauseVideo === 'function') {
      ytPlayer.pauseVideo();
    }
  } catch (e) {}

  const frame = document.getElementById('ytPlayerFrame');
  if (frame && frame.contentWindow) {
    try {
      frame.contentWindow.postMessage(JSON.stringify({ event: 'command', func: 'pauseVideo', args: [] }), '*');
    } catch (e) {}
  }

  document.querySelectorAll('audio, video').forEach((media) => {
    try { media.pause(); } catch (e) {}
  });
  updatePlayPauseButton(false);
}

/* HDC_NATURAL_AUDIO_V13: Quản lý độc quyền vòng đời nhận giọng nói trên iOS/CarPlay */
window.hdVoiceAudio = (function () {
  let currentSession = null;
  let serial = 0;
  let lastRelease = null;

  function busy() {
    return !!currentSession;
  }

  function finish(session) {
    if (!session || session.done || currentSession !== session) return;
    session.done = true;
    session.closing = true;
    clearTimeout(session.watchdog);
    clearTimeout(session.closeTimer);

    const recognition = session.recognition;
    if (recognition) {
      recognition.onstart = recognition.onresult = recognition.onspeechstart =
      recognition.onspeechend = recognition.onerror = recognition.onend = recognition.onaudioend = null;
    }
    currentSession = null;
    lastRelease = {
      serial: session.audio.serial,
      endedAt: Date.now(),
      audioEndObserved: !!session.audioEnded,
      nativeEndObserved: !session.startException
    };
    hdTraceVoiceAudio(session.startException ? 'microphone_start_cleanup' : 'microphone_end', lastRelease);

    try {
      if (typeof session.onfinish === 'function') session.onfinish(true);
    } catch (e) {
      hdTraceVoiceAudio('voice_finish_callback_error', e.name || 'Error');
    }
  }

  function close(session) {
    if (!session || session.done || currentSession !== session) return;
    if (session.closing) {
      try { session.recognition.abort(); } catch (e) {}
      return;
    }
    session.closing = true;
    clearTimeout(session.watchdog);
    hdTraceVoiceAudio('microphone_close_requested', session.timedOut ? 'timeout-abort' : 'abort');
    try {
      session.recognition.abort();
    } catch (e) {
      hdTraceVoiceAudio('microphone_abort_error', e.name || 'Error');
      try { session.recognition.stop(); } catch (ignored) {}
    }
    if (session.done) return;
    session.closeTimer = setTimeout(() => {
      if (session.done) return;
      hdTraceVoiceAudio('microphone_close_stalled');
      if (typeof session.onstalled === 'function') session.onstalled();
      else toast('⚠️ Microphone chưa đóng. Bấm lại nút Giọng nói hoặc tải lại trang.');
    }, 3000);
  }

  function begin(recognition, onfinish, options) {
    if (busy()) return null;
    let isPlaying = false;
    try {
      const s = ytPlayer && typeof ytPlayer.getPlayerState === 'function' ? ytPlayer.getPlayerState() : null;
      isPlaying = (s === 1 || s === 3);
    } catch (e) {}

    const info = {
      serial: ++serial,
      id: current ? current.id : '',
      playing: isPlaying,
      noResume: !!(options && options.resumePlayback === false),
      pageHidden: false
    };

    const session = {
      recognition: recognition,
      audio: info,
      onfinish: onfinish,
      done: false,
      closing: false,
      onstalled: options && options.onstalled
    };

    currentSession = session;
    pauseMusicForVoiceSearch();
    hdTraceVoiceAudio('microphone_created', { serial: info.serial, resume: !info.noResume });

    recognition.onend = () => { finish(session); };
    recognition.onaudioend = () => {
      session.audioEnded = true;
      hdTraceVoiceAudio('microphone_audioend', { serial: info.serial });
    };
    session.watchdog = setTimeout(() => {
      session.timedOut = true;
      close(session);
    }, 20000);

    return session;
  }

  function startFailed(session) {
    if (!session || session.done) return;
    session.failed = true;
    session.startException = true;
    try { session.recognition.abort(); } catch (e) {}
    if (!session.done) finish(session);
  }

  function notePlayback(playing) {
    if (currentSession) currentSession.audio.playing = !!playing;
  }

  function allowPlayback() {
    if (busy()) return false;
    window.hdVoiceMusicPaused = false;
    hdTraceVoiceAudio('play_requested');
    return true;
  }

  window.addEventListener('pagehide', () => {
    if (currentSession) {
      currentSession.audio.pageHidden = true;
      currentSession.cancelled = true;
      close(currentSession);
    }
  });

  return {
    begin,
    close,
    startFailed,
    busy,
    notePlayback,
    allowPlayback,
    readState: () => ({
      phase: currentSession ? (currentSession.closing ? 'closing' : 'recognition') : 'idle',
      isIOS: HD_AUDIO_IS_IOS,
      nativeBluetoothOnly: HD_BLUETOOTH_NATIVE_ONLY,
      currentSerial: currentSession ? currentSession.audio.serial : null,
      lastRelease
    })
  };
})();

window.hdVoiceBusy = function () {
  return window.hdVoiceAudio.busy();
};

function clearVoiceTimers() {
  if (hdVoiceSearchTimer) {
    clearTimeout(hdVoiceSearchTimer);
    hdVoiceSearchTimer = null;
  }
}

const HD_VOICE_READY_STORAGE_KEY = 'aptv_voice_ready_v1';

async function hdSubmitVoiceSearch(text) {
  const input = document.getElementById('searchInput');
  text = (text || '').trim();
  if (!input || !text || hdVoiceSearchSubmitting) return;

  const resolved = resolveQuery(text);
  input.value = resolved;
  hdVoiceSearchSubmitting = true;
  setVoiceSearchNotice(`🎤 Đã nghe "${resolved}" · Đang tìm bài hát & làm mới kênh loa xe...`, 10000);
  toast(`🎤 Đang tìm: ${resolved}`);

  if (window.hdVoiceReloadHint && typeof window.hdVoiceReloadHint.searchStarted === 'function') {
    window.hdVoiceReloadHint.searchStarted(true);
  }

  try {
    if (isTouchMode()) {
      switchTouchTab('discover');
    }
    if (document.body.classList.contains('cinema')) {
      document.body.classList.remove('cinema');
      exitPageFullscreen();
    }
    const results = await search(resolved);
    if (results && results.length > 0) {
      // CƠ CHẾ TRIỆT ĐỂ CHO IOS / CARPLAY (HD_VOICE_CLEAN_DOCUMENT_RELOAD_V15):
      // Trên iOS WebKit, một khi Document đã gọi webkitSpeechRecognition.start(), tiến trình WebKit giữ chặt
      // AVAudioSession ở chế độ PlayAndRecord (loa điện thoại / nhỏ tiếng) cho đến khi Document đó bị hủy.
      // Vì vậy:
      // 1. Lưu sẵn kết quả tìm kiếm vừa tải xong vào sessionStorage (để trang mới mở lên có ngay trong 0ms).
      // 2. Dùng window.location.replace() tải lại Document mới tinh 100% chưa từng chạm vào Mic.
      // 3. Trên Document mới tinh, hiển thị nút "▶ PHÁT NGAY RA LOA XE" (1 chạm / 1 nút Enter) để phát với User Gesture thật!
      try {
        state.playlist = results;
        saveState();
        localStorage.setItem('aptv_car_mode', getCarMode());
        sessionStorage.setItem(HD_VOICE_READY_STORAGE_KEY, JSON.stringify({
          mode: 'voice_search',
          query: resolved,
          results: results.slice(0, 25),
          song: results[0],
          time: 0,
          ts: Date.now()
        }));
        setVoiceSearchNotice(`🔄 Đã tìm thấy "${results[0].title}" · Đang chuyển sang kênh loa xe...`, 5000);
        setTimeout(() => {
          window.location.replace(window.location.pathname + '?vr=' + Date.now());
        }, 120);
        return;
      } catch (storageErr) {
        console.warn('Fallback khi không dùng được sessionStorage:', storageErr);
      }

      setVoiceSearchNotice(`✅ Đã tìm thấy ${results.length} bài hát cho "${resolved}". Chạm vào bài (hoặc ấn Enter) để phát ra loa xe!`, 8000);
      toast(`✅ Đã tìm thấy ${results.length} bài — Chạm hoặc ấn Enter để phát!`);
      if (!isTouchMode() && typeof autoHighlightFirstSongInRotary === 'function') {
        setTimeout(() => autoHighlightFirstSongInRotary(), 80);
      }
    } else {
      setVoiceSearchNotice(`⚠️ Không tìm thấy bài hát cho "${resolved}". Bấm Giọng nói để thử lại.`, 6000);
    }
  } catch (e) {
    console.warn('Lỗi tìm kiếm giọng nói:', e);
  } finally {
    hdVoiceSearchSubmitting = false;
  }
}

function finishVoiceSearchWithDelay(text) {
  text = String(text || '').trim();
  if (!text || hdVoiceSearchSubmitting || hdVoiceClosing) return;
  clearVoiceTimers();
  const input = document.getElementById('searchInput');
  if (input) input.value = text;
  hdVoiceSearchTimer = setTimeout(() => {
    hdVoiceSearchTimer = null;
    if (!hdMainVoiceSession || hdMainVoiceSession.closing) return;
    hdVoiceQueuedText = text;
    closeVoiceSession();
  }, HD_VOICE_SILENCE_DELAY);
}

function closeVoiceSession() {
  if (!hdMainVoiceSession) return;
  hdVoiceClosing = true;
  clearVoiceTimers();
  window.hdVoiceAudio.close(hdMainVoiceSession);
}

function stopVoiceSearch() {
  if (hdMainVoiceSession) hdMainVoiceSession.cancelled = true;
  hdVoiceQueuedText = hdVoiceLastText = hdVoiceFinalText = '';
  closeVoiceSession();
}
window.stopVoiceSearch = stopVoiceSearch;

function killRecognition() {
  if (hdMainVoiceSession) {
    stopVoiceSearch();
  }
}

function createVoiceRecognition() {
  const Constructor = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!Constructor) return null;
  try { return new Constructor(); } catch (e) { return null; }
}

function toggleVoiceSearch() {
  if (hdVoiceSearchSubmitting) return false;
  if (hdMainVoiceSession) {
    stopVoiceSearch();
    return false;
  }
  if (window.hdVoiceAudio.busy()) {
    setVoiceSearchNotice('⚠️ Hãy kết thúc microphone đang nghe trước.', 4000);
    toast('⚠️ Hãy kết thúc microphone đang nghe trước.');
    return false;
  }

  const recognition = createVoiceRecognition();
  if (!recognition) {
    setVoiceSearchNotice('⚠️ Trình duyệt này chưa hỗ trợ tìm kiếm bằng giọng nói.', 5000);
    toast('⚠️ Trình duyệt này chưa hỗ trợ tìm kiếm bằng giọng nói.');
    return false;
  }

  if (window.hdVoiceReloadHint && typeof window.hdVoiceReloadHint.dismiss === 'function') {
    window.hdVoiceReloadHint.dismiss();
  }

  window.hdVoiceMusicPaused = true;
  clearVoiceTimers();
  hdVoiceQueuedText = hdVoiceFinalText = hdVoiceLastText = '';

  const session = window.hdVoiceAudio.begin(recognition, () => {
    if (hdMainVoiceSession !== session) return;
    const text = hdVoiceClosing ? hdVoiceQueuedText : (hdVoiceLastText || hdVoiceQueuedText);
    clearVoiceTimers();
    hdMainVoiceSession = hdVoiceRecognition = null;
    hdVoiceClosing = false;
    hdVoiceQueuedText = '';
    setVoiceSearchListening(false);

    // APTV/CarPlay có thể báo document.hidden dù màn hình xe vẫn đang mở; chỉ bỏ khi pagehide thật sự
    if (text && !session.cancelled && !session.failed && !session.audio.pageHidden) {
      hdSubmitVoiceSearch(text);
    } else if (session.timedOut) {
      setVoiceSearchNotice('⏱ Đã hết thời gian lắng nghe. Bấm Giọng nói để thử lại.', 5000);
    } else if (session.cancelled) {
      setVoiceSearchNotice('Đã dừng tìm kiếm bằng giọng nói.', 3500);
    } else if (!session.failed) {
      setVoiceSearchNotice('Đã kết thúc lắng nghe. Chưa nghe rõ tên bài hát, mời bạn bấm thử lại.', 5000);
    }
  }, {
    resumePlayback: false,
    onstalled: () => {
      hdTraceVoiceAudio('microphone_close_stalled');
      setVoiceSearchNotice('⚠️ Trình duyệt chưa báo đóng microphone. Bấm lại Giọng nói để dừng; nếu vẫn kẹt hãy tải lại trang.', 8000);
    }
  });

  if (!session) {
    window.hdVoiceMusicPaused = false;
    return false;
  }

  hdMainVoiceSession = session;
  hdVoiceRecognition = recognition;
  hdVoiceClosing = false;

  // Trên iOS / APTV chỉ nhận 1 câu (continuous = false) để nhả kênh Bluetooth HFP ngay lập tức
  recognition.lang = 'vi-VN';
  recognition.continuous = !HD_BLUETOOTH_NATIVE_ONLY;
  recognition.interimResults = true;
  recognition.maxAlternatives = 1;

  recognition.onstart = () => {
    if (session.closing) return;
    hdTraceVoiceAudio('microphone_start');
    setVoiceSearchListening(true);
    setVoiceSearchNotice('🎙 Đang lắng nghe... Xin mời bạn đọc tên bài hát hoặc ca sĩ (Bấm lại để dừng)');
  };

  recognition.onresult = (event) => {
    if (hdMainVoiceSession !== session || session.closing || hdVoiceSearchSubmitting) return;
    clearVoiceTimers();
    let finalText = '';
    let interimText = '';
    for (let i = 0; i < event.results.length; i++) {
      const res = event.results[i];
      if (!res || !res[0]) continue;
      if (res.isFinal) finalText += (res[0].transcript || '') + ' ';
      else interimText += (res[0].transcript || '') + ' ';
    }
    const text = (finalText + interimText).trim().replace(/\s+/g, ' ');
    if (!text) return;

    hdVoiceLastText = text;
    hdVoiceFinalText = finalText.trim();
    hdTraceVoiceAudio('voice_result', interimText.trim() ? 'interim' : 'final');

    const input = document.getElementById('searchInput');
    if (input) input.value = text;
    setVoiceSearchNotice(`🎙 Đang nghe: "${text}"`);

    if (hdVoiceFinalText) {
      hdVoiceQueuedText = hdVoiceFinalText;
      if (!interimText.trim()) {
        if (!recognition.continuous) closeVoiceSession();
        else finishVoiceSearchWithDelay(hdVoiceFinalText);
      }
    } else if (recognition.continuous) {
      finishVoiceSearchWithDelay(text);
    }
  };

  recognition.onerror = (event) => {
    if (session.closing) return;
    session.failed = true;
    const errCode = (event && event.error) || 'unknown';
    hdTraceVoiceAudio('voice_error', errCode);
    hdVoiceQueuedText = hdVoiceLastText = '';
    if (errCode === 'no-speech') {
      setVoiceSearchNotice('⚠️ Chưa nghe được nội dung. Bấm Giọng nói để nói lại.', 5000);
    } else if (errCode === 'not-allowed' || errCode === 'service-not-allowed') {
      setVoiceSearchNotice('⚠️ Chưa được cấp quyền Microphone. Hãy cho phép quyền Mic trên trình duyệt/iPhone.', 7000);
      toast('⚠️ Vui lòng cấp quyền Microphone cho trình duyệt');
    } else {
      setVoiceSearchNotice('⚠️ Không thể nhận giọng nói. Kiểm tra kết nối hoặc quyền Microphone rồi thử lại.', 6000);
    }
    closeVoiceSession();
  };

  setVoiceSearchNotice('🎙 Đang chuẩn bị lắng nghe, xin mời bạn đọc tên bài hát...');
  try {
    recognition.start();
  } catch (e) {
    hdTraceVoiceAudio('microphone_start_failed');
    session.failed = true;
    hdVoiceClosing = true;
    window.hdVoiceAudio.startFailed(session);
    setVoiceSearchNotice('⚠️ Không thể bật microphone. Bấm Giọng nói để thử lại.', 5000);
  }
  return false;
}
window.toggleVoiceSearch = toggleVoiceSearch;

function hdStartCinemaVoiceSearch() {
  if (document.body.classList.contains('cinema')) {
    document.body.classList.remove('cinema');
    exitPageFullscreen();
  }
  toggleVoiceSearch();
  return false;
}
window.hdStartCinemaVoiceSearch = hdStartCinemaVoiceSearch;

/* =========================================================================
   HD_VOICE_CLEAN_DOCUMENT_RELOAD_V15: TẢI LẠI DOCUMENT SẠCH & PHÁT 1 CHẠM RA LOA XE
   (Xử lý triệt để 100% lỗi kẹt AVAudioSession PlayAndRecord sau khi mở Mic trên iOS/CarPlay)
   ========================================================================= */

let hdPlayerReloadRequest = null;

function formatYoutubeTime(sec) {
  sec = Math.max(0, Math.floor(Number(sec) || 0));
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  if (h > 0) {
    return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }
  return `${m}:${String(s).padStart(2, '0')}`;
}

function hdReloadButtonBusy(busy) {
  ['btnReloadYoutube', 'cinemaReloadBtn'].forEach((id) => {
    const btn = document.getElementById(id);
    if (!btn) return;
    btn.disabled = !!busy;
    btn.setAttribute('aria-busy', busy ? 'true' : 'false');
  });
}

function hdDismissPlayerReload() {
  const req = hdPlayerReloadRequest;
  if (req && req.timer) clearTimeout(req.timer);
  hdPlayerReloadRequest = null;
  hdReloadButtonBusy(false);
  const modal = document.getElementById('hdPlayerReloadModal');
  if (modal) {
    modal.hidden = true;
    modal.classList.remove('open');
    modal.style.display = 'none';
    modal.setAttribute('aria-hidden', 'true');
  }
  return req;
}

window.hdClosePlayerReload = function () {
  hdDismissPlayerReload();
  if (!isTouchMode() && typeof autoHighlightFirstSongInRotary === 'function') {
    setTimeout(() => autoHighlightFirstSongInRotary(), 80);
  }
  return false;
};

function hdShowPlayerReload(request) {
  const modal = document.getElementById('hdPlayerReloadModal');
  if (!modal || hdPlayerReloadRequest !== request) return;
  const headingEl = document.getElementById('hdReloadModalHeading');
  const titleEl = document.getElementById('hdReloadSongTitle');
  const descEl = document.getElementById('hdReloadModalDesc');
  const timeEl = document.getElementById('hdReloadSavedTime');
  const restartBtn = document.getElementById('hdReloadRestartBtn');
  const cancelBtn = document.getElementById('hdReloadCancelBtn');

  const isVoiceSearch = (request.mode === 'voice_search');

  if (headingEl) {
    headingEl.textContent = isVoiceSearch
      ? `🎤 Đã tìm: "${request.query || 'Giọng nói'}"`
      : '🔊 Khôi phục Âm thanh Loa Xe';
  }
  if (titleEl) {
    titleEl.textContent = request.title || 'Bài hát đã chọn';
  }
  if (descEl) {
    descEl.textContent = isVoiceSearch
      ? 'Kênh âm thanh CarPlay đã được làm mới 100% sau khi tắt Mic. Bấm nút xanh bên dưới (hoặc ấn Enter) để phát ngay ra loa xe:'
      : 'Kênh âm thanh đã được làm mới hoàn toàn. Bấm tiếp tục để phát ra loa xe với âm lượng tối đa:';
  }
  if (timeEl) {
    timeEl.textContent = (request.time > 0)
      ? ('Tiếp tục phát từ ' + formatYoutubeTime(request.time))
      : 'PHÁT NGAY RA LOA XE';
  }
  if (restartBtn) {
    restartBtn.style.display = (request.time > 0) ? 'inline-flex' : 'none';
  }
  if (cancelBtn) {
    cancelBtn.textContent = isVoiceSearch ? '📋 Chọn bài khác trong danh sách' : 'Đóng';
  }

  modal.hidden = false;
  modal.style.display = 'grid';
  modal.classList.add('open');
  modal.setAttribute('aria-hidden', 'false');

  const continueBtn = document.getElementById('hdReloadContinue');
  if (continueBtn) {
    setTimeout(() => {
      try { continueBtn.focus({ preventScroll: true }); } catch (e) {}
    }, 40);
  }
}

window.hdConfirmPlayerReload = function (fromStart) {
  const request = hdPlayerReloadRequest;
  if (!request) {
    hdDismissPlayerReload();
    return false;
  }
  if (window.hdVoiceBusy && window.hdVoiceBusy()) return false;

  const pos = fromStart ? 0 : Math.max(0, Math.floor(Number(request.time) || 0));
  const targetItem = request.song || current || findItem(request.id);

  // Ép chuyển đổi trạng thái AudioSession về Playback ngay trong User Gesture
  forceWebKitPlaybackSession();
  if (window.hdVoiceAudio && typeof window.hdVoiceAudio.allowPlayback === 'function') {
    window.hdVoiceAudio.allowPlayback();
  }
  hdDismissPlayerReload();

  if (targetItem && targetItem.id) {
    play(targetItem, true, pos);
    toast(pos > 0 ? `🔊 Đã phát tiếp ra loa xe (${formatYoutubeTime(pos)})` : `🔊 Đang phát: ${targetItem.title || targetItem.id}`);
  }
  return false;
};

function hdHandlePlayerReloadReady(event) {
  const request = hdPlayerReloadRequest;
  if (!request || !request.id) return false;
  if (request.timer) clearTimeout(reqTimer(request));
  request.ready = true;
  hdReloadButtonBusy(false);

  try {
    if (typeof event.target.unMute === 'function') {
      event.target.unMute();
    }
    if (typeof event.target.setVolume === 'function') {
      event.target.setVolume(request.volume || 100);
    }
  } catch (e) {}

  if (request.ask) {
    try {
      if (typeof event.target.cueVideoById === 'function') {
        event.target.cueVideoById({ videoId: request.id, startSeconds: request.time || 0 });
      }
    } catch (e) {}
    hdShowPlayerReload(request);
  } else {
    hdDismissPlayerReload();
    try {
      event.target.playVideo();
      toast('🔊 Đã làm mới trình phát & khôi phục âm thanh!');
    } catch (e) {}
  }
  return true;
}

function reqTimer(req) {
  return req && req.timer ? req.timer : null;
}

window.hdReloadYoutubePlayer = function () {
  if (window.hdVoiceReloadHint && typeof window.hdVoiceReloadHint.dismiss === 'function') {
    window.hdVoiceReloadHint.dismiss();
  }
  if (window.hdVoiceBusy && window.hdVoiceBusy()) {
    toast('⚠️ Hãy kết thúc tìm kiếm bằng giọng nói trước khi khôi phục âm thanh.');
    return false;
  }
  if (!current || !current.id) {
    toast('⚠️ Chưa có bài hát nào đang phát để tải lại.');
    return false;
  }

  let position = 0;
  let duration = 0;

  try {
    if (ytPlayer) {
      if (typeof ytPlayer.getCurrentTime === 'function') position = Math.max(0, Math.floor(ytPlayer.getCurrentTime() || 0));
      if (typeof ytPlayer.getDuration === 'function') duration = Math.max(0, Math.floor(ytPlayer.getDuration() || 0));
    }
  } catch (e) {}

  if (duration > 0 && position >= duration - 2) position = 0;

  // Lưu trạng thái bài đang nghe & giây hiện tại vào sessionStorage rồi tải lại Document mới tinh
  // để iOS WebKit giải phóng 100% kênh PlayAndRecord (nếu trước đó đã mở Mic)
  try {
    localStorage.setItem('aptv_car_mode', getCarMode());
    const searchInput = document.getElementById('searchInput');
    sessionStorage.setItem(HD_VOICE_READY_STORAGE_KEY, JSON.stringify({
      mode: 'manual_reload',
      query: searchInput ? searchInput.value.trim() : '',
      results: (state.playlist && state.playlist.length > 0) ? state.playlist.slice(0, 25) : [],
      song: current,
      time: position,
      ts: Date.now()
    }));
    hdReloadButtonBusy(true);
    toast('🔄 Đang làm mới kênh âm thanh loa xe...');
    setTimeout(() => {
      window.location.replace(window.location.pathname + '?vr=' + Date.now());
    }, 80);
    return false;
  } catch (e) {
    console.warn('Fallback reload iframe:', e);
  }

  play(current, false, position);
  return false;
};

/* =========================================================================
   HD_VOICE_RELOAD_HINT_V1: BONG BÓNG HƯỚNG DẪN KHÔI PHỤC ÂM THANH SAU VOICE SEARCH
   ========================================================================= */

(function initVoiceReloadHintModule() {
  let pendingVoice = false;
  let active = false;
  let frame = 0;

  function getTargetButton() {
    if (document.body.classList.contains('cinema')) {
      return document.getElementById('cinemaReloadBtn');
    }
    return document.getElementById('btnReloadYoutube');
  }

  function dismiss() {
    pendingVoice = false;
    active = false;
    const hint = document.getElementById('hdVoiceReloadHint');
    if (hint) hint.hidden = true;
    ['btnReloadYoutube', 'cinemaReloadBtn'].forEach((id) => {
      const b = document.getElementById(id);
      if (b) b.classList.remove('hd-voice-reload-target');
    });
  }

  function position() {
    frame = 0;
    const hint = document.getElementById('hdVoiceReloadHint');
    const button = getTargetButton();
    if (!active || !hint || !button) return;

    const rect = button.getBoundingClientRect();
    const width = window.innerWidth;
    const height = window.innerHeight;
    if (!rect.width || !rect.height || rect.bottom <= 0 || rect.top >= height) {
      hint.hidden = true;
      return;
    }

    const size = Math.max(220, Math.min(350, width - 24));
    hint.style.width = size + 'px';
    hint.hidden = false;

    const center = rect.left + rect.width / 2;
    const left = Math.max(12, Math.min(center - size / 2, width - size - 12));
    hint.style.left = Math.round(left) + 'px';

    const hintHeight = hint.getBoundingClientRect().height || 68;
    if (rect.top > hintHeight + 20) {
      hint.classList.remove('arrow-top');
      hint.style.top = Math.round(rect.top - hintHeight - 12) + 'px';
    } else {
      hint.classList.add('arrow-top');
      hint.style.top = Math.round(rect.bottom + 12) + 'px';
    }
    hint.style.setProperty('--hd-hint-arrow', Math.max(18, Math.min(size - 18, center - left)) + 'px');
  }

  function schedule() {
    if (!active || frame) return;
    frame = window.requestAnimationFrame ? window.requestAnimationFrame(position) : setTimeout(position, 16);
  }

  function activateNow() {
    pendingVoice = false;
    active = true;
    ['btnReloadYoutube', 'cinemaReloadBtn'].forEach((id) => {
      const b = document.getElementById(id);
      if (b) b.classList.add('hd-voice-reload-target');
    });
    setTimeout(schedule, 220);
  }

  window.hdVoiceReloadHint = {
    searchStarted: function (fromVoice) {
      dismiss();
      pendingVoice = (fromVoice === true);
    },
    selected: function (element, event) {
      if (!pendingVoice) return;
      activateNow();
    },
    activateNow: activateNow,
    dismiss: dismiss
  };

  window.addEventListener('resize', schedule, { passive: true });
  window.addEventListener('scroll', schedule, { passive: true });
})();

/* =========================================================================
   GÁN NÚT VÔ-LĂNG / BLUETOOTH GỌI VOICE SEARCH RẢNH TAY
   ========================================================================= */

const HD_BT_VOICE_STORAGE_KEY = 'aptv_bt_voice_binding_v1';
let hdBluetoothVoiceBinding = null;
let hdBluetoothButtonCapture = { active: false, candidate: null, timer: null };

try {
  const savedBt = localStorage.getItem(HD_BT_VOICE_STORAGE_KEY);
  if (savedBt) hdBluetoothVoiceBinding = JSON.parse(savedBt);
} catch (e) {}

function hdBluetoothButtonLabel(binding) {
  if (!binding) return 'Chưa gán';
  return `${binding.type === 'media' ? 'Nút Media' : 'Phím cứng'} [${binding.value}]`;
}

function hdUpdateBluetoothStatusUI() {
  const status = document.getElementById('hdBluetoothCaptureStatus');
  const saveBtn = document.getElementById('hdBluetoothSaveButton');
  if (!status) return;
  if (hdBluetoothButtonCapture.active) {
    status.textContent = '⏳ Đang chờ... Hãy bấm 1 nút trên vô lăng hoặc tẩu Bluetooth trong 10 giây.';
  } else if (hdBluetoothButtonCapture.candidate) {
    status.textContent = `✅ Đã nhận: ${hdBluetoothButtonLabel(hdBluetoothButtonCapture.candidate)}. Bấm "Gán nút này" để lưu.`;
    if (saveBtn) saveBtn.disabled = false;
  } else if (hdBluetoothVoiceBinding) {
    status.textContent = `🎧 Đang dùng: ${hdBluetoothButtonLabel(hdBluetoothVoiceBinding)} để bật Tìm kiếm Giọng nói.`;
    if (saveBtn) saveBtn.disabled = true;
  } else {
    status.textContent = 'Chưa gán nút cứng. Bạn có thể gán nút trên vô lăng hoặc tẩu Bluetooth để bật nhanh Voice Search.';
    if (saveBtn) saveBtn.disabled = true;
  }
}

window.hdStartCaptureBluetoothButton = function () {
  if (hdBluetoothButtonCapture.timer) clearTimeout(hdBluetoothButtonCapture.timer);
  hdBluetoothButtonCapture.active = true;
  hdBluetoothButtonCapture.candidate = null;
  hdUpdateBluetoothStatusUI();
  hdBluetoothButtonCapture.timer = setTimeout(() => {
    hdBluetoothButtonCapture.active = false;
    hdUpdateBluetoothStatusUI();
  }, 10000);
  return false;
};

window.hdSaveCapturedBluetoothButton = function () {
  if (!hdBluetoothButtonCapture.candidate) return false;
  hdBluetoothVoiceBinding = hdBluetoothButtonCapture.candidate;
  hdBluetoothButtonCapture.candidate = null;
  hdBluetoothButtonCapture.active = false;
  try {
    localStorage.setItem(HD_BT_VOICE_STORAGE_KEY, JSON.stringify(hdBluetoothVoiceBinding));
  } catch (e) {}
  hdUpdateBluetoothStatusUI();
  toast('🎧 Đã lưu nút mở Tìm kiếm Giọng nói!');
  return false;
};

window.hdClearBluetoothVoiceBinding = function () {
  hdBluetoothVoiceBinding = null;
  hdBluetoothButtonCapture.candidate = null;
  hdBluetoothButtonCapture.active = false;
  try {
    localStorage.removeItem(HD_BT_VOICE_STORAGE_KEY);
  } catch (e) {}
  hdUpdateBluetoothStatusUI();
  toast('Đã xóa nút tắt Giọng nói.');
  return false;
};

function hdTryCaptureOrRouteKey(e) {
  const ignoredKeys = ['Shift', 'Control', 'Alt', 'Meta', 'Tab', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Enter', ' ', 'Escape'];
  if (hdBluetoothButtonCapture.active) {
    if (ignoredKeys.includes(e.key)) return false;
    e.preventDefault();
    e.stopPropagation();
    if (hdBluetoothButtonCapture.timer) clearTimeout(hdBluetoothButtonCapture.timer);
    hdBluetoothButtonCapture.active = false;
    hdBluetoothButtonCapture.candidate = { type: 'key', value: e.code || e.key };
    hdUpdateBluetoothStatusUI();
    toast('🎧 Đã nhận phím: ' + (e.code || e.key));
    return true;
  }
  if (hdBluetoothVoiceBinding && hdBluetoothVoiceBinding.type === 'key') {
    const activeTag = document.activeElement ? document.activeElement.tagName : '';
    if (activeTag === 'INPUT' || activeTag === 'TEXTAREA' || activeTag === 'SELECT') return false;
    if ((e.code || e.key) === hdBluetoothVoiceBinding.value) {
      e.preventDefault();
      e.stopPropagation();
      if (!window.hdVoiceBusy() && !hdVoiceSearchSubmitting) {
        toggleVoiceSearch();
      }
      return true;
    }
  }
  return false;
}

function initVoiceSearch() {
  hdUpdateBluetoothStatusUI();
  window.addEventListener('pagehide', stopVoiceSearch);
}
function initRotarySmartSearch() {}

/* =========================================================================
   BỘ ĐIỀU KHIỂN CON LĂN MAZDA / BMW / MERCEDES THÔNG MINH (CHỐNG TRƯỢT & CHỐNG KẸT)
   ========================================================================= */

let currentRotaryIndex = -1;
let rotaryThrottleTimer = 0;
let rotaryDeltaAccum = 0;
const ROTARY_COOLDOWN_MS = 140; // Độ trễ chuẩn 140ms giúp xoay 1 nấc = nhảy đúng 1 bài hát

function getRotaryPageTargets() {
  const targets = [];
  const modePill = document.getElementById('modePillBadge');
  const userBadge = document.getElementById('userBadge');
  const searchInput = document.getElementById('searchInput');
  const searchBtn = document.getElementById('btnTextSearch');
  const voiceBtn = document.getElementById('btnVoiceSearch');

  if (modePill && modePill.offsetParent !== null) targets.push(modePill);
  if (userBadge && userBadge.style.display !== 'none' && userBadge.offsetParent !== null) targets.push(userBadge);
  if (searchInput && searchInput.offsetParent !== null) targets.push(searchInput);
  if (searchBtn && searchBtn.offsetParent !== null) targets.push(searchBtn);
  if (voiceBtn && voiceBtn.offsetParent !== null) targets.push(voiceBtn);

  const songItems = Array.from(document.querySelectorAll('#results .item[data-play-id]'));
  targets.push(...songItems);
  return targets;
}

function setRotaryFocus(targetOrIndex, shouldScroll = true) {
  const targets = getRotaryPageTargets();
  if (!targets.length) return;

  let index = -1;
  let targetEl = null;

  if (typeof targetOrIndex === 'number') {
    index = Math.max(0, Math.min(targetOrIndex, targets.length - 1));
    targetEl = targets[index];
  } else if (targetOrIndex && targetOrIndex.nodeType) {
    index = targets.indexOf(targetOrIndex);
    targetEl = targetOrIndex;
  }

  if (!targetEl) return;
  currentRotaryIndex = index;

  document.querySelectorAll('.rotary-focused').forEach(el => el.classList.remove('rotary-focused'));
  targetEl.classList.add('rotary-focused');

  try {
    targetEl.focus({ preventScroll: true });
  } catch (e) {
    try { targetEl.focus(); } catch (err) {}
  }

  if (shouldScroll) {
    if (targetEl.classList.contains('item')) {
      targetEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } else {
      targetEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }
}

function stepRotaryFocus(direction) {
  if (isTouchMode()) return;
  if (document.body.classList.contains('cinema')) return;

  const openModal = document.querySelector('.modal-back.open');
  if (openModal) return;

  const targets = getRotaryPageTargets();
  if (!targets.length) return;

  let activeIdx = targets.indexOf(document.activeElement);
  if (activeIdx < 0) {
    activeIdx = targets.findIndex(el => el.classList.contains('rotary-focused'));
  }

  let newIdx;
  if (activeIdx < 0) {
    const firstSongIdx = targets.findIndex(el => el.classList.contains('item'));
    newIdx = firstSongIdx >= 0 ? firstSongIdx : 0;
  } else {
    newIdx = activeIdx + direction;
  }

  if (newIdx < 0) newIdx = 0;
  if (newIdx >= targets.length) newIdx = targets.length - 1;

  setRotaryFocus(newIdx, true);
}

function autoHighlightFirstSongInRotary() {
  if (isTouchMode()) return;
  if (document.body.classList.contains('cinema')) return;
  setTimeout(() => {
    const firstSong = document.querySelector('#results .item');
    if (firstSong && !document.activeElement?.closest('#results') && document.activeElement?.id !== 'searchInput') {
      setRotaryFocus(firstSong, false);
    }
  }, 120);
}

function initCinemaControls() {
  const exitBtn = document.getElementById('cinemaExitBtn');
  if (exitBtn) exitBtn.onclick = exitCinemaMode;

  const handleFullscreenChange = () => {
    const isFs = !!(document.fullscreenElement || document.webkitFullscreenElement || document.mozFullScreenElement);
    if (!isFs && document.body.classList.contains('cinema')) {
      exitCinemaMode();
    }
  };
  document.addEventListener('fullscreenchange', handleFullscreenChange);
  document.addEventListener('webkitfullscreenchange', handleFullscreenChange);

  // 1. LẮNG NGHE PHÍM CỨNG VÔ LĂNG & NÚM XOAY MAZDA / BMW / MERCEDES (KEYDOWN)
  document.addEventListener('keydown', (e) => {
    if (hdTryCaptureOrRouteKey(e)) return;

    // Phím Back / Escape trên vô lăng hoặc xe: đóng modal / thoát toàn màn hình
    if (e.key === 'Escape' || e.key === 'BrowserBack' || e.key === 'GoBack') {
      if (hdMainVoiceSession) {
        stopVoiceSearch();
        return;
      }
      if (hdPlayerReloadRequest) {
        window.hdClosePlayerReload();
        return;
      }
      const openModal = document.querySelector('.modal-back.open');
      if (openModal) {
        if (openModal.id !== 'authModal') {
          openModal.classList.remove('open');
          openModal.style.display = 'none';
        }
      } else if (document.body.classList.contains('cinema')) {
        exitCinemaMode();
      }
      return;
    }

    // ƯU TIÊN SỐ 1: KHI MODAL PHÁT NHẠC / KHÔI PHỤC ÂM THANH ĐANG MỞ (#hdPlayerReloadModal)
    if (hdPlayerReloadRequest) {
      const modalEl = document.getElementById('hdPlayerReloadModal');
      if (modalEl && modalEl.classList.contains('open')) {
        const modalBtns = Array.from(modalEl.querySelectorAll('button')).filter(b => b.offsetParent !== null && !b.classList.contains('iconbtn'));
        const curIdx = modalBtns.indexOf(document.activeElement);
        if (e.key === 'ArrowRight' || e.key === 'ArrowDown' || (e.key === 'Tab' && !e.shiftKey)) {
          e.preventDefault();
          e.stopPropagation();
          const next = modalBtns[(curIdx < 0 ? 0 : curIdx + 1) % modalBtns.length];
          if (next) try { next.focus({ preventScroll: true }); } catch (err) {}
          return;
        }
        if (e.key === 'ArrowLeft' || e.key === 'ArrowUp' || (e.key === 'Tab' && e.shiftKey)) {
          e.preventDefault();
          e.stopPropagation();
          const prev = modalBtns[curIdx <= 0 ? modalBtns.length - 1 : curIdx - 1];
          if (prev) try { prev.focus({ preventScroll: true }); } catch (err) {}
          return;
        }
        if (e.key === 'Enter' || e.key === ' ' || e.key === 'NumpadEnter') {
          e.preventDefault();
          e.stopPropagation();
          if (document.activeElement && document.activeElement.id === 'hdReloadCancelBtn') {
            window.hdClosePlayerReload();
          } else if (document.activeElement && document.activeElement.id === 'hdReloadRestartBtn') {
            window.hdConfirmPlayerReload(true);
          } else {
            window.hdConfirmPlayerReload(false);
          }
          return;
        }
      }
    }

    // A. KHI ĐANG XEM TOÀN MÀN HÌNH (CINEMA MODE)
    if (document.body.classList.contains('cinema')) {
      const btns = getCinemaBarButtons();
      if (!btns.length) return;
      const currentIdx = btns.indexOf(document.activeElement);

      if (e.key === 'ArrowRight' || e.key === 'ArrowDown' || (e.key === 'Tab' && !e.shiftKey)) {
        e.preventDefault();
        e.stopPropagation();
        focusCinemaButton(currentIdx < 0 ? 0 : (currentIdx + 1) % btns.length);
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp' || (e.key === 'Tab' && e.shiftKey)) {
        e.preventDefault();
        e.stopPropagation();
        focusCinemaButton(currentIdx <= 0 ? btns.length - 1 : currentIdx - 1);
      } else if (e.key === 'Enter' || e.key === ' ' || e.key === 'NumpadEnter') {
        e.preventDefault();
        if (currentIdx >= 0) btns[currentIdx].click();
        else focusCinemaButton(0);
      }
      return;
    }

    // B. KHI ĐANG Ở TRANG CHÍNH (CHẾ ĐỘ XE CON LĂN)
    if (isTouchMode()) return;
    if (document.querySelector('.modal-back.open')) return;

    // Xoay sang phải / gạt xuống / Tab: nhảy tới phần tử kế tiếp
    if (e.key === 'ArrowDown' || (e.key === 'Tab' && !e.shiftKey)) {
      e.preventDefault();
      stepRotaryFocus(1);
      return;
    }
    // Xoay sang trái / gạt lên / Shift+Tab: lùi về phần tử trước
    if (e.key === 'ArrowUp' || (e.key === 'Tab' && e.shiftKey)) {
      e.preventDefault();
      stepRotaryFocus(-1);
      return;
    }
    // PageDown / PageUp: nhảy nhanh 3 bài
    if (e.key === 'PageDown') {
      e.preventDefault();
      stepRotaryFocus(3);
      return;
    }
    if (e.key === 'PageUp') {
      e.preventDefault();
      stepRotaryFocus(-3);
      return;
    }
    // Home / End:
    if (e.key === 'Home') {
      e.preventDefault();
      setRotaryFocus(0);
      return;
    }
    if (e.key === 'End') {
      e.preventDefault();
      const targets = getRotaryPageTargets();
      setRotaryFocus(targets.length - 1);
      return;
    }
    // Gạt ngang trên hàng tìm kiếm:
    if (e.key === 'ArrowRight') {
      const searchInput = document.getElementById('searchInput');
      const searchBtn = document.getElementById('btnTextSearch');
      const voiceBtn = document.getElementById('btnVoiceSearch');
      if (document.activeElement === searchInput && searchBtn) {
        e.preventDefault();
        setRotaryFocus(searchBtn);
        return;
      }
      if (document.activeElement === searchBtn && voiceBtn) {
        e.preventDefault();
        setRotaryFocus(voiceBtn);
        return;
      }
    }
    if (e.key === 'ArrowLeft') {
      const searchInput = document.getElementById('searchInput');
      const searchBtn = document.getElementById('btnTextSearch');
      const voiceBtn = document.getElementById('btnVoiceSearch');
      if (document.activeElement === voiceBtn && searchBtn) {
        e.preventDefault();
        setRotaryFocus(searchBtn);
        return;
      }
      if (document.activeElement === searchBtn && searchInput) {
        e.preventDefault();
        setRotaryFocus(searchInput);
        return;
      }
    }
    // Nhấn núm xoay (Enter / Space / NumpadEnter):
    if (e.key === 'Enter' || e.key === ' ' || e.key === 'NumpadEnter') {
      const active = document.activeElement;
      if (active && active.classList && active.classList.contains('item')) {
        e.preventDefault();
        active.click();
        return;
      }
    }
  });

  // 2. LẮNG NGHE SỰ KIỆN XOAY CON LĂN (WHEEL) - CHỐNG TRƯỢT & BỎ QUA BÀI HÁT
  window.addEventListener('wheel', (e) => {
    if (hdPlayerReloadRequest) {
      const modalEl = document.getElementById('hdPlayerReloadModal');
      if (modalEl && modalEl.classList.contains('open')) {
        e.preventDefault();
        const modalBtns = Array.from(modalEl.querySelectorAll('button')).filter(b => b.offsetParent !== null && !b.classList.contains('iconbtn'));
        if (!modalBtns.length) return;
        const curIdx = modalBtns.indexOf(document.activeElement);
        if (e.deltaY > 15 || e.deltaX > 15) {
          const next = modalBtns[(curIdx < 0 ? 0 : curIdx + 1) % modalBtns.length];
          if (next) try { next.focus({ preventScroll: true }); } catch (err) {}
        } else if (e.deltaY < -15 || e.deltaX < -15) {
          const prev = modalBtns[curIdx <= 0 ? modalBtns.length - 1 : curIdx - 1];
          if (prev) try { prev.focus({ preventScroll: true }); } catch (err) {}
        }
        return;
      }
    }

    // Nếu đang xem toàn màn hình
    if (document.body.classList.contains('cinema')) {
      const btns = getCinemaBarButtons();
      if (!btns.length) return;
      const currentIdx = btns.indexOf(document.activeElement);
      if (e.deltaY > 15 || e.deltaX > 15) {
        focusCinemaButton(currentIdx < 0 ? 0 : (currentIdx + 1) % btns.length);
      } else if (e.deltaY < -15 || e.deltaX < -15) {
        focusCinemaButton(currentIdx <= 0 ? btns.length - 1 : currentIdx - 1);
      }
      return;
    }

    if (isTouchMode()) return;
    if (document.querySelector('.modal-back.open')) return;

    // Ngăn chặn cuộn trang tự do bằng pixel làm trượt qua bài hát
    e.preventDefault();

    const rawDelta = Math.abs(e.deltaY) >= Math.abs(e.deltaX) ? e.deltaY : e.deltaX;
    rotaryDeltaAccum += rawDelta;

    const now = Date.now();
    if (now - rotaryThrottleTimer < ROTARY_COOLDOWN_MS) {
      return;
    }

    if (Math.abs(rotaryDeltaAccum) < 6) return;

    const dir = rotaryDeltaAccum > 0 ? 1 : -1;
    rotaryDeltaAccum = 0;
    rotaryThrottleTimer = now;

    stepRotaryFocus(dir);
  }, { passive: false });

  // Đồng bộ tiêu điểm khi người dùng chạm hoặc click
  document.addEventListener('focusin', (e) => {
    if (e.target && e.target.classList && e.target.classList.contains('item')) {
      document.querySelectorAll('.rotary-focused').forEach(el => el.classList.remove('rotary-focused'));
      e.target.classList.add('rotary-focused');
    }
  });
}

function initRotaryKnobScroll() {}

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

  // KHÔI PHỤC TỨC THÌ (0MS) TỪ VOICE SEARCH HOẶC MANUAL RELOAD TRÊN DOCUMENT MỚI TINH
  let restoredVoicePayload = null;
  try {
    const rawVoicePayload = sessionStorage.getItem(HD_VOICE_READY_STORAGE_KEY);
    if (rawVoicePayload) {
      sessionStorage.removeItem(HD_VOICE_READY_STORAGE_KEY);
      const parsed = JSON.parse(rawVoicePayload);
      if (parsed && (!parsed.ts || (Date.now() - parsed.ts < 60000))) {
        restoredVoicePayload = parsed;
      }
    }
    if (window.location.search && window.location.search.indexOf('vr=') !== -1 && window.history && window.history.replaceState) {
      const cleanParams = new URLSearchParams(window.location.search);
      cleanParams.delete('vr');
      const qs = cleanParams.toString();
      window.history.replaceState({}, '', window.location.pathname + (qs ? '?' + qs : ''));
    }
  } catch (e) {}

  if (restoredVoicePayload) {
    if (Array.isArray(restoredVoicePayload.results) && restoredVoicePayload.results.length > 0) {
      state.playlist = restoredVoicePayload.results;
      saveState();
    }
    if (restoredVoicePayload.query) {
      const searchInput = document.getElementById('searchInput');
      if (searchInput) searchInput.value = restoredVoicePayload.query;
    }
    const targetSong = restoredVoicePayload.song || (state.playlist && state.playlist[0]) || null;
    if (targetSong && targetSong.id) {
      current = targetSong;
      currentIndex = state.playlist ? state.playlist.findIndex(x => x.id === targetSong.id) : 0;
      const nowPlayingTitle = document.getElementById('nowPlayingTitle');
      if (nowPlayingTitle) nowPlayingTitle.textContent = targetSong.title || targetSong.id;

      // Đặt sẵn src của iframe YouTube vào bài hát vừa tìm được trước khi khởi tạo YT.Player
      const frame = document.getElementById('ytPlayerFrame');
      if (frame) {
        const originParam = (location.origin && location.origin !== 'null')
          ? `&origin=${encodeURIComponent(location.origin)}`
          : '';
        const startSec = Math.max(0, Math.floor(Number(restoredVoicePayload.time) || 0));
        const startParam = startSec > 0 ? `&start=${startSec}` : '';
        frame.src = `https://www.youtube.com/embed/${encodeURIComponent(targetSong.id)}?enablejsapi=1&playsinline=1&rel=0&autoplay=0${startParam}${originParam}`;
      }

      hdPlayerReloadRequest = {
        id: targetSong.id,
        title: targetSong.title || 'Bài hát đã chọn',
        song: targetSong,
        query: restoredVoicePayload.query || '',
        mode: restoredVoicePayload.mode || 'voice_search',
        time: Math.max(0, Math.floor(Number(restoredVoicePayload.time) || 0)),
        volume: 100,
        muted: false,
        ask: true,
        ready: false
      };
    }
  }

  const initialCarMode = getCarMode();
  applyCarMode(initialCarMode);
  renderAll();
  initVoiceSearch();
  initRotarySmartSearch();
  initCinemaControls();

  if (hdPlayerReloadRequest) {
    hdShowPlayerReload(hdPlayerReloadRequest);
    if (hdPlayerReloadRequest.mode === 'voice_search' && hdPlayerReloadRequest.query) {
      setVoiceSearchNotice(`✅ Đã tìm thấy ${state.playlist.length} bài cho "${hdPlayerReloadRequest.query}". Bấm PHÁT NGAY hoặc chọn bài bất kỳ để phát ra loa xe!`, 12000);
    }
  }

  if (window.YT && typeof window.YT.Player === 'function' && typeof window.onYouTubeIframeAPIReady === 'function') {
    window.onYouTubeIframeAPIReady();
  } else if (!document.getElementById('hdYoutubeApiScript')) {
    const script = document.createElement('script');
    script.id = 'hdYoutubeApiScript';
    script.src = 'https://www.youtube.com/iframe_api';
    document.head.appendChild(script);
  }

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
