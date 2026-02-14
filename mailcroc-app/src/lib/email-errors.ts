// Helper function to generate error response with alternatives
export function generateSenderRestrictedError(from: string) {
    const isGmail = from.toLowerCase().includes('@gmail.com') || from.toLowerCase().includes('@googlemail.com');
    const domain = from.split('@')[1] || 'unknown';

    return {
        error: `You cannot send emails from ${domain} addresses directly.`,
        code: 'SENDER_ADDRESS_RESTRICTED',
        alternatives: [
            {
                title: '✅ Use MailCroc Domains',
                description: 'Send from @mailcroc.qzz.io or @mailpanda.qzz.io addresses (works instantly, zero setup)',
                action: 'Generate a new MailCroc address in the inbox',
                link: '/mail'
            },
            {
                title: '🔌 Connect Your Own SMTP',
                description: isGmail
                    ? 'Connect your Gmail via SMTP (2-minute setup, works with any email provider)'
                    : `Connect your ${domain} email server via SMTP`,
                action: 'Go to Sender Settings → Connect Own SMTP',
                link: '/sender-settings'
            },
            {
                title: '📧 Manual Gmail Verification',
                description: 'Add your MailCroc address to your Gmail account manually (5-minute one-time setup, completely free)',
                action: 'View step-by-step guide',
                link: '/docs/manual-gmail-verification'
            }
        ]
    };
}
