"use client";
import { motion } from "framer-motion";
import React from "react";
import styles from "./ScrollWave.module.css";

const Word = ({ word, index }: { word: string; index: number }) => {
    return (
        <span className={styles.wordWrapper}>
            <motion.span
                initial={{ y: "100%", opacity: 0 }}
                whileInView={{ y: 0, opacity: 1 }}
                viewport={{ once: true, margin: "-10%" }}
                transition={{
                    duration: 0.8,
                    ease: [0.2, 0.65, 0.3, 0.9],
                    delay: index * 0.05, // Slower staggered delay for wave effect
                }}
                className={styles.word}
                style={{ display: "inline-block" }}
            >
                {word}
            </motion.span>
            <span className={styles.space}>&nbsp;</span>
        </span>
    );
};

export default function ScrollWave({
    children,
    className = "",
    as: Component = "h1",
}: {
    children: string;
    className?: string;
    as?: React.ElementType;
}) {
    const words = children.split(" ");

    return (
        <Component className={`${styles.waveText} ${className}`}>
            {words.map((word, i) => (
                <Word key={i} word={word} index={i} />
            ))}
        </Component>
    );
}
