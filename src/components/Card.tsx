import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
}

export const Card: React.FC<CardProps> = ({ children, className = '' }) => {
  return (
    <div className={`bg-[#111827] rounded-2xl p-5 border border-white/5 ${className}`}>
      {children}
    </div>
  );
};
