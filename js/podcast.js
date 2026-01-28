/* --- PODCAST SECTION LOGIC --- */

document.addEventListener('DOMContentLoaded', () => {
    initTabs();
    initStudentPlayer();
});

/* --- TABS LOGIC --- */
function initTabs() {
    const tabs = document.querySelectorAll('.podcast-tab');
    const contents = document.querySelectorAll('.podcast-tab-content');

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            // Remove active class from all tabs
            tabs.forEach(t => t.classList.remove('active'));
            // Add active class to clicked tab
            tab.classList.add('active');

            // Hide all content
            contents.forEach(content => content.classList.remove('active'));

            // Show target content
            const targetId = `${tab.dataset.tab}-content`;
            const targetContent = document.getElementById(targetId);
            if (targetContent) {
                targetContent.classList.add('active');
            }
        });
    });
}

/* --- STUDENT SERIES PLAYER --- */
function initStudentPlayer() {
    const audio = document.getElementById('studentAudio');
    const playPauseBtn = document.getElementById('studentPlayPauseBtn');
    const playPauseIcon = document.getElementById('studentPlayPauseIcon');
    const prevBtn = document.getElementById('studentPrevBtn');
    const nextBtn = document.getElementById('studentNextBtn');
    const forwardBtn = document.getElementById('studentForwardBtn');
    const backwardBtn = document.getElementById('studentBackwardBtn');
    const progressBar = document.getElementById('studentProgressBar');
    const progressFill = document.getElementById('studentProgressFill');
    const progressHandle = document.getElementById('studentProgressHandle');
    const currentTimeEl = document.getElementById('studentCurrentTime');
    const totalTimeEl = document.getElementById('studentTotalTime');
    const volumeBtn = document.getElementById('studentVolumeBtn');
    const volumeIcon = document.getElementById('studentVolumeIcon');
    const volumeSlider = document.getElementById('studentVolumeSlider');
    const playerImg = document.getElementById('studentPlayerImg');
    const playerTitle = document.getElementById('studentPlayerTitle');

    // Select items specifically within the student playlist
    const playlistContainer = document.getElementById('studentPlaylist');
    if (!playlistContainer || !audio) return;

    const podcastItems = playlistContainer.querySelectorAll('.podcast-list-item');

    let isPlaying = false;
    let isDragging = false;
    let currentTrackIndex = 0;

    // Build playlist data from DOM
    const playlist = [];
    podcastItems.forEach(item => {
        playlist.push({
            audio: item.dataset.audio,
            image: item.dataset.image,
            title: item.dataset.title
        });
    });

    // Helper: Format Time
    function formatTime(seconds) {
        if (isNaN(seconds)) return '0:00';
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    }

    // Helper: Update Progress
    function updateProgress() {
        if (!isDragging && audio.duration) {
            const percent = (audio.currentTime / audio.duration) * 100;
            progressFill.style.width = `${percent}%`;
            progressHandle.style.left = `${percent}%`;
            currentTimeEl.textContent = formatTime(audio.currentTime);
        }
    }

    // Helper: Set Progress
    function setProgress(e) {
        const rect = progressBar.getBoundingClientRect();
        const percent = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
        audio.currentTime = percent * audio.duration;
        progressFill.style.width = `${percent * 100}%`;
        progressHandle.style.left = `${percent * 100}%`;
    }

    // Toggle Play/Pause
    function togglePlayPause() {
        if (isPlaying) {
            audio.pause();
            playPauseIcon.className = 'fa-solid fa-play';
            playPauseBtn.classList.remove('playing');
        } else {
            audio.play();
            playPauseIcon.className = 'fa-solid fa-pause';
            playPauseBtn.classList.add('playing');
        }
        isPlaying = !isPlaying;
    }

    // Load Track
    function loadTrack(index) {
        if (index < 0 || index >= playlist.length) return;
        currentTrackIndex = index;
        const track = playlist[index];

        audio.src = track.audio;
        playerImg.src = track.image;
        playerTitle.textContent = track.title;

        // Update active class in list
        podcastItems.forEach((item, i) => {
            item.classList.toggle('active', i === index);
            // Also update the play button icon inside the list item
            const itemBtnIcon = item.querySelector('.podcast-item-play-btn i');
            if (itemBtnIcon) {
                itemBtnIcon.className = i === index && isPlaying ? 'fa-solid fa-pause' : 'fa-solid fa-play';
            }
        });

        audio.load();
        if (isPlaying) {
            audio.play();
        }
    }

    // --- EVENT LISTENERS ---

    // Play/Pause
    playPauseBtn.addEventListener('click', togglePlayPause);

    // Audio Events
    audio.addEventListener('timeupdate', updateProgress);
    audio.addEventListener('loadedmetadata', () => {
        totalTimeEl.textContent = formatTime(audio.duration);
    });
    audio.addEventListener('ended', () => {
        if (currentTrackIndex < playlist.length - 1) {
            loadTrack(currentTrackIndex + 1);
        } else {
            isPlaying = false;
            playPauseIcon.className = 'fa-solid fa-play';
            playPauseBtn.classList.remove('playing');
        }
    });
    // Update play icons when play/pause state changes via main button
    audio.addEventListener('play', () => {
        isPlaying = true;
        playPauseIcon.className = 'fa-solid fa-pause';
        playPauseBtn.classList.add('playing');
        updateListIcons();
    });
    audio.addEventListener('pause', () => {
        isPlaying = false;
        playPauseIcon.className = 'fa-solid fa-play';
        playPauseBtn.classList.remove('playing');
        updateListIcons();
    });

    function updateListIcons() {
        podcastItems.forEach((item, i) => {
            const icon = item.querySelector('.podcast-item-play-btn i');
            if (icon) {
                if (i === currentTrackIndex && isPlaying) {
                    icon.className = 'fa-solid fa-pause';
                } else {
                    icon.className = 'fa-solid fa-play';
                }
            }
        });
    }

    // Progress Bar
    progressBar.addEventListener('click', setProgress);

    // Dragging Logic
    progressHandle.addEventListener('mousedown', (e) => {
        isDragging = true;
        progressHandle.classList.add('dragging');
        e.preventDefault();
    });
    document.addEventListener('mousemove', (e) => {
        if (isDragging) setProgress(e);
    });
    document.addEventListener('mouseup', () => {
        isDragging = false;
        progressHandle.classList.remove('dragging');
    });

    // Navigation Buttons
    forwardBtn.addEventListener('click', () => {
        audio.currentTime = Math.min(audio.currentTime + 10, audio.duration);
    });
    backwardBtn.addEventListener('click', () => {
        audio.currentTime = Math.max(audio.currentTime - 10, 0);
    });
    nextBtn.addEventListener('click', () => {
        const nextIndex = (currentTrackIndex + 1) % playlist.length;
        loadTrack(nextIndex);
    });
    prevBtn.addEventListener('click', () => {
        const prevIndex = (currentTrackIndex - 1 + playlist.length) % playlist.length;
        loadTrack(prevIndex);
    });

    // Volume
    volumeBtn.addEventListener('click', () => {
        audio.muted = !audio.muted;
        volumeIcon.className = audio.muted ? 'fa-solid fa-volume-xmark' : 'fa-solid fa-volume-high';
        volumeSlider.value = audio.muted ? 0 : audio.volume * 100;
    });
    volumeSlider.addEventListener('input', (e) => {
        const val = e.target.value;
        audio.volume = val / 100;
        audio.muted = (val == 0);
        if (val == 0) volumeIcon.className = 'fa-solid fa-volume-xmark';
        else if (val < 50) volumeIcon.className = 'fa-solid fa-volume-low';
        else volumeIcon.className = 'fa-solid fa-volume-high';
    });

    // Playlist Item Clicking
    podcastItems.forEach((item, index) => {
        item.addEventListener('click', () => {
            if (currentTrackIndex === index) {
                togglePlayPause();
            } else {
                isPlaying = true;
                loadTrack(index);
            }
        });
    });

    // Initial state
    // Don't auto-play on load, just set up the first track
    // loadTrack(0) is called at bottom, but we set isPlaying=false before.
    // However, existing loadTrack checks isPlaying. 
    // Let's manually set src without playing.
    if (playlist.length > 0) {
        audio.src = playlist[0].audio;
        playerImg.src = playlist[0].image;
        playerTitle.textContent = playlist[0].title;
        // Don't call loadTrack(0) here to avoid auto-play if my logic is slightly off
    }
}
