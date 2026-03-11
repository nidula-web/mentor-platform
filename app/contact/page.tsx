"use client"
// @ts-nocheck

import { useState } from 'react'
import { createClient } from '@/lib/supabase'
import Link from 'next/link'

export default function ContactPage() {
    const [name, setName] = useState('')
    const [email, setEmail] = useState('')
    const [phone, setPhone] = useState('')
    const [subject, setSubject] = useState('General Inquiry')
    const [message, setMessage] = useState('')
    const [loading, setLoading] = useState(false)
    const [success, setSuccess] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [touched, setTouched] = useState<Record<string, boolean>>({})

    const subjects = [
        "General Inquiry",
        "Payment Issue",
        "Technical Problem",
        "Become a Coach",
        "Report a Coach",
        "Refund Request",
        "Other"
    ]

    const faqs = [
        {
            q: "How does ExamCoach work?",
            a: "We provide a secure environment where students connect with university top achievers. You get personalized 1-on-1 guidance via our protected chat and voice note system for a full month."
        },
        {
            q: "How do I pay?",
            a: "We support various secure payment methods including credit/debit cards. Visit our homepage for current pricing and subscription details."
        },
        {
            q: "Can I get a refund?",
            a: "Yes, if you're not satisfied within the first 3 days of your subscription, we offer a full no-questions-asked refund."
        },
        {
            q: "How do I become a coach?",
            a: "If you've achieved top results (3As or equivalent), you can 'Apply as a Coach'. We'll verify your credentials and help you set up your profile to start safely guiding students."
        }
    ]

    const isFormValid = name.trim() !== '' && 
                        email.trim() !== '' && 
                        subject !== '' && 
                        message.trim().length >= 20

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        setError(null)
        setTouched({ name: true, email: true, subject: true, message: true })

        if (!isFormValid) {
            setError("Please fill all required fields correctly.")
            return
        }

        setLoading(true)
        const supabase: any = createClient()

        const { error: insertError } = await supabase
            .from('contact_messages')
            .insert([
                {
                    name,
                    email,
                    phone: phone || null,
                    subject,
                    message,
                    created_at: new Date().toISOString()
                }
            ])

        if (insertError) {
            console.error('Submission error:', insertError)
            setError("Something went wrong. Please try again or contact us via WhatsApp.")
        } else {
            setSuccess(true)
            setName('')
            setEmail('')
            setPhone('')
            setSubject('General Inquiry')
            setMessage('')
            setTouched({})
        }
        setLoading(false)
    }

    return (
        <div className="min-h-screen bg-gray-50 pt-24 pb-12">
            <div className="max-w-6xl mx-auto px-6">
                {/* Header */}
                <div className="text-center mb-16">
                    <h1 className="text-4xl font-extrabold text-gray-900 mb-4">Contact Us</h1>
                    <p className="text-lg text-gray-600">Have questions? We're here to help!</p>
                </div>

                <div className="grid lg:grid-cols-3 gap-12 mb-20">
                    {/* Contact Form */}
                    <div className="lg:col-span-2">
                        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8 md:p-10">
                            {success ? (
                                <div className="text-center py-12">
                                    <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center text-4xl mx-auto mb-6">✓</div>
                                    <h3 className="text-2xl font-bold text-gray-900 mb-2">Message Sent!</h3>
                                    <p className="text-gray-600 mb-8">Thank you! We'll respond within 24 hours.</p>
                                    <button 
                                        onClick={() => setSuccess(false)}
                                        className="text-blue-600 font-bold hover:underline"
                                    >
                                        Send another message
                                    </button>
                                </div>
                            ) : (
                                <form onSubmit={handleSubmit} className="space-y-6">
                                    <div className="grid md:grid-cols-2 gap-6">
                                        <div>
                                            <label className="block text-sm font-bold text-gray-700 mb-2">Name *</label>
                                            <input 
                                                type="text" 
                                                value={name}
                                                onChange={(e) => setName(e.target.value)}
                                                onBlur={() => setTouched(p => ({...p, name: true}))}
                                                className={`w-full rounded-xl border-2 px-4 py-3 transition-all focus:outline-none focus:ring-4 focus:ring-blue-50 ${
                                                    touched.name && !name.trim() ? "border-red-500" : "border-gray-100"
                                                }`}
                                                placeholder="Your full name"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-bold text-gray-700 mb-2">Email *</label>
                                            <input 
                                                type="email" 
                                                value={email}
                                                onChange={(e) => setEmail(e.target.value)}
                                                onBlur={() => setTouched(p => ({...p, email: true}))}
                                                className={`w-full rounded-xl border-2 px-4 py-3 transition-all focus:outline-none focus:ring-4 focus:ring-blue-50 ${
                                                    touched.email && !email.trim() ? "border-red-500" : "border-gray-100"
                                                }`}
                                                placeholder="your@email.com"
                                            />
                                        </div>
                                    </div>

                                    <div className="grid md:grid-cols-2 gap-6">
                                        <div>
                                            <label className="block text-sm font-bold text-gray-700 mb-2">Phone (Optional)</label>
                                            <input 
                                                type="text" 
                                                value={phone}
                                                onChange={(e) => setPhone(e.target.value)}
                                                className="w-full rounded-xl border-2 border-gray-100 px-4 py-3 transition-all focus:outline-none focus:ring-4 focus:ring-blue-50"
                                                placeholder="+94 7X XXX XXXX"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-bold text-gray-700 mb-2">Subject *</label>
                                            <select 
                                                value={subject}
                                                onChange={(e) => setSubject(e.target.value)}
                                                className="w-full rounded-xl border-2 border-gray-100 px-4 py-3 bg-white transition-all focus:outline-none focus:ring-4 focus:ring-blue-50"
                                            >
                                                {subjects.map(s => <option key={s} value={s}>{s}</option>)}
                                            </select>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 mb-2">Message *</label>
                                        <textarea 
                                            rows={5}
                                            value={message}
                                            onChange={(e) => setMessage(e.target.value)}
                                            onBlur={() => setTouched(p => ({...p, message: true}))}
                                            className={`w-full rounded-xl border-2 px-4 py-3 transition-all focus:outline-none focus:ring-4 focus:ring-blue-50 ${
                                                touched.message && message.trim().length < 20 ? "border-red-500" : "border-gray-100"
                                            }`}
                                            placeholder="Tell us how we can help..."
                                        />
                                        {touched.message && message.trim().length < 20 && (
                                            <p className="mt-1 text-xs text-red-500 italic">Minimum 20 characters required.</p>
                                        )}
                                    </div>

                                    {error && (
                                        <div className="bg-red-50 text-red-700 p-4 rounded-xl text-sm font-medium border border-red-100">
                                            ⚠️ {error}
                                        </div>
                                    )}

                                    <button 
                                        type="submit"
                                        disabled={loading}
                                        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-xl shadow-lg shadow-blue-600/20 transition-all active:scale-[0.98] disabled:opacity-70"
                                    >
                                        {loading ? "Sending..." : "Submit Message"}
                                    </button>
                                </form>
                            )}
                        </div>
                    </div>

                    {/* Contact Sidebar */}
                    <div className="space-y-8">
                        <div className="bg-blue-600 rounded-3xl p-8 text-white shadow-xl shadow-blue-600/20">
                            <h3 className="text-xl font-bold mb-6">Quick Contact</h3>
                            <div className="space-y-6">
                                <div className="flex items-start gap-4">
                                    <div className="bg-white/20 p-2 rounded-lg text-xl">📧</div>
                                    <div>
                                        <p className="text-blue-100 text-xs font-bold uppercase tracking-wider mb-1">Email</p>
                                        <p className="font-bold">examcoach@hotmail.com</p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-4">
                                    <div className="bg-white/20 p-2 rounded-lg text-xl">📱</div>
                                    <div>
                                        <p className="text-blue-100 text-xs font-bold uppercase tracking-wider mb-1">WhatsApp</p>
                                        <p className="font-bold">+94 777 816 116</p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-4">
                                    <div className="bg-white/20 p-2 rounded-lg text-xl">⏰</div>
                                    <div>
                                        <p className="text-blue-100 text-xs font-bold uppercase tracking-wider mb-1">Response Time</p>
                                        <p className="font-bold">Within 24 hours</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm">
                            <h3 className="font-bold text-gray-900 mb-4">Office Hours</h3>
                            <p className="text-gray-600 text-sm leading-relaxed">
                                Our support team is available Monday to Friday, 9:00 AM to 6:00 PM (IST). 
                                For urgent payment issues, please message us on WhatsApp.
                            </p>
                        </div>
                    </div>
                </div>

                {/* FAQs */}
                <div className="max-w-4xl mx-auto">
                    <h2 className="text-3xl font-bold text-gray-900 text-center mb-10">Frequently Asked Questions</h2>
                    <div className="grid md:grid-cols-2 gap-8">
                        {faqs.map((faq, i) => (
                            <div key={i} className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                                <h4 className="font-bold text-gray-900 mb-3">{faq.q}</h4>
                                <p className="text-gray-600 text-sm leading-relaxed">{faq.a}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    )
}

