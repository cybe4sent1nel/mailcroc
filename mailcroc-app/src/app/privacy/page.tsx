
import React from 'react';
import styles from './styles.module.css';

export default function PrivacyPage() {
    return (
        <div className={styles.pageWrapper}>
            <main className={styles.main}>
                <h1>Privacy Policy</h1>
                <p className={styles.date}>Last updated: {new Date().toLocaleDateString()}</p>

                <section className={styles.content}>
                    <h2>We collect specific data only to provide the service:</h2>

                    <h3>1. What we collect</h3>
                    <p>We do NOT process or store your personal IP address connected to your emails for tracking purposes. We only store the incoming emails temporarily.</p>

                    <h3>2. Email Storage</h3>
                    <p>Emails sent to MailCroc addresses are stored in ephemeral storage. They are automatically deleted after the expiration time (usually 24 hours).</p>

                    <h3>3. Cookies and Web Beacons</h3>
                    <p>We use local storage to remember your actively generated email address. Additionally, we use third-party vendors, including Google, which use cookies to serve ads based on a user's prior visits to our website or other websites.</p>
                    <ul>
                        <li><p>Google's use of advertising cookies enables it and its partners to serve ads to your users based on their visit to your sites and/or other sites on the Internet.</p></li>
                        <li><p>Users may opt out of personalized advertising by visiting <a href="https://www.google.com/settings/ads" target="_blank" rel="noopener noreferrer">Google Ad Settings</a>.</p></li>
                    </ul>

                    <h3>4. Third-Party Vendors</h3>
                    <p>Third-party vendors, including Google, use cookies to serve ads based on a user's prior visits to this website. You can opt out of a third-party vendor's use of cookies for personalized advertising by visiting <a href="https://www.aboutads.info" target="_blank" rel="noopener noreferrer">www.aboutads.info</a>.</p>

                    <h3>5. Data Sharing</h3>
                    <p>We do not share, sell, or rent your personal data to any third parties for their own marketing purposes, except as required for the third-party advertising described above.</p>
                </section>
            </main>
        </div>
    );
}
