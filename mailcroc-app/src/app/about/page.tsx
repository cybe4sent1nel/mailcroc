"use client";

import { useRef, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useInView } from 'framer-motion';
import { Linkedin, Github, Globe, Users, Shield, ArrowUpRight } from 'lucide-react';
import dynamic from 'next/dynamic';
import styles from './page.module.css';

// Dynamically import Lottie for client-side only
const Lottie = dynamic(() => import('lottie-react'), { ssr: false });
import devAnimData from '../../../public/animations/developer team.json';

// Local Component to handle the Lottie scroll behavior
const ScrollLottie = () => {
    const containerRef = useRef<HTMLDivElement>(null);
    const lottieRef = useRef<any>(null);
    const isInView = useInView(containerRef, { amount: 0.5 }); // triggers when 50% visible

    useEffect(() => {
        if (lottieRef.current) {
            if (isInView) {
                lottieRef.current.goToAndPlay(0);
            } else {
                lottieRef.current.stop();
            }
        }
    }, [isInView]);

    return (
        <div ref={containerRef} className={styles.animationContainer}>
            <Lottie
                lottieRef={lottieRef}
                animationData={devAnimData}
                loop={false}
                autoplay={false}
            />
        </div>
    );
};

export default function AboutPage() {
    const amanLinkedIn = process.env.NEXT_PUBLIC_AMAN_LINKEDIN || '#';
    const amanGithub = process.env.NEXT_PUBLIC_AMAN_GITHUB || '#';

    return (
        <div className={styles.container}>
            <div className={styles.inner}>

                <header className={styles.header}>
                    <h1 className={styles.title}>
                        About <span className={styles.highlight}>Us</span>
                    </h1>
                    <p className={styles.subtitle}>
                        Building secure, lightning-fast privacy tools so you can reclaim your inbox.
                    </p>
                </header>

                <section className={styles.section}>
                    <h2 className={styles.sectionTitle}>
                        <Shield size={28} color="#10b981" /> Our Mission
                    </h2>
                    <div className={styles.textBlock}>
                        <p>
                            MailCroc by Cybe4Sentinel was born out of a simple necessity: the modern digital world demands your email everywhere, but doesn't respect your privacy anywhere.
                        </p>
                        <p style={{ marginTop: '1rem' }}>
                            We've engineered a premium disposable email service built on robust infrastructure that acts as a fortress against spammers, trackers, and malicious actors. Whether you are dealing with aggressive marketing newsletters or suspicious platforms, MailCroc acts as the absolute shield between your identity and the internet.
                        </p>
                    </div>
                </section>

                <section className={styles.section}>
                    <h2 className={styles.sectionTitle}>
                        <Users size={28} color="#8b5cf6" /> The Development Team
                    </h2>
                    <p className={styles.textBlock}>Meet the minds engineering MailCroc and Cybe4Sentinel.</p>

                    <ScrollLottie />

                    <div className={styles.profilesGrid}>
                        <div className={styles.profileCard}>
                            <div className={styles.avatarFallback}>F</div>
                            <h3 className={styles.profileName}>Fahad Khan</h3>
                            <p className={styles.profileRole}>Lead Developer & CyberSec</p>
                            <div className={styles.socialLinks}>
                                <Link href="https://www.linkedin.com/in/fahad-cybersecurity-ai/" target="_blank" className={styles.socialLink}>
                                    <Linkedin size={20} />
                                </Link>
                                <Link href="https://github.com/cybe4sent1nel" target="_blank" className={styles.socialLink}>
                                    <Github size={20} />
                                </Link>
                                <Link href="https://fahadops.vercel.app" target="_blank" className={styles.socialLink}>
                                    <Globe size={20} />
                                </Link>
                            </div>
                        </div>
                        {/* Add more core developers here if needed later */}
                    </div>
                </section>

                <section className={styles.section}>
                    <h2 className={styles.sectionTitle}>
                        <Users size={28} color="#f59e0b" /> Key Contributors
                    </h2>
                    <p className={styles.textBlock}>Incredible contributors who have shaped and enhanced the platform.</p>

                    <div className={styles.profilesGrid}>
                        <div className={styles.profileCard}>
                            <div className={styles.avatarFallback}>S</div>
                            <h3 className={styles.profileName}>Sujal Nayak</h3>
                            <p className={styles.profileRole}>Contributor</p>
                            <div className={styles.socialLinks}>
                                <Link href="https://www.linkedin.com/in/sujal-nayak-33405a249" target="_blank" className={styles.socialLink}>
                                    <Linkedin size={20} />
                                </Link>
                                <Link href="https://github.com/Nayak1079" target="_blank" className={styles.socialLink}>
                                    <Github size={20} />
                                </Link>
                            </div>
                        </div>

                        <div className={styles.profileCard}>
                            <div className={styles.avatarFallback}>A</div>
                            <h3 className={styles.profileName}>Aman</h3>
                            <p className={styles.profileRole}>Contributor</p>
                            <div className={styles.socialLinks}>
                                <Link href={amanLinkedIn} target="_blank" className={styles.socialLink}>
                                    <Linkedin size={20} />
                                </Link>
                                <Link href={amanGithub} target="_blank" className={styles.socialLink}>
                                    <Github size={20} />
                                </Link>
                            </div>
                        </div>
                    </div>
                </section>

                <div className={styles.shoutoutSection}>
                    <h3 className={styles.shoutoutTitle}>Special Shoutout To</h3>
                    <Link href="https://kokolab.in" target="_blank" className={styles.kokolabLogo}>
                        <Image
                            src="/images/kokologo.png"
                            alt="KokoLab Logo"
                            width={160}
                            height={50}
                            style={{ objectFit: 'contain' }}
                        />
                    </Link>
                    <p style={{ marginTop: '1rem', color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>
                        Innovating the future, together. <ArrowUpRight size={14} style={{ display: 'inline' }} />
                    </p>
                </div>

            </div>
        </div>
    );
}
