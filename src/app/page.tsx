'use client';

import './globals.css'
import { useEffect, useRef, useState } from 'react'
import { useSession, signOut } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import ConfirmModal from '@/components/ConfirmModal'

interface Match {
  id: string;
  date: string;
  time: string;
  sport: string;
  match: string;
  location: string;
  url: string;
  status: string;
  rawDate: string;
  rawTime: string;
  timeEnd?: string;
  homeScore?: number;
  awayScore?: number;
  team1?: string;
  team2?: string;
}

function App() {
  const { data: session } = useSession();
  const router = useRouter();
  const [sortOpen, setSortOpen] = useState(false);
  const [sortValue, setSortValue] = useState<'th-asc' | 'th-desc' | 'earliest' | 'latest'>('earliest');
  const [menuOpen, setMenuOpen] = useState(false);
  const [matches, setMatches] = useState<Match[]>([]);
  const [filteredMatches, setFilteredMatches] = useState<Match[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [banners, setBanners] = useState<Array<{id: string, url: string, filename: string}>>([]);
  const [currentBannerIndex, setCurrentBannerIndex] = useState(0);
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10); // แสดง 10 รายการต่อหน้า
  const sortWrapRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  
  // Subscription form state
  const [subscribeEmail, setSubscribeEmail] = useState('');

  // Confirm Modal state
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    type: 'danger' | 'warning' | 'info' | 'success';
    onConfirm: () => void;
    confirmText?: string;
    isLoading?: boolean;
  }>({
    isOpen: false,
    title: '',
    message: '',
    type: 'info',
    onConfirm: () => {},
    isLoading: false
  });

  // Helper functions for confirm modal
  const openConfirmModal = (
    title: string, 
    message: string, 
    onConfirm: () => void, 
    type: 'danger' | 'warning' | 'info' | 'success' = 'info',
    confirmText?: string
  ) => {
    setConfirmModal({
      isOpen: true,
      title,
      message,
      type,
      onConfirm,
      confirmText,
      isLoading: false
    });
  };

  const closeConfirmModal = () => {
    setConfirmModal(prev => ({ ...prev, isOpen: false }));
  };

  const setConfirmLoading = (loading: boolean) => {
    setConfirmModal(prev => ({ ...prev, isLoading: loading }));
  };

  function chooseSort(val: 'th-asc' | 'th-desc' | 'earliest' | 'latest') {
    setSortValue(val);
    setSortOpen(false);
  }

  const handleLogout = async () => {
    await signOut({ callbackUrl: '/login' });
  };

  const handleEditSchedule = () => {
    router.push('/edit-schedule');
    setMenuOpen(false);
  };

  const handleEditBanner = () => {
    router.push('/edit-banner');
    setMenuOpen(false);
  };

  const handleLogs = () => {
    router.push('/logs');
    setMenuOpen(false);
  };

  // Handle subscription form submit
  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!subscribeEmail || !subscribeEmail.includes('@')) {
      // แสดงข้อผิดพลาดใน Modal
      openConfirmModal(
        'ข้อมูลไม่ถูกต้อง!',
        'กรุณากรอกอีเมลที่ถูกต้อง',
        () => closeConfirmModal(),
        'danger',
        'ตกลง'
      );
      return;
    }

    // เปิด Modal ยืนยันการสมัครสมาชิก
    openConfirmModal(
      'ยืนยันการสมัครรับข่าวสาร',
      `คุณต้องการสมัครรับข่าวสารกีฬาด้วยอีเมล "${subscribeEmail}" ใช่หรือไม่?`,
      async () => {
        setConfirmLoading(true);
        try {
          const response = await fetch('/api/subscribers', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: subscribeEmail }),
          });

          const data = await response.json();

          if (response.ok) {
            setSubscribeEmail(''); // Clear form
            // แสดงข้อความสำเร็จใน Modal
            setConfirmModal(prev => ({
              ...prev,
              title: 'สมัครสำเร็จ!',
              message: 'สมัครรับข่าวสารสำเร็จ! กรุณาตรวจสอบอีเมลของคุณ',
              type: 'success',
              confirmText: 'ตกลง',
              isLoading: false,
              onConfirm: closeConfirmModal
            }));
          } else {
            // แสดงข้อผิดพลาดใน Modal
            setConfirmModal(prev => ({
              ...prev,
              title: 'เกิดข้อผิดพลาด!',
              message: data.error || 'เกิดข้อผิดพลาดในการสมัคร',
              type: 'danger',
              confirmText: 'ตกลง',
              isLoading: false,
              onConfirm: closeConfirmModal
            }));
          }
        } catch (error) {
          // แสดงข้อผิดพลาดใน Modal
          setConfirmModal(prev => ({
            ...prev,
            title: 'เกิดข้อผิดพลาด!',
            message: 'เกิดข้อผิดพลาดในการเชื่อมต่อ กรุณาลองใหม่อีกครั้ง',
            type: 'danger',
            confirmText: 'ตกลง',
            isLoading: false,
            onConfirm: closeConfirmModal
          }));
        }
      },
      'info',
      'สมัครสมาชิก'
    );
  };

  const getUserRole = () => {
    if (!session?.user) return null;
    const role = (session.user as any).role;
    const sportType = (session.user as any).sportType;
    
    if (role === 'ADMIN') return 'Admin';
    if (role === 'SPORT_MANAGER') {
      // แปลงชื่อกีฬาเป็นภาษาอังกฤษพร้อม Manager
      const sportNames: Record<string, string> = {
        'FOOTBALL': 'Football Manager',
        'BASKETBALL': 'Basketball Manager', 
        'VOLLEYBALL': 'Volleyball Manager',
        'BADMINTON': 'Badminton Manager',
        'TABLE_TENNIS': 'Table Tennis Manager',
        'TENNIS': 'Tennis Manager',
        'SWIMMING': 'Swimming Manager',
        'TRACK_FIELD': 'Track & Field Manager',
        'SOCCER': 'Soccer Manager',
        'FUTSAL': 'Futsal Manager',
        'SEPAK_TAKRAW': 'Sepak Takraw Manager',
        'PETANQUE': 'Petanque Manager',
        'ESPORTS': 'E-Sports Manager',
        'CHESS': 'Chess Manager',
        'AQUATIC': 'Aquatic Manager'
      };
      return sportNames[sportType] || `${sportType} Manager`;
    }
    if (role === 'EDITOR') return 'Editor';
    return role || null;
  };

  // ฟังก์ชันตรวจสอบสถานะของการแข่งขัน
  const getMatchStatus = (match: Match) => {
    if (match.status === 'COMPLETED') {
      return 'COMPLETED';
    }
    if (match.status === 'PENDING_RESULT') {
      return 'PENDING_RESULT';
    }
    if (match.status === 'ONGOING') {
      return 'ONGOING';
    }
    
    // ตรวจสอบเวลาปัจจุบันเทียบกับเวลาแข่งขัน
    if (match.timeEnd && match.rawTime) {
      const now = new Date();
      const matchDate = new Date(match.rawDate);
      
      // เวลาเริ่มแข่ง
      const [startHours, startMinutes] = match.rawTime.split(':');
      const startTime = new Date(matchDate);
      startTime.setHours(parseInt(startHours), parseInt(startMinutes), 0, 0);
      
      // เวลาจบแข่ง
      const [endHours, endMinutes] = match.timeEnd.split(':');
      const endTime = new Date(matchDate);
      endTime.setHours(parseInt(endHours), parseInt(endMinutes), 0, 0);
      
      if (now >= startTime && now <= endTime) {
        return 'ONGOING';
      } else if (now > endTime) {
        return 'PENDING_RESULT';
      }
    }
    
    return 'SCHEDULED';
  };

  // โหลดข้อมูล matches จาก API
  const loadMatches = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/matches/all');
      if (response.ok) {
        const data = await response.json();
        setMatches(data.matches || []);
        setFilteredMatches(data.matches || []);
      } else {
        console.error('Failed to load matches');
      }
    } catch (error) {
      console.error('Error loading matches:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Effect สำหรับโหลดข้อมูลเมื่อ component mount
  useEffect(() => {
    loadMatches();
    loadBanners();
  }, []);

  const loadBanners = async () => {
    try {
      const response = await fetch('/api/banner/public');
      if (response.ok) {
        const data = await response.json();
        if (data.banners && data.banners.length > 0) {
          setBanners(data.banners.map((banner: any) => ({
            id: banner.id,
            url: banner.url,
            filename: banner.filename
          })));
        }
      }
    } catch (error) {
      console.error('Error loading banners:', error);
    }
  };

  // Auto-slide banners ทุก 10 วินาที
  useEffect(() => {
    if (banners.length <= 1) return;

    const interval = setInterval(() => {
      setCurrentBannerIndex((prevIndex) => 
        prevIndex === banners.length - 1 ? 0 : prevIndex + 1
      );
    }, 10000); // 10 วินาที

    return () => clearInterval(interval);
  }, [banners.length]);

  // ฟังก์ชันสำหรับกดจุดเปลี่ยน Banner
  const goToBanner = (index: number) => {
    setCurrentBannerIndex(index);
  };

  // Effect สำหรับ search และ sorting
  useEffect(() => {
    const baseData = searchTerm ? 
      matches.filter(match =>
        match.sport.toLowerCase().includes(searchTerm.toLowerCase()) ||
        match.match.toLowerCase().includes(searchTerm.toLowerCase()) ||
        match.location.toLowerCase().includes(searchTerm.toLowerCase())
      ) : matches;

    const sorted = [...baseData].sort((a, b) => {
      switch (sortValue) {
        case 'th-asc':
          return a.sport.localeCompare(b.sport, 'th');
        case 'th-desc':
          return b.sport.localeCompare(a.sport, 'th');
        case 'earliest':
          // เรียงตามวันที่และเวลา เริ่มจากใกล้ที่สุด
          const dateA = new Date(a.rawDate);
          const dateB = new Date(b.rawDate);
          const timeA = a.rawTime ? a.rawTime.split(':').map(Number) : [0, 0];
          const timeB = b.rawTime ? b.rawTime.split(':').map(Number) : [0, 0];
          
          dateA.setHours(timeA[0], timeA[1], 0, 0);
          dateB.setHours(timeB[0], timeB[1], 0, 0);
          
          return dateA.getTime() - dateB.getTime();
        case 'latest':
          // เรียงตามวันที่และเวลา เริ่มจากไกลที่สุด
          const dateA2 = new Date(a.rawDate);
          const dateB2 = new Date(b.rawDate);
          const timeA2 = a.rawTime ? a.rawTime.split(':').map(Number) : [0, 0];
          const timeB2 = b.rawTime ? b.rawTime.split(':').map(Number) : [0, 0];
          
          dateA2.setHours(timeA2[0], timeA2[1], 0, 0);
          dateB2.setHours(timeB2[0], timeB2[1], 0, 0);
          
          return dateB2.getTime() - dateA2.getTime();
        default:
          return 0;
      }
    });
    setFilteredMatches(sorted);
    setCurrentPage(1); // รีเซ็ตไปหน้าแรกเมื่อมีการเรียงลำดับหรือค้นหาใหม่
  }, [sortValue, matches, searchTerm]);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      const target = e.target as Node;
      
      if (sortOpen && sortWrapRef.current && !sortWrapRef.current.contains(target)) {
        setSortOpen(false);
      }
      
      if (menuOpen && menuRef.current && !menuRef.current.contains(target)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [sortOpen, menuOpen]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setSortOpen(false);
        setMenuOpen(false);
      }
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  const events = [
    { date: '25 Dec 2025', time: '18:00 - 19:30', sport: 'Football', match: 'CoE vs DME', location: 'สนาม 50 ปี มหาวิทยาลัยขอนแก่น', url: 'https://www.google.com/maps/place/50th+Anniversary+Stadium+of+Khon+Kaen+University/@16.4765881,102.8155518,942m/data=!3m2!1e3!4b1!4m6!3m5!1s0x31228b23b4aeba4d:0xec1c06ec9cfbe9cb!8m2!3d16.476583!4d102.8181267!16s%2Fg%2F11fdvv7ccd?entry=ttu&g_ep=EgoyMDI1MDkyNC4wIKXMDSoASAFQAw%3D%3D' },
    { date: '26 Dec 2025', time: '09:00 - 10:00', sport: 'Basketball', match: 'EE vs ME', location: 'โรงยิม KKU', url: 'https://maps.google.com' },
    { date: '26 Dec 2025', time: '10:00 - 11:00', sport: 'Volleyball', match: 'CPE vs CE', location: 'สนามกีฬา คณะวิศวะ', url: 'https://maps.google.com' },
    { date: '26 Dec 2025', time: '13:00 - 14:00', sport: 'Badminton', match: 'IE vs CPE', location: 'Sport Complex', url: 'https://maps.google.com' },
    { date: '27 Dec 2025', time: '08:30 - 09:30', sport: 'Table Tennis', match: 'ME vs IE', location: 'ตึกกีฬา 2', url: 'https://maps.google.com' },
    { date: '27 Dec 2025', time: '15:00 - 16:30', sport: 'Football', match: 'DME vs CPE', location: 'สนาม 50 ปี มข.', url: 'https://maps.google.com' },
    { date: '28 Dec 2025', time: '11:00 - 12:00', sport: 'Esports', match: 'CoE vs EE', location: 'E-Sport Arena', url: 'https://maps.google.com' },
    { date: '28 Dec 2025', time: '17:00 - 18:30', sport: 'Futsal', match: 'EE vs DME', location: 'สนามฟุตซอล คณะ', url: 'https://maps.google.com' },
    { date: '29 Dec 2025', time: '14:00 - 15:00', sport: 'Chess', match: 'CPE vs ME', location: 'ห้องกิจกรรม', url: 'https://maps.google.com' },
    { date: '25 Dec 2025', time: '18:00 - 19:30', sport: 'Football', match: 'CoE vs DME', location: 'สนาม 50 ปี มหาวิทยาลัยขอนแก่น', url: 'https://www.google.com/maps/place/50th+Anniversary+Stadium+of+Khon+Kaen+University/@16.4765881,102.8155518,942m/data=!3m2!1e3!4b1!4m6!3m5!1s0x31228b23b4aeba4d:0xec1c06ec9cfbe9cb!8m2!3d16.476583!4d102.8181267!16s%2Fg%2F11fdvv7ccd?entry=ttu&g_ep=EgoyMDI1MDkyNC4wIKXMDSoASAFQAw%3D%3D' },
    { date: '26 Dec 2025', time: '09:00 - 10:00', sport: 'Basketball', match: 'EE vs ME', location: 'โรงยิม KKU', url: 'https://maps.google.com' },
    { date: '26 Dec 2025', time: '10:00 - 11:00', sport: 'Volleyball', match: 'CPE vs CE', location: 'สนามกีฬา คณะวิศวะ', url: 'https://maps.google.com' },
    { date: '26 Dec 2025', time: '13:00 - 14:00', sport: 'Badminton', match: 'IE vs CPE', location: 'Sport Complex', url: 'https://maps.google.com' },
    { date: '27 Dec 2025', time: '08:30 - 09:30', sport: 'Table Tennis', match: 'ME vs IE', location: 'ตึกกีฬา 2', url: 'https://maps.google.com' },
    { date: '27 Dec 2025', time: '15:00 - 16:30', sport: 'Football', match: 'DME vs CPE', location: 'สนาม 50 ปี มข.', url: 'https://maps.google.com' },
    { date: '28 Dec 2025', time: '11:00 - 12:00', sport: 'Esports', match: 'CoE vs EE', location: 'E-Sport Arena', url: 'https://maps.google.com' },
    { date: '28 Dec 2025', time: '17:00 - 18:30', sport: 'Futsal', match: 'EE vs DME', location: 'สนามฟุตซอล คณะ', url: 'https://maps.google.com' },
    { date: '29 Dec 2025', time: '14:00 - 15:00', sport: 'Chess', match: 'CPE vs ME', location: 'ห้องกิจกรรม', url: 'https://maps.google.com' },
  ];

  return (
    <>
      <main className='bg-black min-h-screen'>
        <nav className='sticky top-0 bg-red-en font-orbitron text-white py-3 flex items-center justify-between mx-6 mt-10 mb-4 rounded-[8px] shadow-white shadow-md/20 px-6 z-50'>
        <div className='text-xl font-bold'>
          EN SPORT
      </div>

        {session?.user && (
          <div className='flex items-center gap-4'>
            {/* แสดง Role */}
            <div className='text-sm font-medium'>
              {getUserRole()}
          </div>
            
            {/* Hamburger Menu */}
            <div className='relative' ref={menuRef}>
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className='flex flex-col gap-1 p-2 hover:bg-white/10 rounded-md transition-colors'
                aria-label='Menu'
              >
                <span className='block w-5 h-0.5 bg-white'></span>
                <span className='block w-5 h-0.5 bg-white'></span>
                <span className='block w-5 h-0.5 bg-white'></span>
              </button>
              
              {/* Dropdown Menu */}
              {menuOpen && (
                <div className='absolute right-0 top-full mt-2 w-48 bg-white text-black rounded-lg shadow-lg border py-2 z-[100]'>
                  <button
                    onClick={handleEditSchedule}
                    className='w-full text-left px-4 py-2 hover:bg-gray-100 transition-colors'
                  >
                    Edit Schedule
                  </button>
                  <button
                    onClick={handleEditBanner}
                    className='w-full text-left px-4 py-2 hover:bg-gray-100 transition-colors'
                  >
                    Edit Banner
                  </button>
                  {(session.user as any).role === 'ADMIN' && (
                    <button
                      onClick={handleLogs}
                      className='w-full text-left px-4 py-2 hover:bg-gray-100 transition-colors'
                    >
                      Logs
                    </button>
                  )}
                  <hr className='my-1' />
                  <button
                    onClick={handleLogout}
                    className='w-full text-left px-4 py-2 hover:bg-red-50 text-red-600 transition-colors'
                  >
                    Log out
                  </button>
              </div>
              )}
            </div>
          </div>
        )}
      </nav>
        <section>
          <div className='mx-6 text-center text-white'>
            <div className='bg-red-en mb-4 rounded-[8px] w-auto h-[150px] shadow-white shadow-md/20 overflow-hidden relative'>
              {banners.length > 0 ? (
                <>
                  {/* Banner Slider Container */}
                  <div 
                    className="flex h-full transition-transform duration-700 ease-in-out"
                    style={{
                      transform: `translateX(-${currentBannerIndex * 100}%)`,
                    }}
                  >
                    {banners.map((banner, index) => (
                      <div 
                        key={banner.id}
                        className="w-full h-full flex-shrink-0"
                      >
                        <img 
                          src={banner.url} 
                          alt={banner.filename || "Banner"} 
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ))}
                  </div>
                  
                  {/* Banner Indicators */}
                  {banners.length > 1 && (
                    <div className="absolute bottom-3 left-1/2 transform -translate-x-1/2 flex gap-2">
                      {banners.map((_, index) => (
                        <button
                          key={index}
                          onClick={() => goToBanner(index)}
                          className={`w-2 h-2 rounded-full transition-all duration-300 ${
                            index === currentBannerIndex 
                              ? 'bg-white scale-125' 
                              : 'bg-white/50 hover:bg-white/80'
                          }`}
                          aria-label={`Go to banner ${index + 1}`}
                        />
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-red-en">
                  <span className="text-white/60">No Banner Available</span>
                </div>
              )}
          </div>

            <div className='bg-red-en pb-4 mb-4 rounded-[8px] shadow-white shadow-md/20'>

              <h1 className='justify-center font-rubik font-normal text-white text-md py-3'>
                Time Table
              </h1>

              <div className='font-rubik font-light justify-between px-1.5 pb-1.5'>
                <label htmlFor="Search">Search:</label>
              <input
                  type="search"
                  id="Search"
                  name="Search"
                  autoComplete="off"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className='rounded-[8px] mx-1.5 bg-red-en-bg w-[50%] text-black'
                />

                <div ref={sortWrapRef} className="relative inline-block text-left align-middle ml-2">
                  <button
                    ref={btnRef}
                    type="button"
                    aria-haspopup="menu"
                    aria-expanded={sortOpen}
                    onClick={() => setSortOpen((v) => !v)}
                    className="inline-flex items-center rounded-[8px] py-2 text-white hover:bg-white/10"
                    title="Sort"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
                      <path d="M3 5a1 1 0 0 1 1-1h16a1 1 0 0 1 .78 1.63l-6.28 7.85a1 1 0 0 0-.22.63v3.89a1 1 0 0 1-1.45.9l-3-1.5A1 1 0 0 1 9 16.99v-3.11a1 1 0 0 0-.22-.63L2.22 5.63A1 1 0 0 1 3 5z" />
                    </svg>
                    <span className="hidden sm:inline">Sort</span>
                    <span className="text-xs opacity-75">{
                      sortValue === 'th-asc' ? 'ก-ฮ' :
                        sortValue === 'th-desc' ? 'ฮ-ก' :
                          sortValue === 'earliest' ? 'Earliest' : 'Latest'
                    }</span>
                  </button>

                  {sortOpen && (
                    <div
                      role="menu"
                      aria-label="Sort options"
                      className="absolute right-0 z-20 mt-2 min-w-48 rounded-[8px] bg-white text-black shadow-lg ring-1 ring-black/10 p-1"
                    >
                      <button
                        role="menuitem"
                        onClick={() => chooseSort('th-asc')}
                        className={`w-full text-left rounded-[6px] px-3 py-2 hover:bg-black/5 ${sortValue === 'th-asc' ? 'bg-black/5 font-medium' : ''}`}
                      >ก - ฮ</button>
                      <button
                        role="menuitem"
                        onClick={() => chooseSort('th-desc')}
                        className={`w-full text-left rounded-[6px] px-3 py-2 hover:bg-black/5 ${sortValue === 'th-desc' ? 'bg-black/5 font-medium' : ''}`}
                      >ฮ - ก</button>
                      <div className="my-1 h-px bg-black/10" />
                      <button
                        role="menuitem"
                        onClick={() => chooseSort('earliest')}
                        className={`w-full text-left rounded-[6px] px-3 py-2 hover:bg-black/5 ${sortValue === 'earliest' ? 'bg-black/5 font-medium' : ''}`}
                      >Earliest</button>
                      <button
                        role="menuitem"
                        onClick={() => chooseSort('latest')}
                        className={`w-full text-left rounded-[6px] px-3 py-2 hover:bg-black/5 ${sortValue === 'latest' ? 'bg-black/5 font-medium' : ''}`}
                      >Latest</button>
            </div>
                  )}
            </div>
          </div>

              <div>
                <div className='flex flex-row justify-between font-rubik px-6 pb-2 border-b border-white/40 mx-4 text-center'>
                  <h1 className='w-1/5'>Time/Status</h1>
                  <h1 className='w-1/5'>Matches</h1>
                  <h1 className='w-1/5'>Location</h1>
                </div>

                <div className='mt-2 rounded-[8px] mx-4 '>
                  {isLoading ? (
                    <div className="text-center text-white py-8">
                      <div className="animate-spin inline-block w-8 h-8 border-4 border-white border-t-transparent rounded-full"></div>
                      <p className="mt-2">กำลังโหลดข้อมูล...</p>
                    </div>
                  ) : filteredMatches.length === 0 ? (
                    <div className="text-center text-white py-8">
                      <p>ไม่พบข้อมูลการแข่งขัน</p>
                    </div>
                  ) : (
                    (() => {
                      // คำนวณข้อมูลสำหรับหน้าปัจจุบัน
                      const startIndex = (currentPage - 1) * itemsPerPage;
                      const endIndex = startIndex + itemsPerPage;
                      const currentMatches = filteredMatches.slice(startIndex, endIndex);
                      
                      return currentMatches.map((ev, idx) => {
                      const matchStatus = getMatchStatus(ev);
                      return (
                        <div
                          key={idx}
                          onClick={() => setSelectedMatch(ev)}
                          className='my-3 rounded-[12px] bg-red-en-bg px-4 py-3 cursor-pointer hover:bg-red-en-bg/80 transition-colors'
                        >
                          <div className='flex items-center justify-between gap-2 font-rubik'>
                            {/* Time/Status */}
                            <div className='w-1/5 text-left font-light text-sm'>
                              <div className='leading-tight'>
                                {matchStatus === 'COMPLETED' ? (
                                  <>
                                    <h1 className='text-green-300 font-medium text-xs'>✅ Completed</h1>
                                  </>
                                ) : matchStatus === 'ONGOING' ? (
                                  <>
                                    <h1 className='text-red-400 font-bold text-xs animate-pulse'>🔴 LIVE</h1>
                                  </>
                                ) : matchStatus === 'PENDING_RESULT' ? (
                                  <>
                                    <h1 className='text-yellow-300 font-medium text-xs'>⏰ Waiting</h1>
                                  </>
                                ) : (
                                  <>
                                    <h1>{ev.date}</h1>
                                    <h1>{ev.time}</h1>
                                  </>
                                )}
                              </div>
                            </div>

                            {/* Score Team 1 (Home) */}
                            <div className='w-[10%] text-right font-light text-sm'>
                              {matchStatus === 'COMPLETED' && ev.homeScore !== undefined ? (
                                <h1 className='text-2xl font-bold text-green-300'>{ev.homeScore}</h1>
                              ) : (
                                <h1 className='text-gray-400'>-</h1>
                              )}
                            </div>

                            {/* Matches */}
                            <div className='w-2/5 text-center font-light text-sm'>
                              <div className='leading-tight'>
                                <h1>{ev.sport}</h1>
                                <h1>{ev.match}</h1>
            </div>
          </div>

                            {/* Score Team 2 (Away) */}
                            <div className='w-[10%] text-left font-light text-sm'>
                              {matchStatus === 'COMPLETED' && ev.awayScore !== undefined ? (
                                <h1 className='text-2xl font-bold text-green-300'>{ev.awayScore}</h1>
                              ) : (
                                <h1 className='text-gray-400'>-</h1>
                              )}
                            </div>

                            {/* Location */}
                            <div className='w-1/5 text-right font-light text-sm'>
                              <div className='leading-tight inline-block max-w-[190px] align-middle'>
                                <a
                                  href={ev.url}
                                  target='_blank'
                                  rel='noopener noreferrer'
                                  onClick={(e) => e.stopPropagation()}
                                  className='block overflow-hidden whitespace-nowrap text-ellipsis underline underline-offset-4'                                >
                                  {ev.location.length > 8 ? ev.location.slice(0, 8) + '...' : ev.location}
                                </a>
                  </div>
                  </div>
                    </div>
                  </div>
                      );
                    });
                    })()
                  )}
                </div>
                
                {/* Pagination */}
                {filteredMatches.length > itemsPerPage && (
                  <div className="flex justify-center items-center gap-2 mt-6 px-4">
                    {/* Previous Button */}
                    <button
                      onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                      disabled={currentPage === 1}
                      className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                        currentPage === 1
                          ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                          : 'bg-red-600 text-white hover:bg-red-700'
                      }`}
                    >
                      ← ก่อนหน้า
                    </button>

                    {/* Page Numbers */}
                    {(() => {
                      const totalPages = Math.ceil(filteredMatches.length / itemsPerPage);
                      const pages = [];
                      
                      // แสดงหน้าที่ 1
                      if (totalPages > 0) {
                        pages.push(
                          <button
                            key={1}
                            onClick={() => setCurrentPage(1)}
                            className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                              currentPage === 1
                                ? 'bg-red-600 text-white'
                                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                            }`}
                          >
                            1
                          </button>
                        );
                      }

                      // แสดง ... ถ้าจำเป็น
                      if (currentPage > 3) {
                        pages.push(
                          <span key="dots1" className="px-2 text-gray-400">...</span>
                        );
                      }

                      // แสดงหน้าปัจจุบันและข้างเคียง
                      for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i++) {
                        pages.push(
                          <button
                            key={i}
                            onClick={() => setCurrentPage(i)}
                            className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                              currentPage === i
                                ? 'bg-red-600 text-white'
                                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                            }`}
                          >
                            {i}
                          </button>
                        );
                      }

                      // แสดง ... ถ้าจำเป็น
                      if (currentPage < totalPages - 2) {
                        pages.push(
                          <span key="dots2" className="px-2 text-gray-400">...</span>
                        );
                      }

                      // แสดงหน้าสุดท้าย
                      if (totalPages > 1) {
                        pages.push(
                          <button
                            key={totalPages}
                            onClick={() => setCurrentPage(totalPages)}
                            className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                              currentPage === totalPages
                                ? 'bg-red-600 text-white'
                                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                            }`}
                          >
                            {totalPages}
                          </button>
                        );
                      }

                      return pages;
                    })()}

                    {/* Next Button */}
                    <button
                      onClick={() => setCurrentPage(prev => Math.min(prev + 1, Math.ceil(filteredMatches.length / itemsPerPage)))}
                      disabled={currentPage === Math.ceil(filteredMatches.length / itemsPerPage)}
                      className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                        currentPage === Math.ceil(filteredMatches.length / itemsPerPage)
                          ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                          : 'bg-red-600 text-white hover:bg-red-700'
                      }`}
                    >
                      ถัดไป →
                    </button>
                  </div>
                )}

                {/* Page Info */}
                {filteredMatches.length > 0 && (
                  <div className="text-center text-gray-400 text-sm mt-4 px-4">
                    แสดง {((currentPage - 1) * itemsPerPage) + 1} - {Math.min(currentPage * itemsPerPage, filteredMatches.length)} จาก {filteredMatches.length} รายการ
                  </div>
                )}
              </div>

              <div></div>
          </div>

            <div className='bg-red-en font-rubik mb-4 rounded-[20px] w-auto shadow-white shadow-md/20 px-6 py-8 sm:px-10 sm:py-12 text-white'>
              <h2 className='text-2xl font-semibold text-center'>Get Sport EN Updates</h2>
              <p className='mt-3 font-extralight text-sm max-w-[40ch] text-center opacity-90'>
              Subscribe to receive match reminders and news by email.
            </p>
            
              <form onSubmit={handleSubscribe} className='mt-8 max-w-3xl mx-auto'>
                <label htmlFor='subscribeEmail' className='block text-lg sm:text-2xl font-semibold mb-2 text-center'>
                  Email:
                </label>
                <div className='mx-auto flex items-center justify-center'>
                <input
                    id='subscribeEmail'
                    type='email'
                    placeholder='example@kkumail.com'
                    value={subscribeEmail}
                    onChange={(e) => setSubscribeEmail(e.target.value)}
                    disabled={confirmModal.isLoading}
                  required
                     className='w-[90%] max-w-[780px] rounded-full bg-red-en-bg px-6 py-3 text-white placeholder-white/60 outline-none ring-1 ring-white/10 focus:ring-2 focus:ring-white/40 disabled:opacity-50'
                />
              </div>
              
              <button
                  type='submit'
                  disabled={confirmModal.isLoading}
                  className='mt-8 block mx-auto rounded-full px-8 py-3 text-lg font-normal bg-red-en-bg hover:bg-white/10 ring-1 ring-white/10 transition-all disabled:opacity-50 disabled:cursor-not-allowed'
              >
                {confirmModal.isLoading ? 'กำลังสมัคร...' : 'subscription'}
              </button>

              {/* Message Display - ลบออกแล้วเพราะใช้ Modal แทน */}

                <p className='mt-6 font-extralight max-w-[40ch] text-center text-sm sm:text-base opacity-80 mx-auto'>
                  By subscribing, you agree to receive emails from Sport EN. You can unsubscribe anytime.
                </p>
              </form>
            </div>
            <footer className='bg-black text-white text-center font-rubik py-10 space-y-4'>
              <h2 className='text-lg font-medium'>Contact Us</h2>
              <h3 className='text-md mt-4'>For Administer</h3>
              <p className='text-sm opacity-80'>GE362785 Creative Thinking and Problem Solving</p>
              <p className='text-sm opacity-80'>Copyright © All right reserve 2025 Group 2 Section 4</p>
            </footer>
          </div>
        </section>

        {/* Match Detail Modal */}
        {selectedMatch && (
          <div 
            className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
            onClick={() => setSelectedMatch(null)}
          >
            <div 
              className="bg-gradient-to-br from-slate-800 via-slate-900 to-black rounded-3xl w-full max-w-lg overflow-hidden relative shadow-2xl border border-gray-700/50"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close Button */}
              <button
                onClick={() => setSelectedMatch(null)}
                className="absolute top-4 right-4 text-white/70 hover:text-white text-3xl font-light z-10 transition-colors"
              >
                ×
              </button>

              {/* Header with Date/Time */}
              <div className="bg-gradient-to-r from-red-600/20 to-red-800/20 backdrop-blur-sm px-8 py-6 text-center text-white border-b border-gray-700/30">
                <div className="text-xl font-bold mb-1">{selectedMatch.date}</div>
                <div className="text-sm opacity-70 font-medium">{selectedMatch.time}</div>
              </div>

              {/* Teams and Score Section */}
              <div className="py-10 px-8">
                <div className="flex items-center justify-between gap-6">
                  {/* Team 1 */}
                  <div className="flex-1 text-center">
                    <div className="mb-4">
                      <div className="text-2xl font-bold text-white mb-2">
                        {selectedMatch.team1 || 'Team 1'}
                      </div>
                    </div>
                  </div>

                  {/* Score Section */}
                  <div className="text-center px-4">
                    {getMatchStatus(selectedMatch) === 'COMPLETED' && 
                     selectedMatch.homeScore !== undefined && 
                     selectedMatch.awayScore !== undefined ? (
                      <div className="bg-gradient-to-r from-green-600/20 to-emerald-600/20 rounded-2xl px-6 py-4 border border-green-500/30">
                        <div className="text-white text-4xl font-bold mb-1">
                          {selectedMatch.homeScore} - {selectedMatch.awayScore}
                        </div>
                        <div className="text-green-400 text-xs uppercase tracking-wider font-medium">
                          FINAL SCORE
                        </div>
                      </div>
                    ) : getMatchStatus(selectedMatch) === 'ONGOING' ? (
                      <div className="bg-gradient-to-r from-red-600/20 to-red-800/20 rounded-2xl px-6 py-4 border border-red-500/30">
                        <div className="text-red-400 text-2xl font-light mb-1">
                          LIVE
                        </div>
                        <div className="text-red-400 text-xs uppercase tracking-wider font-medium animate-pulse">
                          กำลังแข่งขัน
                        </div>
                      </div>
                    ) : getMatchStatus(selectedMatch) === 'PENDING_RESULT' ? (
                      <div className="bg-gradient-to-r from-yellow-600/20 to-orange-600/20 rounded-2xl px-6 py-4 border border-yellow-500/30">
                        <div className="text-yellow-400 text-2xl font-light mb-1">
                          VS
                        </div>
                        <div className="text-yellow-400 text-xs uppercase tracking-wider font-medium">
                          AWAITING RESULT
                        </div>
                      </div>
                    ) : (
                      <div className="bg-gradient-to-r from-blue-600/20 to-indigo-600/20 rounded-2xl px-6 py-4 border border-blue-500/30">
                        <div className="text-blue-400 text-2xl font-light mb-1">
                          VS
                        </div>
                        <div className="text-blue-400 text-xs uppercase tracking-wider font-medium">
                          SCHEDULED
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Team 2 */}
                  <div className="flex-1 text-center">
                    <div className="mb-4">
                      <div className="text-2xl font-bold text-white mb-2">
                        {selectedMatch.team2 || 'Team 2'}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Match Details */}
              <div className="px-8 pb-8">
                <div className="bg-gray-800/30 rounded-2xl p-6 space-y-4 border border-gray-700/30">
                  {/* Sport Type */}
                  <div className="flex items-center justify-between">
                    <div className="text-gray-400 text-sm uppercase tracking-wider font-medium">Sport</div>
                    <div className="text-white font-semibold">{selectedMatch.sport}</div>
                  </div>

                  {/* Location */}
                  <div className="flex items-center justify-between">
                    <div className="text-gray-400 text-sm uppercase tracking-wider font-medium">Location</div>
                    <a
                      href={selectedMatch.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-400 font-semibold hover:text-blue-300 transition-colors underline decoration-blue-400/30 hover:decoration-blue-300"
                    >
                      {selectedMatch.location}
                    </a>
          </div>
          
                  {/* Status */}
                  <div className="flex items-center justify-between">
                    <div className="text-gray-400 text-sm uppercase tracking-wider font-medium">Status</div>
                    <div className="font-semibold">
                      {getMatchStatus(selectedMatch) === 'COMPLETED' ? (
                        <span className="text-green-400 flex items-center gap-2">
                          <span className="w-2 h-2 bg-green-400 rounded-full"></span>
                          Completed
                        </span>
                      ) : getMatchStatus(selectedMatch) === 'ONGOING' ? (
                        <span className="text-red-400 flex items-center gap-2">
                          <span className="w-2 h-2 bg-red-400 rounded-full animate-pulse"></span>
                          กำลังแข่งขัน
                        </span>
                      ) : getMatchStatus(selectedMatch) === 'PENDING_RESULT' ? (
                        <span className="text-yellow-400 flex items-center gap-2">
                          <span className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse"></span>
                          Waiting for result
                        </span>
                      ) : (
                        <span className="text-blue-400 flex items-center gap-2">
                          <span className="w-2 h-2 bg-blue-400 rounded-full"></span>
                          Scheduled
                        </span>
                      )}
                    </div>
                  </div>
                </div>
          </div>
      </div>
    </div>
        )}

      {/* Confirm Modal */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={closeConfirmModal}
        onConfirm={confirmModal.onConfirm}
        title={confirmModal.title}
        message={confirmModal.message}
        type={confirmModal.type}
        confirmText={confirmModal.confirmText}
        isLoading={confirmModal.isLoading}
      />
      </main>
    </>
  )
}

export default App