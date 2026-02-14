"use client";
import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'next/navigation';
import { ShieldAlert, Unlock, ArrowLeft, Mail, Info, Download, FileText, Paperclip, CheckCircle } from 'lucide-react';
import styles from './SecureView.module.css';
import { useToast } from '@/components/Toast/ToastContext';
import LottiePlayer from '@/components/LottiePlayer';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeSanitize from 'rehype-sanitize';

import unlockedAnim from '../../../../public/animations/Unlocked.json';

// --- Encryption Helpers ---
const xorCipher = (text: string, key: string) => {
    return Array.from(text).map((c, i) =>
        String.fromCharCode(c.charCodeAt(0) ^ key.charCodeAt(i % key.length))
    ).join('');
};

const decrypt = (encoded: string, key: string) => {
    try {
        const decoded = decodeURIComponent(escape(atob(encoded)));
        return xorCipher(decoded, key);
    } catch {
        return null;
    }
};

export default function SecureViewPage() {
    const { id } = useParams();
    const { addToast } = useToast();
    const [lockedContent, setLockedContent] = useState<string | null>(null);
    const [messageData, setMessageData] = useState<{ content: string, attachments: any[] } | null>(null);
    const [password, setPassword] = useState('');
    const [status, setStatus] = useState<'loading' | 'error' | 'locked' | 'unlocked'>('loading');
    const contentRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const fetchMessage = async () => {
            try {
                const res = await fetch(`/api/secure-message/${id}`);
                if (!res.ok) throw new Error("Message not found");
                const data = await res.json();
                setLockedContent(data.content);
                setStatus('locked');
            } catch (err) {
                setStatus('error');
            }
        };
        if (id) fetchMessage();
    }, [id]);

    const handleUnlock = () => {
        if (!lockedContent) return;

        // Remove prefix if it exists (for compatibility)
        const cleanContent = lockedContent.replace('MC-LOCKED:', '');
        const decrypted = decrypt(cleanContent, password);

        if (decrypted) {
            try {
                // Try parsing as JSON (new format with attachments)
                const parsed = JSON.parse(decrypted);
                if (typeof parsed === 'object' && parsed.content) {
                    setMessageData(parsed);
                } else {
                    // Fallback for old format or plain string
                    setMessageData({ content: decrypted, attachments: [] });
                }
            } catch {
                // Not JSON, assume plain text/html
                setMessageData({ content: decrypted, attachments: [] });
            }
            setStatus('unlocked');
            addToast("Message unlocked successfully", "success");
        } else {
            addToast("Invalid password. Please try again.", "error");
        }
    };

    const handleDownloadPDF = async () => {
        if (!contentRef.current) return;
        addToast("Generating PDF...", "info");
        try {
            const html2canvas = (await import('html2canvas')).default;
            const jsPDF = (await import('jspdf')).default;

            const canvas = await html2canvas(contentRef.current, { scale: 2, useCORS: true });
            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF({
                orientation: 'portrait',
                unit: 'px',
                format: [canvas.width, canvas.height]
            });
            pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
            pdf.save('secure-message.pdf');
            addToast("PDF Downloaded", "success");
        } catch (err) {
            console.error(err);
            addToast("Failed to generate PDF", "error");
        }
    };

    if (status === 'loading') {
        return (
            <div className={styles.container}>
                <div className={styles.card}>
                    <p>Loading secure message...</p>
                </div>
            </div>
        );
    }

    if (status === 'error') {
        return (
            <div className={styles.container}>
                <div className={styles.card}>
                    <ShieldAlert size={48} className={styles.errorIcon} />
                    <h2>Access Denied</h2>
                    <p>This secure message may have expired or the link is invalid.</p>
                    <a href="/" className={styles.backBtn}><ArrowLeft size={16} /> Back to MailCroc</a>
                </div>
            </div>
        );
    }

    return (
        <div className={styles.container}>
            <div className={styles.brand}>
                <img src="/logo.png" alt="MailCroc" width={40} />
                <h1>MailCroc Secure Portal</h1>
            </div>

            <div className={styles.heroAnim}>
                <LottiePlayer animationData={unlockedAnim} style={{ width: 240, height: 240 }} />
            </div>

            <div className={styles.contentArea}>
                {status === 'locked' ? (
                    <div className={styles.unlockGate}>
                        <ShieldAlert size={56} className={styles.lockIcon} />
                        <h2>This Message is Protected</h2>
                        <p>The sender has secured this email via MailCroc. Please enter the shared code provided by the sender to view it.</p>

                        <div className={styles.inputGroup}>
                            <input
                                type="password"
                                placeholder="Enter unlock code"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className={styles.input}
                                onKeyDown={(e) => e.key === 'Enter' && handleUnlock()}
                            />
                            <button onClick={handleUnlock} className={styles.unlockBtn}>
                                <Unlock size={18} /> Unlock Message
                            </button>
                        </div>

                        <div className={styles.infoBox}>
                            <Info size={16} />
                            <span>This message is encrypted locally. MailCroc servers never see your clear-text password or content.</span>
                        </div>
                    </div>
                ) : (
                    <div className={styles.revealArea}>
                        <div className={styles.revealHeader}>
                            <div className={styles.badge}><Mail size={14} /> Decrypted Message</div>
                            <div className={styles.headerActions}>
                                <button onClick={handleDownloadPDF} className={styles.actionBtn}>
                                    <FileText size={14} /> Save as PDF
                                </button>
                                <button onClick={() => setStatus('locked')} className={styles.resetBtn}>Re-lock</button>
                            </div>
                        </div>

                        <div className={styles.messageContainer} ref={contentRef}>
                            <div className={styles.markdownBody}>
                                {/* Render HTML content properly */}
                                <div dangerouslySetInnerHTML={{ __html: messageData?.content || '' }} />
                            </div>

                            {/* Attachments Section */}
                            {messageData?.attachments && messageData.attachments.length > 0 && (
                                <div className={styles.attachmentsSection}>
                                    <h3><Paperclip size={16} /> Attachments ({messageData.attachments.length})</h3>
                                    <div className={styles.attachmentList}>
                                        {messageData.attachments.map((att, i) => (
                                            <a
                                                key={i}
                                                href={att.data} // Base64 data URI
                                                download={att.name}
                                                className={styles.attachmentItem}
                                            >
                                                <div className={styles.attIcon}><FileText size={20} /></div>
                                                <div className={styles.attInfo}>
                                                    <span className={styles.attName}>{att.name}</span>
                                                    <span className={styles.attSize}>{Math.round(att.size / 1024)} KB</span>
                                                </div>
                                                <Download size={16} className={styles.downloadIcon} />
                                            </a>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className={styles.revealFooter}>
                            <p>This secure session is temporary. Refreshing the page will lock the message again.</p>
                        </div>
                    </div>
                )}
            </div>

            <footer className={styles.footer}>
                <p>&copy; {new Date().getFullYear()} MailCroc. All rights reserved. Designed and Developed by <strong>Fahad Khan</strong></p>
            </footer>
        </div>
    );
}
