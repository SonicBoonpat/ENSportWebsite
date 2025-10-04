'use client';

import { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import ConfirmModal from '@/components/ConfirmModal';

interface Match {
  id: string;
  date: string;
  time: string;
  timeStart?: string;
  timeEnd?: string;
  location: string;
  mapsLink: string;
  team1: string;
  team2: string;
  sportType: string;
  status: 'SCHEDULED' | 'ONGOING' | 'PENDING_RESULT' | 'COMPLETED';
  homeScore?: number;
  awayScore?: number;
  winner?: string;
  createdAt: string;
  updatedAt: string;
}

export default function EditSchedulePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [matches, setMatches] = useState<Match[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);
  const [sortValue, setSortValue] = useState<'earliest' | 'latest'>('earliest');
  const sortRef = useRef<HTMLDivElement>(null);
  
  // Result form states
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [resultForm, setResultForm] = useState({
    homeScore: '',
    awayScore: '',
    winner: ''
  });
  
  // Confirm Modal states
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
  
  const [formData, setFormData] = useState({
    date: '',
    timeStart: '',
    timeEnd: '',
    location: '',
    mapsLink: '',
    team1: '',
    team2: ''
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

  // ฟังก์ชันดึงเวลาจาก server
  const getServerTime = async () => {
    try {
      const response = await fetch('/api/server-time');
      if (response.ok) {
        const data = await response.json();
        return {
          currentDate: data.currentDate,
          currentTime: data.currentTime,
          timestamp: data.timestamp
        };
      }
    } catch (error) {
      console.error('Error getting server time:', error);
    }
    
    // Fallback to client time if server time fails
    const now = new Date();
    const currentTime = now.getHours().toString().padStart(2, '0') + ':' + now.getMinutes().toString().padStart(2, '0');
    const currentDate = now.getFullYear() + '-' + 
                       (now.getMonth() + 1).toString().padStart(2, '0') + '-' + 
                       now.getDate().toString().padStart(2, '0');
    
    return {
      currentDate,
      currentTime,
      timestamp: now.getTime()
    };
  };

  // ฟังก์ชันตรวจสอบและอัพเดทสถานะอัตโนมัติ
  const checkAndUpdateMatchStatus = async () => {
    const timeData = await getServerTime();
    const { currentDate, currentTime } = timeData;

    let hasUpdates = false;

    for (const match of matches) {
      if (match.timeStart && match.timeEnd) {
        const matchDate = new Date(match.date).toISOString().split('T')[0];
        
        // ตรวจสอบสถานะปัจจุบัน
        const isToday = matchDate === currentDate;
        const isDatePassed = matchDate < currentDate;
        
        if (isToday) {
          // ถ้าเป็นวันเดียวกัน ตรวจสอบเวลา
          const isBeforeStart = currentTime < match.timeStart;
          const isDuringMatch = currentTime >= match.timeStart && currentTime <= match.timeEnd;
          const isAfterEnd = currentTime > match.timeEnd;
          
          let newStatus: 'SCHEDULED' | 'ONGOING' | 'PENDING_RESULT' | 'COMPLETED' | null = null;
          
          if (match.status === 'SCHEDULED' && isDuringMatch) {
            newStatus = 'ONGOING';
          } else if (match.status === 'ONGOING' && isAfterEnd) {
            newStatus = 'PENDING_RESULT';
          } else if (match.status === 'SCHEDULED' && isAfterEnd) {
            // กรณีที่ข้ามสถานะ ONGOING (เช่น server ไม่ได้ check ตอนกำลังแข่ง)
            newStatus = 'PENDING_RESULT';
          }
          
          if (newStatus && newStatus !== match.status) {
            try {
              const success = await updateMatchStatus(match.id, newStatus, false);
              if (success) {
                hasUpdates = true;
              }
            } catch (error) {
              console.error('Error auto-updating match:', error);
            }
          }
        } else if (isDatePassed && match.status === 'SCHEDULED') {
          // ถ้าเป็นวันที่ผ่านมาแล้ว และยังเป็น SCHEDULED
          try {
            const success = await updateMatchStatus(match.id, 'PENDING_RESULT', false);
            if (success) {
              hasUpdates = true;
            }
          } catch (error) {
            console.error('Error auto-updating match:', error);
          }
        }
      }
    }

    if (hasUpdates) {
      // โหลดข้อมูลใหม่หลังจากอัพเดท
      setTimeout(() => {
        loadMatches();
      }, 1000);
    }
  };

  // ตรวจสอบสถานะทุกครั้งที่โหลดข้อมูล
  useEffect(() => {
    if (matches.length > 0) {
      checkAndUpdateMatchStatus();
    }
  }, [matches]);

  // ตรวจสอบสถานะทุก 30 วินาที (Real-time monitoring)
  useEffect(() => {
    const interval = setInterval(() => {
      if (matches.length > 0) {
        checkAndUpdateMatchStatus();
      }
    }, 30 * 1000); // 30 วินาที

    return () => clearInterval(interval);
  }, [matches]);

  // Close sort dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (sortRef.current && !sortRef.current.contains(event.target as Node)) {
        setSortOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const getSportName = () => {
    const sportType = (session?.user as any)?.sportType;
    return sportType || 'Unknown Sport';
  };

  // ฟังก์ชัน sort matches
  const sortMatches = (matchesToSort: Match[], sortType: 'earliest' | 'latest') => {
    return [...matchesToSort].sort((a: Match, b: Match) => {
      const dateA = new Date(a.date);
      const dateB = new Date(b.date);
      
      // First sort by date
      if (dateA.getTime() !== dateB.getTime()) {
        return sortType === 'earliest' 
          ? dateA.getTime() - dateB.getTime()  // earliest: เก่า → ใหม่
          : dateB.getTime() - dateA.getTime(); // latest: ใหม่ → เก่า
      }
      
      // If same date, sort by time
      const timeA = a.timeStart || a.time || '00:00';
      const timeB = b.timeStart || b.time || '00:00';
      
      // Create comparable time values
      const [hoursA, minutesA] = timeA.split(':').map(Number);
      const [hoursB, minutesB] = timeB.split(':').map(Number);
      
      const timeValueA = hoursA * 60 + minutesA;
      const timeValueB = hoursB * 60 + minutesB;
      
      return sortType === 'earliest'
        ? timeValueA - timeValueB  // earliest: เวลาน้อย → มาก (ใกล้จะแข่งขึ้นก่อน)
        : timeValueB - timeValueA; // latest: เวลามาก → น้อย (ไกลที่สุดขึ้นก่อน)
    });
  };

  const chooseSort = (val: 'earliest' | 'latest') => {
    setSortValue(val);
    setSortOpen(false);
    
    // Apply sort to current matches
    const sortedMatches = sortMatches(matches, val);
    setMatches(sortedMatches);
  };

  const loadMatches = async () => {
    try {
      const userRole = (session?.user as any)?.role;
      const sportType = (session?.user as any)?.sportType;
      
      // Admin ดูข้อมูลทุกกีฬา, Sport Manager ดูเฉพาะกีฬาของตัวเอง
      const apiUrl = userRole === 'ADMIN' ? '/api/matches' : `/api/matches?sport=${sportType}`;
      console.log('Loading matches for:', userRole === 'ADMIN' ? 'all sports' : sportType);
      
      const response = await fetch(apiUrl);
      console.log('API Response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('Matches data:', data);
        
        // Sort matches using the current sort value
        const sortedMatches = sortMatches(data.matches || [], sortValue);
        setMatches(sortedMatches);
      } else {
        console.error('Failed to load matches:', response.statusText);
        // แสดงข้อผิดพลาดใน Modal
        openConfirmModal(
          'เกิดข้อผิดพลาด!',
          'ไม่สามารถโหลดข้อมูลได้',
          () => closeConfirmModal(),
          'danger',
          'ตกลง'
        );
      }
    } catch (error) {
      console.error('Error loading matches:', error);
      // แสดงข้อผิดพลาดใน Modal
      openConfirmModal(
        'เกิดข้อผิดพลาด!',
        'เกิดข้อผิดพลาดในการโหลดข้อมูล',
        () => closeConfirmModal(),
        'danger',
        'ตกลง'
      );
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    
    // Format time inputs
    if (name === 'timeStart' || name === 'timeEnd') {
      let formattedValue = value;
      
      // Remove any non-digit and non-colon characters
      formattedValue = formattedValue.replace(/[^\d:]/g, '');
      
      // Auto-add colon after 2 digits
      if (formattedValue.length === 2 && !formattedValue.includes(':')) {
        formattedValue += ':';
      }
      
      // Limit to HH:MM format
      if (formattedValue.length > 5) {
        formattedValue = formattedValue.slice(0, 5);
      }
      
      // Validate hours (00-23)
      const parts = formattedValue.split(':');
      if (parts[0] && parseInt(parts[0]) > 23) {
        parts[0] = '23';
        formattedValue = parts.join(':');
      }
      
      // Validate minutes (00-59)
      if (parts[1] && parseInt(parts[1]) > 59) {
        parts[1] = '59';
        formattedValue = parts.join(':');
      }
      
      setFormData(prev => ({
        ...prev,
        [name]: formattedValue
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // เปิด Modal ยืนยันการบันทึก
    openConfirmModal(
      'ยืนยันการบันทึกข้อมูล',
      `คุณต้องการบันทึกการแข่งขัน "${formData.team1} vs ${formData.team2}" ในวันที่ ${formData.date} เวลา ${formData.timeStart} - ${formData.timeEnd} ใช่หรือไม่?`,
      async () => {
        setConfirmLoading(true);
        try {
          const sportType = (session?.user as any)?.sportType;
          
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

          const data = await response.json();

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
            // แสดงข้อความสำเร็จใน Modal
            setConfirmModal(prev => ({
              ...prev,
              title: 'บันทึกสำเร็จ!',
              message: 'บันทึกข้อมูลเรียบร้อยแล้ว',
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
              message: data.error || 'เกิดข้อผิดพลาดในการบันทึกข้อมูล',
              type: 'danger',
              confirmText: 'ตกลง',
              isLoading: false,
              onConfirm: closeConfirmModal
            }));
          }
        } catch (error) {
          console.error('Error saving match:', error);
          // แสดงข้อผิดพลาดใน Modal
          setConfirmModal(prev => ({
            ...prev,
            title: 'เกิดข้อผิดพลาด!',
            message: 'เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์',
            type: 'danger',
            confirmText: 'ตกลง',
            isLoading: false,
            onConfirm: closeConfirmModal
          }));
        }
      },
      'success',
      'บันทึกข้อมูล'
    );
  };

  const handleDelete = async (matchId: string, matchInfo: string) => {
    // เปิด Modal ยืนยันการลบ
    openConfirmModal(
      'ยืนยันการลบข้อมูล',
      `คุณต้องการลบการแข่งขัน "${matchInfo}" ใช่หรือไม่? การดำเนินการนี้ไม่สามารถยกเลิกได้`,
      async () => {
        setConfirmLoading(true);
        try {
          const response = await fetch(`/api/matches/${matchId}`, {
            method: 'DELETE',
          });

          if (response.ok) {
            await loadMatches();
            // แสดงข้อความสำเร็จใน Modal
            setConfirmModal(prev => ({
              ...prev,
              title: 'ลบสำเร็จ!',
              message: 'ลบข้อมูลเรียบร้อยแล้ว',
              type: 'success',
              confirmText: 'ตกลง',
              isLoading: false,
              onConfirm: closeConfirmModal
            }));
          } else {
            const data = await response.json();
            // แสดงข้อผิดพลาดใน Modal
            setConfirmModal(prev => ({
              ...prev,
              title: 'เกิดข้อผิดพลาด!',
              message: data.error || 'เกิดข้อผิดพลาดในการลบข้อมูล',
              type: 'danger',
              confirmText: 'ตกลง',
              isLoading: false,
              onConfirm: closeConfirmModal
            }));
          }
        } catch (error) {
          console.error('Error deleting match:', error);
          // แสดงข้อผิดพลาดใน Modal
          setConfirmModal(prev => ({
            ...prev,
            title: 'เกิดข้อผิดพลาด!',
            message: 'เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์',
            type: 'danger',
            confirmText: 'ตกลง',
            isLoading: false,
            onConfirm: closeConfirmModal
          }));
        }
      },
      'danger',
      'ลบข้อมูล'
    );
  };

  // ฟังก์ชันเปิด Modal ใส่ผลการแข่งขัน
  const openResultModal = (match: Match) => {
    setSelectedMatch(match);
    setResultForm({
      homeScore: match.homeScore?.toString() || '',
      awayScore: match.awayScore?.toString() || '',
      winner: match.winner || ''
    });
  };

  // ฟังก์ชันปิด Modal
  const closeResultModal = () => {
    setSelectedMatch(null);
    setResultForm({
      homeScore: '',
      awayScore: '',
      winner: ''
    });
  };

  // ฟังก์ชันบันทึกผลการแข่งขัน
  const handleResultSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMatch) return;

    const winnerText = resultForm.winner === 'team1' ? selectedMatch.team1 : 
                      resultForm.winner === 'team2' ? selectedMatch.team2 : 'เสมอ';

    // เปิด Modal ยืนยันการบันทึกผล
    openConfirmModal(
      'ยืนยันการบันทึกผลการแข่งขัน',
      `คุณต้องการบันทึกผลการแข่งขัน "${selectedMatch.team1} vs ${selectedMatch.team2}" \n\nคะแนน: ${resultForm.homeScore} - ${resultForm.awayScore}\nผู้ชนะ: ${winnerText}\n\nใช่หรือไม่?`,
      async () => {
        setConfirmLoading(true);
        try {
          const response = await fetch(`/api/matches/${selectedMatch.id}/result`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(resultForm),
          });

          const data = await response.json();

          if (response.ok) {
            closeResultModal();
            loadMatches(); // โหลดข้อมูลใหม่
            // แสดงข้อความสำเร็จใน Modal
            setConfirmModal(prev => ({
              ...prev,
              title: 'บันทึกผลสำเร็จ!',
              message: 'บันทึกผลการแข่งขันสำเร็จ!',
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
              message: data.error || 'เกิดข้อผิดพลาดในการบันทึกผล',
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
            message: 'เกิดข้อผิดพลาดในการเชื่อมต่อ',
            type: 'danger',
            confirmText: 'ตกลง',
            isLoading: false,
            onConfirm: closeConfirmModal
          }));
        }
      },
      'success',
      'บันทึกผล'
    );
  };

  // ฟังก์ชันอัพเดทสถานะการแข่งขัน
  const updateMatchStatus = async (matchId: string, newStatus: 'SCHEDULED' | 'ONGOING' | 'PENDING_RESULT' | 'COMPLETED', showMessage: boolean = true) => {
    try {
      const response = await fetch(`/api/matches/${matchId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (response.ok) {
        if (showMessage) {
          // แสดงข้อความสำเร็จใน Modal
          openConfirmModal(
            'อัพเดทสำเร็จ!',
            'อัพเดทสถานะสำเร็จ!',
            () => closeConfirmModal(),
            'success',
            'ตกลง'
          );
        }
        console.log(`✅ Updated match ${matchId} status to ${newStatus}`);
        return true;
      } else {
        const data = await response.json();
        if (showMessage) {
          // แสดงข้อผิดพลาดใน Modal
          openConfirmModal(
            'เกิดข้อผิดพลาด!',
            data.error || 'เกิดข้อผิดพลาดในการอัพเดทสถานะ',
            () => closeConfirmModal(),
            'danger',
            'ตกลง'
          );
        }
        console.error('Error updating match status:', data.error);
        return false;
      }
    } catch (error) {
      if (showMessage) {
        // แสดงข้อผิดพลาดใน Modal
        openConfirmModal(
          'เกิดข้อผิดพลาด!',
          'เกิดข้อผิดพลาดในการเชื่อมต่อ',
          () => closeConfirmModal(),
          'danger',
          'ตกลง'
        );
      }
    }
  };

  // ฟังก์ชันส่งอีเมลแจ้งเตือนล่วงหน้า 24 ชั่วโมง
  const send24HourReminder = async (matchId: string) => {
    try {
      const response = await fetch('/api/notifications/24hour-reminder', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ matchId }),
      });

      const data = await response.json();

      if (response.ok) {
        openConfirmModal(
          'ส่งอีเมลสำเร็จ!',
          `ส่งอีเมลแจ้งเตือนล่วงหน้า 24 ชั่วโมงสำเร็จ\nส่งไปยัง ${data.sentTo} คน`,
          () => closeConfirmModal(),
          'success',
          'ตกลง'
        );
      } else {
        openConfirmModal(
          'เกิดข้อผิดพลาด!',
          data.error || 'เกิดข้อผิดพลาดในการส่งอีเมล',
          () => closeConfirmModal(),
          'danger',
          'ตกลง'
        );
      }
    } catch (error) {
      console.error('Error sending 24-hour reminder:', error);
      openConfirmModal(
        'เกิดข้อผิดพลาด!',
        'เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์',
        () => closeConfirmModal(),
        'danger',
        'ตกลง'
      );
    }
  };

  // ฟังก์ชันส่งอีเมลแจ้งผลการแข่งขัน
  const sendMatchResultEmail = async (matchId: string) => {
    try {
      const response = await fetch('/api/notifications/match-result', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ matchId }),
      });

      const data = await response.json();

      if (response.ok) {
        openConfirmModal(
          'ส่งอีเมลสำเร็จ!',
          `ส่งอีเมลแจ้งผลการแข่งขันสำเร็จ\nส่งไปยัง ${data.sentTo} คน\n\nผลการแข่งขัน: ${data.matchResult?.teams}\nคะแนน: ${data.matchResult?.score}`,
          () => closeConfirmModal(),
          'success',
          'ตกลง'
        );
      } else {
        openConfirmModal(
          'เกิดข้อผิดพลาด!',
          data.error || 'เกิดข้อผิดพลาดในการส่งอีเมล',
          () => closeConfirmModal(),
          'danger',
          'ตกลง'
        );
      }
    } catch (error) {
      console.error('Error sending match result email:', error);
      openConfirmModal(
        'เกิดข้อผิดพลาด!',
        'เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์',
        () => closeConfirmModal(),
        'danger',
        'ตกลง'
      );
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
        {/* Schedule Form - แสดงเฉพาะ Sport Manager */}
        {(session.user as any).role === 'SPORT_MANAGER' && (
          <div className="bg-red-600/95 backdrop-blur-sm rounded-lg shadow-xl border border-red-500/50 overflow-hidden">
            <div className="bg-red-700/80 px-6 py-4 text-center">
              <h2 className="text-2xl font-bold text-white tracking-wide">
                {getSportName()} Schedule
              </h2>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {/* Message Display - ลบออกแล้วเพราะใช้ Modal แทน */}
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
                  type="text"
                  name="timeStart"
                  value={formData.timeStart}
                  onChange={handleInputChange}
                  pattern="^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$"
                  title="กรุณาใส่เวลาในรูปแบบ HH:MM (เช่น 14:30 หรือ 22:30)"
                  placeholder="22:30"
                  maxLength={5}
                  className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded text-white placeholder-white/60 focus:outline-none focus:border-white/60"
                  required
                />
                <div className="text-xs text-white/60 mt-1">รูปแบบ: HH:MM (00:00 - 23:59)</div>
              </div>
              <div>
                <label className="block text-white font-medium text-sm mb-2">
                  เวลาจบ:
                </label>
                <input
                  type="text"
                  name="timeEnd"
                  value={formData.timeEnd}
                  onChange={handleInputChange}
                  pattern="^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$"
                  title="กรุณาใส่เวลาในรูปแบบ HH:MM (เช่น 16:00 หรือ 23:45)"
                  placeholder="23:45"
                  maxLength={5}
                  className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded text-white placeholder-white/60 focus:outline-none focus:border-white/60"
                  required
                />
                <div className="text-xs text-white/60 mt-1">รูปแบบ: HH:MM (00:00 - 23:59)</div>
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
                disabled={confirmModal.isLoading}
                className="w-full bg-red-800 hover:bg-red-900 disabled:bg-red-800/50 text-white font-bold py-3 px-6 rounded transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-red-300/50"
              >
                {confirmModal.isLoading ? 'กำลังบันทึก...' : 'save'}
              </button>
            </div>
          </form>
        </div>
        )}

        {/* Time Table */}
        <div className="bg-red-600/95 backdrop-blur-sm rounded-lg shadow-xl border border-red-500/50 overflow-hidden">
          <div className="bg-red-700/80 px-6 py-4 text-center">
            <h3 className="text-xl font-bold text-white tracking-wide">
              {(session.user as any).role === 'ADMIN' ? 'All Sports Schedule Management' : `${getSportName()} Time Table`}
            </h3>
          </div>

          <div className="p-6">
            {/* Search Bar */}
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center gap-4">
                <input
                  type="text"
                  placeholder="Search..."
                  className="px-3 py-2 bg-white/10 border border-white/20 rounded text-white placeholder-white/60 focus:outline-none focus:border-white/60"
                />
                <div className="text-sm text-white/60">
                  🔄 ระบบจะอัพเดตสถานะอัตโนมัติทุก 30 วินาที
                </div>
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={loadMatches}
                  className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded transition-colors flex items-center gap-2"
                  title="รีเฟรชข้อมูล"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Refresh
                </button>
                
                {/* Sort Dropdown */}
                <div className="relative" ref={sortRef}>
                  <button 
                    onClick={() => setSortOpen(!sortOpen)}
                    className="text-white hover:text-red-200 transition-colors flex items-center gap-1"
                  >
                    Sort: {sortValue === 'earliest' ? 'Earliest' : 'Latest'} ⌄
                  </button>
                  
                  {sortOpen && (
                    <div className="absolute right-0 top-full mt-2 bg-red-800 border border-red-600 rounded-lg shadow-lg z-10 min-w-[120px]">
                      <button
                        onClick={() => chooseSort('earliest')}
                        className={`w-full text-left px-4 py-2 text-white hover:bg-red-700 first:rounded-t-lg ${
                          sortValue === 'earliest' ? 'bg-red-700' : ''
                        }`}
                      >
                        Earliest
                      </button>
                      <button
                        onClick={() => chooseSort('latest')}
                        className={`w-full text-left px-4 py-2 text-white hover:bg-red-700 last:rounded-b-lg ${
                          sortValue === 'latest' ? 'bg-red-700' : ''
                        }`}
                      >
                        Latest
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Table Header */}
            <div className={`grid ${(session.user as any).role === 'ADMIN' ? 'grid-cols-6' : 'grid-cols-5'} gap-4 text-white font-medium mb-4 px-4 py-2 bg-red-700/50 rounded`}>
              <div>Time</div>
              <div>Matches</div>
              {(session.user as any).role === 'ADMIN' && <div>Sport</div>}
              <div>Location</div>
              <div>Status/Result</div>
              <div>Actions</div>
            </div>

            {/* Table Content */}
            <div className="space-y-2">
              {matches.length > 0 ? (
                matches.map((match) => (
                  <div key={match.id} className={`grid ${(session.user as any).role === 'ADMIN' ? 'grid-cols-6' : 'grid-cols-5'} gap-4 text-white px-4 py-3 bg-red-700/30 rounded hover:bg-red-700/50 transition-colors`}>
                    <div className="text-sm">
                      <div>{new Date(match.date).toLocaleDateString('th-TH')}</div>
                      <div className="text-xs opacity-80">
                        {match.timeStart || match.time} - {match.timeEnd || ''}
                      </div>
                    </div>
                    <div className="text-sm">
                      <div>{match.team1} vs {match.team2}</div>
                    </div>
                    {(session.user as any).role === 'ADMIN' && (
                      <div className="text-sm">
                        <div className="px-2 py-1 bg-blue-600/30 rounded text-xs">
                          {match.sportType}
                        </div>
                      </div>
                    )}
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
                    <div className="text-sm">
                      {match.status === 'COMPLETED' ? (
                        match.homeScore !== undefined && match.awayScore !== undefined ? (
                          <div>
                            <div className="font-bold text-green-300">
                              {match.homeScore} - {match.awayScore}
                            </div>
                            <div className="text-xs opacity-80">
                              Winner: {match.winner === 'team1' ? match.team1 : 
                                      match.winner === 'team2' ? match.team2 : 'Draw'}
                            </div>
                          </div>
                        ) : (
                          <span className="text-yellow-300">รอผลการแข่งขัน</span>
                        )
                      ) : match.status === 'PENDING_RESULT' ? (
                        <div className="flex items-center gap-1">
                          <span className="animate-pulse text-yellow-300">⏰</span>
                          <span className="text-yellow-300">รอผลการแข่งขัน</span>
                        </div>
                      ) : match.status === 'ONGOING' ? (
                        <div className="flex items-center gap-1">
                          <span className="animate-pulse text-red-400">🔴</span>
                          <span className="text-red-400 font-bold">กำลังแข่งขัน</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1">
                          <span className="text-green-300">📅</span>
                          <span className="text-green-300">กำหนดการแข่งขัน</span>
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2">
                      {/* ปุ่มส่งอีเมลแจ้งเตือนล่วงหน้า 24 ชั่วโมง - แสดงเฉพาะการแข่งขันที่กำหนดไว้ */}
                      {match.status === 'SCHEDULED' && (
                        <button
                          onClick={() => send24HourReminder(match.id)}
                          className="px-2 py-1 bg-orange-600 hover:bg-orange-700 text-white text-xs rounded transition-colors"
                          title="ส่งอีเมลแจ้งเตือนล่วงหน้า 24 ชั่วโมง"
                        >
                          📧 เตือน 24h
                        </button>
                      )}

                      {/* ปุ่มใส่ผลการแข่งขัน - แสดงเฉพาะเมื่อรอผลการแข่งขัน */}
                      {match.status === 'PENDING_RESULT' && (
                        <button
                          onClick={() => openResultModal(match)}
                          className="px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded transition-colors"
                          title="ใส่ผลการแข่งขัน"
                        >
                          ใส่ผล
                        </button>
                      )}
                      
                      {/* ปุ่มแก้ไขผลการแข่งขัน - แสดงเฉพาะเมื่อเสร็จสิ้นแล้ว */}
                      {match.status === 'COMPLETED' && (
                        <>
                          <button
                            onClick={() => openResultModal(match)}
                            className="px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded transition-colors"
                            title="แก้ไขผลการแข่งขัน"
                          >
                            แก้ไขผล
                          </button>
                          
                          {/* ปุ่มส่งอีเมลแจ้งผลการแข่งขัน */}
                          <button
                            onClick={() => sendMatchResultEmail(match.id)}
                            className="px-2 py-1 bg-green-600 hover:bg-green-700 text-white text-xs rounded transition-colors"
                            title="ส่งอีเมลแจ้งผลการแข่งขัน"
                          >
                            📧 ผลแข่ง
                          </button>
                        </>
                      )}
                      
                      {/* ปุ่มลบ */}
                      <button
                        onClick={() => handleDelete(match.id, `${match.team1} vs ${match.team2}`)}
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

      {/* Result Modal */}
      {selectedMatch && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-gradient-to-b from-red-800 to-red-900 rounded-lg w-full max-w-md">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold text-white">
                  {selectedMatch.status === 'COMPLETED' ? 'แก้ไขผลการแข่งขัน' : 'ใส่ผลการแข่งขัน'}
                </h3>
                <button
                  onClick={closeResultModal}
                  className="text-white hover:text-red-200 text-2xl"
                >
                  ×
                </button>
              </div>

              <div className="mb-4 text-white text-center">
                <div className="text-lg font-semibold">
                  {selectedMatch.team1} vs {selectedMatch.team2}
                </div>
                <div className="text-sm opacity-80">
                  {new Date(selectedMatch.date).toLocaleDateString('th-TH')} | {selectedMatch.timeStart || selectedMatch.time}
                </div>
              </div>

              <form onSubmit={handleResultSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-white font-medium text-sm mb-2">
                      คะแนน {selectedMatch.team1}:
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={resultForm.homeScore}
                      onChange={(e) => setResultForm({...resultForm, homeScore: e.target.value})}
                      className="w-full px-3 py-2 bg-gray-800 border border-white/20 rounded text-white focus:outline-none focus:border-white/60 focus:bg-gray-700"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-white font-medium text-sm mb-2">
                      คะแนน {selectedMatch.team2}:
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={resultForm.awayScore}
                      onChange={(e) => setResultForm({...resultForm, awayScore: e.target.value})}
                      className="w-full px-3 py-2 bg-gray-800 border border-white/20 rounded text-white focus:outline-none focus:border-white/60 focus:bg-gray-700"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-white font-medium text-sm mb-2">
                    ผลการแข่งขัน:
                  </label>
                  <select
                    value={resultForm.winner}
                    onChange={(e) => setResultForm({...resultForm, winner: e.target.value})}
                    className="w-full px-3 py-2 bg-gray-800 border border-white/20 rounded text-white focus:outline-none focus:border-white/60 focus:bg-gray-700"
                    required
                  >
                    <option value="" className="bg-gray-800 text-white">เลือกผลการแข่งขัน</option>
                    <option value="team1" className="bg-gray-800 text-white">{selectedMatch.team1} ชนะ</option>
                    <option value="team2" className="bg-gray-800 text-white">{selectedMatch.team2} ชนะ</option>
                    <option value="draw" className="bg-gray-800 text-white">เสมอ</option>
                  </select>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={closeResultModal}
                    className="flex-1 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded transition-colors"
                  >
                    ยกเลิก
                  </button>
                  <button
                    type="submit"
                    disabled={confirmModal.isLoading}
                    className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/50 text-white rounded transition-colors"
                  >
                    {confirmModal.isLoading ? 'กำลังบันทึก...' : 'บันทึก'}
                  </button>
                </div>
              </form>
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
    </div>
  );
}
