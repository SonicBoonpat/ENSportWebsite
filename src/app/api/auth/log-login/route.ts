import { NextRequest, NextResponse } from 'next/server';
import { logActivity, ACTIVITY_ACTIONS } from '@/lib/activityLogger';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, userName, userRole } = body;

    if (!userId || !userName || !userRole) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // บันทึก Login Log
    await logActivity({
      userId,
      userName,
      userRole,
      action: ACTIVITY_ACTIONS.LOGIN,
      target: `เข้าสู่ระบบด้วยบัญชี ${userName}`,
      targetId: userId,
      details: {
        loginTime: new Date().toISOString(),
        userAgent: request.headers.get('user-agent') || 'Unknown'
      },
      request
    });

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Error logging login activity:', error);
    return NextResponse.json(
      { error: 'Failed to log login activity' },
      { status: 500 }
    );
  }
}
