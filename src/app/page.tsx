'use client';

import './globals.css'
import { useEffect, useRef, useState } from 'react'
import { useSession, signOut } from 'next-auth/react'
import { useRouter } from 'next/navigation'

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
}

function App() {
  const { data: session } = useSession();
  const router = useRouter();
  const [sortOpen, setSortOpen] = useState(false);
  const [sortValue, setSortValue] = useState<'th-asc' | 'th-desc' | 'earliest' | 'latest'>('th-asc');
  const [menuOpen, setMenuOpen] = useState(false);
  const [matches, setMatches] = useState<Match[]>([]);
  const [filteredMatches, setFilteredMatches] = useState<Match[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const sortWrapRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

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
    // TODO: Navigate to edit banner page  
    console.log('Edit Banner clicked');
    setMenuOpen(false);
  };

  const handleLogs = () => {
    // TODO: Navigate to logs page
    console.log('Logs clicked');
    setMenuOpen(false);
  };

  const getUserRole = () => {
    if (!session?.user) return null;
    const role = (session.user as any).role;
    if (role === 'ADMIN') return 'Admin';
    if (role === 'SPORT_MANAGER') return 'Sport Manager';
    if (role === 'EDITOR') return 'Editor';
    return role || null;
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
  }, []);

  // Effect สำหรับ search
  useEffect(() => {
    if (!searchTerm) {
      setFilteredMatches(matches);
    } else {
      const filtered = matches.filter(match =>
        match.sport.toLowerCase().includes(searchTerm.toLowerCase()) ||
        match.match.toLowerCase().includes(searchTerm.toLowerCase()) ||
        match.location.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredMatches(filtered);
    }
  }, [searchTerm, matches]);

  // Effect สำหรับ sorting
  useEffect(() => {
    const sorted = [...filteredMatches].sort((a, b) => {
      switch (sortValue) {
        case 'th-asc':
          return a.sport.localeCompare(b.sport, 'th');
        case 'th-desc':
          return b.sport.localeCompare(a.sport, 'th');
        case 'earliest':
          const dateA = new Date(`${a.rawDate} ${a.rawTime}`);
          const dateB = new Date(`${b.rawDate} ${b.rawTime}`);
          return dateA.getTime() - dateB.getTime();
        case 'latest':
          const dateA2 = new Date(`${a.rawDate} ${a.rawTime}`);
          const dateB2 = new Date(`${b.rawDate} ${b.rawTime}`);
          return dateB2.getTime() - dateA2.getTime();
        default:
          return 0;
      }
    });
    setFilteredMatches(sorted);
  }, [sortValue, matches]);

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
    <div className='bg-black min-h-screen'>
      <nav className='sticky top-0 bg-red-en font-orbitron text-white py-3 flex items-center justify-between mx-6 mt-10 mb-4 rounded-[8px] shadow-white shadow-md/20 px-6'>
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
                <div className='absolute right-0 top-full mt-2 w-48 bg-white text-black rounded-lg shadow-lg border py-2 z-50'>
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
            <div className='bg-red-en mb-4 rounded-[8px] w-auto h-[150px] shadow-white shadow-md/20'>
              <img src="./assets/bg.png" alt="banner" />
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
                  <h1>Time</h1>
                  <h1>Matches</h1>
                  <h1>Location</h1>
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
                    filteredMatches.slice(0, 5).map((ev, idx) => (
                    <div
                      key={idx}
                      className='my-3 rounded-[12px] bg-red-en-bg px-4 py-3'
                    >
                      <div className='flex items-center justify-between gap-4 font-rubik'>
                        {/* Time */}
                        <div className='w-1/3 text-left font-light text-sm'>
                          <div className='leading-tight'>
                            <h1>{ev.date}</h1>
                            <h1>{ev.time}</h1>
            </div>
          </div>

                        {/* Matches */}
                        <div className='w-1/3 text-center font-light text-sm'>
                          <div className='leading-tight'>
                            <h1>{ev.sport}</h1>
                            <h1>{ev.match}</h1>
                  </div>
                  </div>

                        {/* Location */}
                        <div className='w-1/3 text-right font-light text-sm'>
                          <div className='leading-tight inline-block max-w-[190px] align-middle'>
                            <a
                              href={ev.url}
                              target='blank'
                              className='block overflow-hidden whitespace-nowrap text-ellipsis underline underline-offset-4'
                            >
                              {ev.location.length > 8 ? ev.location.slice(0, 8) + '...' : ev.location}
                            </a>
                    </div>
                  </div>
                </div>
              </div>
                    ))
                  )}
           </div>
              </div>

              <div></div>
          </div>

             <div className='bg-red-en font-rubik mb-4 rounded-[20px] w-auto shadow-white shadow-md/20 px-6 py-8 sm:px-10 sm:py-12 text-white'>
              <h2 className='text-2xl font-semibold text-center'>Get Sport EN Updates</h2>
              <p className='mt-3 font-extralight text-sm max-w-[40ch] text-center opacity-90'>
              Subscribe to receive match reminders and news by email.
            </p>
            
              <form className='mt-8 max-w-3xl mx-auto'>
                <label htmlFor='subscribeEmail' className='block text-lg sm:text-2xl font-semibold mb-2 text-center'>
                  Email:
                </label>
                <div className='mx-auto flex items-center justify-center'>
                <input
                    id='subscribeEmail'
                    type='email'
                    placeholder='example@email.com'
                     className='w-[90%] max-w-[780px] rounded-full bg-red-en-bg px-6 py-3 text-white placeholder-white/60 outline-none ring-1 ring-white/10 focus:ring-2 focus:ring-white/40'
                />
              </div>
              
              <button
                  type='button'
                  className='mt-8 block mx-auto rounded-full px-8 py-3 text-lg font-normal bg-red-en-bg hover:bg-white/10 ring-1 ring-white/10'
              >
                subscription
              </button>

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
    </div>
  )
}

export default App