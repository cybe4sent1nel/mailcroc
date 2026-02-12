"use client";
import React, { useRef, useState, useEffect } from 'react';
import Matter from 'matter-js';
import './FallingText.css';
import FireAnimation from './FireAnimation';

interface FallingTextProps {
    text?: string;
    highlightWords?: string[];
    highlightClass?: string;
    trigger?: 'auto' | 'scroll' | 'click' | 'hover';
    backgroundColor?: string;
    wireframes?: boolean;
    gravity?: number;
    mouseConstraintStiffness?: number;
    fontSize?: string;
    wordSpacing?: string;
}

const THEME_COLORS = [
    '#6D28D9', // Purple
    '#D2F34C', // Lime
    '#1A1A1A', // Black
    '#4B5563', // Grey
    '#DC2626', // Red (Alert)
    '#2563EB', // Blue (Link)
];

const FallingText: React.FC<FallingTextProps> = ({
    text = 'SPAM 🚫 JUNK 🗑️ PHISHING 🎣 MALWARE 🦠 VIRUS 🐞 ADS 📢 PROMO 🏷️ DISCOUNT 💸 CLICK 🖱️ WIN 🏆 FREE 🆓 CASH 💰 OFFER 🤝 URGENT ⚠️ PRIZE 🎁 VOID ❌ TRASH 🚮 CLUTTER 📦 SCAM 🚨',
    highlightWords = [],
    highlightClass = 'highlighted',
    trigger = 'hover',
    backgroundColor = '#FAF9F7', // Creme (Pastel Orange-ish)
    wireframes = false,
    gravity = 0.56,
    mouseConstraintStiffness = 0.9,
    fontSize = '1.2rem',
    wordSpacing = '12px'
}) => {
    const containerRef = useRef<HTMLDivElement | null>(null);
    const textRef = useRef<HTMLDivElement | null>(null);
    const canvasContainerRef = useRef<HTMLDivElement | null>(null);

    const [effectStarted, setEffectStarted] = useState(false);

    // Initial word rendering
    useEffect(() => {
        if (!textRef.current) return;
        // Split by spaces but preserve emojis attached to words if any, or just split by space
        const words = text.split(' ');

        const newHTML = words
            .map(word => {
                const isHighlighted = highlightWords.some(hw => word.startsWith(hw));
                const randomColor = THEME_COLORS[Math.floor(Math.random() * THEME_COLORS.length)];
                return `<span
          class="word-v6 ${isHighlighted ? highlightClass : ''}"
          style="color: ${randomColor}; margin: 4px ${wordSpacing};"
        >
          ${word}
        </span>`;
            })
            .join(' ');

        textRef.current.innerHTML = newHTML;
    }, [text, highlightWords, highlightClass, wordSpacing]);

    // Intersection Observer for scroll reset
    useEffect(() => {
        if (!containerRef.current) return;

        const observer = new IntersectionObserver(
            ([entry]) => {
                if (!entry.isIntersecting) {
                    setEffectStarted(false);
                } else if (trigger === 'auto') {
                    setEffectStarted(true);
                }
            },
            { threshold: 0.1 }
        );

        observer.observe(containerRef.current);
        return () => observer.disconnect();
    }, [trigger]);

    useEffect(() => {
        if (!effectStarted) return;

        const { Engine, Render, World, Bodies, Runner, Mouse, MouseConstraint } = Matter;

        if (!containerRef.current || !canvasContainerRef.current) return;

        const containerRect = containerRef.current.getBoundingClientRect();
        const width = containerRect.width;
        const height = containerRect.height;

        if (width <= 0 || height <= 0) return;

        const engine = Engine.create();
        engine.world.gravity.y = gravity;

        const render = Render.create({
            element: canvasContainerRef.current,
            engine,
            options: {
                width,
                height,
                background: backgroundColor,
                wireframes
            }
        });

        const boundaryOptions = {
            isStatic: true,
            render: { fillStyle: 'transparent' }
        };

        // Physics floor - Raised slightly more to ensure visibility and bouncing
        const floor = Bodies.rectangle(width / 2, height - 10, width, 20, boundaryOptions);
        const leftWall = Bodies.rectangle(-25, height / 2, 50, height, boundaryOptions);
        const rightWall = Bodies.rectangle(width + 25, height / 2, 50, height, boundaryOptions);
        const ceiling = Bodies.rectangle(width / 2, -300, width, 50, boundaryOptions);

        if (!textRef.current) return;
        const wordSpans = textRef.current.querySelectorAll('.word-v6');
        const wordBodies = [...wordSpans].map(elem => {
            const rect = elem.getBoundingClientRect();

            // Calculate x, y relative to containerRef
            const x = rect.left - containerRect.left + rect.width / 2;
            const y = rect.top - containerRect.top + rect.height / 2;

            const body = Bodies.rectangle(x, y, rect.width, rect.height, {
                render: { fillStyle: 'transparent' },
                restitution: 0.5, // Increased bounciness as requested
                frictionAir: 0.01, // Lower air friction for more active bouncing
                friction: 0.2
            });
            Matter.Body.setVelocity(body, {
                x: (Math.random() - 0.5) * 8,
                y: (Math.random() - 0.2) * 2
            });
            Matter.Body.setAngularVelocity(body, (Math.random() - 0.5) * 0.15);

            return { elem: elem as HTMLElement, body };
        });

        wordBodies.forEach(({ elem, body }) => {
            elem.style.position = 'absolute';
            elem.style.left = `${body.position.x}px`;
            elem.style.top = `${body.position.y}px`;
            elem.style.transform = 'translate(-50%, -50%)';
            elem.style.visibility = 'visible';
            elem.style.opacity = '1';
            elem.style.zIndex = '50';
        });

        const mouse = Mouse.create(containerRef.current);
        const mouseConstraint = MouseConstraint.create(engine, {
            mouse,
            constraint: {
                stiffness: mouseConstraintStiffness,
                render: { visible: false }
            }
        });
        render.mouse = mouse;

        World.add(engine.world, [floor, leftWall, rightWall, ceiling, mouseConstraint, ...wordBodies.map(wb => wb.body)]);

        canvasContainerRef.current.appendChild(render.canvas);


        const runner = Runner.create();
        Runner.run(runner, engine);
        Render.run(render);

        let animationId: number;
        const updateLoop = () => {
            wordBodies.forEach(({ body, elem }) => {
                const { x, y } = body.position;
                elem.style.left = `${x}px`;
                elem.style.top = `${y}px`;
                elem.style.transform = `translate(-50%, -50%) rotate(${body.angle}rad)`;
            });
            animationId = requestAnimationFrame(updateLoop);
        };
        updateLoop();

        return () => {
            cancelAnimationFrame(animationId);
            Render.stop(render);
            Runner.stop(runner);
            if (render.canvas && canvasContainerRef.current && canvasContainerRef.current.contains(render.canvas)) {
                canvasContainerRef.current.removeChild(render.canvas);
            }
            World.clear(engine.world, false);
            Engine.clear(engine);

            wordSpans.forEach(span => {
                const s = span as HTMLElement;
                s.style.position = '';
                s.style.left = '';
                s.style.top = '';
                s.style.transform = '';
            });
        };
    }, [effectStarted, gravity, wireframes, backgroundColor, mouseConstraintStiffness]);

    const handleMouseEnter = () => {
        if (!effectStarted && trigger === 'hover') {
            setEffectStarted(true);
        }
    };

    return (
        <div
            ref={containerRef}
            className={`falling-text-container-v6 ${effectStarted ? 'burning' : ''}`}
            onClick={trigger === 'click' ? () => setEffectStarted(true) : undefined}
            onMouseEnter={handleMouseEnter}
        >
            <div
                ref={textRef}
                className={`falling-text-inner-v6 ${effectStarted ? 'is-physics' : ''}`}
                style={{
                    fontSize,
                    lineHeight: 1.5
                }}
            />



            {effectStarted && <FireAnimation />}

            <div className="falling-text-canvas-v6" ref={canvasContainerRef} />
        </div>
    );
};


export default FallingText;
