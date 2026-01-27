/* --- CAROUSEL LOGIC --- */

// --- HERO CAROUSEL ---
(function () {
    const heroItems = document.querySelectorAll('.hero-carousel-item');
    if (!heroItems || heroItems.length === 0) return;

    let currentIndex = 0;
    const intervalTime = 5000; // 5 seconds

    function nextSlide() {
        // Remove active class from current
        heroItems[currentIndex].classList.remove('active');

        // Calculate next index
        currentIndex = (currentIndex + 1) % heroItems.length;

        // Add active class to next
        heroItems[currentIndex].classList.add('active');
    }

    // Start auto-play
    setInterval(nextSlide, intervalTime);
})();


// --- SECTION 2: SMOOTH SESSIONS CAROUSEL ---
(function () {
    const track = document.getElementById('sessionsTrack');
    const leftBtn = document.querySelector('.sessions-section .arrow-left');
    const rightBtn = document.querySelector('.sessions-section .arrow-right');

    if (!track || !leftBtn || !rightBtn) return;

    // Configuration
    const CONFIG = {
        autoScrollSpeed: 0.8,      // Pixels per frame
        manualScrollAmount: 350,   // Pixels per arrow click
        manualScrollDuration: 600, // Milliseconds for manual scroll animation
        pauseDuration: 3000        // Pause duration after manual scroll
    };

    // State
    let currentPosition = 0;
    let isAutoScrolling = true;
    let isPaused = false;
    let animationId = null;
    let pauseTimeout = null;

    // Calculate half width for infinite loop reset
    function getHalfWidth() {
        return track.scrollWidth / 2;
    }

    // Smooth scroll to position
    function smoothScrollTo(targetPosition, duration) {
        const startPosition = currentPosition;
        const distance = targetPosition - startPosition;
        const startTime = performance.now();

        isAutoScrolling = false;

        function animate(currentTime) {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);

            // Easing function: easeOutCubic
            const easeProgress = 1 - Math.pow(1 - progress, 3);

            currentPosition = startPosition + (distance * easeProgress);
            track.style.transform = `translateX(${currentPosition}px)`;

            if (progress < 1) {
                animationId = requestAnimationFrame(animate);
            } else {
                // Handle infinite loop boundaries
                handleLoopBoundary();

                // Clear any existing pause timeout
                if (pauseTimeout) clearTimeout(pauseTimeout);

                // Resume auto-scroll after pause
                pauseTimeout = setTimeout(() => {
                    isAutoScrolling = true;
                    autoScroll();
                }, CONFIG.pauseDuration);
            }
        }

        if (animationId) cancelAnimationFrame(animationId);
        animationId = requestAnimationFrame(animate);
    }

    // Handle infinite loop boundary
    function handleLoopBoundary() {
        const halfWidth = getHalfWidth();

        // If scrolled past the duplicate set, reset to beginning
        if (Math.abs(currentPosition) >= halfWidth) {
            currentPosition = currentPosition + halfWidth;
            track.style.transform = `translateX(${currentPosition}px)`;
        }

        // If scrolled before start, reset to end of first set
        if (currentPosition > 0) {
            currentPosition = currentPosition - halfWidth;
            track.style.transform = `translateX(${currentPosition}px)`;
        }
    }

    // Auto scroll animation
    function autoScroll() {
        if (!isAutoScrolling || isPaused) return;

        currentPosition -= CONFIG.autoScrollSpeed;

        // Reset position for infinite loop
        const halfWidth = getHalfWidth();
        if (Math.abs(currentPosition) >= halfWidth) {
            currentPosition = 0;
        }

        track.style.transform = `translateX(${currentPosition}px)`;
        animationId = requestAnimationFrame(autoScroll);
    }

    // Arrow click handlers
    leftBtn.addEventListener('click', function () {
        if (animationId) cancelAnimationFrame(animationId);
        if (pauseTimeout) clearTimeout(pauseTimeout);

        const targetPosition = currentPosition + CONFIG.manualScrollAmount;
        smoothScrollTo(targetPosition, CONFIG.manualScrollDuration);
    });

    rightBtn.addEventListener('click', function () {
        if (animationId) cancelAnimationFrame(animationId);
        if (pauseTimeout) clearTimeout(pauseTimeout);

        const targetPosition = currentPosition - CONFIG.manualScrollAmount;
        smoothScrollTo(targetPosition, CONFIG.manualScrollDuration);
    });

    // Pause on hover
    track.addEventListener('mouseenter', function () {
        isPaused = true;
        if (animationId && isAutoScrolling) {
            cancelAnimationFrame(animationId);
        }
    });

    track.addEventListener('mouseleave', function () {
        isPaused = false;
        if (isAutoScrolling) {
            autoScroll();
        }
    });

    // Touch support for mobile
    let touchStartX = 0;
    let touchEndX = 0;

    track.addEventListener('touchstart', function (e) {
        touchStartX = e.changedTouches[0].screenX;
        isPaused = true;
        if (animationId && isAutoScrolling) {
            cancelAnimationFrame(animationId);
        }
    }, { passive: true });

    track.addEventListener('touchend', function (e) {
        touchEndX = e.changedTouches[0].screenX;
        const swipeDistance = touchEndX - touchStartX;

        if (Math.abs(swipeDistance) > 50) {
            if (animationId) cancelAnimationFrame(animationId);
            if (pauseTimeout) clearTimeout(pauseTimeout);

            const targetPosition = currentPosition + (swipeDistance > 0 ? CONFIG.manualScrollAmount : -CONFIG.manualScrollAmount);
            smoothScrollTo(targetPosition, CONFIG.manualScrollDuration);
        } else {
            isPaused = false;
            if (isAutoScrolling) {
                autoScroll();
            }
        }
    }, { passive: true });

    // Start auto-scroll
    autoScroll();
})();


// --- SECTION 5: PORTFOLIO VIDEO NAVIGATION ---
(function () {
    const track = document.getElementById('portfolioTrack');
    const prevBtn = document.querySelector('.portfolio-prev');
    const nextBtn = document.querySelector('.portfolio-next');

    if (!track || !prevBtn || !nextBtn) return;

    let currentIndex = 0;
    const cards = track.querySelectorAll('.portfolio-video-card');
    const totalCards = cards.length;

    function getVisibleCards() {
        const width = window.innerWidth;
        if (width > 992) return 3;
        if (width > 768) return 2;
        return 1;
    }

    function getCardWidth() {
        const card = cards[0];
        if (!card) return 0;
        const style = window.getComputedStyle(track);
        const gap = parseInt(style.gap) || 30;
        return card.offsetWidth + gap;
    }

    function updateTrackPosition() {
        const cardWidth = getCardWidth();
        const offset = -currentIndex * cardWidth;
        track.style.transform = `translateX(${offset}px)`;
    }

    function goToNext() {
        const visibleCards = getVisibleCards();
        const maxIndex = totalCards - visibleCards;

        if (currentIndex < maxIndex) {
            currentIndex++;
        } else {
            currentIndex = 0;
        }
        updateTrackPosition();
    }

    function goToPrev() {
        const visibleCards = getVisibleCards();
        const maxIndex = totalCards - visibleCards;

        if (currentIndex > 0) {
            currentIndex--;
        } else {
            currentIndex = maxIndex;
        }
        updateTrackPosition();
    }

    nextBtn.addEventListener('click', goToNext);
    prevBtn.addEventListener('click', goToPrev);

    // Reset on resize
    let resizeTimeout;
    window.addEventListener('resize', function () {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(function () {
            currentIndex = 0;
            updateTrackPosition();
        }, 250);
    });
})();


// --- SECTION 7: WORKSHOP CAROUSEL ---
(function () {
    const track = document.getElementById('workshopsTrack');
    const prevBtn = document.querySelector('.workshop-arrow-left');
    const nextBtn = document.querySelector('.workshop-arrow-right');

    if (!track || !prevBtn || !nextBtn) return;

    // Configuration
    const CONFIG = {
        autoScrollSpeed: 0.5,
        manualScrollDuration: 500,
        pauseDuration: 3000
    };

    // State
    let currentPosition = 0;
    let isAutoScrolling = true;
    let isPaused = false;
    let animationId = null;
    let pauseTimeout = null;

    function getVisiblePosters() {
        const width = window.innerWidth;
        if (width > 992) return 3;
        if (width > 768) return 2;
        return 1;
    }

    function getPosterWidth() {
        const poster = track.querySelector('.workshop-poster');
        if (!poster) return 0;
        const style = window.getComputedStyle(track);
        const gap = parseInt(style.gap) || 20;
        return poster.offsetWidth + gap;
    }

    function getHalfWidth() {
        const posters = track.querySelectorAll('.workshop-poster');
        const posterWidth = getPosterWidth();
        return (posters.length / 2) * posterWidth;
    }

    function handleLoopBoundary() {
        const halfWidth = getHalfWidth();

        if (Math.abs(currentPosition) >= halfWidth) {
            currentPosition = currentPosition + halfWidth;
            track.style.transition = 'none';
            track.style.transform = `translateX(${currentPosition}px)`;
            track.offsetHeight; // Force reflow
            track.style.transition = '';
        }

        if (currentPosition > 0) {
            currentPosition = currentPosition - halfWidth;
            track.style.transition = 'none';
            track.style.transform = `translateX(${currentPosition}px)`;
            track.offsetHeight; // Force reflow
            track.style.transition = '';
        }
    }

    function smoothScrollTo(targetPosition, duration) {
        const startPosition = currentPosition;
        const distance = targetPosition - startPosition;
        const startTime = performance.now();

        isAutoScrolling = false;
        if (animationId) cancelAnimationFrame(animationId);

        function animate(currentTime) {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const easeProgress = 1 - Math.pow(1 - progress, 3);

            currentPosition = startPosition + (distance * easeProgress);
            track.style.transform = `translateX(${currentPosition}px)`;

            if (progress < 1) {
                animationId = requestAnimationFrame(animate);
            } else {
                handleLoopBoundary();

                if (pauseTimeout) clearTimeout(pauseTimeout);
                pauseTimeout = setTimeout(() => {
                    isAutoScrolling = true;
                    if (!isPaused) autoScroll();
                }, CONFIG.pauseDuration);
            }
        }

        animationId = requestAnimationFrame(animate);
    }

    function autoScroll() {
        if (!isAutoScrolling || isPaused) return;

        currentPosition -= CONFIG.autoScrollSpeed;
        handleLoopBoundary();

        track.style.transform = `translateX(${currentPosition}px)`;
        animationId = requestAnimationFrame(autoScroll);
    }

    // Arrow click handlers
    prevBtn.addEventListener('click', function () {
        if (animationId) cancelAnimationFrame(animationId);
        if (pauseTimeout) clearTimeout(pauseTimeout);

        const posterWidth = getPosterWidth();
        const targetPosition = currentPosition + posterWidth;
        smoothScrollTo(targetPosition, CONFIG.manualScrollDuration);
    });

    nextBtn.addEventListener('click', function () {
        if (animationId) cancelAnimationFrame(animationId);
        if (pauseTimeout) clearTimeout(pauseTimeout);

        const posterWidth = getPosterWidth();
        const targetPosition = currentPosition - posterWidth;
        smoothScrollTo(targetPosition, CONFIG.manualScrollDuration);
    });

    // Pause on hover
    track.addEventListener('mouseenter', function () {
        isPaused = true;
        if (animationId && isAutoScrolling) {
            cancelAnimationFrame(animationId);
        }
    });

    track.addEventListener('mouseleave', function () {
        isPaused = false;
        if (isAutoScrolling) {
            autoScroll();
        }
    });

    // Touch support
    let touchStartX = 0;

    track.addEventListener('touchstart', function (e) {
        touchStartX = e.changedTouches[0].screenX;
        isPaused = true;
        if (animationId && isAutoScrolling) {
            cancelAnimationFrame(animationId);
        }
    }, { passive: true });

    track.addEventListener('touchend', function (e) {
        const touchEndX = e.changedTouches[0].screenX;
        const swipeDistance = touchEndX - touchStartX;

        if (Math.abs(swipeDistance) > 50) {
            if (animationId) cancelAnimationFrame(animationId);
            if (pauseTimeout) clearTimeout(pauseTimeout);

            const posterWidth = getPosterWidth();
            const targetPosition = currentPosition + (swipeDistance > 0 ? posterWidth : -posterWidth);
            smoothScrollTo(targetPosition, CONFIG.manualScrollDuration);
        }

        isPaused = false;
        if (isAutoScrolling) {
            autoScroll();
        }
    }, { passive: true });

    // Start auto-scroll
    autoScroll();
})();
