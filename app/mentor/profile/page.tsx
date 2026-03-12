'use client'
// @ts-nocheck

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { LANGUAGES } from '@/lib/mentor-options'

export default function MentorProfilePage() {
    const router = useRouter()
    const supabase = createClient()

    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [uploading, setUploading] = useState(false)
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)
    const [showDeleteModal, setShowDeleteModal] = useState(false)

    const [profile, setProfile] = useState<any>({
        id: '',
        full_name: '',
        email: '',
        phone: '',
        profile_picture: ''
    })

    const [mentor, setMentor] = useState<any>({
        id: '',
        bio: '',
        languages: [],
        max_students: 20,
        exam_type: '',
        al_stream: '',
        subjects: [],
        university: '',
        index_number: '',
        results: {}
    })

    const [bankDetails, setBankDetails] = useState({
        bank_name: '',
        branch_name: '',
        account_number: '',
        account_holder_name: ''
    })

    useEffect(() => {
        loadData()
    }, [])

    async function loadData() {
        setLoading(true)
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            router.push('/login')
            return
        }

        // Fetch Profile
        const { data: profileData } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single()

        if (profileData) {
            setProfile({
                id: profileData.id,
                full_name: profileData.full_name || '',
                email: profileData.email || user.email || '',
                phone: profileData.phone || '',
                profile_picture: profileData.profile_picture || ''
            })
        }

        // Fetch Mentor
        const { data: mentorData } = await supabase
            .from('mentors')
            .select('*')
            .eq('user_id', user.id)
            .single()

        if (mentorData) {
            setMentor({
                id: mentorData.id,
                bio: mentorData.bio || '',
                languages: mentorData.languages || [],
                max_students: mentorData.max_students || 20,
                exam_type: mentorData.exam_type || '',
                al_stream: mentorData.al_stream || '',
                subjects: mentorData.subjects || [],
                university: mentorData.university || '',
                index_number: mentorData.index_number || '',
                results: mentorData.results || {}
            })

            // Fetch Bank Details
            const { data: bankData } = await supabase
                .from('coach_bank_details')
                .select('*')
                .eq('mentor_id', mentorData.id)
                .single()

            if (bankData) {
                setBankDetails({
                    bank_name: bankData.bank_name || '',
                    branch_name: bankData.branch_name || '',
                    account_number: bankData.account_number || '',
                    account_holder_name: bankData.account_holder_name || ''
                })
            }
        }

        setLoading(false)
    }

    async function handleSave() {
        setSaving(true)
        
        // 1. Update Profile
        const { error: profileError } = await supabase
            .from('profiles')
            .update({
                full_name: profile.full_name,
                phone: profile.phone
            })
            .eq('id', profile.id)

        // 2. Update Mentor
        const { error: mentorError } = await supabase
            .from('mentors')
            .update({
                bio: mentor.bio,
                languages: mentor.languages,
                max_students: parseInt(mentor.max_students as any)
            })
            .eq('id', mentor.id)

        // 3. Update Bank Details (Upsert)
        const { error: bankError } = await supabase
            .from('coach_bank_details')
            .upsert({
                mentor_id: mentor.id,
                bank_name: bankDetails.bank_name,
                branch_name: bankDetails.branch_name,
                account_number: bankDetails.account_number,
                account_holder_name: bankDetails.account_holder_name
            }, { onConflict: 'mentor_id' })

        if (profileError || mentorError || bankError) {
            setToast({ message: 'Error updating profile', type: 'error' })
        } else {
            setToast({ message: 'Profile updated!', type: 'success' })
            setTimeout(() => setToast(null), 3000)
        }
        setSaving(false)
    }

    async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0]
        if (!file) return

        setUploading(true)
        const fileExt = file.name.split('.').pop()
        const fileName = `${profile.id}-${Math.random()}.${fileExt}`
        const filePath = fileName

        const { error: uploadError } = await supabase.storage
            .from('profile-pictures')
            .upload(filePath, file)

        if (uploadError) {
            setToast({ message: 'Error uploading photo', type: 'error' })
            setUploading(false)
            return
        }

        const { data: { publicUrl } } = supabase.storage
            .from('profile-pictures')
            .getPublicUrl(filePath)

        const { error: updateError } = await supabase
            .from('profiles')
            .update({ profile_picture: publicUrl })
            .eq('id', profile.id)

        if (updateError) {
            setToast({ message: 'Error updating profile with new photo', type: 'error' })
        } else {
            setProfile(prev => ({ ...prev, profile_picture: publicUrl }))
            setToast({ message: 'Photo updated!', type: 'success' })
            setTimeout(() => setToast(null), 3000)
        }
        setUploading(false)
    }

    async function handleDeleteAccount() {
        const { error } = await supabase
            .from('profiles')
            .delete()
            .eq('id', profile.id)

        if (!error) {
            await supabase.auth.signOut()
            router.push('/')
        } else {
            setToast({ message: 'Error deleting account', type: 'error' })
            setShowDeleteModal(false)
        }
    }

    function toggleLanguage(lang: string) {
        setMentor(prev => {
            const languages = [...prev.languages]
            if (languages.includes(lang)) {
                return { ...prev, languages: languages.filter(l => l !== lang) }
            } else {
                return { ...prev, languages: [...languages, lang] }
            }
        })
    }

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
            </div>
        )
    }

    const resultEntries = mentor.results 
        ? Object.entries(mentor.results as Record<string, string>).filter(([k]) => k !== 'result_sheet_url' && k !== 'exam_year')
        : []

    return (
        <div className="min-h-screen bg-gray-50 pb-20 pt-20">
            {/* Toast */}
            {toast && (
                <div className={`fixed top-20 right-4 z-50 px-6 py-3 rounded-xl shadow-2xl animate-in slide-in-from-right duration-300 ${
                    toast.type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
                }`}>
                    <p className="font-bold text-sm">{toast.message}</p>
                </div>
            )}

            <div className="max-w-2xl mx-auto px-4">
                <div className="flex items-center gap-4 mb-8">
                    <button onClick={() => router.back()} className="p-2 hover:bg-white rounded-full transition-colors text-gray-600">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"/></svg>
                    </button>
                    <h1 className="text-2xl font-black text-gray-900">Coach Profile</h1>
                </div>

                {/* Profile Picture Section */}
                <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100 mb-6 flex flex-col items-center">
                    <div className="relative group">
                        <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-blue-50 shadow-inner">
                            {profile.profile_picture ? (
                                <img src={profile.profile_picture} alt="" className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full bg-blue-100 flex items-center justify-center text-blue-600 text-3xl font-black">
                                    {profile.full_name?.charAt(0).toUpperCase()}
                                </div>
                            )}
                        </div>
                        {uploading && (
                            <div className="absolute inset-0 bg-white/60 backdrop-blur-sm flex items-center justify-center rounded-full">
                                <div className="w-6 h-6 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
                            </div>
                        )}
                    </div>
                    
                    <label className="mt-4 cursor-pointer group">
                        <span className="text-sm font-bold text-blue-600 group-hover:text-blue-700 transition-colors">
                            {uploading ? 'Uploading...' : 'Change Photo'}
                        </span>
                        <input type="file" className="hidden" accept="image/*" onChange={handlePhotoUpload} disabled={uploading} />
                    </label>
                </div>

                {/* Profile Info Form */}
                <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100 mb-6 space-y-6">
                    <div>
                        <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Full Name</label>
                        <input 
                            type="text"
                            value={profile.full_name}
                            onChange={e => setProfile({...profile, full_name: e.target.value})}
                            className="w-full h-[52px] rounded-2xl bg-gray-50 border border-gray-100 px-4 font-bold text-gray-900 focus:bg-white focus:border-blue-500 transition-all outline-none"
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Email</label>
                            <input 
                                type="email"
                                value={profile.email}
                                disabled
                                className="w-full h-[52px] rounded-2xl bg-gray-100 border border-gray-100 px-4 font-bold text-gray-400 cursor-not-allowed"
                            />
                        </div>
                        <div>
                            <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Phone</label>
                            <input 
                                type="tel"
                                value={profile.phone}
                                onChange={e => setProfile({...profile, phone: e.target.value})}
                                className="w-full h-[52px] rounded-2xl bg-gray-50 border border-gray-100 px-4 font-bold text-gray-900 focus:bg-white focus:border-blue-500 transition-all outline-none"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Bio / About You</label>
                        <textarea 
                            value={mentor.bio}
                            onChange={e => setMentor({...mentor, bio: e.target.value})}
                            rows={4}
                            className="w-full rounded-2xl bg-gray-50 border border-gray-100 p-4 font-bold text-gray-900 focus:bg-white focus:border-blue-500 transition-all outline-none resize-none"
                        />
                    </div>

                    <div>
                        <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-4">Languages</label>
                        <div className="flex flex-wrap gap-2">
                            {LANGUAGES.map(lang => (
                                <button
                                    key={lang}
                                    type="button"
                                    onClick={() => toggleLanguage(lang)}
                                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                                        mentor.languages.includes(lang)
                                        ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
                                        : 'bg-gray-50 text-gray-500 border border-gray-100 hover:bg-gray-100'
                                    }`}
                                >
                                    {lang}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div>
                        <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Max Students</label>
                        <select 
                            value={mentor.max_students}
                            onChange={e => setMentor({...mentor, max_students: parseInt(e.target.value)})}
                            className="w-full h-[52px] rounded-2xl bg-gray-50 border border-gray-100 px-4 font-bold text-gray-900 focus:bg-white focus:border-blue-500 transition-all outline-none"
                        >
                            {[5, 10, 20, 30, 50, 100].map(val => (
                                <option key={val} value={val}>{val} Students</option>
                            ))}
                        </select>
                    </div>

                    <button 
                        onClick={handleSave}
                        disabled={saving}
                        className="w-full h-[52px] bg-blue-600 hover:bg-blue-700 text-white font-black rounded-2xl shadow-xl shadow-blue-600/20 transition-all active:scale-95 disabled:opacity-50"
                    >
                        {saving ? 'Saving...' : 'Save Changes'}
                    </button>
                </div>

                {/* Exam Details (Read-only) */}
                <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100 mb-6">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-sm font-black uppercase tracking-widest text-gray-400">Exam Credentials</h2>
                        <span className="text-[10px] font-black text-blue-600 italic bg-blue-50 px-2 py-1 rounded-md">Read Only</span>
                    </div>

                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-gray-50 p-4 rounded-2xl border border-gray-50">
                                <p className="text-[10px] font-black text-gray-400 uppercase mb-1">Exam Type</p>
                                <p className="font-bold text-gray-900">{mentor.exam_type}</p>
                            </div>
                            <div className="bg-gray-50 p-4 rounded-2xl border border-gray-50">
                                <p className="text-[10px] font-black text-gray-400 uppercase mb-1">Stream</p>
                                <p className="font-bold text-gray-900">{mentor.al_stream || 'N/A'}</p>
                            </div>
                        </div>

                        <div className="bg-gray-50 p-4 rounded-2xl border border-gray-50">
                            <p className="text-[10px] font-black text-gray-400 uppercase mb-2">Academic Performance</p>
                            <div className="flex flex-wrap gap-2">
                                {resultEntries.map(([subject, grade]) => (
                                    <div key={subject} className="bg-white px-3 py-1.5 rounded-xl border border-gray-100 flex items-center gap-2">
                                        <span className="text-xs font-bold text-gray-600">{subject}:</span>
                                        <span className="text-xs font-black text-blue-600">{grade}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-gray-50 p-4 rounded-2xl border border-gray-50">
                                <p className="text-[10px] font-black text-gray-400 uppercase mb-1">University</p>
                                <p className="font-bold text-gray-900">{mentor.university || 'Achiever'}</p>
                            </div>
                            <div className="bg-gray-50 p-4 rounded-2xl border border-gray-50">
                                <p className="text-[10px] font-black text-gray-400 uppercase mb-1">Index Number</p>
                                <p className="font-bold text-gray-900">{mentor.index_number}</p>
                            </div>
                        </div>
                    </div>

                    <p className="mt-6 text-center text-xs font-bold text-gray-400">
                        Contact support to change exam details
                    </p>
                </div>

                {/* Bank Details Section */}
                <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100 mb-6">
                    <h2 className="text-sm font-black uppercase tracking-widest text-gray-400 mb-6">Bank Details (For Payments)</h2>
                    
                    <div className="space-y-6">
                        <div>
                            <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Bank Name</label>
                            <input 
                                type="text"
                                placeholder="e.g. Sampath Bank"
                                value={bankDetails.bank_name}
                                onChange={e => setBankDetails({...bankDetails, bank_name: e.target.value})}
                                className="w-full h-[52px] rounded-2xl bg-gray-50 border border-gray-100 px-4 font-bold text-gray-900 focus:bg-white focus:border-blue-500 transition-all outline-none"
                            />
                        </div>

                        <div>
                            <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Branch</label>
                            <input 
                                type="text"
                                placeholder="e.g. Colombo"
                                value={bankDetails.branch_name}
                                onChange={e => setBankDetails({...bankDetails, branch_name: e.target.value})}
                                className="w-full h-[52px] rounded-2xl bg-gray-50 border border-gray-100 px-4 font-bold text-gray-900 focus:bg-white focus:border-blue-500 transition-all outline-none"
                            />
                        </div>

                        <div>
                            <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Account Number</label>
                            <input 
                                type="text"
                                value={bankDetails.account_number}
                                onChange={e => setBankDetails({...bankDetails, account_number: e.target.value})}
                                className="w-full h-[52px] rounded-2xl bg-gray-50 border border-gray-100 px-4 font-bold text-gray-900 focus:bg-white focus:border-blue-500 transition-all outline-none"
                            />
                        </div>

                        <div>
                            <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Account Holder Name</label>
                            <input 
                                type="text"
                                value={bankDetails.account_holder_name}
                                onChange={e => setBankDetails({...bankDetails, account_holder_name: e.target.value})}
                                className="w-full h-[52px] rounded-2xl bg-gray-50 border border-gray-100 px-4 font-bold text-gray-900 focus:bg-white focus:border-blue-500 transition-all outline-none"
                            />
                        </div>

                        <button 
                            onClick={handleSave}
                            className="w-full h-[52px] bg-slate-900 hover:bg-black text-white font-black rounded-2xl shadow-xl transition-all active:scale-95"
                        >
                            Save All Details
                        </button>
                    </div>
                </div>

                {/* Danger Zone */}
                <div className="bg-red-50/50 rounded-3xl p-8 border border-red-100">
                    <h2 className="text-sm font-black uppercase tracking-widest text-red-400 mb-4">Danger Zone</h2>
                    <p className="text-xs text-red-600 mb-6 font-medium">Deleting your coach account is permanent. All your student data and earnings history will be lost.</p>
                    <button 
                        onClick={() => setShowDeleteModal(true)}
                        className="w-full h-[52px] bg-white border-2 border-red-100 text-red-600 font-black rounded-2xl hover:bg-red-50 transition-all active:scale-95"
                    >
                        Delete My Account
                    </button>
                </div>
            </div>

            {/* Delete Modal */}
            {showDeleteModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center px-4">
                    <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm" onClick={() => setShowDeleteModal(false)} />
                    <div className="relative bg-white rounded-[32px] p-8 max-w-sm w-full shadow-2xl animate-in zoom-in-95 duration-200">
                        <div className="w-16 h-16 bg-red-100 rounded-2xl flex items-center justify-center text-red-600 mb-6 mx-auto">
                            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                        </div>
                        <h3 className="text-xl font-black text-gray-900 text-center mb-2">Delete Coach Account?</h3>
                        <p className="text-sm text-gray-500 text-center mb-8 font-medium">Are you sure? This will remove your listing and access to all students.</p>
                        
                        <div className="space-y-3">
                            <button 
                                onClick={handleDeleteAccount}
                                className="w-full h-[56px] bg-red-600 text-white font-black rounded-2xl shadow-xl shadow-red-600/20 active:scale-95 transition-all"
                            >
                                Yes, Delete Account
                            </button>
                            <button 
                                onClick={() => setShowDeleteModal(false)}
                                className="w-full h-[56px] bg-gray-100 text-gray-600 font-black rounded-2xl active:scale-95 transition-all"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
