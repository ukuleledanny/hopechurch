// Shared navigation HTML
const NAV_HTML = `
<nav class="nav" id="nav">
  <a href="index.html" class="nav__logo">
    <img src="resources/logos/hope_logo_light.png" alt="Hope Church" class="nav__logo-img">
    <span class="nav__logo-sub">Madison, Alabama</span>
  </a>
  <ul class="nav__links" id="navLinks">
    <li><a href="index.html">Home</a></li>
    <li class="has-dropdown">
      <a href="about.html">About <span class="dropdown-arrow">▾</span></a>
      <ul class="nav__dropdown">
        <li><a href="about.html">About Hope</a></li>
        <li><a href="beliefs.html">What We Believe</a></li>
        <li><a href="staff.html">Our Staff</a></li>
        <li><a href="events.html">News &amp; Events</a></li>
      </ul>
    </li>
    <li><a href="sermons.html">Sermons</a></li>
    <li><a href="ministries.html">Ministries</a></li>
    <li><a href="contact.html">Contact</a></li>
  </ul>
  <a href="contact.html" class="nav__cta">Plan a Visit</a>
  <div class="nav__toggle" id="navToggle" onclick="document.getElementById('nav').classList.toggle('open')">
    <span></span><span></span><span></span>
  </div>
</nav>
`;

const FOOTER_HTML = `
<footer class="footer">
  <div class="container">
    <div class="footer__grid">
      <div class="footer__brand">
        <a href="index.html" class="nav__logo">
          <img src="resources/logos/hope_logo_light.png" alt="Hope Church" class="nav__logo-img nav__logo-img--footer">
          <span class="nav__logo-sub">Madison, Alabama</span>
        </a>
        <p>Passionately pursuing Christ and fearlessly on mission — in Madison and beyond.</p>
      </div>
      <div class="footer__col">
        <h5>Navigate</h5>
        <ul>
          <li><a href="index.html">Home</a></li>
          <li><a href="about.html">About Us</a></li>
          <li><a href="sermons.html">Sermons</a></li>
          <li><a href="events.html">Events</a></li>
          <li><a href="ministries.html">Ministries</a></li>
          <li><a href="contact.html">Contact</a></li>
        </ul>
      </div>
      <div class="footer__col">
        <h5>Visit</h5>
        <ul>
          <li><span>1661 Balch Rd</span></li>
          <li><span>Madison, AL 35757</span></li>
          <li><span>Sunday 10:00 a.m.</span></li>
          <li><a href="tel:2568305544">(256) 830-5544</a></li>
        </ul>
      </div>
      <div class="footer__col">
        <h5>Connect</h5>
        <ul>
          <li><a href="#">Facebook</a></li>
          <li><a href="#">YouTube</a></li>
          <li><a href="contact.html">Prayer Request</a></li>
          <li><a href="contact.html">Give Online</a></li>
        </ul>
      </div>
    </div>
    <div class="footer__bottom">
      <p>© 2025 Hope Church · Madison, Alabama. All rights reserved.</p>
      <p>Made with faith &amp; care.</p>
    </div>
  </div>
</footer>
`;

// Inject nav and footer
document.getElementById('nav-placeholder').innerHTML = NAV_HTML;
document.getElementById('footer-placeholder').innerHTML = FOOTER_HTML;

// Highlight active nav link
const page = window.location.pathname.split('/').pop() || 'index.html';
const aboutPages = ['about.html', 'beliefs.html', 'staff.html', 'events.html'];
document.querySelectorAll('.nav__links a').forEach(link => {
  if (link.getAttribute('href') === page) link.classList.add('active');
});
// Mark the About parent as active when on any About sub-page
if (aboutPages.includes(page)) {
  const aboutParent = document.querySelector('.has-dropdown > a');
  if (aboutParent) aboutParent.classList.add('active');
}
// Mark the matching dropdown item as active
document.querySelectorAll('.nav__dropdown a').forEach(link => {
  if (link.getAttribute('href') === page) link.classList.add('active');
});
