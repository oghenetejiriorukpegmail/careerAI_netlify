import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  const res = NextResponse.next();
  
  // Create a Supabase client configured to use cookies
  const supabase = createMiddlewareClient({ req: request, res });
  
  // Refresh session if expired - required for Server Components
  await supabase.auth.getSession();
  
  return res;
}

// Ensure the middleware is only called for relevant paths
export const config = {
  matcher: [
    // Exclude static files, api routes, etc.
    '/((?!_next/static|_next/image|favicon.ico|api/).*)',
  ],
};