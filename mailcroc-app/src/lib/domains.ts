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
/*
const SUBDOMAIN_PREFIXES = [
    "inbox",
    "mail",
    "temp",
    // ... (truncated for brevity)
    "sun",
];
*/

// ---- Build full domain pool: base + subdomain combos ----
// ---- Build full domain pool: base + subdomain combos ----
/*
function buildDomainPool(): string[] {
    const pool: string[] = [...OWNED_DOMAINS];

    // User explicitly requested subdomains.
    // NOTE: Each of these must be added to Cloudflare Email Routing manually if using Cloudflare!
    for (const prefix of SUBDOMAIN_PREFIXES) {
        for (const base of OWNED_DOMAINS) {
            pool.push(`${prefix}.${base}`);
        }
    }

    return pool;
}
*/

// ---- Fake Subdomain Prefixes (for local part variety) ----
const FAKE_SUBDOMAINS = [
    "inbox", "mail", "temp", "live", "secure", "app", "api", "dev", "auth", "login",
    "verify", "code", "admin", "support", "billing", "account", "noreply", "team",
    "welcome", "info", "hello", "contact", "help", "status", "jobs", "press",
    "media", "legal", "privacy", "security", "webmaster", "postmaster", "hostmaster",
    "abuse", "compliance", "sales", "marketing", "orders", "shipping", "returns",
    "invoice", "payments", "receipts", "billing", "alert", "notification", "digest",
    "newsletter", "updates", "community", "forum", "group", "list", "members",
    "social", "friends", "family", "work", "school", "office", "home", "mobile",
];

// ---- Readable Adjectives & Nouns for better Alises ----
const ADJECTIVES = [
    "funky", "jazzy", "wobbly", "sneaky", "mighty", "grumpy", "zippy", "dopey", "clumsy", "groovy",
    "bubbly", "cheesy", "dizzy", "fluffy", "geeky", "hungry", "itchy", "jumpy", "kooky", "loopy",
    "merry", "nutty", "perky", "quirky", "rocky", "sassy", "tacky", "unreal", "vague", "wacky",
    "yummy", "zesty", "atomic", "brainy", "catchy", "dreamy", "earthy", "fiery", "glitzy", "handy",
    "iconic", "juicy", "krilled", "lanky", "moody", "noble", "ocean", "peachy", "queasy", "ritzy",
    "shaky", "tangy", "urban", "vocal", "windy", "xeric", "yodeling", "zigzag", "absurd", "bonkers"
];
const NOUNS = [
    "pickle", "muffin", "badger", "rocket", "cactus", "donout", "pigeon", "turtle", "waffle", "noodle",
    "banjo", "cheese", "dragon", "elbow", "fridge", "goblin", "hammer", "island", "jacket", "kitten",
    "llama", "magnet", "nacho", "ostrich", "pizza", "quokka", "robot", "sloth", "toaster", "unicorn",
    "viking", "wizard", "xenon", "yeti", "zebra", "anchor", "barrel", "cannon", "diesel", "engine",
    "fender", "garage", "helmet", "indigo", "jungle", "koala", "ladder", "mantis", "nebula", "otter",
    "puddle", "quartz", "radar", "saddle", "tunnel", "update", "vortex", "wasp", "yacht", "zipper"
];

// ---- Separators for complexity ----
const SEPARATORS = ["-", "-", "-", ".", "_"]; // Strong bias towards hyphens to simulate subdomains safely

// export const DOMAIN_POOL = buildDomainPool();
export const DOMAIN_POOL = [...OWNED_DOMAINS];

export interface GenerationConfig {
    standard?: boolean;
    plus?: boolean;
    dot?: boolean;
    gmail?: boolean;
    googlemail?: boolean;
    hyphen?: boolean; // New: control word separation
}

/**
 * Generate an email address based on additive toggles
 */
export function generateEmailAddress(config: GenerationConfig, customPrefix?: string): string {
    // 1. Generate the base "witty" words (default to hyphenated unless hyphen toggle is explicitly false)
    const adj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
    const noun = NOUNS[Math.floor(Math.random() * NOUNS.length)];
    const num = Math.floor(10 + Math.random() * 89); // 2 digit num (10-99)

    const useHyphen = config.hyphen !== false; // Default to true
    const separator = useHyphen ? '-' : '';

    let localPortion = customPrefix || `${adj}${separator}${noun}${num}`;

    // 2. Determine Domain & Base (Gmail vs Owned)
    let domain = DOMAIN_POOL[Math.floor(Math.random() * DOMAIN_POOL.length)];
    let isGmailBase = false;

    if (config.gmail || config.googlemail) {
        const gmailUser = process.env.NEXT_PUBLIC_GMAIL_USERNAME;
        if (gmailUser) {
            const base = gmailUser.split('@')[0];
            localPortion = `${base}+${localPortion}`; // Witty name becomes the tag
            domain = config.googlemail ? 'googlemail.com' : 'gmail.com';
            isGmailBase = true;
        } else {
            // Fallback to cosmetic gmail if no username configured
            domain = config.googlemail ? 'googlemail.com' : 'gmail.com';
        }
    }

    // 3. Apply Additive Transformations
    // Note: If we are in Gmail Base mode, localPortion already has the base+witty combo

    // DOT Trick (if enabled)
    if (config.dot) {
        // If it's a Gmail base, we might only want to dot the base part or the whole thing?
        // Usually, users want the whole local part to look unique.
        localPortion = insertRandomDots(localPortion);
    }

    // PLUS Trick (if enabled and NOT already a gmail base which already uses +)
    if (config.plus && !isGmailBase) {
        const tag = Math.random().toString(36).substring(2, 6);
        localPortion = `${localPortion}+${tag}`;
    }

    // Standard "fake subdomain" variety (only for our owned domains)
    if (!isGmailBase && !config.gmail && !config.googlemail && Math.random() > 0.7) {
        const sub = FAKE_SUBDOMAINS[Math.floor(Math.random() * FAKE_SUBDOMAINS.length)];
        const sep = SEPARATORS[Math.floor(Math.random() * SEPARATORS.length)];
        return `${sub}${sep}${localPortion}@${domain}`;
    }

    return `${localPortion}@${domain}`;
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

/**
 * Extract a "Prettified" name from a witty email address.
 * Example: funky.badger64@... -> Funky Badger
 * Example: user+jazzy.llama10@... -> Jazzy Llama
 */
export function getDisplayNameFromEmail(email: string): string {
    if (!email) return "MailCroc User";

    // 1. Get the local part
    let local = email.split('@')[0];

    // 2. If it's a Gmail plus-tag, take the part after the +
    if (local.includes('+')) {
        local = local.split('+')[1];
    }

    // 3. Remove the digits at the end
    const namePart = local.replace(/\d+$/, '');

    // 4. Split by separators (- . _) and capitalize
    const words = namePart.split(/[-._]/).filter(Boolean);

    if (words.length === 0) return "MailCroc User";

    return words
        .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
        .join(' ');
}
