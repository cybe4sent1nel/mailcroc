"use client";

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Linkedin, Github, Globe, Users, Heart, Zap, ShieldCheck } from 'lucide-react';
import dynamic from 'next/dynamic';
import styles from './page.module.css';

// Dynamically import Lottie for client-side only
const Lottie = dynamic(() => import('lottie-react'), { ssr: false });

const DeveloperAnimation = () => {
    const [animData, setAnimData] = useState<any>(null);

    useEffect(() => {
        fetch('/animations/developer-team.json')
            .then(res => res.json())
            .then(data => setAnimData(data))
            .catch(() => { });
    }, []);

    if (!animData) return <div className={styles.animationPlaceholder} />;

    return (
        <div className={styles.animationContainer}>
            <Lottie
                animationData={animData}
                loop={true}
                autoplay={true}
                className={styles.lottiePlayer}
            />
        </div>
    );
};

export default function AboutPage() {
    return (
        <div className={styles.pageRoot}>
            <div className={styles.container}>

                <header className={styles.header}>
                    <div className={styles.badge}>
                        <Zap size={14} style={{ marginRight: '8px', color: '#f59e0b' }} />
                        <span>Privacy Engineering</span>
                    </div>
                    <h1 className={styles.title}>
                        Our <span className={styles.highlight}>Mission</span>
                    </h1>
                    <p className={styles.subtitle}>
                        Engineering a more secure world by giving you complete control over your digital footprint, one disposable inbox at a time.
                    </p>
                </header>

                <div className={styles.contentGrid}>
                    <section className={styles.sectionBox}>
                        <div className={styles.sectionHeader}>
                            <ShieldCheck size={32} color="var(--color-text-main)" />
                            <h2 className={styles.sectionTitle}>Built for You</h2>
                        </div>
                        <p className={styles.text}>
                            MailCroc was born out of a simple necessity: the modern digital world demands your email everywhere, but doesn't respect your privacy anywhere.
                        </p>
                        <p className={styles.text}>
                            We've engineered a premium disposable email service built on robust infrastructure that acts as a fortress against spammers, trackers, and malicious actors.
                        </p>
                    </section>

                    <div className={styles.animationWrapper}>
                        <DeveloperAnimation />
                    </div>
                </div>

                <section className={styles.teamSection}>
                    <div className={styles.centeredHeader}>
                        <h2 className={styles.sectionTitle}>
                            <Users size={28} style={{ marginRight: '12px', verticalAlign: 'middle' }} /> The Lead Architect
                        </h2>
                        <p className={styles.subtitle}>The vision behind Cybe4Sentinel and MailCroc.</p>
                    </div>

                    <div className={styles.profilesGrid}>
                        <div className={styles.profileCard}>
                            <div className={styles.avatar}>FK</div>
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
                    </div>
                </section>

                <section className={styles.contributorsSection}>
                    <h2 className={styles.sectionTitle}>Key Contributors</h2>
                    <div className={styles.profilesGrid}>
                        <div className={styles.profileCard}>
                            <div className={styles.avatarSmall}>SN</div>
                            <h3 className={styles.profileName}>Sujal Nayak</h3>
                            <div className={styles.socialLinks}>
                                <Link href="https://www.linkedin.com/in/sujal-nayak-33405a249" target="_blank" className={styles.socialLink}>
                                    <Linkedin size={18} />
                                </Link>
                                <Link href="https://github.com/Nayak1079" target="_blank" className={styles.socialLink}>
                                    <Github size={18} />
                                </Link>
                            </div>
                        </div>

                        <div className={styles.profileCard}>
                            <div className={styles.avatarSmall}>AK</div>
                            <h3 className={styles.profileName}>Aman Kumar</h3>
                            <div className={styles.socialLinks}>
                                <Link href="https://www.linkedin.com/in/amankumar023?utm_source=share_via&utm_content=profile&utm_medium=member_android" target="_blank" className={styles.socialLink}>
                                    <Linkedin size={18} />
                                </Link>
                                <Link href="https://github.com/amansingh023-art" target="_blank" className={styles.socialLink}>
                                    <Github size={18} />
                                </Link>
                            </div>
                        </div>
                    </div>
                </section>

                <div className={styles.shoutoutBox}>
                    <Heart size={24} color="#ef4444" style={{ marginBottom: '1.5rem' }} />
                    <h3 className={styles.shoutoutTitle}>Special Shoutout To</h3>
                    <Link href="https://kokolab.in" target="_blank">
                        <Image
                            src="/images/kokologo.png"
                            alt="KokoLab Logo"
                            width={180}
                            height={60}
                            style={{ objectFit: 'contain' }}
                        />
                    </Link>
                    <p className={styles.shoutoutText}>Innovating the future, together.</p>
                </div>
            </div>
        </div>
    );
}
