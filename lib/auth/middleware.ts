import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { jwtDecode } from 'jwt-decode'

type UserRole = 'admin' | 'manager' | 'guard' | 'client'

interface DecodedJWT {
  sub: string
  role?: UserRole
  user_metadata?: {
    role?: UserRole
  }
}

// Role-based route protection
const PROTECTED_ROUTES: Record<string, UserRole[]> = {
  '/dashboard/admin': ['admin'],
  '/dashboard/manager': ['admin', 'manager'],
  '/dashboard/guard': ['admin', 'manager', 'guard'],
  '/dashboard': ['admin', 'manager', 'guard'],
  '/hiring': ['admin', 'manager'],
  '/scheduling': ['admin', 'manager', 'guard'],
  '/compliance': ['admin', 'manager'],
  '/leads': ['admin', 'manager'],
}

// Public routes that don't require authentication
const PUBLIC_ROUTES = [
  '/',
  '/about',
  '/services',
  '/contact',
  '/qr',
  '/login',
  '/register',
  '/forgot-password',
  '/reset-password',
]

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const url = request.nextUrl.clone()
  const pathname = url.pathname

  // Skip middleware for static files, API routes, and other assets
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.includes('.')
  ) {
    return supabaseResponse
  }

  // Check if route is public
  const isPublicRoute = PUBLIC_ROUTES.some(route => {
    if (route === '/') return pathname === '/'
    if (route.includes('[') || route.endsWith('*')) {
      // Handle dynamic routes
      const routePattern = route.replace(/\[.*?\]/g, '[^/]+').replace(/\*/g, '.*')
      return new RegExp(`^${routePattern}$`).test(pathname)
    }
    return pathname.startsWith(route)
  })

  // Refresh session and get user
  const { data: { user }, error } = await supabase.auth.getUser()

  // If no user and trying to access protected route, redirect to login
  if (!user && !isPublicRoute) {
    url.pathname = '/login'
    url.searchParams.set('redirectTo', pathname)
    return NextResponse.redirect(url)
  }

  // If user exists and trying to access auth pages, redirect to dashboard
  if (user && ['/login', '/register', '/forgot-password'].includes(pathname)) {
    url.pathname = '/dashboard'
    url.searchParams.delete('redirectTo')
    return NextResponse.redirect(url)
  }

  // Check role-based access for protected routes
  if (user && !isPublicRoute) {
    const requiredRoles = PROTECTED_ROUTES[pathname]
    
    if (requiredRoles) {
      let userRole: UserRole | null = null
      
      // Try to get role from JWT token first
      try {
        const session = await supabase.auth.getSession()
        if (session.data.session?.access_token) {
          const decoded = jwtDecode<DecodedJWT>(session.data.session.access_token)
          userRole = decoded.role || decoded.user_metadata?.role || null
        }
      } catch (jwtError) {
        // JWT decode failed, fallback to database
        console.warn('JWT decode failed in middleware:', jwtError)
      }

      // If no role from JWT, try to get from database
      if (!userRole) {
        try {
          const { data } = await supabase
            .from('user_roles')
            .select('role')
            .eq('user_id', user.id)
            .single()
          
          userRole = data?.role || null
        } catch (dbError) {
          // Database query failed, use metadata fallback
          userRole = user.user_metadata?.role as UserRole || 'guard'
        }
      }

      // Check if user has required role
      if (!userRole || !requiredRoles.includes(userRole)) {
        // Redirect to appropriate dashboard based on role
        let redirectPath = '/dashboard'
        
        if (userRole === 'admin') redirectPath = '/dashboard/admin'
        else if (userRole === 'manager') redirectPath = '/dashboard/manager'
        else if (userRole === 'guard') redirectPath = '/dashboard/guard'
        
        // If trying to access unauthorized route, redirect to appropriate dashboard
        url.pathname = redirectPath
        url.searchParams.delete('redirectTo')
        return NextResponse.redirect(url)
      }
    }
  }

  return supabaseResponse
}