/* --- MAIN JAVASCRIPT --- */

// Contact Form Handling
(function () {
    const form = document.getElementById("contact-form");
    const statusEl = document.getElementById("form-status");
    const sendBtn = document.getElementById("send-btn");

    if (!form) return;

    form.addEventListener("submit", async function (e) {
        e.preventDefault();

        // Initial Loading handled inside try block
        sendBtn.disabled = true;

        try {
            const formData = new FormData(form);

            // Show Loading State
            statusEl.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Sending message...';
            statusEl.className = 'loading';

            const res = await fetch(form.action, {
                method: "POST",
                body: formData,
                headers: { "Accept": "application/json" }
            });

            // Try parsing JSON, but fallback to text if it fails
            let data = {};
            try {
                data = await res.json();
            } catch (jsonErr) {
                // Response was likely text/html (legacy success page)
            }

            // FormSubmit returns 200 OK for success. 
            // PERMISSIVE CHECK: If 200 OK, assume success unless explicitly false.
            if (res.ok) {
                if (data.success === false || data.success === "false") {
                    statusEl.innerHTML = `<i class="fa-solid fa-circle-exclamation"></i> ${data.message || "Failed to send. Please try again."}`;
                    statusEl.className = 'error';
                } else {
                    // Success case (JSON success=true OR HTML 200 OK which fails JSON parse)
                    statusEl.innerHTML = '<i class="fa-solid fa-circle-check"></i> Message sent successfully! We will contact you shortly.';
                    statusEl.className = 'success';
                    form.reset();
                }
            } else {
                // Non-200 Error
                statusEl.innerHTML = '<i class="fa-solid fa-circle-exclamation"></i> Failed to send. Please try again later.';
                statusEl.className = 'error';
            }
        } catch (err) {
            console.error("Form error:", err);
            statusEl.innerHTML = '<i class="fa-solid fa-circle-exclamation"></i> Network error. Please check your connection.';
            statusEl.className = 'error';
        } finally {
            sendBtn.disabled = false;
        }
    });
})();

// Scroll to Top on Load
(function () {
    function resetToHome() {
        if (window.location.hash) {
            // Remove #... without adding a new history entry
            history.replaceState(null, document.title, window.location.pathname + window.location.search);
            // Go to top
            window.scrollTo(0, 0);
        }
    }

    window.addEventListener("load", resetToHome);
    // Covers some back-forward cache restores (Safari/Firefox)
    window.addEventListener("pageshow", resetToHome);
})();

(function () {
    function forceTop() {
        // Force to top after layout/anchor behaviors
        window.scrollTo({ top: 0, left: 0, behavior: "auto" });

        // Extra forcing for some browsers
        requestAnimationFrame(() => window.scrollTo(0, 0));
        setTimeout(() => window.scrollTo(0, 0), 0);
        setTimeout(() => window.scrollTo(0, 0), 50);
    }

    window.addEventListener("load", forceTop);
    window.addEventListener("pageshow", forceTop);
})();

// Hamburger Menu Toggle
(function () {
    const initNav = () => {
        const hamburger = document.querySelector('.hamburger');
        const navLinks = document.querySelector('.nav-links');

        if (hamburger && navLinks) {
            // Remove any existing listeners to prevent duplicates if function runs twice
            const newHamburger = hamburger.cloneNode(true);
            hamburger.parentNode.replaceChild(newHamburger, hamburger);

            newHamburger.addEventListener('click', function (e) {
                e.preventDefault();
                e.stopPropagation(); // Stop event bubbling
                navLinks.classList.toggle('active');
                newHamburger.classList.toggle('active');
                console.log('Hamburger clicked'); // Debug
            });

            // Close menu when a link is clicked
            const links = navLinks.querySelectorAll('a');
            links.forEach(link => {
                link.addEventListener('click', () => {
                    navLinks.classList.remove('active');
                    newHamburger.classList.remove('active');
                });
            });

            // Close when clicking outside
            document.addEventListener('click', (e) => {
                if (!newHamburger.contains(e.target) && !navLinks.contains(e.target) && navLinks.classList.contains('active')) {
                    navLinks.classList.remove('active');
                    newHamburger.classList.remove('active');
                }
            });
        }
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initNav);
    } else {
        initNav();
    }
})();

// Scroll Reveal Animation (IntersectionObserver)
(function () {
    // Disable on Terms & Conditions page to prevent text visibility issues
    if (window.location.href.includes('terms-conditions')) return;

    // Elements to reveal
    // Selecting major sections and cards for animation
    const revealElements = document.querySelectorAll('section, .card, .session-card, .footer-content, .hero-content');

    const revealCallback = (entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('active');
                observer.unobserve(entry.target); // Only animate once
            }
        });
    };

    const revealOptions = {
        threshold: 0.15, // Trigger when 15% of element is visible
        rootMargin: "0px 0px -50px 0px"
    };

    const revealObserver = new IntersectionObserver(revealCallback, revealOptions);

    revealElements.forEach(el => {
        el.classList.add('reveal'); // Add base class for initial state
        revealObserver.observe(el);
    });
})();

// Global Media Playback Control
(function () {
    // Custom Event Name
    const MEDIA_PLAYING_EVENT = 'media:playing';

    // Global helper to dispatch event
    window.notifyMediaPlaying = function (sourceId) {
        const event = new CustomEvent(MEDIA_PLAYING_EVENT, {
            detail: { source: sourceId }
        });
        window.dispatchEvent(event);
    };

    // Listen for global media events to pause generic audio/video elements
    window.addEventListener(MEDIA_PLAYING_EVENT, (e) => {
        const sourceId = e.detail.source;

        // Select all audio and video elements on the page
        const mediaElements = document.querySelectorAll('audio, video');

        mediaElements.forEach(media => {
            // If this media element is the source, ignore it
            if (media.id === sourceId) return;

            // Also check if the media is inside a container that might be the source
            if (media.closest(`#${sourceId}`)) return;

            // Custom exception: Allow Student Power video and audio to play together
            if (sourceId === 'studentPowerVideo' && media.id === 'studentPowerAudio') return;

            // Pause if playing
            if (!media.paused) {
                console.log(`Pausing ${media.id || 'media'} due to playback from ${sourceId}`);
                media.pause();
            }
        });
    });
})();

// Career Roadmap: pre-fill the contact form from ?topic=...&path=...&from=career-roadmap
(function () {
    const form = document.getElementById("contact-form");
    if (!form) return;

    const params = new URLSearchParams(window.location.search);
    if (params.get("from") !== "career-roadmap") return;

    const clean = (v) => (v || "").replace(/[\r\n]+/g, " ").trim().slice(0, 80);
    const topic = clean(params.get("topic"));
    const path = clean(params.get("path"));
    const generic = !topic || topic === "Career guidance" || topic === "Career Roadmap";

    const subject = form.querySelector("#subject");
    const message = form.querySelector("#message");

    if (subject && !subject.value) {
        subject.value = generic ? "Career Roadmap enquiry" : "Career Roadmap enquiry - " + topic;
    }
    if (message && !message.value) {
        message.value = generic
            ? "I would like guidance on choosing the right career path."
            : "I am interested in " + topic + (path && path !== "Career Roadmap" ? " (" + path + ")" : "") +
              ". Please guide me on eligibility, dates and preparation.";
    }

    const note = document.createElement("p");
    note.textContent = "You came from the Career Roadmap, so we have filled in your enquiry. Please add your name, phone and email.";
    note.style.cssText = "background:#eef4fa;color:#003366;border-radius:8px;padding:10px 14px;margin:0 0 14px;font-size:0.95rem;";
    form.parentNode.insertBefore(note, form);
})();
