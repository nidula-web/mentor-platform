"use client";
// @ts-nocheck

import { useState } from "react";

interface CoachGuideProps {
  onClose: () => void;
}

export default function CoachGuide({ onClose }: CoachGuideProps) {
  const [page, setPage] = useState(1);
  const totalPages = 4;

  const pages = [
    {
      titleEn: "Welcome to the Team, Coach! 🏆",
      titleSi: "සාදරයෙන් පිළිගනිමු, Coach! 🏆",
      contentEn: "You are now part of an elite group of achievers helping the next generation.",
      contentSi: "ඔබ දැන් ඊළඟ පරම්පරාවට උපකාර කරන ප්රභූ ජයග්රාහකයින් පිරිසකගේ කොටසකි.",
    },
    {
      titleEn: "Your Responsibility 🎓",
      titleSi: "ඔබේ වගකීම 🎓",
      contentEn: (
        <div className="space-y-4">
          <p>As a coach, you'll provide 1-on-1 chat support, share study plans, and explain difficult concepts using voice notes.</p>
          <p>Respond to your students at least once a day to keep them motivated.</p>
        </div>
      ),
      contentSi: (
        <div className="space-y-4">
          <p>Coach කෙනෙකු ලෙස, ඔබ 1-on-1 chat support ලබා දීම, study plans බෙදා ගැනීම සහ voice notes භාවිතා කර අපහසු කරුණු පැහැදිලි කර දීම සිදු කරනු ඇත.</p>
          <p>ඔබේ සිසුන්ව උද්යෝගිමත්ව තබා ගැනීමට අවම වශයෙන් දිනකට වරක්වත් ඔවුන්ට පිළිතුරු දෙන්න.</p>
        </div>
      ),
    },
    {
      titleEn: "Platform Rules & Safety 🔒",
      titleSi: "වේදිකාවේ නීති සහ ආරක්ෂාව 🔒",
      contentEn: (
        <div className="space-y-4 text-sm">
          <div className="p-3 bg-blue-50 rounded-xl border border-blue-100 text-blue-800">
            <p className="font-bold mb-1">🛡️ We Protect Our Coaches</p>
            <p>To keep you safe and ensure professional results, all communication happens within our monitored system. ExamCoach protects your personal contact info automatically.</p>
          </div>
          <ul className="space-y-1">
            <li>✅ Use the chat for all teaching</li>
            <li>✅ Protect your personal information</li>
            <li>✅ Be respectful and professional</li>
          </ul>
        </div>
      ),
      contentSi: (
        <div className="space-y-4 text-sm">
          <div className="p-3 bg-blue-50 rounded-xl border border-blue-100 text-blue-800">
            <p className="font-bold mb-1">🛡️ අපි අපේ Coaches ලව ආරක්ෂා කරනවා</p>
            <p>ඔබව ආරක්ෂිතව තබා ගැනීමට සහ වෘත්තීය ප්රතිඵල සහතික කිරීමට, සියලුම සන්නිවේදනය අපගේ නිරීක්ෂණය කරන ලද පද්ධතිය තුළ සිදු වේ. ExamCoach ස්වයංක්රීයව ඔබේ පුද්ගලික සම්බන්ධතා තොරතුරු ආරක්ෂා කරයි.</p>
          </div>
          <ul className="space-y-1">
            <li>✅ ඉගැන්වීම් සඳහා chat එක භාවිතා කරන්න</li>
            <li>✅ ඔබේ පෞද්ගලික තොරතුරු ආරක්ෂා කරගන්න</li>
            <li>✅ ගෞරවනීය සහ වෘත්තීය වන්න</li>
          </ul>
        </div>
      ),
    },
    {
      titleEn: "Earnings & Payouts 💰",
      titleSi: "ආදායම් සහ ගෙවීම් 💰",
      contentEn: (
        <div className="space-y-4">
          <p>You earn for every active student you coach. Payouts are processed monthly directly to your bank account.</p>
          <p>Update your bank details in the dashboard to receive your earnings without delay.</p>
        </div>
      ),
      contentSi: (
        <div className="space-y-4">
          <p>ඔබ උගන්වන සෑම සක්රීය ශිෂ්යයෙකු සඳහාම ඔබ මුදලක් උපයයි. ගෙවීම් මාසිකව ඔබේ බැංකු ගිණුමට කෙලින්ම බැර කෙරේ.</p>
          <p>ප්රමාදයකින් තොරව ඔබේ ආදායම ලබා ගැනීමට dashboard හි ඔබේ බැංකු විස්තර update කරන්න.</p>
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
               {page === 1 && <span className="text-5xl sm:text-6xl">💎</span>}
               {page === 2 && <span className="text-5xl sm:text-6xl">📚</span>}
               {page === 3 && <span className="text-5xl sm:text-6xl">🛡️</span>}
               {page === 4 && <span className="text-5xl sm:text-6xl">💸</span>}
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
                className="flex-[2] py-4 bg-slate-900 text-white rounded-2xl font-black shadow-lg transition-all animate-pulse active:scale-95"
              >
                Let's Start! 🚀
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

