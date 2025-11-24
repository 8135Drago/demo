const POLL_INTERVAL_MS = 3000;
const RECENT_LIST_SIZE = 1000;


const fetchData = async (showToast = true, page = 0, size = RECENT_LIST_SIZE, mergeOnPage0 = false) => {
  try {
    setRefreshing(true);
    const jobsDays = dateRangeToDays(dateRangeFilter);
    const statsDays = firstLoadRef.current ? 0 : (jobsDays === 0 ? 0 : jobsDays);
    const params = new URLSearchParams();
    params.append("page", String(page));
    params.append("size", String(size));
    params.append("days", String(jobsDays));
    if (jobNameFilter && userNameFilter && statusFilter) {
      params.append("username", userNameFilter);
      params.append("jobName", jobNameFilter);
      params.append("fileName", jobNameFilter);
      params.append("status", statusFilter);
    }
    const [jobsRes, actionsRes, statsRes] = await Promise.all([
      fetch(`${API_BASE}/jobs?${params.toString()}`),
      fetch(`${API_BASE}/actions?${params.toString()}`),
      fetch(`${API_BASE}/jobs/stats?days=${statsDays}`),
    ]);
    const jobsData = jobsRes.ok ? await jobsRes.json() : [];
    const actionsData = actionsRes.ok ? await actionsRes.json() : [];
    let statsDataRaw = null;
    if (statsRes && statsRes.ok) {
      try {
        statsDataRaw = await statsRes.json();
      } catch (e) {
        console.warn("Failed to parse stats response", e);
      }
    }
    const normalizedJobs = normalizeJobsArray(jobsData);
    let normalizedActions = normalizeActionsArray(actionsData);
    if ((!Array.isArray(normalizedActions) || normalizedActions.length === 0) && jobsDays === 0) {
      try {
        const fallback = await fetch(`${API_BASE}/actions?days=30&page=0&size=1000`);
        if (fallback.ok) {
          const fbJson = await fallback.json();
          if (Array.isArray(fbJson) && fbJson.length > 0) {
            normalizedActions = normalizeActionsArray(fbJson);
            console.info("Used fallback 30-day actions because all-time returned empty.");
          }
        }
      } catch {}
    }
    setJobs((prev) => {
      if (page === 0) {
        if (mergeOnPage0 && Array.isArray(prev) && prev.length > 0) {
          const byId = new Map(prev.map(j => [j.id, j]));
          normalizedJobs.forEach(nj => {
            byId.set(nj.id, { ...(byId.get(nj.id) || {}), ...nj });
          });
          const merged = Array.from(byId.values()).sort((a,b) => new Date(b.startDate || b.createdAt) - new Date(a.startDate || a.createdAt));
          const maxKeep = (jobsPage + 1) * RECENT_LIST_SIZE;
          return merged.slice(0, Math.max(merged.length, maxKeep));
        } else {
          return normalizedJobs;
        }
      } else {
        return [...prev, ...normalizedJobs];
      }
    });
    setUserActions((prev) => (page === 0 ? normalizedActions : [...prev, ...normalizedActions]));
    const mappedStats = mapArrayToStatistics(statsDataRaw);
    setStatistics(mappedStats);
    const returnedCount = Array.isArray(normalizedJobs) ? normalizedJobs.length : 0;
    setHasMoreJobs(returnedCount === size);
    if (showToast && !firstLoadRef.current) toast.success("Data refreshed successfully");
    return returnedCount;
  } catch (err) {
    console.error("fetchData error:", err);
    toast.error("Failed to load data from server");
    return 0;
  } finally {
    setLoading(false);
    setRefreshing(false);
    firstLoadRef.current = false;
  }
};


useEffect(() => {
  (async () => {
    const returned = await fetchData(false, 0, RECENT_LIST_SIZE, false);
    setHasMoreJobs(returned === RECENT_LIST_SIZE);
  })();
  const interval = setInterval(() => {
    fetchData(false, 0, RECENT_LIST_SIZE, true).catch(e => console.error("Periodic refresh failed", e));
  }, POLL_INTERVAL_MS);
  return () => clearInterval(interval);
}, []);



const handleLoadMoreJobs = async () => {
  const nextPage = jobsPage + 1;
  const returned = await fetchData(false, nextPage, RECENT_LIST_SIZE, false);
  setJobsPage(nextPage);
  setHasMoreJobs(returned === RECENT_LIST_SIZE);
};
