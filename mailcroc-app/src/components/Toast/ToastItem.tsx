"use client";

import React from 'react';
import styles from './Toast.module.css';
import { ToastMessage } from './ToastContext';
import { CheckCircle, Info, AlertTriangle, XCircle, X } from 'lucide-react';

interface ToastItemProps {
    toast: ToastMessage;
    onClose: (id: string) => void;
}

const icons = {
    success: <CheckCircle />,
    info: <Info />,
    warning: <AlertTriangle />,
    error: <XCircle />
};

export const ToastItem = ({ toast, onClose }: ToastItemProps) => {
    const { id, type, message } = toast;

    return (
        <li className={`${styles.notificationItem} ${styles[type]}`}>
            <div className={styles.notificationContent}>
                <div className={styles.notificationIcon}>
                    {icons[type]}
                </div>
                <div className={styles.notificationText}>{message}</div>
            </div>
            <div className={`${styles.notificationIcon} ${styles.notificationClose}`} onClick={() => onClose(id)}>
                <X size={18} />
            </div>
            <div className={styles.progressBar} />
        </li>
    );
};
