"use client";
import React, { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import styles from './MailBox.module.css';
import { Copy, RefreshCw, Mail, Shuffle, Star, Send, Forward, Clock, Plus, X, Reply, MoreVertical, Trash2, CheckCircle, FileText, Paperclip, Menu, Download, Inbox, Send as SendIcon, Trash, Archive, User, LayoutGrid, ChevronLeft, ChevronRight, AlertTriangle, ShieldAlert, Sparkles, Settings, Volume2, Square, Mic, QrCode, File, FileImage, FileAudio, FileVideo, Image, Briefcase, Scissors, AlignLeft, Wand2, ShieldCheck, Eye, EyeOff } from 'lucide-react';
import { type EmailMessage, type InboxTab, type Attachment } from '@/types/mail';
import { io, Socket } from 'socket.io-client';
import { generateEmailAddress, type GenerationConfig, WITTY_SUBJECTS } from '@/lib/domains';
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
const DocViewer = dynamic(() => import('@cyntler/react-doc-viewer'), { ssr: false });

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
        if (!encoded) return null;
        // Fix potential InvalidCharacterError by stripping invalid characters and handling padding
        let sanitized = encoded.replace(/\s+/g, '').replace(/-/g, '+').replace(/_/g, '/');
        while (sanitized.length % 4 !== 0) {
            sanitized += '=';
        }

        // 1. Base64 decode to binary string
        const ciphered = atob(sanitized);
        // 2. XOR back to original binary string
        const binaryString = xorCipher(ciphered, key);
        // 3. Convert back to Unicode
        return decodeURIComponent(escape(binaryString));
    } catch (e) {
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



const socket: Socket | null = null;

// --- Puter AI Type ---
interface PuterResponse {
    message?: {
        content: string;
    };
}

const MailBox = () => {
    const searchParams = useSearchParams();
    const router = useRouter();
    const { addToast } = useToast();

    // --- State: Identity & Config ---
    const [inboxTabs, setInboxTabs] = useState<InboxTab[]>([]);
    const [activeTabIndex, setActiveTabIndex] = useState(0);
    const [toggles, setToggles] = useState({ standard: true, plus: true, dot: true, gmail: true, googlemail: true, hyphen: true });
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

    const [activeFolder, setActiveFolder] = useState<'inbox' | 'sent' | 'trash' | 'drafts' | 'spam' | 'security_report'>('inbox');
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
    const [showReceivedAnim, setShowReceivedAnim] = useState(false);

    const [uploadProgress, setUploadProgress] = useState(0);
    const [isInlineReplying, setIsInlineReplying] = useState(false);
    const [isPasswordProtected, setIsPasswordProtected] = useState(false);
    const [isSubjectHidden, setIsSubjectHidden] = useState(false);
    const [nextSubjectHiddenValue, setNextSubjectHiddenValue] = useState(false);
    const [showHideSubjectConfirm, setShowHideSubjectConfirm] = useState(false);
    const [emailPassword, setEmailPassword] = useState('');
    const [unlockInput, setUnlockInput] = useState('');
    const [unlockedMessageId, setUnlockedMessageId] = useState<string | null>(null);
    const [unlockedText, setUnlockedText] = useState<string | null>(null);
    const [unlockedAttachments, setUnlockedAttachments] = useState<Attachment[]>([]);
    const [previewAttachment, setPreviewAttachment] = useState<Attachment | null>(null);
    const [docRenderers, setDocRenderers] = useState<any[]>([]);

    useEffect(() => {
        if (previewAttachment) {
            import("@cyntler/react-doc-viewer").then(mod => {
                setDocRenderers(mod.DocViewerRenderers);
            });
        }
    }, [previewAttachment]);

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
    const [showTrackerModal, setShowTrackerModal] = useState(false);
    const [showVerificationModal, setShowVerificationModal] = useState(false);
    const [verificationCode, setVerificationCode] = useState('');
    const [verificationAlias, setVerificationAlias] = useState('');
    const [isInstantClean, setIsInstantClean] = useState(false);
    const [showInstantCleanConfirm, setShowInstantCleanConfirm] = useState(false);
    const [blockedHistory, setBlockedHistory] = useState<{ type: 'tracker' | 'fraud'; detail: string; timestamp: string; }[]>([]);

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

    // 🟢 Heartbeat Effect (Address Persistence)
    useEffect(() => {
        if (!sessionId || !currentConfig?.address) return;

        const heartbeat = async () => {
            try {
                await fetch('/api/addresses/heartbeat', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ address: currentConfig.address, sessionId })
                });
            } catch (err) { console.warn("Heartbeat failed", err); }
        };

        heartbeat(); // Run immediately
        const interval = setInterval(heartbeat, 60000); // 60s
        return () => clearInterval(interval);
    }, [sessionId, currentConfig?.address]);

    // 🧹 Instant Clean (Auto-Wipe on Tab Close)
    useEffect(() => {
        const handleUnload = () => {
            if (isInstantClean && currentConfig?.address && sessionId) {
                // Use beacon for fire-and-forget reliability on unload
                const url = `/api/emails?action=wipe&address=${encodeURIComponent(currentConfig.address)}&sessionId=${encodeURIComponent(sessionId)}`;
                navigator.sendBeacon(url);
            }
        };

        window.addEventListener('beforeunload', handleUnload);
        return () => window.removeEventListener('beforeunload', handleUnload);
    }, [isInstantClean, currentConfig?.address, sessionId]);

    // --- Refs ---
    const fileInputRef = useRef<HTMLInputElement>(null);
    const expiryTimerRef = useRef<NodeJS.Timeout | null>(null);
    const deferredPrompt = useRef<unknown>(null);

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

    const handleExportInbox = async (format: 'md' | 'json' | 'pdf') => {
        const { exportToJSON, exportToMarkdown, exportInboxToPDF } = await import('@/lib/export-utils');

        if (format === 'json') {
            exportToJSON(messages, emailAddress);
            addToast("Inbox exported to JSON", "success");
        } else if (format === 'md') {
            exportToMarkdown(messages, emailAddress);
            addToast("Inbox exported to Markdown", "success");
        } else if (format === 'pdf') {
            await exportInboxToPDF(messages, emailAddress);
            addToast("Inbox exported to PDF", "success");
        }
    };

    const handleExportPDF = async () => {
        if (!selectedMessage) return;
        const { exportSingleEmailToPDF } = await import('@/lib/export-utils');

        try {
            addToast("Generating PDF...", "info");
            await exportSingleEmailToPDF('email-content-export', selectedMessage.subject);
            addToast("PDF Downloaded", "success");
        } catch (error) {
            console.error("PDF Export Error:", error);
            addToast("Failed to generate PDF", "error");
        }
    };

    // --- PWA Install Listener ---
    useEffect(() => {
        // Check global first
        const win = window as unknown as { deferredPrompt?: unknown };
        if (win.deferredPrompt) {
            deferredPrompt.current = win.deferredPrompt;
        }

        const handler = (e: Event) => {
            e.preventDefault();
            deferredPrompt.current = e;
            (window as unknown as { deferredPrompt?: unknown }).deferredPrompt = e; // Share globally
        };
        window.addEventListener('beforeinstallprompt', handler as EventListener);
        return () => window.removeEventListener('beforeinstallprompt', handler as EventListener);
    }, []);

    const handleDownloadApp = async () => {
        const promptEvent = (deferredPrompt.current || (window as unknown as { deferredPrompt?: unknown }).deferredPrompt) as { prompt: () => void, userChoice: Promise<{ outcome: string }> } | null;
        if (promptEvent) {
            promptEvent.prompt();
            const { outcome } = await promptEvent.userChoice;
            if (outcome === 'accepted') {
                deferredPrompt.current = null;
                (window as unknown as { deferredPrompt?: unknown }).deferredPrompt = null;
            }
        } else {
            addToast("To install: settings &gt; Add to Home Screen (Mobile) or Install in address bar (Desktop)", "info");
        }
    };

    // --- Identity Logic ---
    const generateNewIdentity = useCallback(async () => {
        if (expiryTimerRef.current) clearInterval(expiryTimerRef.current);
        const address = generateEmailAddress(toggles);
        const config = { mode: 'standard' as const, address }; // mode is now additive

        // Claim it
        const sid = localStorage.getItem('mailcroc_session_id') || sessionId;
        if (sid) {
            // Wipe old data first before switching (for privacy)
            const prevAddress = currentConfig?.address;
            if (prevAddress && sid) {
                fetch('/api/emails', {
                    method: 'DELETE',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action: 'wipe', address: prevAddress, sessionId: sid })
                }).catch(() => { });
            }

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

        const fullAddress = `${customInput}@${selectedDomain}`.toLowerCase();

        // Availability Check (Mock + Reserved List)
        const forbiddenPrefixes = ['admin', 'root', 'support', 'abuse', 'postmaster', 'hostmaster', 'webmaster'];
        if (forbiddenPrefixes.includes(customInput.toLowerCase())) {
            addToast(`'${customInput}' is reserved/unavailable.`, "error");
            return;
        }

        const reservedAddresses = [
            'relay@mailcroc.qzz.io',
            'relay@mailpanda.qzz.io',
            'inbox@mailcroc.qzz.io',
            'inbox@mailpanda.qzz.io',
            'wecare.woven@gmail.com',
            'wecare.woven@googlemail.com'
        ];

        if (reservedAddresses.includes(fullAddress)) {
            addToast("This address is already taken. Try again after some time.", "error");
            return;
        }

        const config = { mode: 'custom' as const, address: fullAddress, fullAddress: fullAddress };

        // Claim the address
        claimIdentity(fullAddress, sessionId).then(success => {
            if (success) {
                setCurrentConfig(config);
                localStorage.setItem('mailcroc_config', JSON.stringify(config));

                // Wipe old data first before switching
                const prevAddress = currentConfig?.address;
                if (prevAddress && sessionId) {
                    fetch('/api/emails', {
                        method: 'DELETE',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ action: 'wipe', address: prevAddress, sessionId: sessionId })
                    }).catch(() => { });
                }

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
            // 🔄 If this is a Gmail alias, silently trigger the Inbox Sync Poller concurrently
            if (emailAddress.includes('@gmail.com') || emailAddress.includes('@googlemail.com')) {
                fetch('/api/cron/gmail-sync').catch(e => console.warn('Gmail Sync failed:', e));
            }

            // Normalize @googlemail.com → @gmail.com for consistent DB lookups
            const normalizedAddress = emailAddress.replace(/@googlemail\.com$/, '@gmail.com');
            // Fetch from both the original and normalized addresses to ensure complete inbox
            const fetchAddr = normalizedAddress !== emailAddress ? normalizedAddress : emailAddress;
            const res = await fetch(`/api/emails?address=${encodeURIComponent(fetchAddr)}&sessionId=${sessionId}`, { headers: { 'x-api-key': 'public_beta_key_v1' } });
            if (res.ok) {
                const data = await res.json();

                // Track security history across all messages
                const history: { type: 'tracker' | 'fraud'; detail: string; timestamp: string; }[] = [];
                data.forEach((msg: EmailMessage) => {
                    if (msg.blockedTrackers) {
                        msg.blockedTrackers.forEach((t: string) => {
                            history.push({ type: 'tracker', detail: t, timestamp: msg.receivedAt });
                        });
                    }
                    if (msg.isThreat) {
                        history.push({ type: 'fraud', detail: msg.threatReason || 'Suspicious sender/content', timestamp: msg.receivedAt });
                    }
                });
                setBlockedHistory(history);

                // AI ANALYSIS (Backend + Local Fallback)
                const enhancedData = data.map((msg: EmailMessage) => {
                    // Prefer backend data
                    if (msg.category && msg.isThreat !== undefined) {
                        return msg;
                    }

                    // Fallback for legacy emails without AI metadata
                    let category: string = 'primary';
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

    // --- Gmail Sync on Initial Load (Fallback) ---
    // Real-time delivery flows through: Gmail → Cloudflare Forward → Webhook → Socket.IO/SSE → Client
    // This single on-mount sync is a safety net to catch any emails that arrived while offline.
    useEffect(() => {
        const isGmailAlias = emailAddress &&
            (emailAddress.includes('@gmail.com') || emailAddress.includes('@googlemail.com'));
        if (!isGmailAlias || !sessionId) return;

        // Single sync on mount, not a polling interval
        fetch('/api/cron/gmail-sync')
            .then(() => fetchMessages())
            .catch(e => console.warn('Gmail initial sync failed:', e));
    }, [emailAddress, sessionId, fetchMessages]);

    const triggerArrivalFeedback = useCallback(() => {
        console.log("🎊 Triggering Arrival Feedback (Animation + Sound)");
        setShowReceivedAnim(true);
        setTimeout(() => setShowReceivedAnim(false), 5000);

        try { new Audio('/mixkit-correct-answer-tone-2870.wav').play().catch(() => { }); } catch { }
    }, []);

    const handleIncomingMessage = useCallback((newMsg: EmailMessage) => {
        console.log("✨ New Email Signal Received!", newMsg._id);

        if (newMsg.ownerSessionId && newMsg.ownerSessionId !== sessionId) {
            console.log("⏭️ Skipping email for different session");
            return;
        }

        setMessages((prev: EmailMessage[]) => {
            if (prev.some(m => m._id === newMsg._id)) return prev;

            triggerArrivalFeedback();

            // Gmail Verification Auto-Capture
            const isGoogleVerification =
                (newMsg.from?.toLowerCase().includes('google.com') || newMsg.from?.toLowerCase().includes('gmail.com')) &&
                (newMsg.subject?.toLowerCase().includes('gmail confirmation') || newMsg.text?.includes('verification code'));

            if (isGoogleVerification) {
                const codeMatch = (newMsg.text || newMsg.html || "").match(/verification code:?\s*(\d{6,})/i);
                if (codeMatch && codeMatch[1]) {
                    setVerificationCode(codeMatch[1]);
                    setVerificationAlias(newMsg.to[0]);
                    setShowVerificationModal(true);
                }
            }

            // Update blocked history for new message
            if (newMsg.blockedTrackers || newMsg.isThreat) {
                setBlockedHistory(prev => {
                    const next = [...prev];
                    if (newMsg.blockedTrackers) {
                        newMsg.blockedTrackers.forEach((t: string) => {
                            next.push({ type: 'tracker', detail: t, timestamp: newMsg.receivedAt });
                        });
                    }
                    if (newMsg.isThreat) {
                        next.push({ type: 'fraud', detail: newMsg.threatReason || 'Suspicious sender/content', timestamp: newMsg.receivedAt });
                    }
                    return next;
                });
            }

            return [newMsg, ...prev] as EmailMessage[];
        });
    }, [sessionId, triggerArrivalFeedback]);

    // --- Socket Logic ---
    useEffect(() => {
        const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL;
        if (!socketUrl) {
            console.warn("Socket URL not configured");
            return;
        }

        const socket = io(socketUrl, {
            reconnection: true,
            reconnectionDelay: 1000,
            reconnectionDelayMax: 5000,
            reconnectionAttempts: Infinity,
            transports: ['websocket', 'polling']
        });

        socket.on('connect', () => {
            console.log("🟢 Socket Connected!");
            setIsConnected(true);
            if (emailAddress) {
                socket.emit('join', emailAddress);
                // Also join the normalized variant so notifications from the webhook
                // (which normalizes @googlemail.com → @gmail.com) are received
                const normalized = emailAddress.replace(/@googlemail\.com$/, '@gmail.com');
                if (normalized !== emailAddress) {
                    socket.emit('join', normalized);
                }
                // And vice versa: if using @gmail.com, also listen on @googlemail.com
                const googlemail = emailAddress.replace(/@gmail\.com$/, '@googlemail.com');
                if (googlemail !== emailAddress) {
                    socket.emit('join', googlemail);
                }
            }
            if (sessionId) socket.emit('join', sessionId);
        });

        socket.on('disconnect', () => {
            console.log("🔴 Socket Disconnected");
            setIsConnected(false);
        });

        socket.on('new_email', handleIncomingMessage);

        return () => {
            socket.disconnect();
        };
    }, [emailAddress, sessionId, handleIncomingMessage]);

    // --- SSE Logic (Resilient Push) ---
    useEffect(() => {
        const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL;
        if (!socketUrl || (!emailAddress && !sessionId)) return;

        console.log("📡 Initializing SSE Stream...");
        const sseUrl = `${socketUrl}/stream?address=${encodeURIComponent(emailAddress || '')}&sessionId=${encodeURIComponent(sessionId || '')}`;
        const eventSource = new EventSource(sseUrl);

        eventSource.onopen = () => console.log("🟢 SSE Stream Connected!");

        eventSource.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                handleIncomingMessage(data);
            } catch (err) {
                console.error("SSE Parse Error:", err);
            }
        };

        eventSource.onerror = (err) => {
            console.warn("🔴 SSE Connection Error, reconnecting...", err);
            eventSource.close();
        };

        return () => {
            console.log("👋 Closing SSE Stream");
            eventSource.close();
        };
    }, [emailAddress, sessionId, handleIncomingMessage]);



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
            const base64Data = att.content.includes(',') ? att.content.split(',')[1] : att.content;
            const sanitized = base64Data.replace(/\s+/g, '').replace(/-/g, '+').replace(/_/g, '/');
            const binaryString = atob(sanitized);
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

    const getFileIcon = (type: string, filename?: string) => {
        const lowerType = (type || '').toLowerCase();
        const ext = (filename || '').split('.').pop()?.toLowerCase() || '';

        if (lowerType.startsWith('image/')) return <Image size={14} className="text-blue-500" />;
        if (lowerType.startsWith('audio/')) return <FileAudio size={14} className="text-purple-500" />;
        if (lowerType.startsWith('video/')) return <FileVideo size={14} className="text-orange-500" />;
        if (lowerType === 'application/pdf') return <FileText size={14} className="text-red-500" />;

        // Documents
        if (lowerType.includes('word') || lowerType.includes('msword') || ext === 'doc' || ext === 'docx')
            return <FileText size={14} className="text-blue-600" />;
        if (lowerType.includes('excel') || lowerType.includes('spreadsheet') || ext === 'xls' || ext === 'xlsx' || ext === 'csv')
            return <FileText size={14} className="text-green-600" />;
        if (lowerType.includes('powerpoint') || lowerType.includes('presentation') || ext === 'ppt' || ext === 'pptx')
            return <FileText size={14} className="text-orange-600" />;

        // Archives
        if (lowerType.includes('zip') || lowerType.includes('rar') || lowerType.includes('archive') || lowerType.includes('tar') || lowerType.includes('7z') || ext === 'zip' || ext === 'rar' || ext === '7z')
            return <Archive size={14} className="text-yellow-600" />;

        // Code/Text
        if (lowerType.startsWith('text/') || lowerType.includes('json') || lowerType.includes('xml') || ['js', 'ts', 'jsx', 'tsx', 'html', 'css', 'json', 'md', 'txt'].includes(ext))
            return <AlignLeft size={14} className="text-gray-600" />;

        return <File size={14} className="text-gray-400" />;
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
                    subject: isSubjectHidden
                        ? WITTY_SUBJECTS[Math.floor(Math.random() * WITTY_SUBJECTS.length)]
                        : composeData.subject,
                    body: isPasswordProtected && emailPassword
                        ? `MC-LOCKED:${encrypt(JSON.stringify({
                            subject: composeData.subject,
                            content: composeData.body,
                            attachments: attachments
                        }), emailPassword)}`
                        : composeData.body,
                    isPasswordProtected,
                    attachments: isPasswordProtected ? [] : attachments, // Hide attachments if protected
                    sessionId: sessionId,
                    privacyLevel: 'high' // Robust privacy hint
                })
            });
            clearInterval(interval);
            setUploadProgress(100);

            if (res.ok) {
                setSendStatus('Sent!');
                setShowSentSuccess(true);
                try { new Audio('/mixkit-long-pop-2358.wav').play().catch(() => { }); } catch { }

                setMessages((prev: EmailMessage[]): EmailMessage[] => [{
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
                } as EmailMessage, ...prev]);

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
        } catch (err: unknown) {
            setSendStatus('Retry');
            const error = err as Error;
            addToast(`Send failed: ${error.message || 'Unknown error'}`, "error");
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
            <p style="margin: 0.25rem 0;"><strong>Date:</strong> ${new Date(selectedMessage.receivedAt).toLocaleString([], { hour12: true })}</p>
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
                const charCount = selectedMessage.text?.length || 0;
                const instructions = charCount > 1500
                    ? "This is a long email. Provide a comprehensive summary with structured bullet points capturing all key details, actions, and dates."
                    : "This is a short email. Provide a very concise 1-2 sentence summary.";
                prompt = `${instructions}\n\nFrom: ${selectedMessage.from}\nSubject: ${selectedMessage.subject}\nContent: ${selectedMessage.text}`;
            } else if (action === 'receipts') {
                prompt = "Identify any receipts or financial transactions in these emails. List the Amount, Date, and Merchant:\n\n";
                prompt += messages.map(m => `Subject: ${m.subject}\nContent: ${m.text.slice(0, 300)}`).join('\n');
            } else if (action === 'draft') {
                if (!selectedMessage) { addToast("Select an email to draft a reply for.", "error"); setIsSummarizing(false); return; }
                const tone = "professional";
                prompt = `Draft a ${tone} reply to the following email. Keep it concise.\n\nFrom: ${selectedMessage.from}\nSubject: ${selectedMessage.subject}\nContent: ${selectedMessage.text}`;
            }

            let text = "";

            // Primary: Backend AI (OpenRouter)
            try {
                if (action === 'summarize_selected' && selectedMessage) {
                    // Use dedicated summarize endpoint with structured prompt + attachment context
                    const res = await fetch('/api/ai/summarize', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            text: selectedMessage.text,
                            subject: selectedMessage.subject,
                            attachments: selectedMessage.attachments || []
                        })
                    });
                    if (res.ok) {
                        const data = await res.json();
                        text = data.summary;
                    }
                } else if (action === 'summarize') {
                    // Bulk summarize all emails using the summarize endpoint
                    const bulkText = messages.slice(0, 10).map(m =>
                        `From: ${m.from}\nSubject: ${m.subject}\nContent: ${m.text?.slice(0, 300)}...`
                    ).join('\n\n---\n\n');
                    const res = await fetch('/api/ai/summarize', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ text: bulkText, subject: 'Inbox Summary (multiple emails)' })
                    });
                    if (res.ok) {
                        const data = await res.json();
                        text = data.summary;
                    }
                } else {
                    // Drafts, receipts → use /api/ai/write
                    const res = await fetch('/api/ai/write', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ topic: prompt, tone: 'Professional', action: 'write' })
                    });
                    if (res.ok) {
                        const data = await res.json();
                        text = data.content;
                    }
                }
            } catch (err) {
                console.warn("Backend AI failed, trying Puter fallback...", err);
            }

            // Fallback: Puter.js
            const win = window as unknown as { puter?: { ai: { chat: (p: string, options: { model: string }) => Promise<unknown> } } };
            if (!text && win.puter) {
                try {
                    const resp = (await win.puter.ai.chat(prompt, { model: 'kimi' })) as PuterResponse | string;
                    text = typeof resp === 'string' ? resp : resp?.message?.content || JSON.stringify(resp);
                } catch (e) {
                    console.warn("Puter AI failed...", e);
                }
            }

            if (!text) throw new Error("AI failed to generate response");
            const cleanedText = cleanAiResponse(typeof text === 'string' ? text : (text as PuterResponse)?.message?.content || "");

            if (action === 'draft') {
                const plainTextDraft = stripMarkdown(cleanedText);
                setComposeData(prev => ({ ...prev, body: plainTextDraft }));
                setShowDockedCompose(true);
                addToast("Draft generated!", "success");
            } else if (action === 'summarize_selected') {
                // Individual summary: show the detailed modal view instead of inline
                if (selectedMessage) {
                    setSummary(cleanedText);
                    setShowSummaryModal(true);
                }
                addToast("Summary generated", "success");
            } else {
                // Bulk summary: show modal
                setSummary(cleanedText);
                setShowSummaryModal(true);
                addToast("Analysis complete", "success");
            }

        } catch (err: unknown) {
            console.error("AI Action Error:", err);
            const error = err as Error;
            const msg = error?.message || (typeof err === 'object' && err !== null ? JSON.stringify(err) : String(err));
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

            // Try Backend Fallback First (OpenRouter)
            try {
                const res = await fetch('/api/ai/write', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ topic: refinement ? prompt : topic })
                });
                if (res.ok) {
                    const data = await res.json();
                    text = data.content;
                }
            } catch (err) { console.warn("Backend Write failed", err); }

            // Fallback to Puter
            const win = window as unknown as { puter?: { ai: { chat: (p: string, options: { model: string }) => Promise<unknown> } } };
            if (!text && win.puter) {
                try {
                    const resp = (await win.puter.ai.chat(prompt, { model: 'kimi' })) as PuterResponse | string;
                    text = typeof resp === 'string' ? resp : resp?.message?.content || JSON.stringify(resp);
                } catch (e) { console.warn("Puter AI Write failed", e); }
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

            // Try Backend API First (OpenRouter)
            try {
                const res = await fetch('/api/ai/write', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ topic: prompt })
                });
                if (res.ok) {
                    const data = await res.json();
                    result = data.content;
                }
            } catch (err) { console.warn("Backend Polish failed", err); }

            // Fallback to Puter
            const win = window as unknown as { puter?: { ai: { chat: (p: string, options: { model: string }) => Promise<unknown> } } };
            if (!result && win.puter) {
                try {
                    const resp = (await win.puter.ai.chat(prompt, { model: 'kimi' })) as PuterResponse | string;
                    result = typeof resp === 'string' ? resp : resp?.message?.content || JSON.stringify(resp);
                } catch (e) { console.warn("Puter Polish failed", e); }
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

        } catch (err: unknown) {
            console.error("TTS Error:", err);
            const error = err as Error;
            addToast(`Speech failed: ${error.message}`, "error");
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
            body: `\n\n---------- Forwarded message ---------\nFrom: ${selectedMessage.from}\nDate: ${new Date(selectedMessage.receivedAt).toLocaleString([], { hour12: true })}\nSubject: ${selectedMessage.subject}\n\n${selectedMessage.text || ''}`
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

        setMessages((prev: EmailMessage[]) => [draftMsg as EmailMessage, ...prev]);
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

    const filteredMessages = messages.filter(msg => {
        const targetFolder = activeFolder || 'inbox';

        if (targetFolder === 'security_report') {
            return false;
        }

        if (targetFolder === 'inbox') {
            return (!msg.folder || msg.folder === 'inbox') && msg.from !== emailAddress;
        }
        if (targetFolder === 'sent') {
            return msg.folder === 'sent' || msg.from === emailAddress;
        }
        return msg.folder === targetFolder;
    });

    const handleClearSecurityHistory = async () => {
        try {
            await fetch('/api/emails', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', 'x-api-key': 'public_beta_key_v1' },
                body: JSON.stringify({ action: 'clear-security', address: emailAddress })
            });
            setBlockedHistory([]);
            setMessages(prev => prev.map(m => ({ ...m, isThreat: false, blockedTrackers: [], threatReason: undefined })));
            addToast("Security history cleared", "success");
        } catch {
            addToast("Failed to clear security history", "error");
        }
    };

    const getInitials = (s: string) => {
        const str = s ? s.replace(/<[^>]+>/g, '').trim() : '';
        return str ? str.slice(0, 2).toUpperCase() : '??';
    };
    const extractEmailAddress = (s: string) => {
        const match = (s || '').match(/<(.+)>/);
        return match ? match[1].trim().toLowerCase() : (s || '').trim().toLowerCase();
    };
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
                        <div className={`${styles.navItem} ${activeFolder === 'security_report' ? styles.navItemActive : ''}`} onClick={() => setActiveFolder('security_report')} title="Security Report">
                            <div className={styles.navItemIcon}><ShieldCheck size={18} /> {!isSidebarCollapsed && 'Security Repo'}</div>
                            {!isSidebarCollapsed && blockedHistory.length > 0 && <span className={styles.badge} style={{ background: '#ef4444' }}>{blockedHistory.length}</span>}
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

                                <div className={styles.privacyToggleRow}>
                                    <div className={styles.privacyInfo}>
                                        <div className={styles.privacyLabel}>
                                            <ShieldCheck size={14} className="text-green-500" />
                                            <span>Instant Clean</span>
                                        </div>
                                        <p className={styles.privacyDesc}>Auto-wipe all mail on exit</p>
                                    </div>
                                    <Switch
                                        id="instant-clean-toggle"
                                        checked={isInstantClean}
                                        onChange={(val) => {
                                            if (val) setShowInstantCleanConfirm(true);
                                            else setIsInstantClean(false);
                                        }}
                                    />
                                </div>

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
                                <span
                                    className={isConnected ? styles.statusDot : styles.statusDotDisconnected}
                                    title={isConnected ? "Real-time updates active 🟢" : "Real-time updates disconnected 🔴"}
                                />
                                {/* Permanent Security Badge — always visible */}
                                <div
                                    className={styles.globalThreatBadge}
                                    onClick={() => setActiveFolder('security_report')}
                                    title="View Session Security Report"
                                    style={{
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '6px',
                                        padding: '4px 10px',
                                        borderRadius: '20px',
                                        fontSize: '0.75rem',
                                        fontWeight: 600,
                                        background: blockedHistory.length > 0 ? 'rgba(239,68,68,0.08)' : 'rgba(34,197,94,0.08)',
                                        color: blockedHistory.length > 0 ? '#dc2626' : '#16a34a',
                                        border: `1px solid ${blockedHistory.length > 0 ? 'rgba(239,68,68,0.2)' : 'rgba(34,197,94,0.2)'}`,
                                        transition: 'all 0.2s',
                                    }}
                                >
                                    {blockedHistory.length > 0 ? (
                                        <>
                                            <ShieldAlert size={14} />
                                            <span>{blockedHistory.filter(h => h.type === 'fraud').length} Threats</span>
                                            <span style={{ color: '#94a3b8' }}>|</span>
                                            <ShieldCheck size={14} style={{ color: '#16a34a' }} />
                                            <span style={{ color: '#16a34a' }}>{blockedHistory.filter(h => h.type === 'tracker').length} Trackers</span>
                                        </>
                                    ) : (
                                        <>
                                            <ShieldCheck size={14} />
                                            <span>Protected</span>
                                        </>
                                    )}
                                </div>
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
                                            <div className={styles.timeOption} onClick={() => { handleExportInbox('pdf'); setShowExportDropdown(false); }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    <FileText size={16} className="text-red-500" />
                                                    <span>PDF Doc</span>
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
                                    maxLength={60}
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
                        {activeFolder === 'security_report' ? (
                            <div style={{ flex: 1, padding: '2rem', background: '#fff', overflowY: 'auto' }}>
                                <div style={{ maxWidth: '800px', margin: '0 auto' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                                        <h2 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '12px' }}>
                                            <ShieldCheck size={32} className="text-green-500" />
                                            Security Dashboard
                                        </h2>
                                        {blockedHistory.length > 0 && (
                                            <button
                                                onClick={handleClearSecurityHistory}
                                                style={{ padding: '8px 16px', background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', borderRadius: '8px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', transition: 'all 0.2s' }}
                                                onMouseOver={e => e.currentTarget.style.background = '#fee2e2'}
                                                onMouseOut={e => e.currentTarget.style.background = '#fef2f2'}
                                            >
                                                <Trash2 size={16} /> Clear History
                                            </button>
                                        )}
                                    </div>

                                    {/* Summary Stats Cards */}
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem', marginBottom: '2rem' }}>
                                        <div style={{ background: 'rgba(239,68,68,0.04)', borderRadius: '16px', padding: '1.5rem', border: '1px solid rgba(239,68,68,0.1)' }}>
                                            <div style={{ fontSize: '3rem', fontWeight: 900, color: '#dc2626', lineHeight: 1 }}>
                                                {blockedHistory.filter(h => h.type === 'fraud').length}
                                            </div>
                                            <div style={{ fontSize: '0.9rem', color: '#7f1d1d', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', marginTop: '8px' }}>
                                                Threats Detected
                                            </div>
                                        </div>
                                        <div style={{ background: 'rgba(59,130,246,0.04)', borderRadius: '16px', padding: '1.5rem', border: '1px solid rgba(59,130,246,0.1)' }}>
                                            <div style={{ fontSize: '3rem', fontWeight: 900, color: '#2563eb', lineHeight: 1 }}>
                                                {blockedHistory.filter(h => h.type === 'tracker').length}
                                            </div>
                                            <div style={{ fontSize: '0.9rem', color: '#1e3a8a', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', marginTop: '8px' }}>
                                                Trackers Neutralized
                                            </div>
                                        </div>
                                        <div style={{ background: 'rgba(34,197,94,0.04)', borderRadius: '16px', padding: '1.5rem', border: '1px solid rgba(34,197,94,0.1)' }}>
                                            <div style={{ fontSize: '3rem', fontWeight: 900, color: '#16a34a', lineHeight: 1 }}>
                                                {blockedHistory.length}
                                            </div>
                                            <div style={{ fontSize: '0.9rem', color: '#14532d', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', marginTop: '8px' }}>
                                                Total Events
                                            </div>
                                        </div>
                                    </div>

                                    {/* Event History */}
                                    <div style={{ background: '#fff', borderRadius: '16px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
                                        <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #e2e8f0', background: '#f8fafc' }}>
                                            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: '#334155' }}>Event History</h3>
                                        </div>

                                        <div style={{ padding: '1.5rem' }}>
                                            {blockedHistory.length === 0 ? (
                                                <div style={{ textAlign: 'center', padding: '4rem 0' }}>
                                                    <ShieldCheck size={64} style={{ color: '#16a34a', margin: '0 auto 1.5rem', opacity: 0.5 }} />
                                                    <h3 style={{ color: '#0f172a', fontSize: '1.5rem', fontWeight: 800, margin: '0 0 0.5rem' }}>All Clear</h3>
                                                    <p style={{ color: '#64748b', fontSize: '1rem', margin: 0 }}>No threats or trackers detected in this session.</p>
                                                </div>
                                            ) : (
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                                    {blockedHistory.map((item, idx) => (
                                                        <div key={idx} style={{ padding: '1.25rem', background: '#f8fafc', borderRadius: '12px', borderLeft: `4px solid ${item.type === 'tracker' ? '#3b82f6' : '#ef4444'}`, borderTop: '1px solid #f1f5f9', borderRight: '1px solid #f1f5f9', borderBottom: '1px solid #f1f5f9' }}>
                                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                                                <strong style={{ fontSize: '1rem', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                                    {item.type === 'tracker' ? <><ShieldCheck size={18} style={{ color: '#3b82f6' }} /> Tracker Blocked</> : <><ShieldAlert size={18} style={{ color: '#ef4444' }} /> Fraud Detected</>}
                                                                </strong>
                                                                <span style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 500 }}>{new Date(item.timestamp).toLocaleString()}</span>
                                                            </div>
                                                            <p style={{ fontSize: '0.95rem', color: '#334155', margin: 0, lineHeight: 1.5 }}>{item.detail}</p>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div style={{ marginTop: '2rem', padding: '1.25rem', background: '#f0fdf4', borderRadius: '12px', border: '1px solid #dcfce7', display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                                        <ShieldCheck size={24} className="text-green-600" style={{ flexShrink: 0 }} />
                                        <p style={{ fontSize: '0.95rem', color: '#166534', margin: 0, lineHeight: 1.5 }}>
                                            MailCroc actively neutralizes invisible tracking pixels and analyzes incoming mail for phishing, spoofing, and scam attempts in real-time, keeping your temporary inbox secure.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <>
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
                                                <div style={{ position: 'relative', width: '36px', height: '36px', flexShrink: 0 }}>
                                                    <img
                                                        src={`https://unavatar.io/${extractEmailAddress(msg.from)}?fallback=false`}
                                                        style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover', position: 'absolute', top: 0, left: 0, zIndex: 2 }}
                                                        onError={(e) => { e.currentTarget.style.display = 'none'; }}
                                                        alt={getInitials(msg.from)}
                                                    />
                                                    <div className={styles.avatar} style={{ backgroundColor: getAvatarColor(msg.from), position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 1, margin: 0 }}>
                                                        {getInitials(msg.from)}
                                                    </div>
                                                </div>
                                                <div className={styles.msgContent}>
                                                    <div className={styles.msgHeaderRow}>
                                                        <span className={styles.msgSender}>{activeFolder === 'sent' ? `To: ${msg.to}` : msg.from}</span>
                                                        <div className={styles.hoverActions}>
                                                            <button onClick={(e) => handlePinMessage(e, msg)} className={`${styles.iconBtnSmall} ${msg.pinned ? 'text-yellow-500' : 'text-gray-400'}`} title={msg.pinned ? "Unpin" : "Pin"}><Star size={14} fill={msg.pinned ? "currentColor" : "none"} /></button>
                                                            <button onClick={(e) => handleDeleteMessage(e, msg)} className={styles.iconBtnSmall} title="Delete"><Trash2 size={14} /></button>
                                                        </div>
                                                        <span className={styles.msgDate}>{new Date(msg.receivedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })}</span>
                                                    </div>
                                                    <div className={styles.msgSubjectRow}>
                                                        {msg.isThreat && <ShieldAlert size={14} className="text-red-500 mr-1" />}
                                                        <span className={styles.msgSubject}>{msg.subject}</span>
                                                    </div>
                                                    <div className={styles.msgSnippet}>{msg.text?.slice(0, 50)}...</div>
                                                    {/* Security & Attachment Badges */}
                                                    <div style={{ display: 'flex', gap: '4px', marginTop: '4px', flexWrap: 'wrap' }}>
                                                        {msg.isThreat && (
                                                            <span style={{
                                                                display: 'inline-flex', alignItems: 'center', gap: '3px',
                                                                padding: '1px 6px', borderRadius: '10px', fontSize: '0.65rem',
                                                                background: 'rgba(239,68,68,0.12)', color: '#dc2626', fontWeight: 600
                                                            }}>
                                                                <ShieldAlert size={10} /> Threat
                                                            </span>
                                                        )}
                                                        {msg.blockedTrackers && msg.blockedTrackers.length > 0 && (
                                                            <span style={{
                                                                display: 'inline-flex', alignItems: 'center', gap: '3px',
                                                                padding: '1px 6px', borderRadius: '10px', fontSize: '0.65rem',
                                                                background: 'rgba(34,197,94,0.12)', color: '#16a34a', fontWeight: 600
                                                            }}>
                                                                <ShieldCheck size={10} /> {msg.blockedTrackers.length} Blocked
                                                            </span>
                                                        )}
                                                        {msg.attachments && msg.attachments.length > 0 && (
                                                            <span style={{
                                                                display: 'inline-flex', alignItems: 'center', gap: '3px',
                                                                padding: '1px 6px', borderRadius: '10px', fontSize: '0.65rem',
                                                                background: 'rgba(99,102,241,0.12)', color: '#4f46e5', fontWeight: 600
                                                            }}>
                                                                <Paperclip size={10} /> {msg.attachments.length}
                                                            </span>
                                                        )}
                                                    </div>
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

                                                        {/* Tracker Shield Badge */}
                                                        {(selectedMessage?.blockedTrackers && selectedMessage.blockedTrackers.length > 0) ? (
                                                            <div className={styles.trackerWrapper}>
                                                                <div
                                                                    className={styles.trackerBadge}
                                                                    onClick={() => setShowTrackerModal(!showTrackerModal)}
                                                                    title="View Blocked Trackers"
                                                                >
                                                                    <ShieldCheck size={16} />
                                                                    <span>{selectedMessage.blockedTrackers.length} Blocked</span>
                                                                </div>

                                                                {showTrackerModal && (
                                                                    <div className={styles.trackerDropdown}>
                                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '0.75rem', borderBottom: '1px solid #e5e7eb', paddingBottom: '0.5rem' }}>
                                                                            <ShieldCheck size={18} className="text-green-500" />
                                                                            <strong style={{ color: '#111827', fontSize: '0.9rem' }}>Tracker Intercepts</strong>
                                                                        </div>
                                                                        <ul style={{ margin: 0, padding: '0 0 0 1rem', fontSize: '0.85rem', color: '#4b5563' }}>
                                                                            {selectedMessage.blockedTrackers.map((tracker, idx) => (
                                                                                <li key={idx} style={{ marginBottom: '4px' }}>{tracker}</li>
                                                                            ))}
                                                                        </ul>
                                                                        <div style={{ marginTop: '0.75rem', fontSize: '0.75rem', color: '#9ca3af', fontStyle: 'italic' }}>
                                                                            Invisible tracking pixels and beacons neutralized to protect your privacy.
                                                                        </div>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        ) : <></>}

                                                        <button
                                                            className={styles.iconBtn}
                                                            onClick={isPlayingAudio ? stopReadAloud : handleReadAloud}
                                                            title={isPlayingAudio ? "Stop Reading" : "Read Aloud"}
                                                            style={{ color: isPlayingAudio ? '#ef4444' : '#64748b' }}>
                                                            {isPlayingAudio ? <Square size={18} fill="currentColor" /> : <Volume2 size={18} />}
                                                        </button>
                                                        <button onClick={(e) => selectedMessage && handleDeleteMessage(e as unknown as React.MouseEvent, selectedMessage)} className={styles.iconBtn} title="Delete"><Trash2 size={18} /></button>
                                                    </div>
                                                </div>

                                                {/* THREAT WARNING */}
                                                {selectedMessage.isThreat && (
                                                    <div className={styles.threatBanner} onClick={() => setActiveFolder('security_report')} style={{ cursor: 'pointer' }}>
                                                        <AlertTriangle size={20} />
                                                        <span><strong>Security Warning:</strong> {selectedMessage.threatReason || "This email has been flagged as suspicious by heuristics. Proceed with caution."} <span style={{ textDecoration: 'underline', marginLeft: '8px' }}>View Details</span></span>
                                                    </div>
                                                )}

                                                <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: '1rem 0' }}>{selectedMessage.subject}</h2>
                                                <div className={styles.meta}>
                                                    <span>From: <strong>{selectedMessage.from}</strong></span>
                                                    <span>{new Date(selectedMessage.receivedAt).toLocaleString([], { hour12: true })}</span>
                                                </div>

                                                {/* IN-MAIL AI SUMMARY */}
                                                {selectedMessage.summary && selectedMessage && (activeFolder !== 'sent') && (
                                                    <div className={styles.inMailSummary}>
                                                        <div className={styles.summaryHeader}>
                                                            <div className={styles.summaryTitle}>
                                                                <AILogo size={14} color="#84cc16" />
                                                                <span>AI Summary</span>
                                                            </div>
                                                            <button onClick={() => {
                                                                if (selectedMessage) {
                                                                    setSelectedMessage({ ...selectedMessage, summary: undefined });
                                                                }
                                                            }} className={styles.closeSummary}>×</button>
                                                        </div>
                                                        <div className={styles.summaryContent}>
                                                            <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeSanitize]}>
                                                                {selectedMessage.summary || ''}
                                                            </ReactMarkdown>
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
                                                                                                {getFileIcon(att.type, att.name)}
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

                                                        {/* Regular Attachments (Not Locked) */}
                                                        {selectedMessage.attachments && selectedMessage.attachments.length > 0 && unlockedMessageId !== selectedMessage._id && (
                                                            <div style={{ marginTop: '2rem', borderTop: '1px solid #e2e8f0', paddingTop: '1rem' }}>
                                                                <h4 style={{ fontSize: '0.9rem', fontWeight: 600, marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                                    <Paperclip size={14} /> Attachments ({selectedMessage.attachments.length})
                                                                </h4>
                                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                                                    {selectedMessage.attachments.map((att, idx) => {
                                                                        const sizeStr = att.size >= 1048576 ? `${(att.size / 1048576).toFixed(1)} MB` : `${(att.size / 1024).toFixed(1)} KB`;
                                                                        const scan = att.scanResult;
                                                                        const scanColor = scan?.verdict === 'safe' ? '#16a34a' : scan?.verdict === 'malicious' ? '#dc2626' : scan?.verdict === 'suspicious' ? '#f59e0b' : '#94a3b8';
                                                                        const scanBg = scan?.verdict === 'safe' ? 'rgba(34,197,94,0.08)' : scan?.verdict === 'malicious' ? 'rgba(239,68,68,0.08)' : scan?.verdict === 'suspicious' ? 'rgba(245,158,11,0.08)' : 'rgba(148,163,184,0.08)';
                                                                        const scanLabel = scan?.verdict === 'safe' ? '✓ Safe' : scan?.verdict === 'malicious' ? '✗ Malicious' : scan?.verdict === 'suspicious' ? '⚠ Suspicious' : '• Not scanned';
                                                                        const isImage = att.type?.startsWith('image/');
                                                                        return (
                                                                            <div
                                                                                key={idx}
                                                                                style={{
                                                                                    display: 'flex', alignItems: 'center', gap: '12px',
                                                                                    padding: '0.75rem 1rem', background: '#f8fafc', borderRadius: '10px',
                                                                                    border: '1px solid #e2e8f0', transition: 'all 0.2s', position: 'relative',
                                                                                }}
                                                                                onMouseOver={e => { e.currentTarget.style.borderColor = '#cbd5e1'; e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.06)'; }}
                                                                                onMouseOut={e => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.boxShadow = 'none'; }}
                                                                            >
                                                                                {/* File Icon */}
                                                                                <div style={{ background: '#fff', padding: '8px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', flexShrink: 0 }}>
                                                                                    {getFileIcon(att.type, att.name)}
                                                                                </div>

                                                                                {/* File Info */}
                                                                                <div style={{ flex: 1, minWidth: 0 }}>
                                                                                    <div style={{ fontWeight: 500, fontSize: '0.85rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: '#1e293b' }}>
                                                                                        {att.name}
                                                                                    </div>
                                                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '2px' }}>
                                                                                        <span style={{ fontSize: '0.72rem', color: '#64748b' }}>{sizeStr}</span>
                                                                                        <span style={{ fontSize: '0.72rem', color: '#cbd5e1' }}>•</span>
                                                                                        <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>{att.type?.split('/')[1]?.toUpperCase() || 'FILE'}</span>
                                                                                    </div>
                                                                                </div>

                                                                                {/* VT Scan Badge */}
                                                                                <div style={{
                                                                                    display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px', flexShrink: 0,
                                                                                }}>
                                                                                    <span style={{
                                                                                        display: 'inline-flex', alignItems: 'center', gap: '3px',
                                                                                        padding: '2px 8px', borderRadius: '10px', fontSize: '0.65rem',
                                                                                        fontWeight: 600, background: scanBg, color: scanColor,
                                                                                    }}>
                                                                                        {scanLabel}
                                                                                    </span>
                                                                                    <span style={{ fontSize: '0.6rem', color: '#94a3b8' }}>Scanned by MailCroc</span>
                                                                                </div>

                                                                                {/* Preview Button */}
                                                                                {att.content && (
                                                                                    <button
                                                                                        onClick={(e) => { e.stopPropagation(); setPreviewAttachment(att); }}
                                                                                        style={{
                                                                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                                                            padding: '8px', borderRadius: '8px', border: '1px solid #e2e8f0',
                                                                                            background: '#fff', cursor: 'pointer', transition: 'all 0.2s', flexShrink: 0,
                                                                                        }}
                                                                                        onMouseOver={e => { e.currentTarget.style.background = '#eff6ff'; e.currentTarget.style.borderColor = '#93c5fd'; }}
                                                                                        onMouseOut={e => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.borderColor = '#e2e8f0'; }}
                                                                                        title={`Preview ${att.name}`}
                                                                                    >
                                                                                        <Eye size={16} style={{ color: '#3b82f6' }} />
                                                                                    </button>
                                                                                )}

                                                                                {/* Download Button */}
                                                                                <button
                                                                                    onClick={(e) => { e.stopPropagation(); handleDownloadAttachment(att); }}
                                                                                    style={{
                                                                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                                                        padding: '8px', borderRadius: '8px', border: '1px solid #e2e8f0',
                                                                                        background: '#fff', cursor: 'pointer', transition: 'all 0.2s', flexShrink: 0,
                                                                                    }}
                                                                                    onMouseOver={e => { e.currentTarget.style.background = '#f0fdf4'; e.currentTarget.style.borderColor = '#86efac'; }}
                                                                                    onMouseOut={e => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.borderColor = '#e2e8f0'; }}
                                                                                    title={`Download ${att.name}`}
                                                                                >
                                                                                    <Download size={16} style={{ color: '#16a34a' }} />
                                                                                </button>

                                                                                {/* Image Hover Preview (for image attachments) */}
                                                                                {isImage && att.content && (
                                                                                    <div className={styles.attachmentPreview} style={{
                                                                                        position: 'absolute', bottom: '100%', left: '50%', transform: 'translateX(-50%)',
                                                                                        marginBottom: '8px', padding: '4px', background: '#fff', borderRadius: '8px',
                                                                                        boxShadow: '0 4px 16px rgba(0,0,0,0.15)', display: 'none', zIndex: 100,
                                                                                        maxWidth: '280px', maxHeight: '200px', overflow: 'hidden',
                                                                                    }}>
                                                                                        <img
                                                                                            src={att.content.startsWith('data:') ? att.content : `data:${att.type};base64,${att.content.replace(/\\s+/g, '').replace(/-/g, '+').replace(/_/g, '/')}`}
                                                                                            alt={att.name}
                                                                                            style={{ width: '100%', height: '100%', objectFit: 'contain', borderRadius: '6px' }}
                                                                                        />
                                                                                    </div>
                                                                                )}
                                                                            </div>
                                                                        );
                                                                    })}
                                                                </div>
                                                            </div>
                                                        )}

                                                    </>
                                                )}
                                            </div>

                                            {/* Inline Reply - Now triggers Modal */}
                                            <div className={styles.inlineReplyBox}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem' }}>
                                                    <div className={styles.replyAvatar} style={{ overflow: 'hidden', position: 'relative' }}>
                                                        <img
                                                            src={`https://unavatar.io/${extractEmailAddress(selectedMessage.from)}?fallback=false`}
                                                            style={{ width: '100%', height: '100%', objectFit: 'cover', position: 'absolute', top: 0, left: 0, zIndex: 2 }}
                                                            onError={(e) => { e.currentTarget.style.display = 'none'; }}
                                                            alt="Avatar"
                                                        />
                                                        <User size={18} style={{ position: 'relative', zIndex: 1 }} />
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
                                                                                console.log('Puter check:', (window as unknown as { puter?: unknown }).puter);

                                                                                const resp = await (window as unknown as { puter: any }).puter.ai.chat("Describe this image in detail.", {
                                                                                    model: 'gpt-4o',
                                                                                    images: [base64Image]
                                                                                });
                                                                                const text = (resp as PuterResponse)?.message?.content || JSON.stringify(resp);
                                                                                setSummary(text);
                                                                                setShowSummaryModal(true);
                                                                                addToast("Image analyzed!", "success");
                                                                            } catch (err: unknown) {
                                                                                console.error("Vision Error Object:", err);
                                                                                addToast(`Vision Error: ${(err as Error)?.message || 'Unknown error'}`, "error");
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
                            </>
                        )}
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

                    // Total size limit: 10MB
                    const MAX_SIZE = 10 * 1024 * 1024;
                    const totalSize = [
                        ...attachments,
                        ...incomingItems
                    ].reduce((acc, f) => acc + ('size' in f ? f.size : 0), 0);

                    if (totalSize > MAX_SIZE) {
                        addToast("Total attachments size exceeds 10MB limit", "error");
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
                handleAiWrite={handleAiWrite as (topic: string, refinement?: "polish" | "formalize" | "elaborate" | "shorten") => Promise<void>}
                polishText={polishText}
                isAiWriting={isSummarizing}
                getFileIcon={getFileIcon}
                senderAddress={senderAddress}
                setSenderAddress={setSenderAddress}
                availableAddresses={[emailAddress, ...externalIdentities].filter(addr =>
                    addr && (addr.includes('@'))
                )}
                isSubjectHidden={isSubjectHidden}
                setIsSubjectHidden={(val) => {
                    // Show confirmation for ANY change to this setting
                    setNextSubjectHiddenValue(val);
                    setShowHideSubjectConfirm(true);
                }}
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

            {/* Hide Subject Confirmation */}
            <ConfirmationModal
                isOpen={showHideSubjectConfirm}
                onClose={() => setShowHideSubjectConfirm(false)}
                onConfirm={() => {
                    setIsSubjectHidden(nextSubjectHiddenValue);
                    setShowHideSubjectConfirm(false);
                }}
                title="Privacy: Hide Subject"
                message={nextSubjectHiddenValue
                    ? "Enabling this will replace your email subject with a witty, random alternative to hide the true purpose from sniffers. Proceed?"
                    : "Turning this off will make your real subject visible in the email metadata. This is less secure. Proceed?"
                }
                confirmText="Yes, Proceed"
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
                            Enter this code in your Gmail &quot;Send Mail As&quot; settings to finish the stealth setup.
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

            {/* Received Mail Overlay */}
            {showReceivedAnim && (
                <div className={styles.modalOverlay} style={{ zIndex: 9999 }}>
                    <div className={styles.modalContent} style={{ textAlign: 'center', padding: '2rem', border: '2px solid #84cc16' }}>
                        <LottiePlayer
                            animationData={newMsgAnim}
                            loop={true}
                            style={{ width: 200, height: 200, margin: '0 auto' }}
                        />
                        <h3 style={{ fontSize: '1.5em', fontWeight: 'bold', marginTop: '1rem', color: '#16a34a' }}>
                            New Mail Received! 🥒✨
                        </h3>
                        <p style={{ color: '#64748b', marginTop: '0.5rem' }}>A new message has arrived in your stealth inbox.</p>
                    </div>
                </div>
            )}

            <ConfirmationModal
                isOpen={showInstantCleanConfirm}
                onClose={() => setShowInstantCleanConfirm(false)}
                onConfirm={() => {
                    setIsInstantClean(true);
                    setShowInstantCleanConfirm(false);
                }}
                title="Enable Instant Clean?"
                message="With this enabled, closing your browser tab or refreshing the page will PERMANENTLY delete all received and sent emails for this session. This action cannot be undone."
                confirmText="Enable Protection"
            />

            {/* File Preview Modal */}
            {previewAttachment && (
                <div className={styles.modalOverlay} onClick={() => setPreviewAttachment(null)} style={{ zIndex: 3000 }}>
                    <div onClick={e => e.stopPropagation()} style={{
                        background: '#fff', borderRadius: '16px', width: '90%', maxWidth: '900px', maxHeight: '90vh',
                        display: 'flex', flexDirection: 'column', overflow: 'hidden',
                        boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', animation: 'modalPop 0.3s cubic-bezier(0.16,1,0.3,1)',
                    }}>
                        {/* Preview Header */}
                        <div style={{
                            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                            padding: '1rem 1.25rem', borderBottom: '1px solid #f1f5f9', background: '#f8fafc',
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                {getFileIcon(previewAttachment.type, previewAttachment.name)}
                                <div>
                                    <div style={{ fontWeight: 600, fontSize: '0.9rem', color: '#1e293b' }}>{previewAttachment.name}</div>
                                    <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                                        {previewAttachment.size >= 1048576 ? `${(previewAttachment.size / 1048576).toFixed(1)} MB` : `${(previewAttachment.size / 1024).toFixed(1)} KB`}
                                        {' · '}{previewAttachment.type?.split('/')[1]?.toUpperCase() || 'FILE'}
                                    </div>
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <button onClick={() => handleDownloadAttachment(previewAttachment)} style={{
                                    display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 14px',
                                    background: '#f0fdf4', border: '1px solid #86efac', borderRadius: '8px',
                                    color: '#16a34a', fontWeight: 600, fontSize: '0.8rem', cursor: 'pointer',
                                }}>
                                    <Download size={14} /> Download
                                </button>
                                <button onClick={() => setPreviewAttachment(null)} style={{
                                    display: 'flex', alignItems: 'center', padding: '6px 10px',
                                    background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: '8px',
                                    cursor: 'pointer', color: '#64748b',
                                }}>
                                    <X size={18} />
                                </button>
                            </div>
                        </div>

                        <div style={{ flex: 1, overflow: 'auto', display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '1rem', background: '#fafafa', minHeight: '300px' }}>
                            {(() => {
                                const type = previewAttachment.type || '';
                                // Clean the base64 content: remove whitespace, fix URL-safe chars, handle possible data: prefix
                                const raw = previewAttachment.content?.startsWith('data:')
                                    ? previewAttachment.content.split(',')[1]
                                    : previewAttachment.content?.replace(/\s+/g, '').replace(/-/g, '+').replace(/_/g, '/') || '';

                                const dataUri = `data:${type};base64,${raw}`;

                                if (type.startsWith('image/')) {
                                    return <img src={dataUri} alt={previewAttachment.name} style={{ maxWidth: '100%', maxHeight: '70vh', objectFit: 'contain', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />;
                                }

                                if (type === 'application/pdf') {
                                    return <iframe src={dataUri} style={{ width: '100%', height: '70vh', border: 'none', borderRadius: '8px' }} title={previewAttachment.name} />;
                                }

                                if (type.startsWith('audio/')) {
                                    return (
                                        <div style={{ textAlign: 'center', padding: '2rem' }}>
                                            <FileAudio size={64} style={{ color: '#8b5cf6', marginBottom: '1.5rem' }} />
                                            <audio controls src={dataUri} style={{ width: '100%', maxWidth: '400px' }} autoPlay />
                                            <p style={{ marginTop: '1rem', color: '#64748b', fontSize: '0.9rem' }}>{previewAttachment.name}</p>
                                        </div>
                                    );
                                }

                                if (type.startsWith('video/')) {
                                    return <video controls src={dataUri} style={{ maxWidth: '100%', maxHeight: '70vh', borderRadius: '8px' }} />;
                                }

                                const docExtensions = ['docx', 'doc', 'xlsx', 'xls', 'pptx', 'ppt', 'txt', 'csv'];
                                const ext = previewAttachment.name.split('.').pop()?.toLowerCase() || '';

                                if (docExtensions.includes(ext) || type.includes('officedocument') || type.includes('msword') || type.includes('excel') || type.includes('powerpoint')) {
                                    return (
                                        <div style={{ width: '100%', height: '70vh', borderRadius: '8px', overflow: 'hidden' }}>
                                            <DocViewer
                                                documents={[{ uri: dataUri, fileName: previewAttachment.name }]}
                                                config={{ header: { disableHeader: true } }}
                                                pluginRenderers={docRenderers}
                                                theme={{
                                                    primary: "#1e293b",
                                                    secondary: "#f8fafc",
                                                    tertiary: "#f1f5f9",
                                                    textPrimary: "#1e293b",
                                                    textSecondary: "#64748b",
                                                    textTertiary: "#94a3b8",
                                                    disableThemeScrollbar: true,
                                                }}
                                            />
                                        </div>
                                    );
                                }

                                if (type.startsWith('text/') || type.includes('json') || type.includes('xml') || type.includes('javascript') || type.includes('css') || type.includes('html')) {
                                    try {
                                        // Better base64 to UTF-8 decoding
                                        const binaryString = atob(raw);
                                        const bytes = new Uint8Array(binaryString.length);
                                        for (let i = 0; i < binaryString.length; i++) {
                                            bytes[i] = binaryString.charCodeAt(i);
                                        }
                                        const decoded = new TextDecoder().decode(bytes);

                                        return (
                                            <pre style={{
                                                width: '100%', maxHeight: '70vh', overflow: 'auto', padding: '1.5rem',
                                                background: '#1e293b', color: '#e2e8f0', borderRadius: '10px',
                                                fontSize: '0.85rem', lineHeight: 1.6, fontFamily: '"Fira Code", "Courier New", monospace',
                                                whiteSpace: 'pre-wrap', wordBreak: 'break-word', border: '1px solid #334155'
                                            }}>
                                                {decoded}
                                            </pre>
                                        );
                                    } catch {
                                        return <p style={{ color: '#94a3b8' }}>Unable to decode text content.</p>;
                                    }
                                }

                                // Default Fallback
                                return (
                                    <div style={{ textAlign: 'center', color: '#64748b', padding: '4rem 2rem' }}>
                                        <File size={72} style={{ color: '#cbd5e1', marginBottom: '1.5rem' }} />
                                        <h4 style={{ fontWeight: 700, fontSize: '1.25rem', marginBottom: '0.5rem', color: '#1e293b' }}>Interactive Preview Unavailable</h4>
                                        <p style={{ fontSize: '0.9rem', maxWidth: '300px', margin: '0 auto 1.5rem' }}>
                                            The file <strong>{previewAttachment.name}</strong> ({type || 'unknown'}) cannot be previewed in this viewer.
                                        </p>
                                        <button
                                            onClick={() => handleDownloadAttachment(previewAttachment)}
                                            style={{
                                                padding: '12px 24px', background: '#10b981', color: '#fff',
                                                border: 'none', borderRadius: '12px', fontWeight: 700, cursor: 'pointer',
                                                boxShadow: '0 4px 6px -1px rgba(16, 185, 129, 0.4)', transition: 'all 0.2s'
                                            }}
                                            onMouseOver={e => e.currentTarget.style.transform = 'translateY(-2px)'}
                                            onMouseOut={e => e.currentTarget.style.transform = 'translateY(0)'}
                                        >
                                            <Download size={18} style={{ marginRight: '8px', verticalAlign: 'middle' }} /> Download File
                                        </button>
                                    </div>
                                );
                            })()}
                        </div>
                    </div>
                </div>
            )}
        </div>

    );
};

export default MailBox;
