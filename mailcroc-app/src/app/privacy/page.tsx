
import React from 'react';
import Header from '@/components/Header/Header';
import Footer from '@/components/Footer/Footer';
import styles from './styles.module.css';

export default function PrivacyPage() {
    return (
        <div className={styles.pageWrapper}>
            <Header />
            <main className={styles.main}>
                <h1>Privacy Policy</h1>
                <p className={styles.date}>Last updated: {new Date().toLocaleDateString()}</p>

                <section className={styles.content}>
                    <h2>We collect specific data only to provide the service:</h2>

                    <h3>1. What we collect</h3>
                    <p>We do NOT process or store your personal IP address connected to your emails. We only store the incoming emails temporarily.</p>

                    <h3>2. Email Storage</h3>
                    <p>Emails sent to MailCroc addresses are stored in ephemeral storage. They are automatically deleted after the expiration time (usually 24 hours).</p>

                    <h3>3. Cookies</h3>
                    <p>We use local storage to remember your actively generated email address so you don't lose it on refresh. We do not use third-party tracking cookies.</p>

                    <h3>4. Data Sharing</h3>
                    <p>We do not share, sell, or rent your data to any third parties.</p>
                </section>
            </main>
            <Footer />
        </div>
    );
}
