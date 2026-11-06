/**
 * GitHub API service to fetch user activity, profile avatar, and determine daily commit streak status.
 * Combines the official GitHub contribution calendar (real contribution graph) with PushEvents.
 */

function formatLocalDateKey(dateInput) {
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return '';
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function calculateHeatmapLevel(count) {
  if (count <= 0) return 0;
  if (count <= 2) return 1;
  if (count <= 5) return 2;
  return 3; // 6+ commits
}

/**
 * Fetch and parse the user's official GitHub contribution calendar HTML
 */
async function fetchContributionsCalendar(username) {
  let html = null;

  // 1. Try via Electron IPC (avoids CORS and CSP)
  if (typeof window !== 'undefined' && window.electronAPI?.fetchGithubContributions) {
    try {
      html = await window.electronAPI.fetchGithubContributions(username);
    } catch (err) {
      console.warn('[GitPulse] IPC fetch contributions error:', err);
    }
  }

  // 2. Direct fetch fallback
  if (!html) {
    try {
      const res = await fetch(`https://github.com/users/${encodeURIComponent(username)}/contributions`, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml',
        },
      });
      if (res.ok) {
        html = await res.text();
      }
    } catch (err) {
      console.warn('[GitPulse] Direct fetch contributions error:', err);
    }
  }

  if (!html) return {};

  const tooltips = {};
  const tipRegex = /<tool-tip[^>]*for="([^"]+)"[^>]*>([^<]+)<\/tool-tip>/gi;
  let tipMatch;
  while ((tipMatch = tipRegex.exec(html)) !== null) {
    tooltips[tipMatch[1]] = tipMatch[2].trim();
  }

  const tdRegex = /<td[^>]*data-date="(\d{4}-\d{2}-\d{2})"[^>]*id="([^"]+)"[^>]*data-level="(\d+)"[^>]*>/gi;
  const daysMap = {};
  let tdMatch;
  while ((tdMatch = tdRegex.exec(html)) !== null) {
    const date = tdMatch[1];
    const id = tdMatch[2];
    const rawLevel = parseInt(tdMatch[3], 10);
    const tipText = tooltips[id] || '';

    let count = 0;
    const countMatch = tipText.match(/^(\d+)\s+contribution/i);
    if (countMatch) {
      count = parseInt(countMatch[1], 10);
    } else if (rawLevel > 0) {
      count = rawLevel === 1 ? 1 : rawLevel === 2 ? 3 : rawLevel === 3 ? 6 : 10;
    }

    daysMap[date] = {
      date,
      count,
      level: Math.min(calculateHeatmapLevel(count), 3),
      tip: tipText,
    };
  }

  // Alternative fallback regex if markup differs
  if (Object.keys(daysMap).length === 0) {
    const altRegex = /<td[^>]*data-date="(\d{4}-\d{2}-\d{2})"[^>]*data-count="(\d+)"/gi;
    let altMatch;
    while ((altMatch = altRegex.exec(html)) !== null) {
      const date = altMatch[1];
      const count = parseInt(altMatch[2], 10);
      daysMap[date] = {
        date,
        count,
        level: calculateHeatmapLevel(count),
      };
    }
  }

  return daysMap;
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

  // 2. Concurrently fetch official contributions calendar & Events API
  let calendarMap = {};
  try {
    calendarMap = await fetchContributionsCalendar(cleanUser);
  } catch (err) {
    console.warn('[GitPulse] Error in fetchContributionsCalendar:', err);
  }

  // 3. Query GitHub Events API with ?per_page=100
  const endpoint = token
    ? 'https://api.github.com/user/events?per_page=100'
    : `https://api.github.com/users/${encodeURIComponent(cleanUser)}/events?per_page=100`;

  let eventsRes = null;
  try {
    eventsRes = await fetch(endpoint, { headers });

    // Fallback to /users/{username}/events if /user/events fails
    if (!eventsRes.ok && token && endpoint.includes('/user/events')) {
      eventsRes = await fetch(
        `https://api.github.com/users/${encodeURIComponent(cleanUser)}/events?per_page=100`,
        { headers }
      );
    }
  } catch (err) {
    console.warn('[GitPulse] Events fetch error:', err);
  }

  let rawEventsList = [];
  if (eventsRes && eventsRes.ok) {
    const parsed = await eventsRes.json();
    rawEventsList = Array.isArray(parsed) ? parsed : [];
  } else if (eventsRes) {
    checkRateLimit(eventsRes);
  }

  // Filter for PushEvents only
  const pushEvents = rawEventsList.filter((e) => e.type === 'PushEvent');

  // If avatar was not fetched from profile, fallback to actor avatar from event
  if (rawEventsList[0]?.actor?.avatar_url && avatarUrl.includes('avatars.githubusercontent.com/' + cleanUser)) {
    avatarUrl = rawEventsList[0].actor.avatar_url;
  }

  // 4. Parse push events for today's push list and supplementary counts
  const pushCountsByDate = {};
  const recentPushes = [];
  const todayKey = formatLocalDateKey(new Date());

  for (const event of pushEvents) {
    const commits = event.payload?.commits;
    const eventDateKey = formatLocalDateKey(event.created_at);

    if (Array.isArray(commits) && commits.length > 0) {
      for (const commit of commits) {
        const commitDateRaw = commit.timestamp || commit.author?.date || event.created_at;
        const commitDateKey = formatLocalDateKey(commitDateRaw);
        pushCountsByDate[commitDateKey] = (pushCountsByDate[commitDateKey] || 0) + 1;
      }
    } else {
      const size = event.payload?.size || event.payload?.distinct_size || 1;
      pushCountsByDate[eventDateKey] = (pushCountsByDate[eventDateKey] || 0) + size;
    }

    // Recent pushes details for today
    if (eventDateKey === todayKey) {
      const eventDate = new Date(event.created_at);
      const repoName = event.repo?.name || 'unknown/repo';
      const commitCount = Array.isArray(commits) && commits.length > 0 ? commits.length : (event.payload?.size || 1);
      const latestMessage =
        commits?.[0]?.message?.split('\n')[0] ||
        (commitCount > 1 ? `${commitCount} commits` : 'Code push');

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

  // 5. Generate 14-day timeline (chronologically: index 0 is 13 days ago, index 13 is TODAY)
  const days = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

    const calDay = calendarMap[dateKey];
    const pushCount = pushCountsByDate[dateKey] || 0;

    let count = 0;
    if (calDay && calDay.count !== undefined) {
      // Official calendar is primary source of truth, but merge with recent push counts if calendar cache hasn't updated yet
      count = Math.max(calDay.count, pushCount);
    } else {
      count = pushCount;
    }

    const level = calDay && calDay.level !== undefined ? calDay.level : calculateHeatmapLevel(count);

    days.push({
      date: dateKey,
      count,
      level: Math.min(Math.max(level, calculateHeatmapLevel(count)), 3),
      isToday: i === 0,
    });
  }

  // 6. Connect today's commit status
  const todayCommits = days[13]?.count || 0;
  const totalCommits = days.reduce((acc, curr) => acc + curr.count, 0);

  // Sort pushes newest first
  recentPushes.sort((a, b) => b.timestamp - a.timestamp);
  const lastPush = recentPushes.length > 0 ? recentPushes[0] : null;

  console.log('[GitPulse Contributions Loaded]', {
    todayCommits,
    totalCommits,
    todayKey,
    days,
  });

  return {
    username: cleanUser,
    avatarUrl,
    hasPushedToday: todayCommits > 0,
    totalCommitsToday: todayCommits,
    totalPushEventsToday: recentPushes.length || (todayCommits > 0 ? 1 : 0),
    lastPushTime: lastPush ? lastPush.time : (todayCommits > 0 ? 'Today' : null),
    recentPushes: recentPushes.slice(0, 3),
    history14Days: days,
    total14DaysCommits: totalCommits,
    rateLimitWarning,
    updatedAt: new Date(),
  };
}
