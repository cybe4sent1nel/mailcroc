# MailCroc System Architecture

This document provides a detailed technical breakdown of the MailCroc system, separated into logical components and workflows.

## 1. High-Level Architecture

The system is built on a serverless, event-driven architecture to ensure scalability and zero maintenance.

```mermaid
graph TD
    subgraph Client_Side
        Browser[User Browser / PWA]
        Lottie[Lottie Animations]
        Puter_JS[Puter.js AI Engine]
    end

    subgraph CDN_Edge
        CF_DNS[Cloudflare DNS & Email Routing]
        CF_Worker[Cloudflare Email Worker]
    end

    subgraph Application_Server
        Vercel[Vercel Serverless Functions]
        API_Webhook[POST /api/webhook/email]
        API_Socket[POST /api/socket/notify]
        Secure_Portal[Secure Portal /secure-view]
    end

    subgraph RealTime_Services
        SocketServer[Socket.IO Server]
    end

    subgraph Storage_Layer
        GitHub_Repo[GitHub Repository - Live Storage]
        GitHub_Releases[GitHub Releases - Archives]
    end

    %% Flows
    Browser <-->|HTTPS| Vercel
    Browser <-->|WebSocket| SocketServer
    Browser <-->|AI Tasks| Puter_JS
    
    External_Email[Incoming Email] -->|SMTP| CF_DNS
    CF_DNS -->|Trigger| CF_Worker
    CF_Worker -->|POST JSON| API_Webhook
    
    API_Webhook -->|Commit JSON| GitHub_Repo
    API_Webhook -->|Notify| API_Socket
    API_Socket -->|Emit Event| SocketServer

    Vercel -->|Cron Cleanup| GitHub_Releases
    GitHub_Releases -.->|Delete| GitHub_Repo
```

---

## 2. Component Breakdown

### A. Email Ingestion (The "Croc" Worker)
*   **Role**: Acts as the SMTP ingress.
*   **Technology**: Cloudflare Email Workers.
*   **Function**: Intercepts incoming emails, parses raw MIME data, and forwards a clean JSON payload to our Vercel Webhook.

### B. The Application Core (Vercel)
*   **Role**: Frontend UI and API coordination.
*   **Technology**: Next.js 14 (App Router).
*   **Key Responsibilities**:
    *   **UI**: Renders the inbox, generates identities, and handles file uploads.
    *   **Secure Portal**: Decrypts and displays password-protected messages client-side.
    *   **Storage Access**: Communicates with GitHub API to save/read emails.

### C. AI Engine (Puter.js Integration)
*   **Role**: Intelligent email management.
*   **Capabilities**: 
    *   **Summarization**: Condenses long emails into bullet points.
    *   **Help me write**: Generates replies or new emails based on topics.
    *   **Speech-to-Text**: Reads emails aloud.
*   **Fallback**: If Puter.js is unavailable, the system transparently falls back to individual LLM API endpoints.

### D. The Storage System (GitHub Multi-Tier)
*   **Live Store**: GitHub REST API stores emails as JSON files in a private repo.
*   **Archive Store**: An automated cron job bundles old emails into ZIP assets and uploads them to **GitHub Releases**, keeping the live repository clean and performant.

---

## 3. Workflows in Detail

### Workflow A: Receiving an Email (Live)
```mermaid
sequenceDiagram
    participant Sender as External Sender
    participant CF as Cloudflare Worker
    participant API as Vercel Webhook
    participant GH as GitHub Repo
    participant Socket as Socket.IO Server
    participant Client as User Frontend

    Sender->>CF: Sends Email (SMTP)
    activate CF
    CF->>CF: Parse Raw Email -> JSON
    CF->>API: POST /api/webhook/email (JSON + Secret)
    activate API
    
    API->>API: Validate Secret
    API->>GH: PUT /repos/.../contents/emails/...json
    activate GH
    GH-->>API: 201 Created (Success)
    deactivate GH
    
    API->>Socket: POST /notify (Email Metadata)
    activate Socket
    Socket-->>Client: emit('new-email', data)
    Socket-->>API: 200 OK
    deactivate Socket
    
    API-->>CF: 200 OK
    deactivate API
    deactivate CF
    
    Client->>Client: Display New Email Toast
```

### Workflow B: Secure Portal Access (Client-Side Encryption)
```mermaid
sequenceDiagram
    participant User as Recipient
    participant Portal as Secure Portal (/secure-view)
    participant GH as GitHub API
    participant JS as Client-Side Crypto

    User->>Portal: Enters Message ID & Password
    Portal->>GH: Fetch Encrypted Content (.json)
    GH-->>Portal: Return Encrypted Data
    Portal->>JS: Decrypt with User Password
    JS-->>Portal: Cleartext Markdown
    Portal->>User: Renders Secure Content
```

### Workflow C: GitHub Archival Cron
```mermaid
sequenceDiagram
    participant Cron as Vercel Cron (.cleanup)
    participant GH_API as GitHub REST API
    participant Release as GitHub Releases

    Cron->>GH_API: List Files in /emails older than 24h
    GH_API-->>Cron: File List
    Cron->>Cron: Package into ZIP Bundle
    Cron->>Release: Create Release & Upload Asset
    Cron->>GH_API: Delete original files from Repo
```

---

## 4. Directory Structure

```mermaid
classDiagram
    class ProjectRoot {
        +mailcroc-app/ (Frontend + API)
        +mailcroc-worker/ (CF Worker)
        +README.md
    }
    
    class MailCrocApp {
        +src/app/ (Pages)
        +src/app/secure-view/ (Secure Portal)
        +src/components/ (UI/Lottie)
        +src/lib/ (Logic/Encryption)
        +public/ (Animations)
    }
    
    class Keyfiles {
        +page.tsx (Landing)
        +MailBox.tsx (Inbox Logic)
        +api/webhook/route.ts (Ingestion)
        +api/cron/cleanup/route.ts (Archiver)
    }

    ProjectRoot *-- MailCrocApp
    MailCrocApp *-- Keyfiles
```
