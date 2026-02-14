"use client";

import React, { useState } from 'react';
import { X, AlertCircle, Send } from 'lucide-react';
import styles from './IncidentReportModal.module.css';

interface IncidentReportModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function IncidentReportModal({ isOpen, onClose }: IncidentReportModalProps) {
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        incidentType: 'outage',
        description: ''
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        setSubmitStatus('idle');

        try {
            const response = await fetch('/api/report-incident', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...formData,
                    timestamp: new Date().toISOString()
                })
            });

            if (response.ok) {
                setSubmitStatus('success');
                setTimeout(() => {
                    onClose();
                    setFormData({ name: '', email: '', incidentType: 'outage', description: '' });
                    setSubmitStatus('idle');
                }, 2000);
            } else {
                setSubmitStatus('error');
            }
        } catch (error) {
            console.error('Failed to submit incident report:', error);
            setSubmitStatus('error');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className={styles.overlay} onClick={onClose}>
            <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
                <button className={styles.closeButton} onClick={onClose} aria-label="Close modal">
                    <X size={20} />
                </button>

                <div className={styles.header}>
                    <AlertCircle size={28} className={styles.headerIcon} />
                    <h2>Report System Incident</h2>
                    <p>Help us improve by reporting any issues you've encountered</p>
                </div>

                <form onSubmit={handleSubmit} className={styles.form}>
                    <div className={styles.formGroup}>
                        <label htmlFor="name">Your Name *</label>
                        <input
                            type="text"
                            id="name"
                            required
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            placeholder="John Doe"
                            className={styles.input}
                        />
                    </div>

                    <div className={styles.formGroup}>
                        <label htmlFor="email">Email Address *</label>
                        <input
                            type="email"
                            id="email"
                            required
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            placeholder="you@example.com"
                            className={styles.input}
                        />
                    </div>

                    <div className={styles.formGroup}>
                        <label htmlFor="incidentType">Incident Type *</label>
                        <select
                            id="incidentType"
                            required
                            value={formData.incidentType}
                            onChange={(e) => setFormData({ ...formData, incidentType: e.target.value })}
                            className={styles.select}
                        >
                            <option value="outage">Service Outage</option>
                            <option value="performance">Performance Issue</option>
                            <option value="security">Security Concern</option>
                            <option value="other">Other</option>
                        </select>
                    </div>

                    <div className={styles.formGroup}>
                        <label htmlFor="description">Description *</label>
                        <textarea
                            id="description"
                            required
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            placeholder="Please describe the incident in detail..."
                            rows={5}
                            className={styles.textarea}
                        />
                    </div>

                    {submitStatus === 'success' && (
                        <div className={styles.successMessage}>
                            ✓ Report submitted successfully! Our team will review it shortly.
                        </div>
                    )}

                    {submitStatus === 'error' && (
                        <div className={styles.errorMessage}>
                            ✗ Failed to submit report. Please try again or contact support directly.
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className={styles.submitButton}
                    >
                        {isSubmitting ? (
                            'Sending...'
                        ) : (
                            <>
                                <Send size={18} />
                                Submit Report
                            </>
                        )}
                    </button>
                </form>
            </div>
        </div>
    );
}
