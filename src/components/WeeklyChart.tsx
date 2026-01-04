'use client';

import React from 'react';
import { SleepEntry } from '../types';

interface WeeklyChartProps {
  entries: SleepEntry[];
  weekStartDate: string;
}

export const WeeklyChart: React.FC<WeeklyChartProps> = ({ entries, weekStartDate }) => {
  // Generate last 7 days
  const days = [];
  const startDate = new Date(weekStartDate);
  
  for (let i = 0; i < 7; i++) {
    const date = new Date(startDate);
    date.setDate(startDate.getDate() + i);
    const dateStr = date.toISOString().split('T')[0];
    const entry = entries.find(e => e.wakeDate === dateStr);
    
    days.push({
      date: dateStr,
      dayName: date.toLocaleDateString('en-US', { weekday: 'short' }),
      hours: entry?.hours || 0,
      hasEntry: !!entry,
    });
  }

  const maxHours = Math.max(...days.map(d => d.hours), 10);

  return (
    <div className="flex items-end justify-between gap-2 h-32">
      {days.map((day, index) => {
        const heightPercent = (day.hours / maxHours) * 100;
        const isToday = day.date === new Date().toISOString().split('T')[0];
        
        return (
          <div key={index} className="flex flex-col items-center flex-1">
            <div className="relative w-full flex justify-center mb-2" style={{ height: '80px' }}>
              <div 
                className={`w-8 rounded-t-lg transition-all duration-300 ${
                  day.hasEntry 
                    ? 'bg-gradient-to-t from-blue-600 to-blue-400' 
                    : 'bg-[#1F2937]'
                } ${isToday ? 'ring-2 ring-blue-400 ring-offset-2 ring-offset-[#111827]' : ''}`}
                style={{ 
                  height: `${Math.max(heightPercent, 5)}%`,
                  alignSelf: 'flex-end'
                }}
              />
              {day.hasEntry && (
                <span className="absolute -top-5 text-xs text-slate-300 font-medium">
                  {day.hours}h
                </span>
              )}
            </div>
            <span className={`text-xs ${isToday ? 'text-blue-400 font-semibold' : 'text-slate-500'}`}>
              {day.dayName}
            </span>
          </div>
        );
      })}
    </div>
  );
};
