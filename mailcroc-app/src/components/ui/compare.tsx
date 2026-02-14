"use client";
import React, { useState, useEffect, useRef, useCallback } from "react";
import { cn } from "@/lib/utils";

// --- Icons ---
const IconDotsVertical = ({ className, size = 20 }: { className?: string; size?: number }) => (
    <svg
        xmlns="http://www.w3.org/2000/svg"
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
    >
        <circle cx="12" cy="12" r="1.5" />
        <circle cx="12" cy="5" r="1.5" />
        <circle cx="12" cy="19" r="1.5" />
    </svg>
);

// --- Particle Component ---
const Sparkles = ({ color = "#FFF", density = 100, className = "" }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        let animationId: number;
        let particles: any[] = [];
        const resize = () => {
            canvas.width = canvas.parentElement?.clientWidth || 0;
            canvas.height = canvas.parentElement?.clientHeight || 0;
            particles = Array.from({ length: density }, () => ({
                x: Math.random() * canvas.width,
                y: Math.random() * canvas.height,
                s: Math.random() * 2,
                v: Math.random() * 0.5 + 0.2,
                o: Math.random(),
            }));
        };
        const animate = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            particles.forEach((p) => {
                p.y -= p.v;
                if (p.y < 0) p.y = canvas.height;
                ctx.fillStyle = color;
                ctx.globalAlpha = p.o;
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.s, 0, Math.PI * 2);
                ctx.fill();
            });
            animationId = requestAnimationFrame(animate);
        };
        resize();
        animate();
        window.addEventListener("resize", resize);
        return () => {
            cancelAnimationFrame(animationId);
            window.removeEventListener("resize", resize);
        };
    }, [color, density]);
    return <canvas ref={canvasRef} className={cn("pointer-events-none block", className)} />;
};

interface CompareProps {
    firstImage?: string;
    secondImage?: string;
    className?: string;
    firstImageClassName?: string;
    secondImageClassname?: string;
    initialSliderPercentage?: number;
    slideMode?: "hover" | "drag";
    showHandlebar?: boolean;
    firstLogo?: React.ReactNode;
    secondLogo?: React.ReactNode;
}

export const Compare = ({
    firstImage = "",
    secondImage = "",
    className,
    firstImageClassName,
    secondImageClassname,
    initialSliderPercentage = 50,
    slideMode = "hover",
    showHandlebar = true,
    firstLogo,
    secondLogo,
}: CompareProps) => {
    const [sliderXPercent, setSliderXPercent] = useState(initialSliderPercentage);
    const [isDragging, setIsDragging] = useState(false);
    const sliderRef = useRef<HTMLDivElement>(null);

    const handleMove = useCallback((clientX: number) => {
        if (!sliderRef.current) return;
        const rect = sliderRef.current.getBoundingClientRect();
        const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
        const percent = (x / rect.width) * 100;
        setSliderXPercent(percent);
    }, []);

    return (
        <div
            ref={sliderRef}
            className={cn("relative w-full h-full overflow-hidden select-none rounded-xl bg-white", className)}
            style={{ cursor: slideMode === "drag" ? (isDragging ? "grabbing" : "grab") : "col-resize" }}
            onMouseMove={(e) => {
                if (slideMode === "hover" || (slideMode === "drag" && isDragging)) {
                    handleMove(e.clientX);
                }
            }}
            onMouseDown={() => slideMode === "drag" && setIsDragging(true)}
            onMouseUp={() => slideMode === "drag" && setIsDragging(false)}
            onMouseLeave={() => {
                setIsDragging(false);
                if (slideMode === "hover") setSliderXPercent(initialSliderPercentage);
            }}
            onTouchMove={(e) => {
                if (slideMode === "hover" || (slideMode === "drag" && isDragging)) {
                    handleMove(e.touches[0].clientX);
                }
            }}
            onTouchStart={() => slideMode === "drag" && setIsDragging(true)}
            onTouchEnd={() => slideMode === "drag" && setIsDragging(false)}
        >
            {/* Background Image (Second) */}
            <div className="absolute inset-0 w-full h-full z-0 bg-neutral-50 overflow-hidden">
                <img
                    src={secondImage}
                    alt="competitor"
                    className={cn("w-full h-full object-contain object-center block", secondImageClassname)}
                    draggable={false}
                    onError={(e) => {
                        (e.target as HTMLImageElement).style.backgroundColor = '#fee2e2';
                    }}
                />
                {secondLogo && (
                    <div className="absolute bottom-4 right-4 z-20 bg-white/90 backdrop-blur-sm p-3 rounded-xl shadow-lg border border-neutral-200 pointer-events-none transform transition-all duration-300">
                        {secondLogo}
                    </div>
                )}
            </div>

            {/* Foreground Image (First, Clipped) */}
            <div
                className="absolute inset-0 w-full h-full z-10 pointer-events-none overflow-hidden"
                style={{
                    clipPath: `inset(0 ${100 - sliderXPercent}% 0 0)`,
                }}
            >
                <img
                    src={firstImage}
                    alt="us"
                    className={cn("w-full h-full object-contain object-center block", firstImageClassName)}
                    draggable={false}
                    onError={(e) => {
                        (e.target as HTMLImageElement).style.backgroundColor = '#dcfce7';
                    }}
                />
                {firstLogo && (
                    <div className="absolute bottom-4 left-4 z-20 bg-white/90 backdrop-blur-sm p-3 rounded-xl shadow-lg border border-neutral-200 pointer-events-none transform transition-all duration-300">
                        {firstLogo}
                    </div>
                )}
            </div>

            {/* Slider Visual Overlay */}
            <div
                className="absolute inset-y-0 w-px bg-white shadow-[0_0_15px_rgba(0,0,0,0.5)] z-20 pointer-events-none"
                style={{ left: `${sliderXPercent}%` }}
            >
                {/* Glow Line */}
                <div className="absolute inset-y-0 -left-[2px] w-[5px] bg-indigo-500 blur-[2px]" />

                {/* Sparkles */}
                <div className="absolute inset-y-0 -left-10 w-20 pointer-events-none opacity-60">
                    <Sparkles density={30} color="#6366f1" className="w-full h-full" />
                </div>

                {showHandlebar && (
                    <div className="absolute top-1/2 -translate-y-1/2 -left-5 w-10 h-10 bg-white rounded-full shadow-[0_0_20px_rgba(0,0,0,0.3)] flex items-center justify-center border-2 border-indigo-500 pointer-events-auto cursor-pointer hover:scale-110 active:scale-95 transition-all z-50">
                        <IconDotsVertical className="text-indigo-600" />
                    </div>
                )}
            </div>
        </div>
    );
};
