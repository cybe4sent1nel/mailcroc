"use client"

import React, { useState, useCallback } from "react"
import Image from "next/image"
import { Star, ChevronLeft, ChevronRight } from "lucide-react"
import { Baloo_2, DM_Sans } from 'next/font/google'
import ScrollFloat from "../ScrollFloat/ScrollFloat"
import './Testimonials.css'

// --- Data & Configuration ---

const baloo = Baloo_2({
    subsets: ['latin'],
    variable: '--font-serif',
    display: 'swap',
})

const dmSans = DM_Sans({
    subsets: ['latin'],
    variable: '--font-sans',
    display: 'swap',
})

const testimonials = [
    {
        name: "Sarah Mitchell",
        role: "Senior QA Engineer at",
        company: "Stripe",
        avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=150&h=150&auto=format&fit=crop",
        content:
            "MailCroc changed how we handle automated testing. Being able to generate instant, reliable temporary emails for our sandbox environments is a total game-changer for my team.",
        rating: 5,
        color: "green",
    },
    {
        name: "David Chen",
        role: "Lead Developer at",
        company: "Vercel",
        avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=150&h=150&auto=format&fit=crop",
        content:
            "The API response time is incredible. I use MailCroc daily for testing sign-up flows and verifying webhooks. It's the most polished disposable mail service I've ever used.",
        rating: 5,
        color: "purple",
    },
    {
        name: "Elena Rodriguez",
        role: "Product Designer at",
        company: "Figma",
        avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?q=80&w=150&h=150&auto=format&fit=crop",
        content:
            "As a designer, I need to see how our transactional emails render in real-time. MailCroc's clean interface and fast delivery make it my go-to for verifying UI consistency.",
        rating: 4.5,
        color: "green",
    },
    {
        name: "James Wilson",
        role: "Security Consultant at",
        company: "CrowdStrike",
        avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?q=80&w=150&h=150&auto=format&fit=crop",
        content:
            "Privacy isn't just a feature; it's a necessity. MailCroc provides the perfect buffer against tracking and unwanted marketing spam when I'm researching third-party tools.",
        rating: 5,
        color: "purple",
    },
    {
        name: "Olivia Park",
        role: "Growth Lead at",
        company: "Notion",
        avatar: "https://images.unsplash.com/photo-1517841905240-472988babdf9?q=80&w=150&h=150&auto=format&fit=crop",
        content:
            "We often need to check our competitors' onboarding flows. MailCroc allows our growth team to sign up anonymously and see exactly what the user experience is like without any hassle.",
        rating: 4.5,
        color: "green",
    },
    {
        name: "Marcus Thorne",
        role: "CTO at",
        company: "Scale AI",
        avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=150&h=150&auto=format&fit=crop",
        content:
            "Reliability is everything. MailCroc's infrastructure is rock solid. We trust their service for our internal QA processes and it hasn't let us down once.",
        rating: 5,
        color: "purple",
    },
];

const cardStyles: Record<string, any> = {
    green: {
        bg: "#eef8e4",
        text: "#2c3a1f",
        sub: "#5a6e48",
        company: "#3d5228",
        border: "#d4ecbc",
        starFill: "#9e55f2",
        starEmpty: "rgba(158,85,242,0.2)",
    },
    purple: {
        bg: "#f0e6fc",
        text: "#2d1f4e",
        sub: "#5e4a80",
        company: "#3d2868",
        border: "#dcc4f7",
        starFill: "#6abf3a",
        starEmpty: "rgba(106,191,58,0.2)",
    },
};

const scatteredAvatars = [
    { src: "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?q=80&w=150&h=150&auto=format&fit=crop", top: "8%", left: "10%", delay: 0 },
    { src: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?q=80&w=150&h=150&auto=format&fit=crop", top: "5%", left: "42%", delay: 1.2 },
    { src: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?q=80&w=150&h=150&auto=format&fit=crop", top: "3%", left: "80%", delay: 0.6 },
    { src: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?q=80&w=150&h=150&auto=format&fit=crop", top: "50%", left: "3%", delay: 1.8 },
    { src: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=150&h=150&auto=format&fit=crop", top: "40%", left: "25%", delay: 0.3 },
    { src: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=150&h=150&auto=format&fit=crop", top: "58%", left: "52%", delay: 1.5 },
    { src: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?q=80&w=150&h=150&auto=format&fit=crop", top: "30%", left: "66%", delay: 0.9 },
    { src: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?q=80&w=150&h=150&auto=format&fit=crop", top: "65%", left: "38%", delay: 2.1 },
    { src: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=150&h=150&auto=format&fit=crop", top: "45%", left: "90%", delay: 1.0 },
];

// --- Sub-Components ---

function StarRating({ rating, fillColor, emptyColor }: { rating: number, fillColor: string, emptyColor: string }) {
    return (
        <div className="star-rating">
            {Array.from({ length: 5 }).map((_, i) => {
                const isFull = i < Math.floor(rating);
                const isHalf = i === Math.floor(rating) && rating % 1 !== 0;
                return (
                    <span key={i} className="star-container">
                        {isFull ? (
                            <Star
                                className="star-icon"
                                style={{ fill: fillColor, color: fillColor }}
                            />
                        ) : isHalf ? (
                            <span className="star-container">
                                <Star
                                    className="star-icon absolute"
                                    style={{ color: emptyColor }}
                                />
                                <span
                                    className="absolute inset-0 overflow-hidden"
                                    style={{ width: "50%" }}
                                >
                                    <Star
                                        className="star-icon"
                                        style={{ fill: fillColor, color: fillColor }}
                                    />
                                </span>
                            </span>
                        ) : (
                            <Star className="star-icon" style={{ color: emptyColor }} />
                        )}
                    </span>
                );
            })}
        </div>
    );
}

function AnimatedWaves() {
    return (
        <svg
            className="absolute inset-0 h-full w-full"
            viewBox="0 0 1400 500"
            fill="none"
            preserveAspectRatio="none"
            aria-hidden="true"
        >
            {/* Terracotta */}
            <path
                className="wave-1"
                d="M0 80 Q200 40 400 100 Q600 160 800 90 Q1000 20 1200 110 Q1300 150 1400 80"
                stroke="#c4956a"
                strokeWidth="1.8"
                opacity="0.6"
                fill="none"
            />
            {/* Teal */}
            <path
                className="wave-2"
                d="M0 160 Q250 120 500 180 Q750 240 1000 160 Q1200 80 1400 160"
                stroke="#5a9e96"
                strokeWidth="1.6"
                opacity="0.55"
                fill="none"
            />
            {/* Purple accent */}
            <path
                className="wave-3"
                d="M0 240 Q300 200 600 260 Q900 320 1100 240 Q1250 180 1400 240"
                stroke="#9e55f2"
                strokeWidth="2"
                opacity="0.4"
                fill="none"
            />
            {/* Gold */}
            <path
                className="wave-4"
                d="M0 320 Q350 280 700 340 Q1000 390 1200 320 Q1300 280 1400 320"
                stroke="#d4a843"
                strokeWidth="1.6"
                opacity="0.5"
                fill="none"
            />
            {/* Green accent */}
            <path
                className="wave-5"
                d="M0 390 Q200 360 500 410 Q800 450 1100 390 Q1250 350 1400 390"
                stroke="#7ec850"
                strokeWidth="1.8"
                opacity="0.45"
                fill="none"
            />
            {/* Dusty rose */}
            <path
                className="wave-6"
                d="M0 450 Q300 420 600 460 Q900 490 1100 450 Q1300 420 1400 450"
                stroke="#c48a8a"
                strokeWidth="1.5"
                opacity="0.45"
                fill="none"
            />
            {/* Echo terracotta */}
            <path
                className="wave-1"
                d="M0 120 Q350 80 700 140 Q900 180 1100 120 Q1300 60 1400 120"
                stroke="#b8a088"
                strokeWidth="1.2"
                opacity="0.4"
                fill="none"
            />
            {/* Echo teal */}
            <path
                className="wave-5"
                d="M0 280 Q250 250 550 300 Q800 340 1050 280 Q1250 230 1400 280"
                stroke="#5a9e96"
                strokeWidth="1"
                opacity="0.35"
                fill="none"
            />
        </svg>
    );
}

function TestimonialCard({ testimonial }: { testimonial: any }) {
    const style = cardStyles[testimonial.color];
    return (
        <div
            className="testimonial-card"
            style={{ backgroundColor: style.bg, borderColor: style.border }}
        >
            <div>
                <StarRating
                    rating={testimonial.rating}
                    fillColor={style.starFill}
                    emptyColor={style.starEmpty}
                />
                <p
                    className="card-content-text"
                    style={{ color: style.text }}
                >
                    {testimonial.content}
                </p>
            </div>
            <div className="card-footer">
                <div
                    className="card-avatar-container"
                    style={{ borderColor: style.border }}
                >
                    <Image
                        src={testimonial.avatar}
                        alt={testimonial.name}
                        fill
                        className="object-cover"
                    />
                </div>
                <div>
                    <p
                        className="card-author-name"
                        style={{ color: style.text }}
                    >
                        {testimonial.name}
                    </p>
                    <p className="card-author-role" style={{ color: style.sub }}>
                        {testimonial.role}{" "}
                        <span className="card-author-company" style={{ color: style.company }}>
                            {testimonial.company}
                        </span>
                    </p>
                </div>
            </div>
        </div>
    );
}

// --- Main Application Component ---

export default function Testimonials() {
    const [currentIndex, setCurrentIndex] = useState(0);

    // Responsive settings
    const cardsPerView = 3;
    // Calculate max index based on total items
    const maxIndex = Math.max(0, testimonials.length - cardsPerView);

    const goNext = useCallback(() => {
        setCurrentIndex((prev) => Math.min(prev + 1, maxIndex));
    }, [maxIndex]);

    const goPrev = useCallback(() => {
        setCurrentIndex((prev) => Math.max(prev - 1, 0));
    }, []);

    const totalDots = maxIndex + 1;

    return (
        <div className={`testimonials-root antialiased ${baloo.variable} ${dmSans.variable}`}>
            <section className="testimonials-section">
                <div className="testimonials-container">
                    {/* Header */}
                    <div className="testimonials-header">
                        <p className="testimonials-subtitle">
                            Join 100,000+ happy users
                        </p>
                        <ScrollFloat as="h2" containerClassName="testimonials-title">
                            Your privacy is our number one priority
                        </ScrollFloat>
                        <p className="testimonials-description">
                            Discover how professionals are using MailCroc to protect their real inboxes and streamline their workflows with instant, secure temporary emails.
                        </p>
                        <button
                            type="button"
                            className="testimonials-view-all"
                        >
                            Get started for free
                        </button>
                    </div>

                    {/* Scattered Avatars Hero with animated waves */}
                    <div className="avatar-hero">
                        <AnimatedWaves />
                        {scatteredAvatars.map((avatar, i) => (
                            <div
                                key={i}
                                className="avatar-float-container avatar-float"
                                style={{
                                    top: avatar.top,
                                    left: avatar.left,
                                    animationDelay: `${avatar.delay}s`,
                                    animationDuration: `${2.5 + (i % 4) * 0.6}s`,
                                }}
                            >
                                <Image
                                    src={avatar.src}
                                    alt={`User avatar ${i + 1}`}
                                    fill
                                    className="object-cover"
                                />
                            </div>
                        ))}
                    </div>

                    {/* Testimonial Carousel */}
                    <div className="carousel-wrapper">
                        {/* Navigation arrows */}
                        <button
                            type="button"
                            onClick={goPrev}
                            disabled={currentIndex === 0}
                            className="carousel-nav-btn prev"
                            aria-label="Previous testimonials"
                        >
                            <ChevronLeft className="h-6 w-6" />
                        </button>
                        <button
                            type="button"
                            onClick={goNext}
                            disabled={currentIndex === maxIndex}
                            className="carousel-nav-btn next"
                            aria-label="Next testimonials"
                        >
                            <ChevronRight className="h-6 w-6" />
                        </button>

                        {/* Cards container */}
                        <div className="carousel-viewport">
                            <div
                                className="carousel-track"
                                style={{
                                    transform: `translateX(-${currentIndex * (100 / cardsPerView + 2)}%)`,
                                }}
                            >
                                {testimonials.map((testimonial) => (
                                    <div
                                        key={testimonial.name}
                                        className="testimonial-card-wrapper"
                                    >
                                        <TestimonialCard testimonial={testimonial} />
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Dots */}
                        <div className="carousel-dots">
                            {Array.from({ length: totalDots }).map((_, i) => (
                                <button
                                    key={i}
                                    type="button"
                                    onClick={() => setCurrentIndex(i)}
                                    className="dot-btn"
                                    style={{
                                        backgroundColor: i === currentIndex ? "#9e55f2" : "#d4cfc4",
                                        transform: i === currentIndex ? "scale(1.4)" : "scale(1)",
                                    }}
                                    aria-label={`Go to slide ${i + 1}`}
                                />
                            ))}
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
}
