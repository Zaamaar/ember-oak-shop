import './globals.css';
import Link from 'next/link';
import { CartProvider } from '@/components/CartProvider';
import Header from '@/components/Header';

export const metadata = {
  title: 'Ember & Oak',
  description: 'Small-batch coffee and brewing gear.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <CartProvider>
          <Header />
          <main>{children}</main>
          <footer className="site">
            <div className="wrap">
              <span>&copy; {new Date().getFullYear()} Ember &amp; Oak</span>
              <span>
                <Link href="/#products">Shop</Link>
                <Link href="/cart">Cart</Link>
                <Link href="/orders">My orders</Link>
              </span>
            </div>
          </footer>
        </CartProvider>
      </body>
    </html>
  );
}
