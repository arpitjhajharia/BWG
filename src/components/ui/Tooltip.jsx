import React, { useState } from 'react';
import { createPortal } from 'react-dom';

export const Tooltip = ({ content, children, className = '' }) => {
    const [coords, setCoords] = useState(null);
    const [visible, setVisible] = useState(false);

    const handleMouseEnter = (e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        setCoords({
            left: rect.left + rect.width / 2,
            top: rect.top - 8 // spacing above element
        });
        setVisible(true);
    };

    const handleMouseLeave = () => {
        setVisible(false);
    };

    return (
        <div
            className={className}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
        >
            {children}
            {visible && coords && createPortal(
                <div
                    className="fixed z-[9999] px-2.5 py-1.5 bg-slate-800 text-white text-[11px] font-medium rounded shadow-xl pointer-events-none transform -translate-x-1/2 -translate-y-full animate-fade-in"
                    style={{ left: coords.left, top: coords.top }}
                >
                    {content}
                    {/* Arrow */}
                    <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-800"></div>
                </div>,
                document.body
            )}
        </div>
    );
};
