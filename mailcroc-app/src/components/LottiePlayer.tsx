"use client";

import dynamic from 'next/dynamic';
import React from 'react';

// Dynamically import Lottie to avoid SSR issues since it relies on window/document
const Lottie = dynamic(() => import('lottie-react'), { ssr: false });

interface LottiePlayerProps {
    animationData: any;
    loop?: boolean;
    autoplay?: boolean;
    style?: React.CSSProperties;
    className?: string;
}

const LottiePlayer: React.FC<LottiePlayerProps> = ({
    animationData,
    loop = true,
    autoplay = true,
    style,
    className
}) => {
    return (
        <Lottie
            animationData={animationData}
            loop={loop}
            autoplay={autoplay}
            style={style}
            className={className}
        />
    );
};

export default LottiePlayer;
