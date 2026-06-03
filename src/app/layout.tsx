import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'AasaMedChem | Inventory & Order Management',
  description: 'High-precision chemical inventory, unit conversion, and quotation system.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        {children}
      </body>
    </html>
  );
}
