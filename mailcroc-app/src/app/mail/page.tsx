import { Suspense } from 'react';
import MailBox from "@/components/MailBox/MailBox";
import styles from "./mail.module.css";
import { Mail, ShieldCheck, Zap } from 'lucide-react';

export const metadata = {
    title: "Temp Mail Inbox - MailCroc",
    description: "Your disposable email inbox. Refresh to get new messages.",
};

export default function MailPage() {
    return (
        <div>
            {/* Page Header */}
            <section className={styles.pageHeader}>
                <div className={styles.headerShapes}>
                    <div className={styles.shape1}></div>
                    <div className={styles.shape2}></div>
                </div>
                <div className={styles.headerContent}>
                    <div className={styles.tagline}>
                        <Mail size={16} />
                        <span>Temporary Email</span>
                    </div>
                    <h1 className={styles.pageTitle}>
                        Your disposable <span className={styles.highlight}>inbox</span>
                    </h1>
                    <p className={styles.pageSubtitle}>
                        Generate a random email, receive messages instantly via Socket.IO. No signup required.
                    </p>
                    <div className={styles.pills}>
                        <div className={styles.pill}>
                            <Zap size={14} />
                            Real-time delivery
                        </div>
                        <div className={styles.pill}>
                            <ShieldCheck size={14} />
                            100+ stealth domains
                        </div>
                    </div>
                </div>
            </section>

            {/* Inbox Component */}
            <div className={styles.inboxWrapper}>
                <Suspense fallback={<div style={{ textAlign: 'center', padding: '2rem' }}>Loading Inbox...</div>}>
                    <MailBox />
                </Suspense>
            </div>
        </div>
    );
}
