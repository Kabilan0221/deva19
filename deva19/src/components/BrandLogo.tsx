import React from 'react';
import officialLogoImg from '../assets/images/dj_devaraj_logo_new_1787994242607.jpg';

interface BrandLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showSubtitle?: boolean;
  theme?: 'light' | 'dark' | 'white';
  className?: string;
  variant?: 'full' | 'compact' | 'symbol' | 'image-only';
}

export const BrandLogo: React.FC<BrandLogoProps> = ({
  size = 'md',
  showSubtitle = true,
  theme = 'light',
  className = '',
  variant = 'full',
}) => {
  const isDark = theme === 'dark';
  const isWhite = theme === 'white';
  const logoSrc = officialLogoImg;

  const imgSizes = {
    sm: 'h-9 sm:h-10',
    md: 'h-11 sm:h-12',
    lg: 'h-14 sm:h-16',
    xl: 'h-20 sm:h-24',
  };

  const titleSizes = {
    sm: 'text-xs sm:text-sm',
    md: 'text-sm sm:text-base md:text-lg',
    lg: 'text-lg sm:text-xl md:text-2xl',
    xl: 'text-2xl sm:text-3xl md:text-4xl',
  };

  const subtitleSizes = {
    sm: 'text-[8px]',
    md: 'text-[9px] sm:text-[10px]',
    lg: 'text-xs',
    xl: 'text-sm',
  };

  if (variant === 'image-only') {
    return (
      <div className={`inline-flex items-center justify-center select-none ${className}`}>
        <img
          src={logoSrc}
          alt="DEVARAJ CRACKERS Official Logo"
          referrerPolicy="no-referrer"
          className={`${imgSizes[size]} w-auto object-contain rounded-lg shadow-xs`}
        />
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-2.5 select-none ${className}`}>
      {/* Brand Logo Asset - Clean Official 3D DJ Devaraj Logo */}
      <div className="shrink-0 flex items-center justify-center overflow-hidden rounded-xl bg-white/95 p-1 shadow-xs border border-amber-200/50">
        <img
          src={logoSrc}
          alt="DEVARAJ CRACKERS"
          referrerPolicy="no-referrer"
          className={`${imgSizes[size]} w-auto object-contain`}
        />
      </div>

      {/* Brand Typography: DEVARAJ CRACKERS */}
      {variant !== 'symbol' && (
        <div className="flex flex-col leading-none min-w-0">
          <div className="flex items-center gap-1">
            <span
              className={`font-black tracking-wider uppercase font-['Outfit',sans-serif] truncate ${titleSizes[size]} ${
                isWhite
                  ? 'text-white drop-shadow-md'
                  : isDark
                  ? 'text-white'
                  : 'text-gray-900'
              }`}
            >
              <span className={isWhite ? 'text-white' : isDark ? 'text-gray-100' : 'text-gray-900 font-black'}>
                DEVARAJ CRACKERS
              </span>
            </span>
          </div>

          {showSubtitle && (
            <div className="flex items-center gap-1 mt-0.5">
              <span
                className={`font-extrabold tracking-wide truncate ${subtitleSizes[size]} ${
                  isWhite
                    ? 'text-amber-300'
                    : isDark
                    ? 'text-amber-400'
                    : 'text-red-700'
                }`}
              >
                தேவராஜ் பட்டாசு கடை • KANCHIPURAM
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
