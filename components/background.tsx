'use client'

import { useTheme } from 'next-themes'
import { motion } from 'framer-motion'
import { useEffect, useState } from 'react'

export function Background() {
    const { theme } = useTheme()
    const [mounted, setMounted] = useState(false)

    useEffect(() => {
        setMounted(true)
    }, [])

    if (!mounted) return null

    if (theme === 'dark') {
        // DARK MODE: Subtle, Elegant Space
        return (
            <div className="fixed inset-0 -z-10 overflow-hidden bg-gradient-to-b from-slate-950 via-indigo-950/20 to-slate-950">
                {/* Ambient Nebula Glow */}
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-900/20 via-slate-900/0 to-slate-950/0" />

                {/* Static Stars Background */}
                {[...Array(80)].map((_, i) => (
                    <div
                        key={`static-star-${i}`}
                        className="absolute rounded-full bg-white"
                        style={{
                            left: Math.random() * 100 + '%',
                            top: Math.random() * 100 + '%',
                            width: Math.random() * 2 + 1,
                            height: Math.random() * 2 + 1,
                            opacity: Math.random() * 0.4 + 0.1,
                        }}
                    />
                ))}

                {/* Subtle Twinkling Stars - Reduced frequency */}
                {[...Array(15)].map((_, i) => (
                    <motion.div
                        key={`twinkle-${i}`}
                        className="absolute rounded-full bg-white"
                        initial={{
                            left: Math.random() * 100 + '%',
                            top: Math.random() * 100 + '%',
                            opacity: Math.random() * 0.2,
                        }}
                        animate={{
                            opacity: [0.1, 0.4, 0.1],
                        }}
                        transition={{
                            duration: Math.random() * 4 + 3,
                            repeat: Infinity,
                            delay: Math.random() * 8,
                            ease: 'easeInOut',
                        }}
                        style={{
                            width: 2,
                            height: 2,
                        }}
                    />
                ))}

                {/* Gentle Shooting Stars - Reduced count and simplified */}
                {[...Array(3)].map((_, i) => (
                    <motion.div
                        key={`shooting-star-${i}`}
                        className="absolute -top-10"
                        initial={{
                            left: Math.random() * 100 + '%',
                            top: -20,
                            opacity: 0,
                        }}
                        animate={{
                            top: '120%',
                            opacity: [0, 0.3, 0.5, 0.2, 0],
                        }}
                        transition={{
                            duration: 5,
                            repeat: Infinity,
                            delay: i * 8,
                            ease: 'linear',
                        }}
                    >
                        {/* Simplified shorter trail */}
                        <div className="w-1 h-8 bg-gradient-to-b from-white/40 via-white/10 to-transparent rounded-full" />
                    </motion.div>
                ))}

                {/* Soft Nebula Clouds */}
                <motion.div
                    className="absolute top-1/4 left-1/4 h-96 w-96 rounded-full bg-purple-600/8 blur-[120px]"
                    animate={{ scale: [1, 1.15, 1], opacity: [0.08, 0.12, 0.08] }}
                    transition={{ duration: 20, repeat: Infinity, ease: 'easeInOut' }}
                />
                <motion.div
                    className="absolute bottom-1/4 right-1/4 h-96 w-96 rounded-full bg-blue-600/8 blur-[120px]"
                    animate={{ scale: [1, 1.15, 1], opacity: [0.08, 0.12, 0.08] }}
                    transition={{ duration: 25, repeat: Infinity, delay: 3, ease: 'easeInOut' }}
                />
            </div>
        )
    }

    // LIGHT MODE: Calm, Visible Movement
    return (
        <div className="fixed inset-0 -z-10 bg-[#fdfbff] overflow-hidden">
            {/* Soft Background Gradients */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,#f0f3ff_0%,transparent_50%)] opacity-70" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_80%,#fff1f5_0%,transparent_50%)] opacity-60" />

            {/* Simplified Orbit Rings - Reduced visual noise */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
                {[
                    { size: 85, duration: 180, color: 'indigo-200', planetSize: 2.5, opacity: 25 },
                    { size: 55, duration: 140, color: 'purple-200', planetSize: 2, opacity: 20 },
                ].map((ring, idx) => (
                    <motion.div
                        key={`orbit-${idx}`}
                        className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 border-[0.5px] border-${ring.color}/${ring.opacity} rounded-full`}
                        animate={{ rotate: idx % 2 === 0 ? 360 : -360 }}
                        transition={{ duration: ring.duration, repeat: Infinity, ease: 'linear' }}
                        style={{ width: `${ring.size}vw`, height: `${ring.size}vw` }}
                    >
                        {/* Visible but subtle Planet Marker */}
                        <div
                            className={`absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-gradient-to-br from-${ring.color}/40 to-white/60 border border-${ring.color}/30`}
                            style={{
                                width: `${ring.planetSize}vw`,
                                height: `${ring.planetSize}vw`,
                                minWidth: '10px',
                                minHeight: '10px',
                                maxWidth: '20px',
                                maxHeight: '20px',
                                boxShadow: `0 0 12px rgba(165, 180, 252, 0.3)`,
                            }}
                        />
                    </motion.div>
                ))}
            </div>

            {/* Gentle Floating Orbs - Reduced count and slower */}
            {[...Array(3)].map((_, i) => (
                <motion.div
                    key={`orb-${i}`}
                    className="absolute rounded-full"
                    animate={{
                        x: [0, 100, 0],
                        y: [0, 60, 0],
                        scale: [1, 1.1, 1],
                    }}
                    transition={{
                        duration: 20 + i * 8,
                        repeat: Infinity,
                        ease: 'easeInOut',
                    }}
                    style={{
                        width: 250 + i * 80,
                        height: 250 + i * 80,
                        left: i * 25 + '%',
                        top: i * 20 + '%',
                        background:
                            i % 2 === 0
                                ? 'radial-gradient(circle, rgba(219,234,254,0.3) 0%, rgba(255,255,255,0) 70%)'
                                : 'radial-gradient(circle, rgba(252,231,243,0.25) 0%, rgba(255,255,255,0) 70%)',
                        filter: 'blur(70px)',
                    }}
                />
            ))}

            {/* Minimal Sparkles - Much reduced */}
            {[...Array(5)].map((_, i) => (
                <motion.div
                    key={`sparkle-${i}`}
                    className="absolute rounded-full bg-white/60 border border-indigo-200/30"
                    initial={{
                        left: 20 + i * 15 + '%',
                        top: 20 + i * 12 + '%',
                        scale: 0,
                    }}
                    animate={{
                        scale: [0, 1, 0],
                        opacity: [0, 0.4, 0],
                    }}
                    transition={{
                        duration: 6,
                        repeat: Infinity,
                        ease: 'easeInOut',
                        delay: i * 3,
                    }}
                    style={{
                        width: '6px',
                        height: '6px',
                    }}
                />
            ))}
        </div>
    )
}
