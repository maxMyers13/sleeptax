'use client';

import React, { useState, useEffect } from 'react';
import { User, SleepEntry, LeaderboardEntry } from '../types';
import { supabaseService } from '../services/supabaseService';
import { Card } from './Card';
import { Button } from './Button';
import { WeeklyChart } from './WeeklyChart';
import SignOutButton from './SignOutButton';

interface DashboardProps {
  user: User;
}

export const Dashboard: React.FC<DashboardProps> = ({ user }) => {
  const [entries, setEntries] = useState<SleepEntry[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [logModalOpen, setLogModalOpen] = useState(false);
  const [sleepHours, setSleepHours] = useState(7);
  const [sleepMinutes, setSleepMinutes] = useState(0);
  const [logLoading, setLogLoading] = useState(false);

  // Calculate week start date (7 days ago)
  const weekStartDate = new Date();
  weekStartDate.setDate(weekStartDate.getDate() - 6);
  const weekStartStr = weekStartDate.toISOString();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [myEntries, lb] = await Promise.all([
        supabaseService.getMyWeeklyEntries(user.id),
        supabaseService.getLeaderboard(),
      ]);
      
      setEntries(myEntries);
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
      // Combine hours and minutes into decimal hours
      const totalHours = sleepHours + (sleepMinutes / 60);
      await supabaseService.logSleep(today, totalHours);
      await loadData();
      setLogModalOpen(false);
      // Reset to defaults
      setSleepHours(7);
      setSleepMinutes(0);
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to log sleep');
    } finally {
      setLogLoading(false);
    }
  };

  const myEntry = leaderboard.find(e => e.userId === user.id);
  const myTotalHours = myEntry?.totalHours || entries.reduce((sum, e) => sum + e.hours, 0);
  const myRank = myEntry?.rank || '-';
  const myStreak = myEntry?.streak || entries.length;

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
          <p className="text-slate-400 text-xs">This Week</p>
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
          <p className="text-slate-400 text-sm mb-1">Days Logged</p>
          <p className="text-white text-2xl font-bold">{myStreak} days</p>
        </Card>
      </div>

      {/* Weekly Chart */}
      <Card className="mb-6">
        <h2 className="text-white font-semibold mb-4">This Week</h2>
        <WeeklyChart entries={entries} weekStartDate={weekStartStr} />
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
        <h2 className="text-white font-semibold mb-4">
          Leaderboard
          {leaderboard.length === 0 && (
            <span className="text-slate-500 text-sm font-normal ml-2">
              (Log sleep to appear!)
            </span>
          )}
        </h2>
        
        {leaderboard.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-slate-500 text-sm">No sleep entries yet this week.</p>
            <p className="text-slate-600 text-xs mt-1">Be the first to log your sleep!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {leaderboard.map((entry) => (
              <div 
                key={entry.userId}
                className={`flex items-center gap-3 p-3 rounded-xl ${
                  entry.userId === user.id ? 'bg-blue-500/10 border border-blue-500/20' : 'bg-[#1F2937]'
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
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-medium truncate">
                    {entry.user.name}
                    {entry.userId === user.id && <span className="text-blue-400 ml-1">(You)</span>}
                  </p>
                  <p className="text-slate-500 text-xs">{entry.entriesCount} entries</p>
                </div>
                <p className="text-white font-semibold">{entry.totalHours.toFixed(1)}h</p>
              </div>
            ))}
          </div>
        )}
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
            <p className="text-slate-400 text-sm mb-6">How long did you sleep last night?</p>
            
            {/* Hours */}
            <div className="mb-4">
              <p className="text-slate-500 text-xs uppercase tracking-wide mb-2 text-center">Hours</p>
              <div className="flex items-center justify-center gap-4">
                <button 
                  onClick={() => setSleepHours(Math.max(0, sleepHours - 1))}
                  className="w-12 h-12 rounded-full bg-[#1F2937] text-white text-xl font-bold hover:bg-[#374151] transition-colors"
                >
                  -
                </button>
                <span className="text-white text-4xl font-bold w-16 text-center">{sleepHours}</span>
                <button 
                  onClick={() => setSleepHours(Math.min(24, sleepHours + 1))}
                  className="w-12 h-12 rounded-full bg-[#1F2937] text-white text-xl font-bold hover:bg-[#374151] transition-colors"
                >
                  +
                </button>
              </div>
            </div>

            {/* Minutes */}
            <div className="mb-6">
              <p className="text-slate-500 text-xs uppercase tracking-wide mb-2 text-center">Minutes</p>
              <div className="flex items-center justify-center">
                <input
                  type="number"
                  min="0"
                  max="59"
                  value={sleepMinutes}
                  onChange={(e) => {
                    const val = parseInt(e.target.value) || 0;
                    setSleepMinutes(Math.max(0, Math.min(59, val)));
                  }}
                  className="w-20 h-14 text-center text-white text-3xl font-bold bg-[#1F2937] rounded-xl border border-slate-600 focus:border-blue-500 focus:outline-none"
                />
              </div>
              <p className="text-slate-600 text-xs text-center mt-3">
                Total: {sleepHours}h {sleepMinutes}m
              </p>
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
