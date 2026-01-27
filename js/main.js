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
