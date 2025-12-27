import type { Metadata } from "next";
import "./globals.css";
import { Inter } from "next/font/google"; // Using a default font
import { cn } from "@/lib/utils";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
    title: "Personal Daily Entry Log",
    description: "Productivity timer and daily log",
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en" suppressHydrationWarning>
            <body
                suppressHydrationWarning
                className={cn(
                    "min-h-screen bg-background font-sans antialiased",
                    inter.variable
                )}
            >
                {children}
            </body>
        </html>
    );
}
