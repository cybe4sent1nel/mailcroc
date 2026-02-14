"use client";

import { useState, useEffect } from 'react';
import { Shield, Server, Mail, CheckCircle, AlertCircle, Trash2, Send } from 'lucide-react';
import styles from './sender-settings.module.css';

export default function SenderSettings() {
    const [fromAddress, setFromAddress] = useState('');
    const [identity, setIdentity] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [message, setMessage] = useState('');

    // SMTP Form State
    const [smtpOptions, setSmtpOptions] = useState({
        host: '',
        port: 587,
        user: '',
        pass: '',
        secure: false
    });

    const fetchIdentity = async (email: string) => {
        if (!email.includes('@')) return;
        setIsLoading(true);
        try {
            const res = await fetch(`/api/identities?address=${encodeURIComponent(email)}`);
            if (res.ok) {
                const data = await res.json();
                setIdentity(data.identity);
                if (data.identity?.smtpOptions) {
                    setSmtpOptions(data.identity.smtpOptions);
                }
            } else {
                setIdentity(null);
            }
        } catch (err) {
            console.error("Failed to fetch identity", err);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSaveSmtp = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setMessage('');
        try {
            const res = await fetch('/api/identities', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    address: fromAddress,
                    type: 'external_smtp',
                    smtpOptions: {
                        ...smtpOptions,
                        port: Number(smtpOptions.port)
                    }
                })
            });
            if (res.ok) {
                setMessage('✅ Identity saved successfully!');
                fetchIdentity(fromAddress);
            } else {
                setMessage('❌ Failed to save identity.');
            }
        } catch (err) {
            setMessage('❌ Error connecting to server.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleGmailAlias = async () => {
        if (!fromAddress || !fromAddress.includes('@')) {
            setMessage('❌ Please enter a valid email address first.');
            return;
        }

        setIsLoading(true);
        setMessage('🔄 Starting Gmail Ghosting handshake...');

        try {
            const res = await fetch('/api/identities', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    address: fromAddress,
                    type: 'gmail_alias'
                })
            });

            if (res.ok) {
                setMessage('✅ Gmail Ghosting initiated! Check your Gmail inbox for a verification email from Google. Click the link to complete the setup.');
                fetchIdentity(fromAddress);
            } else {
                const data = await res.json();
                setMessage(`❌ Failed: ${data.error || 'Unknown error'}`);
            }
        } catch (err) {
            setMessage('❌ Error connecting to server.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className={styles.pageContainer}>
            <header className={styles.header}>
                <h1 className={styles.title}>Private Identities</h1>
                <p className={styles.subtitle}>Choose how you want to be seen. Total control over your brackets and disclosure.</p>
            </header>

            <div className={styles.card} style={{ maxWidth: '600px', margin: '0 auto 3rem auto' }}>
                <div className={styles.inputGroup}>
                    <label className={styles.label}>Your Sender Address</label>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <input
                            type="email"
                            className={styles.input}
                            placeholder="e.g. hello@yourdomain.com"
                            value={fromAddress}
                            onChange={(e) => setFromAddress(e.target.value)}
                            style={{ flex: 1 }}
                        />
                        <button
                            className={styles.submitBtn}
                            style={{ marginTop: 0 }}
                            onClick={() => fetchIdentity(fromAddress)}
                        >
                            Lookup
                        </button>
                    </div>
                </div>
                {message && <div className={styles.statusIndicator}>{message}</div>}
            </div>

            <div className={styles.settingsGrid}>
                {/* Strategy 1: Croc Stealth */}
                <div className={`${styles.card} ${styles.cardGreen}`}>
                    <div className={styles.cardHeader}>
                        <div className={styles.iconWrapper}>
                            <Shield size={24} />
                        </div>
                        <h2 className={styles.cardTitle}>Croc Stealth (V6)</h2>
                    </div>
                    <p className={styles.cardDescription}>
                        The default for all @mailcroc and @mailpanda domains.
                        Uses our <b>"Golden Mask"</b> technology to hide your primary Gmail address.
                    </p>
                    <div className={styles.statusIndicator}>
                        <CheckCircle size={16} color="#10b981" />
                        <span>Active for all internal domains</span>
                    </div>
                </div>

                {/* Strategy 2: External SMTP */}
                <div className={`${styles.card} ${styles.cardBlue}`}>
                    <div className={styles.cardHeader}>
                        <div className={styles.iconWrapper}>
                            <Server size={24} />
                        </div>
                        <h2 className={styles.cardTitle}>Connect Own SMTP</h2>
                    </div>
                    <p className={styles.cardDescription}>
                        Strategy A: Connect directly to your own mail server (Office 365, Zoho, etc.).
                        <b>Zero brackets guaranteed.</b>
                    </p>
                    <form className={styles.form} onSubmit={handleSaveSmtp}>
                        <div className={styles.inputGroup}>
                            <label className={styles.label}>SMTP Host</label>
                            <input
                                className={styles.input}
                                value={smtpOptions.host}
                                onChange={(e) => setSmtpOptions({ ...smtpOptions, host: e.target.value })}
                                placeholder="smtp.gmail.com"
                            />
                        </div>
                        <div style={{ display: 'flex', gap: '1rem' }}>
                            <div className={styles.inputGroup} style={{ flex: 1 }}>
                                <label className={styles.label}>Port</label>
                                <input
                                    className={styles.input}
                                    type="number"
                                    value={smtpOptions.port}
                                    onChange={(e) => setSmtpOptions({ ...smtpOptions, port: Number(e.target.value) })}
                                    placeholder="587"
                                />
                            </div>
                            <div className={styles.inputGroup} style={{ flex: 2 }}>
                                <label className={styles.label}>Auth User</label>
                                <input
                                    className={styles.input}
                                    value={smtpOptions.user}
                                    onChange={(e) => setSmtpOptions({ ...smtpOptions, user: e.target.value })}
                                    placeholder="username"
                                />
                            </div>
                        </div>
                        <div className={styles.inputGroup}>
                            <label className={styles.label}>Password / App Secret</label>
                            <input
                                className={styles.input}
                                type="password"
                                value={smtpOptions.pass}
                                onChange={(e) => setSmtpOptions({ ...smtpOptions, pass: e.target.value })}
                                placeholder="••••••••••••"
                            />
                        </div>
                        <button type="submit" className={styles.submitBtn} disabled={isLoading}>
                            {isLoading ? 'Saving...' : 'Connect Identity'}
                        </button>
                    </form>
                </div>

                {/* Strategy 3: Gmail Alias */}
                <div className={`${styles.card} ${styles.cardPurple}`}>
                    <div className={styles.cardHeader}>
                        <div className={styles.iconWrapper}>
                            <Mail size={24} />
                        </div>
                        <h2 className={styles.cardTitle}>Gmail Ghosting</h2>
                    </div>
                    <p className={styles.cardDescription}>
                        Verify this address as an alias on our central Gmail account.
                        Best for people who want to send as another Gmail address.
                    </p>
                    <button className={styles.submitBtn} onClick={handleGmailAlias} style={{ background: '#8b5cf6' }}>
                        Start Handshake
                    </button>
                    <div className={styles.statusIndicator} style={{ background: '#f5f3ff' }}>
                        <AlertCircle size={16} color="#8b5cf6" />
                        <span>Requires verification email click</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
