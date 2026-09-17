(function () {
  const TYPES = ["DV360 Line Item", "CM360 Placement", "Geography", "Schedule", "Manual Entry"];
  const MANUAL_ID_TYPES = [
    "DV360 Line Item ID",
    "Meta Ad Set ID",
    "Google Ads Ad Group ID",
    "CM360 Placement ID",
    "CM360 Ad ID",
    "TTD Ad Group ID",
    "Snapchat Ad Set ID",
    "Reddit Ad Set ID",
    "Ad Group (Google Ads)",
    "Ad Group (Pinterest)",
    "Ad Group (TTD)",
    "Ad Group (X)",
    "Ad Groups (TikTok)",
    "Ad Priority",
    "Ad Set (Amazon)",
    "Ad Set (Meta)",
    "Ad Set (Snapchat)",
    "Asset Groups (Google Ads)",
    "CM360 1st Party Audience",
    "CM360 Dynamic Targeting Key",
  ];
  const WEEKDAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
  const WEEKEND = ["Saturday", "Sunday"];
  const SCHEDULE_PRESETS = {
    "Weekday Morning": { timezone: "Europe/London", days: WEEKDAYS, startTime: "08:00", endTime: "12:00" },
    Afternoon: { timezone: "Europe/London", days: WEEKDAYS, startTime: "12:00", endTime: "17:00" },
    Evening: { timezone: "Europe/London", days: WEEKDAYS, startTime: "17:00", endTime: "22:00" },
    Weekend: { timezone: "Europe/London", days: WEEKEND, startTime: "00:00", endTime: "24:00" },
    "Weekend All Day": { timezone: "Europe/London", days: WEEKEND, startTime: "00:00", endTime: "24:00" },
  };

  function clone(value) { return JSON.parse(JSON.stringify(value)); }
  function clean(value) { return String(value == null ? "" : value).trim(); }
  function key(value) { return clean(value).toLocaleLowerCase(); }
  function id(prefix) { return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`; }
  function splitValues(value) { return String(value || "").split(/[\n,]/).map(clean).filter(Boolean); }
  function mappingFor(segment, type) { return (segment?.mappings || []).find((mapping) => mapping.type === type) || null; }
  function fixtureList(type, fixtures) { return type === "DV360 Line Item" ? fixtures?.dv360LineItems || [] : type === "CM360 Placement" ? fixtures?.cm360Placements || [] : []; }

  function normalizeValue(type, input, source, importSource, fixtures) {
    if (type === "Schedule") {
      const presetName = typeof input === "string" ? clean(input) : clean(input?.name || input?.preset);
      const preset = SCHEDULE_PRESETS[presetName];
      const value = typeof input === "object" && input ? input : {};
      return {
        id: value.id || id("schedule-value"),
        name: presetName || "Custom schedule",
        timezone: clean(value.timezone) || preset?.timezone || "Europe/London",
        days: Array.isArray(value.days) && value.days.length ? [...value.days] : [...(preset?.days || [])],
        startTime: clean(value.startTime) || preset?.startTime || "",
        endTime: clean(value.endTime) || preset?.endTime || "",
        source: value.source || source || "Manual",
        importSource: value.importSource || importSource || "",
      };
    }
    const raw = typeof input === "object" && input ? input : { platformId: input, label: input, value: input };
    if (type === "Geography" || type === "Manual Entry") {
      const label = clean(raw.label || raw.value || raw.platformId);
      return { id: raw.id || id(type === "Geography" ? "geo-value" : "manual-value"), value: label, label, source: raw.source || source || "Manual", importSource: raw.importSource || importSource || "" };
    }
    const platformId = clean(raw.platformId || raw.value || raw.label);
    const fixture = fixtureList(type, fixtures).find((item) => item.platformId === platformId);
    return {
      id: raw.id || fixture?.id || id(type === "DV360 Line Item" ? "dv-value" : "cm-value"),
      platformId,
      label: clean(raw.label) || fixture?.name || platformId,
      campaign: clean(raw.campaign) || fixture?.campaign || "",
      site: clean(raw.site) || fixture?.site || "",
      format: clean(raw.format) || fixture?.format || "",
      source: raw.source || source || (fixture ? `Connected ${type.startsWith("DV360") ? "DV360" : "CM360"}` : "Manual"),
      importSource: raw.importSource || importSource || "",
      resolved: Boolean(fixture),
    };
  }

  function valueKey(type, value) {
    if (type === "Schedule") return "schedule";
    if (type === "Geography" || type === "Manual Entry") return key(value.value || value.label);
    return key(value.platformId);
  }

  function mergeValues(segment, type, inputs, source, importSource, fixtures) {
    const next = clone(segment);
    next.mappings = Array.isArray(next.mappings) ? next.mappings : [];
    let mapping = mappingFor(next, type);
    if (!mapping) { mapping = { type, values: [] }; next.mappings.push(mapping); }
    const merged = new Map((mapping.values || []).map((value) => [valueKey(type, value), value]));
    (inputs || []).forEach((input) => {
      const value = normalizeValue(type, input, source, importSource, fixtures);
      const dedupeKey = valueKey(type, value);
      if (dedupeKey && !merged.has(dedupeKey)) merged.set(dedupeKey, value);
    });
    mapping.values = [...merged.values()];
    return next;
  }

  function removeMapping(segment, type) {
    return { ...clone(segment), mappings: (segment.mappings || []).filter((mapping) => mapping.type !== type) };
  }

  function scheduleValid(value) {
    if (!value || !clean(value.timezone) || !Array.isArray(value.days) || !value.days.length) return false;
    if (value.days.some((day) => ![...WEEKDAYS, ...WEEKEND].includes(day))) return false;
    try { new Intl.DateTimeFormat("en-GB", { timeZone: value.timezone }).format(new Date()); } catch (_error) { return false; }
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(clean(value.startTime))) return false;
    if (!(clean(value.endTime) === "24:00" || /^([01]\d|2[0-3]):[0-5]\d$/.test(clean(value.endTime)))) return false;
    return value.startTime !== value.endTime;
  }

  function segmentIssues(segment, allSegments) {
    const issues = [];
    if (!clean(segment?.name)) issues.push("Segment name is required.");
    if ((allSegments || []).some((item) => item.id !== segment?.id && key(item.name) === key(segment?.name))) issues.push("Segment name must be unique.");
    const mappings = Array.isArray(segment?.mappings) ? segment.mappings : [];
    if (!mappings.length) issues.push("Add at least one targeting mapping.");
    const types = new Set();
    mappings.forEach((mapping) => {
      if (!TYPES.includes(mapping.type)) issues.push("A targeting mapping has an unsupported type.");
      if (types.has(mapping.type)) issues.push(`Only one ${mapping.type} block is allowed.`);
      types.add(mapping.type);
      if (!(mapping.values || []).length) issues.push(`${mapping.type} requires at least one value.`);
      if (mapping.type === "Schedule" && !scheduleValid(mapping.values?.[0])) issues.push("Schedule requires a valid timezone, days, and time range.");
      if (mapping.type === "Manual Entry" && !MANUAL_ID_TYPES.includes(mapping.idType)) issues.push("Manual Entry requires a valid ID Type.");
      if (["DV360 Line Item", "CM360 Placement"].includes(mapping.type) && (mapping.values || []).some((value) => !clean(value.platformId))) issues.push(`${mapping.type} contains an empty platform ID.`);
      if (["Geography", "Manual Entry"].includes(mapping.type) && (mapping.values || []).some((value) => !clean(value.value || value.label))) issues.push(`${mapping.type} contains an empty value.`);
    });
    return [...new Set(issues)];
  }

  function parseCsv(text) {
    const rows = [];
    let row = [], cell = "", quoted = false;
    const source = String(text || "");
    for (let index = 0; index < source.length; index += 1) {
      const char = source[index];
      if (char === '"' && quoted && source[index + 1] === '"') { cell += '"'; index += 1; }
      else if (char === '"') quoted = !quoted;
      else if (char === "," && !quoted) { row.push(cell.trim()); cell = ""; }
      else if ((char === "\n" || char === "\r") && !quoted) {
        if (char === "\r" && source[index + 1] === "\n") index += 1;
        row.push(cell.trim()); cell = "";
        if (row.some(Boolean)) rows.push(row);
        row = [];
      } else cell += char;
    }
    row.push(cell.trim());
    if (row.some(Boolean)) rows.push(row);
    return rows;
  }

  function objectsFromCsv(text) {
    const rows = parseCsv(text);
    if (!rows.length) return { columns: [], rows: [] };
    const columns = rows[0].map(clean);
    return { columns, rows: rows.slice(1).map((cells) => Object.fromEntries(columns.map((column, index) => [column, clean(cells[index])])))};
  }

  function scheduleFromLabel(label) {
    const preset = SCHEDULE_PRESETS[clean(label)];
    return preset ? { name: clean(label), ...clone(preset) } : null;
  }

  function segmentFromMappedRow(row, columnMap, fixtures, importSource) {
    const name = clean(row[columnMap.name]);
    let segment = { id: id("segment"), name, enabled: true, mappings: [] };
    const specs = [
      ["DV360 Line Item", "dv360"],
      ["CM360 Placement", "cm360"],
      ["Geography", "geography"],
    ];
    specs.forEach(([type, field]) => {
      const values = splitValues(row[columnMap[field]]);
      if (values.length) segment = mergeValues(segment, type, values, "Import", importSource, fixtures);
    });
    const scheduleLabel = clean(row[columnMap.schedule]);
    if (scheduleLabel) {
      const schedule = scheduleFromLabel(scheduleLabel);
      if (schedule) segment = mergeValues(segment, "Schedule", [schedule], "Import", importSource, fixtures);
      else segment.importScheduleError = `Unknown schedule preset: ${scheduleLabel}`;
    }
    return segment;
  }

  function importRows(rows, columnMap, fixtures, importSource, existingSegments) {
    const existingNames = new Set((existingSegments || []).map((segment) => key(segment.name)));
    const importNameCounts = (rows || []).reduce((counts, row) => {
      const nameKey = key(row[columnMap.name]);
      if (nameKey) counts.set(nameKey, (counts.get(nameKey) || 0) + 1);
      return counts;
    }, new Map());
    return (rows || []).map((row, index) => {
      const segment = segmentFromMappedRow(row, columnMap, fixtures, importSource);
      const issues = [];
      if (!segment.name) issues.push("Segment name is required.");
      const nameKey = key(segment.name);
      if (nameKey && existingNames.has(nameKey)) issues.push("Segment name already exists.");
      if (nameKey && importNameCounts.get(nameKey) > 1) issues.push("Duplicate Segment name in import.");
      if (!(segment.mappings || []).length) issues.push("At least one targeting value is required.");
      if (segment.importScheduleError) issues.push(segment.importScheduleError);
      issues.push(...segmentIssues(segment, []).filter((issue) => !["Segment name is required.", "Add at least one targeting mapping."].includes(issue)));
      return { index, segment, issues: [...new Set(issues)] };
    });
  }

  function minutes(value) {
    if (value === "24:00") return 1440;
    const [hour, minute] = String(value || "0:0").split(":").map(Number);
    return (hour * 60) + minute;
  }

  function scheduleActive(schedule, now) {
    if (!scheduleValid(schedule)) return false;
    try {
      const parts = new Intl.DateTimeFormat("en-GB", { timeZone: schedule.timezone, weekday: "long", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(now || new Date());
      const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
      const current = (Number(values.hour) * 60) + Number(values.minute);
      return schedule.days.includes(values.weekday) && current >= minutes(schedule.startTime) && current < minutes(schedule.endTime);
    } catch (_error) { return false; }
  }

  function mappingText(mapping) {
    if (!mapping) return "";
    if (mapping.type === "Schedule") return mapping.values?.[0]?.name || "";
    return (mapping.values || []).map((value) => ["Geography", "Manual Entry"].includes(mapping.type) ? value.value || value.label : value.platformId).join(",");
  }

  window.cm360DcoSegmentModel = {
    TYPES,
    MANUAL_ID_TYPES,
    SCHEDULE_PRESETS,
    clone,
    splitValues,
    mappingFor,
    normalizeValue,
    mergeValues,
    removeMapping,
    scheduleValid,
    segmentIssues,
    objectsFromCsv,
    scheduleFromLabel,
    segmentFromMappedRow,
    importRows,
    scheduleActive,
    mappingText,
  };
})();
