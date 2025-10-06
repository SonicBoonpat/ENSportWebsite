'use client';
import { useRouter } from 'next/navigation';

export default function Footer() {
  const router = useRouter();

  return (
    <footer className='bg-black text-white/60 text-center font-rubik py-10 space-y-4 flex flex-col items-center justify-center'>
      <button
        onClick={() => router.push('/login')}
        className="text-md mt-4 block w-fit mx-auto bg-transparent border-0 p-0 text-inherit hover:underline"
        type="button"
      >
        For Administer
      </button>
      <p className='text-sm opacity-80'>GE362785 Creative Thinking and Problem Solving</p>
      <p className='text-sm opacity-80'>Copyright © 2025 Group 2 Section 4</p>
    </footer>
  );
}