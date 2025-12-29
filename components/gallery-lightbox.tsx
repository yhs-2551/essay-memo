'use client'

import { useState } from 'react'
import Lightbox from 'yet-another-react-lightbox'
import Zoom from 'yet-another-react-lightbox/plugins/zoom'
import Thumbnails from 'yet-another-react-lightbox/plugins/thumbnails'
import Counter from 'yet-another-react-lightbox/plugins/counter'
import 'yet-another-react-lightbox/styles.css'
import 'yet-another-react-lightbox/plugins/thumbnails.css'
import 'yet-another-react-lightbox/plugins/counter.css'
import Image from 'next/image'

interface GalleryLightboxProps {
    images: string[]
}

export function GalleryLightbox({ images }: GalleryLightboxProps) {
    const [index, setIndex] = useState(-1)

    // Slides for Lightbox
    const slides = images.map((src) => ({ src }))

    return (
        <>
            {/* Gallery Grid - Trigger */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                {images.map((url, i) => (
                    <div
                        key={i}
                        className="relative aspect-video rounded-2xl overflow-hidden shadow-sm bg-black/5 cursor-zoom-in group"
                        onClick={() => setIndex(i)}
                    >
                        <Image
                            src={url}
                            alt={`Gallery ${i}`}
                            fill
                            className="object-cover transition-transform duration-700 group-hover:scale-105"
                            sizes="(max-width: 768px) 50vw, 25vw"
                        />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-500" />
                    </div>
                ))}
            </div>

            {/* Lightbox - Fullscreen Experience */}
            <Lightbox
                index={index}
                slides={slides}
                open={index >= 0}
                close={() => setIndex(-1)}
                plugins={[Zoom, Thumbnails, Counter]}
                animation={{ zoom: 500 }}
                zoom={{
                    maxZoomPixelRatio: 3,
                    zoomInMultiplier: 2,
                    doubleTapDelay: 300,
                    doubleClickDelay: 300,
                    doubleClickMaxStops: 2,
                    keyboardMoveDistance: 50,
                    wheelZoomDistanceFactor: 100,
                    pinchZoomDistanceFactor: 100,
                    scrollToZoom: false,
                }}
                carousel={{
                    finite: false, // Infinite loop
                    padding: '40px',
                    spacing: '10%',
                }}
                render={{
                    slide: ({ slide, rect }) => {
                        const width = rect.width
                        const height = rect.height
                        return (
                            <div style={{ position: 'relative', width, height }}>
                                <Image src={slide.src} alt="" fill className="object-contain" sizes="100vw" priority />
                            </div>
                        )
                    },
                }}
            />
        </>
    )
}
