import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(req: NextRequest) {
  try {
    // ดึง Banner ทั้งหมดสำหรับแสดงในหน้าหลัก (ไม่ต้องล็อกอิน)
    const banners = await prisma.banner.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        filename: true,
        url: true,
        createdAt: true
      }
    });

    const publicBanners = banners.map(banner => ({
      id: banner.id,
      filename: banner.filename,
      url: banner.url
    }));

    return NextResponse.json({ 
      banners: publicBanners,
      count: publicBanners.length
    });

  } catch (error) {
    console.error('Error fetching public banners:', error);
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาดในการดึงข้อมูล' },
      { status: 500 }
    );
  }
}
