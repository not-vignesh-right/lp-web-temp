# PowerShell script to update footer in all HTML files
$footerContent = @'
    <footer>
        <div class="container">
            <div class="footer-content">
                <div class="footer-about">
                    <div class="footer-logo">
                        <img src="assets/logo_with_name.png" alt="LessonPlan" class="footer-logo-img">
                    </div>
                    <p class="footer-mission">Empowering minds, transforming futures. Your breakthrough begins here.</p>
                    <div class="footer-social">
                        <h4>Follow Us</h4>
                        <div class="social-icons">
                            <a href="https://www.facebook.com/profile.php?id=61582919596153" target="_blank" rel="noopener noreferrer" aria-label="Facebook">
                                <i class="fa-brands fa-facebook-f"></i>
                            </a>
                            <a href="https://www.instagram.com/lessonplan_patil/?hl=en" target="_blank" rel="noopener noreferrer" aria-label="Instagram">
                                <i class="fa-brands fa-instagram"></i>
                            </a>
                        </div>
                    </div>
                </div>

                <div class="footer-links">
                    <h3>Quick Links</h3>
                    <ul>
                        <li><a href="index.html">Home</a></li>
                        <li><a href="about.html">About Us</a></li>
                        <li><a href="company-verticals.html">Company Verticals</a></li>
                        <li><a href="gallery.html">Gallery</a></li>
                        <li><a href="portfolio.html">Portfolio</a></li>
                        <li><a href="#contact">Contact</a></li>
                    </ul>
                </div>

                <div class="footer-contact">
                    <h3>Get in Touch</h3>
                    <div class="contact-item">
                        <i class="fa-solid fa-envelope"></i>
                        <a href="mailto:info@lessonplan.co.in">info@lessonplan.co.in</a>
                    </div>
                    <div class="contact-item">
                        <i class="fa-solid fa-phone"></i>
                        <a href="tel:+918050512005">+91-8050512005</a>
                    </div>
                    <div class="contact-item">
                        <i class="fa-solid fa-location-dot"></i>
                        <span>Above omega clinic, Kogilu,<br>Yelahanka, Bangalore - 560064</span>
                    </div>
                </div>

                <div class="footer-map">
                    <h3>Find Us</h3>
                    <div class="footer-map">
                        <iframe
                            src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3886.0876047982373!2d77.5860847!3d13.1003645!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3bae22f6d4b3f7b7%3A0x8e9f3c8b5d6a4c2d!2sOmega%20Clinics!5e0!3m2!1sen!2sin!4v1706430000000!5m2!1sen!2sin"
                            width="100%" height="200" style="border:0; border-radius: 8px;" allowfullscreen=""
                            loading="lazy" referrerpolicy="no-referrer-when-downgrade">
                        </iframe>
                        <p style="margin-top: 10px; font-size: 0.9rem;">
                            <i class="fa-solid fa-location-dot"></i>
                            OMEGA CLINICS, Kogilu Main Rd, next to ICICI Bank Ltd, Prakruthi Nagar, Yelahanka, Bengaluru, Karnataka 560064
                        </p>
                    </div>
                </div>
            </div>
            <div class="footer-bottom">
                <div class="copyright">&copy; 2026 LessonPlan. All rights reserved.</div>
            </div>
        </div>
    </footer>
'@

Write-Host "Footer template created. Manual update recommended for all HTML files." -ForegroundColor Green
