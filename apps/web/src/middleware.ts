import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

function decodeJwt(token: string) {
  try {
    const payload = token.split('.')[1];
    const decodedStr = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(decodedStr);
  } catch (e) {
    return null;
  }
}

export function middleware(request: NextRequest) {
  const token = request.cookies.get('accessToken')?.value || request.cookies.get('refreshToken')?.value;
  const path = request.nextUrl.pathname;

  const isProtected = 
    path.startsWith('/admin') ||
    path.startsWith('/garage/') || path === '/garage' ||
    path.startsWith('/customer') ||
    path === '/garages' ||
    path === '/settings' ||
    path === '/shop' ||
    path === '/dashboard';

  // If no token exists
  if (!token) {
    if (path === '/') {
      return NextResponse.redirect(new URL('/login', request.url));
    }
    
    if (isProtected) {
      // In cross-origin production environments (like Render), HttpOnly cookies are stored on the API domain.
      // Next.js middleware running on the web domain cannot read them, so we bypass this check in production
      // and let the client-side RoleGuard / useAuth context handle authentication and authorization.
      if (process.env.NODE_ENV === 'production') {
        return NextResponse.next();
      }
      return NextResponse.redirect(new URL('/login', request.url));
    }
    return NextResponse.next();
  }

  // Token exists, parse roles
  const decoded = decodeJwt(token);
  const roles = decoded?.roles || [];

  // If token exists and path is root "/", redirect based on role
  if (path === '/') {
    if (roles.includes('admin')) {
      return NextResponse.redirect(new URL('/admin/dashboard', request.url));
    } else if (roles.includes('garage')) {
      return NextResponse.redirect(new URL('/garage/dashboard', request.url));
    } else {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
  }

  // Enforce role-based routing to prevent URL bypassing
  if (path.startsWith('/admin') && !roles.includes('admin')) {
    return NextResponse.redirect(new URL(roles.includes('garage') ? '/garage/dashboard' : '/dashboard', request.url));
  }

  if ((path.startsWith('/garage/') || path === '/garage') && !roles.includes('garage')) {
    return NextResponse.redirect(new URL(roles.includes('admin') ? '/admin/dashboard' : '/dashboard', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|login|signup).*)'],
};
