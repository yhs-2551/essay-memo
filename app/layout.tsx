import type { Metadata } from 'next'
// import localFont from "next/font/local";
import { Inter } from 'next/font/google'
import './globals.css'
import { ThemeProvider } from '@/components/theme-provider'
import { ThemeToggle } from '@/components/theme-toggle'
import { UserNav } from '@/components/user-nav'
import { Toaster } from '@/components/ui/sonner'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
    title: 'Orbit',
    description: '나를 정리하는 시간, 나만의 궤도.',
}

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode
}>) {
    return (
        <html lang="ko" suppressHydrationWarning>
            <body className={`${inter.className} antialiased min-h-screen`}>
                <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
                    <div className="fixed bottom-6 left-6 z-50 animate-in fade-in slide-in-from-bottom-5 duration-1000">
                        <ThemeToggle />
                    </div>
                    <div className="fixed top-6 right-6 z-50 animate-in fade-in slide-in-from-top-5 duration-1000">
                        <UserNav />
                    </div>
                    {children}
                    <Toaster />
                </ThemeProvider>
            </body>
        </html>
    )
}
