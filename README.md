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

**MailCroc** is a next-generation temporary email service built for privacy, speed, and modern web standards. Unlike traditional temp mail services that are riddled with ads and delays, MailCroc offers a premium, ad-free experience with **instant WebSocket delivery**, **AI-powered tools**, and **end-to-end password protection**.

It relies on a serverless architecture, using **Cloudflare Email Workers** to ingest emails and **GitHub** as a free, high-tier storage solution.

## 🚀 Key Features

### 🛡️ Privacy & Security
*   **🔐 Password Protected Emails**: Send encrypted emails to external addresses (Gmail/Outlook) via a secure web portal. Only accessible with your shared code.
*   **Zero Logs**: We do not store IP addresses or browser fingerprints.
*   **Ephemeral Inboxes**: All emails are stored in a private repository and can be auto-expired.
*   **Stealth Mode**: Uses a pool of 100+ domains to bypass "unacceptable email" filters.

### 🤖 AI-Powered Intelligence
*   **Help me write (Gemini-style)**: Generate professional replies or new emails instantly using our integrated AI engine (powered by Puter.js).
*   **Smart Summarization**: Get the gist of long emails with one click.
*   **Vision & Voice**: Extract text from images and have your emails read aloud by professional AI voices.

### ⚡ Real-Time Experience
*   **Instant Delivery**: Emails appear in your inbox milliseconds after they are received via Socket.IO.
*   **No Refreshing**: The UI updates live. No more mashing the F5 button.

### 📧 Advanced Email Capabilities
*   **Reply & Compose**: Full support for sending new emails and replying to received ones.
*   **Attachments**: Send and receive files (Images, PDFs, Docs) up to 25MB.
*   **Export Options**: One-click export of emails to **PDF**, **Markdown**, or **JSON**.
*   **Archiving**: Old emails are automatically moved to GitHub Releases to keep the live system fast.

### 💻 Modern UI/UX
*   **PWA Support**: Installable as a native-like app on iOS, Android, and Desktop with offline support.
*   **Draggable Compose**: A premium, draggable workspace for multitasking.
*   **Offline Mode**: View previously loaded emails even without an internet connection.

## 🏗️ Architecture

MailCroc operates on a 100% serverless infrastructure, ensuring high availability and zero maintenance costs.

```mermaid
graph TD
    subgraph Client
        Browser[User Browser / PWA]
        AI[Puter.js AI Engine]
    end

    subgraph Serverless_Core
        Vercel[Next.js on Vercel]
        CF_Worker[Cloudflare Ingress]
    end

    subgraph Storage
        GitHub_Repo[Live JSON Store]
        GitHub_Releases[Archival Store]
    end

    %% Flows
    Browser <-->|HTTPS| Vercel
    CF_Worker -->|Webhook| Vercel
    Vercel -->|Commit| GitHub_Repo
    Vercel -->|Archive| GitHub_Releases
    Browser <-->|AI Tasks| AI
```

> 📚 **Deep Dive**: For detailed sequence diagrams and component breakdowns, check out [ARCHITECTURE.md](./ARCHITECTURE.md).

## 🛠️ Tech Stack

-   **Framework**: [Next.js 16 (App Router)](https://nextjs.org/)
-   **Language**: [TypeScript](https://www.typescriptlang.org/)
-   **AI Engine**: [Puter.js](https://js.puter.com/)
-   **Animations**: Lottie (via `lottie-react`)
-   **Real-time**: Socket.IO
-   **Deployment**: Vercel & Cloudflare Workers

## 🏁 Getting Started

### Prerequisites
-   Node.js 18+
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

3.  **Run the App**
    ```bash
    npm run dev:all
    ```
    This starts the Next.js frontend and the local mail server concurrently. Visit `http://localhost:3000`.

## 📦 Deployment

### Vercel (Frontend & API)
1.  Push code to GitHub and import to Vercel.
2.  Set the **Root Directory** to `mailcroc-app`.
3.  Add `GITHUB_TOKEN`, `GITHUB_REPO_OWNER`, and `GITHUB_REPO_NAME` to Env Vars.

### Cloudflare (Email Ingress)
1.  Deploy the worker in `mailcroc-worker/` via `npx wrangler deploy`.
2.  Route your domain's email traffic to the worker in the Cloudflare Dashboard.

## 📖 Usage Guide

1.  **Generate Identity**: Select an identity type (Standard, Plus, Dot, or Gmail).
2.  **Secure Your Mail**: Toggle "Password Protection" in the compose modal to send an encrypted link.
3.  **Use AI**: Click "Help me write" in the compose window to generate content instantly.
4.  **Export**: Use the export dropdown to save emails as PDF or Markdown.

---

<p align="center">
  Built by <strong>Generic</strong> | Powered by <strong>Vercel & Cloudflare</strong>
</p>
