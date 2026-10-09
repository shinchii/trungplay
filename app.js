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
    { id: 'dQw4w9WgXcQ', title: 'Nhạc Trẻ Remix Sôi Động Hay Nhất', channel: 'Music Official', thumb: 'https://i.ytimg.com/vi/dQw4w9WgXcQ/mqdefault.jpg' }
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
    return { ...defaults, ...JSON.parse(localStorage.getItem(KEY) || '{}') };
  } catch (e) {
    return { ...defaults };
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
  destroyPlayers();
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
const SILENT_WAV = 'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA';
let carPlayAudioAnchor = null;

function initCarPlayAudioAnchor() {
  if (carPlayAudioAnchor) return;
  carPlayAudioAnchor = document.getElementById('carPlayAudioAnchor');
  if (!carPlayAudioAnchor) {
    carPlayAudioAnchor = document.createElement('audio');
    carPlayAudioAnchor.id = 'carPlayAudioAnchor';
    carPlayAudioAnchor.style.display = 'none';
    document.body.appendChild(carPlayAudioAnchor);
  }
  carPlayAudioAnchor.setAttribute('playsinline', '');
  carPlayAudioAnchor.setAttribute('webkit-playsinline', '');
  carPlayAudioAnchor.setAttribute('x-webkit-airplay', 'allow');
  carPlayAudioAnchor.src = SILENT_WAV;
  carPlayAudioAnchor.loop = true;
  carPlayAudioAnchor.volume = 0.01;
}

// HÀM ÉP HỆ THỐNG IOS/SAFARI CHUYỂN ÂM THANH RA LOA XE HƠI THAY VÌ LOA ĐIỆN THOẠI
function forceCarAudioOutput() {
  // 1. Ép Safari iOS sử dụng chế độ phát âm thanh độc quyền (AVAudioSessionCategoryPlayback)
  // Đây là mấu chốt để iOS tự động chuyển toàn bộ âm thanh ra CarPlay / Bluetooth / Cổng USB xe hơi thay vì loa điện thoại
  if ('audioSession' in navigator) {
    try {
      navigator.audioSession.type = 'playback';
    } catch (e) {}
  }

  // 2. Kích hoạt Audio Anchor trên trang chủ để chiếm kênh âm thanh của hệ thống
  try {
    initCarPlayAudioAnchor();
    if (carPlayAudioAnchor) {
      const p = carPlayAudioAnchor.play();
      if (p && typeof p.catch === 'function') {
        p.catch(() => {});
      }
    }
  } catch(e){}

  // 3. Khởi tạo Web Audio Context nếu có để giữ route âm thanh ổn định
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (AudioCtx) {
      if (!window._carAudioCtx) {
        window._carAudioCtx = new AudioCtx();
      }
      if (window._carAudioCtx.state === 'suspended') {
        window._carAudioCtx.resume().catch(() => {});
      }
    }
  } catch(e){}
}

function destroyPlayers() {
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

  const iframe = document.getElementById('ytIframe');
  if (iframe && iframe.contentWindow) {
    iframe.contentWindow.postMessage('{"event":"command","func":"pauseVideo","args":""}', '*');
  }
}

function fallbackIframePlay(videoId, wrap) {
  forceCarAudioOutput();
  const embedUrl = `https://www.youtube.com/embed/${encodeURIComponent(videoId)}?autoplay=1&playsinline=1&rel=0&modestbranding=1&fs=0&enablejsapi=1&origin=${encodeURIComponent(window.location.origin)}`;
  wrap.innerHTML = `
    <iframe id="ytIframe" 
      src="${embedUrl}" 
      allow="accelerometer; autoplay *; encrypted-media *; gyroscope; picture-in-picture; web-share; speaker-selection *;" 
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

  forceCarAudioOutput();
  destroyPlayers();

  current = item;
  currentIndex = state.playlist.findIndex(x => x.id === videoId);

  if (add) addHistory(item);

  const wrap = document.getElementById('playerWrap');
  wrap.innerHTML = `<div id="ytPlayerContainer" style="width:100%;height:100%"></div>`;

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
    if (errCode === 101 || errCode === 150 || errCode === 100 || errCode === 2) {
      toast('⚠️ Video này bị hạn chế phát ngoài YouTube, đang tự chuyển bài kế tiếp...');
      setTimeout(() => playNext(), 1200);
    }
  };

  if (window.YT && window.YT.Player) {
    try {
      ytPlayer = new YT.Player('ytPlayerContainer', {
        videoId: videoId,
        playerVars: {
          autoplay: 1,
          playsinline: 1,
          rel: 0,
          modestbranding: 1,
          fs: 0,
          enablejsapi: 1,
          origin: window.location.origin
        },
        events: {
          onReady: onPlayerReady,
          onStateChange: onPlayerStateChange,
          onError: onPlayerError
        }
      });
    } catch(e) {
      fallbackIframePlay(videoId, wrap);
    }
  } else {
    fallbackIframePlay(videoId, wrap);
  }

  toast('Đang phát: ' + (item.title || videoId));
  renderAll();
  updateMediaSession(item);
  enterCinemaMode(); // TỰ ĐỘNG VÀO FULL SCREEN TOÀN MÀN HÌNH NGAY LẬP TỨC
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

function itemHtml(item) {
  const isPlaying = current && current.id === item.id;
  return `
    <div class="item ${isPlaying ? 'active-play' : ''}" data-play-id="${esc(item.id)}" tabindex="0" title="Bấm để phát toàn màn hình">
      <img class="thumb" src="${esc(item.thumb || ytThumb(item.id))}" loading="lazy">
      <div class="item-info">
        <div class="item-title" title="${esc(item.title || 'YouTube video')}">${esc(item.title || 'YouTube video')}</div>
        <div class="item-sub">${esc(item.channel || 'YouTube')}</div>
      </div>
      <button class="btn-play-item" data-play="${esc(item.id)}" tabindex="0">▶ Phát</button>
    </div>`;
}

function renderAll() {
  // Đồng bộ trạng thái nếu cần
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

        let thumb = '';
        if (Array.isArray(item.videoThumbnails) && item.videoThumbnails.length > 0) {
          thumb = item.videoThumbnails[0].url || item.videoThumbnails[item.videoThumbnails.length - 1].url;
        }
        if (!thumb && item.thumbnail) thumb = item.thumbnail;
        if (!thumb) thumb = ytThumb(id);

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
          thumb: x.snippet?.thumbnails?.medium?.url || ytThumb(x.id?.videoId)
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
        <div>Vui lòng thử lại với từ khóa khác hoặc bấm nút 🎤 Giọng nói.</div>
      </div>`;
  }
  return [];
}

function quickSearch(q) {
  const input = document.getElementById('searchInput');
  if (input) input.value = q;
  search(q);
}
window.quickSearch = quickSearch;

function renderSearchResults(arr) {
  const out = document.getElementById('results');
  if (!out) return;
  const countEl = document.getElementById('resultCount');
  if (countEl) countEl.textContent = arr.length ? `(${arr.length} video)` : '';

  state.playlist = [...arr]; // Lưu danh sách bài hát đang hiển thị để chuyển bài khi lái xe

  out.innerHTML = arr.length ? arr.map(x => itemHtml(x)).join('') : `
    <div class="empty-state">
      <div>Không tìm thấy bài hát nào. Vui lòng thử tìm từ khóa khác.</div>
    </div>`;

  out.querySelectorAll('[data-play-id]').forEach(itemEl => {
    itemEl.onclick = () => {
      const item = arr.find(x => x.id === itemEl.dataset.playId);
      if (item) {
        play(item);
        enterCinemaMode();
      }
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

function exitCinemaMode() {
  document.body.classList.remove('cinema');
  exitPageFullscreen();
  destroyPlayers(); // Tắt nhạc khi thoát toàn màn hình theo đúng yêu cầu
  const input = document.getElementById('searchInput');
  if (input) {
    setTimeout(() => {
      try { input.focus(); } catch(e){}
    }, 120);
  }
}

function getSpeechRecognition() {
  return window.SpeechRecognition || window.webkitSpeechRecognition || null;
}

function setVoiceText(text) {
  const el = document.getElementById('voiceTranscript');
  if (el) el.textContent = text;
}

function setVoiceHint(text) {
  const el = document.getElementById('voiceHint');
  if (el) el.textContent = text;
}

// Hủy hoàn toàn phiên nhận giọng nói cũ để giải phóng tài nguyên micro
function killRecognition() {
  clearInterval(voiceCountdownInterval);
  clearTimeout(voiceSilenceTimer);
  clearTimeout(voiceMaxTimer);
  const r = voiceRecognition;
  voiceRecognition = null;
  if (r) {
    r.onresult = null;
    r.onerror = null;
    r.onend = null;
    try { r.stop(); } catch (e) { try { r.abort(); } catch (e2) {} }
  }
  // KHÔI PHỤC KÊNH PHÁT LOA XE HƠI: Tránh tình trạng micro chuyển iOS sang PlayAndRecord làm kẹt âm thanh ở loa thoại điện thoại
  if ('audioSession' in navigator) {
    try { navigator.audioSession.type = 'playback'; } catch(e){}
  }
  forceCarAudioOutput();
}

function closeVoiceModal() {
  const modal = document.getElementById('voiceModal');
  if (modal) modal.classList.remove('open');
}

function stopVoiceSearch() {
  voiceSessionId++;
  killRecognition();
  closeVoiceModal();
  forceCarAudioOutput();
  if (document.body.classList.contains('cinema')) {
    setTimeout(() => focusCinemaButton(0), 100);
  }
}

async function finishVoice(session) {
  if (session !== voiceSessionId || voiceHandled) return;
  voiceHandled = true;
  const text = currentVoiceText.trim();
  killRecognition();
  closeVoiceModal();
  forceCarAudioOutput();
  if (!text) return;

  toast('🔍 Đang tìm & tự phát: ' + text);
  const results = await search(text);
  if (results && results.length > 0) {
    play(results[0], true);
    // TỰ ĐỘNG VÀO FULL SCREEN TOÀN MÀN HÌNH THEO ĐÚNG YÊU CẦU
    enterCinemaMode();
  } else {
    toast('Không tìm thấy bài hát: ' + text);
    if (document.body.classList.contains('cinema')) {
      setTimeout(() => focusCinemaButton(0), 100);
    }
  }
}

// BẤM VÀO TÌM KIẾM GIỌNG NÓI -> GỌI TRỰC TIẾP ĐỂ TRÌNH DUYỆT BẬT POPUP HỎI QUYỀN NGUYÊN BẢN (NHƯ CŨ)
function startVoiceSearch() {
  const SR = getSpeechRecognition();
  if (!SR) {
    toast('Trình duyệt của xe chưa hỗ trợ Web Speech. Vui lòng gõ tên bài hát để tìm kiếm.');
    return;
  }

  killRecognition();
  const mySession = ++voiceSessionId;
  currentVoiceText = '';
  voiceHandled = false;

  const modal = document.getElementById('voiceModal');
  if (modal) modal.classList.add('open');
  setVoiceText('Đang nghe qua Micro xe... Hãy nói tên bài hát!');
  setVoiceHint('Dừng nói 3 giây sẽ tự tìm kiếm & tự phát bài #1');

  setTimeout(() => {
    if (mySession !== voiceSessionId) return;

    let r;
    try {
      r = new SR();
    } catch (e) {
      setVoiceText('⚠️ Không khởi động được micro. Bấm "🎤 Nói lại".');
      return;
    }

    r.lang = 'vi-VN';
    r.continuous = true;
    r.interimResults = true;
    r.maxAlternatives = 1;

    r.onresult = (e) => {
      if (mySession !== voiceSessionId) return;
      let text = '';
      for (let i = 0; i < e.results.length; i++) {
        text += e.results[i][0].transcript;
      }
      text = text.trim();
      if (!text) return;

      currentVoiceText = text;
      setVoiceText(`"${text}"`);
      const searchInput = document.getElementById('searchInput');
      if (searchInput) searchInput.value = text;

      // ĐÚNG 3 GIÂY KHÔNG NÓI THÊM -> TỰ ĐỘNG TÌM KIẾM & PHÁT BÀI ĐẦU TIÊN & FULL SCREEN
      clearTimeout(voiceSilenceTimer);
      clearInterval(voiceCountdownInterval);

      let secondsLeft = 3;
      setVoiceHint(`⏱️ Đang chờ... Tự phát sau ${secondsLeft}s`);

      voiceCountdownInterval = setInterval(() => {
        secondsLeft--;
        if (secondsLeft > 0) {
          setVoiceHint(`⏱️ Đang chờ... Tự phát sau ${secondsLeft}s`);
        } else {
          clearInterval(voiceCountdownInterval);
        }
      }, 1000);

      voiceSilenceTimer = setTimeout(() => {
        clearInterval(voiceCountdownInterval);
        finishVoice(mySession);
      }, 3000);
    };

    r.onerror = (e) => {
      if (mySession !== voiceSessionId) return;
      const err = e && e.error;
      console.warn('Speech recognition status/error:', err);
      if (err === 'not-allowed' || err === 'service-not-allowed') {
        setVoiceText('⚠️ Quyền Micro bị chặn. Hãy bấm "Cho phép" khi trình duyệt hỏi quyền, hoặc kiểm tra Cài đặt.');
      } else if (err === 'network') {
        setVoiceText('⚠️ Mạng chập chờn, không nhận dạng được giọng nói. Bấm "🎤 Nói lại".');
      } else if (err === 'no-speech') {
        if (!currentVoiceText) {
          setVoiceText('Đang chờ nghe bạn nói tên bài hát...');
        }
      } else if (!currentVoiceText) {
        setVoiceText('Chưa nghe rõ bài hát. Bấm "🎤 Nói lại" để thử lại.');
      }
    };

    r.onend = () => {
      if (mySession !== voiceSessionId) return;
      voiceRecognition = null;
      if (currentVoiceText) {
        if (!voiceSilenceTimer) {
          voiceSilenceTimer = setTimeout(() => finishVoice(mySession), 3000);
        }
      } else {
        clearTimeout(voiceMaxTimer);
        const el = document.getElementById('voiceTranscript');
        if (el && (el.textContent.indexOf('Đang nghe') === 0 || el.textContent.indexOf('Đang chờ') === 0)) {
          setVoiceText('Chưa nghe rõ bài hát. Bấm "🎤 Nói lại" để thử lại.');
        }
      }
    };

    voiceRecognition = r;
    try {
      r.start();
    } catch (e) {
      console.warn('Microphone start error:', e);
      setVoiceText('⚠️ Micro đang bận. Bấm "🎤 Nói lại".');
    }

    // Giới hạn tối đa 20 giây cho 1 lần nghe
    voiceMaxTimer = setTimeout(() => {
      if (mySession !== voiceSessionId) return;
      if (currentVoiceText) {
        finishVoice(mySession);
      } else {
        killRecognition();
        setVoiceText('Hết thời gian nghe. Bấm "🎤 Nói lại" để thử lại.');
      }
    }, 20000);
  }, 80);
}

function initVoiceSearch() {
  const btnVoice = document.getElementById('btnVoiceSearch');
  const retryVoiceBtn = document.getElementById('retryVoiceBtn');
  const closeVoiceBtn = document.getElementById('closeVoiceBtn');
  const cancelVoiceBtn = document.getElementById('cancelVoiceBtn');

  if (btnVoice) btnVoice.onclick = startVoiceSearch;
  if (retryVoiceBtn) retryVoiceBtn.onclick = startVoiceSearch;
  if (closeVoiceBtn) closeVoiceBtn.onclick = stopVoiceSearch;
  if (cancelVoiceBtn) cancelVoiceBtn.onclick = stopVoiceSearch;
}

function initCinemaControls() {
  const micBtn = document.getElementById('cinemaMicBtn');
  const playPauseBtn = document.getElementById('cinemaPlayPauseBtn');
  const prevBtn = document.getElementById('cinemaPrevBtn');
  const nextBtn = document.getElementById('cinemaNextBtn');
  const exitBtn = document.getElementById('cinemaExitBtn');

  if (micBtn) micBtn.onclick = startVoiceSearch;
  if (playPauseBtn) playPauseBtn.onclick = togglePlayPause;
  if (prevBtn) prevBtn.onclick = playPrev;
  if (nextBtn) nextBtn.onclick = playNext;
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

  // Tự động mở khóa âm thanh ra loa xe khi chạm / bấm lần đầu
  const unlockAudioOnTouch = () => { forceCarAudioOutput(); };
  document.addEventListener('touchstart', unlockAudioOnTouch, { once: true, passive: true });
  document.addEventListener('click', unlockAudioOnTouch, { once: true, passive: true });

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
    searchForm.onsubmit = e => {
      e.preventDefault();
      const val = document.getElementById('searchInput').value.trim();
      if (val) search(val);
      else toast('Vui lòng nhập tên bài hát cần tìm');
    };
  }

  document.querySelectorAll('[data-close]').forEach(b => b.onclick = () => {
    document.querySelectorAll('.modal-back').forEach(m => {
      if (m.id !== 'authModal') {
        m.classList.remove('open');
        m.style.display = 'none';
      }
    });
  });

  renderAll();
  initVoiceSearch();
  initCinemaControls();
});
