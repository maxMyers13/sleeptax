import { User, Group, Week, SleepEntry, LeaderboardEntry } from '../types';

// --- MOCK DATA ---

const MOCK_USER: User = {
  id: 'user-1',
  email: 'demo@lilo.app',
  name: 'Alex (You)',
  avatarUrl: 'https://picsum.photos/200',
};

const MOCK_USERS: User[] = [
  MOCK_USER,
  { id: 'user-2', email: 'sarah@lilo.app', name: 'Sarah', avatarUrl: 'https://picsum.photos/201' },
  { id: 'user-3', email: 'mike@lilo.app', name: 'Mike', avatarUrl: 'https://picsum.photos/202' },
  { id: 'user-4', email: 'jess@lilo.app', name: 'Jess', avatarUrl: 'https://picsum.photos/203' },
];

const MOCK_GROUP: Group = {
  id: 'group-1',
  name: 'Sleepy Heads',
  ownerId: 'user-1',
  code: 'SLEEP-2024',
  createdAt: '2024-01-01T00:00:00Z',
};

// Initial state
let currentWeek: Week = {
  id: 'week-12',
  groupId: 'group-1',
  weekNumber: 12,
  isActive: true,
  startDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
  endDate: null,
};

let sleepEntries: SleepEntry[] = [
  // User 1 (Me)
  { id: 'e1', userId: 'user-1', weekId: 'week-12', wakeDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], hours: 7.5, loggedAt: new Date().toISOString() },
  { id: 'e2', userId: 'user-1', weekId: 'week-12', wakeDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], hours: 8.0, loggedAt: new Date().toISOString() },
  // User 2
  { id: 'e3', userId: 'user-2', weekId: 'week-12', wakeDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], hours: 6.5, loggedAt: new Date().toISOString() },
  { id: 'e4', userId: 'user-2', weekId: 'week-12', wakeDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], hours: 9.0, loggedAt: new Date().toISOString() },
  // User 3
  { id: 'e5', userId: 'user-3', weekId: 'week-12', wakeDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], hours: 5.5, loggedAt: new Date().toISOString() },
];

// --- SERVICE METHODS ---

export const mockService = {
  signIn: async (): Promise<User> => {
    await new Promise((resolve) => setTimeout(resolve, 800));
    return MOCK_USER;
  },

  getGroup: async (): Promise<Group> => {
    return MOCK_GROUP;
  },

  getCurrentWeek: async (): Promise<Week> => {
    return currentWeek;
  },

  getEntriesForWeek: async (weekId: string): Promise<SleepEntry[]> => {
    return sleepEntries.filter(e => e.weekId === weekId);
  },

  getLeaderboard: async (weekId: string): Promise<LeaderboardEntry[]> => {
    const entries = sleepEntries.filter(e => e.weekId === weekId);
    
    const leaderboard: LeaderboardEntry[] = MOCK_USERS.map(user => {
      const userEntries = entries.filter(e => e.userId === user.id);
      const totalHours = userEntries.reduce((sum, e) => sum + e.hours, 0);
      const streak = userEntries.length; 

      return {
        userId: user.id,
        user: user,
        totalHours,
        streak,
        rank: 0,
        entriesCount: userEntries.length
      };
    });

    leaderboard.sort((a, b) => b.totalHours - a.totalHours);
    leaderboard.forEach((entry, index) => {
      entry.rank = index + 1;
    });

    return leaderboard;
  },

  logSleep: async (date: string, hours: number): Promise<SleepEntry> => {
    await new Promise((resolve) => setTimeout(resolve, 500));
    
    const existing = sleepEntries.find(e => 
      e.userId === MOCK_USER.id && 
      e.weekId === currentWeek.id && 
      e.wakeDate === date
    );

    if (existing) {
      throw new Error("You have already logged sleep for this date.");
    }

    const newEntry: SleepEntry = {
      id: Math.random().toString(36).substr(2, 9),
      userId: MOCK_USER.id,
      weekId: currentWeek.id,
      wakeDate: date,
      hours: hours,
      loggedAt: new Date().toISOString(),
    };

    sleepEntries = [...sleepEntries, newEntry];
    return newEntry;
  },

  endWeek: async (): Promise<Week> => {
    await new Promise((resolve) => setTimeout(resolve, 1000));
    
    if (MOCK_USER.id !== MOCK_GROUP.ownerId) {
      throw new Error("Only the owner can end the week.");
    }

    currentWeek = {
      ...currentWeek,
      isActive: false,
      endDate: new Date().toISOString(),
      winnerId: 'user-2'
    };

    const newWeek: Week = {
      id: `week-${currentWeek.weekNumber + 1}`,
      groupId: MOCK_GROUP.id,
      weekNumber: currentWeek.weekNumber + 1,
      isActive: true,
      startDate: new Date().toISOString(),
      endDate: null,
    };
    
    currentWeek = newWeek;
    
    return newWeek;
  }
};
