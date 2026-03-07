'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function AdminPage() {
  const [loading, setLoading] = useState(true)
  const [authorized, setAuthorized] = useState(false)
  const [subscriptions, setSubscriptions] = useState<any[]>([])
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    checkAuth()
  }, [])

  async function checkAuth() {
    const { data: { user } } = await supabase.auth.getUser()
    
    console.log('Current user:', user?.email) // DEBUG
    
    if (!user) {
      console.log('No user, redirecting to login')
      router.push('/login')
      return
    }

    // REPLACE THIS EMAIL WITH YOUR ACTUAL EMAIL
    const adminEmail = 'nnpinidiya@gmail.com'
    
    if (user.email !== adminEmail) {
      console.log('Not admin email, redirecting home')
      router.push('/')
      return
    }

    setAuthorized(true)
    setLoading(false)
    loadPendingSubscriptions()
  }

  async function loadPendingSubscriptions() {
    const { data, error } = await supabase
      .from('subscriptions')
      .select(`
        id,
        amount_paid,
        payment_proof_url,
        created_at,
        student:student_id(full_name, email),
        mentor:mentor_id(
          user_id(full_name, email)
        )
      `)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error loading subscriptions:', error)
    } else {
      setSubscriptions(data || [])
    }
  }

  async function handleApprove(subscriptionId: string) {
    const { error } = await supabase
      .from('subscriptions')
      .update({
        status: 'active',
        started_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
      })
      .eq('id', subscriptionId)

    if (!error) {
      alert('Approved!')
      loadPendingSubscriptions()
    } else {
      alert('Error: ' + error.message)
    }
  }

  async function handleReject(subscriptionId: string) {
    const { error } = await supabase
      .from('subscriptions')
      .update({ status: 'cancelled' })
      .eq('id', subscriptionId)

    if (!error) {
      alert('Rejected')
      loadPendingSubscriptions()
    } else {
      alert('Error: ' + error.message)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">Loading Admin Panel...</div>
      </div>
    )
  }

  if (!authorized) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">Access Denied</div>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">🔧 Admin Panel</h1>
      
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-bold mb-4">
          Pending Subscriptions ({subscriptions.length})
        </h2>

        {subscriptions.length === 0 ? (
          <p className="text-gray-500">No pending subscriptions</p>
        ) : (
          <div className="space-y-4">
            {subscriptions.map((sub) => (
              <div key={sub.id} className="border rounded p-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p><strong>Student:</strong> {sub.student?.full_name}</p>
                    <p><strong>Email:</strong> {sub.student?.email}</p>
                  </div>
                  <div>
                    <p><strong>Coach:</strong> {sub.mentor?.user_id?.full_name}</p>
                    <p><strong>Amount:</strong> Rs. {sub.amount_paid}</p>
                  </div>
                </div>

                {sub.payment_proof_url && (
                  <div className="mt-3">
                    <a 
                      href={sub.payment_proof_url} 
                      target="_blank" 
                      className="text-blue-600 underline"
                    >
                      View Payment Proof
                    </a>
                  </div>
                )}

                <div className="flex gap-3 mt-4">
                  <button
                    onClick={() => handleApprove(sub.id)}
                    className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
                  >
                    ✅ Approve
                  </button>
                  <button
                    onClick={() => handleReject(sub.id)}
                    className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
                  >
                    ❌ Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}