window.ServiceManager = (function () {
  let initialized = false;
  const CALENDAR_DAY_KEYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
  const WEEKDAY_LABELS = ['Pzt', 'Sal', '\u00c7ar', 'Per', 'Cum', 'Cmt', 'Paz'];
  const SERVICE_STATUS_RANK = { active: 0, future: 1, passive: 2, expired: 3 };
  const SERVICE_STATUS_LABELS = {
    active: 'AKTİF',
    future: 'PLANLI',
    expired: 'GEÇMİŞ',
    passive: 'PASİF',
  };

  function getCtx() {
    return window.LegacyServiceBridge?.getContext?.() || null;
  }

  function translate(key, fallback = '') {
    return window.I18n?.t?.(key, fallback) || fallback || key;
  }

  function normalizeServiceIds(currentIds) {
    return currentIds instanceof Set ? currentIds : new Set(currentIds || []);
  }

  function parseGtfsDateToIso(value) {
    const raw = String(value || '').trim();
    if (raw.length !== 8) return '';
    return `${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}`;
  }

  function summarizeServiceStatuses(calendarRows, selectedDate, currentIds) {
    const serviceMap = new Map();
    (calendarRows || []).forEach((row) => {
      const serviceId = (row.service_id || '').trim();
      if (!serviceId) return;
      const start = parseGtfsDateToIso(row.start_date);
      const end = parseGtfsDateToIso(row.end_date);
      const current = serviceMap.get(serviceId);
      if (!current) {
        serviceMap.set(serviceId, { serviceId, start, end, status: 'passive' });
        return;
      }
      if (start && (!current.start || start < current.start)) current.start = start;
      if (end && (!current.end || end > current.end)) current.end = end;
    });

    const activeSet = normalizeServiceIds(currentIds);
    const entries = Array.from(serviceMap.values()).map((entry) => {
      let status = 'passive';
      if (activeSet.has(entry.serviceId)) status = 'active';
      else if (entry.start && selectedDate < entry.start) status = 'future';
      else if (entry.end && selectedDate > entry.end) status = 'expired';
      return { ...entry, status };
    });

    entries.sort((left, right) => {
      if (SERVICE_STATUS_RANK[left.status] !== SERVICE_STATUS_RANK[right.status]) {
        return SERVICE_STATUS_RANK[left.status] - SERVICE_STATUS_RANK[right.status];
      }
      return left.serviceId.localeCompare(right.serviceId, 'tr');
    });

    return {
      entries,
      counts: {
        active: entries.filter((entry) => entry.status === 'active').length,
        future: entries.filter((entry) => entry.status === 'future').length,
        expired: entries.filter((entry) => entry.status === 'expired').length,
      },
    };
  }

  function bindDatePicker() {
    const picker = document.getElementById('service-date-picker');
    if (!picker || picker.dataset.bound === 'true') return;
    picker.dataset.bound = 'true';
    picker.addEventListener('change', async (event) => {
      await handleDateChange(event.target.value);
    });
  }

  function bindStatusBadges() {
    const badges = document.getElementById('service-status-badges');
    if (!badges || badges.dataset.bound === 'true') return;
    badges.dataset.bound = 'true';
    badges.addEventListener('click', async (event) => {
      const badge = event.target.closest('[data-service-action]');
      if (!badge) return;
      if (badge.dataset.serviceAction === 'all') await applyAllServices();
    });
  }

  function init() {
    if (initialized) return;
    initialized = true;
    bindDatePicker();
    bindStatusBadges();
  }

  function getSpecificityScore(row) {
    const activeDays = CALENDAR_DAY_KEYS.filter((k) => row[k] === '1').length || 7;
    const start = parseInt(row.start_date, 10);
    const end = parseInt(row.end_date, 10);
    const startDate = new Date(
      `${String(row.start_date).slice(0, 4)}-${String(row.start_date).slice(4, 6)}-${String(row.start_date).slice(6, 8)}T00:00:00`
    );
    const endDate = new Date(
      `${String(row.end_date).slice(0, 4)}-${String(row.end_date).slice(4, 6)}-${String(row.end_date).slice(6, 8)}T00:00:00`
    );
    const dateRangeSpan = Math.max(1, Math.round((endDate - startDate) / 86400000) + 1);
    return activeDays * dateRangeSpan;
  }

  function getServiceIdsForDate(dateStr, calendarRows, calendarDateRows) {
    const date = new Date(`${dateStr}T00:00:00`);
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const dayName = dayNames[date.getDay()];
    const dateNum = parseInt(dateStr.replace(/-/g, ''), 10);
    const ids = new Set();

    for (const row of (calendarDateRows || [])) {
      if (parseInt(row.date, 10) === dateNum && row.exception_type === '1') ids.add(row.service_id);
    }

    const removed = new Set();
    for (const row of (calendarDateRows || [])) {
      if (parseInt(row.date, 10) === dateNum && row.exception_type === '2') removed.add(row.service_id);
    }

    const candidates = [];
    for (const row of (calendarRows || [])) {
      if (row[dayName] !== '1') continue;
      const start = parseInt(row.start_date, 10);
      const end = parseInt(row.end_date, 10);
      if (dateNum >= start && dateNum <= end && !removed.has(row.service_id)) {
        candidates.push({ serviceId: row.service_id, score: getSpecificityScore(row) });
      }
    }

    for (const candidate of candidates) {
      ids.add(candidate.serviceId);
    }

    return ids;
  }

  function getLatestDateInCalendar(calendarRows) {
    let max = 0;
    for (const row of (calendarRows || [])) {
      const end = parseInt(row.end_date || '0', 10);
      if (end > max) max = end;
    }
    if (!max) return new Date().toISOString().slice(0, 10);
    const value = String(max);
    return `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}`;
  }

  function autoSelectAndAdaptService(calendarRows, calendarDateRows) {
    const today = new Date().toISOString().slice(0, 10);
    let ids = getServiceIdsForDate(today, calendarRows, calendarDateRows);
    const adapted = ids.size === 0;

    if (adapted) {
      const latest = getLatestDateInCalendar(calendarRows);
      ids = getServiceIdsForDate(latest, calendarRows, calendarDateRows);
      if (!ids.size) {
        const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
        const dayName = dayNames[new Date().getDay()];
        for (const row of (calendarRows || [])) {
          if (row[dayName] === '1') ids.add(row.service_id);
        }
      }
      if (!ids.size && calendarRows.length) ids.add(calendarRows[0].service_id);
    }

    const firstId = [...ids][0] || 'all';
    const reason = adapted ? translate('serviceAdaptedReason', 'Bugün için servis bulunamadı, takvim geçmiş veriye uyarlandı.') : '';
    return { serviceId: firstId, adapted, serviceIds: ids, reason };
  }

  function buildServiceOptions(calendarRows, calendarDateRows) {
    const options = [];
    const seen = new Set();

    (calendarRows || []).forEach((row) => {
      const serviceId = (row.service_id || '').trim();
      if (!serviceId || seen.has(serviceId)) return;
      seen.add(serviceId);
      const days = CALENDAR_DAY_KEYS
        .map((key, idx) => row[key] === '1' ? WEEKDAY_LABELS[idx] : null)
        .filter(Boolean);
      const start = (row.start_date || '').trim();
      const end = (row.end_date || '').trim();
      const labelParts = [serviceId];
      if (days.length) labelParts.push(days.join('-'));
      if (start && end) labelParts.push(`${start} \u2192 ${end}`);
      options.push({ id: serviceId, label: labelParts.join(' \u00b7 ') });
    });

    (calendarDateRows || []).forEach((row) => {
      const serviceId = (row.service_id || '').trim();
      if (!serviceId || seen.has(serviceId)) return;
      seen.add(serviceId);
      options.push({ id: serviceId, label: `${serviceId} \u00b7 calendar_dates` });
    });

    return options;
  }

  function renderServiceDatePicker(calendarRows, calendarDateRows, currentIds) {
    const ctx = getCtx();
    const wrap = document.getElementById('service-selector-wrap');
    const picker = document.getElementById('service-date-picker');
    const info = document.getElementById('service-date-info');
    const badges = document.getElementById('service-status-badges');
    if (!wrap || !picker) return;

    wrap.classList.remove('hidden');
    if (!calendarRows || !calendarRows.length) {
      picker.value = '';
      picker.min = '';
      picker.max = '';
      picker.disabled = true;
      if (info) info.textContent = translate('serviceNoCalendarData', 'No service calendar data · All');
      if (badges) badges.innerHTML = `<span class="service-badge passive">${translate('serviceNoCalendarShort', 'No calendar data')}</span>`;
      if (ctx) ctx.setCalendarCache({ rows: [], dateRows: [] });
      return;
    }

    picker.disabled = false;
    if (ctx) ctx.setCalendarCache({ rows: calendarRows, dateRows: calendarDateRows || [] });

    let minDate = '9999-99-99';
    let maxDate = '0000-00-00';
    for (const row of calendarRows) {
      const start = String(row.start_date || '');
      const end = String(row.end_date || '');
      if (start.length === 8) {
        const startDate = `${start.slice(0, 4)}-${start.slice(4, 6)}-${start.slice(6, 8)}`;
        if (startDate < minDate) minDate = startDate;
      }
      if (end.length === 8) {
        const endDate = `${end.slice(0, 4)}-${end.slice(4, 6)}-${end.slice(6, 8)}`;
        if (endDate > maxDate) maxDate = endDate;
      }
    }

    picker.min = minDate !== '9999-99-99' ? minDate : '';
    picker.max = maxDate !== '0000-00-00' ? maxDate : '';
    if (!picker.value) picker.value = maxDate !== '0000-00-00' ? maxDate : new Date().toISOString().slice(0, 10);

    const selectedDate = picker.value || new Date().toISOString().slice(0, 10);
    const summary = summarizeServiceStatuses(calendarRows, selectedDate, currentIds);
    if (info) {
      info.textContent = translate('serviceStatusSummary', '{date} · {active} active · {future} scheduled · {expired} expired')
        .replace('{date}', selectedDate)
        .replace('{active}', String(summary.counts.active))
        .replace('{future}', String(summary.counts.future))
        .replace('{expired}', String(summary.counts.expired));
    }
    if (badges) {
      const allSelected = !currentIds || currentIds.size === 0 || (currentIds.size === 1 && currentIds.has('all'));
      const badgeEntries = [
        `<button type="button" class="service-badge ${allSelected ? 'active' : 'passive'} service-badge-button" data-service-action="all" onclick="window.ServiceManager?.applyAllServices?.()">${translate('serviceAll', 'All')}</button>`,
      ];
      badgeEntries.push(...summary.entries.slice(0, 10).map((entry) => {
        const label = {
          active: translate('serviceBadgeActive', 'ACTIVE'),
          future: translate('serviceBadgeFuture', 'SCHEDULED'),
          expired: translate('serviceBadgeExpired', 'EXPIRED'),
          passive: translate('serviceBadgePassive', 'PASSIVE'),
        }[entry.status] || translate('serviceBadgePassive', 'PASSIVE');
        const isSelected = currentIds && currentIds.has(entry.serviceId) && !allSelected;
        const selectedClass = isSelected ? ' selected' : '';
        const safeId = entry.serviceId.replace(/'/g, "\\'");
        return `<button type="button" class="service-badge ${entry.status}${selectedClass} service-badge-button" title="${entry.serviceId}" onclick="window.ServiceManager?.applyService?.('${safeId}')">${entry.serviceId} \u00b7 ${label}</button>`;
      }));
      if (summary.entries.length > 10) {
        badgeEntries.push(`<span class="service-badge passive">+${summary.entries.length - 10} ${translate('serviceMore', 'services')}</span>`);
      }
      badges.innerHTML = badgeEntries.join('');
    }
  }

  function getActiveServiceLabel() {
    const ctx = getCtx();
    if (!ctx) return translate('serviceAll', 'All');
    const activeServiceId = ctx.getActiveServiceId();
    if (activeServiceId === 'all') return translate('serviceAll', 'All');
    const match = ctx.getActiveServiceOptions().find((option) => option.id === activeServiceId);
    return ctx.displayText(match?.label || activeServiceId || translate('serviceAll', 'All'));
  }

  async function handleDateChange(dateStr) {
    const ctx = getCtx();
    if (!ctx || !dateStr) return;

    const cache = ctx.getCalendarCache();
    if (!cache.rows.length) return;

    const ids = getServiceIdsForDate(dateStr, cache.rows, cache.dateRows);
    if (!ids.size) {
      ctx.showToast('Bu tarihte sefer bulunamadı', 'warning');
      return;
    }

    ctx.setActiveServiceIds(ids);
    ctx.setActiveServiceId([...ids][0] || 'all');
    renderServiceDatePicker(cache.rows, cache.dateRows, ids);

    const activeCity = ctx.getActiveCity();
    if (activeCity?.source === 'upload') {
      const payload = ctx.getUploadedCityPayload(activeCity.id);
      if (payload) await ctx.loadGtfsIntoSim(payload.files, payload.fileName, ctx.getActiveServiceId(), ids);
    } else if (activeCity?.source === 'builtin') {
      const payload = await ctx.getBuiltinGtfsPayload(activeCity).catch(() => null);
      if (payload) await ctx.loadGtfsIntoSim(payload.files, payload.fileName, ctx.getActiveServiceId(), ids);
    }
  }

  async function applyService(serviceId) {
    const ctx = getCtx();
    if (!ctx || !serviceId) return;
    const ids = new Set([serviceId]);
    ctx.setActiveServiceId(serviceId);
    ctx.setActiveServiceIds(ids);
    const cache = ctx.getCalendarCache();
    renderServiceDatePicker(cache.rows || [], cache.dateRows || [], ids);

    const activeCity = ctx.getActiveCity();
    if (activeCity?.source === 'upload') {
      const payload = ctx.getUploadedCityPayload(activeCity.id);
      if (payload) await ctx.loadGtfsIntoSim(payload.files, payload.fileName, serviceId, ids);
    } else if (activeCity?.source === 'builtin') {
      const payload = await ctx.getBuiltinGtfsPayload(activeCity).catch(() => null);
      if (payload) await ctx.loadGtfsIntoSim(payload.files, payload.fileName, serviceId, ids);
    }
  }

  async function applyAllServices() {
    const ctx = getCtx();
    if (!ctx) return;
    ctx.setActiveServiceId('all');
    ctx.setActiveServiceIds(new Set(['all']));
    const cache = ctx.getCalendarCache();
    renderServiceDatePicker(cache.rows || [], cache.dateRows || [], ctx.getActiveServiceIds());

    const activeCity = ctx.getActiveCity();
    if (activeCity?.source === 'upload') {
      const payload = ctx.getUploadedCityPayload(activeCity.id);
      if (payload) await ctx.loadGtfsIntoSim(payload.files, payload.fileName, 'all', new Set(['all']));
    } else if (activeCity?.source === 'builtin') {
      const payload = await ctx.getBuiltinGtfsPayload(activeCity).catch(() => null);
      if (payload) await ctx.loadGtfsIntoSim(payload.files, payload.fileName, 'all', new Set(['all']));
    }
  }

  return {
    parseGtfsDateToIso,
    summarizeServiceStatuses,
    getServiceIdsForDate,
    getLatestDateInCalendar,
    autoSelectAndAdaptService,
    buildServiceOptions,
    renderServiceDatePicker,
    getActiveServiceLabel,
    applyService,
    applyAllServices,
    handleDateChange,
    init,
  };
})();
