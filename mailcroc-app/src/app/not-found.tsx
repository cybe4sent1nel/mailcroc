"use client";

import Link from 'next/link';
import { Home } from 'lucide-react';
import LottiePlayer from '@/components/LottiePlayer';
import notFoundAnim from '../../public/animations/404 error page with cute cat.json';
import styles from './not-found.module.css';

export default function NotFound() {
    return (
        <div className={styles.container}>
            <div className={styles.content}>
                <div className={styles.animWrapper}>
                    <LottiePlayer animationData={notFoundAnim} style={{ width: '100%', maxWidth: 500, height: 'auto' }} />
                </div>
                <h1 className={styles.title}>oops! page not found</h1>
                <p className={styles.description}>
                    The page you are looking for might have been removed, had its name changed, or is temporarily unavailable.
                </p>
                <Link href="/" className={styles.homeBtn}>
                    <Home size={18} />
                    Go to Homepage
                </Link>
            </div>
        </div>
    );
}
