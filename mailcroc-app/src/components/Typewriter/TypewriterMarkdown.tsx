"use client";
import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeSanitize from 'rehype-sanitize';

interface TypewriterMarkdownProps {
    text: string;
    speed?: number; // ms per char
    onComplete?: () => void;
}

export const TypewriterMarkdown: React.FC<TypewriterMarkdownProps> = ({ text, speed = 10, onComplete }) => {
    const [displayedText, setDisplayedText] = useState('');

    useEffect(() => {
        // Reset if text changes significantly? 
        // Or if text is completely new.
        // Assuming text is the full content.
        setDisplayedText('');

        let i = 0;
        const interval = setInterval(() => {
            if (i < text.length) {
                setDisplayedText(prev => prev + text.charAt(i));
                i++;
            } else {
                clearInterval(interval);
                if (onComplete) onComplete();
            }
        }, speed);
        return () => clearInterval(interval);
    }, [text, speed, onComplete]);

    return (
        <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            rehypePlugins={[rehypeSanitize]}
        >
            {displayedText}
        </ReactMarkdown>
    );
};
