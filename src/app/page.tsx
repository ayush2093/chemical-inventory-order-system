'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    router.push('/login');
  }, [router]);

  return (
    <div style={styles.container}>
      <span className="spinner" style={{ width: '40px', height: '40px' }}></span>
      <p style={{ marginTop: '16px', color: 'var(--text-secondary)' }}>Redirecting to portal...</p>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    background: 'var(--bg-deep)',
    fontFamily: 'var(--font-sans)',
  },
};
