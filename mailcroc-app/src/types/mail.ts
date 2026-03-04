export interface Attachment {
    name: string;
    content: string; // Base64
    type: string;
    size: number;
    scanResult?: {
        verdict: 'safe' | 'suspicious' | 'malicious' | 'unknown';
        details: string;
    };
}


export interface EmailMessage {
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
    threatReason?: string;
    blockedTrackers?: string[];
    aiAnalysis?: string;
    summary?: string;
    speechAudio?: string;
    attachments?: Attachment[];
    ownerSessionId?: string | null;
}

export interface InboxTab {
    address: string;
    config: any;
}
