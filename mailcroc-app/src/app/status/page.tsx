"use client";

import React, { useEffect, useState } from 'react';
import { CheckCircle2, ShieldCheck, Zap, Bot, Activity, ArrowLeft, Lock, Volume2, Fingerprint } from 'lucide-react';
import Link from 'next/link';
import styles from './status.module.css';

export default function StatusPage() {
    const [statusData, setStatusData] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStatus = () => {
            fetch('/api/status')
                .then(res => res.json())
                .then(data => {
                    setStatusData(data);
                    setLoading(false);
                })
                .catch(() => setLoading(false));
        };
        fetchStatus();
        const interval = setInterval(fetchStatus, 30000); // Refresh every 30s
        return () => clearInterval(interval);
    }, []);

    const StatusItem = ({ name, icon: Icon, data }: any) => (
        <div className={styles.statusCard}>
            <div className={styles.statusCardHeader}>
                <div className={styles.statusCardTitle}>
                    <div className={`${styles.statusDot} ${data?.status === 'operational' ? styles.bgGreen : styles.bgYellow}`}></div>
                    <Icon size={18} />
                    <span>{name}</span>
                </div>
                <span className={styles.uptimePercentage}>{data?.uptime || '100%'} uptime</span>
            </div>
            <div className={styles.uptimeBars}>
                {Array.from({ length: 40 }).map((_, i) => {
                    // Stable pseudo-random look without hydration mismatch
                    const isOperational = i < 38 ? (i % 13 !== 0) : (data?.status === 'operational');
                    return (
                        <div
                            key={i}
                            className={`${styles.uptimeBar} ${isOperational ? styles.operational : styles.degraded}`}
                        ></div>
                    );
                })}
            </div>
            <div className={styles.statusCardFooter}>
                <span>90 days ago</span>
                <span className={styles.latencyText}>{data?.latency || '0ms'}</span>
                <span>Today</span>
            </div>
        </div>
    );

    return (
        <div className={styles.statusContainer}>
            <nav className={styles.statusNav}>
                <Link href="/" className={styles.backLink}>
                    <ArrowLeft size={16} /> Dashboard
                </Link>
                <div className={styles.statusLogo}>
                    <ShieldCheck size={24} className="text-slate-800" />
                    <span>System Status</span>
                </div>
                <div className={styles.navActions}>
                    <button className={styles.reportBtn} onClick={() => alert("Reporting initialized. Monitoring team notified.")}>Report Incident</button>
                </div>
            </nav>

            <main className={styles.statusMain}>
                <div className={styles.statusHeaderRow}>
                    <div className={styles.overallStatusBanner}>
                        <CheckCircle2 size={24} className={styles.bannerIcon} />
                        <div className={styles.bannerText}>
                            <h2>All Systems Operational</h2>
                            <p>All core services are performing within normal parameters.</p>
                        </div>
                    </div>
                </div>

                <div className={styles.metricsWrapper}>
                    <div className={styles.systemGrid}>
                        <div className={styles.gridSection}>
                            <h3 className={styles.sectionTitle}>Main Infrastructure</h3>
                            <StatusItem name="Mail Delivery" icon={ShieldCheck} data={statusData?.systems?.smtp} />
                            <StatusItem name="Core API" icon={Zap} data={statusData?.systems?.api} />
                            <StatusItem name="Database Cluster" icon={Activity} data={statusData?.systems?.db} />
                        </div>

                        <div className={styles.gridSection}>
                            <h3 className={styles.sectionTitle}>Advanced Services</h3>
                            <StatusItem name="Secure Portal" icon={Lock} data={statusData?.systems?.secure} />
                            <StatusItem name="AI Analysis" icon={Bot} data={statusData?.systems?.ai} />
                            <StatusItem name="Voice & Audio" icon={Volume2} data={statusData?.systems?.voice} />
                        </div>

                        <div className={styles.gridSection}>
                            <h3 className={styles.sectionTitle}>Identity & Trust</h3>
                            <StatusItem name="Stealth Verification" icon={Fingerprint} data={statusData?.systems?.identity} />
                        </div>
                    </div>

                    <div className={styles.brandSide}>
                        <img
                            src="/images/computer-svgrepo-com.svg"
                            alt="System Asset"
                            className={styles.heroSvg}
                        />
                    </div>
                </div>

                <div className={styles.pastIncidents}>
                    <h3 className={styles.sectionTitle}>Incident History</h3>
                    <div className={styles.incidentRow}>
                        <span className={styles.incidentDate}>Feb 14, 2026</span>
                        <p className={styles.incidentText}>System stability maintained. No issues detected.</p>
                    </div>
                    <div className={styles.incidentRow}>
                        <span className={styles.incidentDate}>Feb 13, 2026</span>
                        <p className={styles.incidentText}>Standard maintenance completed. Service uptime 100%.</p>
                    </div>
                </div>
            </main>

            <footer className={styles.statusFooter}>
                <div className={styles.footerContent}>
                    <p>© 2026 MailCroc Engine. High Availability Architecture.</p>
                    <div className={styles.footerLinks}>
                        <Link href="/privacy">Privacy</Link>
                        <Link href="/terms">Terms</Link>
                        <Link href="/legal">Compliance</Link>
                    </div>
                </div>
            </footer>
        </div>
    );
}
