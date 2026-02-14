"use client";
import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'next/navigation';
import { ShieldAlert, Unlock, ArrowLeft, Mail, Info, Download, FileText, Paperclip, CheckCircle, Image as ImageIcon, FileAudio, FileVideo, Archive, File as FileIcon } from 'lucide-react';
import styles from './SecureView.module.css';
import { useToast } from '@/components/Toast/ToastContext';
import LottiePlayer from '@/components/LottiePlayer';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeSanitize from 'rehype-sanitize';

import unlockedAnim from '../../../../public/animations/Unlocked.json';

interface Attachment {
    name: string;
    data: string; // Base64 Data URL
    type: string;
    size: number;
}

// --- Encryption Helpers ---
const xorCipher = (text: string, key: string) => {
    return Array.from(text).map((c, i) =>
        String.fromCharCode(c.charCodeAt(0) ^ key.charCodeAt(i % key.length))
    ).join('');
};

const decrypt = (encoded: string, key: string) => {
    try {
        // 1. Base64 decode to binary string
        const ciphered = atob(encoded);
        // 2. XOR back to original binary string
        const binaryString = xorCipher(ciphered, key);
        // 3. Convert back to Unicode
        return decodeURIComponent(escape(binaryString));
    } catch (e) {
        console.error("Decrypt error:", e);
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

    const getFileIcon = (type: string) => {
        if (type.startsWith('image/')) return <ImageIcon size={20} className="text-blue-500" />;
        if (type.startsWith('audio/')) return <FileAudio size={20} className="text-purple-500" />;
        if (type.startsWith('video/')) return <FileVideo size={20} className="text-orange-500" />;
        if (type === 'application/pdf') return <FileText size={20} className="text-red-500" />;
        if (type.includes('zip') || type.includes('archive')) return <Archive size={20} className="text-yellow-600" />;
        return <FileIcon size={20} className="text-gray-500" />;
    };

    const handleDownloadAttachment = (att: Attachment) => {
        try {
            const [metadata, base64Data] = att.data.split(',');
            const binaryString = atob(base64Data);
            const bytes = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) {
                bytes[i] = binaryString.charCodeAt(i);
            }
            const blob = new Blob([bytes], { type: att.type });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = att.name;
            a.click();
            URL.revokeObjectURL(url);
            addToast(`Downloading ${att.name}`, "success");
        } catch (err) {
            console.error("Download error:", err);
            addToast("Failed to download attachment", "error");
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

    const handleDownloadHTML = () => {
        if (!messageData) return;
        try {
            const blob = new Blob([messageData.content], { type: 'text/html' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'exact-email.html';
            a.click();
            URL.revokeObjectURL(url);
            addToast("HTML Downloaded", "success");
        } catch (err) {
            addToast("Failed to download HTML", "error");
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
                                    <FileText size={14} /> PDF
                                </button>
                                <button onClick={handleDownloadHTML} className={styles.actionBtn}>
                                    <Download size={14} /> HTML
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
                                            <div
                                                key={i}
                                                className={styles.attachmentItem}
                                                onClick={() => handleDownloadAttachment(att)}
                                                style={{ cursor: 'pointer' }}
                                            >
                                                <div className={styles.attIcon}>{getFileIcon(att.type)}</div>
                                                <div className={styles.attInfo}>
                                                    <span className={styles.attName} title={att.name}>{att.name}</span>
                                                    <span className={styles.attSize}>{(att.size / 1024).toFixed(1)} KB</span>
                                                </div>
                                                <Download size={16} className={styles.attDownload} />
                                            </div>
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
