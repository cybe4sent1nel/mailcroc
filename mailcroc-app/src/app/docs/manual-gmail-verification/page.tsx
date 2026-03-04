"use client";

import { ArrowLeft, Mail, CheckCircle, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import styles from './manual-verification.module.css';

export default function ManualVerificationGuide() {
    return (
        <div className={styles.container}>
            <Link href="/sender-settings" className={styles.backLink}>
                <ArrowLeft size={20} />
                Back to Sender Settings
            </Link>

            <header className={styles.header}>
                <h1 className={styles.title}>📧 Manual Gmail Verification</h1>
                <p className={styles.subtitle}>
                    Send emails from your MailCroc addresses using your personal Gmail account - completely free!
                </p>
            </header>

            <div className={styles.benefitsCard}>
                <h2>Why This Works</h2>
                <p>
                    When you verify a MailCroc address in your Gmail settings, Gmail allows you to send emails
                    from that address <strong>without showing &quot;on behalf of&quot; or brackets</strong>. This is 100%
                    legitimate and supported by Gmail.
                </p>
                <div className={styles.benefits}>
                    <div className={styles.benefit}>
                        <CheckCircle size={20} color="#10b981" />
                        <span><strong>Free</strong> - No Google Workspace needed</span>
                    </div>
                    <div className={styles.benefit}>
                        <CheckCircle size={20} color="#10b981" />
                        <span><strong>Clean</strong> - No &quot;on behalf of&quot; or brackets</span>
                    </div>
                    <div className={styles.benefit}>
                        <CheckCircle size={20} color="#10b981" />
                        <span><strong>Permanent</strong> - Once verified, works forever</span>
                    </div>
                    <div className={styles.benefit}>
                        <CheckCircle size={20} color="#10b981" />
                        <span><strong>Flexible</strong> - Add as many MailCroc addresses as you want</span>
                    </div>
                </div>
            </div>

            <div className={styles.stepsContainer}>
                <h2>Step-by-Step Instructions</h2>

                <div className={styles.step}>
                    <div className={styles.stepNumber}>1</div>
                    <div className={styles.stepContent}>
                        <h3>Open Gmail Settings</h3>
                        <p>Go to Gmail → Click the gear icon ⚙️ → &quot;See all settings&quot;</p>
                        <p>Click the <strong>&quot;Accounts and Import&quot;</strong> tab</p>
                        <p>Find the <strong>&quot;Send mail as&quot;</strong> section</p>
                    </div>
                </div>

                <div className={styles.step}>
                    <div className={styles.stepNumber}>2</div>
                    <div className={styles.stepContent}>
                        <h3>Add Your MailCroc Address</h3>
                        <p>Click <strong>&quot;Add another email address&quot;</strong></p>
                        <p>Enter your MailCroc address (e.g., <code>random-123@mailcroc.qzz.io</code>)</p>
                        <p>Enter a name (e.g., &quot;My Private Email&quot;)</p>
                        <div className={styles.important}>
                            <AlertCircle size={18} color="#f59e0b" />
                            <strong>Important:</strong> Uncheck &quot;Treat as an alias&quot;
                        </div>
                        <p>Click <strong>&quot;Next Step&quot;</strong></p>
                    </div>
                </div>

                <div className={styles.step}>
                    <div className={styles.stepNumber}>3</div>
                    <div className={styles.stepContent}>
                        <h3>Wait for Verification Email</h3>
                        <p>Gmail will send a verification email to your MailCroc address</p>
                        <p>This usually arrives within 1-2 minutes</p>
                    </div>
                </div>

                <div className={styles.step}>
                    <div className={styles.stepNumber}>4</div>
                    <div className={styles.stepContent}>
                        <h3>Verify in MailCroc</h3>
                        <p>Go to your <Link href="/mail" className={styles.inlineLink}>MailCroc inbox</Link></p>
                        <p>Find the email from <strong>&quot;Gmail Team&quot;</strong></p>
                        <p>Click the verification link in the email</p>
                        <p><em>OR</em> copy the verification code and paste it in Gmail</p>
                    </div>
                </div>

                <div className={styles.step}>
                    <div className={styles.stepNumber}>5</div>
                    <div className={styles.stepContent}>
                        <h3>Done! 🎉</h3>
                        <p>Your MailCroc address is now verified</p>
                        <p>You can send emails from it via Gmail</p>
                        <p><strong>Zero brackets, completely clean!</strong></p>
                    </div>
                </div>
            </div>

            <div className={styles.troubleshooting}>
                <h2>Troubleshooting</h2>

                <div className={styles.faq}>
                    <h4>Q: I didn&apos;t receive the verification email</h4>
                    <p>Check your MailCroc inbox after 2-3 minutes. If still not there, try adding the address again in Gmail settings.</p>
                </div>

                <div className={styles.faq}>
                    <h4>Q: The verification link expired</h4>
                    <p>No problem! Just remove the address from Gmail settings and add it again.</p>
                </div>

                <div className={styles.faq}>
                    <h4>Q: Can I do this with multiple MailCroc addresses?</h4>
                    <p>Yes! You can verify as many as you want. Each one takes about 2 minutes to set up.</p>
                </div>

                <div className={styles.faq}>
                    <h4>Q: Will this work with other email providers?</h4>
                    <p>Yes! Most email providers (Outlook, Yahoo, etc.) support adding external addresses. The process is similar.</p>
                </div>
            </div>

            <div className={styles.ctaCard}>
                <Mail size={32} color="#84cc16" />
                <h3>Ready to Get Started?</h3>
                <p>Follow the steps above to verify your MailCroc address in Gmail</p>
                <div className={styles.ctaButtons}>
                    <Link href="/mail" className={styles.primaryBtn}>
                        Go to My Inbox
                    </Link>
                    <a
                        href="https://mail.google.com/mail/u/0/#settings/accounts"
                        target="_blank"
                        rel="noopener noreferrer"
                        className={styles.secondaryBtn}
                    >
                        Open Gmail Settings
                    </a>
                </div>
            </div>
        </div >
    );
}
