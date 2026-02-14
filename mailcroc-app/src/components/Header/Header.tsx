"use client";

import Link from 'next/link';
import Image from 'next/image';
import styles from './Header.module.css';
import { useRef, useEffect, useState } from 'react';
import { Settings, HelpCircle } from 'lucide-react';
import DownloadButton from '../Buttons/DownloadButton';

const Header = () => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const [isPlaying, setIsPlaying] = useState(false);

    useEffect(() => {
        // Trigger on mount
        if (videoRef.current) {
            setIsPlaying(true);
            videoRef.current.currentTime = 0;
            videoRef.current.play().catch(() => setIsPlaying(false));
        }
    }, []);

    const handleMouseEnter = () => {
        if (videoRef.current && !isPlaying) {
            setIsPlaying(true);
            videoRef.current.currentTime = 0;
            videoRef.current.play().catch(() => setIsPlaying(false));
        }
    };

    return (
        <header className={styles.header}>
            <div className={styles.inner}>
                <Link href="/" className={styles.logo} onMouseEnter={handleMouseEnter}>
                    <div style={{ position: 'relative', width: 90, height: 64, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Image
                            src="/logo.png"
                            alt="MailCroc Logo"
                            width={90}
                            height={64}
                            className={styles.logoImage}
                            style={{ display: isPlaying ? 'none' : 'block' }}
                            priority
                        />
                        <video
                            src="/animations/logoanimation.mp4"
                            className={styles.logoVideo}
                            muted
                            playsInline
                            loop={false}
                            width={90}
                            height={64}
                            ref={videoRef}
                            style={{ display: isPlaying ? 'block' : 'none' }}
                            onEnded={() => setIsPlaying(false)}
                        />
                    </div>
                    <span className={styles.logoText}>MailCroc</span>
                </Link>

                <nav className={styles.nav}>
                    <Link href="/mail" className={styles.navLink}>Temp Mail</Link>
                    <Link href="/sender-settings" className={styles.navLink}>
                        <Settings size={16} style={{ marginRight: '6px' }} /> Identities
                    </Link>
                    <Link href="/faq" className={styles.navLink}>
                        <HelpCircle size={16} style={{ marginRight: '6px' }} /> FAQ
                    </Link>
                    <Link href="/developers" className={styles.navLink}>Developers</Link>
                    <Link href="/secure-view" className={styles.navLink}>Unlock Mail</Link>
                </nav>

                <div className={styles.actions}>
                    <DownloadButton />
                    <Link href="/mail" className={styles.startBtn}>Start free</Link>
                </div>
            </div>
        </header>
    );
};

export default Header;
