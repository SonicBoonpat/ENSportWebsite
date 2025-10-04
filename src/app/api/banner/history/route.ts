import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/session';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(req: NextRequest) {
  try {
    // ตรวจสอบสิทธิ์
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'ไม่มีสิทธิ์เข้าถึง' },
        { status: 401 }
      );
    }

    const userRole = (session.user as any).role;
    if (!['ADMIN', 'EDITOR', 'SPORT_MANAGER'].includes(userRole)) {
      return NextResponse.json(
        { error: 'ไม่มีสิทธิ์เข้าถึง' },
        { status: 403 }
      );
    }

    // ดึงประวัติ Banner
    const banners = await prisma.banner.findMany({
      orderBy: { createdAt: 'desc' },
      take: 20, // แสดงล่าสุด 20 รายการ
    });

    const history = banners.map(banner => ({
      id: banner.id,
      filename: banner.filename,
      url: banner.url,
      uploadedBy: banner.uploadedBy,
      uploadedAt: new Date(banner.createdAt).toLocaleDateString('th-TH', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      }),
    }));

    return NextResponse.json({ history });

  } catch (error) {
    console.error('Error fetching banner history:', error);
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาดในการดึงข้อมูล' },
      { status: 500 }
    );
  }
}

