/* =========================================================================
   APTV CARPLAY & WEB STREAM - MAIN LOGIC (app.js)
   Firebase Firestore Project ID: trungplay-12c60
   Tối ưu 100% chạy trên Vercel, CarPlay, Mobile & Desktop
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

// HÀM BĂM MD5 MẬT KHẨU
function hashMD5(str) {
  return CryptoJS.MD5(str).toString();
}

// TẠO HOẶC LẤY DEVICE ID CHO TRÌNH DUYỆT WEB / MOBILE
function getDeviceId() {
  let id = localStorage.getItem('aptv_device_id');
  if (!id) {
    id = 'DEV_' + Math.random().toString(36).substr(2, 8) + '_' + Date.now().toString(36);
    localStorage.setItem('aptv_device_id', id);
  }
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
}

function hideAuthModal() {
  const modal = document.getElementById('authModal');
  if (modal) {
    modal.classList.remove('open');
    document.body.style.overflow = '';
  }
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

function checkPersistentSession() {
  const sessionStr = localStorage.getItem('aptv_user');
  if (!sessionStr) {
    showAuthModal();
    return false;
  }

  try {
    const user = JSON.parse(sessionStr);
    const now = new Date();
    const expireDate = new Date(user.expire_date);
    const currentDevId = getDeviceId();

    // Kiểm tra thiết bị trùng khớp
    if (user.device_id && user.device_id !== "" && user.device_id !== currentDevId) {
      localStorage.removeItem('aptv_user');
      showAuthModal();
      showAuthError('Tài khoản này đã bị khóa trên 1 thiết bị khác!');
      return false;
    }

    if (user.status === 'ACTIVE' && expireDate > now) {
      hideAuthModal();
      updateUserUI(user);
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
  const badge = document.getElementById('userBadge');
  const badgePhone = document.getElementById('badgePhone');
  const accPhone = document.getElementById('accPhone');
  const accExpire = document.getElementById('accExpire');

  if (user && user.username) {
    if (badge) badge.style.display = 'flex';
    if (badgePhone) badgePhone.textContent = `👤 ${user.username}`;
    if (accPhone) accPhone.value = user.username;
    if (accExpire) {
      const d = new Date(user.expire_date);
      accExpire.value = d.toLocaleDateString('vi-VN') + ' ' + d.toLocaleTimeString('vi-VN');
    }
  }
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
    const inputHash = hashed.toLowerCase().trim();
    const inputPlain = pass.trim().toLowerCase();

    const isMatch = (storedPass === inputHash) || (storedPass === inputPlain);
    if (!isMatch) {
      return showAuthError('Mật khẩu không chính xác. Vui lòng thử lại.');
    }

    // Khóa 1 thiết bị
    if (userData.device_id && userData.device_id !== "" && userData.device_id !== currentDevId) {
      return showAuthError('⚠️ Tài khoản này đã liên kết với 1 thiết bị khác! Mỗi tài khoản chỉ dùng trên 1 thiết bị.');
    }

    if (!userData.device_id || userData.device_id === "") {
      await db.collection('users').doc(phone).update({ device_id: currentDevId });
      userData.device_id = currentDevId;
    }

    const now = new Date();
    const expireDate = new Date(userData.expire_date);

    if (userData.status !== 'ACTIVE') {
      showAuthError('Tài khoản đang chờ kích hoạt. Vui lòng quét mã VietQR để thanh toán.');
      switchTab('reg');
      document.getElementById('regPhone').value = phone;
      triggerQrGenerationForPhone(phone, 100000);
      return;
    }

    if (expireDate <= now) {
      return showAuthError(`Tài khoản đã hết hạn vào ngày ${expireDate.toLocaleDateString('vi-VN')}. Vui lòng đăng ký gói mới.`);
    }

    localStorage.setItem('aptv_user', JSON.stringify(userData));
    hideAuthModal();
    updateUserUI(userData);
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

  if (!db) {
    initFirebase();
    if (!db) return showAuthError('Không thể kết nối Firebase SDK. Vui lòng kiểm tra mạng.');
  }

  const hashed = hashMD5(pass);
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
    toast('Đang tạo tài khoản trên Firestore...');
    await db.collection('users').doc(phone).set(userData, { merge: true });

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

function displayQrCode(qrUrl, price, contentText) {
  const qrContainer = document.getElementById('qrContainer');
  const qrImg = document.getElementById('qrImage');
  const qrAmountText = document.getElementById('qrAmountText');
  const qrContentText = document.getElementById('qrContentText');

  if (qrImg) qrImg.src = qrUrl;
  if (qrAmountText) qrAmountText.textContent = price.toLocaleString('vi-VN') + ' VNĐ';
  if (qrContentText) qrContentText.textContent = contentText;
  if (qrContainer) {
    qrContainer.style.display = 'block';
    qrContainer.scrollIntoView({ behavior: 'smooth' });
  }
}

function listenRealtimeStatus(phone) {
  if (realtimeUnsubscribe) realtimeUnsubscribe();
  if (!db) return;

  realtimeUnsubscribe = db.collection('users').doc(phone).onSnapshot((docSnap) => {
    if (docSnap.exists) {
      const data = docSnap.data();
      if (data.status === 'ACTIVE') {
        if (realtimeUnsubscribe) realtimeUnsubscribe();
        localStorage.setItem('aptv_user', JSON.stringify(data));
        hideAuthModal();
        updateUserUI(data);
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

function destroyPlayers() {
  if (hlsPlayer) {
    try { hlsPlayer.destroy(); } catch(e){}
    hlsPlayer = null;
  }
  const wrap = document.getElementById('playerWrap');
  if (wrap) wrap.innerHTML = '';
}

// PHÁT VIDEO YOUTUBE EMBED GIỮA TRANG
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
  const embedUrl = `https://www.youtube.com/embed/${encodeURIComponent(videoId)}?autoplay=1&rel=0&modestbranding=1&enablejsapi=1`;

  wrap.innerHTML = `
    <iframe id="ytIframe" 
      src="${embedUrl}" 
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen" 
      allowfullscreen 
      style="width:100%;height:100%;border:0;background:#000">
    </iframe>`;

  document.getElementById('nowTitle').textContent = item.title || 'YouTube Video';
  document.getElementById('nowSub').textContent = item.channel ? (item.channel + ' · YouTube') : ('YouTube · ' + videoId);

  toast('Đang phát: ' + (item.title || videoId));
  renderAll();
}

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

// PHÁT KÊNH TV STREAM (M3U8)
function playTv(ch) {
  destroyPlayers();
  showView('home');
  current = null;

  const src = state.proxyUrl ? state.proxyUrl + encodeURIComponent(ch.url) : ch.url;
  const wrap = document.getElementById('playerWrap');
  wrap.innerHTML = `<video id="tvVideo" controls autoplay playsinline style="width:100%;height:100%;background:#000;object-fit:contain"></video>`;
  const video = document.getElementById('tvVideo');

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
    <div class="item ${isPlaying ? 'active-play' : ''}" data-play-id="${esc(item.id)}">
      <img class="thumb" src="${esc(item.thumb || ytThumb(item.id))}" loading="lazy">
      <div style="min-width:0;cursor:pointer">
        <div class="item-title" title="${esc(item.title || 'YouTube video')}">${esc(item.title || 'YouTube video')}</div>
        <div class="item-sub">${esc(item.channel || 'YouTube')} · ${kind === 'history' ? 'Đã xem' : 'Video'}</div>
      </div>
      <div class="actions">
        <button class="iconbtn" data-play="${esc(item.id)}" title="Phát ngay">▶</button>
        <button class="iconbtn" data-add="${esc(item.id)}" title="Thêm playlist">＋</button>
        <button class="iconbtn" data-fav="${esc(item.id)}" title="${fav ? 'Bỏ yêu thích' : 'Yêu thích'}">${fav ? '♥' : '♡'}</button>
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
   5. BỘ TÌM KIẾM ĐA KÊNH YOUTUBE (CỰC NHẠY VÀ ỔN ĐỊNH TRÊN VERCEL)
   ========================================================================= */

async function search(q) {
  q = (q || '').trim();
  if (!q) return;

  // Nếu người dùng dán Link YouTube hoặc Video ID trực tiếp vào ô tìm kiếm
  const directVid = vidFromUrl(q);
  if (directVid) {
    const item = { id: directVid, title: 'YouTube Video (' + directVid + ')', thumb: ytThumb(directVid), channel: 'YouTube' };
    play(item);
    return;
  }

  const out = document.getElementById('results');
  if (out) out.innerHTML = '<div class="empty">🔍 Đang tìm kiếm video...</div>';

  // 1. Ưu tiên Google API Key nếu người dùng có cài đặt
  if (state.apiKey) {
    try {
      const u = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&maxResults=15&q=${encodeURIComponent(q)}&key=${encodeURIComponent(state.apiKey)}`;
      const r = await fetch(u);
      const j = await r.json();
      if (r.ok && j.items) {
        const arr = j.items.map(x => ({
          id: x.id.videoId,
          title: x.snippet.title,
          channel: x.snippet.channelTitle,
          thumb: x.snippet.thumbnails?.medium?.url || ytThumb(x.id.videoId)
        }));
        if (arr.length > 0) {
          renderSearchResults(arr);
          return;
        }
      }
    } catch (e) {
      console.warn('Google API Key error:', e);
    }
  }

  // 2. Các điểm cuối Invidious CORS ổn định nhất (Yewtu.be, PrivacyDev, NerdVPN)
  const searchEndpoints = [
    `https://yewtu.be/api/v1/search?q=${encodeURIComponent(q)}&type=video`,
    `https://invidious.privacydev.net/api/v1/search?q=${encodeURIComponent(q)}&type=video`,
    `https://invidious.nerdvpn.de/api/v1/search?q=${encodeURIComponent(q)}&type=video`,
    `https://api.piped.private.coffee/search?q=${encodeURIComponent(q)}&filter=videos`
  ];

  for (const apiUrl of searchEndpoints) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);

      const res = await fetch(apiUrl, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (!res.ok) continue;
      const data = await res.json();
      let items = [];

      if (Array.isArray(data)) {
        items = data.filter(x => x.type === 'video' || x.videoId).map(x => ({
          id: x.videoId || x.id,
          title: x.title,
          channel: x.author || x.uploaderName || 'YouTube',
          thumb: (x.videoThumbnails && x.videoThumbnails[0] ? x.videoThumbnails[0].url : '') || ytThumb(x.videoId || x.id)
        })).filter(x => x.id);
      } else if (data && Array.isArray(data.items)) {
        items = data.items.map(x => ({
          id: (x.url || '').split('v=')[1] || x.id,
          title: x.title,
          channel: x.uploaderName || 'YouTube',
          thumb: x.thumbnail || ytThumb((x.url || '').split('v=')[1])
        })).filter(x => x.id);
      }

      if (items.length > 0) {
        renderSearchResults(items);
        return;
      }
    } catch (err) {
      console.warn('Search endpoint error:', apiUrl, err);
    }
  }

  if (out) {
    out.innerHTML = `
      <div class="empty">
        Không thể kết nối máy chủ tìm kiếm.<br>
        Hãy dán đường Link bài hát YouTube vào ô tìm kiếm ở trên để phát ngay.
      </div>`;
  }
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
    <div class="item">
      <div style="width:76px;height:43px;border-radius:8px;background:#202631;display:grid;place-items:center;font-size:20px;color:var(--accent)">📺</div>
      <div style="min-width:0">
        <div class="item-title">${esc(x.name)}</div>
        <div class="item-sub" style="text-overflow:ellipsis;overflow:hidden;white-space:nowrap">${esc(x.url)}</div>
      </div>
      <button class="iconbtn" data-tv="${i}">▶</button>
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

function initVoiceSearch() {
  const btn = document.getElementById('btnMic');
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

  if (!btn) return;
  if (!SpeechRecognition) {
    btn.style.display = 'none';
    return;
  }

  const recog = new SpeechRecognition();
  recog.lang = 'vi-VN';

  btn.onclick = () => {
    btn.classList.add('listening');
    toast('🎙️ Đang nghe... Hãy nói tên bài hát');
    recog.start();
  };

  recog.onresult = (e) => {
    btn.classList.remove('listening');
    const text = e.results[0][0].transcript;
    document.getElementById('searchInput').value = text;
    search(text);
  };

  recog.onerror = () => {
    btn.classList.remove('listening');
    toast('Chưa nghe rõ giọng nói. Thử lại nhé!');
  };

  recog.onend = () => {
    btn.classList.remove('listening');
  };
}

/* =========================================================================
   6. BẮT SỰ KIỆN NÚT BẤM VÀ KHỞI TẠO ỨNG DỤNG
   ========================================================================= */

document.addEventListener('DOMContentLoaded', () => {
  initFirebase();
  checkPersistentSession();

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

  const btnLogout = document.getElementById('btnLogout');
  if (btnLogout) {
    btnLogout.onclick = () => {
      if (confirm('Bạn có chắc chắn muốn đăng xuất tài khoản?')) {
        localStorage.removeItem('aptv_user');
        location.reload();
      }
    };
  }

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
  if (playCurrentBtn) playCurrentBtn.onclick = () => current ? play(current, false) : toast('Chưa có video đang phát');
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

  document.querySelectorAll('[data-close]').forEach(b => b.onclick = () => document.getElementById('urlModal').classList.remove('open'));

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

  if (!state.tv.length) {
    loadM3u(true);
  }
});
