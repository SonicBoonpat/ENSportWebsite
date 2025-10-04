import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/session';
import { sendWelcomeEmail, send24HourReminder, sendMatchResult } from '@/lib/email';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    // ตรวจสอบสิทธิ์ (เฉพาะ Admin)
    if (!session?.user || (session.user as any).role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'ไม่มีสิทธิ์เข้าถึง - เฉพาะ Admin เท่านั้น' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { emailType, testEmail } = body;

    if (!emailType || !testEmail) {
      return NextResponse.json(
        { error: 'กรุณาระบุ emailType และ testEmail' },
        { status: 400 }
      );
    }

    let result;

    switch (emailType) {
      case 'welcome':
        result = await sendWelcomeEmail(testEmail);
        break;

      case '24hour-reminder':
        result = await send24HourReminder(testEmail, {
          sportType: 'บาสเกตบอล',
          team1: 'ทีม A',
          team2: 'ทีม B',
          date: '12/05/2025',
          timeStart: '11:00',
          timeEnd: '13:00',
          location: 'สนามกีฬา KKU',
          mapsLink: 'https://maps.google.com'
        });
        break;

      case 'match-result':
        result = await sendMatchResult(testEmail, {
          sportType: 'บาสเกตบอล',
          team1: 'ทีม A',
          team2: 'ทีม B',
          date: '12/05/2025',
          timeStart: '11:00',
          timeEnd: '13:00',
          location: 'สนามกีฬา KKU',
          homeScore: 85,
          awayScore: 78,
          winner: 'team1'
        });
        break;

      default:
        return NextResponse.json(
          { error: 'emailType ไม่ถูกต้อง (welcome, 24hour-reminder, match-result)' },
          { status: 400 }
        );
    }

    if (!result.success) {
      return NextResponse.json(
        { error: 'เกิดข้อผิดพลาดในการส่งอีเมล', details: result.error },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: `ส่งอีเมลทดสอบ (${emailType}) สำเร็จ`,
      emailType,
      sentTo: testEmail,
      success: true
    });

  } catch (error) {
    console.error('Error testing email system:', error);
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์' },
      { status: 500 }
    );
  }
}
