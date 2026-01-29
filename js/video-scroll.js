/* --- VIDEO SCROLL INTERACTION --- */

(function () {
    // Get video and audio elements
    const video = document.getElementById('studentPowerVideo');
    const audio = document.getElementById('studentPowerAudio');
    const section = document.getElementById('student-power');

    if (!video || !section) return;

    // State tracking
    let isSectionVisible = false;
    let audioUnlocked = false;

    // Intersection Observer options
    // Using 0.6 (60%) to ensure it feels responsive but doesn't trigger too early
    const observerOptions = {
        root: null,
        rootMargin: '0px',
        threshold: 0.6
    };

    // Callback for intersection
    const handleIntersection = (entries) => {
        entries.forEach(entry => {
            isSectionVisible = entry.isIntersecting;

            if (entry.isIntersecting) {
                // Play video
                video.play().then(() => {
                    if (window.notifyMediaPlaying) {
                        window.notifyMediaPlaying('studentPowerVideo');
                    }
                }).catch(e => console.log('Video play failed:', e));

                // Try play audio if unlocked
                if (audio && audioUnlocked) {
                    audio.play().catch(e => console.log('Audio play failed:', e));
                } else if (audio) {
                    // Try blindly in case policy allows
                    audio.play().catch(() => { });
                }
            } else {
                // Pause everything
                video.pause();
                if (audio) audio.pause();
            }
        });
    };

    const observer = new IntersectionObserver(handleIntersection, observerOptions);
    observer.observe(section);

    // Audio Unlocker: Runs on first interaction
    const unlockAudio = () => {
        if (!audioUnlocked && audio) {
            audio.play().then(() => {
                audioUnlocked = true; // Context unlocked

                // If section is effectively visible/playing, keep playing
                if (isSectionVisible && !video.paused) {
                    audio.currentTime = video.currentTime;
                    if (window.notifyMediaPlaying) {
                        window.notifyMediaPlaying('studentPowerVideo');
                    }
                } else {
                    // Otherwise pause immediately (silently unlocked)
                    audio.pause();
                }
            }).catch(e => console.log('Unlock failed:', e));
        }
    };
    document.addEventListener('click', unlockAudio);
    document.addEventListener('touchstart', unlockAudio);

    // Robust Sync Loop
    // This ensures that if the video is playing, the audio IS playing (once unlocked).
    // It fixes cases where audio might get desynced or fail to start.
    setInterval(() => {
        if (!audio || !isSectionVisible) return;

        if (!video.paused) {
            // Video is playing. Audio should be playing.
            if (audioUnlocked) {
                if (audio.paused) {
                    audio.currentTime = video.currentTime;
                    audio.play().catch(e => console.log('Sync play failed:', e));
                } else if (Math.abs(audio.currentTime - video.currentTime) > 0.3) {
                    audio.currentTime = video.currentTime;
                }
            }
        } else {
            // Video paused. Audio should be paused.
            if (!audio.paused) audio.pause();
        }
    }, 500); // Check every 500ms

    // Global Pause
    window.addEventListener('media:playing', (e) => {
        if (e.detail.source !== 'studentPowerVideo') {
            video.pause();
            if (audio) audio.pause();
        }
    });

})();
