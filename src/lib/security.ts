// Security middleware และ utilities
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { NextRequest, NextResponse } from 'next/server';

// Simple in-memory rate limiter for Next.js
const rateLimitStore = new Map<string, number[]>();

export const checkRateLimit = (
  key: string, 
  max: number, 
  windowMs: number
): { allowed: boolean; remaining: number; resetTime: number } => {
  const now = Date.now();
  const windowStart = now - windowMs;
  
  if (!rateLimitStore.has(key)) {
    rateLimitStore.set(key, []);
  }
  
  const requests = rateLimitStore.get(key)!;
  
  // ลบ requests ที่เก่าเกิน window
  const validRequests = requests.filter(time => time > windowStart);
  
  const allowed = validRequests.length < max;
  const remaining = Math.max(0, max - validRequests.length - (allowed ? 1 : 0));
  const resetTime = now + windowMs;
  
  if (allowed) {
    validRequests.push(now);
    rateLimitStore.set(key, validRequests);
  }
  
  return { allowed, remaining, resetTime };
};

// Rate limit configurations
export const rateLimitConfigs = {
  general: { max: 100, windowMs: 15 * 60 * 1000 }, // 100 requests per 15 minutes
  auth: { max: 5, windowMs: 15 * 60 * 1000 }, // 5 attempts per 15 minutes
  passwordReset: { max: 3, windowMs: 60 * 60 * 1000 }, // 3 attempts per hour
  upload: { max: 10, windowMs: 60 * 60 * 1000 }, // 10 uploads per hour
};

// Rate limiter middleware
export const withRateLimit = (
  config: { max: number; windowMs: number },
  getKey?: (req: NextRequest) => string
) => {
  return (handler: Function) => {
    return async (req: NextRequest, ...args: any[]) => {
      const key = getKey ? getKey(req) : 
        `${req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown'}:${req.nextUrl.pathname}`;
      
      const { allowed, remaining, resetTime } = checkRateLimit(key, config.max, config.windowMs);
      
      if (!allowed) {
        return NextResponse.json(
          { error: 'Too many requests' },
          { 
            status: 429,
            headers: {
              'X-RateLimit-Limit': String(config.max),
              'X-RateLimit-Remaining': '0',
              'X-RateLimit-Reset': String(Math.ceil(resetTime / 1000)),
              'Retry-After': String(Math.ceil(config.windowMs / 1000)),
            }
          }
        );
      }
      
      const response = await handler(req, ...args);
      
      // Add rate limit headers to successful responses
      if (response instanceof NextResponse) {
        response.headers.set('X-RateLimit-Limit', String(config.max));
        response.headers.set('X-RateLimit-Remaining', String(remaining));
        response.headers.set('X-RateLimit-Reset', String(Math.ceil(resetTime / 1000)));
      }
      
      return response;
    };
  };
};

// Helmet configuration สำหรับ Next.js
export const helmetConfig = {
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: [
        "'self'", 
        "'unsafe-inline'", 
        "https://fonts.googleapis.com",
        "https://cdn.jsdelivr.net"
      ],
      fontSrc: [
        "'self'", 
        "https://fonts.gstatic.com",
        "https://cdn.jsdelivr.net"
      ],
      imgSrc: [
        "'self'", 
        "data:", 
        "https://res.cloudinary.com", // Cloudinary
        "https://images.unsplash.com",
        "blob:"
      ],
      scriptSrc: [
        "'self'", 
        "'unsafe-eval'", // สำหรับ Next.js dev mode
        "'unsafe-inline'", // จำเป็นสำหรับ Next.js
        "https://cdn.jsdelivr.net"
      ],
      connectSrc: [
        "'self'",
        "https://api.cloudinary.com", // Cloudinary API
      ],
      frameSrc: ["'none'"],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: [],
    },
  },
  crossOriginEmbedderPolicy: false, // ปิดเพื่อให้ทำงานกับ Next.js ได้
};

// Password hashing utilities
export const hashPassword = async (password: string): Promise<string> => {
  const saltRounds = 12;
  return await bcrypt.hash(password, saltRounds);
};

export const verifyPassword = async (password: string, hash: string): Promise<boolean> => {
  return await bcrypt.compare(password, hash);
};

// JWT utilities
export const signJWT = (payload: object, expiresIn: string | number = '24h'): string => {
  if (!process.env.NEXTAUTH_SECRET) {
    throw new Error('NEXTAUTH_SECRET is not defined');
  }
  return jwt.sign(payload, process.env.NEXTAUTH_SECRET, { expiresIn } as jwt.SignOptions);
};

export const verifyJWT = (token: string): any => {
  if (!process.env.NEXTAUTH_SECRET) {
    throw new Error('NEXTAUTH_SECRET is not defined');
  }
  return jwt.verify(token, process.env.NEXTAUTH_SECRET);
};

// JWT Middleware สำหรับ API routes
export const authenticateToken = (handler: Function) => {
  return async (req: NextRequest, ...args: any[]) => {
    try {
      const token = req.headers.get('authorization')?.replace('Bearer ', '');
      
      if (!token) {
        return NextResponse.json(
          { error: 'Access token required' }, 
          { status: 401 }
        );
      }

      const decoded = verifyJWT(token);
      // เพิ่ม user info ลงใน request
      (req as any).user = decoded;
      
      return handler(req, ...args);
    } catch (error) {
      return NextResponse.json(
        { error: 'Invalid or expired token' }, 
        { status: 403 }
      );
    }
  };
};

// Input validation helpers
export const sanitizeInput = (input: string): string => {
  return input.trim().replace(/[<>]/g, '');
};

export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const validateStrongPassword = (password: string): {
  isValid: boolean;
  errors: string[];
} => {
  const errors: string[] = [];
  
  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  }
  
  if (!/(?=.*[a-z])/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }
  
  if (!/(?=.*[A-Z])/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }
  
  if (!/(?=.*\d)/.test(password)) {
    errors.push('Password must contain at least one number');
  }
  
  if (!/(?=.*[@$!%*?&])/.test(password)) {
    errors.push('Password must contain at least one special character');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

// Error response helpers
export const createErrorResponse = (
  message: string, 
  status: number = 500, 
  details?: any
) => {
  const response: any = { error: message };
  
  // เพิ่ม details เฉพาะใน development mode
  if (process.env.NODE_ENV === 'development' && details) {
    response.details = details;
  }
  
  return NextResponse.json(response, { status });
};

// Success response helper
export const createSuccessResponse = (
  data: any, 
  message?: string, 
  status: number = 200
) => {
  const response: any = { data };
  
  if (message) {
    response.message = message;
  }
  
  return NextResponse.json(response, { status });
};

// Security headers helper
export const addSecurityHeaders = (response: NextResponse): NextResponse => {
  // Add security headers
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  
  return response;
};
