import Link from 'next/link'

export default function AuthCodeErrorPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#050B14]">
      <div className="text-center max-w-md p-8">
        <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-red-500/10 flex items-center justify-center">
          <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-white mb-4">Authentication Error</h1>
        <p className="text-slate-400 mb-8">
          There was an error during the authentication process. Please try signing in again.
        </p>
        <Link 
          href="/login"
          className="inline-block bg-[#3B82F6] hover:bg-[#2563EB] text-white font-semibold py-3 px-8 rounded-xl transition-colors"
        >
          Back to Login
        </Link>
      </div>
    </div>
  )
}
