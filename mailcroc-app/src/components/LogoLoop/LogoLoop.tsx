"use client";
import React from 'react';
import './LogoLoop.css';

export interface LogoItem {
    src?: string;
    alt?: string;
    href?: string;
}

interface LogoLoopProps {
    logos: LogoItem[];
}

const LogoLoop: React.FC<LogoLoopProps> = ({ logos }) => {
    // Duplicate logos to ensure seamless loop
    const displayLogos = [...logos, ...logos, ...logos, ...logos];

    return (
        <div className="logo-loop-container">
            <div className="logo-loop-track">
                {displayLogos.map((logo, index) => (
                    <div key={index} className="logo-item">
                        <img src={logo.src} alt={logo.alt || 'brand logo'} />
                    </div>
                ))}
            </div>
        </div>
    );
};

export default LogoLoop;
