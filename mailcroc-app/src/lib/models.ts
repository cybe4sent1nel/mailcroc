/**
 * Email type definition (no mongoose dependency)
 */
export interface Attachment {
    name: string;
    type: string;
    size: number;
    content: string; // Base64
}

export interface IEmail {
    from: string;
    to: string[];
    subject: string;
    text: string;
    html: string;
    messageId: string;
    receivedAt: Date | string;
    pinned: boolean;
    read?: boolean;
    expiresAt?: Date | string | null;
    folder?: 'inbox' | 'sent' | 'trash' | 'spam' | 'drafts';
    category?: 'primary' | 'social' | 'updates' | 'promotions' | 'spam';
    isThreat?: boolean;
    threatReason?: string;
    blockedTrackers?: string[];
    summary?: string;
    ownerSessionId?: string;
    speechAudio?: string; // Base64 audio content
    attachments?: Attachment[];
}
