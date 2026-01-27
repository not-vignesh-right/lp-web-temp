/* --- PODCAST PLAYER --- */
(function () {
    const audio = document.getElementById('podcastAudio');
    const playPauseBtn = document.getElementById('playPauseBtn');
    const playPauseIcon = document.getElementById('playPauseIcon');
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');
    const forwardBtn = document.getElementById('forwardBtn');
    const backwardBtn = document.getElementById('backwardBtn');
    const progressBar = document.getElementById('progressBar');
    const progressFill = document.getElementById('progressFill');
    const progressHandle = document.getElementById('progressHandle');
    const currentTimeEl = document.getElementById('currentTime');
    const totalTimeEl = document.getElementById('totalTime');
    const volumeBtn = document.getElementById('volumeBtn');
    const volumeIcon = document.getElementById('volumeIcon');
    const volumeSlider = document.getElementById('volumeSlider');
    const featuredImg = document.getElementById('featuredPodcastImg');
    const featuredTitle = document.getElementById('featuredPodcastTitle');
    const podcastItems = document.querySelectorAll('.podcast-list-item');

    if (!audio || !playPauseBtn) return;

    let isPlaying = false;
    let isDragging = false;
    let currentTrackIndex = -1;

    // Playlist
    const playlist = [
        {
            audio: 'assets/podcasts/audio/featured.mp3',
            image: 'assets/podcasts/featured-podcast.jpg',
            title: 'Positive Mindset: Roadmap towards Success, Exclusive'
        }
    ];

    // Add podcast items to playlist
    podcastItems.forEach((item, index) => {
        playlist.push({
            audio: item.dataset.audio,
            image: item.dataset.image,
            title: item.dataset.title
        });
    });

    // Format time
    function formatTime(seconds) {
        if (isNaN(seconds)) return '0:00';
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    }

    // Update progress bar
    function updateProgress() {
        if (!isDragging && audio.duration) {
            const percent = (audio.currentTime / audio.duration) * 100;
            progressFill.style.width = `${percent}%`;
            progressHandle.style.left = `${percent}%`;
            currentTimeEl.textContent = formatTime(audio.currentTime);
        }
    }

    // Set progress from click
    function setProgress(e) {
        const rect = progressBar.getBoundingClientRect();
        const percent = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
        audio.currentTime = percent * audio.duration;
        progressFill.style.width = `${percent * 100}%`;
        progressHandle.style.left = `${percent * 100}%`;
    }

    // Play/Pause toggle
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

    // Load track
    function loadTrack(index) {
        if (index < 0 || index >= playlist.length) return;

        currentTrackIndex = index;
        const track = playlist[index];

        audio.src = track.audio;
        featuredImg.src = track.image;
        featuredTitle.textContent = track.title;

        // Update active state in list
        podcastItems.forEach((item, i) => {
            item.classList.toggle('active', i === index - 1);
        });

        audio.load();
        if (isPlaying) {
            audio.play();
        }
    }

    // Event Listeners
    playPauseBtn.addEventListener('click', togglePlayPause);

    audio.addEventListener('timeupdate', updateProgress);

    audio.addEventListener('loadedmetadata', function () {
        totalTimeEl.textContent = formatTime(audio.duration);
    });

    audio.addEventListener('ended', function () {
        if (currentTrackIndex < playlist.length - 1) {
            loadTrack(currentTrackIndex + 1);
            audio.play();
        } else {
            isPlaying = false;
            playPauseIcon.className = 'fa-solid fa-play';
            playPauseBtn.classList.remove('playing');
        }
    });

    // Progress bar interactions
    progressBar.addEventListener('click', setProgress);

    progressHandle.addEventListener('mousedown', function (e) {
        isDragging = true;
        progressHandle.classList.add('dragging');
        e.preventDefault();
    });

    document.addEventListener('mousemove', function (e) {
        if (isDragging) {
            setProgress(e);
        }
    });

    document.addEventListener('mouseup', function () {
        if (isDragging) {
            isDragging = false;
            progressHandle.classList.remove('dragging');
        }
    });

    // Skip buttons
    forwardBtn.addEventListener('click', function () {
        audio.currentTime = Math.min(audio.currentTime + 30, audio.duration);
    });

    backwardBtn.addEventListener('click', function () {
        audio.currentTime = Math.max(audio.currentTime - 30, 0);
    });

    // Next/Previous
    nextBtn.addEventListener('click', function () {
        const nextIndex = currentTrackIndex < playlist.length - 1 ? currentTrackIndex + 1 : 0;
        loadTrack(nextIndex);
    });

    prevBtn.addEventListener('click', function () {
        const prevIndex = currentTrackIndex > 0 ? currentTrackIndex - 1 : playlist.length - 1;
        loadTrack(prevIndex);
    });

    // Volume control
    volumeBtn.addEventListener('click', function () {
        if (audio.muted) {
            audio.muted = false;
            volumeIcon.className = 'fa-solid fa-volume-high';
            volumeSlider.value = audio.volume * 100;
        } else {
            audio.muted = true;
            volumeIcon.className = 'fa-solid fa-volume-xmark';
            volumeSlider.value = 0;
        }
    });

    volumeSlider.addEventListener('input', function (e) {
        const value = e.target.value;
        audio.volume = value / 100;
        audio.muted = false;

        if (value == 0) {
            volumeIcon.className = 'fa-solid fa-volume-xmark';
        } else if (value < 50) {
            volumeIcon.className = 'fa-solid fa-volume-low';
        } else {
            volumeIcon.className = 'fa-solid fa-volume-high';
        }
    });

    // List Item Interactions
    podcastItems.forEach((item, index) => {
        // Play button inside item
        const btn = item.querySelector('.podcast-item-play-btn');
        btn.addEventListener('click', function (e) {
            e.stopPropagation();
            if (currentTrackIndex === index + 1 && isPlaying) {
                togglePlayPause();
            } else {
                isPlaying = true; // Set playing state for next track
                playPauseIcon.className = 'fa-solid fa-pause';
                playPauseBtn.classList.add('playing');
                loadTrack(index + 1);
            }
        });

        // Click anywhere on item
        item.addEventListener('click', function () {
            if (currentTrackIndex === index + 1) return;
            isPlaying = true;
            playPauseIcon.className = 'fa-solid fa-pause';
            playPauseBtn.classList.add('playing');
            loadTrack(index + 1);
        });
    });

    // Initial load
    loadTrack(0);
    isPlaying = false; // Reset initial state to paused
    playPauseIcon.className = 'fa-solid fa-play';
    playPauseBtn.classList.remove('playing');
})();
