<p align="center">
  <img src="./mailcroc.png" alt="MailCroc Logo" width="180" style="border-radius: 24px; box-shadow: 0 10px 30px rgba(0,0,0,0.1);" />
</p>

<h1 align="center">MailCroc</h1>

<p align="center">
  <strong>The Ultimate Real-Time Disposable Email Service</strong>
</p>

<p align="center">
  <a href="#-key-features">Features</a> •
  <a href="#-architecture">Architecture</a> •
  <a href="#-getting-started">Getting Started</a> •
  <a href="#-usage-guide">Usage</a> •
  <a href="#-deployment">Deployment</a>
</p>

---

**MailCroc** is a next-generation temporary email service built for privacy, speed, and modern web standards. Unlike traditional temp mail services that are riddled with ads and delays, MailCroc offers a premium, ad-free experience with **instant WebSocket delivery**, **attachment support**, and **stealth domains**.

It relies on a serverless architecture, using **Cloudflare Email Workers** to ingest emails and **GitHub** as a free, unlimited database.

## 🚀 Key Features

### 🛡️ Privacy & Security
*   **Zero Logs**: We do not store IP addresses or browser fingerprints.
*   **Ephemeral Inboxes**: All emails are stored in a private repository and can be auto-expired.
*   **Stealth Mode**: Uses a pool of domains (e.g., `@mailcroc.qzz.io`, `@gmail.com` aliases) to bypass "unacceptable email" filters on websites.

### ⚡ Real-Time Experience
*   **Instant Delivery**: Emails appear in your inbox milliseconds after they are received via Socket.IO.
*   **No Refreshing**: The UI updates live. No more mashing the F5 button.

### 📧 Advanced Email Capabilities
*   **Reply & Compose**: Full support for sending new emails and replying to received ones.
*   **Attachments**: Send and receive files (Images, PDFs, Docs) up to 25MB.
*   **Custom Expiry**: Set your inbox to self-destruct after 10 minutes, 1 hour, or keep it until you close the tab.
*   **Forwarding**: Forward important emails to your real inbox.

### 💻 Modern UI/UX
*   **PWA Support**: Installable as a native-like app on iOS, Android, and Desktop.
*   **Dark Mode**: Sleek, eye-friendly design.
*   **Offline Mode**: View previously loaded emails even without an internet connection.

## 🏗️ Architecture

MailCroc operates on a 100% serverless infrastructure, ensuring high availability and zero maintenance costs.

*   **Frontend**: Next.js 14 (App Router) deployed on **Vercel**.
*   **Ingress**: Cloudflare Email Workers intercept SMTP traffic.
*   **Storage**: GitHub REST API (using a private repo as a JSON document store).
*   **Real-time**: Socket.IO server for pushing updates to the client.

> 📚 **Deep Dive**: Check out [ARCHITECTURE.md](./ARCHITECTURE.md) for detailed system diagrams and workflow explanations.

## 🛠️ Tech Stack

-   **Framework**: [Next.js 14](https://nextjs.org/)
-   **Language**: [TypeScript](https://www.typescriptlang.org/)
-   **Styling**: CSS Modules (Scoped & Performance optimized)
-   **Animations**: Lottie (via `lottie-react`)
-   **Email Parsing**: `postal-mime` & `mailparser`
-   **Deployment**: Vercel & Cloudflare Workers

## 🏁 Getting Started

### Prerequisites
-   Node.js 18+
-   npm or yarn
-   A generic GitHub account (for storage)
-   Cloudflare account (for email routing)

### Local Development

1.  **Clone the repository**
    ```bash
    git clone https://github.com/cybe4sent1nel/mailcroc.git
    cd mailcroc
    ```

2.  **Install Dependencies**
    ```bash
    cd mailcroc-app
    npm install
    ```

3.  **Environment Setup**
    Create `.env.local` inside `mailcroc-app/`:
    ```env
    # GitHub Storage Config
    GITHUB_TOKEN=your_personal_access_token
    GITHUB_REPO_OWNER=your_username
    GITHUB_REPO_NAME=your_private_repo
    
    # Security
    WEBHOOK_SECRET=your_random_secret_string
    ```

4.  **Run the App**
    ```bash
    npm run dev
    ```
    Visit `http://localhost:3000`.

## 📦 Deployment

### Vercel (Frontend & API)

1.  Push your code to GitHub.
2.  Import the project to Vercel.
3.  **CRITICAL**: Set the **Root Directory** in Vercel settings to `mailcroc-app`.
4.  Add the Environment Variables from your `.env.local`.
5.  Deploy!

### Cloudflare (Email Ingress)

1.  Navigate to `mailcroc-worker/`.
2.  Update `wrangler.toml` with your Vercel URL.
3.  Deploy:
    ```bash
    npx wrangler deploy
    ```
4.  Set the webhook secret:
    ```bash
    npx wrangler secret put WEBHOOK_SECRET
    ```
5.  Configure **Email Routing** in Cloudflare Dashboard to send all traffic to this Worker.

## 📖 Usage Guide

1.  **Generate Identity**: On the home page, select an identity type (Standard, Plus, Dot, or Gmail).
2.  **Copy Address**: Click the email address to copy it to your clipboard.
3.  **Wait for Mail**: Keep the tab open. Emails will pop up instantly.
4.  **Interact**: Click an email to read, download attachments, or reply.
5.  **Files**: To attach a file when replying, click the "Paperclip" icon in the compose modal.

## 🤝 Contributing

Contributions are welcome! Please fork the repository and submit a pull request for any features or bug fixes.

## 📄 License

This project is open-source and available under the [MIT License](LICENSE).

---

<p align="center">
  Built by <strong>Generic</strong> | Powered by <strong>Vercel & Cloudflare</strong>
</p>
