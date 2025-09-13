import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';

// GET - ดึงข้อมูลผู้ใช้รายเดียว
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        username: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      }
    });

    if (!user) {
      return NextResponse.json(
        { error: 'ไม่พบผู้ใช้' },
        { status: 404 }
      );
    }

    return NextResponse.json({ user });
  } catch (error) {
    console.error('Error fetching user:', error);
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาดในการดึงข้อมูลผู้ใช้' },
      { status: 500 }
    );
  }
}

// PUT - แก้ไขข้อมูลผู้ใช้
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { username, password, role, isActive } = await request.json();

    // ตรวจสอบว่าผู้ใช้มีอยู่จริง
    const existingUser = await prisma.user.findUnique({
      where: { id }
    });

    if (!existingUser) {
      return NextResponse.json(
        { error: 'ไม่พบผู้ใช้' },
        { status: 404 }
      );
    }

    // เตรียมข้อมูลที่จะอัปเดต
    const updateData: any = {};

    if (username && username !== existingUser.username) {
      // ตรวจสอบว่า username ใหม่ซ้ำหรือไม่
      const usernameExists = await prisma.user.findUnique({
        where: { username }
      });

      if (usernameExists) {
        return NextResponse.json(
          { error: 'Username นี้มีอยู่แล้ว' },
          { status: 400 }
        );
      }
      updateData.username = username;
    }

    if (password) {
      // เข้ารหัสรหัสผ่านใหม่
      updateData.password = await bcrypt.hash(password, 12);
    }

    if (role !== undefined) updateData.role = role;
    if (isActive !== undefined) updateData.isActive = isActive;

    // อัปเดตข้อมูล
    const updatedUser = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        username: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      }
    });

    return NextResponse.json({
      message: 'อัปเดตข้อมูลผู้ใช้สำเร็จ',
      user: updatedUser
    });

  } catch (error) {
    console.error('Error updating user:', error);
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาดในการอัปเดตผู้ใช้' },
      { status: 500 }
    );
  }
}

// DELETE - ลบผู้ใช้
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // ตรวจสอบว่าผู้ใช้มีอยู่จริง
    const existingUser = await prisma.user.findUnique({
      where: { id }
    });

    if (!existingUser) {
      return NextResponse.json(
        { error: 'ไม่พบผู้ใช้' },
        { status: 404 }
      );
    }

    // ป้องกันการลบ admin หลัก
    if (existingUser.role === 'ADMIN' && existingUser.username === 'coeadmin777Zj12G') {
      return NextResponse.json(
        { error: 'ไม่สามารถลบ admin หลักได้' },
        { status: 403 }
      );
    }

    // ลบผู้ใช้
    await prisma.user.delete({
      where: { id }
    });

    return NextResponse.json({
      message: 'ลบผู้ใช้สำเร็จ'
    });

  } catch (error) {
    console.error('Error deleting user:', error);
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาดในการลบผู้ใช้' },
      { status: 500 }
    );
  }
}
