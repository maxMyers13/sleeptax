import { createClient } from '@/utils/supabase/client';
import { User, SleepEntry, LeaderboardEntry, Group, Week, WeeklyPledge } from '../types';
import { MIN_STREAK_HOURS } from '../constants';

// Helper: Calculate streak from entries
const calculateStreak = (entries: SleepEntry[]): number => {
  if (entries.length === 0) return 0;

  // Sort by date descending
  const sorted = [...entries].sort((a, b) => 
    new Date(b.wakeDate).getTime() - new Date(a.wakeDate).getTime()
  );

  const todayStr = new Date().toISOString().split('T')[0];
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split('T')[0];

  const latestDate = sorted[0].wakeDate;

  // Streak must be active (logged today or yesterday)
  if (latestDate !== todayStr && latestDate !== yesterdayStr) {
    return 0;
  }

  let streak = 0;
  let currentDate = new Date(latestDate);

  for (const entry of sorted) {
    const entryDate = new Date(entry.wakeDate);
    const diffTime = Math.abs(currentDate.getTime() - entryDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays > 1 && streak > 0) break; // Gap detected

    if (entry.hours >= MIN_STREAK_HOURS) {
      streak++;
      currentDate = entryDate;
    } else {
      break; // Streak broken by poor sleep
    }
  }

  return streak;
};

export const supabaseService = {
  // Get current user's profile
  getCurrentUser: async (): Promise<User | null> => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) return null;

    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (!profile) return null;

    return {
      id: profile.id,
      email: profile.email || '',
      name: profile.name || 'User',
      avatarUrl: profile.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(profile.name || 'User')}&background=3B82F6&color=fff`,
    };
  },

  // Ensure user profile exists
  ensureProfile: async (): Promise<void> => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) return;

    const { data: existing } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', user.id)
      .maybeSingle();

    if (!existing) {
      await supabase.from('profiles').insert({
        id: user.id,
        email: user.email,
        name: user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0],
        avatar_url: user.user_metadata?.avatar_url || user.user_metadata?.picture,
      });
    }
  },

  // ============ GROUP METHODS ============

  // Get user's group (for now, just the first one they're in)
  getGroup: async (): Promise<Group | null> => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    // First check if user is a member of any group
    const { data: membership } = await supabase
      .from('group_members')
      .select('group_id')
      .eq('user_id', user.id)
      .limit(1)
      .maybeSingle();

    if (!membership) return null;

    const { data: group } = await supabase
      .from('groups')
      .select('*')
      .eq('id', membership.group_id)
      .single();

    if (!group) return null;

    return {
      id: group.id,
      name: group.name,
      ownerId: group.owner_id,
      code: group.code,
      createdAt: group.created_at,
    };
  },

  // Create a new group
  createGroup: async (name: string): Promise<Group> => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    await supabaseService.ensureProfile();

    // Generate unique code
    const code = `${name.toUpperCase().replace(/\s/g, '').slice(0, 4)}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

    const { data: group, error } = await supabase
      .from('groups')
      .insert({
        name,
        owner_id: user.id,
        code,
      })
      .select()
      .single();

    if (error) throw error;

    // Add owner as member
    await supabase.from('group_members').insert({
      group_id: group.id,
      user_id: user.id,
    });

    // Create first week
    await supabase.from('weeks').insert({
      group_id: group.id,
      week_number: 1,
      is_active: true,
    });

    return {
      id: group.id,
      name: group.name,
      ownerId: group.owner_id,
      code: group.code,
      createdAt: group.created_at,
    };
  },

  // Join group by code
  joinGroup: async (code: string): Promise<Group> => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    await supabaseService.ensureProfile();

    const { data: group, error: groupError } = await supabase
      .from('groups')
      .select('*')
      .eq('code', code.toUpperCase())
      .single();

    if (groupError || !group) throw new Error('Invalid group code');

    // Check if already a member
    const { data: existing } = await supabase
      .from('group_members')
      .select('id')
      .eq('group_id', group.id)
      .eq('user_id', user.id)
      .maybeSingle();

    if (existing) throw new Error('Already a member of this group');

    // Join the group
    const { error } = await supabase.from('group_members').insert({
      group_id: group.id,
      user_id: user.id,
    });

    if (error) throw error;

    return {
      id: group.id,
      name: group.name,
      ownerId: group.owner_id,
      code: group.code,
      createdAt: group.created_at,
    };
  },

  // ============ WEEK METHODS ============

  // Get current active week for a group
  getCurrentWeek: async (groupId: string): Promise<Week | null> => {
    const supabase = createClient();

    const { data: week } = await supabase
      .from('weeks')
      .select('*')
      .eq('group_id', groupId)
      .eq('is_active', true)
      .order('week_number', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!week) return null;

    return {
      id: week.id,
      groupId: week.group_id,
      weekNumber: week.week_number,
      isActive: week.is_active,
      startDate: week.start_date,
      endDate: week.end_date,
      winnerId: week.winner_id,
    };
  },

  // End week and start new one
  endWeek: async (weekId: string, groupId: string): Promise<Week> => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    // Verify ownership
    const { data: group } = await supabase
      .from('groups')
      .select('owner_id, id')
      .eq('id', groupId)
      .single();

    if (!group || group.owner_id !== user.id) {
      throw new Error('Only the owner can end the week');
    }

    // Get leaderboard to find winner
    const leaderboard = await supabaseService.getLeaderboard(groupId, weekId);
    const winner = leaderboard[0];

    // Close current week
    await supabase
      .from('weeks')
      .update({
        is_active: false,
        end_date: new Date().toISOString(),
        winner_id: winner?.userId || null,
      })
      .eq('id', weekId);

    // Get current week number
    const { data: oldWeek } = await supabase
      .from('weeks')
      .select('week_number')
      .eq('id', weekId)
      .single();

    // Create new week
    const { data: newWeek, error } = await supabase
      .from('weeks')
      .insert({
        group_id: groupId,
        week_number: (oldWeek?.week_number || 0) + 1,
        is_active: true,
      })
      .select()
      .single();

    if (error) throw error;

    return {
      id: newWeek.id,
      groupId: newWeek.group_id,
      weekNumber: newWeek.week_number,
      isActive: newWeek.is_active,
      startDate: newWeek.start_date,
      endDate: newWeek.end_date,
      winnerId: newWeek.winner_id,
    };
  },

  // ============ PLEDGE METHODS ============

  // Get user's pledge for a week
  getMyPledge: async (weekId: string): Promise<WeeklyPledge | null> => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data: pledge } = await supabase
      .from('weekly_pledges')
      .select('*')
      .eq('week_id', weekId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (!pledge) return null;

    return {
      id: pledge.id,
      weekId: pledge.week_id,
      userId: pledge.user_id,
      amount: pledge.amount,
      createdAt: pledge.created_at,
    };
  },

  // Create a pledge
  pledgeSleepTax: async (weekId: string, amount: number): Promise<void> => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    if (amount < 0 || amount > 50) throw new Error('Pledge must be between $0 and $50');

    const { error } = await supabase.from('weekly_pledges').insert({
      week_id: weekId,
      user_id: user.id,
      amount,
    });

    if (error) {
      if (error.code === '23505') {
        throw new Error('You have already pledged for this week');
      }
      throw error;
    }
  },

  // ============ SLEEP ENTRY METHODS ============

  // Get entries for a week
  getEntriesForWeek: async (weekId: string): Promise<SleepEntry[]> => {
    const supabase = createClient();

    // Get week start date
    const { data: week } = await supabase
      .from('weeks')
      .select('start_date, end_date')
      .eq('id', weekId)
      .single();

    if (!week) return [];

    let query = supabase
      .from('sleep_entries')
      .select('*')
      .gte('wake_date', week.start_date.split('T')[0]);

    if (week.end_date) {
      query = query.lte('wake_date', week.end_date.split('T')[0]);
    }

    const { data: entries, error } = await query.order('wake_date', { ascending: true });

    if (error) {
      console.error('Error fetching entries:', error);
      return [];
    }

    return entries.map(entry => ({
      id: entry.id,
      userId: entry.user_id,
      weekId: weekId,
      wakeDate: entry.wake_date,
      hours: parseFloat(entry.hours),
      loggedAt: entry.logged_at,
    }));
  },

  // Get user's entries for a week
  getMyEntriesForWeek: async (weekId: string): Promise<SleepEntry[]> => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    // Get week start date
    const { data: week } = await supabase
      .from('weeks')
      .select('start_date, end_date')
      .eq('id', weekId)
      .single();

    if (!week) return [];

    let query = supabase
      .from('sleep_entries')
      .select('*')
      .eq('user_id', user.id)
      .gte('wake_date', week.start_date.split('T')[0]);

    if (week.end_date) {
      query = query.lte('wake_date', week.end_date.split('T')[0]);
    }

    const { data: entries, error } = await query.order('wake_date', { ascending: true });

    if (error) {
      console.error('Error fetching my entries:', error);
      return [];
    }

    return entries.map(entry => ({
      id: entry.id,
      userId: entry.user_id,
      weekId: weekId,
      wakeDate: entry.wake_date,
      hours: parseFloat(entry.hours),
      loggedAt: entry.logged_at,
    }));
  },

  // Log sleep
  logSleep: async (date: string, hours: number, weekId?: string): Promise<SleepEntry> => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) throw new Error('Not authenticated');

    await supabaseService.ensureProfile();

    // If weekId provided, check pledge
    if (weekId) {
      const pledge = await supabaseService.getMyPledge(weekId);
      if (!pledge) {
        throw new Error('PLEDGE_REQUIRED');
      }
    }

    // Check if entry already exists
    const { data: existing } = await supabase
      .from('sleep_entries')
      .select('id')
      .eq('user_id', user.id)
      .eq('wake_date', date)
      .maybeSingle();

    if (existing) {
      // Update existing entry
      const { data, error } = await supabase
        .from('sleep_entries')
        .update({ hours, logged_at: new Date().toISOString() })
        .eq('id', existing.id)
        .select()
        .single();

      if (error) throw error;

      return {
        id: data.id,
        userId: data.user_id,
        weekId: weekId || 'current',
        wakeDate: data.wake_date,
        hours: parseFloat(data.hours),
        loggedAt: data.logged_at,
      };
    }

    // Insert new entry
    const { data, error } = await supabase
      .from('sleep_entries')
      .insert({
        user_id: user.id,
        wake_date: date,
        hours,
      })
      .select()
      .single();

    if (error) throw error;

    return {
      id: data.id,
      userId: data.user_id,
      weekId: weekId || 'current',
      wakeDate: data.wake_date,
      hours: parseFloat(data.hours),
      loggedAt: data.logged_at,
    };
  },

  // ============ LEADERBOARD ============

  // Get leaderboard for a group/week
  getLeaderboard: async (groupId: string, weekId: string): Promise<LeaderboardEntry[]> => {
    const supabase = createClient();

    // Get all group members
    const { data: members, error: membersError } = await supabase
      .from('group_members')
      .select('user_id, profiles(*)')
      .eq('group_id', groupId);

    if (membersError || !members) {
      console.error('Error fetching members:', membersError);
      return [];
    }

    // Get week dates
    const { data: week } = await supabase
      .from('weeks')
      .select('start_date, end_date')
      .eq('id', weekId)
      .single();

    if (!week) return [];

    // Get all entries for the week
    let entriesQuery = supabase
      .from('sleep_entries')
      .select('*')
      .gte('wake_date', week.start_date.split('T')[0]);

    if (week.end_date) {
      entriesQuery = entriesQuery.lte('wake_date', week.end_date.split('T')[0]);
    }

    const { data: allEntries, error: entriesError } = await entriesQuery;

    if (entriesError) {
      console.error('Error fetching entries:', entriesError);
      return [];
    }

    // Get all pledges for the week
    const { data: pledges } = await supabase
      .from('weekly_pledges')
      .select('*')
      .eq('week_id', weekId);

    // Build leaderboard
    const leaderboard: LeaderboardEntry[] = members.map((member) => {
      const profile = member.profiles as { id: string; name: string | null; email: string | null; avatar_url: string | null };
      const userEntries = allEntries?.filter(e => e.user_id === member.user_id) || [];
      const totalHours = userEntries.reduce((sum, e) => sum + parseFloat(e.hours), 0);
      const pledge = pledges?.find(p => p.user_id === member.user_id);

      // Calculate streak from all user's historical entries
      const mappedEntries: SleepEntry[] = userEntries.map(e => ({
        id: e.id,
        userId: e.user_id,
        weekId: weekId,
        wakeDate: e.wake_date,
        hours: parseFloat(e.hours),
        loggedAt: e.logged_at,
      }));

      const streak = calculateStreak(mappedEntries);

      return {
        userId: member.user_id,
        user: {
          id: profile.id,
          email: profile.email || '',
          name: profile.name || 'User',
          avatarUrl: profile.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(profile.name || 'User')}&background=3B82F6&color=fff`,
        },
        totalHours,
        streak,
        taxPledged: pledge?.amount || 0,
        rank: 0,
        entriesCount: userEntries.length,
      };
    });

    // Sort by total hours and assign ranks
    leaderboard.sort((a, b) => b.totalHours - a.totalHours);
    leaderboard.forEach((entry, index) => {
      entry.rank = index + 1;
    });

    return leaderboard;
  },

  // Get user stats for profile view
  getUserStats: async (userId: string, weekId: string): Promise<{ entries: SleepEntry[]; streak: number }> => {
    const supabase = createClient();

    // Get week dates
    const { data: week } = await supabase
      .from('weeks')
      .select('start_date, end_date')
      .eq('id', weekId)
      .single();

    if (!week) return { entries: [], streak: 0 };

    // Get entries for this week
    let query = supabase
      .from('sleep_entries')
      .select('*')
      .eq('user_id', userId)
      .gte('wake_date', week.start_date.split('T')[0]);

    if (week.end_date) {
      query = query.lte('wake_date', week.end_date.split('T')[0]);
    }

    const { data: entries } = await query.order('wake_date', { ascending: false });

    const mappedEntries: SleepEntry[] = (entries || []).map(e => ({
      id: e.id,
      userId: e.user_id,
      weekId: weekId,
      wakeDate: e.wake_date,
      hours: parseFloat(e.hours),
      loggedAt: e.logged_at,
    }));

    // For full streak calculation, we need all historical entries
    const { data: allEntries } = await supabase
      .from('sleep_entries')
      .select('*')
      .eq('user_id', userId)
      .order('wake_date', { ascending: false });

    const allMappedEntries: SleepEntry[] = (allEntries || []).map(e => ({
      id: e.id,
      userId: e.user_id,
      weekId: 'all',
      wakeDate: e.wake_date,
      hours: parseFloat(e.hours),
      loggedAt: e.logged_at,
    }));

    const streak = calculateStreak(allMappedEntries);

    return { entries: mappedEntries, streak };
  },
};
