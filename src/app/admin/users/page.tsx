'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface User {
  id: string;
  username: string;
  role: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface Sport {
  id: string;
  name: string;
  code: string;
  description?: string;
  icon?: string;
}

export default function UserManagementPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [sports, setSports] = useState<Sport[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    role: 'USER',
    sportCode: '',
    isActive: true
  });
  const router = useRouter();

  // ตรวจสอบการล็อกอิน
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }
    
    fetchUsers();
    fetchSports();
  }, [router]);

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/admin/users');
      if (response.ok) {
        const data = await response.json();
        setUsers(data.users);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchSports = async () => {
    try {
      const response = await fetch('/api/sports');
      if (response.ok) {
        const data = await response.json();
        setSports(data.sports);
      }
    } catch (error) {
      console.error('Error fetching sports:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const url = editingUser 
        ? `/api/admin/users/${editingUser.id}` 
        : '/api/admin/users';
      
      const method = editingUser ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        alert(editingUser ? 'อัปเดตผู้ใช้สำเร็จ' : 'สร้างผู้ใช้สำเร็จ');
        resetForm();
        fetchUsers();
      } else {
        const error = await response.json();
        alert(error.error || 'เกิดข้อผิดพลาด');
      }
    } catch (error) {
      console.error('Error:', error);
      alert('เกิดข้อผิดพลาดในการดำเนินการ');
    }
  };

  const handleEdit = (user: User) => {
    setEditingUser(user);
    setFormData({
      username: user.username,
      password: '',
      role: user.role,
      sportCode: '',
      isActive: user.isActive
    });
    setShowCreateForm(true);
  };

  const handleDelete = async (userId: string) => {
    if (!confirm('คุณแน่ใจหรือไม่ที่จะลบผู้ใช้นี้?')) return;

    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        alert('ลบผู้ใช้สำเร็จ');
        fetchUsers();
      } else {
        const error = await response.json();
        alert(error.error || 'เกิดข้อผิดพลาดในการลบ');
      }
    } catch (error) {
      console.error('Error deleting user:', error);
      alert('เกิดข้อผิดพลาดในการลบผู้ใช้');
    }
  };

  const resetForm = () => {
    setFormData({
      username: '',
      password: '',
      role: 'USER',
      sportCode: '',
      isActive: true
    });
    setEditingUser(null);
    setShowCreateForm(false);
  };

  const generateUsername = (sportCode: string) => {
    if (!sportCode) return '';
    return `${sportCode.toLowerCase()}admin${Math.random().toString(36).substring(2, 8)}`;
  };

  const generatePassword = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let password = '';
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black text-white flex items-center justify-center">
        <div className="text-xl">กำลังโหลด...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black text-white">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute inset-0" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.1'%3E%3Ccircle cx='30' cy='30' r='2'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }} />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 py-6">
        {/* Header */}
        <header className="flex justify-between items-center mb-8">
          <div className="bg-red-600 rounded-lg px-6 py-4 shadow-lg">
            <h1 className="text-2xl md:text-3xl font-bold tracking-wider">จัดการผู้ใช้</h1>
          </div>
          <div className="flex gap-4">
            <button
              onClick={() => setShowCreateForm(!showCreateForm)}
              className="bg-green-600 hover:bg-green-700 px-4 py-2 rounded-lg font-semibold transition-colors"
            >
              {showCreateForm ? 'ยกเลิก' : 'เพิ่มผู้ใช้'}
            </button>
            <button
              onClick={() => router.push('/dashboard')}
              className="bg-gray-600 hover:bg-gray-700 px-4 py-2 rounded-lg font-semibold transition-colors"
            >
              กลับ Dashboard
            </button>
          </div>
        </header>

        {/* Create/Edit Form */}
        {showCreateForm && (
          <section className="bg-gray-800 rounded-lg p-6 mb-8 border border-gray-700 shadow-xl">
            <h2 className="text-xl font-bold mb-4 text-red-400">
              {editingUser ? 'แก้ไขผู้ใช้' : 'เพิ่มผู้ใช้ใหม่'}
            </h2>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Sport Selection */}
              <div>
                <label className="block text-sm font-medium mb-2">เลือกกีฬา:</label>
                <select
                  value={formData.sportCode}
                  onChange={(e) => {
                    const sportCode = e.target.value;
                    setFormData(prev => ({
                      ...prev,
                      sportCode,
                      username: generateUsername(sportCode),
                      password: generatePassword()
                    }));
                  }}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-red-500"
                  required={!editingUser}
                >
                  <option value="">เลือกกีฬา</option>
                  {sports.map(sport => (
                    <option key={sport.id} value={sport.code}>
                      {sport.icon} {sport.name} ({sport.code})
                    </option>
                  ))}
                </select>
              </div>

              {/* Username */}
              <div>
                <label className="block text-sm font-medium mb-2">Username:</label>
                <input
                  type="text"
                  value={formData.username}
                  onChange={(e) => setFormData(prev => ({ ...prev, username: e.target.value }))}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-red-500"
                  required
                />
              </div>

              {/* Password */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  Password: {editingUser && <span className="text-gray-400">(เว้นว่างถ้าไม่ต้องการเปลี่ยน)</span>}
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={formData.password}
                    onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                    className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-red-500"
                    required={!editingUser}
                  />
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, password: generatePassword() }))}
                    className="bg-blue-600 hover:bg-blue-700 px-3 py-2 rounded-lg text-sm transition-colors"
                  >
                    สุ่ม
                  </button>
                </div>
              </div>

              {/* Active Status (เฉพาะเมื่อแก้ไข) */}
              {editingUser && (
                <div>
                  <label className="block text-sm font-medium mb-2">สถานะ:</label>
                  <select
                    value={formData.isActive ? 'true' : 'false'}
                    onChange={(e) => setFormData(prev => ({ ...prev, isActive: e.target.value === 'true' }))}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-red-500"
                  >
                    <option value="true">ใช้งานได้</option>
                    <option value="false">ระงับการใช้งาน</option>
                  </select>
                </div>
              )}

              {/* Submit Buttons */}
              <div className="flex gap-4">
                <button
                  type="submit"
                  className="bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-6 rounded-lg transition-colors"
                >
                  {editingUser ? 'อัปเดต' : 'สร้างผู้ใช้'}
                </button>
                <button
                  type="button"
                  onClick={resetForm}
                  className="bg-gray-600 hover:bg-gray-700 text-white font-semibold py-2 px-6 rounded-lg transition-colors"
                >
                  ยกเลิก
                </button>
              </div>
            </form>
          </section>
        )}

        {/* Users Table */}
        <section className="bg-gray-800 rounded-lg border border-gray-700 shadow-xl overflow-hidden">
          <div className="bg-red-700 px-6 py-4">
            <h2 className="text-xl font-bold">รายการผู้ใช้ ({users.length} คน)</h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-700">
                <tr>
                  <th className="px-4 py-3 text-left">Username</th>
                  <th className="px-4 py-3 text-left">สิทธิ์</th>
                  <th className="px-4 py-3 text-left">สถานะ</th>
                  <th className="px-4 py-3 text-left">วันที่สร้าง</th>
                  <th className="px-4 py-3 text-center">จัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {users.map((user, index) => (
                  <tr key={user.id} className={index % 2 === 0 ? 'bg-gray-800' : 'bg-gray-750'}>
                    <td className="px-4 py-3 font-semibold">{user.username}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                        user.role === 'ADMIN' ? 'bg-red-600 text-white' :
                        user.role === 'MODERATOR' ? 'bg-yellow-600 text-white' :
                        'bg-blue-600 text-white'
                      }`}>
                        {user.role}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                        user.isActive ? 'bg-green-600 text-white' : 'bg-gray-600 text-white'
                      }`}>
                        {user.isActive ? 'ใช้งานได้' : 'ระงับ'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {new Date(user.createdAt).toLocaleDateString('th-TH')}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2 justify-center">
                        <button
                          onClick={() => handleEdit(user)}
                          className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm transition-colors"
                        >
                          แก้ไข
                        </button>
                        {user.username !== 'coeadmin777Zj12G' && (
                          <button
                            onClick={() => handleDelete(user.id)}
                            className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-sm transition-colors"
                          >
                            ลบ
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {users.length === 0 && (
            <div className="px-6 py-12 text-center text-gray-400">
              ไม่มีข้อมูลผู้ใช้
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
