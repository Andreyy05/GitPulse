/**
 * GitHub API service to fetch user activity and determine daily commit streak status.
 * Combines real-time repository commits with the public events feed to eliminate GitHub indexing lag
 * and aggregates a 14-day contribution heatmap.
 */

function getLocalDateKey(dateObj) {
  const year = dateObj.getFullYear();
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const day = String(dateObj.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function calculateHeatmapLevel(count) {
  if (count <= 0) return 0;
  if (count <= 2) return 1;
  if (count <= 5) return 2;
  if (count <= 9) return 3;
  return 4;
}

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
  const todayKey = getLocalDateKey(today);

  // Initialize 14-day timeline (from 13 days ago to today)
  const history14Days = [];
  const daysMap = {};

  for (let i = 13; i >= 0; i--) {
    const d = new Date();
    d.setDate(today.getDate() - i);
    d.setHours(0, 0, 0, 0);
    const key = getLocalDateKey(d);
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

  const fourteenDaysAgo = new Date();
  fourteenDaysAgo.setDate(today.getDate() - 14);
  fourteenDaysAgo.setHours(0, 0, 0, 0);
  const sinceIso = fourteenDaysAgo.toISOString();

  let totalCommitsToday = 0;
  const recentPushes = [];
  const seenCommitShas = new Set();
  let avatarUrl = `https://github.com/${cleanUser}.png`;

  // 1. Fetch user's recently pushed repositories (instant, 0s delay)
  try {
    const reposRes = await fetch(
      `https://api.github.com/users/${encodeURIComponent(cleanUser)}/repos?sort=pushed&per_page=8`,
      { headers }
    );

    if (reposRes.ok) {
      const repos = await reposRes.json();
      if (Array.isArray(repos)) {
        for (const repo of repos) {
          if (new Date(repo.pushed_at) >= fourteenDaysAgo) {
            try {
              const commitsRes = await fetch(
                `https://api.github.com/repos/${repo.full_name}/commits?since=${sinceIso}&per_page=50`,
                { headers }
              );

              if (commitsRes.ok) {
                const commits = await commitsRes.json();
                if (Array.isArray(commits) && commits.length > 0) {
                  let repoNewCommitsToday = 0;
                  let latestMsg = '';
                  let latestDate = null;

                  for (const c of commits) {
                    if (!seenCommitShas.has(c.sha)) {
                      seenCommitShas.add(c.sha);

                      const rawDate = c.commit?.author?.date || c.commit?.committer?.date;
                      const commitDate = rawDate ? new Date(rawDate) : new Date();
                      const commitKey = getLocalDateKey(commitDate);

                      // Aggregate to 14-day heatmap
                      if (daysMap[commitKey]) {
                        daysMap[commitKey].count++;
                      }

                      // Check if committed today
                      if (commitDate >= today || commitKey === todayKey) {
                        repoNewCommitsToday++;
                        if (!latestMsg) {
                          latestMsg = c.commit?.message?.split('\n')[0] || 'Code push';
                          latestDate = commitDate;
                        }
                      }
                    }
                  }

                  if (repoNewCommitsToday > 0) {
                    totalCommitsToday += repoNewCommitsToday;
                    const commitTime = latestDate || new Date();
                    recentPushes.push({
                      id: `${repo.name}-${commitTime.getTime()}`,
                      repo: repo.name,
                      repoUrl: repo.html_url,
                      commitCount: repoNewCommitsToday,
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
      `https://api.github.com/users/${encodeURIComponent(cleanUser)}/events?per_page=100`,
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

        const pushEvents = events.filter((e) => e.type === 'PushEvent');

        for (const event of pushEvents) {
          const eventDate = new Date(event.created_at);
          const eventKey = getLocalDateKey(eventDate);
          const commits = event.payload?.commits || [];
          let eventNewCountToday = 0;
          let latestMsg = '';

          for (const c of commits) {
            if (c.sha && !seenCommitShas.has(c.sha)) {
              seenCommitShas.add(c.sha);

              // Aggregate to 14-day heatmap
              if (daysMap[eventKey]) {
                daysMap[eventKey].count++;
              }

              if (eventDate >= today || eventKey === todayKey) {
                eventNewCountToday++;
                if (!latestMsg) {
                  latestMsg = c.message?.split('\n')[0];
                }
              }
            }
          }

          if (commits.length === 0) {
            const fallbackCount = event.payload?.distinct_size || event.payload?.size || 1;
            if (daysMap[eventKey]) {
              daysMap[eventKey].count += fallbackCount;
            }

            if (eventDate >= today || eventKey === todayKey) {
              totalCommitsToday += fallbackCount;
              recentPushes.push({
                id: event.id,
                repo: event.repo?.name || 'unknown/repo',
                repoUrl: `https://github.com/${event.repo?.name}`,
                commitCount: fallbackCount,
                latestMessage: 'Code push',
                time: eventDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                timestamp: eventDate.getTime(),
              });
            }
          } else if (eventNewCountToday > 0) {
            totalCommitsToday += eventNewCountToday;
            recentPushes.push({
              id: event.id,
              repo: event.repo?.name || 'unknown/repo',
              repoUrl: `https://github.com/${event.repo?.name}`,
              commitCount: eventNewCountToday,
              latestMessage: latestMsg || commits[0]?.message?.split('\n')[0] || 'Code push',
              time: eventDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              timestamp: eventDate.getTime(),
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

  // Calculate heatmap levels and totals
  let total14DaysCommits = 0;
  history14Days.forEach((day) => {
    day.level = calculateHeatmapLevel(day.count);
    total14DaysCommits += day.count;
  });

  // Ensure totalCommitsToday reflects today's aggregated heatmap count if higher
  if (daysMap[todayKey] && daysMap[todayKey].count > totalCommitsToday) {
    totalCommitsToday = daysMap[todayKey].count;
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
    history14Days,
    total14DaysCommits,
    updatedAt: new Date(),
  };
}
