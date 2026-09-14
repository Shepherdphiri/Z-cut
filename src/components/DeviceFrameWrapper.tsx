import React from 'react';

interface ResponsiveContainerProps {
  children: React.ReactNode;
}

export const DeviceFrameWrapper: React.FC<ResponsiveContainerProps> = ({ children }) => {
  return (
    <div className="w-full min-h-screen bg-neutral-950 text-neutral-100 flex flex-col antialiased">
      {children}
    </div>
  );
};
