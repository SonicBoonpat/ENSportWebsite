import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // ใช้ Intl.DateTimeFormat สำหรับ Thailand timezone
    const now = new Date();
    
    // สร้าง formatter สำหรับเวลาไทย
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

    return NextResponse.json({
      currentDate,
      currentTime,
      timestamp: now.getTime(),
      timezone: 'Asia/Bangkok',
      utcOffset: '+07:00'
    });
  } catch (error) {
    console.error('Error getting server time:', error);
    return NextResponse.json(
      { error: 'Failed to get server time' },
      { status: 500 }
    );
  }
}
