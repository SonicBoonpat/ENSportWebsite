'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

interface Match {
  id: string;
  date: string;
  time: string;
  location: string;
  mapsLink: string;
  team1: string;
  team2: string;
  createdAt: string;
  updatedAt: string;
}

export default function EditSchedulePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [matches, setMatches] = useState<Match[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);
  
  // Form states
  const [formData, setFormData] = useState({
    date: '',
    timeStart: '',
    timeEnd: '',
    location: '',
    mapsLink: '',
    team1: '',
    team2: ''
  });

  // ตรวจสอบ session และ redirect ถ้าไม่ได้ login
  useEffect(() => {
    if (status === 'loading') return; // รอให้ session โหลดเสร็จ
    if (!session?.user) {
      router.push('/login');
      return;
    }
  }, [session, status, router]);

  // โหลดข้อมูล matches ของกีฬาปัจจุบัน
  useEffect(() => {
    if (session?.user) {
      loadMatches();
    }
  }, [session]);

  const getSportName = () => {
    const sportType = (session?.user as any)?.sportType;
    return sportType || 'Unknown Sport';
  };

  const loadMatches = async () => {
    try {
      const sportType = (session?.user as any)?.sportType;
      console.log('Loading matches for sport:', sportType);
      
      const response = await fetch(`/api/matches?sport=${sportType}`);
      console.log('API Response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('Matches data:', data);
        setMatches(data.matches || []);
      } else {
        console.error('Failed to load matches:', response.statusText);
        setMessage({type: 'error', text: 'ไม่สามารถโหลดข้อมูลได้'});
      }
    } catch (error) {
      console.error('Error loading matches:', error);
      setMessage({type: 'error', text: 'เกิดข้อผิดพลาดในการโหลดข้อมูล'});
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage(null);

    try {
      const sportType = (session?.user as any)?.sportType;
      console.log('Submitting match data:', { ...formData, sport: sportType });
      
      const response = await fetch('/api/matches', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          sport: sportType
        }),
      });

      console.log('Submit response status:', response.status);
      const data = await response.json();
      console.log('Submit response data:', data);

      if (response.ok) {
        // ล้างฟอร์มและโหลดข้อมูลใหม่
      setFormData({
        date: '',
        timeStart: '',
        timeEnd: '',
        location: '',
        mapsLink: '',
        team1: '',
        team2: ''
      });
        await loadMatches();
        setMessage({type: 'success', text: 'บันทึกข้อมูลเรียบร้อยแล้ว'});
      } else {
        setMessage({type: 'error', text: data.error || 'เกิดข้อผิดพลาดในการบันทึกข้อมูล'});
      }
    } catch (error) {
      console.error('Error saving match:', error);
      setMessage({type: 'error', text: 'เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์'});
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (matchId: string) => {
    if (!confirm('คุณแน่ใจหรือไม่ว่าต้องการลบข้อมูลนี้?')) {
      return;
    }

    try {
      const response = await fetch(`/api/matches/${matchId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        await loadMatches();
        alert('ลบข้อมูลเรียบร้อยแล้ว');
      } else {
        alert('เกิดข้อผิดพลาดในการลบข้อมูล');
      }
    } catch (error) {
      console.error('Error deleting match:', error);
      alert('เกิดข้อผิดพลาดในการลบข้อมูล');
    }
  };

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white text-xl">กำลังโหลด...</div>
      </div>
    );
  }

  if (!session?.user) {
    return null; // จะ redirect ไปหน้า login
  }

  return (
    <div className="min-h-screen bg-black relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-30">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-800 via-slate-700 to-slate-900"></div>
      </div>

      {/* Navigation */}
      <nav className="relative z-10 bg-red-600 text-white py-4 px-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="text-2xl hover:text-red-200 transition-colors"
          >
            ←
          </button>
          <div className="text-sm font-medium">
            {(session.user as any).role === 'ADMIN' ? 'Admin' : 'Sport Manager'}
          </div>
        </div>
        
        <div className="text-xl font-bold tracking-wider">
          EN SPORT
        </div>
        
        <div className="w-8"></div> {/* Spacer for centering */}
      </nav>

      {/* Content */}
      <div className="relative z-10 p-6 space-y-6">
        {/* Schedule Form */}
        <div className="bg-red-600/95 backdrop-blur-sm rounded-lg shadow-xl border border-red-500/50 overflow-hidden">
          <div className="bg-red-700/80 px-6 py-4 text-center">
            <h2 className="text-2xl font-bold text-white tracking-wide">
              {getSportName()} Schedule
            </h2>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {/* Message Display */}
            {message && (
              <div className={`p-3 rounded-md text-center text-white ${
                message.type === 'success' ? 'bg-green-600' : 'bg-red-600'
              }`}>
                {message.text}
              </div>
            )}
            {/* วันที่และเวลา */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-white font-medium text-sm mb-2">
                  วันที่:
                </label>
                <input
                  type="date"
                  name="date"
                  value={formData.date}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded text-white placeholder-white/60 focus:outline-none focus:border-white/60"
                  required
                />
              </div>
              <div>
                <label className="block text-white font-medium text-sm mb-2">
                  เวลาเริ่ม:
                </label>
                <input
                  type="time"
                  name="timeStart"
                  value={formData.timeStart}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded text-white placeholder-white/60 focus:outline-none focus:border-white/60"
                  required
                />
              </div>
              <div>
                <label className="block text-white font-medium text-sm mb-2">
                  เวลาจบ:
                </label>
                <input
                  type="time"
                  name="timeEnd"
                  value={formData.timeEnd}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded text-white placeholder-white/60 focus:outline-none focus:border-white/60"
                  required
                />
              </div>
            </div>

            {/* สถานที่ */}
            <div>
              <label className="block text-white font-medium text-sm mb-2">
                สถานที่:
              </label>
              <input
                type="text"
                name="location"
                value={formData.location}
                onChange={handleInputChange}
                placeholder="Stadium"
                className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded text-white placeholder-white/60 focus:outline-none focus:border-white/60"
                required
              />
            </div>

            {/* Maps Link */}
            <div>
              <label className="block text-white font-medium text-sm mb-2">
                Maps:
              </label>
              <input
                type="url"
                name="mapsLink"
                value={formData.mapsLink}
                onChange={handleInputChange}
                placeholder="Link"
                className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded text-white placeholder-white/60 focus:outline-none focus:border-white/60"
                required
              />
            </div>

            {/* Teams */}
            <div className="space-y-4">
              <div>
                <label className="block text-white font-medium text-sm mb-2">
                  คณะ/สาขา:
                </label>
                <input
                  type="text"
                  name="team1"
                  value={formData.team1}
                  onChange={handleInputChange}
                  placeholder="ตัวย่อ"
                  className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded text-white placeholder-white/60 focus:outline-none focus:border-white/60"
                  required
                />
              </div>

              <div className="text-center text-white font-bold text-xl">
                VS
              </div>

              <div>
                <label className="block text-white font-medium text-sm mb-2">
                  คณะ/สาขา:
                </label>
                <input
                  type="text"
                  name="team2"
                  value={formData.team2}
                  onChange={handleInputChange}
                  placeholder="ตัวย่อ"
                  className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded text-white placeholder-white/60 focus:outline-none focus:border-white/60"
                  required
                />
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-4">
              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-red-800 hover:bg-red-900 disabled:bg-red-800/50 text-white font-bold py-3 px-6 rounded transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-red-300/50"
              >
                {isLoading ? 'กำลังบันทึก...' : 'save'}
              </button>
            </div>
          </form>
        </div>

        {/* Time Table */}
        <div className="bg-red-600/95 backdrop-blur-sm rounded-lg shadow-xl border border-red-500/50 overflow-hidden">
          <div className="bg-red-700/80 px-6 py-4 text-center">
            <h3 className="text-xl font-bold text-white tracking-wide">
              Time Table
            </h3>
          </div>

          <div className="p-6">
            {/* Search Bar */}
            <div className="flex justify-between items-center mb-4">
              <input
                type="text"
                placeholder="Search..."
                className="px-3 py-2 bg-white/10 border border-white/20 rounded text-white placeholder-white/60 focus:outline-none focus:border-white/60"
              />
              <button className="text-white hover:text-red-200 transition-colors">
                Sort: ⌄
              </button>
            </div>

            {/* Table Header */}
            <div className="grid grid-cols-4 gap-4 text-white font-medium mb-4 px-4 py-2 bg-red-700/50 rounded">
              <div>Time</div>
              <div>Matches</div>
              <div>Location</div>
              <div>Edit</div>
            </div>

            {/* Table Content */}
            <div className="space-y-2">
              {matches.length > 0 ? (
                matches.map((match) => (
                  <div key={match.id} className="grid grid-cols-4 gap-4 text-white px-4 py-3 bg-red-700/30 rounded hover:bg-red-700/50 transition-colors">
                    <div className="text-sm">
                      <div>{new Date(match.date).toLocaleDateString('th-TH')}</div>
                      <div>{match.time}</div>
                    </div>
                    <div className="text-sm">
                      <div>{getSportName()}</div>
                      <div>{match.team1} vs {match.team2}</div>
                    </div>
                    <div className="text-sm">
                      <a
                        href={match.mapsLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-red-200 hover:text-white underline"
                      >
                        {match.location}
                      </a>
                    </div>
                    <div>
                      <button
                        onClick={() => handleDelete(match.id)}
                        className="text-red-300 hover:text-red-100 transition-colors text-lg"
                        title="ลบ"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center text-white/60 py-8">
                  ยังไม่มีข้อมูลการแข่งขัน
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
