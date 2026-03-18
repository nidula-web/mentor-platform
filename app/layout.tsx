'use client'
// @ts-nocheck
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import PresenceTracker from "@/components/PresenceTracker";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: 'ExamCoach - Find Your Perfect Exam Coach',
  description: 'Connect with university top achievers who mentor O/L and A/L students 1-on-1. Personalized study plans, daily chat support, and past paper reviews starting from Rs. 1,200/month.',
  keywords: 'A/L tuition Sri Lanka, O/L coaching, exam mentor, study help, past papers, Z-score',
  openGraph: {
    title: 'ExamCoach - Your Senior. Your Edge.',
    description: 'Get mentored by university students who aced the same exam you are preparing for.',
    type: 'website',
    locale: 'en_LK',
    siteName: 'ExamCoach',
  },
};

import Footer from "@/components/Footer";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased flex flex-col min-h-screen`}
      >
        <Navbar />
        <PresenceTracker />
        <main className="flex-grow">
          {children}
        </main>
        <Footer />
      </body>
    </html>
  );
}

