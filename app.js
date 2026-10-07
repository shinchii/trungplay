/* =========================================================================
   APTV CARPLAY & WEB STREAM - MAIN LOGIC (app.js)
   Firebase Firestore Project ID: trungplay-12c60
   Chức năng: Khóa 1 Tài khoản / 1 Thiết bị & Tối ưu UI Mobile CarPlay
   ========================================================================= */

// 1. CẤU HÌNH FIREBASE FIRESTORE PROJECT (DÙNG CHUNG VỚI APP ANDROID)
const firebaseConfig = {
  apiKey: "AIzaSyD_T8u2_fHLSVyrMnOvIRYJULuLrF5fxJA",
  authDomain: "trungplay-12c60.firebaseapp.com",
  projectId: "trungplay-12c60",
  storageBucket: "trungplay-12c60.firebasestorage.app",
  messagingSenderId: "642083340590",
  appId: "1:642083340590:web:151c35a53783ab31b93abf",
  measurementId: "G-4LG6EV6HM4"
};

// Khởi tạo Firebase SDK compat
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}
const db = firebase.firestore();

// 2. CẤU HÌNH ỨNG DỤNG MẶC ĐỊNH
const DEFAULT_M3U_URL = 'https://raw.githubusercontent.com/iptv-org/iptv/master/streams/vn.m3u';
const KEY = 'trungplay_v2_data';

const defaults = {
  apiKey: '',
  proxyUrl: '',
  playlist: [
    { id: 'L_LUpnjgPso', title: 'Tuyển Tập Nhạc Sàn Xe Hơi CarPlay Hot', channel: 'CarPlay Music', thumb: 'https://i.ytimg.com/vi/L_LUpnjgPso/mqdefault.jpg' }
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

// TẠO VÀ KHÓA DUY NHẤT 1 DEVICE ID CHO MỖI TRÌNH DUYỆT / ĐIỆN THOẠI
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
   3. KHÓA 1 TÀI KHOẢN / 1 THIẾT BỊ & ĐĂNG NHẬP / ĐĂNG KÝ
   ========================================================================= */

function showAuthModal() {
  const modal = document.getElementById('authModal');
  modal.classList.add('open');
  document.body.style.overflow = 'hidden';
}

function hideAuthModal() {
  const modal = document.getElementById('authModal');
  modal.classList.remove('open');
  document.body.style.overflow = '';
}

function showAuthError(msg) {
  const err = document.getElementById('authError');
  err.textContent = msg;
  err.style.display = 'block';
}

function clearAuthError() {
  const err = document.getElementById('authError');
  err.style.display = 'none';
  err.textContent = '';
}

// ĐỒNG BỘ SESSION & ĐẢM BẢO THIẾT BỊ ĐÚNG CHÍNH CHỦ
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

    // Kiểm tra nếu thiết bị hiện tại không khớp với device_id đã khóa
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
    badge.style.display = 'flex';
    badgePhone.textContent = `👤 ${user.username}`;
    if (accPhone) accPhone.value = user.username;
    if (accExpire) {
      const d = new Date(user.expire_date);
      accExpire.value = d.toLocaleDateString('vi-VN') + ' ' + d.toLocaleTimeString('vi-VN');
    }
  }
}

// XỬ LÝ ĐĂNG NHẬP KHÓA 1 TÀI KHOẢN / 1 THIẾT BỊ
async function handleLogin() {
  clearAuthError();
  const phone = document.getElementById('loginPhone').value.trim();
  const pass = document.getElementById('loginPass').value.trim();
  const currentDevId = getDeviceId();

  if (!phone || !pass) {
    return showAuthError('Vui lòng nhập đầy đủ Số điện thoại và Mật khẩu.');
  }

  const hashed = hashMD5(pass);

  try {
    toast('Đang xác thực với Firestore...');
    const docRef = db.collection('users').doc(phone);
    const docSnap = await docRef.get();

    if (!docSnap.exists) {
      return showAuthError('Tài khoản chưa tồn tại. Vui lòng chọn Tab Đăng ký.');
    }

    const userData = docSnap.data();
    const storedPass = (userData.password_hash || userData.passwordHash || userData.password || '').toString().trim().toLowerCase();
    const inputHash = hashed.toLowerCase().trim();
    const inputPlain = pass.trim().toLowerCase();

    // So sánh mật khẩu
    const isMatch = (storedPass === inputHash) || (storedPass === inputPlain);

    if (!isMatch) {
      return showAuthError('Mật khẩu không chính xác. Vui lòng thử lại.');
    }

    // KHÓA 1 TÀI KHOẢN / 1 THIẾT BỊ
    if (userData.device_id && userData.device_id !== "" && userData.device_id !== currentDevId) {
      return showAuthError('⚠️ ĐĂNG NHẬP THẤT BẠI: Tài khoản này đã được liên kết với 1 thiết bị khác! Mỗi tài khoản chỉ được dùng trên 1 thiết bị.');
    }

    // Nếu tài khoản chưa có device_id (mới đăng ký hoặc Admin vừa reset), tự động trói với thiết bị này!
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

    // ĐĂNG NHẬP THÀNH CÔNG -> LƯU SESSION
    localStorage.setItem('aptv_user', JSON.stringify(userData));
    hideAuthModal();
    updateUserUI(userData);
    toast(`🎉 Đăng nhập thành công! Đã liên kết thiết bị này.`);

  } catch (err) {
    showAuthError('Lỗi kết nối Firestore: ' + err.message);
  }
}

// XỬ LÝ ĐĂNG KÝ & TẠO MÃ VIETQR THANH TOÁN
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
    return showAuthError('Vui lòng nhập Số điện thoại và Mật khẩu để tạo tài khoản.');
  }
  if (!/^0\d{8,10}$/.test(phone)) {
    return showAuthError('Số điện thoại không hợp lệ (Ví dụ: 0965512394).');
  }

  const hashed = hashMD5(pass);
  const now = new Date();
  const expireDate = new Date(now.getTime() + planDays * 86400000).toISOString();

  const userData = {
    username: phone,
    password_hash: hashed,
    device_id: currentDevId, // Khóa ngay với thiết bị vừa đăng ký
    expire_date: expireDate,
    status: 'PENDING',
    created_at: now.toISOString()
  };

  try {
    toast('Đang tạo hồ sơ trên Firestore...');
    await db.collection('users').doc(phone).set(userData, { merge: true });

    const transferContent = `TP ${phone}`;
    const qrUrl = `https://img.vietqr.io/image/TPB-15940510182-compact2.png?amount=${price}&addInfo=${encodeURIComponent(transferContent)}&accountName=${encodeURIComponent("DOAN QUANG TRUNG")}`;

    displayQrCode(qrUrl, price, transferContent);
    listenRealtimeStatus(phone);

  } catch (err) {
    showAuthError('Không thể tạo tài khoản trên Firestore: ' + err.message);
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

  qrImg.src = qrUrl;
  qrAmountText.textContent = price.toLocaleString('vi-VN') + ' VNĐ';
  qrContentText.textContent = contentText;
  qrContainer.style.display = 'block';
  qrContainer.scrollIntoView({ behavior: 'smooth' });
}

function listenRealtimeStatus(phone) {
  if (realtimeUnsubscribe) realtimeUnsubscribe();

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
    console.error('Lỗi Realtime Firestore Listener:', err);
  });
}

function switchTab(tab) {
  clearAuthError();
  const loginBtn = document.getElementById('tabLoginBtn');
  const regBtn = document.getElementById('tabRegBtn');
  const formLogin = document.getElementById('formLogin');
  const formReg = document.getElementById('formReg');

  if (tab === 'login') {
    loginBtn.classList.add('active');
    regBtn.classList.remove('active');
    formLogin.style.display = 'grid';
    formReg.style.display = 'none';
  } else {
    regBtn.classList.add('active');
    loginBtn.classList.remove('active');
    formReg.style.display = 'grid';
    formLogin.style.display = 'none';
  }
}

/* =========================================================================
   4. PLAYER & MEDIA STREAMING (YOUTUBE & TV M3U8)
   ========================================================================= */

function destroyPlayers() {
  if (hlsPlayer) {
    try { hlsPlayer.destroy(); } catch(e){}
    hlsPlayer = null;
  }
  const wrap = document.getElementById('playerWrap');
  if (wrap) wrap.innerHTML = '';
}

function play(item, add = true) {
  if (!item || !item.id) return;
  destroyPlayers();

  current = item;
  currentIndex = state.playlist.findIndex(x => x.id === item.id);

  if (add) addHistory(item);

  showView('home');

  const wrap = document.getElementById('playerWrap');
  wrap.innerHTML = `<iframe id="ytIframe" src="https://www.youtube-nocookie.com/embed/${encodeURIComponent(item.id)}?autoplay=1&rel=0&modestbranding=1&enablejsapi=1" allow="autoplay; encrypted-media; picture-in-picture" allowfullscreen style="width:100%;height:100%;border:0;background:#000"></iframe>`;

  document.getElementById('nowTitle').textContent = item.title || 'YouTube Video';
  document.getElementById('nowSub').textContent = item.channel ? (item.channel + ' · YouTube') : ('YouTube · ' + item.id);

  toast('Đang phát: ' + (item.title || item.id));
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
    <div class="item ${isPlaying ? 'active-play' : ''}" data-play-item="${esc(item.id)}">
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
  el.innerHTML = arr.length ? arr.map(x => itemHtml(x, kind)).join('') : `<div class="empty">Chưa có dữ liệu.</div>`;

  el.querySelectorAll('[data-play]').forEach(b => b.onclick = (e) => {
    e.stopPropagation();
    play(findItem(b.dataset.play));
  });
  el.querySelectorAll('[data-play-item]').forEach(itemEl => itemEl.onclick = () => {
    play(findItem(itemEl.dataset.playItem));
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

  document.getElementById('apiKey').value = state.apiKey;
  document.getElementById('proxyUrl').value = state.proxyUrl;
  document.getElementById('m3uUrl').value = state.tvUrl;

  const btnAuto = document.getElementById('autoNextBtn');
  btnAuto.textContent = `🔄 Tự phát: ${state.autoNext ? 'Bật' : 'Tắt'}`;
  btnAuto.classList.toggle('active', state.autoNext);

  renderTv();
}

/* =========================================================================
   5. BỘ TÌM KIẾM YOUTUBE & VOICE SEARCH
   ========================================================================= */

async function search(q) {
  q = (q || '').trim();
  if (!q) return;
  const out = document.getElementById('results');
  out.innerHTML = '<div class="empty">🔍 Đang tìm kiếm video...</div>';

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
        renderSearchResults(arr);
        return;
      }
    } catch (e) {
      console.warn('Google API failed, switching to public search...');
    }
  }

  const publicApis = [
    `https://pipedapi.kavin.rocks/search?q=${encodeURIComponent(q)}&filter=videos`,
    `https://api.piped.private.coffee/search?q=${encodeURIComponent(q)}&filter=videos`,
    `https://invidious.drgns.space/api/v1/search?q=${encodeURIComponent(q)}&type=video`
  ];

  for (const apiUrl of publicApis) {
    try {
      const res = await fetch(apiUrl, { signal: AbortSignal.timeout(4000) });
      if (!res.ok) continue;
      const data = await res.json();
      let items = [];
      if (Array.isArray(data.items)) {
        items = data.items.map(x => ({
          id: (x.url || '').split('v=')[1] || x.id,
          title: x.title,
          channel: x.uploaderName || x.author || 'YouTube',
          thumb: x.thumbnail || ytThumb((x.url || '').split('v=')[1])
        })).filter(x => x.id);
      } else if (Array.isArray(data)) {
        items = data.map(x => ({
          id: x.videoId,
          title: x.title,
          channel: x.author,
          thumb: x.videoThumbnails?.[0]?.url || ytThumb(x.videoId)
        })).filter(x => x.id);
      }

      if (items.length > 0) {
        renderSearchResults(items);
        return;
      }
    } catch (err) {
      console.warn('Public API error:', apiUrl, err);
    }
  }

  out.innerHTML = `
    <div class="empty">
      Không tìm thấy kết quả hoặc lỗi mạng.<br>
      <button class="pill primary" style="margin-top:10px" onclick="document.getElementById('urlModal').classList.add('open')">🔗 Mở trực tiếp bằng Link YouTube</button>
    </div>`;
}

function renderSearchResults(arr) {
  const out = document.getElementById('results');
  out.innerHTML = arr.length ? arr.map(x => itemHtml(x, 'result')).join('') : '<div class="empty">Không tìm thấy video nào.</div>';
  document.getElementById('resultCount').textContent = arr.length + ' video';

  out.querySelectorAll('[data-play]').forEach(b => b.onclick = (e) => {
    e.stopPropagation();
    const item = arr.find(x => x.id === b.dataset.play);
    if (item) play(item);
  });
  out.querySelectorAll('[data-play-item]').forEach(itemEl => itemEl.onclick = () => {
    const item = arr.find(x => x.id === itemEl.dataset.playItem);
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
  document.getElementById('view-' + v).hidden = false;
  
  // Highlight active tab in both Sidebar and Mobile Bottom Nav
  document.querySelectorAll('.nav button, .mobile-nav button').forEach(x => x.classList.toggle('active', x.dataset.view === v));
  document.getElementById('sidebar').classList.remove('open');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function renderTv() {
  const el = document.getElementById('tvList');
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
  const url = document.getElementById('m3uUrl').value.trim() || DEFAULT_M3U_URL;
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
  // Kiểm tra session đăng nhập
  checkPersistentSession();

  // Tab Đăng nhập / Đăng ký
  document.getElementById('tabLoginBtn').onclick = () => switchTab('login');
  document.getElementById('tabRegBtn').onclick = () => switchTab('reg');

  // Submit Đăng nhập
  document.getElementById('btnDoLogin').onclick = handleLogin;
  document.getElementById('loginPass').onkeydown = (e) => { if (e.key === 'Enter') handleLogin(); };

  // Submit Đăng ký & VietQR
  document.getElementById('btnCreateQr').onclick = handleRegister;

  // Đăng xuất
  document.getElementById('btnLogout').onclick = () => {
    if (confirm('Bạn có chắc chắn muốn đăng xuất tài khoản?')) {
      localStorage.removeItem('aptv_user');
      location.reload();
    }
  };

  // UI Navigation (Sidebar & Mobile Bottom Nav)
  document.getElementById('searchForm').onsubmit = e => {
    e.preventDefault();
    search(document.getElementById('searchInput').value);
  };

  document.querySelectorAll('.nav button, .mobile-nav button').forEach(b => b.onclick = () => showView(b.dataset.view));
  document.getElementById('menuBtn').onclick = () => document.getElementById('sidebar').classList.toggle('open');
  document.getElementById('settingsTop').onclick = () => showView('settings');
  document.getElementById('openUrlBtn').onclick = () => document.getElementById('urlModal').classList.add('open');

  document.getElementById('saveSettings').onclick = () => {
    state.apiKey = document.getElementById('apiKey').value.trim();
    state.proxyUrl = document.getElementById('proxyUrl').value.trim();
    saveState();
    toast('Đã lưu cài đặt');
  };

  document.getElementById('autoNextBtn').onclick = () => {
    state.autoNext = !state.autoNext;
    saveState();
    renderAll();
    toast(state.autoNext ? 'Đã BẬT tự động chuyển bài' : 'Đã TẮT tự động chuyển bài');
  };

  document.getElementById('clearPlaylist').onclick = document.getElementById('clearPlaylist2').onclick = () => {
    state.playlist = [];
    currentIndex = -1;
    saveState();
    renderAll();
    toast('Đã xóa danh sách phát');
  };

  document.getElementById('clearHistory').onclick = () => {
    state.history = [];
    saveState();
    renderAll();
    toast('Đã xóa lịch sử');
  };

  document.getElementById('prevBtn').onclick = playPrev;
  document.getElementById('nextBtn').onclick = playNext;
  document.getElementById('playCurrent').onclick = () => current ? play(current, false) : toast('Chưa có video đang phát');
  document.getElementById('favCurrent').onclick = () => current && toggleFav(current);

  document.getElementById('loadM3u').onclick = () => loadM3u(false);
  document.getElementById('clearTv').onclick = () => {
    state.tv = [];
    saveState();
    renderAll();
    toast('Đã xóa cache TV');
  };

  document.getElementById('openManual').onclick = () => {
    const id = vidFromUrl(document.getElementById('manualUrl').value);
    if (!id) return toast('URL / Video ID không hợp lệ');
    const x = { id, title: 'YouTube Video', thumb: ytThumb(id), channel: 'YouTube' };
    document.getElementById('urlModal').classList.remove('open');
    play(x);
  };
  document.querySelectorAll('[data-close]').forEach(b => b.onclick = () => document.getElementById('urlModal').classList.remove('open'));

  document.getElementById('exportBtn').onclick = () => {
    const backup = { format: 'trung-play-backup', version: 3.0, createdAt: new Date().toISOString(), storage: state };
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' }));
    a.download = 'trung-play-backup-' + new Date().toISOString().slice(0, 10) + '.json';
    a.click();
    URL.revokeObjectURL(a.href);
    toast('Đã xuất file Backup');
  };

  document.getElementById('importBtn').onclick = () => document.getElementById('importFile').click();
  document.getElementById('importFile').onchange = async e => {
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

  document.getElementById('resetBtn').onclick = () => {
    if (confirm('Xóa toàn bộ dữ liệu ứng dụng trên thiết bị này?')) {
      localStorage.removeItem(KEY);
      state = loadState();
      renderAll();
      toast('Đã đặt lại ứng dụng');
    }
  };

  renderAll();
  initVoiceSearch();

  if (!state.tv.length) {
    loadM3u(true);
  }
});
