'use client';

import './globals.css'
import { useEffect, useRef, useState } from 'react'
import { useSession, signOut } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import ConfirmModal from '@/components/ConfirmModal'
import Footer from '@/components/Footer'
import Navbar from '@/components/Navbar'

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
  const [autoSlideEnabled, setAutoSlideEnabled] = useState(true);
  const autoSlideRef = useRef<NodeJS.Timeout | null>(null);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
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

  // ฟังก์ชันสำหรับเริ่ม auto-slide ใหม่
  const startAutoSlide = () => {
    if (autoSlideRef.current) {
      clearInterval(autoSlideRef.current);
    }
    
    if (banners.length <= 1 || !autoSlideEnabled) return;

    autoSlideRef.current = setInterval(() => {
      setCurrentBannerIndex((prevIndex) => 
        prevIndex === banners.length - 1 ? 0 : prevIndex + 1
      );
    }, 10000); // 10 วินาที
  };

  // ฟังก์ชันสำหรับหยุด auto-slide ชั่วคราว
  const pauseAutoSlide = () => {
    if (autoSlideRef.current) {
      clearInterval(autoSlideRef.current);
      autoSlideRef.current = null;
    }
    
    // รีเซ็ต auto-slide หลังจาก 15 วินาที (ให้ผู้ใช้มีเวลาดู Banner)
    setTimeout(() => {
      startAutoSlide();
    }, 15000);
  };

  // Auto-slide banners
  useEffect(() => {
    startAutoSlide();
    
    return () => {
      if (autoSlideRef.current) {
        clearInterval(autoSlideRef.current);
      }
    };
  }, [banners.length, autoSlideEnabled]);

  // ฟังก์ชันสำหรับกดจุดเปลี่ยน Banner
  const goToBanner = (index: number) => {
    setCurrentBannerIndex(index);
    pauseAutoSlide(); // รีเซ็ต cooldown เมื่อผู้ใช้เลือกเอง
  };

  // ฟังก์ชันสำหรับเลื่อนไปข้างหน้า
  const nextBanner = () => {
    setCurrentBannerIndex((prev) => 
      prev === banners.length - 1 ? 0 : prev + 1
    );
    pauseAutoSlide(); // รีเซ็ต cooldown เมื่อผู้ใช้กดเอง
  };

  // ฟังก์ชันสำหรับเลื่อนไปข้างหลัง
  const prevBanner = () => {
    setCurrentBannerIndex((prev) => 
      prev === 0 ? banners.length - 1 : prev - 1
    );
    pauseAutoSlide(); // รีเซ็ต cooldown เมื่อผู้ใช้กดเอง
  };

  // Touch/Swipe handlers สำหรับมือถือ
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > 50;
    const isRightSwipe = distance < -50;

    if (isLeftSwipe && banners.length > 1) {
      nextBanner(); // Swipe left = next banner
    }
    if (isRightSwipe && banners.length > 1) {
      prevBanner(); // Swipe right = previous banner
    }
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
        setSelectedMatch(null);
      }
      
      // Banner navigation with arrow keys
      if (banners.length > 1 && !selectedMatch) {
        if (e.key === 'ArrowLeft') {
          e.preventDefault();
          prevBanner(); // จะเรียก pauseAutoSlide() อัตโนมัติ
        } else if (e.key === 'ArrowRight') {
          e.preventDefault();
          nextBanner(); // จะเรียก pauseAutoSlide() อัตโนมัติ
        }
      }
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [banners.length, selectedMatch]);

  return (
    <>
      <main className='bg-black min-h-screen'>
        <Navbar />
        <section>
          <div className='mx-6 text-center text-white'>
            <div 
              className='bg-red-en mb-4 rounded-[8px] w-full aspect-[16/5] shadow-white shadow-md/20 overflow-hidden relative'
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
            >
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

                  {/* Navigation Buttons */}
                  {banners.length > 1 && (
                    <>
                      {/* Previous Button */}
                      <button
                        onClick={prevBanner}
                        className="absolute left-2 top-1/2 transform -translate-y-1/2 bg-black/15 hover:bg-black/30 text-white/60 hover:text-white/90 p-1.5 rounded-full transition-all duration-300 backdrop-blur-sm z-10 sm:left-4 sm:p-2"
                        aria-label="Previous banner"
                      >
                        <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
                        </svg>
                      </button>

                      {/* Next Button */}
                      <button
                        onClick={nextBanner}
                        className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-black/15 hover:bg-black/30 text-white/60 hover:text-white/90 p-1.5 rounded-full transition-all duration-300 backdrop-blur-sm z-10 sm:right-4 sm:p-2"
                        aria-label="Next banner"
                      >
                        <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                        </svg>
                      </button>
                    </>
                  )}

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

              <h1 className='justify-center font-rubik font-medium text-white text-2xl py-3'>
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
                {/* Mobile Header */}
                <div className='grid grid-cols-3 gap-2 font-rubik px-4 pb-2 border-b border-white/40 mx-4 text-center md:hidden'>
                  <h1 className='text-sm'>Time/Status</h1>
                  <h1 className='text-sm'>Matches</h1>
                  <h1 className='text-sm'>Location</h1>
                </div>
                {/* Desktop Header */}
                <div className='hidden md:grid grid-cols-6 font-rubik px-6 pb-2 border-b border-white/40 mx-4 text-center'>
                  <h1>Time</h1>
                  <h1>Status</h1>
                  <h1>Score A</h1>
                  <h1>Matches</h1>
                  <h1>Score B</h1>
                  <h1>Location</h1>
                </div>

                <div className='mt-2 rounded-[8px] mx-4'>
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
                      // จัดลำดับตามสถานะก่อน แล้วค่อย tie-break ตามตัวเลือก sort เดิม
                      const statusOrder: Record<string, number> = {
                        ONGOING: 0,
                        PENDING_RESULT: 1,
                        COMPLETED: 2,
                        SCHEDULED: 3,
                      };

                      const toDateTime = (m: Match) => {
                        const d = new Date(m.rawDate);
                        const [hh, mm] = m.rawTime ? m.rawTime.split(':').map(Number) : [0, 0];
                        d.setHours(hh, mm, 0, 0);
                        return d.getTime();
                      };

                      const prioritized = [...filteredMatches].sort((a, b) => {
                        const sa = getMatchStatus(a);
                        const sb = getMatchStatus(b);
                        if (statusOrder[sa] !== statusOrder[sb]) return statusOrder[sa] - statusOrder[sb];

                        // tie-break ด้วย sortValue ที่มีอยู่เดิม
                        switch (sortValue) {
                          case 'th-asc':
                            return a.sport.localeCompare(b.sport, 'th');
                          case 'th-desc':
                            return b.sport.localeCompare(a.sport, 'th');
                          case 'earliest': {
                            return toDateTime(a) - toDateTime(b);
                          }
                          case 'latest': {
                            return toDateTime(b) - toDateTime(a);
                          }
                          default:
                            return 0;
                        }
                      });

                      // คำนวณสำหรับหน้าปัจจุบัน (หลังจัดลำดับใหม่)
                      const startIndex = (currentPage - 1) * itemsPerPage;
                      const endIndex = startIndex + itemsPerPage;
                      const currentMatches = prioritized.slice(startIndex, endIndex);

                      return currentMatches.map((ev, idx) => {
                        const matchStatus = getMatchStatus(ev);
                        const statusText =
                          matchStatus === 'COMPLETED'
                            ? 'แข่งเสร็จแล้ว'
                            : matchStatus === 'ONGOING'
                            ? 'กำลังแข่ง'
                            : matchStatus === 'PENDING_RESULT'
                            ? 'รอผลการแข่งขัน'
                            : 'กำลังจะถึง';

                        return (
                          <div
                            key={idx}
                            onClick={() => setSelectedMatch(ev)}
                            className='my-3 rounded-[12px] bg-red-en-bg px-4 py-3 cursor-pointer hover:bg-red-en-bg/80 transition-colors'
                          >
                            {/* Mobile row (3 คอลัมน์): Time/Status | Matches | Location (no score) */}
                            <div className='md:hidden font-rubik text-center'>
                              <div className='grid grid-cols-3 items-center gap-2'>
                                {/* Time/Status */}
                                <div className='text-xs font-light'>
                                  {matchStatus === 'SCHEDULED' ? (
                                    <>
                                      <div>{ev.date}</div>
                                      <div className='opacity-80'>{ev.time}</div>
                                    </>
                                  ) : (
                                    <div
                                      className={
                                        matchStatus === 'ONGOING'
                                          ? 'text-red-400 font-medium animate-pulse'
                                          : matchStatus === 'PENDING_RESULT'
                                          ? 'text-yellow-300 font-medium'
                                          : 'text-green-300 font-medium'
                                      }
                                    >
                                      {statusText}
                                    </div>
                                  )}
          </div>

                                {/* Matches */}
                                <div className='text-xs font-light'>
                                  <div>{ev.sport}</div>
                                  <div className='opacity-90 truncate'>{ev.match}</div>
            </div>

                                {/* Location */}
                                <div className='text-xs font-light'>
                                  <a
                                    href={ev.url}
                                    target='_blank'
                                    rel='noopener noreferrer'
                                    onClick={(e) => e.stopPropagation()}
                                    className='underline underline-offset-4 block truncate'
                                  >
                                    {ev.location}
                                  </a>
                                </div>
            </div>
          </div>

                            {/* Desktop grid row (6 คอลัมน์): Time | Status | ScoreA | Matches | ScoreB | Location */}
                            <div className='hidden md:grid grid-cols-6 items-center gap-4 font-rubik text-center'>
                              {/* Time */}
                              <div className='text-sm'>
                                <div>{ev.date}</div>
                                <div className='opacity-80 text-xs'>{ev.time}</div>
                              </div>

                              {/* Status */}
                              <div className='text-sm'>
                                {matchStatus === 'COMPLETED' ? (
                                  <span className='text-green-300'>แข่งเสร็จแล้ว</span>
                                ) : matchStatus === 'ONGOING' ? (
                                  <span className='text-red-400 animate-pulse'>กำลังแข่ง</span>
                                ) : matchStatus === 'PENDING_RESULT' ? (
                                  <span className='text-yellow-300'>รอผลการแข่งขัน</span>
                                ) : (
                                  <span className='text-blue-300'>กำลังจะถึง</span>
                                )}
            </div>

                              {/* Score A */}
                              <div className='text-sm'>
                                {matchStatus === 'COMPLETED' && ev.homeScore !== undefined ? (
                                  <span className='text-2xl font-bold text-green-300'>{ev.homeScore}</span>
                                ) : (
                                  <span className='text-gray-400'>-</span>
                                )}
          </div>

                              {/* Matches */}
                              <div className='text-sm'>
                                <div>{ev.sport}</div>
                                <div className='opacity-90'>{ev.match}</div>
                  </div>

                              {/* Score B */}
                              <div className='text-sm'>
                                {matchStatus === 'COMPLETED' && ev.awayScore !== undefined ? (
                                  <span className='text-2xl font-bold text-green-300'>{ev.awayScore}</span>
                                ) : (
                                  <span className='text-gray-400'>-</span>
                                )}
                  </div>

                              {/* Location */}
                              <div className='text-sm'>
                                <a
                                  href={ev.url}
                                  target='_blank'
                                  rel='noopener noreferrer'
                                  onClick={(e) => e.stopPropagation()}
                                  className='underline underline-offset-4'
                                >
                                  {ev.location.length > 18 ? ev.location.slice(0, 18) + '...' : ev.location}
                                </a>
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

            <div className='bg-red-en font-rubik mb-4 rounded-[20px] text-center w-auto shadow-white shadow-md/20 px-6 py-8 sm:px-10 sm:py-12 text-white'>
              <h2 className='text-2xl font-semibold'>Get Sport EN Updates</h2>
              <p className='mt-3 font-extralight text-sm opacity-90'>
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
            
                <p className='mt-6 font-extralight text-center text-sm sm:text-base opacity-90 mx-auto'>
                  By subscribing, you agree to receive emails from Sport EN. You can unsubscribe anytime.
            </p>
              </form>
            </div>
            <Footer />
          </div>
        </section>

        {/* Match Detail Modal */}
        {selectedMatch && (
          <div 
            className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
            onClick={() => setSelectedMatch(null)}
          >
            <div 
              className="bg-gradient-to-b from-black to-red-en/10 rounded-3xl w-full max-w-lg overflow-hidden relative shadow-2xl ring-1 ring-white/10"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close Button */}
              <button
                onClick={() => setSelectedMatch(null)}
                className="absolute top-4 right-4 text-white/70 hover:text-white text-3xl font-light z-10 transition-colors"
                aria-label="Close"
              >
                ×
              </button>

              {/* Header with Date/Time */}
              <div className="bg-gradient-to-r from-red-en to-red-en-bg backdrop-blur-sm px-8 py-6 text-center text-white border-b border-white/10">
                <div className="text-xl font-bold mb-1">{selectedMatch.date}</div>
                <div className="text-sm/relaxed text-white/80 font-medium">{selectedMatch.time}</div>
              </div>

              {/* Teams and Score Section */}
              <div className="py-8 px-6 sm:px-8">
                <div className="flex items-center justify-between gap-6">
                  {/* Team 1 */}
                  <div className="flex-1 text-center">
                    <div className="mb-4">
                      <div className="text-2xl font-bold text-white mb-2">
                        {selectedMatch.team1 || 'Team 1'}
                      </div>
                    </div>
                  </div>

                  {/* Score / Status Card */}
                  <div className="text-center px-3 sm:px-4">
                    {getMatchStatus(selectedMatch) === 'COMPLETED' && 
                     selectedMatch.homeScore !== undefined && 
                     selectedMatch.awayScore !== undefined ? (
                      <div className="bg-white/5 rounded-2xl px-6 py-4 ring-1 ring-white/15">
                        <div className="text-white text-4xl font-bold mb-1">
                          {selectedMatch.homeScore} - {selectedMatch.awayScore}
                        </div>
                        <div className="text-white/70 text-xs uppercase tracking-wider font-medium">
                          FINAL SCORE
                        </div>
                      </div>
                    ) : getMatchStatus(selectedMatch) === 'ONGOING' ? (
                      <div className="bg-gradient-to-r from-red-700/20 to-red-900/20 rounded-2xl px-6 py-4 ring-1 ring-red-500/30">
                        <div className="text-red-400 text-2xl font-light mb-1">
                          LIVE
                        </div>
                        <div className="text-red-400 text-xs uppercase tracking-wider font-medium animate-pulse">
                          กำลังแข่งขัน
                        </div>
                      </div>
                    ) : getMatchStatus(selectedMatch) === 'PENDING_RESULT' ? (
                      <div className="bg-gradient-to-r from-amber-600/20 to-orange-700/20 rounded-2xl px-6 py-4 ring-1 ring-amber-400/30">
                        <div className="text-amber-300 text-2xl font-light mb-1">
                          VS
                        </div>
                        <div className="text-amber-300 text-xs uppercase tracking-wider font-medium">
                          AWAITING RESULT
                        </div>
                      </div>
                    ) : (
                      <div className="bg-white/5 rounded-2xl px-6 py-4 ring-1 ring-white/15">
                        <div className="text-white/80 text-2xl font-light mb-1">
                          VS
                        </div>
                        <div className="text-white/70 text-xs uppercase tracking-wider font-medium">
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
              <div className="px-6 sm:px-8 pb-8">
                <div className="bg-black/40 rounded-2xl p-6 space-y-4 ring-1 ring-white/10">
                  {/* Sport Type */}
                  <div className="flex items-center justify-between">
                    <div className="text-white/60 text-sm uppercase tracking-wider font-medium">Sport</div>
                    <div className="text-white font-semibold">{selectedMatch.sport}</div>
                  </div>

                  {/* Location */}
                  <div className="flex items-center justify-between">
                    <div className="text-white/60 text-sm uppercase tracking-wider font-medium">Location</div>
                    <a
                      href={selectedMatch.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-red-300 font-semibold hover:text-red-200 transition-colors underline decoration-red-300/30 hover:decoration-red-200"
                    >
                      {selectedMatch.location}
                    </a>
          </div>
          
                  {/* Status */}
                  <div className="flex items-center justify-between">
                    <div className="text-white/60 text-sm uppercase tracking-wider font-medium">Status</div>
                    <div className="font-semibold">
                      {getMatchStatus(selectedMatch) === 'COMPLETED' ? (
                        <span className="text-white/85 flex items-center gap-2">
                          <span className="w-2 h-2 bg-white/90 rounded-full"></span>
                          Completed
                        </span>
                      ) : getMatchStatus(selectedMatch) === 'ONGOING' ? (
                        <span className="text-red-400 flex items-center gap-2">
                          <span className="w-2 h-2 bg-red-400 rounded-full animate-pulse"></span>
                          กำลังแข่งขัน
                        </span>
                      ) : getMatchStatus(selectedMatch) === 'PENDING_RESULT' ? (
                        <span className="text-amber-300 flex items-center gap-2">
                          <span className="w-2 h-2 bg-amber-300 rounded-full animate-pulse"></span>
                          Waiting for result
                        </span>
                      ) : (
                        <span className="text-white/70 flex items-center gap-2">
                          <span className="w-2 h-2 bg-white/60 rounded-full"></span>
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