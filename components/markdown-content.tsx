'use client'

import { useState } from 'react'
import { ZoomableImage } from '@/components/zoomable-image'

interface MarkdownContentProps {
    content: string
    className?: string
}

/**
 * MarkdownContent Component
 * Renders text and handles markdown images (![alt](url)) as thumbnails with a lightbox.
 * Built with extensibility in mind (OCP).
 */
export function MarkdownContent({ content, className = '' }: MarkdownContentProps) {
    const [selectedImage, setSelectedImage] = useState<string | null>(null)

    // Simple regex for markdown images: ![alt](url)
    const imageRegex = /!\[(.*?)\]\((.*?)\)/g

    // Split content by images to render them sequentially
    const parts = content.split(imageRegex)

    // The split with capture groups returns [text, alt, url, text, alt, url...]
    const elements = []

    for (let i = 0; i < parts.length; i++) {
        const part = parts[i]
        if (!part) continue

        // Detect if this part is an image (based on index after splitting with 2 capture groups)
        // parts[i] = text
        // parts[i+1] = alt (if exists)
        // parts[i+2] = url (if exists)

        if (i % 3 === 0) {
            // Regular text
            elements.push(
                <span key={`text-${i}`} className="whitespace-pre-wrap">
                    {part}
                </span>
            )
        } else if (i % 3 === 1) {
            // Alt text - skip as we wrap it with URL
            continue
        } else if (i % 3 === 2) {
            // URL detected
            const alt = parts[i - 1] || '이미지'
            const url = part

            elements.push(
                <div key={`img-${i}`} className="my-2 inline-block">
                    <ZoomableImage src={url} alt={alt} className="w-32 h-32" />
                </div>
            )
        }
    }

    return (
        <div className={className}>
            {elements.length > 0 ? elements : <p className="text-muted-foreground italic text-xs">내용이 없습니다.</p>}
        </div>
    )
}
