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

function showAuthModal() {
  const modal = document.getElementById('authModal');
  if (modal) {
    modal.classList.add('open');
    document.body.style.overflow = 'hidden';
  }
  document.body.classList.add('auth-locked');
}

function hideAuthModal() {
  const modal = document.getElementById('authModal');
  const qrModal = document.getElementById('qrModal');
  const accountModal = document.getElementById('accountModal');
  if (modal) modal.classList.remove('open');
  if (qrModal) qrModal.classList.remove('open');
  if (accountModal) accountModal.classList.remove('open');
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
  hideFullscreenPrompt();
  stopVoiceSearch();

  current = null;
  currentIndex = -1;
  const nowTitle = document.getElementById('nowTitle');
  const nowSub = document.getElementById('nowSub');
  if (nowTitle) nowTitle.textContent = 'Chưa có media đang phát';
  if (nowSub) nowSub.textContent = 'Danh sách phát sẽ hiển thị ở đây.';

  // Xóa session lưu trữ trên thiết bị này
  localStorage.removeItem('aptv_user');

  // Ẩn badge thông tin tài khoản
  const badge = document.getElementById('userBadge');
  if (badge) badge.style.display = 'none';
  const sideCard = document.getElementById('sideUserCard');
  if (sideCard) sideCard.style.display = 'none';

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

    if (liveData.status === 'ACTIVE' && (liveExpire > now || liveExpire.getTime() === 0)) {
      liveData.username = liveData.username || phone;
      liveData.expire_date = liveExpire.getTime() > 0 ? liveExpire.toISOString() : new Date(now.getTime() + 365 * 86400000).toISOString();
      localStorage.setItem('aptv_user', JSON.stringify(liveData));
      updateUserUI(liveData);
    } else if (liveData.status !== 'ACTIVE' || liveExpire <= now) {
      handleKickedOut(liveData.status !== 'ACTIVE' ? 'Tài khoản đang chờ thanh toán (PENDING).' : 'Tài khoản đã hết hạn sử dụng.');
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

    // Nếu status là ACTIVE nhưng expireDate không đọc được, fallback 1 năm tránh báo nhầm hết hạn F5
    if (user.status === 'ACTIVE' && expireDate.getTime() === 0) {
      expireDate = new Date(now.getTime() + 365 * 86400000);
    }

    if (user.status === 'ACTIVE' && expireDate > now) {
      hideAuthModal();
      updateUserUI(user);
      // Bắt đầu lắng nghe thay đổi phiên đăng nhập theo thời gian thực
      listenUserSession(user.username || user.phone);
      return true;
    } else {
      showAuthModal();
      showAuthError(user.status !== 'ACTIVE' ? 'Tài khoản đang chờ thanh toán (PENDING).' : 'Tài khoản đã hết hạn sử dụng. Vui lòng gia hạn.');
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
  const expireStr = expireDate.getTime() > 0 ? (expireDate.toLocaleDateString('vi-VN') + ' ' + expireDate.toLocaleTimeString('vi-VN')) : 'Không xác định';
  const statusStr = user.status === 'ACTIVE' ? '🟢 Đã kích hoạt' : '🟡 Chờ kích hoạt';
  const devId = user.device_id || getDeviceId();

  // Topbar Badge
  const badge = document.getElementById('userBadge');
  const badgePhone = document.getElementById('badgePhone');
  if (badge) badge.style.display = 'flex';
  if (badgePhone) badgePhone.textContent = `👤 ${username}`;

  // Sidebar User Card
  const sideCard = document.getElementById('sideUserCard');
  const sidePhone = document.getElementById('sideUserPhone');
  const sideSub = document.getElementById('sideUserSub');
  if (sideCard) sideCard.style.display = 'block';
  if (sidePhone) sidePhone.textContent = username;
  if (sideSub) sideSub.textContent = `${statusStr} | Hạn: ${expireStr.split(' ')[0]}`;

  // Settings View Fields
  const accPhone = document.getElementById('accPhone');
  const accStatus = document.getElementById('accStatus');
  const accExpire = document.getElementById('accExpire');
  if (accPhone) accPhone.value = username;
  if (accStatus) accStatus.value = statusStr;
  if (accExpire) accExpire.value = expireStr;

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

async function handleLogin() {
  clearAuthError();
  const phone = document.getElementById('loginPhone').value.trim();
  const pass = document.getElementById('loginPass').value.trim();
  const currentDevId = getDeviceId();

  if (!phone || !pass) {
    return showAuthError('Vui lòng nhập đầy đủ Số điện thoại và Mật khẩu.');
  }

  if (!db) {
    initFirebase();
    if (!db) return showAuthError('Không thể kết nối Firebase SDK. Vui lòng kiểm tra mạng.');
  }

  const hashed = hashMD5(pass);

  try {
    toast('Đang xác thực tài khoản...');
    const docRef = db.collection('users').doc(phone);
    const docSnap = await docRef.get();

    if (!docSnap.exists) {
      return showAuthError('Tài khoản chưa tồn tại. Vui lòng chọn Tab Đăng ký.');
    }

    const userData = docSnap.data();
    const storedPass = (userData.password_hash || userData.passwordHash || userData.password || '').toString().trim().toLowerCase();
    const inputSha = hashPassword(pass).toLowerCase().trim();
    const inputMd5 = hashMD5(pass).toLowerCase().trim();
    const inputPlain = pass.trim().toLowerCase();

    const isMatch = (storedPass === inputSha) || (storedPass === inputMd5) || (storedPass === inputPlain);
    if (!isMatch) {
      return showAuthError('Mật khẩu không chính xác. Vui lòng thử lại.');
    }

    const now = new Date();
    const expireDate = getAccountExpireDate(userData);

    if (userData.status !== 'ACTIVE') {
      showAuthError('Tài khoản đang chờ kích hoạt. Vui lòng quét mã VietQR để thanh toán.');
      switchTab('reg');
      document.getElementById('regPhone').value = phone;
      await docRef.update({ device_id: currentDevId });
      triggerQrGenerationForPhone(phone, 100000);
      return;
    }

    if (expireDate <= now) {
      return showAuthError(`Tài khoản đã hết hạn vào ngày ${expireDate.toLocaleDateString('vi-VN')}. Vui lòng đăng ký gói mới.`);
    }

    // CHIẾM PHIÊN ĐĂNG NHẬP: Cập nhật device_id và nâng cấp bảo mật SHA-256 lên Firestore
    const updatePayload = { device_id: currentDevId };
    if (storedPass !== inputSha) {
      updatePayload.password_hash = inputSha;
    }
    await docRef.update(updatePayload);
    userData.device_id = currentDevId;

    // ĐĂNG NHẬP THÀNH CÔNG -> LƯU SESSION CHUẨN ISO STRING
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
  const phone = document.getElementById('regPhone').value.trim();
  const pass = document.getElementById('regPass').value.trim();
  const planSelect = document.getElementById('regPlan');
  const planDays = parseInt(planSelect.value);
  const selectedOpt = planSelect.options[planSelect.selectedIndex];
  const price = parseInt(selectedOpt.getAttribute('data-price') || '100000');
  const currentDevId = getDeviceId();

  if (!phone || !pass) {
    return showAuthError('Vui lòng nhập Số điện thoại và Mật khẩu.');
  }
  if (!/^0\d{8,10}$/.test(phone)) {
    return showAuthError('Số điện thoại không hợp lệ (Ví dụ: 0965512394).');
  }
  if (pass.length < 6) {
    return showAuthError('Mật khẩu phải có từ 6 ký tự trở lên để đảm bảo an toàn.');
  }

  if (!db) {
    initFirebase();
    if (!db) return showAuthError('Không thể kết nối Firebase SDK. Vui lòng kiểm tra mạng.');
  }

  const hashed = hashPassword(pass);
  const now = new Date();
  const expireDate = new Date(now.getTime() + planDays * 86400000).toISOString();

  const userData = {
    username: phone,
    password_hash: hashed,
    device_id: currentDevId,
    expire_date: expireDate,
    status: 'PENDING',
    created_at: now.toISOString()
  };

  try {
    toast('Đang kiểm tra tài khoản...');
    const docRef = db.collection('users').doc(phone);
    const docSnap = await docRef.get();

    // NẾU ĐÃ ĐĂNG KÝ: HIỂN THỊ THÔNG BÁO VÀ Ở LẠI TAB ĐĂNG KÝ (KHÔNG TỰ CHUYỂN TAB)
    if (docSnap.exists) {
      return showAuthError('⚠️ Số điện thoại này đã được đăng ký! Vui lòng chuyển sang Tab ĐĂNG NHẬP.');
    }

    toast('Đang tạo tài khoản mới...');
    await docRef.set(userData);

    const transferContent = `TP ${phone}`;
    const qrUrl = `https://img.vietqr.io/image/TPB-15940510182-compact2.png?amount=${price}&addInfo=${encodeURIComponent(transferContent)}&accountName=${encodeURIComponent("DOAN QUANG TRUNG")}`;

    displayQrCode(qrUrl, price, transferContent);
    listenRealtimeStatus(phone);

  } catch (err) {
    showAuthError('Lỗi tạo tài khoản: ' + err.message);
  }
}

function triggerQrGenerationForPhone(phone, price) {
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

  if (qrImg) qrImg.src = qrUrl;
  if (qrAmountText) qrAmountText.textContent = price.toLocaleString('vi-VN') + ' VNĐ';
  if (qrContentText) qrContentText.textContent = contentText;

  if (qrModal) {
    qrModal.classList.add('open');
  }
}

function listenRealtimeStatus(phone) {
  if (realtimeUnsubscribe) {
    try { realtimeUnsubscribe(); } catch(e){}
    realtimeUnsubscribe = null;
  }
  if (!db) return;

  realtimeUnsubscribe = db.collection('users').doc(phone).onSnapshot((docSnap) => {
    if (docSnap.exists) {
      const data = docSnap.data();
      if (data.status === 'ACTIVE') {
        if (realtimeUnsubscribe) {
          try { realtimeUnsubscribe(); } catch(e){}
          realtimeUnsubscribe = null;
        }
        const d = parseExpireDate(data.expire_date);
        data.expire_date = d.toISOString();
        localStorage.setItem('aptv_user', JSON.stringify(data));
        hideAuthModal();
        updateUserUI(data);
        listenUserSession(phone);
        toast('🎉 THANH TOÁN THÀNH CÔNG! Tài khoản đã được KÍCH HOẠT!');
      }
    }
  }, (err) => {
    console.error('Lỗi Realtime Listener:', err);
  });
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
  const homeBtn = document.getElementById('playCurrent');
  if (cinemaBtn) {
    cinemaBtn.textContent = isPlaying ? '⏸ Tạm dừng' : '▶ Phát tiếp';
    cinemaBtn.title = isPlaying ? 'Tạm dừng bài hát' : 'Phát tiếp';
  }
  if (homeBtn) {
    homeBtn.textContent = isPlaying ? '⏸ Tạm dừng' : '▶ Tiếp tục';
  }
}

function togglePlayPause() {
  if (ytPlayer && typeof ytPlayer.getPlayerState === 'function') {
    const s = ytPlayer.getPlayerState();
    if (s === 1) { // 1 = PLAYING
      try { ytPlayer.pauseVideo(); } catch(e){}
      updatePlayPauseButton(false);
      if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'paused';
    } else {
      try { ytPlayer.playVideo(); } catch(e){}
      updatePlayPauseButton(true);
      if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'playing';
    }
    return;
  }

  const tvVid = document.getElementById('tvVideo');
  if (tvVid) {
    if (tvVid.paused) {
      tvVid.play().catch(() => {});
      updatePlayPauseButton(true);
      if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'playing';
    } else {
      tvVid.pause();
      updatePlayPauseButton(false);
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
  const embedUrl = `https://www.youtube.com/embed/${encodeURIComponent(videoId)}?autoplay=1&playsinline=1&rel=0&modestbranding=1&fs=0&enablejsapi=1&origin=${encodeURIComponent(window.location.origin)}`;
  wrap.innerHTML = `
    <iframe id="ytIframe" 
      src="${embedUrl}" 
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" 
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

  destroyPlayers();

  current = item;
  currentIndex = state.playlist.findIndex(x => x.id === videoId);

  if (add) addHistory(item);

  showView('home');

  const wrap = document.getElementById('playerWrap');
  wrap.innerHTML = `<div id="ytPlayerContainer" style="width:100%;height:100%"></div>`;

  const onPlayerReady = (event) => {
    try { event.target.playVideo(); } catch(e){}
    updatePlayPauseButton(true);
    if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'playing';
  };

  const onPlayerStateChange = (event) => {
    // 0 = YT.PlayerState.ENDED -> MỤC 1: TỰ ĐỘNG CHUYỂN BÀI KẾ TIẾP KHI HẾT BÀI
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
    // MỤC 6: TỰ ĐỘNG BỎ QUA VIDEO BỊ CHẶN NHÚNG (ERROR 150/101/100/2)
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

  document.getElementById('nowTitle').textContent = item.title || 'YouTube Video';
  document.getElementById('nowSub').textContent = item.channel ? (item.channel + ' · YouTube') : ('YouTube · ' + videoId);

  toast('Đang phát: ' + (item.title || videoId));
  renderAll();
  updateMediaSession(item);
  showFullscreenPrompt(item.title || videoId);
}

// BẮT SỰ KIỆN POSTMESSAGE TỪ YOUTUBE IFRAME (DỰ PHÒNG CHO TRƯỜNG HỢP IFRAME TĨNH)
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
  if (!state.playlist.length) return toast('Playlist đang trống');
  let i = currentIndex < 0 ? 0 : (currentIndex + 1) % state.playlist.length;
  play(state.playlist[i]);
}

function playPrev() {
  if (!state.playlist.length) return toast('Playlist đang trống');
  let i = currentIndex <= 0 ? state.playlist.length - 1 : currentIndex - 1;
  play(state.playlist[i]);
}

function playTv(ch) {
  destroyPlayers();
  showView('home');
  current = null;

  const src = state.proxyUrl ? state.proxyUrl + encodeURIComponent(ch.url) : ch.url;
  const wrap = document.getElementById('playerWrap');
  wrap.innerHTML = `<video id="tvVideo" controls controlslist="nofullscreen" disablepictureinpicture autoplay playsinline style="width:100%;height:100%;background:#000;object-fit:contain"></video>`;
  const video = document.getElementById('tvVideo');

  video.onended = () => {
    if (state.autoNext) playNext();
  };
  video.onplay = () => {
    updatePlayPauseButton(true);
    if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'playing';
  };
  video.onpause = () => {
    updatePlayPauseButton(false);
    if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'paused';
  };

  if (window.Hls && Hls.isSupported() && (src.includes('.m3u8') || !video.canPlayType('application/vnd.apple.mpegurl'))) {
    hlsPlayer = new Hls();
    hlsPlayer.loadSource(src);
    hlsPlayer.attachMedia(video);
    hlsPlayer.on(Hls.Events.MANIFEST_PARSED, function() {
      video.play().catch(e => console.log('Autoplay blocked:', e));
    });
  } else {
    video.src = src;
    video.play().catch(e => console.log('Autoplay blocked:', e));
  }

  document.getElementById('nowTitle').textContent = ch.name;
  document.getElementById('nowSub').textContent = '📺 TV / Live Stream';
  toast('Đang phát TV: ' + ch.name);
  updateMediaSession({
    title: ch.name,
    channel: '📺 TV Live Stream',
    thumb: ''
  });
  showFullscreenPrompt(ch.name);
}

function addHistory(item) {
  state.history = [item, ...state.history.filter(x => x.id !== item.id)].slice(0, 100);
  saveState();
  renderAll();
}

function addPlaylist(item) {
  if (!item?.id) return;
  if (!state.playlist.some(x => x.id === item.id)) {
    state.playlist.push(item);
    saveState();
    renderAll();
    toast('Đã thêm vào playlist');
  } else toast('Video đã có trong playlist');
}

function toggleFav(item) {
  const i = state.favorites.findIndex(x => x.id === item.id);
  if (i >= 0) {
    state.favorites.splice(i, 1);
    toast('Đã bỏ yêu thích');
  } else {
    state.favorites.unshift(item);
    toast('Đã thêm yêu thích');
  }
  saveState();
  renderAll();
}

function itemHtml(item, kind = 'result') {
  const fav = state.favorites.some(x => x.id === item.id);
  const isPlaying = current && current.id === item.id;
  return `
    <div class="item ${isPlaying ? 'active-play' : ''}" data-play-id="${esc(item.id)}" tabindex="0">
      <img class="thumb" src="${esc(item.thumb || ytThumb(item.id))}" loading="lazy">
      <div style="min-width:0;cursor:pointer">
        <div class="item-title" title="${esc(item.title || 'YouTube video')}">${esc(item.title || 'YouTube video')}</div>
        <div class="item-sub">${esc(item.channel || 'YouTube')} · ${kind === 'history' ? 'Đã xem' : 'Video'}</div>
      </div>
      <div class="actions">
        <button class="iconbtn" data-play="${esc(item.id)}" title="Phát ngay" tabindex="0">▶</button>
        <button class="iconbtn" data-add="${esc(item.id)}" title="Thêm playlist" tabindex="0">＋</button>
        <button class="iconbtn" data-fav="${esc(item.id)}" title="${fav ? 'Bỏ yêu thích' : 'Yêu thích'}" tabindex="0">${fav ? '♥' : '♡'}</button>
      </div>
    </div>`;
}

function renderList(el, arr, kind) {
  if (!el) return;
  el.innerHTML = arr.length ? arr.map(x => itemHtml(x, kind)).join('') : `<div class="empty">Chưa có dữ liệu.</div>`;

  el.querySelectorAll('[data-play]').forEach(b => b.onclick = (e) => {
    e.stopPropagation();
    play(findItem(b.dataset.play));
  });
  el.querySelectorAll('[data-play-id]').forEach(itemEl => itemEl.onclick = () => {
    play(findItem(itemEl.dataset.playId));
  });
  el.querySelectorAll('[data-add]').forEach(b => b.onclick = (e) => {
    e.stopPropagation();
    addPlaylist(findItem(b.dataset.add));
  });
  el.querySelectorAll('[data-fav]').forEach(b => b.onclick = (e) => {
    e.stopPropagation();
    toggleFav(findItem(b.dataset.fav));
  });
}

function findItem(id) {
  return [current, ...state.playlist, ...state.favorites, ...state.history].filter(Boolean).find(x => x.id === id) || { id, title: 'YouTube video', thumb: ytThumb(id) };
}

function renderAll() {
  renderList(document.getElementById('playlistList'), state.playlist, 'playlist');
  renderList(document.getElementById('playlistList2'), state.playlist, 'playlist');
  renderList(document.getElementById('favoritesList'), state.favorites, 'favorite');
  renderList(document.getElementById('historyList'), state.history, 'history');

  const inputKey = document.getElementById('apiKey');
  const inputProxy = document.getElementById('proxyUrl');
  const inputM3u = document.getElementById('m3uUrl');
  if (inputKey) inputKey.value = state.apiKey;
  if (inputProxy) inputProxy.value = state.proxyUrl;
  if (inputM3u) inputM3u.value = state.tvUrl;

  const btnAuto = document.getElementById('autoNextBtn');
  if (btnAuto) {
    btnAuto.textContent = `🔄 Tự phát: ${state.autoNext ? 'Bật' : 'Tắt'}`;
    btnAuto.classList.toggle('active', state.autoNext);
  }

  renderTv();
}

/* =========================================================================
   5. BỘ MÁY TÌM KIẾM YOUTUBE TỐI ƯU 100% SIÊU TỐC KHÔNG BAO GIỜ LỖI
   ========================================================================= */

// TỰ ĐỘNG KHÁM PHÁ DANH SÁCH MÁY CHỦ INVIDIOUS ĐANG HOẠT ĐỘNG (AUTO-DISCOVERY & CACHING)
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

// THỰC THI FETCH 1 ENDPOINT VỚI CẢ INVIDIOUS VÀ PIPED API FORMAT
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

// THỰC THI RACE PROMISE: TRẢ VỀ NGAY LẬP TỨC KHI MÁY CHỦ ĐẦU TIÊN PHẢN HỒI THÀNH CÔNG (< 1 GIÂY)
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

// HÀM TÌM KIẾM CHÍNH (MAIN SEARCH FUNCTION)
async function search(q) {
  q = (q || '').trim();
  if (!q) return [];

  // 1. NẾU LÀ LINK YOUTUBE HOẶC VIDEO ID TRỰC TIẾP -> PHÁT NGAY LẬP TỨC KHÔNG CẦN TÌM
  const directVid = vidFromUrl(q);
  if (directVid) {
    const item = { id: directVid, title: 'YouTube Video (' + directVid + ')', thumb: ytThumb(directVid), channel: 'YouTube' };
    play(item);
    return [item];
  }

  const out = document.getElementById('results');
  if (out) out.innerHTML = '<div class="empty">🔍 Đang tìm kiếm video siêu tốc...</div>';

  // 2. NẾU CÓ CẤU HÌNH API KEY TRONG CÀI ĐẶT
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

  // 3. TẠO DANH SÁCH CÁC ENDPOINT TÌM KIẾM UY TÍN NHẤT
  const encoded = encodeURIComponent(q);

  // Lấy các máy chủ tự động khám phá từ Invidious API
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

  // Loại bỏ các endpoint trùng lặp
  const uniqueEndpoints = Array.from(new Set(primaryEndpoints));

  // Chạy đua song song (Parallel Race) -> Trả về kết quả ngay khi máy chủ đầu tiên đáp ứng
  const promises = uniqueEndpoints.map(url => searchSingleEndpoint(url, 4500));
  const results = await firstSuccessfulResult(promises);

  if (Array.isArray(results) && results.length > 0) {
    renderSearchResults(results);
    return results;
  }

  // 4. DỰ PHÒNG NẾU KHÔNG CÓ KẾT QUẢ -> Hiển thị danh mục bài hát gợi ý ngay lập tức
  if (out) {
    out.innerHTML = `
      <div class="empty" style="text-align:center;padding:20px 10px">
        <div style="font-size:16px;font-weight:700;color:#ff3650;margin-bottom:8px">⚠️ Máy chủ bận. Hãy chọn bài hát gợi ý hot bên dưới hoặc dán Link YouTube để phát:</div>
        <div class="controls" style="justify-content:center;margin-top:14px">
          <button class="pill primary" onclick="play('L_LUpnjgPso')" tabindex="0">🚗 Nhạc Sàn Xe Hơi Hot 2026</button>
          <button class="pill primary" onclick="play('dQw4w9WgXcQ')" tabindex="0">🔥 Nhạc Trẻ Remix Hot 2026</button>
          <button class="pill" onclick="search('nhac tre remix 2026')" tabindex="0">🔄 Thử tìm "nhac tre remix 2026"</button>
          <button class="pill" onclick="search('bolero hay nhat')" tabindex="0">🎤 Thử tìm "bolero hay nhat"</button>
        </div>
      </div>`;
  }
  return [];
}

function renderSearchResults(arr) {
  const out = document.getElementById('results');
  if (!out) return;
  out.innerHTML = arr.length ? arr.map(x => itemHtml(x, 'result')).join('') : '<div class="empty">Không tìm thấy video nào.</div>';
  const countEl = document.getElementById('resultCount');
  if (countEl) countEl.textContent = arr.length + ' video';

  out.querySelectorAll('[data-play]').forEach(b => b.onclick = (e) => {
    e.stopPropagation();
    const item = arr.find(x => x.id === b.dataset.play);
    if (item) play(item);
  });
  out.querySelectorAll('[data-play-id]').forEach(itemEl => itemEl.onclick = () => {
    const item = arr.find(x => x.id === itemEl.dataset.playId);
    if (item) play(item);
  });
  out.querySelectorAll('[data-add]').forEach(b => b.onclick = (e) => {
    e.stopPropagation();
    const item = arr.find(x => x.id === b.dataset.add);
    if (item) addPlaylist(item);
  });
  out.querySelectorAll('[data-fav]').forEach(b => b.onclick = (e) => {
    e.stopPropagation();
    const item = arr.find(x => x.id === b.dataset.fav);
    if (item) toggleFav(item);
  });
}

function showView(v) {
  document.querySelectorAll('.view').forEach(x => x.hidden = true);
  const targetView = document.getElementById('view-' + v);
  if (targetView) targetView.hidden = false;

  document.querySelectorAll('.nav button, .mobile-nav button').forEach(x => x.classList.toggle('active', x.dataset.view === v));
  const sidebar = document.getElementById('sidebar');
  if (sidebar) sidebar.classList.remove('open');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function renderTv() {
  const el = document.getElementById('tvList');
  if (!el) return;
  el.innerHTML = state.tv.length ? state.tv.map((x, i) => `
    <div class="item" tabindex="0">
      <div style="width:76px;height:43px;border-radius:8px;background:#202631;display:grid;place-items:center;font-size:20px;color:var(--accent)">📺</div>
      <div style="min-width:0">
        <div class="item-title">${esc(x.name)}</div>
        <div class="item-sub" style="text-overflow:ellipsis;overflow:hidden;white-space:nowrap">${esc(x.url)}</div>
      </div>
      <button class="iconbtn" data-tv="${i}" tabindex="0">▶</button>
    </div>`).join('') : '<div class="empty">Chưa có kênh TV. Bấm "Nạp lại danh sách Kênh" ở trên.</div>';

  el.querySelectorAll('[data-tv]').forEach(b => b.onclick = () => playTv(state.tv[+b.dataset.tv]));
}

async function loadM3u(isAuto = false) {
  const inputM3u = document.getElementById('m3uUrl');
  const url = (inputM3u ? inputM3u.value.trim() : '') || DEFAULT_M3U_URL;
  if (!url) return toast('Hãy nhập URL M3U');

  if (!isAuto) toast('Đang nạp danh sách kênh TV...');

  try {
    const r = await fetch(url);
    if (!r.ok) throw Error('HTTP ' + r.status);
    const txt = await r.text();
    const lines = txt.split(/\r?\n/), arr = [];

    for (let i = 0; i < lines.length; i++) {
      if (lines[i].startsWith('#EXTINF')) {
        const name = lines[i].split(',').slice(1).join(',').trim() || 'Kênh TV';
        const u = lines.slice(i + 1).find(x => x && !x.startsWith('#'));
        if (u) arr.push({ name, url: u.trim() });
      }
    }

    state.tv = arr.slice(0, 500);
    state.tvUrl = url;
    saveState();
    renderAll();
    if (!isAuto) toast('Đã nạp thành công ' + arr.length + ' kênh TV');
  } catch (e) {
    if (!isAuto) toast('Không nạp được M3U: ' + e.message);
  }
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

function isDocFullscreen() {
  return !!(document.fullscreenElement || document.webkitFullscreenElement || document.msFullscreenElement);
}

// Xin toàn màn hình thật cho CẢ TRANG (trình duyệt chỉ cho phép ngay lúc người dùng bấm).
// Fullscreen cả trang chứ không phải riêng khung video => micro nổi vẫn luôn hiển thị phía trên.
function requestPageFullscreen() {
  if (isDocFullscreen()) return;
  const el = document.documentElement;
  try {
    const fn = el.requestFullscreen || el.webkitRequestFullscreen || el.msRequestFullscreen;
    if (!fn) return;
    const p = fn.call(el, { navigationUI: 'hide' });
    if (p && typeof p.catch === 'function') p.catch(() => {});
  } catch (e) {}
}

function exitPageFullscreen() {
  if (!isDocFullscreen()) return;
  try {
    const fn = document.exitFullscreen || document.webkitExitFullscreen || document.msExitFullscreen;
    const p = fn && fn.call(document);
    if (p && typeof p.catch === 'function') p.catch(() => {});
  } catch (e) {}
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
  hideFullscreenPrompt();
  // Đặt ngay vòng sáng đỏ con lăn vào nút Micro đầu tiên trong Cinema Bar
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
}

// POPUP "XEM TOÀN MÀN HÌNH": hiện sau khi bắt đầu phát
let fsPromptTimer = null;

function showFullscreenPrompt(title) {
  if (document.body.classList.contains('cinema')) return;
  const prompt = document.getElementById('fsPrompt');
  if (!prompt) return;
  const t = document.getElementById('fsPromptTitle');
  if (t) t.textContent = title || '';
  prompt.classList.add('open');

  const go = document.getElementById('fsPromptGo');
  setTimeout(() => { try { go && go.focus({ preventScroll: true }); } catch (e) {} }, 50);

  clearTimeout(fsPromptTimer);
  fsPromptTimer = setTimeout(hideFullscreenPrompt, 15000);
}

function hideFullscreenPrompt() {
  clearTimeout(fsPromptTimer);
  const prompt = document.getElementById('fsPrompt');
  if (prompt) prompt.classList.remove('open');
}

function getSpeechRecognition() {
  return window.SpeechRecognition || window.webkitSpeechRecognition || null;
}

function setVoiceText(text) {
  const el = document.getElementById('voiceTranscript');
  if (el) el.textContent = text;
}

// Hủy hoàn toàn phiên nhận giọng nói cũ để giải phóng tài nguyên micro
function killRecognition() {
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
}

function closeVoiceModal() {
  const modal = document.getElementById('voiceModal');
  if (modal) modal.classList.remove('open');
}

function stopVoiceSearch() {
  voiceSessionId++;
  killRecognition();
  closeVoiceModal();
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
  if (!text) return;

  toast('🔍 Đang tìm & tự phát: ' + text);
  const results = await search(text);
  if (results && results.length > 0) {
    play(results[0], true);
    hideFullscreenPrompt();
    // TỰ ĐỘNG VÀO FULL SCREEN TOÀN MÀN HÌNH THEO ĐÚNG YÊU CẦU
    enterCinemaMode();
  } else {
    toast('Không tìm thấy bài hát: ' + text);
    if (document.body.classList.contains('cinema')) {
      setTimeout(() => focusCinemaButton(0), 100);
    }
  }
}

function startVoiceSearch() {
  hideFullscreenPrompt();

  const SR = getSpeechRecognition();
  if (!SR) {
    toast('Trình duyệt này không hỗ trợ tìm bằng giọng nói. Hãy gõ tên bài hát.');
    return;
  }

  // Dọn sạch phiên cũ để tránh lỗi "recognition has already started" gây lúc được lúc không
  killRecognition();
  const mySession = ++voiceSessionId;
  currentVoiceText = '';
  voiceHandled = false;

  const modal = document.getElementById('voiceModal');
  if (modal) modal.classList.add('open');
  setVoiceText('Đang nghe... Hãy nói tên bài hát!');

  // Trì hoãn 80ms để trình duyệt giải phóng phần cứng micro hoàn toàn trước khi mở phiên mới
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
    r.continuous = true; // Bật continuous để không bị ngắt vội khi người lái ngập ngừng
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

      // 2.5 giây không nói thêm -> Tự động tìm kiếm & phát ngay
      clearTimeout(voiceSilenceTimer);
      voiceSilenceTimer = setTimeout(() => finishVoice(mySession), 2500);
    };

    r.onerror = (e) => {
      if (mySession !== voiceSessionId) return;
      const err = e && e.error;
      console.warn('Speech recognition status/error:', err);
      if (err === 'not-allowed' || err === 'service-not-allowed') {
        setVoiceText('⚠️ Quyền Micro bị chặn. Hãy cho phép quyền truy cập Micro trên trình duyệt rồi thử lại.');
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
        finishVoice(mySession);
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

    // Giới hạn tối đa 15 giây cho 1 lần nghe để không bao giờ bị treo
    voiceMaxTimer = setTimeout(() => {
      if (mySession !== voiceSessionId) return;
      if (currentVoiceText) {
        finishVoice(mySession);
      } else {
        killRecognition();
        setVoiceText('Hết thời gian nghe. Bấm "🎤 Nói lại" để thử lại.');
      }
    }, 15000);
  }, 80);
}

function initVoiceSearch() {
  const btnMic = document.getElementById('btnMic');
  const floatingBtn = document.getElementById('floatingVoiceBtn');
  const retryVoiceBtn = document.getElementById('retryVoiceBtn');
  const closeVoiceBtn = document.getElementById('closeVoiceBtn');
  const cancelVoiceBtn = document.getElementById('cancelVoiceBtn');

  if (!getSpeechRecognition() && btnMic) {
    btnMic.title = 'Trình duyệt không hỗ trợ Tìm bằng giọng nói';
  }

  if (btnMic) btnMic.onclick = startVoiceSearch;
  if (floatingBtn) floatingBtn.onclick = startVoiceSearch;
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

  // Nút trong popup "Xem toàn màn hình"
  const fsGo = document.getElementById('fsPromptGo');
  const fsLater = document.getElementById('fsPromptLater');
  if (fsGo) fsGo.onclick = () => { hideFullscreenPrompt(); enterCinemaMode(); };
  if (fsLater) fsLater.onclick = hideFullscreenPrompt;

  // ĐIỀU KHIỂN BẰNG CON LĂN MAZDA / MERCEDES / BMW VÀ PHÍM BÀN PHÍM
  document.addEventListener('keydown', (e) => {
    // 1. Phím Back / Escape trên vô lăng hoặc xe: đóng modal / thoát toàn màn hình
    if (e.key === 'Escape' || e.key === 'BrowserBack' || e.key === 'GoBack') {
      const voiceModal = document.getElementById('voiceModal');
      const fsPrompt = document.getElementById('fsPrompt');
      if (voiceModal && voiceModal.classList.contains('open')) {
        stopVoiceSearch();
      } else if (fsPrompt && fsPrompt.classList.contains('open')) {
        hideFullscreenPrompt();
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

  const loginTabBtn = document.getElementById('tabLoginBtn');
  const regTabBtn = document.getElementById('tabRegBtn');
  if (loginTabBtn) loginTabBtn.onclick = () => switchTab('login');
  if (regTabBtn) regTabBtn.onclick = () => switchTab('reg');

  const btnDoLogin = document.getElementById('btnDoLogin');
  const loginPassInput = document.getElementById('loginPass');
  if (btnDoLogin) btnDoLogin.onclick = handleLogin;
  if (loginPassInput) loginPassInput.onkeydown = (e) => { if (e.key === 'Enter') handleLogin(); };

  const btnCreateQr = document.getElementById('btnCreateQr');
  if (btnCreateQr) btnCreateQr.onclick = handleRegister;

  const closeQrBtn = document.getElementById('closeQrBtn');
  if (closeQrBtn) {
    closeQrBtn.onclick = () => {
      const qrModal = document.getElementById('qrModal');
      if (qrModal) qrModal.classList.remove('open');
    };
  }

  // Bắt sự kiện xem thông tin tài khoản (Topbar Badge)
  const userBadge = document.getElementById('userBadge');
  const accountModal = document.getElementById('accountModal');
  if (userBadge && accountModal) {
    userBadge.onclick = () => {
      accountModal.classList.add('open');
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
      search(document.getElementById('searchInput').value);
    };
  }

  document.querySelectorAll('.nav button, .mobile-nav button').forEach(b => b.onclick = () => showView(b.dataset.view));
  const menuBtn = document.getElementById('menuBtn');
  const settingsTop = document.getElementById('settingsTop');
  const openUrlBtn = document.getElementById('openUrlBtn');

  if (menuBtn) menuBtn.onclick = () => document.getElementById('sidebar').classList.toggle('open');
  if (settingsTop) settingsTop.onclick = () => showView('settings');
  if (openUrlBtn) openUrlBtn.onclick = () => document.getElementById('urlModal').classList.add('open');

  const saveSettingsBtn = document.getElementById('saveSettings');
  if (saveSettingsBtn) {
    saveSettingsBtn.onclick = () => {
      state.apiKey = document.getElementById('apiKey').value.trim();
      state.proxyUrl = document.getElementById('proxyUrl').value.trim();
      saveState();
      toast('Đã lưu cài đặt');
    };
  }

  const autoNextBtn = document.getElementById('autoNextBtn');
  if (autoNextBtn) {
    autoNextBtn.onclick = () => {
      state.autoNext = !state.autoNext;
      saveState();
      renderAll();
      toast(state.autoNext ? 'Đã BẬT tự động phát' : 'Đã TẮT tự động phát');
    };
  }

  const clearPlaylistBtn1 = document.getElementById('clearPlaylist');
  const clearPlaylistBtn2 = document.getElementById('clearPlaylist2');
  const clearHistoryBtn = document.getElementById('clearHistory');

  if (clearPlaylistBtn1) clearPlaylistBtn1.onclick = () => { state.playlist = []; currentIndex = -1; saveState(); renderAll(); toast('Đã xóa danh sách phát'); };
  if (clearPlaylistBtn2) clearPlaylistBtn2.onclick = () => { state.playlist = []; currentIndex = -1; saveState(); renderAll(); toast('Đã xóa danh sách phát'); };
  if (clearHistoryBtn) clearHistoryBtn.onclick = () => { state.history = []; saveState(); renderAll(); toast('Đã xóa lịch sử'); };

  const prevBtn = document.getElementById('prevBtn');
  const nextBtn = document.getElementById('nextBtn');
  const playCurrentBtn = document.getElementById('playCurrent');
  const favCurrentBtn = document.getElementById('favCurrent');

  if (prevBtn) prevBtn.onclick = playPrev;
  if (nextBtn) nextBtn.onclick = playNext;
  if (playCurrentBtn) playCurrentBtn.onclick = () => current ? togglePlayPause() : toast('Chưa có video đang phát');
  if (favCurrentBtn) favCurrentBtn.onclick = () => current && toggleFav(current);

  const loadM3uBtn = document.getElementById('loadM3u');
  const clearTvBtn = document.getElementById('clearTv');
  if (loadM3uBtn) loadM3uBtn.onclick = () => loadM3u(false);
  if (clearTvBtn) clearTvBtn.onclick = () => { state.tv = []; saveState(); renderAll(); toast('Đã xóa cache TV'); };

  const openManualBtn = document.getElementById('openManual');
  if (openManualBtn) {
    openManualBtn.onclick = () => {
      const id = vidFromUrl(document.getElementById('manualUrl').value);
      if (!id) return toast('URL / Video ID không hợp lệ');
      const x = { id, title: 'YouTube Video', thumb: ytThumb(id), channel: 'YouTube' };
      document.getElementById('urlModal').classList.remove('open');
      play(x);
    };
  }

  document.querySelectorAll('[data-close]').forEach(b => b.onclick = () => {
    document.querySelectorAll('.modal-back').forEach(m => {
      if (m.id !== 'authModal') m.classList.remove('open');
    });
  });

  const exportBtn = document.getElementById('exportBtn');
  if (exportBtn) {
    exportBtn.onclick = () => {
      const backup = { format: 'trung-play-backup', version: 3.0, createdAt: new Date().toISOString(), storage: state };
      const a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' }));
      a.download = 'trung-play-backup-' + new Date().toISOString().slice(0, 10) + '.json';
      a.click();
      URL.revokeObjectURL(a.href);
      toast('Đã xuất file Backup');
    };
  }

  const importBtn = document.getElementById('importBtn');
  const importFile = document.getElementById('importFile');
  if (importBtn) importBtn.onclick = () => importFile.click();
  if (importFile) {
    importFile.onchange = async e => {
      const f = e.target.files[0];
      if (!f) return;
      try {
        const j = JSON.parse(await f.text());
        if (j.format !== 'trung-play-backup' || !j.storage) throw Error('File không hợp lệ');
        state = { ...defaults, ...j.storage };
        saveState();
        renderAll();
        toast('Đã khôi phục dữ liệu từ Backup');
      } catch (err) {
        toast('Lỗi đọc file: ' + err.message);
      }
      e.target.value = '';
    };
  }

  const resetBtn = document.getElementById('resetBtn');
  if (resetBtn) {
    resetBtn.onclick = () => {
      if (confirm('Xóa toàn bộ dữ liệu ứng dụng trên thiết bị này?')) {
        localStorage.removeItem(KEY);
        state = loadState();
        renderAll();
        toast('Đã đặt lại ứng dụng');
      }
    };
  }

  renderAll();
  initVoiceSearch();
  initCinemaControls();

  if (!state.tv.length) {
    loadM3u(true);
  }
});
