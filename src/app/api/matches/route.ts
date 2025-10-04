import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/session';
import { logActivity, ACTIVITY_ACTIONS } from '@/lib/activityLogger';

// GET - ดึงข้อมูล matches ตาม sport (Admin ดูได้ทุกกีฬา)
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const url = new URL(request.url);
    const sport = url.searchParams.get('sport');
    const userRole = (session.user as any).role;
    const userSportType = (session.user as any).sportType;

    let whereCondition: any = {};

    // Admin สามารถดูทุกกีฬาได้
    if (userRole === 'ADMIN') {
      // ถ้าไม่ระบุ sport parameter ให้ดูทุกกีฬา
      if (sport) {
        whereCondition.sportType = sport;
      }
      // ถ้าไม่ระบุ sport จะดูทุกกีฬา (whereCondition จะเป็น {})
    } else {
      // Sport Manager ดูได้เฉพาะกีฬาของตัวเอง
      if (!sport) {
        return NextResponse.json({ error: 'Sport parameter required' }, { status: 400 });
      }
      
      if (userSportType !== sport) {
        return NextResponse.json({ error: 'You can only view your own sport' }, { status: 403 });
      }
      
      whereCondition.sportType = sport;
    }

    // ดึงข้อมูล matches
    const matches = await prisma.match.findMany({
      where: whereCondition,
      orderBy: [
        { date: 'asc' },
        { timeStart: 'asc' }
      ]
    });

    return NextResponse.json({
      success: true,
      matches: matches
    });

  } catch (error) {
    console.error('Error fetching matches:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST - สร้าง match ใหม่
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { date, timeStart, timeEnd, location, mapsLink, team1, team2, sport } = body;

    // Validate required fields
    if (!date || !timeStart || !timeEnd || !location || !mapsLink || !team1 || !team2 || !sport) {
      return NextResponse.json(
        { error: 'All fields are required' },
        { status: 400 }
      );
    }

    // ตรวจสอบว่า user มีสิทธิ์แก้ไขกีฬานี้หรือไม่
    const userRole = (session.user as any).role;
    const userSportType = (session.user as any).sportType;

    if (userRole !== 'ADMIN' && userSportType !== sport) {
      return NextResponse.json(
        { error: 'You can only manage your own sport' },
        { status: 403 }
      );
    }

    // สร้าง match ใหม่ (ไม่ต้องใช้ relations แล้ว)
    const match = await prisma.match.create({
      data: {
        date: new Date(date),
        timeStart: timeStart,
        timeEnd: timeEnd,
        location: location,
        mapsLink: mapsLink,
        team1: team1,
        team2: team2,
        sportType: sport,
        status: 'SCHEDULED',
      }
    });

    // บันทึก Activity Log
    await logActivity({
      userId: (session.user as any).id!,
      userName: session.user.name || 'Unknown',
      userRole: (session.user as any).role,
      action: ACTIVITY_ACTIONS.CREATE_MATCH,
      target: `${team1} vs ${team2} (${sport})`,
      targetId: match.id,
      details: {
        date,
        timeStart,
        timeEnd,
        location,
        sport
      },
      request
    });

    return NextResponse.json({
      success: true,
      match: match
    });

  } catch (error) {
    console.error('Error creating match:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
