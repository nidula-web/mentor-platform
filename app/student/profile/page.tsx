'use client'
// @ts-nocheck

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import Link from 'next/link'

export default function StudentProfilePage() {
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

    const [activeSubscriptions, setActiveSubscriptions] = useState<any[]>([])

    useEffect(() => {
        loadProfileData()
    }, [])

    async function loadProfileData() {
        setLoading(true)
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            router.push('/login')
            return
        }

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

        // Fetch subscriptions
        const { data: subsData } = await supabase
            .from('subscriptions')
            .select(`
                id,
                status,
                mentor_id,
                mentors (
                    subjects,
                    profiles (
                        full_name
                    )
                )
            `)
            .eq('student_id', user.id)
            .eq('status', 'active')

        if (subsData) {
            setActiveSubscriptions(subsData)
        }

        setLoading(false)
    }

    async function handleSave() {
        setSaving(true)
        const { error } = await supabase
            .from('profiles')
            .update({
                full_name: profile.full_name,
                phone: profile.phone
            })
            .eq('id', profile.id)

        if (error) {
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
        // In a real app, you'd likely call a secure edge function or just delete dependencies.
        // Here we'll delete the profile and sign out.
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

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
            </div>
        )
    }

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
                    <h1 className="text-2xl font-black text-gray-900">Student Profile</h1>
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

                    <div>
                        <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Email Address</label>
                        <input 
                            type="email"
                            value={profile.email}
                            disabled
                            className="w-full h-[52px] rounded-2xl bg-gray-100 border border-gray-100 px-4 font-bold text-gray-400 cursor-not-allowed outline-none"
                        />
                    </div>

                    <div>
                        <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Phone Number</label>
                        <input 
                            type="tel"
                            placeholder="07x xxxxxxx"
                            value={profile.phone}
                            onChange={e => setProfile({...profile, phone: e.target.value})}
                            className="w-full h-[52px] rounded-2xl bg-gray-50 border border-gray-100 px-4 font-bold text-gray-900 focus:bg-white focus:border-blue-500 transition-all outline-none"
                        />
                    </div>

                    <button 
                        onClick={handleSave}
                        disabled={saving}
                        className="w-full h-[52px] bg-blue-600 hover:bg-blue-700 text-white font-black rounded-2xl shadow-xl shadow-blue-600/20 transition-all active:scale-95 disabled:opacity-50"
                    >
                        {saving ? 'Saving...' : 'Save Changes'}
                    </button>
                </div>

                {/* Exam Details Section */}
                <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100 mb-6">
                    <h2 className="text-sm font-black uppercase tracking-widest text-gray-400 mb-6">Your Active Coaches</h2>
                    
                    {activeSubscriptions.length === 0 ? (
                        <div className="text-center py-4">
                            <p className="text-gray-500 text-sm font-medium mb-4">No active subscriptions found.</p>
                            <Link href="/browse" className="text-sm font-bold text-blue-600 hover:underline">Find a Coach</Link>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {activeSubscriptions.map(sub => (
                                <div key={sub.id} className="flex items-center justify-between p-4 rounded-2xl bg-gray-50 border border-gray-100">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold">
                                            {sub.mentors?.profiles?.full_name?.charAt(0)}
                                        </div>
                                        <div>
                                            <p className="font-bold text-gray-900 text-sm">{sub.mentors?.profiles?.full_name}</p>
                                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-tight">
                                                {Array.isArray(sub.mentors?.subjects) ? sub.mentors.subjects.join(', ') : 'Mentor'}
                                            </p>
                                        </div>
                                    </div>
                                    <Link href={`/chat/${sub.id}`} className="p-2 hover:bg-white rounded-xl text-blue-600 transition-all">
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"/></svg>
                                    </Link>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Danger Zone */}
                <div className="bg-red-50/50 rounded-3xl p-8 border border-red-100">
                    <h2 className="text-sm font-black uppercase tracking-widest text-red-400 mb-4">Danger Zone</h2>
                    <p className="text-xs text-red-600 mb-6 font-medium">Once you delete your account, there is no going back. Please be certain.</p>
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
                        <h3 className="text-xl font-black text-gray-900 text-center mb-2">Delete Account?</h3>
                        <p className="text-sm text-gray-500 text-center mb-8 font-medium">Are you sure? This will permanently delete your profile and all active subscriptions.</p>
                        
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
