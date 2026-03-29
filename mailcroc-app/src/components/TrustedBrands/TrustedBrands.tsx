"use client";
import React from 'react';
import LogoLoop, { LogoItem } from '../LogoLoop/LogoLoop';
import ScrollFloat from '../ScrollFloat/ScrollFloat';
import './TrustedBrands.css';

const LOGOS: LogoItem[] = [
    { src: "/brands/cloudflare.svg", alt: "Cloudflare" },
    { src: "/brands/netflix.svg", alt: "Netflix" },
    { src: "/brands/nvidia.svg", alt: "Nvidia" },
    { src: "/brands/nextjs.svg", alt: "Next.js" },
    { src: "/brands/google-cloud.svg", alt: "Google Cloud" },
    { src: "/brands/microsoft.svg", alt: "Microsoft" },
    { src: "/brands/amazon.svg", alt: "Amazon" },
    { src: "/brands/slack.svg", alt: "Slack" },
    { src: "/brands/notion.svg", alt: "Notion" }
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
