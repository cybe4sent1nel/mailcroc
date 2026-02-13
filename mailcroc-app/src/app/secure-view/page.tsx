"use client";
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ShieldAlert, ArrowRight } from 'lucide-react';
import LottiePlayer from '@/components/LottiePlayer';
import unlockedAnim from '../../../public/animations/Unlocked.json';
import styles from './[id]/SecureView.module.css';

export default function SecureViewLanding() {
    const [messageId, setMessageId] = useState('');
    const router = useRouter();

    const handleGo = () => {
        if (messageId.trim()) {
            router.push(`/secure-view/${messageId.trim()}`);
        }
    };

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
                <div className={styles.unlockGate}>
                    <h2>Enter Message Portal</h2>
                    <p>Have a secure message ID? Enter it below to access the encrypted content.</p>

                    <div className={styles.inputGroup}>
                        <input
                            type="text"
                            placeholder="Paste Message ID here..."
                            value={messageId}
                            onChange={(e) => setMessageId(e.target.value)}
                            className={styles.input}
                            onKeyDown={(e) => e.key === 'Enter' && handleGo()}
                            autoFocus
                        />
                        <button onClick={handleGo} className={styles.unlockBtn} disabled={!messageId.trim()}>
                            Go <ArrowRight size={18} />
                        </button>
                    </div>

                    <div className={styles.infoBox} style={{ marginTop: '2rem' }}>
                        <ShieldAlert size={16} />
                        <span>Message IDs are generated automatically when a sender secures an email.</span>
                    </div>
                </div>
            </div>

            <footer className={styles.footer}>
                <p>&copy; {new Date().getFullYear()} MailCroc. All rights reserved. Designed and Developed by <strong>Fahad Khan</strong></p>
            </footer>
        </div>
    );
}
