import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(req: NextRequest) {
  try {
    // ดึง Banner ล่าสุด
    const latestBanner = await prisma.banner.findFirst({
      orderBy: { createdAt: 'desc' },
    });

    if (!latestBanner) {
      return NextResponse.json({ banner: null });
    }

    return NextResponse.json({
      banner: {
        id: latestBanner.id,
        url: latestBanner.url,
        filename: latestBanner.filename,
        uploadedAt: latestBanner.createdAt,
      }
    });

  } catch (error) {
    console.error('Error fetching latest banner:', error);
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาดในการดึงข้อมูล' },
      { status: 500 }
    );
  }
}
