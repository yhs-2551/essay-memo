"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Lightbulb, X } from "lucide-react";

export function FeatureDiscovery() {
    const [show, setShow] = useState(false);

    useEffect(() => {
        const hidden = localStorage.getItem("feature-hint-hidden-v2");
        if (!hidden) {
            const timer = setTimeout(() => setShow(true), 1500);
            return () => clearTimeout(timer);
        }
    }, []);

    const hide = () => {
        setShow(false);
        localStorage.setItem("feature-hint-hidden-v2", "true");
    };

    return (
        <AnimatePresence>
            {show && (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 20 }}
                    className='fixed bottom-24 left-1/2 -translate-x-1/2 z-[60] w-[90%] max-w-xs'
                >
                    <div className='bg-slate-900/90 dark:bg-indigo-950/90 backdrop-blur-lg text-white p-4 rounded-2xl shadow-2xl relative border border-white/20'>
                        <button onClick={hide} className='absolute top-2 right-2 p-1 hover:bg-white/10 rounded-full transition-colors'>
                            <X className='h-4 w-4' />
                        </button>
                        <div className='flex gap-3'>
                            <div className='bg-white/10 p-2 rounded-xl h-fit'>
                                <Lightbulb className='h-5 w-5 text-yellow-300' />
                            </div>
                            <div className='space-y-1'>
                                <p className='text-sm font-bold'>똑똑한 관리 팁</p>
                                <p className='text-xs text-white/90 leading-relaxed'>
                                    항목을 <strong>길게 누르거나 우클릭</strong>하면 여러 개를 한꺼번에 선택하고 관리할 수 있어요.
                                </p>
                            </div>
                        </div>
                    </div>
                    <div className='w-4 h-4 bg-slate-900 dark:bg-indigo-950 rotate-45 absolute -bottom-2 left-1/2 -translate-x-1/2 border-r border-b border-white/20' />
                </motion.div>
            )}
        </AnimatePresence>
    );
}
