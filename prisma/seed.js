const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  try {
    // ตรวจสอบว่ามีข้อมูลกีฬาแล้วหรือไม่
    const existingSports = await prisma.sport.count();
    if (existingSports > 0) {
      console.log('ข้อมูลกีฬามีอยู่แล้ว จำนวน:', existingSports);
      return;
    }

    // สร้างข้อมูลกีฬา
    const sports = [
      {
        name: 'Football',
        code: 'FB',
        description: 'ฟุตบอล',
        icon: '⚽',
        isActive: true,
      },
      {
        name: 'Basketball',
        code: 'BB',
        description: 'บาสเกตบอล',
        icon: '🏀',
        isActive: true,
      },
      {
        name: 'Badminton',
        code: 'BD',
        description: 'แบดมินตัน',
        icon: '🏸',
        isActive: true,
      },
      {
        name: 'Sepak Takraw',
        code: 'ST',
        description: 'ตะกร้อ',
        icon: '🥎',
        isActive: true,
      },
      {
        name: 'Chess',
        code: 'CH',
        description: 'หมากรุก',
        icon: '♟️',
        isActive: true,
      },
      {
        name: 'Table Tennis',
        code: 'TT',
        description: 'ปิงปอง',
        icon: '🏓',
        isActive: true,
      },
      {
        name: 'Volleyball',
        code: 'VB',
        description: 'วอลเลย์บอล',
        icon: '🏐',
        isActive: true,
      },
    ];

    // สร้างข้อมูลกีฬา
    for (const sport of sports) {
      await prisma.sport.create({
        data: sport,
      });
    }

    console.log('✅ สร้างข้อมูลกีฬาเสร็จแล้ว');
    console.log('กีฬาที่สร้าง:', sports.map(s => `${s.name} (${s.code})`).join(', '));

  } catch (error) {
    console.error('❌ เกิดข้อผิดพลาดในการสร้างข้อมูล:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
