/* --- VIDEO SCROLL INTERACTION --- */

(function () {
    // Get video and audio elements
    const video = document.getElementById('studentPowerVideo');
    const audio = document.getElementById('studentPowerAudio');
    const section = document.getElementById('student-power');

    if (!video || !section) return;

    // Intersection Observer options
    const observerOptions = {
        root: null, // viewport
        rootMargin: '0px',
        threshold: 0.5 // Trigger when 50% of section is visible
    };

    // Callback function for intersection
    const handleIntersection = (entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                // Section is at least 50% visible - play video and audio
                video.play().catch(err => {
                    console.log('Video autoplay failed:', err);
                });

                if (audio) {
                    // Try to play audio, but it might be blocked by browser
                    audio.play().catch(err => {
                        console.log('Audio autoplay blocked by browser. User interaction needed.');
                    });
                }
            } else {
                // Section is not visible - pause video and audio
                video.pause();
                if (audio) {
                    audio.pause();
                }
            }
        });
    };

    // Create observer
    const observer = new IntersectionObserver(handleIntersection, observerOptions);

    // Start observing the section
    observer.observe(section);

    // Handle user interaction to enable audio (for browsers that block autoplay)
    let audioUnlocked = false;
    const unlockAudio = () => {
        if (!audioUnlocked && audio) {
            audio.play().then(() => {
                audioUnlocked = true;
                // If video is playing, sync audio
                if (!video.paused) {
                    audio.currentTime = video.currentTime;
                }
            }).catch(err => {
                console.log('Audio still blocked:', err);
            });
        }
    };

    // Try to unlock audio on first user interaction
    document.addEventListener('click', unlockAudio, { once: true });
    document.addEventListener('touchstart', unlockAudio, { once: true });

    // Sync audio with video time
    if (audio) {
        video.addEventListener('play', () => {
            if (audioUnlocked) {
                audio.currentTime = video.currentTime;
                audio.play().catch(err => console.log('Audio play failed:', err));
            }
        });

        video.addEventListener('pause', () => {
            if (audio) {
                audio.pause();
            }
        });

        // Keep audio and video in sync
        video.addEventListener('timeupdate', () => {
            if (audio && !audio.paused && Math.abs(audio.currentTime - video.currentTime) > 0.3) {
                audio.currentTime = video.currentTime;
            }
        });
    }
})();
