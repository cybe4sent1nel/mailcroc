"use client";
import React, { useState, useEffect, useCallback, useRef } from 'react';
import styles from './MailBox.module.css';
import { Copy, RefreshCw, Mail, Shuffle, Star, Send, Forward, Clock, Plus, X, Reply, MoreVertical, Trash2, CheckCircle, FileText, Paperclip } from 'lucide-react';
import { io, Socket } from 'socket.io-client';
import { generateEmailAddress, type GenerationMode } from '@/lib/domains';
import LottiePlayer from '@/components/LottiePlayer';
import { useToast } from '@/components/Toast/ToastContext'; // Import useToast

import noMsgAnim from '../../../public/animations/nomesage_inbox.json';
import mailSentAnim from '../../../public/animations/Email_sent.json';
import sessionExpAnim from '../../../public/animations/sessionexpire.json';

interface EmailMessage {
    _id: string;
    from: string;
    subject: string;
    receivedAt: string;
    text: string;
    html: string;
    pinned?: boolean;
    read?: boolean;
}

interface InboxTab {
    address: string;
    config: any;
}

interface Attachment {
    name: string;
    content: string; // Base64
    type: string;
    size: number;
}

let socket: Socket | null = null;

const MailBox = () => {
    // Multi-inbox state
    const [inboxTabs, setInboxTabs] = useState<InboxTab[]>([]);
    const [activeTabIndex, setActiveTabIndex] = useState(0);

    // Generation toggles
    const [toggles, setToggles] = useState({
        standard: true,
        plus: true,
        dot: true,
        gmail: true,
        googlemail: true,
    });

    const [isCustomMode, setIsCustomMode] = useState(false);
    const [customInput, setCustomInput] = useState('');

    const [currentConfig, setCurrentConfig] = useState<{
        mode: GenerationMode;
        address: string;
        fullAddress?: string;
    } | null>(null);

    const [messages, setMessages] = useState<EmailMessage[]>([]);
    const [selectedMessage, setSelectedMessage] = useState<EmailMessage | null>(null);
    const [isConnected, setIsConnected] = useState(false);
    const [copied, setCopied] = useState(false);
    const [openMenuId, setOpenMenuId] = useState<string | null>(null);

    // Premium feature states
    const [showCompose, setShowCompose] = useState(false);
    const [showReply, setShowReply] = useState(false);
    const [showForward, setShowForward] = useState(false);
    const [composeData, setComposeData] = useState({ to: '', subject: '', body: '' });
    const [expiryMinutes, setExpiryMinutes] = useState<number | null>(null);
    const [sendStatus, setSendStatus] = useState<string | null>(null);
    const [attachments, setAttachments] = useState<Attachment[]>([]);
    const [isSessionExpired, setIsSessionExpired] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);

    const { addToast } = useToast(); // Hook
    const fileInputRef = useRef<HTMLInputElement>(null);

    const generateNewIdentity = useCallback(() => {
        const modes: GenerationMode[] = [];
        if (toggles.standard) modes.push('standard');
        if (toggles.plus) modes.push('plus');
        if (toggles.dot) modes.push('dot');
        if (toggles.gmail) modes.push('gmail');
        if (toggles.googlemail) modes.push('googlemail');
        if (modes.length === 0) modes.push('standard');

        const mode = modes[Math.floor(Math.random() * modes.length)];
        const address = generateEmailAddress(mode);

        const config = { mode, address };
        setCurrentConfig(config);
        localStorage.setItem('mailcroc_config', JSON.stringify(config));
        setMessages([]);
        setSelectedMessage(null);
        setIsSessionExpired(false);
        return config;
    }, [toggles]);

    const handleCustomSubmit = () => {
        if (!customInput.includes('@')) { addToast("Please enter a valid email address.", 'error'); return; }
        const config = { mode: 'standard' as GenerationMode, address: customInput, fullAddress: customInput };
        setCurrentConfig(config);
        localStorage.setItem('mailcroc_config', JSON.stringify(config));
        setMessages([]);
        setSelectedMessage(null);
        setIsSessionExpired(false);
    };

    // Initial load
    useEffect(() => {
        const stored = localStorage.getItem('mailcroc_config');
        if (stored) {
            try {
                const config = JSON.parse(stored);
                if (config?.address) setCurrentConfig(config);
                else generateNewIdentity();
            } catch { generateNewIdentity(); }
        } else {
            generateNewIdentity();
        }
        const savedTabs = localStorage.getItem('mailcroc_tabs');
        if (savedTabs) { try { setInboxTabs(JSON.parse(savedTabs)); } catch { } }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const emailAddress = currentConfig?.address || '';

    // Socket.IO Connection
    useEffect(() => {
        if (!socket) {
            const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3001';
            socket = io(socketUrl);
            socket.on('connect', () => setIsConnected(true));
            socket.on('disconnect', () => setIsConnected(false));
        }
        if (emailAddress && socket) {
            socket.emit('join', emailAddress);
            const handleNewEmail = (newMsg: any) => {
                setMessages(prev => {
                    // Avoid duplicates
                    if (prev.some(m => m._id === newMsg._id)) return prev;
                    return [newMsg, ...prev];
                });
            };
            socket.on('new_email', handleNewEmail);
            return () => {
                if (socket) {
                    socket.off('new_email', handleNewEmail);
                    socket.emit('leave', emailAddress);
                }
            };
        }
    }, [emailAddress]);

    useEffect(() => {
        return () => { if (socket) { socket.disconnect(); socket = null; } };
    }, []);

    // Fetch messages from API
    const fetchMessages = useCallback(async () => {
        if (!emailAddress) return;
        try {
            const res = await fetch(`/api/emails?address=${encodeURIComponent(emailAddress)}`);
            if (res.ok) setMessages(await res.json());
        } catch (err) { console.error('Fetch error:', err); }
    }, [emailAddress]);

    useEffect(() => { if (emailAddress) fetchMessages(); }, [emailAddress, fetchMessages]);

    const copyToClipboard = () => {
        navigator.clipboard.writeText(emailAddress);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
    };

    const toggleVariant = (key: keyof typeof toggles) => {
        setToggles(prev => ({ ...prev, [key]: !prev[key] }));
    };

    // Premium: Pin/Unpin
    const togglePin = async (emailId: string, currentPinned: boolean) => {
        try {
            await fetch('/api/emails', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ emailId, action: 'pin', value: !currentPinned }) });
            setMessages(prev => prev.map(m => m._id === emailId ? { ...m, pinned: !currentPinned } : m));
            if (selectedMessage?._id === emailId) setSelectedMessage({ ...selectedMessage, pinned: !currentPinned });
        } catch (err) { console.error(err); }
    };

    // Premium: Set Expiry
    const setExpiry = async (minutes: number | null) => {
        setExpiryMinutes(minutes);
        try {
            await fetch('/api/emails', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'expiry', value: minutes, address: emailAddress }) });
            if (minutes && minutes > 0) {
                setTimeout(() => {
                    setIsSessionExpired(true);
                    setMessages([]);
                    setSelectedMessage(null);
                }, minutes * 60 * 1000);
            }
        } catch (err) { console.error(err); }
    };

    // New: Delete Email
    const handleDelete = async (emailId: string) => {
        if (!confirm('Delete this email?')) return;
        try {
            await fetch('/api/emails', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ emailId, address: emailAddress })
            });
            setMessages(prev => prev.filter(m => m._id !== emailId));
            if (selectedMessage?._id === emailId) setSelectedMessage(null);
            setOpenMenuId(null);
        } catch (err) { console.error(err); }
    };

    // New: Toggle Read Status
    const toggleRead = async (emailId: string, currentRead: boolean) => {
        try {
            await fetch('/api/emails', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ emailId, action: 'read', value: !currentRead })
            });
            setMessages(prev => prev.map(m => m._id === emailId ? { ...m, read: !currentRead } : m));
            if (selectedMessage?._id === emailId) setSelectedMessage({ ...selectedMessage, read: !currentRead });
            setOpenMenuId(null);
        } catch (err) { console.error(err); }
    };

    // New: View Source
    const viewSource = (msg: EmailMessage) => {
        const w = window.open('', '_blank');
        if (w) {
            w.document.write(`<pre>${msg.html || msg.text}</pre>`);
            w.document.close();
        }
        setOpenMenuId(null);
    };

    // Attachment Handling
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const files = Array.from(e.target.files);
            const totalSize = files.reduce((acc, file) => acc + file.size, 0) + attachments.reduce((acc, att) => acc + att.size, 0);


            if (totalSize > 25 * 1024 * 1024) { // 25MB limit
                addToast("Total attachment size exceeds 25MB limit.", 'error');
                return;
            }

            files.forEach(file => {
                const reader = new FileReader();
                reader.readAsDataURL(file);
                reader.onload = () => {
                    const base64 = reader.result as string;
                    setAttachments(prev => [...prev, { name: file.name, content: base64, type: file.type, size: file.size }]);
                };
            });
        }
    };

    const removeAttachment = (index: number) => {
        setAttachments(prev => prev.filter((_, i) => i !== index));
    };

    // Helper for XHR with Progress
    const sendEmailWithProgress = (url: string, data: any): Promise<any> => {
        return new Promise((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            xhr.open('POST', url);
            xhr.setRequestHeader('Content-Type', 'application/json');

            xhr.upload.onprogress = (e) => {
                if (e.lengthComputable) {
                    const percentComplete = (e.loaded / e.total) * 100;
                    setUploadProgress(Math.round(percentComplete));
                }
            };

            xhr.onload = () => {
                if (xhr.status >= 200 && xhr.status < 300) {
                    try {
                        resolve(JSON.parse(xhr.responseText));
                    } catch (e) {
                        reject({ error: 'Invalid JSON response' });
                    }
                } else {
                    try {
                        reject(JSON.parse(xhr.responseText));
                    } catch (e) {
                        reject({ error: 'Request failed' });
                    }
                }
            };

            xhr.onerror = () => reject({ error: 'Network Error' });
            xhr.send(JSON.stringify(data));
        });
    };

    // Premium: Send
    const handleSend = async (action: string, to: string, subject: string, body: string, replyTo?: string) => {
        setSendStatus('Sending...');
        setUploadProgress(0);
        try {
            const data = await sendEmailWithProgress('/api/emails/send', {
                action,
                from: emailAddress,
                to,
                subject,
                body,
                replyTo,
                attachments
            });

            if (data.success) {
                setSendStatus('Sent!');
                setUploadProgress(100);
                setAttachments([]); // Clear attachments
                setTimeout(() => {
                    setSendStatus(null);
                    setUploadProgress(0);
                    setShowCompose(false);
                    setShowReply(false);
                    setShowForward(false);
                }, 1500);
                setComposeData({ to: '', subject: '', body: '' });
            }
            else { setSendStatus(`Error: ${data.error}`); setUploadProgress(0); }
        } catch { setSendStatus('Failed to send'); setUploadProgress(0); }
    };

    // Multi-inbox
    const addInboxTab = () => {
        if (!emailAddress) return;
        if (inboxTabs.find(t => t.address === emailAddress)) return;
        const newTabs = [...inboxTabs, { address: emailAddress, config: currentConfig }];
        setInboxTabs(newTabs);
        setActiveTabIndex(newTabs.length - 1);
        localStorage.setItem('mailcroc_tabs', JSON.stringify(newTabs));
    };

    const switchTab = (index: number) => {
        const tab = inboxTabs[index];
        setActiveTabIndex(index);
        setCurrentConfig(tab.config);
        localStorage.setItem('mailcroc_config', JSON.stringify(tab.config));
        setMessages([]);
        setSelectedMessage(null);
        setIsSessionExpired(false);
    };

    const removeTab = (index: number) => {
        const newTabs = inboxTabs.filter((_, i) => i !== index);
        setInboxTabs(newTabs);
        localStorage.setItem('mailcroc_tabs', JSON.stringify(newTabs));
        if (activeTabIndex >= newTabs.length) setActiveTabIndex(Math.max(0, newTabs.length - 1));
    };

    if (isSessionExpired) {
        return (
            <div className={styles.container}>
                <div className={styles.expiredState}>
                    <LottiePlayer animationData={sessionExpAnim} style={{ width: 250, height: 250 }} />
                    <h2>Session Expired</h2>
                    <p>Your ephemeral inbox has timed out.</p>
                    <button onClick={generateNewIdentity} className={styles.actionBtnAccent}>
                        <Shuffle size={16} /> Generate New Inbox
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className={styles.container}>
            {/* Multi-Inbox Tabs */}
            {inboxTabs.length > 0 && (
                <div className={styles.tabBar}>
                    {inboxTabs.map((tab, i) => (
                        <div key={tab.address} className={`${styles.tab} ${activeTabIndex === i ? styles.tabActive : ''}`} onClick={() => switchTab(i)}>
                            <span className={styles.tabText}>{tab.address.length > 25 ? tab.address.slice(0, 25) + '...' : tab.address}</span>
                            <button className={styles.tabClose} onClick={(e) => { e.stopPropagation(); removeTab(i); }}><X size={12} /></button>
                        </div>
                    ))}
                    <button className={styles.tabAdd} onClick={addInboxTab} title="Pin current inbox as tab"><Plus size={14} /></button>
                </div>
            )}

            {/* Control Bar */}
            <div className={styles.controlBar}>
                <div className={styles.emailDisplay}>
                    <span className={styles.emailText}>{emailAddress || 'Generating...'}</span>
                    <button onClick={copyToClipboard} className={styles.iconBtn} title="Copy">
                        {copied ? <span className={styles.copiedText}>Copied!</span> : <Copy size={18} />}
                    </button>
                    <span className={isConnected ? styles.dotGreen : styles.dotRed} title={isConnected ? 'Live' : 'Disconnected'}></span>
                    {currentConfig && <span className={styles.modeBadge}>{currentConfig.mode}</span>}
                </div>

                {/* Toggles */}
                <div className={styles.optionsBar}>
                    <div className={styles.toggleRow}>
                        {([
                            { key: 'standard', label: 'Domain' },
                            { key: 'plus', label: '+Plus' },
                            { key: 'dot', label: '.Dot' },
                            { key: 'gmail', label: 'Gmail' },
                            { key: 'googlemail', label: 'GoogleMail' },
                        ] as const).map(({ key, label }) => (
                            <div key={key} className={styles.toggleWrapper}>
                                <div className={styles.toggleBorder}>
                                    <input id={`toggle-${key}`} className={styles.toggleInput} type="checkbox" checked={toggles[key]} onChange={() => toggleVariant(key)} />
                                    <label htmlFor={`toggle-${key}`} className={styles.toggleLabel}><div className={styles.toggleHandle} /></label>
                                </div>
                                <span className={styles.toggleLabelText}>{label}</span>
                            </div>
                        ))}
                        <div className={styles.toggleWrapper}>
                            <div className={styles.toggleBorder}>
                                <input id="toggle-custom" className={styles.toggleInput} type="checkbox" checked={isCustomMode} onChange={() => setIsCustomMode(!isCustomMode)} />
                                <label htmlFor="toggle-custom" className={styles.toggleLabel}><div className={styles.toggleHandle} /></label>
                            </div>
                            <span className={styles.toggleLabelText}>Custom</span>
                        </div>
                    </div>

                    {isCustomMode && (
                        <div className={styles.customInputArea}>
                            <input type="text" className={styles.customInput} placeholder="Enter custom email..." value={customInput} onChange={(e) => setCustomInput(e.target.value)} />
                            <button className={styles.customBtn} onClick={handleCustomSubmit}>Set Email</button>
                        </div>
                    )}
                </div>

                {/* Action Buttons */}
                <div className={styles.actionRow}>
                    <button onClick={fetchMessages} className={styles.actionBtn} title="Refresh"><RefreshCw size={16} /> Refresh</button>
                    {!isCustomMode && <button onClick={generateNewIdentity} className={styles.actionBtnAccent} title="Generate New"><Shuffle size={16} /> Generate New</button>}
                    <button onClick={() => { setShowCompose(true); setComposeData({ to: '', subject: '', body: '' }); }} className={styles.actionBtn} title="Compose"><Send size={16} /> Compose</button>
                    {inboxTabs.length === 0 && <button onClick={addInboxTab} className={styles.actionBtn} title="Pin inbox as tab"><Plus size={16} /> Add Tab</button>}
                    <div className={styles.expirySelect}>
                        <Clock size={14} />
                        <select value={expiryMinutes ?? ''} onChange={(e) => setExpiry(e.target.value ? parseInt(e.target.value) : null)} className={styles.expiryDropdown}>
                            <option value="">No Expiry</option>
                            <option value="10">10 min</option>
                            <option value="60">1 hour</option>
                            <option value="1440">24 hours</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Content Area */}
            <div className={styles.contentArea}>
                <div className={`${styles.messageList} ${selectedMessage ? styles.hiddenMobile : ''}`}>
                    {messages.length === 0 ? (
                        <div className={styles.emptyState}>
                            {/* Replaced Icon with Lottie */}
                            <LottiePlayer animationData={noMsgAnim} style={{ width: 180, height: 180, marginBottom: '1rem' }} />
                            <p>Waiting for emails...</p>
                            <span className={styles.emptyHint}>Send an email to {emailAddress} to test</span>
                        </div>
                    ) : (
                        messages.map((msg) => (
                            <div key={msg._id} className={`${styles.messageItem} ${selectedMessage?._id === msg._id ? styles.active : ''} ${msg.pinned ? styles.pinned : ''} ${!msg.read ? styles.unread : ''}`} onClick={() => { setSelectedMessage(msg); if (!msg.read) toggleRead(msg._id, false); }}>
                                <button className={`${styles.pinBtn} ${msg.pinned ? styles.pinActive : ''}`} onClick={(e) => { e.stopPropagation(); togglePin(msg._id, !!msg.pinned); }} title={msg.pinned ? 'Unpin' : 'Pin'}>
                                    <Star size={14} fill={msg.pinned ? "currentColor" : "none"} />
                                </button>
                                <div className={styles.msgContent}>
                                    <div className={styles.msgSender}>{msg.from}</div>
                                    <div className={styles.msgSubject}>{msg.subject || '(No Subject)'}</div>
                                </div>
                                <div className={styles.msgTime}>{new Date(msg.receivedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                            </div>
                        ))
                    )}
                </div>

                <div className={`${styles.messageDetail} ${!selectedMessage ? styles.hiddenMobile : ''}`}>
                    {selectedMessage ? (
                        <div className={styles.emailView}>
                            <div className={styles.emailHeader}>
                                <div className={styles.headerTop}>
                                    <button className={styles.backBtn} onClick={() => setSelectedMessage(null)}>← Back</button>
                                    <div className={styles.headerActions}>
                                        <button className={`${styles.iconBtn} ${selectedMessage.pinned ? styles.pinActive : ''}`} onClick={() => togglePin(selectedMessage._id, !!selectedMessage.pinned)}>
                                            <Star size={18} fill={selectedMessage.pinned ? "currentColor" : "none"} />
                                        </button>
                                        <div className={styles.menuContainer}>
                                            <button className={styles.iconBtn} onClick={() => setOpenMenuId(openMenuId === selectedMessage._id ? null : selectedMessage._id)}>
                                                <MoreVertical size={18} />
                                            </button>
                                            {openMenuId === selectedMessage._id && (
                                                <div className={styles.menuDropdown}>
                                                    <button onClick={() => toggleRead(selectedMessage._id, !!selectedMessage.read)}>
                                                        <CheckCircle size={14} /> {selectedMessage.read ? 'Mark Unread' : 'Mark Read'}
                                                    </button>
                                                    <button onClick={() => handleDelete(selectedMessage._id)}>
                                                        <Trash2 size={14} /> Delete
                                                    </button>
                                                    <button onClick={() => viewSource(selectedMessage)}>
                                                        <FileText size={14} /> View Source
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <h2>{selectedMessage.subject || '(No Subject)'}</h2>
                                <div className={styles.meta}>
                                    <span>From: <strong>{selectedMessage.from}</strong></span>
                                    <span>{new Date(selectedMessage.receivedAt).toLocaleString()}</span>
                                </div>
                                <div className={styles.emailActions}>
                                    <button className={styles.emailActionBtn} onClick={() => { setShowReply(true); setComposeData({ to: selectedMessage.from, subject: `Re: ${selectedMessage.subject}`, body: '' }); }}>
                                        <Reply size={14} /> Reply
                                    </button>
                                    <button className={styles.emailActionBtn} onClick={() => { setShowForward(true); setComposeData({ to: '', subject: `Fwd: ${selectedMessage.subject}`, body: selectedMessage.text }); }}>
                                        <Forward size={14} /> Forward
                                    </button>
                                </div>
                            </div>
                            <div className={styles.emailBody} dangerouslySetInnerHTML={{ __html: selectedMessage.html || selectedMessage.text }} />
                        </div>
                    ) : (
                        <div className={styles.placeholder}><p>Select a message to read</p></div>
                    )}
                </div>
            </div>

            {/* Compose / Reply / Forward Modal */}
            {(showCompose || showReply || showForward) && (
                <div className={styles.modalOverlay} onClick={() => { setShowCompose(false); setShowReply(false); setShowForward(false); }}>
                    <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
                        <div className={styles.modalHeader}>
                            <h3>{showReply ? 'Reply' : showForward ? 'Forward' : 'Compose'}</h3>
                            <button className={styles.modalClose} onClick={() => { setShowCompose(false); setShowReply(false); setShowForward(false); }}><X size={18} /></button>
                        </div>
                        <div className={styles.modalBody}>
                            {/* Success State */}
                            {sendStatus === 'Sent!' ? (
                                <div className={styles.successState}>
                                    <LottiePlayer animationData={mailSentAnim} style={{ width: 150, height: 150 }} loop={false} />
                                    <p>Sent Successfully!</p>
                                </div>
                            ) : (
                                <>
                                    <div className={styles.modalField}><label>From</label><input type="text" value={emailAddress} disabled className={styles.modalInput} /></div>
                                    <div className={styles.modalField}><label>To</label><input type="text" value={composeData.to} onChange={(e) => setComposeData({ ...composeData, to: e.target.value })} className={styles.modalInput} placeholder="recipient@example.com" /></div>
                                    <div className={styles.modalField}><label>Subject</label><input type="text" value={composeData.subject} onChange={(e) => setComposeData({ ...composeData, subject: e.target.value })} className={styles.modalInput} placeholder="Subject" /></div>
                                    <div className={styles.modalField}>
                                        <label>Message</label>
                                        <textarea value={composeData.body} onChange={(e) => setComposeData({ ...composeData, body: e.target.value })} className={styles.modalTextarea} placeholder="Write your message..." rows={6} />
                                    </div>

                                    {/* Attachment Section */}
                                    <div className={styles.modalField}>
                                        <label>Attachments</label>
                                        <div className={styles.attachmentArea}>
                                            <input
                                                type="file"
                                                multiple
                                                ref={fileInputRef}
                                                onChange={handleFileChange}
                                                className={styles.fileInput}
                                                style={{ display: 'none' }}
                                            />
                                            <button className={styles.attachBtn} onClick={() => fileInputRef.current?.click()}>
                                                <Paperclip size={14} /> Attach Files
                                            </button>
                                            <span className={styles.attachHint}>Max 25MB total</span>
                                        </div>
                                        {attachments.length > 0 && (
                                            <div className={styles.attachmentList}>
                                                {attachments.map((file, i) => (
                                                    <div key={i} className={styles.attachmentItem}>
                                                        <span className={styles.truncName}>{file.name}</span>
                                                        <span className={styles.fileSize}>({(file.size / 1024).toFixed(1)} KB)</span>
                                                        <button onClick={() => removeAttachment(i)} className={styles.removeAttach}><X size={12} /></button>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </>
                            )}
                        </div>
                        {sendStatus !== 'Sent!' && (
                            <div className={styles.modalFooter}>
                                {sendStatus && (
                                    <div className={styles.statusContainer}>
                                        <span className={styles.sendStatus}>{sendStatus}</span>
                                        {uploadProgress > 0 && uploadProgress < 100 && (
                                            <div className={styles.progressBar}>
                                                <div className={styles.progressFill} style={{ width: `${uploadProgress}%` }}></div>
                                                <span className={styles.progressText}>{uploadProgress}%</span>
                                            </div>
                                        )}
                                    </div>
                                )}
                                <button className={styles.sendBtn} onClick={() => handleSend(showReply ? 'reply' : showForward ? 'forward' : 'compose', composeData.to, composeData.subject, composeData.body, showReply ? selectedMessage?._id : undefined)} disabled={!!sendStatus}>
                                    <Send size={16} /> Send
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default MailBox;
