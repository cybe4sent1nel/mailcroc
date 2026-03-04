import * as cheerio from 'cheerio';
import { scanUrl, type VTScanResult } from '@/lib/virustotal';

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

const SSO_WHITELIST = [
    'accounts.google.com', 'github.com', 'microsoftonline.com', 'apple.com',
    'auth0.com', 'okta.com', 'login.microsoftonline.com', 'sso.'
];

export interface SecurityAnalysisResult {
    cleanHtml: string;
    isThreat: boolean;
    threatReason?: string;
    blockedTrackers: string[];
    vtUrlResults?: Record<string, VTScanResult>;
}

/**
 * Scans email HTML for embedded pixel trackers, known tracking endpoints,
 * phishing / spoofing attempts, and uses VirusTotal to check
 * suspicious links for known malware/phishing.
 */
export async function analyzeThreatsAndCleanHTML(from: string, subject: string, html: string): Promise<SecurityAnalysisResult> {
    let isThreat = false;
    let threatReason = '';
    const blockedTrackers = new Set<string>();
    const suspiciousUrls: string[] = [];

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

            // Collect external URLs for VT scanning (skip whitelisted / tracker domains)
            try {
                const hrefHost = new URL(href).hostname.replace(/^www\./, '');
                const isTracker = Object.keys(TRACKER_DOMAINS).some(d => hrefHost.includes(d));
                const isSSO = SSO_WHITELIST.some(d => hrefHost.includes(d));
                if (!isTracker && !isSSO && !hrefHost.endsWith('.google.com') && !hrefHost.endsWith('.googleapis.com')) {
                    suspiciousUrls.push(href);
                }
            } catch { /* skip malformed */ }

            // If the text looks like a url (contains a dot and no spaces)
            if (text.includes('.') && !text.includes(' ') && text.length > 5) {
                try {
                    const hrefHost = new URL(href).hostname.replace(/^www\./, '');
                    const textHostProtocol = text.startsWith('http') ? text : `http://${text}`;
                    const textHost = new URL(textHostProtocol).hostname.replace(/^www\./, '');

                    if (textHost && hrefHost && hrefHost !== textHost) {
                        const rootHref = hrefHost.split('.').slice(-2).join('.');
                        const rootText = textHost.split('.').slice(-2).join('.');

                        if (rootHref !== rootText) {
                            const isSSO = SSO_WHITELIST.some(domain => hrefHost.includes(domain));
                            const isGenericTracker = hrefHost.startsWith('click.') || hrefHost.startsWith('link.') || hrefHost.startsWith('t.');

                            if (!isSSO && !isGenericTracker) {
                                isThreat = true;
                                threatReason = `High-Risk Phishing: Contains a spoofed link masquerading as '${text}' but secretly redirecting to '${hrefHost}'.`;
                            }
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

            const match = lowerFrom.match(/@(.+?)(>|$)/);
            const domain = match ? match[1].trim() : '';

            if (FREEMAIL_DOMAINS.includes(domain)) {
                for (const brand of SENSITIVE_BRANDS) {
                    if ((lowerFrom.includes(brand) && !lowerFrom.includes(`@${brand}`)) || lowerSub.includes(brand)) {
                        isThreat = true;
                        threatReason = `Brand Impersonation: Claims to be '${brand.toUpperCase()}' but sent from an unverified personal email (${domain}).`;
                        break;
                    }
                }
            }
        }

        // ==========================================
        // 4. VirusTotal URL Scanning (async, non-blocking)
        // ==========================================
        let vtUrlResults: Record<string, VTScanResult> | undefined;
        if (suspiciousUrls.length > 0 && process.env.VIRUSTOTAL_API_KEY) {
            try {
                const { scanUrls } = await import('@/lib/virustotal');
                vtUrlResults = await scanUrls(suspiciousUrls);

                // Check VT results for malicious URLs
                for (const [url, result] of Object.entries(vtUrlResults)) {
                    if (result.verdict === 'malicious') {
                        isThreat = true;
                        threatReason = `VirusTotal: Link "${url}" detected as malicious by ${result.malicious} security vendors.`;
                        break;
                    } else if (result.verdict === 'suspicious' && !isThreat) {
                        isThreat = true;
                        threatReason = `VirusTotal: Link "${url}" flagged as suspicious by ${result.suspicious} vendors.`;
                    }
                }
            } catch (vtErr) {
                console.error('[VT] URL scan error in security analysis:', vtErr);
            }
        }

        return {
            cleanHtml: $.html(),
            isThreat,
            threatReason: isThreat ? threatReason : undefined,
            blockedTrackers: Array.from(blockedTrackers),
            vtUrlResults
        };

    } catch (err) {
        console.error("DOM Analysis Failed:", err);
        return { cleanHtml: html, isThreat, blockedTrackers: [] };
    }
}
