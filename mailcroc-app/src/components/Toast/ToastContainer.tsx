"use client";

import React from 'react';
import styles from './Toast.module.css';
import { ToastMessage } from './ToastContext';
import { ToastItem } from './ToastItem';

interface ToastContainerProps {
    toasts: ToastMessage[];
    removeToast: (id: string) => void;
}

export const ToastContainer = ({ toasts, removeToast }: ToastContainerProps) => {
    if (toasts.length === 0) return null;

    return (
        <ul className={styles.notificationContainer}>
            {toasts.map((toast) => (
                <ToastItem key={toast.id} toast={toast} onClose={removeToast} />
            ))}
        </ul>
    );
};
