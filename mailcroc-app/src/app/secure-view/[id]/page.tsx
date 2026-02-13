"use client";
import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { ShieldAlert, Unlock, ArrowLeft, Mail, Info } from 'lucide-react';
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
    const [unlockedText, setUnlockedText] = useState<string | null>(null);
    const [password, setPassword] = useState('');
    const [status, setStatus] = useState<'loading' | 'error' | 'locked' | 'unlocked'>('loading');

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
            setUnlockedText(decrypted);
            setStatus('unlocked');
            addToast("Message unlocked successfully", "success");
        } else {
            addToast("Invalid password. Please try again.", "error");
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
                            <button onClick={() => setStatus('locked')} className={styles.resetBtn}>Re-lock</button>
                        </div>
                        <div className={styles.markdownBody}>
                            <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeSanitize]}>
                                {unlockedText}
                            </ReactMarkdown>
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
