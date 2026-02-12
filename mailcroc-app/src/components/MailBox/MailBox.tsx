"use client";
import React, { useState, useEffect, useCallback, useRef } from 'react';
import styles from './MailBox.module.css';
import { Copy, RefreshCw, Mail, Shuffle, Star, Send, Forward, Clock, Plus, X, Reply, MoreVertical, Trash2, CheckCircle, FileText, Paperclip, Menu, Download, Inbox, Send as SendIcon, Trash, Archive, User, LayoutGrid, ChevronLeft, ChevronRight, AlertTriangle, ShieldAlert, Sparkles, Settings, Volume2, Square, Mic, QrCode } from 'lucide-react';
import { io, Socket } from 'socket.io-client';
import { generateEmailAddress, type GenerationMode } from '@/lib/domains';
import LottiePlayer from '@/components/LottiePlayer';
import { useToast } from '@/components/Toast/ToastContext';
import { useSearchParams, useRouter } from 'next/navigation';
import { QRCodeSVG } from 'qrcode.react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeSanitize from 'rehype-sanitize';
import { AILogo } from '../Icons/AILogo';
import { TypewriterMarkdown } from '../Typewriter/TypewriterMarkdown';
import ConfirmationModal from '@/components/Modal/ConfirmationModal';

// Animations
import mailRefreshAnim from '../../../public/animations/mailrefresh.json';
import noMsgAnim from '../../../public/animations/nomesage_inbox.json';
import mailSentAnim from '../../../public/animations/Email_sent.json';
import sessionExpAnim from '../../../public/animations/sessionexpire.json';
import newMsgAnim from '../../../public/animations/Mailbox.json';

// Types
interface EmailMessage {
    _id: string;
    from: string;
    to: string[] | string;
    subject: string;
    receivedAt: string;
    text: string;
    html: string;
    pinned?: boolean;
    read?: boolean;
    folder?: 'inbox' | 'sent' | 'trash' | 'drafts' | 'spam';
    category?: 'social' | 'updates' | 'promotions' | 'primary';
    isThreat?: boolean;
    aiAnalysis?: string;
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
    const searchParams = useSearchParams();
    const router = useRouter();
    const { addToast } = useToast();

    // --- State: Identity & Config ---
    const [inboxTabs, setInboxTabs] = useState<InboxTab[]>([]);
    const [activeTabIndex, setActiveTabIndex] = useState(0);
    const [toggles, setToggles] = useState({ standard: true, plus: true, dot: true, gmail: true, googlemail: true });
    const [isCustomMode, setIsCustomMode] = useState(false);
    const [customInput, setCustomInput] = useState('');
    const [selectedDomain, setSelectedDomain] = useState('mailcroc.qzz.io');
    const [currentConfig, setCurrentConfig] = useState<{ mode: GenerationMode; address: string; fullAddress?: string; } | null>(null);

    // --- State: Layout & Nav ---
    const [activeFolder, setActiveFolder] = useState<'inbox' | 'sent' | 'trash' | 'drafts' | 'spam'>('inbox');
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(true); // Default collapsed
    const [showIdentitySettings, setShowIdentitySettings] = useState(false);

    // --- State: Content ---
    const [messages, setMessages] = useState<EmailMessage[]>([]);
    const [selectedMessage, setSelectedMessage] = useState<EmailMessage | null>(null);
    const [isConnected, setIsConnected] = useState(false);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [isSessionExpired, setIsSessionExpired] = useState(false);

    // --- State: Actions ---
    const [copied, setCopied] = useState(false);
    const [showQR, setShowQR] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [emailToDelete, setEmailToDelete] = useState<string | null>(null);

    // --- State: Compose / Reply ---
    const [showDockedCompose, setShowDockedCompose] = useState(false);
    const [composeData, setComposeData] = useState({ to: '', subject: '', body: '' });
    const [attachments, setAttachments] = useState<Attachment[]>([]);
    const [sendStatus, setSendStatus] = useState<string | null>(null);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [isInlineReplying, setIsInlineReplying] = useState(false);

    // --- State: AI ---
    const [summary, setSummary] = useState<string | null>(null);
    const [isSummarizing, setIsSummarizing] = useState(false);
    const [aiDraftPrompt, setAiDraftPrompt] = useState('');
    const [isAiDrafting, setIsAiDrafting] = useState(false);
    const [voiceGender, setVoiceGender] = useState<'female' | 'male'>('female');
    const [exportFormat, setExportFormat] = useState<'md' | 'json'>('md');
    const [showAiDraftInput, setShowAiDraftInput] = useState(false);
    const [showAiSidePanel, setShowAiSidePanel] = useState(false);

    // --- Refs ---
    const fileInputRef = useRef<HTMLInputElement>(null);
    const expiryTimerRef = useRef<NodeJS.Timeout | null>(null);
    const deferredPrompt = useRef<any>(null);

    // --- State: Timer & Expiry ---
    const [expiryMinutes, setExpiryMinutes] = useState<number | null>(10);
    const [remainingSeconds, setRemainingSeconds] = useState<number | null>(600);
    const [showTimeDropdown, setShowTimeDropdown] = useState(false);
    const timeDropdownRef = useRef<HTMLDivElement>(null);

    // --- State: Export Dropdown ---
    const [showExportDropdown, setShowExportDropdown] = useState(false);
    const exportDropdownRef = useRef<HTMLDivElement>(null);

    // Click outside handler for dropdowns
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (timeDropdownRef.current && !timeDropdownRef.current.contains(event.target as Node)) {
                setShowTimeDropdown(false);
            }
            if (exportDropdownRef.current && !exportDropdownRef.current.contains(event.target as Node)) {
                setShowExportDropdown(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        // Real-time Countdown (Seconds)
        if (expiryMinutes !== null && expiryMinutes > 0) {
            // Only reset seconds if it's a fresh start or mode change, 
            // but we want to avoid resetting on every render.
            // Logic handled by handleTimeSelect.

            // If remainingSeconds is null (first load), init it
            if (remainingSeconds === null) setRemainingSeconds(expiryMinutes * 60);

            expiryTimerRef.current = setInterval(() => {
                setRemainingSeconds(prev => {
                    if (prev === null) return null;
                    if (prev <= 1) {
                        clearInterval(expiryTimerRef.current!);
                        setIsSessionExpired(true);
                        setExpiryMinutes(0); // Stop
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
        } else if (expiryMinutes === null) {
            setRemainingSeconds(null);
            if (expiryTimerRef.current) clearInterval(expiryTimerRef.current);
        }
        return () => { if (expiryTimerRef.current) clearInterval(expiryTimerRef.current); };
    }, [expiryMinutes]); // Dependency on seconds removed to avoid re-triggering interval

    const handleTimeSelect = (minutes: number | null) => {
        setExpiryMinutes(minutes);
        if (minutes !== null) {
            setRemainingSeconds(minutes === 0.16 ? 10 : minutes * 60); // Special handling for 10s test (0.16 min approx)
            setIsSessionExpired(false);
        } else {
            setRemainingSeconds(null);
        }
        setShowTimeDropdown(false);
    };

    const handleExtendSession = () => {
        const addedTime = 10; // Add 10 mins
        setExpiryMinutes(addedTime);
        setRemainingSeconds(addedTime * 60);
        setIsSessionExpired(false);
    };

    const formatTime = (seconds: number) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m}:${s < 10 ? '0' : ''}${s}`;
    };

    const handleExportInbox = (format: 'md' | 'json') => {
        if (format === 'json') {
            const dataStr = JSON.stringify(messages, null, 2);
            const blob = new Blob([dataStr], { type: "application/json" });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `inbox_export_${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            addToast("Inbox exported to JSON", "success");
        } else {
            let mdContent = `# Inbox Export - ${new Date().toLocaleString()}\n\n`;
            mdContent += `Total Messages: ${messages.length}\n\n`;
            mdContent += `---\n\n`;

            messages.forEach((msg, index) => {
                mdContent += `## ${index + 1}. ${msg.subject || '(No Subject)'}\n`;
                mdContent += `**From:** ${msg.from}\n`;
                mdContent += `**Date:** ${new Date(msg.receivedAt).toLocaleString()}\n`;
                mdContent += `**Folder:** ${msg.folder}\n\n`;
                mdContent += `${msg.text || '(No Content)'}\n\n`;
                mdContent += `---\n\n`;
            });

            const blob = new Blob([mdContent], { type: "text/markdown" });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `inbox_export_${new Date().toISOString().split('T')[0]}.md`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            addToast("Inbox exported to Markdown", "success");
        }
    };

    const handleExportPDF = async () => {
        if (!selectedMessage) return;

        try {
            const element = document.getElementById('email-content-export');
            if (!element) {
                addToast("Could not find email content", "error");
                return;
            }

            // Dynamically import to avoid server-side issues
            const html2canvas = (await import('html2canvas')).default;
            const jsPDF = (await import('jspdf')).default;

            addToast("Generating PDF...", "info");

            const canvas = await html2canvas(element, {
                scale: 2,
                logging: false,
                useCORS: true // Important for images
            });

            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF({
                orientation: 'portrait',
                unit: 'px',
                format: [canvas.width, canvas.height] // Match content size
            });

            pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);

            // Add metadata links if possible (basic implementation)
            // Note: complex link preservation in html2canvas -> jsPDF is tricky.
            // A better approach for text-heavy emails is arguably 'html2pdf.js' or server-side.
            // For now, this captures the visual representation perfectly.

            pdf.save(`${selectedMessage.subject.replace(/[^a-z0-9]/gi, '_').slice(0, 30) || 'email'}.pdf`);
            addToast("PDF Downloaded", "success");

        } catch (error) {
            console.error("PDF Export Error:", error);
            addToast("Failed to generate PDF", "error");
        }
    };

    // --- PWA Install Listener ---
    useEffect(() => {
        // Check global first
        if ((window as any).deferredPrompt) {
            deferredPrompt.current = (window as any).deferredPrompt;
        }

        const handler = (e: any) => {
            e.preventDefault();
            deferredPrompt.current = e;
            (window as any).deferredPrompt = e; // Share globally
        };
        window.addEventListener('beforeinstallprompt', handler);
        return () => window.removeEventListener('beforeinstallprompt', handler);
    }, []);

    const handleDownloadApp = async () => {
        const promptEvent = deferredPrompt.current || (window as any).deferredPrompt;
        if (promptEvent) {
            promptEvent.prompt();
            const { outcome } = await promptEvent.userChoice;
            if (outcome === 'accepted') {
                deferredPrompt.current = null;
                (window as any).deferredPrompt = null;
            }
        } else {
            addToast("To install: settings > Add to Home Screen (Mobile) or Install in address bar (Desktop)", "info");
        }
    };

    // --- Identity Logic ---
    const generateNewIdentity = useCallback(() => {
        if (expiryTimerRef.current) clearTimeout(expiryTimerRef.current);
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
        setExpiryMinutes(10); // Reset to default 10m
        return config;
    }, [toggles]);

    const handleCustomSet = () => {
        if (!customInput) return;

        // Validation
        if (customInput.length < 3) {
            addToast("Username too short (min 3 chars)", "error");
            return;
        }
        if (!/^[a-zA-Z0-9._+-]+$/.test(customInput)) {
            addToast("Only letters, numbers, dot, dash, underscore, and + allowed", "error");
            return;
        }

        const fullAddress = `${customInput}@${selectedDomain}`;

        // Availability Check (Mock + Reserved List)
        const forbidden = ['admin', 'root', 'support', 'abuse', 'postmaster', 'hostmaster', 'webmaster'];
        if (forbidden.includes(customInput.toLowerCase())) {
            addToast(`'${customInput}' is reserved/unavailable.`, "error");
            return;
        }

        const config = { mode: 'custom' as any, address: fullAddress, fullAddress: fullAddress };
        setCurrentConfig(config);
        localStorage.setItem('mailcroc_config', JSON.stringify(config));
        setMessages([]);
        setSelectedMessage(null);
        // setIsSessionExpired(false); // Reset session? Maybe.

        addToast(`Identity set to ${fullAddress}`, "success");
    };

    // Initial Load
    useEffect(() => {
        const init = () => {
            const queryAddress = searchParams?.get('address');
            if (queryAddress && queryAddress.includes('@')) {
                const config = { mode: 'standard' as GenerationMode, address: queryAddress, fullAddress: queryAddress };
                setCurrentConfig(config);
                localStorage.setItem('mailcroc_config', JSON.stringify(config));
                router.replace('/', { scroll: false });
            } else {
                const stored = localStorage.getItem('mailcroc_config');
                const expiryPref = localStorage.getItem('mailcroc_expiry_pref');

                // Only restore if user explicitly set "No Expiry"
                if (stored && expiryPref === 'no-expiry') {
                    try {
                        setCurrentConfig(JSON.parse(stored));
                        setExpiryMinutes(null);
                    } catch { generateNewIdentity(); }
                } else {
                    // Otherwise force new identity
                    generateNewIdentity();
                }
            }
        };
        init();
    }, []);

    // Persist Expiry Preference
    useEffect(() => {
        if (expiryMinutes === null) {
            localStorage.setItem('mailcroc_expiry_pref', 'no-expiry');
        } else {
            localStorage.removeItem('mailcroc_expiry_pref');
        }
    }, [expiryMinutes]);

    const emailAddress = currentConfig?.address || '';

    // --- Fetch Logic ---
    const fetchMessages = useCallback(async () => {
        if (!emailAddress) return;
        setIsRefreshing(true);
        try {
            const res = await fetch(`/api/emails?address=${encodeURIComponent(emailAddress)}`, { headers: { 'x-api-key': 'public_beta_key_v1' } });
            if (res.ok) {
                const data = await res.json();

                // AI ANALYSIS (Backend + Local Fallback)
                const enhancedData = data.map((msg: EmailMessage) => {
                    // Prefer backend data
                    if (msg.category && msg.isThreat !== undefined) {
                        return msg;
                    }

                    // Fallback for legacy emails without AI metadata
                    let category: any = 'primary';
                    let isThreat = false;
                    const lowerSub = msg.subject.toLowerCase();
                    const lowerFrom = msg.from.toLowerCase();

                    if (lowerSub.includes('alert') || lowerSub.includes('verify') || lowerSub.includes('urgent')) isThreat = true;
                    if (lowerFrom.includes('facebook') || lowerFrom.includes('twitter') || lowerFrom.includes('linkedin')) category = 'social';
                    if (lowerSub.includes('update') || lowerFrom.includes('noreply')) category = 'updates';

                    return { ...msg, category, isThreat };
                });

                setMessages(enhancedData);
            }
        } catch (err) { console.error(err); }
        finally { setIsRefreshing(false); }
    }, [emailAddress]);

    useEffect(() => { if (emailAddress) fetchMessages(); }, [emailAddress, fetchMessages]);

    // --- Socket Logic ---
    useEffect(() => {
        const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL;
        if (!socketUrl) return;
        if (!socket) {
            socket = io(socketUrl);
            socket.on('connect', () => setIsConnected(true));
            socket.on('disconnect', () => setIsConnected(false));
        }
        if (emailAddress && socket) {
            socket.emit('join', emailAddress);
            const handleNewEmail = (newMsg: any) => {
                // strict filter: ensure message is for this address
                const toAddresses = Array.isArray(newMsg.to) ? newMsg.to : [newMsg.to];
                if (!toAddresses.some((addr: string) => addr.toLowerCase() === emailAddress.toLowerCase())) return;

                setMessages(prev => {
                    if (prev.some(m => m._id === newMsg._id)) return prev;
                    try { new Audio('/animations/notification.wav').play().catch(() => { }); } catch { }
                    // Auto-analyze new message
                    const lowerSub = newMsg.subject.toLowerCase();
                    const isThreat = lowerSub.includes('verify') || lowerSub.includes('urgent');
                    return [{ ...newMsg, isThreat, category: 'primary' }, ...prev];
                });
            };
            socket.on('new_email', handleNewEmail);
            return () => { socket?.off('new_email', handleNewEmail); socket?.emit('leave', emailAddress); };
        }
    }, [emailAddress]);

    // --- Actions ---
    const copyToClipboard = () => {
        navigator.clipboard.writeText(emailAddress);
        setCopied(true);
        addToast("Address copied to clipboard!", "success");
        setTimeout(() => setCopied(false), 1500);
    };

    const handleSend = async () => {
        if (!composeData.to || !composeData.subject) { addToast("Recipient and subject required", "error"); return; }
        setSendStatus('Sending...');
        setUploadProgress(0);
        try {
            const interval = setInterval(() => {
                setUploadProgress(p => p < 90 ? p + 10 : p);
            }, 100);

            const res = await fetch('/api/emails/send', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'compose',
                    from: emailAddress,
                    to: composeData.to,
                    subject: composeData.subject,
                    body: composeData.body,
                    attachments
                })
            });
            clearInterval(interval);
            setUploadProgress(100);

            if (res.ok) {
                setSendStatus('Sent!');
                setMessages(prev => [{
                    _id: `sent-temp-${Date.now()}`,
                    from: emailAddress,
                    to: composeData.to,
                    subject: composeData.subject,
                    receivedAt: new Date().toISOString(),
                    text: composeData.body,
                    html: composeData.body,
                    folder: 'sent',
                    pinned: false,
                    read: true
                } as any, ...prev]);

                setTimeout(() => {
                    setSendStatus(null);
                    setShowDockedCompose(false);
                    setComposeData({ to: '', subject: '', body: '' });
                    setAttachments([]);
                }, 1000);
            } else {
                setSendStatus('Failed');
            }
        } catch {
            setSendStatus('Error');
        }
    };

    // --- Speech Logic ---
    const [isPlayingAudio, setIsPlayingAudio] = useState(false);
    const audioRef = useRef<HTMLAudioElement | null>(null);

    const handleReadAloud = async () => {
        if (!selectedMessage || isPlayingAudio) return;
        setIsPlayingAudio(true);
        try {
            // Prefer text content, fallback to subject
            const textToRead = selectedMessage.text || selectedMessage.subject;

            const res = await fetch('/api/ai/speech', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text: textToRead.slice(0, 800), gender: voiceGender }) // Limit length & pass gender
            });

            if (!res.ok) throw new Error("Speech generation failed");

            const blob = await res.blob();
            const url = URL.createObjectURL(blob);
            const audio = new Audio(url);
            audioRef.current = audio;

            audio.onended = () => setIsPlayingAudio(false);
            audio.play();
        } catch (err) {
            console.error(err);
            addToast("Failed to read email aloud", "error");
            setIsPlayingAudio(false);
        }
    };




    const stopReadAloud = () => {
        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current = null;
        }
        setIsPlayingAudio(false);
    };

    // --- Actions: Pin & Delete ---
    const handlePinMessage = async (e: React.MouseEvent, msg: EmailMessage) => {
        e.stopPropagation();
        // Optimistic update
        setMessages(prev => prev.map(m => m._id === msg._id ? { ...m, pinned: !m.pinned } : m));

        try {
            await fetch('/api/emails', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', 'x-api-key': 'public_beta_key_v1' },
                body: JSON.stringify({ emailId: msg._id, action: 'pin', value: !msg.pinned })
            });
        } catch {
            addToast("Failed to update pin status", "error");
            // Revert on error
            setMessages(prev => prev.map(m => m._id === msg._id ? { ...m, pinned: !m.pinned } : m));
        }
    };

    const handleDeleteMessage = async (e: React.MouseEvent, msg: EmailMessage) => {
        e.stopPropagation();
        // Optimistic Remove
        setMessages(prev => prev.filter(m => m._id !== msg._id));
        if (selectedMessage?._id === msg._id) setSelectedMessage(null);

        try {
            await fetch('/api/emails', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json', 'x-api-key': 'public_beta_key_v1' },
                body: JSON.stringify({ emailId: msg._id, address: emailAddress })
            });
            addToast("Email deleted", "success");
        } catch {
            addToast("Failed to delete email", "error");
            fetchMessages(); // Re-sync on error
        }
    };

    const handleForward = () => {
        if (!selectedMessage) return;
        setComposeData({
            to: '',
            subject: `Fwd: ${selectedMessage.subject}`,
            body: `\n\n---------- Forwarded message ---------\nFrom: ${selectedMessage.from}\nDate: ${new Date(selectedMessage.receivedAt).toLocaleString()}\nSubject: ${selectedMessage.subject}\n\n${selectedMessage.text || ''}`
        });
        setShowDockedCompose(true);
    };



    const saveDraft = async () => {
        const draftMsg = {
            _id: `draft-${Date.now()}`,
            from: emailAddress,
            to: composeData.to || 'Draft',
            subject: composeData.subject || '(No Subject)',
            receivedAt: new Date().toISOString(),
            text: composeData.body,
            html: composeData.body,
            folder: 'drafts',
            pinned: false,
            read: true
        };

        setMessages(prev => [draftMsg as any, ...prev]);
        setShowDockedCompose(false);
        setComposeData({ to: '', subject: '', body: '' });

        try {
            await fetch('/api/emails', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'x-api-key': 'public_beta_key_v1' },
                body: JSON.stringify({
                    from: emailAddress,
                    to: [draftMsg.to],
                    subject: draftMsg.subject,
                    text: draftMsg.text,
                    html: draftMsg.html,
                    folder: 'drafts',
                    pinned: false,
                    messageId: draftMsg._id
                })
            });
            addToast("Draft saved to cloud", "success");
        } catch {
            addToast("Draft saved locally (sync failed)", "warning");
        }
    };

    // Filtered Messages
    const filteredMessages = messages.filter(msg => {
        const targetFolder = activeFolder || 'inbox';

        if (targetFolder === 'inbox') {
            return (!msg.folder || msg.folder === 'inbox') && msg.from !== emailAddress;
        }
        if (targetFolder === 'sent') {
            return msg.folder === 'sent' || msg.from === emailAddress;
        }
        return msg.folder === targetFolder;
    });

    const getInitials = (s: string) => s ? s.slice(0, 2).toUpperCase() : '??';
    const getAvatarColor = (s: string) => {
        const colors = ['#ef4444', '#f97316', '#f59e0b', '#84cc16', '#10b981', '#06b6d4', '#3b82f6', '#6366f1'];
        return colors[(s || '').length % colors.length];
    };

    const processHtml = (html: string) => {
        if (!html) return '';
        if (html.includes('<')) return html;
        return html.replace(/(https?:\/\/[^\s]+)/g, '<a href="$1" target="_blank" style="color:blue">$1</a>').replace(/\n/g, '<br/>');
    };

    return (
        <div className={styles.container}>
            <div className={styles.layout}>
                {/* SIDEBAR */}
                <div className={`${styles.sidebar} ${isSidebarCollapsed ? styles.collapsed : ''} ${mobileMenuOpen ? styles.open : ''}`}>
                    <div className={styles.sidebarHeader}>
                        <button className={styles.hamburgerBtn} onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}>
                            <Menu size={20} />
                        </button>
                    </div>

                    <button className={`${styles.composeBtnLarge} ${isSidebarCollapsed ? styles.iconOnly : ''}`} onClick={() => { setShowDockedCompose(true); setMobileMenuOpen(false); }}>
                        <Plus size={20} className="text-green-500" />
                        {!isSidebarCollapsed && <span>Compose</span>}
                    </button>

                    <div className={styles.navSection}>
                        <div className={`${styles.navItem} ${activeFolder === 'inbox' ? styles.navItemActive : ''}`} onClick={() => setActiveFolder('inbox')} title="Inbox">
                            <div className={styles.navItemIcon}><Inbox size={18} /> {!isSidebarCollapsed && 'Inbox'}</div>
                            {!isSidebarCollapsed && filteredMessages.length > 0 && activeFolder === 'inbox' && <span className={styles.badge}>{filteredMessages.filter(m => !m.read).length || filteredMessages.length}</span>}
                        </div>
                        <div className={`${styles.navItem} ${activeFolder === 'sent' ? styles.navItemActive : ''}`} onClick={() => setActiveFolder('sent')} title="Sent">
                            <div className={styles.navItemIcon}><SendIcon size={18} /> {!isSidebarCollapsed && 'Sent'}</div>
                        </div>
                        <div className={`${styles.navItem} ${activeFolder === 'drafts' ? styles.navItemActive : ''}`} onClick={() => setActiveFolder('drafts')} title="Drafts">
                            <div className={styles.navItemIcon}><FileText size={18} /> {!isSidebarCollapsed && 'Drafts'}</div>
                        </div>
                        <div className={`${styles.navItem} ${activeFolder === 'trash' ? styles.navItemActive : ''}`} onClick={() => setActiveFolder('trash')} title="Trash">
                            <div className={styles.navItemIcon}><Trash size={18} /> {!isSidebarCollapsed && 'Trash'}</div>
                        </div>
                    </div>

                    <div className={styles.divider} />

                    <div className={styles.navSection}>
                        {!isSidebarCollapsed && <h4 className={styles.navTitle}>Identity Settings</h4>}
                        <div className={styles.navItem} onClick={() => setShowIdentitySettings(!showIdentitySettings)} title="Settings">
                            <div className={styles.navItemIcon}><Settings size={18} /> {!isSidebarCollapsed && 'Configure ID'}</div>
                        </div>

                        {showIdentitySettings && !isSidebarCollapsed && (
                            <div className={styles.identityControls}>
                                <label><input type="checkbox" checked={toggles.standard} onChange={() => setToggles({ ...toggles, standard: !toggles.standard })} /> Standard</label>
                                <label><input type="checkbox" checked={toggles.plus} onChange={() => setToggles({ ...toggles, plus: !toggles.plus })} /> +Tag</label>
                                <label><input type="checkbox" checked={toggles.dot} onChange={() => setToggles({ ...toggles, dot: !toggles.dot })} /> Dot</label>
                            </div>
                        )}
                    </div>

                    {/* DOWNLOAD BUTTON */}
                    {!isSidebarCollapsed && (
                        <div className={styles.downloadWrapper}>
                            <div className={styles.downloadBtn} onClick={handleDownloadApp}>
                                <div className={styles.downloadBtnIcon}>
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 35 35" className={styles.downloadSvg}><path d="M17.5,22.131a1.249,1.249,0,0,1-1.25-1.25V2.187a1.25,1.25,0,0,1,2.5,0V20.881A1.25,1.25,0,0,1,17.5,22.131Z" /><path d="M17.5,22.693a3.189,3.189,0,0,1-2.262-.936L8.487,15.006a1.249,1.249,0,0,1,1.767-1.767l6.751,6.751a.7.7,0,0,0,.99,0l6.751-6.751a1.25,1.25,0,0,1,1.768,1.767l-6.752,6.751A3.191,3.191,0,0,1,17.5,22.693Z" /><path d="M31.436,34.063H3.564A3.318,3.318,0,0,1,.25,30.749V22.011a1.25,1.25,0,0,1,2.5,0v8.738a.815.815,0,0,0,.814.814H31.436a.815.815,0,0,0,.814-.814V22.011a1.25,1.25,0,1,1,2.5,0v8.738A3.318,3.318,0,0,1,31.436,34.063Z" /></svg>
                                </div>
                                <span className={styles.downloadBtnText}>Get App</span>
                            </div>
                        </div>
                    )}
                </div>

                {/* MAIN CONTENT */}
                <div className={styles.mainContent}>
                    {/* Identity Generator Header */}
                    <div className={styles.identityHeader}>
                        {/* Row 1: Address & Stats */}
                        <div className={styles.idTopRow}>
                            <div className={styles.addressContainer}>
                                { /* Removed redundant hamburger here */}
                                <h2 className={styles.currentEmail}>{emailAddress}</h2>
                                <button className={styles.copyBtn} onClick={copyToClipboard}><Copy size={18} /></button>
                                <button className={styles.copyBtn} onClick={() => setShowQR(true)} title="Show QR"><QrCode size={18} /></button>
                                <span className={styles.statusDot} title="Active" />
                            </div>

                            <div className={styles.headerControls}>
                                {/* Export Dropdown */}
                                <div className={styles.expiryWrapper} ref={exportDropdownRef} style={{ marginRight: '0.5rem' }}>
                                    <div
                                        className={styles.expiryBadge}
                                        onClick={() => setShowExportDropdown(!showExportDropdown)}
                                        title="Export Inbox"
                                        style={{ padding: '0.375rem 0.5rem' }}
                                    >
                                        <Download size={16} />
                                        <span style={{ fontSize: '0.8rem' }}>Export</span>
                                        <ChevronRight size={14} style={{ rotate: '90deg', transition: 'transform 0.2s', transform: showExportDropdown ? 'rotate(-90deg)' : 'rotate(90deg)' }} />
                                    </div>

                                    {showExportDropdown && (
                                        <div className={styles.timeDropdown} style={{ minWidth: '140px' }}>
                                            <div className={styles.timeOption} onClick={() => { handleExportInbox('md'); setShowExportDropdown(false); }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    <FileText size={16} className="text-blue-500" />
                                                    <span>Markdown</span>
                                                </div>
                                            </div>
                                            <div className={styles.timeOption} onClick={() => { handleExportInbox('json'); setShowExportDropdown(false); }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    <div style={{ width: 16, height: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '10px', border: '1px solid currentColor', borderRadius: '3px' }} className="text-yellow-500">
                                                        {'{ }'}
                                                    </div>
                                                    <span>JSON</span>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                                <div className={styles.expiryWrapper} ref={timeDropdownRef}>
                                    <div
                                        className={styles.expiryBadge}
                                        onClick={() => setShowTimeDropdown(!showTimeDropdown)}
                                        title="Set Session Timer"
                                    >
                                        <Clock size={16} />
                                        <span>{remainingSeconds !== null ? `${formatTime(remainingSeconds)}` : 'No Expiry'}</span>
                                        <ChevronRight size={14} style={{ rotate: '90deg', transition: 'transform 0.2s', transform: showTimeDropdown ? 'rotate(-90deg)' : 'rotate(90deg)' }} />
                                    </div>

                                    {showTimeDropdown && (
                                        <div className={styles.timeDropdown}>
                                            <div className={styles.timeOption} onClick={() => handleTimeSelect(10)}>10 Minutes</div>
                                            <div className={styles.timeOption} onClick={() => handleTimeSelect(30)}>30 Minutes</div>
                                            <div className={styles.timeOption} onClick={() => handleTimeSelect(60)}>1 Hour</div>
                                            <div className={styles.timeOption} onClick={() => handleTimeSelect(null)}>No Expiry</div>
                                        </div>
                                    )}
                                </div>
                                <button onClick={() => setShowAiSidePanel(!showAiSidePanel)} className={styles.aiTrigger} title="AI Assistant">
                                    <AILogo size={24} />
                                </button>
                            </div>
                        </div>

                        {/* Row 2: Toggles */}
                        <div className={styles.idTogglesRow}>
                            <label className={styles.toggleSwitch}>
                                <input type="checkbox" checked={toggles.standard} onChange={() => setToggles({ ...toggles, standard: !toggles.standard })} />
                                <span className={styles.toggleSlider} />
                                <span className={styles.toggleLabel}>Domain</span>
                            </label>
                            <label className={styles.toggleSwitch}>
                                <input type="checkbox" checked={toggles.plus} onChange={() => setToggles({ ...toggles, plus: !toggles.plus })} />
                                <span className={styles.toggleSlider} />
                                <span className={styles.toggleLabel}>+Gmail</span>
                            </label>
                            <label className={styles.toggleSwitch}>
                                <input type="checkbox" checked={toggles.dot} onChange={() => setToggles({ ...toggles, dot: !toggles.dot })} />
                                <span className={styles.toggleSlider} />
                                <span className={styles.toggleLabel}>.Gmail</span>
                            </label>
                            <label className={styles.toggleSwitch}>
                                <input type="checkbox" checked={toggles.googlemail} onChange={() => setToggles({ ...toggles, googlemail: !toggles.googlemail })} />
                                <span className={styles.toggleSlider} />
                                <span className={styles.toggleLabel}>GoogleMail</span>
                            </label>
                            <label className={styles.toggleSwitch}>
                                <input type="checkbox" checked={isCustomMode} onChange={() => setIsCustomMode(!isCustomMode)} />
                                <span className={`${styles.toggleSlider} ${styles.graySlider}`} />
                                <span className={styles.toggleLabel}>Custom</span>
                            </label>
                        </div>

                        {/* CUSTOM INPUT UI */}
                        {isCustomMode && (
                            <div className={styles.customInputRow}>
                                <input
                                    className={styles.customInput}
                                    placeholder="Enter username"
                                    value={customInput}
                                    onChange={e => setCustomInput(e.target.value)}
                                    maxLength={25}
                                />
                                <span className={styles.domainSuffix}>@</span>
                                <select
                                    className={styles.domainSelect}
                                    value={selectedDomain}
                                    onChange={(e) => setSelectedDomain(e.target.value)}
                                >
                                    <option value="mailcroc.qzz.io">mailcroc.qzz.io</option>
                                    <option value="mailpanda.qzz.io">mailpanda.qzz.io</option>
                                    <option value="gmail.com">gmail.com</option>
                                    <option value="googlemail.com">googlemail.com</option>
                                </select>
                                <button className={styles.actionBtnPrimary} onClick={handleCustomSet}>Set</button>
                            </div>
                        )}

                        {/* Row 3: Action Buttons */}
                        <div className={styles.idActionsRow}>
                            <button className={styles.actionBtn} onClick={fetchMessages} disabled={isRefreshing}>
                                <RefreshCw size={16} className={isRefreshing ? "animate-spin" : ""} /> Refresh
                            </button>
                            <button className={styles.actionBtnPrimary} onClick={generateNewIdentity}>
                                <Shuffle size={16} /> Generate New
                            </button>
                            <button className={styles.actionBtn} onClick={() => setShowDockedCompose(true)}>
                                <Send size={16} /> Compose
                            </button>
                            <button className={styles.actionBtn}>
                                <Plus size={16} /> Add Tab
                            </button>
                        </div>
                    </div>

                    <div className={styles.contentArea}>
                        {/* MESSAGE LIST */}
                        <div className={`${styles.messageList} ${selectedMessage ? styles.hiddenMobile : ''}`}>
                            {filteredMessages.length === 0 || isRefreshing ? (
                                <div className={styles.emptyState}>
                                    <LottiePlayer
                                        animationData={isRefreshing ? mailRefreshAnim : (activeFolder === 'sent' ? mailSentAnim : noMsgAnim)}
                                        style={{ width: isRefreshing ? 180 : 150, height: isRefreshing ? 180 : 150 }}
                                    />
                                    <p className="text-gray-500 font-medium">{isRefreshing ? 'Checking for new messages...' : (activeFolder === 'sent' ? 'No sent messages' : 'Inbox is empty')}</p>
                                </div>
                            ) : (
                                filteredMessages.map(msg => (
                                    <div key={msg._id} className={`${styles.messageItem} ${selectedMessage?._id === msg._id ? styles.active : ''} ${!msg.read ? styles.unread : ''}`} onClick={() => setSelectedMessage(msg)}>
                                        <div className={styles.avatar} style={{ backgroundColor: getAvatarColor(msg.from) }}>{getInitials(msg.from)}</div>
                                        <div className={styles.msgContent}>
                                            <div className={styles.msgHeaderRow}>
                                                <span className={styles.msgSender}>{activeFolder === 'sent' ? `To: ${msg.to}` : msg.from}</span>
                                                <div className={styles.hoverActions}>
                                                    <button onClick={(e) => handlePinMessage(e, msg)} className={`${styles.iconBtnSmall} ${msg.pinned ? 'text-yellow-500' : 'text-gray-400'}`} title={msg.pinned ? "Unpin" : "Pin"}><Star size={14} fill={msg.pinned ? "currentColor" : "none"} /></button>
                                                    <button onClick={(e) => handleDeleteMessage(e, msg)} className={styles.iconBtnSmall} title="Delete"><Trash2 size={14} /></button>
                                                </div>
                                                <span className={styles.msgDate}>{new Date(msg.receivedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                            </div>
                                            <div className={styles.msgSubjectRow}>
                                                {msg.isThreat && <ShieldAlert size={14} className="text-red-500 mr-1" />}
                                                <span className={styles.msgSubject}>{msg.subject}</span>
                                            </div>
                                            <div className={styles.msgSnippet}>{msg.text?.slice(0, 50)}...</div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>

                        {/* MESSAGE DETAIL */}
                        <div className={`${styles.messageDetail} ${!selectedMessage ? styles.hiddenMobile : ''}`}>
                            {selectedMessage ? (
                                <>
                                    <div className={styles.emailHeader}>
                                        <div className={styles.headerTop}>
                                            <button className={styles.backBtn} onClick={() => setSelectedMessage(null)}>← Back</button>
                                            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                                <button className={styles.iconBtn} onClick={handleExportPDF} title="Download as PDF">
                                                    <FileText size={18} className="text-red-500" />
                                                </button>
                                                <button onClick={handleForward} className={styles.iconBtn} title="Forward"><Forward size={18} /></button>

                                                {/* Voice Gender Toggle */}
                                                <button
                                                    className={styles.iconBtn}
                                                    onClick={() => setVoiceGender(prev => prev === 'female' ? 'male' : 'female')}
                                                    title={`Voice: ${voiceGender === 'female' ? 'Hope (Female)' : 'Mark (Male)'}`}
                                                    style={{ fontSize: '0.8rem', fontWeight: 'bold', width: '2rem' }}
                                                >
                                                    {voiceGender === 'female' ? 'F' : 'M'}
                                                </button>

                                                <button
                                                    className={styles.iconBtn}
                                                    onClick={isPlayingAudio ? stopReadAloud : handleReadAloud}
                                                    title={isPlayingAudio ? "Stop Reading" : "Read Aloud"}
                                                    style={{ color: isPlayingAudio ? '#ef4444' : '#64748b' }}>
                                                    {isPlayingAudio ? <Square size={18} fill="currentColor" /> : <Volume2 size={18} />}
                                                </button>
                                                <button onClick={(e) => selectedMessage && handleDeleteMessage(e as any, selectedMessage)} className={styles.iconBtn} title="Delete"><Trash2 size={18} /></button>
                                            </div>
                                        </div>

                                        {/* THREAT WARNING */}
                                        {selectedMessage.isThreat && (
                                            <div className={styles.threatBanner}>
                                                <AlertTriangle size={20} />
                                                <span><strong>Warning:</strong> This email seems suspicious. Do not click links or reply.</span>
                                            </div>
                                        )}

                                        <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: '1rem 0' }}>{selectedMessage.subject}</h2>
                                        <div className={styles.meta}>
                                            <span>From: <strong>{selectedMessage.from}</strong></span>
                                            <span>{new Date(selectedMessage.receivedAt).toLocaleString()}</span>
                                        </div>
                                    </div>

                                    <div id="email-content-export" className={styles.emailBody}>
                                        {/* Fixed TS Error: Wrapped in div.markdownBody */}
                                        {selectedMessage.html ? (
                                            <div dangerouslySetInnerHTML={{ __html: processHtml(selectedMessage.html) }} />
                                        ) : (
                                            <div className={styles.markdownBody}>
                                                <ReactMarkdown
                                                    remarkPlugins={[remarkGfm]}
                                                    rehypePlugins={[rehypeSanitize]}
                                                >
                                                    {selectedMessage.text}
                                                </ReactMarkdown>
                                            </div>
                                        )}
                                    </div>

                                    {/* Inline Reply */}
                                    <div className={styles.inlineReplyBox}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', color: '#64748b' }}>
                                            <Reply size={16} /> <span style={{ fontSize: '0.9rem' }}>Reply to <strong>{selectedMessage.from}</strong></span>
                                        </div>
                                        <textarea
                                            className={styles.inlineReplyTextarea}
                                            placeholder="Write your reply..."
                                            value={isInlineReplying ? composeData.body : ''}
                                            onChange={e => { setIsInlineReplying(true); setComposeData(prev => ({ ...prev, to: selectedMessage.from, subject: `Re: ${selectedMessage.subject}`, body: e.target.value })); }}
                                        />
                                        {isInlineReplying && (
                                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                                                <button className={styles.iconBtn} onClick={() => setIsInlineReplying(false)} style={{ border: 'none' }}>Discard</button>
                                                <button className={styles.actionBtnAccent} onClick={handleSend} disabled={!!sendStatus}>
                                                    <Send size={14} /> {sendStatus || 'Send'}
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </>
                            ) : (
                                <div className={styles.placeholder}>
                                    {/* AI Assistant Placeholder if selected */}
                                    {showAiSidePanel ? (
                                        <div className={styles.aiPanel}>
                                            <h3><Sparkles size={20} className="inline text-purple-500" /> AI Assistant</h3>
                                            <p>I can help summarize emails, draft replies, or detect scams.</p>
                                            <div className={styles.aiCapabilities}>
                                                <span className={styles.capChip}>Summarize Inbox</span>
                                                <span className={styles.capChip}>Find receipts</span>
                                                <span className={styles.capChip}>Draft intro</span>
                                            </div>
                                        </div>
                                    ) : (
                                        <div style={{ textAlign: 'center' }}>
                                            <Mail size={48} color="#cbd5e1" style={{ margin: '0 auto 1rem' }} />
                                            <p>Select an item to read</p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Docked Compose */}
            {showDockedCompose && (
                <div className={styles.dockedCompose}>
                    <div className={styles.dockedHeader} onClick={() => setShowDockedCompose(false)}>
                        <span>New Message</span>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <button onClick={() => setShowDockedCompose(false)}><X size={16} /></button>
                        </div>
                    </div>
                    <div className={styles.dockedBody}>
                        <input className={styles.modalInput} placeholder="To" value={composeData.to} onChange={e => setComposeData({ ...composeData, to: e.target.value })} />
                        <input className={styles.modalInput} placeholder="Subject" value={composeData.subject} onChange={e => setComposeData({ ...composeData, subject: e.target.value })} />
                        <textarea className={styles.modalTextarea} style={{ flex: 1 }} placeholder="Message..." value={composeData.body} onChange={e => setComposeData({ ...composeData, body: e.target.value })} />
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                <button className={styles.iconBtn}><Paperclip size={16} /></button>
                                <button className={styles.iconBtn} onClick={saveDraft} title="Save Draft"><FileText size={16} /></button>
                            </div>
                            <button className={styles.actionBtnAccent} onClick={handleSend} disabled={!!sendStatus}>
                                <Send size={14} /> {sendStatus || 'Send'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Confirmation */}
            <ConfirmationModal
                isOpen={showDeleteConfirm}
                onClose={() => setShowDeleteConfirm(false)}
                onConfirm={() => { /* Implement delete */ setShowDeleteConfirm(false); }}
                title="Delete Email"
                message="Are you sure?"
                confirmText="Delete"
                isDestructive
            />

            {/* QR Modal */}
            {showQR && (
                <div className={styles.modalOverlay} onClick={() => setShowQR(false)}>
                    <div className={styles.modalContent} onClick={e => e.stopPropagation()} style={{ textAlign: 'center', padding: '2rem' }}>
                        <div className={styles.modalHeader}>
                            <h3>Scan to Open</h3>
                            <button onClick={() => setShowQR(false)}><X size={20} /></button>
                        </div>
                        <div style={{ background: 'white', padding: '1rem', borderRadius: '10px', display: 'inline-block', margin: '1rem 0' }}>
                            <QRCodeSVG
                                value={`https://mailcroc.qzz.io?address=${emailAddress}`}
                                size={200}
                                level="H"
                                includeMargin={true}
                                imageSettings={{
                                    src: "/logo.png",
                                    x: undefined,
                                    y: undefined,
                                    height: 40,
                                    width: 40,
                                    excavate: true,
                                }}
                            />
                        </div>
                        <p style={{ fontSize: '0.9rem', color: '#64748b' }}>Scan this code to open your inbox on another device.</p>
                    </div>
                </div>
            )}

            {/* Session Expired Modal */}
            {isSessionExpired && (
                <div className={styles.modalOverlay}>
                    <div className={styles.modalContent} style={{ textAlign: 'center', padding: '2rem', maxWidth: '400px', position: 'relative' }}>
                        <button
                            onClick={generateNewIdentity}
                            style={{ position: 'absolute', top: '10px', right: '10px', background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}
                            title="Close & New Identity"
                        >
                            <X size={20} />
                        </button>
                        <LottiePlayer
                            animationData={sessionExpAnim}
                            style={{ width: 150, height: 150, margin: '0 auto' }}
                        />
                        <h3 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>Session Expired</h3>
                        <p style={{ color: '#64748b', marginBottom: '1.5rem' }}>This temporary inbox has expired. You can extend the session or generate a new identity.</p>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                            <button
                                className={styles.actionBtnPrimary}
                                onClick={handleExtendSession}
                                style={{ width: '100%', justifyContent: 'center', padding: '0.75rem' }}
                            >
                                <Clock size={18} /> Extend Session (+10m)
                            </button>
                            <button
                                className={styles.actionBtn}
                                onClick={generateNewIdentity}
                                style={{ width: '100%', justifyContent: 'center', padding: '0.75rem', border: '1px solid #e2e8f0' }}
                            >
                                <Shuffle size={18} /> Generate New Identity
                            </button>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
};

export default MailBox;
