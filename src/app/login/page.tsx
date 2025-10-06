'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signIn, getSession } from 'next-auth/react';
import '../globals.css';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      
      const result = await signIn('credentials', {
        email: username, // NextAuth ใช้ field 'email' แต่เราส่ง username
        password: password,
        redirect: false, // ไม่ redirect อัตโนมัติ
      });

      if (result?.ok && !result?.error) {
        // บันทึก Login Log
        try {
          const session = await getSession();
          if (session?.user) {
            await fetch('/api/auth/log-login', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                userId: (session.user as any).id,
                userName: session.user.name || username,
                userRole: (session.user as any).role,
              }),
            });
          }
        } catch (logError) {
          console.error('Error logging login:', logError);
          // ไม่ให้ error ของ log ทำให้ login ล้มเหลว
        }

        // ใช้ router.push แทน window.location เพื่อทดสอบ
        router.push('/');
      } else {
        let errorMessage = 'การเข้าสู่ระบบไม่สำเร็จ';
        if (result?.error === 'CredentialsSignin') {
          errorMessage = 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง';
        } else if (result?.error) {
          errorMessage = `เกิดข้อผิดพลาด: ${result.error}`;
        }
        alert(errorMessage);
      }
    } catch (error) {
      console.error('Login error:', error);
      alert('เกิดข้อผิดพลาดในการเข้าสู่ระบบ');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden bg-gradient-to-b from-black via-black to-red-en/10">

      {/* Content */}
      <div className="relative z-10 min-h-screen flex flex-col items-center justify-center px-4">
        {/* Header */}
        <div className="mb-6 lg:mb-12 w-full px-4">
          <div className="bg-red-en font-orbitron text-white py-3 flex items-center justify-center gap-3 rounded-xl shadow-white shadow-md/20 px-4">
            <img 
              src="/logo.png" 
              alt="KKU EN Sport Logo" 
              className="h-8 sm:h-10 md:h-12 w-auto"
            />
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-wider text-white text-center">
              KKU EN SPORT
            </h1>
          </div>
        </div>

        {/* Login Form */}
        <div className="w-full max-w-sm sm:max-w-md px-4">
          <div className="bg-[#770A12]/40 backdrop-blur-sm rounded-2xl shadow-2xl overflow-hidden ring-1 ring-white/10">
            {/* Form Header */}
            <div className="bg-red-en px-6 sm:px-8 py-5 text-center">
              <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-wide">
                LOG IN
              </h2>
              <p className="mt-1 text-white/80 text-sm">Use your administrator account</p>
            </div>

            {/* Form Body */}
            <form onSubmit={handleLogin} className="px-6 sm:px-8 py-6 sm:py-8 space-y-5 sm:space-y-6">
              {/* Username Field */}
              <div>
                <label htmlFor="username" className="block text-white font-semibold text-base sm:text-lg mb-2">
                  Username:
                </label>
                <input
                  type="text"
                  id="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Username"
                  className="w-full px-4 py-3 sm:py-3.5 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-white/50 focus:border-white/40 focus:bg-white/15 transition-all duration-200 text-base sm:text-lg"
                  required
                />
              </div>

              {/* Password Field */}
              <div>
                <label htmlFor="password" className="block text-white font-semibold text-base sm:text-lg mb-2">
                  Password:
                </label>
                <input
                  type="password"
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full px-4 py-3 sm:py-3.5 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-white/50 focus:border-white/40 focus:bg-white/15 transition-all duration-200 text-base sm:text-lg"
                  required
                />
              </div>

              {/* Login Button */}
              <div className="pt-2 sm:pt-4">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-red-800 hover:bg-red-900 disabled:bg-red-800/50 text-white font-bold py-3.5 sm:py-4 px-6 rounded-xl transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-red-300/50 text-base sm:text-lg shadow-lg active:scale-[0.99]"
                >
                  {isLoading ? 'กำลังเข้าสู่ระบบ...' : 'Log In'}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Footer */}
        <footer className='bg-black text-white/60 text-center font-rubik py-8 sm:py-10 space-y-3 sm:space-y-4 flex flex-col items-center justify-center'>
              <button
                onClick={() => router.push('/')}
                className="text-md mt-4 block w-fit mx-auto bg-transparent border-0 p-0 text-inherit hover:underline"
                type="button"
                aria-label="Go to home page"
              >
                Home
              </button>
              <p className='text-sm opacity-80'>GE362785 Creative Thinking and Problem Solving</p>
              <p className='text-sm opacity-80'>Copyright © All right reserve 2025 Group 2 Section 4</p>
            </footer>
      </div>

      {/* Animated particles or sports icons */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-8 h-8 text-white/10 animate-pulse">⚽</div>
        <div className="absolute top-3/4 right-1/4 w-8 h-8 text-white/10 animate-pulse delay-1000">🏀</div>
        <div className="absolute bottom-1/4 left-1/3 w-8 h-8 text-white/10 animate-pulse delay-500">🏐</div>
        <div className="absolute top-1/2 right-1/3 w-8 h-8 text-white/10 animate-pulse delay-700">🎾</div>
      </div>
    </div>
  );
}
