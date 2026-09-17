(function () {
  const fixtures = window.cm360DcoConnectedPlatformFixtures || { accounts: {}, cm360Placements: [], dv360LineItems: [], segmentSeeds: [], segmentAutomationFeeds: [] };
  const model = window.cm360DcoSegmentModel;
  const SEGMENT_TYPES = model?.TYPES || ["DV360 Line Item", "CM360 Placement", "Geography", "Schedule"];

  function clone(value) { return JSON.parse(JSON.stringify(value)); }
  function escapeHtml(value) { return String(value == null ? "" : value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;"); }
  function chip(label, tone) { return `<span class="chip ${escapeHtml(tone || "gray")}">${escapeHtml(label)}</span>`; }
  function localId(prefix) { return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`; }
  function variantRenditions(variant) { return Array.isArray(variant?.renditions) ? variant.renditions : (variant?.formats || []).map((format, index) => ({ id: `${variant.id}-rendition-${index + 1}`, format, approvalStatus: "approved" })); }
  function renditionTemplateId(rendition) { return rendition?.templateId || `wool-coat-template-${rendition?.format || "unknown"}`; }
  function renditionTemplateName(rendition) { return rendition?.templateName || `Wool Coat Template - ${rendition?.format || "Unknown"}`; }
  function deliveryKey(state, rendition) { return state.creativeType === "dynamic_creative" ? renditionTemplateId(rendition) : rendition.id; }
  function variantById(state, variantId) { return state.activationPackage.approvedVariants.find((variant) => variant.id === variantId) || null; }
  function assignmentFor(state, variantId) { return state.assignments.find((assignment) => assignment.variantId === variantId) || null; }
  function segmentById(state, segmentId) { return state.segments.find((segment) => segment.id === segmentId) || null; }
  function mappingFor(segment, type) { return model.mappingFor(segment, type); }
  function deliveriesFor(state, rendition) { const key = deliveryKey(state, rendition); return (state.cm360.deliveryAssignments || []).filter((item) => item.renditionId === key); }
  function deliveryFor(state, rendition) { return deliveriesFor(state, rendition)[0] || null; }
  function detectedPlacement(value) { return fixtures.cm360Placements.find((item) => item.platformId === value?.platformId || item.id === value?.id) || null; }
  function placementById(state, placementId) { return fixtures.cm360Placements.find((item) => item.id === placementId || item.platformId === placementId) || (state.cm360.createdPlacements || []).find((item) => item.id === placementId) || (state.cm360.deliveryAssignments || []).find((item) => item.placementId === placementId)?.placementSnapshot || null; }
  function usedByCount(state, segmentId) { return state.assignments.filter((assignment) => assignment.segmentId === segmentId).length; }
  function activeRenditionsFor(state, variant) {
    const active = new Set(assignmentFor(state, variant.id)?.activeRenditionIds || []);
    return variantRenditions(variant).filter((rendition) => active.has(rendition.id));
  }
  function activeTrafficRows(state) { return state.activationPackage.approvedVariants.flatMap((variant) => activeRenditionsFor(state, variant).map((rendition) => ({ variant, rendition, delivery: deliveryFor(state, rendition), deliveries: deliveriesFor(state, rendition) }))); }
  function traffickingRows(state) {
    const rows = activeTrafficRows(state);
    if (state.creativeType !== "dynamic_creative") return rows;
    const templates = new Map();
    rows.forEach((row) => {
      const templateId = renditionTemplateId(row.rendition);
      if (!templates.has(templateId)) templates.set(templateId, { ...row, templateId, templateName: renditionTemplateName(row.rendition), members: [] });
      templates.get(templateId).members.push(row);
    });
    return [...templates.values()].map((row) => ({ ...row, delivery: deliveryFor(state, row.rendition), deliveries: deliveriesFor(state, row.rendition) }));
  }
  function activationStats(state) {
    const variants = state.activationPackage.approvedVariants;
    const totalRenditions = variants.reduce((total, variant) => total + variantRenditions(variant).length, 0);
    const activeVariants = variants.filter((variant) => activeRenditionsFor(state, variant).length);
    const activeRenditionCount = activeVariants.reduce((total, variant) => total + activeRenditionsFor(state, variant).length, 0);
    return { totalVariants: variants.length, activeVariantCount: activeVariants.length, inactiveVariantCount: variants.length - activeVariants.length, totalRenditions, activeRenditionCount, inactiveRenditionCount: totalRenditions - activeRenditionCount };
  }

  function normalizeSegment(input) {
    let segment = { id: input.id || localId("segment"), name: input.name || "", enabled: input.enabled !== false, mappings: [] };
    (input.mappings || []).forEach((mapping) => {
      segment = model.mergeValues(segment, mapping.type, mapping.values || [], null, null, fixtures);
      if (mapping.type === "Manual Entry") mappingFor(segment, "Manual Entry").idType = mapping.idType || "";
    });
    return segment;
  }
  function initialSegments() { return []; }
  function initialRules() { return []; }
  function initialGroups() { return []; }
  function initialAssignment(variant) { return { variantId: variant.id, segmentId: "", activeRenditionIds: variantRenditions(variant).map((rendition) => rendition.id) }; }
  function initialAssignments(pkg) { return pkg.approvedVariants.map(initialAssignment); }
  function normalizeState(state) {
    const retiredPlacementIds = new Set(["cmpl-homepage-hero", "cmpl-sports-ros", "cmpl-retargeting-placement"]);
    const retiredPresetSegmentIds = new Set(["segment-professional-birmingham", "segment-weekend-travelers", "segment-regional-loyalty"]);
    state.segments = Array.isArray(state.segments) ? state.segments.filter((segment) => !retiredPresetSegmentIds.has(segment.id)).map(normalizeSegment) : initialSegments();
    state.selectedVariantIds = Array.isArray(state.selectedVariantIds) ? state.selectedVariantIds : [];
    state.expandedVariantIds = Array.isArray(state.expandedVariantIds) ? state.expandedVariantIds : [];
    state.expandedTrafficIds = Array.isArray(state.expandedTrafficIds) ? state.expandedTrafficIds : [];
    state.assignments = Array.isArray(state.assignments) ? state.assignments : [];
    const retiredAssignedVariantIds = new Set();
    state.activationPackage.approvedVariants.forEach((variant) => {
      const ids = variantRenditions(variant).map((rendition) => rendition.id);
      const assignment = assignmentFor(state, variant.id);
      if (!assignment) state.assignments.push(initialAssignment(variant));
      else {
        if (retiredPresetSegmentIds.has(assignment.segmentId)) {
          retiredAssignedVariantIds.add(assignment.variantId);
          assignment.segmentId = "";
        }
        assignment.segmentId = typeof assignment.segmentId === "string" ? assignment.segmentId : "";
        assignment.activeRenditionIds = Object.prototype.hasOwnProperty.call(assignment, "activeRenditionIds") && Array.isArray(assignment.activeRenditionIds) ? assignment.activeRenditionIds.filter((id) => ids.includes(id)) : ids;
      }
    });
    state.assignments = state.assignments.filter((assignment) => variantById(state, assignment.variantId));
    state.pendingBulkSegmentId = state.pendingBulkSegmentId || "";
    state.cm360.deliveryAssignments = Array.isArray(state.cm360.deliveryAssignments) ? state.cm360.deliveryAssignments.filter((delivery) => !retiredPlacementIds.has(delivery.placementId) && !(delivery.strategy === "segment" && retiredAssignedVariantIds.has(delivery.variantId))) : [];
    if (state.creativeType === "dynamic_creative") {
      const renditionById = new Map(state.activationPackage.approvedVariants.flatMap((variant) => variantRenditions(variant)).map((rendition) => [rendition.id, rendition]));
      const normalizedDeliveries = new Map();
      state.cm360.deliveryAssignments.forEach((delivery) => {
        const rendition = renditionById.get(delivery.renditionId);
        const key = delivery.templateId || (rendition ? renditionTemplateId(rendition) : delivery.renditionId);
        normalizedDeliveries.set(`${key}:${delivery.placementId}`, { ...delivery, renditionId: key, templateId: key, templateName: delivery.templateName || (rendition ? renditionTemplateName(rendition) : "") });
      });
      state.cm360.deliveryAssignments = [...normalizedDeliveries.values()];
    }
    if (state.media?.cmCampaignId) state.assignments.forEach((assignment) => assignMappedPlacements(state, assignment, true));
    state.cm360.createdPlacements = Array.isArray(state.cm360.createdPlacements) ? state.cm360.createdPlacements : [];
    return state;
  }

  function segmentSchedule(segment) { return mappingFor(segment, "Schedule")?.values?.[0] || null; }
  function segmentSummary(segment, includeSchedule) {
    if (!segment) return "No Segment";
    return (segment.mappings || []).filter((mapping) => includeSchedule || mapping.type !== "Schedule").map((mapping) => `${mapping.type === "DV360 Line Item" ? "DV360" : mapping.type === "CM360 Placement" ? "CM360" : mapping.type === "Geography" ? "Geo" : mapping.type === "Manual Entry" ? mapping.idType || "Manual entry" : "Schedule"}: ${model.mappingText(mapping)}`).join(" · ") || "No targeting mappings";
  }
  function segmentTypeSummary(segment, includeSchedule) {
    if (!segment) return "—";
    return (segment.mappings || []).filter((mapping) => includeSchedule || mapping.type !== "Schedule").map((mapping) => mapping.type === "DV360 Line Item" ? "DV360" : mapping.type === "CM360 Placement" ? "CM360" : mapping.type === "Geography" ? "Geo" : mapping.type === "Manual Entry" ? `Manual · ${mapping.idType || "ID Type missing"}` : "Schedule").join(" · ") || "—";
  }
  function segmentState(segment, state) {
    const invalid = model.segmentIssues(segment, state.segments).length;
    return invalid ? ["Invalid", "red"] : segment.enabled ? ["Enabled", "green"] : ["Disabled", "gray"];
  }
  function mappedPlacements(segment) { return (mappingFor(segment, "CM360 Placement")?.values || []).map((value) => ({ value, placement: detectedPlacement(value) })); }
  function compatibleMappedPlacements(segment, format, campaignId) { return mappedPlacements(segment).filter(({ placement }) => placement && placement.format === format && (!campaignId || !placement.campaignId || placement.campaignId === campaignId)); }
  function assignMappedPlacements(state, assignment, preserveExisting) {
    const segment = segmentById(state, assignment.segmentId);
    if (!segment || !mappingFor(segment, "CM360 Placement")) return;
    const variant = variantById(state, assignment.variantId);
    activeRenditionsFor(state, variant).forEach((rendition) => {
      const current = deliveriesFor(state, rendition);
      const compatible = compatibleMappedPlacements(segment, rendition.format, state.media?.cmCampaignId);
      if (!compatible.length) return;
      const key = deliveryKey(state, rendition);
      const existingPlacementIds = new Set(current.map((item) => item.placementId));
      compatible.forEach(({ placement }) => {
        if (existingPlacementIds.has(placement.id)) return;
        existingPlacementIds.add(placement.id);
        state.cm360.deliveryAssignments.push({ variantId: variant.id, renditionId: key, templateId: renditionTemplateId(rendition), templateName: renditionTemplateName(rendition), format: rendition.format, campaignId: state.media?.cmCampaignId || placement.campaignId || "", placementId: placement.id, placementSnapshot: clone(placement), strategy: "segment", status: "mapped" });
      });
    });
  }

  function targetingIssues(state) {
    const issues = [];
    const stats = activationStats(state);
    const approvedIds = new Set(state.activationPackage.approvedVariants.filter((variant) => variant.approvalStatus === "approved").map((variant) => variant.id));
    const unapproved = state.assignments.filter((assignment) => !approvedIds.has(assignment.variantId));
    if (unapproved.length) issues.push({ id: "unapproved", label: "Unapproved creative references", details: `${unapproved.length} assignment${unapproved.length === 1 ? " references" : "s reference"} an unapproved creative.`, section: "assignments" });
    if (!stats.activeRenditionCount) issues.push({ id: "no-active-creatives", label: "No active creative renditions", details: "Turn on at least one approved format before continuing.", section: "assignments" });
    const activeDefault = state.activationPackage.approvedVariants.some((variant) => variant.isDefault && activeRenditionsFor(state, variant).length);
    if (state.activationPackage.defaultRequired && !activeDefault) issues.push({ id: "default", label: "Missing active default creative", details: "Turn on at least one format for the Default Creative.", section: "assignments" });
    const invalidSegments = state.segments.filter((segment) => model.segmentIssues(segment, state.segments).length);
    if (invalidSegments.length) issues.push({ id: "invalid-segments", label: "Invalid Segments", details: `${invalidSegments.length} Segment${invalidSegments.length === 1 ? " is" : "s are"} incomplete or invalid.`, section: "targeting" });
    const invalidAssignments = state.assignments.filter((assignment) => {
      const variant = variantById(state, assignment.variantId);
      if (!variant || !activeRenditionsFor(state, variant).length || variant.isDefault) return false;
      const segment = segmentById(state, assignment.segmentId);
      return !segment || !segment.enabled || model.segmentIssues(segment, state.segments).length;
    });
    if (invalidAssignments.length) issues.push({ id: "missing-segments", label: "Active creatives need a valid Segment", details: `${invalidAssignments.length} active non-default creative${invalidAssignments.length === 1 ? " does" : "s do"} not resolve to an enabled, valid Segment.`, section: "assignments" });
    return issues;
  }

  function rowDeliveryProblems(state, variant, rendition) {
    const problems = [];
    const deliveries = deliveriesFor(state, rendition);
    if (!deliveries.length) problems.push("Assign at least one compatible CM360 Placement.");
    const duplicatePlacementIds = deliveries.map((delivery) => delivery.placementId).filter((placementId, index, ids) => ids.indexOf(placementId) !== index);
    if (duplicatePlacementIds.length) problems.push(`Duplicate placement assignment: ${[...new Set(duplicatePlacementIds)].join(", ")}.`);
    deliveries.forEach((delivery) => {
      const selected = placementById(state, delivery.placementId);
      if (!selected) problems.push(`Placement ${delivery.placementId} could not be resolved.`);
      else if (selected.format && selected.format !== rendition.format) problems.push(`${selected.name} is ${selected.format}, not ${rendition.format}.`);
      else if ((selected.formats || []).length && !selected.formats.includes(rendition.format)) problems.push(`${selected.name} does not support ${rendition.format}.`);
      if (delivery.campaignId && state.media?.cmCampaignId && delivery.campaignId !== state.media.cmCampaignId) problems.push(`${selected?.name || delivery.placementId} belongs to another CM360 Campaign.`);
    });
    return problems;
  }
  function deliveryIssues(state) {
    return traffickingRows(state).flatMap((row) => {
      const members = row.members || [row];
      const problems = [...new Set(members.flatMap(({ variant, rendition }) => rowDeliveryProblems(state, variant, rendition)))];
      return problems.map((problem, index) => ({ id: `delivery-${row.templateId || row.rendition.id}-${index}`, label: problem.startsWith("Duplicate") ? "Duplicate placement" : problem.includes("does not support") || problem.includes(" is ") ? "Format mismatch" : problem.includes("another CM360 Campaign") ? "Campaign mismatch" : problem.includes("could not be resolved") ? "Placement unavailable" : "CM360 Placement required", details: `${row.templateName || row.variant.name} · ${row.rendition.format}: ${problem}`, section: "trafficking" }));
    });
  }

  function renderMediaSync() {
    return `<section class="dco-panel dco-connected-sync"><div class="dco-panel-head"><div><strong>Connected platforms</strong><p>Detected objects are available in the Segment Builder.</p></div><span>${escapeHtml(fixtures.lastSyncedLabel || "")}</span></div><div class="dco-detected-platforms"><div><strong>CM360</strong>${chip(fixtures.accounts?.CM360?.state || "Disconnected", fixtures.accounts?.CM360?.state === "Connected" ? "green" : "gray")}<span>${fixtures.cm360Placements.length} placements detected</span></div><div><strong>DV360</strong>${chip(fixtures.accounts?.DV360?.state || "Disconnected", fixtures.accounts?.DV360?.state === "Connected" ? "green" : "gray")}<span>${fixtures.dv360LineItems.length} line items detected</span></div><div><strong>Studio</strong>${chip(fixtures.accounts?.Studio?.state || "Disconnected", fixtures.accounts?.Studio?.state === "Connected" ? "green" : "gray")}<span>${escapeHtml(fixtures.accounts?.Studio?.name || "Not connected")}</span></div></div></section>`;
  }

  function renderMappingChips(segment, includeSchedule) {
    return `<div class="dco-segment-chip-list">${(segment.mappings || []).filter((mapping) => includeSchedule || mapping.type !== "Schedule").map((mapping) => `<span><b>${escapeHtml(mapping.type === "DV360 Line Item" ? "DV360" : mapping.type === "CM360 Placement" ? "CM360" : mapping.type === "Geography" ? "Geo" : mapping.type === "Manual Entry" ? mapping.idType || "Manual entry" : "Schedule")}</b><small>${mapping.values?.length || 0} value${mapping.values?.length === 1 ? "" : "s"}</small></span>`).join("") || '<span class="muted">No mappings</span>'}</div>`;
  }
  function renderTargeting(state) {
    const hasSegments = state.segments.length > 0;
    const headerActions = hasSegments ? '<div class="dco-head-actions"><button class="secondary-button" type="button" data-dco-action="import-segments">Import segments</button><button class="primary-button" type="button" data-dco-action="add-segment">+ Add segment</button></div>' : "";
    if (!hasSegments) return `<div class="dco-section-head"><div><h2>Segments</h2><p>Create reusable targeting segments using connected platform IDs, imported mappings, or manual values.</p></div></div><section class="dco-panel dco-segments-empty"><button class="primary-button" type="button" data-dco-action="add-segment">+ Add segment</button><p>Create a reusable Segment using connected platform IDs, imported data, or manual values.</p><button class="text-button" type="button" data-dco-action="import-segments">Import segments instead</button></section>`;
    return `<div class="dco-section-head"><div><h2>Segments</h2><p>Create reusable targeting segments using connected platform IDs, imported mappings, or manual values.</p></div>${headerActions}</div>
      <section class="dco-logic-notice"><strong>Feed-ready targeting</strong><span>A creative uses one Segment. Each mapping type becomes a separate feed column; Google Studio Rules determine how those columns are evaluated during serving.</span></section>
      <section class="dco-panel"><div class="dco-table-scroll"><table class="dco-data-table dco-segments-table"><thead><tr><th>Segment</th><th>Targeting mappings</th><th>Schedule</th><th>Used by</th><th>State</th><th>Actions</th></tr></thead><tbody>${state.segments.map((segment) => { const status = segmentState(segment, state), schedule = segmentSchedule(segment); return `<tr><td><strong>${escapeHtml(segment.name)}</strong></td><td>${renderMappingChips(segment, true)}</td><td>${schedule ? `<button class="dco-inline-link" type="button" data-dco-action="edit-segment" data-segment-id="${segment.id}">${escapeHtml(schedule.name)}<small>${escapeHtml(schedule.timezone)}</small></button>` : "None"}</td><td>${usedByCount(state, segment.id)} variant${usedByCount(state, segment.id) === 1 ? "" : "s"}</td><td>${chip(status[0], status[1])}</td><td><div class="row-actions"><button class="text-button" type="button" data-dco-action="edit-segment" data-segment-id="${segment.id}">Edit</button><button class="text-button" type="button" data-dco-action="toggle-segment-state" data-segment-id="${segment.id}">${segment.enabled ? "Disable" : "Enable"}</button><button class="text-button danger" type="button" data-dco-action="delete-segment" data-segment-id="${segment.id}">Delete</button></div></td></tr>`; }).join("")}</tbody></table></div></section>`;
  }

  function assignmentStatus(state, variant, assignment) {
    const active = activeRenditionsFor(state, variant).length;
    if (!active) return ["Excluded", "gray"];
    if (variant.isDefault && !assignment.segmentId) return ["Valid default", "green"];
    const segment = segmentById(state, assignment.segmentId);
    if (!segment || !segment.enabled || model.segmentIssues(segment, state.segments).length) return ["Blocked", "red"];
    const hasDeliveryProblem = activeRenditionsFor(state, variant).some((rendition) => rowDeliveryProblems(state, variant, rendition).length);
    return hasDeliveryProblem ? ["Needs delivery", "yellow"] : ["Ready", "green"];
  }
  function switchControl(action, variantId, checked, label, renditionId) { return `<label class="switch-control dco-assignment-switch"><input type="checkbox" data-dco-action="${action}" data-variant-id="${variantId}" ${renditionId ? `data-rendition-id="${renditionId}"` : ""} ${checked ? "checked" : ""}><span>${escapeHtml(label)}</span></label>`; }
  function segmentOptions(state, selected) { return `<option value="">Default / No targeting</option>${state.segments.map((segment) => `<option value="${segment.id}" ${segment.id === selected ? "selected" : ""} ${segment.enabled && !model.segmentIssues(segment, state.segments).length ? "" : "disabled"}>${escapeHtml(segment.name)}${segment.enabled ? "" : " · Disabled"}</option>`).join("")}`; }
  function renderAssignments(state) {
    const selected = new Set(state.selectedVariantIds), expanded = new Set(state.expandedVariantIds), stats = activationStats(state);
    return `<div class="dco-section-head"><div><h2>Creative Assignments</h2><p>Assign one Segment to each approved logical variant. Activation switches control downstream inclusion; Segment targeting remains variant-level.</p></div></div>
      <section class="dco-logic-notice"><strong>Variant-level targeting</strong><span>Formats inherit the parent Segment. Expand a row to include or exclude individual approved renditions without losing targeting or delivery configuration.</span></section>
      <section class="dco-assignment-toolbar"><label><input type="checkbox" data-dco-action="select-all-assignments" ${selected.size === state.assignments.length && state.assignments.length ? "checked" : ""}> Select all</label><span>${selected.size} selected</span><select data-dco-bulk-segment ${selected.size ? "" : "disabled"}><option value="">Choose Segment</option>${state.segments.filter((segment) => segment.enabled && !model.segmentIssues(segment, state.segments).length).map((segment) => `<option value="${segment.id}" ${state.pendingBulkSegmentId === segment.id ? "selected" : ""}>${escapeHtml(segment.name)}</option>`).join("")}</select><button class="secondary-button" type="button" data-dco-action="bulk-assign-segment" ${selected.size && state.pendingBulkSegmentId ? "" : "disabled"}>Assign Segment</button><button class="ghost-button" type="button" data-dco-action="bulk-remove-segment" ${selected.size ? "" : "disabled"}>Remove Segment</button><span class="dco-toolbar-summary">${stats.activeVariantCount}/${stats.totalVariants} variants · ${stats.activeRenditionCount}/${stats.totalRenditions} formats included</span></section>
      <section class="dco-panel"><div class="dco-table-scroll"><table class="dco-data-table dco-group-assignment-table dco-segment-assignment-table"><colgroup><col class="dco-segment-col-select"><col class="dco-segment-col-variant"><col class="dco-segment-col-publishing"><col class="dco-segment-col-format"><col class="dco-segment-col-picker"><col class="dco-segment-col-summary"><col class="dco-segment-col-schedule"><col class="dco-segment-col-validation"></colgroup><thead><tr><th rowspan="2">Select</th><th rowspan="2">Variant</th><th colspan="2">Activation</th><th colspan="3">Segment targeting</th><th rowspan="2">Validation</th></tr><tr><th>Publishing</th><th>Format</th><th>Segment</th><th>Targeting summary</th><th>Schedule</th></tr></thead><tbody>${state.activationPackage.approvedVariants.map((variant) => {
        const assignment = assignmentFor(state, variant.id), renditions = variantRenditions(variant), active = activeRenditionsFor(state, variant), isExpanded = expanded.has(variant.id), segment = segmentById(state, assignment.segmentId), schedule = segmentSchedule(segment), status = assignmentStatus(state, variant, assignment);
        const parent = `<tr class="dco-assignment-parent ${active.length ? "" : "is-off"}"><td><input type="checkbox" data-dco-action="select-assignment" value="${variant.id}" ${selected.has(variant.id) ? "checked" : ""}></td><td><div class="dco-variant-title"><button type="button" class="dco-expand-button" data-dco-action="toggle-assignment" data-variant-id="${variant.id}" aria-expanded="${isExpanded}">${isExpanded ? "⌄" : "›"}</button><div><strong>${escapeHtml(variant.name)}</strong>${variant.isDefault ? chip("Default", "blue") : ""}<small>Approved variant</small></div></div></td><td>${switchControl("toggle-variant-active", variant.id, active.length > 0, active.length === renditions.length ? "On" : active.length ? "Partial" : "Off")}</td><td><div class="dco-active-count"><strong>Active ${active.length}/${renditions.length}</strong><span>${renditions.length} approved format${renditions.length === 1 ? "" : "s"}</span></div></td><td><div class="dco-segment-select-cell"><select data-dco-assignment-segment data-variant-id="${variant.id}">${segmentOptions(state, assignment.segmentId)}</select>${segment ? `<button class="text-button" type="button" data-dco-action="edit-segment" data-segment-id="${segment.id}" data-variant-id="${variant.id}">View</button>` : ""}</div></td><td>${segment ? escapeHtml(segmentTypeSummary(segment, true)) : variant.isDefault ? "No targeting · fallback" : "—"}</td><td>${schedule ? `<button class="dco-inline-link" type="button" data-dco-action="edit-segment" data-segment-id="${segment.id}" data-variant-id="${variant.id}">${escapeHtml(schedule.name)}<small>From ${escapeHtml(segment.name)}</small></button>` : "None"}</td><td>${chip(status[0], status[1])}</td></tr>`;
        if (!isExpanded) return parent;
        return parent + renditions.map((rendition) => { const on = active.some((item) => item.id === rendition.id); return `<tr class="dco-assignment-child ${on ? "" : "is-off"}"><td></td><td><span class="dco-child-label">↳ ${escapeHtml(renditionTemplateName(rendition))}</span></td><td>${switchControl("toggle-rendition-active", variant.id, on, on ? "On" : "Off", rendition.id)}</td><td>${chip(rendition.format, on ? "blue" : "gray")}</td><td>${segment ? `<span class="muted">Inherited · ${escapeHtml(segment.name)}</span>` : "—"}</td><td><span class="muted">Inherited from variant</span></td><td>${schedule ? `<span class="muted">${escapeHtml(schedule.name)}</span>` : "—"}</td><td>${on ? chip(rowDeliveryProblems(state, variant, rendition).length ? "Needs delivery" : "Included", rowDeliveryProblems(state, variant, rendition).length ? "yellow" : "green") : chip("Excluded", "gray")}</td></tr>`; }).join("");
      }).join("")}</tbody></table></div></section>`;
  }

  function renderTrafficking(state) {
    const rows = traffickingRows(state), stats = activationStats(state), isDynamic = state.creativeType === "dynamic_creative";
    const body = rows.length ? rows.map((row) => {
      const { variant, rendition } = row, members = row.members || [row], deliveries = row.deliveries || [], displayName = row.templateName || variant.name;
      const placements = deliveries.map((delivery) => ({ delivery, placement: placementById(state, delivery.placementId) }));
      const suggested = [...new Map(members.flatMap((member) => {
        const segment = segmentById(state, assignmentFor(state, member.variant.id)?.segmentId);
        return compatibleMappedPlacements(segment, rendition.format, state.media?.cmCampaignId).map(({ placement }) => [placement.id, placement]);
      })).values()];
      const problems = [...new Set(members.flatMap((member) => rowDeliveryProblems(state, member.variant, member.rendition)))];
      const placementCell = placements.length ? `<div class="dco-delivery-list"><strong>${placements.length} placement${placements.length === 1 ? "" : "s"}</strong>${placements.map(({ delivery, placement }) => `<span>${escapeHtml(placement?.name || delivery.placementId)}<small>${escapeHtml(delivery.strategy === "segment" ? "Assigned from Segment" : delivery.strategy === "existing" ? "Selected manually" : "Will be created")}</small></span>`).join("")}</div>` : "—";
      const adCell = placements.length ? `<div class="dco-delivery-list"><strong>${placements.length} ad${placements.length === 1 ? "" : "s"}</strong>${placements.map(({ placement }, index) => `<span>${escapeHtml(`${displayName} — ${placement?.name || `Placement ${index + 1}`} Ad`)}</span>`).join("")}</div>` : "—";
      const dependencyCell = suggested.length ? `<div class="dco-targeting-dependency"><strong>${suggested.length} compatible placement${suggested.length === 1 ? "" : "s"} assigned</strong><small>Suggested by assigned Segment${suggested.length === 1 ? "" : "s"}</small></div>` : "No Segment placement suggestion";
      return `<tr class="${problems.length ? "dco-traffic-blocked" : ""}"><td><div class="dco-template-cell"><strong>${escapeHtml(displayName)}</strong>${isDynamic ? `<small>${members.length} active creative variant${members.length === 1 ? "" : "s"} in Dynamic Feed</small>` : ""}</div></td><td>${chip(rendition.format, "blue")}</td><td>${dependencyCell}</td><td>${placementCell}</td><td>${adCell}</td><td>${problems.length ? `<div class="dco-cell-errors">${problems.map((problem) => `<span>${escapeHtml(problem)}</span>`).join("")}</div>` : chip("Ready", "green")}</td><td><div class="row-actions"><button class="text-button" type="button" data-dco-action="use-existing-placement" data-variant-id="${variant.id}" data-rendition-id="${rendition.id}">Select existing</button><button class="text-button" type="button" data-dco-action="create-placement-for-rendition" data-variant-id="${variant.id}" data-rendition-id="${rendition.id}">Define new</button></div></td></tr>`;
    }).join("") : '<tr><td colspan="7"><div class="table-empty"><strong>No active templates</strong><span>Turn on at least one approved format in Creative Assignments.</span></div></td></tr>';
    return `<div class="dco-section-head"><div><h2>Trafficking</h2><p>${isDynamic ? "Map each unique Editor template and format to one or more compatible CM360 placements. Creative variants remain in the Dynamic Feed." : "Map each active rendition to CM360 delivery."} Segment placements are assigned automatically and can be changed in Trafficking.</p></div></div>${stats.inactiveRenditionCount ? `<section class="dco-exclusion-notice"><div>${chip("Excluded", "gray")}</div><div><strong>${stats.inactiveRenditionCount} inactive format${stats.inactiveRenditionCount === 1 ? "" : "s"} excluded</strong><p>Only templates used by at least one active approved creative are available for trafficking.</p></div></section>` : ""}<section class="dco-panel"><div class="dco-table-scroll"><table class="dco-data-table"><thead><tr><th>${isDynamic ? "Template" : "Creative"}</th><th>Format</th><th>Segment suggestion</th><th>Placements</th><th>Ads</th><th>Status</th><th>Actions</th></tr></thead><tbody>${body}</tbody></table></div></section>`;
  }

  function modalFrame(title, subtitle, body, footer, extraClass) { const drawer = String(extraClass || "").includes("drawer") ? " dco-drawer-overlay" : ""; return `<div class="modal-overlay${drawer}" data-dco-action="close-modal"><section class="modal-card ${extraClass || ""}" role="dialog" aria-modal="true"><header class="modal-head"><div><h2>${escapeHtml(title)}</h2><p>${escapeHtml(subtitle || "")}</p></div><button class="icon-button" type="button" data-dco-action="close-modal" aria-label="Close">×</button></header><div class="modal-body">${body}</div>${footer ? `<footer class="modal-footer">${footer}</footer>` : ""}</section></div>`; }
  function blankSegment() { return { id: localId("segment"), name: "", enabled: true, mappings: [] }; }
  function sourceLabel(value) { return value.importSource ? `${value.source} · ${value.importSource}` : value.source || "Manual"; }
  function renderSegmentPreview(segment) {
    const mappings = segment.mappings || [];
    return `<section class="dco-segment-preview"><div class="dco-panel-head"><div><h3>Feed preview</h3><p>Only mapped targeting columns are generated.</p></div></div><div class="dco-table-scroll"><table class="dco-data-table"><thead><tr><th>Segment</th>${mappings.map((mapping) => `<th>${escapeHtml(mapping.type === "Manual Entry" ? mapping.idType || "ID Type" : mapping.type)}</th>`).join("")}<th>Active</th></tr></thead><tbody><tr><td>${escapeHtml(segment.name || "Untitled Segment")}</td>${mappings.map((mapping) => `<td>${escapeHtml(model.mappingText(mapping)) || "—"}</td>`).join("")}<td>${segmentSchedule(segment) ? (model.scheduleActive(segmentSchedule(segment)) ? "TRUE" : "FALSE") : "TRUE"}</td></tr></tbody></table></div><p class="dco-feed-note">Active is controlled by the Segment schedule and evaluated when the feed is generated or refreshed.</p></section>`;
  }
  function renderMappingBlock(mapping) {
    const schedule = mapping.type === "Schedule" ? mapping.values?.[0] : null;
    return `<section class="dco-segment-mapping-block"><header><div><strong>${escapeHtml(mapping.type === "Manual Entry" ? `Manual entry · ${mapping.idType || "ID Type missing"}` : mapping.type)}</strong><span>${mapping.values?.length || 0} value${mapping.values?.length === 1 ? "" : "s"}</span></div><div class="row-actions">${mapping.type !== "Schedule" ? `<button class="text-button" type="button" data-dco-action="segment-edit-values" data-mapping-type="${mapping.type}">Add values</button>` : ""}<button class="text-button danger" type="button" data-dco-action="segment-remove-type" data-mapping-type="${mapping.type}">Remove</button></div></header>${schedule ? `<div class="form-grid"><label class="field"><span>Schedule preset</span><select data-segment-schedule-field="preset">${Object.keys(model.SCHEDULE_PRESETS).map((name) => `<option value="${name}" ${schedule.name === name ? "selected" : ""}>${name}</option>`).join("")}<option value="Custom schedule" ${!model.SCHEDULE_PRESETS[schedule.name] ? "selected" : ""}>Custom schedule</option></select></label><label class="field"><span>Timezone</span><select data-segment-schedule-field="timezone">${["Europe/London", "America/New_York", "America/Los_Angeles", "Asia/Manila"].map((timezone) => `<option ${schedule.timezone === timezone ? "selected" : ""}>${timezone}</option>`).join("")}</select></label><label class="field"><span>Days</span><input data-segment-schedule-field="days" value="${escapeHtml((schedule.days || []).join(", "))}" placeholder="Monday, Tuesday"></label><label class="field"><span>Time range</span><div class="dco-time-range"><input type="time" data-segment-schedule-field="startTime" value="${escapeHtml(schedule.startTime)}"><span>to</span><input type="time" data-segment-schedule-field="endTime" value="${escapeHtml(schedule.endTime === "24:00" ? "23:59" : schedule.endTime)}"></div></label></div>` : `<div class="dco-segment-values">${(mapping.values || []).map((value, index) => `<div><span><strong>${escapeHtml(["Geography", "Manual Entry"].includes(mapping.type) ? value.value : value.label || value.platformId)}</strong><small>${["Geography", "Manual Entry"].includes(mapping.type) ? "" : escapeHtml(value.platformId)}${value.format ? ` · ${escapeHtml(value.format)}` : ""} · ${escapeHtml(sourceLabel(value))}</small></span><button class="icon-button" type="button" data-dco-action="segment-remove-value" data-mapping-type="${mapping.type}" data-value-index="${index}" aria-label="Remove value">×</button></div>`).join("")}</div>`}</section>`;
  }
  function renderSegmentEditor(state, modal) {
    const segment = modal.draft;
    if (modal.stage === "choose-type") {
      const available = SEGMENT_TYPES.filter((type) => !mappingFor(segment, type));
      return modalFrame("Add targeting mapping", "A Segment can contain at most one block for each targeting type.", `<div class="dco-rule-type-grid">${available.map((type) => `<button type="button" data-dco-action="segment-choose-type" data-mapping-type="${type}"><strong>${escapeHtml(type === "Manual Entry" ? "Manual entry" : type)}</strong><span>${type === "Schedule" ? "Control when this Segment is active." : type === "Manual Entry" ? "Choose an ID Type and enter one or more values for a custom feed column." : `Add one or more ${type.toLowerCase()} values.`}</span></button>`).join("") || '<div class="table-empty"><strong>All mapping types added</strong><span>Return to the Segment editor to manage values.</span></div>'}</div>`, `<button class="ghost-button" type="button" data-dco-action="segment-editor-main">Back</button>`, "dco-profile-modal");
    }
    if (modal.stage === "values") return renderValuePicker(state, modal);
    const usage = usedByCount(state, segment.id), issues = modal.error ? [modal.error] : model.segmentIssues(segment, state.segments).filter((issue) => !(!segment.name && issue === "Segment name is required."));
    return modalFrame(`${modal.mode === "edit" ? "Edit" : "Add"} Segment`, "Define the targeting mappings that will be written to this Segment's dynamic-feed row.", `<section class="dco-editor-section"><div class="form-grid"><label class="field dco-full-field"><span>Segment name</span><input data-segment-field="name" value="${escapeHtml(segment.name)}" placeholder="Example: Lapsed Buyers"></label></div></section><section class="dco-segment-builder"><div class="dco-panel-head"><div><h3>Targeting mappings</h3><p>Each mapping type writes values to its own Studio feed column.</p></div><button class="secondary-button" type="button" data-dco-action="segment-add-type" ${(segment.mappings || []).length === SEGMENT_TYPES.length ? "disabled" : ""}>Add targeting type</button></div>${(segment.mappings || []).map(renderMappingBlock).join("") || '<div class="table-empty"><strong>No targeting mappings</strong><span>Add DV360 Line Items, CM360 Placements, Geography, Schedule, or a custom Manual entry column.</span></div>'}</section>${renderSegmentPreview(segment)}${modal.mode === "edit" ? `<div class="dco-usage-summary"><strong>Used by ${usage} creative${usage === 1 ? "" : "s"}</strong><span>Assignments are managed from Creative Assignments.</span></div>` : ""}${issues.length ? `<div class="validation-list has-issues">${issues.map((issue) => `<div class="validation-item">${escapeHtml(issue)}</div>`).join("")}</div>` : ""}`, `<button class="ghost-button" type="button" data-dco-action="close-modal">Cancel</button><button class="primary-button" type="button" data-dco-action="save-segment">Save Segment</button>`, "dco-targeting-builder-drawer");
  }

  function pickerObjects(type, modal) {
    let items = type === "DV360 Line Item" ? fixtures.dv360LineItems : fixtures.cm360Placements;
    if (modal.search) items = items.filter((item) => `${item.name} ${item.platformId} ${item.campaign} ${item.site || ""}`.toLowerCase().includes(modal.search.toLowerCase()));
    if (modal.campaign) items = items.filter((item) => item.campaign === modal.campaign);
    if (type === "CM360 Placement" && modal.format) items = items.filter((item) => item.format === modal.format);
    return items;
  }
  function renderValuePicker(state, modal) {
    const type = modal.mappingType, source = modal.valueSource || (type === "Geography" ? "manual" : "connected"), current = new Set(modal.selectedValueIds || []);
    const tabs = type === "Manual Entry" ? ["manual"] : type === "Geography" ? ["manual", "import"] : ["connected", "import", "manual"];
    let content = "";
    if (source === "connected") {
      const objects = pickerObjects(type, modal), campaigns = [...new Set((type === "DV360 Line Item" ? fixtures.dv360LineItems : fixtures.cm360Placements).map((item) => item.campaign))], formats = [...new Set(fixtures.cm360Placements.map((item) => item.format))];
      content = `<div class="dco-picker-account"><span><strong>${type.startsWith("DV360") ? "DV360" : "CM360"}</strong><small>${escapeHtml(fixtures.accounts?.[type.startsWith("DV360") ? "DV360" : "CM360"]?.name || "Connected account")}</small></span>${chip("Connected", "green")}</div><div class="dco-picker-filters"><input data-segment-picker-field="search" value="${escapeHtml(modal.search || "")}" placeholder="Search name or platform ID"><select data-segment-picker-field="campaign"><option value="">All campaigns</option>${campaigns.map((campaign) => `<option ${modal.campaign === campaign ? "selected" : ""}>${escapeHtml(campaign)}</option>`).join("")}</select>${type === "CM360 Placement" ? `<select data-segment-picker-field="format"><option value="">All formats</option>${formats.map((format) => `<option ${modal.format === format ? "selected" : ""}>${escapeHtml(format)}</option>`).join("")}</select>` : ""}</div><div class="dco-table-scroll"><table class="dco-data-table dco-object-browser"><thead><tr><th>Select</th><th>${type === "DV360 Line Item" ? "Line item" : "Placement"}</th><th>${type === "DV360 Line Item" ? "Line Item ID" : "Placement ID"}</th><th>Campaign</th>${type === "CM360 Placement" ? "<th>Site</th><th>Format</th>" : "<th>Compatibility</th>"}</tr></thead><tbody>${objects.map((item) => `<tr><td><input type="checkbox" data-segment-picker-value="${item.id}" ${current.has(item.id) ? "checked" : ""}></td><td><strong>${escapeHtml(item.name)}</strong><small>${escapeHtml(item.source)}</small></td><td>${escapeHtml(item.platformId)}</td><td>${escapeHtml(item.campaign)}</td>${type === "CM360 Placement" ? `<td>${escapeHtml(item.site)}</td><td>${chip(item.format, "blue")}</td>` : `<td>${escapeHtml(item.compatibility || "All supported formats")}</td>`}</tr>`).join("") || '<tr><td colspan="6"><div class="table-empty"><strong>No matching connected objects</strong><span>Adjust the filters or use Manual.</span></div></td></tr>'}</tbody></table></div>`;
    } else if (source === "manual") {
      content = `${type === "Manual Entry" ? `<label class="field"><span>ID Type</span><select data-segment-picker-field="manualIdType">${model.MANUAL_ID_TYPES.map((idType) => `<option value="${escapeHtml(idType)}" ${modal.manualIdType === idType ? "selected" : ""}>${escapeHtml(idType)}</option>`).join("")}</select><small>The selected ID Type becomes this mapping's dynamic-feed column name.</small></label>` : ""}<label class="field"><span>${type === "Geography" ? "Locations" : type === "Manual Entry" ? "Values" : "Platform IDs"}</span><textarea rows="8" data-segment-picker-field="manualText" placeholder="One value per line or comma separated">${escapeHtml(modal.manualText || "")}</textarea><small>${type === "CM360 Placement" ? "Unknown IDs are kept in the Segment and feed, but block delivery while assigned." : "Values are de-duplicated when added."}</small></label>`;
    } else {
      const feeds = fixtures.segmentAutomationFeeds || [], feed = feeds.find((item) => item.id === modal.valueFeedId) || feeds[0], columns = feed?.columns || [];
      const availableColumns = modal.valueColumns?.length ? modal.valueColumns : columns;
      content = `<div class="dco-import-source-grid"><label class="field"><span>CSV file</span><input type="file" accept=".csv,text/csv" data-segment-value-file></label><span>or</span><label class="field"><span>Automation Feed</span><select data-segment-picker-field="valueFeedId">${feeds.map((item) => `<option value="${item.id}" ${feed?.id === item.id ? "selected" : ""}>${escapeHtml(item.name)}</option>`).join("")}</select></label></div><label class="field"><span>Value column</span><select data-segment-picker-field="valueColumn"><option value="">Select column</option>${availableColumns.map((column) => `<option ${modal.valueColumn === column ? "selected" : ""}>${escapeHtml(column)}</option>`).join("")}</select></label>${modal.valueImportRows?.length ? `<div class="dco-import-preview"><strong>${modal.valueImportRows.length} row${modal.valueImportRows.length === 1 ? "" : "s"} loaded</strong><span>${escapeHtml(modal.valueImportName || "CSV")}</span></div>` : ""}`;
    }
    return modalFrame(`Add ${type === "Manual Entry" ? "manual entry" : type} values`, type === "Manual Entry" ? "Choose the feed column ID Type, then enter one or more values." : "Choose a source. Values from different sources can live in the same mapping block.", `<div class="dco-source-tabs">${tabs.map((tab) => `<button type="button" class="${source === tab ? "active" : ""}" data-dco-action="segment-value-source" data-source="${tab}">${tab === "connected" ? "Connected platform" : tab === "import" ? "Import" : "Manual"}</button>`).join("")}</div>${content}${modal.error ? `<div class="validation-list has-issues"><div class="validation-item">${escapeHtml(modal.error)}</div></div>` : ""}`, `<button class="ghost-button" type="button" data-dco-action="segment-editor-main">Back</button><button class="primary-button" type="button" data-dco-action="segment-add-values">Add values</button>`, "dco-targeting-builder-drawer");
  }

  function defaultColumnMap(columns) {
    const find = (...needles) => columns.find((column) => needles.some((needle) => column.toLowerCase().includes(needle))) || "";
    return { name: find("segment", "audience name", "name"), dv360: find("dv360", "dv id", "line item"), cm360: find("cm360", "placement"), geography: find("geo", "region", "location"), schedule: find("schedule", "daypart") };
  }
  function importSourceData(modal) {
    if (modal.source === "feed") { const feed = (fixtures.segmentAutomationFeeds || []).find((item) => item.id === modal.feedId) || fixtures.segmentAutomationFeeds?.[0]; return { columns: feed?.columns || [], rows: feed?.rows || [], name: feed?.name || "Automation Feed" }; }
    return { columns: modal.csvColumns || [], rows: modal.csvRows || [], name: modal.csvName || "CSV" };
  }
  function computeImportPreview(state, modal) {
    const data = importSourceData(modal);
    modal.columnMap = modal.columnMap || (modal.source === "feed" ? { name: "", dv360: "", cm360: "", geography: "", schedule: "" } : defaultColumnMap(data.columns));
    modal.importPreview = model.importRows(data.rows, modal.columnMap, fixtures, data.name, state.segments);
  }
  function renderSegmentImport(state, modal) {
    computeImportPreview(state, modal);
    const data = importSourceData(modal), map = modal.columnMap, preview = modal.importPreview || [], valid = preview.filter((row) => !row.issues.length);
    const select = (field, label, required) => `<label class="field"><span>${label}${required ? " *" : ""}</span><select data-segment-import-column="${field}"><option value="">Not mapped</option>${data.columns.map((column) => `<option ${map[field] === column ? "selected" : ""}>${escapeHtml(column)}</option>`).join("")}</select></label>`;
    return modalFrame("Import Segments", "One imported row creates one Segment. Map at least one targeting column in addition to Segment name.", `<div class="dco-source-tabs"><button type="button" class="${modal.source === "csv" ? "active" : ""}" data-dco-action="segment-import-source" data-source="csv">CSV</button><button type="button" class="${modal.source === "feed" ? "active" : ""}" data-dco-action="segment-import-source" data-source="feed">Automation Feed</button></div>${modal.source === "csv" ? `<label class="field"><span>CSV file</span><input type="file" accept=".csv,text/csv" data-segment-import-file></label>` : `<label class="field"><span>Automation Feed</span><select data-segment-import-feed>${(fixtures.segmentAutomationFeeds || []).map((feed) => `<option value="${feed.id}" ${modal.feedId === feed.id ? "selected" : ""}>${escapeHtml(feed.name)}</option>`).join("")}</select></label>`}${data.columns.length ? `<section class="dco-editor-section"><h3>Column mapping</h3><div class="form-grid">${select("name", "Segment name", true)}${select("dv360", "DV360 Line Item ID", false)}${select("cm360", "CM360 Placement ID", false)}${select("geography", "Geography", false)}${select("schedule", "Schedule preset", false)}</div></section><section class="dco-import-results"><div class="dco-panel-head"><div><h3>Import preview</h3><p>${valid.length} valid · ${preview.length - valid.length} blocked</p></div></div>${preview.map((row) => `<div class="${row.issues.length ? "has-error" : ""}"><span><strong>${escapeHtml(row.segment.name || `Row ${row.index + 1}`)}</strong><small>${escapeHtml(segmentSummary(row.segment, true))}</small></span>${row.issues.length ? chip(row.issues.join(" "), "red") : chip("Ready", "green")}</div>`).join("") || '<div class="table-empty"><strong>No data rows</strong></div>'}</section>` : '<div class="table-empty"><strong>Select a source</strong><span>Upload CSV data or choose an Automation Feed.</span></div>'}${modal.error ? `<div class="validation-list has-issues"><div class="validation-item">${escapeHtml(modal.error)}</div></div>` : ""}`, `<button class="ghost-button" type="button" data-dco-action="close-modal">Cancel</button><button class="primary-button" type="button" data-dco-action="segment-import-apply" ${valid.length ? "" : "disabled"}>Import ${valid.length} Segment${valid.length === 1 ? "" : "s"}</button>`, "dco-targeting-builder-drawer");
  }

  function renderBulkModal(state, modal) {
    return modalFrame("Assign Segment", `Assign one Segment to ${state.selectedVariantIds.length} selected creative${state.selectedVariantIds.length === 1 ? "" : "s"}.`, `<label class="field"><span>Segment</span><select data-segment-bulk-modal><option value="">Select Segment</option>${state.segments.filter((segment) => segment.enabled && !model.segmentIssues(segment, state.segments).length).map((segment) => `<option value="${segment.id}">${escapeHtml(segment.name)}</option>`).join("")}</select></label>${modal.error ? `<div class="validation-list has-issues"><div class="validation-item">${escapeHtml(modal.error)}</div></div>` : ""}`, `<button class="ghost-button" type="button" data-dco-action="close-modal">Cancel</button><button class="primary-button" type="button" data-dco-action="apply-bulk-segment">Assign Segment</button>`, "dco-profile-modal");
  }

  function feedRows(state) {
    return activeTrafficRows(state).map(({ variant, rendition }) => {
      const segment = segmentById(state, assignmentFor(state, variant.id)?.segmentId);
      return { variant, rendition, segment, schedule: segmentSchedule(segment) };
    });
  }
  function renderFeedModal(state) {
    const rows = feedRows(state);
    const standardTypes = SEGMENT_TYPES.filter((type) => !["Schedule", "Manual Entry"].includes(type) && rows.some((row) => mappingFor(row.segment, type)));
    const manualIdTypes = [...new Set(rows.flatMap((row) => (row.segment?.mappings || []).filter((mapping) => mapping.type === "Manual Entry" && mapping.idType).map((mapping) => mapping.idType)))];
    const columns = [...standardTypes.map((type) => ({ type, label: type })), ...manualIdTypes.map((idType) => ({ type: "Manual Entry", idType, label: idType }))];
    const anySchedule = rows.some((row) => mappingFor(row.segment, "Schedule"));
    const rowMapping = (row, column) => column.type === "Manual Entry" ? (row.segment?.mappings || []).find((mapping) => mapping.type === "Manual Entry" && mapping.idType === column.idType) : mappingFor(row.segment, column.type);
    return modalFrame("Generated Studio Data", "One row per active approved rendition. Targeting columns are included only when an assigned Segment uses them; Studio Rules interpret those columns during serving.", `<div class="dco-table-scroll"><table class="dco-data-table dco-feed-table"><thead><tr><th>Creative variant</th><th>Format</th><th>Segment</th>${columns.map((column) => `<th>${escapeHtml(column.label)}</th>`).join("")}${anySchedule ? "<th>Schedule</th><th>Active</th>" : ""}<th>Image</th><th>Headline</th><th>CTA</th></tr></thead><tbody>${rows.map((row) => `<tr><td><strong>${escapeHtml(row.variant.name)}</strong></td><td>${escapeHtml(row.rendition.format)}</td><td>${escapeHtml(row.segment?.name || "Default")}</td>${columns.map((column) => `<td>${escapeHtml(model.mappingText(rowMapping(row, column))) || "—"}</td>`).join("")}${anySchedule ? `<td>${escapeHtml(row.schedule?.name || "—")}</td><td>${row.schedule ? (model.scheduleActive(row.schedule) ? "TRUE" : "FALSE") : "TRUE"}</td>` : ""}<td>${escapeHtml(row.rendition.backgroundImage || "—")}</td><td>${escapeHtml(row.variant.headline || "—")}</td><td>${escapeHtml(row.variant.cta || "—")}</td></tr>`).join("")}</tbody></table></div><p class="dco-feed-note">${state.activationPackage.excludedPreviewCount || 0} unapproved previews and ${activationStats(state).inactiveRenditionCount} inactive approved renditions are excluded.</p>`, "", "dco-feed-modal");
  }
  function renderModal(state) {
    if (!state.modal) return "";
    if (state.modal.type === "segment-editor") return renderSegmentEditor(state, state.modal);
    if (state.modal.type === "segment-import") return renderSegmentImport(state, state.modal);
    if (state.modal.type === "segment-bulk") return renderBulkModal(state, state.modal);
    if (state.modal.type === "feed") return renderFeedModal(state);
    return "";
  }

  function openEditor(state, segment, mode) { state.modal = { type: "segment-editor", mode, draft: clone(segment), stage: "main", valueSource: "connected", selectedValueIds: [] }; }
  function mutateDraft(state, next) { state.modal.draft = next; }
  function handleClick(event, state, context) {
    const target = event.target.closest("[data-dco-action]");
    if (!target) return false;
    const action = target.dataset.dcoAction;
    if (action === "add-segment") { openEditor(state, blankSegment(), "add"); context.render(); return true; }
    if (action === "edit-segment") { const segment = segmentById(state, target.dataset.segmentId); if (segment) { openEditor(state, segment, "edit"); const contextVariant = variantById(state, target.dataset.variantId); const contextFormats = contextVariant ? [...new Set(activeRenditionsFor(state, contextVariant).map((rendition) => rendition.format))] : []; if (contextFormats.length === 1) state.modal.format = contextFormats[0]; } context.render(); return true; }
    if (action === "toggle-segment-state") { const segment = segmentById(state, target.dataset.segmentId); if (segment) segment.enabled = !segment.enabled; context.changed(`Segment ${segment.enabled ? "enabled" : "disabled"}.`); return true; }
    if (action === "delete-segment") { const count = usedByCount(state, target.dataset.segmentId); if (count) { context.toast(`Cannot delete this Segment because ${count} creative${count === 1 ? " uses" : "s use"} it.`); return true; } state.segments = state.segments.filter((segment) => segment.id !== target.dataset.segmentId); context.changed("Segment deleted."); return true; }
    if (action === "segment-add-type") { state.modal.stage = "choose-type"; state.modal.error = ""; context.render(); return true; }
    if (action === "segment-choose-type") {
      const type = target.dataset.mappingType;
      if (type === "Schedule") { mutateDraft(state, model.mergeValues(state.modal.draft, type, [{ name: "Weekday Morning", ...model.SCHEDULE_PRESETS["Weekday Morning"] }], "Manual", "", fixtures)); state.modal.stage = "main"; }
      else { state.modal.stage = "values"; state.modal.mappingType = type; state.modal.valueSource = ["Geography", "Manual Entry"].includes(type) ? "manual" : "connected"; state.modal.selectedValueIds = []; state.modal.manualText = ""; if (type === "Manual Entry") state.modal.manualIdType = model.MANUAL_ID_TYPES[0]; }
      context.render(); return true;
    }
    if (action === "segment-editor-main") { state.modal.stage = "main"; state.modal.error = ""; context.render(); return true; }
    if (action === "segment-edit-values") { const type = target.dataset.mappingType, mapping = mappingFor(state.modal.draft, type); state.modal.stage = "values"; state.modal.mappingType = type; state.modal.valueSource = ["Geography", "Manual Entry"].includes(type) ? "manual" : "connected"; state.modal.selectedValueIds = []; state.modal.manualText = ""; if (type === "Manual Entry") state.modal.manualIdType = mapping?.idType || model.MANUAL_ID_TYPES[0]; context.render(); return true; }
    if (action === "segment-remove-type") { mutateDraft(state, model.removeMapping(state.modal.draft, target.dataset.mappingType)); context.render(); return true; }
    if (action === "segment-remove-value") { const mapping = mappingFor(state.modal.draft, target.dataset.mappingType); mapping.values.splice(Number(target.dataset.valueIndex), 1); if (!mapping.values.length) mutateDraft(state, model.removeMapping(state.modal.draft, mapping.type)); context.render(); return true; }
    if (action === "segment-value-source") { state.modal.valueSource = target.dataset.source; state.modal.error = ""; context.render(); return true; }
    if (action === "segment-add-values") {
      const modal = state.modal, type = modal.mappingType, source = modal.valueSource;
      let values = [], importName = "";
      if (source === "connected") { const list = type === "DV360 Line Item" ? fixtures.dv360LineItems : fixtures.cm360Placements; values = list.filter((item) => (modal.selectedValueIds || []).includes(item.id)); }
      if (source === "manual") values = model.splitValues(modal.manualText);
      if (source === "import") { const feed = (fixtures.segmentAutomationFeeds || []).find((item) => item.id === modal.valueFeedId) || fixtures.segmentAutomationFeeds?.[0]; const rows = modal.valueImportRows || feed?.rows || []; importName = modal.valueImportName || feed?.name || "Import"; if (modal.valueColumn) values = rows.flatMap((row) => model.splitValues(row[modal.valueColumn])); }
      if (!values.length) { modal.error = "Select or enter at least one value."; context.render(); return true; }
      if (type === "Manual Entry" && !model.MANUAL_ID_TYPES.includes(modal.manualIdType)) { modal.error = "Select a valid ID Type."; context.render(); return true; }
      mutateDraft(state, model.mergeValues(modal.draft, type, values, source === "connected" ? `Connected ${type.startsWith("DV360") ? "DV360" : "CM360"}` : source === "import" ? "Import" : "Manual", importName, fixtures));
      if (type === "Manual Entry") mappingFor(state.modal.draft, type).idType = modal.manualIdType;
      modal.stage = "main"; modal.error = ""; context.render(); return true;
    }
    if (action === "save-segment") {
      const issues = model.segmentIssues(state.modal.draft, state.segments);
      if (issues.length) { state.modal.error = issues[0]; context.render(); return true; }
      const index = state.segments.findIndex((segment) => segment.id === state.modal.draft.id), editedId = state.modal.draft.id;
      if (index >= 0) state.segments[index] = clone(state.modal.draft); else state.segments.push(clone(state.modal.draft));
      state.assignments.filter((assignment) => assignment.segmentId === editedId).forEach((assignment) => assignMappedPlacements(state, assignment, true));
      state.modal = null; context.changed("Segment saved. Targeting and delivery validation updated."); return true;
    }
    if (action === "import-segments") { const first = fixtures.segmentAutomationFeeds?.[0]; state.modal = { type: "segment-import", source: "csv", feedId: first?.id || "", columnMap: null, csvColumns: [], csvRows: [] }; context.render(); return true; }
    if (action === "segment-import-source") { state.modal.source = target.dataset.source; state.modal.columnMap = null; state.modal.error = ""; context.render(); return true; }
    if (action === "segment-import-apply") { computeImportPreview(state, state.modal); const valid = state.modal.importPreview.filter((row) => !row.issues.length); if (!valid.length) { state.modal.error = "There are no valid rows to import."; context.render(); return true; } state.segments.push(...valid.map((row) => row.segment)); state.modal = null; context.changed(`${valid.length} Segment${valid.length === 1 ? "" : "s"} imported.`); return true; }
    if (action === "toggle-assignment") { const ids = new Set(state.expandedVariantIds); ids.has(target.dataset.variantId) ? ids.delete(target.dataset.variantId) : ids.add(target.dataset.variantId); state.expandedVariantIds = [...ids]; context.render(); return true; }
    if (action === "toggle-variant-active") { const variant = variantById(state, target.dataset.variantId), assignment = assignmentFor(state, variant.id); assignment.activeRenditionIds = target.checked ? variantRenditions(variant).map((rendition) => rendition.id) : []; if (target.checked) assignMappedPlacements(state, assignment, true); context.changed(target.checked ? "All approved formats included." : "Variant excluded from downstream activation."); return true; }
    if (action === "toggle-rendition-active") { const assignment = assignmentFor(state, target.dataset.variantId), ids = new Set(assignment.activeRenditionIds); target.checked ? ids.add(target.dataset.renditionId) : ids.delete(target.dataset.renditionId); assignment.activeRenditionIds = [...ids]; if (target.checked) assignMappedPlacements(state, assignment, true); context.changed(target.checked ? "Format included in downstream activation." : "Format excluded from downstream activation."); return true; }
    if (action === "use-required-placement") { const assignment = assignmentFor(state, target.dataset.variantId); assignMappedPlacements(state, assignment, true); context.changed("All compatible Segment placements assigned."); return true; }
    if (action === "select-assignment") { const ids = new Set(state.selectedVariantIds); target.checked ? ids.add(target.value) : ids.delete(target.value); state.selectedVariantIds = [...ids]; context.render(); return true; }
    if (action === "select-all-assignments") { state.selectedVariantIds = target.checked ? state.assignments.map((assignment) => assignment.variantId) : []; context.render(); return true; }
    if (action === "bulk-assign-segment") { if (!state.pendingBulkSegmentId) return true; state.selectedVariantIds.forEach((variantId) => { const assignment = assignmentFor(state, variantId); assignment.segmentId = state.pendingBulkSegmentId; assignMappedPlacements(state, assignment, false); }); context.changed(`Segment assigned to ${state.selectedVariantIds.length} creatives.`); return true; }
    if (action === "bulk-remove-segment") { state.selectedVariantIds.forEach((variantId) => { assignmentFor(state, variantId).segmentId = ""; }); context.changed(`Segment removed from ${state.selectedVariantIds.length} creatives.`); return true; }
    if (action === "apply-bulk-segment") { if (!state.modal.segmentId) { state.modal.error = "Select a Segment."; context.render(); return true; } const id = state.modal.segmentId; state.selectedVariantIds.forEach((variantId) => { const assignment = assignmentFor(state, variantId); assignment.segmentId = id; assignMappedPlacements(state, assignment, false); }); state.modal = null; context.changed("Segment assigned to selected creatives."); return true; }
    return false;
  }

  function handleInput(event, state, context) {
    if (event.target.dataset.segmentField && state.modal?.type === "segment-editor") { state.modal.draft[event.target.dataset.segmentField] = event.target.value; return true; }
    if (event.target.dataset.segmentPickerField && state.modal?.type === "segment-editor") { const field = event.target.dataset.segmentPickerField; state.modal[field] = event.target.value; if (field === "search") { context.render(); const input = document.querySelector('[data-segment-picker-field="search"]'); if (input) { input.focus(); input.setSelectionRange(input.value.length, input.value.length); } } return true; }
    if (event.target.dataset.segmentScheduleField && state.modal?.type === "segment-editor") { const schedule = segmentSchedule(state.modal.draft); const field = event.target.dataset.segmentScheduleField; if (field === "days") schedule.days = model.splitValues(event.target.value); else schedule[field] = event.target.value; return true; }
    return false;
  }
  function readFile(file, callback) { const reader = new FileReader(); reader.onload = () => callback(String(reader.result || "")); reader.readAsText(file); }
  function handleChange(event, state, context) {
    if (event.target.hasAttribute("data-dco-assignment-segment")) { const assignment = assignmentFor(state, event.target.dataset.variantId); assignment.segmentId = event.target.value; if (assignment.segmentId) assignMappedPlacements(state, assignment, false); context.changed(assignment.segmentId ? "Segment assigned. Targeting and delivery validation updated." : "Segment removed from creative assignment."); return true; }
    if (event.target.hasAttribute("data-dco-bulk-segment")) { state.pendingBulkSegmentId = event.target.value; context.render(); return true; }
    if (event.target.hasAttribute("data-segment-bulk-modal")) { state.modal.segmentId = event.target.value; return true; }
    if (event.target.dataset.segmentPickerField && state.modal?.type === "segment-editor") { const field = event.target.dataset.segmentPickerField; state.modal[field] = event.target.value; if (field === "valueFeedId") { state.modal.valueColumn = ""; state.modal.valueColumns = []; state.modal.valueImportRows = []; state.modal.valueImportName = ""; } context.render(); return true; }
    if (event.target.hasAttribute("data-segment-picker-value") && state.modal?.type === "segment-editor") { const ids = new Set(state.modal.selectedValueIds || []); event.target.checked ? ids.add(event.target.dataset.segmentPickerValue) : ids.delete(event.target.dataset.segmentPickerValue); state.modal.selectedValueIds = [...ids]; return true; }
    if (event.target.dataset.segmentScheduleField && state.modal?.type === "segment-editor") {
      const schedule = segmentSchedule(state.modal.draft), field = event.target.dataset.segmentScheduleField;
      if (field === "preset" && model.SCHEDULE_PRESETS[event.target.value]) Object.assign(schedule, { name: event.target.value, ...clone(model.SCHEDULE_PRESETS[event.target.value]) });
      else if (field === "preset") schedule.name = event.target.value;
      else if (field === "days") schedule.days = model.splitValues(event.target.value);
      else schedule[field] = event.target.value;
      context.render(); return true;
    }
    if (event.target.hasAttribute("data-segment-value-file") && state.modal?.type === "segment-editor") { const file = event.target.files?.[0]; if (!file) return true; readFile(file, (text) => { const data = model.objectsFromCsv(text); state.modal.valueColumns = data.columns; state.modal.valueImportRows = data.rows; state.modal.valueImportName = file.name; state.modal.valueColumn = ""; context.render(); }); return true; }
    if (event.target.hasAttribute("data-segment-import-file") && state.modal?.type === "segment-import") { const file = event.target.files?.[0]; if (!file) return true; readFile(file, (text) => { const data = model.objectsFromCsv(text); state.modal.csvColumns = data.columns; state.modal.csvRows = data.rows; state.modal.csvName = file.name; state.modal.columnMap = defaultColumnMap(data.columns); context.render(); }); return true; }
    if (event.target.hasAttribute("data-segment-import-feed") && state.modal?.type === "segment-import") { state.modal.feedId = event.target.value; state.modal.columnMap = null; context.render(); return true; }
    if (event.target.dataset.segmentImportColumn && state.modal?.type === "segment-import") { state.modal.columnMap[event.target.dataset.segmentImportColumn] = event.target.value; context.render(); return true; }
    return false;
  }

  window.cm360DcoConnectedTargeting = {
    RULE_TYPES: SEGMENT_TYPES,
    SEGMENT_TYPES,
    initialRules,
    initialGroups,
    initialSegments,
    initialAssignments,
    normalizeState,
    ruleDefinition() { return "Legacy Targeting Rule"; },
    invalidRule() { return false; },
    targetingIssues,
    deliveryIssues,
    activeRenditionsFor,
    activeTrafficRows,
    traffickingRows,
    activationStats,
    renderMediaSync,
    renderTargeting,
    renderAssignments,
    renderTrafficking,
    renderModal,
    renderFeedModal,
    handleClick,
    handleInput,
    handleChange,
  };
})();
