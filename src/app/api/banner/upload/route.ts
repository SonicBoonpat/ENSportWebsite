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

export async function POST(req: NextRequest) {
  try {
    // ตรวจสอบสิทธิ์
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'ไม่มีสิทธิ์เข้าถึง' },
        { status: 401 }
      );
    }

    const userRole = (session.user as any).role;
    if (!['ADMIN', 'EDITOR', 'SPORT_MANAGER'].includes(userRole)) {
      return NextResponse.json(
        { error: 'ไม่มีสิทธิ์เข้าถึง' },
        { status: 403 }
      );
    }

    // รับไฟล์จาก form data
    const formData = await req.formData();
    const file = formData.get('image') as File;

    if (!file) {
      return NextResponse.json(
        { error: 'กรุณาเลือกไฟล์' },
        { status: 400 }
      );
    }

    // แปลงไฟล์เป็น buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // อัปโหลดไปยัง Cloudinary
    const uploadResult = await new Promise<any>((resolve, reject) => {
      cloudinary.uploader.upload_stream(
        {
          folder: 'KKUENSPORT/Banner',
          resource_type: 'image',
          quality: 'auto:best',
          format: 'jpg',
          transformation: [
            { width: 1600, height: 500, crop: 'fill', quality: 95 },
          ],
        },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      ).end(buffer);
    });

    // บันทึกลง database
    const banner = await prisma.banner.create({
      data: {
        filename: file.name,
        url: uploadResult.secure_url,
        publicId: uploadResult.public_id,
        uploadedBy: session.user.id,
      },
    });

    // บันทึก Activity Log
    await logActivity({
      userId: (session.user as any).id!,
      userName: session.user.name || 'Unknown',
      userRole: (session.user as any).role,
      action: ACTIVITY_ACTIONS.UPLOAD_BANNER,
      target: file.name,
      targetId: banner.id,
      details: {
        fileSize: file.size || 0,
        cloudinaryUrl: uploadResult.secure_url
      },
      request: req
    });

    return NextResponse.json({
      message: 'อัปโหลด Banner สำเร็จ',
      banner: {
        id: banner.id,
        filename: banner.filename,
        url: banner.url,
        uploadedAt: banner.createdAt,
      },
    }, { status: 201 });

  } catch (error: any) {
    console.error('Error uploading banner:', error);
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาดในการอัปโหลด', details: error.message },
      { status: 500 }
    );
  }
}

