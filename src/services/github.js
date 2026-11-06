/**
 * GitHub API service to fetch user activity, profile avatar, and determine daily commit streak status.
 * Evaluates public PushEvents against the user's local calendar day and aggregates a 14-day contribution heatmap.
 */

function toLocalDateString(dateInput) {
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return '';
  // 'sv' (Swedish) locale reliably returns standard local date formatted as YYYY-MM-DD
  return d.toLocaleDateString('sv');
}

function calculateHeatmapLevel(count) {
  if (count <= 0) return 0;
  if (count <= 2) return 1;
  if (count <= 5) return 2;
  if (count <= 9) return 3;
  return 4;
}

export async function fetchGitHubActivity(username, optionalToken = '') {
  if (!username || !username.trim()) {
    throw new Error('Please configure your GitHub username.');
  }

  const cleanUser = username.trim();
  const token =
    (optionalToken && optionalToken.trim()) ||
    (typeof localStorage !== 'undefined' && localStorage.getItem
      ? localStorage.getItem('gitpulse_pat') || localStorage.getItem('gitpulse_github_token') || ''
      : '') ||
    '';

  const headers = {
    'Accept': 'application/vnd.github.v3+json',
    'User-Agent': 'GitPulse-Desktop',
  };

  if (token && token.trim()) {
    headers['Authorization'] = `Bearer ${token.trim()}`;
  }

  const todayStr = toLocalDateString(new Date());

  // Initialize 14-day timeline (from 13 days ago to today)
  const history14Days = [];
  const daysMap = {};

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (let i = 13; i >= 0; i--) {
    const d = new Date();
    d.setDate(today.getDate() - i);
    d.setHours(0, 0, 0, 0);
    const key = toLocalDateString(d);
    const formattedDate = d.toLocaleDateString([], {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
    const dayItem = {
      date: key,
      formattedDate,
      shortDay: d.toLocaleDateString([], { weekday: 'narrow' }),
      count: 0,
      isToday: i === 0,
      level: 0,
    };
    history14Days.push(dayItem);
    daysMap[key] = dayItem;
  }

  let avatarUrl = `https://avatars.githubusercontent.com/${cleanUser}`;
  let rateLimitWarning = null;

  // Helper to inspect rate-limiting on responses
  const checkRateLimit = (res) => {
    const remaining = res.headers.get('x-ratelimit-remaining');
    const resetUnix = res.headers.get('x-ratelimit-reset');
    if (res.status === 403 || remaining === '0') {
      const resetDate = resetUnix ? new Date(parseInt(resetUnix, 10) * 1000) : null;
      const resetTime = resetDate ? resetDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'soon';
      const warning = `GitHub API rate limit exceeded. Resets at ${resetTime}`;
      console.warn(`[GitPulse] ${warning}`);
      rateLimitWarning = warning;
      return true;
    }
    return false;
  };

  // 1. Fetch user profile to get exact avatar_url and check user existence
  try {
    const profileRes = await fetch(
      `https://api.github.com/users/${encodeURIComponent(cleanUser)}`,
      { headers }
    );

    if (profileRes.status === 404) {
      throw new Error(`GitHub user "@${cleanUser}" not found.`);
    }

    if (checkRateLimit(profileRes)) {
      // If profile is rate limited, rateLimitWarning is recorded
    } else if (profileRes.ok) {
      const profile = await profileRes.json();
      if (profile?.avatar_url) {
        avatarUrl = profile.avatar_url;
      }
    }
  } catch (err) {
    if (err.message && err.message.includes('not found')) {
      throw err;
    }
    console.warn('[GitPulse] User profile fetch warning:', err);
  }

  // 2. Query GitHub Events API (100 events per page)
  let totalCommitsToday = 0;
  const recentPushes = [];

  const eventsRes = await fetch(
    `https://api.github.com/users/${encodeURIComponent(cleanUser)}/events?per_page=100`,
    { headers }
  );

  if (eventsRes.status === 404) {
    throw new Error(`GitHub user "@${cleanUser}" not found.`);
  }

  if (checkRateLimit(eventsRes)) {
    throw new Error(rateLimitWarning || 'GitHub API rate limit exceeded.');
  }

  if (!eventsRes.ok) {
    throw new Error(`GitHub API error (${eventsRes.status}): ${eventsRes.statusText}`);
  }

  const events = await eventsRes.json();
  const rawEventsList = Array.isArray(events) ? events : [];

  // Filter for PushEvents only
  const pushEvents = rawEventsList.filter((e) => e.type === 'PushEvent');

  // If avatar was not fetched from profile, fallback to actor avatar from event
  if (rawEventsList[0]?.actor?.avatar_url && avatarUrl.includes('avatars.githubusercontent.com/' + cleanUser)) {
    avatarUrl = rawEventsList[0].actor.avatar_url;
  }

  for (const event of pushEvents) {
    const eventDate = new Date(event.created_at);
    const eventLocalStr = toLocalDateString(eventDate);
    const isToday = eventLocalStr === todayStr;

    // Count commits in this push event
    const commitCount = event.payload?.commits?.length || event.payload?.size || event.payload?.distinct_size || 1;

    // Aggregate to 14-day heatmap
    if (daysMap[eventLocalStr]) {
      daysMap[eventLocalStr].count += commitCount;
    }

    // Accumulate today's commits and record push details
    if (isToday) {
      totalCommitsToday += commitCount;

      const repoName = event.repo?.name || 'unknown/repo';
      const latestMessage =
        event.payload?.commits?.[0]?.message?.split('\n')[0] ||
        (event.payload?.commits?.length ? `${commitCount} commits` : 'Code push');

      recentPushes.push({
        id: String(event.id),
        repo: repoName,
        repoUrl: `https://github.com/${repoName}`,
        commitCount,
        latestMessage,
        time: eventDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        timestamp: eventDate.getTime(),
      });
    }
  }

  // 4. Add Console Debugging
  console.log('[GitPulse Debug]', {
    eventsCount: rawEventsList.length,
    pushEventsCount: pushEvents.length,
    today: todayStr,
    todayCommits: totalCommitsToday,
  });

  // Calculate heatmap levels and totals
  let total14DaysCommits = 0;
  history14Days.forEach((day) => {
    day.level = calculateHeatmapLevel(day.count);
    total14DaysCommits += day.count;
  });

  // Sort pushes newest first
  recentPushes.sort((a, b) => b.timestamp - a.timestamp);
  const lastPush = recentPushes.length > 0 ? recentPushes[0] : null;

  return {
    username: cleanUser,
    avatarUrl,
    hasPushedToday: totalCommitsToday > 0,
    totalCommitsToday,
    totalPushEventsToday: recentPushes.length,
    lastPushTime: lastPush ? lastPush.time : null,
    recentPushes: recentPushes.slice(0, 3),
    history14Days,
    total14DaysCommits,
    rateLimitWarning,
    updatedAt: new Date(),
  };
}
