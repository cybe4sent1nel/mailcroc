/**
 * Email type definition (no mongoose dependency)
 */
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
    summary?: string;
}
