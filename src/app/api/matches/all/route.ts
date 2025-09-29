import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET - ดึงข้อมูล matches ทั้งหมดสำหรับหน้าแรก
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const limit = parseInt(url.searchParams.get('limit') || '50');
    const search = url.searchParams.get('search') || '';

    // สร้าง where condition สำหรับ search
    const whereCondition: any = {};
    if (search) {
      whereCondition.OR = [
        { sportType: { contains: search, mode: 'insensitive' } },
        { team1: { contains: search, mode: 'insensitive' } },
        { team2: { contains: search, mode: 'insensitive' } },
        { location: { contains: search, mode: 'insensitive' } },
      ];
    }

    // ดึงข้อมูล matches
    const matches = await prisma.match.findMany({
      where: whereCondition,
      orderBy: [
        { date: 'asc' },
        { timeStart: 'asc' }
      ],
      take: limit,
    });

    // Format ข้อมูลให้ตรงกับที่หน้าแรกต้องการ
    const formattedMatches = matches.map(match => ({
      id: match.id,
      date: new Date(match.date).toLocaleDateString('th-TH', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      }),
      time: `${match.timeStart || ''} - ${match.timeEnd || ''}`,
      sport: match.sportType || 'ไม่ระบุ',
      match: `${match.team1 || 'ทีม A'} vs ${match.team2 || 'ทีม B'}`,
      location: match.location || 'ไม่ระบุสถานที่',
      url: match.mapsLink || '#',
      status: match.status,
      rawDate: match.date,
      rawTime: match.timeStart || '',
    }));

    return NextResponse.json({
      success: true,
      matches: formattedMatches,
      total: formattedMatches.length
    });

  } catch (error) {
    console.error('Error fetching all matches:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
