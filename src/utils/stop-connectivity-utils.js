(function attachStopConnectivityUtils(globalScope) {
  const DEFAULT_PROFILE = {
    id: 'weekday_peak',
    days: ['tue', 'wed', 'thu'],
    time_start: '07:30',
    time_end: '09:00',
  };

  const DEFAULT_PARAMS = {
    bands_seconds: [900, 1800, 2700],
    band_weights: [0.5, 0.3, 0.2],
    local_score_weights: { corridor: 0.5, headway: 0.5 },
    final_score_weights: { local: 0.5, network: 0.5 },
    network_corridor_cap: 20,
    corridor_count_cap: 8,
    headway_cap_seconds: 2700,
    connectivity_max_seconds: 1800,
    connectivity_walk_edge_limit: 0,
    connectivity_board_penalty_seconds: 600,
  };

  const PRECOMPUTE_STATE = {
    running: false,
    jobId: 0,
  };
  const PRECOMPUTE_PERF = {
    startedAt: 0,
    totalStopMs: 0,
    maxStopMs: 0,
    maxStopId: null,
  };
  const STOP_TASKS = new Map();

  class MinHeap {
    constructor() {
      this.items = [];
    }

    push(entry) {
      this.items.push(entry);
      let index = this.items.length - 1;
      while (index > 0) {
        const parentIndex = (index - 1) >> 1;
        if (this.items[parentIndex].cost <= this.items[index].cost) break;
        [this.items[parentIndex], this.items[index]] = [this.items[index], this.items[parentIndex]];
        index = parentIndex;
      }
    }

    pop() {
      if (!this.items.length) return null;
      const top = this.items[0];
      const last = this.items.pop();
      if (this.items.length && last) {
        this.items[0] = last;
        let index = 0;
        while (true) {
          const left = (index * 2) + 1;
          const right = left + 1;
          let smallest = index;
          if (left < this.items.length && this.items[left].cost < this.items[smallest].cost) smallest = left;
          if (right < this.items.length && this.items[right].cost < this.items[smallest].cost) smallest = right;
          if (smallest === index) break;
          [this.items[index], this.items[smallest]] = [this.items[smallest], this.items[index]];
          index = smallest;
        }
      }
      return top;
    }

    get size() {
      return this.items.length;
    }
  }

  function clampScore(value) {
    return Math.max(0, Math.min(100, Math.round(value)));
  }

  function hashString(value) {
    const text = String(value || '');
    let hash = 2166136261;
    for (let i = 0; i < text.length; i++) {
      hash ^= text.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }
    return (hash >>> 0).toString(16);
  }

  function parseClock(clockText) {
    const match = String(clockText || '').match(/^(\d{2}):(\d{2})$/);
    if (!match) return null;
    return (Number.parseInt(match[1], 10) * 3600) + (Number.parseInt(match[2], 10) * 60);
  }

  function normalizeHeadsign(value) {
    return String(value || '')
      .trim()
      .replace(/\s+/g, ' ')
      .toLocaleLowerCase('tr');
  }

  function buildCorridorKey(trip) {
    const route = String(trip?.s || '').trim() || 'route';
    if (Number.isInteger(trip?.dir)) return `${route}::dir:${trip.dir}`;
    const headsign = normalizeHeadsign(trip?.h || trip?.ln || '');
    return `${route}::head:${headsign || 'default'}`;
  }

  function buildProfile(overrides = {}) {
    return {
      ...DEFAULT_PROFILE,
      ...overrides,
    };
  }

  function buildParams(overrides = {}) {
    return {
      ...DEFAULT_PARAMS,
      ...overrides,
      local_score_weights: {
        ...DEFAULT_PARAMS.local_score_weights,
        ...(overrides.local_score_weights || {}),
      },
      final_score_weights: {
        ...DEFAULT_PARAMS.final_score_weights,
        ...(overrides.final_score_weights || {}),
      },
    };
  }

  function getTrips(ctx) {
    return ctx?.getTrips ? ctx.getTrips() : (ctx?.TRIPS || []);
  }

  function getStopInfo(ctx) {
    return ctx?.getStopInfo ? ctx.getStopInfo() : (ctx?.STOP_INFO || {});
  }

  function getStopDeps(ctx) {
    return ctx?.getStopDeps ? ctx.getStopDeps() : (ctx?.STOP_DEPS || {});
  }

  function getAdj(ctx) {
    return ctx?.getAdj ? ctx.getAdj() : (ctx?.ADJ || {});
  }

  function getFeedId(ctx) {
    return ctx?.feed_id || ctx?.activeCityId || 'active_feed';
  }

  function getConnectivityScores(ctx) {
    return ctx?.getStopConnectivityScores ? ctx.getStopConnectivityScores() : ctx?.AppState?.stopConnectivityScores;
  }

  function setConnectivityScores(ctx, value) {
    if (ctx?.setStopConnectivityScores) {
      ctx.setStopConnectivityScores(value);
      return;
    }
    if (ctx?.AppState) ctx.AppState.stopConnectivityScores = value;
  }

  function buildGtfsHash(ctx) {
    const trips = getTrips(ctx);
    const stopInfo = getStopInfo(ctx);
    const firstTrip = trips[0];
    const lastTrip = trips[trips.length - 1];
    return hashString([
      getFeedId(ctx) || 'feed',
      trips.length || 0,
      Object.keys(stopInfo).length,
      firstTrip?.s || '',
      lastTrip?.s || '',
    ].join('|'));
  }

  function buildSnapshotFileName(ctx, options = {}) {
    const profile = buildProfile(options.profile);
    const feedId = String(getFeedId(ctx))
      .replace(/[^a-zA-Z0-9._-]+/g, '_')
      .replace(/^_+|_+$/g, '') || 'active_feed';
    const profileId = String(profile.id || 'profile')
      .replace(/[^a-zA-Z0-9._-]+/g, '_')
      .replace(/^_+|_+$/g, '') || 'profile';
    const hash = buildGtfsHash(ctx);
    return `${feedId}__${profileId}__${hash}__stop_connectivity.json`;
  }

  function getWindowDepartures(stopId, ctx, profile) {
    const deps = getStopDeps(ctx)?.[stopId] || [];
    const trips = getTrips(ctx);
    const start = parseClock(profile.time_start);
    const end = parseClock(profile.time_end);
    if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return [];
    return deps
      .filter((dep) => Number.isFinite(dep?.[1]) && dep[1] >= start && dep[1] <= end)
      .map((dep) => {
        const trip = trips?.[dep[0]];
        return { dep, trip };
      })
      .filter((entry) => !!entry.trip);
  }

  function computeMedian(values) {
    if (!Array.isArray(values) || !values.length) return null;
    const sorted = values.slice().sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    if (sorted.length % 2 === 1) return sorted[mid];
    return Math.round((sorted[mid - 1] + sorted[mid]) / 2);
  }

  function computeMedianHeadwaySeconds(stopId, ctx, profile) {
    const departures = getWindowDepartures(stopId, ctx, profile)
      .map((entry) => entry.dep[1])
      .sort((a, b) => a - b);
    if (departures.length < 2) return null;
    const gaps = [];
    for (let index = 1; index < departures.length; index++) {
      const gap = departures[index] - departures[index - 1];
      if (gap > 0) gaps.push(gap);
    }
    return computeMedian(gaps);
  }

  function scoreByCap(value, cap) {
    if (!Number.isFinite(value) || value <= 0 || !Number.isFinite(cap) || cap <= 0) return 0;
    return clampScore((value / cap) * 100);
  }

  function scoreHeadway(headwaySeconds, capSeconds) {
    if (!Number.isFinite(headwaySeconds) || headwaySeconds <= 0) return 0;
    const bounded = Math.min(headwaySeconds, capSeconds);
    return clampScore((1 - (bounded / capSeconds)) * 100);
  }

  function getBandKey(seconds, params) {
    if (seconds <= params.bands_seconds[0]) return 'b15';
    if (seconds <= params.bands_seconds[1]) return 'b30';
    if (seconds <= params.bands_seconds[2]) return 'b45';
    return null;
  }

  function getLocalBreakdown(stopId, ctx, profile, params) {
    const departures = getWindowDepartures(stopId, ctx, profile);
    const corridors = new Set();
    departures.forEach(({ trip }) => {
      corridors.add(buildCorridorKey(trip));
    });

    const corridorCount = corridors.size;
    const corridorScore = scoreByCap(corridorCount, params.corridor_count_cap);
    const medianHeadwaySeconds = computeMedianHeadwaySeconds(stopId, ctx, profile);
    const headwayScore = scoreHeadway(medianHeadwaySeconds, params.headway_cap_seconds);
    const score = clampScore(
      (corridorScore * params.local_score_weights.corridor)
      + (headwayScore * params.local_score_weights.headway)
    );

    return {
      score,
      corridor_score: corridorScore,
      headway_score: headwayScore,
      corridor_count: corridorCount,
      median_headway_seconds: medianHeadwaySeconds,
    };
  }

  function getReachability(stopId, ctx, params) {
    const adj = getAdj(ctx);
    const stopInfo = getStopInfo(ctx);
    if (!Object.keys(adj).length || !Object.keys(stopInfo).length) {
      if (typeof ctx?.calcReachabilityFromStop === 'function') {
        const fallbackMaxSecs = Math.max(0, Number(params.connectivity_max_seconds) || 0) || params.bands_seconds[1] || params.bands_seconds[2];
        return ctx.calcReachabilityFromStop(stopId, fallbackMaxSecs, { skipWalk: true }) || [];
      }
      return [];
    }
    const maxSecs = Math.max(0, Number(params.connectivity_max_seconds) || 0) || params.bands_seconds[1] || params.bands_seconds[2];
    const walkEdgeLimit = Math.max(0, Number(params.connectivity_walk_edge_limit) || 0);
    const boardPenalty = Math.max(0, Number(params.connectivity_board_penalty_seconds) || 0);
    const dist = new Map();
    const bestWalks = new Map();
    const lastLine = new Map();
    const queue = new MinHeap();
    queue.push({ stopId, cost: 0, walks: 0, line: null });
    dist.set(stopId, 0);
    bestWalks.set(stopId, 0);
    lastLine.set(stopId, null);

    while (queue.size) {
      const current = queue.pop();
      if (!current) break;
      if (current.cost > (dist.get(current.stopId) ?? Infinity)) continue;
      if (current.cost > maxSecs) continue;
      for (const [nextId, seconds, line] of (adj[current.stopId] || [])) {
        const isWalkEdge = line === '🚶';
        const nextWalks = current.walks + (isWalkEdge ? 1 : 0);
        if (nextWalks > walkEdgeLimit) continue;
        const penalty = !isWalkEdge && current.line !== null && current.line !== line ? boardPenalty : 0;
        const nextCost = current.cost + seconds + penalty;
        const prevCost = dist.get(nextId);
        const prevWalks = bestWalks.get(nextId);
        const shouldUpdate =
          !Number.isFinite(prevCost) ||
          nextCost < prevCost ||
          (nextCost === prevCost && nextWalks < (Number.isFinite(prevWalks) ? prevWalks : Infinity));
        if (!shouldUpdate || nextCost > maxSecs) continue;
        dist.set(nextId, nextCost);
        bestWalks.set(nextId, nextWalks);
        lastLine.set(nextId, isWalkEdge ? current.line : line);
        queue.push({
          stopId: nextId,
          cost: nextCost,
          walks: nextWalks,
          line: isWalkEdge ? current.line : line,
        });
      }
    }

    return Array.from(dist.entries()).map(([reachableStopId, seconds]) => ({
      stopId: reachableStopId,
      seconds,
      info: stopInfo[reachableStopId],
    })).filter((entry) => !!entry.info);
  }

  function getNetworkBreakdown(stopId, ctx, profile, params) {
    const reachable = getReachability(stopId, ctx, params);
    const corridorMinTime = new Map();

    reachable.forEach(({ stopId: reachableStopId, seconds }) => {
      if (!Number.isFinite(seconds) || seconds > params.bands_seconds[2]) return;
      const departures = getWindowDepartures(reachableStopId, ctx, profile);
      departures.forEach(({ trip }) => {
        const key = buildCorridorKey(trip);
        const current = corridorMinTime.get(key);
        if (!Number.isFinite(current) || seconds < current) {
          corridorMinTime.set(key, seconds);
        }
      });
    });

    const bandCounts = { b15: 0, b30: 0, b45: 0 };
    corridorMinTime.forEach((seconds) => {
      const bandKey = getBandKey(seconds, params);
      if (bandKey) bandCounts[bandKey] += 1;
    });

    const weightedRaw =
      (bandCounts.b15 * params.band_weights[0]) +
      (bandCounts.b30 * params.band_weights[1]) +
      (bandCounts.b45 * params.band_weights[2]);

    return {
      score: scoreByCap(weightedRaw, params.network_corridor_cap),
      weighted_raw: Math.round(weightedRaw * 100) / 100,
      unique_corridor_count_total: corridorMinTime.size,
      band_counts: bandCounts,
    };
  }

  function buildStopRecord(stopId, ctx, profile, params) {
    const local = getLocalBreakdown(stopId, ctx, profile, params);
    const network = getNetworkBreakdown(stopId, ctx, profile, params);
    const finalScore = clampScore(
      (local.score * params.final_score_weights.local) +
      (network.score * params.final_score_weights.network)
    );
    return {
      final_score: finalScore,
      local,
      network,
    };
  }

  function getStopConnectivityRecord(stopId, ctx, options = {}) {
    if (!stopId || !getStopDeps(ctx)?.[stopId]?.length) return null;
    const profile = buildProfile(options.profile);
    const params = buildParams(options.params);
    const record = buildStopRecord(stopId, ctx, profile, params);
    if (ctx) {
      let scores = getConnectivityScores(ctx);
      if (!scores) {
        scores = {
          meta: {
            feed_id: getFeedId(ctx),
            schema_version: '1.0.0',
            generated_at: new Date().toISOString(),
            gtfs_hash: buildGtfsHash(ctx),
            profile,
            scoring_params: params,
            validation_summary: null,
          },
          stops: {},
        };
        setConnectivityScores(ctx, scores);
      }
      scores.stops[stopId] = record;
    }
    return record;
  }

  function ensureStopConnectivityRecord(stopId, ctx, options = {}) {
    if (!stopId || !getStopDeps(ctx)?.[stopId]?.length) return;
    if (getConnectivityScores(ctx)?.stops?.[stopId]) return;
    if (STOP_TASKS.has(stopId)) return;
    STOP_TASKS.set(stopId, true);

    const run = () => {
      try {
        const record = getStopConnectivityRecord(stopId, ctx, options);
        dispatchProgress({ stopId, done: true, record });
      } finally {
        STOP_TASKS.delete(stopId);
      }
    };

    if (typeof globalScope.requestIdleCallback === 'function') {
      globalScope.requestIdleCallback(run);
    } else {
      globalScope.setTimeout(run, 0);
    }
  }

  function buildValidationSummary(stops) {
    const records = Object.values(stops || {});
    const finalScores = records
      .map((record) => record.final_score)
      .filter((value) => Number.isFinite(value))
      .sort((a, b) => a - b);
    const suspiciousCorridorCount = records.reduce((count, record) => {
      return count + ((record.local?.corridor_count || 0) <= 1 ? 1 : 0);
    }, 0);
    const percentileIndex = finalScores.length
      ? Math.min(finalScores.length - 1, Math.floor(finalScores.length * 0.9))
      : 0;

    return {
      stop_count: records.length,
      scored_stop_count: finalScores.length,
      median_final_score: computeMedian(finalScores),
      p90_final_score: finalScores.length ? finalScores[percentileIndex] : null,
      suspicious_corridor_count: suspiciousCorridorCount,
    };
  }

  function prioritizeStopIds(stopIds, priorityStopIds) {
    if (!Array.isArray(stopIds) || !stopIds.length || !Array.isArray(priorityStopIds) || !priorityStopIds.length) {
      return stopIds;
    }
    const prioritySet = new Set(priorityStopIds);
    const prioritized = [];
    const rest = [];
    stopIds.forEach((stopId) => {
      if (prioritySet.has(stopId)) prioritized.push(stopId);
      else rest.push(stopId);
    });
    return prioritized.concat(rest);
  }

  function generateStopConnectivitySnapshot(ctx, options = {}) {
    const profile = buildProfile(options.profile);
    const params = buildParams(options.params);
    const stopInfo = getStopInfo(ctx);
    const stopDeps = getStopDeps(ctx);
    const baseStopIds = Object.keys(stopInfo).filter((stopId) => (stopDeps?.[stopId] || []).length > 0);
    const stopIds = prioritizeStopIds(baseStopIds, options.priorityStopIds);
    const stops = {};

    stopIds.forEach((stopId) => {
      stops[stopId] = buildStopRecord(stopId, ctx, profile, params);
    });

    return {
      meta: {
        feed_id: getFeedId(ctx),
        schema_version: '1.0.0',
        generated_at: new Date().toISOString(),
        gtfs_hash: buildGtfsHash(ctx),
        profile,
        scoring_params: params,
        validation_summary: buildValidationSummary(stops),
      },
      stops,
    };
  }

  function dispatchProgress(detail) {
    if (typeof globalScope.dispatchEvent === 'function' && typeof CustomEvent === 'function') {
      globalScope.dispatchEvent(new CustomEvent('stop-connectivity-progress', { detail }));
    }
  }

  function resetPerf() {
    PRECOMPUTE_PERF.startedAt = (typeof performance !== 'undefined' && typeof performance.now === 'function')
      ? performance.now()
      : Date.now();
    PRECOMPUTE_PERF.totalStopMs = 0;
    PRECOMPUTE_PERF.maxStopMs = 0;
    PRECOMPUTE_PERF.maxStopId = null;
  }

  function recordPerf(stopId, durationMs) {
    if (!Number.isFinite(durationMs)) return;
    PRECOMPUTE_PERF.totalStopMs += durationMs;
    if (durationMs > PRECOMPUTE_PERF.maxStopMs) {
      PRECOMPUTE_PERF.maxStopMs = durationMs;
      PRECOMPUTE_PERF.maxStopId = stopId;
    }
  }

  function buildPerfSummary(index, total, done) {
    const now = (typeof performance !== 'undefined' && typeof performance.now === 'function')
      ? performance.now()
      : Date.now();
    const elapsedMs = Math.max(0, now - PRECOMPUTE_PERF.startedAt);
    const processed = Number(index) || 0;
    return {
      processed,
      total: Number(total) || 0,
      elapsedMs: Math.round(elapsedMs),
      avgStopMs: processed > 0 ? Math.round((PRECOMPUTE_PERF.totalStopMs / processed) * 10) / 10 : 0,
      maxStopMs: Math.round(PRECOMPUTE_PERF.maxStopMs * 10) / 10,
      maxStopId: PRECOMPUTE_PERF.maxStopId,
      done: !!done,
    };
  }

  function startStopConnectivityPrecompute(ctx, options = {}) {
    const stopInfo = getStopInfo(ctx);
    const stopDeps = getStopDeps(ctx);
    if (!Object.keys(stopInfo).length || !Object.keys(stopDeps).length || !ctx) return;
    if (PRECOMPUTE_STATE.running) return;
    if (getConnectivityScores(ctx)?.meta?.validation_summary) {
      dispatchProgress({ jobId: PRECOMPUTE_STATE.jobId, index: 0, total: 0, done: true });
      return;
    }
    PRECOMPUTE_STATE.jobId += 1;
    const jobId = PRECOMPUTE_STATE.jobId;
    PRECOMPUTE_STATE.running = true;

    const profile = buildProfile(options.profile);
    const params = buildParams(options.params);
    const baseStopIds = Object.keys(stopInfo).filter((stopId) => (stopDeps?.[stopId] || []).length > 0);
    const stopIds = prioritizeStopIds(baseStopIds, options.priorityStopIds);
    resetPerf();
    const snapshot = {
      meta: {
        feed_id: getFeedId(ctx),
        schema_version: '1.0.0',
        generated_at: new Date().toISOString(),
        gtfs_hash: buildGtfsHash(ctx),
        profile,
        scoring_params: params,
        validation_summary: null,
      },
      stops: {},
    };
    setConnectivityScores(ctx, snapshot);
    const stops = snapshot.stops;
    let index = 0;

    const work = (deadline) => {
      if (jobId !== PRECOMPUTE_STATE.jobId) return;
      const canYield = typeof deadline?.timeRemaining === 'function';
      while (index < stopIds.length && (!canYield || deadline.timeRemaining() > 4)) {
        const stopId = stopIds[index++];
        const startedAt = (typeof performance !== 'undefined' && typeof performance.now === 'function')
          ? performance.now()
          : Date.now();
        stops[stopId] = buildStopRecord(stopId, ctx, profile, params);
        recordPerf(stopId, ((typeof performance !== 'undefined' && typeof performance.now === 'function')
          ? performance.now()
          : Date.now()) - startedAt);
      }

      dispatchProgress({
        jobId,
        index,
        total: stopIds.length,
        done: index >= stopIds.length,
        perf: buildPerfSummary(index, stopIds.length, index >= stopIds.length),
      });

      if (index < stopIds.length) {
        if (typeof globalScope.requestIdleCallback === 'function') {
          globalScope.requestIdleCallback(work);
        } else {
          globalScope.setTimeout(work, 0);
        }
        return;
      }

      PRECOMPUTE_STATE.running = false;
      snapshot.meta.validation_summary = buildValidationSummary(stops);
      if (typeof options.onComplete === 'function') options.onComplete(snapshot);
      dispatchProgress({
        jobId,
        index,
        total: stopIds.length,
        done: true,
        perf: buildPerfSummary(index, stopIds.length, true),
      });
    };

    if (typeof globalScope.requestIdleCallback === 'function') {
      globalScope.requestIdleCallback(work);
    } else {
      globalScope.setTimeout(work, 0);
    }
  }

  function reset() {
    PRECOMPUTE_STATE.jobId += 1;
    PRECOMPUTE_STATE.running = false;
    STOP_TASKS.clear();
  }

  const api = {
    DEFAULT_PROFILE,
    DEFAULT_PARAMS,
    buildCorridorKey,
    buildSnapshotFileName,
    ensureStopConnectivityRecord,
    getStopConnectivityRecord,
    generateStopConnectivitySnapshot,
    startStopConnectivityPrecompute,
    reset,
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }

  if (globalScope) {
    globalScope.StopConnectivityUtils = api;
  }
})(typeof window !== 'undefined' ? window : globalThis);
