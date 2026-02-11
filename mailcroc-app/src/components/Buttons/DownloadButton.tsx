import React, { useState, useEffect } from 'react';
import styles from './DownloadButton.module.css';

const DownloadButton = () => {
    const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

    useEffect(() => {
        // Check if event was already captured globally
        if ((window as any).deferredPrompt) {
            setDeferredPrompt((window as any).deferredPrompt);
        }

        const handler = (e: any) => {
            e.preventDefault();
            // Store globally so other components or remounts can access it
            (window as any).deferredPrompt = e;
            setDeferredPrompt(e);
            console.log("PWA Install Prompt captured");
        };

        window.addEventListener('beforeinstallprompt', handler);

        return () => {
            window.removeEventListener('beforeinstallprompt', handler);
        };
    }, []);

    const handleInstallClick = async () => {
        if (!deferredPrompt) {
            return;
        }

        deferredPrompt.prompt();

        const { outcome } = await deferredPrompt.userChoice;
        console.log(`User response to the install prompt: ${outcome}`);

        setDeferredPrompt(null);
        (window as any).deferredPrompt = null;
    };

    if (!deferredPrompt) {
        // Optionally hide button or keep it for manual instructions or desktop app link
        // For now, keeping it visible but maybe we can disable it or show a tooltip?
        // User asked to "make sure it triggers", implying it should work when available.
        // Let's keep it rendered but maybe add a console log if clicked without prompt.
    }

    return (
        <div className={styles.wrapper}>
            <button className={styles.button} type="button" onClick={handleInstallClick}>
                <span className={styles.buttonText}>Download</span>
                <span className={styles.buttonIcon}>
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 35 35" className={styles.svg}>
                        <path d="M17.5,22.131a1.249,1.249,0,0,1-1.25-1.25V2.187a1.25,1.25,0,0,1,2.5,0V20.881A1.25,1.25,0,0,1,17.5,22.131Z" />
                        <path d="M17.5,22.693a3.189,3.189,0,0,1-2.262-.936L8.487,15.006a1.249,1.249,0,0,1,1.767-1.767l6.751,6.751a.7.7,0,0,0,.99,0l6.751-6.751a1.25,1.25,0,0,1,1.768,1.767l-6.752,6.751A3.191,3.191,0,0,1,17.5,22.693Z" />
                        <path d="M31.436,34.063H3.564A3.318,3.318,0,0,1,.25,30.749V22.011a1.25,1.25,0,0,1,2.5,0v8.738a.815.815,0,0,0,.814.814H31.436a.815.815,0,0,0,.814-.814V22.011a1.25,1.25,0,1,1,2.5,0v8.738A3.318,3.318,0,0,1,31.436,34.063Z" />
                    </svg>
                </span>
            </button>
        </div>
    );
}

export default DownloadButton;
