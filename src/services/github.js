/**
 * GitHub API service to fetch user activity and determine daily commit streak status.
 */

export async function fetchGitHubActivity(username) {
  if (!username || !username.trim()) {
    throw new Error('Please configure your GitHub username.');
  }

  const cleanUser = username.trim();
  const url = `https://api.github.com/users/${encodeURIComponent(cleanUser)}/events?per_page=60`;

  const response = await fetch(url, {
    headers: {
      'Accept': 'application/vnd.github.v3+json',
    },
  });

  if (response.status === 404) {
    throw new Error(`GitHub user "${cleanUser}" not found.`);
  }

  if (response.status === 403) {
    const resetTime = response.headers.get('x-ratelimit-reset');
    const resetDate = resetTime ? new Date(parseInt(resetTime, 10) * 1000).toLocaleTimeString() : 'soon';
    throw new Error(`GitHub API rate limit reached. Resets at ${resetDate}.`);
  }

  if (!response.ok) {
    throw new Error(`GitHub API error (${response.status}): ${response.statusText}`);
  }

  const events = await response.json();

  if (!Array.isArray(events)) {
    throw new Error('Invalid response from GitHub API.');
  }

  const today = new Date();
  const todayYear = today.getFullYear();
  const todayMonth = today.getMonth();
  const todayDate = today.getDate();

  const isToday = (dateString) => {
    const d = new Date(dateString);
    return (
      d.getFullYear() === todayYear &&
      d.getMonth() === todayMonth &&
      d.getDate() === todayDate
    );
  };

  // Filter for today's PushEvent records
  const pushEventsToday = events.filter((e) => e.type === 'PushEvent' && isToday(e.created_at));

  // Count commits from push events
  let totalCommitsToday = 0;
  const recentPushes = [];

  for (const event of pushEventsToday) {
    const commits = event.payload?.commits || [];
    const count = commits.length > 0 ? commits.length : (event.payload?.distinct_size || event.payload?.size || 1);
    totalCommitsToday += count;

    recentPushes.push({
      id: event.id,
      repo: event.repo?.name || 'unknown/repo',
      repoUrl: `https://github.com/${event.repo?.name}`,
      commitCount: count,
      latestMessage: commits[commits.length - 1]?.message?.split('\n')[0] || 'Code push',
      time: new Date(event.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      timestamp: new Date(event.created_at).getTime(),
    });
  }

  // Sort pushes by newest first
  recentPushes.sort((a, b) => b.timestamp - a.timestamp);

  const avatarUrl = events[0]?.actor?.avatar_url || `https://github.com/${cleanUser}.png`;
  const lastPush = recentPushes.length > 0 ? recentPushes[0] : null;

  return {
    username: cleanUser,
    avatarUrl,
    hasPushedToday: totalCommitsToday > 0,
    totalCommitsToday,
    totalPushEventsToday: pushEventsToday.length,
    lastPushTime: lastPush ? lastPush.time : null,
    recentPushes: recentPushes.slice(0, 3),
    updatedAt: new Date(),
  };
}
