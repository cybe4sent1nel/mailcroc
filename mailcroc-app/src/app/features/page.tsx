
import React from 'react';
import Header from '@/components/Header/Header';
import Footer from '@/components/Footer/Footer';
import styles from './styles.module.css';
import { Shield, Zap, Mail, Lock, Clock, Repeat, Smartphone, Download } from 'lucide-react';

export default function FeaturesPage() {
    return (
        <div className={styles.pageWrapper}>
            <Header />
            <main className={styles.main}>
                <section className={styles.hero}>
                    <h1>Powerful Features for <span className={styles.highlight}>Private</span> Communication</h1>
                    <p>MailCroc isn't just a temp mail service. It's a complete privacy suite.</p>
                </section>

                <section className={styles.grid}>
                    <FeatureCard
                        icon={<Zap size={32} />}
                        title="Real-Time Delivery"
                        description="Emails appear instantly via WebSockets. No refreshing required. As fast as Gmail, but private."
                    />
                    <FeatureCard
                        icon={<Shield size={32} />}
                        title="Stealth Mode"
                        description="We strip tracking pixels and malicious scripts automatically. Your IP is never exposed to senders."
                    />
                    <FeatureCard
                        icon={<Lock size={32} />}
                        title="Zero Logs"
                        description="We don't track you. Emails are stored in encrypted ephemeral storage and deleted automatically."
                    />
                    <FeatureCard
                        icon={<Repeat size={32} />}
                        title="Smart Reply"
                        description="Reply to emails directly from your temp inbox. Perfect for confirming accounts or communicating with sellers."
                    />
                    <FeatureCard
                        icon={<Clock size={32} />}
                        title="Custom Expiry"
                        description="You control how long your inbox lives. From 10 minutes to 30 days. Extend it with one click."
                    />
                    <FeatureCard
                        icon={<Download size={32} />}
                        title="Attachments"
                        description="Receive and download attachments securely. We scan files for basic malware signatures before you download."
                    />
                    <FeatureCard
                        icon={<Smartphone size={32} />}
                        title="Mobile Optimized"
                        description="Works perfectly on any device. Install as a PWA for a native app experience on iOS and Android."
                    />
                    <FeatureCard
                        icon={<Mail size={32} />}
                        title="Bulk Generation"
                        description="Need 50 emails for testing? Use our API or bulk tools to generate multiple inboxes instantly."
                    />
                </section>
            </main>
            <Footer />
        </div>
    );
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode, title: string, description: string }) {
    return (
        <div className={styles.card}>
            <div className={styles.icon}>{icon}</div>
            <h3>{title}</h3>
            <p>{description}</p>
        </div>
    );
}
