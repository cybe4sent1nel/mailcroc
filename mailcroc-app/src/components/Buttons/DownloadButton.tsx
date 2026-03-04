import React, { useState, useEffect, useRef } from 'react';
import styles from './DownloadButton.module.css';
import InstallModal from '../Modal/InstallModal';

const DownloadButton = () => {
    const promptRef = useRef<any>(null);
    const [showInstallModal, setShowInstallModal] = useState(false);

    useEffect(() => {
        // Check if event was already captured globally
        const win = window as unknown as { deferredPrompt?: any };
        if (win.deferredPrompt) {
            promptRef.current = win.deferredPrompt;
        }

        const handler = (e: any) => {
            e.preventDefault();
            // Store globally so other components or remounts can access it
            (window as unknown as { deferredPrompt?: any }).deferredPrompt = e;
            promptRef.current = e;
            console.log("PWA Install Prompt captured");
        };

        window.addEventListener('beforeinstallprompt', handler as EventListener);

        return () => {
            window.removeEventListener('beforeinstallprompt', handler as EventListener);
        };
    }, []);

    const handleInstallClick = async () => {
        if (!promptRef.current) {
            // If prompt is not available, we could still show the modal or a toast
            // But usually this means it's already installed or not supported
            return;
        }

        const promptEvent = promptRef.current as { prompt: () => void, userChoice: Promise<{ outcome: string }> };
        promptEvent.prompt();

        const { outcome } = await promptEvent.userChoice;
        console.log(`User response to the install prompt: ${outcome}`);

        promptRef.current = null;
        (window as unknown as { deferredPrompt?: any }).deferredPrompt = null;
    };

    return (
        <>
            <div className={styles.wrapper}>
                <button className={styles.button} type="button" onClick={() => setShowInstallModal(true)}>
                    <span className={styles.buttonText}>Get App</span>
                    <span className={styles.buttonIcon}>
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 35 35" className={styles.svg}>
                            <path d="M17.5,22.131a1.249,1.249,0,0,1-1.25-1.25V2.187a1.25,1.25,0,0,1,2.5,0V20.881A1.25,1.25,0,0,1,17.5,22.131Z" />
                            <path d="M17.5,22.693a3.189,3.189,0,0,1-2.262-.936L8.487,15.006a1.249,1.249,0,0,1,1.767-1.767l6.751,6.751a.7.7,0,0,0,.99,0l6.751-6.751a1.25,1.25,0,0,1,1.768,1.767l-6.752,6.751A3.191,3.191,0,0,1,17.5,22.693Z" />
                            <path d="M31.436,34.063H3.564A3.318,3.318,0,0,1,.25,30.749V22.011a1.25,1.25,0,0,1,2.5,0v8.738a.815.815,0,0,0,.814.814H31.436a.815.815,0,0,0,.814-.814V22.011a1.25,1.25,0,1,1,2.5,0v8.738A3.318,3.318,0,0,1,31.436,34.063Z" />
                        </svg>
                    </span>
                </button>
            </div>

            <InstallModal
                isOpen={showInstallModal}
                onClose={() => setShowInstallModal(false)}
                onInstall={handleInstallClick}
            />
        </>
    );
}

export default DownloadButton;
