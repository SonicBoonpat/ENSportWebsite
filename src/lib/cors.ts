// CORS configuration
import { NextRequest, NextResponse } from 'next/server';

// CORS configuration สำหรับ environments ต่างๆ
const corsOptions = {
  development: {
    origin: [
      'http://localhost:3000',
      'http://127.0.0.1:3000',
      'http://localhost:3001',
    ],
    credentials: true,
  },
  production: {
    origin: [
      process.env.NEXTAUTH_URL || 'https://yourdomain.com',
      // เพิ่ม domains อื่นๆ ที่ต้องการอนุญาต
    ],
    credentials: true,
  },
};

export const getCorsOrigins = (): string[] => {
  const env = process.env.NODE_ENV || 'development';
  return corsOptions[env as keyof typeof corsOptions]?.origin || [];
};

export const corsHeaders = {
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
  'Access-Control-Allow-Headers': 
    'Content-Type, Authorization, X-Requested-With, Accept, Origin, Cache-Control, X-File-Name',
  'Access-Control-Max-Age': '86400', // 24 hours
};

// CORS middleware สำหรับ API routes
export const handleCors = (req: NextRequest, allowedOrigins?: string[]) => {
  const origin = req.headers.get('origin');
  const origins = allowedOrigins || getCorsOrigins();
  
  // สร้าง response headers
  const headers = new Headers(corsHeaders);
  
  // ตรวจสอบ origin
  if (origin && origins.includes(origin)) {
    headers.set('Access-Control-Allow-Origin', origin);
  } else if (process.env.NODE_ENV === 'development') {
    // อนุญาต localhost ใน development mode
    headers.set('Access-Control-Allow-Origin', origin || '*');
  }
  
  // เพิ่ม credentials header ถ้าจำเป็น
  headers.set('Access-Control-Allow-Credentials', 'true');
  
  return headers;
};

// Helper function สำหรับจัดการ OPTIONS request
export const handleOptions = (req: NextRequest) => {
  const headers = handleCors(req);
  return new NextResponse(null, { status: 200, headers });
};

// Wrapper function สำหรับ API handlers ที่ต้องการ CORS
export const withCors = (handler: Function, allowedOrigins?: string[]) => {
  return async (req: NextRequest, ...args: any[]) => {
    // Handle preflight requests
    if (req.method === 'OPTIONS') {
      return handleOptions(req);
    }
    
    // Execute the main handler
    const response = await handler(req, ...args);
    
    // Add CORS headers to the response
    const corsHeaders = handleCors(req, allowedOrigins);
    corsHeaders.forEach((value, key) => {
      response.headers.set(key, value);
    });
    
    return response;
  };
};
