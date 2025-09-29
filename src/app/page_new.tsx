'use client'
import { Inter } from 'next/font/google'
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

const inter = Inter({ subsets: ['latin'] })

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
    setMenuOpen(false);
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
      
      // Sort dropdown
      if (sortWrapRef.current && !sortWrapRef.current.contains(target) && !btnRef.current?.contains(target)) {
        setSortOpen(false);
      }
      
      // Menu dropdown
      if (menuRef.current && !menuRef.current.contains(target)) {
        setMenuOpen(false);
      }
    }

    document.addEventListener('click', onClick);
    return () => document.removeEventListener('click', onClick);
  }, []);

  return (
    <div className="bg-black min-h-screen">
      {/* Navigation */}
      <nav className="bg-transparent px-4 py-4 border-b border-white/10">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="text-white text-2xl font-bold">
            ENSport Alerts
          </div>
          
          <div className="flex items-center gap-4">
            {session?.user ? (
              <>
                <span className="text-white">
                  {getUserRole()}
                </span>
                <div className="relative" ref={menuRef}>
                  <button
                    onClick={() => setMenuOpen(!menuOpen)}
                    className="text-white p-2 hover:bg-white/10 rounded"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                    </svg>
                  </button>
                  
                  {menuOpen && (
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-50">
                      <button
                        onClick={handleEditSchedule}
                        className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      >
                        Edit Schedule
                      </button>
                      <button
                        onClick={handleEditBanner}
                        className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      >
                        Edit Banner
                      </button>
                      {getUserRole() === 'Admin' && (
                        <button
                          onClick={handleLogs}
                          className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        >
                          Logs
                        </button>
                      )}
                      <button
                        onClick={handleLogout}
                        className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      >
                        Log out
                      </button>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <a href="/login" className="text-white hover:underline">
                Login
              </a>
            )}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Banner Section */}
        <section className="mb-12 text-center">
          <div className="bg-gradient-to-r from-red-600 to-red-800 rounded-lg p-8 text-white">
            <h1 className="text-4xl md:text-6xl font-bold mb-4">
              ENSport Alerts
            </h1>
            <p className="text-xl mb-6">
              ระบบแจ้งเตือนการแข่งขันกีฬา คณะวิศวกรรมศาสตร์
            </p>
            <button className="bg-white text-red-600 px-8 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-colors">
              สมัครรับการแจ้งเตือน
            </button>
          </div>
        </section>

        {/* Time Table Section */}
        <section className="bg-red-en-primary rounded-lg p-6">
          <h1 className="text-white text-2xl font-bold text-center mb-6">
            Time Table
          </h1>

          <div className='font-rubik font-light justify-between px-1.5 pb-1.5'>
            <label htmlFor="Search" className="text-white">Search:</label>
            <input
              type="search"
              id="Search"
              name="Search"
              autoComplete="off"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className='rounded-[8px] mx-1.5 bg-red-en-bg w-[50%] text-black px-3 py-1'
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

          <div className="bg-red-en-secondary rounded-lg overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-400">
                  <th className="px-4 py-3 text-left text-white font-medium">Time</th>
                  <th className="px-4 py-3 text-left text-white font-medium border-l border-gray-400">Matches</th>
                  <th className="px-4 py-3 text-left text-white font-medium border-l border-gray-400">Location</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-400">
                {isLoading ? (
                  <tr>
                    <td colSpan={3} className="text-center text-white py-8">
                      <div className="animate-spin inline-block w-8 h-8 border-4 border-white border-t-transparent rounded-full"></div>
                      <p className="mt-2">กำลังโหลดข้อมูล...</p>
                    </td>
                  </tr>
                ) : filteredMatches.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="text-center text-white py-8">
                      <p>ไม่พบข้อมูลการแข่งขัน</p>
                    </td>
                  </tr>
                ) : (
                  filteredMatches.map((event, index) => (
                    <tr key={index} className="hover:bg-white/5 transition-colors">
                      <td className="px-4 py-4 text-white">
                        <div className="text-sm">
                          {event.date}
                        </div>
                        <div className="text-xs opacity-75">
                          {event.time}
                        </div>
                      </td>
                      <td className="px-4 py-4 border-l border-gray-400 text-white">
                        <div className="font-medium text-sm">
                          {event.sport}
                        </div>
                        <div className="text-xs opacity-75">
                          {event.match}
                        </div>
                      </td>
                      <td className="px-4 py-4 border-l border-gray-400">
                        {event.url ? (
                          <a 
                            href={event.url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-white hover:text-gray-300 transition-colors text-sm"
                          >
                            {event.location}
                          </a>
                        ) : (
                          <span className="text-white text-sm">{event.location}</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* Subscription Section */}
        <section className="mt-12 bg-white rounded-lg p-8 text-center">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">
            รับการแจ้งเตือนผ่าน Line
          </h2>
          <p className="text-gray-600 mb-6">
            สมัครรับการแจ้งเตือนเมื่อมีการแข่งขันใหม่หรือมีการเปลี่ยนแปลงตารางการแข่งขัน
          </p>
          <div className="flex max-w-md mx-auto gap-4">
            <input
              type="text"
              placeholder="กรอกหมายเลขโทรศัพท์"
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
            />
            <button className="bg-red-600 text-white px-6 py-2 rounded-lg hover:bg-red-700 transition-colors">
              สมัคร
            </button>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-8 mt-12">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <h3 className="text-xl font-bold mb-4">ENSport Alerts</h3>
          <p className="text-gray-400 mb-4">
            ระบบแจ้งเตือนการแข่งขันกีฬา คณะวิศวกรรมศาสตร์ มหาวิทยาลัยขอนแก่น
          </p>
          <div className="text-sm text-gray-500">
            © 2025 Faculty of Engineering, Khon Kaen University. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  )
}

export default function Page() {
  return <App />;
}
