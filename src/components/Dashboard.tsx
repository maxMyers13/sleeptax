'use client';

import React, { useState, useEffect } from 'react';
import { User, Week, SleepEntry, LeaderboardEntry } from '../types';
import { mockService } from '../services/mockService';
import { Card } from './Card';
import { Button } from './Button';
import { WeeklyChart } from './WeeklyChart';
import SignOutButton from './SignOutButton';

interface DashboardProps {
  user: User;
}

export const Dashboard: React.FC<DashboardProps> = ({ user }) => {
  const [week, setWeek] = useState<Week | null>(null);
  const [entries, setEntries] = useState<SleepEntry[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [logModalOpen, setLogModalOpen] = useState(false);
  const [sleepHours, setSleepHours] = useState(7);
  const [logLoading, setLogLoading] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const currentWeek = await mockService.getCurrentWeek();
      setWeek(currentWeek);
      
      const weekEntries = await mockService.getEntriesForWeek(currentWeek.id);
      setEntries(weekEntries);
      
      const lb = await mockService.getLeaderboard(currentWeek.id);
      setLeaderboard(lb);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogSleep = async () => {
    setLogLoading(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      await mockService.logSleep(today, sleepHours);
      await loadData();
      setLogModalOpen(false);
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to log sleep');
    } finally {
      setLogLoading(false);
    }
  };

  const myEntry = leaderboard.find(e => e.userId === 'user-1');
  const myTotalHours = myEntry?.totalHours || 0;
  const myRank = myEntry?.rank || '-';

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto pb-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <img 
            src={user.avatarUrl} 
            alt="Avatar" 
            className="w-12 h-12 rounded-full border-2 border-blue-500/30 object-cover"
          />
          <div>
            <p className="text-slate-400 text-sm">Good morning,</p>
            <h1 className="text-white font-semibold text-lg">{user.name}</h1>
          </div>
        </div>
        <div className="text-right">
          <p className="text-slate-400 text-xs">Week {week?.weekNumber}</p>
          <p className="text-blue-400 font-semibold">#{myRank}</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <Card>
          <p className="text-slate-400 text-sm mb-1">Total Sleep</p>
          <p className="text-white text-2xl font-bold">{myTotalHours.toFixed(1)}h</p>
        </Card>
        <Card>
          <p className="text-slate-400 text-sm mb-1">Streak</p>
          <p className="text-white text-2xl font-bold">{myEntry?.streak || 0} days</p>
        </Card>
      </div>

      {/* Weekly Chart */}
      <Card className="mb-6">
        <h2 className="text-white font-semibold mb-4">This Week</h2>
        {week && <WeeklyChart entries={entries.filter(e => e.userId === 'user-1')} weekStartDate={week.startDate} />}
      </Card>

      {/* Log Sleep Button */}
      <Button 
        onClick={() => setLogModalOpen(true)} 
        className="w-full mb-6"
      >
        🌙 Log Today&apos;s Sleep
      </Button>

      {/* Leaderboard */}
      <Card>
        <h2 className="text-white font-semibold mb-4">Leaderboard</h2>
        <div className="space-y-3">
          {leaderboard.map((entry) => (
            <div 
              key={entry.userId}
              className={`flex items-center gap-3 p-3 rounded-xl ${
                entry.userId === 'user-1' ? 'bg-blue-500/10 border border-blue-500/20' : 'bg-[#1F2937]'
              }`}
            >
              <span className={`w-6 h-6 flex items-center justify-center rounded-full text-sm font-bold ${
                entry.rank === 1 ? 'bg-yellow-500 text-black' :
                entry.rank === 2 ? 'bg-slate-400 text-black' :
                entry.rank === 3 ? 'bg-amber-700 text-white' :
                'bg-slate-700 text-slate-300'
              }`}>
                {entry.rank}
              </span>
              <img 
                src={entry.user.avatarUrl} 
                alt={entry.user.name}
                className="w-8 h-8 rounded-full object-cover"
              />
              <div className="flex-1">
                <p className="text-white text-sm font-medium">{entry.user.name}</p>
                <p className="text-slate-500 text-xs">{entry.entriesCount} entries</p>
              </div>
              <p className="text-white font-semibold">{entry.totalHours.toFixed(1)}h</p>
            </div>
          ))}
        </div>
      </Card>

      {/* Sign Out */}
      <div className="mt-6">
        <SignOutButton />
      </div>

      {/* Log Sleep Modal */}
      {logModalOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-sm">
            <h2 className="text-white font-semibold text-xl mb-4">Log Sleep</h2>
            <p className="text-slate-400 text-sm mb-4">How many hours did you sleep last night?</p>
            
            <div className="flex items-center justify-center gap-4 mb-6">
              <button 
                onClick={() => setSleepHours(Math.max(0, sleepHours - 0.5))}
                className="w-12 h-12 rounded-full bg-[#1F2937] text-white text-xl font-bold hover:bg-[#374151]"
              >
                -
              </button>
              <span className="text-white text-4xl font-bold w-20 text-center">{sleepHours}</span>
              <button 
                onClick={() => setSleepHours(Math.min(24, sleepHours + 0.5))}
                className="w-12 h-12 rounded-full bg-[#1F2937] text-white text-xl font-bold hover:bg-[#374151]"
              >
                +
              </button>
            </div>
            
            <div className="flex gap-3">
              <Button 
                variant="secondary" 
                onClick={() => setLogModalOpen(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button 
                onClick={handleLogSleep}
                disabled={logLoading}
                className="flex-1"
              >
                {logLoading ? 'Saving...' : 'Save'}
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};
