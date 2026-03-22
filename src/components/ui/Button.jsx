import React from 'react';

// Make sure "export" is right here
export const Button = ({ children, onClick, variant = "primary", icon: I, className = "", size = "md" }) => {
    const variants = {
        primary: 'bg-blue-600 text-white hover:bg-blue-700',
        secondary: 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50',
        danger: 'bg-white text-red-600 border border-red-200 hover:bg-red-50'
    };

    return (
        <button
            onClick={onClick}
            className={`flex items-center justify-center rounded font-medium transition-colors ${variants[variant] || variants.primary} ${size === 'sm' ? 'px-2 py-1 text-[10px]' : 'px-4 py-2 text-sm'} ${className}`}
        >
            {I && <I className={`${size === 'sm' ? 'w-3 h-3 text-red-400' : 'w-4 h-4'} mr-2`} />}
            {children}
        </button>
    );
};