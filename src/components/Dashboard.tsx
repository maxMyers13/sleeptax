'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { User, Group, Week, LeaderboardEntry, SleepEntry } from '../types';
import { supabaseService } from '../services/supabaseService';
import { Card } from './Card';
import { Button } from './Button';
import { COLORS, MIN_STREAK_HOURS } from '../constants';
import { WeeklyChart } from './WeeklyChart';
import SignOutButton from './SignOutButton';

interface DashboardProps {
  user: User;
}

export const Dashboard: React.FC<DashboardProps> = ({ user }) => {
  const [group, setGroup] = useState<Group | null>(null);
  const [week, setWeek] = useState<Week | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [myEntries, setMyEntries] = useState<SleepEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [noGroup, setNoGroup] = useState(false);
  
  // Modals State
  const [isLogModalOpen, setIsLogModalOpen] = useState(false);
  const [showPledgeModal, setShowPledgeModal] = useState(false);
  const [showCreateGroupModal, setShowCreateGroupModal] = useState(false);
  const [showJoinGroupModal, setShowJoinGroupModal] = useState(false);
  const [selectedProfile, setSelectedProfile] = useState<{user: User, entries: SleepEntry[], streak: number} | null>(null);
  
  // Forms
  const [pledgeAmount, setPledgeAmount] = useState<number>(10);
  const [isPledging, setIsPledging] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [groupCode, setGroupCode] = useState('');
  const [isCreatingGroup, setIsCreatingGroup] = useState(false);
  const [isJoiningGroup, setIsJoiningGroup] = useState(false);
  
  const [logDate, setLogDate] = useState(new Date().toISOString().split('T')[0]);
  const [logHours, setLogHours] = useState<number>(7);
  const [logMinutes, setLogMinutes] = useState<number>(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [isEndingWeek, setIsEndingWeek] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const g = await supabaseService.getGroup();
      
      if (!g) {
        setNoGroup(true);
        setLoading(false);
        return;
      }

      setGroup(g);
      setNoGroup(false);

      const w = await supabaseService.getCurrentWeek(g.id);
      if (!w) {
        setLoading(false);
        return;
      }

      setWeek(w);
      
      const [lb, entries, myPledge] = await Promise.all([
        supabaseService.getLeaderboard(g.id, w.id),
        supabaseService.getMyEntriesForWeek(w.id),
        supabaseService.getMyPledge(w.id),
      ]);

      setLeaderboard(lb);
      setMyEntries(entries);
      
      // Check Tax Gate
      if (!myPledge) {
        setShowPledgeModal(true);
      }
    } catch (err) {
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // --- ACTIONS ---

  const handleCreateGroup = async () => {
    if (!groupName.trim()) return;
    setIsCreatingGroup(true);
    try {
      await supabaseService.createGroup(groupName.trim());
      setShowCreateGroupModal(false);
      setGroupName('');
      await fetchData();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to create group');
    } finally {
      setIsCreatingGroup(false);
    }
  };

  const handleJoinGroup = async () => {
    if (!groupCode.trim()) return;
    setIsJoiningGroup(true);
    try {
      await supabaseService.joinGroup(groupCode.trim());
      setShowJoinGroupModal(false);
      setGroupCode('');
      await fetchData();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to join group');
    } finally {
      setIsJoiningGroup(false);
    }
  };

  const handlePledge = async () => {
    setIsPledging(true);
    try {
      if (!week) return;
      await supabaseService.pledgeSleepTax(week.id, pledgeAmount);
      setShowPledgeModal(false);
      await fetchData();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to pledge');
    } finally {
      setIsPledging(false);
    }
  };

  const handleLogSleep = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    const totalHours = logHours + (logMinutes / 60);

    try {
      await supabaseService.logSleep(logDate, totalHours, week?.id);
      await fetchData();
      setIsLogModalOpen(false);
      setLogHours(7);
      setLogMinutes(0);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to log sleep';
      if (message === 'PLEDGE_REQUIRED') {
        setIsLogModalOpen(false);
        setShowPledgeModal(true);
      } else {
        setError(message);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEndWeek = async () => {
    if (!confirm('Are you sure? This will finalize rankings and start a new week.')) return;
    if (!week || !group) return;
    
    setIsEndingWeek(true);
    try {
      await supabaseService.endWeek(week.id, group.id);
      await fetchData();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to end week');
    } finally {
      setIsEndingWeek(false);
    }
  };

  const openProfile = async (targetUser: User) => {
    if (!week) return;
    const stats = await supabaseService.getUserStats(targetUser.id, week.id);
    setSelectedProfile({
      user: targetUser,
      entries: stats.entries,
      streak: stats.streak
    });
  };

  // --- RENDER HELPERS ---

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
      </div>
    );
  }

  // No group - show create/join options
  if (noGroup) {
    return (
      <div className="max-w-md mx-auto pb-20">
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-4xl">🌙</span>
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Welcome to Lilo Sleep!</h1>
          <p className="text-slate-400">Join or create a group to start tracking your sleep with friends.</p>
        </div>

        <div className="space-y-4">
          <Button className="w-full" onClick={() => setShowCreateGroupModal(true)}>
            + Create a Group
          </Button>
          <Button variant="secondary" className="w-full" onClick={() => setShowJoinGroupModal(true)}>
            Join with Code
          </Button>
        </div>

        <div className="mt-8">
          <SignOutButton />
        </div>

        {/* Create Group Modal */}
        {showCreateGroupModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <div className="bg-[#111827] border border-slate-700 w-full max-w-sm rounded-2xl p-6 shadow-2xl">
              <h3 className="text-xl font-bold text-white mb-4">Create a Group</h3>
              <input
                type="text"
                placeholder="Group name (e.g., Sleepy Squad)"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                className="w-full bg-[#020617] border border-slate-700 rounded-lg p-3 text-white focus:outline-none focus:border-sky-500 mb-4"
              />
              <div className="flex gap-3">
                <Button variant="secondary" className="flex-1" onClick={() => setShowCreateGroupModal(false)}>
                  Cancel
                </Button>
                <Button className="flex-1" onClick={handleCreateGroup} isLoading={isCreatingGroup}>
                  Create
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Join Group Modal */}
        {showJoinGroupModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <div className="bg-[#111827] border border-slate-700 w-full max-w-sm rounded-2xl p-6 shadow-2xl">
              <h3 className="text-xl font-bold text-white mb-4">Join a Group</h3>
              <input
                type="text"
                placeholder="Enter group code"
                value={groupCode}
                onChange={(e) => setGroupCode(e.target.value.toUpperCase())}
                className="w-full bg-[#020617] border border-slate-700 rounded-lg p-3 text-white focus:outline-none focus:border-sky-500 mb-4 font-mono uppercase"
              />
              <div className="flex gap-3">
                <Button variant="secondary" className="flex-1" onClick={() => setShowJoinGroupModal(false)}>
                  Cancel
                </Button>
                <Button className="flex-1" onClick={handleJoinGroup} isLoading={isJoiningGroup}>
                  Join
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (!group || !week) {
    return <div className="p-8 text-center text-slate-500">Loading group data...</div>;
  }

  const isOwner = group.ownerId === user.id;
  const myLeaderboardEntry = leaderboard.find(l => l.userId === user.id);

  return (
    <div className="max-w-md mx-auto pb-20">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold bg-clip-text text-transparent" style={{ backgroundImage: COLORS.accent.gradient }}>
            {group.name}
          </h1>
          <p className="text-sm text-slate-400">Week #{week.weekNumber} • Code: {group.code}</p>
        </div>
        <div className="h-10 w-10 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center overflow-hidden">
          <img src={user.avatarUrl} alt="Me" className="h-full w-full object-cover" />
        </div>
      </div>

      {/* Main Stats Card */}
      <Card title="Your Performance">
        <div className="flex justify-between items-end mb-2">
          <div>
            <span className="text-3xl font-bold text-white">
              {myLeaderboardEntry?.totalHours.toFixed(1) || 0}
            </span>
            <span className="text-slate-500 ml-2">hrs total</span>
          </div>
          <div className="flex flex-col items-end">
            <div className="flex items-center gap-1 text-orange-400">
              <span className="text-lg">🔥</span>
              <span className="font-bold">{myLeaderboardEntry?.streak || 0}</span>
              <span className="text-xs uppercase tracking-wider text-orange-400/70">Day Streak</span>
            </div>
            <div className="text-xs text-slate-500 mt-1">
              Tax Pledge: <span className="text-slate-300 font-mono">${myLeaderboardEntry?.taxPledged || 0}</span>
            </div>
          </div>
        </div>
        <WeeklyChart entries={myEntries} />
        <Button className="w-full mt-6" onClick={() => setIsLogModalOpen(true)}>
          + Log Sleep
        </Button>
      </Card>

      {/* Leaderboard */}
      <div className="flex items-center justify-between mb-3 mt-8">
        <h3 className="text-lg font-semibold text-white">Leaderboard</h3>
        <span className="text-xs text-slate-500">Tap for details</span>
      </div>
      
      <div className="space-y-3">
        {leaderboard.length === 0 ? (
          <div className="text-center py-8 text-slate-500">
            <p>No entries yet this week.</p>
            <p className="text-sm mt-1">Be the first to log your sleep!</p>
          </div>
        ) : (
          leaderboard.map((entry, index) => {
            const isLast = index === leaderboard.length - 1;
            const isDanger = isLast || (leaderboard.length > 3 && index === leaderboard.length - 2);
            
            return (
              <div 
                key={entry.userId}
                onClick={() => openProfile(entry.user)}
                className={`
                  relative overflow-hidden rounded-xl p-4 flex items-center justify-between border transition-all cursor-pointer active:scale-95
                  ${entry.userId === user.id ? 'border-sky-500/50 bg-sky-900/10' : ''}
                  ${entry.userId !== user.id && isDanger ? 'border-red-500/40 bg-red-900/10' : ''}
                  ${entry.userId !== user.id && !isDanger ? 'border-[#1F2937] bg-[#111827]' : ''}
                `}
              >
                <div className="flex items-center gap-3">
                  <span className={`font-mono font-bold w-6 text-center ${entry.rank === 1 ? 'text-yellow-400' : 'text-slate-500'}`}>
                    {entry.rank === 1 ? '👑' : `#${entry.rank}`}
                  </span>
                  <img src={entry.user.avatarUrl} alt={entry.user.name} className="w-8 h-8 rounded-full bg-slate-800" />
                  <div>
                    <p className={`font-medium ${entry.userId === user.id ? 'text-sky-400' : 'text-slate-200'}`}>
                      {entry.user.name}
                    </p>
                    <div className="flex items-center gap-2">
                      {isDanger && (
                        <span className="bg-red-500 text-[10px] font-bold text-white px-1.5 py-0.5 rounded uppercase">
                          Tax Risk
                        </span>
                      )}
                      <span className="text-xs text-slate-500 font-mono">
                        ${entry.taxPledged} at stake
                      </span>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="flex flex-col items-end">
                    <span className="text-lg font-bold text-white leading-none">{entry.totalHours.toFixed(1)}</span>
                    <span className="text-[10px] text-slate-500 uppercase mt-1">Hours</span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Admin Zone */}
      {isOwner && (
        <div className="mt-12 pt-8 border-t border-slate-800">
          <p className="text-xs uppercase tracking-widest text-slate-500 mb-4 font-bold text-center">Owner Controls</p>
          <Button variant="danger" className="w-full" onClick={handleEndWeek} isLoading={isEndingWeek}>
            End Week & Finalize
          </Button>
        </div>
      )}

      {/* Sign Out */}
      <div className="mt-6">
        <SignOutButton />
      </div>

      {/* --- MODALS --- */}

      {/* 1. BLOCKING PLEDGE MODAL */}
      {showPledgeModal && (
        <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-4 bg-black/90 backdrop-blur-md">
          <div className="bg-[#111827] border border-slate-700 w-full max-w-sm rounded-2xl p-6 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-sky-500 to-blue-600"></div>
            
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl">
                💰
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Pledge Your Sleep Tax</h3>
              <p className="text-sm text-slate-400">
                How much do you owe the group if you finish last this week?
              </p>
            </div>

            <div className="mb-8">
              <div className="text-center mb-4">
                <span className="text-5xl font-bold text-white tracking-tighter">${pledgeAmount}</span>
              </div>
              <input 
                type="range" 
                min="0" 
                max="50" 
                step="1"
                value={pledgeAmount}
                onChange={(e) => setPledgeAmount(parseInt(e.target.value))}
                className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-sky-500"
              />
              <div className="flex justify-between text-xs text-slate-500 mt-2 font-mono">
                <span>$0</span>
                <span>$50</span>
              </div>
            </div>

            <Button 
              className="w-full py-4 text-lg" 
              onClick={handlePledge} 
              isLoading={isPledging}
            >
              Lock In Pledge
            </Button>
            <p className="text-[10px] text-slate-600 text-center mt-3">
              This cannot be changed later.
            </p>
          </div>
        </div>
      )}

      {/* 2. PROFILE VIEW MODAL */}
      {selectedProfile && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/80 backdrop-blur-sm" onClick={() => setSelectedProfile(null)}>
          <div className="bg-[#111827] border border-slate-700 w-full max-w-sm rounded-2xl p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-4 mb-6">
              <img src={selectedProfile.user.avatarUrl} alt={selectedProfile.user.name} className="w-16 h-16 rounded-full border-2 border-slate-700" />
              <div>
                <h3 className="text-xl font-bold text-white">{selectedProfile.user.name}</h3>
                <p className="text-sm text-slate-400">Week #{week.weekNumber} Stats</p>
              </div>
              <button onClick={() => setSelectedProfile(null)} className="ml-auto text-slate-500 hover:text-white p-2">
                ✕
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-6">
              <div className="bg-slate-800/50 rounded-lg p-3 text-center border border-slate-700">
                <div className="text-xs text-slate-500 uppercase mb-1">Streak</div>
                <div className="text-2xl font-bold text-orange-400">🔥 {selectedProfile.streak}</div>
                <div className="text-[10px] text-slate-500 mt-1">days {'>'}= {MIN_STREAK_HOURS}h</div>
              </div>
              <div className="bg-slate-800/50 rounded-lg p-3 text-center border border-slate-700">
                <div className="text-xs text-slate-500 uppercase mb-1">Total Sleep</div>
                <div className="text-2xl font-bold text-white">
                  {selectedProfile.entries.reduce((a, b) => a + b.hours, 0).toFixed(1)}h
                </div>
              </div>
            </div>

            <div className="mb-2">
              <p className="text-xs text-slate-400 mb-2 font-medium">THIS WEEK&apos;S LOGS</p>
              <WeeklyChart entries={selectedProfile.entries} />
            </div>
          </div>
        </div>
      )}

      {/* 3. LOG SLEEP MODAL */}
      {isLogModalOpen && !showPledgeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#111827] border border-slate-700 w-full max-w-sm rounded-2xl p-6 shadow-2xl">
            <h3 className="text-xl font-bold text-white mb-4">Log Sleep</h3>
            
            {error && (
              <div className="bg-red-500/10 border border-red-500/50 text-red-400 text-sm p-3 rounded-lg mb-4">
                {error}
              </div>
            )}

            <form onSubmit={handleLogSleep}>
              <div className="mb-4">
                <label className="block text-sm text-slate-400 mb-1">Date Woke Up</label>
                <input 
                  type="date" 
                  required
                  max={new Date().toISOString().split('T')[0]}
                  value={logDate}
                  onChange={e => setLogDate(e.target.value)}
                  className="w-full bg-[#020617] border border-slate-700 rounded-lg p-3 text-white focus:outline-none focus:border-sky-500"
                />
              </div>
              
              {/* Hours */}
              <div className="mb-4">
                <p className="text-slate-500 text-xs uppercase tracking-wide mb-2 text-center">Hours</p>
                <div className="flex items-center justify-center gap-4">
                  <button 
                    type="button"
                    onClick={() => setLogHours(Math.max(0, logHours - 1))}
                    className="w-12 h-12 rounded-full bg-[#1F2937] text-white text-xl font-bold hover:bg-[#374151] transition-colors"
                  >
                    -
                  </button>
                  <span className="text-white text-4xl font-bold w-16 text-center">{logHours}</span>
                  <button 
                    type="button"
                    onClick={() => setLogHours(Math.min(24, logHours + 1))}
                    className="w-12 h-12 rounded-full bg-[#1F2937] text-white text-xl font-bold hover:bg-[#374151] transition-colors"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Minutes */}
              <div className="mb-6">
                <p className="text-slate-500 text-xs uppercase tracking-wide mb-2 text-center">Minutes</p>
                <div className="flex items-center justify-center gap-4">
                  <button 
                    type="button"
                    onClick={() => setLogMinutes(Math.max(0, logMinutes - 1))}
                    className="w-12 h-12 rounded-full bg-[#1F2937] text-white text-xl font-bold hover:bg-[#374151] transition-colors"
                  >
                    -
                  </button>
                  <input
                    type="number"
                    min="0"
                    max="59"
                    value={logMinutes}
                    onChange={(e) => {
                      const val = parseInt(e.target.value) || 0;
                      setLogMinutes(Math.max(0, Math.min(59, val)));
                    }}
                    className="w-16 h-14 text-center text-white text-4xl font-bold bg-transparent border-none focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                  <button 
                    type="button"
                    onClick={() => setLogMinutes(Math.min(59, logMinutes + 1))}
                    className="w-12 h-12 rounded-full bg-[#1F2937] text-white text-xl font-bold hover:bg-[#374151] transition-colors"
                  >
                    +
                  </button>
                </div>
                <p className="text-slate-600 text-xs text-center mt-3">
                  Total: {logHours}h {logMinutes}m
                </p>
              </div>

              <div className="flex gap-3">
                <Button type="button" variant="secondary" className="flex-1" onClick={() => setIsLogModalOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" className="flex-1" isLoading={isSubmitting}>
                  Save Entry
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
