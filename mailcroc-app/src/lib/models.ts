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
}
