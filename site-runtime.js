// Shared interactions for the seven pages. No analytics on local previews.
document.querySelectorAll('.mobile-menu a').forEach(link => {
    link.addEventListener('click', () => { link.closest('details').open = false; });
});

(() => {
    const banner = document.getElementById('cookie-banner');
    const settings = document.getElementById('cookie-settings');
    const measurementId = 'G-6GML1CR323';
    const isProduction = ['cedatoutfaire.org', 'www.cedatoutfaire.org'].includes(location.hostname);
    let consent;
    try { consent = localStorage.getItem('ga_consent'); } catch (_) {}

    function loadAnalytics() {
        if (!isProduction || window.gtagLoaded) return;
        window.gtagLoaded = true;
        window.dataLayer = window.dataLayer || [];
        window.gtag = function () { window.dataLayer.push(arguments); };
        window.gtag('js', new Date());
        window.gtag('config', measurementId, { anonymize_ip: true });
        const script = document.createElement('script');
        script.async = true;
        script.src = 'https://www.googletagmanager.com/gtag/js?id=' + measurementId;
        document.head.append(script);
    }

    function setConsent(value) {
        consent = value;
        try { localStorage.setItem('ga_consent', value); } catch (_) {}
        window['ga-disable-' + measurementId] = value !== 'granted';
        banner.hidden = true;
        if (window.gtag) window.gtag('consent', 'update', { analytics_storage: value === 'granted' ? 'granted' : 'denied' });
        if (value === 'granted') loadAnalytics();
        settings.focus({ preventScroll: true });
    }
    window.openCookieSettings = () => {
        banner.hidden = false;
        document.getElementById('cookie-accept').focus({ preventScroll: true });
    };
    settings.addEventListener('click', event => {
        event.preventDefault();
        window.openCookieSettings();
    });
    document.getElementById('cookie-accept').addEventListener('click', () => setConsent('granted'));
    document.getElementById('cookie-decline').addEventListener('click', () => setConsent('denied'));
    banner.hidden = consent === 'granted' || consent === 'denied';
    window['ga-disable-' + measurementId] = consent !== 'granted';
    if (consent === 'granted') loadAnalytics();
})();

// Keep the four HTML reviews as a readable fallback if the JSON cannot load.
const reviewsContainer = document.getElementById('recent-reviews-container');
if (reviewsContainer) {
    fetch('reviews.json').then(response => {
        if (!response.ok) throw new Error('Reviews unavailable');
        return response.json();
    }).then(data => {
        if (!Array.isArray(data.recentReviews) || !data.recentReviews.length) return;
        const reviews = data.recentReviews.map(review => {
            const quote = document.createElement('blockquote');
            quote.className = 'quote';
            const text = document.createElement('p');
            text.textContent = '« ' + review.text + ' »';
            const footer = document.createElement('footer');
            const author = document.createElement('strong');
            author.textContent = review.author;
            footer.append(author, document.createTextNode(review.date + ' · Avis Google'));
            quote.append(text, footer);
            return quote;
        });
        reviewsContainer.replaceChildren(...reviews);
        document.getElementById('review-count-display').textContent = data.totalReviews;
        document.getElementById('review-rating-display').textContent = data.ratingValue;
        const stars = document.querySelector('.rating .stars');
        stars.textContent = '★'.repeat(Math.round(Number(data.ratingValue)));
        stars.setAttribute('aria-label', data.ratingValue + ' étoiles sur 5');
    }).catch(() => { /* Static reviews remain available. */ });
}
