import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { Dashboard } from '@/components/Dashboard'
import { User } from '@/types'

export default async function Home() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Map Supabase user to app User type
  const appUser: User = {
    id: user.id,
    email: user.email || '',
    name: user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0] || 'User',
    avatarUrl: user.user_metadata?.avatar_url || user.user_metadata?.picture || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.email || 'User')}&background=3B82F6&color=fff`,
  }

  return (
    <div className="min-h-screen bg-[#050B14] p-4">
      <Dashboard user={appUser} />
    </div>
  )
}
