# MailCroc 🐊

<div align="center">
  <img src="public/logo.png" alt="MailCroc Logo" width="200" />
  
  <h3>The Ultimate Disposable Email Service</h3>
  
  <p>
    Secure, fast, and feature-rich disposable email service built for privacy and testing.
  </p>
</div>

---

## 🌟 Features

-   **Instant Email Generation**: Create disposable emails instantly with random or custom handles.
-   **Multiple Domains**: Support for standard domains, plus-aliases, and dot-tricks (Gmail/GoogleMail compatible).
-   **Real-Gmail Forwarding**: Use your own Gmail account to generate infinite valid aliases locally.
-   **Real-Time Updates**: Emails appear instantly without refreshing (powered by Socket.IO).
-   **Rich Inbox Management**:
    -   📌 **Pin Messages**: Save important emails (pinned emails get a green star!).
    -   🗑️ **Delete & Clean**: Remove unwanted spam.
    -   👁️ **Read Status**: Mark emails as read/unread.
    -   📝 **Compose & Reply**: Full sending capabilities.
-   **Multi-Inbox Tabs**: Manage multiple disposable identities simultaneously.
-   **Secure**: Built with privacy in mind.

## 🚀 Deployment

Deploy your own instance of MailCroc to Vercel in minutes.

### Prerequisites

1.  **GitHub Repository**: Fork or clone this repository.
2.  **Vercel Account**: Sign up at [vercel.com](https://vercel.com).
3.  **Cloudflare Account**: For domain management and email routing (optional but recommended).

### One-Click Deploy

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fyour-username%2Fmailcroc)

### Manual Deployment

1.  Install dependencies:
    ```bash
    npm install
    ```

2.  Build the application:
    ```bash
    npm run build
    ```

3.  Deploy to Vercel:
    ```bash
    npx vercel deploy --prod
    ```

## 🛠️ Configuration

Create a `.env.local` file with the following variables:

```env
# GitHub Database (Required)
GITHUB_TOKEN=your_github_pat
GITHUB_REPO_OWNER=your_username
GITHUB_REPO_NAME=your_private_repo

# Webhook Security
WEBHOOK_SECRET=your_secret_key

# Optional: Gmail Forwarding
NEXT_PUBLIC_GMAIL_USERNAME=your_username
```

## 📧 Email Routing (Cloudflare)

To receive real emails, configure **Cloudflare Email Routing**:
1.  Set up a **Catch-All** rule for your domain.
2.  Point it to the **MailCroc Worker**.
3.  Configure the worker to forward emails to `https://your-app.vercel.app/api/webhook/email`.

## 📄 License

MIT License. Built with ❤️ by the MailCroc Team.
