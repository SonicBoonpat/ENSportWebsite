import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/session';
import { logActivity, ACTIVITY_ACTIONS } from '@/lib/activityLogger';

// DELETE - ลบ match
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const resolvedParams = await params;
    const matchId = resolvedParams.id;

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

    // บันทึก Activity Log
    await logActivity({
      userId: (session.user as any).id!,
      userName: session.user.name || 'Unknown',
      userRole: (session.user as any).role,
      action: ACTIVITY_ACTIONS.DELETE_MATCH,
      target: `${existingMatch.team1} vs ${existingMatch.team2} (${existingMatch.sportType})`,
      targetId: existingMatch.id,
      details: {
        date: existingMatch.date,
        timeStart: existingMatch.timeStart,
        timeEnd: existingMatch.timeEnd,
        location: existingMatch.location,
        sport: existingMatch.sportType
      },
      request
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
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const resolvedParams = await params;
    const matchId = resolvedParams.id;
    const body = await request.json();
    
    const { date, timeStart, timeEnd, location, mapsLink, team1, team2 } = body;

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
        ...(body.status && { status: body.status }),
        ...(date && { date: new Date(date) }),
        ...(timeStart && { timeStart }),
        ...(timeEnd && { timeEnd }),
        ...(location && { location }),
        ...(mapsLink && { mapsLink }),
        ...(team1 && { team1 }),
        ...(team2 && { team2 }),
      }
    });

    // บันทึก Activity Log
    await logActivity({
      userId: (session.user as any).id!,
      userName: session.user.name || 'Unknown',
      userRole: (session.user as any).role,
      action: body.status ? ACTIVITY_ACTIONS.UPDATE_MATCH_STATUS : ACTIVITY_ACTIONS.UPDATE_MATCH,
      target: `${updatedMatch.team1} vs ${updatedMatch.team2} (${updatedMatch.sportType})`,
      targetId: updatedMatch.id,
      details: {
        changes: {
          ...(body.status && { status: body.status }),
          ...(date && { date }),
          ...(timeStart && { timeStart }),
          ...(timeEnd && { timeEnd }),
          ...(location && { location }),
          ...(team1 && { team1 }),
          ...(team2 && { team2 })
        },
        previousData: {
          status: existingMatch.status,
          date: existingMatch.date,
          timeStart: existingMatch.timeStart,
          timeEnd: existingMatch.timeEnd,
          location: existingMatch.location,
          team1: existingMatch.team1,
          team2: existingMatch.team2
        }
      },
      request
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
