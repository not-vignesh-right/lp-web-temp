/* --- MAIN JAVASCRIPT --- */

// Contact Form Handling
(function () {
    const form = document.getElementById("contact-form");
    const statusEl = document.getElementById("form-status");
    const sendBtn = document.getElementById("send-btn");

    if (!form) return;

    form.addEventListener("submit", async function (e) {
        e.preventDefault();

        statusEl.textContent = "Sending...";
        statusEl.style.color = "#333";
        sendBtn.disabled = true;

        try {
            const formData = new FormData(form);

            const res = await fetch(form.action, {
                method: "POST",
                body: formData,
                headers: { "Accept": "application/json" }
            });

            const data = await res.json().catch(() => ({}));

            if (res.ok && data.success) {
                statusEl.textContent = "Message sent successfully.";
                statusEl.style.color = "#0b7a0b";
                form.reset();
            } else {
                statusEl.textContent = (data && data.message)
                    ? data.message
                    : "Failed to send. Please try again.";
                statusEl.style.color = "#b00020";
            }
        } catch (err) {
            console.error(err);
            statusEl.textContent = "Network error. Please try again.";
            statusEl.style.color = "#b00020";
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
    const hamburger = document.querySelector('.hamburger');
    const navLinks = document.querySelector('.nav-links');

    if (hamburger && navLinks) {
        hamburger.addEventListener('click', function () {
            navLinks.classList.toggle('active');
            hamburger.classList.toggle('active');
        });

        // Close menu when a link is clicked
        const links = navLinks.querySelectorAll('a');
        links.forEach(link => {
            link.addEventListener('click', () => {
                navLinks.classList.remove('active');
                hamburger.classList.remove('active');
            });
        });
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
