"use client";

import { useRef, useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { motion, useInView } from 'framer-motion';
import { Linkedin, Github, Globe, Users, Shield, ArrowUpRight, Heart, Zap, Lock } from 'lucide-react';
import dynamic from 'next/dynamic';
import styles from './page.module.css';

// Dynamically import Lottie for client-side only
const Lottie = dynamic(() => import('lottie-react'), { ssr: false });

const ScrollLottie = () => {
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
    const amanLinkedIn = process.env.NEXT_PUBLIC_AMAN_LINKEDIN || '#';
    const amanGithub = process.env.NEXT_PUBLIC_AMAN_GITHUB || '#';

    return (
        <div className={styles.pageRoot}>
            {/* Ambient Background Elements */}
            <div className={styles.glow1} />
            <div className={styles.glow2} />

            <div className={styles.container}>
                <motion.header
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8 }}
                    className={styles.header}
                >
                    <div className={styles.badge}>
                        <Zap size={14} className={styles.zapIcon} />
                        <span>The Next Generation of Privacy</span>
                    </div>
                    <h1 className={styles.title}>
                        Our <span className={styles.highlight}>Mission</span>
                    </h1>
                    <p className={styles.subtitle}>
                        Engineering a world where your digital footprint is yours to control,
                        one temporary inbox at a time.
                    </p>
                </motion.header>

                <div className={styles.contentGrid}>
                    <motion.section
                        initial={{ opacity: 0, x: -30 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        className={styles.glassSection}
                    >
                        <div className={styles.sectionHeader}>
                            <div className={styles.iconCircle} style={{ background: 'rgba(16, 185, 129, 0.1)' }}>
                                <Lock size={24} color="#10b981" />
                            </div>
                            <h2 className={styles.sectionTitle}>Built for Security</h2>
                        </div>
                        <p className={styles.text}>
                            MailCroc was born out of a simple necessity: the modern digital world demands your email everywhere, but doesn't respect your privacy anywhere.
                        </p>
                        <p className={styles.text}>
                            We've engineered a premium disposable email service built on robust infrastructure that acts as a fortress against spammers, trackers, and malicious actors.
                        </p>
                    </motion.section>

                    <div className={styles.animationWrapper}>
                        <ScrollLottie />
                    </div>
                </div>

                <section className={styles.teamSection}>
                    <motion.div
                        initial={{ opacity: 0 }}
                        whileInView={{ opacity: 1 }}
                        className={styles.centeredHeader}
                    >
                        <h2 className={styles.sectionTitle}>
                            <Users size={28} className={styles.usersIcon} /> The Architects
                        </h2>
                        <p className={styles.centeredSubtitle}>Meet the minds engineering the future of Cybe4Sentinel.</p>
                    </motion.div>

                    <div className={styles.profilesGrid}>
                        <motion.div
                            whileHover={{ y: -10 }}
                            className={styles.profileCard}
                        >
                            <div className={styles.avatarWrapper}>
                                <div className={styles.avatarGlow} />
                                <div className={styles.avatar}>FK</div>
                            </div>
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
                        </motion.div>
                    </div>
                </section>

                <section className={styles.contributorsSection}>
                    <h2 className={styles.sectionTitle}>Key Contributors</h2>
                    <div className={styles.profilesGrid}>
                        <motion.div whileHover={{ y: -5 }} className={styles.profileCard}>
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
                        </motion.div>

                        <motion.div whileHover={{ y: -5 }} className={styles.profileCard}>
                            <div className={styles.avatarSmall}>A</div>
                            <h3 className={styles.profileName}>Aman</h3>
                            <div className={styles.socialLinks}>
                                <Link href={amanLinkedIn} target="_blank" className={styles.socialLink}>
                                    <Linkedin size={18} />
                                </Link>
                                <Link href={amanGithub} target="_blank" className={styles.socialLink}>
                                    <Github size={18} />
                                </Link>
                            </div>
                        </motion.div>
                    </div>
                </section>

                <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    whileInView={{ scale: 1, opacity: 1 }}
                    className={styles.shoutoutBox}
                >
                    <Heart size={24} color="#ef4444" className={styles.heartIcon} />
                    <h3 className={styles.shoutoutTitle}>Special Shoutout To</h3>
                    <Link href="https://kokolab.in" target="_blank" className={styles.kokolabLogo}>
                        <Image
                            src="/images/kokologo.png"
                            alt="KokoLab Logo"
                            width={180}
                            height={60}
                            style={{ objectFit: 'contain' }}
                        />
                    </Link>
                    <p className={styles.shoutoutText}>Innovating the future, together.</p>
                </motion.div>
            </div>
        </div>
    );
}

