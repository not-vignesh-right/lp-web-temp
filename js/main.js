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
        sendBtn.disabled = true;

        try {
            const formData = new FormData(form);

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
            // STRICT CHECK: Ensure we actually got a success flag.
            if (res.ok && (data.success === true || data.success === "true")) {
                statusEl.innerHTML = '<i class="fa-solid fa-circle-check"></i> Message sent successfully! We will contact you shortly.';
                statusEl.className = 'success';
                form.reset();
            } else {
                // If we get here, it means we got a 200 OK but NO success flag (likely HTML response for Captcha/Activation)
                // OR we got a non-200 error.
                let msg = "Submission received, but we couldn't confirm delivery. Please checking your email to activate the form if this is the first time.";
                if (data.message) msg = data.message;

                statusEl.innerHTML = `<i class="fa-solid fa-circle-exclamation"></i> ${msg}`;
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
