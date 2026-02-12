import type { Metadata } from "next";
import { Inter, Outfit } from "next/font/google"; // Added Outfit
import Script from "next/script"; // Added Script
import "./globals.css";
import Header from "@/components/Header/Header";
import Footer from "@/components/Footer/Footer";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const outfit = Outfit({ subsets: ["latin"], variable: "--font-outfit" }); // Defined Outfit

export const metadata: Metadata = {
  title: "MailCroc | Best Temporary Email Service & Disposable Inbox",
  description: "Secure, free, and fast temporary email. Protect your privacy with anonymous disposable email addresses. No registration required.",
  keywords: "temp mail, disposable email, anonymous email, throwaway mail, fake email, secure inbox, privacy protection",
  openGraph: {
    title: "MailCroc Premium Temp Mail",
    description: "Get your secure temporary email instantly. No spam, no tracking.",
    type: "website",
    siteName: "MailCroc",
  },
  icons: {
    icon: "/logo.png",
    shortcut: "/logo.png",
    apple: "/logo.png",
  },
  other: {
    "google-adsense-account": "ca-pub-2332002596329232",
  },
};

import { ToastProvider } from "@/components/Toast/ToastContext"; // Import Provider

// ... imports

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} ${outfit.variable}`}>
        <ToastProvider>
          <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
            <Header />
            <main style={{ flex: 1 }}>
              {children}
            </main>
            <Footer />
          </div>
        </ToastProvider>
        <Script id="pwa-install-handler" strategy="beforeInteractive">
          {`
          window.deferredPrompt = null;
          window.addEventListener('beforeinstallprompt', (e) => {
            e.preventDefault();
            window.deferredPrompt = e;
            console.log('Global: beforeinstallprompt captured');
          });
        `}
        </Script>
        <Script id="register-sw" strategy="afterInteractive">
          {`
          if ('serviceWorker' in navigator) {
            window.addEventListener('load', function() {
              navigator.serviceWorker.register('/sw.js').then(
                function(registration) {
                  console.log('Service Worker registration successful with scope: ', registration.scope);
                },
                function(err) {
                  console.log('Service Worker registration failed: ', err);
                }
              );
            });
          }
        `}
        </Script>
        <Script
          id="adsense-init"
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-2332002596329232"
          crossOrigin="anonymous"
          strategy="afterInteractive"
        />
        <Script src="https://js.puter.com/v2/" strategy="beforeInteractive" />
      </body>
    </html>
  );
}
