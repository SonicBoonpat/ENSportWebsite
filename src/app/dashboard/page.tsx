'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface User {
  id: string;
  username: string;
  role: string;
}

export default function DashboardPage() {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // Check if user is logged in
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }

    try {
      // Decode simple token (in production, use proper JWT verification)
      const decoded = JSON.parse(atob(token));
      // For demo purposes, we'll create a mock user object
      // In production, you should verify the token with your backend
      const mockUser: User = {
        id: decoded.userId || '1',
        username: 'coeadmin777Zj12G',
        role: 'ADMIN'
      };
      setUser(mockUser);
    } catch (error) {
      console.error('Invalid token:', error);
      router.push('/login');
      return;
    }

    setIsLoading(false);
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    router.push('/login');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black text-white flex items-center justify-center">
        <div className="text-xl">กำลังโหลด...</div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black text-white">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute inset-0" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.1'%3E%3Ccircle cx='30' cy='30' r='2'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }} />
      </div>

      <div className="relative z-10 max-w-6xl mx-auto px-4 py-6">
        {/* Header */}
        <header className="flex justify-between items-center mb-8">
          <div className="bg-red-600 rounded-lg px-6 py-4 shadow-lg">
            <h1 className="text-2xl md:text-3xl font-bold tracking-wider">EN SPORT - ADMIN</h1>
          </div>
          <button
            onClick={handleLogout}
            className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded-lg font-semibold transition-colors"
          >
            ออกจากระบบ
          </button>
        </header>

        {/* Welcome Section */}
        <section className="bg-gray-800 rounded-lg p-6 mb-8 border border-gray-700 shadow-xl">
          <h2 className="text-2xl font-bold mb-4 text-red-400">ยินดีต้อนรับ, {user.username}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-gray-300">
            <div>
              <strong>Username:</strong> {user.username}
            </div>
            <div>
              <strong>Role:</strong> <span className="text-red-400 font-semibold">{user.role}</span>
            </div>
            <div>
              <strong>User ID:</strong> {user.id}
            </div>
          </div>
        </section>

        {/* Quick Actions */}
        <section className="mb-8">
          <h3 className="text-xl font-bold mb-4 text-red-400">การจัดการระบบ</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div 
              onClick={() => router.push('/admin/users')}
              className="bg-gray-800 rounded-lg p-6 border border-gray-700 hover:border-red-500 transition-colors cursor-pointer"
            >
              <h4 className="text-lg font-semibold mb-2">จัดการผู้ใช้</h4>
              <p className="text-gray-400 text-sm">เพิ่ม แก้ไข หรือลบผู้ใช้งาน</p>
            </div>
            <div className="bg-gray-800 rounded-lg p-6 border border-gray-700 hover:border-red-500 transition-colors cursor-pointer">
              <h4 className="text-lg font-semibold mb-2">จัดการกีฬา</h4>
              <p className="text-gray-400 text-sm">เพิ่มหรือแก้ไขประเภทกีฬา</p>
            </div>
            <div className="bg-gray-800 rounded-lg p-6 border border-gray-700 hover:border-red-500 transition-colors cursor-pointer">
              <h4 className="text-lg font-semibold mb-2">จัดการลีก</h4>
              <p className="text-gray-400 text-sm">จัดการลีกและการแข่งขัน</p>
            </div>
            <div className="bg-gray-800 rounded-lg p-6 border border-gray-700 hover:border-red-500 transition-colors cursor-pointer">
              <h4 className="text-lg font-semibold mb-2">จัดการทีม</h4>
              <p className="text-gray-400 text-sm">เพิ่มหรือแก้ไขข้อมูลทีม</p>
            </div>
            <div className="bg-gray-800 rounded-lg p-6 border border-gray-700 hover:border-red-500 transition-colors cursor-pointer">
              <h4 className="text-lg font-semibold mb-2">จัดการการแข่งขัน</h4>
              <p className="text-gray-400 text-sm">สร้างและจัดการกำหนดการแข่งขัน</p>
            </div>
            <div className="bg-gray-800 rounded-lg p-6 border border-gray-700 hover:border-red-500 transition-colors cursor-pointer">
              <h4 className="text-lg font-semibold mb-2">ระบบแจ้งเตือน</h4>
              <p className="text-gray-400 text-sm">จัดการการแจ้งเตือนผู้ใช้</p>
            </div>
          </div>
        </section>

        {/* Statistics Section */}
        <section className="mb-8">
          <h3 className="text-xl font-bold mb-4 text-red-400">สถิติระบบ</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg p-6 text-center">
              <div className="text-3xl font-bold">0</div>
              <div className="text-sm">ผู้ใช้งาน</div>
            </div>
            <div className="bg-gradient-to-r from-green-600 to-green-700 rounded-lg p-6 text-center">
              <div className="text-3xl font-bold">0</div>
              <div className="text-sm">กีฬา</div>
            </div>
            <div className="bg-gradient-to-r from-purple-600 to-purple-700 rounded-lg p-6 text-center">
              <div className="text-3xl font-bold">0</div>
              <div className="text-sm">ทีม</div>
            </div>
            <div className="bg-gradient-to-r from-orange-600 to-orange-700 rounded-lg p-6 text-center">
              <div className="text-3xl font-bold">0</div>
              <div className="text-sm">การแข่งขัน</div>
            </div>
          </div>
        </section>

        {/* Navigation Links */}
        <section className="mb-8">
          <h3 className="text-xl font-bold mb-4 text-red-400">ลิงก์ที่เป็นประโยชน์</h3>
          <div className="flex flex-wrap gap-4">
            <a 
              href="/" 
              className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded-lg font-semibold transition-colors"
            >
              กลับสู่หน้าหลัก
            </a>
            <button className="bg-gray-600 hover:bg-gray-700 px-4 py-2 rounded-lg font-semibold transition-colors">
              ตั้งค่าระบบ
            </button>
            <button className="bg-gray-600 hover:bg-gray-700 px-4 py-2 rounded-lg font-semibold transition-colors">
              รายงานระบบ
            </button>
          </div>
        </section>

        {/* Footer */}
        <footer className="text-center text-gray-400 text-xs space-y-2 mt-12">
          <div className="space-y-1">
            <div>EN Sport Admin Dashboard</div>
            <div>GE362785 Creative Thinking and Problem Solving</div>
            <div>Copyright © All right reserve 2025 Group 2 Section 4</div>
          </div>
        </footer>
      </div>
    </div>
  );
}
