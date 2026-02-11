const { createServer } = require("http");
const { Server } = require("socket.io");

// Configuration
const PORT = process.env.PORT || 3001;

// Allowed origins for CORS (add your domains here)
const ALLOWED_ORIGINS = [
    "https://mailcroc.vercel.app",
    "https://mailcroc.qzz.io",
    "https://mailpanda.qzz.io",
    "http://localhost:3000",
];

/**
 * Normalize email for room matching:
 * Remove dots and +tag from local part for dot/plus trick support.
 */
function normalizeEmail(email) {
    const parts = email.toLowerCase().split("@");
    if (parts.length !== 2) return email.toLowerCase();
    const local = parts[0].split("+")[0].replace(/\./g, "");
    return `${local}@${parts[1]}`;
}

// ─── HTTP Server ───────────────────────────────────────────────
const httpServer = createServer((req, res) => {
    // CORS headers
    const origin = req.headers.origin;
    if (ALLOWED_ORIGINS.includes(origin) || !origin) {
        res.setHeader("Access-Control-Allow-Origin", origin || "*");
    }
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");

    // Preflight
    if (req.method === "OPTIONS") {
        res.writeHead(200);
        res.end();
        return;
    }

    // Health check
    if (req.method === "GET" && req.url === "/") {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({
            status: "ok",
            service: "mailcroc-server",
            uptime: process.uptime(),
            connections: io.engine.clientsCount,
        }));
        return;
    }

    // Health check (alternative path)
    if (req.method === "GET" && req.url === "/health") {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ status: "ok" }));
        return;
    }

    // ─── POST /notify ─────────────────────────────────────────
    // Called by Vercel webhook to push real-time updates to clients
    if (req.method === "POST" && req.url === "/notify") {
        let body = "";
        req.on("data", (chunk) => {
            body += chunk.toString();
        });
        req.on("end", () => {
            try {
                const data = JSON.parse(body);

                if (!data || !data.to || !Array.isArray(data.to)) {
                    res.writeHead(400, { "Content-Type": "application/json" });
                    res.end(JSON.stringify({ error: "Invalid payload: 'to' must be an array" }));
                    return;
                }

                console.log(`[NOTIFY] New email for: ${data.to.join(", ")}`);

                // Emit to all matching Socket.IO rooms
                data.to.forEach((recipient) => {
                    const exact = recipient.toLowerCase().trim();
                    const normalized = normalizeEmail(exact);

                    io.to(exact).emit("new_email", data);
                    if (normalized !== exact) {
                        io.to(normalized).emit("new_email", data);
                    }
                });

                res.writeHead(200, { "Content-Type": "application/json" });
                res.end(JSON.stringify({ success: true }));
            } catch (err) {
                console.error("[NOTIFY] Error:", err.message);
                res.writeHead(500, { "Content-Type": "application/json" });
                res.end(JSON.stringify({ error: err.message }));
            }
        });
        return;
    }

    // 404 for everything else
    res.writeHead(404, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Not Found" }));
});

// ─── Socket.IO Server ──────────────────────────────────────────
const io = new Server(httpServer, {
    cors: {
        origin: ALLOWED_ORIGINS,
        methods: ["GET", "POST"],
    },
});

io.on("connection", (socket) => {
    console.log(`[WS] Client connected: ${socket.id}`);

    socket.on("join", (emailAddress) => {
        if (emailAddress) {
            const exact = emailAddress.toLowerCase().trim();
            const normalized = normalizeEmail(emailAddress);
            socket.join(exact);
            socket.join(normalized);
            console.log(`[WS] ${socket.id} joined: ${exact}${normalized !== exact ? ` + ${normalized}` : ""}`);
        }
    });

    socket.on("leave", (emailAddress) => {
        if (emailAddress) {
            socket.leave(emailAddress.toLowerCase().trim());
            socket.leave(normalizeEmail(emailAddress));
        }
    });

    socket.on("disconnect", () => {
        console.log(`[WS] Client disconnected: ${socket.id}`);
    });
});

// ─── Start Server ──────────────────────────────────────────────
httpServer.listen(PORT, () => {
    console.log(`✅ MailCroc Socket.IO Server running on port ${PORT}`);
    console.log(`   Health: http://localhost:${PORT}/health`);
    console.log(`   Notify: POST http://localhost:${PORT}/notify`);
});
