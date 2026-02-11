"use client";
import React from 'react';
import LogoLoop, { LogoItem } from '../LogoLoop/LogoLoop';
import ScrollFloat from '../ScrollFloat/ScrollFloat';
import './TrustedBrands.css';

const LOGOS: LogoItem[] = [
    { src: "https://upload.wikimedia.org/wikipedia/commons/thumb/4/4b/Cloudflare_Logo.svg/2560px-Cloudflare_Logo.svg.png", alt: "Cloudflare" },
    { src: "https://upload.wikimedia.org/wikipedia/commons/0/08/Netflix_2015_logo.svg", alt: "Netflix" },
    { src: "https://upload.wikimedia.org/wikipedia/commons/2/21/Nvidia_logo.svg", alt: "Nvidia" },
    { src: "https://upload.wikimedia.org/wikipedia/commons/thumb/7/78/Anthropic_logo.svg/2560px-Anthropic_logo.svg.png", alt: "Anthropic" },
    { src: "https://upload.wikimedia.org/wikipedia/commons/thumb/8/8e/Nextjs-logo.svg/2560px-Nextjs-logo.svg.png", alt: "Next.js" },
    { src: "https://upload.wikimedia.org/wikipedia/commons/thumb/5/51/Google_Cloud_logo.svg/2560px-Google_Cloud_logo.svg.png", alt: "Google Cloud" },
    { src: "https://upload.wikimedia.org/wikipedia/commons/thumb/9/96/Microsoft_logo_%282012%29.svg/2560px-Microsoft_logo_%282012%29.svg.png", alt: "Microsoft" },
    { src: "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a9/Amazon_logo.svg/2560px-Amazon_logo.svg.png", alt: "Amazon" },
    // Use a simpler, more reliable URL for Vercel
    { src: "https://assets.vercel.com/image/upload/v1588805858/repositories/vercel/logo.png", alt: "Vercel" }
];

const TrustedBrands: React.FC = () => {
    return (
        <section className="trusted-brands-section">
            <ScrollFloat as="h3" containerClassName="trusted-brands-title">
                Powering teams at
            </ScrollFloat>
            <div className="trusted-brands-loop">
                <LogoLoop logos={LOGOS} />
            </div>
        </section>
    );
};

export default TrustedBrands;
