'use client';

import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

function LoginInner() {
  const next = useSearchParams().get('next') || '/';
  const [error, setError] = useState('');

  async function google() {
    const { error } = await createClient().auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}` },
    });
    if (error) setError(error.message);
  }

  return (
    <div className="center">
      <h1>Sign in</h1>
      <p className="sub">Use your Google account. No password to remember.</p>
      <button className="btn" onClick={google}>Continue with Google</button>
      {error && <p className="err">{error}</p>}
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="wrap">
      <Suspense fallback={null}>
        <LoginInner />
      </Suspense>
    </div>
  );
}
