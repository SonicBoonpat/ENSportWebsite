'use client';
import { useState, useRef } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function Navbar() {
  const { data: session } = useSession();
  const router = useRouter();
  const menuRef = useRef<HTMLDivElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);

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

  const getUserRole = () => {
    if (!session?.user) return null;
    const role = (session.user as any).role;
    const sportType = (session.user as any).sportType;

    if (role === 'ADMIN') return 'Admin';
    if (role === 'SPORT_MANAGER') {
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
        'AQUATIC': 'Aquatic Manager',
      };
      return sportNames[sportType] || `${sportType} Manager`;
    }
    return role || 'User';
  };

  const justifyClass = ['ADMIN', 'SPORT_MANAGER'].includes((session?.user as any)?.role)
    ? 'justify-between'
    : 'justify-center';

  return (
    <nav
      className={`sticky top-2 bg-red-en font-orbitron text-white py-3 flex items-center mx-6 mt-10 mb-4 rounded-[8px] shadow-white shadow-md/20 px-6 z-50 ${justifyClass}`}
    >
      <div className='text-3xl sm:text-4xl md:text-5xl font-bold tracking-wider text-center'>
        <Link href="/" className="inline-block focus:outline-none focus-visible:ring-2 focus-visible:ring-white/50 hover:opacity-90 rounded-sm" aria-label="Go to home">
          EN SPORT
        </Link>
      </div>

      {session?.user && (
        <div className='flex items-center gap-4'>
          <div className="hidden lg:block text-sm font-medium">
            {getUserRole()}
          </div>

          {/* Hamburger / User Icon */}
          <div className='relative' ref={menuRef}>
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className='p-2 hover:bg-white/10 rounded-md transition-colors'
            >
              <span className='sm:hidden inline-flex'>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" className="w-5 h-5 fill-current text-white">
                  <path d="M320 312C386.3 312 440 258.3 440 192C440 125.7 386.3 72 320 72C253.7 72 200 125.7 200 192C200 258.3 253.7 312 320 312zM290.3 368C191.8 368 112 447.8 112 546.3C112 562.7 125.3 576 141.7 576L498.3 576C514.7 576 528 562.7 528 546.3C528 447.8 448.2 368 349.7 368L290.3 368z"/>
                </svg>
              </span>
              <span className='hidden sm:flex flex-col gap-1'>
                <span className='block w-5 h-0.5 bg-white'></span>
                <span className='block w-5 h-0.5 bg-white'></span>
                <span className='block w-5 h-0.5 bg-white'></span>
              </span>
            </button>

            {/* Dropdown */}
            {menuOpen && (
              <div className='absolute right-0 top-full mt-2 w-48 bg-white text-black rounded-lg shadow-lg border py-2 z-[100]'>
                <div className='px-4 py-2 text-xs uppercase tracking-wider text-gray-500 border-b'>
                  {getUserRole() || 'User'}
                </div>
                <button onClick={handleEditSchedule} className='w-full text-left px-4 py-2 hover:bg-gray-100'>Edit Schedule</button>
                <button onClick={handleEditBanner} className='w-full text-left px-4 py-2 hover:bg-gray-100'>Edit Banner</button>
                {(session.user as any).role === 'ADMIN' && (
                  <button onClick={handleLogs} className='w-full text-left px-4 py-2 hover:bg-gray-100'>Logs</button>
                )}
                <hr className='my-1' />
                <button onClick={handleLogout} className='w-full text-left px-4 py-2 hover:bg-red-50 text-red-600'>Log out</button>
              </div>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}