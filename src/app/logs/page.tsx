'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import '../globals.css';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import BackButton from '@/components/buttons/BackButton';

interface ActivityLog {
  id: string;
  userId: string;
  userName: string;
  userRole: string;
  action: string;
  target: string;
  targetId?: string;
  details?: string;
  ipAddress?: string;
  userAgent?: string;
  createdAt: string;
}

export default function LogsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const logsPerPage = 20;

  // Check if user is admin
  useEffect(() => {
    if (status === 'loading') return;
    
    if (!session?.user || (session.user as any).role !== 'ADMIN') {
      router.push('/');
      return;
    }
  }, [session, status, router]);

  // Load logs
  const loadLogs = async (page: number = 1) => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: logsPerPage.toString(),
        filter,
        search: searchTerm
      });

      const response = await fetch(`/api/logs?${params}`);
      if (response.ok) {
        const data = await response.json();
        setLogs(data.logs);
        setTotalPages(Math.ceil(data.total / logsPerPage));
      }
    } catch (error) {
      console.error('Error loading logs:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (session?.user && (session.user as any).role === 'ADMIN') {
      loadLogs(currentPage);
    }
  }, [session, currentPage, filter, searchTerm]);

  // Format action names
  const formatActionName = (action: string): string => {
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
  };

  // Format Thai date
  const formatThaiDateTime = (dateString: string): string => {
    const date = new Date(dateString);
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
  };

  // Get action color
  const getActionColor = (action: string): string => {
    if (action.includes('DELETE')) return 'text-red-400';
    if (action.includes('CREATE') || action.includes('UPLOAD')) return 'text-white';
    if (action.includes('UPDATE') || action.includes('SCORE')) return 'text-amber-300';
    if (action.includes('SEND')) return 'text-white/80';
    return 'text-white/70';
  };

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white text-xl">กำลังโหลด...</div>
      </div>
    );
  }

  if (!session?.user || (session.user as any).role !== 'ADMIN') {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-black via-black to-red-en/10 relative">
      

      {/* Navigation */}
      <Navbar />
      {/* Back Button */}
      <BackButton />

      {/* Content */}
      <div className="relative z-10 px-4 sm:px-6 py-6">
        <div className="bg-red-en-bg/80 backdrop-blur-sm rounded-2xl shadow-2xl overflow-hidden ring-1 ring-white/10">
          <div className="bg-red-en px-5 sm:px-6 py-4 text-center">
            <h1 className="text-xl sm:text-2xl font-bold text-white tracking-wide">Activity Logs</h1>
          </div>

          <div className="px-5 sm:px-6 py-5">
            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mb-6">
              {/* Search */}
              <div className="flex-1">
                <input
                  type="text"
                  placeholder="ค้นหาผู้ใช้, การกระทำ, หรือเป้าหมาย..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-white/40"
                />
              </div>

              {/* Filter */}
              <div>
                <select
                  value={filter}
                  onChange={(e) => {
                    setFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-white/40"
                >
                  <option value="all" className="bg-gray-800">ทั้งหมด</option>
                  <option value="banner" className="bg-gray-800">Banner</option>
                  <option value="match" className="bg-gray-800">ตารางแข่งขัน</option>
                  <option value="auth" className="bg-gray-800">การเข้าสู่ระบบ</option>
                  <option value="subscription" className="bg-gray-800">การสมัครรับอีเมล</option>
                </select>
              </div>

              {/* Refresh */}
              <button
                onClick={() => loadLogs(currentPage)}
                className="px-4 py-3 bg-red-800 hover:bg-red-900 text-white rounded-xl transition-colors flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                รีเฟรช
              </button>
            </div>

            {/* Logs Table */}
            {isLoading ? (
              <div className="text-center text-white py-8">
                <div className="animate-spin inline-block w-8 h-8 border-4 border-white border-t-transparent rounded-full"></div>
                <p className="mt-2">กำลังโหลด...</p>
              </div>
            ) : logs.length > 0 ? (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full text-white">
                    <thead>
                      <tr className="border-b border-white/15 bg-white/5">
                        <th className="text-left py-3 px-4">เวลา</th>
                        <th className="text-left py-3 px-4">ผู้ใช้</th>
                        <th className="text-left py-3 px-4">บทบาท</th>
                        <th className="text-left py-3 px-4">การกระทำ</th>
                        <th className="text-left py-3 px-4">รายละเอียด</th>
                      </tr>
                    </thead>
                    <tbody>
                      {logs.map((log) => (
                        <tr key={log.id} className="border-b border-white/10 hover:bg-white/5">
                          <td className="py-3 px-4 text-sm">
                            {formatThaiDateTime(log.createdAt)}
                          </td>
                          <td className="py-3 px-4 text-sm font-medium">
                            {log.userName}
                          </td>
                          <td className="py-3 px-4 text-sm">
                            <span className={`px-2 py-1 rounded text-xs ring-1 ${
                              log.userRole === 'ADMIN' 
                                ? 'bg-red-600/20 text-red-300 ring-red-500/30' 
                                : log.userRole === 'GUEST'
                                ? 'bg-white/10 text-white/70 ring-white/10'
                                : 'bg-white/10 text-white/80 ring-white/10'
                            }`}>
                              {log.userRole === 'ADMIN' 
                                ? 'Admin' 
                                : log.userRole === 'GUEST'
                                ? 'Guest'
                                : 'Sport Manager'}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-sm">
                            <span className={`font-medium ${getActionColor(log.action)}`}>
                              {formatActionName(log.action)}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-sm text-gray-300">
                            {log.target}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex justify-center items-center gap-2 mt-6">
                    <button
                      onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                      disabled={currentPage === 1}
                      className="px-3 py-2 rounded-xl text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors bg-red-800 hover:bg-red-900 disabled:bg-white/10"
                    >
                      ←
                    </button>
                    
                    <span className="text-white px-4">
                      หน้า {currentPage} จาก {totalPages}
                    </span>
                    
                    <button
                      onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                      disabled={currentPage === totalPages}
                      className="px-3 py-2 rounded-xl text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors bg-red-800 hover:bg-red-900 disabled:bg-white/10"
                    >
                      →
                    </button>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center text-white py-8">
                <p>ไม่พบข้อมูล Activity Logs</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <Footer />
    </div>
  );
}
