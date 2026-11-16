import React, { useState } from 'react';

interface TooltipProps {
  content: string;
  children: React.ReactNode;
  position?: 'top' | 'bottom' | 'right';
}

export const Tooltip: React.FC<TooltipProps> = ({ content, children, position = 'top' }) => {
  const [visible, setVisible] = useState(false);

  const positionClasses = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2',
  }[position];

  return (
    <span
      className="relative inline-flex items-center"
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
      onFocus={() => setVisible(true)}
      onBlur={() => setVisible(false)}
    >
      {children}
      {visible && (
        <span
          className={`absolute z-50 ${positionClasses} whitespace-nowrap rounded-lg bg-slate-800 dark:bg-slate-700 text-white text-[11px] leading-snug font-medium px-2.5 py-1.5 shadow-xl pointer-events-none`}
          style={{ animation: 'fadeIn 0.12s ease forwards' }}
        >
          {content}
          <span
            className={`absolute ${
              position === 'top'
                ? 'top-full left-1/2 -translate-x-1/2 border-t-slate-800 dark:border-t-slate-700 border-l-transparent border-r-transparent'
                : position === 'bottom'
                ? 'bottom-full left-1/2 -translate-x-1/2 border-b-slate-800 dark:border-b-slate-700 border-l-transparent border-r-transparent'
                : 'right-full top-1/2 -translate-y-1/2 border-r-slate-800 dark:border-r-slate-700 border-t-transparent border-b-transparent'
            } w-0 h-0 border-4`}
          />
        </span>
      )}
    </span>
  );
};
