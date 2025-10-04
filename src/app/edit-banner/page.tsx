'use client';

import { useEffect, useState, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import ConfirmModal from '@/components/ConfirmModal';
import '../globals.css';

interface BannerHistory {
  id: string;
  filename: string;
  url: string;
  uploadedAt: string;
  uploadedBy?: string; // เพิ่มฟิลด์นี้
}

export default function EditBannerPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [history, setHistory] = useState<BannerHistory[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [showCropper, setShowCropper] = useState(false);
  const [cropData, setCropData] = useState<any>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [resizeHandle, setResizeHandle] = useState<string>('');
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

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

  // ตรวจสอบสิทธิ์
  useEffect(() => {
    if (status === 'loading') return;
    
    if (!session?.user) {
      router.push('/login');
      return;
    }

    const userRole = (session.user as any).role;
    if (!['ADMIN', 'EDITOR', 'SPORT_MANAGER'].includes(userRole)) {
      router.push('/');
      return;
    }
  }, [session, status, router]);

  // โหลด Banner History
  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    try {
      setIsLoadingHistory(true);
      const response = await fetch('/api/banner/history');
      if (response.ok) {
        const data = await response.json();
        setHistory(data.history || []);
      }
    } catch (error) {
      console.error('Error loading history:', error);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // ตรวจสอบประเภทไฟล์
    if (!file.type.startsWith('image/')) {
      // แสดงข้อผิดพลาดใน Modal
      openConfirmModal(
        'ไฟล์ไม่ถูกต้อง!',
        'กรุณาเลือกไฟล์รูปภาพเท่านั้น',
        () => closeConfirmModal(),
        'danger',
        'ตกลง'
      );
      return;
    }

    // ตรวจสอบขนาดไฟล์ (สูงสุด 10MB)
    if (file.size > 10 * 1024 * 1024) {
      // แสดงข้อผิดพลาดใน Modal
      openConfirmModal(
        'ไฟล์ใหญ่เกินไป!',
        'ไฟล์มีขนาดใหญ่เกินไป (สูงสุด 10MB)',
        () => closeConfirmModal(),
        'danger',
        'ตกลง'
      );
      return;
    }

    setSelectedFile(file);
    
    // สร้าง preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreviewUrl(e.target?.result as string);
      setShowCropper(true);
    };
    reader.readAsDataURL(file);
  };

  const handleCrop = () => {
    if (!imageRef.current || !canvasRef.current || !cropData) return;

    const canvas = canvasRef.current;
    const image = imageRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // ตั้งค่า canvas เป็นอัตราส่วน 16:5 ความละเอียดสูง
    const targetWidth = 1600; // ความกว้างสูง
    const targetHeight = 500;  // 16:5 ratio
    
    canvas.width = targetWidth;
    canvas.height = targetHeight;

    // คำนวณพื้นที่ crop
    const scaleX = image.naturalWidth / image.width;
    const scaleY = image.naturalHeight / image.height;

    // วาดรูปที่ crop แล้วลงบน canvas ด้วยคุณภาพสูง
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    
    ctx.drawImage(
      image,
      cropData.x * scaleX,
      cropData.y * scaleY,
      cropData.width * scaleX,
      cropData.height * scaleY,
      0,
      0,
      targetWidth,
      targetHeight
    );

    // แปลง canvas เป็น blob ด้วยคุณภาพสูง
    canvas.toBlob(
      (blob) => {
        if (blob) {
          const croppedFile = new File([blob], selectedFile?.name || 'banner.jpg', {
            type: 'image/jpeg',
          });
          uploadBanner(croppedFile);
        }
      },
      'image/jpeg',
      0.95 // คุณภาพ 95%
    );
  };

  const uploadBanner = async (file: File) => {
    // เปิด Modal ยืนยันการอัพโหลด
    openConfirmModal(
      'ยืนยันการอัพโหลด Banner',
      `คุณต้องการอัพโหลด Banner "${file.name}" ใช่หรือไม่?`,
      async () => {
        setConfirmLoading(true);
        try {
          const formData = new FormData();
          formData.append('image', file);

          const response = await fetch('/api/banner/upload', {
            method: 'POST',
            body: formData,
          });

          const data = await response.json();

          if (response.ok) {
            // แสดงข้อความสำเร็จใน Modal
            setConfirmModal(prev => ({
              ...prev,
              title: 'อัพโหลดสำเร็จ!',
              message: 'Banner ได้ถูกอัพโหลดเรียบร้อยแล้ว',
              type: 'success',
              confirmText: 'ตกลง',
              isLoading: false,
              onConfirm: () => {
                closeConfirmModal();
                setShowCropper(false);
                setSelectedFile(null);
                setPreviewUrl(null);
                setCropData(null);
                if (fileInputRef.current) fileInputRef.current.value = '';
                loadHistory();
              }
            }));
          } else {
            setConfirmModal(prev => ({
              ...prev,
              title: 'เกิดข้อผิดพลาด!',
              message: data.error || 'เกิดข้อผิดพลาดในการอัปโหลด',
              type: 'danger',
              confirmText: 'ตกลง',
              isLoading: false,
              onConfirm: closeConfirmModal
            }));
          }
        } catch (error) {
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
      'อัพโหลด'
    );
  };

  // ฟังก์ชันตรวจสอบสิทธิ์การลบ
  const canDeleteBanner = (bannerUploadedBy?: string) => {
    const userRole = (session?.user as any)?.role;
    const userId = (session?.user as any)?.id;
    
    if (userRole === 'ADMIN') {
      return true; // Admin ลบได้ทุก Banner
    }
    
    if (userRole === 'SPORT_MANAGER' && bannerUploadedBy === userId) {
      return true; // Sport Manager ลบได้เฉพาะ Banner ที่ตัวเองอัปโหลด
    }
    
    return false;
  };

  const handleDelete = async (id: string, filename: string) => {
    // เปิด Modal ยืนยันการลบ
    openConfirmModal(
      'ยืนยันการลบ Banner',
      `คุณต้องการลบ Banner "${filename}" ใช่หรือไม่? การดำเนินการนี้ไม่สามารถยกเลิกได้`,
      async () => {
        setConfirmLoading(true);
        try {
          const response = await fetch(`/api/banner/${id}`, {
            method: 'DELETE',
          });

          if (response.ok) {
            // แสดงข้อความสำเร็จใน Modal
            setConfirmModal(prev => ({
              ...prev,
              title: 'ลบสำเร็จ!',
              message: 'Banner ได้ถูกลบเรียบร้อยแล้ว',
              type: 'success',
              confirmText: 'ตกลง',
              isLoading: false,
              onConfirm: () => {
                closeConfirmModal();
                loadHistory();
              }
            }));
          } else {
            const data = await response.json();
            setConfirmModal(prev => ({
              ...prev,
              title: 'เกิดข้อผิดพลาด!',
              message: data.error || 'เกิดข้อผิดพลาดในการลบ',
              type: 'danger',
              confirmText: 'ตกลง',
              isLoading: false,
              onConfirm: closeConfirmModal
            }));
          }
        } catch (error) {
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
      'danger',
      'ลบ Banner'
    );
  };

  // Image crop handler
  const handleImageLoad = () => {
    if (!imageRef.current) return;
    
    const img = imageRef.current;
    const aspectRatio = 16 / 5;
    
    // คำนวณขนาด crop box เริ่มต้น (80% ของความกว้าง)
    let cropWidth = img.width * 0.8;
    let cropHeight = cropWidth / aspectRatio;
    
    // ถ้าสูงเกินไป ให้ปรับตามความสูง
    if (cropHeight > img.height * 0.8) {
      cropHeight = img.height * 0.8;
      cropWidth = cropHeight * aspectRatio;
    }
    
    setCropData({
      x: (img.width - cropWidth) / 2,
      y: (img.height - cropHeight) / 2,
      width: cropWidth,
      height: cropHeight,
    });
  };

  // Mouse event handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!cropData) return;
    e.preventDefault();
    setIsDragging(true);
    
    const rect = imageRef.current?.getBoundingClientRect();
    if (rect) {
      setDragStart({
        x: e.clientX - rect.left - cropData.x,
        y: e.clientY - rect.top - cropData.y,
      });
    }
  };

  const handleResizeMouseDown = (e: React.MouseEvent, handle: string) => {
    e.preventDefault();
    e.stopPropagation();
    setIsResizing(true);
    setResizeHandle(handle);
    
    const rect = imageRef.current?.getBoundingClientRect();
    if (rect) {
      setDragStart({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!imageRef.current || !cropData) return;
    
    const rect = imageRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    if (isResizing) {
      const aspectRatio = 16 / 5;
      let newCropData = { ...cropData };
      
      // คำนวณขนาดใหม่ตาม handle ที่ลาก
      switch (resizeHandle) {
        case 'se': // มุมขวาล่าง
          const newWidth = Math.max(50, mouseX - cropData.x);
          const newHeight = newWidth / aspectRatio;
          
          // จำกัดขอบเขต
          const maxWidth = imageRef.current.width - cropData.x;
          const maxHeight = imageRef.current.height - cropData.y;
          
          if (newWidth <= maxWidth && newHeight <= maxHeight) {
            newCropData.width = newWidth;
            newCropData.height = newHeight;
          }
          break;
          
        case 'nw': // มุมซ้ายบน
          const deltaX = dragStart.x - mouseX;
          const deltaY = dragStart.y - mouseY;
          const newW = cropData.width + deltaX;
          const newH = newW / aspectRatio;
          
          if (newW >= 50 && cropData.x - deltaX >= 0 && cropData.y - (deltaY * newH / newW) >= 0) {
            newCropData.width = newW;
            newCropData.height = newH;
            newCropData.x = cropData.x - deltaX;
            newCropData.y = cropData.y - (newH - cropData.height);
          }
          break;
          
        case 'ne': // มุมขวาบน
          const newW2 = Math.max(50, mouseX - cropData.x);
          const newH2 = newW2 / aspectRatio;
          const deltaY2 = cropData.height - newH2;
          
          if (newW2 <= imageRef.current.width - cropData.x && cropData.y + deltaY2 >= 0) {
            newCropData.width = newW2;
            newCropData.height = newH2;
            newCropData.y = cropData.y + deltaY2;
          }
          break;
          
        case 'sw': // มุมซ้ายล่าง
          const deltaX3 = dragStart.x - mouseX;
          const newW3 = cropData.width + deltaX3;
          const newH3 = newW3 / aspectRatio;
          
          if (newW3 >= 50 && cropData.x - deltaX3 >= 0 && newH3 <= imageRef.current.height - cropData.y) {
            newCropData.width = newW3;
            newCropData.height = newH3;
            newCropData.x = cropData.x - deltaX3;
          }
          break;
      }
      
      setCropData(newCropData);
      
    } else if (isDragging) {
      const newX = mouseX - dragStart.x;
      const newY = mouseY - dragStart.y;
      
      // จำกัดขอบเขต
      const maxX = imageRef.current.width - cropData.width;
      const maxY = imageRef.current.height - cropData.height;
      
      setCropData({
        ...cropData,
        x: Math.max(0, Math.min(maxX, newX)),
        y: Math.max(0, Math.min(maxY, newY)),
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    setIsResizing(false);
    setResizeHandle('');
  };

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 flex items-center justify-center">
        <div className="text-white text-xl">กำลังโหลด...</div>
      </div>
    );
  }

  if (!session) return null;

  const userRole = (session.user as any).role;
  const displayRole = userRole === 'ADMIN' ? 'Admin' : userRole === 'EDITOR' ? 'Editor' : 'Sport Manager';

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="bg-red-en rounded-2xl shadow-2xl p-6 mb-6">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-white">{displayRole}</h1>
            <button
              onClick={() => router.push('/')}
              className="text-white hover:text-gray-300 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div className="text-center mt-4">
            <h2 className="text-3xl font-bold text-white">EN SPORT</h2>
          </div>
        </div>

        {/* Banner Upload Section */}
        <div className="bg-red-en rounded-2xl shadow-2xl p-8 mb-6">
          <h2 className="text-2xl font-bold text-white text-center mb-6">Banner</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-white text-lg mb-2">เลือกไฟล์:</label>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                disabled={isUploading}
                className="w-full px-4 py-3 bg-red-en-bg text-white rounded-lg border border-white/20 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-white/20 file:text-white hover:file:bg-white/30 cursor-pointer disabled:opacity-50"
              />
              <p className="text-sm text-white/70 mt-2">ratio 16:5 file type: png, jpg</p>
            </div>

            {showCropper && previewUrl && (
              <div className="space-y-4">
                <div className="text-white text-sm mb-2 text-center">
                  🎯 <strong>วิธีใช้:</strong> ลากกรอบเพื่อเลื่อน | ลากมุมสีน้ำเงินเพื่อขยาย-ย่อ (อัตราส่วน 16:5)
                </div>
                <div 
                  className="relative bg-black rounded-lg overflow-hidden select-none"
                  onMouseMove={handleMouseMove}
                  onMouseUp={handleMouseUp}
                  onMouseLeave={handleMouseUp}
                >
                  <img
                    ref={imageRef}
                    src={previewUrl}
                    alt="Preview"
                    onLoad={handleImageLoad}
                    className="w-full h-auto max-h-96 object-contain"
                    draggable={false}
                  />
                  
                  {/* Dark overlay outside crop area */}
                  {cropData && (
                    <>
                      {/* Top overlay */}
                      <div 
                        className="absolute top-0 left-0 right-0 bg-black/70"
                        style={{ height: cropData.y }}
                      />
                      {/* Bottom overlay */}
                      <div 
                        className="absolute left-0 right-0 bottom-0 bg-black/70"
                        style={{ 
                          top: cropData.y + cropData.height,
                        }}
                      />
                      {/* Left overlay */}
                      <div 
                        className="absolute left-0 bg-black/70"
                        style={{ 
                          top: cropData.y,
                          width: cropData.x,
                          height: cropData.height
                        }}
                      />
                      {/* Right overlay */}
                      <div 
                        className="absolute right-0 bg-black/70"
                        style={{ 
                          top: cropData.y,
                          left: cropData.x + cropData.width,
                          height: cropData.height
                        }}
                      />
                    </>
                  )}
                  
                  {/* Crop Selection Box */}
                  {cropData && (
                    <div
                      className={`absolute border-2 ${
                        isDragging ? 'border-yellow-400' : isResizing ? 'border-blue-400' : 'border-white'
                      } transition-colors duration-150`}
                      style={{
                        left: cropData.x,
                        top: cropData.y,
                        width: cropData.width,
                        height: cropData.height,
                        cursor: isDragging ? 'grabbing' : 'grab',
                      }}
                      onMouseDown={handleMouseDown}
                    >
                      {/* Grid lines - 3x3 */}
                      {/* Vertical lines */}
                      <div 
                        className="absolute top-0 bottom-0 border-l border-white/50"
                        style={{ left: '33.333%' }}
                      />
                      <div 
                        className="absolute top-0 bottom-0 border-l border-white/50"
                        style={{ left: '66.666%' }}
                      />
                      
                      {/* Horizontal lines */}
                      <div 
                        className="absolute left-0 right-0 border-t border-white/50"
                        style={{ top: '33.333%' }}
                      />
                      <div 
                        className="absolute left-0 right-0 border-t border-white/50"
                        style={{ top: '66.666%' }}
                      />
                      
                      {/* Resize handles - Corner เท่านั้น */}
                      <div 
                        className="absolute -top-2 -left-2 w-4 h-4 bg-white border-2 border-blue-500 rounded-full cursor-nw-resize hover:bg-blue-100"
                        onMouseDown={(e) => handleResizeMouseDown(e, 'nw')}
                      />
                      <div 
                        className="absolute -top-2 -right-2 w-4 h-4 bg-white border-2 border-blue-500 rounded-full cursor-ne-resize hover:bg-blue-100"
                        onMouseDown={(e) => handleResizeMouseDown(e, 'ne')}
                      />
                      <div 
                        className="absolute -bottom-2 -left-2 w-4 h-4 bg-white border-2 border-blue-500 rounded-full cursor-sw-resize hover:bg-blue-100"
                        onMouseDown={(e) => handleResizeMouseDown(e, 'sw')}
                      />
                      <div 
                        className="absolute -bottom-2 -right-2 w-4 h-4 bg-white border-2 border-blue-500 rounded-full cursor-se-resize hover:bg-blue-100"
                        onMouseDown={(e) => handleResizeMouseDown(e, 'se')}
                      />
                      
                      {/* Ratio indicator */}
                      <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 bg-black/80 text-white text-xs px-2 py-1 rounded">
                        16:5 {isResizing && '(Resizing)'}
                      </div>
                    </div>
                  )}
                </div>
                <canvas ref={canvasRef} className="hidden" />
              </div>
            )}

            <button
              onClick={handleCrop}
              disabled={!showCropper || confirmModal.isLoading}
              className="w-full bg-red-en-bg text-white py-3 px-6 rounded-lg font-semibold hover:bg-white/10 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {confirmModal.isLoading ? 'กำลังอัปโหลด...' : 'update'}
            </button>
          </div>

          {/* Message Display - ลบออกแล้วเพราะใช้ Modal แทน */}
        </div>

        {/* History Section */}
        <div className="bg-red-en rounded-2xl shadow-2xl p-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-white">History</h2>
            <button
              onClick={loadHistory}
              className="text-white hover:text-red-300 transition-colors"
              title="Refresh"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
          </div>

          {isLoadingHistory ? (
            <div className="text-center text-white py-8">
              <div className="animate-spin inline-block w-8 h-8 border-4 border-white border-t-transparent rounded-full"></div>
              <p className="mt-2">กำลังโหลด...</p>
            </div>
          ) : history.length === 0 ? (
            <div className="text-center text-white/70 py-8">
              <p>ยังไม่มีประวัติการอัปโหลด</p>
            </div>
          ) : (
            <div className="space-y-4">
              {history.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between bg-red-en-bg rounded-lg p-4"
                >
                  <div className="flex items-center gap-4 flex-1">
                    <div 
                      className="w-16 h-10 bg-white/10 rounded flex items-center justify-center cursor-pointer hover:bg-white/20 transition-colors overflow-hidden"
                      onClick={() => setSelectedImage(item.url)}
                    >
                      <img 
                        src={item.url} 
                        alt={item.filename}
                        className="w-full h-full object-cover rounded"
                      />
                    </div>
                    <div className="flex-1">
                      <p className="text-white font-medium">{item.filename}</p>
                      <p className="text-white/60 text-sm">{item.uploadedAt}</p>
                    </div>
                  </div>
                  {canDeleteBanner(item.uploadedBy) && (
                    <button
                      onClick={() => handleDelete(item.id, item.filename)}
                      className="text-red-300 hover:text-red-100 transition-colors p-2"
                      title="Delete"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Image Preview Modal */}
      {selectedImage && (
        <div 
          className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedImage(null)}
        >
          <div className="relative max-w-4xl max-h-full">
            <img 
              src={selectedImage} 
              alt="Banner Preview"
              className="max-w-full max-h-full object-contain rounded-lg"
              onClick={(e) => e.stopPropagation()}
            />
            <button
              onClick={() => setSelectedImage(null)}
              className="absolute -top-2 -right-2 w-8 h-8 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-colors"
            >
              ✕
            </button>
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

