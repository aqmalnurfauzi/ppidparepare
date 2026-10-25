import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // 1. Verify user session explicitly using getUser (cryptographic verification)
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  // 2. Classify Route Types
  const isAuthRoute = ['/login', '/register', '/forgot-password'].some(route => pathname.startsWith(route));
  const isProtectedAdminRoute = pathname.startsWith('/dashboard');

  // 3. Early Route Guard
  if (!user) {
    // Unauthenticated trying to access admin dashboard -> redirect to login
    if (isProtectedAdminRoute) {
      const redirectUrl = new URL('/login', request.url);
      redirectUrl.searchParams.set('next', pathname);
      return NextResponse.redirect(redirectUrl);
    }
    // Unauthenticated accessing public or auth routes -> allow
    return supabaseResponse;
  }

  // User is authenticated, now check profile for role & active status
  // Middleware querying database can add overhead, but is required for early rejection UX guard.
  // We still enforce this natively in Server Actions & DB triggers!
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role, is_active')
    .eq('id', user.id)
    .single();

  const isActive = profile?.is_active ?? true;
  const role = profile?.role ?? 'user';

  // Handle deactivated users
  if (!isActive && isProtectedAdminRoute) {
    const errorUrl = new URL('/login', request.url);
    errorUrl.searchParams.set('error', 'account_disabled');
    return NextResponse.redirect(errorUrl);
  }

  // Prevent logged-in admin users from accessing Auth routes
  if (isAuthRoute && isActive) {
    const redirectUrl = new URL('/dashboard', request.url);
    return NextResponse.redirect(redirectUrl);
  }

  // Admin boundaries: non-admin trying to access dashboard -> redirect to home
  if (isProtectedAdminRoute && role !== 'admin') {
    return NextResponse.redirect(new URL('/', request.url)); // Forbidden
  }

  return supabaseResponse;
}
