import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/session';
import { v2 as cloudinary } from 'cloudinary';
import { PrismaClient } from '@prisma/client';
import { logActivity, ACTIVITY_ACTIONS } from '@/lib/activityLogger';

const prisma = new PrismaClient();

// ตั้งค่า Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const bannerId = resolvedParams.id;

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

    // หา Banner
    const banner = await prisma.banner.findUnique({
      where: { id: bannerId },
    });

    if (!banner) {
      return NextResponse.json(
        { error: 'ไม่พบ Banner' },
        { status: 404 }
      );
    }

    // ตรวจสอบสิทธิ์การลบ
    if (userRole === 'ADMIN') {
      // Admin ลบได้ทุก Banner
    } else if (userRole === 'SPORT_MANAGER' && banner.uploadedBy === userId) {
      // Sport Manager ลบได้เฉพาะ Banner ที่ตัวเองอัปโหลด
    } else {
      return NextResponse.json(
        { error: 'คุณไม่มีสิทธิ์ลบ Banner นี้' },
        { status: 403 }
      );
    }

    // ลบจาก Cloudinary
    try {
      await cloudinary.uploader.destroy(banner.publicId);
    } catch (cloudinaryError) {
      console.error('Error deleting from Cloudinary:', cloudinaryError);
      // ไม่ return error เพราะอาจจะลบจาก Cloudinary แล้ว
    }

    // ลบจาก database
    await prisma.banner.delete({
      where: { id: bannerId },
    });

    // บันทึก Activity Log
    await logActivity({
      userId: (session.user as any).id!,
      userName: session.user.name || 'Unknown',
      userRole: (session.user as any).role,
      action: ACTIVITY_ACTIONS.DELETE_BANNER,
      target: banner.filename,
      targetId: banner.id,
      details: {
        cloudinaryPublicId: banner.publicId,
        originalUrl: banner.url
      },
      request: req
    });

    return NextResponse.json({
      message: 'ลบ Banner สำเร็จ',
    });

  } catch (error) {
    console.error('Error deleting banner:', error);
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาดในการลบ' },
      { status: 500 }
    );
  }
}

