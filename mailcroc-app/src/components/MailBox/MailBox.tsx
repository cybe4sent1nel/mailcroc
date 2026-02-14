"use client";
import React, { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import styles from './MailBox.module.css';
import { Copy, RefreshCw, Mail, Shuffle, Star, Send, Forward, Clock, Plus, X, Reply, MoreVertical, Trash2, CheckCircle, FileText, Paperclip, Menu, Download, Inbox, Send as SendIcon, Trash, Archive, User, LayoutGrid, ChevronLeft, ChevronRight, AlertTriangle, ShieldAlert, Sparkles, Settings, Volume2, Square, Mic, QrCode, File, FileImage, FileAudio, FileVideo, Image, Briefcase, Scissors, AlignLeft, Wand2, ShieldCheck } from 'lucide-react';
import { io, Socket } from 'socket.io-client';
import { generateEmailAddress, type GenerationConfig } from '@/lib/domains';
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
import Switch from '@/components/Switch/Switch';

// --- Dynamic Loaders (Client-Side Only) ---
const ComposeModal = dynamic(() => import('./ComposeModal'), { ssr: false });

// --- Encryption Helpers ---
const xorCipher = (text: string, key: string) => {
    return Array.from(text).map((c, i) =>
        String.fromCharCode(c.charCodeAt(0) ^ key.charCodeAt(i % key.length))
    ).join('');
};

const encrypt = (text: string, key: string) => {
    try {
        // 1. Convert Unicode to UTF-8 binary string (0-255 characters)
        const binaryString = unescape(encodeURIComponent(text));
        // 2. XOR the binary string
        const ciphered = xorCipher(binaryString, key);
        // 3. Base64 encode
        return btoa(ciphered);
    } catch {
        return "";
    }
};

const decrypt = (encoded: string, key: string) => {
    try {
        // 1. Base64 decode to binary string
        const ciphered = atob(encoded);
        // 2. XOR back to original binary string
        const binaryString = xorCipher(ciphered, key);
        // 3. Convert back to Unicode
        return decodeURIComponent(escape(binaryString));
    } catch {
        return null;
    }
};

// Helper to strip markdown
const stripMarkdown = (text: string) => {
    return text
        .replace(/\*\*(.*?)\*\*/g, '$1') // Bold
        .replace(/\*(.*?)\*/g, '$1')   // Italic
        .replace(/#(.*?)(\n|$)/g, '$1$2') // Headers
        .replace(/\[(.*?)\]\(.*?\)/g, '$1') // Links
        .replace(/`{1,3}(.*?)`{1,3}/g, '$1') // Code
        .replace(/>\s*(.*?)(\n|$)/g, '$1$2') // Blockquotes
        .trim();
};

// Animations
import mailRefreshAnim from '../../../public/animations/mailrefresh.json';
import noMsgAnim from '../../../public/animations/nomesage_inbox.json';
import mailSentAnim from '../../../public/animations/sent email.json';
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
    speechAudio?: string;
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
    const [toggles, setToggles] = useState({ standard: true, plus: true, dot: true, gmail: false, googlemail: false, hyphen: true });
    const [isCustomMode, setIsCustomMode] = useState(false);
    const [customInput, setCustomInput] = useState('');
    const [selectedDomain, setSelectedDomain] = useState('mailcroc.qzz.io');
    const [currentConfig, setCurrentConfig] = useState<{ mode: string; address: string; fullAddress?: string; } | null>(null);

    // --- Session & Isolation ---
    const [sessionId, setSessionId] = useState<string>('');

    useEffect(() => {
        let sid = localStorage.getItem('mailcroc_session_id');
        if (!sid) {
            sid = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
            localStorage.setItem('mailcroc_session_id', sid);
        }
        setSessionId(sid);
    }, []);

    const claimIdentity = async (address: string, sid: string) => {
        try {
            const res = await fetch('/api/addresses/claim', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ address, sessionId: sid })
            });
            if (!res.ok) {
                const data = await res.json();
                addToast(data.error || 'Address already in use', 'error');
                return false;
            }
            return true;
        } catch (err) {
            console.error('Claim error:', err);
            return false;
        }
    };

    // --- State: Layout & Nav ---
    const [activeFolder, setActiveFolder] = useState<'inbox' | 'sent' | 'trash' | 'drafts' | 'spam'>('inbox');
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(true); // Default collapsed
    const [showIdentitySettings, setShowIdentitySettings] = useState(false);
    const [externalIdentities, setExternalIdentities] = useState<string[]>([]);
    const [senderAddress, setSenderAddress] = useState<string>('');
    const [newExternalEmail, setNewExternalEmail] = useState('');

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
    const [showSentSuccess, setShowSentSuccess] = useState(false);

    const [uploadProgress, setUploadProgress] = useState(0);
    const [isInlineReplying, setIsInlineReplying] = useState(false);
    const [isPasswordProtected, setIsPasswordProtected] = useState(false);
    const [emailPassword, setEmailPassword] = useState('');
    const [unlockInput, setUnlockInput] = useState('');
    const [unlockedMessageId, setUnlockedMessageId] = useState<string | null>(null);
    const [unlockedText, setUnlockedText] = useState<string | null>(null);
    const [unlockedAttachments, setUnlockedAttachments] = useState<Attachment[]>([]);

    // --- State: AI ---
    const [summary, setSummary] = useState<string | null>(null);
    const [isSummarizing, setIsSummarizing] = useState(false);
    const [aiDraftPrompt, setAiDraftPrompt] = useState('');
    const [isAiDrafting, setIsAiDrafting] = useState(false);
    const [voiceGender, setVoiceGender] = useState<'female' | 'male'>('female');
    const [exportFormat, setExportFormat] = useState<'md' | 'json'>('md');
    const [showAiDraftInput, setShowAiDraftInput] = useState(false);
    const [showAiSidePanel, setShowAiSidePanel] = useState(false);
    const [showSummaryModal, setShowSummaryModal] = useState(false);
    const [showVerificationModal, setShowVerificationModal] = useState(false);
    const [verificationCode, setVerificationCode] = useState('');
    const [verificationAlias, setVerificationAlias] = useState('');

    // --- State: Dragging ---
    const [composePos, setComposePos] = useState({ x: 100, y: 100 });
    const [isDragging, setIsDragging] = useState(false);
    const dragOffset = useRef({ x: 0, y: 0 });

    const handleMouseDown = (e: React.MouseEvent) => {
        setIsDragging(true);
        dragOffset.current = {
            x: e.clientX - composePos.x,
            y: e.clientY - composePos.y
        };
    };

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (!isDragging) return;
            setComposePos({
                x: e.clientX - dragOffset.current.x,
                y: e.clientY - dragOffset.current.y
            });
        };
        const handleMouseUp = () => setIsDragging(false);

        if (isDragging) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
        }
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isDragging]);

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
    }, [expiryMinutes, currentConfig?.address]); // Use address literal for stable dependency check

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
    const generateNewIdentity = useCallback(async () => {
        if (expiryTimerRef.current) clearInterval(expiryTimerRef.current);
        const address = generateEmailAddress(toggles);
        const config = { mode: 'standard' as any, address }; // mode is now additive

        // Claim it
        const sid = localStorage.getItem('mailcroc_session_id') || sessionId;
        if (sid) {
            const success = await claimIdentity(address, sid);
            if (!success) return null;
        }

        setCurrentConfig(config);
        localStorage.setItem('mailcroc_config', JSON.stringify(config));

        // --- Wipe Everything ---
        setMessages([]);
        setSelectedMessage(null);
        setExternalIdentities([]); // Previous records are gone
        setSenderAddress(address); // Set to new address
        setComposeData({ to: '', subject: '', body: '' }); // Clear drafts
        setAttachments([]); // Clear attachments
        setIsSessionExpired(false);
        setExpiryMinutes(10); // Reset to default 10m

        addToast("Identity Reset: Fresh Slate Ready! 🥒✨", "info");
        return config;
    }, [toggles, sessionId]);

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

        // Claim the address
        claimIdentity(fullAddress, sessionId).then(success => {
            if (success) {
                setCurrentConfig(config);
                localStorage.setItem('mailcroc_config', JSON.stringify(config));

                // --- Wipe Everything ---
                setMessages([]);
                setSelectedMessage(null);
                setExternalIdentities([]); // Clear older sessions
                setSenderAddress(fullAddress); // Set to new custom address
                setComposeData({ to: '', subject: '', body: '' }); // Clear drafts
                setAttachments([]); // Clear attachments

                addToast(`Identity Reset (Custom) to ${fullAddress}`, "success");
            }
        });
    };

    // Initial Load
    useEffect(() => {
        if (!sessionId) return; // Wait for session ID
        const init = async () => {
            const queryAddress = searchParams?.get('address');
            if (queryAddress && queryAddress.includes('@')) {
                const config = { mode: 'standard', address: queryAddress, fullAddress: queryAddress };
                const claimed = await claimIdentity(queryAddress, sessionId);
                if (claimed) {
                    setCurrentConfig(config);
                    localStorage.setItem('mailcroc_config', JSON.stringify(config));
                    router.replace('/', { scroll: false });
                }
            } else {
                const stored = localStorage.getItem('mailcroc_config');
                const expiryPref = localStorage.getItem('mailcroc_expiry_pref');

                if (stored && expiryPref === 'no-expiry') {
                    try {
                        const parsed = JSON.parse(stored);
                        const claimed = await claimIdentity(parsed.address, sessionId);
                        if (claimed) {
                            setCurrentConfig(parsed);
                            setExpiryMinutes(null);
                        } else {
                            generateNewIdentity();
                        }
                    } catch { generateNewIdentity(); }
                } else {
                    generateNewIdentity();
                }
            }
        };
        init();
    }, [sessionId]);

    // Persist Expiry Preference
    useEffect(() => {
        if (expiryMinutes === null) {
            localStorage.setItem('mailcroc_expiry_pref', 'no-expiry');
        } else {
            localStorage.removeItem('mailcroc_expiry_pref');
        }
    }, [expiryMinutes]);

    const emailAddress = currentConfig?.address || '';

    useEffect(() => {
        if (emailAddress && !senderAddress && !externalIdentities.includes(senderAddress)) {
            setSenderAddress(emailAddress);
        }
    }, [emailAddress, senderAddress, externalIdentities]);

    // --- Fetch Logic ---
    const fetchMessages = useCallback(async () => {
        if (!emailAddress || !sessionId) return;
        setIsRefreshing(true);
        try {
            const res = await fetch(`/api/emails?address=${encodeURIComponent(emailAddress)}&sessionId=${sessionId}`, { headers: { 'x-api-key': 'public_beta_key_v1' } });
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

                    // Gmail Verification Auto-Capture
                    const lowerFrom = (newMsg.from || "").toLowerCase();
                    const lowerSub = (newMsg.subject || "").toLowerCase();
                    if (lowerFrom.includes('google.com') && lowerSub.includes('gmail confirmation')) {
                        const bodyText = (newMsg.text || newMsg.html || "");
                        // Regex for Gmail confirmation code (usually 9 digits)
                        const codeMatch = bodyText.match(/Confirmation code:?\s*([0-9A-Z]{5,15})/i);
                        const aliasMatch = bodyText.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);

                        if (codeMatch) {
                            setVerificationCode(codeMatch[1]);
                            if (aliasMatch) setVerificationAlias(aliasMatch[1]);
                            setShowVerificationModal(true);
                            addToast("Gmail Confirmation Captured! 🥒✨", "success");
                        }
                    }

                    // Auto-analyze new message
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


    const removeAttachment = (index: number) => {
        setAttachments(prev => prev.filter((_, i) => i !== index));
    };

    const handleDownloadAttachment = (att: Attachment) => {
        try {
            const [metadata, base64Data] = att.content.split(',');
            const binaryString = atob(base64Data);
            const bytes = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) {
                bytes[i] = binaryString.charCodeAt(i);
            }
            const blob = new Blob([bytes], { type: att.type });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = att.name;
            a.click();
            URL.revokeObjectURL(url);
            addToast(`Downloading ${att.name}`, "success");
        } catch (err) {
            console.error("Download error:", err);
            addToast("Failed to download attachment", "error");
        }
    };

    const getFileIcon = (type: string) => {
        if (type.startsWith('image/')) return <Image size={14} className="text-blue-500" />;
        if (type.startsWith('audio/')) return <FileAudio size={14} className="text-purple-500" />;
        if (type.startsWith('video/')) return <FileVideo size={14} className="text-orange-500" />;
        if (type === 'application/pdf') return <FileText size={14} className="text-red-500" />;
        if (type.includes('zip') || type.includes('archive')) return <Archive size={14} className="text-yellow-600" />;
        return <File size={14} className="text-gray-500" />;
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
                    from: senderAddress || emailAddress,
                    to: composeData.to,
                    subject: composeData.subject,
                    body: isPasswordProtected && emailPassword
                        ? `MC-LOCKED:${encrypt(JSON.stringify({
                            content: composeData.body,
                            attachments: attachments
                        }), emailPassword)}`
                        : composeData.body,
                    isPasswordProtected,
                    attachments: isPasswordProtected ? [] : attachments, // Hide attachments if protected
                    privacyLevel: 'high' // Robust privacy hint
                })
            });
            clearInterval(interval);
            setUploadProgress(100);

            if (res.ok) {
                setSendStatus('Sent!');
                setShowSentSuccess(true);
                setMessages(prev => [{
                    _id: `sent-temp-${Date.now()}`,
                    from: senderAddress || emailAddress,
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
                    setTimeout(() => setShowSentSuccess(false), 3000); // Hide after animation
                }, 1000);
            } else {
                setSendStatus('Retry');
                addToast("Failed to send: Server Error", "error");
            }
        } catch (err: any) {
            setSendStatus('Retry');
            addToast(`Send failed: ${err.message || 'Unknown error'}`, "error");
        }
    };

    // --- Speech Logic ---
    const [isPlayingAudio, setIsPlayingAudio] = useState(false);
    const audioRef = useRef<HTMLAudioElement | null>(null);


    const stopReadAloud = () => {
        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current = null;
        }
        setIsPlayingAudio(false);
    };

    const openReplyModal = () => {
        if (!selectedMessage) return;
        const subject = selectedMessage.subject.toLowerCase().startsWith('re:')
            ? selectedMessage.subject
            : `Re: ${selectedMessage.subject}`;

        // Quote the original message
        const originalContent = selectedMessage.html || selectedMessage.text || "";
        const quotedContent = `<br><br><div style="border-left: 2px solid #e2e8f0; padding-left: 1rem; color: #64748b; margin-top: 2rem;">
            <p style="margin: 0.25rem 0;"><strong>From:</strong> ${selectedMessage.from}</p>
            <p style="margin: 0.25rem 0;"><strong>Date:</strong> ${new Date(selectedMessage.receivedAt).toLocaleString()}</p>
            <p style="margin: 0.25rem 0;"><strong>Subject:</strong> ${selectedMessage.subject}</p>
            <hr style="border: none; border-top: 1px solid #f1f5f9; margin: 1rem 0;">
            ${originalContent}
        </div>`;

        setComposeData({
            to: selectedMessage.from,
            subject: subject,
            body: quotedContent
        });
        setShowDockedCompose(true);
        setIsInlineReplying(false); // Ensure inline mode is disabled
    };

    const cleanAiResponse = (text: string) => {
        if (!text) return "";
        let cleaned = text.trim();
        // Remove all variations of markdown code block wrappers
        cleaned = cleaned.replace(/```(html|markdown|text|email)?\s*?/gi, '');
        cleaned = cleaned.replace(/```$/g, '');
        // Remove common "Here is your email:" type intros
        cleaned = cleaned.replace(/^(here is|this is|i've generated|certainly|surely).*?:\s*/gi, '');
        return cleaned.trim();
    };

    // --- AI Logic (Puter.js with Fallbacks) ---
    const handleAiAction = async (action: 'summarize' | 'receipts' | 'draft' | 'summarize_selected') => {
        setIsSummarizing(true);
        try {
            let prompt = "";
            if (action === 'summarize') {
                prompt = "Summarize the following emails in a concise bulleted list:\n\n";
                prompt += messages.slice(0, 10).map(m => `- From: ${m.from}, Subject: ${m.subject}\nContent: ${m.text.slice(0, 200)}...`).join('\n');
            } else if ((action as string) === 'summarize_selected') {
                if (!selectedMessage) return;
                prompt = `Summarize the following email concisely:\n\nFrom: ${selectedMessage.from}\nSubject: ${selectedMessage.subject}\nContent: ${selectedMessage.text}`;
            } else if (action === 'receipts') {
                prompt = "Identify any receipts or financial transactions in these emails. List the Amount, Date, and Merchant:\n\n";
                prompt += messages.map(m => `Subject: ${m.subject}\nContent: ${m.text.slice(0, 300)}`).join('\n');
            } else if (action === 'draft') {
                if (!selectedMessage) { addToast("Select an email to draft a reply for.", "error"); setIsSummarizing(false); return; }
                const tone = "professional";
                prompt = `Draft a ${tone} reply to the following email. Keep it concise.\n\nFrom: ${selectedMessage.from}\nSubject: ${selectedMessage.subject}\nContent: ${selectedMessage.text}`;
            }

            let text = "";
            // Primary: Puter.js
            if ((window as any).puter) {
                try {
                    const resp = await (window as any).puter.ai.chat(prompt, { model: 'kimi' });
                    text = typeof resp === 'string' ? resp : resp?.message?.content || JSON.stringify(resp);
                } catch (e) {
                    console.warn("Puter AI failed, trying backend fallback...", e);
                }
            }

            // Fallback: Backend API
            if (!text) {
                const res = await fetch('/api/ai/write', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ topic: prompt, tone: 'Professional' })
                });
                if (res.ok) {
                    const data = await res.json();
                    text = data.content;
                }
            }

            if (!text) throw new Error("AI failed to generate response");
            const cleanedText = cleanAiResponse(text);

            if (action === 'draft') {
                const plainTextDraft = stripMarkdown(cleanedText);
                setComposeData(prev => ({ ...prev, body: plainTextDraft }));
                setShowDockedCompose(true);
                addToast("Draft generated!", "success");
            } else {
                setSummary(cleanedText);
                setShowSummaryModal(true);
                addToast("Analysis complete", "success");
            }

        } catch (err: any) {
            console.error("AI Action Error:", err);
            const msg = err?.message || (typeof err === 'object' ? JSON.stringify(err) : String(err));
            addToast(`AI Error: ${msg === '{}' ? 'Network or API Error' : msg}`, "error");
        } finally {
            setIsSummarizing(false);
        }
    };

    const handleAiWrite = async (topic: string, refinement?: 'polish' | 'formalize' | 'elaborate' | 'shorten') => {
        if (!topic && !refinement) return;
        setIsSummarizing(true);
        try {
            let text = "";
            let prompt = `Write a professional email about: ${topic}. IMPORTANT: Return ONLY the body. The editor renders HTML/React-like tags as a final visual look, so feel free to use <h1>, <p>, <ul>, <li>, <strong>, etc. for professional formatting. Do NOT wrap the entire response in a markdown code block (\`\`\`). Return raw content only.`;

            if (refinement) {
                const currentText = composeData.body;
                if (!currentText) return;

                if (refinement === 'polish') prompt = `Improve the grammar, flow, and clarity of this email text while keeping the same meaning:\n\n${currentText}`;
                else if (refinement === 'formalize') prompt = `Rewrite this email to be more formal and professional:\n\n${currentText}`;
                else if (refinement === 'elaborate') prompt = `Rewrite this email by adding more details, context, and elaborate on the points made:\n\n${currentText}`;
                else if (refinement === 'shorten') prompt = `Rewrite this email to be much more concise and brief:\n\n${currentText}`;
            }

            // Try Puter first
            if ((window as any).puter) {
                try {
                    const resp = await (window as any).puter.ai.chat(prompt, { model: 'kimi' });
                    text = typeof resp === 'string' ? resp : resp?.message?.content || JSON.stringify(resp);
                } catch (e) { console.warn("Puter AI Write failed", e); }
            }

            // Fallback
            if (!text) {
                const res = await fetch('/api/ai/write', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ topic: refinement ? prompt : topic })
                });
                if (res.ok) {
                    const data = await res.json();
                    text = data.content;
                }
            }

            if (text) {
                let cleanedText = cleanAiResponse(text);

                // Smart Parsing for Subject and To
                let extractedSubject = "";
                let extractedTo = "";

                // Only parse headers if we are NOT refining existing text (refinement usually just returns body)
                // Or if we specifically detect headers even in refinement.
                const lines = cleanedText.split('\n');
                const bodyLines: string[] = [];
                let headersDone = false;
                let hasFoundHeader = false;

                for (let i = 0; i < lines.length; i++) {
                    const line = lines[i];
                    const lowerLine = line.toLowerCase().trim();

                    if (headersDone) {
                        bodyLines.push(line);
                        continue;
                    }

                    if (lowerLine.startsWith("subject:")) {
                        // Extract and strip potential markdown like **Subject:**
                        extractedSubject = line.replace(/\*|#|_/g, '').replace(/^subject:/i, '').trim();
                        hasFoundHeader = true;
                    } else if (lowerLine.startsWith("to:")) {
                        extractedTo = line.replace(/\*|#|_/g, '').replace(/^to:/i, '').trim();
                        hasFoundHeader = true;
                    } else if (line.trim() === "") {
                        // Empty line typically separates headers from body if we found headers
                        if (hasFoundHeader) {
                            headersDone = true;
                        }
                    } else {
                        // If we found headers, and this isn't one, it's body
                        if (hasFoundHeader) {
                            headersDone = true;
                            bodyLines.push(line);
                        } else {
                            // If we haven't found headers yet, assume body
                            bodyLines.push(line);
                        }
                    }
                }

                if (extractedSubject || extractedTo) {
                    cleanedText = bodyLines.join('\n').trim();
                }

                setComposeData(prev => ({
                    ...prev,
                    body: cleanedText,
                    subject: extractedSubject || prev.subject,
                    to: extractedTo || prev.to
                }));
                addToast(refinement ? "Text refined!" : "Content generated!", "success");
            }
        } catch (err) {
            addToast("Failed to process content", "error");
        } finally {
            setIsSummarizing(false);
        }
    };

    const polishText = async (text: string): Promise<string> => {
        if (!text) return "";
        setIsSummarizing(true);
        try {
            const prompt = `Fix grammar, spelling, and improve the flow of this text to make it professional, but keep the core meaning and length similar. Return the result as clean HTML suitable for an email body (e.g. use <p>, <strong>, <em>, <br> only):\n\n${text}`;
            let result = "";

            // Try Puter first
            if ((window as any).puter) {
                try {
                    const resp = await (window as any).puter.ai.chat(prompt, { model: 'kimi' });
                    result = typeof resp === 'string' ? resp : resp?.message?.content || JSON.stringify(resp);
                } catch (e) { console.warn("Puter Polish failed", e); }
            }

            // Fallback
            if (!result) {
                const res = await fetch('/api/ai/write', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ topic: prompt })
                });
                if (res.ok) {
                    const data = await res.json();
                    result = data.content;
                }
            }

            return cleanAiResponse(result) || text;
        } catch (err) {
            addToast("Failed to polish text", "error");
            return text;
        } finally {
            setIsSummarizing(false);
        }
    };

    const handleReadAloud = async () => {
        if (!selectedMessage) return;
        if (isPlayingAudio) {
            stopReadAloud();
            return;
        }

        // Check if we already have saved audio
        if (selectedMessage.speechAudio) {
            try {
                const blob = await (await fetch(`data:audio/mpeg;base64,${selectedMessage.speechAudio}`)).blob();
                const url = URL.createObjectURL(blob);
                const audio = new Audio(url);
                audioRef.current = audio;
                audio.onended = () => setIsPlayingAudio(false);
                setIsPlayingAudio(true);
                audio.play();
                return;
            } catch (e) {
                console.warn("Failed to play stored audio, regenerating...", e);
            }
        }

        setIsPlayingAudio(true);
        addToast("Generating speech...", "info");

        try {
            const textToRead = (selectedMessage.text || selectedMessage.subject).slice(0, 1000);

            // Fetch from ElevenLabs via our backend
            const res = await fetch('/api/ai/speech', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text: textToRead, gender: voiceGender })
            });

            if (res.ok) {
                const blob = await res.blob();

                // Convert to base64 to save for next time
                const reader = new FileReader();
                reader.readAsDataURL(blob);
                reader.onloadend = async () => {
                    const base64data = (reader.result as string).split(',')[1];
                    // Save to backend
                    fetch('/api/emails', {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json', 'x-api-key': 'public_beta_key_v1' },
                        body: JSON.stringify({
                            emailId: selectedMessage._id,
                            action: 'audio',
                            value: base64data
                        })
                    }).catch(e => console.error("Failed to save audio", e));

                    // Update local state so it's instant next time without refresh
                    setMessages(prev => prev.map(m => m._id === selectedMessage._id ? { ...m, speechAudio: base64data } : m));
                    if (selectedMessage) {
                        setSelectedMessage({ ...selectedMessage, speechAudio: base64data });
                    }
                };

                const url = URL.createObjectURL(blob);
                const audio = new Audio(url);
                audioRef.current = audio;
                audio.onended = () => setIsPlayingAudio(false);
                audio.play();
            } else {
                const errorData = await res.json();
                throw new Error(errorData.error || "TTS API failed");
            }

        } catch (err: any) {
            console.error("TTS Error:", err);
            addToast(`Speech failed: ${err.message}`, "error");
            setIsPlayingAudio(false);
        }
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

    const handleOpenCompose = () => {
        setComposeData({ to: '', subject: '', body: '' });
        setAttachments([]);
        setIsPasswordProtected(false);
        setEmailPassword('');
        setSenderAddress(emailAddress);
        setShowDockedCompose(true);
        setMobileMenuOpen(false);
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

                    <button className={`${styles.composeBtnLarge} ${isSidebarCollapsed ? styles.iconOnly : ''}`} onClick={handleOpenCompose}>
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
                                <label><input type="checkbox" checked={toggles.dot} onChange={() => setToggles({ ...toggles, dot: !toggles.dot })} /> .Dot</label>
                                <label><input type="checkbox" checked={toggles.hyphen} onChange={() => setToggles({ ...toggles, hyphen: !toggles.hyphen })} /> -Hyphen</label>
                                <label><input type="checkbox" checked={toggles.gmail} onChange={() => setToggles({ ...toggles, gmail: !toggles.gmail })} /> Gmail</label>
                                <label><input type="checkbox" checked={toggles.googlemail} onChange={() => setToggles({ ...toggles, googlemail: !toggles.googlemail })} /> GoogleMail</label>

                                <div className={styles.externalAccounts}>
                                    <h5 className={styles.smallTitle}>Connected Emails</h5>
                                    {externalIdentities.map((email, i) => (
                                        <div key={i} className={styles.externalItem}>
                                            <span>{email}</span>
                                            <X size={12} onClick={() => setExternalIdentities(prev => prev.filter((_, idx) => idx !== i))} />
                                        </div>
                                    ))}
                                    <div className={styles.addExternalRow}>
                                        <input
                                            placeholder="Add email (Gmail...)"
                                            value={newExternalEmail}
                                            onChange={e => setNewExternalEmail(e.target.value)}
                                            onKeyDown={e => {
                                                if (e.key === 'Enter' && newExternalEmail.includes('@')) {
                                                    setExternalIdentities(prev => [...prev, newExternalEmail]);
                                                    setNewExternalEmail('');
                                                    addToast("Added personal email", "success");
                                                }
                                            }}
                                        />
                                        <Plus size={14} onClick={() => {
                                            if (newExternalEmail.includes('@')) {
                                                setExternalIdentities(prev => [...prev, newExternalEmail]);
                                                setNewExternalEmail('');
                                                addToast("Added personal email", "success");
                                            }
                                        }} />
                                    </div>
                                </div>
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

                    {!isSidebarCollapsed && (
                        <div className={styles.sidebarFooter}>
                            <Link href="/status" className={styles.statusBadge}>
                                <div className={styles.statusDotLive}></div>
                                <span>All systems operational</span>
                            </Link>
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
                                <h2 className={styles.currentEmail} title={emailAddress}>{emailAddress}</h2>
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
                                <span className={styles.toggleLabel}>+Tag</span>
                            </label>
                            <label className={styles.toggleSwitch}>
                                <input type="checkbox" checked={toggles.dot} onChange={() => setToggles({ ...toggles, dot: !toggles.dot })} />
                                <span className={styles.toggleSlider} />
                                <span className={styles.toggleLabel}>.Dot</span>
                            </label>
                            <label className={styles.toggleSwitch}>
                                <input type="checkbox" checked={toggles.hyphen} onChange={() => setToggles({ ...toggles, hyphen: !toggles.hyphen })} />
                                <span className={styles.toggleSlider} />
                                <span className={styles.toggleLabel}>-Hyphen</span>
                            </label>
                            <label className={styles.toggleSwitch}>
                                <input type="checkbox" checked={toggles.gmail} onChange={() => setToggles({ ...toggles, gmail: !toggles.gmail })} />
                                <span className={styles.toggleSlider} />
                                <span className={styles.toggleLabel}>Gmail</span>
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
                            <button className={styles.actionBtn} onClick={handleOpenCompose}>
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

                                                {activeFolder !== 'sent' && (
                                                    <button
                                                        className={styles.aiBtnSmall}
                                                        onClick={() => handleAiAction('summarize_selected')}
                                                        title="Summarize with AI"
                                                    >
                                                        <AILogo size={14} color="black" /> Summarize
                                                    </button>
                                                )}

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

                                        {/* IN-MAIL AI SUMMARY */}
                                        {summary && selectedMessage && (activeFolder !== 'sent') && (
                                            <div className={styles.inMailSummary}>
                                                <div className={styles.summaryHeader}>
                                                    <div className={styles.summaryTitle}>
                                                        <AILogo size={14} color="#84cc16" />
                                                        <span>AI Summary</span>
                                                    </div>
                                                    <button onClick={() => setSummary(null)} className={styles.closeSummary}>×</button>
                                                </div>
                                                <div className={styles.summaryContent}>
                                                    {summary}
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    <div id="email-content-export" className={styles.emailBody}>
                                        {selectedMessage.text?.startsWith('MC-LOCKED:') && unlockedMessageId !== selectedMessage._id ? (
                                            <div className={styles.lockedMessageOverlay}>
                                                <div className={styles.lockIconBox}>
                                                    <ShieldAlert size={48} className="text-red-500 mb-4" />
                                                    <h3>This Email is Password Protected</h3>
                                                    <p>The sender has secured this message. Please enter the shared code to unlock.</p>
                                                    <div className={styles.unlockInputGroup}>
                                                        <input
                                                            type="password"
                                                            placeholder="Enter shared code"
                                                            value={unlockInput}
                                                            onChange={(e) => setUnlockInput(e.target.value)}
                                                            className={styles.unlockInput}
                                                            onKeyDown={(e) => {
                                                                if (e.key === 'Enter') {
                                                                    const decrypted = decrypt(selectedMessage.text.replace('MC-LOCKED:', ''), unlockInput);
                                                                    if (decrypted) {
                                                                        try {
                                                                            const parsed = JSON.parse(decrypted);
                                                                            if (typeof parsed === 'object' && (parsed.content || parsed.attachments)) {
                                                                                setUnlockedText(parsed.content || '');
                                                                                setUnlockedAttachments(parsed.attachments || []);
                                                                            } else {
                                                                                // Legacy format (just string)
                                                                                setUnlockedText(decrypted);
                                                                                setUnlockedAttachments([]);
                                                                            }
                                                                        } catch {
                                                                            // Not JSON, assume legacy string
                                                                            setUnlockedText(decrypted);
                                                                            setUnlockedAttachments([]);
                                                                        }
                                                                        setUnlockedMessageId(selectedMessage._id);
                                                                        addToast("Email unlocked!", "success");
                                                                    } else {
                                                                        addToast("Invalid code", "error");
                                                                    }
                                                                }
                                                            }}
                                                        />
                                                        <button
                                                            className={styles.unlockBtn}
                                                            onClick={() => {
                                                                const decrypted = decrypt(selectedMessage.text.replace('MC-LOCKED:', ''), unlockInput);
                                                                if (decrypted) {
                                                                    try {
                                                                        const parsed = JSON.parse(decrypted);
                                                                        if (typeof parsed === 'object' && (parsed.content || parsed.attachments)) {
                                                                            setUnlockedText(parsed.content || '');
                                                                            setUnlockedAttachments(parsed.attachments || []);
                                                                        } else {
                                                                            setUnlockedText(decrypted);
                                                                            setUnlockedAttachments([]);
                                                                        }
                                                                    } catch {
                                                                        setUnlockedText(decrypted);
                                                                        setUnlockedAttachments([]);
                                                                    }
                                                                    setUnlockedMessageId(selectedMessage._id);
                                                                    addToast("Email unlocked!", "success");
                                                                } else {
                                                                    addToast("Invalid code", "error");
                                                                }
                                                            }}
                                                        >
                                                            Unlock
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        ) : (
                                            <>
                                                {selectedMessage.html && unlockedMessageId !== selectedMessage._id ? (
                                                    <div dangerouslySetInnerHTML={{ __html: processHtml(selectedMessage.html) }} />
                                                ) : (
                                                    <div className={styles.markdownBody}>
                                                        {unlockedMessageId === selectedMessage._id ? (
                                                            <div>
                                                                {/* Render Unlocked Content (HTML support) */}
                                                                <div dangerouslySetInnerHTML={{ __html: processHtml(unlockedText || '') }} />

                                                                {/* Render Unlocked Attachments */}
                                                                {unlockedAttachments.length > 0 && (
                                                                    <div style={{ marginTop: '2rem', borderTop: '1px solid #e2e8f0', paddingTop: '1rem' }}>
                                                                        <h4 style={{ fontSize: '0.9rem', fontWeight: 600, marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                                            <Paperclip size={14} /> Attachments ({unlockedAttachments.length})
                                                                        </h4>
                                                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '0.5rem' }}>
                                                                            {unlockedAttachments.map((att, idx) => (
                                                                                <div
                                                                                    key={idx}
                                                                                    onClick={() => handleDownloadAttachment(att)}
                                                                                    style={{
                                                                                        display: 'flex', alignItems: 'center', gap: '10px',
                                                                                        padding: '0.75rem', background: '#f8fafc', borderRadius: '8px',
                                                                                        textDecoration: 'none', color: '#1e293b', border: '1px solid #e2e8f0',
                                                                                        transition: 'all 0.2s', fontSize: '0.85rem', cursor: 'pointer'
                                                                                    }}
                                                                                    onMouseOver={e => e.currentTarget.style.borderColor = '#cbd5e1'}
                                                                                    onMouseOut={e => e.currentTarget.style.borderColor = '#e2e8f0'}
                                                                                >
                                                                                    <div style={{ background: '#fff', padding: '6px', borderRadius: '6px', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
                                                                                        {getFileIcon(att.type)}
                                                                                    </div>
                                                                                    <div style={{ overflow: 'hidden' }}>
                                                                                        <div style={{ fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{att.name}</div>
                                                                                        <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{(att.size / 1024).toFixed(1)} KB</div>
                                                                                    </div>
                                                                                    <Download size={14} className="ml-auto text-gray-400" />
                                                                                </div>
                                                                            ))}
                                                                        </div>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        ) : (
                                                            <ReactMarkdown
                                                                remarkPlugins={[remarkGfm]}
                                                                rehypePlugins={[rehypeSanitize]}
                                                            >
                                                                {selectedMessage.text}
                                                            </ReactMarkdown>
                                                        )}
                                                    </div>
                                                )}
                                            </>
                                        )}
                                    </div>

                                    {/* Inline Reply - Now triggers Modal */}
                                    <div className={styles.inlineReplyBox}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem' }}>
                                            <div className={styles.replyAvatar}>
                                                <User size={18} />
                                            </div>
                                            <div
                                                className={styles.replyPlaceholderTrigger}
                                                onClick={openReplyModal}
                                            >
                                                Reply to <strong>{selectedMessage.from}</strong>...
                                            </div>
                                            <button
                                                className={styles.actionBtnAccent}
                                                onClick={openReplyModal}
                                                style={{ marginLeft: 'auto' }}
                                            >
                                                <Reply size={14} /> Reply
                                            </button>
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <div className={styles.placeholder}>
                                    {/* AI Assistant Placeholder if selected */}
                                    {showAiSidePanel ? (
                                        <div className={styles.aiPanel}>
                                            <h3><AILogo size={20} className="inline" color="black" /> AI Assistant</h3>

                                            {summary ? (
                                                <div className={styles.aiResult}>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                                                        <strong>Result:</strong>
                                                        <button onClick={() => setSummary(null)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={14} /></button>
                                                    </div>
                                                    <TypewriterMarkdown text={summary} />
                                                </div>
                                            ) : (
                                                <>
                                                    <p>I can help summarize emails, draft replies, or detect scams using free AI models.</p>
                                                    <div className={styles.aiCapabilities}>
                                                        {selectedMessage && (
                                                            <span className={styles.capChip} onClick={() => handleAiAction('summarize_selected')}>
                                                                {isSummarizing ? 'Thinking...' : 'Summarize This Email'}
                                                            </span>
                                                        )}
                                                        <span className={styles.capChip} onClick={() => handleAiAction('summarize')}>
                                                            {isSummarizing ? 'Thinking...' : 'Summarize Inbox'}
                                                        </span>
                                                        <span className={styles.capChip} onClick={() => handleAiAction('receipts')}>
                                                            {isSummarizing ? 'Scanning...' : 'Find receipts'}
                                                        </span>
                                                        <span className={styles.capChip} onClick={() => handleAiAction('draft')}>
                                                            Draft intro
                                                        </span>
                                                        <span className={styles.capChip} onClick={() => document.getElementById('vision-input')?.click()}>
                                                            Analyze Image
                                                        </span>
                                                        <input
                                                            type="file"
                                                            id="vision-input"
                                                            style={{ display: 'none' }}
                                                            accept="image/*"
                                                            onChange={async (e) => {
                                                                if (e.target.files?.[0]) {
                                                                    const file = e.target.files[0];
                                                                    setIsSummarizing(true);
                                                                    addToast("Analyzing image...", "info");

                                                                    // Helper to convert to Base64
                                                                    const toBase64 = (file: File) => new Promise<string>((resolve, reject) => {
                                                                        const reader = new FileReader();
                                                                        reader.readAsDataURL(file);
                                                                        reader.onload = () => resolve(reader.result as string);
                                                                        reader.onerror = error => reject(error);
                                                                    });

                                                                    try {
                                                                        const base64Image = await toBase64(file);
                                                                        // Log puter availability
                                                                        console.log('Puter check:', (window as any).puter);

                                                                        const resp = await (window as any).puter.ai.chat("Describe this image in detail.", {
                                                                            model: 'gpt-4o',
                                                                            images: [base64Image]
                                                                        });
                                                                        const text = resp?.message?.content || JSON.stringify(resp);
                                                                        setSummary(text);
                                                                        setShowSummaryModal(true);
                                                                        addToast("Image analyzed!", "success");
                                                                    } catch (err: any) {
                                                                        console.error("Vision Error Object:", err);
                                                                        addToast(`Vision Error: ${err?.message || 'Unknown error'}`, "error");
                                                                    } finally {
                                                                        setIsSummarizing(false);
                                                                        // Reset input
                                                                        e.target.value = '';
                                                                    }
                                                                }
                                                            }
                                                            }
                                                        />
                                                    </div>
                                                </>
                                            )}
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

            {/* Extracted Compose Modal */}
            <ComposeModal
                show={showDockedCompose}
                onClose={() => setShowDockedCompose(false)}
                composePos={composePos}
                handleMouseDown={handleMouseDown}
                composeData={composeData}
                setComposeData={setComposeData}
                attachments={attachments}
                removeAttachment={removeAttachment}
                addAttachment={(files) => {
                    if (!files) return;
                    const incomingItems = Array.from(files);
                    if (attachments.length + incomingItems.length > 5) {
                        addToast("Maximum 5 attachments allowed", "error");
                        return;
                    }
                    incomingItems.forEach(file => {
                        const reader = new FileReader();
                        reader.onload = (e) => {
                            const content = e.target?.result as string;
                            setAttachments(prev => [...prev, {
                                name: file.name,
                                content: content,
                                type: file.type,
                                size: file.size
                            }]);
                        };
                        reader.readAsDataURL(file);
                    });
                }}
                isPasswordProtected={isPasswordProtected}
                setIsPasswordProtected={setIsPasswordProtected}
                emailPassword={emailPassword}
                setEmailPassword={setEmailPassword}
                handleSend={handleSend}
                saveDraft={saveDraft}
                sendStatus={sendStatus}
                addToast={addToast}
                handleAiWrite={handleAiWrite as any}
                polishText={polishText}
                isAiWriting={isSummarizing}
                getFileIcon={getFileIcon}
                senderAddress={senderAddress}
                setSenderAddress={setSenderAddress}
                availableAddresses={[emailAddress, ...externalIdentities].filter(addr =>
                    addr && (addr.endsWith('mailcroc.qzz.io') || addr.endsWith('mailpanda.qzz.io'))
                )}
            />

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

            {/* AI Summary Modal */}
            {showSummaryModal && summary && (
                <div className={styles.summaryModalOverlay} onClick={() => setShowSummaryModal(false)}>
                    <div className={styles.summaryModalContent} onClick={e => e.stopPropagation()}>
                        <div className={styles.summaryModalHeader}>
                            <h3><Sparkles size={20} className="text-lime-500" /> AI Insights</h3>
                            <button className={styles.closeSummary} onClick={() => setShowSummaryModal(false)}>
                                <X size={20} />
                            </button>
                        </div>
                        <div className={styles.summaryModalBody}>
                            <TypewriterMarkdown text={summary} />
                        </div>
                        <div className={styles.summaryModalFooter}>
                            <button className={styles.copySummaryBtn} onClick={() => {
                                navigator.clipboard.writeText(summary);
                                addToast("Summary copied!", "success");
                            }}>
                                <Copy size={16} /> Copy Result
                            </button>
                            <button className={styles.closeSummaryBtn} onClick={() => setShowSummaryModal(false)}>
                                Done
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Gmail Verification Modal */}
            {showVerificationModal && (
                <div className={styles.modalOverlay} onClick={() => setShowVerificationModal(false)}>
                    <div className={styles.modalContent} onClick={e => e.stopPropagation()} style={{ textAlign: 'center', padding: '2rem', border: '2px solid #84cc16' }}>
                        <div className={styles.modalHeader}>
                            <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <ShieldCheck size={24} color="#84cc16" /> Stealth Verification
                            </h3>
                            <button onClick={() => setShowVerificationModal(false)}><X size={20} /></button>
                        </div>
                        <div style={{ margin: '1.5rem 0' }}>
                            <p style={{ color: '#64748b', fontSize: '0.95rem', marginBottom: '1rem' }}>
                                Gmail is asking to verify your witty alias:
                            </p>
                            <div style={{ background: '#f8fafc', padding: '0.75rem', borderRadius: '8px', fontWeight: 'bold', color: '#1e292b', marginBottom: '1.5rem' }}>
                                {verificationAlias}
                            </div>
                            <p style={{ color: '#1e292b', fontWeight: '600', marginBottom: '0.5rem' }}>Your Stealth Code:</p>
                            <div style={{ fontSize: '2.5rem', letterSpacing: '4px', fontWeight: '800', color: '#84cc16', fontFamily: 'monospace', background: '#ecfdf5', padding: '1rem', borderRadius: '12px', border: '1px dashed #84cc16' }}>
                                {verificationCode}
                            </div>
                        </div>
                        <button
                            className={styles.actionBtnPrimary}
                            style={{ width: '100%', justifyContent: 'center', padding: '1rem' }}
                            onClick={() => {
                                navigator.clipboard.writeText(verificationCode);
                                addToast("Code copied to clipboard!", "success");
                            }}
                        >
                            <Copy size={18} /> Copy Code & Close
                        </button>
                        <p style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '1rem' }}>
                            Enter this code in your Gmail "Send Mail As" settings to finish the stealth setup.
                        </p>
                    </div>
                </div>
            )}
            {/* Sent Success Overlay */}
            {showSentSuccess && (
                <div className={styles.modalOverlay} style={{ zIndex: 9999 }}>
                    <div className={styles.modalContent} style={{ textAlign: 'center', padding: '2rem' }}>
                        <LottiePlayer
                            animationData={mailSentAnim}
                            loop={false}
                            style={{ width: 200, height: 200, margin: '0 auto' }}
                        />
                        <h3 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginTop: '1rem' }}>Mail Sent Successfully!</h3>
                    </div>
                </div>
            )}

        </div>
    );
};

export default MailBox;
