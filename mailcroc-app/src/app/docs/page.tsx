
'use client';

import React, { useState } from 'react';
import styles from './styles.module.css';
import { Copy, Terminal, Code, Check } from 'lucide-react';

export default function DocsPage() {
    const [activeTab, setActiveTab] = useState('curl');

    const baseUrl = 'https://mailcroc.qzz.io/api/v1';
    const apiKey = 'mailcroc-dev-key'; // Public dev key for now

    const endpoints = [
        {
            method: 'POST',
            path: '/generate',
            desc: 'Generate random email addresses',
            body: { count: 5, domain: 'mailcroc.qzz.io' }
        },
        {
            method: 'GET',
            path: '/inbox/:address',
            desc: 'Get all emails for a specific address'
        },
        {
            method: 'GET',
            path: '/emails/:id',
            desc: 'Get a specific email by ID'
        },
        {
            method: 'DELETE',
            path: '/inbox/:address',
            desc: 'Delete all emails for a specific address'
        }
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
        <div className={styles.pageWrapper}>
            <main className={styles.main}>
                <div className={styles.intro}>
                    <h1>API <span className={styles.highlight}>Documentation</span></h1>
                    <p>Integrate disposable email into your tests and applications.</p>
                </div>

                <section className={styles.section}>
                    <h2>Authentication</h2>
                    <p>Include the <code>x-api-key</code> header in all requests.</p>
                    <div className={styles.codeBlock}>
                        x-api-key: {apiKey}
                    </div>
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
                        <button className={activeTab === 'curl' ? styles.active : ''} onClick={() => setActiveTab('curl')}>cURL</button>
                        <button className={activeTab === 'js' ? styles.active : ''} onClick={() => setActiveTab('js')}>Node.js</button>
                        <button className={activeTab === 'python' ? styles.active : ''} onClick={() => setActiveTab('python')}>Python</button>
                        <button className={activeTab === 'go' ? styles.active : ''} onClick={() => setActiveTab('go')}>Go</button>
                        <button className={activeTab === 'php' ? styles.active : ''} onClick={() => setActiveTab('php')}>PHP</button>
                        <button className={activeTab === 'java' ? styles.active : ''} onClick={() => setActiveTab('java')}>Java</button>
                    </div>
                    <pre className={styles.codeSnippet}>
                        {codeExamples[activeTab as keyof typeof codeExamples]}
                    </pre>
                </section>
            </main>
        </div>
    );
}
