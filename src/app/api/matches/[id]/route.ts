import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/session';

// DELETE - ลบ match
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const matchId = params.id;

    // ดึงข้อมูล match เพื่อตรวจสอบสิทธิ์
    const existingMatch = await prisma.match.findUnique({
      where: { id: matchId }
    });

    if (!existingMatch) {
      return NextResponse.json({ error: 'Match not found' }, { status: 404 });
    }

    // ตรวจสอบสิทธิ์
    const userRole = (session.user as any).role;
    const userSportType = (session.user as any).sportType;

    if (userRole !== 'ADMIN' && userSportType !== existingMatch.sportType) {
      return NextResponse.json(
        { error: 'You can only manage your own sport' },
        { status: 403 }
      );
    }

    // ลบ match
    await prisma.match.delete({
      where: { id: matchId }
    });

    return NextResponse.json({
      success: true,
      message: 'Match deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting match:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT - แก้ไข match
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const matchId = params.id;
    const body = await request.json();
    const { date, time, location, mapsLink, team1, team2 } = body;

    // ดึงข้อมูล match เพื่อตรวจสอบสิทธิ์
    const existingMatch = await prisma.match.findUnique({
      where: { id: matchId }
    });

    if (!existingMatch) {
      return NextResponse.json({ error: 'Match not found' }, { status: 404 });
    }

    // ตรวจสอบสิทธิ์
    const userRole = (session.user as any).role;
    const userSportType = (session.user as any).sportType;

    if (userRole !== 'ADMIN' && userSportType !== existingMatch.sportType) {
      return NextResponse.json(
        { error: 'You can only manage your own sport' },
        { status: 403 }
      );
    }

    // อัปเดต match
    const updatedMatch = await prisma.match.update({
      where: { id: matchId },
      data: {
        date: date ? new Date(date) : existingMatch.date,
        time: time || existingMatch.time,
        location: location || existingMatch.location,
        mapsLink: mapsLink || existingMatch.mapsLink,
        team1: team1 || existingMatch.team1,
        team2: team2 || existingMatch.team2,
      }
    });

    return NextResponse.json({
      success: true,
      match: updatedMatch
    });

  } catch (error) {
    console.error('Error updating match:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
