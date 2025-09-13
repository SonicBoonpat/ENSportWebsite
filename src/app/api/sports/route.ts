import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET - ดึงรายการกีฬาทั้งหมด
export async function GET() {
  try {
    const sports = await prisma.sport.findMany({
      where: {
        isActive: true
      },
      select: {
        id: true,
        name: true,
        code: true,
        description: true,
        icon: true,
      },
      orderBy: {
        name: 'asc'
      }
    });

    return NextResponse.json({ sports });
  } catch (error) {
    console.error('Error fetching sports:', error);
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาดในการดึงข้อมูลกีฬา' },
      { status: 500 }
    );
  }
}
