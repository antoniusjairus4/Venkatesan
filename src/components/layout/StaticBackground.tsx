import React from 'react';

export const StaticBackground: React.FC = () => {
  return (
    <div
      aria-hidden="true"
      className="fixed inset-0 -z-50 w-screen h-screen overflow-hidden pointer-events-none select-none bg-[#FAFBF8]"
    >
      {/* Mobile Static Background (< 640px) */}
      <img
        src="/assets/background_mobile.png"
        alt=""
        className="block sm:hidden w-full h-full object-cover object-center"
      />

      {/* Desktop & Tablet Static Background (>= 640px) */}
      <img
        src="/assets/background_desktop.png"
        alt=""
        className="hidden sm:block w-full h-full object-cover object-center"
      />
    </div>
  );
};

