// Shared interactions for the seven pages. No analytics on local previews.
document.querySelectorAll('.mobile-menu a').forEach(link => {
    link.addEventListener('click', () => { link.closest('details').open = false; });
});

(() => {
    const banner = document.getElementById('cookie-banner');
    const settings = document.getElementById('cookie-settings');
    const measurementId = 'G-6GML1CR323';
    const isProduction = ['cedatoutfaire.org', 'www.cedatoutfaire.org'].includes(location.hostname);
    const consentKey = 'ga_consent';
    const consentLifetime = 180 * 24 * 60 * 60 * 1000;
    let consent;
    let expiresAt = 0;
    let expiryTimer;

    function readConsent() {
        consent = undefined;
        expiresAt = 0;
        try {
            const saved = JSON.parse(localStorage.getItem(consentKey));
            if (saved && saved.version === 1 && ['granted', 'denied'].includes(saved.value)
                && Number.isFinite(saved.expiresAt) && saved.expiresAt > Date.now()
                && saved.expiresAt <= Date.now() + consentLifetime) {
                consent = saved.value;
                expiresAt = saved.expiresAt;
            }
        } catch (_) { /* Missing, old or unavailable storage requires a new choice. */ }
    }

    function clearAnalyticsCookies() {
        const domains = ['', location.hostname, 'cedatoutfaire.org'];
        document.cookie.split(';').forEach(cookie => {
            const name = cookie.split('=')[0].trim();
            if (name !== '_ga' && !name.startsWith('_ga_')) return;
            domains.forEach(domain => {
                document.cookie = name + '=; Max-Age=0; Path=/; SameSite=Lax'
                    + (domain ? '; Domain=' + domain : '');
            });
        });
    }

    // Basic consent mode: queue defaults locally; no Google script before consent.
    window.dataLayer = window.dataLayer || [];
    window.gtag = window.gtag || function () { window.dataLayer.push(arguments); };
    window.gtag('consent', 'default', {
        analytics_storage: 'denied',
        ad_storage: 'denied',
        ad_user_data: 'denied',
        ad_personalization: 'denied'
    });

    function loadAnalytics() {
        if (!isProduction || window.gtagLoaded) return;
        window.gtagLoaded = true;
        window.gtag('js', new Date());
        window.gtag('config', measurementId, {
            allow_google_signals: false,
            allow_ad_personalization_signals: false,
            cookie_expires: consentLifetime / 1000,
            cookie_update: false
        });
        const script = document.createElement('script');
        script.async = true;
        script.src = 'https://www.googletagmanager.com/gtag/js?id=' + measurementId;
        document.head.append(script);
    }

    function applyConsent() {
        const granted = consent === 'granted';
        window['ga-disable-' + measurementId] = !granted || !isProduction;
        window.gtag('consent', 'update', {
            analytics_storage: granted ? 'granted' : 'denied',
            ad_storage: 'denied',
            ad_user_data: 'denied',
            ad_personalization: 'denied'
        });
        if (granted) loadAnalytics();
        else clearAnalyticsCookies();
        banner.hidden = consent === 'granted' || consent === 'denied';
        clearTimeout(expiryTimer);
        if (expiresAt) {
            // Browser timers are limited to about 24 days; recheck long-lived tabs.
            expiryTimer = setTimeout(checkExpiry, Math.min(expiresAt - Date.now(), 2147483647));
        }
    }

    function checkExpiry() {
        if (!expiresAt) return;
        if (Date.now() >= expiresAt) {
            consent = undefined;
            expiresAt = 0;
            try { localStorage.removeItem(consentKey); } catch (_) {}
        }
        applyConsent();
    }

    function setConsent(value) {
        consent = value;
        expiresAt = Date.now() + consentLifetime;
        try {
            localStorage.setItem(consentKey, JSON.stringify({ version: 1, value, expiresAt }));
        } catch (_) { /* The choice still applies to this page when storage is blocked. */ }
        applyConsent();
        settings.focus({ preventScroll: true });
    }
    window.openCookieSettings = () => {
        banner.hidden = false;
        document.getElementById(consent === 'granted' ? 'cookie-decline' : 'cookie-accept').focus({ preventScroll: true });
    };
    settings.addEventListener('click', event => {
        event.preventDefault();
        window.openCookieSettings();
    });
    document.getElementById('cookie-accept').addEventListener('click', () => setConsent('granted'));
    document.getElementById('cookie-decline').addEventListener('click', () => setConsent('denied'));
    window.addEventListener('storage', event => {
        if (event.key !== consentKey && event.key !== null) return;
        readConsent();
        applyConsent();
    });
    document.addEventListener('visibilitychange', () => {
        if (!document.hidden) checkExpiry();
    });
    readConsent();
    applyConsent();
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
