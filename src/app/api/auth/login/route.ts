import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json();

    // Validate input
    if (!username || !password) {
      return NextResponse.json(
        { error: 'กรุณากรอก username และ password' },
        { status: 400 }
      );
    }

    // Find user by username only
    const user = await prisma.user.findUnique({
      where: {
        username: username
      }
    });

    if (!user) {
      return NextResponse.json(
        { error: 'ไม่พบผู้ใช้งาน' },
        { status: 401 }
      );
    }

    // Check if user is active
    if (!user.isActive) {
      return NextResponse.json(
        { error: 'บัญชีผู้ใช้ถูกระงับ' },
        { status: 401 }
      );
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return NextResponse.json(
        { error: 'รหัสผ่านไม่ถูกต้อง' },
        { status: 401 }
      );
    }

    // Create user session data (excluding password)
    const userSession = {
      id: user.id,
      email: user.email,
      username: user.username,
      role: user.role,
      firstName: user.firstName,
      lastName: user.lastName,
    };

    // For simplicity, we'll return user data with a simple token
    // In production, use proper JWT or session management
    const token = Buffer.from(JSON.stringify({ userId: user.id, timestamp: Date.now() })).toString('base64');

    return NextResponse.json({
      message: 'เข้าสู่ระบบสำเร็จ',
      user: userSession,
      token: token
    });

  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาดในการเข้าสู่ระบบ' },
      { status: 500 }
    );
  }
}
