import React from 'react';

interface PageHeroProps {
  src: string;
  alt: string;
  imgClassName?: string;
}

const defaultImgClass =
  'max-h-[160px] sm:max-h-[200px] md:max-h-[240px] lg:max-h-[260px]';

export const PageHero: React.FC<PageHeroProps> = ({
  src,
  alt,
  imgClassName = defaultImgClass,
}) => (
  <div className="flex w-full justify-center items-center py-4 px-4">
    <img
      src={src}
      alt={alt}
      className={`h-auto w-auto max-w-full object-contain drop-shadow-lg ${imgClassName}`}
      style={{ imageRendering: 'auto' }}
    />
  </div>
);
