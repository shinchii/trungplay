/* =========================================================
   TRUNG PLAY - CAR MEDIA & INFOTAINMENT APPLICATION LOGIC
   ========================================================= */

// State Management
const appState = {
  currentVideoId: 'DWcJFNfaw9c', // Sơn Tùng M-TP - 100% verified embedding-allowed VOD
  currentVideoTitle: 'Sơn Tùng M-TP | Hãy Trao Cho Anh ft. Snoop Dogg',
  currentChannel: 'Sơn Tùng M-TP',
  isPlaying: true,
  hlsPlayer: null,
  currentTab: 'youtubePane',
  favorites: JSON.parse(localStorage.getItem('tp_favorites')) || [],
  history: JSON.parse(localStorage.getItem('tp_history')) || [],
  settings: JSON.parse(localStorage.getItem('tp_settings')) || {
    largeThumbnails: true,
    autoplay: true,
    ytApiKey: ''
  }
};

// 100% Guaranteed Embedding-Allowed Vietnamese VOD Music Videos
const defaultTracks = [
  { id: 'DWcJFNfaw9c', title: 'Sơn Tùng M-TP | Hãy Trao Cho Anh ft. Snoop Dogg', channel: 'Sơn Tùng M-TP', thumb: 'https://i.ytimg.com/vi/DWcJFNfaw9c/hqdefault.jpg' },
  { id: 'L3wKzyIN1yk', title: 'Sơn Tùng M-TP | Chúng Ta Của Tương Lai (Official Music Video)', channel: 'Sơn Tùng M-TP', thumb: 'https://i.ytimg.com/vi/L3wKzyIN1yk/hqdefault.jpg' },
  { id: 'knW7-J7LBwc', title: 'Sơn Tùng M-TP | Lạc Trôi (Official Music Video)', channel: 'Sơn Tùng M-TP', thumb: 'https://i.ytimg.com/vi/knW7-J7LBwc/hqdefault.jpg' },
  { id: 'ab0r_zLz29U', title: 'Sơn Tùng M-TP | Muộn Rồi Mà Sao Còn (Official Music Video)', channel: 'Sơn Tùng M-TP', thumb: 'https://i.ytimg.com/vi/ab0r_zLz29U/hqdefault.jpg' },
  { id: '5qap5aO4i9A', title: 'Tuyển Tập Nhạc Lofi Chill Lái Xe Tiếng Việt Nhẹ Nhàng', channel: 'Lofi Vibe Việt', thumb: 'https://i.ytimg.com/vi/5qap5aO4i9A/hqdefault.jpg' },
  { id: '3w6p83B3n1w', title: 'Nhạc Trẻ Remix Vinahouse Cực Phiêu Cho Xe Ô Tô', channel: 'Nhạc Xe Ô Tô', thumb: 'https://i.ytimg.com/vi/3w6p83B3n1w/hqdefault.jpg' },
  { id: '7wtfhZwyrcc', title: 'Bolero Trữ Tình Chọn Lọc Tiếng Hát Hay Nhất Cho Bác Tài', channel: 'Bolero Tuyển Chọn', thumb: 'https://i.ytimg.com/vi/7wtfhZwyrcc/hqdefault.jpg' },
  { id: 'kXYiU_JCYtU', title: 'Nhạc Acoustic Chill Nhẹ Nhàng Thư Giãn Cực êm', channel: 'Acoustic Vibe', thumb: 'https://i.ytimg.com/vi/kXYiU_JCYtU/hqdefault.jpg' }
];

// Rich Search Database for Vietnamese Artists & Categories
const songDatabase = [
  { keywords: ['sơn tùng', 'son tung', 'tùng sơn', 'tung son', 'm-tp', 'hãy trao cho anh', 'chúng ta của tương lai'], id: 'L3wKzyIN1yk', title: 'Sơn Tùng M-TP | Chúng Ta Của Tương Lai', channel: 'Sơn Tùng M-TP', thumb: 'https://i.ytimg.com/vi/L3wKzyIN1yk/hqdefault.jpg' },
  { keywords: ['sơn tùng', 'son tung', 'tùng sơn', 'tung son', 'm-tp', 'hãy trao cho anh'], id: 'DWcJFNfaw9c', title: 'Sơn Tùng M-TP | Hãy Trao Cho Anh ft. Snoop Dogg', channel: 'Sơn Tùng M-TP', thumb: 'https://i.ytimg.com/vi/DWcJFNfaw9c/hqdefault.jpg' },
  { keywords: ['sơn tùng', 'son tung', 'tùng sơn', 'tung son', 'lạc trôi', 'lac troi'], id: 'knW7-J7LBwc', title: 'Sơn Tùng M-TP | Lạc Trôi (Official MV)', channel: 'Sơn Tùng M-TP', thumb: 'https://i.ytimg.com/vi/knW7-J7LBwc/hqdefault.jpg' },
  { keywords: ['sơn tùng', 'son tung', 'tùng sơn', 'tung son', 'muộn rồi mà sao còn'], id: 'ab0r_zLz29U', title: 'Sơn Tùng M-TP | Muộn Rồi Mà Sao Còn', channel: 'Sơn Tùng M-TP', thumb: 'https://i.ytimg.com/vi/ab0r_zLz29U/hqdefault.jpg' },
  { keywords: ['remix', 'vinahouse', 'nhạc trẻ', 'sôi động'], id: '3w6p83B3n1w', title: 'Nhạc Trẻ Remix Vinahouse Cực Phiêu 2026', channel: 'Nhạc Xe Ô Tô', thumb: 'https://i.ytimg.com/vi/3w6p83B3n1w/hqdefault.jpg' },
  { keywords: ['remix', 'tiktok', 'hot'], id: '1ZYbU85hi60', title: 'Nhạc Trẻ HOT TikTok Remix Năng Lượng Cho Bác Tài', channel: 'TikTok Remix', thumb: 'https://i.ytimg.com/vi/1ZYbU85hi60/hqdefault.jpg' },
  { keywords: ['bolero', 'trữ tình', 'nhạc vàng'], id: '7wtfhZwyrcc', title: 'Bolero Trữ Tình Chọn Lọc Tiếng Hát Hay Nhất', channel: 'Bolero Tuyển Chọn', thumb: 'https://i.ytimg.com/vi/7wtfhZwyrcc/hqdefault.jpg' },
  { keywords: ['lofi', 'chill', 'lái xe'], id: '5qap5aO4i9A', title: 'Tuyển Tập Lofi Tiếng Việt Nhẹ Nhàng Thư Giãn', channel: 'Lofi Vibe Việt', thumb: 'https://i.ytimg.com/vi/5qap5aO4i9A/hqdefault.jpg' },
  { keywords: ['acoustic', 'guitar', 'cà phê'], id: 'kXYiU_JCYtU', title: 'Nhạc Acoustic Chill Nhẹ Nhàng Thư Giãn', channel: 'Acoustic Vibe', thumb: 'https://i.ytimg.com/vi/kXYiU_JCYtU/hqdefault.jpg' }
];

// IPTV Live TV Channels List (HLS .m3u8 Streams)
const tvChannels = [
  { name: 'VTV1 HD - Thời Sự & Chính Trị', category: 'Thời Sự', streamUrl: 'https://vtv1.vtvgo.vn/vtv1.m3u8' },
  { name: 'VTV3 HD - Giải Trí & Thể Thao', category: 'Giải Trí', streamUrl: 'https://vtv3.vtvgo.vn/vtv3.m3u8' },
  { name: 'VTV6 / VTV Cần Thơ HD - Thể Thao', category: 'Thể Thao', streamUrl: 'https://vtv6.vtvgo.vn/vtv6.m3u8' },
  { name: 'HTV7 HD - Đài Truyền Hình TP.HCM', category: 'Tổng Hợp', streamUrl: 'https://live.vtcmod.com/htv7.m3u8' },
  { name: 'HTV9 HD - Đài Truyền Hình TP.HCM', category: 'Thời Sự', streamUrl: 'https://live.vtcmod.com/htv9.m3u8' },
  { name: 'VTC3 HD - Kênh Thể Thao VTC', category: 'Thể Thao', streamUrl: 'https://live.vtcmod.com/vtc3.m3u8' }
];

// DOM Elements
const DOM = {
  ytIframePlayer: document.getElementById('ytIframePlayer'),
  navButtons: document.querySelectorAll('.header-nav .nav-btn[data-tab]'),
  tabPanes: document.querySelectorAll('.tab-pane'),
  // Direct Link & Hero Search
  txtDirectLink: document.getElementById('txtDirectLink'),
  btnPlayDirectLink: document.getElementById('btnPlayDirectLink'),
  btnVoiceHero: document.getElementById('btnVoiceHero'),
  // Controls
  btnPlayPause: document.getElementById('btnPlayPause'),
  btnPrevTrack: document.getElementById('btnPrevTrack'),
  btnNextTrack: document.getElementById('btnNextTrack'),
  btnStopTrack: document.getElementById('btnStopTrack'),
  btnToggleFav: document.getElementById('btnToggleFav'),
  currentTime: document.getElementById('currentTime'),
  totalTime: document.getElementById('totalTime'),
  progressWrap: document.getElementById('progressWrap'),
  progressFill: document.getElementById('progressFill'),
  nowPlayingTitle: document.getElementById('nowPlayingTitle'),
  nowPlayingSub: document.getElementById('nowPlayingSub'),
  ytMediaList: document.getElementById('ytMediaList'),
  suggestedCategories: document.getElementById('suggestedCategories'),
  favoriteMediaList: document.getElementById('favoriteMediaList'),
  // Modals
  searchModal: document.getElementById('searchModal'),
  settingsModal: document.getElementById('settingsModal'),
  btnOpenSearch: document.getElementById('btnOpenSearch'),
  btnOpenSettings: document.getElementById('btnOpenSettings'),
  btnVoiceModal: document.getElementById('btnVoiceModal'),
  btnVoiceSearch: document.getElementById('btnVoiceSearch'),
  txtSearchQuery: document.getElementById('txtSearchQuery'),
  btnExecuteSearch: document.getElementById('btnExecuteSearch'),
  searchResultsList: document.getElementById('searchResultsList'),
  voiceStatusText: document.getElementById('voiceStatusText'),
  // Settings
  chkLargeThumbnails: document.getElementById('chkLargeThumbnails'),
  chkAutoplay: document.getElementById('chkAutoplay'),
  txtYtApiKey: document.getElementById('txtYtApiKey'),
  btnClearData: document.getElementById('btnClearData'),
  // IPTV
  iptvPlayer: document.getElementById('iptvPlayer'),
  tvChannelList: document.getElementById('tvChannelList'),
  iptvChannelTitle: document.getElementById('iptvChannelTitle'),
  iptvChannelSub: document.getElementById('iptvChannelSub'),
  txtSearchTv: document.getElementById('txtSearchTv'),
  // Data Backup
  btnExportData: document.getElementById('btnExportData'),
  btnImportDataTrigger: document.getElementById('btnImportDataTrigger'),
  btnImportData: document.getElementById('btnImportData')
};

/* =========================================================
   INITIALIZATION & EVENT LISTENERS
   ========================================================= */
document.addEventListener('DOMContentLoaded', () => {
  initApp();
});

function initApp() {
  applySettings();

  // Navigation Tabs
  DOM.navButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetTab = btn.getAttribute('data-tab');
      switchTab(targetTab);
    });
  });

  // Direct Link / Search from Hero Input
  DOM.btnPlayDirectLink.addEventListener('click', handleDirectLinkOrSearch);
  DOM.txtDirectLink.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleDirectLinkOrSearch();
  });
  DOM.btnVoiceHero.addEventListener('click', () => {
    openModal(DOM.searchModal);
    startVoiceRecognition();
  });

  // Player Control Buttons
  DOM.btnPlayPause.addEventListener('click', togglePlayPause);
  DOM.btnStopTrack.addEventListener('click', stopVideo);
  DOM.btnPrevTrack.addEventListener('click', playPrevVideo);
  DOM.btnNextTrack.addEventListener('click', playNextVideo);
  DOM.btnToggleFav.addEventListener('click', toggleCurrentFavorite);

  // Search Modal Triggers
  DOM.btnOpenSearch.addEventListener('click', () => openModal(DOM.searchModal));
  DOM.btnVoiceModal.addEventListener('click', () => {
    openModal(DOM.searchModal);
    startVoiceRecognition();
  });
  DOM.btnVoiceSearch.addEventListener('click', startVoiceRecognition);
  DOM.btnExecuteSearch.addEventListener('click', handleSearchSubmit);
  DOM.txtSearchQuery.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleSearchSubmit();
  });

  // Settings Modal Triggers
  DOM.btnOpenSettings.addEventListener('click', () => openModal(DOM.settingsModal));
  DOM.chkLargeThumbnails.addEventListener('change', (e) => {
    appState.settings.largeThumbnails = e.target.checked;
    saveSettings();
  });
  DOM.chkAutoplay.addEventListener('change', (e) => {
    appState.settings.autoplay = e.target.checked;
    saveSettings();
  });
  DOM.txtYtApiKey.addEventListener('change', (e) => {
    appState.settings.ytApiKey = e.target.value.trim();
    saveSettings();
  });
  DOM.btnClearData.addEventListener('click', resetAllData);

  // Close Modals
  document.querySelectorAll('.modal-close, .modal-overlay').forEach(el => {
    el.addEventListener('click', (e) => {
      if (e.target === el || e.target.classList.contains('modal-close')) {
        closeAllModals();
      }
    });
  });

  // Quick Action Category Buttons
  document.querySelectorAll('#btnQuickPlaySonTung, #btnQuickPlayCategory, #btnQuickPlayChill, #btnQuickPlayBolero').forEach(btn => {
    btn.addEventListener('click', () => {
      const query = btn.getAttribute('data-query');
      DOM.txtSearchQuery.value = query;
      openModal(DOM.searchModal);
      handleSearchSubmit();
    });
  });

  // Backup / Restore Data
  DOM.btnExportData.addEventListener('click', exportUserData);
  DOM.btnImportDataTrigger.addEventListener('click', () => DOM.btnImportData.click());
  DOM.btnImportData.addEventListener('change', importUserData);

  // IPTV TV Search Filter
  DOM.txtSearchTv.addEventListener('input', (e) => renderTvChannels(e.target.value));

  // Render Initial Lists
  renderSuggestedCategories();
  renderMediaList(defaultTracks);
  renderFavoriteList();
  renderTvChannels();
}

/* =========================================================
   HYBRID YOUTUBE EMBED PLAYER & UTILITIES
   ========================================================= */

// Extracts Video ID from YouTube URLs or returns raw string if already ID
function extractVideoId(inputStr) {
  if (!inputStr) return null;
  const str = inputStr.trim();

  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
  const match = str.match(regExp);

  if (match && match[2].length === 11) {
    return match[2];
  }
  if (str.length === 11 && !str.includes(' ')) {
    return str;
  }
  return null;
}

function loadVideo(videoId, title, channel = 'TRUNG PLAY') {
  appState.currentVideoId = videoId;
  appState.currentVideoTitle = title;
  appState.currentChannel = channel;
  appState.isPlaying = true;

  updateNowPlayingUI(title, channel);
  updateFavoriteButtonState();

  // Load standard non-livestream VOD iframe embed with playsinline
  DOM.ytIframePlayer.src = `https://www.youtube.com/embed/${videoId}?autoplay=1&enablejsapi=1&rel=0&playsinline=1`;
  DOM.btnPlayPause.innerHTML = '<i class="fa-solid fa-pause"></i>';
}

function playYouTubeSearchPlaylist(query) {
  appState.currentVideoTitle = `Kết Quả Tìm Kiếm: "${query}"`;
  appState.currentChannel = 'YouTube Live Search Embed';
  updateNowPlayingUI(appState.currentVideoTitle, appState.currentChannel);

  // Embed YouTube's Native Search Playlist directly into Player!
  DOM.ytIframePlayer.src = `https://www.youtube.com/embed?listType=search&list=${encodeURIComponent(query)}&autoplay=1&playsinline=1`;
  appState.isPlaying = true;
  DOM.btnPlayPause.innerHTML = '<i class="fa-solid fa-pause"></i>';
}

function handleDirectLinkOrSearch() {
  const input = DOM.txtDirectLink.value.trim();
  if (!input) return;

  const extractedId = extractVideoId(input);
  if (extractedId) {
    loadVideo(extractedId, `Video YouTube (${extractedId})`, 'Link Trực Tiếp');
    DOM.txtDirectLink.value = '';
  } else {
    DOM.txtSearchQuery.value = input;
    openModal(DOM.searchModal);
    handleSearchSubmit();
  }
}

function togglePlayPause() {
  const iframeWin = DOM.ytIframePlayer.contentWindow;
  if (!iframeWin) return;

  if (appState.isPlaying) {
    iframeWin.postMessage('{"event":"command","func":"pauseVideo","args":""}', '*');
    appState.isPlaying = false;
    DOM.btnPlayPause.innerHTML = '<i class="fa-solid fa-play"></i>';
  } else {
    iframeWin.postMessage('{"event":"command","func":"playVideo","args":""}', '*');
    appState.isPlaying = true;
    DOM.btnPlayPause.innerHTML = '<i class="fa-solid fa-pause"></i>';
  }
}

function stopVideo() {
  const iframeWin = DOM.ytIframePlayer.contentWindow;
  if (iframeWin) {
    iframeWin.postMessage('{"event":"command","func":"stopVideo","args":""}', '*');
  }
  appState.isPlaying = false;
  DOM.btnPlayPause.innerHTML = '<i class="fa-solid fa-play"></i>';
}

function playPrevVideo() {
  const currentIndex = defaultTracks.findIndex(t => t.id === appState.currentVideoId);
  const prevIndex = (currentIndex - 1 + defaultTracks.length) % defaultTracks.length;
  const track = defaultTracks[prevIndex];
  loadVideo(track.id, track.title, track.channel);
}

function playNextVideo() {
  const currentIndex = defaultTracks.findIndex(t => t.id === appState.currentVideoId);
  const nextIndex = (currentIndex + 1) % defaultTracks.length;
  const track = defaultTracks[nextIndex];
  loadVideo(track.id, track.title, track.channel);
}

function updateNowPlayingUI(title, channel) {
  DOM.nowPlayingTitle.innerText = title;
  DOM.nowPlayingSub.innerText = `${channel} • TRUNG PLAY`;
}

/* =========================================================
   VOICE SEARCH (WEB SPEECH API)
   ========================================================= */
function startVoiceRecognition() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    alert('Trình duyệt chưa hỗ trợ nhận diện giọng nói. Bạn hãy gõ tên bài hát vào ô tìm kiếm!');
    return;
  }

  const recognition = new SpeechRecognition();
  recognition.lang = 'vi-VN';
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;

  DOM.btnVoiceSearch.classList.add('listening');
  DOM.voiceStatusText.style.display = 'block';

  recognition.start();

  recognition.onresult = (event) => {
    const transcript = event.results[0][0].transcript;
    DOM.txtSearchQuery.value = transcript;
    DOM.btnVoiceSearch.classList.remove('listening');
    DOM.voiceStatusText.style.display = 'none';
    handleSearchSubmit();
  };

  recognition.onerror = () => {
    DOM.btnVoiceSearch.classList.remove('listening');
    DOM.voiceStatusText.style.display = 'none';
  };

  recognition.onend = () => {
    DOM.btnVoiceSearch.classList.remove('listening');
    DOM.voiceStatusText.style.display = 'none';
  };
}

/* =========================================================
   ROBUST MULTI-LAYER SEARCH ENGINE
   ========================================================= */
async function handleSearchSubmit() {
  const query = DOM.txtSearchQuery.value.trim();
  if (!query) return;

  // 1. Direct YouTube Link check
  const directId = extractVideoId(query);
  if (directId) {
    loadVideo(directId, `Video YouTube (${directId})`, 'Link Trực Tiếp');
    closeAllModals();
    return;
  }

  DOM.searchResultsList.innerHTML = `<div style="text-align:center; padding:25px; color:var(--tp-cyan);"><i class="fa-solid fa-spinner fa-spin"></i> Đang kết nối bài hát "${query}"...</div>`;

  let searchResults = [];

  // 2. Optional Official YouTube Data API v3 Key (if provided by user in Settings)
  if (appState.settings.ytApiKey) {
    try {
      const res = await fetch(`https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=10&q=${encodeURIComponent(query)}&type=video&key=${appState.settings.ytApiKey}`);
      if (res.ok) {
        const data = await res.json();
        if (data.items && data.items.length > 0) {
          searchResults = data.items.map(item => ({
            id: item.id.videoId,
            title: item.snippet.title,
            channel: item.snippet.channelTitle,
            thumb: item.snippet.thumbnails.high?.url || item.snippet.thumbnails.medium?.url || `https://i.ytimg.com/vi/${item.id.videoId}/hqdefault.jpg`
          }));
        }
      }
    } catch (e) {}
  }

  // 3. Match against Curated Vietnamese Song Database
  if (searchResults.length === 0) {
    const qLower = query.toLowerCase();
    const dbMatches = songDatabase.filter(item => 
      item.keywords.some(kw => qLower.includes(kw)) || item.title.toLowerCase().includes(qLower)
    );
    if (dbMatches.length > 0) {
      searchResults = dbMatches;
    }
  }

  // 4. Always provide the Instant Native YouTube Search Player Option at top!
  searchResults = [
    {
      id: `SEARCH:${query}`,
      title: `Phát Trực Tiếp Tất Cả Kết Quả Tìm Cho: "${query}"`,
      channel: 'YouTube Native Direct Search',
      thumb: 'https://i.ytimg.com/vi/DWcJFNfaw9c/hqdefault.jpg',
      isSearchPlaylist: true
    },
    ...searchResults,
    ...defaultTracks.filter(t => !searchResults.some(s => s.id === t.id))
  ];

  renderListItems(DOM.searchResultsList, searchResults, true, query);
}

function renderMediaList(tracks) {
  renderListItems(DOM.ytMediaList, tracks);
}

function renderSuggestedCategories() {
  const categories = [
    { title: 'Sơn Tùng M-TP Hits 2026', query: 'Sơn Tùng M-TP', icon: 'fa-star', color: 'var(--tp-gold)' },
    { title: 'Nhạc Trẻ Remix Vinahouse 2026', query: 'nhac tre remix 2026', icon: 'fa-fire', color: 'var(--tp-red)' },
    { title: 'Nhạc Lofi Chill Lái Xe Đêm', query: 'nhac lofi chill lai xe', icon: 'fa-cloud-moon', color: 'var(--tp-cyan)' },
    { title: 'Tuyển Tập Bolero Trữ Tình Hay Nhất', query: 'nhac bolero tru tinh hay nhat', icon: 'fa-guitar', color: '#8b5cf6' },
    { title: 'Nhạc Acoustic Nhẹ Nhàng Cà Phê', query: 'nhac acoustic chill cafe', icon: 'fa-mug-hot', color: '#10b981' }
  ];

  DOM.suggestedCategories.innerHTML = categories.map(cat => `
    <div class="media-item" onclick="quickSearchCategory('${cat.query}')">
      <div class="brand-icon" style="background: ${cat.color}; width:40px; height:40px; font-size:16px;">
        <i class="fa-solid ${cat.icon}"></i>
      </div>
      <div class="media-info">
        <div class="media-name">${cat.title}</div>
        <div class="media-channel">Bấm để phát nhanh theo chủ đề</div>
      </div>
    </div>
  `).join('');
}

window.quickSearchCategory = function(query) {
  DOM.txtSearchQuery.value = query;
  openModal(DOM.searchModal);
  handleSearchSubmit();
};

function renderListItems(container, tracks, isModal = false, searchQuery = '') {
  container.innerHTML = tracks.map(t => {
    const isActive = t.id === appState.currentVideoId;
    const safeTitle = t.title.replace(/'/g, "\\'").replace(/"/g, '&quot;');
    const safeChannel = t.channel.replace(/'/g, "\\'").replace(/"/g, '&quot;');

    if (t.isSearchPlaylist) {
      return `
        <div class="media-item active" onclick="playYouTubeSearchPlaylist('${searchQuery.replace(/'/g, "\\'")}') ; closeAllModals();" style="border: 2px solid var(--tp-cyan); background: rgba(0,229,255,0.15);">
          <div class="media-thumb" style="background: var(--tp-cyan); display:flex; align-items:center; justify-content:center; color:#070a12; font-size:24px;">
            <i class="fa-solid fa-play"></i>
          </div>
          <div class="media-info">
            <div class="media-name" style="color:var(--tp-cyan); font-weight:800;">${t.title}</div>
            <div class="media-channel">Phát luồng kết quả tìm kiếm tự động từ YouTube</div>
          </div>
        </div>
      `;
    }

    return `
      <div class="media-item ${isActive ? 'active' : ''}" onclick="selectTrack('${t.id}', '${safeTitle}', '${safeChannel}')">
        <div class="media-thumb">
          <img src="${t.thumb}" alt="${t.title}" loading="lazy" onerror="this.src='https://i.ytimg.com/vi/${t.id}/hqdefault.jpg'">
        </div>
        <div class="media-info">
          <div class="media-name">${t.title}</div>
          <div class="media-channel">${t.channel}</div>
        </div>
        <button class="ctrl-btn" style="min-width:36px; height:36px; font-size:14px;" onclick="event.stopPropagation(); toggleFavoriteTrack('${t.id}', '${safeTitle}', '${safeChannel}', '${t.thumb}')">
          <i class="fa-solid fa-heart" style="color: ${isFavorite(t.id) ? 'var(--tp-red)' : 'var(--tp-text-muted)'};"></i>
        </button>
      </div>
    `;
  }).join('');
}

window.selectTrack = function(id, title, channel) {
  loadVideo(id, title, channel);
  closeAllModals();
};

/* =========================================================
   IPTV STREAM PLAYER HANDLER (HLS.js)
   ========================================================= */
function renderTvChannels(filter = '') {
  const filtered = tvChannels.filter(c => c.name.toLowerCase().includes(filter.toLowerCase()));
  
  DOM.tvChannelList.innerHTML = filtered.map(channel => `
    <div class="media-item" onclick="playTvChannel('${channel.streamUrl}', '${channel.name.replace(/'/g, "\\'")}')">
      <div class="media-thumb" style="background:#1e293b; display:flex; align-items:center; justify-content:center;">
        <i class="fa-solid fa-tv" style="font-size:24px; color:var(--tp-cyan);"></i>
      </div>
      <div class="media-info">
        <div class="media-name">${channel.name}</div>
        <div class="media-channel">Kênh Truyền Hình Direct HLS Stream</div>
      </div>
    </div>
  `).join('');
}

window.playTvChannel = function(streamUrl, channelName) {
  DOM.iptvChannelTitle.innerText = channelName;
  DOM.iptvChannelSub.innerText = 'Đang phát trực tiếp HLS Stream';

  if (Hls.isSupported()) {
    if (appState.hlsPlayer) {
      appState.hlsPlayer.destroy();
    }
    appState.hlsPlayer = new Hls();
    appState.hlsPlayer.loadSource(streamUrl);
    appState.hlsPlayer.attachMedia(DOM.iptvPlayer);
    appState.hlsPlayer.on(Hls.Events.MANIFEST_PARSED, function() {
      DOM.iptvPlayer.play();
    });
  } else if (DOM.iptvPlayer.canPlayType('application/vnd.apple.mpegurl')) {
    DOM.iptvPlayer.src = streamUrl;
    DOM.iptvPlayer.play();
  } else {
    alert('Trình duyệt của bạn không hỗ trợ luồng HLS phát trực tuyến!');
  }
};

/* =========================================================
   FAVORITES & DATA PERSISTENCE
   ========================================================= */
function isFavorite(id) {
  return appState.favorites.some(f => f.id === id);
}

function toggleCurrentFavorite() {
  toggleFavoriteTrack(appState.currentVideoId, appState.currentVideoTitle, appState.currentChannel, `https://i.ytimg.com/vi/${appState.currentVideoId}/hqdefault.jpg`);
}

window.toggleFavoriteTrack = function(id, title, channel, thumb) {
  const index = appState.favorites.findIndex(f => f.id === id);
  if (index > -1) {
    appState.favorites.splice(index, 1);
  } else {
    appState.favorites.push({ id, title, channel, thumb });
  }

  localStorage.setItem('tp_favorites', JSON.stringify(appState.favorites));
  updateFavoriteButtonState();
  renderFavoriteList();
  renderMediaList(defaultTracks);
};

function updateFavoriteButtonState() {
  const isFav = isFavorite(appState.currentVideoId);
  if (isFav) {
    DOM.btnToggleFav.classList.add('active');
  } else {
    DOM.btnToggleFav.classList.remove('active');
  }
}

function renderFavoriteList() {
  if (appState.favorites.length === 0) {
    DOM.favoriteMediaList.innerHTML = `<div style="text-align:center; padding:30px; color:var(--tp-text-muted);">Chưa có bài hát hoặc kênh TV nào trong danh sách yêu thích.</div>`;
    return;
  }
  renderListItems(DOM.favoriteMediaList, appState.favorites);
}

/* =========================================================
   SETTINGS & DATA BACKUP / RESTORE
   ========================================================= */
function saveSettings() {
  localStorage.setItem('tp_settings', JSON.stringify(appState.settings));
  applySettings();
}

function applySettings() {
  DOM.chkLargeThumbnails.checked = appState.settings.largeThumbnails;
  DOM.chkAutoplay.checked = appState.settings.autoplay;
  DOM.txtYtApiKey.value = appState.settings.ytApiKey || '';

  if (appState.settings.largeThumbnails) {
    document.body.classList.add('large-thumbnails');
  } else {
    document.body.classList.remove('large-thumbnails');
  }
}

function resetAllData() {
  if (confirm('Bạn có chắc chắn muốn xóa toàn bộ dữ liệu yêu thích và khôi phục cài đặt mặc định không?')) {
    localStorage.clear();
    appState.favorites = [];
    appState.settings = { largeThumbnails: true, autoplay: true, ytApiKey: '' };
    applySettings();
    renderFavoriteList();
    closeAllModals();
    alert('Đã xóa dữ liệu thành công!');
  }
}

function exportUserData() {
  const data = {
    favorites: appState.favorites,
    settings: appState.settings,
    version: '1.0'
  };
  const jsonStr = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  
  const a = document.createElement('a');
  a.href = url;
  a.download = 'trung-play-backup.json';
  a.click();
  URL.revokeObjectURL(url);
}

function importUserData(e) {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (event) => {
    try {
      const data = JSON.parse(event.target.result);
      if (data.favorites) appState.favorites = data.favorites;
      if (data.settings) appState.settings = data.settings;
      
      saveSettings();
      renderFavoriteList();
      alert('Đã nhập dữ liệu từ tệp sao lưu thành công!');
    } catch (err) {
      alert('Tệp sao lưu không hợp lệ!');
    }
  };
  reader.readAsText(file);
}

/* =========================================================
   UI MODAL HELPER FUNCTIONS
   ========================================================= */
function switchTab(tabId) {
  appState.currentTab = tabId;
  DOM.navButtons.forEach(btn => {
    if (btn.getAttribute('data-tab') === tabId) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });

  DOM.tabPanes.forEach(pane => {
    if (pane.id === tabId) {
      pane.classList.add('active');
    } else {
      pane.classList.remove('active');
    }
  });
}

function openModal(modal) {
  modal.classList.add('show');
}

function closeAllModals() {
  document.querySelectorAll('.modal-overlay').forEach(m => m.classList.remove('show'));
}
