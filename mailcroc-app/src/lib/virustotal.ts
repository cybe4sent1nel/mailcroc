/**
 * VirusTotal Integration for MailCroc
 * Scans URLs and file hashes for malware, phishing, and other threats.
 */

const VT_API_BASE = 'https://www.virustotal.com/api/v3';

function getApiKey(): string | null {
    return process.env.VIRUSTOTAL_API_KEY || null;
}

export interface VTScanResult {
    safe: boolean;
    malicious: number;
    suspicious: number;
    undetected: number;
    harmless: number;
    verdict: 'safe' | 'suspicious' | 'malicious' | 'unknown';
    details?: string;
    permalink?: string;
}

/**
 * Scan a URL for threats using VirusTotal API.
 * Returns scan results with verdict.
 */
export async function scanUrl(url: string): Promise<VTScanResult> {
    const apiKey = getApiKey();
    if (!apiKey) return { safe: true, malicious: 0, suspicious: 0, undetected: 0, harmless: 0, verdict: 'unknown', details: 'VT API key not configured' };

    try {
        // Step 1: Submit URL for scanning
        const submitRes = await fetch(`${VT_API_BASE}/urls`, {
            method: 'POST',
            headers: {
                'x-apikey': apiKey,
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: `url=${encodeURIComponent(url)}`,
        });

        if (!submitRes.ok) {
            console.error('[VT] URL submit failed:', submitRes.status);
            return { safe: true, malicious: 0, suspicious: 0, undetected: 0, harmless: 0, verdict: 'unknown', details: 'VT submit failed' };
        }

        const submitData = await submitRes.json();
        const analysisId = submitData.data?.id;

        if (!analysisId) {
            return { safe: true, malicious: 0, suspicious: 0, undetected: 0, harmless: 0, verdict: 'unknown', details: 'No analysis ID returned' };
        }

        // Step 2: Poll for results (wait briefly then fetch)
        await new Promise(resolve => setTimeout(resolve, 3000));

        const resultRes = await fetch(`${VT_API_BASE}/analyses/${analysisId}`, {
            headers: { 'x-apikey': apiKey },
        });

        if (!resultRes.ok) {
            return { safe: true, malicious: 0, suspicious: 0, undetected: 0, harmless: 0, verdict: 'unknown', details: 'VT analysis fetch failed' };
        }

        const resultData = await resultRes.json();
        const stats = resultData.data?.attributes?.stats || {};

        return buildResult(stats, resultData.data?.links?.self);
    } catch (err) {
        console.error('[VT] URL scan error:', err);
        return { safe: true, malicious: 0, suspicious: 0, undetected: 0, harmless: 0, verdict: 'unknown', details: 'Scan error' };
    }
}

/**
 * Scan a file by its SHA-256 hash using VirusTotal API.
 * Use this for known files where you have the hash.
 */
export async function scanFileHash(sha256: string): Promise<VTScanResult> {
    const apiKey = getApiKey();
    if (!apiKey) return { safe: true, malicious: 0, suspicious: 0, undetected: 0, harmless: 0, verdict: 'unknown', details: 'VT API key not configured' };

    try {
        const res = await fetch(`${VT_API_BASE}/files/${sha256}`, {
            headers: { 'x-apikey': apiKey },
        });

        if (res.status === 404) {
            return { safe: true, malicious: 0, suspicious: 0, undetected: 0, harmless: 0, verdict: 'unknown', details: 'File not found in VT database' };
        }

        if (!res.ok) {
            return { safe: true, malicious: 0, suspicious: 0, undetected: 0, harmless: 0, verdict: 'unknown', details: `VT API error: ${res.status}` };
        }

        const data = await res.json();
        const stats = data.data?.attributes?.last_analysis_stats || {};
        const permalink = `https://www.virustotal.com/gui/file/${sha256}`;

        return buildResult(stats, permalink);
    } catch (err) {
        console.error('[VT] File hash scan error:', err);
        return { safe: true, malicious: 0, suspicious: 0, undetected: 0, harmless: 0, verdict: 'unknown', details: 'Scan error' };
    }
}

/**
 * Upload a file buffer to VirusTotal for scanning.
 * Used for scanning attachments directly.
 */
export async function scanFileBuffer(buffer: Buffer, filename: string): Promise<VTScanResult> {
    const apiKey = getApiKey();
    if (!apiKey) return { safe: true, malicious: 0, suspicious: 0, undetected: 0, harmless: 0, verdict: 'unknown', details: 'VT API key not configured' };

    try {
        const formData = new FormData();
        const uint8 = new Uint8Array(buffer);
        const blob = new Blob([uint8], { type: 'application/octet-stream' });
        formData.append('file', blob, filename);

        const submitRes = await fetch(`${VT_API_BASE}/files`, {
            method: 'POST',
            headers: { 'x-apikey': apiKey },
            body: formData,
        });

        if (!submitRes.ok) {
            console.error('[VT] File upload failed:', submitRes.status);
            return { safe: true, malicious: 0, suspicious: 0, undetected: 0, harmless: 0, verdict: 'unknown', details: 'Upload failed' };
        }

        const submitData = await submitRes.json();
        const analysisId = submitData.data?.id;

        if (!analysisId) {
            return { safe: true, malicious: 0, suspicious: 0, undetected: 0, harmless: 0, verdict: 'unknown', details: 'No analysis ID' };
        }

        // Wait for analysis
        await new Promise(resolve => setTimeout(resolve, 5000));

        const resultRes = await fetch(`${VT_API_BASE}/analyses/${analysisId}`, {
            headers: { 'x-apikey': apiKey },
        });

        if (!resultRes.ok) {
            return { safe: true, malicious: 0, suspicious: 0, undetected: 0, harmless: 0, verdict: 'unknown', details: 'Analysis fetch failed' };
        }

        const resultData = await resultRes.json();
        const stats = resultData.data?.attributes?.stats || {};

        return buildResult(stats, resultData.data?.links?.self);
    } catch (err) {
        console.error('[VT] File buffer scan error:', err);
        return { safe: true, malicious: 0, suspicious: 0, undetected: 0, harmless: 0, verdict: 'unknown', details: 'Scan error' };
    }
}

/**
 * Batch scan multiple URLs (for all links in an email).
 * Returns map of URL → result.
 */
export async function scanUrls(urls: string[]): Promise<Record<string, VTScanResult>> {
    const results: Record<string, VTScanResult> = {};

    // VT free tier: 4 requests/min. Process up to 3 URLs to stay safe.
    const toScan = urls.slice(0, 3);

    for (const url of toScan) {
        results[url] = await scanUrl(url);
        // Small delay between requests to respect rate limits
        if (toScan.indexOf(url) < toScan.length - 1) {
            await new Promise(r => setTimeout(r, 1000));
        }
    }

    // Mark unscannable URLs as unknown
    for (const url of urls.slice(3)) {
        results[url] = { safe: true, malicious: 0, suspicious: 0, undetected: 0, harmless: 0, verdict: 'unknown', details: 'Rate limited - not scanned' };
    }

    return results;
}

function buildResult(stats: Record<string, number>, permalink?: string): VTScanResult {
    const malicious = stats.malicious || 0;
    const suspicious = stats.suspicious || 0;
    const undetected = stats.undetected || 0;
    const harmless = stats.harmless || 0;

    let verdict: VTScanResult['verdict'] = 'safe';
    let details = '';

    if (malicious > 0) {
        verdict = 'malicious';
        details = `Detected as malicious by ${malicious} security vendor${malicious > 1 ? 's' : ''}`;
    } else if (suspicious > 0) {
        verdict = 'suspicious';
        details = `Flagged as suspicious by ${suspicious} vendor${suspicious > 1 ? 's' : ''}`;
    } else if (harmless > 0 || undetected > 0) {
        verdict = 'safe';
        details = `Scanned by ${harmless + undetected} vendors — no threats detected`;
    } else {
        verdict = 'unknown';
        details = 'Scan pending or no results yet';
    }

    return { safe: verdict === 'safe', malicious, suspicious, undetected, harmless, verdict, details, permalink };
}
