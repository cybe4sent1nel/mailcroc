"use client";

import Link from 'next/link';
import Image from 'next/image';
import styles from './Header.module.css';
import { useRef, useEffect, useState } from 'react';

const Header = () => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const [isPlaying, setIsPlaying] = useState(false);

    useEffect(() => {
        const handleScroll = () => {
            if (videoRef.current && !isPlaying) {
                // Play only if not already playing
                setIsPlaying(true);
                videoRef.current.currentTime = 0; // Reset to start
                videoRef.current.play().catch(() => setIsPlaying(false));
            }
        };

        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => window.removeEventListener('scroll', handleScroll);
    }, [isPlaying]);

    return (
        <header className={styles.header}>
            <div className={styles.inner}>
                <Link href="/" className={styles.logo}>
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
                    <Link href="/developers" className={styles.navLink}>Developers</Link>
                    <Link href="/features" className={styles.navLink}>Features</Link>
                    <Link href="/pricing" className={styles.navLink}>Pricing</Link>
                </nav>

                <div className={styles.actions}>
                    <Link href="/mail" className={styles.startBtn}>Start free</Link>
                </div>
            </div>
        </header>
    );
};

export default Header;
