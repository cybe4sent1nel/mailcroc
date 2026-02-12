
import React from 'react';
import Header from '@/components/Header/Header';
import Footer from '@/components/Footer/Footer';
import styles from './styles.module.css';

export default function TermsPage() {
    return (
        <div className={styles.pageWrapper}>
            <Header />
            <main className={styles.main}>
                <h1>Terms of Service</h1>
                <p className={styles.date}>Last updated: {new Date().toLocaleDateString()}</p>

                <section className={styles.content}>
                    <h2>1. Acceptance of Terms</h2>
                    <p>By accessing and using MailCroc, you accept and agree to be bound by the terms and provision of this agreement.</p>

                    <h2>2. Service Description</h2>
                    <p>MailCroc provides temporary, disposable email addresses for the purpose of privacy protection and testing. Emails are deleted automatically after a set period.</p>

                    <h2>3. Acceptable Use</h2>
                    <p>You agree not to use the service for:</p>
                    <ul>
                        <li>Sending spam or unsolicited bulk email.</li>
                        <li>Any illegal activities or harassment.</li>
                        <li>Distributing malware or viruses.</li>
                    </ul>

                    <h2>4. Advertisements</h2>
                    <p>This website uses Google AdSense to display advertisements. By using the site, you agree to the use of cookies by Google and its partners for ad personalization.</p>

                    <h2>5. Disclaimer</h2>
                    <p>The service is provided "as is" without warranties of any kind. We are not responsible for any messages lost due to system failure or auto-deletion.</p>
                </section>
            </main>
            <Footer />
        </div>
    );
}
