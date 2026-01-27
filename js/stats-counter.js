document.addEventListener("DOMContentLoaded", () => {
    const counters = document.querySelectorAll(".counter-number");

    const animateCounter = (counter) => {
        // Extract number and suffix (any non-digit characters)
        const targetText = counter.getAttribute("data-target");
        const targetNumber = parseFloat(targetText.replace(/,/g, '')); // Remove commas for parsing
        const suffix = targetText.replace(/[0-9.,]/g, ''); // Extract suffix like "L+" or "+"

        // Also handling "2L+" case specifically if parseFloat stops at 'L'
        // parseFloat("2L+") is 2. Suffix would be "L+". Correct.
        // parseFloat("60,000+") -> "60000". Suffix "+". Correct.

        const duration = 4000; // Animation duration in ms
        const frameDuration = 1000 / 60; // 60fps
        const totalFrames = Math.round(duration / frameDuration);

        let frame = 0;

        const timer = setInterval(() => {
            frame++;
            const progress = frame / totalFrames;
            // Ease out function for smooth landing
            const easeProgress = 1 - Math.pow(1 - progress, 3);

            const currentNumber = Math.floor(easeProgress * targetNumber);

            // Format number with commas if it was large
            let formattedNumber = currentNumber.toLocaleString();

            // If target had commas (like 60,000), localeString adds them back. 
            // "2" becomes "2".

            counter.innerText = formattedNumber + suffix;

            if (frame === totalFrames) {
                clearInterval(timer);
                // Ensure final value matches exactly just in case
                counter.innerText = targetText;
            }
        }, frameDuration);
    };

    const observerOptions = {
        threshold: 0.5 // Trigger when 50% visible
    };

    const observer = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const counter = entry.target;
                animateCounter(counter);
                observer.unobserve(counter); // Only animate once
            }
        });
    }, observerOptions);

    counters.forEach(counter => {
        observer.observe(counter);
    });
});
