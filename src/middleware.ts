import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifyJWT } from './lib/auth';

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;

  // Let Next.js internal and static paths load without middleware checks
  if (
    path.startsWith('/_next') ||
    path.startsWith('/api/auth') ||
    path === '/favicon.ico'
  ) {
    return NextResponse.next();
  }

  const token = request.cookies.get('token')?.value;
  const user = token ? await verifyJWT(token) : null;

  // If authenticated and visiting auth pages, redirect to respective dashboard
  if (user && (path === '/login' || path === '/register')) {
    if (user.role === 'admin') {
      return NextResponse.redirect(new URL('/admin/products', request.url));
    } else {
      return NextResponse.redirect(new URL('/seller/dashboard', request.url));
    }
  }

  // If not authenticated and visiting protected pages, redirect to login
  if (!user && (path.startsWith('/admin') || path.startsWith('/seller') || path === '/')) {
    const loginUrl = new URL('/login', request.url);
    // Remember redirect parameter if needed
    return NextResponse.redirect(loginUrl);
  }

  // Redirect root path if authenticated
  if (user && path === '/') {
    if (user.role === 'admin') {
      return NextResponse.redirect(new URL('/admin/products', request.url));
    } else {
      return NextResponse.redirect(new URL('/seller/dashboard', request.url));
    }
  }

  // Guard /admin routes from non-admins
  if (path.startsWith('/admin') && user && user.role !== 'admin') {
    return NextResponse.redirect(new URL('/seller/dashboard', request.url));
  }

  // Guard /seller routes from non-sellers
  if (path.startsWith('/seller') && user && user.role !== 'seller') {
    return NextResponse.redirect(new URL('/admin/products', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api/auth|_next/static|_next/image|favicon.ico).*)'],
};
