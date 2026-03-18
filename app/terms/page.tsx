'use client'
// @ts-nocheck
import React from "react";
import Link from "next/link";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms and Conditions | ExamCoach",
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8 pt-24">
      <div className="max-w-3xl mx-auto bg-white rounded-2xl shadow-sm p-8 sm:p-12">
        <h1 className="text-3xl font-extrabold text-gray-900 mb-8 border-b pb-4">
          Terms and Conditions
        </h1>

        <div className="space-y-8 text-gray-600 leading-relaxed">
          <section>
            <h2 className="text-xl font-bold text-gray-800 mb-4">1. Nature of Service</h2>
            <p>
              ExamCoach is a peer-to-peer mentorship platform designed to connect O/L and A/L students ("Students") with high-achieving university students ("Coaches"). Our platform facilitates personalized study planning, chat support, and academic guidance.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-800 mb-4">2. Independent Mentorship</h2>
            <p>
              Coaches on ExamCoach are independent mentors and are not employees, agents, or representatives of ExamCoach. ExamCoach provides the platform to facilitate these connections but does not directly provide coaching services.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-800 mb-4">3. No Guarantee of Results</h2>
            <p>
              While our Coaches are selected based on their academic success, ExamCoach does NOT guarantee any specific exam results, Z-scores, or university admissions. Academic success depends on the Student's own dedication and effort.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-800 mb-4">4. Subscriptions and Refunds</h2>
            <p>
              Coaching is provided on a 30-day monthly subscription basis. Once the coaching period has started, subscriptions are generally non-refundable. However, refund requests made within the first 48 hours of a new subscription will be considered on a case-by-case basis.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-800 mb-4">5. Age Requirements</h2>
            <p>
              Users must be at least 14 years of age to use ExamCoach. Students under the age of 18 should use the platform with the consent and supervision of a parent or legal guardian.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-800 mb-4">6. Protective Communication Policy</h2>
            <p>
              To ensure the safety and privacy of both Students and Coaches, all communication must take place through the ExamCoach platform. We protect our users by facilitating all educational interactions within our secure, monitored environment, which helps keep your personal information private and secure.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-800 mb-4">7. Ensuring Platform Integrity</h2>
            <p>
              ExamCoach reserves the right to protect its community by suspending access for users who compromise safety, act unprofessionally, or attempt to circumvent the platform's secure payment and communication protocols. Our goal is to maintain a high-quality, safe learning space for everyone.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-800 mb-4">8. Platform Fees and Payments</h2>
            <p>
              The subscription fee covers the matching service, secure chat infrastructure, and secure payment handling. All payments are processed through secure third-party gateways. While Coaches are verified, ExamCoach is not responsible for the day-to-day quality of coaching provided.
            </p>
          </section>

          <div className="pt-8 border-t text-sm text-gray-500">
            <p>Last Updated: March 10, 2024</p>
            <p className="mt-4">
              If you have any questions regarding these terms, please{" "}
              <Link href="/contact" className="text-blue-600 hover:underline">
                contact us
              </Link>
              .
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}


