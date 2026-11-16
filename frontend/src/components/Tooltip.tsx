import React, { useState } from 'react';

interface TooltipProps {
  content: string;
  children: React.ReactNode;
  position?: 'top' | 'bottom' | 'right';
  className?: string;
  fullWidth?: boolean;
}

export const Tooltip: React.FC<TooltipProps> = ({
  content,
  children,
  position = 'top',
  className = '',
  fullWidth = false,
}) => {
  const [visible, setVisible] = useState(false);

  const positionClasses = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2',
  }[position];

  return (
    <div
      className={`relative ${fullWidth ? 'w-full block' : 'inline-flex items-center'} ${className}`}
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
      onFocus={() => setVisible(true)}
      onBlur={() => setVisible(false)}
    >
      {children}
      {visible && (
        <span
          className={`absolute z-50 ${positionClasses} whitespace-nowrap rounded-lg bg-slate-900/90 dark:bg-slate-800/90 backdrop-blur-md border border-slate-700/60 text-white text-[11px] leading-snug font-medium px-2.5 py-1.5 shadow-xl pointer-events-none transition-opacity duration-150`}
        >
          {content}
          <span
            className={`absolute ${
              position === 'top'
                ? 'top-full left-1/2 -translate-x-1/2 border-t-slate-900/90 dark:border-t-slate-800/90 border-l-transparent border-r-transparent'
                : position === 'bottom'
                ? 'bottom-full left-1/2 -translate-x-1/2 border-b-slate-900/90 dark:border-b-slate-800/90 border-l-transparent border-r-transparent'
                : 'right-full top-1/2 -translate-y-1/2 border-r-slate-900/90 dark:border-r-slate-800/90 border-t-transparent border-b-transparent'
            } w-0 h-0 border-4`}
          />
        </span>
      )}
    </div>
  );
};
