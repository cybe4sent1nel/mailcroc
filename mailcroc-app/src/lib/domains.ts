/**
 * MailCroc Domain Pool
 * 
 * Strategy:
 * 1. OWNED DOMAINS: mailcroc.qzz.io, mailpanda.qzz.io (catch-all SMTP)
 * 2. SUBDOMAIN VARIATIONS: inbox.mailcroc.qzz.io, temp.mailpanda.qzz.io, etc.
 *    - Requires wildcard MX records (*.mailcroc.qzz.io → VPS)
 * 3. DOT TRICK: u.ser@mailcroc.qzz.io = user@mailcroc.qzz.io (catch-all handles this)
 * 4. PLUS TRICK: user+tag@mailcroc.qzz.io (catch-all handles this)
 * 5. GOOGLEMAIL: user@googlemail.com variant (cosmetic, maps to gmail)
 */

// ---- Base owned domains ----
export const OWNED_DOMAINS = [
    "mailcroc.qzz.io",
    "mailpanda.qzz.io",
];

// ---- Subdomain prefixes (combined with base domains = many unique domains) ----
const SUBDOMAIN_PREFIXES = [
    "inbox",
    "mail",
    "temp",
    "go",
    "my",
    "get",
    "box",
    "dash",
    "hub",
    "now",
    "fast",
    "live",
    "app",
    "net",
    "run",
    "try",
    "join",
    "new",
    "pro",
    "one",
];

// ---- Build full domain pool: base + subdomain combos ----
function buildDomainPool(): string[] {
    const pool: string[] = [...OWNED_DOMAINS];

    for (const prefix of SUBDOMAIN_PREFIXES) {
        for (const base of OWNED_DOMAINS) {
            pool.push(`${prefix}.${base}`);
        }
    }

    return pool;
}

export const DOMAIN_POOL = buildDomainPool();

// ---- Generation modes ----
export type GenerationMode = 'standard' | 'plus' | 'dot' | 'googlemail' | 'gmail';

/**
 * Generate an email address based on mode
 */
export function generateEmailAddress(mode: GenerationMode, customPrefix?: string): string {
    const prefix = customPrefix || Math.random().toString(36).substring(2, 10);

    switch (mode) {
        case 'standard': {
            const domain = DOMAIN_POOL[Math.floor(Math.random() * DOMAIN_POOL.length)];
            return `${prefix}@${domain}`;
        }
        case 'plus': {
            // user+tag@domain — uses our owned domains with a plus alias
            const domain = DOMAIN_POOL[Math.floor(Math.random() * DOMAIN_POOL.length)];
            const tag = Math.random().toString(36).substring(2, 6);
            return `${prefix}+${tag}@${domain}`;
        }
        case 'dot': {
            // Insert random dots into prefix — catch-all still receives it
            const domain = DOMAIN_POOL[Math.floor(Math.random() * DOMAIN_POOL.length)];
            const dotted = insertRandomDots(prefix);
            return `${dotted}@${domain}`;
        }
        case 'googlemail': {
            // Check if a real Gmail username is configured for forwarding
            const gmailUser = process.env.NEXT_PUBLIC_GMAIL_USERNAME;
            if (gmailUser) {
                // Generate receivable alias: username+random@googlemail.com
                const randomTag = Math.random().toString(36).substring(2, 8);
                // Dot trick on the username part (optional, but adds variety)
                const dashedUser = Math.random() > 0.5 ? insertRandomDots(gmailUser) : gmailUser;
                return `${dashedUser}+${randomTag}@googlemail.com`;
            }

            // Fallback: Generate cosmetic @googlemail.com address with dot trick
            const dotted = insertRandomDots(prefix);
            return `${dotted}@googlemail.com`;
        }
        case 'gmail': {
            // Check if a real Gmail username is configured for forwarding
            const gmailUser = process.env.NEXT_PUBLIC_GMAIL_USERNAME;
            if (gmailUser) {
                // Generate receivable alias: username+random@gmail.com
                const randomTag = Math.random().toString(36).substring(2, 8);
                // Dot trick on the username part (optional, but adds variety)
                const dashedUser = Math.random() > 0.5 ? insertRandomDots(gmailUser) : gmailUser;
                return `${dashedUser}+${randomTag}@gmail.com`;
            }

            // Fallback: Generate cosmetic @gmail.com address with dot trick
            const dotted = insertRandomDots(prefix);
            return `${dotted}@gmail.com`;
        }
    }
}

/**
 * Insert random dots into a string for the dot trick
 */
function insertRandomDots(str: string): string {
    if (str.length <= 2) return str;
    const chars = str.split('');
    const result: string[] = [chars[0]];
    for (let i = 1; i < chars.length; i++) {
        // 40% chance to insert a dot before this char
        if (Math.random() < 0.4 && i < chars.length - 1) {
            result.push('.');
        }
        result.push(chars[i]);
    }
    return result.join('');
}

/**
 * Normalize an email address for lookup:
 * - Remove dots from local part (for catch-all matching)
 * - Remove +tag
 * - Lowercase everything
 */
export function normalizeEmail(email: string): string {
    const [local, domain] = email.toLowerCase().split('@');
    // Remove everything after +
    const baseLocal = local.split('+')[0];
    // Remove dots
    const normalized = baseLocal.replace(/\./g, '');
    return `${normalized}@${domain}`;
}

// Total addressable: 2 base + (20 subdomains × 2 bases) = 42 unique domains
// With dot trick: effectively unlimited unique addresses
// With plus trick: effectively unlimited unique addresses
