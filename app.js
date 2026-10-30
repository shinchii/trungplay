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

/* =========================================================================
   HỆ THỐNG GỢI Ý BÀI HÁT CÙNG THỂ LOẠI THEO TÀI KHOẢN (CACHE TRÌNH DUYỆT)
   ========================================================================= */

const TASTE_CACHE_PREFIX = 'trungplay_account_taste_v3_';

function getCurrentAccountPhone() {
  try {
    const raw = localStorage.getItem('aptv_user');
    if (!raw) return 'local';
    const user = JSON.parse(raw);
    const p = normalizePhone(user.username || user.phone || '');
    return p || 'local';
  } catch (e) {
    return 'local';
  }
}

function getTasteCacheKey() {
  return TASTE_CACHE_PREFIX + getCurrentAccountPhone();
}

function loadAccountTaste() {
  try {
    const phone = getCurrentAccountPhone();
    const key = TASTE_CACHE_PREFIX + phone;
    let raw = localStorage.getItem(key);
    // Nếu chưa có theo SĐT, thử lấy từ local hoặc guest trước đó
    if (!raw && phone !== 'local') {
      raw = localStorage.getItem(TASTE_CACHE_PREFIX + 'local') || localStorage.getItem(TASTE_CACHE_PREFIX + 'guest');
    }
    if (!raw) return { genres: {}, topGenre: '', homeSuggestions: [], lastUpdated: 0 };
    const data = JSON.parse(raw);
    if (!data || typeof data !== 'object') return { genres: {}, topGenre: '', homeSuggestions: [], lastUpdated: 0 };
    if (!data.genres) data.genres = {};
    if (!Array.isArray(data.homeSuggestions)) data.homeSuggestions = [];
    return data;
  } catch (e) {
    return { genres: {}, topGenre: '', homeSuggestions: [], lastUpdated: 0 };
  }
}

function saveAccountTaste(taste) {
  try {
    const phone = getCurrentAccountPhone();
    const key = TASTE_CACHE_PREFIX + phone;
    localStorage.setItem(key, JSON.stringify(taste));
    // Đồng thời đồng bộ vào local để không bao giờ bị mất khi chuyển đổi phiên
    if (phone !== 'local') {
      localStorage.setItem(TASTE_CACHE_PREFIX + 'local', JSON.stringify(taste));
    }
  } catch (e) {}
}

const GENRE_RULES = [
  {
    genre: 'Bolero Trữ Tình',
    query: 'Liên khúc Bolero Trữ Tình Chọn Lọc Hay Nhất',
    regex: /(bolero|tru tinh|trữ tình|nhac vang|nhạc vàng|le quyen|lệ quyên|quang le|quang lê|tuan vu|tuấn vũ|che linh|chế linh|truong vu|trường vũ|dan nguyen|đan nguyên|nhu quynh|như quỳnh|phi nhung|manh quynh|mạnh quỳnh|giao linh|huong lan|hương lan|ngoc son|ngọc sơn|duong ngoc thai|dương ngọc thái|dap mo cuoc tinh|đắp mộ cuộc tình|sau le bong|sầu lẻ bóng|hoa no ve dem|hoa nở về đêm)/i
  },
  {
    genre: 'Vinahouse Bass Căng',
    query: 'Nonstop Vinahouse Bass Cực Căng Lái Xe Mới Nhất',
    regex: /(vinahouse|vina house|nonstop|nhac san|nhạc sàn|bass cuc manh|bass cực mạnh|bass cuc cang|bass cực căng|bay phong|bay phòng|dj hyena|viet mix|việt mix|dap tung loa|đập tung loa|dance|dj)/i
  },
  {
    genre: 'Nhạc Trẻ Remix TikTok',
    query: 'Liên Khúc Nhạc Trẻ Remix Hot Trend TikTok Hay Nhất',
    regex: /(remix|tiktok|tik tok|hot trend|nhac tre remix|nhạc trẻ remix|trieu view|triệu view|cuc dinh|cực đỉnh|tang phuc|tăng phúc|thieu bao tram|thiều bảo trâm|hoang thuy linh|hoàng thùy linh)/i
  },
  {
    genre: 'Lofi Chill Lái Xe',
    query: 'Playlist Lofi Chill Lái Xe Buổi Tối Tuyệt Đẹp',
    regex: /(lofi|lo-fi|chill|acoustic|thu gian|thư giãn|dem khuya|đêm khuya|nghe tren xe cuc chill|nghe trên xe cực chill|khong buon ngu|không buồn ngủ|chay qua nhung ngay dep troi|chạy qua những ngày đẹp trời)/i
  },
  {
    genre: 'Nhạc Trẻ Ballad',
    query: 'Tuyển Chọn Nhạc Trẻ Ballad Tâm Trạng Hay Nhất',
    regex: /(ballad|nhac tre|nhạc trẻ|tam trang|tâm trạng|son tung|sơn tùng|den vau|đen vâu|ha anh tuan|hà anh tuấn|vu\.|vũ\.|chillies|erik|duc phuc|đức phúc|mr siro|trinh dinh quang|trịnh đình quang|phan manh quynh|phan mạnh quỳnh|hoai lam|hoài lâm|trinh thang binh|trịnh thăng bình)/i
  },
  {
    genre: 'Nhạc Quê Hương Dân Ca',
    query: 'Tuyển Chọn Nhạc Quê Hương Dân Ca Miền Tây Hay Nhất',
    regex: /(que huong|quê hương|dan ca|dân ca|mien tay|miền tây|song nuoc|sông nước|cam ly|cẩm ly|quoc dai|quốc đại|to my|tố my)/i
  },
  {
    genre: 'Nhạc Đỏ Cách Mạng',
    query: 'Liên Khúc Nhạc Đỏ Tiền Chiến Cách Mạng Bất Hủ',
    regex: /(nhac do|nhạc đỏ|tien chien|tiền chiến|cach mang|cách mạng|trong tan|trọng tấn|dang duong|đăng dương|viet hoan|việt hoàn|lan anh|anh tho|ánh thơ)/i
  },
  {
    genre: 'Nhạc Phật Thiền Tịnh Tâm',
    query: 'Nhạc Phật Giáo Thiền Định Tịnh Tâm An Nhiên',
    regex: /(nhac phat|nhạc phật|phat giao|phật giáo|tinh tam|tịnh tâm|an nhien|an nhiên|thien|thiền|nam mo a di da phat|chua|quan the am)/i
  },
  {
    genre: 'Deep House Night Drive',
    query: 'Deep House MIX 2026 - Best Luxury Car Night Drive Music',
    regex: /(deep house|night drive|luxury car|dravyn|edm|electronic|car music)/i
  },
  {
    genre: 'Nhạc Không Lời Hòa Tấu',
    query: 'Nhạc Không Lời Hòa Tấu Saxophone Guitar Lái Xe Tuyệt Hay',
    regex: /(khong loi|không lời|hoa tau|hòa tấu|saxophone|guitar|piano|nhac lai xe khong loi)/i
  },
  {
    genre: 'Nhạc Hoa Lời Việt',
    query: 'Tuyển Chọn Nhạc Hoa Lời Việt Remix Hay Nhất',
    regex: /(nhac hoa|nhạc hoa|hoa loi viet|hoa lời việt|trung quoc|tieng hoa)/i
  },
  {
    genre: 'Rap Việt',
    query: 'Tuyển Chọn Rap Việt Hay Nhất',
    regex: /(rap viet|rap việt|hiphop|hip hop|den vau|đen vâu|b ray|suboi|karik|justatee|mck|tlinh)/i
  }
];

// Nhận diện vạn năng bất kỳ thể loại hay ca sĩ nào từ tiêu đề & tên kênh
function detectGenreFromText(text, channel) {
  const combined = ((text || '') + ' ' + (channel || '')).trim();
  const lower = combined.toLowerCase();

  for (const rule of GENRE_RULES) {
    if (rule.regex.test(lower)) {
      return rule;
    }
  }

  // Tự động nhận diện Tên Ca Sĩ từ tiêu đề ("Ca Sĩ - Tên Bài") hoặc tên Kênh
  let cleanArtist = '';
  if (text && text.includes('-')) {
    const parts = text.split('-');
    const candidate = parts[0].trim();
    if (candidate.length >= 2 && candidate.length <= 32 && !/^(tập|phim|official|mv|video|video clip|full|live|tuyển tập|tổng hợp)/i.test(candidate)) {
      cleanArtist = candidate;
    }
  }
  if (!cleanArtist && channel && channel.length >= 2 && channel.length <= 30 && !/^(vevo|youtube|topic|music|official)/i.test(channel)) {
    cleanArtist = channel.replace(/\s*(official|channel|vevo|music|tv|entertainment|records)\s*$/i, '').trim();
  }

  if (cleanArtist) {
    return {
      genre: cleanArtist,
      query: 'Những bài hát hay nhất của ' + cleanArtist
    };
  }

  const words = (text || '').trim();
  if (words.length >= 2 && words.length <= 40) {
    return {
      genre: words,
      query: 'Tuyển tập ' + words + ' hay nhất'
    };
  }

  return null;
}

function getHomeSuggestedPlaylist() {
  const taste = loadAccountTaste();

  // 1. Nếu đã có bài hát gợi ý trong cache
  if (Array.isArray(taste.homeSuggestions) && taste.homeSuggestions.length > 0) {
    if (taste.homeSuggestions.length >= 10) {
      return taste.homeSuggestions.slice(0, 30);
    }
    // Nếu có ít hơn 10 bài, đệm thêm các bài mặc định khác để danh sách luôn đủ dài
    const seenIds = new Set(taste.homeSuggestions.map(x => x.id));
    const padded = [...taste.homeSuggestions];
    for (const d of defaults.playlist) {
      if (!seenIds.has(d.id)) {
        seenIds.add(d.id);
        padded.push(d);
      }
      if (padded.length >= 15) break;
    }
    return padded;
  }

  // 2. Nếu chưa có gợi ý nhưng người dùng đã từng nghe bài trong history (kể cả 1 bài):
  if (state && Array.isArray(state.history) && state.history.length > 0) {
    const historySongs = state.history.slice(0, 20);
    setTimeout(() => {
      recordSongPlayForTaste(historySongs[0]);
    }, 150);
    return historySongs;
  }

  return defaults.playlist;
}

// KHỞI TẠO STATE
function loadState() {
  try {
    const loaded = { ...defaults, ...JSON.parse(localStorage.getItem(KEY) || '{}') };
    if (!Array.isArray(loaded.favorites)) loaded.favorites = [];
    if (!Array.isArray(loaded.history)) loaded.history = [];

    // Luôn ưu tiên nạp danh sách gợi ý cùng thể loại theo tài khoản
    const homeSuggestions = getHomeSuggestedPlaylist();
    loaded.playlist = [...homeSuggestions];

    return loaded;
  } catch (e) {
    return { ...defaults, favorites: [], history: [] };
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

function isAccountValid(user) {
  if (!isAccountActive(user)) return false;
  const expire = getAccountExpireDate(user);
  return (expire.getTime() === 0 || expire > new Date());
}

function openRenewModalFromAccount() {
  closeAccountModal();
  let phone = '';
  const sessionStr = localStorage.getItem('aptv_user');
  if (sessionStr) {
    try {
      const u = JSON.parse(sessionStr);
      phone = normalizePhone(u.phone || u.username);
    } catch (e) {}
  }
  if (!phone) {
    const accPhoneEl = document.getElementById('accModalPhone');
    if (accPhoneEl && accPhoneEl.value) phone = normalizePhone(accPhoneEl.value);
  }
  showAuthModal();
  switchTab('renew', phone, '⚡ Gia hạn hoặc nâng cấp gói cước cho tài khoản: ' + (phone || ''));
}
window.openRenewModalFromAccount = openRenewModalFromAccount;

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
function handleKickedOut(msg, kickedPhone) {
  if (userSessionUnsubscribe) {
    try { userSessionUnsubscribe(); } catch (e) {}
    userSessionUnsubscribe = null;
  }

  // Dừng phát nhạc / video ngay lập tức
  destroyPlayers(false);
  exitCinemaMode();

  current = null;
  currentIndex = -1;

  let sessionPhone = kickedPhone;
  if (!sessionPhone) {
    try {
      const u = JSON.parse(localStorage.getItem('aptv_user') || '{}');
      sessionPhone = u.phone || u.username;
    } catch (e) {}
  }

  // Xóa session lưu trữ trên thiết bị này
  localStorage.removeItem('aptv_user');

  // Ẩn badge thông tin tài khoản
  const badge = document.getElementById('userBadge');
  if (badge) badge.style.display = 'none';

  // Đóng các modal khác nếu đang mở
  document.querySelectorAll('.modal-back').forEach(m => {
    if (m.id !== 'authModal') m.classList.remove('open');
  });

  const isExpired = msg && (msg.toLowerCase().includes('hết hạn') || msg.toLowerCase().includes('expire'));
  showAuthModal();

  if (isExpired) {
    const noticeText = msg || 'Tài khoản của bạn đã hết hạn sử dụng. Vui lòng chọn gói cước để gia hạn!';
    switchTab('renew', sessionPhone, noticeText);
    toast('⚠️ ' + noticeText);
  } else {
    switchTab('login', sessionPhone);
    const errorMsg = msg || '⚠️ Tài khoản của bạn vừa được đăng nhập trên một thiết bị khác. Bạn đã bị đăng xuất!';
    showAuthError(errorMsg);
    toast('⚠️ Tài khoản đã được đăng nhập ở thiết bị khác!');
  }
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
      handleKickedOut('⚠️ Tài khoản không tồn tại hoặc đã bị xóa!', phone);
      return;
    }

    const liveData = docSnap.data();
    const currentDevId = getDeviceId();

    // NẾU CÓ THIẾT BỊ KHÁC ĐĂNG NHẬP -> LOGOUT NGAY LẬP TỨC
    if (liveData.device_id && liveData.device_id !== "" && liveData.device_id !== currentDevId) {
      handleKickedOut('⚠️ Tài khoản của bạn vừa được đăng nhập trên một thiết bị khác. Bạn đã bị đăng xuất!', phone);
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
      handleKickedOut(!isAccountActive(liveData) ? 'Tài khoản đang chờ thanh toán (PENDING).' : 'Tài khoản đã hết hạn sử dụng. Vui lòng gia hạn để tiếp tục sử dụng.', phone);
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
    const phone = normalizePhone(user.username || user.phone);

    // Kiểm tra nhanh trong cache cục bộ
    if (user.device_id && user.device_id !== "" && user.device_id !== currentDevId) {
      handleKickedOut('⚠️ Tài khoản này đã được đăng nhập trên thiết bị khác!', phone);
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
      listenUserSession(phone);

      const savedMode = localStorage.getItem('aptv_car_mode');
      if (!savedMode) {
        setTimeout(() => openCarModeModal(), 400);
      } else {
        applyCarMode(savedMode);
      }
      return true;
    } else {
      showAuthModal();
      if (expireDate <= now) {
        switchTab('renew', phone, `⚠️ Tài khoản ${phone} đã hết hạn vào ngày ${expireDate.toLocaleDateString('vi-VN')}. Vui lòng gia hạn!`);
      } else {
        showAuthError(!isAccountActive(user) ? 'Tài khoản đang chờ thanh toán (PENDING).' : 'Tài khoản đã hết hạn sử dụng. Vui lòng gia hạn.');
      }
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
      switchTab('renew', phone, `⚠️ Tài khoản đã hết hạn vào ngày ${expireDate.toLocaleDateString('vi-VN')}. Vui lòng chọn gói cước để gia hạn!`);
      const renewPassEl = document.getElementById('renewPass');
      if (renewPassEl) renewPassEl.value = pass;
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

  // 5. ĐỒNG BỘ FIRESTORE (CHÚ Ý: KHÔNG ĐƯỢC GHI ĐÈ PENDING NẾU TÀI KHOẢN ĐÃ ACTIVE VÀ CÒN HẠN!)
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
        const currentExpire = parseExpireDate(existingData.expire_date);
        // Nếu đã ACTIVE và VẪN CÒN HẠN -> vào ứng dụng ngay!
        if (isAccountActive(existingData) && (currentExpire.getTime() === 0 || currentExpire > now)) {
          let d = currentExpire;
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

        // Nếu đã HẾT HẠN hoặc PENDING -> cập nhật thông tin và chuyển sang chờ thanh toán gói mới
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

// XỬ LÝ GIA HẠN GÓI CƯỚC (DÀNH CHO TÀI KHOẢN ĐÃ CÓ / HẾT HẠN)
async function handleRenew() {
  clearAuthError();
  const phoneInput = document.getElementById('renewPhone');
  const passInput = document.getElementById('renewPass');
  const planSelect = document.getElementById('renewPlan');

  let phone = normalizePhone(phoneInput ? phoneInput.value : '');
  const pass = (passInput ? passInput.value : '').trim();

  if (!phone) {
    return showAuthError('Vui lòng nhập Số điện thoại cần gia hạn.');
  }
  if (!/^0\d{8,10}$/.test(phone)) {
    return showAuthError('Số điện thoại không hợp lệ.');
  }
  if (!pass) {
    return showAuthError('Vui lòng nhập Mật khẩu tài khoản để xác nhận.');
  }

  // Xác định gói cước
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

  if (!db) initFirebase();
  if (!db) return showAuthError('Không thể kết nối cơ sở dữ liệu. Vui lòng kiểm tra mạng.');

  try {
    toast('Đang xác thực thông tin tài khoản...');
    const docRef = db.collection('users').doc(phone);
    const docSnap = await docRef.get();

    if (!docSnap.exists) {
      return showAuthError('Tài khoản này chưa tồn tại. Vui lòng chọn Tab ĐĂNG KÝ MỚI.');
    }

    const userData = docSnap.data();
    const storedPass = (userData.password_hash || userData.passwordHash || userData.password || '').toString().trim().toLowerCase();
    const inputShaWithSalt = hashPassword(pass).toLowerCase().trim();
    const inputShaPlain = (window.CryptoJS && CryptoJS.SHA256) ? CryptoJS.SHA256(pass).toString().toLowerCase().trim() : '';
    const inputMd5 = hashMD5(pass).toLowerCase().trim();
    const inputPlain = pass.trim().toLowerCase();

    const isMatch = (storedPass === inputShaWithSalt) || (storedPass === inputShaPlain) || (storedPass === inputMd5) || (storedPass === inputPlain);
    if (!isMatch) {
      return showAuthError('Mật khẩu không chính xác. Vui lòng kiểm tra lại mật khẩu của số điện thoại này.');
    }

    const now = new Date();
    const currentExpire = getAccountExpireDate(userData);
    // Nếu tài khoản vẫn còn hạn: cộng dồn thêm planDays vào ngày hết hạn cũ.
    // Nếu tài khoản đã hết hạn: tính từ bây giờ + planDays.
    let baseTime = (currentExpire.getTime() > now.getTime()) ? currentExpire.getTime() : now.getTime();
    const newExpireDate = new Date(baseTime + planDays * 86400000).toISOString();
    const currentDevId = getDeviceId();

    // Cập nhật Firestore sang PENDING gói gia hạn
    await docRef.set({
      device_id: currentDevId,
      status: 'PENDING',
      expire_date: newExpireDate,
      price: price,
      plan_days: planDays,
      plan_name: planName,
      renew_at: now.toISOString()
    }, { merge: true });

    // Lưu thông tin chờ thanh toán
    window.__pendingPhone = phone;
    window.__pendingPass = pass;
    window.__pendingPlanDays = planDays;
    window.__pendingPlanName = planName;
    window.__pendingPrice = price;
    try { localStorage.setItem('aptv_pending_phone', phone); } catch(e){}

    // Hiển thị VietQR
    const transferContent = `TP ${phone}`;
    const qrUrl = `https://img.vietqr.io/image/TPB-15940510182-compact2.png?amount=${price}&addInfo=${encodeURIComponent(transferContent)}&accountName=${encodeURIComponent("DOAN QUANG TRUNG")}`;
    displayQrCode(qrUrl, price, transferContent);
    toast(`⚡ Đã tạo mã VietQR gia hạn ${price.toLocaleString('vi-VN')} VNĐ cho số ${phone}!`);

    // Bắt đầu lắng nghe realtime
    listenRealtimeStatus(phone);

  } catch (err) {
    showAuthError('Lỗi khi gia hạn: ' + err.message);
  }
}
window.handleRenew = handleRenew;

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
      const now = new Date();
      if (d.getTime() === 0 || d <= now) {
        d = new Date(now.getTime() + (data.plan_days || 365) * 86400000);
      }
      const currentDevId = getDeviceId();
      data.status = 'ACTIVE';
      data.expire_date = d.toISOString();
      data.device_id = currentDevId;

      try {
        db.collection('users').doc(phone).update({
          device_id: currentDevId,
          status: 'ACTIVE',
          expire_date: d.toISOString()
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
    phone = (document.getElementById('renewPhone') ? document.getElementById('renewPhone').value : '').trim() ||
            (document.getElementById('regPhone') ? document.getElementById('regPhone').value : '').trim() ||
            (document.getElementById('loginPhone') ? document.getElementById('loginPhone').value : '').trim() ||
            window.__pendingPhone || '';
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
      const now = new Date();
      if (d.getTime() === 0 || d <= now) {
        d = new Date(now.getTime() + (data.plan_days || 365) * 86400000);
      }
      const currentDevId = getDeviceId();
      data.status = 'ACTIVE';
      data.expire_date = d.toISOString();
      data.device_id = currentDevId;

      try {
        await docRef.update({
          device_id: currentDevId,
          status: 'ACTIVE',
          expire_date: d.toISOString()
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

function switchTab(tab, phone, customNotice) {
  clearAuthError();
  const loginBtn = document.getElementById('tabLoginBtn');
  const regBtn = document.getElementById('tabRegBtn');
  const renewBtn = document.getElementById('tabRenewBtn');
  const formLogin = document.getElementById('formLogin');
  const formReg = document.getElementById('formReg');
  const formRenew = document.getElementById('formRenew');
  const renewNotice = document.getElementById('renewNotice');

  if (loginBtn) loginBtn.classList.remove('active');
  if (regBtn) regBtn.classList.remove('active');
  if (renewBtn) renewBtn.classList.remove('active');

  if (formLogin) formLogin.style.display = 'none';
  if (formReg) formReg.style.display = 'none';
  if (formRenew) formRenew.style.display = 'none';

  if (tab === 'login') {
    if (loginBtn) loginBtn.classList.add('active');
    if (formLogin) formLogin.style.display = 'grid';
    if (phone) {
      const loginPhone = document.getElementById('loginPhone');
      if (loginPhone) loginPhone.value = phone;
    }
  } else if (tab === 'renew') {
    if (renewBtn) renewBtn.classList.add('active');
    if (formRenew) formRenew.style.display = 'grid';
    if (phone) {
      const renewPhone = document.getElementById('renewPhone');
      if (renewPhone) renewPhone.value = phone;
    }
    if (renewNotice) {
      if (customNotice) {
        renewNotice.textContent = customNotice;
        renewNotice.style.display = 'block';
      } else {
        renewNotice.style.display = 'none';
        renewNotice.textContent = '';
      }
    }
  } else {
    if (regBtn) regBtn.classList.add('active');
    if (formReg) formReg.style.display = 'grid';
    if (phone) {
      const regPhone = document.getElementById('regPhone');
      if (regPhone) regPhone.value = phone;
    }
  }
}
window.switchTab = switchTab;

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
  if (ytPlayer && typeof ytPlayer.pauseVideo === 'function') {
    try { ytPlayer.pauseVideo(); } catch (e) {}
  } else {
    const iframe = document.getElementById('ytPlayerFrame');
    if (iframe && iframe.contentWindow) {
      try {
        iframe.contentWindow.postMessage('{"event":"command","func":"pauseVideo","args":""}', '*');
      } catch (e) {}
    }
  }
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
  forceWebKitPlaybackSession();
  if (ytPlayer && ytApiReady && typeof ytPlayer.getPlayerState === 'function') {
    const s = ytPlayer.getPlayerState();
    if (s === 1) { // 1 = PLAYING
      try { ytPlayer.pauseVideo(); } catch (e) {}
      updatePlayPauseButton(false);
      if (!HD_IS_IOS_CARPLAY && 'mediaSession' in navigator) navigator.mediaSession.playbackState = 'paused';
    } else {
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
    try {
      if (typeof event.target.unMute === 'function') event.target.unMute();
      if (typeof event.target.setVolume === 'function') event.target.setVolume(100);
      event.target.loadVideoById({ videoId: req.id, startSeconds: req.time || 0 });
      if (typeof event.target.playVideo === 'function') event.target.playVideo();
      updatePlayPauseButton(true);
    } catch (e) {}
    return;
  }
}

function onYoutubePlayerStateChange(event) {
  if (!ytPlayer || (event && event.target && event.target !== ytPlayer)) return;
  if (event.data === 0) { // ENDED
    updatePlayPauseButton(false);
    if (state.autoNext) {
      toast('🔄 Hết bài, tự động phát bài kế tiếp...');
      setTimeout(() => playNext(), 600);
    }
  } else if (event.data === 1) { // PLAYING
    updatePlayPauseButton(true);
    if (!HD_IS_IOS_CARPLAY && 'mediaSession' in navigator) navigator.mediaSession.playbackState = 'playing';
  } else if (event.data === 2) { // PAUSED
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

  // Ép WebKit chuyển trạng thái AudioSession về Playback ngay trong User Gesture
  forceWebKitPlaybackSession();

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
  recordSongPlayForTaste(item);
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
  const searchInput = document.getElementById('searchInput');
  const isSearching = searchInput && searchInput.value.trim().length > 0;
  const homeList = getHomeSuggestedPlaylist();
  const listToRender = isSearching && (state.playlist && state.playlist.length > 0)
    ? state.playlist
    : homeList;

  state.playlist = [...listToRender];
  renderSearchResults(listToRender);
  renderFavoritesList();
  updateFavoritesUI();
}

/* =========================================================================
   5. BỘ MÁY TÌM KIẾM YOUTUBE ĐA LUỒNG SIÊU TỐC (PIPED + INVIDIOUS + YOUTUBE HTML PARSER)
   ========================================================================= */

function parseYoutubeHtmlResults(html) {
  if (!html || typeof html !== 'string') return [];
  try {
    let rawJson = '';
    const match1 = html.match(/ytInitialData\s*=\s*(\{[\s\S]+?\});\s*<\/script>/);
    if (match1) {
      rawJson = match1[1];
    } else {
      const match2 = html.match(/var\s+ytInitialData\s*=\s*(\{[\s\S]+?\});/);
      if (match2) {
        rawJson = match2[1];
      } else {
        const matchHex = html.match(/ytInitialData\s*=\s*'([^']+)'/);
        if (matchHex && matchHex[1]) {
          rawJson = matchHex[1].replace(/\\x([0-9A-Fa-f]{2})/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
        }
      }
    }

    if (rawJson) {
      const json = JSON.parse(rawJson);
      const contents =
        json?.contents?.twoColumnSearchResultsRenderer?.tabs?.[0]?.tabRenderer?.content?.sectionListRenderer?.contents ||
        json?.contents?.sectionListRenderer?.contents ||
        [];

      const items = [];
      const seen = new Set();
      for (const section of contents) {
        const itemSection = section?.itemSectionRenderer?.contents || [];
        for (const item of itemSection) {
          const v = item?.videoRenderer || item?.compactVideoRenderer || item?.videoWithContextRenderer;
          const vid = v?.videoId || '';
          if (vid && /^[\w-]{11}$/.test(vid) && !seen.has(vid)) {
            seen.add(vid);
            const title =
              v.title?.runs?.[0]?.text ||
              v.title?.simpleText ||
              v.headline?.runs?.[0]?.text ||
              'YouTube Video';
            const channel =
              v.ownerText?.runs?.[0]?.text ||
              v.longBylineText?.runs?.[0]?.text ||
              v.shortBylineText?.runs?.[0]?.text ||
              'YouTube';
            items.push({ id: vid, title, channel, thumb: ytThumb(vid) });
          }
        }
      }
      if (items.length > 0) return items;
    }

    // Fallback quét trực tiếp videoRenderer trong HTML nếu cấu trúc JSON thay đổi
    const fallbackItems = [];
    const seenIds = new Set();
    const regex = /"videoRenderer":\{"videoId":"([\w-]{11})"[\s\S]{1,1200}?"title":\{"(?:runs":\[\{"text":"([^"]+)"|simpleText":"([^"]+)")/g;
    let m;
    while ((m = regex.exec(html)) !== null) {
      const id = m[1];
      const title = (m[2] || m[3] || 'YouTube Video').replace(/\\u0026/g, '&').replace(/\\"/g, '"');
      if (id && !seenIds.has(id)) {
        seenIds.add(id);
        fallbackItems.push({ id, title, channel: 'YouTube', thumb: ytThumb(id) });
      }
      if (fallbackItems.length >= 25) break;
    }
    return fallbackItems;
  } catch (e) {
    return [];
  }
}

function extractVideoItemsFromApiData(data) {
  if (!data) return [];
  if (typeof data === 'string') {
    return parseYoutubeHtmlResults(data);
  }
  if (data && typeof data.contents === 'string') {
    const htmlItems = parseYoutubeHtmlResults(data.contents);
    if (htmlItems.length > 0) return htmlItems;
    try {
      data = JSON.parse(data.contents);
    } catch (e) {
      return [];
    }
  }

  // Hỗ trợ cả định dạng mảng của Invidious ([...]) và định dạng Object của Piped ({ items: [...] })
  const rawList = Array.isArray(data)
    ? data
    : (Array.isArray(data?.items) ? data.items : (Array.isArray(data?.results) ? data.results : []));

  if (!rawList.length) return [];

  const items = [];
  const seen = new Set();
  for (const item of rawList) {
    if (!item) continue;
    // Bỏ qua channel / playlist trên Piped hoặc Invidious
    if (item.type && item.type !== 'video' && item.type !== 'stream') continue;

    let id = item.videoId || (typeof item.id === 'string' ? item.id : item.id?.videoId) || '';
    if (!id && typeof item.url === 'string') {
      const match = item.url.match(/(?:v=|\/watch\?v=|\/embed\/|\/shorts\/|youtu\.be\/)([\w-]{11})/);
      if (match) id = match[1];
    }

    if (id && /^[\w-]{11}$/.test(id) && !seen.has(id)) {
      seen.add(id);
      const title = item.title || item.snippet?.title || 'YouTube Video';
      const channel = item.uploaderName || item.author || item.channel || item.snippet?.channelTitle || 'YouTube';
      const thumb = ytThumb(id);
      items.push({ id, title, channel, thumb });
    }
  }
  return items;
}

async function searchSingleEndpoint(apiUrl, timeoutMs = 5500) {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    const res = await fetch(apiUrl, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (!res.ok) return [];

    const text = await res.text();
    if (!text) return [];

    try {
      const json = JSON.parse(text);
      const parsed = extractVideoItemsFromApiData(json);
      if (parsed.length > 0) return parsed;
    } catch (e) {
      // Nếu phản hồi là HTML trực tiếp từ proxy YouTube
      const htmlItems = parseYoutubeHtmlResults(text);
      if (htmlItems.length > 0) return htmlItems;
    }

    return [];
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

// Tìm kiếm ngầm bài hát cùng thể loại không đụng chạm màn hình hay audio session
async function silentFetchGenreSongs(searchQuery) {
  if (!searchQuery) return [];
  try {
    const encoded = encodeURIComponent(searchQuery);
    const ytSearchUrl = encodeURIComponent(`https://www.youtube.com/results?search_query=${encoded}`);
    const endpoints = [
      `https://api.piped.private.coffee/search?q=${encoded}&filter=videos`,
      `https://pipedapi.ducks.party/search?q=${encoded}&filter=videos`,
      `https://pipedapi.wireway.ch/search?q=${encoded}&filter=videos`,
      `https://pipedapi.kavin.rocks/search?q=${encoded}&filter=videos`,
      `https://inv.nadeko.net/api/v1/search?q=${encoded}&type=video`,
      `https://api.allorigins.win/get?url=${ytSearchUrl}`
    ];
    const promises = endpoints.map(u => searchSingleEndpoint(u, 5000));
    const results = await firstSuccessfulResult(promises);
    return Array.isArray(results) ? results : [];
  } catch (e) {
    return [];
  }
}

// Ghi nhận gu nhạc sau khi bài hát đã bắt đầu phát (chạy nền, không giật âm thanh)
let tasteUpdateDebounceTimer = null;
function recordSongPlayForTaste(item) {
  if (!item || !item.id) return;
  if (tasteUpdateDebounceTimer) clearTimeout(tasteUpdateDebounceTimer);
  tasteUpdateDebounceTimer = setTimeout(async () => {
    try {
      const detected = detectGenreFromText(item.title, item.channel);
      const taste = loadAccountTaste();

      if (detected) {
        taste.genres[detected.genre] = (taste.genres[detected.genre] || 0) + 1;
        let maxCount = 0;
        let topGenreName = detected.genre;
        for (const [g, count] of Object.entries(taste.genres)) {
          if (count > maxCount) {
            maxCount = count;
            topGenreName = g;
          }
        }
        taste.topGenre = topGenreName;
        const topRule = GENRE_RULES.find(r => r.genre === topGenreName) || detected;

        // Đưa bài vừa nghe lên đầu danh sách gợi ý
        const existingIdx = taste.homeSuggestions.findIndex(x => x.id === item.id);
        if (existingIdx >= 0) taste.homeSuggestions.splice(existingIdx, 1);
        taste.homeSuggestions.unshift(item);

        // Lưu trước bài vừa nghe vào cache
        saveAccountTaste(taste);

        // Nếu danh sách gợi ý chưa đủ 15 bài, tìm ngầm thêm bài cùng thể loại
        if (taste.homeSuggestions.length < 15 && topRule && topRule.query) {
          taste.lastUpdated = Date.now();
          const freshSongs = await silentFetchGenreSongs(topRule.query);
          if (freshSongs && freshSongs.length > 0) {
            const seenIds = new Set(taste.homeSuggestions.map(x => x.id));
            for (const s of freshSongs) {
              if (s && s.id && !seenIds.has(s.id)) {
                seenIds.add(s.id);
                taste.homeSuggestions.push(s);
              }
            }
            taste.homeSuggestions = taste.homeSuggestions.slice(0, 30);
            saveAccountTaste(taste);

            // Nếu người dùng đang ở trang chủ, cập nhật danh sách gợi ý mượt mà
            const searchInput = document.getElementById('searchInput');
            if (searchInput && !searchInput.value.trim() && !document.body.classList.contains('cinema')) {
              state.playlist = [...taste.homeSuggestions];
              renderSearchResults(taste.homeSuggestions);
            }
          }
          return;
        }
      } else {
        const existingIdx = taste.homeSuggestions.findIndex(x => x.id === item.id);
        if (existingIdx >= 0) taste.homeSuggestions.splice(existingIdx, 1);
        taste.homeSuggestions.unshift(item);
        taste.homeSuggestions = taste.homeSuggestions.slice(0, 30);
        saveAccountTaste(taste);
      }
    } catch (err) {
      console.warn('Taste update warning:', err);
    }
  }, 400);
}

// Ghi nhận gu nhạc từ từ khóa tìm kiếm và lưu các bài cùng thể loại vào cache trang chủ
function recordSearchForTaste(query, searchResults) {
  if (!query || !Array.isArray(searchResults) || !searchResults.length) return;
  setTimeout(() => {
    try {
      const detected = detectGenreFromText(query, '');
      const taste = loadAccountTaste();
      const genreName = detected ? detected.genre : query.trim();

      taste.genres[genreName] = (taste.genres[genreName] || 0) + 3;

      let maxCount = 0;
      let topGenreName = genreName;
      for (const [g, count] of Object.entries(taste.genres)) {
        if (count > maxCount) {
          maxCount = count;
          topGenreName = g;
        }
      }
      taste.topGenre = topGenreName;

      // Đưa các bài cùng thể loại tìm được vào đầu danh sách gợi ý
      const existing = taste.homeSuggestions || [];
      const seenIds = new Set();
      const combined = [];
      for (const item of searchResults) {
        if (item && item.id && !seenIds.has(item.id)) {
          seenIds.add(item.id);
          combined.push(item);
        }
        if (combined.length >= 15) break;
      }
      for (const item of existing) {
        if (item && item.id && !seenIds.has(item.id)) {
          seenIds.add(item.id);
          combined.push(item);
        }
        if (combined.length >= 30) break;
      }

      taste.homeSuggestions = combined;
      taste.lastUpdated = Date.now();
      saveAccountTaste(taste);
    } catch (e) {}
  }, 200);
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
        const arr = extractVideoItemsFromApiData(j);
        if (arr.length > 0) {
          recordSearchForTaste(q, arr);
          renderSearchResults(arr);
          return arr;
        }
      }
    } catch (e) {}
  }

  const encoded = encodeURIComponent(q);
  const ytSearchUrl = encodeURIComponent(`https://www.youtube.com/results?search_query=${encoded}`);

  // Đua song song (Parallel Race) các cụm máy chủ Piped API & Proxy đang hoạt động nhanh nhất
  const primaryEndpoints = [
    `https://api.piped.private.coffee/search?q=${encoded}&filter=videos`,
    `https://pipedapi.ducks.party/search?q=${encoded}&filter=videos`,
    `https://pipedapi.wireway.ch/search?q=${encoded}&filter=videos`,
    `https://pipedapi.kavin.rocks/search?q=${encoded}&filter=videos`,
    `https://inv.nadeko.net/api/v1/search?q=${encoded}&type=video`,
    `https://invidious.perennialte.ch/api/v1/search?q=${encoded}&type=video`,
    `https://yewtu.be/api/v1/search?q=${encoded}&type=video`,
    `https://api.allorigins.win/get?url=${ytSearchUrl}`,
    `https://api.codetabs.com/v1/proxy?quest=${ytSearchUrl}`
  ];

  const uniqueEndpoints = Array.from(new Set(primaryEndpoints));
  const promises = uniqueEndpoints.map(url => searchSingleEndpoint(url, 6000));
  const results = await firstSuccessfulResult(promises);

  if (Array.isArray(results) && results.length > 0) {
    recordSearchForTaste(q, results);
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

function renderSearchResults(arr, customTitle = '') {
  const out = document.getElementById('results');
  if (!out) return;
  const countEl = document.getElementById('resultCount');
  if (countEl) countEl.textContent = arr.length ? `(${arr.length} bài hát)` : '';

  const titleEl = document.getElementById('resultsTitle') || document.querySelector('#resultsHeader h2');
  if (titleEl) {
    const searchInput = document.getElementById('searchInput');
    const isSearching = searchInput && searchInput.value.trim().length > 0;
    if (customTitle) {
      titleEl.textContent = customTitle;
    } else if (isSearching) {
      titleEl.textContent = '🔍 Kết quả tìm kiếm';
    } else {
      const taste = loadAccountTaste();
      if (taste && taste.topGenre) {
        titleEl.textContent = '🎧 Gợi ý: ' + taste.topGenre;
      } else {
        titleEl.textContent = 'Danh sách bài hát';
      }
    }
  }

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
      }
    };
    itemEl.onkeydown = (e) => {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'NumpadEnter') {
        e.preventDefault();
        const item = arr.find(x => x.id === itemEl.dataset.playId);
        if (item) {
          play(item);
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
   6. ĐIỀU KHIỂN TOÀN MÀN HÌNH (CINEMA MODE)
   ========================================================================= */

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
    focusCinemaButton(0);
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

  if (modePill && modePill.offsetParent !== null) targets.push(modePill);
  if (userBadge && userBadge.style.display !== 'none' && userBadge.offsetParent !== null) targets.push(userBadge);
  if (searchInput && searchInput.offsetParent !== null) targets.push(searchInput);
  if (searchBtn && searchBtn.offsetParent !== null) targets.push(searchBtn);

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
    // Phím Back / Escape trên vô lăng hoặc xe: đóng modal / thoát toàn màn hình
    if (e.key === 'Escape' || e.key === 'BrowserBack' || e.key === 'GoBack') {
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
      if (document.activeElement === searchInput && searchBtn) {
        e.preventDefault();
        setRotaryFocus(searchBtn);
        return;
      }
    }
    if (e.key === 'ArrowLeft') {
      const searchInput = document.getElementById('searchInput');
      const searchBtn = document.getElementById('btnTextSearch');
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
  const renewTabBtn = document.getElementById('tabRenewBtn');
  if (loginTabBtn) loginTabBtn.onclick = () => switchTab('login');
  if (regTabBtn) regTabBtn.onclick = () => switchTab('reg');
  if (renewTabBtn) renewTabBtn.onclick = () => switchTab('renew');

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

  const btnDoRenew = document.getElementById('btnDoRenew');
  const renewPassInput = document.getElementById('renewPass');
  const renewPhoneInput = document.getElementById('renewPhone');
  if (btnDoRenew) btnDoRenew.onclick = handleRenew;
  if (renewPassInput) renewPassInput.onkeydown = (e) => { if (e.key === 'Enter') handleRenew(); };
  if (renewPhoneInput) renewPhoneInput.onkeydown = (e) => { if (e.key === 'Enter') handleRenew(); };

  const btnAccModalRenew = document.getElementById('btnAccModalRenew');
  if (btnAccModalRenew) btnAccModalRenew.onclick = openRenewModalFromAccount;

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

    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
      searchInput.addEventListener('input', () => {
        if (!searchInput.value.trim()) {
          const homeList = getHomeSuggestedPlaylist();
          if (homeList && homeList.length > 0) {
            state.playlist = [...homeList];
            renderSearchResults(homeList);
          }
        }
      });
    }
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
