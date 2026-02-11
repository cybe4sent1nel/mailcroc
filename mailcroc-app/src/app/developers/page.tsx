'use client';

import React, { useState, useEffect } from 'react';
import styles from './styles.module.css';
import { Copy, Terminal, Code, Check, Key, Plus, Trash2, Eye, EyeOff, Shield } from 'lucide-react';

interface ApiKey {
    id: string;
    name: string;
    prefix: string;
    createdAt: string;
    revoked?: boolean;
}

export default function DevelopersPage() {
    const [activeTab, setActiveTab] = useState<'keys' | 'docs'>('keys');

    // Developer ID State
    const [devId, setDevId] = useState<string | null>(null);

    // Keys State
    const [keys, setKeys] = useState<ApiKey[]>([]);
    const [loadingKeys, setLoadingKeys] = useState(false);
    const [newKeyName, setNewKeyName] = useState('');
    const [createdKey, setCreatedKey] = useState<{ secret: string, name: string } | null>(null);
    const [isCreating, setIsCreating] = useState(false);

    // Initialize Developer ID
    useEffect(() => {
        let storedId = localStorage.getItem('mailcroc_dev_id');
        if (!storedId) {
            storedId = crypto.randomUUID();
            localStorage.setItem('mailcroc_dev_id', storedId);
        }
        setDevId(storedId);
    }, []);

    // Fetch Keys
    useEffect(() => {
        if (devId && activeTab === 'keys') {
            fetchKeys();
        }
    }, [devId, activeTab]);

    const fetchKeys = async () => {
        if (!devId) return;
        setLoadingKeys(true);
        try {
            const res = await fetch(`/api/developers/keys?ownerId=${devId}`);
            if (res.ok) {
                const data = await res.json();
                setKeys(data);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoadingKeys(false);
        }
    };

    const createKey = async () => {
        if (!devId || !newKeyName.trim()) return;
        setIsCreating(true);
        try {
            const res = await fetch('/api/developers/keys', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ownerId: devId, name: newKeyName })
            });
            const data = await res.json();
            if (data.success) {
                setCreatedKey({ secret: data.apiKey, name: newKeyName });
                setNewKeyName('');
                fetchKeys();
            }
        } catch (e) {
            console.error(e);
        } finally {
            setIsCreating(false);
        }
    };

    const revokeKey = async (keyId: string) => {
        if (!confirm('Are you sure you want to revoke this key? It will stop working immediately.')) return;
        try {
            await fetch('/api/developers/keys', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ownerId: devId, keyId })
            });
            fetchKeys();
        } catch (e) {
            console.error(e);
        }
    };

    return (
        <div className={styles.pageWrapper}>
            <main className={styles.main}>
                <div className={styles.intro}>
                    <h1>Developer <span className={styles.highlight}>Platform</span></h1>
                    <p>Manage your API keys and integrate MailCroc into your applications.</p>
                </div>

                <div className={styles.tabs}>
                    <button className={activeTab === 'keys' ? styles.active : ''} onClick={() => setActiveTab('keys')}>API Keys</button>
                    <button className={activeTab === 'docs' ? styles.active : ''} onClick={() => setActiveTab('docs')}>Documentation</button>
                </div>

                {activeTab === 'keys' && (
                    <div className={styles.section}>
                        {createdKey && (
                            <div className={styles.secretModal}>
                                <h3>API Key Created</h3>
                                <p>Save this key now. You won't be able to see it again.</p>
                                <div className={styles.codeBlock} style={{ display: 'flex', alignItems: 'center', gap: '1rem', border: '2px solid var(--color-bg-lime)' }}>
                                    <code>{createdKey.secret}</code>
                                    <button onClick={() => navigator.clipboard.writeText(createdKey.secret)}><Copy size={16} /></button>
                                </div>
                                <button className={styles.actionBtn} onClick={() => setCreatedKey(null)}>Done</button>
                            </div>
                        )}

                        <div className={styles.createCard}>
                            <h3>Create New Key</h3>
                            <div style={{ display: 'flex', gap: '1rem' }}>
                                <input
                                    type="text"
                                    placeholder="Key Name (e.g. Test Runner)"
                                    value={newKeyName}
                                    onChange={(e) => setNewKeyName(e.target.value)}
                                    className={styles.input}
                                />
                                <button className={styles.actionBtn} onClick={createKey} disabled={isCreating || !newKeyName}>
                                    {isCreating ? 'Creating...' : <><Plus size={16} /> Create</>}
                                </button>
                            </div>
                        </div>

                        <h3>Your API Keys</h3>
                        <div className={styles.keysList}>
                            {loadingKeys ? <p>Loading...</p> : keys.length === 0 ? <p className={styles.desc}>No API keys found.</p> : (
                                keys.map(key => (
                                    <div key={key.id} className={`${styles.endpointCard} ${key.revoked ? styles.revoked : ''}`}>
                                        <div style={{ flex: 1 }}>
                                            <div style={{ fontWeight: 600 }}>{key.name}</div>
                                            <div className={styles.desc}>{key.prefix} • Created {new Date(key.createdAt).toLocaleDateString()}</div>
                                        </div>
                                        {key.revoked ? (
                                            <span className={styles.badgeRevoked}>Revoked</span>
                                        ) : (
                                            <button className={styles.revokeBtn} onClick={() => revokeKey(key.id)} title="Revoke Key">
                                                <Trash2 size={16} />
                                            </button>
                                        )}
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                )}

                {activeTab === 'docs' && <DocsContent />}
            </main>
        </div>
    );
}

function DocsContent() {
    const [activeCodeTab, setActiveCodeTab] = useState('curl');
    const baseUrl = 'https://mailcroc.qzz.io/api/v1';
    const apiKey = '<YOUR_API_KEY>';

    const endpoints = [
        { method: 'POST', path: '/generate', desc: 'Generate random email addresses', body: { count: 5, domain: 'mailcroc.qzz.io' } },
        { method: 'GET', path: '/inbox/:address', desc: 'Get all emails for a specific address' },
        { method: 'GET', path: '/emails/:id', desc: 'Get a specific email by ID' },
        { method: 'DELETE', path: '/inbox/:address', desc: 'Delete all emails for a specific address' }
    ];

    const codeExamples = {
        curl: `
# Generate 5 emails
curl -X POST ${baseUrl}/generate \\
  -H "x-api-key: ${apiKey}" \\
  -d '{"count": 5}'

# Get Inbox
curl ${baseUrl}/inbox/test@mailcroc.qzz.io \\
  -H "x-api-key: ${apiKey}"`,
        js: `
// Generate Emails
const res = await fetch('${baseUrl}/generate', {
  method: 'POST',
  headers: { 'x-api-key': '${apiKey}' },
  body: JSON.stringify({ count: 5 })
});
const data = await res.json();
console.log(data.emails);`,
        // ... (Other languages omitted for brevity but logic is same)
        python: `
import requests

# Get Inbox
headers = {"x-api-key": "${apiKey}"}
res = requests.get(
    "${baseUrl}/inbox/test@mailcroc.qzz.io", 
    headers=headers
)
print(res.json())`,
        go: `
package main

import (
    "fmt"
    "io/ioutil"
    "net/http"
)

func main() {
    url := "${baseUrl}/inbox/test@mailcroc.qzz.io"
    req, _ := http.NewRequest("GET", url, nil)
    req.Header.Add("x-api-key", "${apiKey}")

    res, _ := http.DefaultClient.Do(req)
    defer res.Body.Close()
    body, _ := ioutil.ReadAll(res.Body)

    fmt.Println(string(body))
}`,
        php: `
<?php

$curl = curl_init();

curl_setopt_array($curl, array(
  CURLOPT_URL => "${baseUrl}/inbox/test@mailcroc.qzz.io",
  CURLOPT_RETURNTRANSFER => true,
  CURLOPT_HTTPHEADER => array(
    "x-api-key: ${apiKey}"
  ),
));

$response = curl_exec($curl);
curl_close($curl);
echo $response;
`,
        java: `
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;

public class Main {
    public static void main(String[] args) throws Exception {
        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create("${baseUrl}/inbox/test@mailcroc.qzz.io"))
                .header("x-api-key", "${apiKey}")
                .method("GET", HttpRequest.BodyPublishers.noBody())
                .build();
        HttpResponse<String> response = HttpClient.newHttpClient().send(request, HttpResponse.BodyHandlers.ofString());
        System.out.println(response.body());
    }
}
`
    };

    return (
        <div>
            <section className={styles.section}>
                <h2>Authentication</h2>
                <p>Include the <code>x-api-key</code> header in all requests. You can manage your keys in the <b>API Keys</b> tab.</p>
            </section>

            <section className={styles.section}>
                <h2>Endpoints</h2>
                <div className={styles.endpointList}>
                    {endpoints.map((ep, i) => (
                        <div key={i} className={styles.endpointCard}>
                            <div className={styles.methodBadge} data-method={ep.method}>{ep.method}</div>
                            <code className={styles.path}>{ep.path}</code>
                            <span className={styles.desc}>{ep.desc}</span>
                        </div>
                    ))}
                </div>
            </section>

            <section className={styles.section}>
                <h2>Code Examples</h2>
                <div className={styles.tabs}>
                    {Object.keys(codeExamples).map(lang => (
                        <button key={lang} className={activeCodeTab === lang ? styles.active : ''} onClick={() => setActiveCodeTab(lang)}>
                            {lang.toUpperCase()}
                        </button>
                    ))}
                </div>
                <pre className={styles.codeSnippet}>
                    {codeExamples[activeCodeTab as keyof typeof codeExamples]}
                </pre>
            </section>
        </div>
    );
}
