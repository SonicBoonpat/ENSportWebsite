import { prisma } from '@/lib/prisma';
import { NextRequest } from 'next/server';

export interface LogActivity {
  userId: string;
  userName: string;
  userRole: string;
  action: string;
  target: string;
  targetId?: string;
  details?: any;
  request?: NextRequest;
}

export async function logActivity({
  userId,
  userName,
  userRole,
  action,
  target,
  targetId,
  details,
  request
}: LogActivity) {
  try {
    // Extract IP address and User Agent from request
    let ipAddress: string | undefined;
    let userAgent: string | undefined;

    if (request) {
      // Get IP address
      ipAddress = request.headers.get('x-forwarded-for') || 
                  request.headers.get('x-real-ip') || 
                  request.headers.get('cf-connecting-ip') || 
                  'unknown';
      
      // Get User Agent
      userAgent = request.headers.get('user-agent') || undefined;
    }

    // Create activity log
    await prisma.activityLog.create({
      data: {
        userId,
        userName,
        userRole,
        action,
        target,
        targetId,
        details: details ? JSON.stringify(details) : null,
        ipAddress,
        userAgent
      }
    });

    console.log(`📝 Activity logged: ${action} by ${userName} (${userRole})`);
  } catch (error) {
    console.error('Error logging activity:', error);
    // Don't throw error to prevent breaking the main functionality
  }
}

// Activity action constants
export const ACTIVITY_ACTIONS = {
  // Banner actions
  UPLOAD_BANNER: 'UPLOAD_BANNER',
  DELETE_BANNER: 'DELETE_BANNER',
  
  // Match actions
  CREATE_MATCH: 'CREATE_MATCH',
  UPDATE_MATCH: 'UPDATE_MATCH',
  DELETE_MATCH: 'DELETE_MATCH',
  UPDATE_MATCH_SCORE: 'UPDATE_MATCH_SCORE',
  UPDATE_MATCH_STATUS: 'UPDATE_MATCH_STATUS',
  
  // Email actions
  SEND_24H_REMINDER: 'SEND_24H_REMINDER',
  SEND_MATCH_RESULT: 'SEND_MATCH_RESULT',
  
  // User actions
  LOGIN: 'LOGIN',
  LOGOUT: 'LOGOUT',
  
  // Subscription actions
  EMAIL_SUBSCRIBE: 'EMAIL_SUBSCRIBE',
  EMAIL_UNSUBSCRIBE: 'EMAIL_UNSUBSCRIBE'
} as const;

// Helper function to format action names for display
export function formatActionName(action: string): string {
  const actionMap: Record<string, string> = {
    'UPLOAD_BANNER': 'อัพโหลด Banner',
    'DELETE_BANNER': 'ลบ Banner',
    'CREATE_MATCH': 'สร้างตารางแข่งขัน',
    'UPDATE_MATCH': 'แก้ไขตารางแข่งขัน',
    'DELETE_MATCH': 'ลบตารางแข่งขัน',
    'UPDATE_MATCH_SCORE': 'ใส่คะแนนการแข่งขัน',
    'UPDATE_MATCH_STATUS': 'เปลี่ยนสถานะการแข่งขัน',
    'SEND_24H_REMINDER': 'ส่งอีเมลแจ้งเตือนล่วงหน้า',
    'SEND_MATCH_RESULT': 'ส่งอีเมลแจ้งผลการแข่งขัน',
    'LOGIN': 'เข้าสู่ระบบ',
    'LOGOUT': 'ออกจากระบบ',
    'EMAIL_SUBSCRIBE': 'สมัครรับอีเมล',
    'EMAIL_UNSUBSCRIBE': 'ยกเลิกการรับอีเมล'
  };
  
  return actionMap[action] || action;
}

// Helper function to format Thai date
export function formatThaiDateTime(date: Date): string {
  const thaiMonths = [
    'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
    'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
  ];

  const day = date.getDate();
  const month = thaiMonths[date.getMonth()];
  const year = date.getFullYear() + 543; // Convert to Buddhist Era
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');

  return `${day} ${month} ${year} ${hours}:${minutes} น.`;
}
