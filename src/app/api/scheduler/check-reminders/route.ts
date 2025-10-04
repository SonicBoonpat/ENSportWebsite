import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { send24HourReminder } from '@/lib/email';

export async function GET(request: NextRequest) {
  try {
    // ดึงเวลาปัจจุบันในเขตเวลาไทย
    const now = new Date();
    const thaiDateFormatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Bangkok',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
    
    const thaiTimeFormatter = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Asia/Bangkok',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
    
    const currentDate = thaiDateFormatter.format(now); // YYYY-MM-DD
    const currentTime = thaiTimeFormatter.format(now); // HH:MM

    // คำนวณวันพรุ่งนี้
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowDate = thaiDateFormatter.format(tomorrow);

    console.log(`🕐 Checking for 24-hour reminders at ${currentDate} ${currentTime}`);
    console.log(`📅 Looking for matches on ${tomorrowDate} at ${currentTime}`);

    // ค้นหาการแข่งขันที่จะเริ่มพรุ่งนี้ในเวลาเดียวกัน (±5 นาที)
    const matches = await prisma.match.findMany({
      where: {
        date: new Date(tomorrowDate + 'T00:00:00.000Z'),
        timeStart: {
          not: null
        },
        status: 'SCHEDULED', // เฉพาะการแข่งขันที่ยังไม่เริ่ม
        // เพิ่มเงื่อนไขเพื่อไม่ส่งซ้ำ (อาจจะเพิ่ม field reminderSent ใน schema ในอนาคต)
      },
      include: {
        sport: true
      }
    });

    console.log(`📋 Found ${matches.length} matches for tomorrow`);

    if (matches.length === 0) {
      return NextResponse.json({
        message: 'ไม่มีการแข่งขันที่ต้องส่งแจ้งเตือนล่วงหน้า 24 ชั่วโมง',
        currentTime: `${currentDate} ${currentTime}`,
        tomorrowDate
      });
    }

    // กรองการแข่งขันที่เวลาตรงกับเวลาปัจจุบัน (±5 นาที)
    const matchesToNotify = matches.filter(match => {
      if (!match.timeStart) return false;
      
      const [matchHour, matchMinute] = match.timeStart.split(':').map(Number);
      const [currentHour, currentMinute] = currentTime.split(':').map(Number);
      
      const matchTimeInMinutes = matchHour * 60 + matchMinute;
      const currentTimeInMinutes = currentHour * 60 + currentMinute;
      
      // ส่งแจ้งเตือนถ้าเวลาตรงกัน ±5 นาที
      const timeDiff = Math.abs(matchTimeInMinutes - currentTimeInMinutes);
      return timeDiff <= 5;
    });

    console.log(`⏰ Found ${matchesToNotify.length} matches to send reminders for`);

    if (matchesToNotify.length === 0) {
      return NextResponse.json({
        message: 'ไม่มีการแข่งขันที่ตรงเวลาสำหรับส่งแจ้งเตือน',
        currentTime: `${currentDate} ${currentTime}`,
        totalMatches: matches.length
      });
    }

    // ดึงรายชื่อผู้สมัครรับข่าวสารที่ active
    const subscribers = await prisma.subscriber.findMany({
      where: { isActive: true },
      select: { email: true }
    });

    if (subscribers.length === 0) {
      return NextResponse.json({
        message: 'ไม่มีผู้สมัครรับข่าวสาร',
        matchesFound: matchesToNotify.length
      });
    }

    const subscriberEmails = subscribers.map(sub => sub.email);
    const results = [];

    // ส่งอีเมลสำหรับแต่ละการแข่งขัน
    for (const match of matchesToNotify) {
      try {
        const emailResult = await send24HourReminder(subscriberEmails, {
          sportType: match.sportType,
          team1: match.team1,
          team2: match.team2,
          date: match.date.toLocaleDateString('th-TH'),
          timeStart: match.timeStart || '',
          timeEnd: match.timeEnd || '',
          location: match.location,
          mapsLink: match.mapsLink
        });

        results.push({
          matchId: match.id,
          sport: match.sportType,
          teams: `${match.team1} vs ${match.team2}`,
          success: emailResult.success,
          sentTo: emailResult.success ? subscriberEmails.length : 0,
          error: emailResult.error || null
        });

        console.log(`📧 Sent 24-hour reminder for ${match.sportType}: ${match.team1} vs ${match.team2}`);

      } catch (error) {
        console.error(`Error sending reminder for match ${match.id}:`, error);
        results.push({
          matchId: match.id,
          sport: match.sportType,
          teams: `${match.team1} vs ${match.team2}`,
          success: false,
          sentTo: 0,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    const successCount = results.filter(r => r.success).length;
    const totalSent = results.reduce((sum, r) => sum + r.sentTo, 0);

    return NextResponse.json({
      message: `ส่งอีเมลแจ้งเตือนล่วงหน้า 24 ชั่วโมงสำเร็จ`,
      currentTime: `${currentDate} ${currentTime}`,
      totalMatches: matchesToNotify.length,
      successfulNotifications: successCount,
      totalEmailsSent: totalSent,
      subscriberCount: subscriberEmails.length,
      results
    });

  } catch (error) {
    console.error('Error in check-reminders scheduler:', error);
    return NextResponse.json(
      { 
        error: 'เกิดข้อผิดพลาดในระบบตรวจสอบการแจ้งเตือน',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
