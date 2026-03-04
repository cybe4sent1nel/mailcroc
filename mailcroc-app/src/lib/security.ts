import * as cheerio from 'cheerio';

const TRACKER_DOMAINS: Record<string, string> = {
    'google-analytics.com': 'Google Analytics',
    'sendgrid.net': 'SendGrid Tracking',
    'mailchimp.com': 'MailChimp',
    'list-manage.com': 'MailChimp',
    'hubspot.com': 'HubSpot',
    'hs-analytics.net': 'HubSpot',
    'aws-track': 'AWS SES Tracking',
    'trk.': 'Generic Tracker API',
    'open.': 'Open Pixel Tracker',
    'click.': 'Click Tracking',
    'mailgun.org': 'Mailgun Tracking',
    'postmarkapp.com': 'Postmark Tracking',
    'sentry-error': 'Sentry Analytics',
    'mailerlite.com': 'MailerLite',
    'constantcontact.com': 'Constant Contact',
    'klaviyo.com': 'Klaviyo',
    'convertkit.com': 'ConvertKit'
};

const FREEMAIL_DOMAINS = [
    'gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'aol.com', 'mail.ru', 'icloud.com'
];

const SENSITIVE_BRANDS = [
    'bank', 'paypal', 'support', 'police', 'tax', 'irs', 'gov', 'amazon', 'apple', 'microsoft',
    'netflix', 'billing', 'invoice', 'payment', 'cashapp', 'venmo', 'security', 'alert'
];

export interface SecurityAnalysisResult {
    cleanHtml: string;
    isThreat: boolean;
    threatReason?: string;
    blockedTrackers: string[];
}

/**
 * Scans email HTML for embedded pixel trackers, known tracking endpoints,
 * and high-severity phishing / spoofing attempts before they hit the user's browser.
 */
export function analyzeThreatsAndCleanHTML(from: string, subject: string, html: string): SecurityAnalysisResult {
    let isThreat = false;
    let threatReason = '';
    const blockedTrackers = new Set<string>();

    if (!html) {
        return { cleanHtml: '', isThreat, threatReason, blockedTrackers: [] };
    }

    try {
        const $ = cheerio.load(html);

        // ==========================================
        // 1. Phishing & Spoofed Link Detection
        // ==========================================
        $('a').each((_, el) => {
            const $el = $(el);
            const href = $el.attr('href') || '';
            const text = $el.text().trim();

            if (!href.startsWith('http')) return;

            // If the text looks like a url (contains a dot and no spaces)
            if (text.includes('.') && !text.includes(' ') && text.length > 5) {
                try {
                    const hrefHost = new URL(href).hostname.replace(/^www\./, '');
                    // Be generous: text might be 'example.com' without protocol
                    const textHostProtocol = text.startsWith('http') ? text : `http://${text}`;
                    const textHost = new URL(textHostProtocol).hostname.replace(/^www\./, '');

                    // If the visual text URL goes to a fundamentally different root domain than the href URL
                    // Example: visible text = "paypal.com" but href = "evil-phish.net"
                    if (textHost && hrefHost && hrefHost !== textHost) {
                        // Ensure it's not simply a subdomain redirect of the same root
                        const rootHref = hrefHost.split('.').slice(-2).join('.');
                        const rootText = textHost.split('.').slice(-2).join('.');

                        if (rootHref !== rootText) {
                            isThreat = true;
                            threatReason = `High-Risk Phishing: Contains a spoofed link masquerading as '${text}' but secretly redirecting to '${hrefHost}'.`;
                        }
                    }
                } catch {
                    // Ignore malformed URLs in text
                }
            }
        });

        // ==========================================
        // 2. Embedded Tracker & Pixel Blocking
        // ==========================================
        $('img').each((_, el) => {
            const $el = $(el);
            const src = $el.attr('src') || '';
            const width = $el.attr('width');
            const height = $el.attr('height');

            let isTracker = false;

            // Heuristic Rule 1: 1x1 or 0x0 invisible pixels
            if ((width === '1' && height === '1') || (width === '0' && height === '0')) {
                isTracker = true;
                blockedTrackers.add('Invisible 1x1 Tracking Pixel');
            }

            // Heuristic Rule 2: Known tracking domains in SRC
            if (src && !isTracker) {
                const lowerSrc = src.toLowerCase();
                for (const [domain, name] of Object.entries(TRACKER_DOMAINS)) {
                    if (lowerSrc.includes(domain)) {
                        isTracker = true;
                        blockedTrackers.add(name);
                        break;
                    }
                }
            }

            // If it's a confirmed tracker, shred it from the DOM
            if (isTracker) {
                $el.remove();
            }
        });

        // ==========================================
        // 3. Brand Impersonation / Freemail Spoofing
        // ==========================================
        if (!isThreat && from) {
            const lowerFrom = from.toLowerCase();
            const lowerSub = (subject || '').toLowerCase();

            // Extract the domain of the sender
            const match = lowerFrom.match(/@(.+?)(>|$)/);
            const domain = match ? match[1].trim() : '';

            if (FREEMAIL_DOMAINS.includes(domain)) {
                // If a freemail account claims to be a sensitive brand
                for (const brand of SENSITIVE_BRANDS) {
                    if ((lowerFrom.includes(brand) && !lowerFrom.includes(`@${brand}`)) || lowerSub.includes(brand)) {
                        isThreat = true;
                        threatReason = `Brand Impersonation: Claims to be '${brand.toUpperCase()}' but sent from an unverified personal email (${domain}).`;
                        break;
                    }
                }
            }
        }

        return {
            cleanHtml: $.html(),
            isThreat,
            threatReason: isThreat ? threatReason : undefined,
            blockedTrackers: Array.from(blockedTrackers)
        };

    } catch (err) {
        console.error("DOM Analysis Failed:", err);
        // Fallback safely: return raw HTML but no trackers marked
        return { cleanHtml: html, isThreat, blockedTrackers: [] };
    }
}
