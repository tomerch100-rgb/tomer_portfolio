import React from 'react';
import { Home, AlertCircle } from 'lucide-react';

const NotFound = () => {
    return (
        <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 flex flex-col justify-center items-center px-6 text-center">
            <div className="animate-bounce bg-red-50 p-4 rounded-full text-red-500 mb-6 shadow-sm">
                <AlertCircle size={48} />
            </div>

            <h1 className="text-9xl font-black text-gray-200 tracking-widest select-none">
                404
            </h1>

            <h2 className="text-3xl font-bold text-gray-800 mt-4 mb-2">
                העמוד לא נמצא
            </h2>

            <p className="text-gray-500 max-w-md mb-8 text-lg">

                הדף שחיפשת לא קיים.
            </p>

            <a
                href="/"
                className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium px-6 py-3 rounded-xl shadow-md transition-all duration-200 ease-in-out transform hover:-translate-y-0.5"
            >
                <Home size={20} />
                <span>חזרה לדף הבית</span>
            </a>
        </div>
    );
};

export default NotFound;