import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/session';

// GET - ดึงข้อมูล matches ตาม sport
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const url = new URL(request.url);
    const sport = url.searchParams.get('sport');

    if (!sport) {
      return NextResponse.json({ error: 'Sport parameter required' }, { status: 400 });
    }

    // ดึงข้อมูล matches ของกีฬาที่กำหนด
    const matches = await prisma.match.findMany({
      where: {
        sportType: sport
      },
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
