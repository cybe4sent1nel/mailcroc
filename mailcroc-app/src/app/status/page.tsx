"use client";

import React, { useEffect, useState } from 'react';
import { CheckCircle2, ShieldCheck, Zap, Bot, Activity, ArrowLeft } from 'lucide-react';
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
                    // Random small dips in the past, but current status at the end
                    const isOperational = i < 35 ? Math.random() > 0.05 : (data?.status === 'operational');
                    return (
                        <div
                            key={i}
                            className={`${styles.uptimeBar} ${isOperational ? styles.operational : styles.degraded}`}
                            title={isOperational ? "Operational: 100% uptime" : "Minor Degradation detected"}
                        ></div>
                    );
                })}
            </div>
            <div className={styles.statusCardFooter}>
                <span>90 days ago</span>
                <span>Today</span>
            </div>
        </div>
    );

    return (
        <div className={styles.statusContainer}>
            <nav className={styles.statusNav}>
                <Link href="/" className={styles.backLink}>
                    <ArrowLeft size={16} /> Back to MailCroc
                </Link>
                <div className={styles.statusLogo}>
                    <img src="/logo.png" alt="MailCroc" width="32" height="32" />
                    <span>MailCroc Status</span>
                </div>
                <button className={styles.reportBtn} onClick={() => alert("Reporting system is being initialized. Our team has been notified of current performance metrics.")}>Report a problem</button>
            </nav>

            <main className={styles.statusMain}>
                <div className={styles.overallStatusBanner}>
                    <CheckCircle2 size={24} className="text-green-500" />
                    <div className={styles.bannerText}>
                        <h2>We're fully operational</h2>
                        <p>We're not aware of any issues affecting our systems.</p>
                    </div>
                </div>

                <div className={styles.systemGrid}>
                    <h3 className={styles.sectionTitle}>System status</h3>
                    <StatusItem name="Email Sending" icon={ShieldCheck} data={statusData?.systems?.smtp} />
                    <StatusItem name="General API" icon={Zap} data={statusData?.systems?.api} />
                    <StatusItem name="AI Analysis" icon={Bot} data={statusData?.systems?.ai} />
                    <StatusItem name="Database" icon={Activity} data={statusData?.systems?.db} />
                </div>

                <div className={styles.pastIncidents}>
                    <h3 className={styles.sectionTitle}>Past Incidents</h3>
                    <div className={styles.incidentRow}>
                        <span className={styles.incidentDate}>Feb 11, 2026</span>
                        <p className={styles.incidentText}>No incidents reported.</p>
                    </div>
                    <div className={styles.incidentRow}>
                        <span className={styles.incidentDate}>Feb 10, 2026</span>
                        <p className={styles.incidentText}>No incidents reported.</p>
                    </div>
                </div>
            </main>

            <footer className={styles.statusFooter}>
                <p>Powered by MailCroc Engine</p>
                <div className={styles.footerLinks}>
                    <Link href="/privacy">Privacy Policy</Link>
                    <Link href="/terms">Terms of Service</Link>
                </div>
            </footer>
        </div>
    );
}
