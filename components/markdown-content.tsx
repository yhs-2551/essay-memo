"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogTrigger, DialogTitle } from "@/components/ui/dialog";
import Image from "next/image";
import { Maximize2 } from "lucide-react";

interface MarkdownContentProps {
    content: string;
    className?: string;
}

/**
 * MarkdownContent Component
 * Renders text and handles markdown images (![alt](url)) as thumbnails with a lightbox.
 * Built with extensibility in mind (OCP).
 */
export function MarkdownContent({ content, className = "" }: MarkdownContentProps) {
    const [selectedImage, setSelectedImage] = useState<string | null>(null);

    // Simple regex for markdown images: ![alt](url)
    const imageRegex = /!\[(.*?)\]\((.*?)\)/g;

    // Split content by images to render them sequentially
    const parts = content.split(imageRegex);

    // The split with capture groups returns [text, alt, url, text, alt, url...]
    const elements = [];

    for (let i = 0; i < parts.length; i++) {
        const part = parts[i];
        if (!part) continue;

        // Detect if this part is an image (based on index after splitting with 2 capture groups)
        // parts[i] = text
        // parts[i+1] = alt (if exists)
        // parts[i+2] = url (if exists)

        if (i % 3 === 0) {
            // Regular text
            elements.push(
                <span key={`text-${i}`} className='whitespace-pre-wrap'>
                    {part}
                </span>
            );
        } else if (i % 3 === 1) {
            // Alt text - skip as we wrap it with URL
            continue;
        } else if (i % 3 === 2) {
            // URL detected
            const alt = parts[i - 1] || "이미지";
            const url = part;

            elements.push(
                <Dialog key={`img-${i}`}>
                    <DialogTrigger asChild>
                        <div className='relative group cursor-zoom-in my-2 inline-block'>
                            <div className='relative w-32 h-32 rounded-lg overflow-hidden border border-border bg-muted transition-all group-hover:ring-2 group-hover:ring-primary/50 shadow-sm'>
                                <img src={url} alt={alt} className='w-full h-full object-cover' />
                                <div className='absolute inset-0 bg-black/0 group-hover:bg-black/10 flex items-center justify-center transition-all opacity-0 group-hover:opacity-100'>
                                    <Maximize2 className='text-white w-5 h-5 shadow-sm' />
                                </div>
                            </div>
                        </div>
                    </DialogTrigger>
                    <DialogContent className='max-w-4xl p-0 overflow-hidden bg-transparent border-none shadow-2xl'>
                        <DialogTitle className='sr-only'>이미지 확대 보기</DialogTitle>
                        <div className='relative w-full h-[80vh]'>
                            <img src={url} alt={alt} className='w-full h-full object-contain' />
                        </div>
                    </DialogContent>
                </Dialog>
            );
        }
    }

    return (
        <div className={className}>{elements.length > 0 ? elements : <p className='text-muted-foreground italic text-xs'>내용이 없습니다.</p>}</div>
    );
}
