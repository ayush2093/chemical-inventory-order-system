'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { LogOut, Package, FileText, User } from 'lucide-react';

export default function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const [currentUser, setCurrentUser] = useState<{ name: string; email: string; role: string } | null>(null);

  useEffect(() => {
    async function fetchMe() {
      try {
        const res = await fetch('/api/auth/me');
        if (res.ok) {
          const data = await res.json();
          setCurrentUser(data.user);
        }
      } catch (err) {
        console.error('Failed to fetch user:', err);
      }
    }
    fetchMe();
  }, []);

  const handleLogout = async () => {
    try {
      const res = await fetch('/api/auth/logout', { method: 'POST' });
      if (res.ok) {
        router.push('/login');
        router.refresh();
      }
    } catch (err) {
      console.error('Failed to log out:', err);
    }
  };

  if (!currentUser) return null;

  const isAdmin = currentUser.role === 'admin';

  return (
    <header style={styles.header} className="glass-panel">
      <div className="container" style={styles.navContainer}>
        <div style={styles.left}>
          <Link href="/" style={styles.brand}>
            AasaMedChem
          </Link>
          <span 
            style={styles.roleBadge} 
            className={isAdmin ? 'badge badge-approved' : 'badge badge-pending'}
          >
            {currentUser.role.toUpperCase()}
          </span>
        </div>

        <nav style={styles.nav}>
          {isAdmin ? (
            <>
              <Link
                href="/admin/products"
                style={{
                  ...styles.navLink,
                  ...(pathname.startsWith('/admin/products') ? styles.activeNavLink : {}),
                }}
              >
                <Package size={18} />
                Products
              </Link>
              <Link
                href="/admin/orders"
                style={{
                  ...styles.navLink,
                  ...(pathname.startsWith('/admin/orders') ? styles.activeNavLink : {}),
                }}
              >
                <FileText size={18} />
                Orders & Quotations
              </Link>
            </>
          ) : (
            <>
              <Link
                href="/seller/dashboard"
                style={{
                  ...styles.navLink,
                  ...(pathname.startsWith('/seller/dashboard') ? styles.activeNavLink : {}),
                }}
              >
                <Package size={18} />
                Product Search
              </Link>
              <Link
                href="/seller/orders"
                style={{
                  ...styles.navLink,
                  ...(pathname.startsWith('/seller/orders') ? styles.activeNavLink : {}),
                }}
              >
                <FileText size={18} />
                My Orders
              </Link>
            </>
          )}
        </nav>

        <div style={styles.right}>
          <div style={styles.userInfo}>
            <User size={16} style={{ color: 'var(--text-secondary)' }} />
            <span style={styles.userName}>{currentUser.name}</span>
          </div>
          <button onClick={handleLogout} className="btn btn-secondary" style={styles.logoutBtn}>
            <LogOut size={16} />
            Sign Out
          </button>
        </div>
      </div>
    </header>
  );
}

const styles: Record<string, React.CSSProperties> = {
  header: {
    borderRadius: 0,
    borderLeft: 'none',
    borderRight: 'none',
    borderTop: 'none',
    position: 'sticky',
    top: 0,
    zIndex: 100,
    backgroundColor: 'rgba(8, 11, 17, 0.8)',
  },
  navContainer: {
    height: '70px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  left: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  brand: {
    fontSize: '20px',
    fontWeight: '800',
    background: 'linear-gradient(135deg, #a78bfa, #8b5cf6)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
  },
  roleBadge: {
    fontSize: '10px',
    padding: '2px 8px',
    fontWeight: 'bold',
  },
  nav: {
    display: 'flex',
    alignItems: 'center',
    gap: '24px',
  },
  navLink: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    color: 'var(--text-secondary)',
    fontSize: '14px',
    fontWeight: 600,
    padding: '8px 12px',
    borderRadius: '6px',
    transition: 'all 0.2s',
  },
  activeNavLink: {
    color: 'var(--text-primary)',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderBottom: '2px solid var(--primary)',
    borderRadius: '6px 6px 0 0',
  },
  right: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
  },
  userInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '14px',
  },
  userName: {
    fontWeight: 500,
    color: 'var(--text-primary)',
  },
  logoutBtn: {
    padding: '8px 16px',
    fontSize: '13px',
  },
};
