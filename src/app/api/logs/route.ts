import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/session';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    // ตรวจสอบสิทธิ์ (เฉพาะ Admin)
    if (!session?.user || (session.user as any).role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'ไม่มีสิทธิ์เข้าถึง - เฉพาะ Admin เท่านั้น' },
        { status: 403 }
      );
    }

    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '20');
    const filter = url.searchParams.get('filter') || 'all';
    const search = url.searchParams.get('search') || '';

    const skip = (page - 1) * limit;

    // Build where condition
    let whereCondition: any = {};

    // Apply filter
    if (filter !== 'all') {
      switch (filter) {
        case 'banner':
          whereCondition.action = {
            in: ['UPLOAD_BANNER', 'DELETE_BANNER']
          };
          break;
        case 'match':
          whereCondition.action = {
            in: ['CREATE_MATCH', 'UPDATE_MATCH', 'DELETE_MATCH', 'UPDATE_MATCH_SCORE', 'UPDATE_MATCH_STATUS']
          };
          break;
        case 'auth':
          whereCondition.action = {
            in: ['LOGIN', 'LOGOUT']
          };
          break;
        case 'subscription':
          whereCondition.action = {
            in: ['EMAIL_SUBSCRIBE', 'EMAIL_UNSUBSCRIBE']
          };
          break;
      }
    }

    // Apply search
    if (search) {
      whereCondition.OR = [
        { userName: { contains: search, mode: 'insensitive' } },
        { action: { contains: search, mode: 'insensitive' } },
        { target: { contains: search, mode: 'insensitive' } },
        { userRole: { contains: search, mode: 'insensitive' } }
      ];
    }

    // Get total count
    const total = await prisma.activityLog.count({
      where: whereCondition
    });

    // Get logs
    const logs = await prisma.activityLog.findMany({
      where: whereCondition,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
      select: {
        id: true,
        userId: true,
        userName: true,
        userRole: true,
        action: true,
        target: true,
        targetId: true,
        details: true,
        ipAddress: true,
        userAgent: true,
        createdAt: true
      }
    });

    return NextResponse.json({
      logs,
      total,
      page,
      totalPages: Math.ceil(total / limit),
      hasMore: page * limit < total
    });

  } catch (error) {
    console.error('Error fetching logs:', error);
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์' },
      { status: 500 }
    );
  }
}
