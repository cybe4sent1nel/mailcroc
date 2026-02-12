"use client";

import React from 'react';
import styles from './InstallModal.module.css';
import { Download, Monitor, Smartphone, X } from 'lucide-react';

interface InstallModalProps {
    isOpen: boolean;
    onClose: () => void;
    onInstall: () => void;
}

const InstallModal: React.FC<InstallModalProps> = ({
    isOpen,
    onClose,
    onInstall
}) => {
    if (!isOpen) return null;

    return (
        <div className={styles.overlay} onClick={onClose}>
            <div className={styles.modal} onClick={e => e.stopPropagation()}>
                <button className={styles.closeBtn} onClick={onClose}>
                    <X size={20} />
                </button>

                <div className={styles.content}>
                    <div className={styles.iconWrapper}>
                        <div className={styles.appIcon}>
                            <img src="/logo.png" alt="MailCroc Logo" className={styles.logoImg} />
                        </div>
                        <div className={styles.downloadIndicator}>
                            <Download size={16} color="white" />
                        </div>
                    </div>

                    <h2 className={styles.title}>Install MailCroc</h2>
                    <p className={styles.description}>
                        Install MailCroc on your home screen for quick and easy access to your temporary mail.
                    </p>

                    <div className={styles.features}>
                        <div className={styles.featureItem}>
                            <Monitor size={18} className={styles.featureIcon} />
                            <span>Quick Access from Desktop</span>
                        </div>
                        <div className={styles.featureItem}>
                            <Smartphone size={18} className={styles.featureIcon} />
                            <span>Offline Support & Notifications</span>
                        </div>
                    </div>
                </div>

                <div className={styles.footer}>
                    <button className={styles.installBtn} onClick={() => { onInstall(); onClose(); }}>
                        Install Now
                    </button>
                    <button className={styles.notNowBtn} onClick={onClose}>
                        Not Now
                    </button>
                </div>
            </div>
        </div>
    );
};

export default InstallModal;
