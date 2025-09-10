'use client';

import { useState } from 'react';

export default function Home() {
  const [email, setEmail] = useState('');
  const [sortBy, setSortBy] = useState('date');

  const matches = [
    {
      id: 1,
      date: '25 Dec 2025',
      time: '18:00 - 19:30',
      sport: 'Football',
      teams: 'COE vs DME',
      location: 'สนาม 50 ปี มข.'
    },
    {
      id: 2,
      date: '27 Dec 2025',
      time: '14:00 - 16:00',
      sport: 'Badminton',
      teams: 'EN vs CP',
      location: 'อาคารกีฬาเอนก'
    },
    {
      id: 3,
      date: '2 Feb 2026',
      time: '10:00 - 12:00',
      sport: 'Sepak Takraw',
      teams: 'EN vs MD',
      location: 'สนาม 50 ปี มข.'
    },
    {
      id: 4,
      date: '17 Feb 2026',
      time: '11:00 - 14:00',
      sport: 'Chess Board',
      teams: 'EN vs SC',
      location: 'คิณะวิศวกรรม'
    },
    {
      id: 5,
      date: '20 Feb 2026',
      time: '9:00 - 10:30',
      sport: 'Table Tennis',
      teams: 'ENVI vs ARIS',
      location: 'สนาม 50 ปี มข.'
    }
  ];

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    // Handle subscription logic here
    alert('Subscribed successfully!');
    setEmail('');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black text-white">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute inset-0" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.1'%3E%3Ccircle cx='30' cy='30' r='2'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }} />
      </div>

      <div className="relative z-10 max-w-md mx-auto px-4 py-6 md:max-w-2xl lg:max-w-4xl">
        {/* Header */}
        <header className="text-center mb-8">
          <div className="bg-red-600 rounded-lg px-6 py-4 mb-6 shadow-lg">
            <h1 className="text-2xl md:text-3xl font-bold tracking-wider">EN SPORT</h1>
          </div>
        </header>

        {/* Hero Section - Flaming Basketball */}
        <section className="text-center mb-8">
          <div className="bg-gradient-to-r from-gray-800 to-gray-900 rounded-lg p-6 mb-6 border border-gray-700 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-4 py-2 rounded-lg font-bold text-lg">
                EN
              </div>
              <div className="text-center flex-1">
                <div className="text-orange-400 font-bold text-xl">🏀 BASKETBALL</div>
                <div className="text-gray-400 text-sm mt-1">2024 • 2025</div>
              </div>
              <div className="bg-gradient-to-r from-purple-600 to-purple-700 text-white px-4 py-2 rounded-lg font-bold text-lg">
                CS
              </div>
            </div>
          </div>
        </section>

        {/* Time Table Section */}
        <section className="mb-8">
          <div className="bg-red-600 rounded-lg px-6 py-4 mb-4 shadow-lg">
            <h2 className="text-xl md:text-2xl font-bold text-center">Time Table</h2>
          </div>

          {/* Search and Sort */}
          <div className="flex flex-col md:flex-row gap-3 mb-4">
            <div className="flex-1">
              <input
                type="text"
                placeholder="Search..."
                className="w-full px-4 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500"
              />
            </div>
            <div className="md:w-32">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="w-full px-4 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500"
              >
                <option value="date">Sort: Date</option>
                <option value="sport">Sort: Sport</option>
                <option value="location">Sort: Location</option>
              </select>
            </div>
          </div>

          {/* Table Header */}
          <div className="bg-red-700 rounded-t-lg px-4 py-3">
            <div className="grid grid-cols-3 gap-4 text-center font-semibold">
              <div>Time</div>
              <div>Matches</div>
              <div>Location</div>
            </div>
          </div>

          {/* Table Content */}
          <div className="bg-gray-800 rounded-b-lg divide-y divide-gray-700">
            {matches.map((match, index) => (
              <div key={match.id} className={`px-4 py-4 hover:bg-gray-700 transition-colors ${
                index % 2 === 0 ? 'bg-red-900/30' : 'bg-red-800/20'
              }`}>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
                  <div className="text-center md:text-left">
                    <div className="font-semibold text-white">{match.date}</div>
                    <div className="text-gray-300 text-sm">{match.time}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-gray-300 text-sm">{match.sport}</div>
                    <div className="font-semibold text-white">{match.teams}</div>
                  </div>
                  <div className="text-center md:text-right">
                    <div className="text-blue-400 hover:text-blue-300 cursor-pointer underline text-sm">
                      {match.location}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Newsletter Subscription */}
        <section className="mb-8">
          <div className="bg-red-600 rounded-lg px-6 py-6 shadow-lg">
            <h3 className="text-xl font-bold text-center mb-4">Get Sport EN Updates</h3>
            <p className="text-center text-red-100 mb-6 text-sm">
              Subscribe to receive match reminders and news by email.
            </p>
            
            <form onSubmit={handleSubscribe} className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium mb-2">
                  Email:
                </label>
                <input
                  type="email"
                  id="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="example@email.com"
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/60 focus:outline-none focus:border-white/40 focus:ring-1 focus:ring-white/40"
                  required
                />
              </div>
              
              <button
                type="submit"
                className="w-full bg-red-800 hover:bg-red-900 text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-red-400"
              >
                subscription
              </button>
            </form>
            
            <p className="text-center text-xs text-red-100 mt-4">
              By subscribing, you agree to receive emails from Sport EN.<br />
              You can unsubscribe anytime.
            </p>
          </div>
        </section>

        {/* Footer */}
        <footer className="text-center text-gray-400 text-xs space-y-2">
          <div className="flex justify-center space-x-4 mb-4">
            <a href="#" className="hover:text-white transition-colors">Contact Us</a>
            <span>•</span>
            <a href="#" className="hover:text-white transition-colors">About</a>
          </div>
          
          <div className="space-y-1">
            <div>@ IG</div>
            <div>For contact</div>
            <div>GE362785 Creative Thinking and Problem Solving</div>
            <div>Copyright © All right reserve 2024 Group 2 Section 4</div>
          </div>
        </footer>
      </div>
    </div>
  );
}
