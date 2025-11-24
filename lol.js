// --- improved normalizeStatus (case-insensitive, supports PARTIAL SUCCESS etc.) ---
const normalizeStatus = (status) => {
  if (!status) return "";
  const s = String(status).trim().toLowerCase();
  if (s === "") return "";
  if (s.includes("fail") || s.includes("failure")) return "FAILED";
  if (s.includes("partial") && s.includes("success")) return "PARTIAL_SUCCESS";
  if (s.includes("success") || s.includes("completed") || s.includes("succeeded")) return "SUCCESS";
  if (s.includes("in_progress") || s.includes("in progress") || s.includes("running") || s.includes("inprogress")) return "IN_PROGRESS";
  if (s.includes("queue") || s.includes("queued") || s.includes("in queue")) return "IN_QUEUE";
  if (s.includes("cancel") || s.includes("cancelled") || s.includes("canceled")) return "CANCELLED";
  // fallback: return UPPERCASE trimmed original (preserve unknown labels as-is)
  return String(status).trim().toUpperCase();
};

// --- robust mapArrayToStatistics that handles rows as arrays or objects and counts PARTIAL_SUCCESS too ---
function mapArrayToStatistics(rows) {
  const stats = { completed: 0, partialSuccess: 0, running: 0, queue: 0, failed: 0, cancelled: 0 };
  if (!Array.isArray(rows)) return { ...stats, total: 0 };

  rows.forEach((row) => {
    // support both row formats: array row like [something, status, count] or object { status, count } etc
    let statusRaw = "";
    let count = 0;
    try {
      if (Array.isArray(row)) {
        // many SQL/DB endpoints return array rows [col1, col2, count]
        statusRaw = row[1] ?? row.status ?? "";
        count = Number(row[2]) || 0;
      } else if (row && typeof row === "object") {
        statusRaw = row.status ?? row.statusName ?? row[1] ?? "";
        count = Number(row.count ?? row.total ?? row[2]) || 0;
      } else {
        statusRaw = String(row);
        count = 1;
      }
    } catch (e) {
      statusRaw = "";
      count = 0;
    }

    const s = String(statusRaw).trim().toLowerCase();

    if (s.includes("partial") && s.includes("success")) stats.partialSuccess += count;
    else if (s.includes("success") || s.includes("completed") || s.includes("succeeded")) stats.completed += count;
    else if (s.includes("in_progress") || s.includes("in progress") || s.includes("running") || s.includes("inprogress")) stats.running += count;
    else if (s.includes("queue") || s.includes("queued") || s.includes("in queue")) stats.queue += count;
    else if (s.includes("fail") || s.includes("failed") || s.includes("failure")) stats.failed += count;
    else if (s.includes("cancel") || s.includes("cancelled") || s.includes("canceled")) stats.cancelled += count;
    else {
      // Unknown label -> attempt to categorize: if it contains 'success' treat as success, otherwise count into 'completed' as fallback
      if (s.includes("success")) stats.completed += count;
      else stats.completed += 0; // keep conservative; we could add "other" if you want
    }
  });

  const total = stats.completed + stats.partialSuccess + stats.running + stats.queue + stats.failed + stats.cancelled;
  return { ...stats, total };
}

// --- compute stats directly from jobs array (fallback used when server stats are incomplete) ---
const computeStatsFromJobs = (jobsArray = []) => {
  const s = { completed: 0, partialSuccess: 0, running: 0, queue: 0, failed: 0, cancelled: 0, total: 0 };
  (Array.isArray(jobsArray) ? jobsArray : []).forEach((job) => {
    const st = normalizeStatus(job.status || job.state || job.statusName || "");
    switch (st) {
      case "SUCCESS":
        s.completed += 1;
        break;
      case "PARTIAL_SUCCESS":
        s.partialSuccess += 1;
        break;
      case "IN_PROGRESS":
        s.running += 1;
        break;
      case "IN_QUEUE":
        s.queue += 1;
        break;
      case "FAILED":
        s.failed += 1;
        break;
      case "CANCELLED":
        s.cancelled += 1;
        break;
      default:
        // unknown: try to classify by checking substring just in case
        const raw = String(job.status || "").toLowerCase();
        if (raw.includes("partial") && raw.includes("success")) s.partialSuccess += 1;
        else if (raw.includes("success")) s.completed += 1;
        else if (raw.includes("fail")) s.failed += 1;
        else s.completed += 0;
        break;
    }
  });
  s.total = s.completed + s.partialSuccess + s.running + s.queue + s.failed + s.cancelled;
  return s;
};




//////////////




      // previous code that computed mappedStats
      const mappedStats = mapArrayToStatistics(statsDataRaw);

      // --- fallback: when user requested ALL TIME (dateRangeFilter === "") and server stats
      // appear to be incomplete (e.g. mappedStats.total < number of jobs returned), compute from jobs list
      if (dateRangeFilter === "" && Array.isArray(normalizedJobs)) {
        const jobsCountTotal = normalizedJobs.length;
        if (!mappedStats || mappedStats.total < jobsCountTotal) {
          const computed = computeStatsFromJobs(normalizedJobs);
          // if computed total looks right (>= jobsCountTotal) use it, otherwise fall back to mappedStats
          if (computed.total >= jobsCountTotal) {
            setStatistics(computed);
          } else {
            // If computed total still smaller than jobs returned, still set computed (it's a better approximation)
            setStatistics(computed);
          }
        } else {
          setStatistics(mappedStats);
        }
      } else {
        setStatistics(mappedStats);
      }



//////////////


  const completed = Number(statistics.completed) || 0;
  const partialSuccess = Number(statistics.partialSuccess) || 0;
  const running = Number(statistics.running) || 0;
  const queue = Number(statistics.queue) || 0;
  const failed = Number(statistics.failed) || 0;
  const cancelled = Number(statistics.cancelled) || 0;

  const statusData = useMemo(
    () => [
      { label: "Completed", value: completed, color: "#10b981" },
      { label: "Partial Success", value: partialSuccess, color: "#8b5cf6" }, // purple-ish for partial
      { label: "Running", value: running, color: "#3b82f6" },
      { label: "Queue", value: queue, color: "#f59e0b" },
      { label: "Failed", value: failed, color: "#ef4444" },
      { label: "Cancelled", value: cancelled, color: "#6b7280" },
    ],
    [completed, partialSuccess, running, queue, failed, cancelled]
  );




/////////////


{hovered === "Partial Success" && `Partial Success Jobs: ${format(partialSuccess)}`}



//////////////


  const filteredStatistics = useMemo(() => {
    // If no filters, show last 7 days (default)
    if (!jobNameFilter && !userNameFilter && !statusFilter && dateRangeFilter === "week") return statistics;
    // Filter stats based on filteredJobs
    const stats = { completed: 0, partialSuccess: 0, running: 0, queue: 0, failed: 0, cancelled: 0, total: 0 };
    filteredJobs.forEach(job => {
      switch (normalizeStatus(job.status)) {
        case "SUCCESS": stats.completed++; break;
        case "PARTIAL_SUCCESS": stats.partialSuccess++; break;
        case "IN_PROGRESS": stats.running++; break;
        case "IN_QUEUE": stats.queue++; break;
        case "FAILED": stats.failed++; break;
        case "CANCELLED": stats.cancelled++; break;
        default: break;
      }
    });
    stats.total = stats.completed + stats.partialSuccess + stats.running + stats.queue + stats.failed + stats.cancelled;
    return stats;
  }, [filteredJobs, statistics, jobNameFilter, userNameFilter, statusFilter, dateRangeFilter]);



  ////////////

<option value="partial_success">Partial Success</option>

