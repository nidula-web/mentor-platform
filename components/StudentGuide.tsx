"use client";
// @ts-nocheck

import { useState, useEffect } from "react";

interface StudentGuideProps {
  onClose: () => void;
}

export default function StudentGuide({ onClose }: StudentGuideProps) {
  const [page, setPage] = useState(1);
  const totalPages = 4;

  const pages = [
    {
      titleEn: "Welcome to ExamCoach! 🎓",
      titleSi: "ExamCoach වෙත සාදරයෙන් පිළිගනිමු! 🎓",
      contentEn: "Here's how to get the most out of your coaching experience.",
      contentSi: "ඔබේ coaching අත්දැකීමෙන් උපරිම ප්රයෝජන ගන්නේ කෙසේදැයි මෙන්න.",
    },
    {
      titleEn: "Step 1: Find Your Coach 🔍",
      titleSi: "පියවර 1: ඔබේ Coach එකා සොයන්න 🔍",
      contentEn: (
        <div className="space-y-4">
          <p>Browse our verified coaches and pick someone who matches your exam and subjects.</p>
          <p>Look at their results, ratings, and reviews.</p>
        </div>
      ),
      contentSi: (
        <div className="space-y-4">
          <p>අපගේ verified coaches බලා ඔබේ විභාගයට සහ විෂයයන්ට ගැලපෙන කෙනෙකු තෝරන්න.</p>
          <p>ඔවුන්ගේ ප්රතිඵල, ratings සහ reviews බලන්න.</p>
        </div>
      ),
    },
    {
      titleEn: "Step 2: Subscribe & Pay 💳",
      titleSi: "පියවර 2: Subscribe කර ගෙවන්න 💳",
      contentEn: (
        <div className="space-y-4">
          <p>Transfer the monthly fee to our bank account and upload the receipt.</p>
          <p>Protect your personal information.</p>
        </div>
      ),
      contentSi: (
        <div className="space-y-4">
          <p>මාසික මුදල අපගේ bank account එකට transfer කර receipt එක upload කරන්න.</p>
          <p>ඔබේ පෞද්ගලික තොරතුරු ආරක්ෂා කරගන්න.</p>
        </div>
      ),
    },
    {
      titleEn: "Step 3: Start Chatting 💬",
      titleSi: "පියවර 3: Chat කිරීම ආරම්භ කරන්න 💬",
      contentEn: (
        <div className="space-y-4 text-sm">
          <p className="font-bold">Once activated, you can:</p>
          <ul className="space-y-1">
            <li>✅ Send text messages anytime</li>
            <li>✅ Send photos of past papers or questions</li>
            <li>✅ Send and receive voice notes</li>
            <li>✅ Get a personalized study plan</li>
          </ul>
          <div className="mt-4 p-3 bg-blue-50 rounded-xl border border-blue-100 text-blue-800">
            <p className="font-bold mb-1">🔒 Your Privacy Matters!</p>
            <p>ExamCoach keeps your personal information safe. Our secure chat system protects your identity so you can focus 100% on your studies without any worries.</p>
          </div>
        </div>
      ),
      contentSi: (
        <div className="space-y-4 text-sm">
          <p className="font-bold">Activate වූ පසු, ඔබට හැකියි:</p>
          <ul className="space-y-1">
            <li>✅ ඕනෑම වේලාවක text messages යවන්න</li>
            <li>✅ Past papers හෝ ප්රශ්න වල photos යවන්න</li>
            <li>✅ Voice notes යවන්න සහ ලබාගන්න</li>
            <li>✅ Personalized study plan එකක් ලබාගන්න</li>
          </ul>
          <div className="mt-4 p-3 bg-blue-50 rounded-xl border border-blue-100 text-blue-800">
            <p className="font-bold mb-1">🔒 ඔබේ පෞද්ගලිකත්වය වැදගත්!</p>
            <p>ExamCoach ඔබේ පුද්ගලික තොරතුරු ආරක්ෂිතව තබා ගනී. අපගේ secure chat system ඔබේ identity ආරක්ෂා කරන බැවින් ඔබට කිසිදු කරදරයකින් තොරව ඔබේ අධ්යයනයට 100% අවධානය යොමු කළ හැක.</p>
          </div>
        </div>
      ),
    },
  ];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="relative w-full max-w-lg max-h-[90vh] bg-white rounded-[32px] shadow-2xl overflow-y-auto animate-in zoom-in-95 slide-in-from-bottom-4 duration-500">
        
        {/* Close Button */}
        <button 
          onClick={onClose}
          className="absolute top-6 right-6 w-10 h-10 flex items-center justify-center rounded-full bg-gray-50 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-all z-10"
        >
          ✕
        </button>

        <div className="p-6 sm:p-10 pt-10 sm:pt-12">
          {/* Content Area */}
          <div className="min-h-[280px] sm:min-h-[320px] flex flex-col items-center text-center">
            <div className="mb-6 sm:mb-8 transform transition-transform duration-500 scale-100 sm:scale-110">
               {page === 1 && <span className="text-5xl sm:text-6xl">🎓</span>}
               {page === 2 && <span className="text-5xl sm:text-6xl">🔍</span>}
               {page === 3 && <span className="text-5xl sm:text-6xl">💳</span>}
               {page === 4 && <span className="text-5xl sm:text-6xl">🚀</span>}
            </div>

            <div className="space-y-1 sm:space-y-2 mb-6">
              <h2 className="text-xl sm:text-2xl font-black text-gray-900 leading-tight">
                {pages[page - 1].titleEn}
              </h2>
              <h3 className="text-lg sm:text-xl font-bold text-blue-600 leading-tight italic">
                {pages[page - 1].titleSi}
              </h3>
            </div>

            <div className="text-gray-600 text-sm sm:text-base font-medium leading-relaxed mb-4">
              {pages[page - 1].contentEn}
            </div>
            <div className="text-gray-500 text-xs sm:text-sm font-bold italic leading-relaxed">
              {pages[page - 1].contentSi}
            </div>
          </div>

          {/* Progress Dots */}
          <div className="flex justify-center gap-2 mb-8 sm:mb-10">
            {[1, 2, 3, 4].map((i) => (
              <div 
                key={i} 
                className={`h-1.5 sm:h-2 rounded-full transition-all duration-300 ${page === i ? 'w-6 sm:w-8 bg-blue-600' : 'w-1.5 sm:w-2 bg-gray-200'}`}
              />
            ))}
          </div>

          {/* Navigation Buttons */}
          <div className="flex gap-4">
            {page > 1 ? (
              <button 
                onClick={() => setPage(page - 1)}
                className="flex-1 py-4 border-2 border-gray-100 rounded-2xl font-black text-gray-400 hover:bg-gray-50 transition-all active:scale-95"
              >
                ← Back
              </button>
            ) : null}

            {page < totalPages ? (
              <button 
                onClick={() => setPage(page + 1)}
                className="flex-[2] py-3.5 sm:py-4 bg-blue-600 text-white rounded-2xl font-black text-sm sm:text-base shadow-lg shadow-blue-600/25 hover:bg-blue-700 transition-all active:scale-95"
              >
                Next →
              </button>
            ) : (
              <button 
                onClick={onClose}
                className="flex-[2] py-4 bg-green-600 text-white rounded-2xl font-black shadow-lg shadow-green-600/25 hover:bg-green-700 transition-all animate-pulse active:scale-95"
              >
                Got it! Let's Go! 🚀
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

