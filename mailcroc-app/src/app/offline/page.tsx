"use client";

import Link from 'next/link';
import { RefreshCw } from 'lucide-react';
import LottiePlayer from '@/components/LottiePlayer';
import offlineAnim from '../../../public/animations/offline.json';
import styles from '../not-found.module.css'; // Reusing 404 styles for consistency

export default function Offline() {
    return (
        <div className={styles.container}>
            <div className={styles.content}>
                <div className={styles.animWrapper}>
                    <LottiePlayer animationData={offlineAnim} style={{ width: '100%', maxWidth: 400, height: 'auto' }} />
                </div>
                <h1 className={styles.title}>You are offline</h1>
                <p className={styles.description}>
                    Please check your internet connection and try again.
                </p>
                <button onClick={() => window.location.reload()} className={styles.homeBtn}>
                    <RefreshCw size={18} />
                    Retry
                </button>
            </div>
        </div>
    );
}
