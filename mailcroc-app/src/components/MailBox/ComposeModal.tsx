"use client";

import React, { useState, useRef } from 'react';
import dynamic from 'next/dynamic';
import { X, Plus, Copy, Paperclip, FileText, Send as SendIcon, Sparkles, Briefcase, AlignLeft, Scissors, Mic } from 'lucide-react';
import styles from './MailBox.module.css';
import { AILogo } from '../Icons/AILogo';
import Switch from '../Switch/Switch';

// Recursive Dynamic Import for maximum isolation
const RichTextMailEditor = dynamic(() => import('../Editor/RichTextMailEditor'), { ssr: false });

interface Attachment {
    name: string;
    size: number;
    type: string;
    content: string;
}

interface ComposeModalProps {
    show: boolean;
    onClose: () => void;
    composePos: { x: number; y: number };
    handleMouseDown: (e: React.MouseEvent) => void;
    composeData: { to: string; subject: string; body: string };
    setComposeData: React.Dispatch<React.SetStateAction<{ to: string; subject: string; body: string }>>;
    attachments: Attachment[];
    removeAttachment: (idx: number) => void;
    addAttachment: (files: FileList | null) => void;
    isPasswordProtected: boolean;
    setIsPasswordProtected: (val: boolean) => void;
    emailPassword: string;
    setEmailPassword: (val: string) => void;
    handleSend: () => void;
    saveDraft: () => void;
    sendStatus: string | null;
    addToast: (msg: string, type: 'success' | 'error' | 'info') => void;
    handleAiWrite: (topic: string, refinement?: string) => Promise<void>;
    isAiWriting: boolean;
    getFileIcon: (type: string) => React.ReactNode;
    polishText: (text: string) => Promise<string>;
}

const ComposeModal: React.FC<ComposeModalProps> = ({
    show,
    onClose,
    composePos,
    handleMouseDown,
    composeData,
    setComposeData,
    attachments,
    removeAttachment,
    addAttachment,
    isPasswordProtected,
    setIsPasswordProtected,
    emailPassword,
    setEmailPassword,
    handleSend,
    saveDraft,
    sendStatus,
    addToast,
    handleAiWrite,
    isAiWriting,
    polishText,
    getFileIcon
}) => {
    const [aiWriteTopic, setAiWriteTopic] = useState('');
    const [showAiWritePopover, setShowAiWritePopover] = useState(false);
    const [isListening, setIsListening] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleVoiceInput = () => {
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (!SpeechRecognition) {
            addToast("Voice input not supported in this browser", "error");
            return;
        }

        if (isListening) {
            // Stop handled by onend usually, but we can force state update if manual stop logic needed
            return;
        }

        const recognition = new SpeechRecognition();
        recognition.lang = 'en-US';
        recognition.interimResults = false;
        recognition.maxAlternatives = 1;

        setIsListening(true);

        recognition.onstart = () => setIsListening(true);

        recognition.onresult = (event: any) => {
            const transcript = event.results[0][0].transcript;
            setAiWriteTopic(prev => prev + (prev ? ' ' : '') + transcript);
        };

        recognition.onerror = (event: any) => {
            console.error("Speech recognition error", event.error);
            setIsListening(false);
        };

        recognition.onend = () => {
            setIsListening(false);
        };

        recognition.start();
    };

    if (!show) return null;

    const onAiWriteClick = async (refinement?: string) => {
        await handleAiWrite(aiWriteTopic, refinement);
        if (!refinement) setShowAiWritePopover(false);
    };

    return (
        <div
            className={styles.composeModal}
            style={{ left: composePos.x, top: composePos.y }}
        >
            <div className={styles.modalHeader} onMouseDown={handleMouseDown}>
                <span className={styles.modalTitle}>New Message</span>
                <div className={styles.modalControls}>
                    <button className={styles.controlBtn} onClick={onClose}><X size={18} /></button>
                </div>
            </div>

            <div className={styles.composeBody}>
                <input
                    className={styles.composeInput}
                    placeholder="Recipients"
                    value={composeData.to}
                    onChange={e => setComposeData({ ...composeData, to: e.target.value })}
                />
                <input
                    className={styles.composeInput}
                    placeholder="Subject"
                    value={composeData.subject}
                    onChange={e => setComposeData({ ...composeData, subject: e.target.value })}
                />

                <div className={styles.seamlessEditor}>
                    <RichTextMailEditor
                        content={composeData.body}
                        onChange={(html) => setComposeData(prev => ({ ...prev, body: html }))}
                        onAiPolish={polishText}
                    />
                </div>

                {attachments.length > 0 && (
                    <div className={styles.attachmentList}>
                        {attachments.map((file, idx) => (
                            <div key={idx} className={styles.attachmentChip}>
                                <span className={styles.fileIconWrapper}>{getFileIcon(file.type)}</span>
                                <span className={styles.attachmentName} title={file.name}>{file.name}</span>
                                <button className={styles.removeAttachBtn} onClick={() => removeAttachment(idx)}><X size={14} /></button>
                            </div>
                        ))}
                        {attachments.length < 5 && (
                            <button className={styles.addAttachBtn} onClick={() => fileInputRef.current?.click()} title="Add more files"><Plus size={16} /></button>
                        )}
                    </div>
                )}
            </div>

            <div className={styles.composeFooter}>
                <div className={styles.footerLeft}>
                    <button className={styles.aiWriteBtn} onClick={() => setShowAiWritePopover(!showAiWritePopover)}>
                        <AILogo size={18} color="black" /> Help me write
                    </button>

                    <div className={styles.passwordProtectionBar}>
                        <div className={styles.protectionToggle}>
                            <Switch
                                checked={isPasswordProtected}
                                onChange={(checked) => {
                                    setIsPasswordProtected(checked);
                                    if (checked && !emailPassword) {
                                        const randomPass = Math.random().toString(36).slice(-6).toUpperCase();
                                        setEmailPassword(randomPass);
                                    }
                                }}
                            />
                            <span className={styles.protectionLabel}>{isPasswordProtected ? 'Protected' : 'Not protected'}</span>
                        </div>
                    </div>
                    {isPasswordProtected && (
                        <div className={styles.passwordInputArea}>
                            <input
                                type="text"
                                className={styles.passwordInput}
                                value={emailPassword}
                                onChange={(e) => setEmailPassword(e.target.value)}
                                placeholder="Pass"
                            />
                            <button
                                className={styles.copyPassBtn}
                                onClick={() => {
                                    navigator.clipboard.writeText(emailPassword);
                                    addToast("Password copied to clipboard", "success");
                                }}
                                title="Copy Password"
                            >
                                <Copy size={14} />
                            </button>
                        </div>
                    )}

                    <button className={styles.controlBtn} onClick={() => fileInputRef.current?.click()} title="Attach File"><Paperclip size={18} /></button>
                    <button className={styles.controlBtn} onClick={saveDraft} title="Save Draft"><FileText size={18} /></button>
                </div>

                <div className={styles.footerRight}>
                    <button className={styles.sendBtn} onClick={handleSend} disabled={!!sendStatus}>
                        {sendStatus || 'Send'} <SendIcon size={16} />
                    </button>
                </div>

                {showAiWritePopover && (
                    <div className={styles.aiPopover}>
                        <div className={styles.aiPopoverHeader}>
                            <strong>Help me write</strong>
                            <button onClick={() => setShowAiWritePopover(false)} className={styles.closeBtn}><X size={14} /></button>
                        </div>
                        <div className={styles.aiInputWrapper} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1rem' }}>
                            <input
                                placeholder="What's this email about?"
                                value={aiWriteTopic}
                                onChange={e => setAiWriteTopic(e.target.value)}
                                autoFocus
                                onKeyDown={e => e.key === 'Enter' && onAiWriteClick()}
                                style={{ flex: 1 }}
                            />
                            <button
                                onClick={handleVoiceInput}
                                className={`${styles.voiceBtn} ${isListening ? styles.pulsing : ''}`}
                                title="Speak"
                                style={{
                                    background: 'none',
                                    border: '1px solid #e2e8f0',
                                    borderRadius: '50%',
                                    width: '32px',
                                    height: '32px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    cursor: 'pointer'
                                }}
                            >
                                <Mic size={16} color={isListening ? '#ef4444' : '#64748b'} />
                            </button>
                        </div>
                        <button
                            className={styles.actionBtnPrimary}
                            style={{ width: '100%', marginBottom: '1rem' }}
                            onClick={() => onAiWriteClick()}
                            disabled={isAiWriting || !aiWriteTopic}
                        >
                            {isAiWriting ? 'Writing...' : 'Create Content'}
                        </button>

                        <div className={styles.aiRefinementTools}>
                            <div className={styles.refinementLabel}>Refine existing text:</div>
                            <div className={styles.refinementGrid}>
                                <button onClick={() => onAiWriteClick('polish')} disabled={isAiWriting || !composeData.body}>
                                    <Sparkles size={14} style={{ color: '#3b82f6' }} /> Polish
                                </button>
                                <button onClick={() => onAiWriteClick('formalize')} disabled={isAiWriting || !composeData.body}>
                                    <Briefcase size={14} style={{ color: '#4b5563' }} /> Formalize
                                </button>
                                <button onClick={() => onAiWriteClick('elaborate')} disabled={isAiWriting || !composeData.body}>
                                    <AlignLeft size={14} style={{ color: '#16a34a' }} /> Elaborate
                                </button>
                                <button onClick={() => onAiWriteClick('shorten')} disabled={isAiWriting || !composeData.body}>
                                    <Scissors size={14} style={{ color: '#ef4444' }} /> Shorten
                                </button>
                            </div>
                            {!composeData.body && <div className={styles.refinementHint}>Write something to use refinements</div>}
                        </div>
                    </div>
                )}
            </div>

            {/* Hidden File Input */}
            <input
                type="file"
                multiple
                ref={fileInputRef}
                style={{ display: 'none' }}
                onChange={(e) => addAttachment(e.target.files)}
            />
        </div >
    );
};

export default ComposeModal;
