import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  // Create a response object
  const res = NextResponse.next();
  
  // Create a Supabase client for authentication
  const supabase = createMiddlewareClient({ req: request, res });
  
  // For login page, if authenticated, redirect to dashboard
  if (request.nextUrl.pathname === '/login') {
    const { data } = await supabase.auth.getSession();
    if (data.session) {
      // User is already logged in, redirect to dashboard
      console.log('Redirecting authenticated user from login to dashboard');
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
    
    // Not authenticated, allow access to login page
    return res;
  }
  
  // Only protect dashboard routes - no API protection in middleware
  // (API routes will handle their own auth)
  if (request.nextUrl.pathname.startsWith('/dashboard')) {
    // Check if user is authenticated
    const { data } = await supabase.auth.getSession();
    
    if (!data.session) {
      // User is not authenticated, redirect to login
      console.log('Redirecting unauthenticated user to login');
      
      // Create login URL with redirect
      const loginUrl = new URL('/login', request.url);
      
      // Don't add redirectTo parameter to prevent potential loops
      // loginUrl.searchParams.set('redirectTo', request.nextUrl.pathname);
      
      return NextResponse.redirect(loginUrl);
    }
  }
  
  // Allow access to all other routes
  return res;
}

// Only apply middleware to the login page and dashboard routes
export const config = {
  matcher: [
    '/login',
    '/dashboard',
    '/dashboard/:path*'
  ],
};