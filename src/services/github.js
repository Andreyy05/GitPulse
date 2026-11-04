/**
 * GitHub API service to fetch user activity and determine daily commit streak status.
 * Combines real-time repository commits with the public events feed to eliminate GitHub indexing lag.
 */

export async function fetchGitHubActivity(username) {
  if (!username || !username.trim()) {
    throw new Error('Please configure your GitHub username.');
  }

  const cleanUser = username.trim();
  const headers = {
    'Accept': 'application/vnd.github.v3+json',
    'User-Agent': 'GitPulse-Desktop',
  };

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const sinceIso = today.toISOString();

  let totalCommitsToday = 0;
  const recentPushes = [];
  const seenCommitShas = new Set();
  let avatarUrl = `https://github.com/${cleanUser}.png`;

  // 1. Fetch user's recently pushed repositories (instant, 0s delay)
  try {
    const reposRes = await fetch(
      `https://api.github.com/users/${encodeURIComponent(cleanUser)}/repos?sort=pushed&per_page=6`,
      { headers }
    );

    if (reposRes.ok) {
      const repos = await reposRes.json();
      if (Array.isArray(repos)) {
        for (const repo of repos) {
          if (new Date(repo.pushed_at) >= today) {
            try {
              const commitsRes = await fetch(
                `https://api.github.com/repos/${repo.full_name}/commits?since=${sinceIso}&per_page=30`,
                { headers }
              );

              if (commitsRes.ok) {
                const commits = await commitsRes.json();
                if (Array.isArray(commits) && commits.length > 0) {
                  let repoNewCommits = 0;
                  let latestMsg = '';
                  let latestDate = null;

                  for (const c of commits) {
                    if (!seenCommitShas.has(c.sha)) {
                      seenCommitShas.add(c.sha);
                      repoNewCommits++;
                      if (!latestMsg) {
                        latestMsg = c.commit?.message?.split('\n')[0] || 'Code push';
                        latestDate = c.commit?.author?.date || c.commit?.committer?.date;
                      }
                    }
                  }

                  if (repoNewCommits > 0) {
                    totalCommitsToday += repoNewCommits;
                    const commitTime = latestDate ? new Date(latestDate) : new Date();
                    recentPushes.push({
                      id: `${repo.name}-${commitTime.getTime()}`,
                      repo: repo.name,
                      repoUrl: repo.html_url,
                      commitCount: repoNewCommits,
                      latestMessage: latestMsg,
                      time: commitTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                      timestamp: commitTime.getTime(),
                    });
                  }
                }
              }
            } catch (err) {
              console.warn(`Failed to fetch commits for ${repo.name}:`, err);
            }
          }
        }
      }
    }
  } catch (err) {
    console.warn('Repository check error:', err);
  }

  // 2. Query GitHub Events API (catches pushes to external/organization repos)
  try {
    const eventsRes = await fetch(
      `https://api.github.com/users/${encodeURIComponent(cleanUser)}/events?per_page=60`,
      { headers }
    );

    if (eventsRes.status === 404) {
      throw new Error(`GitHub user "${cleanUser}" not found.`);
    }

    if (eventsRes.status === 403) {
      const resetTime = eventsRes.headers.get('x-ratelimit-reset');
      const resetDate = resetTime ? new Date(parseInt(resetTime, 10) * 1000).toLocaleTimeString() : 'soon';
      console.warn(`GitHub API rate limit reached. Resets at ${resetDate}.`);
    } else if (eventsRes.ok) {
      const events = await eventsRes.json();

      if (Array.isArray(events) && events.length > 0) {
        if (events[0]?.actor?.avatar_url) {
          avatarUrl = events[0].actor.avatar_url;
        }

        const pushEventsToday = events.filter((e) => {
          return e.type === 'PushEvent' && new Date(e.created_at) >= today;
        });

        for (const event of pushEventsToday) {
          const commits = event.payload?.commits || [];
          let eventNewCount = 0;
          let latestMsg = '';

          for (const c of commits) {
            if (c.sha && !seenCommitShas.has(c.sha)) {
              seenCommitShas.add(c.sha);
              eventNewCount++;
              if (!latestMsg) {
                latestMsg = c.message?.split('\n')[0];
              }
            }
          }

          if (commits.length === 0) {
            const fallbackCount = event.payload?.distinct_size || event.payload?.size || 1;
            totalCommitsToday += fallbackCount;
            recentPushes.push({
              id: event.id,
              repo: event.repo?.name || 'unknown/repo',
              repoUrl: `https://github.com/${event.repo?.name}`,
              commitCount: fallbackCount,
              latestMessage: 'Code push',
              time: new Date(event.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              timestamp: new Date(event.created_at).getTime(),
            });
          } else if (eventNewCount > 0) {
            totalCommitsToday += eventNewCount;
            recentPushes.push({
              id: event.id,
              repo: event.repo?.name || 'unknown/repo',
              repoUrl: `https://github.com/${event.repo?.name}`,
              commitCount: eventNewCount,
              latestMessage: latestMsg || commits[0]?.message?.split('\n')[0] || 'Code push',
              time: new Date(event.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              timestamp: new Date(event.created_at).getTime(),
            });
          }
        }
      }
    }
  } catch (err) {
    if (totalCommitsToday === 0 && !recentPushes.length) {
      throw err;
    }
    console.warn('Events API error:', err);
  }

  // Sort pushes by newest first
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
    updatedAt: new Date(),
  };
}
