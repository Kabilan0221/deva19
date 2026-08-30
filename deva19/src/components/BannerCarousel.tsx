import React, { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight, Sparkles, ArrowRight, Flame } from 'lucide-react';
import { BannerItem } from '../types';
import { Language } from '../utils/translations';

interface BannerCarouselProps {
  banners?: BannerItem[];
  language?: Language;
  onExploreProducts: () => void;
}

const DEFAULT_BANNERS: BannerItem[] = [
  {
    id: 'b1',
    title: 'Devaraj Traders - Grand Diwali Cracker Mela',
    tamil_title: 'தேவராஜ் பட்டாசு கடை - தீபாவளி அதிரடி தள்ளுபடி விற்பனை!',
    subtitle: 'Direct Sivakasi Factory Fresh Crackers with up to 90% discount on all varieties.',
    tamil_subtitle: 'சிவகாசி நேரடி தொழிற்சாலை விலையில் 90% வரை தள்ளுபடி! மொத்தமாகவும் சில்லரையாகவும் கிடைக்கும்.',
    image_url: 'https://images.unsplash.com/photo-1514565131-fce0801e5785?auto=format&fit=crop&w=1400&q=80',
    badge: '💥 90% SPECIAL DISCOUNT',
  },
  {
    id: 'b2',
    title: 'Family Combo Gift Boxes & Kids Special Sparklers',
    tamil_title: 'குடும்ப தீபாவளி கிப்ட் பாக்ஸ் & வண்ண வண்ண மத்தாப்புகள்',
    subtitle: 'Pre-assembled safe green fireworks gift boxes for unforgettable family moments.',
    tamil_subtitle: 'குழந்தைகள் மற்றும் குடும்பத்தினருக்கான பிரத்யேக கிப்ட் பாக்ஸ்கள் & பூந்தொட்டிகள்.',
    image_url: 'https://images.unsplash.com/photo-1508963493744-76fce69379c0?auto=format&fit=crop&w=1400&q=80',
    badge: '🎁 FAMILY COMBO PACKS',
  },
  {
    id: 'b3',
    title: 'Sky Repeaters, Flower Pots & Whistling Rockets',
    tamil_title: 'வானவேடிக்கை 30-ஷாட்ஸ், பூந்தொட்டி மற்றும் ராக்கெட்டுகள்',
    subtitle: 'Dazzling aerial fireworks and high-sparkling showers at lowest wholesale prices.',
    tamil_subtitle: 'வானை அதிர வைக்கும் பிரம்மாண்ட வாணவேடிக்கை மற்றும் வண்ணமயமான மத்தாப்புகள்.',
    image_url: 'https://images.unsplash.com/photo-1531058020387-3be344556be6?auto=format&fit=crop&w=1400&q=80',
    badge: '✨ SIVAKASI DIRECT WHOLESALE',
  },
];

export const BannerCarousel: React.FC<BannerCarouselProps> = ({
  banners,
  language = 'ta',
  onExploreProducts,
}) => {
  const activeBanners = banners && banners.length > 0 ? banners : DEFAULT_BANNERS;
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const resetTimer = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
  };

  useEffect(() => {
    resetTimer();
    if (!isHovered && activeBanners.length > 1) {
      timeoutRef.current = setTimeout(() => {
        setCurrentIndex((prev) => (prev + 1) % activeBanners.length);
      }, 4000);
    }
    return () => resetTimer();
  }, [currentIndex, isHovered, activeBanners.length]);

  const handlePrev = () => {
    resetTimer();
    setCurrentIndex((prev) => (prev - 1 + activeBanners.length) % activeBanners.length);
  };

  const handleNext = () => {
    resetTimer();
    setCurrentIndex((prev) => (prev + 1) % activeBanners.length);
  };

  if (!activeBanners || activeBanners.length === 0) return null;

  return (
    <div
      className="relative max-w-7xl mx-auto px-3 sm:px-6 my-4 sm:my-6"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="relative h-64 sm:h-80 md:h-96 w-full rounded-3xl overflow-hidden shadow-2xl border border-red-500/30 bg-gray-950">
        {/* Slides */}
        {activeBanners.map((banner, index) => {
          const isActive = index === currentIndex;
          const title = language === 'ta' && banner.tamil_title ? banner.tamil_title : banner.title;
          const subtitle =
            language === 'ta' && banner.tamil_subtitle ? banner.tamil_subtitle : banner.subtitle;

          return (
            <div
              key={banner.id || index}
              className={`absolute inset-0 transition-opacity duration-700 ease-in-out ${
                isActive ? 'opacity-100 z-10 pointer-events-auto' : 'opacity-0 z-0 pointer-events-none'
              }`}
            >
              {/* Image with Dark Vignette Overlay for Crisp Readability */}
              <img
                src={banner.image_url}
                alt={title}
                className="w-full h-full object-cover object-center transform scale-105 transition-transform duration-10000"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/55 to-black/30" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-black/25" />

              {/* Slide Content */}
              <div className="absolute inset-0 flex flex-col justify-end sm:justify-center p-6 sm:p-10 md:p-14 max-w-3xl text-white">
                {banner.badge && (
                  <div className="inline-flex items-center gap-1.5 bg-red-600/90 text-amber-300 font-extrabold text-xs uppercase px-3 py-1 rounded-full w-fit mb-2 sm:mb-3 shadow-md border border-red-400/40">
                    <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                    <span>{banner.badge}</span>
                  </div>
                )}

                <h2 className="text-xl sm:text-3xl md:text-4xl font-black tracking-tight leading-tight mb-2 drop-shadow-md text-amber-50">
                  {title}
                </h2>

                {subtitle && (
                  <p className="text-xs sm:text-base text-gray-200 line-clamp-2 sm:line-clamp-3 mb-4 sm:mb-6 leading-relaxed max-w-2xl drop-shadow">
                    {subtitle}
                  </p>
                )}

                <div>
                  <button
                    onClick={onExploreProducts}
                    className="inline-flex items-center gap-2 bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-500 hover:to-amber-500 text-white font-black px-5 py-2.5 sm:px-6 sm:py-3 rounded-2xl text-xs sm:text-sm shadow-xl hover:shadow-2xl transition-all transform hover:-translate-y-0.5 active:translate-y-0 cursor-pointer"
                  >
                    <Flame className="w-4 h-4 text-amber-300 fill-amber-300" />
                    <span>
                      {language === 'ta' ? 'பட்டாசுகள் காண்க / ஆர்டர் செய்க' : 'Explore Crackers & Order Now'}
                    </span>
                    <ArrowRight className="w-4 h-4 text-white" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}

        {/* Navigation Arrows */}
        {activeBanners.length > 1 && (
          <>
            <button
              onClick={handlePrev}
              aria-label="Previous Slide"
              className="absolute left-3 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-black/40 hover:bg-red-600/80 text-white flex items-center justify-center backdrop-blur-xs transition-all border border-white/20 hover:scale-110 cursor-pointer shadow-lg"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>

            <button
              onClick={handleNext}
              aria-label="Next Slide"
              className="absolute right-3 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-black/40 hover:bg-red-600/80 text-white flex items-center justify-center backdrop-blur-xs transition-all border border-white/20 hover:scale-110 cursor-pointer shadow-lg"
            >
              <ChevronRight className="w-6 h-6" />
            </button>

            {/* Indicator Dots */}
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 bg-black/50 px-3 py-1.5 rounded-full backdrop-blur-xs border border-white/10">
              {activeBanners.map((_, dotIndex) => (
                <button
                  key={dotIndex}
                  onClick={() => {
                    resetTimer();
                    setCurrentIndex(dotIndex);
                  }}
                  className={`h-2 rounded-full transition-all cursor-pointer ${
                    dotIndex === currentIndex ? 'w-6 bg-amber-400' : 'w-2 bg-white/50 hover:bg-white/80'
                  }`}
                  aria-label={`Go to slide ${dotIndex + 1}`}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
};
