// Smooth scrolling pour les liens de navigation
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    });
});

// Ajouter une classe active au menu lors du scroll
window.addEventListener('scroll', function () {
    const sections = document.querySelectorAll('section');
    const navLinks = document.querySelectorAll('.nav-menu a');

    let current = '';
    sections.forEach(section => {
        const sectionTop = section.offsetTop;
        const sectionHeight = section.clientHeight;
        if (pageYOffset >= sectionTop - 200) {
            current = section.getAttribute('id');
        }
    });

    navLinks.forEach(link => {
        link.classList.remove('active');
        if (link.getAttribute('href').slice(1) === current) {
            link.classList.add('active');
        }
    });
});

// Animations d'apparition légères, sans bloquer l'affichage du contenu.
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.style.opacity = '1';
            entry.target.style.transform = 'translateY(0)';
            revealObserver.unobserve(entry.target);
        }
    });
}, {
    threshold: 0.1
});

function prepareRevealAnimations(elements) {
    if (prefersReducedMotion.matches) {
        return;
    }

    elements.forEach((element, index) => {
        element.style.opacity = '0';
        element.style.transform = 'translateY(16px)';
        element.style.transition = 'opacity 0.42s ease, transform 0.42s ease';
        element.style.transitionDelay = `${Math.min(index * 70, 210)}ms`;
        element.style.willChange = 'opacity, transform';
        revealObserver.observe(element);
    });
}

prepareRevealAnimations(document.querySelectorAll('.services h2, .testimonials h2, .contact h2'));
prepareRevealAnimations(document.querySelectorAll('.service-card'));
prepareRevealAnimations(document.querySelectorAll('.contact-item'));
prepareRevealAnimations(document.querySelectorAll('.avis-card'));

document.addEventListener('reviews:loaded', event => {
    prepareRevealAnimations(event.detail.querySelectorAll('.avis-card'));
});
