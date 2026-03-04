import { NextRequest, NextResponse } from 'next/server';
import { scanFileBuffer, scanFileHash, type VTScanResult } from '@/lib/virustotal';
import crypto from 'crypto';

/**
 * POST /api/scan/attachment
 * Scans an attachment file for malware using VirusTotal.
 *
 * Body (JSON):
 *   - name: filename
 *   - type: MIME type
 *   - content: base64-encoded file data
 *   - size: file size in bytes
 *
 * OR
 *   - hash: SHA-256 hash of the file (for hash-only lookup)
 */
export async function POST(req: NextRequest) {
    if (!process.env.VIRUSTOTAL_API_KEY) {
        return NextResponse.json({
            scanned: false,
            verdict: 'unknown',
            details: 'VirusTotal not configured',
            scannedBy: 'MailCroc'
        });
    }

    try {
        const body = await req.json();

        let result: VTScanResult;

        if (body.hash) {
            // Hash-only lookup (fast, no upload)
            result = await scanFileHash(body.hash);
        } else if (body.content) {
            // Full file scan — decode base64 and upload
            const rawContent = body.content.includes(',')
                ? body.content.split(',')[1]
                : body.content;
            const buffer = Buffer.from(rawContent, 'base64');

            // First try hash lookup (faster, no upload needed)
            const hash = crypto.createHash('sha256').update(buffer).digest('hex');
            result = await scanFileHash(hash);

            // If not found in VT database, upload the file
            if (result.verdict === 'unknown' && result.details?.includes('not found')) {
                result = await scanFileBuffer(buffer, body.name || 'attachment');
            }
        } else {
            return NextResponse.json({ error: 'Provide content (base64) or hash (sha256)' }, { status: 400 });
        }

        return NextResponse.json({
            scanned: true,
            verdict: result.verdict,
            safe: result.safe,
            malicious: result.malicious,
            suspicious: result.suspicious,
            details: result.details,
            permalink: result.permalink,
            scannedBy: 'MailCroc × VirusTotal'
        });
    } catch (error: unknown) {
        console.error('[Scan API] Error:', error);
        return NextResponse.json({
            scanned: false,
            verdict: 'unknown',
            details: (error as Error).message,
            scannedBy: 'MailCroc'
        }, { status: 500 });
    }
}
