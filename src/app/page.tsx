import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import SignOutButton from '@/components/SignOutButton'

export default async function Home() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  return (
    <div className="min-h-screen bg-[#050B14] p-6">
      <div className="max-w-md mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            {user.user_metadata?.avatar_url && (
              <img 
                src={user.user_metadata.avatar_url} 
                alt="Avatar" 
                className="w-12 h-12 rounded-full border-2 border-blue-500/30"
              />
            )}
            <div>
              <h1 className="text-white font-semibold">
                Welcome back, {user.user_metadata?.full_name || user.email?.split('@')[0]}!
              </h1>
              <p className="text-slate-400 text-sm">{user.email}</p>
            </div>
          </div>
        </div>

        {/* Dashboard Card */}
        <div className="bg-[#111827] rounded-2xl p-6 border border-white/5">
          <h2 className="text-xl font-bold text-white mb-4">🌙 Sleep Dashboard</h2>
          <p className="text-slate-400 mb-6">
            You are now authenticated with Supabase! This is your protected dashboard.
          </p>
          
          <div className="bg-[#1F2937] rounded-xl p-4 mb-6">
            <h3 className="text-sm font-medium text-slate-300 mb-2">User Info</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500">User ID:</span>
                <span className="text-slate-300 font-mono text-xs">{user.id.slice(0, 8)}...</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Provider:</span>
                <span className="text-slate-300">{user.app_metadata?.provider || 'email'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Last Sign In:</span>
                <span className="text-slate-300">
                  {user.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleDateString() : 'N/A'}
                </span>
              </div>
            </div>
          </div>

          <SignOutButton />
        </div>
      </div>
    </div>
  )
}
