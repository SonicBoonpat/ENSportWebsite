// Global middleware สำหรับ Next.js (ไม่บังคับ login)
import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit } from './lib/security';
import { handleCors } from './lib/cors';
import { addSecurityHeaders } from './lib/security';

// Main middleware function (ไม่ใช้ withAuth เพื่อให้เป็น optional)
export default function middleware(req: NextRequest) {
    const response = NextResponse.next();
    
    // Add security headers
    addSecurityHeaders(response);
    
    // Handle CORS
    const corsHeaders = handleCors(req);
    corsHeaders.forEach((value, key) => {
      response.headers.set(key, value);
    });
    
    // Rate limiting (ยกเว้น NextAuth APIs และ development mode)
    const path = req.nextUrl.pathname;
    const isDevelopment = process.env.NODE_ENV === 'development';
    
    // ไม่ apply rate limiting กับ NextAuth APIs หรือใน development mode
    if (!path.startsWith('/api/auth/') && !isDevelopment) {
      const ip = req.headers.get('x-forwarded-for') || 
                 req.headers.get('x-real-ip') || 
                 'unknown';
      
      // Different rate limits for different paths
      let rateLimit = { max: 1000, windowMs: 15 * 60 * 1000 }; // default
      
      if (path.startsWith('/api/upload/')) {
        rateLimit = { max: 10, windowMs: 60 * 60 * 1000 }; // upload endpoints
      } else if (path.startsWith('/api/')) {
        rateLimit = { max: 100, windowMs: 15 * 60 * 1000 }; // general API
      }
      
      const rateLimitKey = `${ip}:${path}`;
      const rateLimitResult = checkRateLimit(rateLimitKey, rateLimit.max, rateLimit.windowMs);
      
      if (!rateLimitResult.allowed) {
        return NextResponse.json(
          { error: 'Too many requests' },
          { 
            status: 429,
            headers: {
              'Retry-After': String(Math.ceil(rateLimit.windowMs / 1000)),
            }
          }
        );
      }
    }
    
    return response;
  }

// Configure which paths the middleware should run on
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api/auth/signin, api/auth/signout, api/auth/session (NextAuth)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files
     */
    '/((?!_next/static|_next/image|favicon.ico|public/).*)',
  ],
};
