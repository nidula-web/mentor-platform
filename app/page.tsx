import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-b from-blue-50 to-white pt-32 pb-24">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-blue-100/40 via-transparent to-transparent" />
        <div className="relative mx-auto max-w-4xl px-6 text-center">
          <h1 className="mb-6 text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl md:text-6xl">
            Find Your Perfect Mentor
          </h1>
          <p className="mx-auto mb-12 max-w-2xl text-lg text-gray-600 sm:text-xl">
            Master your O/L and A/L exams with university top achievers.
          </p>
          <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link
              href="/signup?role=student"
              className="flex w-full max-w-xs items-center justify-center rounded-xl bg-blue-600 px-8 py-4 text-lg font-semibold text-white shadow-lg shadow-blue-600/25 transition-all hover:bg-blue-700 hover:shadow-xl hover:shadow-blue-600/30"
            >
              Find an Exam Coach
            </Link>
            <Link
              href="/signup?role=mentor"
              className="flex w-full max-w-xs items-center justify-center rounded-xl border-2 border-blue-600 bg-white px-8 py-4 text-lg font-semibold text-blue-600 transition-all hover:bg-blue-50"
            >
              Apply as a Coach
            </Link>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-24">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="mb-16 text-center text-3xl font-bold text-gray-900">
            How It Works
          </h2>
          <div className="grid gap-12 md:grid-cols-3">
            <div className="flex flex-col items-center text-center">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-blue-100 text-xl font-bold text-blue-600">
                1
              </div>
              <h3 className="mb-2 text-xl font-semibold text-gray-900">
                Find a verified mentor
              </h3>
              <p className="text-gray-600">
                Browse mentors who got top results in the same exam you&apos;re
                preparing for
              </p>
            </div>
            <div className="flex flex-col items-center text-center">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-blue-100 text-xl font-bold text-blue-600">
                2
              </div>
              <h3 className="mb-2 text-xl font-semibold text-gray-900">
                Subscribe for a month
              </h3>
              <p className="text-gray-600">
                Choose your mentor and subscribe for a month of dedicated
                guidance
              </p>
            </div>
            <div className="flex flex-col items-center text-center">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-blue-100 text-xl font-bold text-blue-600">
                3
              </div>
              <h3 className="mb-2 text-xl font-semibold text-gray-900">
                Get 1-on-1 guidance
              </h3>
              <p className="text-gray-600">
                30 days of personalized support via chat and calls to help you
                ace your exam
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer spacer */}
      <footer className="border-t border-gray-100 py-8">
        <div className="mx-auto max-w-6xl px-6 text-center text-sm text-gray-500">
          © {new Date().getFullYear()} MentorLK — YourGuider Sri Lankan Study
          Platform
        </div>
      </footer>
    </div>
  );
}
