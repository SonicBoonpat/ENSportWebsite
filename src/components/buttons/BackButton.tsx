'use client';
import { useRouter } from "next/navigation";

const BackButton = () => {
    const router = useRouter();

    return (
        <div className="relative z-10 flex items-center mt-2 ml-6">
            <button
                onClick={() => router.back()}
                className="flex items-center gap-2 text-white/40 hover:text-white transition-all text-sm sm:text-base font-medium bg-white/5 hover:bg-white/10 rounded-full px-3 py-2 backdrop-blur-sm"
            >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 sm:w-5 sm:h-5">
                    <path d="M15 18l-6-6 6-6" />
                </svg>
                Back
            </button>
        </div>
    );
};

export default BackButton;