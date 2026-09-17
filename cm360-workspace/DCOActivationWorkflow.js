(function () {
  const connectedTargeting = window.cm360DcoConnectedTargeting || null;
  const STORAGE_KEY = "cm360-dco-activation-v6";
  const PACKAGE_KEY = "cm360-approved-activation-package";
  const RULE_TYPES = connectedTargeting?.RULE_TYPES || ["DV360 Line Item", "CM360 Placement", "Geography", "Schedule"];
  const sections = [
    { id: "overview", label: "Overview" },
    { id: "media", label: "Media" },
    { id: "targeting", label: "Segments" },
    { id: "assignments", label: "Creative Assignments" },
    { id: "studio", label: "Studio" },
    { id: "trafficking", label: "Trafficking" },
    { id: "review", label: "Review & Publish" },
    { id: "tags", label: "Tags & Distribution" },
  ];

  function clone(value) { return JSON.parse(JSON.stringify(value)); }
  function escapeHtml(value) {
    return String(value == null ? "" : value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
  }
  function chip(label, tone) { return `<span class="chip ${escapeHtml(tone || "gray")}">${escapeHtml(label)}</span>`; }
  function id(prefix) { return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2, 7)}`; }

  function defaultPackage() {
    return {
      name: "Summer Campaign Dynamic Creative",
      approvedPreviewCount: 5,
      excludedPreviewCount: 3,
      totalPreviewCount: 8,
      defaultRequired: true,
      approvedVariants: [
        { id: "variant-default", name: "City wool coat", headline: "Wool, for the city cold", cta: "Shop coats", formats: ["300x250"], isDefault: true, approvalStatus: "approved", renditions: [{ id: "rendition-default-300x250", templateId: "wool-coat-template-300x250", templateName: "Wool Coat Template - 300x250", format: "300x250", approvalStatus: "approved" }] },
        { id: "variant-2", name: "Relaxed chinos", headline: "Chinos, off duty", cta: "Shop now", formats: ["300x600"], isDefault: false, approvalStatus: "approved", renditions: [{ id: "rendition-2-300x600", templateId: "wool-coat-template-300x600", templateName: "Wool Coat Template - 300x600", format: "300x600", approvalStatus: "approved" }] },
        { id: "variant-3", name: "Utility overshirt", headline: "Utility, refined", cta: "Shop outerwear", formats: ["728x90"], isDefault: false, approvalStatus: "approved", renditions: [{ id: "rendition-3-728x90", templateId: "wool-coat-template-728x90", templateName: "Wool Coat Template - 728x90", format: "728x90", approvalStatus: "approved" }] },
        { id: "variant-4", name: "Merino knit", headline: "Merino, lighter warmth", cta: "Shop knitwear", formats: ["160x600"], isDefault: false, approvalStatus: "approved", renditions: [{ id: "rendition-4-160x600", templateId: "wool-coat-template-160x600", templateName: "Wool Coat Template - 160x600", format: "160x600", approvalStatus: "approved" }] },
        { id: "variant-5", name: "Tailored trousers", headline: "Trousers, tailored easy", cta: "Shop trousers", formats: ["120x600"], isDefault: false, approvalStatus: "approved", renditions: [{ id: "rendition-5-120x600", templateId: "wool-coat-template-120x600", templateName: "Wool Coat Template - 120x600", format: "120x600", approvalStatus: "approved" }] },
      ],
    };
  }

  function readPackage() {
    try {
      const saved = JSON.parse(window.sessionStorage.getItem(PACKAGE_KEY) || "null");
      if (saved?.approvedVariants?.length) {
        const approvedVariants = saved.approvedVariants
          .filter((variant) => variant.approvalStatus === "approved")
          .map((variant) => ({ ...variant, renditions: (variant.renditions || []).filter((rendition) => rendition.approvalStatus === "approved") }));
        if (approvedVariants.length) return { ...defaultPackage(), ...saved, approvedVariants, defaultRequired: true };
      }
    } catch (_error) {}
    return defaultPackage();
  }

  function initialRules() {
    return connectedTargeting ? connectedTargeting.initialRules() : [];
  }

  function initialAssignments(pkg) {
    return connectedTargeting ? connectedTargeting.initialAssignments(pkg) : pkg.approvedVariants.map((variant) => ({ variantId: variant.id, segmentId: "", activeRenditionIds: variantRenditions(variant).map((rendition) => rendition.id) }));
  }

  function freshState() {
    const activationPackage = readPackage();
    return {
      active: false,
      section: "overview",
      creativeType: "dynamic_creative",
      activationPackage,
      packageSignature: activationPackage.approvedVariants.map((variant) => `${variant.id}:${(variant.renditions || []).map((rendition) => rendition.id).join(",")}`).join("|"),
      segments: connectedTargeting ? connectedTargeting.initialSegments() : [],
      assignments: initialAssignments(activationPackage),
      pendingBulkSegmentId: "",
      selectedVariantIds: [],
      expandedVariantIds: [],
      expandedTrafficIds: [],
      assignmentPopover: null,
      media: {
        initialized: false,
        cmAdvertiserId: "",
        cmCampaignId: "",
        studioAdvertiserId: "",
        dvAdvertiserId: "",
        dvCampaignId: "",
      },
      dynamicMappings: [
        { id: "mapping-headline", smartlyField: "Headline", studioField: "headline", source: "Approved creative content", status: "mapped" },
        { id: "mapping-cta", smartlyField: "CTA", studioField: "cta", source: "Approved creative content", status: "mapped" },
        { id: "mapping-product-image", smartlyField: "Product image", studioField: "", source: "Approved rendition", status: "not_mapped" },
        { id: "mapping-landing-url", smartlyField: "Landing URL", studioField: "exit_url", source: "Automation Feed", status: "mapped" },
      ],
      studio: { profileId: "", profileName: "", profileState: "not_configured", publishingState: "not_published", rulesVersion: 1, ruleOrder: [], ruleOverrides: {}, customRules: [], fallbackEnabled: true },
      cm360: {
        deliveryAssignments: [],
        createdPlacements: [],
        publishingState: "not_published",
      },
      tags: { state: "not_generated" },
      modal: null,
    };
  }

  function restore() {
    const fallback = freshState();
    try {
      const saved = JSON.parse(window.sessionStorage.getItem(STORAGE_KEY) || "null");
      if (!saved) return fallback;
      if (saved.packageSignature !== fallback.packageSignature) return fallback;
      const savedStudio = saved.studio?.rulesVersion === 1 ? saved.studio : { publishingState: "not_published" };
      const state = { ...fallback, ...saved, activationPackage: fallback.activationPackage, media: { ...fallback.media, ...(saved.media || {}) }, studio: { ...fallback.studio, ...savedStudio }, cm360: { ...fallback.cm360, ...(saved.cm360 || {}) }, tags: { ...fallback.tags, ...(saved.tags || {}) }, active: false, modal: null, assignmentPopover: null };
      state.studio.ruleOrder = Array.isArray(state.studio.ruleOrder) ? state.studio.ruleOrder : [];
      state.studio.ruleOverrides = state.studio.ruleOverrides && typeof state.studio.ruleOverrides === "object" ? state.studio.ruleOverrides : {};
      state.studio.customRules = Array.isArray(state.studio.customRules) ? state.studio.customRules : [];
      state.studio.fallbackEnabled = state.studio.fallbackEnabled !== false;
      const approvedIds = new Set(state.activationPackage.approvedVariants.map((variant) => variant.id));
      state.assignments = (saved.assignments || []).filter((assignment) => approvedIds.has(assignment.variantId));
      state.activationPackage.approvedVariants.forEach((variant) => {
        if (!state.assignments.some((assignment) => assignment.variantId === variant.id)) state.assignments.push({ variantId: variant.id, segmentId: "", activeRenditionIds: variantRenditions(variant).map((rendition) => rendition.id) });
      });
      const renditionIds = new Set(state.activationPackage.approvedVariants.flatMap((variant) => variantRenditions(variant).flatMap((rendition) => [rendition.id, renditionTemplateId(rendition)])));
      state.cm360.deliveryAssignments = (state.cm360.deliveryAssignments || []).filter((assignment) => renditionIds.has(assignment.renditionId));
      state.cm360.createdPlacements = state.cm360.createdPlacements || [];
      return connectedTargeting ? connectedTargeting.normalizeState(state) : state;
    } catch (_error) { return fallback; }
  }

  function persist(state) {
    try { window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ ...state, active: false, modal: null })); } catch (_error) {}
  }

  function variantById(state, variantId) { return state.activationPackage.approvedVariants.find((variant) => variant.id === variantId); }
  function ruleById(state, ruleId) { return state.rules.find((rule) => rule.id === ruleId); }
  function assignmentFor(state, variantId) { return state.assignments.find((assignment) => assignment.variantId === variantId) || { variantId, ruleIds: [] }; }
  function rulesForType(state, assignment, type) { return assignment.ruleIds.map((ruleId) => ruleById(state, ruleId)).filter((rule) => rule?.type === type); }
  function usedByCount(state, ruleId) { return state.assignments.filter((assignment) => assignment.ruleIds.includes(ruleId)).length; }
  function variantRenditions(variant) {
    if (Array.isArray(variant?.renditions)) return variant.renditions;
    return (variant?.formats || []).map((format, index) => ({ id: `${variant.id}-rendition-${index + 1}`, format, approvalStatus: "approved" }));
  }
  function renditionTemplateId(rendition) { return rendition?.templateId || `wool-coat-template-${rendition?.format || "unknown"}`; }
  function renditionTemplateName(rendition) { return rendition?.templateName || `Wool Coat Template - ${rendition?.format || "Unknown"}`; }
  function deliveryKey(state, rendition) { return state.creativeType === "dynamic_creative" ? renditionTemplateId(rendition) : rendition.id; }
  function referenceList(referenceData, key) { return Array.isArray(referenceData?.[key]) ? referenceData[key] : []; }
  function referenceById(referenceData, key, itemId) { return referenceList(referenceData, key).find((item) => item.id === itemId) || null; }
  function syncMediaContext(state, workspace, referenceData) {
    if (state.media.initialized) return;
    state.media.cmAdvertiserId = workspace?.cmAdvertiserId || "";
    state.media.cmCampaignId = workspace?.cmCampaignId || "";
    state.media.dvAdvertiserId = workspace?.dvAdvertiserId || "";
    state.media.dvCampaignId = workspace?.dvCampaignId || "";
    state.media.studioAdvertiserId = referenceList(referenceData, "studioAdvertisers").find((item) => item.cmAdvertiserId === state.media.cmAdvertiserId)?.id || "";
    state.media.initialized = true;
  }
  function deliveriesFor(state, rendition) { return (state.cm360.deliveryAssignments || []).filter((assignment) => assignment.renditionId === deliveryKey(state, rendition)); }
  function deliveryFor(state, rendition) { return deliveriesFor(state, rendition)[0] || null; }
  function campaignPlacements(state, referenceData) { return referenceList(referenceData, "cm360Placements").filter((placement) => placement.campaignId === state.media.cmCampaignId); }
  function compatiblePlacements(state, referenceData, format) { return campaignPlacements(state, referenceData).filter((placement) => !(placement.formats || []).length || placement.formats.includes(format)); }
  function createdPlacementById(state, placementId) { return (state.cm360.createdPlacements || []).find((placement) => placement.id === placementId) || null; }
  function deliveryPlacement(state, referenceData, delivery) {
    if (!delivery) return null;
    return referenceById(referenceData, "cm360Placements", delivery.placementId) || createdPlacementById(state, delivery.placementId) || null;
  }
  function deliveryStatsForVariant(state, variant) {
    const renditions = variantRenditions(variant);
    const mapped = renditions.filter((rendition) => deliveryFor(state, rendition)).length;
    return { mapped, total: renditions.length };
  }
  function allTrafficRows(state) {
    if (connectedTargeting?.traffickingRows) return connectedTargeting.traffickingRows(state);
    if (connectedTargeting?.activeTrafficRows) return connectedTargeting.activeTrafficRows(state);
    return state.activationPackage.approvedVariants.flatMap((variant) => variantRenditions(variant).map((rendition) => ({ variant, rendition, delivery: deliveryFor(state, rendition), deliveries: deliveriesFor(state, rendition) })));
  }
  function trafficDeliveryPairs(state) { return allTrafficRows(state).flatMap((row) => (row.deliveries?.length ? row.deliveries : row.delivery ? [row.delivery] : []).map((delivery) => ({ row, delivery }))); }
  function activationStats(state) {
    if (connectedTargeting?.activationStats) return connectedTargeting.activationStats(state);
    const rows = allTrafficRows(state);
    return { totalVariants: state.activationPackage.approvedVariants.length, activeVariantCount: new Set(rows.map((row) => row.variant.id)).size, inactiveVariantCount: 0, totalRenditions: rows.length, activeRenditionCount: rows.length, inactiveRenditionCount: 0 };
  }

  function segmentById(state, segmentId) { return state.segments.find((segment) => segment.id === segmentId) || null; }
  function mappingCondition(mapping) {
    const label = mapping.type === "Manual Entry" ? mapping.idType || "Manual entry" : mapping.type;
    return { key: mapping.type === "Manual Entry" ? `Manual Entry:${label}` : mapping.type, label };
  }
  function segmentConditions(segment) {
    const conditions = new Map();
    (segment?.mappings || []).forEach((mapping) => { const condition = mappingCondition(mapping); conditions.set(condition.key, condition); });
    return [...conditions.values()].sort((left, right) => left.label.localeCompare(right.label));
  }
  function activeSegmentUsages(state) {
    const usages = new Map();
    state.assignments.forEach((assignment) => {
      const variant = variantById(state, assignment.variantId), segment = segmentById(state, assignment.segmentId);
      const active = variant && (connectedTargeting?.activeRenditionsFor ? connectedTargeting.activeRenditionsFor(state, variant).length : variantRenditions(variant).length);
      if (!active || !segment?.enabled) return;
      if (!usages.has(segment.id)) usages.set(segment.id, { segment, variantIds: new Set() });
      usages.get(segment.id).variantIds.add(variant.id);
    });
    return [...usages.values()];
  }
  function stableStudioRuleId(signature) {
    let hash = 2166136261;
    for (let index = 0; index < signature.length; index += 1) { hash ^= signature.charCodeAt(index); hash = Math.imul(hash, 16777619); }
    return `studio-auto-${(hash >>> 0).toString(16)}`;
  }
  function availableStudioConditions(state) {
    const available = new Map();
    activeSegmentUsages(state).forEach(({ segment }) => segmentConditions(segment).forEach((condition) => {
      const current = available.get(condition.key) || { ...condition, segmentIds: new Set() };
      current.segmentIds.add(segment.id); available.set(condition.key, current);
    }));
    return [...available.values()].sort((left, right) => left.label.localeCompare(right.label));
  }
  function generatedStudioRules(state) {
    const groups = new Map();
    activeSegmentUsages(state).forEach(({ segment, variantIds }) => {
      const conditions = segmentConditions(segment);
      if (!conditions.length) return;
      const signature = conditions.map((condition) => condition.key).sort().join("|");
      if (!groups.has(signature)) groups.set(signature, { id: stableStudioRuleId(signature), source: "generated", conditions, segmentIds: new Set(), segmentNames: new Set(), variantIds: new Set() });
      const group = groups.get(signature); group.segmentIds.add(segment.id); group.segmentNames.add(segment.name); variantIds.forEach((variantId) => group.variantIds.add(variantId));
    });
    return [...groups.values()].map((rule) => {
      const disabled = new Set(state.studio.ruleOverrides?.[rule.id]?.disabledConditionKeys || []);
      return { ...rule, segmentIds: [...rule.segmentIds], segmentNames: [...rule.segmentNames], variantIds: [...rule.variantIds], conditions: rule.conditions.map((condition) => ({ ...condition, enabled: !disabled.has(condition.key), available: true })) };
    });
  }
  function customStudioRules(state, availableConditions) {
    const available = new Map(availableConditions.map((condition) => [condition.key, condition]));
    const usages = activeSegmentUsages(state);
    return (state.studio.customRules || []).map((savedRule) => {
      const conditions = (savedRule.conditions || []).map((condition) => ({ ...condition, available: available.has(condition.key) }));
      const enabledKeys = conditions.filter((condition) => condition.enabled).map((condition) => condition.key);
      const matchingUsages = enabledKeys.length ? usages.filter(({ segment }) => { const keys = new Set(segmentConditions(segment).map((condition) => condition.key)); return enabledKeys.every((key) => keys.has(key)); }) : [];
      return { ...savedRule, source: "custom", conditions, segmentIds: matchingUsages.map(({ segment }) => segment.id), segmentNames: matchingUsages.map(({ segment }) => segment.name), variantIds: [...new Set(matchingUsages.flatMap(({ variantIds }) => [...variantIds]))] };
    });
  }
  function studioRules(state) {
    const available = availableStudioConditions(state), rules = [...generatedStudioRules(state), ...customStudioRules(state, available)];
    const ids = new Set(rules.map((rule) => rule.id));
    state.studio.ruleOrder = [...state.studio.ruleOrder.filter((ruleId) => ids.has(ruleId)), ...rules.map((rule) => rule.id).filter((ruleId) => !state.studio.ruleOrder.includes(ruleId))];
    const byId = new Map(rules.map((rule) => [rule.id, rule]));
    return state.studio.ruleOrder.map((ruleId) => byId.get(ruleId)).filter(Boolean);
  }
  function studioRuleSignature(rule) { return rule.conditions.filter((condition) => condition.enabled).map((condition) => condition.key).sort().join("|"); }
  function studioRuleIssues(state) {
    const issues = [];
    studioRules(state).forEach((rule, index) => {
      const enabled = rule.conditions.filter((condition) => condition.enabled);
      if (!enabled.length) issues.push({ id: `studio-rule-empty-${rule.id}`, label: `${rule.name || `Rule ${index + 1}`} has no active conditions`, details: "Turn on at least one condition or remove the custom rule.", section: "studio" });
      const unavailable = enabled.filter((condition) => condition.available === false);
      if (unavailable.length) issues.push({ id: `studio-rule-unavailable-${rule.id}`, label: `${rule.name || `Rule ${index + 1}`} uses unavailable conditions`, details: `${unavailable.map((condition) => condition.label).join(", ")} ${unavailable.length === 1 ? "is" : "are"} no longer supplied by an eligible Segment.`, section: "studio" });
    });
    return issues;
  }
  function syncStudioProfile(state, referenceData) {
    const campaign = referenceById(referenceData, "cm360Campaigns", state.media.cmCampaignId);
    const advertiser = referenceById(referenceData, "studioAdvertisers", state.media.studioAdvertiserId);
    if (!campaign || !advertiser) {
      state.studio.profileId = ""; state.studio.profileName = ""; state.studio.profileState = "not_configured"; state.studio.publishingState = "not_published";
      return;
    }
    state.studio.profileId = `auto-studio-profile-${campaign.id}`;
    state.studio.profileName = `${campaign.name} Dynamic Creative`;
    state.studio.profileState = "created";
  }
  function makeCreatedPlacement(state, variant, rendition, campaignName, site) {
    const placement = {
      id: id("created-placement"),
      campaignId: state.media.cmCampaignId,
      name: `${campaignName || "CM360 Campaign"} — ${state.creativeType === "dynamic_creative" ? renditionTemplateName(rendition) : `${variant.name} — ${rendition.format}`}`,
      formats: [rendition.format],
      site: site || "Example News",
      source: "Smartly",
    };
    state.cm360.createdPlacements.push(placement);
    return placement;
  }
  function setDelivery(state, variant, rendition, placement, strategy) {
    const key = deliveryKey(state, rendition);
    state.cm360.deliveryAssignments = (state.cm360.deliveryAssignments || []).filter((assignment) => state.creativeType === "dynamic_creative" ? !(assignment.renditionId === key && assignment.placementId === placement.id) : assignment.renditionId !== key);
    state.cm360.deliveryAssignments.push({
      variantId: variant.id,
      renditionId: key,
      templateId: renditionTemplateId(rendition),
      templateName: renditionTemplateName(rendition),
      format: rendition.format,
      campaignId: state.media.cmCampaignId,
      placementId: placement.id,
      placementSnapshot: clone(placement),
      strategy,
      status: strategy === "existing" ? "reused" : "created",
    });
  }
  function invalidateTrafficking(state) {
    state.cm360.publishingState = "not_published";
    state.tags.state = "not_generated";
  }
  function applyAutomaticDelivery(state, variants, referenceData, createMissing) {
    const campaign = referenceById(referenceData, "cm360Campaigns", state.media.cmCampaignId);
    if (!campaign) return { reused: 0, created: 0, skipped: variants.flatMap(variantRenditions).length };
    let reused = 0, created = 0, skipped = 0;
    variants.forEach((variant) => variantRenditions(variant).forEach((rendition) => {
      const current = deliveryFor(state, rendition);
      if (current) { current.strategy === "existing" ? reused += 1 : created += 1; return; }
      const existing = compatiblePlacements(state, referenceData, rendition.format);
      if (existing.length) { existing.forEach((placement) => setDelivery(state, variant, rendition, placement, "existing")); reused += existing.length; return; }
      if (createMissing) { const placement = makeCreatedPlacement(state, variant, rendition, campaign.name, "Example News"); setDelivery(state, variant, rendition, placement, "create"); created += 1; return; }
      skipped += 1;
    }));
    invalidateTrafficking(state);
    return { reused, created, skipped };
  }

  function ruleDefinition(rule) {
    if (connectedTargeting) return connectedTargeting.ruleDefinition(rule);
    if (rule.type === "Audience") return `${rule.displayName || rule.name} · ${rule.platformIdType || "ID type not selected"}: ${(rule.mappings || []).join(" OR ") || "No IDs mapped"}`;
    if (rule.type === "Geography") return `${(rule.locations || []).join(" OR ") || "No locations"}${rule.radius ? ` · ${rule.radius} km radius` : ""}`;
    const schedule = rule.customSchedule ? Object.entries(rule.dayTimes || {}).filter(([, value]) => value?.enabled).map(([day, value]) => `${day.slice(0, 3)} ${value.start}-${value.end}`).join(" OR ") : rule.preset;
    return `${rule.timezone || "Timezone missing"} · ${schedule || "No schedule"}`;
  }

  function invalidRule(rule) {
    if (connectedTargeting) return connectedTargeting.invalidRule(rule);
    if (!String(rule.name || "").trim() || !RULE_TYPES.includes(rule.type)) return true;
    if (rule.type === "Audience") return !rule.platformIdType || !rule.source || !String(rule.displayName || "").trim() || !(rule.mappings || []).length;
    if (rule.type === "Geography") return !(rule.locations || []).length || (rule.radius && Number(rule.radius) <= 0);
    if (rule.type === "Schedule") return !rule.timezone || (rule.customSchedule ? !Object.values(rule.dayTimes || {}).some((value) => value.enabled && value.start && value.end) : !rule.preset);
    return true;
  }

  function targetingIssues(state) {
    if (connectedTargeting) return connectedTargeting.targetingIssues(state);
    const issues = [];
    const approvedIds = new Set(state.activationPackage.approvedVariants.filter((variant) => variant.approvalStatus === "approved").map((variant) => variant.id));
    const unapprovedRefs = state.assignments.filter((assignment) => !approvedIds.has(assignment.variantId));
    if (unapprovedRefs.length) issues.push({ id: "unapproved", label: "Unapproved creative references", details: `${unapprovedRefs.length} assignment${unapprovedRefs.length === 1 ? " references" : "s reference"} an unapproved creative.`, section: "assignments" });
    const hasDefault = state.activationPackage.approvedVariants.some((variant) => variant.isDefault && assignmentFor(state, variant.id).ruleIds.length === 0);
    if (state.activationPackage.defaultRequired && state.studio?.fallbackEnabled !== false && !hasDefault) issues.push({ id: "default", label: "Missing default creative", details: "A Default Creative is required while the Studio fallback rule is enabled.", section: "assignments" });
    const invalid = state.rules.filter(invalidRule);
    if (invalid.length) issues.push({ id: "invalid-rules", label: "Invalid targeting rules", details: `${invalid.length} targeting rule${invalid.length === 1 ? " is" : "s are"} incomplete or invalid.`, section: "targeting" });
    const disabledAssigned = state.assignments.flatMap((assignment) => assignment.ruleIds).filter((ruleId) => ruleById(state, ruleId)?.enabled === false);
    if (disabledAssigned.length) issues.push({ id: "disabled-assigned", label: "Disabled rules assigned", details: `${new Set(disabledAssigned).size} disabled rule${new Set(disabledAssigned).size === 1 ? " is" : "s are"} still assigned to creatives.`, section: "assignments" });
    const signatures = new Map();
    state.assignments.forEach((assignment) => {
      const variant = variantById(state, assignment.variantId);
      if (!variant || variant.isDefault || !assignment.ruleIds.length) return;
      const signature = [...assignment.ruleIds].sort().join("|");
      signatures.set(signature, (signatures.get(signature) || 0) + 1);
    });
    const conflicts = [...signatures.values()].filter((count) => count > 1).reduce((total, count) => total + count, 0);
    if (conflicts) issues.push({ id: "overlap", label: "Overlapping creative eligibility", details: `${conflicts} creatives share the same targeting eligibility and may conflict.`, section: "assignments" });
    return issues;
  }

  function dynamicMappingIssues(state) {
    const issues = [];
    const missing = state.dynamicMappings.filter((mapping) => !mapping.studioField || mapping.status === "not_mapped");
    if (missing.length) issues.push({ id: "mapping-missing", label: "Dynamic fields mapped", details: `${missing.length} Smartly field${missing.length === 1 ? " is" : "s are"} not mapped to Studio.`, section: "studio" });
    const duplicates = state.dynamicMappings.filter((mapping, index, rows) => mapping.studioField && rows.findIndex((item) => item.studioField === mapping.studioField) !== index);
    if (duplicates.length || state.dynamicMappings.some((mapping) => mapping.status === "invalid")) issues.push({ id: "mapping-invalid", label: "Dynamic mappings valid", details: "One or more Studio fields have invalid or duplicate mappings.", section: "studio" });
    return issues;
  }

  function refreshMappingStatuses(state) {
    state.dynamicMappings.forEach((mapping) => {
      if (!mapping.studioField) mapping.status = "not_mapped";
      else mapping.status = state.dynamicMappings.some((other) => other.id !== mapping.id && other.studioField === mapping.studioField) ? "invalid" : "mapped";
    });
  }

  function mediaIssues(state, referenceData) {
    const issues = [];
    const cmAdvertiser = referenceById(referenceData, "cm360Advertisers", state.media.cmAdvertiserId);
    const cmCampaign = referenceById(referenceData, "cm360Campaigns", state.media.cmCampaignId);
    if (!cmAdvertiser) issues.push({ id: "media-cm-advertiser", label: "CM360 Advertiser connected", details: "Select a CM360 Advertiser.", section: "media" });
    if (!cmCampaign || cmCampaign.advertiserId !== state.media.cmAdvertiserId) issues.push({ id: "media-cm-campaign", label: "CM360 Campaign connected", details: "Select a CM360 Campaign belonging to the connected advertiser.", section: "media" });
    if (state.creativeType === "dynamic_creative") {
      const studioAdvertiser = referenceById(referenceData, "studioAdvertisers", state.media.studioAdvertiserId);
      if (!studioAdvertiser || studioAdvertiser.cmAdvertiserId !== state.media.cmAdvertiserId) issues.push({ id: "media-studio", label: "Studio Advertiser connected", details: "Select a Studio Advertiser connected to the CM360 Advertiser.", section: "media" });
    }
    if (state.media.dvAdvertiserId || state.media.dvCampaignId) {
      const dvAdvertiser = referenceById(referenceData, "dv360Advertisers", state.media.dvAdvertiserId);
      const dvCampaign = referenceById(referenceData, "dv360Campaigns", state.media.dvCampaignId);
      if (!dvAdvertiser || !(dvAdvertiser.connectedCmAdvertiserIds || []).includes(state.media.cmAdvertiserId)) issues.push({ id: "media-dv-advertiser", label: "DV360 Advertiser connected", details: "Select a DV360 Advertiser connected to the CM360 Advertiser.", section: "media" });
      if (!dvCampaign || dvCampaign.advertiserId !== state.media.dvAdvertiserId) issues.push({ id: "media-dv-campaign", label: "DV360 Campaign connected", details: "Select a DV360 Campaign belonging to the selected DV360 Advertiser.", section: "media" });
    }
    return issues;
  }

  function deliveryIssues(state) {
    if (connectedTargeting) return connectedTargeting.deliveryIssues(state);
    const rows = allTrafficRows(state);
    const missing = rows.filter((row) => !row.delivery).length;
    const issues = [];
    if (missing) issues.push({ id: "delivery-missing", label: "Rendition delivery configured", details: `${missing} rendition${missing === 1 ? " does" : "s do"} not have a CM360 placement.`, section: "assignments" });
    return issues;
  }

  function validationChecks(state, referenceData) {
    const approvedCount = state.activationPackage.approvedVariants.filter((variant) => variant.approvalStatus === "approved").length;
    const activeStats = activationStats(state);
    const creativeChecks = [
      { id: "approved", label: "Approved activation package", ready: approvedCount > 0, details: `${approvedCount} approved creative variant${approvedCount === 1 ? "" : "s"} included; ${state.activationPackage.excludedPreviewCount || 0} unapproved preview${state.activationPackage.excludedPreviewCount === 1 ? "" : "s"} excluded.`, section: "overview", warning: (state.activationPackage.excludedPreviewCount || 0) > 0 },
      { id: "active-creatives", label: "Active creative formats selected", ready: activeStats.activeRenditionCount > 0, details: activeStats.activeRenditionCount ? `${activeStats.activeVariantCount} active variant${activeStats.activeVariantCount === 1 ? "" : "s"} · ${activeStats.activeRenditionCount} active format${activeStats.activeRenditionCount === 1 ? "" : "s"} · ${activeStats.inactiveRenditionCount} excluded.` : "Turn on at least one approved format in Creative Assignments.", section: "assignments", warning: activeStats.inactiveRenditionCount > 0 },
    ];
    const mediaIssueMap = new Map(mediaIssues(state, referenceData).map((issue) => [issue.id, issue]));
    const mediaCheckIds = ["media-cm-advertiser", "media-cm-campaign", ...(state.creativeType === "dynamic_creative" ? ["media-studio"] : []), ...(state.media.dvAdvertiserId || state.media.dvCampaignId ? ["media-dv-advertiser", "media-dv-campaign"] : [])];
    const mediaChecks = mediaCheckIds.map((issueId) => ({ id: issueId, label: ({ "media-cm-advertiser": "CM360 Advertiser connected", "media-cm-campaign": "CM360 Campaign connected", "media-studio": "Studio Advertiser connected", "media-dv-advertiser": "DV360 Advertiser connected", "media-dv-campaign": "DV360 Campaign connected" })[issueId], ready: !mediaIssueMap.has(issueId), details: mediaIssueMap.get(issueId)?.details || "Media connection is configured.", section: "media" }));
    const deliveryChecks = deliveryIssues(state).map((issue) => ({ ...issue, ready: false }));
    if (state.creativeType === "standard_display") return [...creativeChecks, ...mediaChecks, ...deliveryChecks];
    const targetingChecks = targetingIssues(state).filter((issue) => issue.id !== "no-active-creatives").map((issue) => ({ ...issue, ready: false }));
    const ruleChecks = studioRuleIssues(state).map((issue) => ({ ...issue, ready: false }));
    return [
      ...creativeChecks,
      ...targetingChecks,
      ...ruleChecks,
      { id: "profile", label: "Studio Profile created", ready: state.studio.profileState === "created", details: state.studio.profileState === "created" ? `${state.studio.profileName} was created automatically from the connected campaign.` : "Connect a CM360 Campaign and Studio Advertiser in Media.", section: "studio" },
      { id: "studio-completed", label: "Studio setup completed", ready: state.studio.publishingState === "published", details: state.studio.publishingState === "published" ? "The profile and ordered serving rules are ready for trafficking." : "Review the serving-rule order and complete Studio setup.", section: "studio" },
      ...mediaChecks,
      ...deliveryChecks,
    ];
  }

  function blockerCount(state, referenceData) { return validationChecks(state, referenceData).filter((check) => !check.ready).length; }
  function invalidateStudioData(state) {
    state.studio.publishingState = "not_published";
    if (state.cm360.publishingState !== "published") state.cm360.publishingState = "not_published";
    state.tags.state = "not_generated";
  }

  function render(state, workspace, referenceData) {
    syncMediaContext(state, workspace, referenceData);
    syncStudioProfile(state, referenceData);
    const blockers = blockerCount(state, referenceData);
    return `<main class="dco-workflow-layout"><aside class="dco-workflow-nav" aria-label="DCO activation sections"><a class="dco-editor-return" href="../dco-editor/index.html?tab=assets">← Approved creative</a><button class="dco-back-link" type="button" data-dco-action="exit">← Workspace blueprint</button><div class="dco-nav-heading"><span>Rich Media / DCO</span><strong>Activation workflow</strong></div><nav>${sections.map((section, index) => renderNavItem(state, section, index, referenceData)).join("")}</nav><div class="dco-nav-summary"><span>Publish readiness</span><strong>${blockers ? `${blockers} blocking issue${blockers === 1 ? "" : "s"}` : "Ready to publish"}</strong></div></aside><section class="dco-workflow-main">${renderHeader(state, workspace)}${renderSection(state, referenceData)}</section>${renderModal(state, referenceData)}</main>`;
  }

  function renderNavItem(state, section, index, referenceData) {
    let label = "Not started", tone = "gray";
    if (section.id === "overview") { label = "Ready"; tone = "green"; }
    if (section.id === "media") { const issues = mediaIssues(state, referenceData).length; label = issues ? `${issues} issues` : "Connected"; tone = issues ? "yellow" : "green"; }
    if (section.id === "targeting") { const issues = targetingIssues(state).filter((issue) => issue.id === "invalid-segments"); label = issues.length ? `${issues.length} issues` : `${state.segments.length} Segments`; tone = issues.length ? "red" : "green"; }
    if (section.id === "assignments") { const issues = targetingIssues(state).filter((issue) => ["unapproved", "no-active-creatives", "default", "missing-segments"].includes(issue.id)); const stats = activationStats(state); label = issues.length ? `${issues.length} issues` : `${stats.activeVariantCount}/${stats.totalVariants} active`; tone = issues.length ? "yellow" : "green"; }
    if (section.id === "studio") { const done = state.studio.publishingState === "published"; const issues = studioRuleIssues(state).length; label = done ? "Completed" : issues ? `${issues} rule issue${issues === 1 ? "" : "s"}` : state.studio.profileState === "created" ? "Ready to complete" : "Not configured"; tone = done ? "green" : issues ? "yellow" : state.studio.profileState === "created" ? "blue" : "gray"; }
    if (section.id === "trafficking") { const issues = deliveryIssues(state).length; label = state.cm360.publishingState === "publishing" ? "Syncing" : state.cm360.publishingState === "published" ? "Published" : issues ? `${issues} issues` : "Ready"; tone = state.cm360.publishingState === "publishing" ? "blue" : state.cm360.publishingState === "published" || !issues ? "green" : "yellow"; }
    if (section.id === "review") { const blockers = blockerCount(state, referenceData); label = state.cm360.publishingState === "publishing" ? "Syncing" : blockers ? `${blockers} blocking` : "Ready"; tone = state.cm360.publishingState === "publishing" ? "blue" : blockers ? "red" : "green"; }
    if (section.id === "tags") { label = state.tags.state === "generated" ? "Generated" : state.cm360.publishingState === "published" ? "Available" : "Locked"; tone = state.tags.state === "generated" ? "green" : state.cm360.publishingState === "published" ? "blue" : "gray"; }
    if (state.creativeType === "standard_display" && ["targeting", "studio"].includes(section.id)) { label = "Not required"; tone = "gray"; }
    return `<button class="dco-nav-item ${state.section === section.id ? "active" : ""}" type="button" data-dco-action="section" data-section="${section.id}"><span class="dco-nav-index">${index + 1}</span><span class="dco-nav-copy"><strong>${escapeHtml(section.label)}</strong><small>${escapeHtml(label)}</small></span><span class="dco-nav-dot ${tone}"></span></button>`;
  }

  function renderHeader(state, workspace) {
    const syncing = state.cm360.publishingState === "publishing";
    const published = state.cm360.publishingState === "published";
    return `<header class="dco-workflow-header"><div><div class="eyebrow">${escapeHtml(workspace?.name || "CM360 Workspace")} / Approved creative activation</div><div class="title-line"><h1>${escapeHtml(state.activationPackage.name)}</h1>${chip(syncing ? "Syncing" : published ? "Published" : "Draft", syncing ? "blue" : published ? "green" : "gray")}</div><p>${state.creativeType === "dynamic_creative" ? "Media, targeting, creative assignment, Studio preparation, and trafficking form one activation workflow." : "Standard Display connects approved creative to Media and CM360 Trafficking."}</p></div><div class="dco-header-meta"><span>Autosave</span><strong>Saved just now</strong></div></header>`;
  }

  function renderSection(state, referenceData) {
    if (state.creativeType === "standard_display" && ["targeting", "studio"].includes(state.section)) return renderNotRequired(state);
    if (state.section === "media") return renderMedia(state, referenceData);
    if (state.section === "targeting" && connectedTargeting) return connectedTargeting.renderTargeting(state);
    if (state.section === "assignments" && connectedTargeting) return connectedTargeting.renderAssignments(state);
    if (state.section === "studio") return renderStudio(state, referenceData);
    if (state.section === "trafficking" && connectedTargeting) return connectedTargeting.renderTrafficking(state);
    if (state.section === "review") return renderReviewPublish(state, referenceData);
    if (state.section === "tags") return renderTags(state, referenceData);
    return renderOverview(state);
  }

  function renderOverview(state) {
    const pkg = state.activationPackage;
    const formats = [...new Set(pkg.approvedVariants.flatMap((variant) => variant.formats || []))];
    return `<div class="dco-section-head"><div><h2>Overview</h2><p>Choose an activation type and confirm the approved creative package received from Assets.</p></div></div>
      <section class="dco-panel"><div class="dco-panel-head"><div><h3>Activation type</h3><p>Standard Display uses Media, delivery assignment, and Trafficking. Dynamic Creative also uses Segments and Studio preparation.</p></div></div><div class="dco-type-selector" role="radiogroup"><button class="dco-type-option ${state.creativeType === "standard_display" ? "selected" : ""}" type="button" data-dco-action="creative-type" data-value="standard_display"><strong>Standard Display</strong><span>Connect media, configure rendition delivery, and review the CM360 trafficking plan.</span></button><button class="dco-type-option ${state.creativeType === "dynamic_creative" ? "selected" : ""}" type="button" data-dco-action="creative-type" data-value="dynamic_creative"><strong>Dynamic Creative</strong><span>Use Media, Segments, Creative Assignments, Studio preparation, and Trafficking.</span></button></div></section>
      <section class="dco-panel"><div class="dco-panel-head"><div><h3>Activation package</h3><p>Received from Template Editor Assets.</p></div>${chip("Approved content only", "green")}</div><dl class="dco-metadata-grid"><div><dt>Creative name</dt><dd>${escapeHtml(pkg.name)}</dd></div><div><dt>Source</dt><dd>Automation Feed</dd></div><div><dt>Template</dt><dd>Summer Display Master</dd></div><div><dt>Activation type</dt><dd>${state.creativeType === "dynamic_creative" ? "Dynamic Creative" : "Standard Display"}</dd></div><div><dt>Approved variants</dt><dd>${pkg.approvedVariants.length}</dd></div><div><dt>Approved previews</dt><dd>${pkg.approvedPreviewCount}</dd></div><div><dt>Renditions</dt><dd>${pkg.approvedVariants.reduce((total, variant) => total + variantRenditions(variant).length, 0)}</dd></div><div><dt>Formats</dt><dd>${escapeHtml(formats.join(" · "))}</dd></div></dl></section>
      ${pkg.excludedPreviewCount ? `<section class="dco-exclusion-notice"><div>${chip("Information", "blue")}</div><div><strong>${pkg.excludedPreviewCount} unapproved preview${pkg.excludedPreviewCount === 1 ? " was" : "s were"} excluded</strong><p>Excluded creatives are not referenced by Activation, Studio, Trafficking, or publishing. Activation can continue.</p></div></section>` : ""}
      <section class="dco-panel"><div class="dco-panel-head"><div><h3>Activation model</h3><p>Creative creation stays in Editor / Content / Assets. Activation owns media context, targeting, Studio preparation, and delivery.</p></div></div><div class="dco-model-flow">${state.creativeType === "dynamic_creative" ? "<span>Creative</span><b>→</b><span>Media</span><b>→</b><span>Targeting</span><b>→</b><span>Creative assignment</span><b>→</b><span>Studio</span><b>→</b><span>Trafficking</span>" : "<span>Creative</span><b>→</b><span>Media</span><b>→</b><span>Delivery</span><b>→</b><span>Trafficking</span>"}</div></section>`;
  }

  function renderReferenceOptions(items, selectedId, placeholder) {
    return [`<option value="">${escapeHtml(placeholder)}</option>`, ...items.map((item) => `<option value="${escapeHtml(item.id)}" ${item.id === selectedId ? "selected" : ""}>${escapeHtml(item.name)}</option>`)].join("");
  }

  function renderMedia(state, referenceData) {
    const cmAdvertisers = referenceList(referenceData, "cm360Advertisers").filter((item) => item.id !== "cmadv-unselected");
    const cmCampaigns = referenceList(referenceData, "cm360Campaigns").filter((item) => item.advertiserId === state.media.cmAdvertiserId);
    const studioAdvertisers = referenceList(referenceData, "studioAdvertisers").filter((item) => item.cmAdvertiserId === state.media.cmAdvertiserId);
    const dvAdvertisers = referenceList(referenceData, "dv360Advertisers").filter((item) => (item.connectedCmAdvertiserIds || []).includes(state.media.cmAdvertiserId));
    const dvCampaigns = referenceList(referenceData, "dv360Campaigns").filter((item) => item.advertiserId === state.media.dvAdvertiserId);
    const cmAdvertiser = referenceById(referenceData, "cm360Advertisers", state.media.cmAdvertiserId);
    const cmCampaign = referenceById(referenceData, "cm360Campaigns", state.media.cmCampaignId);
    const studioAdvertiser = referenceById(referenceData, "studioAdvertisers", state.media.studioAdvertiserId);
    const dvAdvertiser = referenceById(referenceData, "dv360Advertisers", state.media.dvAdvertiserId);
    const dvCampaign = referenceById(referenceData, "dv360Campaigns", state.media.dvCampaignId);
    const cmConnected = Boolean(cmAdvertiser && cmCampaign && cmCampaign.advertiserId === cmAdvertiser.id);
    const studioConnected = Boolean(studioAdvertiser && studioAdvertiser.cmAdvertiserId === state.media.cmAdvertiserId);
    const dvConnected = Boolean(dvAdvertiser && dvCampaign && dvCampaign.advertiserId === dvAdvertiser.id);
    return `<div class="dco-section-head"><div><h2>Media</h2><p>Establish advertiser and campaign context for Studio and CM360 trafficking. Targeting and placements are configured later.</p></div></div>
      <section class="dco-media-grid">
        <article class="dco-panel dco-media-card"><div class="dco-panel-head"><div><h3>CM360</h3><p>Required media context</p></div>${chip(cmConnected ? "Connected" : "Needs setup", cmConnected ? "green" : "yellow")}</div><div class="form-grid"><label class="field"><span>Advertiser</span><select data-dco-media-field="cmAdvertiserId">${renderReferenceOptions(cmAdvertisers, state.media.cmAdvertiserId, "Select advertiser")}</select></label><label class="field"><span>Campaign</span><select data-dco-media-field="cmCampaignId" ${state.media.cmAdvertiserId ? "" : "disabled"}>${renderReferenceOptions(cmCampaigns, state.media.cmCampaignId, state.media.cmAdvertiserId ? "Select campaign" : "Select advertiser first")}</select></label></div>${cmConnected ? `<dl class="dco-connection-summary"><div><dt>Advertiser</dt><dd>${escapeHtml(cmAdvertiser.name)}</dd></div><div><dt>Campaign</dt><dd>${escapeHtml(cmCampaign.name)}</dd></div></dl><button class="text-button" type="button" data-dco-action="focus-media" data-media-field="cmAdvertiserId">Change</button>` : ""}<div class="dco-media-context">Existing placements can now be selected or Smartly can create placements during trafficking.</div></article>
        <article class="dco-panel dco-media-card"><div class="dco-panel-head"><div><h3>Google Studio</h3><p>${state.creativeType === "dynamic_creative" ? "Required for Dynamic Creative" : "Not required for Standard Display"}</p></div>${chip(studioConnected ? "Connected" : state.creativeType === "dynamic_creative" ? "Needs setup" : "Optional", studioConnected ? "green" : state.creativeType === "dynamic_creative" ? "yellow" : "gray")}</div><label class="field"><span>Advertiser</span><select data-dco-media-field="studioAdvertiserId" ${state.media.cmAdvertiserId ? "" : "disabled"}>${renderReferenceOptions(studioAdvertisers, state.media.studioAdvertiserId, state.media.cmAdvertiserId ? "Select Studio Advertiser" : "Select CM360 Advertiser first")}</select></label>${studioConnected ? `<dl class="dco-connection-summary"><div><dt>Advertiser</dt><dd>${escapeHtml(studioAdvertiser.name)}</dd></div></dl>` : ""}</article>
        <article class="dco-panel dco-media-card"><div class="dco-panel-head"><div><h3>DV360</h3><p>Optional media context</p></div>${chip(dvConnected ? "Connected" : state.media.dvAdvertiserId || state.media.dvCampaignId ? "Needs setup" : "Optional", dvConnected ? "green" : state.media.dvAdvertiserId || state.media.dvCampaignId ? "yellow" : "gray")}</div><div class="form-grid"><label class="field"><span>Advertiser</span><select data-dco-media-field="dvAdvertiserId" ${state.media.cmAdvertiserId ? "" : "disabled"}>${renderReferenceOptions(dvAdvertisers, state.media.dvAdvertiserId, state.media.cmAdvertiserId ? "Select DV360 Advertiser" : "Select CM360 Advertiser first")}</select></label><label class="field"><span>Campaign</span><select data-dco-media-field="dvCampaignId" ${state.media.dvAdvertiserId ? "" : "disabled"}>${renderReferenceOptions(dvCampaigns, state.media.dvCampaignId, state.media.dvAdvertiserId ? "Select DV360 Campaign" : "Select DV360 Advertiser first")}</select></label></div>${dvConnected ? `<dl class="dco-connection-summary"><div><dt>Advertiser</dt><dd>${escapeHtml(dvAdvertiser.name)}</dd></div><div><dt>Campaign</dt><dd>${escapeHtml(dvCampaign.name)}</dd></div></dl>` : ""}</article>
      </section>${connectedTargeting ? connectedTargeting.renderMediaSync(state) : ""}`;
  }

  function renderTargetingRules(state) {
    return `<div class="dco-section-head"><div><h2>Targeting Rules</h2><p>Create independent, reusable Audience, Geography, and Schedule rules. No rule type is required for every creative.</p></div><button class="primary-button" type="button" data-dco-action="add-rule">Add targeting rule</button></div><section class="dco-logic-notice"><strong>Rule combination</strong><span>Different rules assigned to one creative use <b>AND</b> logic. Multiple values inside one rule use <b>OR</b> logic.</span></section><section class="dco-panel"><div class="dco-table-scroll"><table class="dco-data-table"><thead><tr><th>Rule name</th><th>Type</th><th>Definition</th><th>Used by</th><th>State</th><th>Actions</th></tr></thead><tbody>${state.rules.map((rule) => `<tr><td><strong>${escapeHtml(rule.name)}</strong></td><td>${chip(rule.type, rule.type === "Audience" ? "purple" : rule.type === "Geography" ? "blue" : "gray")}</td><td>${escapeHtml(ruleDefinition(rule))}</td><td>${usedByCount(state, rule.id)} creative${usedByCount(state, rule.id) === 1 ? "" : "s"}</td><td>${chip(invalidRule(rule) ? "Invalid" : rule.enabled ? "Enabled" : "Disabled", invalidRule(rule) ? "red" : rule.enabled ? "green" : "gray")}</td><td><div class="row-actions"><button class="text-button" type="button" data-dco-action="edit-rule" data-rule-id="${rule.id}">Edit</button><button class="text-button" type="button" data-dco-action="toggle-rule-state" data-rule-id="${rule.id}">${rule.enabled ? "Disable" : "Enable"}</button></div></td></tr>`).join("")}</tbody></table></div></section>`;
  }

  function renderAssignments(state, referenceData) {
    const selected = new Set(state.selectedVariantIds);
    return `<div class="dco-section-head"><div><h2>Creative Assignments</h2><p>Assign targeting to logical creative variants and CM360 delivery to individual renditions.</p></div></div><section class="dco-logic-notice"><strong>Separate controls</strong><span>Audience + Geography + Schedule use <b>AND</b>. Values within one rule use <b>OR</b>. Delivery controls where each rendition is trafficked.</span></section><section class="dco-assignment-toolbar"><label><input type="checkbox" data-dco-action="select-all-assignments" ${selected.size === state.assignments.length && selected.size ? "checked" : ""}> Select all</label><strong>${selected.size} selected</strong><button class="secondary-button" type="button" data-dco-action="bulk-rule" data-mode="assign" data-rule-type="Audience" ${selected.size ? "" : "disabled"}>Assign audience</button><button class="secondary-button" type="button" data-dco-action="bulk-rule" data-mode="assign" data-rule-type="Geography" ${selected.size ? "" : "disabled"}>Assign geography</button><button class="secondary-button" type="button" data-dco-action="bulk-rule" data-mode="assign" data-rule-type="Schedule" ${selected.size ? "" : "disabled"}>Assign schedule</button><button class="secondary-button" type="button" data-dco-action="bulk-delivery" ${selected.size ? "" : "disabled"}>Configure delivery</button><button class="ghost-button" type="button" data-dco-action="bulk-rule" data-mode="remove" ${selected.size ? "" : "disabled"}>Remove targeting rule</button></section><section class="dco-panel dco-assignment-panel"><div class="dco-table-scroll"><table class="dco-data-table dco-assignment-table"><thead><tr><th></th><th></th><th>Creative variant</th><th>Formats</th><th>Audience</th><th>Geography</th><th>Schedule</th><th>Delivery</th><th>State</th><th>Actions</th></tr></thead><tbody>${state.assignments.map((assignment) => renderAssignmentRows(state, assignment, selected, referenceData)).join("")}</tbody></table></div></section>`;
  }

  function renderAssignmentCell(state, assignment, type) {
    const assigned = rulesForType(state, assignment, type)[0] || null;
    const open = state.assignmentPopover?.variantId === assignment.variantId && state.assignmentPopover?.ruleType === type;
    const search = String(state.assignmentPopover?.search || "").trim().toLowerCase();
    const rules = state.rules.filter((rule) => rule.type === type && (!search || `${rule.name} ${ruleDefinition(rule)}`.toLowerCase().includes(search)));
    return `<div class="dco-assignment-cell"><button class="dco-assignment-trigger ${assigned ? "assigned" : ""}" type="button" data-dco-action="assignment-popover" data-variant-id="${assignment.variantId}" data-rule-type="${type}">${assigned ? `${escapeHtml(assigned.name)} ▾` : `+ Add ${type.toLowerCase()}`}</button>${open ? `<div class="dco-assignment-popover"><strong>${type} targeting</strong><input data-dco-popover-search value="${escapeHtml(state.assignmentPopover.search || "")}" placeholder="Search rules..."><div>${rules.map((rule) => `<button type="button" data-dco-action="choose-assignment-rule" data-variant-id="${assignment.variantId}" data-rule-type="${type}" data-rule-id="${rule.id}"><span>${escapeHtml(rule.name)}</span>${rule.enabled ? "" : chip("Disabled", "gray")}</button>`).join("") || `<span class="dco-popover-empty">No matching ${type.toLowerCase()} rules</span>`}</div><button class="dco-popover-create" type="button" data-dco-action="create-rule-from-assignment" data-rule-type="${type}">+ Create ${type.toLowerCase()} rule</button><button class="dco-popover-remove" type="button" data-dco-action="remove-assignment-rule" data-variant-id="${assignment.variantId}" data-rule-type="${type}" ${assigned ? "" : "disabled"}>Remove assignment</button></div>` : ""}</div>`;
  }
  function renderAssignmentRows(state, assignment, selected, referenceData) {
    const variant = variantById(state, assignment.variantId);
    if (!variant) return "";
    const expanded = state.expandedVariantIds.includes(variant.id);
    const disabled = assignment.ruleIds.some((ruleId) => ruleById(state, ruleId)?.enabled === false);
    const deliveryStats = deliveryStatsForVariant(state, variant);
    const deliveryLabel = deliveryStats.mapped ? `${deliveryStats.mapped}/${deliveryStats.total} mapped ▾` : "Set placement";
    const ready = !disabled && deliveryStats.mapped === deliveryStats.total;
    const status = ready ? ["Ready", "green"] : disabled ? ["Needs setup", "red"] : ["Needs setup", "yellow"];
    const formats = variantRenditions(variant).map((rendition) => rendition.format);
    return `<tr><td><input type="checkbox" data-dco-action="select-assignment" value="${variant.id}" ${selected.has(variant.id) ? "checked" : ""}></td><td><button class="dco-expand" type="button" data-dco-action="toggle-assignment" data-variant-id="${variant.id}" aria-expanded="${expanded}">${expanded ? "−" : "+"}</button></td><td><strong>${escapeHtml(variant.name)}</strong>${variant.isDefault ? "<small>Fallback when no targeted creative is eligible</small>" : `<small>${escapeHtml(variant.headline || "Approved logical variant")}</small>`}</td><td>${escapeHtml(formats.join(", "))}</td><td>${renderAssignmentCell(state, assignment, "Audience")}</td><td>${renderAssignmentCell(state, assignment, "Geography")}</td><td>${renderAssignmentCell(state, assignment, "Schedule")}</td><td><button class="dco-delivery-trigger" type="button" data-dco-action="open-delivery" data-variant-id="${variant.id}">${escapeHtml(deliveryLabel)}</button></td><td>${chip(status[0], status[1])}</td><td><button class="text-button" type="button" data-dco-action="edit-assignment" data-variant-id="${variant.id}">Edit rules</button></td></tr>${expanded ? `<tr class="dco-expanded-row"><td></td><td></td><td colspan="8"><div class="dco-rendition-list"><div class="dco-rendition-head"><div><strong>Approved renditions</strong><span>Targeting is inherited from ${escapeHtml(variant.name)}. Placement mapping is configured per rendition.</span></div><button class="secondary-button" type="button" data-dco-action="auto-create-variant-delivery" data-variant-id="${variant.id}">Auto-create required placements</button></div>${variantRenditions(variant).map((rendition, index) => renderRenditionDeliveryRow(state, variant, rendition, index, referenceData)).join("")}</div></td></tr>` : ""}`;
  }

  function renderRenditionDeliveryRow(state, variant, rendition, index, referenceData) {
    const delivery = deliveryFor(state, rendition);
    const placement = deliveryPlacement(state, referenceData, delivery);
    const renditionName = rendition.templateName || rendition.name || `Rendition ${index + 1}`;
    return `<div class="dco-rendition-delivery-row"><div><strong>${escapeHtml(renditionName)}</strong><span>${escapeHtml(rendition.format)}</span></div><div><span>CM360 placement</span><strong>${escapeHtml(placement?.name || "Not configured")}</strong></div><div>${delivery ? chip(delivery.strategy === "existing" ? "Reused" : "Created", delivery.strategy === "existing" ? "blue" : "green") : chip("Needs setup", "yellow")}</div><div class="row-actions"><button class="text-button" type="button" data-dco-action="use-existing-placement" data-variant-id="${variant.id}" data-rendition-id="${rendition.id}">Use existing</button><button class="text-button" type="button" data-dco-action="create-placement-for-rendition" data-variant-id="${variant.id}" data-rendition-id="${rendition.id}">Create new</button></div></div>`;
  }

  function renderNotRequired(state) {
    const label = sections.find((section) => section.id === state.section)?.label || "Section";
    return `<div class="dco-section-head"><div><h2>${escapeHtml(label)}</h2><p>This section is used by Dynamic Creative activations.</p></div></div><section class="dco-panel"><div class="dco-dependency"><strong>Not required for Standard Display</strong><span>Continue to Creative Assignments to configure rendition delivery.</span><button class="primary-button" type="button" data-dco-action="section" data-section="assignments">Continue to Creative Assignments</button></div></section>`;
  }

  function renderDynamicMapping(state) {
    return `<section class="dco-panel"><div class="dco-panel-head"><div><span class="dco-kicker">1</span><h3>Dynamic Mapping</h3><p>Map approved Smartly creative fields to Google Studio dynamic fields.</p></div>${chip(dynamicMappingIssues(state).length ? "Needs setup" : "Ready", dynamicMappingIssues(state).length ? "yellow" : "green")}</div><div class="dco-table-scroll"><table class="dco-data-table"><thead><tr><th>Smartly field</th><th>Studio dynamic field</th><th>Source</th><th>Status</th><th>Actions</th></tr></thead><tbody>${state.dynamicMappings.map((mapping) => `<tr><td><strong>${escapeHtml(mapping.smartlyField)}</strong></td><td>${escapeHtml(mapping.studioField || "Not mapped")}</td><td>${escapeHtml(mapping.source)}</td><td>${chip(mapping.status === "mapped" ? "Mapped" : mapping.status === "invalid" ? "Invalid" : "Not mapped", mapping.status === "mapped" ? "green" : mapping.status === "invalid" ? "red" : "yellow")}</td><td><button class="text-button" type="button" data-dco-action="edit-mapping" data-mapping-id="${mapping.id}">${mapping.studioField ? "Change mapping" : "Map field"}</button></td></tr>`).join("")}</tbody></table></div><div class="dco-inline-notice"><strong>Separate from targeting</strong><span>Targeting determines eligibility. Dynamic Mapping determines which Smartly values populate Studio fields.</span></div></section>`;
  }

  function renderTrafficking(state, referenceData) {
    const campaign = referenceById(referenceData, "cm360Campaigns", state.media.cmCampaignId);
    const advertiser = referenceById(referenceData, "cm360Advertisers", state.media.cmAdvertiserId);
    const rows = allTrafficRows(state);
    const syncing = state.cm360.publishingState === "publishing";
    const published = state.cm360.publishingState === "published";
    const trafficState = syncing ? ["Syncing", "blue"] : published ? ["Published", "green"] : deliveryIssues(state).length ? ["Needs setup", "yellow"] : ["Ready", "green"];
    return `<div class="dco-section-head"><div><h2>Trafficking</h2><p>Review the CM360 objects Smartly intends to reuse or create. Campaign context is managed in Media.</p></div><div class="dco-prototype-label">Prototype only · No CM360 API calls</div></div>${campaign ? `<section class="dco-panel dco-traffic-context"><div><span>CM360 Advertiser</span><strong>${escapeHtml(advertiser?.name || "Not configured")}</strong></div><div><span>CM360 Campaign</span><strong>${escapeHtml(campaign.name)}</strong></div>${chip(trafficState[0], trafficState[1])}</section>` : '<section class="dco-panel"><div class="dco-dependency"><strong>Media connection required</strong><span>Select the CM360 Advertiser and Campaign in Media before trafficking.</span><button class="secondary-button" type="button" data-dco-action="section" data-section="media">Open Media</button></div></section>'}<section class="dco-panel"><div class="dco-table-scroll"><table class="dco-data-table dco-trafficking-table"><thead><tr><th></th><th>Creative</th><th>Format</th><th>Placement</th><th>Ad</th><th>Action</th><th>Status</th></tr></thead><tbody>${rows.map((row) => renderTraffickingRow(state, row, referenceData)).join("")}</tbody></table></div></section>`;
  }

  function renderTraffickingRow(state, row, referenceData) {
    const placement = deliveryPlacement(state, referenceData, row.delivery);
    const expanded = state.expandedTrafficIds.includes(row.rendition.id);
    const published = state.cm360.publishingState === "published";
    const adName = `${row.variant.name} ${row.rendition.format} Ad`;
    const actionLabel = !row.delivery ? "Set placement" : row.delivery.strategy === "existing" ? "Reuse placement · Create ad" : "Create placement · Create ad";
    const status = published && row.delivery ? ["Created", "green"] : row.delivery?.strategy === "existing" ? ["Reused", "blue"] : row.delivery ? ["Ready", "green"] : ["Needs setup", "yellow"];
    return `<tr><td><button class="dco-expand" type="button" data-dco-action="toggle-traffic-row" data-rendition-id="${row.rendition.id}" aria-expanded="${expanded}">${expanded ? "−" : "+"}</button></td><td><strong>${escapeHtml(row.variant.name)}</strong></td><td>${escapeHtml(row.rendition.format)}</td><td>${escapeHtml(placement?.name || "Not configured")}</td><td>${escapeHtml(adName)}</td><td>${row.delivery ? escapeHtml(actionLabel) : `<button class="text-button" type="button" data-dco-action="create-placement-for-rendition" data-variant-id="${row.variant.id}" data-rendition-id="${row.rendition.id}">Set placement</button>`}</td><td>${chip(status[0], status[1])}</td></tr>${expanded ? `<tr class="dco-expanded-row"><td></td><td colspan="6"><dl class="dco-traffic-details"><div><dt>CM360 Campaign</dt><dd>${escapeHtml(referenceById(referenceData, "cm360Campaigns", state.media.cmCampaignId)?.name || "Not configured")}</dd></div><div><dt>Placement</dt><dd>${escapeHtml(placement?.name || "Not configured")}</dd></div><div><dt>Placement ID</dt><dd>${escapeHtml(placement?.id || "To be created")}</dd></div><div><dt>Ad</dt><dd>${escapeHtml(adName)}</dd></div><div><dt>Ad ID</dt><dd>${published ? escapeHtml(`ad-${row.rendition.id}`) : "To be created"}</dd></div><div><dt>Source</dt><dd>CM360</dd></div></dl></td></tr>` : ""}`;
  }

  function renderReviewPublish(state, referenceData) {
    const checks = validationChecks(state, referenceData), blockers = checks.filter((check) => !check.ready), syncing = state.cm360.publishingState === "publishing", published = state.cm360.publishingState === "published";
    const trafficRows = allTrafficRows(state), deliveryPairs = trafficDeliveryPairs(state), reused = deliveryPairs.filter(({ delivery }) => ["existing", "segment"].includes(delivery.strategy)).length, created = deliveryPairs.filter(({ delivery }) => ["create", "draft"].includes(delivery.strategy)).length;
    const campaign = referenceById(referenceData, "cm360Campaigns", state.media.cmCampaignId);
    const templateCount = trafficRows.length, adCount = deliveryPairs.length;
    const stats = activationStats(state), studioRuleCount = state.creativeType === "dynamic_creative" ? studioRules(state).length + (state.studio.fallbackEnabled ? 1 : 0) : 0;
    return `<div class="dco-section-head"><div><h2>Review & Publish</h2><p>Review the execution plan and resolve blocking issues before simulated publishing.</p></div><button class="secondary-button" type="button" data-dco-action="run-validation">Run validation</button></div>${stats.inactiveRenditionCount ? `<section class="dco-exclusion-notice"><div>${chip("Excluded", "gray")}</div><div><strong>${stats.inactiveRenditionCount} inactive format${stats.inactiveRenditionCount === 1 ? "" : "s"} will not be published</strong><p>${stats.inactiveVariantCount} fully inactive variant${stats.inactiveVariantCount === 1 ? "" : "s"} remain configured and can be restored from Creative Assignments.</p></div></section>` : ""}<section class="dco-verdict ${blockers.length ? "blocked" : "ready"}"><div><span>Overall verdict</span><strong>${syncing ? "Syncing with CM360" : published ? "Published to CM360" : blockers.length ? `${blockers.length} blocking issues` : "Ready to publish"}</strong><p>${syncing ? "The simulated trafficking plan is being applied." : published ? "Tags & Distribution is now available." : blockers.length ? "Complete the listed dependencies before publishing." : "All required checks have passed."}</p></div>${chip(syncing ? "Syncing" : published ? "Published" : blockers.length ? "Needs setup" : "Ready", syncing ? "blue" : published || !blockers.length ? "green" : "red")}</section><section class="dco-panel"><div class="dco-panel-head"><div><h3>Execution plan</h3><p>Objects Smartly will reuse or create when publishing runs.</p></div></div><div class="dco-execution-plan"><div><span>Creative</span><strong>${stats.activeVariantCount} active variant${stats.activeVariantCount === 1 ? "" : "s"}</strong><small>${templateCount} active template${templateCount === 1 ? "" : "s"} · ${stats.inactiveRenditionCount} excluded renditions</small></div><div><span>Studio</span><strong>${state.creativeType === "dynamic_creative" ? "1 auto-created profile" : "Not required"}</strong><small>${state.creativeType === "dynamic_creative" ? `${studioRuleCount} ordered serving rule${studioRuleCount === 1 ? "" : "s"} · backend preparation automatic` : "Standard Display"}</small></div><div><span>CM360</span><strong>${campaign ? "1 existing campaign" : "Campaign not configured"}</strong><small>${reused} existing placement assignment${reused === 1 ? "" : "s"} · ${created} new placement${created === 1 ? "" : "s"} · ${adCount} ad${adCount === 1 ? "" : "s"} to create</small></div></div></section><section class="dco-panel"><div class="dco-panel-head"><div><h3>Blocking validation issues</h3><p>Publishing remains unavailable until all blocking items are resolved.</p></div>${chip(blockers.length ? `${blockers.length} issues` : "No blocking issues", blockers.length ? "red" : "green")}</div>${blockers.length ? `<div class="dco-table-scroll"><table class="dco-data-table"><thead><tr><th>Check</th><th>Details</th><th>Action</th></tr></thead><tbody>${blockers.map((check) => `<tr><td><strong>${escapeHtml(check.label)}</strong></td><td>${escapeHtml(check.details)}</td><td><button class="text-button" type="button" data-dco-action="section" data-section="${check.section}">Review</button></td></tr>`).join("")}</tbody></table></div>` : '<div class="dco-validation-clear">All required Media, Targeting, Studio, and Trafficking checks passed.</div>'}<div class="dco-action-row dco-review-actions"><button class="primary-button" type="button" data-dco-action="publish-cm360" ${blockers.length || syncing || published ? "disabled" : ""}>${syncing ? "Publishing…" : published ? "Published" : "Publish"}</button></div></section>`;
  }

  function renderTags(state, referenceData) {
    const available = state.cm360.publishingState === "published", generated = state.tags.state === "generated";
    const campaign = referenceById(referenceData, "cm360Campaigns", state.media.cmCampaignId);
    const rows = allTrafficRows(state), deliveryPairs = trafficDeliveryPairs(state);
    const placementCount = new Set(deliveryPairs.map(({ delivery }) => delivery.placementId).filter(Boolean)).size;
    return `<div class="dco-section-head"><div><h2>Tags & Distribution</h2><p>Generate and distribute CM360 tag information after successful publishing.</p></div></div>${!available ? `<section class="dco-panel"><div class="dco-dependency"><strong>CM360 publishing required</strong><span>Publish successfully from Review & Publish before generating tags.</span><button class="secondary-button" type="button" data-dco-action="section" data-section="review">Open Review & Publish</button></div></section>` : `<section class="dco-panel"><div class="dco-panel-head"><div><h3>CM360 tag package</h3><p>Prototype distribution output for trafficked placements and ads.</p></div>${chip(generated ? "Generated" : "Not generated", generated ? "green" : "gray")}</div><dl class="dco-inline-metadata"><div><dt>Campaign</dt><dd>${escapeHtml(campaign?.name || "Not configured")}</dd></div><div><dt>Placements</dt><dd>${placementCount}</dd></div><div><dt>Ads</dt><dd>${deliveryPairs.length}</dd></div><div><dt>State</dt><dd>${generated ? "Ready for distribution" : "Not generated"}</dd></div></dl><div class="dco-action-row">${generated ? '<button class="primary-button" type="button" data-dco-action="download-tags">Download tag package</button><button class="secondary-button" type="button" data-dco-action="export-tags">Export</button><button class="secondary-button" type="button" data-dco-action="copy-tags">Copy tag information</button>' : '<button class="primary-button" type="button" data-dco-action="generate-tags">Generate tags</button>'}</div></section>`}`;
  }

  function duplicateStudioRuleIndex(rules, rule, index) {
    const signature = studioRuleSignature(rule);
    if (!signature) return -1;
    return rules.findIndex((candidate, candidateIndex) => candidateIndex < index && studioRuleSignature(candidate) === signature);
  }

  function studioRuleShortLabel(condition) {
    if (condition.label === "DV360 Line Item") return "DV360";
    if (condition.label === "Geography") return "Geo";
    return condition.label;
  }

  function renderStudioRuleCard(state, rules, rule, index) {
    const duplicateIndex = duplicateStudioRuleIndex(rules, rule, index), enabledCount = rule.conditions.filter((condition) => condition.enabled).length;
    const sourceLabel = rule.source === "generated" ? `Generated from ${rule.segmentIds.length} Segment${rule.segmentIds.length === 1 ? "" : "s"}` : "Custom rule";
    const generatedName = rule.conditions.filter((condition) => condition.enabled).map(studioRuleShortLabel).join(" + ") || "No active conditions";
    const title = rule.source === "custom" && rule.name ? `Rule ${index + 1}: ${rule.name}` : `Rule ${index + 1}: ${generatedName}`;
    return `<article class="dco-studio-rule-card ${enabledCount ? "" : "has-error"}"><header><div class="dco-studio-rule-priority"><span>${index + 1}</span><div><strong>${escapeHtml(title)}</strong><small>${escapeHtml(sourceLabel)}</small></div></div><div class="row-actions"><button class="text-button" type="button" data-dco-action="move-studio-rule" data-rule-id="${rule.id}" data-direction="up" ${index ? "" : "disabled"}>Move up</button><button class="text-button" type="button" data-dco-action="move-studio-rule" data-rule-id="${rule.id}" data-direction="down" ${index < rules.length - 1 ? "" : "disabled"}>Move down</button>${rule.source === "custom" ? `<button class="text-button danger" type="button" data-dco-action="delete-studio-rule" data-rule-id="${rule.id}">Delete</button>` : ""}</div></header><div class="dco-studio-rule-summary"><span>Match</span><strong>${escapeHtml(rule.conditions.filter((condition) => condition.enabled).map((condition) => condition.label).join(" AND ") || "No active conditions")}</strong><small>Conditions use AND logic. Multiple values inside one condition use OR logic.</small></div><div class="dco-studio-condition-list">${rule.conditions.map((condition) => `<label class="dco-studio-condition ${condition.available === false ? "is-unavailable" : ""}"><span><strong>${escapeHtml(condition.label)}</strong><small>${condition.available === false ? "No longer supplied by an eligible Segment" : "Use this Dynamic Feed column when evaluating the rule"}</small></span><span class="dco-intent-toggle"><input type="checkbox" data-dco-action="toggle-studio-condition" data-rule-id="${rule.id}" data-condition-key="${escapeHtml(condition.key)}" ${condition.enabled ? "checked" : ""}><i></i><b>${condition.enabled ? "On" : "Off"}</b></span></label>`).join("")}</div><footer><span>${rule.variantIds.length} active creative variant${rule.variantIds.length === 1 ? "" : "s"}</span><span>${escapeHtml(rule.segmentNames.join(", ") || "No eligible Segments currently match")}</span></footer>${duplicateIndex >= 0 ? `<div class="dco-rule-notice"><strong>Same active conditions as Rule ${duplicateIndex + 1}</strong><span>Allowed. Rule ${duplicateIndex + 1} is evaluated first.</span></div>` : ""}${enabledCount ? "" : '<div class="dco-rule-error">Turn on at least one condition before completing Studio setup.</div>'}</article>`;
  }

  function renderStudio(state, referenceData) {
    const studioAdvertiser = referenceById(referenceData, "studioAdvertisers", state.media.studioAdvertiserId), campaign = referenceById(referenceData, "cm360Campaigns", state.media.cmCampaignId);
    const profileReady = state.studio.profileState === "created", completed = state.studio.publishingState === "published", rules = studioRules(state), availableConditions = availableStudioConditions(state), ruleIssues = studioRuleIssues(state), inputIssues = targetingIssues(state), stats = activationStats(state);
    const completionBlocked = !profileReady || ruleIssues.length > 0 || inputIssues.length > 0;
    const defaultVariant = state.activationPackage.approvedVariants.find((variant) => variant.isDefault), defaultActive = defaultVariant && (connectedTargeting?.activeRenditionsFor ? connectedTargeting.activeRenditionsFor(state, defaultVariant).length : variantRenditions(defaultVariant).length);
    return `<div class="dco-section-head"><div><h2>Studio</h2><p>Review the automatically prepared Studio Profile and control the order in which serving rules are evaluated.</p></div><div class="dco-prototype-label">Prototype only · No Studio API calls</div></div>${stats.inactiveRenditionCount ? `<section class="dco-exclusion-notice"><div>${chip("Excluded", "gray")}</div><div><strong>${stats.inactiveRenditionCount} inactive format${stats.inactiveRenditionCount === 1 ? "" : "s"} excluded from Studio</strong><p>${stats.activeVariantCount} active variant${stats.activeVariantCount === 1 ? "" : "s"} and ${stats.activeRenditionCount} active format${stats.activeRenditionCount === 1 ? "" : "s"} will be prepared automatically.</p></div></section>` : ""}<section class="dco-panel ${profileReady ? "" : "dco-panel-disabled"}"><div class="dco-panel-head"><div><span class="dco-kicker">1</span><h3>Studio Profile</h3><p>The profile is created automatically from the connected CM360 Campaign.</p></div>${chip(profileReady ? "Auto-created" : "Needs Media", profileReady ? "green" : "yellow")}</div>${profileReady ? `<dl class="dco-inline-metadata dco-studio-profile-meta"><div><dt>Profile</dt><dd>${escapeHtml(state.studio.profileName)}</dd></div><div><dt>Campaign</dt><dd>${escapeHtml(campaign?.name || "Not configured")}</dd></div><div><dt>Studio advertiser</dt><dd>${escapeHtml(studioAdvertiser?.name || "Not configured")}</dd></div></dl>` : '<div class="dco-dependency"><strong>Studio media connection required</strong><span>Select a CM360 Campaign and its connected Studio Advertiser in Media.</span><button class="secondary-button" type="button" data-dco-action="section" data-section="media">Open Media</button></div>'}</section><section class="dco-panel dco-studio-rules-panel ${profileReady ? "" : "dco-panel-disabled"}"><div class="dco-panel-head"><div><span class="dco-kicker">2</span><h3>Serving Rules</h3><p>Rules are generated from mapping combinations used by enabled Segments assigned to active creatives.</p></div><button class="primary-button" type="button" data-dco-action="add-studio-rule" ${profileReady && availableConditions.length ? "" : "disabled"} title="${availableConditions.length ? "Add a rule using available Dynamic Feed columns" : "Assign an enabled Segment to an active creative first"}">+ Add rule</button></div><div class="dco-logic-notice"><strong>First match wins</strong><span>Rules run from top to bottom. Conditions inside a rule use AND logic; multiple values in one feed column use OR logic. Duplicate combinations are allowed.</span></div><div class="dco-studio-rule-list">${rules.map((rule, index) => renderStudioRuleCard(state, rules, rule, index)).join("") || '<div class="table-empty"><strong>No targeted serving rules yet</strong><span>Assign an enabled Segment to an active creative. The optional Fallback rule can still cover unmatched impressions.</span></div>'}<article class="dco-studio-rule-card dco-fallback-rule ${state.studio.fallbackEnabled ? "" : "is-off"}"><header><div class="dco-studio-rule-priority"><span>↳</span><div><strong>Fallback rule</strong><small>Pinned last</small></div></div><span class="dco-intent-toggle"><input type="checkbox" data-dco-action="toggle-studio-fallback" ${state.studio.fallbackEnabled ? "checked" : ""}><i></i><b>${state.studio.fallbackEnabled ? "On" : "Off"}</b></span></header><div class="dco-studio-rule-summary"><span>When no earlier rule matches</span><strong>${state.studio.fallbackEnabled ? `Serve ${escapeHtml(defaultVariant?.name || "the Default Creative")}` : "Do not serve a fallback creative"}</strong><small>${state.studio.fallbackEnabled ? "Unmatched impressions use the active Default Creative." : "Publishing is allowed, but unmatched impressions may not serve a creative."}</small></div>${state.studio.fallbackEnabled && !defaultActive ? '<div class="dco-rule-error">Turn on at least one format for the Default Creative or disable this fallback.</div>' : ""}</article></div></section><section class="dco-panel ${profileReady ? "" : "dco-panel-disabled"}"><div class="dco-panel-head"><div><span class="dco-kicker">3</span><h3>Studio Publishing</h3><p>Complete this page after reviewing rule order and condition switches.</p></div>${chip(completed ? "Completed" : completionBlocked ? "Needs review" : "Ready", completed ? "green" : completionBlocked ? "yellow" : "blue")}</div>${completionBlocked ? `<div class="dco-dependency"><strong>${!profileReady ? "Studio Profile unavailable" : `${ruleIssues.length + inputIssues.length} issue${ruleIssues.length + inputIssues.length === 1 ? "" : "s"} require review`}</strong><span>${!profileReady ? "Complete Media setup first." : "Resolve invalid rules or Segment and Creative Assignment issues before completing Studio setup."}</span></div>` : `<p class="dco-section-copy">Dynamic data preparation and creative association are handled automatically in the backend.</p>`}<div class="dco-action-row"><button class="primary-button" type="button" data-dco-action="complete-studio-setup" ${completionBlocked || completed ? "disabled" : ""}>${completed ? "Studio setup completed" : "Complete Studio setup"}</button></div></section>`;
  }

  function renderModal(state, referenceData) {
    if (!state.modal) return "";
    if (connectedTargeting) {
      const connectedModal = connectedTargeting.renderModal(state);
      if (connectedModal) return connectedModal;
    }
    if (state.modal.type === "rule-type") return renderRuleTypeModal();
    if (state.modal.type === "rule-editor") return renderRuleEditor(state, state.modal);
    if (state.modal.type === "assignment") return renderAssignmentDrawer(state, state.modal);
    if (state.modal.type === "bulk") return renderBulkModal(state, state.modal);
    if (state.modal.type === "bulk-delivery") return renderBulkDeliveryModal(state, state.modal);
    if (state.modal.type === "delivery-select") return renderPlacementSelectModal(state, state.modal, referenceData);
    if (state.modal.type === "delivery-create") return renderPlacementCreateModal(state, state.modal, referenceData);
    if (state.modal.type === "delivery-auto") return renderAutoDeliveryModal(state, state.modal, referenceData);
    if (state.modal.type === "studio-rule") return renderStudioRuleModal(state, state.modal);
    if (state.modal.type === "mapping") return renderMappingModal(state.modal);
    if (state.modal.type === "profile") return renderProfileModal(state, state.modal, referenceData);
    if (state.modal.type === "feed") return renderFeedModal(state);
    return "";
  }

  function renderStudioRuleModal(state, modal) {
    const available = availableStudioConditions(state), selected = new Set(modal.selectedConditionKeys || []);
    return modalFrame("Add serving rule", "Build an additional rule from columns already available in the Dynamic Feed.", `<div class="dco-editor-section"><label class="field"><span>Rule name</span><input data-studio-rule-field="name" value="${escapeHtml(modal.name || "")}" placeholder="Example: Priority prospecting"></label></div><section class="dco-editor-section"><div class="dco-panel-head"><div><h3>Rule conditions</h3><p>Turn conditions on here. You can change them again from the ordered rule list.</p></div></div><div class="dco-studio-rule-builder-options">${available.map((condition) => `<label><input type="checkbox" data-studio-rule-condition="${escapeHtml(condition.key)}" ${selected.has(condition.key) ? "checked" : ""}><span><strong>${escapeHtml(condition.label)}</strong><small>Available in ${condition.segmentIds.size} eligible Segment${condition.segmentIds.size === 1 ? "" : "s"}</small></span></label>`).join("") || '<div class="table-empty"><strong>No Dynamic Feed columns available</strong><span>Assign an enabled Segment to an active creative first.</span></div>'}</div></section>${modal.error ? `<div class="validation-list has-issues"><div class="validation-item">${escapeHtml(modal.error)}</div></div>` : ""}`, `<button class="ghost-button" type="button" data-dco-action="close-modal">Cancel</button><button class="primary-button" type="button" data-dco-action="save-studio-rule" ${available.length ? "" : "disabled"}>Add rule</button>`, "dco-profile-modal");
  }

  function modalFrame(title, subtitle, body, footer, className) {
    return `<div class="modal-overlay ${className === "dco-assignment-drawer" ? "dco-drawer-overlay" : ""}" data-dco-action="close-modal"><section class="modal ${className || "dco-editor-modal"}" role="dialog" aria-modal="true"><header class="modal-head"><div><h2>${escapeHtml(title)}</h2><p>${escapeHtml(subtitle)}</p></div><button class="modal-close" type="button" data-dco-action="close-modal">×</button></header><div class="modal-body">${body}</div>${footer ? `<footer class="modal-footer">${footer}</footer>` : ""}</section></div>`;
  }

  function renderRuleTypeModal() {
    return modalFrame("Add targeting rule", "Select a rule type before configuring its definition.", `<div class="dco-rule-type-grid">${RULE_TYPES.map((type) => `<button type="button" data-dco-action="choose-rule-type" data-rule-type="${type}"><strong>${type}</strong><span>${type === "Audience" ? "Map one or more platform IDs." : type === "Geography" ? "Select locations and an optional radius." : "Configure timezone, presets, or custom day/time ranges."}</span></button>`).join("")}</div>`, "", "dco-profile-modal");
  }

  function blankRule(type) {
    const base = { id: id("rule"), name: "", type, enabled: true };
    if (type === "Audience") return { ...base, platformIdType: "CM360 1st Party Audience", source: "Manual mapping", displayName: "", mappings: [""] };
    if (type === "Geography") return { ...base, locations: ["United States"], radius: "" };
    return { ...base, timezone: "America/New_York", preset: "Weekdays", customSchedule: false, dayTimes: {} };
  }

  function renderRuleEditor(state, modal) {
    const rule = modal.draft;
    let config = "";
    if (rule.type === "Audience") config = `<div class="dco-editor-section"><h3>Manual platform-ID mappings</h3><div class="form-grid"><label class="field"><span>ID type</span><select data-dco-rule-field="platformIdType">${["DV360 Line Item ID", "Meta Ad Set ID", "Google Ads Ad Group ID", "CM360 Placement ID", "CM360 Ad ID", "TTD Ad Group ID", "Snapchat Ad Set ID", "Reddit Ad Set ID", "CM360 1st Party Audience", "CM360 Dynamic Targeting Key"].map((value) => `<option ${rule.platformIdType === value ? "selected" : ""}>${value}</option>`).join("")}</select></label><label class="field"><span>Source</span><select data-dco-rule-field="source">${["Manual mapping", "Connected platform", "Imported IDs"].map((value) => `<option ${rule.source === value ? "selected" : ""}>${value}</option>`).join("")}</select></label><label class="field"><span>Display name</span><input data-dco-rule-field="displayName" value="${escapeHtml(rule.displayName || "")}" placeholder="Name shown in assignments"></label></div><div class="dco-id-mapping-list">${(rule.mappings || []).map((mapping, index) => `<div><input data-dco-mapping-index="${index}" value="${escapeHtml(mapping)}" placeholder="Platform ID or key=value"><button class="text-button danger" type="button" data-dco-action="remove-id-mapping" data-index="${index}">Remove</button></div>`).join("")}</div><button class="secondary-button" type="button" data-dco-action="add-id-mapping">Add ID value</button><small>Multiple ID values inside this Audience rule use OR logic.</small></div>`;
    if (rule.type === "Geography") config = `<div class="dco-editor-section"><h3>Geography definition</h3><label class="field"><span>Locations</span><textarea data-dco-rule-field="locationsText" rows="3" placeholder="United States, Canada">${escapeHtml((rule.locations || []).join(", "))}</textarea><small>Multiple locations use OR logic.</small></label><label class="field"><span>Radius <small>Optional</small></span><div class="dco-radius-field"><input type="number" min="1" data-dco-rule-field="radius" value="${escapeHtml(rule.radius || "")}" placeholder="No radius"><span>km</span></div></label></div>`;
    if (rule.type === "Schedule") {
      const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
      config = `<div class="dco-editor-section"><h3>Schedule definition</h3><div class="form-grid"><label class="field"><span>Timezone</span><select data-dco-rule-field="timezone">${["America/New_York", "America/Los_Angeles", "Europe/London", "Asia/Manila"].map((value) => `<option ${rule.timezone === value ? "selected" : ""}>${value}</option>`).join("")}</select></label><label class="field"><span>Preset</span><select data-dco-rule-field="preset">${["Weekdays", "Weekend", "Morning", "Afternoon", "Evening"].map((value) => `<option ${rule.preset === value ? "selected" : ""}>${value}</option>`).join("")}</select></label></div><label class="dco-toggle-row"><input type="checkbox" data-dco-rule-field="customSchedule" ${rule.customSchedule ? "checked" : ""}><span><strong>Use custom day/time ranges</strong><small>Custom ranges replace the selected preset.</small></span></label>${rule.customSchedule ? `<div class="dco-day-grid">${days.map((day) => { const value = rule.dayTimes?.[day] || {}; return `<div class="dco-custom-day"><label><input type="checkbox" data-dco-day="${day}" data-part="enabled" ${value.enabled ? "checked" : ""}> ${day}</label><input type="time" data-dco-day="${day}" data-part="start" value="${escapeHtml(value.start || "09:00")}" ${value.enabled ? "" : "disabled"}><span>to</span><input type="time" data-dco-day="${day}" data-part="end" value="${escapeHtml(value.end || "17:00")}" ${value.enabled ? "" : "disabled"}></div>`; }).join("")}</div>` : ""}<small>Enabled custom day/time ranges inside this Schedule rule use OR logic.</small></div>`;
    }
    const usage = usedByCount(state, rule.id);
    const body = `<div class="dco-editor-section"><div class="form-grid"><label class="field"><span>Rule name</span><input data-dco-rule-field="name" value="${escapeHtml(rule.name)}" placeholder="Descriptive rule name"></label><label class="field"><span>Type</span><input value="${escapeHtml(rule.type)}" disabled title="Rule type cannot be changed after creation."></label></div></div>${config}${modal.mode === "edit" ? `<div class="dco-usage-summary"><strong>Used by ${usage} creative${usage === 1 ? "" : "s"}</strong><span>Primary assignment is managed from Creative Assignments.</span></div>` : ""}${modal.error ? `<div class="validation-list has-issues"><div class="validation-item">${escapeHtml(modal.error)}</div></div>` : ""}`;
    return modalFrame(`${modal.mode === "edit" ? "Edit" : "Add"} ${rule.type} rule`, "Each Targeting Rule is independent and reusable.", body, `<button class="ghost-button" type="button" data-dco-action="close-modal">Cancel</button><button class="primary-button" type="button" data-dco-action="save-rule">Save targeting rule</button>`);
  }

  function renderAssignmentDrawer(state, modal) {
    const variant = variantById(state, modal.variantId), selected = new Set(modal.ruleIds);
    const body = `<section class="dco-drawer-intro"><strong>${escapeHtml(variant.name)}</strong><span>${escapeHtml((variant.formats || []).join(", "))}</span>${variant.isDefault ? '<p>The Default Creative should remain untargeted so it can cover unmatched impressions.</p>' : '<p>Assign up to one rule per type. All assigned targeting rules must match.</p>'}</section>${RULE_TYPES.map((type) => `<section class="dco-drawer-rule-group"><h3>${type}</h3><label class="dco-rule-check"><input type="radio" name="drawer-${type}" data-dco-assignment-rule="" data-rule-type="${type}" ${!rulesForType(state, { ruleIds: [...selected] }, type).length ? "checked" : ""}><span><strong>No ${type.toLowerCase()} rule</strong><small>Do not restrict this creative by ${type.toLowerCase()}.</small></span></label>${state.rules.filter((rule) => rule.type === type).map((rule) => `<label class="dco-rule-check ${rule.enabled ? "" : "disabled"}"><input type="radio" name="drawer-${type}" data-dco-assignment-rule="${rule.id}" data-rule-type="${type}" ${selected.has(rule.id) ? "checked" : ""}><span><strong>${escapeHtml(rule.name)}</strong><small>${escapeHtml(ruleDefinition(rule))}</small></span>${chip(rule.enabled ? "Enabled" : "Disabled", rule.enabled ? "green" : "gray")}</label>`).join("")}</section>`).join("")}`;
    return modalFrame("Edit rules", "Assign or remove existing Targeting Rules for this logical creative variant.", body, `<button class="ghost-button" type="button" data-dco-action="close-modal">Cancel</button><button class="primary-button" type="button" data-dco-action="save-assignment">Save assignment</button>`, "dco-assignment-drawer");
  }

  function renderBulkModal(state, modal) {
    const availableRules = modal.ruleType ? state.rules.filter((rule) => rule.type === modal.ruleType) : state.rules;
    const body = `<div class="dco-editor-section"><p>${modal.mode === "assign" ? `Assign one existing ${modal.ruleType || "Targeting"} Rule to` : "Remove one assigned Targeting Rule from"} ${state.selectedVariantIds.length} selected creative${state.selectedVariantIds.length === 1 ? "" : "s"}.</p><label class="field"><span>Targeting Rule</span><select data-dco-bulk-rule><option value="">Select rule</option>${availableRules.map((rule) => `<option value="${rule.id}" ${modal.ruleId === rule.id ? "selected" : ""}>${escapeHtml(rule.name)} · ${rule.type}${rule.enabled ? "" : " · Disabled"}</option>`).join("")}</select></label>${modal.error ? `<div class="validation-list has-issues"><div class="validation-item">${escapeHtml(modal.error)}</div></div>` : ""}</div>`;
    return modalFrame(`${modal.mode === "assign" ? "Assign" : "Remove"} targeting rule`, "Bulk changes apply at logical creative-variant level.", body, `<button class="ghost-button" type="button" data-dco-action="close-modal">Cancel</button><button class="primary-button" type="button" data-dco-action="apply-bulk">${modal.mode === "assign" ? "Assign rule" : "Remove rule"}</button>`, "dco-profile-modal");
  }

  function renderBulkDeliveryModal(state) {
    return modalFrame("Configure delivery", `Configure CM360 delivery for ${state.selectedVariantIds.length} selected creative${state.selectedVariantIds.length === 1 ? "" : "s"}.`, `<div class="dco-rule-type-grid dco-delivery-choice-grid"><button type="button" data-dco-action="bulk-use-existing"><strong>Use existing placements</strong><span>Assign compatible placements from the connected CM360 Campaign where available.</span></button><button type="button" data-dco-action="bulk-map-manually"><strong>Map manually</strong><span>Expand selected creatives and choose a placement for each rendition.</span></button><button type="button" data-dco-action="bulk-auto-create"><strong>Auto-create missing placements</strong><span>Reuse compatible placements and create the remaining required placements.</span></button></div>`, "", "dco-editor-modal");
  }

  function modalRendition(state, modal) {
    const variant = variantById(state, modal.variantId);
    const rendition = variantRenditions(variant).find((item) => item.id === modal.renditionId);
    return { variant, rendition };
  }

  function renderPlacementSelectModal(state, modal, referenceData) {
    const { variant, rendition } = modalRendition(state, modal);
    if (!variant || !rendition) return "";
    const placements = campaignPlacements(state, referenceData);
    const campaign = referenceById(referenceData, "cm360Campaigns", state.media.cmCampaignId);
    const selected = new Set(modal.selectedPlacementIds || []);
    const body = campaign ? `<div class="dco-placement-context"><span>Campaign</span><strong>${escapeHtml(campaign.name)}</strong><span>Required size</span><strong>${escapeHtml(rendition.format)}</strong></div>${placements.length ? `<div class="dco-table-scroll"><table class="dco-data-table dco-placement-picker-table"><thead><tr><th>Select</th><th>Placement</th><th>Placement ID</th><th>Site</th><th>Format</th><th>Compatibility</th></tr></thead><tbody>${placements.map((placement) => { const compatible = !(placement.formats || []).length || placement.formats.includes(rendition.format); return `<tr class="${compatible ? "" : "disabled-row"}"><td><input type="checkbox" data-dco-placement-choice="${placement.id}" ${selected.has(placement.id) ? "checked" : ""} ${compatible ? "" : 'disabled title="This placement does not support the required template size."'}></td><td><div class="dco-placement-option-name"><strong>${escapeHtml(placement.name)}</strong><small>${escapeHtml(placement.source || "Connected CM360")}</small></div></td><td>${escapeHtml(placement.platformId || placement.id)}</td><td>${escapeHtml(placement.site || "—")}</td><td>${escapeHtml((placement.formats || []).join(", ") || "Not specified")}</td><td>${chip(compatible ? "Compatible" : `Requires ${rendition.format}`, compatible ? "green" : "gray")}</td></tr>`; }).join("")}</tbody></table></div>` : '<div class="table-empty"><strong>No placements connected to this campaign</strong><span>Create a placement for this template or use auto-create.</span></div>'} ` : '<div class="dco-dependency"><strong>CM360 Campaign required</strong><span>Connect a campaign in Media before selecting placements.</span></div>';
    const selectedCount = selected.size;
    return modalFrame("Select existing placements", `${renditionTemplateName(rendition)} · ${rendition.format}`, body, `<span class="dco-modal-selection-count">${selectedCount} manually selected</span><button class="ghost-button" type="button" data-dco-action="close-modal">Cancel</button><button class="secondary-button" type="button" data-dco-action="switch-to-create-placement">Create new placement</button><button class="primary-button" type="button" data-dco-action="apply-existing-placements">${selectedCount ? `Assign ${selectedCount} placement${selectedCount === 1 ? "" : "s"}` : "Clear manual selections"}</button>`, "dco-placement-multiselect-modal");
  }

  function renderPlacementCreateModal(state, modal, referenceData) {
    const { variant, rendition } = modalRendition(state, modal);
    if (!variant || !rendition) return "";
    const campaign = referenceById(referenceData, "cm360Campaigns", state.media.cmCampaignId);
    return modalFrame("Create new placement", "Create prototype CM360 placement state and assign it to this rendition.", `<div class="form-grid"><label class="field dco-full-field"><span>Placement name</span><input data-dco-placement-field="name" value="${escapeHtml(modal.name || "")}"></label><label class="field"><span>Campaign</span><input value="${escapeHtml(campaign?.name || "Not configured")}" disabled></label><label class="field"><span>Size</span><input value="${escapeHtml(rendition.format)}" disabled></label><label class="field"><span>Site</span><select data-dco-placement-field="site"><option value="">Select site</option><option ${modal.site === "Example News" ? "selected" : ""}>Example News</option><option ${modal.site === "Example Lifestyle" ? "selected" : ""}>Example Lifestyle</option></select></label></div>${modal.error ? `<div class="validation-list has-issues"><div class="validation-item">${escapeHtml(modal.error)}</div></div>` : ""}`, `<button class="ghost-button" type="button" data-dco-action="close-modal">Cancel</button><button class="primary-button" type="button" data-dco-action="save-created-placement" ${campaign ? "" : "disabled"}>Create & assign</button>`, "dco-profile-modal");
  }

  function renderAutoDeliveryModal(state, modal, referenceData) {
    const variant = variantById(state, modal.variantId);
    if (!variant) return "";
    const rows = variantRenditions(variant).map((rendition) => ({ rendition, placement: compatiblePlacements(state, referenceData, rendition.format)[0] || null }));
    return modalFrame("Auto-create required placements", `${variant.name} · Preview the resulting CM360 placement strategy.`, `<div class="dco-auto-preview">${rows.map((row) => `<div><strong>${escapeHtml(row.rendition.format)}</strong><span>${row.placement ? `Reuse existing · ${escapeHtml(row.placement.name)}` : "Create"}</span>${chip(row.placement ? "Reuse" : "Create placement", row.placement ? "blue" : "green")}</div>`).join("")}</div><div class="dco-inline-notice"><strong>Mock automation</strong><span>Apply reuses compatible campaign placements and creates a placement only when none is available.</span></div>`, `<button class="ghost-button" type="button" data-dco-action="close-modal">Cancel</button><button class="primary-button" type="button" data-dco-action="apply-auto-delivery">Apply</button>`, "dco-editor-modal");
  }

  function renderMappingModal(modal) {
    const mapping = modal.draft;
    return modalFrame("Change dynamic mapping", "Map one Smartly creative field to one Google Studio dynamic field.", `<div class="form-grid"><label class="field"><span>Smartly field</span><input value="${escapeHtml(mapping.smartlyField)}" disabled></label><label class="field"><span>Studio dynamic field</span><select data-dco-mapping-field="studioField"><option value="">Not mapped</option>${["headline", "cta", "product_image", "exit_url", "description", "price"].map((value) => `<option ${mapping.studioField === value ? "selected" : ""}>${value}</option>`).join("")}</select></label><label class="field"><span>Source</span><select data-dco-mapping-field="source">${["Approved creative content", "Approved rendition", "Automation Feed"].map((value) => `<option ${mapping.source === value ? "selected" : ""}>${value}</option>`).join("")}</select></label></div><div class="dco-logic-notice"><strong>Mapping only</strong><span>This configuration does not change targeting eligibility.</span></div>`, `<button class="ghost-button" type="button" data-dco-action="close-modal">Cancel</button><button class="primary-button" type="button" data-dco-action="save-mapping">Save mapping</button>`, "dco-profile-modal");
  }

  function renderProfileModal(state, modal, referenceData) {
    const advertiserName = referenceById(referenceData, "studioAdvertisers", state.media.studioAdvertiserId)?.name || "Studio Advertiser not configured";
    if (modal.mode === "select") return modalFrame("Select Existing Profile", "Prototype profiles connected to the selected advertiser.", `<div class="dco-profile-options"><button type="button" data-dco-action="choose-profile" data-profile-id="studio-existing-1" data-profile-name="Summer Retail — Existing DCO"><strong>Summer Retail — Existing DCO</strong><span>${escapeHtml(advertiserName)} · Available</span></button><button type="button" data-dco-action="choose-profile" data-profile-id="studio-existing-2" data-profile-name="Always-on Display Profile"><strong>Always-on Display Profile</strong><span>${escapeHtml(advertiserName)} · Available</span></button></div>`, "", "dco-profile-modal");
    return modalFrame("Create Studio Profile", "This creates prototype state only. No Studio API call is made.", `<div class="form-grid"><label class="field"><span>Profile Name</span><input data-dco-profile-field="name" value="${escapeHtml(modal.name)}"></label><label class="field"><span>Advertiser</span><input value="${escapeHtml(advertiserName)}" disabled></label><label class="field dco-full-field"><span>Description <small>Optional</small></span><textarea data-dco-profile-field="description" rows="3">${escapeHtml(modal.description || "")}</textarea></label></div>${modal.error ? `<div class="validation-list has-issues"><div class="validation-item">${escapeHtml(modal.error)}</div></div>` : ""}`, `<button class="ghost-button" type="button" data-dco-action="close-modal">Cancel</button><button class="primary-button" type="button" data-dco-action="save-profile">Create Profile</button>`, "dco-profile-modal");
  }

  function renderFeedModal(state) {
    return modalFrame("Generated Studio Data", "Approved creative content combined with Targeting Rules and Creative Assignments.", `<table class="dco-data-table"><thead><tr><th>Creative variant</th><th>Formats</th><th>Audience</th><th>Geography</th><th>Schedule</th></tr></thead><tbody>${state.assignments.map((assignment) => { const variant = variantById(state, assignment.variantId); return `<tr><td><strong>${escapeHtml(variant.name)}</strong></td><td>${escapeHtml((variant.formats || []).join(", "))}</td><td>${rulesForType(state, assignment, "Audience").map((rule) => escapeHtml(rule.name)).join(" AND ") || "—"}</td><td>${rulesForType(state, assignment, "Geography").map((rule) => escapeHtml(rule.name)).join(" AND ") || "—"}</td><td>${rulesForType(state, assignment, "Schedule").map((rule) => escapeHtml(rule.name)).join(" AND ") || "—"}</td></tr>`; }).join("")}</tbody></table><p class="dco-feed-note">${state.activationPackage.excludedPreviewCount || 0} unapproved previews are excluded from this generated dataset.</p>`, "", "dco-feed-modal");
  }

  function open(state, context) { state.active = true; state.section = state.section || "overview"; state.modal = null; syncMediaContext(state, context?.workspace, context?.referenceData); syncStudioProfile(state, context?.referenceData); }

  function connectedContext(state, context) {
    return {
      ...context,
      changed(message) {
        invalidateStudioData(state);
        invalidateTrafficking(state);
        persist(state);
        context.autosave();
        context.toast(message);
        context.render();
      },
    };
  }

  function handleClick(event, state, context) {
    const target = event.target.closest("[data-dco-action]");
    if (!target) {
      if (state.assignmentPopover) { state.assignmentPopover = null; context.render(); return true; }
      return false;
    }
    const action = target.dataset.dcoAction;
    if (action === "exit") { state.active = false; state.modal = null; context.render(); return true; }
    if (action === "section") { state.section = target.dataset.section; state.assignmentPopover = null; persist(state); context.render(); return true; }
    if (action === "creative-type") { state.creativeType = target.dataset.value; state.section = "media"; invalidateStudioData(state); persist(state); context.autosave(); context.toast(`${state.creativeType === "dynamic_creative" ? "Dynamic Creative" : "Standard Display"} activation selected.`); context.render(); return true; }
    if (connectedTargeting?.handleClick(event, state, connectedContext(state, context))) return true;
    if (action === "add-studio-rule") { state.modal = { type: "studio-rule", name: "", selectedConditionKeys: [] }; context.render(); return true; }
    if (action === "save-studio-rule") {
      const name = String(state.modal.name || "").trim(), selected = new Set(state.modal.selectedConditionKeys || []), available = new Map(availableStudioConditions(state).map((condition) => [condition.key, condition]));
      if (!name) { state.modal.error = "Rule name is required."; context.render(); return true; }
      if (!selected.size) { state.modal.error = "Select at least one rule condition."; context.render(); return true; }
      const conditions = [...selected].map((key) => available.get(key)).filter(Boolean).map((condition) => ({ key: condition.key, label: condition.label, enabled: true }));
      if (!conditions.length) { state.modal.error = "The selected conditions are no longer available."; context.render(); return true; }
      const ruleId = id("studio-custom-rule");
      state.studio.customRules.push({ id: ruleId, name, conditions }); state.studio.ruleOrder.push(ruleId); state.modal = null; invalidateStudioData(state); persist(state); context.autosave(); context.toast("Custom serving rule added."); context.render(); return true;
    }
    if (action === "toggle-studio-condition") {
      const custom = state.studio.customRules.find((rule) => rule.id === target.dataset.ruleId);
      if (custom) { const condition = custom.conditions.find((item) => item.key === target.dataset.conditionKey); if (condition) condition.enabled = target.checked; }
      else {
        const override = state.studio.ruleOverrides[target.dataset.ruleId] || { disabledConditionKeys: [] }, disabled = new Set(override.disabledConditionKeys || []);
        target.checked ? disabled.delete(target.dataset.conditionKey) : disabled.add(target.dataset.conditionKey);
        state.studio.ruleOverrides[target.dataset.ruleId] = { disabledConditionKeys: [...disabled] };
      }
      invalidateStudioData(state); persist(state); context.autosave(); context.toast(`Rule condition turned ${target.checked ? "on" : "off"}.`); context.render(); return true;
    }
    if (action === "move-studio-rule") {
      studioRules(state); const index = state.studio.ruleOrder.indexOf(target.dataset.ruleId), next = target.dataset.direction === "up" ? index - 1 : index + 1;
      if (index >= 0 && next >= 0 && next < state.studio.ruleOrder.length) [state.studio.ruleOrder[index], state.studio.ruleOrder[next]] = [state.studio.ruleOrder[next], state.studio.ruleOrder[index]];
      invalidateStudioData(state); persist(state); context.autosave(); context.toast("Serving-rule priority updated."); context.render(); return true;
    }
    if (action === "delete-studio-rule") { state.studio.customRules = state.studio.customRules.filter((rule) => rule.id !== target.dataset.ruleId); state.studio.ruleOrder = state.studio.ruleOrder.filter((ruleId) => ruleId !== target.dataset.ruleId); invalidateStudioData(state); persist(state); context.autosave(); context.toast("Custom serving rule deleted."); context.render(); return true; }
    if (action === "toggle-studio-fallback") { state.studio.fallbackEnabled = target.checked; invalidateStudioData(state); persist(state); context.autosave(); context.toast(`Fallback rule turned ${target.checked ? "on" : "off"}.`); context.render(); return true; }
    if (action === "complete-studio-setup") {
      syncStudioProfile(state, context.referenceData);
      if (state.studio.profileState !== "created" || studioRuleIssues(state).length || targetingIssues(state).length) { context.toast("Resolve the Studio, Segment, and Creative Assignment issues first."); return true; }
      state.studio.publishingState = "published"; persist(state); context.autosave(); context.toast("Studio setup completed."); context.render(); return true;
    }
    if (action === "add-rule") { state.modal = { type: "rule-type" }; context.render(); return true; }
    if (action === "choose-rule-type") { state.modal = { type: "rule-editor", mode: "add", draft: blankRule(target.dataset.ruleType) }; context.render(); return true; }
    if (action === "edit-rule") { const rule = ruleById(state, target.dataset.ruleId); state.modal = { type: "rule-editor", mode: "edit", draft: clone(rule) }; context.render(); return true; }
    if (action === "toggle-rule-state") { const rule = ruleById(state, target.dataset.ruleId); rule.enabled = !rule.enabled; invalidateStudioData(state); persist(state); context.autosave(); context.toast(`Targeting Rule ${rule.enabled ? "enabled" : "disabled"}. Studio data must be regenerated.`); context.render(); return true; }
    if (action === "add-id-mapping") { state.modal.draft.mappings.push(""); context.render(); return true; }
    if (action === "remove-id-mapping") { state.modal.draft.mappings.splice(Number(target.dataset.index), 1); context.render(); return true; }
    if (action === "save-rule") {
      const draft = state.modal.draft;
      if (draft.type === "Geography" && draft.locationsText != null) draft.locations = draft.locationsText.split(",").map((value) => value.trim()).filter(Boolean);
      draft.mappings = (draft.mappings || []).map((value) => value.trim()).filter(Boolean);
      if (invalidRule(draft)) { state.modal.error = "Complete the required rule name and definition fields."; context.render(); return true; }
      const index = state.rules.findIndex((rule) => rule.id === draft.id);
      if (index >= 0) state.rules[index] = clone(draft); else state.rules.push(clone(draft));
      const assignAfterCreate = state.modal.assignAfterCreate;
      if (assignAfterCreate) {
        const assignment = assignmentFor(state, assignAfterCreate.variantId);
        assignment.ruleIds = assignment.ruleIds.filter((ruleId) => ruleById(state, ruleId)?.type !== assignAfterCreate.ruleType);
        assignment.ruleIds.push(draft.id);
      }
      state.modal = null; invalidateStudioData(state); persist(state); context.autosave(); context.toast(`${draft.type} rule saved. Studio data must be regenerated.`); context.render(); return true;
    }
    if (action === "toggle-assignment") { const ids = new Set(state.expandedVariantIds); ids.has(target.dataset.variantId) ? ids.delete(target.dataset.variantId) : ids.add(target.dataset.variantId); state.expandedVariantIds = [...ids]; context.render(); return true; }
    if (action === "assignment-popover") { const next = { variantId: target.dataset.variantId, ruleType: target.dataset.ruleType, search: "" }; state.assignmentPopover = state.assignmentPopover?.variantId === next.variantId && state.assignmentPopover?.ruleType === next.ruleType ? null : next; context.render(); return true; }
    if (action === "choose-assignment-rule") {
      const assignment = assignmentFor(state, target.dataset.variantId);
      assignment.ruleIds = assignment.ruleIds.filter((ruleId) => ruleById(state, ruleId)?.type !== target.dataset.ruleType);
      assignment.ruleIds.push(target.dataset.ruleId);
      state.assignmentPopover = null; invalidateStudioData(state); persist(state); context.autosave(); context.toast(`${target.dataset.ruleType} rule assigned. Studio data must be regenerated.`); context.render(); return true;
    }
    if (action === "remove-assignment-rule") {
      const assignment = assignmentFor(state, target.dataset.variantId);
      assignment.ruleIds = assignment.ruleIds.filter((ruleId) => ruleById(state, ruleId)?.type !== target.dataset.ruleType);
      state.assignmentPopover = null; invalidateStudioData(state); persist(state); context.autosave(); context.toast(`${target.dataset.ruleType} assignment removed.`); context.render(); return true;
    }
    if (action === "create-rule-from-assignment") { const variantId = state.assignmentPopover?.variantId; state.assignmentPopover = null; state.modal = { type: "rule-editor", mode: "add", draft: blankRule(target.dataset.ruleType), assignAfterCreate: variantId ? { variantId, ruleType: target.dataset.ruleType } : null }; context.render(); return true; }
    if (action === "select-assignment") { const ids = new Set(state.selectedVariantIds); target.checked ? ids.add(target.value) : ids.delete(target.value); state.selectedVariantIds = [...ids]; context.render(); return true; }
    if (action === "select-all-assignments") { state.selectedVariantIds = target.checked ? state.assignments.map((assignment) => assignment.variantId) : []; context.render(); return true; }
    if (action === "edit-assignment") { const assignment = assignmentFor(state, target.dataset.variantId); state.modal = { type: "assignment", variantId: target.dataset.variantId, ruleIds: [...assignment.ruleIds] }; context.render(); return true; }
    if (action === "save-assignment") { const assignment = assignmentFor(state, state.modal.variantId); assignment.ruleIds = [...state.modal.ruleIds]; state.modal = null; invalidateStudioData(state); persist(state); context.autosave(); context.toast("Creative Assignment saved. Studio data must be regenerated."); context.render(); return true; }
    if (action === "bulk-rule") { state.modal = { type: "bulk", mode: target.dataset.mode, ruleType: target.dataset.ruleType || "", ruleId: "" }; context.render(); return true; }
    if (action === "apply-bulk") {
      if (!state.modal.ruleId) { state.modal.error = "Select a Targeting Rule."; context.render(); return true; }
      const bulkRule = ruleById(state, state.modal.ruleId);
      state.assignments.forEach((assignment) => { if (!state.selectedVariantIds.includes(assignment.variantId)) return; const ids = new Set(assignment.ruleIds); if (state.modal.mode === "assign") { assignment.ruleIds.filter((ruleId) => ruleById(state, ruleId)?.type === bulkRule.type).forEach((ruleId) => ids.delete(ruleId)); ids.add(state.modal.ruleId); } else ids.delete(state.modal.ruleId); assignment.ruleIds = [...ids]; });
      const mode = state.modal.mode; state.modal = null; invalidateStudioData(state); persist(state); context.autosave(); context.toast(`Targeting Rule ${mode === "assign" ? "assigned to" : "removed from"} ${state.selectedVariantIds.length} creatives. Studio data must be regenerated.`); context.render(); return true;
    }
    if (action === "open-delivery") { const ids = new Set(state.expandedVariantIds); ids.add(target.dataset.variantId); state.expandedVariantIds = [...ids]; context.render(); return true; }
    if (action === "use-existing-placement") {
      const variant = variantById(state, target.dataset.variantId), rendition = variantRenditions(variant).find((item) => item.id === target.dataset.renditionId);
      const availableIds = new Set(campaignPlacements(state, context.referenceData).map((placement) => placement.id));
      state.modal = { type: "delivery-select", variantId: variant.id, renditionId: rendition.id, selectedPlacementIds: deliveriesFor(state, rendition).map((delivery) => delivery.placementId).filter((placementId) => availableIds.has(placementId)) };
      context.render(); return true;
    }
    if (action === "create-placement-for-rendition") {
      const variant = variantById(state, target.dataset.variantId), rendition = variantRenditions(variant).find((item) => item.id === target.dataset.renditionId), campaign = referenceById(context.referenceData, "cm360Campaigns", state.media.cmCampaignId);
      state.modal = { type: "delivery-create", variantId: variant.id, renditionId: rendition.id, name: `${campaign?.name || "CM360 Campaign"} — ${state.creativeType === "dynamic_creative" ? renditionTemplateName(rendition) : `${variant.name} — ${rendition.format}`}`, site: "" };
      context.render(); return true;
    }
    if (action === "switch-to-create-placement") {
      const variant = variantById(state, state.modal.variantId), rendition = variantRenditions(variant).find((item) => item.id === state.modal.renditionId), campaign = referenceById(context.referenceData, "cm360Campaigns", state.media.cmCampaignId);
      state.modal = { type: "delivery-create", variantId: variant.id, renditionId: rendition.id, name: `${campaign?.name || "CM360 Campaign"} — ${state.creativeType === "dynamic_creative" ? renditionTemplateName(rendition) : `${variant.name} — ${rendition.format}`}`, site: "" };
      context.render(); return true;
    }
    if (action === "choose-existing-placement") {
      const variant = variantById(state, target.dataset.variantId), rendition = variantRenditions(variant).find((item) => item.id === target.dataset.renditionId), placement = referenceById(context.referenceData, "cm360Placements", target.dataset.placementId);
      const compatible = placement && placement.campaignId === state.media.cmCampaignId && (!(placement.formats || []).length || placement.formats.includes(rendition?.format));
      if (!variant || !rendition || !compatible) { context.toast("Only placements from the connected campaign with a compatible format can be selected."); return true; }
      setDelivery(state, variant, rendition, placement, "existing");
      state.modal = null; invalidateTrafficking(state); persist(state); context.autosave(); context.toast("Existing CM360 Placement assigned."); context.render(); return true;
    }
    if (action === "apply-existing-placements") {
      const { variant, rendition } = modalRendition(state, state.modal);
      const selectedIds = new Set(state.modal.selectedPlacementIds || []);
      const selectedPlacements = campaignPlacements(state, context.referenceData).filter((placement) => selectedIds.has(placement.id) && (!(placement.formats || []).length || placement.formats.includes(rendition.format)));
      const key = deliveryKey(state, rendition);
      state.cm360.deliveryAssignments = (state.cm360.deliveryAssignments || []).filter((delivery) => delivery.renditionId !== key || delivery.strategy !== "existing");
      selectedPlacements.forEach((placement) => setDelivery(state, variant, rendition, placement, "existing"));
      state.modal = null; invalidateTrafficking(state); persist(state); context.autosave(); context.toast(selectedPlacements.length ? `${selectedPlacements.length} compatible CM360 placement${selectedPlacements.length === 1 ? "" : "s"} manually assigned.` : "Manual placement selections cleared. Segment and created placements were preserved."); context.render(); return true;
    }
    if (action === "save-created-placement") {
      const variant = variantById(state, state.modal.variantId), rendition = variantRenditions(variant).find((item) => item.id === state.modal.renditionId), campaign = referenceById(context.referenceData, "cm360Campaigns", state.media.cmCampaignId);
      if (!campaign || !state.modal.name.trim() || !state.modal.site) { state.modal.error = !campaign ? "Connect a CM360 Campaign in Media first." : !state.modal.name.trim() ? "Placement name is required." : "Select a site."; context.render(); return true; }
      const placement = makeCreatedPlacement(state, variant, rendition, campaign.name, state.modal.site); placement.name = state.modal.name.trim(); setDelivery(state, variant, rendition, placement, "create");
      state.modal = null; invalidateTrafficking(state); persist(state); context.autosave(); context.toast("CM360 Placement created and assigned in the prototype."); context.render(); return true;
    }
    if (action === "auto-create-variant-delivery") { state.modal = { type: "delivery-auto", variantId: target.dataset.variantId }; context.render(); return true; }
    if (action === "apply-auto-delivery") { const variant = variantById(state, state.modal.variantId); const result = applyAutomaticDelivery(state, [variant], context.referenceData, true); state.modal = null; persist(state); context.autosave(); context.toast(`${result.reused} placements reused · ${result.created} created.`); context.render(); return true; }
    if (action === "bulk-delivery") { state.modal = { type: "bulk-delivery" }; context.render(); return true; }
    if (action === "bulk-use-existing" || action === "bulk-auto-create") { const variants = state.selectedVariantIds.map((variantId) => variantById(state, variantId)).filter(Boolean); const result = applyAutomaticDelivery(state, variants, context.referenceData, action === "bulk-auto-create"); state.modal = null; persist(state); context.autosave(); context.toast(`${result.reused} placements reused · ${result.created} created${result.skipped ? ` · ${result.skipped} need manual mapping` : ""}.`); context.render(); return true; }
    if (action === "bulk-map-manually") { state.expandedVariantIds = [...new Set([...state.expandedVariantIds, ...state.selectedVariantIds])]; state.modal = null; context.toast("Selected creatives expanded for manual rendition mapping."); context.render(); return true; }
    if (action === "toggle-traffic-row") { const ids = new Set(state.expandedTrafficIds); ids.has(target.dataset.renditionId) ? ids.delete(target.dataset.renditionId) : ids.add(target.dataset.renditionId); state.expandedTrafficIds = [...ids]; context.render(); return true; }
    if (action === "create-profile") { state.modal = { type: "profile", mode: "create", name: state.studio.profileName || "Summer Campaign — DCO Profile", description: "" }; context.render(); return true; }
    if (action === "select-profile") { state.modal = { type: "profile", mode: "select" }; context.render(); return true; }
    if (action === "save-profile") { if (!state.modal.name.trim()) { state.modal.error = "Profile Name is required."; context.render(); return true; } state.studio.profileId = id("studio-profile"); state.studio.profileName = state.modal.name.trim(); state.studio.profileState = "created"; state.modal = null; persist(state); context.autosave(); context.toast("Studio Profile created in the prototype."); context.render(); return true; }
    if (action === "choose-profile") { state.studio.profileId = target.dataset.profileId; state.studio.profileName = target.dataset.profileName; state.studio.profileState = "created"; state.modal = null; persist(state); context.autosave(); context.toast("Existing Studio Profile selected."); context.render(); return true; }
    if (action === "edit-mapping") { const mapping = state.dynamicMappings.find((item) => item.id === target.dataset.mappingId); state.modal = { type: "mapping", draft: clone(mapping) }; context.render(); return true; }
    if (action === "save-mapping") { const draft = state.modal.draft; const index = state.dynamicMappings.findIndex((mapping) => mapping.id === draft.id); state.dynamicMappings[index] = clone(draft); refreshMappingStatuses(state); state.modal = null; invalidateStudioData(state); persist(state); context.autosave(); context.toast("Dynamic Mapping saved. Studio feed must be regenerated."); context.render(); return true; }
    if (action === "generate-feed") { if ([...targetingIssues(state), ...dynamicMappingIssues(state)].length) return true; state.studio.feedState = "generated"; state.studio.publishingState = "not_published"; persist(state); context.autosave(); context.toast("Dynamic Feed generated from approved content, Segments, assignments, and mappings."); context.render(); return true; }
    if (action === "preview-feed") { state.modal = { type: "feed" }; context.render(); return true; }
    if (action === "upload-feed") { state.studio.feedState = "uploaded"; persist(state); context.autosave(); context.toast("Generated Studio data uploaded in the simulated flow."); context.render(); return true; }
    if (action === "associate") { state.studio.associationState = "associated"; persist(state); context.autosave(); context.toast("Approved creatives associated with Studio Profile."); context.render(); return true; }
    if (action === "publish-studio") { if (state.studio.associationState !== "associated") return true; state.studio.publishingState = "published"; persist(state); context.autosave(); context.toast("Creative and Dynamic Feed published to Studio."); context.render(); return true; }
    if (action === "focus-media") { const field = document.querySelector(`[data-dco-media-field="${target.dataset.mediaField}"]`); if (field) field.focus(); return true; }
    if (action === "run-validation") { const blockers = blockerCount(state, context.referenceData); context.toast(blockers ? `Validation complete: ${blockers} blocking issues.` : "Validation complete: Ready to publish."); return true; }
    if (action === "publish-cm360") { if (state.cm360.publishingState === "publishing" || blockerCount(state, context.referenceData)) return true; state.cm360.publishingState = "publishing"; persist(state); context.render(); window.setTimeout(() => { state.cm360.publishingState = "published"; persist(state); context.toast("Activation published to Campaign Manager 360."); context.render(); }, 900); return true; }
    if (action === "generate-tags") { if (state.cm360.publishingState !== "published") return true; state.tags.state = "generated"; persist(state); context.autosave(); context.toast("CM360 tag package generated."); context.render(); return true; }
    if (["download-tags", "export-tags", "copy-tags"].includes(action)) { context.toast(action === "download-tags" ? "Prototype tag package prepared for download." : action === "export-tags" ? "Tag information exported in the prototype." : "Tag information copied."); return true; }
    if (action === "close-modal") { if (target.classList.contains("modal-overlay") && event.target !== target) return true; state.modal = null; context.render(); return true; }
    return false;
  }

  function handleInput(event, state, context) {
    if (connectedTargeting?.handleInput(event, state, connectedContext(state, context))) return true;
    if (event.target.dataset.studioRuleField && state.modal?.type === "studio-rule") { state.modal[event.target.dataset.studioRuleField] = event.target.value; return true; }
    if (Object.prototype.hasOwnProperty.call(event.target.dataset, "dcoPopoverSearch") && state.assignmentPopover) {
      state.assignmentPopover.search = event.target.value;
      context.render();
      const input = document.querySelector("[data-dco-popover-search]");
      if (input) { input.focus(); input.setSelectionRange(input.value.length, input.value.length); }
      return true;
    }
    if (event.target.dataset.dcoRuleField && state.modal?.type === "rule-editor") {
      const field = event.target.dataset.dcoRuleField;
      state.modal.draft[field] = event.target.type === "checkbox" ? event.target.checked : event.target.value;
      return true;
    }
    if (event.target.dataset.dcoMappingIndex != null && state.modal?.type === "rule-editor") { state.modal.draft.mappings[Number(event.target.dataset.dcoMappingIndex)] = event.target.value; return true; }
    if (event.target.dataset.dcoDay && state.modal?.type === "rule-editor") { const day = event.target.dataset.dcoDay; state.modal.draft.dayTimes[day] = { ...(state.modal.draft.dayTimes[day] || {}), [event.target.dataset.part]: event.target.type === "checkbox" ? event.target.checked : event.target.value }; return true; }
    if (event.target.dataset.dcoProfileField && state.modal?.type === "profile") { state.modal[event.target.dataset.dcoProfileField] = event.target.value; return true; }
    if (event.target.dataset.dcoPlacementField && state.modal?.type === "delivery-create") { state.modal[event.target.dataset.dcoPlacementField] = event.target.value; return true; }
    return false;
  }

  function handleChange(event, state, context) {
    if (connectedTargeting?.handleChange(event, state, connectedContext(state, context))) return true;
    if (event.target.hasAttribute("data-studio-rule-condition") && state.modal?.type === "studio-rule") { const selected = new Set(state.modal.selectedConditionKeys || []); event.target.checked ? selected.add(event.target.dataset.studioRuleCondition) : selected.delete(event.target.dataset.studioRuleCondition); state.modal.selectedConditionKeys = [...selected]; return true; }
    if (event.target.dataset.dcoPlacementField && state.modal?.type === "delivery-create") { state.modal[event.target.dataset.dcoPlacementField] = event.target.value; return true; }
    if (event.target.hasAttribute("data-dco-placement-choice") && state.modal?.type === "delivery-select") { const ids = new Set(state.modal.selectedPlacementIds || []); event.target.checked ? ids.add(event.target.dataset.dcoPlacementChoice) : ids.delete(event.target.dataset.dcoPlacementChoice); state.modal.selectedPlacementIds = [...ids]; context.render(); return true; }
    if (event.target.dataset.dcoMediaField) {
      const field = event.target.dataset.dcoMediaField;
      const previous = state.media[field];
      state.media[field] = event.target.value;
      if (field === "cmAdvertiserId") {
        state.media.cmCampaignId = "";
        state.media.studioAdvertiserId = "";
        state.media.dvAdvertiserId = "";
        state.media.dvCampaignId = "";
        state.cm360.deliveryAssignments = [];
        state.cm360.createdPlacements = [];
        invalidateStudioData(state);
      }
      if (field === "cmCampaignId" && previous !== event.target.value) { state.cm360.deliveryAssignments = []; state.cm360.createdPlacements = []; invalidateStudioData(state); invalidateTrafficking(state); }
      if (field === "studioAdvertiserId" && previous !== event.target.value) invalidateStudioData(state);
      if (field === "dvAdvertiserId") state.media.dvCampaignId = "";
      syncStudioProfile(state, context.referenceData);
      persist(state); context.autosave(); context.toast("Media connection updated."); context.render(); return true;
    }
    if (Object.prototype.hasOwnProperty.call(event.target.dataset, "dcoAssignmentRule") && state.modal?.type === "assignment") { const type = event.target.dataset.ruleType; const ids = new Set(state.modal.ruleIds.filter((ruleId) => ruleById(state, ruleId)?.type !== type)); if (event.target.dataset.dcoAssignmentRule) ids.add(event.target.dataset.dcoAssignmentRule); state.modal.ruleIds = [...ids]; return true; }
    if (event.target.hasAttribute("data-dco-bulk-rule") && state.modal?.type === "bulk") { state.modal.ruleId = event.target.value; return true; }
    if (event.target.dataset.dcoMappingField && state.modal?.type === "mapping") { state.modal.draft[event.target.dataset.dcoMappingField] = event.target.value; return true; }
    if (event.target.dataset.dcoRuleField && state.modal?.type === "rule-editor") { const field = event.target.dataset.dcoRuleField; state.modal.draft[field] = event.target.type === "checkbox" ? event.target.checked : event.target.value; if (["customSchedule"].includes(field)) context.render(); return true; }
    if (event.target.dataset.dcoDay && state.modal?.type === "rule-editor") { const day = event.target.dataset.dcoDay; state.modal.draft.dayTimes[day] = { ...(state.modal.draft.dayTimes[day] || {}), [event.target.dataset.part]: event.target.type === "checkbox" ? event.target.checked : event.target.value }; if (event.target.dataset.part === "enabled") context.render(); return true; }
    return false;
  }

  window.cm360DcoActivationWorkflow = { createState: restore, open, render, handleClick, handleInput, handleChange, studioRules, studioRuleIssues, availableStudioConditions };
})();
