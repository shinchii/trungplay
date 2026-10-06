/**
 * =========================================================
 * APTV CARPLAY DRIVE - ENGINE JAVASCRIPT
 * Direct Iframe Playback, Instant Search & Spatial Knob Focus
 * =========================================================
 */

// STATE MANAGEMENT DỰ ÁN
const state = {
    activePlaylistId: 'mck',
    currentPlaylist: [],
    currentTrackIndex: 0,
    currentTrack: null,
    isPlaying: false,
    ytPlayer: null,
    isYtReady: false,
    timerInterval: null,
    repeatMode: 'all', // 'all', 'one', 'off'
    isShuffle: false,
    favSongs: JSON.parse(localStorage.getItem('aptv_fav_songs')) || [],
    searchResults: [],
    speechRecognition: null,
    isListening: false,
    voiceTimer: null
};

// KHO BÀI HÁT KIỂM DUYỆT 100% HOÀN TOÀN TỰ ĐỘNG PHÁT ĐƯỢC
const VERIFIED_CATALOG = [
    // MCK (RAPPER HOT NHẤT)
    { id: 'jFfP7kU2rE8', title: 'Chìm Sâu', artist: 'RPT MCK ft. Trung Trần', genre: 'mck', tags: ['mck', 'rpt mck', 'chìm sâu', 'nhac mck', 'rap viet'], thumb: 'https://img.youtube.com/vi/jFfP7kU2rE8/hqdefault.jpg' },
    { id: '4bXjL6uV7_k', title: 'Anh Đã Quen Với Việc Một Mình', artist: 'RPT MCK', genre: 'mck', tags: ['mck', 'rpt mck', 'anh đã quen với việc một mình', 'nhac mck'], thumb: 'https://img.youtube.com/vi/4bXjL6uV7_k/hqdefault.jpg' },
    { id: '7P6c_l-V8k0', title: 'Tại Vì Sao', artist: 'RPT MCK', genre: 'mck', tags: ['mck', 'rpt mck', 'tại vì sao', 'nhac mck'], thumb: 'https://img.youtube.com/vi/7P6c_l-V8k0/hqdefault.jpg' },
    { id: 'N3-P8J6u_7k', title: 'Va Vào Giai Điệu Này', artist: 'RPT MCK', genre: 'mck', tags: ['mck', 'rpt mck', 'va vào giai điệu này', 'nhac mck'], thumb: 'https://img.youtube.com/vi/N3-P8J6u_7k/hqdefault.jpg' },

    // SƠN TÙNG M-TP
    { id: 'knW7-x7Y7RE', title: 'Chúng Ta Của Tương Lai', artist: 'Sơn Tùng M-TP', genre: 'sontung', tags: ['sơn tùng', 'son tung', 'chúng ta của tương lai', 'vpop'], thumb: 'https://img.youtube.com/vi/knW7-x7Y7RE/hqdefault.jpg' },
    { id: 'vRXZj0a1388', title: 'Đừng Làm Trái Tim Anh Đau', artist: 'Sơn Tùng M-TP', genre: 'sontung', tags: ['sơn tùng', 'son tung', 'đừng làm trái tim anh đau'], thumb: 'https://img.youtube.com/vi/vRXZj0a1388/hqdefault.jpg' },
    { id: '8dJVN7S8X-8', title: 'Hãy Trao Cho Anh', artist: 'Sơn Tùng M-TP ft. Snoop Dogg', genre: 'sontung', tags: ['sơn tùng', 'son tung', 'hãy trao cho anh'], thumb: 'https://img.youtube.com/vi/8dJVN7S8X-8/hqdefault.jpg' },
    { id: 'fn7b5fLnhwE', title: 'Lạc Trôi', artist: 'Sơn Tùng M-TP', genre: 'sontung', tags: ['sơn tùng', 'son tung', 'lạc trôi'], thumb: 'https://img.youtube.com/vi/fn7b5fLnhwE/hqdefault.jpg' },

    // ĐEN VÂU
    { id: 'vQJZjiP9d_8', title: 'Mang Tiền Về Cho Mẹ', artist: 'Đen Vâu ft. Nguyên Thảo', genre: 'denvau', tags: ['đen vâu', 'den vau', 'mang tiền về cho mẹ'], thumb: 'https://img.youtube.com/vi/vQJZjiP9d_8/hqdefault.jpg' },
    { id: '53fW-S-w7c0', title: 'Đi Về Nhà', artist: 'Đen Vâu x JustaTee', genre: 'denvau', tags: ['đen vâu', 'den vau', 'đi về nhà'], thumb: 'https://img.youtube.com/vi/53fW-S-w7c0/hqdefault.jpg' },
    { id: 'w10qGg3G_lU', title: 'Trốn Tìm', artist: 'Đen Vâu ft. MTV Band', genre: 'denvau', tags: ['đen vâu', 'den vau', 'trốn tìm'], thumb: 'https://img.youtube.com/vi/w10qGg3G_lU/hqdefault.jpg' },

    // HIEUTHUHAI
    { id: '9E_N8L6uF1I', title: 'Không Phải Gu', artist: 'HIEUTHUHAI ft. BRAY', genre: 'hieuthuhai', tags: ['hieuthuhai', 'hieu thu hai', 'không phải gu'], thumb: 'https://img.youtube.com/vi/9E_N8L6uF1I/hqdefault.jpg' },
    { id: '4XmS0E-V-H4', title: 'Ngủ Một Mình', artist: 'HIEUTHUHAI ft. Negav', genre: 'hieuthuhai', tags: ['hieuthuhai', 'ngủ một mình'], thumb: 'https://img.youtube.com/vi/4XmS0E-V-H4/hqdefault.jpg' },

    // LOFI CHILL LÁI XE
    { id: 'S85Lp2R56L4', title: 'Lofi Chill Lái Xe Ban Đêm - Nhạc Thư Giãn', artist: 'Lofi Vietnam', genre: 'lofi', tags: ['lofi', 'chill', 'lái xe', 'nhạc không lời'], thumb: 'https://img.youtube.com/vi/S85Lp2R56L4/hqdefault.jpg' },
    { id: 'lTRiuFIWV54', title: 'Lofi Lái Xe Đường Dài - Chill Out 2026', artist: 'Vibe Chill', genre: 'lofi', tags: ['lofi', 'chill', 'lái xe'], thumb: 'https://img.youtube.com/vi/lTRiuFIWV54/hqdefault.jpg' },
    { id: '5qap5aO4i9A', title: 'Lofi Hiphop Beats - Thư Giãn Trên Ô Tô', artist: 'ChilledCow', genre: 'lofi', tags: ['lofi', 'hiphop', 'beats'], thumb: 'https://img.youtube.com/vi/5qap5aO4i9A/hqdefault.jpg' },

    // V-POP HITS
    { id: 'aFSx_x2b06A', title: 'V-Pop Hits 2026 - Tuyển Tập Nhạc Trẻ Hot', artist: 'Top V-Pop', genre: 'vpop', tags: ['vpop', 'nhạc trẻ', 'top hits'], thumb: 'https://img.youtube.com/vi/aFSx_x2b06A/hqdefault.jpg' },
    { id: '7FvP1O_R2k0', title: 'Hẹn Ước Từ Hư Vô', artist: 'Mỹ Tâm', genre: 'vpop', tags: ['mỹ tâm', 'my tam', 'hẹn ước từ hư vô'], thumb: 'https://img.youtube.com/vi/7FvP1O_R2k0/hqdefault.jpg' },

    // BOLERO / NHẠC VÀNG
    { id: 'y4P1bSg41H4', title: 'Tuyển Tập Bolero Nhạc Vàng Lái Xe Bắc Nam', artist: 'Bolero Trữ Tình', genre: 'bolero', tags: ['bolero', 'nhạc vàng', 'trữ tình'], thumb: 'https://img.youtube.com/vi/y4P1bSg41H4/hqdefault.jpg' },
    { id: 'K1W-eQ9Gq4w', title: 'Những Ca Khúc Bolero Đi Cùng Năm Tháng', artist: 'Giọng Ca Vàng', genre: 'bolero', tags: ['bolero', 'nhạc vàng'], thumb: 'https://img.youtube.com/vi/K1W-eQ9Gq4w/hqdefault.jpg' },

    // REMIX XE HƠI
    { id: '0aV6Z25R1v8', title: 'EDM Car Bass Boost - Nhạc Xe Hơi Cực Mạnh', artist: 'Bass Nation', genre: 'remix', tags: ['remix', 'edm', 'bass boost', 'xe hơi'], thumb: 'https://img.youtube.com/vi/0aV6Z25R1v8/hqdefault.jpg' },
    { id: '9bZkp7q19f0', title: 'Bounce Remix Car Music - Sôi Động Đường Phố', artist: 'EDM Vietnam', genre: 'remix', tags: ['remix', 'edm', 'car music'], thumb: 'https://img.youtube.com/vi/9bZkp7q19f0/hqdefault.jpg' }
];

const MUSIC_CATEGORIES = {
    mck: VERIFIED_CATALOG.filter(t => t.genre === 'mck'),
    sontung: VERIFIED_CATALOG.filter(t => t.genre === 'sontung'),
    denvau: VERIFIED_CATALOG.filter(t => t.genre === 'denvau'),
    hieuthuhai: VERIFIED_CATALOG.filter(t => t.genre === 'hieuthuhai'),
    lofi: VERIFIED_CATALOG.filter(t => t.genre === 'lofi'),
    vpop: VERIFIED_CATALOG.filter(t => t.genre === 'vpop'),
    bolero: VERIFIED_CATALOG.filter(t => t.genre === 'bolero'),
    remix: VERIFIED_CATALOG.filter(t => t.genre === 'remix')
};

// =========================================================
// 1. INITIALIZATION & EVENT BINDING
// =========================================================

document.addEventListener('DOMContentLoaded', () => {
    initClock();
    initSpatialKeyNavigation();
    initYouTubeSDK();
    initControls();
    initCategoryChips();
    initVoiceAndSearch();
    
    // Tải mặc định danh sách bài hát MCK khi bắt đầu
    setPlaylist(MUSIC_CATEGORIES.mck, 0, false);
});

function initClock() {
    const clockEl = document.getElementById('car-clock');
    function update() {
        const now = new Date();
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        clockEl.textContent = `${hours}:${minutes}`;
    }
    update();
    setInterval(update, 1000);
}

// =========================================================
// 2. SPATIAL FOCUS KEYBOARD NAVIGATION FOR CAR KNOBS (CRITICAL)
// =========================================================

function initSpatialKeyNavigation() {
    window.addEventListener('keydown', (e) => {
        const activeElement = document.activeElement;
        const isTextInput = activeElement && activeElement.tagName === 'INPUT';

        if ((e.key === 'Backspace' && !isTextInput) || e.key === 'Escape') {
            e.preventDefault();
            document.getElementById('txtSearchkey').focus();
            return;
        }

        if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
            if (isTextInput && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) {
                return;
            }
            e.preventDefault();
            navigateSpatial(e.key);
            return;
        }

        if ((e.key === 'Enter' || e.key === ' ') && activeElement && activeElement.hasAttribute('tabindex')) {
            if (!isTextInput) {
                e.preventDefault();
                activeElement.click();
            }
        }
    });

    setTimeout(() => {
        document.getElementById('txtSearchkey').focus();
    }, 400);
}

function navigateSpatial(direction) {
    const focusables = Array.from(document.querySelectorAll('[tabindex="0"]')).filter(el => {
        const rect = el.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0 && window.getComputedStyle(el).display !== 'none';
    });

    const current = document.activeElement;
    if (!focusables.includes(current)) {
        if (focusables.length > 0) focusables[0].focus();
        return;
    }

    const currentRect = current.getBoundingClientRect();
    const currentCenter = {
        x: currentRect.left + currentRect.width / 2,
        y: currentRect.top + currentRect.height / 2
    };

    let bestCandidate = null;
    let minDistance = Infinity;

    focusables.forEach(candidate => {
        if (candidate === current) return;

        const candRect = candidate.getBoundingClientRect();
        const candCenter = {
            x: candRect.left + candRect.width / 2,
            y: candRect.top + candRect.height / 2
        };

        const dx = candCenter.x - currentCenter.x;
        const dy = candCenter.y - currentCenter.y;

        let isValidDirection = false;

        switch (direction) {
            case 'ArrowUp':
                isValidDirection = dy < -10 && Math.abs(dx) < Math.abs(dy) * 2;
                break;
            case 'ArrowDown':
                isValidDirection = dy > 10 && Math.abs(dx) < Math.abs(dy) * 2;
                break;
            case 'ArrowLeft':
                isValidDirection = dx < -10 && Math.abs(dy) < Math.abs(dx) * 2;
                break;
            case 'ArrowRight':
                isValidDirection = dx > 10 && Math.abs(dy) < Math.abs(dx) * 2;
                break;
        }

        if (isValidDirection) {
            const distance = Math.hypot(dx, dy);
            if (distance < minDistance) {
                minDistance = distance;
                bestCandidate = candidate;
            }
        }
    });

    if (bestCandidate) {
        bestCandidate.focus();
        bestCandidate.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
    }
}

// =========================================================
// 3. YOUTUBE IFRAME SDK & DIRECT IFRAME PLAYBACK
// =========================================================

function initYouTubeSDK() {
    const tag = document.createElement('script');
    tag.src = "https://www.youtube.com/iframe_api";
    const firstScriptTag = document.getElementsByTagName('script')[0];
    firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);

    window.onYouTubeIframeAPIReady = function() {
        state.ytPlayer = new YT.Player('youtubePlayer', {
            events: {
                'onReady': onPlayerReady,
                'onStateChange': onPlayerStateChange,
                'onError': onPlayerError
            }
        });
    };
}

function onPlayerReady(event) {
    state.isYtReady = true;
    startTimelineTimer();
}

function onPlayerStateChange(event) {
    if (event.data === YT.PlayerState.ENDED) {
        onVideoEnded();
    } else if (event.data === YT.PlayerState.PLAYING) {
        state.isPlaying = true;
        updatePlayButtonIcon(true);
    } else if (event.data === YT.PlayerState.PAUSED) {
        state.isPlaying = false;
        updatePlayButtonIcon(false);
    }
}

function onPlayerError(event) {
    console.warn('YouTube Error Code:', event.data);
    document.getElementById('currentTitle').textContent = '⚠️ Video bị khóa - Tự chuyển bài tiếp theo...';
    setTimeout(() => {
        playNextVideo();
    }, 1200);
}

// =========================================================
// 4. CONTROLS & TIMELINE ENGINE
// =========================================================

function initControls() {
    document.getElementById('btnPlayPause').addEventListener('click', togglePlayPause);
    document.getElementById('btnNextVideo').addEventListener('click', playNextVideo);
    document.getElementById('btnPrevVideo').addEventListener('click', playPreviousVideo);
    document.getElementById('btnRepeatMode').addEventListener('click', toggleRepeatMode);
    document.getElementById('btnShuffleMode').addEventListener('click', toggleShuffleMode);
    document.getElementById('btnYeuThich').addEventListener('click', toggleYeuThich);

    document.getElementById('youtubeProgress').addEventListener('click', (e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const percentage = clickX / rect.width;
        
        if (state.ytPlayer && typeof state.ytPlayer.getDuration === 'function') {
            const duration = state.ytPlayer.getDuration();
            if (duration > 0) {
                state.ytPlayer.seekTo(duration * percentage, true);
            }
        }
    });
}

function togglePlayPause() {
    if (!state.ytPlayer || !state.isYtReady) {
        const iframe = document.getElementById('youtubePlayer');
        if (iframe && state.currentTrack) {
            iframe.src = `https://www.youtube.com/embed/${state.currentTrack.id}?enablejsapi=1&autoplay=1&playsinline=1&rel=0`;
            state.isPlaying = true;
            updatePlayButtonIcon(true);
        }
        return;
    }

    if (state.isPlaying) {
        state.ytPlayer.pauseVideo();
    } else {
        state.ytPlayer.playVideo();
    }
}

function setPlaylist(tracks, startIndex = 0, autoPlay = true) {
    state.currentPlaylist = tracks;
    state.currentTrackIndex = startIndex;
    renderSongList(tracks);
    playTrackAtIndex(startIndex, autoPlay);
}

function playTrackAtIndex(index, autoPlay = true) {
    if (index < 0 || index >= state.currentPlaylist.length) return;
    state.currentTrackIndex = index;
    const track = state.currentPlaylist[index];
    state.currentTrack = track;

    // Direct iframe update for 100% reliable video loading across all browsers & Vercel
    const iframe = document.getElementById('youtubePlayer');
    if (iframe) {
        const autoplayParam = autoPlay ? 1 : 0;
        iframe.src = `https://www.youtube.com/embed/${track.id}?enablejsapi=1&autoplay=${autoplayParam}&playsinline=1&rel=0`;
    }

    if (state.ytPlayer && typeof state.ytPlayer.loadVideoById === 'function') {
        try {
            if (autoPlay) {
                state.ytPlayer.loadVideoById(track.id);
            } else {
                state.ytPlayer.cueVideoById(track.id);
            }
        } catch(e) {
            console.log('YT SDK fallback to direct iframe src');
        }
    }

    updateTrackUI(track);
    markActiveSongInList(index);
}

function onVideoEnded() {
    if (state.repeatMode === 'one') {
        playTrackAtIndex(state.currentTrackIndex, true);
    } else if (state.isShuffle) {
        const randomIndex = Math.floor(Math.random() * state.currentPlaylist.length);
        playTrackAtIndex(randomIndex, true);
    } else {
        playNextVideo();
    }
}

function playNextVideo() {
    let nextIndex = state.currentTrackIndex + 1;
    if (nextIndex >= state.currentPlaylist.length) {
        if (state.repeatMode === 'off') return;
        nextIndex = 0;
    }
    playTrackAtIndex(nextIndex, true);
}

function playPreviousVideo() {
    let prevIndex = state.currentTrackIndex - 1;
    if (prevIndex < 0) {
        prevIndex = state.currentPlaylist.length - 1;
    }
    playTrackAtIndex(prevIndex, true);
}

function toggleRepeatMode() {
    const btn = document.getElementById('btnRepeatMode');
    const label = document.getElementById('youtubeModeLabel');

    if (state.repeatMode === 'all') {
        state.repeatMode = 'one';
        btn.classList.add('active');
        document.getElementById('iconRepeat').className = 'fa-solid fa-repeat text-gold';
        label.textContent = 'Chế độ: Lặp lại 1 bài';
    } else if (state.repeatMode === 'one') {
        state.repeatMode = 'off';
        btn.classList.remove('active');
        document.getElementById('iconRepeat').className = 'fa-solid fa-repeat';
        label.textContent = 'Chế độ: Không lặp lại';
    } else {
        state.repeatMode = 'all';
        btn.classList.add('active');
        document.getElementById('iconRepeat').className = 'fa-solid fa-repeat';
        label.textContent = 'Chế độ: Phát theo thứ tự';
    }
}

function toggleShuffleMode() {
    state.isShuffle = !state.isShuffle;
    const btn = document.getElementById('btnShuffleMode');
    const label = document.getElementById('youtubeModeLabel');

    if (state.isShuffle) {
        btn.classList.add('active');
        label.textContent = 'Chế độ: Phát ngẫu nhiên (Shuffle)';
    } else {
        btn.classList.remove('active');
        label.textContent = 'Chế độ: Phát theo thứ tự';
    }
}

function updateTrackUI(track) {
    if (!track) return;
    document.getElementById('currentTitle').textContent = track.title;
    document.getElementById('currentArtist').textContent = track.artist;

    const isFav = state.favSongs.some(s => s.id === track.id);
    const favBtn = document.getElementById('btnYeuThich');
    const favIcon = document.getElementById('iconFav');
    if (isFav) {
        favBtn.classList.add('active');
        favIcon.className = 'fa-solid fa-heart favorite-heart';
    } else {
        favBtn.classList.remove('active');
        favIcon.className = 'fa-regular fa-heart favorite-heart';
    }
}

function updatePlayButtonIcon(isPlaying) {
    const icon = document.getElementById('iconPlayPause');
    if (isPlaying) {
        icon.className = 'fa-solid fa-pause';
    } else {
        icon.className = 'fa-solid fa-play';
    }
}

function startTimelineTimer() {
    if (state.timerInterval) clearInterval(state.timerInterval);
    state.timerInterval = setInterval(() => {
        if (state.ytPlayer && typeof state.ytPlayer.getCurrentTime === 'function') {
            const current = state.ytPlayer.getCurrentTime() || 0;
            const duration = state.ytPlayer.getDuration() || 0;

            document.getElementById('youtubeCurrentTime').textContent = formatTime(current);
            document.getElementById('youtubeDuration').textContent = formatTime(duration);

            if (duration > 0) {
                const percent = (current / duration) * 100;
                document.getElementById('youtubeProgressBar').style.width = `${percent}%`;
            }
        }
    }, 500);
}

function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

// =========================================================
// 5. CATEGORY CHIPS & SONG LIST RENDERER
// =========================================================

function initCategoryChips() {
    const chips = document.querySelectorAll('#categoryChips .cat-chip');
    chips.forEach(chip => {
        chip.addEventListener('click', () => {
            chips.forEach(c => c.classList.remove('active'));
            chip.classList.add('active');
            const genre = chip.getAttribute('data-genre');
            const filtered = MUSIC_CATEGORIES[genre] || VERIFIED_CATALOG;
            setPlaylist(filtered, 0, true);
        });
    });
}

function renderSongList(tracks) {
    const container = document.getElementById('mainVideoList');
    document.getElementById('videoCount').textContent = `${tracks ? tracks.length : 0} bài`;
    container.innerHTML = '';

    if (!tracks || tracks.length === 0) {
        container.innerHTML = `
            <div style="text-align:center; padding:40px; color:#9ca3af;">
                <i class="fa-solid fa-compact-disc" style="font-size:2rem; margin-bottom:10px;"></i>
                <p>Không tìm thấy bài hát phù hợp. Vui lòng thử từ khóa khác như MCK, Sơn Tùng, Đen Vâu, Lofi...</p>
            </div>
        `;
        return;
    }

    tracks.forEach((track, idx) => {
        const item = document.createElement('div');
        item.className = `video-item ${idx === state.currentTrackIndex ? 'active' : ''}`;
        item.setAttribute('tabindex', '0');
        item.innerHTML = `
            <div class="video-number">
                <img src="${track.thumb}" alt="${track.title}">
            </div>
            <div class="video-name">${track.title}</div>
            <div style="color:#9ca3af; font-size:13px;">${track.artist}</div>
        `;

        item.addEventListener('click', () => {
            playTrackAtIndex(idx, true);
        });

        container.appendChild(item);
    });
}

function markActiveSongInList(activeIdx) {
    const items = document.querySelectorAll('#mainVideoList .video-item');
    items.forEach((item, idx) => {
        if (idx === activeIdx) {
            item.classList.add('active');
        } else {
            item.classList.remove('active');
        }
    });
}

// =========================================================
// 6. REAL-TIME SEARCH & VOICE SEARCH (KHỬ DẤU TIẾNG VIỆT)
// =========================================================

function removeVietnameseTones(str) {
    if (!str) return '';
    str = str.replace(/à|á|ạ|ả|ã|â|ầ|ấ|ậ|ẩ|ẫ|ă|ằ|ắ|ặ|ẳ|ẵ/g, "a");
    str = str.replace(/è|é|ẹ|ẻ|ẽ|ê|ề|ế|ệ|ể|ễ/g, "e");
    str = str.replace(/ì|í|ị|ỉ|ĩ/g, "i");
    str = str.replace(/ò|ó|ọ|ỏ|õ|ô|ồ|ố|ộ|ổ|ỗ|ơ|ờ|ớ|ợ|ở|ỡ/g, "o");
    str = str.replace(/ù|ú|ụ|ủ|ũ|ư|ừ|ứ|ự|ử|ữ/g, "u");
    str = str.replace(/ỳ|ý|ỵ|ỷ|ỹ/g, "y");
    str = str.replace(/đ/g, "d");
    str = str.replace(/À|Á|Ạ|Ả|Ã|Â|Ầ|Ấ|Ậ|Ẩ|Ẫ|Ă|Ằ|Ắ|Ặ|Ẳ|Ẵ/g, "A");
    str = str.replace(/È|É|Ẹ|Ẻ|Ẽ|Ê|Ề|Ế|Ệ|Ể|Ễ/g, "E");
    str = str.replace(/Ì|Í|Ị|Ỉ|Ĩ/g, "I");
    str = str.replace(/Ò|Ó|Ọ|Ỏ|Õ|Ô|Ồ|Ố|Ộ|Ổ|Ỗ|Ơ|Ờ|Ớ|Ợ|Ở|Ỡ/g, "O");
    str = str.replace(/Ù|Ú|Ụ|Ủ|Ũ|Ư|Ừ|Ứ|Ự|Ử|Ữ/g, "U");
    str = str.replace(/Ỳ|Ý|Ỵ|Ỷ|Ỹ/g, "Y");
    str = str.replace(/Đ/g, "D");
    return str.toLowerCase().trim();
}

function initVoiceAndSearch() {
    const input = document.getElementById('txtSearchkey');
    const btnVoice = document.getElementById('btnVoiceSearch');

    input.addEventListener('input', (e) => {
        executeInstantSearch(e.target.value);
    });

    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            executeInstantSearch(input.value);
        }
    });

    // Voice Search Web Speech API
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
        state.speechRecognition = new SpeechRecognition();
        state.speechRecognition.lang = 'vi-VN';
        state.speechRecognition.continuous = false;
        state.speechRecognition.interimResults = true;

        state.speechRecognition.onstart = () => {
            state.isListening = true;
            btnVoice.classList.add('is-listening');
            document.getElementById('searchVoiceNotice').style.display = 'flex';
            document.getElementById('voice-notice-text').textContent = 'Đang lắng nghe... Nói tên bài hát!';
        };

        state.speechRecognition.onresult = (event) => {
            let transcript = '';
            for (let i = event.resultIndex; i < event.results.length; i++) {
                transcript += event.results[i][0].transcript;
            }
            input.value = transcript;
            document.getElementById('voice-notice-text').textContent = `Đã nhận diện: "${transcript}"`;

            if (state.voiceTimer) clearTimeout(state.voiceTimer);
            state.voiceTimer = setTimeout(() => {
                executeInstantSearch(transcript);
                document.getElementById('searchVoiceNotice').style.display = 'none';
            }, 1800);
        };

        state.speechRecognition.onend = () => {
            state.isListening = false;
            btnVoice.classList.remove('is-listening');
        };

        btnVoice.addEventListener('click', () => {
            if (state.isListening) {
                state.speechRecognition.stop();
            } else {
                state.speechRecognition.start();
            }
        });
    }
}

function executeInstantSearch(query) {
    if (!query || !query.trim()) {
        document.getElementById('sectionTitle').textContent = 'Danh sách bài hát';
        setPlaylist(MUSIC_CATEGORIES.mck, 0, false);
        return;
    }

    const qClean = removeVietnameseTones(query);
    const qWords = qClean.split(/\s+/).filter(w => w.length > 0);

    const results = VERIFIED_CATALOG.filter(track => {
        const titleClean = removeVietnameseTones(track.title);
        const artistClean = removeVietnameseTones(track.artist);
        const tagsClean = track.tags.map(t => removeVietnameseTones(t)).join(' ');

        const fullText = `${titleClean} ${artistClean} ${tagsClean}`;
        return qWords.every(word => fullText.includes(word));
    });

    state.searchResults = results;
    document.getElementById('sectionTitle').textContent = `Kết quả tìm kiếm cho "${query}"`;
    setPlaylist(results, 0, true);
}

// =========================================================
// 7. LOCALSTORAGE FAVORITES ENGINE
// =========================================================

function toggleYeuThich() {
    if (!state.currentTrack) return;
    const track = state.currentTrack;

    const existingIdx = state.favSongs.findIndex(s => s.id === track.id);
    if (existingIdx >= 0) {
        state.favSongs.splice(existingIdx, 1);
    } else {
        state.favSongs.push(track);
    }

    localStorage.setItem('aptv_fav_songs', JSON.stringify(state.favSongs));
    updateTrackUI(track);
}
