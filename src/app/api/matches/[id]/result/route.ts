import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/session';
import { PrismaClient } from '@prisma/client';
import { sendMatchResult } from '@/lib/email';
import { logActivity, ACTIVITY_ACTIONS } from '@/lib/activityLogger';

const prisma = new PrismaClient();

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const matchId = resolvedParams.id;

    // ตรวจสอบสิทธิ์
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'ไม่มีสิทธิ์เข้าถึง' },
        { status: 401 }
      );
    }

    const userRole = (session.user as any).role;
    const userId = (session.user as any).id;

    // รับข้อมูลจาก request
    const { homeScore, awayScore, winner } = await req.json();

    // หา Match
    const match = await prisma.match.findUnique({
      where: { id: matchId },
    });

    if (!match) {
      return NextResponse.json(
        { error: 'ไม่พบการแข่งขัน' },
        { status: 404 }
      );
    }

    // ตรวจสอบสิทธิ์ - Admin หรือ Sport Manager ของกีฬานั้น
    if (userRole !== 'ADMIN') {
      // ดึงข้อมูล user เพื่อเช็ค sportType
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { sportType: true, role: true }
      });

      if (!user || user.role !== 'SPORT_MANAGER' || user.sportType !== match.sportType) {
        return NextResponse.json(
          { error: 'คุณไม่มีสิทธิ์แก้ไขผลการแข่งขันนี้' },
          { status: 403 }
        );
      }
    }

    // ตรวจสอบว่าการแข่งขันอยู่ในสถานะที่สามารถใส่ผลได้
    if (!['PENDING_RESULT', 'COMPLETED'].includes(match.status)) {
      return NextResponse.json(
        { error: 'สามารถใส่ผลได้เฉพาะการแข่งขันที่รอผลการแข่งขันเท่านั้น' },
        { status: 400 }
      );
    }

    // Validate ข้อมูล
    if (homeScore === undefined || awayScore === undefined || !winner) {
      return NextResponse.json(
        { error: 'กรุณากรอกข้อมูลให้ครบถ้วน' },
        { status: 400 }
      );
    }

    if (homeScore < 0 || awayScore < 0) {
      return NextResponse.json(
        { error: 'คะแนนต้องไม่ติดลบ' },
        { status: 400 }
      );
    }

    if (!['team1', 'team2', 'draw'].includes(winner)) {
      return NextResponse.json(
        { error: 'ผลการแข่งขันไม่ถูกต้อง' },
        { status: 400 }
      );
    }

    // อัพเดทผลการแข่งขัน
    const updatedMatch = await prisma.match.update({
      where: { id: matchId },
      data: {
        homeScore: parseInt(homeScore),
        awayScore: parseInt(awayScore),
        status: 'COMPLETED' as any, // เปลี่ยนสถานะเป็น COMPLETED หลังใส่ผล
        updatedAt: new Date(),
      },
      include: {
        sport: true // รวมข้อมูลกีฬาสำหรับส่งอีเมล
      }
    });

    // ส่งอีเมลแจ้งผลการแข่งขันให้ผู้สมัครรับข่าวสาร
    try {
      const subscribers = await prisma.subscriber.findMany({
        where: { isActive: true },
        select: { email: true }
      });

      if (subscribers.length > 0) {
        const subscriberEmails = subscribers.map(sub => sub.email);
        
        const emailResult = await sendMatchResult(subscriberEmails, {
          sportType: updatedMatch.sportType,
          team1: updatedMatch.team1,
          team2: updatedMatch.team2,
          date: updatedMatch.date.toLocaleDateString('th-TH'),
          timeStart: updatedMatch.timeStart || '',
          timeEnd: updatedMatch.timeEnd || '',
          location: updatedMatch.location,
          homeScore: updatedMatch.homeScore!,
          awayScore: updatedMatch.awayScore!,
          winner: (updatedMatch as any).winner!
        });

        console.log(`📧 Match result email sent to ${subscriberEmails.length} subscribers:`, emailResult.success ? 'Success' : 'Failed');
      }
    } catch (emailError) {
      console.error('Error sending match result email:', emailError);
      // ไม่ให้ error ของอีเมลทำให้การอัพเดทผลล้มเหลว
    }

    // บันทึก Activity Log
    await logActivity({
      userId: (session.user as any).id!,
      userName: session.user.name || 'Unknown',
      userRole: (session.user as any).role,
      action: ACTIVITY_ACTIONS.UPDATE_MATCH_SCORE,
      target: `${updatedMatch.team1} vs ${updatedMatch.team2} (${updatedMatch.sportType})`,
      targetId: updatedMatch.id,
      details: {
        homeScore: updatedMatch.homeScore,
        awayScore: updatedMatch.awayScore,
        winner: (updatedMatch as any).winner,
        previousStatus: match.status,
        newStatus: 'COMPLETED'
      },
      request: req
    });

    return NextResponse.json({
      message: 'อัพเดทผลการแข่งขันสำเร็จ',
      match: {
        id: updatedMatch.id,
        homeScore: updatedMatch.homeScore,
        awayScore: updatedMatch.awayScore,
        winner: (updatedMatch as any).winner,
        team1: updatedMatch.team1,
        team2: updatedMatch.team2,
      },
    });

  } catch (error: any) {
    console.error('Error updating match result:', error);
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาดในการอัพเดท', details: error.message },
      { status: 500 }
    );
  }
}
