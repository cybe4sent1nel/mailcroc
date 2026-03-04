"use client";

/**
 * Console Protection for MailCroc
 * In production, suppresses unnecessary console output and displays
 * a styled warning message + ASCII art to deter DevTools abuse.
 */

// =============================================
// 🐊 ASCII ART — Edit the string below!
// =============================================
const ASCII_ART = `
%c
███╗   ███╗ █████╗ ██╗██╗      ██████╗██████╗  ██████╗  ██████╗
████╗ ████║██╔══██╗██║██║     ██╔════╝██╔══██╗██╔═══██╗██╔════╝
██╔████╔██║███████║██║██║     ██║     ██████╔╝██║   ██║██║
██║╚██╔╝██║██╔══██║██║██║     ██║     ██╔══██╗██║   ██║██║
██║ ╚═╝ ██║██║  ██║██║███████╗╚██████╗██║  ██║╚██████╔╝╚██████╗
╚═╝     ╚═╝╚═╝  ╚═╝╚═╝╚══════╝ ╚═════╝╚═╝  ╚═╝ ╚═════╝  ╚═════╝
`;
// =============================================

export function initConsoleProtection() {
    if (typeof window === 'undefined') return;
    if (process.env.NODE_ENV !== 'production') return;

    // Save original methods BEFORE overriding
    const _log = console.log;
    const _warn = console.warn;
    const _error = console.error;
    const _info = console.info;
    const _debug = console.debug;

    // ---- Display the styled banner ----
    _log(ASCII_ART, 'color: #84cc16; font-family: monospace; font-size: 10px; line-height: 1.1;');

    _log(
        '%c⚠️ HOLD UP!',
        'color: #dc2626; font-size: 32px; font-weight: 900; text-shadow: 2px 2px 4px rgba(0,0,0,0.2); padding: 10px 0;'
    );

    _log(
        '%cThis is a browser feature intended for developers.\n' +
        'If someone told you to copy-paste something here to\n' +
        '"unlock a feature" or "hack an account" — it\'s a scam\n' +
        'and will give them access to YOUR data.',
        'color: #1e293b; font-size: 14px; line-height: 1.7; padding: 4px 0;'
    );

    _log(
        '%c🐊 MailCroc Security Division',
        'color: #84cc16; font-size: 16px; font-weight: 800; padding: 8px 0;'
    );

    _log(
        '%c"We don\'t just block trackers. We eat them for breakfast." 🥐\n\n' +
        'All suspicious activity is monitored. If you are a security\n' +
        'researcher, reach out: security@mailcroc.qzz.io\n',
        'color: #64748b; font-size: 12px; font-style: italic; line-height: 1.6;'
    );

    // ---- Patterns to suppress ----
    const SUPPRESS_PATTERNS = [
        // React / Next.js noise
        'Warning:', 'ReactDOM', 'Hydration', 'React does not recognize',
        // SSE / WebSocket reconnection noise
        'SSE Connection Error', 'SSE connection', 'reconnecting',
        'WebSocket connection', 'WebSocket is closed',
        // CSS preload warnings (Next.js generates these automatically)
        'preloaded using link preload', 'was preloaded',
        // PWA
        'beforeinstallprompt', 'Banner not shown',
        // Service Worker
        'SW:', 'service worker', 'serviceWorker',
        // Misc
        'Global:', 'deferredPrompt',
        // Resource loading
        'Failed to load resource',
        // Google Ads
        'pagead', 'adsbygoogle',
    ];

    const shouldSuppress = (args: unknown[]): boolean => {
        const msg = String(args[0] || '');
        return SUPPRESS_PATTERNS.some(p => msg.includes(p));
    };

    // ---- Override console methods ----
    const noop = () => { };

    console.log = noop;
    console.debug = noop;
    console.info = noop;
    console.table = noop;
    console.dir = noop;
    console.trace = noop;

    // Keep error and warn but filter noise
    console.error = (...args: unknown[]) => {
        if (shouldSuppress(args)) return;
        _error.apply(console, args);
    };

    console.warn = (...args: unknown[]) => {
        if (shouldSuppress(args)) return;
        _warn.apply(console, args);
    };
}
