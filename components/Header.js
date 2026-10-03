'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useCart } from './CartProvider';

export default function Header() {
  const { count } = useCart();
  const [user, setUser] = useState(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => setUser(data.user ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => setUser(session?.user ?? null));
    return () => sub.subscription.unsubscribe();
  }, []);

  async function signOut() {
    await createClient().auth.signOut();
    window.location.href = '/';
  }

  return (
    <>
      <div className="announce">Small-batch roasting &middot; brewing gear we actually use</div>
      <header className="site">
        <div className="wrap">
          <Link href="/" className="brand">Ember <span>&amp;</span> Oak</Link>
          <nav>
            <Link href="/#products">Shop</Link>
            {user && <Link href="/orders">My orders</Link>}
            <Link href="/cart" className="cartlink">
              Cart <span className="badge">{count}</span>
            </Link>
            {user ? (
              <span className="userbox">
                <span className="email">{user.email}</span>
                <button className="linkbtn" onClick={signOut}>Sign out</button>
              </span>
            ) : (
              <Link href="/login">Sign in</Link>
            )}
          </nav>
        </div>
      </header>
    </>
  );
}
