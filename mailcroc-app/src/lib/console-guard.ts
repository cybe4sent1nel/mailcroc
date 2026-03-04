"use client";

/**
 * Console Protection for MailCroc
 * In production, suppresses unnecessary console output and displays
 * a styled warning message to deter DevTools abuse.
 */
export function initConsoleProtection() {
    if (typeof window === 'undefined') return;
    if (process.env.NODE_ENV !== 'production') return;

    // Styled console warning
    const warningStyle = 'color: #dc2626; font-size: 28px; font-weight: bold; text-shadow: 1px 1px 2px rgba(0,0,0,0.2);';
    const messageStyle = 'color: #1e293b; font-size: 14px; line-height: 1.6;';
    const brandStyle = 'color: #84cc16; font-size: 16px; font-weight: bold;';

    console.log('%c⚠️ STOP!', warningStyle);
    console.log(
        '%cThis browser feature is intended for developers. If someone told you to copy and paste something here to enable a feature or "hack" an account, it is a scam and will give them access to your data.',
        messageStyle
    );
    console.log('%c🐊 MailCroc Security', brandStyle);
    console.log(
        '%cWe take security seriously. All suspicious activity is logged and monitored. If you are a security researcher, please contact us at security@mailcroc.qzz.io.',
        messageStyle
    );

    // Suppress console methods in production
    const noop = () => { };
    const originalError = console.error;
    const originalWarn = console.warn;

    console.log = noop;
    console.debug = noop;
    console.info = noop;
    console.table = noop;
    console.dir = noop;
    console.trace = noop;

    // Keep error and warn for critical issues
    console.error = (...args: unknown[]) => {
        // Filter out common non-critical React/Next.js errors
        const msg = String(args[0] || '');
        if (msg.includes('Warning:') || msg.includes('ReactDOM') || msg.includes('Hydration')) return;
        originalError.apply(console, args);
    };

    console.warn = (...args: unknown[]) => {
        const msg = String(args[0] || '');
        if (msg.includes('Warning:') || msg.includes('ReactDOM')) return;
        originalWarn.apply(console, args);
    };
}
