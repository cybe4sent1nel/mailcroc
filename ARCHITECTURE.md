# MailCroc System Architecture

This document provides a detailed technical breakdown of the MailCroc system, separated into logical components and workflows.

## 1. High-Level Architecture

The system is built on a serverless, event-driven architecture to ensure scalability and zero maintenance.

```mermaid
graph TD
    subgraph Client_Side
        Browser[User Browser / PWA]
    end

    subgraph CDN_Edge
        CF_DNS[Cloudflare DNS & Email Routing]
        CF_Worker[Cloudflare Email Worker]
    end

    subgraph Application_Server
        Vercel[Vercel Serverless Functions]
        API_Webhook[POST /api/webhook/email]
        API_Socket[POST /api/socket/notify]
    end

    subgraph RealTime_Services
        SocketServer[Socket.IO Server]
    end

    subgraph Storage_Layer
        GitHub[GitHub Repository]
    end

    %% Flows
    Browser <-->|HTTPS| Vercel
    Browser <-->|WebSocket| SocketServer
    
    External_Email[Incoming Email] -->|SMTP| CF_DNS
    CF_DNS -->|Trigger| CF_Worker
    CF_Worker -->|POST JSON| API_Webhook
    
    API_Webhook -->|Commit JSON| GitHub
    API_Webhook -->|Notify| API_Socket
    API_Socket -->|Emit Event| SocketServer
```

---

## 2. Component Breakdown

### A. Email Ingestion (The "Croc" Worker)
*   **Role**: Acts as the SMTP ingress.
*   **Technology**: Cloudflare Email Workers.
*   **Function**: Intercepts incoming emails to `*@mailcroc.qzz.io`, parses the raw MIME data using `postal-mime` (or similar), and forwards a clean JSON payload to our Vercel Webhook.
*   **Security**: Uses a shared `WEBHOOK_SECRET` to authenticate with the Vercel API.

### B. The Application Core (Vercel)
*   **Role**: Frontend UI and API coordination.
*   **Technology**: Next.js 14 (App Router).
*   **Key Responsibilities**:
    *   **UI**: Renders the inbox, generates identities, and handles file uploads.
    *   **Webhook**: Receives parsed emails from Cloudflare.
    *   **Storage Access**: Communicates with GitHub API to save/read emails.

### C. The "Database" (GitHub)
*   **Role**: Persistent storage without a database server.
*   **Technology**: GitHub REST API.
*   **Structure**:
    *   Each email is a JSON file.
    *   Path format: `emails/{domain}/{username}/{messageId}.json`.
    *   This allows for "infinite" scalability for a temporary mail service without cost.

---

## 3. Workflows in Detail

### Workflow A: Receiving an Email
This sequence diagram illustrates exactly what happens when someone sends an email to a MailCroc address.

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

### Workflow B: Sending/Replying (with Attachments)
How MailCroc handles outgoing mail and file attachments.

```mermaid
sequenceDiagram
    participant User
    participant Frontend
    participant API as API Route
    participant Nodemailer
    participant SMTP as SMTP Relay

    User->>Frontend: Attaches File & Clicks Send
    Frontend->>Frontend: Convert File to Base64
    Frontend->>API: POST /api/emails/send
    
    activate API
    API->>API: Verify Recaptcha / Limits
    API->>Nodemailer: Create Transport
    
    Note over Nodemailer: Attaches Base64 data as Stream
    
    Nodemailer->>SMTP: Send Mail
    SMTP-->>Nodemailer: 250 OK
    Nodemailer-->>API: Success
    API-->>Frontend: { success: true }
    deactivate API
    
    Frontend->>User: Show "Sent" Animation
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
        +src/components/ (UI)
        +src/lib/ (Logic)
        +public/ (Assets)
    }
    
    class Keyfiles {
        +page.tsx (Landing)
        +features/MailBox.tsx (Inbox Logic)
        +api/webhook/route.ts (Ingestion)
    }

    ProjectRoot *-- MailCrocApp
    MailCrocApp *-- Keyfiles
```
