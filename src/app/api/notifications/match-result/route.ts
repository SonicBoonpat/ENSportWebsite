import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/session';
import { prisma } from '@/lib/prisma';
import { sendMatchResult } from '@/lib/email';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    // ตรวจสอบสิทธิ์ (เฉพาะ Admin หรือ Sport Manager)
    if (!session?.user || !['ADMIN', 'SPORT_MANAGER'].includes((session.user as any).role)) {
      return NextResponse.json(
        { error: 'ไม่มีสิทธิ์เข้าถึง' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { matchId } = body;

    if (!matchId) {
      return NextResponse.json(
        { error: 'กรุณาระบุ matchId' },
        { status: 400 }
      );
    }

    // ดึงข้อมูลการแข่งขัน
    const match = await prisma.match.findUnique({
      where: { id: matchId },
      include: {
        sport: true
      }
    });

    if (!match) {
      return NextResponse.json(
        { error: 'ไม่พบข้อมูลการแข่งขัน' },
        { status: 404 }
      );
    }

    // ตรวจสอบว่าการแข่งขันจบแล้วและมีผลคะแนน
    if (match.status as string !== 'COMPLETED' || match.homeScore === null || match.awayScore === null) {
      return NextResponse.json(
        { error: 'การแข่งขันยังไม่จบหรือยังไม่มีผลคะแนน' },
        { status: 400 }
      );
    }

    // ตรวจสอบว่าเป็น Sport Manager ของกีฬานี้หรือไม่
    if ((session.user as any).role === 'SPORT_MANAGER') {
      if (match.sportType !== (session.user as any).sportType) {
        return NextResponse.json(
          { error: 'คุณไม่มีสิทธิ์จัดการการแข่งขันนี้' },
          { status: 403 }
        );
      }
    }

    // ดึงรายชื่อผู้สมัครรับข่าวสารที่ active
    const subscribers = await prisma.subscriber.findMany({
      where: { isActive: true },
      select: { email: true }
    });

    if (subscribers.length === 0) {
      return NextResponse.json(
        { message: 'ไม่มีผู้สมัครรับข่าวสาร' },
        { status: 200 }
      );
    }

    const subscriberEmails = subscribers.map(sub => sub.email);

    // ส่งอีเมลแจ้งผลการแข่งขัน
    const emailResult = await sendMatchResult(subscriberEmails, {
      sportType: match.sportType,
      team1: match.team1,
      team2: match.team2,
      date: match.date.toLocaleDateString('th-TH'),
      timeStart: match.timeStart || '',
      timeEnd: match.timeEnd || '',
      location: match.location,
      homeScore: match.homeScore,
      awayScore: match.awayScore,
      winner: (match as any).winner || 'draw'
    });

    if (!emailResult.success) {
      return NextResponse.json(
        { error: 'เกิดข้อผิดพลาดในการส่งอีเมล', details: emailResult.error },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: `ส่งอีเมลแจ้งผลการแข่งขันสำเร็จ ส่งไปยัง ${subscriberEmails.length} คน`,
      sentTo: subscriberEmails.length,
      matchResult: {
        teams: `${match.team1} vs ${match.team2}`,
        score: `${match.homeScore} - ${match.awayScore}`,
        winner: (match as any).winner
      }
    });

  } catch (error) {
    console.error('Error sending match result notification:', error);
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์' },
      { status: 500 }
    );
  }
}
