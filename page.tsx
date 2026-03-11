'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { useParams, useRouter } from 'next/navigation'

export default function ReviewPage() {
    const params = useParams()
    const router = useRouter()
    const subscriptionId = params.subscriptionId as string
    const supabase = createClient()

    const [rating, setRating] = useState(0)
    const [hoverRating, setHoverRating] = useState(0)
    const [comment, setComment] = useState('')
    const [coachName, setCoachName] = useState('')
    const [loading, setLoading] = useState(true)
    const [submitting, setSubmitting] = useState(false)
    const [alreadyReviewed, setAlreadyReviewed] = useState(false)
    const [currentUserId, setCurrentUserId] = useState<string | null>(null)
    const [mentorId, setMentorId] = useState<string | null>(null)

    useEffect(() => {
        loadData()
    }, [])

    async function loadData() {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
            router.push('/login')
            return
        }
        setCurrentUserId(user.id)

        // Get subscription
        const { data: sub } = await supabase
            .from('subscriptions')
            .select('student_id, mentor_id')
            .eq('id', subscriptionId)
            .single()

        if (!sub) {
            alert('Subscription not found')
            router.push('/student/dashboard')
            return
        }

        setMentorId(sub.mentor_id)

        // Get coach name
        const { data: mentor } = await supabase
            .from('mentors')
            .select('user_id')
            .eq('id', sub.mentor_id)
            .single()

        if (mentor) {
            const { data: profile } = await supabase
                .from('profiles')
                .select('full_name')
                .eq('id', mentor.user_id)
                .single()

            if (profile) setCoachName(profile.full_name)
        }

        // Check if already reviewed
        const { data: existingReview } = await supabase
            .from('reviews')
            .select('id')
            .eq('subscription_id', subscriptionId)
            .eq('student_id', user.id)
            .single()

        if (existingReview) setAlreadyReviewed(true)

        setLoading(false)
    }

    async function submitReview() {
        if (rating === 0) {
            alert('Please select a rating')
            return
        }
        if (!comment.trim()) {
            alert('Please write a comment')
            return
        }

        setSubmitting(true)

        const { error } = await supabase.from('reviews').insert({
            subscription_id: subscriptionId,
            student_id: currentUserId,
            mentor_id: mentorId,
            rating: rating,
            comment: comment.trim()
        })

        if (error) {
            console.error('Review error:', error)
            alert('Failed to submit review. Try again.')
            setSubmitting(false)
            return
        }

        alert('Thank you for your review!')
        router.push('/student/dashboard')
    }

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <p className="text-xl">Loading...</p>
            </div>
        )
    }

    if (alreadyReviewed) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="bg-white rounded-xl shadow p-8 max-w-md text-center">
                    <p className="text-4xl mb-4">✅</p>
                    <h1 className="text-2xl font-bold mb-2">Already Reviewed</h1>
                    <p className="text-gray-600 mb-4">
                        You have already submitted a review for this coach.
                    </p>
                    <button
                        onClick={() => router.push('/student/dashboard')}
                        className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
                    >
                        Back to Dashboard
                    </button>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-lg p-8 max-w-md w-full">
                <h1 className="text-2xl font-bold text-center mb-2">
                    Rate Your Coach
                </h1>
                <p className="text-gray-600 text-center mb-6">
                    How was your experience with {coachName}?
                </p>

                {/* Star Rating */}
                <div className="flex justify-center gap-2 mb-6">
                    {[1, 2, 3, 4, 5].map((star) => (
                        <button
                            key={star}
                            onClick={() => setRating(star)}
                            onMouseEnter={() => setHoverRating(star)}
                            onMouseLeave={() => setHoverRating(0)}
                            className="text-4xl transition-transform hover:scale-110"
                        >
                            {star <= (hoverRating || rating) ? '⭐' : '☆'}
                        </button>
                    ))}
                </div>

                <p className="text-center text-sm text-gray-500 mb-6">
                    {rating === 1 && 'Poor'}
                    {rating === 2 && 'Below Average'}
                    {rating === 3 && 'Average'}
                    {rating === 4 && 'Good'}
                    {rating === 5 && 'Excellent!'}
                </p>

                {/* Comment */}
                <textarea
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="Tell us about your experience... How did your coach help you?"
                    rows={4}
                    className="w-full border rounded-lg p-3 mb-6 focus:outline-none focus:border-blue-500 resize-none"
                />

                {/* Submit */}
                <button
                    onClick={submitReview}
                    disabled={submitting || rating === 0}
                    className={
                        'w-full py-3 rounded-lg text-white font-bold ' +
                        (submitting || rating === 0
                            ? 'bg-gray-300 cursor-not-allowed'
                            : 'bg-blue-600 hover:bg-blue-700')
                    }
                >
                    {submitting ? 'Submitting...' : 'Submit Review'}
                </button>
            </div>
        </div>
    )
}