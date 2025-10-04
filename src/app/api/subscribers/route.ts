import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { sendWelcomeEmail } from '@/lib/email';
import { logActivity, ACTIVITY_ACTIONS } from '@/lib/activityLogger';

const prisma = new PrismaClient();

/**
 * สมัครรับข่าวสาร (Subscribe)
 */
export async function POST(req: NextRequest) {
  try {
    const { email, sports } = await req.json();

    // ตรวจสอบ email
    if (!email || !email.includes('@')) {
      return NextResponse.json(
        { error: 'กรุณากรอกอีเมลที่ถูกต้อง' },
        { status: 400 }
      );
    }

    // ตรวจสอบว่ามีอีเมลนี้ในระบบแล้วหรือไม่
    const existingSubscriber = await prisma.subscriber.findUnique({
      where: { email },
    });

    if (existingSubscriber) {
      // ถ้ามีแล้วแต่ถูกปิดการใช้งาน ให้เปิดใช้งานใหม่
      if (!existingSubscriber.isActive) {
        await prisma.subscriber.update({
          where: { email },
          data: {
            isActive: true,
            sports: sports ? JSON.stringify(sports) : null,
          },
        });

        return NextResponse.json({
          message: 'เปิดการรับข่าวสารสำเร็จ!',
          subscriber: existingSubscriber,
        });
      }

      return NextResponse.json(
        { error: 'อีเมลนี้ได้สมัครรับข่าวสารแล้ว' },
        { status: 400 }
      );
    }

    // สร้าง subscriber ใหม่
    const subscriber = await prisma.subscriber.create({
      data: {
        email,
        sports: sports ? JSON.stringify(sports) : null,
        isActive: true,
      },
    });

    // ส่งอีเมลต้อนรับ
    const emailResult = await sendWelcomeEmail(email);
    
    if (!emailResult.success) {
      console.error('Failed to send welcome email:', emailResult.error);
      // ไม่ return error เพราะการสมัครสำเร็จแล้ว แค่อีเมลส่งไม่ได้
    }

    // บันทึก Activity Log
    await logActivity({
      userId: 'guest', // ผู้ที่ไม่ได้ล็อกอิน
      userName: email, // ใช้อีเมลเป็นชื่อ
      userRole: 'GUEST',
      action: ACTIVITY_ACTIONS.EMAIL_SUBSCRIBE,
      target: `สมัครรับอีเมลด้วยที่อยู่ ${email}`,
      targetId: subscriber.id,
      details: {
        email,
        sports: sports || [],
        subscriptionTime: new Date().toISOString()
      },
      request: req
    });

    return NextResponse.json({
      message: 'สมัครรับข่าวสารสำเร็จ!',
      subscriber,
    }, { status: 201 });

  } catch (error) {
    console.error('Error in POST /api/subscribers:', error);
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาดในการสมัครรับข่าวสาร' },
      { status: 500 }
    );
  }
}

/**
 * ดึงรายการผู้สมัครทั้งหมด (สำหรับ Admin)
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const email = searchParams.get('email');

    if (email) {
      // ค้นหาผู้สมัครคนเดียว
      const subscriber = await prisma.subscriber.findUnique({
        where: { email },
      });

      if (!subscriber) {
        return NextResponse.json(
          { error: 'ไม่พบผู้สมัครรับข่าวสาร' },
          { status: 404 }
        );
      }

      return NextResponse.json({ subscriber });
    }

    // ดึงผู้สมัครทั้งหมด
    const subscribers = await prisma.subscriber.findMany({
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({
      subscribers,
      total: subscribers.length,
    });

  } catch (error) {
    console.error('Error in GET /api/subscribers:', error);
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาดในการดึงข้อมูล' },
      { status: 500 }
    );
  }
}

/**
 * ยกเลิกการสมัครรับข่าวสาร (Unsubscribe)
 */
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const email = searchParams.get('email');

    if (!email) {
      return NextResponse.json(
        { error: 'กรุณาระบุอีเมล' },
        { status: 400 }
      );
    }

    // หาผู้สมัคร
    const subscriber = await prisma.subscriber.findUnique({
      where: { email },
    });

    if (!subscriber) {
      return NextResponse.json(
        { error: 'ไม่พบผู้สมัครรับข่าวสาร' },
        { status: 404 }
      );
    }

    // ปิดการใช้งาน (ไม่ลบออกจากฐานข้อมูล)
    await prisma.subscriber.update({
      where: { email },
      data: { isActive: false },
    });

    return NextResponse.json({
      message: 'ยกเลิกการรับข่าวสารสำเร็จ',
    });

  } catch (error) {
    console.error('Error in DELETE /api/subscribers:', error);
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาดในการยกเลิกการรับข่าวสาร' },
      { status: 500 }
    );
  }
}
