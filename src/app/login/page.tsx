'use client'

import { createClient } from '@/utils/supabase/client'
import { useState } from 'react'

export default function LoginPage() {
  const [loading, setLoading] = useState(false)

  const handleGoogleLogin = async () => {
    setLoading(true)
    const supabase = createClient()
    
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    })

    if (error) {
      console.error('OAuth error:', error.message)
      setLoading(false)
    }
  }

  return (
    <div className="relative flex flex-col justify-end min-h-screen bg-[#050B14] overflow-hidden">
      {/* Background Gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#172554] via-[#020617] to-[#020617] pointer-events-none" />
      
      {/* Stars (Simulated) */}
      <div 
        className="absolute inset-0 opacity-40 animate-pulse" 
        style={{
          backgroundImage: 'radial-gradient(1px 1px at 20px 30px, #fff, rgba(0,0,0,0)), radial-gradient(1.5px 1.5px at 40px 70px, #fff, rgba(0,0,0,0)), radial-gradient(1px 1px at 50px 160px, #fff, rgba(0,0,0,0)), radial-gradient(1px 1px at 90px 40px, #fff, rgba(0,0,0,0)), radial-gradient(1.5px 1.5px at 130px 80px, #fff, rgba(0,0,0,0)), radial-gradient(1px 1px at 200px 300px, #fff, rgba(0,0,0,0))',
          backgroundSize: '300px 300px'
        }}
      />

      {/* Moon Graphic */}
      <div className="absolute top-[12%] -left-[12%] w-[70vw] h-[70vw] max-w-[320px] max-h-[320px] rounded-full bg-gradient-to-br from-slate-100 via-slate-300 to-slate-500 shadow-[0_0_80px_rgba(255,255,255,0.15)] z-0">
        {/* Craters */}
        <div className="absolute top-[35%] right-[25%] w-[12%] h-[12%] rounded-full bg-[#94a3b8]/40 shadow-[inset_2px_2px_4px_rgba(0,0,0,0.3)]" />
        <div className="absolute top-[55%] left-[20%] w-[8%] h-[8%] rounded-full bg-[#94a3b8]/40 shadow-[inset_1px_1px_3px_rgba(0,0,0,0.3)]" />
        <div className="absolute bottom-[30%] right-[35%] w-[6%] h-[6%] rounded-full bg-[#94a3b8]/40 shadow-[inset_1px_1px_2px_rgba(0,0,0,0.3)]" />
      </div>

      {/* Background Planet (Top Right) */}
      <div className="absolute top-[5%] -right-[20%] w-[80vw] h-[80vw] rounded-full bg-blue-600/10 blur-[80px] pointer-events-none" />

      {/* Bottom Card */}
      <div className="relative z-10 bg-[#111827] rounded-t-[2.5rem] p-8 pb-12 w-full shadow-[0_-20px_60px_rgba(0,0,0,0.6)] border-t border-white/5">
        <div className="max-w-md mx-auto">
          <h1 className="text-3xl font-bold text-white mb-4 leading-tight">
            Track your sleep <br /> everyday
          </h1>
          <p className="text-slate-400 text-sm leading-relaxed mb-10">
            Get an overview of how you sleep every day, get insight results in this app.
          </p>

          <button 
            onClick={handleGoogleLogin}
            disabled={loading}
            className="group relative w-full bg-[#3B82F6] hover:bg-[#2563EB] active:scale-[0.98] text-white font-semibold py-4 rounded-2xl flex items-center justify-center gap-3 transition-all duration-200 shadow-xl shadow-blue-500/20 disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {loading ? (
              <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <div className="bg-white p-1.5 rounded-full flex items-center justify-center shrink-0">
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                  </svg>
                </div>
                <span className="text-lg">Sign In with Google</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
