'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signIn, getSession } from 'next-auth/react';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      console.log('Attempting login with:', username);
      
      const result = await signIn('credentials', {
        email: username, // NextAuth ใช้ field 'email' แต่เราส่ง username
        password: password,
        redirect: false, // ไม่ redirect อัตโนมัติ
      });

      console.log('SignIn result:', result);

      if (result?.ok && !result?.error) {
        console.log('Login successful!');
        // ใช้ router.push แทน window.location เพื่อทดสอบ
        router.push('/');
      } else {
        console.error('Login failed:', result?.error);
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
    <div className="min-h-screen relative overflow-hidden">
      {/* Background Image */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundColor: '#1e293b', // fallback color แทน placeholder
          filter: 'brightness(0.4)'
        }}
      >
        {/* Fallback gradient background if image doesn't load */}
        <div className="absolute inset-0 bg-gradient-to-br from-slate-800 via-slate-700 to-slate-900"></div>
      </div>

      {/* Overlay with sports elements */}
      <div className="absolute inset-0 bg-black/30"></div>

      {/* Content */}
      <div className="relative z-10 min-h-screen flex flex-col items-center justify-center px-4">
        {/* Header */}
        <div className="mb-8">
          <div className="bg-red-600 rounded-lg px-12 py-6 shadow-2xl border border-red-500">
            <h1 className="text-4xl md:text-5xl font-bold tracking-wider text-white text-center">
              EN SPORT
            </h1>
          </div>
        </div>

        {/* Login Form */}
        <div className="w-full max-w-md">
          <div className="bg-red-600/95 backdrop-blur-sm rounded-2xl shadow-2xl border border-red-500/50 overflow-hidden">
            {/* Form Header */}
            <div className="bg-red-700/80 px-8 py-6 text-center">
              <h2 className="text-3xl font-bold text-white tracking-wide">
                LOG IN
              </h2>
            </div>

            {/* Form Body */}
            <form onSubmit={handleLogin} className="px-8 py-8 space-y-6">
              {/* Username Field */}
              <div>
                <label htmlFor="username" className="block text-white font-semibold text-lg mb-3">
                  Username:
                </label>
                <input
                  type="text"
                  id="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="username"
                  className="w-full px-4 py-4 bg-white/10 border-2 border-white/20 rounded-lg text-white placeholder-white/60 focus:outline-none focus:border-white/60 focus:bg-white/20 transition-all duration-200 text-lg"
                  required
                />
              </div>

              {/* Password Field */}
              <div>
                <label htmlFor="password" className="block text-white font-semibold text-lg mb-3">
                  Password:
                </label>
                <input
                  type="password"
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-4 py-4 bg-white/10 border-2 border-white/20 rounded-lg text-white placeholder-white/60 focus:outline-none focus:border-white/60 focus:bg-white/20 transition-all duration-200 text-lg"
                  required
                />
              </div>

              {/* Login Button */}
              <div className="pt-4">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-red-800 hover:bg-red-900 disabled:bg-red-800/50 text-white font-bold py-4 px-6 rounded-lg transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-red-300/50 text-lg shadow-lg"
                >
                  {isLoading ? 'กำลังเข้าสู่ระบบ...' : 'Log In'}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Footer */}
        <footer className="mt-12 text-center text-white/80 text-sm space-y-2">
          <div className="flex justify-center space-x-4 mb-4">
            <a href="#" className="hover:text-white transition-colors">Contact Us</a>
            <span>•</span>
            <a href="/" className="hover:text-white transition-colors">Home</a>
          </div>
          
          <div className="space-y-1">
            <div>@ IG</div>
            <div>For Administrator</div>
            <div>GE362785 Creative Thinking and Problem Solving</div>
            <div>Copyright © All right reserve 2025 Group 2 Section 4</div>
          </div>
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
