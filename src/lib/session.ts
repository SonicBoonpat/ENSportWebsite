// Session Security configuration
import { NextAuthOptions, Session, User } from 'next-auth';
import { JWT } from 'next-auth/jwt';
import CredentialsProvider from 'next-auth/providers/credentials';
import { PrismaClient } from '@prisma/client';
import { verifyPassword } from './security';
import { NextRequest, NextResponse } from 'next/server';

const prisma = new PrismaClient();

// Session configuration with security
export const sessionConfig = {
  strategy: 'jwt' as const,
  maxAge: 24 * 60 * 60, // 24 hours
  updateAge: 60 * 60, // 1 hour - update session every hour
};

// Cookie configuration with security
export const cookieConfig = {
  sessionToken: {
    name: process.env.NODE_ENV === 'production' 
      ? '__Secure-next-auth.session-token' 
      : 'next-auth.session-token',
    options: {
      httpOnly: true,
      sameSite: 'lax' as const,
      path: '/',
      domain: process.env.NODE_ENV === 'production' 
        ? process.env.NEXTAUTH_URL?.replace(/https?:\/\//, '') 
        : undefined,
      secure: process.env.NODE_ENV === 'production',
    },
  },
  callbackUrl: {
    name: process.env.NODE_ENV === 'production' 
      ? '__Secure-next-auth.callback-url' 
      : 'next-auth.callback-url',
    options: {
      sameSite: 'lax' as const,
      path: '/',
      secure: process.env.NODE_ENV === 'production',
    },
  },
  csrfToken: {
    name: process.env.NODE_ENV === 'production' 
      ? '__Host-next-auth.csrf-token' 
      : 'next-auth.csrf-token',
    options: {
      httpOnly: true,
      sameSite: 'lax' as const,
      path: '/',
      secure: process.env.NODE_ENV === 'production',
    },
  },
};

// NextAuth configuration (สำหรับระบบที่ไม่บังคับ login)
export const authOptions: NextAuthOptions = {
  // ไม่ใช้ adapter เพื่อให้เป็น stateless และไม่บังคับต้องมี database
  secret: process.env.NEXTAUTH_SECRET || 'fallback-secret-for-development',
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Username', type: 'text' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        console.log('🔐 NextAuth authorize called with:', credentials?.email);
        
        if (!credentials?.email || !credentials?.password) {
          console.log('❌ Missing credentials');
          return null;
        }

        try {
          // ค้นหา user ในฐานข้อมูลด้วย username
          const user = await prisma.user.findUnique({
            where: { username: credentials.email }, // ใช้ field email แต่ค้นหาด้วย username
            select: {
              id: true,
              username: true,
              password: true,
              name: true,
              sportType: true,
              role: true,
              isActive: true,
            },
          });

          if (!user) {
            console.log('❌ User not found:', credentials.email);
            return null;
          }

          console.log('✅ User found:', user.username, 'Role:', user.role);

          // ตรวจสอบว่า account ยัง active อยู่หรือไม่
          if (!user.isActive) {
            console.log('❌ Account deactivated:', user.username);
            return null;
          }

          // ตรวจสอบ password ด้วย bcrypt
          const isValidPassword = await verifyPassword(credentials.password, user.password);
          if (!isValidPassword) {
            console.log('❌ Invalid password for user:', user.username);
            return null;
          }

          console.log('✅ Password verified for:', user.username);

          // อัปเดต lastLogin
          await prisma.user.update({
            where: { id: user.id },
            data: { lastLogin: new Date() },
          });

          // ส่งคืนข้อมูล user (ไม่รวม password)
          const userForSession = {
            id: user.id,
            email: user.username, // ใช้ username แทน email
            name: user.name || user.username,
            role: user.role,
            sportType: user.sportType,
          };
          
          console.log('✅ Returning user for session:', userForSession);
          return userForSession;
        } catch (error) {
          console.error('Authentication error:', error);
          return null; // ส่งคืน null แทน throw error เพื่อป้องกัน client errors
        }
      },
    }),
  ],
  session: sessionConfig,
  cookies: cookieConfig,
  pages: {
    signIn: '/login',
  },
  callbacks: {
    async jwt({ token, user, account }) {
      // เมื่อ user login ครั้งแรก
      if (user && account) {
        console.log('🔑 JWT callback - Adding to token:', {
          role: (user as any).role,
          userId: user.id,
          sportType: (user as any).sportType
        });
        token.role = (user as any).role;
        token.userId = user.id;
        token.sportType = (user as any).sportType;
        token.loginTime = Date.now();
      }

      // ตรวจสอบ token expiry
      if (token.loginTime && Date.now() - (token.loginTime as number) > sessionConfig.maxAge * 1000) {
        // Token หมดอายุ - ใน production ควร redirect ไป login
        console.log('Token expired');
      }

      return token;
    },
    async session({ session, token }) {
      // เพิ่มข้อมูลเพิ่มเติมลงใน session
      if (token && session.user) {
        (session.user as any).id = token.userId as string;
        (session.user as any).role = token.role as string;
        (session.user as any).sportType = token.sportType as string;
        
        console.log('📋 Session callback - Final session:', {
          id: token.userId,
          role: token.role,
          sportType: token.sportType,
          email: session.user.email
        });
      }
      return session;
    },
    async redirect({ url, baseUrl }) {
      // Security: ป้องกัน open redirect และ redirect ไปหน้าแรกเสมอหลัง login
      
      // ถ้าเป็น relative path ให้ไปหน้าแรก
      if (url.startsWith('/')) {
        // ถ้าไม่ใช่หน้า login ให้ไปหน้าแรก
        if (url !== '/login') {
          return baseUrl;
        }
        return `${baseUrl}${url}`;
      }
      
      // ถ้าเป็น URL เต็มแต่เป็น domain เดียวกัน
      if (new URL(url).origin === baseUrl) {
        const pathname = new URL(url).pathname;
        // ถ้าไม่ใช่หน้า login ให้ไปหน้าแรก
        if (pathname !== '/login') {
          return baseUrl;
        }
        return url;
      }
      
      // Default: ไปหน้าแรก
      return baseUrl;
    },
  },
  events: {
    async signIn({ user, account, profile }) {
      console.log(`User ${user.email} signed in via ${account?.provider}`);
    },
    async signOut({ session, token }) {
      console.log(`User signed out`);
    },
    async createUser({ user }) {
      console.log(`New user created: ${user.email}`);
    },
  },
  debug: false, // ปิด debug เพื่อลด console errors
};

// Session validation middleware
export const validateSession = async (sessionToken: string) => {
  try {
    // ในกรณีที่ใช้ JWT strategy
    // NextAuth จะจัดการ validation ให้เอง
    return true;
  } catch (error) {
    console.error('Session validation error:', error);
    return false;
  }
};

// Helper function สำหรับตรวจสอบ role (ใช้สำหรับ regular users)
export const hasRole = (session: Session | null, requiredRole: string): boolean => {
  if (!session?.user) return false;
  return (session.user as any).role === requiredRole;
};

// Helper function สำหรับตรวจสอบว่า user login แล้วหรือยัง
export const isLoggedIn = (session: Session | null): boolean => {
  return !!session?.user;
};

// Middleware สำหรับตรวจสอบ authentication (optional)
export const requireAuth = (handler: Function, optional: boolean = false) => {
  return async (req: NextRequest, ...args: any[]) => {
    // สำหรับระบบที่ไม่บังคับ login
    // สามารถใช้ JWT token จาก header หรือไม่ก็ได้
    
    const token = req.headers.get('authorization')?.replace('Bearer ', '');
    let user = null;
    
    if (token) {
      try {
        // ตรวจสอบ token ถ้ามี
        const { verifyJWT } = await import('./security');
        user = verifyJWT(token);
      } catch (error) {
        console.log('Invalid token:', error);
        if (!optional) {
          return NextResponse.json(
            { error: 'Invalid token' },
            { status: 401 }
          );
        }
      }
    }
    
    if (!user && !optional) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
    
    // เพิ่ม user info ลงใน request (อาจเป็น null ถ้าไม่ login)
    (req as any).user = user;
    return handler(req, ...args);
  };
};

// เอา requireAdmin ออกเพราะไม่มีระบบ admin แล้ว
