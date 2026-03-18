// @ts-nocheck
import React from "react";
import Link from "next/link";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy | ExamCoach",
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8 pt-24">
      <div className="max-w-3xl mx-auto bg-white rounded-2xl shadow-sm p-8 sm:p-12">
        <h1 className="text-3xl font-extrabold text-gray-900 mb-8 border-b pb-4">
          Privacy Policy
        </h1>

        <div className="space-y-8 text-gray-600 leading-relaxed">
          <section>
            <h2 className="text-xl font-bold text-gray-800 mb-4">1. Information We Collect</h2>
            <p>
              To provide our coaching services, we collect personal information including your full name, email address, phone number, and details regarding the exams you are preparing for (O/L, A/L, subject streams).
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-800 mb-4">2. Usage and Storage of Data</h2>
            <p>
              Your personal information is used exclusively to facilitate mentorship on ExamCoach. We store your profile details and chat messages securely within our database to maintain service continuity and history for students and coaches.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-800 mb-4">3. Data Sharing and Protection</h2>
            <p>
              ExamCoach takes your privacy seriously. We do NOT share your personal data with third-party marketers and we do NOT sell user data to any external parties. Your contact information is never disclosed to other users until a subscription is active and even then, we encourage all communication to stay within the platform.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-800 mb-4">4. Payment Security</h2>
            <p>
              All payment information is handled securely using encrypted third-party payment processing gateways. ExamCoach does not store your credit card or bank account details directly on our servers.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-800 mb-4">5. Account Deletion and Access</h2>
            <p>
              You have the right to access your data or request the permanent deletion of your account. To request account deletion, please contact our support team through the{" "}
              <Link href="/contact" className="text-blue-600 hover:underline">
                Contact Us
              </Link>{" "}
              page.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-800 mb-4">6. Monitoring for Safety</h2>
            <p>
              For the safety of our users, particularly younger students, and to ensure high service quality, chat messages on the platform may be intermittently monitored for violations of our terms and conditions.
            </p>
          </section>

          <div className="pt-8 border-t text-sm text-gray-500">
            <p>Last Updated: March 10, 2024</p>
            <p className="mt-4">
              If you have any questions regarding your privacy, please reach out to us.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}


