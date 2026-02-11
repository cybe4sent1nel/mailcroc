
import React from 'react';
import Header from '@/components/Header/Header';
import Footer from '@/components/Footer/Footer';
import styles from './styles.module.css';
import Link from 'next/link';
import { Check } from 'lucide-react';

export default function PricingPage() {
    return (
        <div className={styles.pageWrapper}>
            <Header />
            <main className={styles.main}>
                <section className={styles.hero}>
                    <h1>Simple, Transparent <span className={styles.highlight}>Pricing</span></h1>
                    <p>Start for free. Upgrade for API access and power features.</p>
                </section>

                <div className={styles.pricingGrid}>
                    {/* Free Tier */}
                    <div className={styles.card}>
                        <div className={styles.header}>
                            <h3>Free</h3>
                            <div className={styles.price}>$0<span>/mo</span></div>
                            <p>Perfect for individual users</p>
                        </div>
                        <ul className={styles.features}>
                            <li><Check size={20} /> Unlimited Temp Emails</li>
                            <li><Check size={20} /> 10 Minute to 1 Day Expiry</li>
                            <li><Check size={20} /> 10MB Attachment Limit</li>
                            <li><Check size={20} /> Mobile Friendly</li>
                            <li><Check size={20} /> Basic Spam Protection</li>
                        </ul>
                        <Link href="/mail" className={styles.btnPrimary}>Get Started</Link>
                    </div>

                    {/* API Tier */}
                    <div className={`${styles.card} ${styles.popular}`}>
                        <div className={styles.tag}>Developers</div>
                        <div className={styles.header}>
                            <h3>API Pro</h3>
                            <div className={styles.price}>$29<span>/mo</span></div>
                            <p>For automation and testing</p>
                        </div>
                        <ul className={styles.features}>
                            <li><Check size={20} /> <strong>Everything in Free</strong></li>
                            <li><Check size={20} /> <strong>Bulk Email API</strong> (50/req)</li>
                            <li><Check size={20} /> Webhooks</li>
                            <li><Check size={20} /> Custom Domains</li>
                            <li><Check size={20} /> 1GB Storage Limit</li>
                            <li><Check size={20} /> Priority Support</li>
                        </ul>
                        <button className={styles.btnSecondary} disabled>Coming Soon</button>
                    </div>
                </div>
            </main>
            <Footer />
        </div>
    );
}
