// @ts-nocheck
"use client";

import Link from "next/link";

export default function Footer() {
  return (
    <footer className="bg-slate-950 text-white py-20 border-t border-slate-900 mt-auto">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-16">
          <div className="col-span-1 md:col-span-2 text-center md:text-left">
            <Link href="/" className="text-2xl font-black italic tracking-tighter text-blue-500 mb-6 block">ExamCoach</Link>
            <p className="text-slate-500 max-w-xs mx-auto md:mx-0 font-medium leading-relaxed italic text-sm">The most effective way for Sri Lankan students to prepare for high-stakes exams. Built by achievers, for achievers.</p>
          </div>
          <div className="text-center md:text-left">
            <h4 className="font-black uppercase text-[10px] tracking-widest text-slate-400 mb-6 font-mono">Quick Links</h4>
            <ul className="space-y-4 text-sm font-bold">
              <li><Link href="/" className="text-slate-500 hover:text-white transition-colors italic touch-target py-2 block">Home</Link></li>
              <li><Link href="/browse" className="text-slate-500 hover:text-white transition-colors italic touch-target py-2 block">Browse Coaches</Link></li>
              <li><Link href="/affiliate/dashboard" className="text-slate-500 hover:text-white transition-colors italic touch-target py-2 block">Affiliate Program</Link></li>
              <li><Link href="/contact" className="text-slate-500 hover:text-white transition-colors italic touch-target py-2 block">Contact Support</Link></li>
            </ul>
          </div>
          <div className="text-center md:text-left">
            <h4 className="font-black uppercase text-[10px] tracking-widest text-slate-400 mb-6 font-mono">Legal</h4>
            <ul className="space-y-4 text-sm font-bold">
              <li><Link href="/terms" className="text-slate-500 hover:text-white transition-colors italic touch-target py-2 block">Terms of Service</Link></li>
              <li><Link href="/privacy" className="text-slate-500 hover:text-white transition-colors italic touch-target py-2 block">Privacy Policy</Link></li>
            </ul>
          </div>
        </div>
        
        <div className="pt-12 border-t border-slate-900 flex flex-col md:flex-row items-center justify-between gap-6 text-center md:text-left">
          <div className="text-slate-600 text-[10px] font-black uppercase tracking-widest font-mono">
            © 2026 ExamCoach. All rights reserved. • Made in Sri Lanka
          </div>
          <div className="flex gap-6 grayscale opacity-30 justify-center">
             <span className="cursor-not-allowed text-xl">📘</span> 
             <span className="cursor-not-allowed text-xl">📸</span> 
             <span className="cursor-not-allowed text-xl">🎵</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
