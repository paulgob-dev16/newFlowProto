(function () {
  const fixtures = window.cm360WorkspacePrototypeFixtures || { workspaces: [] };
  const adapter = window.cm360WorkspacePrototypeAdapter || null;
  const validation = window.cm360WorkspacePrototypeValidation || null;
  const dcoActivation = window.cm360DcoActivationWorkflow || null;
  const root = document.getElementById("cm360WorkspaceApp");
  const launchParams = new URLSearchParams(window.location?.search || "");

  function cloneWorkspace(workspace) {
    return JSON.parse(JSON.stringify(workspace));
  }

  function getPrototypeWorkspaces() {
    if (adapter && typeof adapter.getPrototypeWorkspaces === "function") {
      return adapter.getPrototypeWorkspaces();
    }
    return (fixtures.workspaces || []).map(cloneWorkspace);
  }

  const initialWorkspaces = getPrototypeWorkspaces();

  const state = {
    view: launchParams.get("view") === "dco" ? "detail" : "list",
    workspaces: initialWorkspaces,
    search: "",
    selectedWorkspaceId: launchParams.get("workspace") || (initialWorkspaces[0] ? initialWorkspaces[0].id : ""),
    selectedNode: { type: "campaign" },
    expandedNodes: new Set(["campaign"]),
    createOpen: false,
    createName: "",
    createPlatform: "Meta",
    createError: "",
    toast: "",
    toastTimer: 0,
    autosaveText: "Saved just now",
    autosaveTimer: 0,
    routingModal: null,
    libraryModal: null,
    feedMacroTargetId: "",
    routingAudienceMenu: null,
    routingAudienceSearch: "",
    dcoActivation: dcoActivation ? dcoActivation.createState() : null,
  };

  if (state.view === "detail" && state.dcoActivation && dcoActivation) {
    dcoActivation.open(state.dcoActivation, { workspace: currentWorkspace(), referenceData: referenceData() });
    state.dcoActivation.section = launchParams.get("section") || "overview";
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function chip(label, style) {
    return `<span class="chip ${escapeHtml(style || "gray")}">${escapeHtml(label)}</span>`;
  }

  function refreshWorkspaces() {
    if (adapter && typeof adapter.getPrototypeWorkspaces === "function") {
      state.workspaces = adapter.getPrototypeWorkspaces();
    }
  }

  function currentWorkspace() {
    return state.workspaces.find((workspace) => workspace.id === state.selectedWorkspaceId) || state.workspaces[0] || null;
  }

  function placementCount(workspace) {
    return (workspace.placementsTree || []).length;
  }

  function adBlueprintCount(workspace) {
    return (workspace.placementsTree || []).reduce((total, placement) => total + (placement.adBlueprints || []).length, 0);
  }

  function nodeKey(type, id) {
    return id ? `${type}:${id}` : type;
  }

  function statusStyle(status, fallback) {
    if (fallback) return fallback;
    const normalized = String(status || "").toLowerCase();
    if (normalized === "complete" || normalized === "published") return "green";
    if (normalized === "studio connected") return "blue";
    if (normalized === "failed" || normalized.includes("issue")) return "red";
    if (normalized === "needs setup") return "yellow";
    return "gray";
  }

  function readableStatus(value, fallback) {
    const status = typeof value === "object" && value ? value.label || value.status : value;
    if (!status) return fallback || "Not started";
    return String(status)
      .replaceAll("_", " ")
      .replace(/\b\w/g, (letter) => letter.toUpperCase());
  }

  function formatSummary(value, fallback) {
    if (Array.isArray(value)) return value.length ? value.join(", ") : fallback;
    return value || fallback;
  }

  function referenceData() {
    if (adapter && typeof adapter.getPrototypeReferenceData === "function") {
      return adapter.getPrototypeReferenceData();
    }
    return {
      accountState: fixtures.accountState || {},
      cm360Advertisers: fixtures.cm360Advertisers || [],
      cm360Campaigns: fixtures.cm360Campaigns || [],
      cm360Placements: fixtures.cm360Placements || [],
    };
  }

  function getAdvertisers() {
    if (adapter && typeof adapter.getPrototypeCm360Advertisers === "function") {
      return adapter.getPrototypeCm360Advertisers();
    }
    return (fixtures.cm360Advertisers || []).filter((advertiser) => advertiser.id !== "cmadv-unselected");
  }

  function getCampaigns(cmAdvertiserId) {
    if (!cmAdvertiserId) return [];
    if (adapter && typeof adapter.getPrototypeCm360Campaigns === "function") {
      return adapter.getPrototypeCm360Campaigns(cmAdvertiserId);
    }
    return (fixtures.cm360Campaigns || []).filter((campaign) => campaign.advertiserId === cmAdvertiserId);
  }

  function getPlacements(cmCampaignId) {
    if (!cmCampaignId) return [];
    if (adapter && typeof adapter.getPrototypeCm360Placements === "function") {
      return adapter.getPrototypeCm360Placements(cmCampaignId);
    }
    return (fixtures.cm360Placements || []).filter((placement) => placement.campaignId === cmCampaignId);
  }

  function getDvAdvertisers(cmAdvertiserId) {
    if (!cmAdvertiserId) return [];
    if (adapter && typeof adapter.getPrototypeConnectedDv360Advertisers === "function") {
      return adapter.getPrototypeConnectedDv360Advertisers(cmAdvertiserId);
    }
    return (fixtures.dv360Advertisers || []).filter((advertiser) => (advertiser.connectedCmAdvertiserIds || []).includes(cmAdvertiserId));
  }

  function getDvCampaigns(dvAdvertiserId) {
    if (!dvAdvertiserId) return [];
    if (adapter && typeof adapter.getPrototypeDv360Campaigns === "function") {
      return adapter.getPrototypeDv360Campaigns(dvAdvertiserId);
    }
    return (fixtures.dv360Campaigns || []).filter((campaign) => campaign.advertiserId === dvAdvertiserId);
  }

  function getDvLineItems(dvCampaignId) {
    if (!dvCampaignId) return [];
    if (adapter && typeof adapter.getPrototypeDv360LineItems === "function") {
      return adapter.getPrototypeDv360LineItems(dvCampaignId);
    }
    return (fixtures.dv360LineItems || []).filter((lineItem) => lineItem.campaignId === dvCampaignId);
  }

  function getAutomationFeeds() {
    if (adapter && typeof adapter.getPrototypeAutomationFeeds === "function") {
      return adapter.getPrototypeAutomationFeeds();
    }
    return fixtures.automationFeeds || fixtures.producers || [];
  }

  function getAutomationFeedFields() {
    if (adapter && typeof adapter.getPrototypeProducerFeedFields === "function") {
      return adapter.getPrototypeProducerFeedFields();
    }
    return fixtures.producerFeedFields || [];
  }

  function getAutomationFeedRows() {
    if (adapter && typeof adapter.getPrototypeAutomationFeedRows === "function") {
      return adapter.getPrototypeAutomationFeedRows();
    }
    return fixtures.automationFeedRows || fixtures.producerVariants || [];
  }

  function getAudienceMappingSuggestions() {
    if (adapter && typeof adapter.getPrototypeAudienceMappingSuggestions === "function") {
      return adapter.getPrototypeAudienceMappingSuggestions();
    }
    return fixtures.audienceMappingSuggestions || [];
  }

  function getStudioProfileMappingRows(adBlueprint) {
    if (adBlueprint.studioProfileMappings?.length) return adBlueprint.studioProfileMappings;
    if (adapter && typeof adapter.getPrototypeStudioProfileMappings === "function") {
      return adapter.getPrototypeStudioProfileMappings();
    }
    return fixtures.studioProfileMappings || [];
  }

  function getStandardDisplayTemplates() {
    if (adapter && typeof adapter.getPrototypeStandardDisplayTemplates === "function") {
      return adapter.getPrototypeStandardDisplayTemplates();
    }
    return (fixtures.creativeTemplates || []).filter((template) => template.type === "standard_display");
  }

  function getRichMediaDcoTemplates() {
    if (adapter && typeof adapter.getPrototypeRichMediaDcoTemplates === "function") {
      return adapter.getPrototypeRichMediaDcoTemplates();
    }
    return (fixtures.creativeTemplates || []).filter((template) => template.type === "rich_media_dco");
  }

  function getDataSources() {
    if (adapter && typeof adapter.getPrototypeDataSources === "function") {
      return adapter.getPrototypeDataSources();
    }
    return fixtures.dataSources || [];
  }

  function getProductFeedColumns() {
    const reference = referenceData();
    const columns = reference.productFeedColumns || fixtures.productFeedColumns || [];
    return columns.length
      ? columns
      : [
          { id: "title", name: "title", sampleValue: "Nike Run Swift 3" },
          { id: "subheadline", name: "subheadline", sampleValue: "Still thinking it over?" },
          { id: "image_link_a", name: "image_link_a", sampleValue: "swift3_black_a.jpg" },
          { id: "image_link_b", name: "image_link_b", sampleValue: "swift3_black_b.jpg" },
          { id: "image_link_c", name: "image_link_c", sampleValue: "swift3_black_c.jpg" },
          { id: "brand", name: "brand", sampleValue: "Nike" },
          { id: "category", name: "category", sampleValue: "Shoes" },
          { id: "product_type", name: "product_type", sampleValue: "Running shoes" },
        ];
  }

  function getContentMatchColumns() {
    const reference = referenceData();
    const columns = reference.contentMatchColumns || fixtures.contentMatchColumns || [];
    return columns.length
      ? columns
      : [
          { id: "category", name: "Category" },
          { id: "product_type", name: "Product type" },
        ];
  }

  function targetingLibrary(workspace) {
    return {
      audienceTargets: workspace?.targetingLibrary?.audienceTargets || [],
      deliverySchedules: workspace?.targetingLibrary?.deliverySchedules || [],
    };
  }

  function audienceTargetingIdTypes() {
    return [
      { id: "DV360 Line Item ID", name: "DV360 Line Item ID" },
      { id: "CM360 Placement ID", name: "CM360 Placement ID" },
      { id: "CM360 Ad ID", name: "CM360 Ad ID" },
      { id: "CM360 Site ID", name: "CM360 Site ID" },
      { id: "CM360 1st Party Audience", name: "CM360 1st Party Audience" },
      { id: "CM360 Dynamic Targeting Keys", name: "CM360 Dynamic Targeting Keys" },
      { id: "GEO Location", name: "GEO Location" },
      { id: "Custom Variable", name: "Custom Variable" },
    ];
  }

  function deliveryQuickFilters() {
    return [
      { id: "Weekend", name: "Weekend" },
      { id: "Weekdays", name: "Weekdays" },
      { id: "Morning", name: "Morning" },
      { id: "Afternoon", name: "Afternoon" },
      { id: "Evening", name: "Evening" },
    ];
  }

  function deliveryDays() {
    return ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"].map((day) => ({ id: day, name: day }));
  }

  function getStudioAdvertiser(cmAdvertiserId) {
    if (!cmAdvertiserId) return null;
    if (adapter && typeof adapter.getPrototypeStudioAdvertiser === "function") {
      return adapter.getPrototypeStudioAdvertiser(cmAdvertiserId);
    }
    return (fixtures.studioAdvertisers || []).find((advertiser) => advertiser.cmAdvertiserId === cmAdvertiserId) || null;
  }

  function getStudioAdvertisers(cmAdvertiserId) {
    if (!cmAdvertiserId) return [];
    if (adapter && typeof adapter.getPrototypeStudioAdvertisers === "function") {
      return adapter.getPrototypeStudioAdvertisers(cmAdvertiserId);
    }
    return (fixtures.studioAdvertisers || []).filter((advertiser) => advertiser.cmAdvertiserId === cmAdvertiserId);
  }

  function getStudioCampaigns(studioAdvertiserId) {
    if (!studioAdvertiserId) return [];
    if (adapter && typeof adapter.getPrototypeStudioCampaigns === "function") {
      return adapter.getPrototypeStudioCampaigns(studioAdvertiserId);
    }
    return (fixtures.studioCampaigns || []).filter((campaign) => campaign.studioAdvertiserId === studioAdvertiserId);
  }

  function selectedCmPlacementIds(workspace) {
    return new Set((workspace.placementsTree || []).map((placement) => placement.cmPlacementId));
  }

  function issuesFor(workspace, locations) {
    if (!validation || typeof validation.validatePrototypeWorkspace !== "function") return [];
    const wanted = new Set(locations);
    return validation.validatePrototypeWorkspace(workspace, referenceData()).filter((issue) => wanted.has(issue.location));
  }

  function dv360IssuesForPlacement(workspace, placement) {
    if (!validation || typeof validation.validatePrototypeDv360 !== "function") return [];
    const rowIds = new Set((placement.dv360Connections || []).map((connection) => connection.id));
    const setupIssues = validation.validatePrototypeDv360(workspace, referenceData()).filter((issue) => {
      if (issue.id === `dv-row-required-${placement.id}`) return true;
      return Array.from(rowIds).some((rowId) => issue.id.includes(rowId));
    });
    const accountIssues =
      validation.validatePrototypeAccounts && typeof validation.validatePrototypeAccounts === "function"
        ? validation.validatePrototypeAccounts(workspace, referenceData()).filter((issue) => issue.placementId === placement.id)
        : [];
    return [...accountIssues, ...setupIssues];
  }

  function issuesForAdBlueprint(workspace, placement, adBlueprint) {
    if (!validation || typeof validation.validatePrototypeAdBlueprints !== "function") return [];
    const allowedIds = new Set([
      `ad-name-${adBlueprint.id}`,
      `ad-type-${adBlueprint.id}`,
      `ad-producer-${adBlueprint.id}`,
      `standard-media-${adBlueprint.id}`,
      `dco-studio-${adBlueprint.id}`,
      `dco-studio-advertiser-flow-${adBlueprint.id}`,
      `dco-studio-campaign-${adBlueprint.id}`,
      `dco-studio-campaign-flow-${adBlueprint.id}`,
      `dco-html-${adBlueprint.id}`,
      `dco-duplicate-formats-${adBlueprint.id}`,
    ]);
    const adIssues = validation.validatePrototypeAdBlueprints(workspace, referenceData()).filter((issue) => {
      if (allowedIds.has(issue.id)) return true;
      return issue.id.startsWith(`ad-format-${adBlueprint.id}-`);
    });
    const targetingIssues =
      validation.validatePrototypeTargetingRules && typeof validation.validatePrototypeTargetingRules === "function"
        ? validation.validatePrototypeTargetingRules(workspace, referenceData()).filter((issue) => issue.id.includes(adBlueprint.id))
        : [];
    return [...adIssues, ...targetingIssues];
  }

  function issuesForAudienceMapping(workspace, adBlueprint) {
    if (!validation || typeof validation.validatePrototypeAudienceMappings !== "function") return [];
    return validation.validatePrototypeAudienceMappings(workspace, referenceData()).filter((issue) => issue.id.includes(adBlueprint.id));
  }

  function issuesForTargetingRule(workspace, adBlueprint, rule) {
    if (!validation || typeof validation.validatePrototypeTargetingRules !== "function") return [];
    return validation.validatePrototypeTargetingRules(workspace, referenceData()).filter((issue) => issue.id.includes(adBlueprint.id) && issue.id.includes(rule.id));
  }

  function workspaceValidationIssues(workspace) {
    if (!workspace || !validation || typeof validation.validatePrototypeWorkspace !== "function") return [];
    return validation.validatePrototypeWorkspace(workspace, referenceData());
  }

  function issueCounts(workspace) {
    const issues = workspaceValidationIssues(workspace);
    return {
      all: issues.length,
      blocking: issues.filter((issue) => issue.severity === "blocking").length,
      warning: issues.filter((issue) => issue.severity === "warning").length,
    };
  }

  function issueChip(workspace) {
    const counts = issueCounts(workspace);
    if (counts.blocking) return chip(`${counts.blocking} issue${counts.blocking === 1 ? "" : "s"}`, "red");
    if (counts.warning) return chip(`${counts.warning} warning${counts.warning === 1 ? "" : "s"}`, "yellow");
    return chip("No issues", "green");
  }

  function renderIssueList(issues, emptyText) {
    if (!issues.length) {
      return emptyText ? `<div class="issue-list empty"><span>${escapeHtml(emptyText)}</span></div>` : "";
    }
    return `
      <div class="issue-list" role="status">
        ${issues
          .slice(0, 5)
          .map(
            (issue) => `
              <div class="issue-row ${escapeHtml(issue.severity || "warning")}">
                <div>
                  <span>${escapeHtml(issue.location || "Workspace")}</span>
                  <strong>${escapeHtml(issue.message)}</strong>
                </div>
                ${
                  issue.placementId
                    ? `<button class="text-button issue-action" type="button" data-action="open-issue-placement" data-placement-id="${escapeHtml(issue.placementId)}">Open Placement</button>`
                    : ""
                }
              </div>
            `
          )
          .join("")}
        ${issues.length > 5 ? `<div class="issue-more">${issues.length - 5} more review item${issues.length - 5 === 1 ? "" : "s"}</div>` : ""}
      </div>
    `;
  }

  function isWorkspaceLocked(workspace) {
    return String(workspace?.status || "").toLowerCase() === "published";
  }

  function isAdBlueprintLocked(workspace, adBlueprint) {
    return isWorkspaceLocked(workspace) || adBlueprint?.studioProfileConnection?.status === "connected";
  }

  function renderLockNotice(message) {
    if (!message) return "";
    return `
      <div class="lock-notice" role="status">
        <strong>Locked</strong>
        <span>${escapeHtml(message)}</span>
      </div>
    `;
  }

  function adBlueprintLockMessage(workspace, adBlueprint) {
    if (isWorkspaceLocked(workspace)) return "This Workspace is published. Duplicate the setup to make changes.";
    if (adBlueprint?.studioProfileConnection?.status === "connected") {
      return "This Ad Blueprint is locked because the Studio Profile has already been connected. Duplicate the Ad Blueprint to make creative changes.";
    }
    return "";
  }

  function renderOptions(items, selectedId, placeholder) {
    return [
      `<option value="">${escapeHtml(placeholder)}</option>`,
      ...items.map((item) => `<option value="${escapeHtml(item.id)}" ${item.id === selectedId ? "selected" : ""}>${escapeHtml(item.name)}</option>`),
    ].join("");
  }

  function renderTemplateOptions(items, selectedId, placeholder, placementFormats) {
    const formats = Array.isArray(placementFormats) ? placementFormats : [];
    return [
      `<option value="">${escapeHtml(placeholder)}</option>`,
      ...items.map((item) => {
        const compatible = !formats.length || formats.includes(item.format);
        const label = compatible ? item.name : `${item.name} - Not supported by selected placement`;
        return `<option value="${escapeHtml(item.id)}" ${item.id === selectedId && compatible ? "selected" : ""} ${compatible ? "" : "disabled"}>${escapeHtml(label)}</option>`;
      }),
    ].join("");
  }

  function renderFormatOptions(formats, selectedFormat, placeholder) {
    return [
      `<option value="">${escapeHtml(placeholder)}</option>`,
      ...(formats || []).map((format) => `<option value="${escapeHtml(format)}" ${format === selectedFormat ? "selected" : ""}>${escapeHtml(format)}</option>`),
    ].join("");
  }

  function renderMultiOptions(items, selectedIds) {
    const selected = new Set(selectedIds || []);
    return items.map((item) => `<option value="${escapeHtml(item.id)}" ${selected.has(item.id) ? "selected" : ""}>${escapeHtml(item.name)}</option>`).join("");
  }

  function renderValidationList(issues, emptyText) {
    if (!issues.length && !emptyText) return "";
    return `
      <div class="validation-list ${issues.length ? "has-issues" : ""}" role="status">
        ${
          issues.length
            ? issues.map((issue) => `<div class="validation-item">${escapeHtml(issue.message)}</div>`).join("")
            : `<div class="validation-item muted">${escapeHtml(emptyText)}</div>`
        }
      </div>
    `;
  }

  function renderFormatChips(formats) {
    const values = Array.isArray(formats) ? formats : [];
    if (!values.length) return '<span class="muted-text">Format data not available</span>';
    return `<div class="format-chip-list">${values.map((format) => chip(format, "gray")).join("")}</div>`;
  }

  function dv360RowState(workspace, row) {
    const lineItems = getDvLineItems(workspace.dvCampaignId);
    const lineItemsValid = (row.lineItemIds || []).every((lineItemId) => lineItems.some((lineItem) => lineItem.id === lineItemId));
    if (!lineItemsValid) {
      return { label: "Invalid", style: "red" };
    }
    if (!workspace.dvAdvertiserId || !workspace.dvCampaignId || !(row.lineItemIds || []).length) {
      return { label: "Needs setup", style: "yellow" };
    }
    return { label: "Complete", style: "green" };
  }

  function dv360PlacementState(workspace, placement) {
    if (!placement.dv360Enabled) return { label: "Not connected", style: "gray" };
    const rows = placement.dv360Connections || [];
    if (!rows.length) return { label: "Needs setup", style: "yellow" };
    const states = rows.map((row) => dv360RowState(workspace, row));
    if (states.some((stateItem) => stateItem.label === "Invalid")) return { label: "Invalid", style: "red" };
    if (states.some((stateItem) => stateItem.label === "Needs setup")) return { label: "Needs setup", style: "yellow" };
    return { label: "Connected", style: "green" };
  }

  function selectedLineItemNames(workspace, row) {
    const lineItems = getDvLineItems(workspace.dvCampaignId);
    return (row.lineItemIds || [])
      .map((lineItemId) => lineItems.find((lineItem) => lineItem.id === lineItemId)?.name)
      .filter(Boolean);
  }

  function selectedDv360LineItemsForPlacement(placement) {
    const lineItemIds = (placement.dv360Connections || []).flatMap((connection) => (connection.enabled ? connection.lineItemIds || [] : []));
    const uniqueIds = [...new Set(lineItemIds)];
    return uniqueIds
      .map((lineItemId) => {
        const reference = referenceData();
        const lineItem = (reference.dv360LineItems || []).find((item) => item.id === lineItemId);
        const campaign = (reference.dv360Campaigns || []).find((item) => item.id === lineItem?.campaignId);
        return lineItem ? { ...lineItem, campaignName: campaign?.name || "" } : null;
      })
      .filter(Boolean);
  }

  function adTypeLabel(value) {
    if (value === "standard_display") return "Standard Display";
    if (value === "rich_media_dco") return "Rich Media DCO";
    return "Not selected";
  }

  function creativeSourceLabel(adBlueprint) {
    if (adBlueprint.adType === "rich_media_dco") {
      const count = adBlueprint.richMediaDcoConfig?.htmlCreatives?.length || 0;
      return count ? `${count} HTML Creative${count === 1 ? "" : "s"}` : "Not selected";
    }
    const config = adBlueprint.standardDisplayConfig || {};
    if (config.mediaSource === "upload") return config.uploadedBundleName || "Desktop upload";
    if (config.templateId) return getStandardDisplayTemplates().find((template) => template.id === config.templateId)?.name || "Template";
    return "Not selected";
  }

  function adBlueprintState(workspace, placement, adBlueprint) {
    const issues = issuesForAdBlueprint(workspace, placement, adBlueprint);
    if (issues.some((issue) => issue.id.startsWith(`ad-format-${adBlueprint.id}-`))) return { label: "Invalid", style: "red" };
    if (issues.length) return { label: "Needs setup", style: "yellow" };
    if (adBlueprint.status) return { label: adBlueprint.status, style: adBlueprint.statusStyle || statusStyle(adBlueprint.status) };
    return { label: "Draft", style: "gray" };
  }

  function renderAdFormatMismatch(workspace, placement, adBlueprint) {
    const issues = issuesForAdBlueprint(workspace, placement, adBlueprint).filter((issue) => issue.id.startsWith(`ad-format-${adBlueprint.id}-`));
    if (!issues.length) return "";
    const placementFormats = formatSummary(placement.formats, "no formats");
    const adFormats = formatSummary(adBlueprint.selectedFormats, "no formats");
    return `
      <div class="validation-list has-issues" role="alert">
        <div class="validation-item">Format mismatch. The selected placement supports ${escapeHtml(placementFormats)}, but this Ad Blueprint includes ${escapeHtml(adFormats)}.</div>
      </div>
    `;
  }

  function standardDisplayPreviewRows(placement, adBlueprint) {
    const config = adBlueprint.standardDisplayConfig || {};
    if (adBlueprint.adType !== "standard_display") return [];
    if (config.mediaSource === "template") {
      const selectedTemplate = getStandardDisplayTemplates().find((template) => template.id === config.templateId);
      const templates = selectedTemplate ? [selectedTemplate] : getStandardDisplayTemplates().filter((template) => (placement.formats || []).includes(template.format));
      return templates.map((template) => ({
        id: template.id,
        creative: template.name,
        format: template.format,
        source: "Template",
        landingPage: config.landingPageValue || "Not set",
        urlParameters: config.urlParameterValue || "Not set",
        status: (placement.formats || []).includes(template.format) ? "Compatible" : "Mismatch",
      }));
    }
    const format = config.uploadedFormat || (adBlueprint.selectedFormats || [])[0] || "";
    return [
      {
        id: "prototype-upload",
        creative: config.uploadedBundleName || "Prototype desktop bundle",
        format,
        source: "Desktop upload",
        landingPage: config.landingPageValue || "Not set",
        urlParameters: config.urlParameterValue || "Not set",
        status: (placement.formats || []).includes(format) ? "Compatible" : "Mismatch",
      },
    ];
  }

  function selectedDcoTemplateIds(adBlueprint) {
    return (adBlueprint.richMediaDcoConfig?.htmlCreatives || []).map((creative) => creative.templateId).filter(Boolean);
  }

  function dcoTemplateName(templateId) {
    return getRichMediaDcoTemplates().find((template) => template.id === templateId)?.name || "HTML Creative";
  }

  function richMediaDcoPreviewRows(placement, adBlueprint) {
    const config = adBlueprint.richMediaDcoConfig || {};
    return (config.htmlCreatives || []).map((creative) => {
      const template = getRichMediaDcoTemplates().find((item) => item.id === creative.templateId);
      const format = creative.format || template?.format || "";
      return {
        id: creative.id || creative.templateId,
        creative: template?.name || dcoTemplateName(creative.templateId),
        format,
        landingPage: config.landingPageValue || "Not set",
        urlParameters: config.urlParameterValue || "Not set",
        status: (placement.formats || []).includes(format) ? "Compatible" : "Mismatch",
      };
    });
  }

  function audienceMappingFor(adBlueprint, lineItemId) {
    return (adBlueprint.audienceMappings || []).find((mapping) => mapping.dvLineItemId === lineItemId) || {
      dvLineItemId: lineItemId,
      feedField: "",
      operator: "",
      value: "",
    };
  }

  function audienceSuggestionFor(lineItemId) {
    return getAudienceMappingSuggestions().find((suggestion) => suggestion.lineItemId === lineItemId) || null;
  }

  function audienceMatchCount(mapping) {
    const variants = getAutomationFeedRows();
    if (!mapping.feedField || !mapping.operator) return 0;
    return variants.filter((variant) => {
      const rawValue = variant[mapping.feedField];
      const actual = String(rawValue || "").toLowerCase();
      const expected = String(mapping.value || "").toLowerCase();
      if (mapping.operator === "is_not_empty") return Boolean(rawValue);
      if (!expected) return false;
      if (mapping.operator === "equals") return actual === expected;
      if (mapping.operator === "contains") return actual.includes(expected);
      if (mapping.operator === "starts_with") return actual.startsWith(expected);
      return false;
    }).length;
  }

  function audienceMappingState(mapping) {
    if (!mapping.feedField || !mapping.operator || (!mapping.value && mapping.operator !== "is_not_empty")) return { label: "Needs setup", style: "yellow" };
    if (!["equals", "contains", "starts_with", "is_not_empty"].includes(mapping.operator)) return { label: "Invalid", style: "red" };
    if (!audienceMatchCount(mapping)) return { label: "No matches", style: "red" };
    return { label: "Complete", style: "green" };
  }

  function targetingUsageCount(workspace, type, id) {
    return (workspace.placementsTree || []).reduce(
      (total, placement) =>
        total +
        (placement.adBlueprints || []).reduce(
          (adTotal, adBlueprint) =>
            adTotal +
            (adBlueprint.targetingRules || []).filter((rule) =>
              (rule.conditions || []).some((condition) => condition.type === type && (condition.valueIds || []).includes(id))
            ).length,
          0
        ),
      0
    );
  }

  function audienceTargetState(target) {
    if (!target.name || !target.idType || !(target.values || []).length) return { label: "Needs setup", style: "yellow" };
    return { label: "Complete", style: "green" };
  }

  function deliveryScheduleState(schedule) {
    if (!schedule.name || !schedule.timezone || !(schedule.days || []).length || !schedule.timeOfDay) return { label: "Needs setup", style: "yellow" };
    return { label: "Complete", style: "green" };
  }

  function targetingValuesFor(workspace, type) {
    const library = targetingLibrary(workspace);
    if (type === "audience") return library.audienceTargets;
    return [];
  }

  function targetingValueName(workspace, type, id) {
    return targetingValuesFor(workspace, type).find((item) => item.id === id)?.name || "Missing value";
  }

  function targetingLogicSummary(workspace, rule) {
    const audienceIds = (rule.conditions || []).filter((condition) => condition.type === "audience").flatMap((condition) => condition.valueIds || []);
    const names = audienceIds.map((id) => targetingValueName(workspace, "audience", id));
    return names.length ? `Audience: ${names.join(", ")}` : "Audience: Not selected";
  }

  function routingScheduleName(workspace, rule) {
    if (!rule.scheduleId) return "Any schedule";
    return targetingLibrary(workspace).deliverySchedules.find((schedule) => schedule.id === rule.scheduleId)?.name || "Missing schedule";
  }

  function routingOperatorLabel(operator) {
    if (operator === "starts_with") return "starts with";
    if (operator === "is_not_empty") return "is not empty";
    return operator || "condition";
  }

  function routingCreativeFilterSummary(rule) {
    const filter = rule.creativeVariantFilter || {};
    const field = getAutomationFeedFields().find((item) => item.id === filter.feedField)?.name || "Feed field";
    if (!filter.feedField || !filter.operator) return "Not configured";
    if (filter.operator === "is_not_empty") return `${field} is not empty`;
    return `${field} ${routingOperatorLabel(filter.operator)} ${filter.value || "value"}`;
  }

  function creativeRoutingMatchCount(rule) {
    const filter = rule.creativeVariantFilter || {};
    if (!filter.feedField || !filter.operator || (!filter.value && filter.operator !== "is_not_empty")) return 0;
    return audienceMatchCount(filter);
  }

  function targetingRuleState(workspace, adBlueprint, rule) {
    const issues = issuesForTargetingRule(workspace, adBlueprint, rule);
    if (issues.some((issue) => issue.id.includes("no-matches"))) return { label: "No matches", style: "red" };
    if (issues.some((issue) => issue.id.includes("invalid") || issue.id.includes("schedule"))) return { label: "Invalid", style: "red" };
    if (issues.length) return { label: "Needs setup", style: "yellow" };
    return { label: "Complete", style: "green" };
  }

  function studioMappingState(rows, adBlueprint) {
    if (adBlueprint.adType !== "rich_media_dco") return { label: "Not required", style: "gray" };
    const config = adBlueprint.richMediaDcoConfig || {};
    if (!config.studioAdvertiserId || !config.studioCampaignId || !(config.htmlCreatives || []).length) return { label: "Needs setup", style: "yellow" };
    if (rows.some((row) => row.status === "Missing")) return { label: "Missing", style: "red" };
    if (rows.some((row) => row.status === "Needs review")) return { label: "Needs review", style: "yellow" };
    return { label: "Complete", style: "green" };
  }

  function setAutosaveSaving() {
    state.autosaveText = "Saving...";
    window.clearTimeout(state.autosaveTimer);
    state.autosaveTimer = window.setTimeout(() => {
      state.autosaveText = "Saved just now";
      refreshWorkspaces();
      render();
    }, 650);
  }

  function syncSelectedNode(workspace) {
    if (!workspace || state.selectedNode.type === "campaign") return;
    const placement = findPlacement(workspace, state.selectedNode.placementId);
    if (!placement) {
      state.selectedNode = { type: "campaign" };
      return;
    }
    if (state.selectedNode.type === "ad" && !findAdBlueprint(workspace, state.selectedNode.placementId, state.selectedNode.adBlueprintId)) {
      state.selectedNode = { type: "campaign" };
    }
  }

  function campaignRootLabel(workspace) {
    if (workspace.campaignBlueprint?.name) return workspace.campaignBlueprint.name;
    if (workspace.campaign && !workspace.campaign.toLowerCase().includes("not selected")) return workspace.campaign;
    return "Campaign Blueprint";
  }

  function findPlacement(workspace, placementId) {
    return (workspace.placementsTree || []).find((placement) => placement.id === placementId) || null;
  }

  function findAdBlueprint(workspace, placementId, adBlueprintId) {
    const placement = findPlacement(workspace, placementId);
    return placement ? (placement.adBlueprints || []).find((adBlueprint) => adBlueprint.id === adBlueprintId) || null : null;
  }

  function selectedNodeDetails(workspace) {
    const selected = state.selectedNode || { type: "campaign" };
    if (selected.type === "placement") {
      const placement = findPlacement(workspace, selected.placementId);
      if (placement) return { type: "placement", item: placement };
    }
    if (selected.type === "ad") {
      const placement = findPlacement(workspace, selected.placementId);
      const adBlueprint = findAdBlueprint(workspace, selected.placementId, selected.adBlueprintId);
      if (placement && adBlueprint) return { type: "ad", item: adBlueprint, placement };
    }
    return { type: "campaign", item: workspace.campaignBlueprint || {} };
  }

  function filteredWorkspaces() {
    const query = state.search.trim().toLowerCase();
    if (!query) return state.workspaces;
    return state.workspaces.filter((workspace) =>
      [workspace.name, workspace.status, workspace.advertiser, workspace.campaign, workspace.owner]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query))
    );
  }

  function showToast(message) {
    state.toast = message;
    window.clearTimeout(state.toastTimer);
    state.toastTimer = window.setTimeout(() => {
      state.toast = "";
      render();
    }, 2400);
  }

  function renderShell(content) {
    const workspace = state.view === "detail" ? currentWorkspace() : null;
    const counts = issueCounts(workspace);
    const reviewLabel = workspace ? `Review issues ${counts.all ? counts.all : ""}` : "Review issues";
    return `
      <div class="cm-app">
        <header class="topbar">
          <div class="brand-mark" aria-hidden="true">CM</div>
          <div class="topbar-copy">
            <div class="breadcrumb">
              <button class="crumb-button" type="button" data-action="show-list">Workspaces</button>
              <span aria-hidden="true">></span>
              <strong>${state.view === "detail" && currentWorkspace() ? escapeHtml(currentWorkspace().name) : "CM360 Workspaces"}</strong>
            </div>
            <div class="sync-line">${escapeHtml(state.autosaveText)}</div>
          </div>
          <div class="topbar-actions">
            <button class="icon-button" type="button" aria-label="More actions">...</button>
            <button class="secondary-button" type="button" disabled title="${workspace ? "Validation details are shown in the preview panel." : "Open a Workspace to review validation details."}">
              ${escapeHtml(reviewLabel.trim())}
            </button>
            <button class="secondary-button" type="button" disabled title="Campaign review will be available in a future prototype update.">Review campaign</button>
          </div>
        </header>
        <div class="commandbar" aria-label="Workspace commands">
          <button class="command-button" type="button" data-action="open-create">Create</button>
          <button class="command-button" type="button" disabled>Edit</button>
          <button class="command-button" type="button" disabled>Duplicate</button>
          <button class="command-button" type="button" disabled>Filter</button>
        </div>
        ${content}
        ${state.createOpen ? renderCreateModal() : ""}
        ${state.routingModal ? renderCreativeVariantRoutingModal() : ""}
        ${state.libraryModal ? renderTargetingLibraryModal() : ""}
        <div class="toast ${state.toast ? "show" : ""}" role="status" aria-live="polite">${escapeHtml(state.toast)}</div>
      </div>
    `;
  }

  function renderAccountNotice() {
    const notice = fixtures.accountNotice;
    if (!notice) return "";
    return `
      <section class="notice-band" aria-label="Account connection notice">
        <div>
          <strong>${escapeHtml(notice.title)}</strong>
          <span>${escapeHtml(notice.body)}</span>
        </div>
        <button class="secondary-button" type="button" disabled>${escapeHtml(notice.action)}</button>
      </section>
    `;
  }

  function renderListView() {
    const rows = filteredWorkspaces();
    return renderShell(`
      <main class="list-layout">
        <section class="list-header">
          <div>
            <div class="eyebrow">CM360 activation setup</div>
            <h1>CM360 Workspaces</h1>
            <p>Manage workspace drafts for CM360 placements, ads, and optional DV360 mappings.</p>
          </div>
          <button class="primary-button" type="button" data-action="open-create">Create Workspace</button>
        </section>
        ${renderAccountNotice()}
        <section class="toolbar-band" aria-label="Workspace search">
          <div class="toolbar-status">${rows.length} workspace${rows.length === 1 ? "" : "s"}</div>
          <label class="search-field">
            <span>Search</span>
            <input id="workspaceSearch" type="search" value="${escapeHtml(state.search)}" placeholder="Search CM360 Workspaces" />
          </label>
        </section>
        <section class="table-shell" aria-label="CM360 Workspace list">
          <table>
            <thead>
              <tr>
                <th style="width: 28%">Workspace</th>
                <th style="width: 13%">Status</th>
                <th style="width: 18%">CM360 Advertiser</th>
                <th style="width: 18%">CM360 Campaign</th>
                <th style="width: 10%">Issues</th>
                <th style="width: 13%">Actions</th>
              </tr>
            </thead>
            <tbody>
              ${rows.length ? rows.map(renderWorkspaceRow).join("") : renderEmptyRows()}
            </tbody>
          </table>
        </section>
      </main>
    `);
  }

  function renderWorkspaceRow(workspace) {
    return `
      <tr>
        <td>
          <span class="workspace-name">${escapeHtml(workspace.name)}</span>
          <span class="workspace-sub">${escapeHtml(workspace.updatedAt)} - ${escapeHtml(workspace.owner)}</span>
        </td>
        <td>${chip(workspace.status, workspace.statusStyle)}</td>
        <td><span class="truncate">${escapeHtml(workspace.advertiser)}</span></td>
        <td><span class="truncate">${escapeHtml(workspace.campaign)}</span></td>
        <td>${issueChip(workspace)}</td>
        <td>
          <div class="row-actions">
            <button class="text-button" type="button" data-action="open-workspace" data-id="${escapeHtml(workspace.id)}">Open</button>
            <button class="text-button danger" type="button" data-action="delete-workspace" data-id="${escapeHtml(workspace.id)}">Delete</button>
          </div>
        </td>
      </tr>
    `;
  }

  function renderEmptyRows() {
    const title = state.workspaces.length ? "No CM360 Workspaces match current search" : "No CM360 Workspaces yet";
    const body = state.workspaces.length
      ? "Clear search or create a Workspace to continue."
      : "Create a Workspace to configure CM360 placements, ads, and optional DV360 mappings.";
    return `
      <tr class="empty-row">
        <td colspan="6">
          <div class="empty-state">
            <strong>${escapeHtml(title)}</strong>
            <span>${escapeHtml(body)}</span>
            <button class="primary-button" type="button" data-action="open-create">Create Workspace</button>
          </div>
        </td>
      </tr>
    `;
  }

  function renderDetailView() {
    const workspace = currentWorkspace();
    if (!workspace) {
      state.view = "list";
      return renderListView();
    }
    if (state.dcoActivation?.active && dcoActivation) {
      return renderShell(dcoActivation.render(state.dcoActivation, workspace, referenceData()));
    }
    syncSelectedNode(workspace);
    const issues = workspaceValidationIssues(workspace);
    const counts = issueCounts(workspace);
    const selectedDetails = selectedNodeDetails(workspace);

    return renderShell(`
      <main class="detail-layout">
        <aside class="workspace-tree" aria-label="Workspace navigation">
          <div class="filter-block">
            <div class="filter-title">By published status</div>
            <div class="status-filters" aria-label="Published status filters">
              <button class="status-filter active" type="button">Draft</button>
              <button class="status-filter" type="button" disabled>Active</button>
              <button class="status-filter" type="button" disabled>Paused</button>
              <button class="status-filter" type="button" disabled>Archived</button>
            </div>
          </div>
          <div class="select-row">
            <span>Select:</span>
            <button class="pill-button active" type="button">Entities ${1 + placementCount(workspace) + adBlueprintCount(workspace)}</button>
          </div>
          <div class="tree-list">
            ${renderWorkspaceTree(workspace)}
          </div>
        </aside>
        <section class="detail-main">
          ${renderWorkspaceHeader(workspace)}
          ${renderSelectedNodeCard(workspace)}
        </section>
        ${renderRightPanel(workspace, selectedDetails, issues, counts)}
      </main>
    `);
  }

  function renderRightPanel(workspace, selectedDetails, issues, counts) {
    if (selectedDetails.type === "ad") {
      return renderAdBlueprintRightPanel(workspace, selectedDetails.placement, selectedDetails.item);
    }
    return renderWorkspaceRightPanel(workspace, issues, counts);
  }

  function renderWorkspaceRightPanel(workspace, issues, counts) {
    return `
      <aside class="right-panel" aria-label="Workspace preview and issues">
        <div class="panel-title">Workspace preview</div>
        <div class="issue-summary ${counts.blocking ? "has-issues" : ""}">
          <strong>${counts.blocking ? `${counts.blocking} blocking issue${counts.blocking === 1 ? "" : "s"}` : counts.warning ? `${counts.warning} warning${counts.warning === 1 ? "" : "s"}` : "No current validation issues"}</strong>
          <span>${counts.blocking ? "Resolve blocking items before campaign handoff." : counts.warning ? "Warnings should be reviewed before handoff." : "Campaign, Placement, and Ad Blueprint setup pass prototype validation."}</span>
        </div>
        <div class="preview-card">
          <div class="preview-card-head">
            <strong>${escapeHtml(workspace.name)}</strong>
          </div>
          <dl>
            <div><dt>Advertiser</dt><dd>${escapeHtml(workspace.advertiser)}</dd></div>
            <div><dt>Campaign</dt><dd>${escapeHtml(workspace.campaign)}</dd></div>
            <div><dt>Placements</dt><dd>${placementCount(workspace)} selected</dd></div>
            <div><dt>Ad Blueprints</dt><dd>${adBlueprintCount(workspace)}</dd></div>
          </dl>
        </div>
        <div class="panel-section">
          <div class="panel-title">Validation summary</div>
          ${renderIssueList(issues, "No validation items found in the local prototype rules.")}
        </div>
      </aside>
    `;
  }

  function renderAdBlueprintRightPanel(workspace, placement, adBlueprint) {
    const issues = issuesForAdBlueprint(workspace, placement, adBlueprint);
    const stateItem = adBlueprintPanelState(issues);
    const isDco = adBlueprint.adType === "rich_media_dco";
    return `
      <aside class="right-panel ad-preview-panel" aria-label="Ad Blueprint preview and readiness">
        <div class="ad-preview-title-row">
          <div>
            <div class="panel-title">${isDco ? "Dynamic creative" : "Creative preview"}</div>
            <strong>${escapeHtml(adBlueprint.name || "Untitled Ad Blueprint")}</strong>
          </div>
          ${chip(formatSummary(adBlueprint.selectedFormats, "No format"), "gray")}
        </div>
        ${renderAdPreviewFormatTabs(adBlueprint.selectedFormats)}
        ${renderAdPreviewSurface(workspace, placement, adBlueprint)}
        ${renderAdPreviewSummary(workspace, placement, adBlueprint)}
        ${renderAdPreviewAudienceRows(workspace, placement, adBlueprint)}
        <div class="ad-readiness ${escapeHtml(stateItem.style)}">
          <strong>${escapeHtml(stateItem.label)}</strong>
          <span>${escapeHtml(stateItem.description)}</span>
        </div>
        ${
          issues.length
            ? `<div class="panel-section">
                <div class="panel-title">Ad Blueprint validation</div>
                ${renderIssueList(issues, "No validation items found for this Ad Blueprint.")}
              </div>`
            : ""
        }
      </aside>
    `;
  }

  function adBlueprintPanelState(issues) {
    const blocking = issues.filter((issue) => issue.severity === "blocking").length;
    if (blocking) {
      return {
        label: `Fix ${blocking} issue${blocking === 1 ? "" : "s"}`,
        style: "red",
        description: "Resolve blocking Ad Blueprint items before campaign handoff.",
      };
    }
    if (issues.length) {
      return {
        label: "Review warnings",
        style: "yellow",
        description: "Warnings should be checked before handoff.",
      };
    }
    return {
      label: "Ready to traffic.",
      style: "green",
      description: "Selected formats, routing, and creative setup pass prototype validation.",
    };
  }

  function renderAdPreviewFormatTabs(formats) {
    const selectedFormats = Array.isArray(formats) && formats.length ? formats : ["No format"];
    return `
      <div class="ad-preview-tabs" aria-label="Selected formats">
        ${selectedFormats.map((format, index) => `<span class="${index === 0 ? "active" : ""}">${escapeHtml(format)}</span>`).join("")}
      </div>
    `;
  }

  function renderAdPreviewSurface(workspace, placement, adBlueprint) {
    const rows = adBlueprint.adType === "rich_media_dco" ? richMediaDcoPreviewRows(placement, adBlueprint) : standardDisplayPreviewRows(placement, adBlueprint);
    const feedRows = automationFeedRowsForAdBlueprint(adBlueprint);
    const headline = feedRows[0]?.headline || rows[0]?.creative || "Creative preview pending";
    const cta = feedRows[0]?.cta || "";
    const format = (adBlueprint.selectedFormats || [])[0] || rows[0]?.format || "Preview";
    return `
      <div class="ad-preview-frame" aria-label="Creative preview placeholder">
        <span class="ad-preview-frame-format">${escapeHtml(format)}</span>
        <strong>${escapeHtml(headline)}</strong>
        ${cta ? `<span>${escapeHtml(cta)}</span>` : ""}
      </div>
    `;
  }

  function renderAdPreviewSummary(workspace, placement, adBlueprint) {
    const feedRows = automationFeedRowsForAdBlueprint(adBlueprint);
    const lineItems = selectedDv360LineItemsForPlacement(placement);
    const audienceCount = lineItems.length || uniquePreviewAudienceCount(workspace, adBlueprint);
    const formatCount = (adBlueprint.selectedFormats || []).length;
    const rowCount = feedRows.length;
    const summary = adBlueprint.adType === "rich_media_dco"
      ? `${formatCount || 0} format${formatCount === 1 ? "" : "s"} across ${audienceCount || 0} audience${audienceCount === 1 ? "" : "s"}, combined per feed row into the Studio feed.`
      : `${formatCount || 0} format${formatCount === 1 ? "" : "s"} configured for ${placement.name || "this placement"}.`;
    return `
      <p class="ad-preview-summary">${escapeHtml(summary)}</p>
      <div class="ad-preview-metrics">
        <div><span>Feed rows</span><strong>${escapeHtml(rowCount || "0")}</strong></div>
        <div><span>Formats</span><strong>${escapeHtml(formatCount || "0")}</strong></div>
        <div><span>Audiences</span><strong>${escapeHtml(audienceCount || "0")}</strong></div>
      </div>
    `;
  }

  function uniquePreviewAudienceCount(workspace, adBlueprint) {
    const ids = automationFeedRowsForAdBlueprint(adBlueprint).flatMap((row) => audienceTargetingIdsForAssignment(variantRoutingAssignmentFor(workspace, adBlueprint, row)));
    return new Set(ids).size;
  }

  function renderAdPreviewAudienceRows(workspace, placement, adBlueprint) {
    const lineItems = selectedDv360LineItemsForPlacement(placement);
    if (lineItems.length) {
      return `
        <div class="ad-preview-audience-list">
          ${lineItems.map((lineItem) => renderAdPreviewLineItemRow(adBlueprint, lineItem)).join("")}
        </div>
      `;
    }
    const rows = automationFeedRowsForAdBlueprint(adBlueprint).slice(0, 3);
    return `
      <div class="ad-preview-audience-list">
        ${
          rows.length
            ? rows
                .map((row) => {
                  const assignment = variantRoutingAssignmentFor(workspace, adBlueprint, row);
                  const audienceIds = audienceTargetingIdsForAssignment(assignment);
                  const audienceName = audienceIds.map((id) => audienceTargetingName(workspace, id)).filter(Boolean).join(", ") || row.audienceName || "Audience not assigned";
                  return `
                    <div class="ad-preview-audience-row">
                      <span class="tree-icon"></span>
                      <div>
                        <strong>${escapeHtml(audienceName)}</strong>
                        <span>${escapeHtml(row.sourceId ? `Feed row ${row.sourceId}` : row.id)}</span>
                      </div>
                    </div>
                  `;
                })
                .join("")
            : `<div class="ad-preview-audience-row empty">
                <div>
                  <strong>No audience rows available</strong>
                  <span>Select an Automation feed or DV360 Line Items to populate this preview.</span>
                </div>
              </div>`
        }
      </div>
    `;
  }

  function renderAdPreviewLineItemRow(adBlueprint, lineItem) {
    const mapping = audienceMappingFor(adBlueprint, lineItem.id);
    const detail = mapping.value ? `${mapping.feedField} ${mapping.operator} ${mapping.value}` : lineItem.campaignName || "No audience mapping";
    return `
      <div class="ad-preview-audience-row">
        <span class="tree-icon"></span>
        <div>
          <strong>${escapeHtml(lineItem.name)}</strong>
          <span>${escapeHtml(detail)}</span>
        </div>
      </div>
    `;
  }

  function renderWorkspaceHeader(workspace) {
    const counts = issueCounts(workspace);
    const locked = isWorkspaceLocked(workspace);
    const hasDcoBlueprint = (workspace.placementsTree || []).some((placement) =>
      (placement.adBlueprints || []).some((adBlueprint) => adBlueprint.adType === "rich_media_dco")
    );
    return `
      <section class="workspace-detail-header">
        <div>
          <div class="title-line">
            <h1>${escapeHtml(workspace.name)}</h1>
            ${chip(workspace.status, workspace.statusStyle)}
          </div>
          <div class="meta-grid">
            <span>Autosave: ${escapeHtml(workspace.updatedAt)}</span>
            <span>CM360 Advertiser: ${escapeHtml(workspace.advertiser)}</span>
            <span>CM360 Campaign: ${escapeHtml(workspace.campaign)}</span>
            <span>Validation: ${counts.blocking ? `${counts.blocking} blocking` : counts.warning ? `${counts.warning} warning${counts.warning === 1 ? "" : "s"}` : "Ready in prototype"}</span>
            ${locked ? "<span>Editing: Locked after publish</span>" : "<span>Editing: Draft controls available</span>"}
          </div>
        </div>
        <div class="header-actions">
          <button class="secondary-button" type="button" data-action="show-list">Back to list</button>
          ${hasDcoBlueprint ? '<button class="primary-button" type="button" data-action="open-dco-activation">Open DCO activation</button>' : ""}
          <button class="secondary-button" type="button" disabled>Duplicate</button>
        </div>
      </section>
    `;
  }

  function renderWorkspaceTree(workspace) {
    const campaignExpanded = state.expandedNodes.has("campaign");
    const placements = workspace.placementsTree || [];
    return `
      <div class="tree-branch">
        ${renderTreeNode({
          type: "campaign",
          id: "campaign",
          label: campaignRootLabel(workspace),
          sublabel: "Campaign",
          status: workspace.campaignBlueprint?.status || "Needs setup",
          statusStyle: workspace.campaignBlueprint?.statusStyle,
          expandable: true,
          expanded: campaignExpanded,
          level: 0,
          selectAction: "select-node",
          toggleAction: "toggle-node",
        })}
        ${
          campaignExpanded
            ? placements.length
              ? placements.map((placement) => renderPlacementBranch(placement)).join("")
              : '<div class="tree-empty level-1">No placements added</div>'
            : ""
        }
      </div>
    `;
  }

  function renderPlacementBranch(placement) {
    const key = nodeKey("placement", placement.id);
    const expanded = state.expandedNodes.has(key);
    const adBlueprints = placement.adBlueprints || [];
    return `
      <div class="tree-branch">
        ${renderTreeNode({
          type: "placement",
          id: placement.id,
          label: placement.name,
          sublabel: "Placement",
          status: placement.status,
          statusStyle: placement.statusStyle,
          expandable: true,
          expanded,
          level: 1,
          selectAction: "select-node",
          toggleAction: "toggle-node",
        })}
        ${
          expanded
            ? adBlueprints.length
              ? adBlueprints.map((adBlueprint) => renderAdNode(placement, adBlueprint)).join("")
              : '<div class="tree-empty level-2">No Ad Blueprints added</div>'
            : ""
        }
      </div>
    `;
  }

  function renderAdNode(placement, adBlueprint) {
    return renderTreeNode({
      type: "ad",
      id: adBlueprint.id,
      placementId: placement.id,
      label: adBlueprint.name,
      sublabel: "Ad Blueprint",
      status: adBlueprint.status,
      statusStyle: adBlueprint.statusStyle,
      expandable: false,
      expanded: false,
      level: 2,
      selectAction: "select-node",
    });
  }

  function renderTreeNode(node) {
    const selected = state.selectedNode || { type: "campaign" };
    const isActive =
      selected.type === node.type &&
      (node.type === "campaign" ||
        (node.type === "placement" && selected.placementId === node.id) ||
        (node.type === "ad" && selected.placementId === node.placementId && selected.adBlueprintId === node.id));
    const key = node.type === "campaign" ? "campaign" : nodeKey(node.type, node.id);
    const nodePayload = node.type === "ad" ? `${node.placementId}:${node.id}` : node.id;
    return `
      <div class="tree-node level-${node.level} ${isActive ? "active" : ""}">
        ${
          node.expandable
            ? `<button class="tree-toggle" type="button" data-action="${escapeHtml(node.toggleAction)}" data-node-key="${escapeHtml(key)}" aria-label="${node.expanded ? "Collapse" : "Expand"} ${escapeHtml(node.label)}">${node.expanded ? "v" : ">"}</button>`
            : '<span class="tree-toggle-spacer"></span>'
        }
        <button class="tree-select" type="button" data-action="${escapeHtml(node.selectAction)}" data-node-type="${escapeHtml(node.type)}" data-node-id="${escapeHtml(nodePayload)}">
          <span class="tree-icon" aria-hidden="true"></span>
          <span class="tree-copy">
            <strong>${escapeHtml(node.label)}</strong>
            <span>${escapeHtml(node.sublabel)}</span>
          </span>
          ${chip(node.status, statusStyle(node.status, node.statusStyle))}
        </button>
      </div>
    `;
  }

  function renderSelectedNodeCard(workspace) {
    const details = selectedNodeDetails(workspace);
    if (details.type === "placement") return renderPlacementCard(workspace, details.item);
    if (details.type === "ad") return renderAdBlueprintCard(details.item, details.placement);
    return `${renderCampaignCard(workspace)}${renderPlacementCard(workspace, null)}`;
  }

  function renderCampaignCard(workspace) {
    const campaign = workspace.campaignBlueprint || {};
    const advertisers = getAdvertisers();
    const campaigns = getCampaigns(workspace.cmAdvertiserId);
    const dvAdvertisers = getDvAdvertisers(workspace.cmAdvertiserId);
    const dvCampaigns = getDvCampaigns(workspace.dvAdvertiserId);
    const campaignDisabled = !workspace.cmAdvertiserId;
    const dvCampaignDisabled = !workspace.dvAdvertiserId;
    const campaignIssues = issuesFor(workspace, ["Campaign"]);
    const configured = Boolean(workspace.cmAdvertiserId && workspace.cmCampaignId);
    const locked = isWorkspaceLocked(workspace);
    return `
      <section class="content-card">
        <header class="card-head">
          <div>
            <h2>Campaign Blueprint</h2>
            <p>Select the CM360 Advertiser and CM360 Campaign for this Workspace.</p>
          </div>
          ${chip(campaign.status || "Needs setup", campaign.statusStyle)}
        </header>
        <div class="form-panel">
          ${renderLockNotice(locked ? "This Workspace is published. Duplicate the setup to change the Campaign Blueprint." : "")}
          <fieldset class="lock-fieldset" ${locked ? "disabled" : ""}>
            <div class="subsection-head compact-subsection-head">
              <div>
                <h3>CM360 setup</h3>
                <p>Select the CM360 Advertiser and Campaign that own this Workspace.</p>
              </div>
            </div>
            <div class="form-grid">
              <label class="field">
                <span>CM360 Advertiser</span>
                <select id="cmAdvertiserSelect" data-action="select-advertiser">
                  ${renderOptions(advertisers, workspace.cmAdvertiserId, "Select advertiser")}
                </select>
              </label>
              <label class="field">
                <span>CM360 Campaign</span>
                <select id="cmCampaignSelect" data-action="select-campaign" ${campaignDisabled ? "disabled" : ""}>
                  ${renderOptions(campaigns, workspace.cmCampaignId, campaignDisabled ? "Select advertiser first" : "Select campaign")}
                </select>
                <small>${campaignDisabled ? "Select a CM360 Advertiser before choosing a campaign." : "Campaign options are filtered by the selected advertiser."}</small>
              </label>
            </div>
            <div class="nested-section" aria-label="DV360 setup">
              <div class="subsection-head compact-subsection-head">
                <div>
                  <h3>DV360 setup</h3>
                  <p>Select DV360 defaults once for Placement Line Item mapping.</p>
                </div>
              </div>
              <div class="form-grid">
                <label class="field">
                  <span>DV360 Advertiser</span>
                  <select data-action="select-campaign-dv-advertiser">
                    ${renderOptions(dvAdvertisers, workspace.dvAdvertiserId, workspace.cmAdvertiserId ? "Select DV360 Advertiser" : "Select CM360 Advertiser first")}
                  </select>
                  <small>${workspace.cmAdvertiserId ? "Options are filtered to DV360 Advertisers connected to the selected CM360 Advertiser." : "Select a CM360 Advertiser before choosing a DV360 Advertiser."}</small>
                </label>
                <label class="field">
                  <span>DV360 Campaign</span>
                  <select data-action="select-campaign-dv-campaign" ${dvCampaignDisabled ? "disabled" : ""}>
                    ${renderOptions(dvCampaigns, workspace.dvCampaignId, dvCampaignDisabled ? "Select DV360 Advertiser first" : "Select DV360 Campaign")}
                  </select>
                  <small>${dvCampaignDisabled ? "Select a DV360 Advertiser before choosing a DV360 Campaign." : "Campaign options depend on the selected DV360 Advertiser."}</small>
                </label>
              </div>
            </div>
            ${renderValidationList(campaignIssues, configured ? "Campaign Blueprint is configured." : "")}
            ${
              configured
                ? `<div class="summary-strip">
                    <div><span>Selected advertiser</span><strong>${escapeHtml(workspace.advertiser)}</strong></div>
                    <div><span>Selected campaign</span><strong>${escapeHtml(workspace.campaign)}</strong></div>
                    <div><span>Placements</span><strong>${placementCount(workspace)} selected</strong></div>
                  </div>`
                : ""
            }
            ${renderCampaignTargetingLibrary(workspace)}
          </fieldset>
        </div>
      </section>
    `;
  }

  function renderCampaignTargetingLibrary(workspace) {
    return `
      <section class="subsection-panel" aria-label="Campaign Targeting Library">
        <div class="subsection-head">
          <div>
            <h3>Campaign Targeting Library</h3>
            <p>Define reusable audience and schedule values for Ad Blueprint Creative Routing Rules.</p>
          </div>
          ${chip("Prototype library", "gray")}
        </div>
        ${renderAudienceTargetingTable(workspace)}
        ${renderDeliverySchedulesTable(workspace)}
      </section>
    `;
  }

  function renderAudienceTargetingTable(workspace) {
    const targets = targetingLibrary(workspace).audienceTargets;
    return `
      <section class="nested-section" aria-label="Audience Targeting">
        <div class="subsection-head compact-subsection-head">
          <div>
            <h3>Audience Targeting</h3>
            <p>Create audience sets from CM360 or DV360 identifiers.</p>
          </div>
          <button class="secondary-button" type="button" data-action="add-audience-target">Add audience set</button>
        </div>
        ${
          targets.length
            ? `<div class="library-list">
                ${targets.map((target) => renderAudienceTargetingCard(workspace, target)).join("")}
              </div>`
            : '<div class="table-empty"><strong>No audience sets created yet.</strong><span>Add an audience set to make Audience targeting available in Ad Blueprint rules.</span></div>'
        }
      </section>
    `;
  }

  function renderAudienceTargetingCard(workspace, target) {
    const stateItem = audienceTargetState(target);
    const values = arrayFromValues(target.values);
    return `
      <article class="library-item">
        <div class="library-item-copy">
          <strong>${escapeHtml(target.name || "Untitled audience set")}</strong>
          <span>${escapeHtml(target.idType || "No ID Type")} · ${escapeHtml(compactValueSummary(values, "No values"))}</span>
          <small>Used by ${targetingUsageCount(workspace, "audience", target.id)} rule${targetingUsageCount(workspace, "audience", target.id) === 1 ? "" : "s"}</small>
        </div>
        <div class="library-item-actions">
          ${chip(stateItem.label, stateItem.style)}
          <button class="text-button" type="button" data-action="edit-audience-target" data-target-id="${escapeHtml(target.id)}">Edit</button>
          <button class="text-button danger" type="button" data-action="delete-audience-target" data-target-id="${escapeHtml(target.id)}">Delete</button>
        </div>
      </article>
    `;
  }

  function renderDeliverySchedulesTable(workspace) {
    const schedules = targetingLibrary(workspace).deliverySchedules;
    return `
      <section class="nested-section" aria-label="Delivery Schedules">
        <div class="subsection-head compact-subsection-head">
          <div>
            <h3>Delivery Schedules</h3>
            <p>Create reusable date, day, and time windows for Ad Blueprint rules.</p>
          </div>
          <button class="secondary-button" type="button" data-action="add-delivery-schedule">Add schedule</button>
        </div>
        ${
          schedules.length
            ? `<div class="library-list">
                ${schedules.map((schedule) => renderDeliveryScheduleCard(workspace, schedule)).join("")}
              </div>`
            : '<div class="table-empty"><strong>No delivery schedules created yet.</strong><span>Add a schedule to make scheduled routing available in Ad Blueprint rules.</span></div>'
        }
      </section>
    `;
  }

  function renderDeliveryScheduleCard(workspace, schedule) {
    const stateItem = deliveryScheduleState(schedule);
    const usage = targetingUsageCount(workspace, "schedule", schedule.id);
    return `
      <article class="library-item">
        <div class="library-item-copy">
          <strong>${escapeHtml(schedule.name || "Untitled schedule")}</strong>
          <span>${escapeHtml(deliveryScheduleTimingSummary(schedule))}</span>
          <small>${escapeHtml(deliveryScheduleDateSummary(schedule))}${deliveryScheduleDateSummary(schedule) ? " · " : ""}Used by ${usage} rule${usage === 1 ? "" : "s"}</small>
        </div>
        <div class="library-item-actions">
          ${chip(stateItem.label, stateItem.style)}
          <button class="text-button" type="button" data-action="edit-delivery-schedule" data-schedule-id="${escapeHtml(schedule.id)}">Edit</button>
          <button class="text-button danger" type="button" data-action="delete-delivery-schedule" data-schedule-id="${escapeHtml(schedule.id)}">Delete</button>
        </div>
      </article>
    `;
  }

  function arrayFromValues(values) {
    if (Array.isArray(values)) return values.filter(Boolean);
    return String(values || "")
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean);
  }

  function compactValueSummary(values, emptyLabel) {
    const safeValues = arrayFromValues(values);
    if (!safeValues.length) return emptyLabel;
    const visible = safeValues.slice(0, 2).join(", ");
    const extra = safeValues.length - 2;
    return extra > 0 ? `${visible} +${extra} more` : visible;
  }

  function deliveryScheduleTimingSummary(schedule) {
    const parts = [];
    if (schedule.quickFilter) parts.push(schedule.quickFilter);
    const days = compactDaySummary(schedule.days);
    if (days) parts.push(days);
    if (schedule.timeOfDay) parts.push(schedule.timeOfDay);
    return parts.length ? parts.join(" · ") : "No delivery window";
  }

  function deliveryScheduleDateSummary(schedule) {
    return [schedule.timezone, dateRangeSummary(schedule.startDate, schedule.endDate)].filter(Boolean).join(" · ");
  }

  function compactDaySummary(days) {
    const safeDays = arrayFromValues(days);
    const ordered = deliveryDays().map((day) => day.id);
    const selected = ordered.filter((day) => safeDays.includes(day));
    if (!selected.length) return "";
    const key = selected.join("|");
    if (key === "Monday|Tuesday|Wednesday|Thursday|Friday") return "Mon-Fri";
    if (key === "Saturday|Sunday") return "Sat-Sun";
    if (key === ordered.join("|")) return "Mon-Sun";
    return selected.map((day) => day.slice(0, 3)).join(", ");
  }

  function dateRangeSummary(startDate, endDate) {
    const start = formatShortDate(startDate);
    const end = formatShortDate(endDate);
    if (start && end) return `${start}-${end}`;
    return start || end || "";
  }

  function formatShortDate(value) {
    if (!value) return "";
    const [year, month, day] = String(value).split("-").map(Number);
    if (!year || !month || !day) return "";
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    return `${months[month - 1]} ${day}`;
  }

  function renderPlacementCard(workspace, selectedPlacement) {
    const availablePlacements = getPlacements(workspace.cmCampaignId);
    const selectedIds = selectedCmPlacementIds(workspace);
    const placementIssues = issuesFor(workspace, ["Placement"]);
    const title = selectedPlacement ? `Placement Blueprint: ${selectedPlacement.name}` : "Placement Blueprint";
    const status = selectedPlacement?.status || (placementCount(workspace) ? "Draft" : "Needs setup");
    const statusColor = selectedPlacement?.statusStyle || (placementCount(workspace) ? "gray" : "yellow");
    const disabled = !workspace.cmCampaignId;
    const locked = isWorkspaceLocked(workspace);
    return `
      <section class="content-card">
        <header class="card-head">
          <div>
            <h2>${escapeHtml(title)}</h2>
            <p>${disabled ? "Select a CM360 Campaign before adding placements." : "Choose the CM360 Placements that belong under this Campaign."}</p>
          </div>
          ${chip(status, statusColor)}
        </header>
        <div class="form-panel">
          ${renderLockNotice(locked ? "This Workspace is published. Duplicate the setup to change placements or Ad Blueprints." : "")}
          <fieldset class="lock-fieldset" ${locked ? "disabled" : ""}>
            <div class="checkbox-panel ${disabled ? "disabled" : ""}" aria-label="CM360 Placement selection">
              ${
                disabled
                  ? '<div class="disabled-note">Select a CM360 Campaign before adding placements.</div>'
                  : availablePlacements
                      .map(
                        (placement) => `
                          <label class="checkbox-row">
                            <input type="checkbox" data-action="toggle-placement" value="${escapeHtml(placement.id)}" ${selectedIds.has(placement.id) ? "checked" : ""} />
                            <span>
                              <strong>${escapeHtml(placement.name)}</strong>
                              <em>${escapeHtml((placement.formats || []).length)} format${(placement.formats || []).length === 1 ? "" : "s"}</em>
                            </span>
                            ${renderFormatChips(placement.formats)}
                          </label>
                        `
                      )
                      .join("")
              }
            </div>
            ${renderValidationList(placementIssues, placementCount(workspace) ? "Selected placements belong to the current CM360 Campaign." : "")}
            ${renderSelectedPlacementsTable(workspace)}
            ${selectedPlacement ? renderDv360MappingPanel(workspace, selectedPlacement) : renderCsvImportPlaceholder()}
            ${selectedPlacement ? renderAdBlueprintTable(workspace, selectedPlacement) : ""}
          </fieldset>
        </div>
      </section>
    `;
  }

  function renderSelectedPlacementsTable(workspace) {
    const placements = workspace.placementsTree || [];
    if (!workspace.cmCampaignId) {
      return `
        <div class="table-empty">
          <strong>No campaign selected</strong>
          <span>Select a CM360 Campaign before adding placements.</span>
        </div>
      `;
    }
    if (!placements.length) {
      return `
        <div class="table-empty">
          <strong>No placements selected</strong>
          <span>Select one or more CM360 Placements to add them under the Campaign node.</span>
        </div>
      `;
    }
    return `
      <div class="inline-table-shell">
        <table class="compact-table">
          <thead>
            <tr>
              <th style="width: 28%">Placement</th>
              <th style="width: 24%">Formats</th>
              <th style="width: 17%">DV360 connected</th>
              <th style="width: 14%">Ad Blueprints</th>
              <th style="width: 11%">Status</th>
              <th style="width: 6%"> </th>
            </tr>
          </thead>
          <tbody>
            ${placements
              .map(
                (placement) => `
                  <tr>
                    <td>
                      <span class="workspace-name">${escapeHtml(placement.name)}</span>
                      <span class="workspace-sub">${escapeHtml(placement.cmPlacementId)}</span>
                    </td>
                    <td>
                      ${renderFormatChips(placement.formats)}
                      <span class="workspace-sub">${(placement.formats || []).length} format${(placement.formats || []).length === 1 ? "" : "s"}</span>
                    </td>
                    <td>${(() => {
                      const stateItem = dv360PlacementState(workspace, placement);
                      return chip(stateItem.label, stateItem.style);
                    })()}</td>
                    <td>${(placement.adBlueprints || []).length}</td>
                    <td>${chip(placement.status, placement.statusStyle)}</td>
                    <td><button class="text-button danger" type="button" data-action="remove-placement" data-id="${escapeHtml(placement.cmPlacementId)}">Remove</button></td>
                  </tr>
                `
              )
              .join("")}
          </tbody>
        </table>
      </div>
    `;
  }

  function renderDv360MappingPanel(workspace, placement) {
    const stateItem = dv360PlacementState(workspace, placement);
    const issues = dv360IssuesForPlacement(workspace, placement);
    return `
      <section class="subsection-panel" aria-label="DV360 mapping">
        <div class="subsection-head">
          <div>
            <h3>DV360 mapping</h3>
            <p>Connect this CM360 Placement to DV360 Line Items when media activation needs DV360 audiences.</p>
          </div>
          ${chip(stateItem.label, stateItem.style)}
        </div>
        <div class="placement-summary-grid">
          <div>
            <span>Placement</span>
            <strong>${escapeHtml(placement.name)}</strong>
          </div>
          <div>
            <span>Formats</span>
            <strong>${escapeHtml(formatSummary(placement.formats, "Format data not available"))}</strong>
          </div>
          <div>
            <span>Mapping rows</span>
            <strong>${(placement.dv360Connections || []).length}</strong>
          </div>
        </div>
        <div class="toggle-row">
          <div>
            <strong>Connect to DV360</strong>
            <span>Toggle on to map this placement to Line Items from the Campaign Blueprint DV360 Campaign.</span>
          </div>
          <label class="switch-control">
            <input type="checkbox" data-action="toggle-dv360-enabled" data-placement-id="${escapeHtml(placement.id)}" ${placement.dv360Enabled ? "checked" : ""} />
            <span>${placement.dv360Enabled ? "On" : "Off"}</span>
          </label>
        </div>
        ${
          placement.dv360Enabled
            ? `${renderDv360MappingTable(workspace, placement)}${renderValidationList(issues, issues.length ? "" : "DV360 mapping rows are complete for this placement.")}`
            : '<div class="table-empty"><strong>Not connected</strong><span>DV360 fields are not required while this placement is Off.</span></div>'
        }
        ${renderCsvImportPlaceholder()}
      </section>
    `;
  }

  function renderDv360MappingTable(workspace, placement) {
    const rows = placement.dv360Connections || [];
    const addButton = `<button class="secondary-button" type="button" data-action="add-dv360-row" data-placement-id="${escapeHtml(placement.id)}">Add mapping row</button>`;
    if (!rows.length) {
      return `
        <div class="subsection-actions">${addButton}</div>
        <div class="table-empty">
          <strong>No DV360 mapping rows</strong>
          <span>Add a row to select DV360 Line Items for this placement.</span>
        </div>
      `;
    }
    return `
      <div class="subsection-actions">${addButton}</div>
      <div class="inline-table-shell">
        <table class="compact-table dv360-table">
          <thead>
            <tr>
              <th style="width: 28%">CM360 Placement</th>
              <th style="width: 42%">DV360 Line Items</th>
              <th style="width: 14%">Status</th>
              <th style="width: 16%">Actions</th>
            </tr>
          </thead>
          <tbody>
            ${rows.map((row) => renderDv360MappingRow(workspace, placement, row)).join("")}
          </tbody>
        </table>
      </div>
    `;
  }

  function renderDv360MappingRow(workspace, placement, row) {
    const lineItems = getDvLineItems(workspace.dvCampaignId);
    const lineItemsDisabled = !workspace.dvAdvertiserId || !workspace.dvCampaignId;
    const stateItem = dv360RowState(workspace, row);
    const selectedNames = selectedLineItemNames(workspace, row);
    return `
      <tr>
        <td>
          <span class="workspace-name">${escapeHtml(placement.name)}</span>
          <span class="workspace-sub">${escapeHtml(placement.cmPlacementId)}</span>
        </td>
        <td>
          <label class="table-field">
            <select multiple size="3" data-action="select-dv-line-items" data-placement-id="${escapeHtml(placement.id)}" data-row-id="${escapeHtml(row.id)}" ${lineItemsDisabled ? "disabled" : ""}>
              ${renderMultiOptions(lineItems, row.lineItemIds)}
            </select>
            <small>${lineItemsDisabled ? "Select DV360 Advertiser and Campaign in Campaign Blueprint before choosing Line Items." : selectedNames.length ? escapeHtml(selectedNames.join(", ")) : "Choose one or more Line Items."}</small>
          </label>
        </td>
        <td>${chip(stateItem.label, stateItem.style)}</td>
        <td><button class="text-button danger" type="button" data-action="remove-dv360-row" data-placement-id="${escapeHtml(placement.id)}" data-row-id="${escapeHtml(row.id)}">Remove</button></td>
      </tr>
    `;
  }

  function renderCsvImportPlaceholder() {
    return `
      <div class="csv-placeholder">
        <div>
          <strong>CSV import</strong>
          <span>CSV import will be available once the mapping import endpoint is connected.</span>
        </div>
        <button class="secondary-button" type="button" disabled>Coming soon</button>
      </div>
    `;
  }

  function renderAdBlueprintTable(workspace, placement) {
    const adBlueprints = placement.adBlueprints || [];
    return `
      <section class="subsection-panel" aria-label="Ad Blueprints">
        <div class="subsection-head">
          <div>
            <h3>Ad Blueprints</h3>
            <p>Manage Standard Display and Rich Media DCO Ad Blueprints for this Placement.</p>
          </div>
          <button class="secondary-button" type="button" data-action="add-ad-blueprint" data-placement-id="${escapeHtml(placement.id)}">Add Ad Blueprint</button>
        </div>
        ${
          adBlueprints.length
            ? `<div class="inline-table-shell">
                <table class="compact-table ad-blueprint-table">
                  <thead>
                    <tr>
                      <th style="width: 18%">Ad Name</th>
                      <th style="width: 14%">Type</th>
                      <th style="width: 12%">Automation</th>
                      <th style="width: 16%">Formats</th>
                      <th style="width: 16%">Creative Source</th>
                      <th style="width: 10%">Status</th>
                      <th style="width: 6%">Issues</th>
                      <th style="width: 8%">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${adBlueprints.map((adBlueprint) => renderAdBlueprintRow(workspace, placement, adBlueprint)).join("")}
                  </tbody>
                </table>
              </div>`
            : '<div class="table-empty"><strong>No Ad Blueprints added</strong><span>Add an Ad Blueprint to configure Standard Display setup for this Placement.</span></div>'
        }
      </section>
    `;
  }

  function renderAdBlueprintRow(workspace, placement, adBlueprint) {
    const issues = issuesForAdBlueprint(workspace, placement, adBlueprint);
    const stateItem = adBlueprintState(workspace, placement, adBlueprint);
    return `
      <tr>
        <td>
          <span class="workspace-name">${escapeHtml(adBlueprint.name || "Untitled Ad Blueprint")}</span>
          <span class="workspace-sub">${escapeHtml(adBlueprint.id)}</span>
        </td>
        <td>${escapeHtml(adTypeLabel(adBlueprint.adType))}</td>
        <td>${adBlueprint.adAutomationEnabled ? chip("On", "blue") : chip("Off", "gray")}</td>
        <td>${renderFormatChips(adBlueprint.selectedFormats)}</td>
        <td><span class="truncate">${escapeHtml(creativeSourceLabel(adBlueprint))}</span></td>
        <td>${chip(stateItem.label, stateItem.style)}</td>
        <td>${issues.length ? chip(String(issues.length), "red") : chip("0", "green")}</td>
        <td>
          <div class="row-actions stacked-actions">
            <button class="text-button" type="button" data-action="open-ad-blueprint" data-placement-id="${escapeHtml(placement.id)}" data-ad-id="${escapeHtml(adBlueprint.id)}">Open</button>
            <button class="text-button" type="button" data-action="duplicate-ad-blueprint" data-placement-id="${escapeHtml(placement.id)}" data-ad-id="${escapeHtml(adBlueprint.id)}">Duplicate</button>
            <button class="text-button danger" type="button" data-action="delete-ad-blueprint" data-placement-id="${escapeHtml(placement.id)}" data-ad-id="${escapeHtml(adBlueprint.id)}">Delete</button>
          </div>
        </td>
      </tr>
    `;
  }

  function renderAdBlueprintCard(adBlueprint, placement) {
    const workspace = currentWorkspace();
    const stateItem = workspace ? adBlueprintState(workspace, placement, adBlueprint) : { label: adBlueprint.status || "Draft", style: adBlueprint.statusStyle || "gray" };
    const issues = workspace ? issuesForAdBlueprint(workspace, placement, adBlueprint) : [];
    const locked = isAdBlueprintLocked(workspace, adBlueprint);
    const lockMessage = adBlueprintLockMessage(workspace, adBlueprint);
    return `
      <section class="content-card ad-blueprint-card">
        <header class="card-head">
          <div>
            <h2>Ad Blueprint</h2>
            <p>Configure automation, ad identity, and creative setup for this selected placement.</p>
          </div>
          ${chip(stateItem.label, stateItem.style)}
        </header>
        <div class="form-panel">
          ${renderLockNotice(lockMessage)}
          <fieldset class="lock-fieldset" ${locked ? "disabled" : ""}>
            ${renderAdAutomationPanel(adBlueprint, placement)}
            ${renderAdSetupSection(adBlueprint, placement)}
            ${renderCreativesSection(workspace, placement, adBlueprint)}
            ${renderCreativeVariantRoutingPanel(workspace, placement, adBlueprint)}
            ${renderStudioProfileMappingPanel(workspace, placement, adBlueprint)}
            ${renderAdFormatMismatch(workspace, placement, adBlueprint)}
            ${renderValidationList(issues.filter((issue) => !issue.id.startsWith(`ad-format-${adBlueprint.id}-`)), issues.length ? "" : "Ad Blueprint setup is complete for this phase.")}
          </fieldset>
        </div>
      </section>
    `;
  }

  function renderCreativesSection(workspace, placement, adBlueprint) {
    return `
      ${renderAdFormatSection(adBlueprint, placement)}
      ${adBlueprint.adType === "rich_media_dco" ? renderRichMediaDcoPanel(workspace, placement, adBlueprint) : renderStandardDisplayPanel(placement, adBlueprint)}
    `;
  }

  function adStatusOptions() {
    return [
      { id: "Draft", name: "Draft" },
      { id: "Needs setup", name: "Needs setup" },
      { id: "Complete", name: "Complete" },
      { id: "Studio connected", name: "Studio connected" },
      { id: "Published", name: "Published" },
      { id: "Failed", name: "Failed" },
    ];
  }

  function renderAdSetupSection(adBlueprint, placement) {
    return `
      <section class="subsection-panel ad-setup-section" aria-label="Ad name and status">
        <div class="subsection-head">
          <div>
            <h3>Ad name and status</h3>
            <p>Set the operational state and naming values used by CM360.</p>
          </div>
          ${chip(adBlueprint.status || "Draft", adBlueprint.statusStyle || statusStyle(adBlueprint.status || "Draft"))}
        </div>
        <div class="form-grid ad-identity-grid">
          <label class="field">
            <span>Status</span>
            <select data-action="select-ad-status" data-placement-id="${escapeHtml(placement.id)}" data-ad-id="${escapeHtml(adBlueprint.id)}">
              ${renderOptions(adStatusOptions(), adBlueprint.status || "Draft", "Select status")}
            </select>
          </label>
          <label class="field full-span">
            <span>Ad name</span>
            <input type="text" data-action="edit-ad-name" data-placement-id="${escapeHtml(placement.id)}" data-ad-id="${escapeHtml(adBlueprint.id)}" value="${escapeHtml(adBlueprint.name || "")}" placeholder="Name this Ad" />
          </label>
          <label class="field">
            <span>Ad blueprint name</span>
            <input type="text" data-action="edit-ad-blueprint-name" data-placement-id="${escapeHtml(placement.id)}" data-ad-id="${escapeHtml(adBlueprint.id)}" value="${escapeHtml(adBlueprint.blueprintName || adBlueprint.name || "")}" placeholder="Blueprint name used in Workspace navigation" />
          </label>
          <label class="field">
            <span>Ad code</span>
            <input type="text" data-action="edit-ad-code" data-placement-id="${escapeHtml(placement.id)}" data-ad-id="${escapeHtml(adBlueprint.id)}" value="${escapeHtml(adBlueprint.adCode || "")}" placeholder="Optional ad code" />
          </label>
        </div>
      </section>
    `;
  }

  function renderAdFormatSection(adBlueprint, placement) {
    const formats = [
      {
        id: "rich_media_dco",
        name: "Rich Media DCO",
        description: "Use Studio-connected HTML Creatives with DCO setup.",
      },
      {
        id: "standard_display",
        name: "Standard Display",
        description: "Use template selection or desktop zip upload.",
      },
    ];
    return `
      <section class="subsection-panel" aria-label="Format">
        <div class="subsection-head">
          <div>
            <h3>Creatives</h3>
            <p>Select the ad type and creative source for this Ad Blueprint.</p>
          </div>
          ${chip(adTypeLabel(adBlueprint.adType), adBlueprint.adType === "rich_media_dco" ? "blue" : "gray")}
        </div>
        <div class="format-card-grid">
          ${formats
            .map(
              (format) => `
                <button class="format-card ${adBlueprint.adType === format.id ? "active" : ""}" type="button" data-action="select-ad-type-card" data-placement-id="${escapeHtml(placement.id)}" data-ad-id="${escapeHtml(adBlueprint.id)}" data-ad-type="${escapeHtml(format.id)}">
                  <strong>${escapeHtml(format.name)}</strong>
                  <span>${escapeHtml(format.description)}</span>
                </button>
              `
            )
            .join("")}
        </div>
      </section>
    `;
  }

  function renderAdAutomationPanel(adBlueprint, placement) {
    const automationFeeds = getAutomationFeeds();
    const selectedFeed = automationFeeds.find((feed) => feed.id === adBlueprint.producerId);
    const selectedRows = automationFeedRowsForAdBlueprint(adBlueprint);
    const itemCount = selectedRows.length || selectedFeed?.itemCount || 0;
    const feedMeta = selectedFeed ? `${itemCount} items · ${selectedFeed.type || "Prototype feed"}` : "Select an Automation feed";
    return `
      <section class="subsection-panel automation-panel" aria-label="Automation">
        <div class="automation-hero">
          <div>
            <strong>Automation</strong>
            <span>${adBlueprint.adAutomationEnabled ? "Drive dynamic creative from a producer feed." : "Automation is off. Upload or select the final creative bundle manually."}</span>
          </div>
          <label class="switch-control">
            <input type="checkbox" data-action="toggle-ad-automation" data-placement-id="${escapeHtml(placement.id)}" data-ad-id="${escapeHtml(adBlueprint.id)}" ${adBlueprint.adAutomationEnabled ? "checked" : ""} />
            <span>${adBlueprint.adAutomationEnabled ? "On" : "Off"}</span>
          </label>
        </div>
        ${
          adBlueprint.adAutomationEnabled
            ? `<div class="automation-body">
                <div class="automation-source-label">Data source</div>
                <div class="automation-source-card">
                  <div class="source-icon">#</div>
                  <div>
                    <strong>${escapeHtml(selectedFeed?.name || "Content Management Feed")}</strong>
                    <span>${escapeHtml(feedMeta)}${selectedFeed ? " · Refreshed just now" : ""}</span>
                  </div>
                  <select class="automation-feed-select" aria-label="Automation feed" data-action="select-ad-producer" data-placement-id="${escapeHtml(placement.id)}" data-ad-id="${escapeHtml(adBlueprint.id)}">
                    ${renderOptions(automationFeeds, adBlueprint.producerId, "Select Automation feed")}
                  </select>
                </div>
                <button class="feed-explorer-link" type="button" disabled title="Prototype preview only; Feed Explorer is not interactive in this slice.">Feed Explorer</button>
                <div class="automation-settings">
                  <div class="automation-settings-title">
                    <strong>Optional automation settings</strong>
                    <span>Prototype preview only. These values are not persisted in this slice.</span>
                  </div>
                  <div class="automation-step">
                    <span class="step-index">1</span>
                    <div>
                      <strong>Filter</strong>
                      <span>Extract rows from the feed to be used to create ads</span>
                      <button class="icon-button compact-icon-button" type="button" disabled title="Prototype preview only; filter settings are not persisted.">+</button>
                      <em>${escapeHtml(itemCount || 0)} items filtered from the feed</em>
                    </div>
                  </div>
                  <div class="automation-step">
                    <span class="step-index">2</span>
                    <label class="field">
                      <span>Group</span>
                      <small>Create one ad per unique value of:</small>
                      <select disabled title="Prototype preview only; group settings are not persisted.">
                        <option>One ad per row</option>
                      </select>
                    </label>
                  </div>
                  <div class="automation-step">
                    <span class="step-index">3</span>
                    <div class="automation-inline-fields">
                      <label class="field">
                        <span>Sort by field</span>
                        <select disabled title="Prototype preview only; sort settings are not persisted.">
                          <option>Select</option>
                        </select>
                      </label>
                      <label class="field">
                        <span>From</span>
                        <select disabled title="Prototype preview only; sort settings are not persisted.">
                          <option>Ascending order (A-Z)</option>
                        </select>
                      </label>
                    </div>
                  </div>
                  <div class="automation-step">
                    <span class="step-index">4</span>
                    <label class="field automation-limit-field">
                      <span>Limit the number of ads</span>
                      <small>Create maximum</small>
                      <input type="number" value="500" disabled title="Prototype preview only; limit settings are not persisted." />
                      <small>ads from my feed</small>
                    </label>
                  </div>
                </div>
              </div>`
            : ""
        }
      </section>
    `;
  }

  function renderRichMediaDcoPanel(workspace, placement, adBlueprint) {
    const studioAdvertisers = getStudioAdvertisers(workspace.cmAdvertiserId);
    const config = adBlueprint.richMediaDcoConfig || {};
    const studioCampaigns = getStudioCampaigns(config.studioAdvertiserId);
    const studioIssues = issuesForAdBlueprint(workspace, placement, adBlueprint).filter((issue) => issue.location === "Studio Connection");

    return `
      <section class="subsection-panel" aria-label="Rich Media DCO setup">
        <div class="subsection-head">
          <div>
            <h3>Rich Media DCO setup</h3>
            <p>Connect the Studio destination and select one or more HTML Creatives. Desktop upload is unavailable for Rich Media DCO.</p>
          </div>
          ${chip("Rich Media DCO", "blue")}
        </div>
        ${renderStudioConnectionFields(workspace, placement, adBlueprint, studioAdvertisers, studioCampaigns, studioIssues)}
        ${renderTemplateLayerMappingPanel(placement, adBlueprint)}
        <div class="form-grid">
          ${renderValueModeField({
            placement,
            adBlueprint,
            label: "Landing page",
            mode: config.landingPageMode || "static",
            value: config.landingPageValue || "",
            modeAction: "select-dco-landing-mode",
            valueAction: "edit-dco-landing-page",
            helper: "Dynamic landing pages can use prototype macros.",
            dynamicLabel: "Dynamic macro",
            dynamicAlwaysAvailable: true,
            placeholder: "https://example.com",
          })}
          ${renderValueModeField({
            placement,
            adBlueprint,
            label: "URL parameters",
            mode: config.urlParameterMode || "dynamic",
            value: config.urlParameterValue || "",
            modeAction: "select-dco-url-mode",
            valueAction: "edit-dco-url-parameters",
            helper: "URL parameters can use prototype macros.",
            dynamicLabel: "Dynamic macro",
            dynamicAlwaysAvailable: true,
            placeholder: "utm_source=cm360",
          })}
        </div>
        ${renderRichMediaDcoPreviewTable(placement, adBlueprint)}
      </section>
    `;
  }

  function renderStudioConnectionFields(workspace, placement, adBlueprint, studioAdvertisers, studioCampaigns, studioIssues) {
    const config = adBlueprint.richMediaDcoConfig || {};
    const campaignDisabled = !config.studioAdvertiserId;
    return `
      <section class="nested-section" aria-label="Studio Connection">
        <div class="subsection-head compact-subsection-head">
          <div>
            <h3>Studio Connection</h3>
            <p>Choose the prototype Studio Advertiser and Studio Campaign for this Rich Media DCO Ad Blueprint.</p>
          </div>
          ${chip(config.studioAdvertiserId && config.studioCampaignId ? "Connected" : "Needs setup", config.studioAdvertiserId && config.studioCampaignId ? "green" : "yellow")}
        </div>
        <div class="form-grid">
          <label class="field">
            <span>Studio Advertiser</span>
            <select data-action="select-studio-advertiser" data-placement-id="${escapeHtml(placement.id)}" data-ad-id="${escapeHtml(adBlueprint.id)}">
              ${renderOptions(studioAdvertisers, config.studioAdvertiserId, studioAdvertisers.length ? "Select Studio Advertiser" : "No Studio Advertiser available")}
            </select>
            <small>${studioAdvertisers.length ? "Options are filtered by the selected CM360 Advertiser." : "No Studio Advertiser fixture is connected to this CM360 Advertiser."}</small>
          </label>
          <label class="field">
            <span>Studio Campaign</span>
            <select data-action="select-studio-campaign" data-placement-id="${escapeHtml(placement.id)}" data-ad-id="${escapeHtml(adBlueprint.id)}" ${campaignDisabled ? "disabled" : ""}>
              ${renderOptions(studioCampaigns, config.studioCampaignId, campaignDisabled ? "Select Studio Advertiser first" : "Select Studio Campaign")}
            </select>
            <small>${campaignDisabled ? "Select a Studio Advertiser before choosing a Studio Campaign." : "Campaign options depend on the selected Studio Advertiser."}</small>
          </label>
        </div>
        ${renderValidationList(studioIssues, config.studioAdvertiserId && config.studioCampaignId ? "Studio Connection is configured for this prototype." : "")}
      </section>
    `;
  }

  function templateLayerOptions() {
    return ["Title", "SubHeadline", "Image 1", "Image 2", "Image 3", "CTA", "Brand", "Category", "Product Type"].map((layer) => ({ id: layer, name: layer }));
  }

  function dcoOriginOptions() {
    return [
      { id: "product_feed", name: "Product Feed" },
      { id: "automation_feed", name: "Automation Feed" },
      { id: "content_match", name: "Content Match" },
    ];
  }

  function defaultDcoLayerMappings() {
    return [
      { id: "layer-title", templateLayer: "Title", origin: "product_feed", feedColumn: "title" },
      { id: "layer-subheadline", templateLayer: "SubHeadline", origin: "automation_feed", feedColumn: "headline" },
      { id: "layer-image-1", templateLayer: "Image 1", origin: "product_feed", feedColumn: "image_link_a" },
      { id: "layer-image-2", templateLayer: "Image 2", origin: "product_feed", feedColumn: "image_link_b" },
      { id: "layer-image-3", templateLayer: "Image 3", origin: "product_feed", feedColumn: "image_link_c" },
      { id: "layer-cta", templateLayer: "CTA", origin: "automation_feed", feedColumn: "cta" },
      { id: "layer-brand", templateLayer: "Brand", origin: "product_feed", feedColumn: "brand" },
      { id: "layer-category", templateLayer: "Category", origin: "content_match", feedColumn: "category" },
      { id: "layer-product-type", templateLayer: "Product Type", origin: "content_match", feedColumn: "product_type" },
    ];
  }

  function dcoLayerMappings(config) {
    return Array.isArray(config.layerMappings) ? config.layerMappings : defaultDcoLayerMappings();
  }

  function dcoFeedColumnsForOrigin(origin, currentValue) {
    const columns =
      origin === "automation_feed"
        ? getAutomationFeedFields()
        : origin === "content_match"
          ? getContentMatchColumns()
          : getProductFeedColumns();
    const normalized = columns.map((column) => ({ id: column.id, name: column.name || column.id, sampleValue: column.sampleValue }));
    if (currentValue && !normalized.some((column) => column.id === currentValue)) {
      return [{ id: currentValue, name: currentValue }, ...normalized];
    }
    return normalized;
  }

  function dcoOriginLabel(origin) {
    return dcoOriginOptions().find((option) => option.id === origin)?.name || "Product Feed";
  }

  function dcoSourceChipStyle(origin) {
    if (origin === "automation_feed") return "gray";
    if (origin === "content_match") return "blue";
    return "purple";
  }

  function renderTemplateLayerMappingPanel(placement, adBlueprint) {
    const config = adBlueprint.richMediaDcoConfig || {};
    const selectedTemplateIds = new Set(selectedDcoTemplateIds(adBlueprint));
    const templates = getRichMediaDcoTemplates();
    const selectedTemplates = templates.filter((template) => selectedTemplateIds.has(template.id));
    const mappings = dcoLayerMappings(config);
    const selectedFormatCount = new Set((config.htmlCreatives || []).map((creative) => creative.format).filter(Boolean)).size;
    const dataSources = getDataSources();
    return `
      <section class="template-layer-panel" aria-label="Template and layer mapping">
        <div class="template-layer-head">
          <div class="template-layer-icon">#</div>
          <div>
            <h3>Template & layer mapping</h3>
            <p>Templates come pre-configured with layer mappings. Select the templates this ad renders in; mappings can be edited to override.</p>
          </div>
          ${chip(`${selectedFormatCount || 0} format${selectedFormatCount === 1 ? "" : "s"}`, "purple")}
        </div>
        <div class="template-layer-body">
          <div class="field-row-head">
            <strong>Templates</strong>
            <span>one creative per size, every audience renders in each</span>
          </div>
          ${renderDcoTemplateDropdown(placement, adBlueprint, templates, selectedTemplates, selectedTemplateIds)}
          <div class="field-row-head">
            <strong>Secondary feed</strong>
            <span>product catalog joined in for layer content (optional)</span>
          </div>
          <label class="field secondary-feed-select">
            <select data-action="select-dco-secondary-feed" data-placement-id="${escapeHtml(placement.id)}" data-ad-id="${escapeHtml(adBlueprint.id)}">
              ${renderOptions(dataSources, config.dataSourceId, "Select secondary feed")}
            </select>
          </label>
          ${renderSecondaryFeedMatchControls(placement, adBlueprint)}
          <div class="field-row-head layer-mapping-head">
            <strong>Layer mapping</strong>
            <span>auto-configured from template, edit to override</span>
          </div>
          ${renderDcoLayerMappingTable(placement, adBlueprint, mappings)}
          ${renderResolvedCreativePreview(adBlueprint, mappings)}
        </div>
      </section>
    `;
  }

  function renderDcoTemplateDropdown(placement, adBlueprint, templates, selectedTemplates, selectedTemplateIds) {
    return `
      <details class="template-dropdown">
        <summary>
          <div class="template-chip-list">
            ${
              selectedTemplates.length
                ? selectedTemplates.map((template) => `<span class="template-chip">${escapeHtml(template.format)} · ${escapeHtml(template.name)} <em>x</em></span>`).join("")
                : '<span class="template-placeholder">Select templates</span>'
            }
          </div>
          <span class="template-dropdown-caret">v</span>
        </summary>
        <div class="template-option-list">
          ${templates
            .map((template) => {
              const selected = selectedTemplateIds.has(template.id) && (placement.formats || []).includes(template.format);
              const compatible = (placement.formats || []).includes(template.format);
              return `
                <label class="template-option ${compatible ? "" : "disabled"}">
                  <input type="checkbox" data-action="toggle-dco-creative" data-placement-id="${escapeHtml(placement.id)}" data-ad-id="${escapeHtml(adBlueprint.id)}" value="${escapeHtml(template.id)}" ${selected ? "checked" : ""} ${compatible ? "" : "disabled"} />
                  <span>
                    <strong>${escapeHtml(template.name)}</strong>
                    <em>${escapeHtml(template.format)} · Template library${compatible ? "" : " · Not supported by this placement"}</em>
                  </span>
                  ${chip(template.format, compatible ? "gray" : "red")}
                </label>
              `;
            })
            .join("")}
        </div>
      </details>
    `;
  }

  function renderSecondaryFeedMatchControls(placement, adBlueprint) {
    const config = adBlueprint.richMediaDcoConfig || {};
    const mode = config.secondaryFeedMatchMode || "open_filter";
    const groupName = `secondary-match-${placement.id}-${adBlueprint.id}`;
    return `
      <div class="secondary-match-grid" role="radiogroup" aria-label="Secondary feed match behavior">
        <label class="match-option ${mode === "open_filter" ? "active" : ""}">
          <input type="radio" name="${escapeHtml(groupName)}" value="open_filter" data-action="select-secondary-match-mode" data-placement-id="${escapeHtml(placement.id)}" data-ad-id="${escapeHtml(adBlueprint.id)}" ${mode === "open_filter" ? "checked" : ""} />
          <span>Open Filter</span>
        </label>
        <label class="match-option ${mode === "content_match" ? "active" : ""}">
          <input type="radio" name="${escapeHtml(groupName)}" value="content_match" data-action="select-secondary-match-mode" data-placement-id="${escapeHtml(placement.id)}" data-ad-id="${escapeHtml(adBlueprint.id)}" ${mode === "content_match" ? "checked" : ""} />
          <span>Content Match</span>
          <select data-action="select-content-match-column" data-placement-id="${escapeHtml(placement.id)}" data-ad-id="${escapeHtml(adBlueprint.id)}" ${mode === "content_match" ? "" : "disabled"}>
            ${renderOptions(getContentMatchColumns(), config.contentMatchColumn || "category", "Select column")}
          </select>
        </label>
        <label class="match-option ${mode === "constant_match" ? "active" : ""}">
          <input type="radio" name="${escapeHtml(groupName)}" value="constant_match" data-action="select-secondary-match-mode" data-placement-id="${escapeHtml(placement.id)}" data-ad-id="${escapeHtml(adBlueprint.id)}" ${mode === "constant_match" ? "checked" : ""} />
          <span>Constant Match</span>
          <input type="text" data-action="edit-constant-match-value" data-placement-id="${escapeHtml(placement.id)}" data-ad-id="${escapeHtml(adBlueprint.id)}" value="${escapeHtml(config.constantMatchValue || "")}" placeholder="Enter match value" ${mode === "constant_match" ? "" : "disabled"} />
        </label>
      </div>
    `;
  }

  function renderDcoLayerMappingTable(placement, adBlueprint, mappings) {
    return `
      <div class="layer-mapping-table">
        <div class="layer-mapping-grid layer-mapping-columns">
          <span>Template layer</span>
          <span>Origin</span>
          <span>Feed column</span>
          <span></span>
        </div>
        ${mappings.map((mapping) => renderDcoLayerMappingRow(placement, adBlueprint, mapping)).join("")}
        <button class="add-layer-button" type="button" data-action="add-dco-layer" data-placement-id="${escapeHtml(placement.id)}" data-ad-id="${escapeHtml(adBlueprint.id)}">+ Add layer</button>
      </div>
    `;
  }

  function renderDcoLayerMappingRow(placement, adBlueprint, mapping) {
    const origin = mapping.origin || "product_feed";
    const columnOptions = dcoFeedColumnsForOrigin(origin, mapping.feedColumn);
    return `
      <div class="layer-mapping-grid layer-mapping-row">
        <select data-action="select-dco-layer-template" data-placement-id="${escapeHtml(placement.id)}" data-ad-id="${escapeHtml(adBlueprint.id)}" data-layer-id="${escapeHtml(mapping.id)}">
          ${renderOptions(templateLayerOptions(), mapping.templateLayer, "Select layer")}
        </select>
        <select data-action="select-dco-layer-origin" data-placement-id="${escapeHtml(placement.id)}" data-ad-id="${escapeHtml(adBlueprint.id)}" data-layer-id="${escapeHtml(mapping.id)}">
          ${renderOptions(dcoOriginOptions(), origin, "Select origin")}
        </select>
        <select data-action="select-dco-layer-feed-column" data-placement-id="${escapeHtml(placement.id)}" data-ad-id="${escapeHtml(adBlueprint.id)}" data-layer-id="${escapeHtml(mapping.id)}">
          ${renderOptions(columnOptions, mapping.feedColumn, "Select feed column")}
        </select>
        <button class="icon-button layer-remove-button" type="button" data-action="remove-dco-layer" data-placement-id="${escapeHtml(placement.id)}" data-ad-id="${escapeHtml(adBlueprint.id)}" data-layer-id="${escapeHtml(mapping.id)}" title="Remove layer">x</button>
      </div>
    `;
  }

  function renderResolvedCreativePreview(adBlueprint, mappings) {
    const row = automationFeedRowsForAdBlueprint(adBlueprint)[0] || {};
    return `
      <div class="resolved-creative">
        <div class="field-row-head">
          <strong>Resolved creative</strong>
          <span>how the layers fill for "${escapeHtml(row.variant_name || row.audienceName || "Product Viewers")}"</span>
        </div>
        <div class="resolved-creative-list">
          ${mappings.map((mapping) => renderResolvedCreativeRow(mapping, row)).join("")}
        </div>
      </div>
    `;
  }

  function renderResolvedCreativeRow(mapping, row) {
    const value = resolvedLayerValue(mapping, row);
    return `
      <div class="resolved-creative-row">
        <strong>${escapeHtml(mapping.templateLayer || "Layer")}</strong>
        <span>${escapeHtml(value || "Not set")}</span>
        ${chip(dcoOriginLabel(mapping.origin).replace(" Feed", ""), dcoSourceChipStyle(mapping.origin))}
      </div>
    `;
  }

  function resolvedLayerValue(mapping, row) {
    if (mapping.origin === "automation_feed") {
      return row[mapping.feedColumn] || row[String(mapping.feedColumn || "").toLowerCase()] || "";
    }
    if (mapping.origin === "content_match") {
      if (mapping.feedColumn === "product_type") return row.product_type || row.category || "Running shoes";
      return row.category || row.theme || "Shoes";
    }
    const column = getProductFeedColumns().find((item) => item.id === mapping.feedColumn);
    return column?.sampleValue || "";
  }

  function renderStandardDisplayPanel(placement, adBlueprint) {
    const config = adBlueprint.standardDisplayConfig || {};
    const templates = getStandardDisplayTemplates();
    return `
      <section class="subsection-panel" aria-label="Standard Display setup">
        <div class="subsection-head">
          <div>
            <h3>Standard Display setup</h3>
            <p>Configure the HTML Ad source and preview compatible creative versions.</p>
          </div>
          ${chip("Standard Display", "gray")}
        </div>
        <div class="form-grid">
          <label class="field">
            <span>Media source</span>
            <select data-action="select-standard-media-source" data-placement-id="${escapeHtml(placement.id)}" data-ad-id="${escapeHtml(adBlueprint.id)}">
              <option value="template" ${config.mediaSource !== "upload" ? "selected" : ""}>From template</option>
              <option value="upload" ${config.mediaSource === "upload" ? "selected" : ""}>Upload from desktop</option>
            </select>
          </label>
          ${
            config.mediaSource === "upload"
              ? `<label class="field">
                  <span>Prototype upload</span>
                  <input type="text" data-action="edit-upload-name" data-placement-id="${escapeHtml(placement.id)}" data-ad-id="${escapeHtml(adBlueprint.id)}" value="${escapeHtml(config.uploadedBundleName || "")}" placeholder="final-creative-bundle.zip" />
                  <small>Prototype only: final zip bundle upload will be connected later.</small>
                </label>`
              : `<label class="field">
                  <span>HTML template</span>
                  <select data-action="select-standard-template" data-placement-id="${escapeHtml(placement.id)}" data-ad-id="${escapeHtml(adBlueprint.id)}">
                    ${renderTemplateOptions(templates, config.templateId, "Select template", placement.formats)}
                  </select>
                  <small>Only templates matching selected Placement formats can be selected.</small>
                </label>`
          }
        </div>
        ${
          config.mediaSource === "upload"
            ? `<label class="field compact-field">
                <span>Uploaded bundle format</span>
                <select data-action="select-upload-format" data-placement-id="${escapeHtml(placement.id)}" data-ad-id="${escapeHtml(adBlueprint.id)}">
                  ${renderFormatOptions(placement.formats || [], config.uploadedFormat, "Select format")}
                </select>
                <small>Upload format must match the selected Placement formats.</small>
              </label>`
            : ""
        }
        <div class="form-grid">
          ${renderValueModeField({
            placement,
            adBlueprint,
            label: "Landing page",
            mode: config.landingPageMode || "static",
            value: config.landingPageValue || "",
            modeAction: "select-landing-mode",
            valueAction: "edit-landing-page",
            helper: "Dynamic values can use Automation feed macros.",
            placeholder: "https://example.com",
          })}
          ${renderValueModeField({
            placement,
            adBlueprint,
            label: "URL parameters",
            mode: config.urlParameterMode || "static",
            value: config.urlParameterValue || "",
            modeAction: "select-url-mode",
            valueAction: "edit-url-parameters",
            helper: "Dynamic values can use Automation feed macros.",
            placeholder: "utm_source=cm360",
          })}
        </div>
        ${renderStandardDisplayPreviewTable(placement, adBlueprint)}
      </section>
    `;
  }

  function renderValueModeField(config) {
    const dynamicDisabled = !config.dynamicAlwaysAvailable && !config.adBlueprint.adAutomationEnabled;
    return `
      <div class="value-mode-field">
        <label class="field">
          <span>${escapeHtml(config.label)}</span>
          <select data-action="${escapeHtml(config.modeAction)}" data-placement-id="${escapeHtml(config.placement.id)}" data-ad-id="${escapeHtml(config.adBlueprint.id)}">
            <option value="static" ${config.mode !== "dynamic" ? "selected" : ""}>Static value</option>
            <option value="dynamic" ${config.mode === "dynamic" ? "selected" : ""} ${dynamicDisabled ? "disabled" : ""}>${escapeHtml(config.dynamicLabel || "Dynamic macro")}</option>
          </select>
          <small>${dynamicDisabled ? "Turn on Ad Automation to use Automation feed macros." : escapeHtml(config.helper)}</small>
        </label>
        <label class="field">
          <span>${config.mode === "dynamic" ? escapeHtml(config.dynamicLabel || "Automation macro") : "Value"}</span>
          <input type="text" data-action="${escapeHtml(config.valueAction)}" data-placement-id="${escapeHtml(config.placement.id)}" data-ad-id="${escapeHtml(config.adBlueprint.id)}" value="${escapeHtml(config.value)}" placeholder="${escapeHtml(config.mode === "dynamic" ? "{{feed.field}}" : config.placeholder)}" />
        </label>
      </div>
    `;
  }

  function renderStandardDisplayPreviewTable(placement, adBlueprint) {
    const rows = standardDisplayPreviewRows(placement, adBlueprint);
    if (!rows.length) {
      return '<div class="table-empty"><strong>No Standard Display preview yet</strong><span>Select a template or upload source to preview compatible creative versions.</span></div>';
    }
    return `
      <div class="inline-table-shell">
        <table class="compact-table preview-table">
          <thead>
            <tr>
              <th style="width: 23%">Creative</th>
              <th style="width: 12%">Format</th>
              <th style="width: 14%">Source</th>
              <th style="width: 21%">Landing page</th>
              <th style="width: 20%">URL parameters</th>
              <th style="width: 10%">Status</th>
            </tr>
          </thead>
          <tbody>
            ${rows
              .map(
                (row) => `
                  <tr>
                    <td><span class="workspace-name">${escapeHtml(row.creative)}</span></td>
                    <td>${chip(row.format || "Not set", row.status === "Compatible" ? "gray" : "red")}</td>
                    <td>${escapeHtml(row.source)}</td>
                    <td><span class="truncate">${escapeHtml(row.landingPage)}</span></td>
                    <td><span class="truncate">${escapeHtml(row.urlParameters)}</span></td>
                    <td>${chip(row.status, row.status === "Compatible" ? "green" : "red")}</td>
                  </tr>
                `
              )
              .join("")}
          </tbody>
        </table>
      </div>
    `;
  }

  function renderRichMediaDcoPreviewTable(placement, adBlueprint) {
    const rows = richMediaDcoPreviewRows(placement, adBlueprint);
    if (!rows.length) {
      return '<div class="table-empty"><strong>No DCO preview yet</strong><span>Select one or more HTML Creatives to preview Rich Media DCO versions.</span></div>';
    }
    return `
      <div class="inline-table-shell">
        <table class="compact-table preview-table">
          <thead>
            <tr>
              <th style="width: 28%">Creative</th>
              <th style="width: 12%">Format</th>
              <th style="width: 24%">Landing page</th>
              <th style="width: 24%">URL parameters</th>
              <th style="width: 10%">Status</th>
            </tr>
          </thead>
          <tbody>
            ${rows
              .map(
                (row) => `
                  <tr>
                    <td><span class="workspace-name">${escapeHtml(row.creative)}</span></td>
                    <td>${chip(row.format || "Not set", row.status === "Compatible" ? "gray" : "red")}</td>
                    <td><span class="truncate">${escapeHtml(row.landingPage)}</span></td>
                    <td><span class="truncate">${escapeHtml(row.urlParameters)}</span></td>
                    <td>${chip(row.status, row.status === "Compatible" ? "green" : "red")}</td>
                  </tr>
                `
              )
              .join("")}
          </tbody>
        </table>
      </div>
    `;
  }

  function automationFeedRowsForAdBlueprint(adBlueprint) {
    const rows = getAutomationFeedRows();
    if (!adBlueprint.producerId) return [];
    return rows.filter((row) => !row.automationFeedId || row.automationFeedId === adBlueprint.producerId);
  }

  function autoMappedAudienceIdsForRow(workspace, row) {
    const audienceNames = audienceNamesForAutomationRow(row);
    if (!audienceNames.length) return [];
    const targets = targetingLibrary(workspace).audienceTargets;
    return audienceNames
      .map((audienceName) => targets.find((target) => String(target.name || "").trim() === audienceName)?.id)
      .filter(Boolean);
  }

  function audienceNamesForAutomationRow(row) {
    return String(row?.audienceName || row?.audience || "")
      .split(",")
      .map((name) => name.trim())
      .filter(Boolean);
  }

  function variantRoutingAssignmentFor(workspace, adBlueprint, row) {
    const feedRowId = row.id;
    const savedAssignment = (adBlueprint.variantRoutingAssignments || []).find((item) => item.feedRowId === feedRowId);
    const autoMappedAudienceIds = autoMappedAudienceIdsForRow(workspace, row);
    const assignment = savedAssignment || {
      feedRowId,
      audienceTargetingIds: autoMappedAudienceIds,
      scheduleId: "",
      status: autoMappedAudienceIds.length ? "Complete" : "Needs setup",
    };
    return {
      ...assignment,
      audienceTargetingIds: assignment.audienceTargetingIds || (assignment.audienceTargetingId ? [assignment.audienceTargetingId] : []),
    };
  }

  function audienceTargetingName(workspace, id) {
    if (!id) return "Unassigned";
    return targetingLibrary(workspace).audienceTargets.find((target) => target.id === id)?.name || "Missing audience";
  }

  function audienceTargetingIdsForAssignment(assignment) {
    return assignment.audienceTargetingIds || (assignment.audienceTargetingId ? [assignment.audienceTargetingId] : []);
  }

  function renderAudienceAssignmentChips(workspace, assignment, maxVisible) {
    const ids = audienceTargetingIdsForAssignment(assignment);
    if (!ids.length) return '<span class="workspace-sub">Select audience</span>';
    const visible = ids.slice(0, maxVisible || 3);
    const overflow = ids.length - visible.length;
    return `
      <div class="targeting-chip-list audience-chip-list">
        ${visible.map((id) => chip(audienceTargetingName(workspace, id), "gray")).join("")}
        ${overflow > 0 ? chip(`+${overflow} more`, "blue") : ""}
      </div>
    `;
  }

  function routingAudienceMenuOpen(scope, feedRowId) {
    const menu = state.routingAudienceMenu || {};
    return menu.scope === scope && (scope === "bulk" || menu.feedRowId === feedRowId);
  }

  function audienceSignalDetail(target) {
    const values = (target.values || []).join(", ");
    return `${target.idType || "Audience"}${values ? `: ${values}` : ""}`;
  }

  function filteredAudienceTargets(workspace) {
    const query = String(state.routingAudienceSearch || "").toLowerCase().trim();
    const targets = targetingLibrary(workspace).audienceTargets;
    if (!query) return targets;
    return targets.filter((target) => [target.name, target.idType, ...(target.values || [])].join(" ").toLowerCase().includes(query));
  }

  function renderAudienceSelectorDropdown(workspace, scope, feedRowId, selectedIds) {
    if (!routingAudienceMenuOpen(scope, feedRowId)) return "";
    const options = filteredAudienceTargets(workspace);
    const selected = new Set(selectedIds || []);
    return `
      <div class="routing-audience-popover">
        <input class="routing-audience-search" type="search" data-action="search-routing-audience" placeholder="Select signals for the variant" value="${escapeHtml(state.routingAudienceSearch || "")}" />
        <div class="routing-audience-options">
          ${
            options.length
              ? options
                  .map(
                    (target) => `
                      <button class="routing-audience-option ${selected.has(target.id) ? "selected" : ""}" type="button" data-action="toggle-routing-audience-option" data-menu-scope="${escapeHtml(scope)}" data-feed-row-id="${escapeHtml(feedRowId || "")}" data-audience-id="${escapeHtml(target.id)}">
                        <span class="option-check">${selected.has(target.id) ? "x" : ""}</span>
                        <span>
                          <strong>${escapeHtml(target.name || "Unnamed audience")}</strong>
                          <em>${escapeHtml(audienceSignalDetail(target))}</em>
                        </span>
                      </button>
                    `
                  )
                  .join("")
              : '<div class="routing-audience-empty">No audience signals match.</div>'
          }
        </div>
      </div>
    `;
  }

  function renderAudienceSelectorTrigger(workspace, scope, feedRowId, selectedIds) {
    const assignment = { audienceTargetingIds: selectedIds || [] };
    const isOpen = routingAudienceMenuOpen(scope, feedRowId);
    return `
      <div class="routing-audience-select ${isOpen ? "open" : ""}">
        <button class="routing-audience-trigger" type="button" data-action="toggle-routing-audience-menu" data-menu-scope="${escapeHtml(scope)}" data-feed-row-id="${escapeHtml(feedRowId || "")}">
          ${selectedIds?.length ? renderAudienceAssignmentChips(workspace, assignment, 2) : '<span class="routing-audience-placeholder">Select audiences</span>'}
          <span class="routing-audience-caret">v</span>
        </button>
        ${renderAudienceSelectorDropdown(workspace, scope, feedRowId, selectedIds || [])}
      </div>
    `;
  }

  function scheduleAssignmentName(workspace, id) {
    if (!id) return "Any schedule";
    return targetingLibrary(workspace).deliverySchedules.find((schedule) => schedule.id === id)?.name || "Missing schedule";
  }

  function variantRoutingStatus(workspace, assignment) {
    const audienceIds = audienceTargetingIdsForAssignment(assignment);
    if (!audienceIds.length) return { label: "Needs setup", style: "yellow" };
    const validAudienceIds = new Set(targetingLibrary(workspace).audienceTargets.map((target) => target.id));
    if (audienceIds.some((id) => !validAudienceIds.has(id))) return { label: "Invalid", style: "red" };
    if (assignment.scheduleId && !targetingLibrary(workspace).deliverySchedules.some((schedule) => schedule.id === assignment.scheduleId)) return { label: "Invalid", style: "red" };
    return { label: assignment.status || "Complete", style: statusStyle(assignment.status || "Complete") };
  }

  function renderCreativeVariantRoutingPanel(workspace, placement, adBlueprint) {
    const rows = automationFeedRowsForAdBlueprint(adBlueprint);
    return `
      <section class="subsection-panel" aria-label="Creative Variant Routing">
        <div class="subsection-head">
          <div>
            <h3>Creative Variant Routing</h3>
            <p>Assign Campaign Blueprint audiences and schedules to Automation feed rows. Category, Age, Headline, and CTA are read-only feed values.</p>
          </div>
          <button class="secondary-button" type="button" data-action="configure-variant-routing" data-placement-id="${escapeHtml(placement.id)}" data-ad-id="${escapeHtml(adBlueprint.id)}" ${rows.length ? "" : "disabled"}>Configure routing</button>
        </div>
        ${
          rows.length
            ? `<div class="inline-table-shell">
                <table class="compact-table creative-routing-table">
                  <thead>
                    <tr>
                      <th style="width: 17%">Audience</th>
                      <th style="width: 15%">Schedule</th>
                      <th style="width: 14%">Category</th>
                      <th style="width: 10%">Age</th>
                      <th style="width: 22%">Headline</th>
                      <th style="width: 12%">CTA</th>
                      <th style="width: 10%">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${rows.map((row) => renderCreativeVariantRoutingRow(workspace, adBlueprint, row)).join("")}
                  </tbody>
                </table>
              </div>`
            : '<div class="table-empty"><strong>No Automation feed rows available for this Ad Blueprint.</strong><span>Turn on Ad Automation and select the prototype Automation feed to preview routing rows.</span></div>'
        }
      </section>
    `;
  }

  function renderCreativeVariantRoutingRow(workspace, adBlueprint, row) {
    const assignment = variantRoutingAssignmentFor(workspace, adBlueprint, row);
    const stateItem = variantRoutingStatus(workspace, assignment);
    return `
      <tr>
        <td>${renderAudienceAssignmentChips(workspace, assignment, 3)}</td>
        <td>${escapeHtml(scheduleAssignmentName(workspace, assignment.scheduleId))}</td>
        <td>${escapeHtml(row.category || "Not set")}</td>
        <td>${escapeHtml(row.age || "Not set")}</td>
        <td><span class="truncate">${escapeHtml(row.headline || "Not set")}</span></td>
        <td>${escapeHtml(row.cta || "Not set")}</td>
        <td>${chip(stateItem.label, stateItem.style)}</td>
      </tr>
    `;
  }

  function routingModalDetails() {
    const workspace = currentWorkspace();
    const modal = state.routingModal;
    if (!workspace || !modal) return {};
    const placement = findPlacement(workspace, modal.placementId);
    const adBlueprint = placement ? findAdBlueprint(workspace, modal.placementId, modal.adBlueprintId) : null;
    return { workspace, placement, adBlueprint };
  }

  function routingDraftAssignment(feedRowId) {
    return (state.routingModal?.assignments || []).find((assignment) => assignment.feedRowId === feedRowId) || {
      feedRowId,
      audienceTargetingIds: [],
      scheduleId: "",
      status: "Needs setup",
    };
  }

  function routingDraftStatus(workspace, assignment) {
    if (!audienceTargetingIdsForAssignment(assignment).length) return { label: "Needs setup", style: "yellow" };
    return variantRoutingStatus(workspace, { ...assignment, status: "Complete" });
  }

  function renderScheduleOptions(workspace, selectedId) {
    const schedules = targetingLibrary(workspace).deliverySchedules;
    return [
      `<option value="" ${!selectedId ? "selected" : ""}>Any schedule</option>`,
      ...schedules.map((schedule) => `<option value="${escapeHtml(schedule.id)}" ${schedule.id === selectedId ? "selected" : ""}>${escapeHtml(schedule.name)}</option>`),
    ].join("");
  }

  function renderCreativeVariantRoutingModal() {
    const { workspace, adBlueprint } = routingModalDetails();
    if (!workspace || !adBlueprint) return "";
    const rows = automationFeedRowsForAdBlueprint(adBlueprint);
    const audienceTargets = targetingLibrary(workspace).audienceTargets;
    const selectedIds = new Set(state.routingModal.selectedFeedRowIds || []);
    const missingCount = (state.routingModal.assignments || []).filter((assignment) => !audienceTargetingIdsForAssignment(assignment).length).length;
    return `
      <div class="modal-overlay" role="presentation" data-action="cancel-routing-modal">
        <section class="modal routing-modal" role="dialog" aria-modal="true" aria-labelledby="routingModalTitle">
          <header class="modal-head">
            <div>
              <h2 id="routingModalTitle">Configure Creative Variant Routing</h2>
              <p>Assign Campaign Blueprint audiences and schedules to Automation feed rows. Multiple audiences in one row use OR logic.</p>
            </div>
            <button class="modal-close" type="button" aria-label="Close" data-action="cancel-routing-modal">&times;</button>
          </header>
          <div class="modal-body routing-modal-body">
            ${
              !audienceTargets.length
                ? '<div class="validation-list has-issues"><div class="validation-item">Create Audience Targeting in Campaign Blueprint before assigning audiences.</div></div>'
                : ""
            }
            <div class="readonly-box">
              <strong>Routing status</strong>
              <span>${missingCount ? "Resolve rows with missing audience assignments before campaign handoff." : "All visible rows have audience assignments."}</span>
            </div>
            ${renderRoutingBulkControls(workspace, selectedIds)}
            ${
              rows.length
                ? `<div class="inline-table-shell">
                    <table class="compact-table routing-modal-table">
                      <thead>
                        <tr>
                          <th style="width: 6%">Select</th>
                          <th style="width: 17%">Audience</th>
                          <th style="width: 15%">Schedule</th>
                          <th style="width: 13%">Category</th>
                          <th style="width: 8%">Age</th>
                          <th style="width: 20%">Headline</th>
                          <th style="width: 10%">CTA</th>
                          <th style="width: 11%">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        ${rows.map((row) => renderRoutingModalRow(workspace, row, selectedIds)).join("")}
                      </tbody>
                    </table>
                  </div>`
                : '<div class="table-empty"><strong>No Automation feed rows available for this Ad Blueprint.</strong><span>Turn on Ad Automation and select the prototype Automation feed to configure routing.</span></div>'
            }
          </div>
          <footer class="modal-footer">
            <button class="ghost-button" type="button" data-action="cancel-routing-modal">Cancel</button>
            <button class="primary-button" type="button" data-action="save-routing-modal">Save routing</button>
          </footer>
        </section>
      </div>
    `;
  }

  function renderRoutingBulkControls(workspace, selectedIds) {
    const audienceTargets = targetingLibrary(workspace).audienceTargets;
    return `
      <section class="routing-bulk-bar" aria-label="Bulk assignment controls">
        <label class="table-field">
          <span>Bulk Audience</span>
          ${audienceTargets.length ? renderAudienceSelectorTrigger(workspace, "bulk", "", state.routingModal.bulkAudienceTargetingIds || []) : '<button class="routing-audience-trigger" type="button" disabled>Select audiences</button>'}
          <small>${audienceTargets.length ? `${selectedIds.size} selected row${selectedIds.size === 1 ? "" : "s"}. Multiple audiences use OR logic.` : "Create Audience Targeting in Campaign Blueprint before assigning audiences."}</small>
        </label>
        <label class="table-field">
          <span>Bulk Schedule</span>
          <select data-action="select-routing-bulk-schedule">
            ${renderScheduleOptions(workspace, state.routingModal.bulkScheduleId)}
          </select>
          <small>Schedule is optional. Any schedule is allowed.</small>
        </label>
        <button class="secondary-button" type="button" data-action="apply-routing-bulk" ${selectedIds.size ? "" : "disabled"}>Apply to selected rows</button>
      </section>
    `;
  }

  function renderRoutingModalRow(workspace, row, selectedIds) {
    const assignment = routingDraftAssignment(row.id);
    const stateItem = routingDraftStatus(workspace, assignment);
    const audienceTargets = targetingLibrary(workspace).audienceTargets;
    return `
      <tr>
        <td><input type="checkbox" data-action="toggle-routing-row" value="${escapeHtml(row.id)}" ${selectedIds.has(row.id) ? "checked" : ""} /></td>
        <td>
          <label class="table-field">
            ${audienceTargets.length ? renderAudienceSelectorTrigger(workspace, "row", row.id, audienceTargetingIdsForAssignment(assignment)) : '<button class="routing-audience-trigger" type="button" disabled>Select audiences</button>'}
          </label>
        </td>
        <td>
          <label class="table-field">
            <select data-action="select-routing-row-schedule" data-feed-row-id="${escapeHtml(row.id)}">
              ${renderScheduleOptions(workspace, assignment.scheduleId)}
            </select>
          </label>
        </td>
        <td>${escapeHtml(row.category || "Not set")}</td>
        <td>${escapeHtml(row.age || "Not set")}</td>
        <td><span class="truncate">${escapeHtml(row.headline || "Not set")}</span></td>
        <td>${escapeHtml(row.cta || "Not set")}</td>
        <td>${chip(stateItem.label, stateItem.style)}</td>
      </tr>
    `;
  }

  function renderTargetingRulesPanel(workspace, placement, adBlueprint) {
    const rules = adBlueprint.targetingRules || [];
    const library = targetingLibrary(workspace);
    const libraryMessages = [
      !library.audienceTargets.length ? "Create Audience Targeting in Campaign Blueprint before using it here." : "",
    ].filter(Boolean);
    const issues = validation?.validatePrototypeTargetingRules
      ? validation.validatePrototypeTargetingRules(workspace, referenceData()).filter((issue) => issue.id.includes(adBlueprint.id))
      : [];
    return `
      <section class="subsection-panel" aria-label="Creative Routing Rules">
        <div class="subsection-head">
          <div>
            <h3>Creative Routing Rules</h3>
            <p>Routes Campaign Blueprint audience inputs and optional schedules to Automation feed variant filters. Lower priority wins.</p>
          </div>
          <button class="secondary-button" type="button" data-action="add-targeting-rule" data-placement-id="${escapeHtml(placement.id)}" data-ad-id="${escapeHtml(adBlueprint.id)}">Add routing rule</button>
        </div>
        ${libraryMessages.length ? `<div class="readonly-box"><strong>Campaign Blueprint values</strong><span>${libraryMessages.map(escapeHtml).join(" ")}</span></div>` : ""}
        ${
          rules.length
            ? `<div class="inline-table-shell">
                <table class="compact-table targeting-rules-table">
                  <thead>
                    <tr>
                      <th style="width: 15%">Rule name</th>
                      <th style="width: 18%">Targeting logic</th>
                      <th style="width: 13%">Schedule</th>
                      <th style="width: 22%">Creative variant filter</th>
                      <th style="width: 9%">Matching variants</th>
                      <th style="width: 8%">Priority</th>
                      <th style="width: 8%">Status</th>
                      <th style="width: 7%">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${rules.map((rule) => renderTargetingRuleRows(workspace, placement, adBlueprint, rule)).join("")}
                  </tbody>
                </table>
              </div>`
            : '<div class="table-empty"><strong>No creative routing rules configured.</strong><span>Add a routing rule to map Campaign Blueprint audience inputs to Automation feed variants.</span></div>'
        }
        ${renderValidationList(issues, rules.length ? "Creative Routing Rules are configured." : "")}
      </section>
    `;
  }

  function renderTargetingRuleRows(workspace, placement, adBlueprint, rule) {
    const stateItem = targetingRuleState(workspace, adBlueprint, rule);
    return `
      <tr>
        <td>
          <label class="table-field">
            <input type="text" data-action="edit-targeting-rule-name" data-placement-id="${escapeHtml(placement.id)}" data-ad-id="${escapeHtml(adBlueprint.id)}" data-rule-id="${escapeHtml(rule.id)}" value="${escapeHtml(rule.name || "")}" placeholder="Rule name" />
          </label>
        </td>
        <td>${escapeHtml(targetingLogicSummary(workspace, rule))}</td>
        <td>${escapeHtml(routingScheduleName(workspace, rule))}</td>
        <td>${escapeHtml(routingCreativeFilterSummary(rule))}</td>
        <td>${creativeRoutingMatchCount(rule)}</td>
        <td>${escapeHtml(rule.priority || "Not set")}</td>
        <td>${chip(stateItem.label, stateItem.style)}</td>
        <td>
          <div class="row-actions">
            <button class="text-button danger" type="button" data-action="delete-targeting-rule" data-placement-id="${escapeHtml(placement.id)}" data-ad-id="${escapeHtml(adBlueprint.id)}" data-rule-id="${escapeHtml(rule.id)}">Delete</button>
          </div>
        </td>
      </tr>
      <tr class="targeting-builder-row">
        <td colspan="8">
          ${renderTargetingRuleBuilder(workspace, placement, adBlueprint, rule)}
        </td>
      </tr>
    `;
  }

  function renderTargetingRuleBuilder(workspace, placement, adBlueprint, rule) {
    const library = targetingLibrary(workspace);
    const audienceEmpty = !library.audienceTargets.length;
    const audienceCondition = (rule.conditions || []).find((condition) => condition.type === "audience") || { id: "", type: "audience", valueIds: [] };
    const filter = rule.creativeVariantFilter || {};
    const valueDisabled = filter.operator === "is_not_empty";
    return `
      <div class="targeting-builder">
        ${
          audienceEmpty
            ? `<div class="readonly-box">
                <strong>Campaign Blueprint library</strong>
                <span>Create Audience Targeting in Campaign Blueprint before using it here.</span>
              </div>`
            : ""
        }
        <div class="routing-editor-grid">
          <label class="field">
            <span>Rule type</span>
            <select disabled>
              <option>Audience targeting</option>
            </select>
            <small>Audience Targeting is the supported routing input for this phase.</small>
          </label>
          <label class="field">
            <span>Audience values</span>
            <select multiple size="4" data-action="select-targeting-condition-values" data-placement-id="${escapeHtml(placement.id)}" data-ad-id="${escapeHtml(adBlueprint.id)}" data-rule-id="${escapeHtml(rule.id)}" data-condition-id="${escapeHtml(audienceCondition.id)}" ${audienceEmpty ? "disabled" : ""}>
              ${renderMultiOptions(library.audienceTargets, audienceCondition.valueIds)}
            </select>
            <small>${audienceEmpty ? "Create Audience Targeting in Campaign Blueprint before using it here." : "Multiple audience values are OR."}</small>
          </label>
          <label class="field">
            <span>Schedule</span>
            <select data-action="select-routing-schedule" data-placement-id="${escapeHtml(placement.id)}" data-ad-id="${escapeHtml(adBlueprint.id)}" data-rule-id="${escapeHtml(rule.id)}">
              <option value="" ${!rule.scheduleId ? "selected" : ""}>Any schedule</option>
              ${library.deliverySchedules.map((schedule) => `<option value="${escapeHtml(schedule.id)}" ${schedule.id === rule.scheduleId ? "selected" : ""}>${escapeHtml(schedule.name)}</option>`).join("")}
            </select>
            <small>${library.deliverySchedules.length ? "Schedule is optional and evaluated with targeting logic." : "No Delivery Schedules exist yet. Any schedule remains available."}</small>
          </label>
          <label class="field">
            <span>Automation feed field</span>
            <select data-action="select-routing-feed-field" data-placement-id="${escapeHtml(placement.id)}" data-ad-id="${escapeHtml(adBlueprint.id)}" data-rule-id="${escapeHtml(rule.id)}">
              ${renderOptions(getAutomationFeedFields(), filter.feedField, "Select feed field")}
            </select>
          </label>
          <label class="field">
            <span>Condition</span>
            <select data-action="select-routing-operator" data-placement-id="${escapeHtml(placement.id)}" data-ad-id="${escapeHtml(adBlueprint.id)}" data-rule-id="${escapeHtml(rule.id)}">
              ${renderOptions(
                [
                  { id: "equals", name: "equals" },
                  { id: "contains", name: "contains" },
                  { id: "starts_with", name: "starts with" },
                  { id: "is_not_empty", name: "is not empty" },
                ],
                filter.operator,
                "Select condition"
              )}
            </select>
          </label>
          <label class="field">
            <span>Value</span>
            <input type="text" data-action="edit-routing-filter-value" data-placement-id="${escapeHtml(placement.id)}" data-ad-id="${escapeHtml(adBlueprint.id)}" data-rule-id="${escapeHtml(rule.id)}" value="${escapeHtml(filter.value || "")}" placeholder="${valueDisabled ? "Not required" : "Filter value"}" ${valueDisabled ? "disabled" : ""} />
          </label>
          <label class="field">
            <span>Priority</span>
            <input type="number" min="1" step="1" data-action="edit-routing-priority" data-placement-id="${escapeHtml(placement.id)}" data-ad-id="${escapeHtml(adBlueprint.id)}" data-rule-id="${escapeHtml(rule.id)}" value="${escapeHtml(rule.priority || "")}" placeholder="1" />
            <small>Lower priority number wins when multiple rules match.</small>
          </label>
          <div class="readonly-box">
            <strong>Matching variants</strong>
            <span>${creativeRoutingMatchCount(rule)} Automation feed row${creativeRoutingMatchCount(rule) === 1 ? "" : "s"} match the creative variant filter.</span>
          </div>
        </div>
      </div>
    `;
  }

  function renderStudioProfileMappingPanel(workspace, placement, adBlueprint) {
    if (adBlueprint.adType !== "rich_media_dco") {
      return `
        <section class="subsection-panel" aria-label="Studio Profile Mapping">
          <div class="subsection-head">
            <div>
              <h3>Studio Profile Mapping</h3>
              <p>Studio Profile Mapping is only required for Rich Media DCO.</p>
            </div>
            ${chip("Not required", "gray")}
          </div>
        </section>
      `;
    }

    const config = adBlueprint.richMediaDcoConfig || {};
    const studioAdvertiser = getStudioAdvertisers(workspace.cmAdvertiserId).find((advertiser) => advertiser.id === config.studioAdvertiserId);
    const studioCampaign = getStudioCampaigns(config.studioAdvertiserId).find((campaign) => campaign.id === config.studioCampaignId);
    const dcoComplete = Boolean(studioAdvertiser && studioCampaign && (config.htmlCreatives || []).length);
    if (!dcoComplete) {
      return `
        <section class="subsection-panel" aria-label="Studio Profile Mapping">
          <div class="subsection-head">
            <div>
              <h3>Studio Profile Mapping</h3>
              <p>Studio field mapping shell for Rich Media DCO Ad Blueprints.</p>
            </div>
            ${chip("Needs setup", "yellow")}
          </div>
          <div class="table-empty">
            <strong>Complete Rich Media DCO setup before configuring Studio Profile Mapping.</strong>
            <span>Select a Studio Advertiser, Studio Campaign, and at least one HTML Creative first.</span>
          </div>
        </section>
      `;
    }

    const rows = getStudioProfileMappingRows(adBlueprint);
    const stateItem = studioMappingState(rows, adBlueprint);
    return `
      <section class="subsection-panel" aria-label="Studio Profile Mapping">
        <div class="subsection-head">
          <div>
            <h3>Studio Profile Mapping</h3>
            <p>Prototype shell only. No real Studio Profile API connection is made.</p>
          </div>
          ${chip(stateItem.label, stateItem.style)}
        </div>
        <div class="placement-summary-grid">
          <div><span>Studio Advertiser</span><strong>${escapeHtml(studioAdvertiser?.name || "Not selected")}</strong></div>
          <div><span>Studio Campaign</span><strong>${escapeHtml(studioCampaign?.name || "Not selected")}</strong></div>
          <div><span>HTML Creatives</span><strong>${(config.htmlCreatives || []).length}</strong></div>
        </div>
        <div class="inline-table-shell">
          <table class="compact-table studio-map-table">
            <thead>
              <tr>
                <th style="width: 20%">Studio field</th>
                <th style="width: 20%">Source</th>
                <th style="width: 24%">Suggested mapping</th>
                <th style="width: 16%">Status</th>
                <th style="width: 20%">Action</th>
              </tr>
            </thead>
            <tbody>
              ${rows.map((row) => renderStudioProfileMappingRow(placement, adBlueprint, row)).join("")}
            </tbody>
          </table>
        </div>
      </section>
    `;
  }

  function renderStudioProfileMappingRow(placement, adBlueprint, row) {
    const style = row.status === "Auto-mapped" || row.status === "Complete" ? "green" : row.status === "Missing" ? "red" : "yellow";
    return `
      <tr>
        <td><span class="workspace-name">${escapeHtml(row.studioField)}</span></td>
        <td>${escapeHtml(row.source)}</td>
        <td><span class="truncate">${escapeHtml(row.suggestedMapping)}</span></td>
        <td>${chip(row.status, style)}</td>
        <td>
          ${
            row.status === "Needs review"
              ? `<button class="text-button" type="button" data-action="mark-studio-mapping-reviewed" data-placement-id="${escapeHtml(placement.id)}" data-ad-id="${escapeHtml(adBlueprint.id)}" data-row-id="${escapeHtml(row.id)}">Mark reviewed</button>`
              : '<span class="muted-text">No action</span>'
          }
        </td>
      </tr>
    `;
  }

  function renderPlaceholderCard(config) {
    return `
      <section class="content-card">
        <header class="card-head">
          <div>
            <h2>${escapeHtml(config.title)}</h2>
            <p>${escapeHtml(config.description)}</p>
          </div>
        </header>
        <div class="placeholder-table">
          ${config.rows
            .map(
              ([label, value]) => `
                <div class="placeholder-row">
                  <span>${escapeHtml(label)}</span>
                  <strong>${escapeHtml(value)}</strong>
                </div>
              `
            )
            .join("")}
        </div>
        <div class="callout">
          <strong>Configuration placeholder</strong>
          <span>Detailed setup remains unavailable until the required blueprint information is ready.</span>
        </div>
      </section>
    `;
  }

  function renderCreateModal() {
    const platforms = [
      { name: "Meta", icon: "./assets/platforms/Meta.png", fallback: "M" },
      { name: "Google Ads", icon: "./assets/platforms/GoogleAds.png", fallback: "G" },
      { name: "TikTok", fallback: "T" },
      { name: "Snapchat", fallback: "S" },
      { name: "Pinterest", icon: "./assets/platforms/Pinterest.png", fallback: "P" },
      { name: "Reddit", icon: "./assets/platforms/Reddit.png", fallback: "r" },
      { name: "Amazon DSP", icon: "./assets/platforms/Amazon.png", fallback: "a" },
      { name: "X", fallback: "X" },
      { name: "Spotify", fallback: "S" },
      { name: "LinkedIn", icon: "./assets/platforms/Linkedin.png", fallback: "in" },
      { name: "CM360", icon: "./assets/platforms/CM360.png", fallback: "CM" },
    ];
    return `
      <div class="modal-overlay" role="presentation" data-action="close-create">
        <section class="modal create-workspace-modal" role="dialog" aria-modal="true" aria-labelledby="createWorkspaceTitle">
          <header class="modal-head">
            <h2 id="createWorkspaceTitle">Create Workspace</h2>
            <button class="modal-close" type="button" aria-label="Close" data-action="close-create">&times;</button>
          </header>
          <div class="modal-body">
            <section class="modal-section platform-section" aria-label="Platform selector">
              <div class="platform-strip">
                ${platforms
                  .map((platform) => {
                    const selected = state.createPlatform === platform.name;
                    return `
                      <button class="platform-option ${selected ? "active" : ""}" type="button" data-action="select-create-platform" data-platform="${escapeHtml(platform.name)}">
                        <span class="platform-icon" aria-hidden="true">
                          ${platform.icon ? `<img src="${escapeHtml(platform.icon)}" alt="" />` : escapeHtml(platform.fallback)}
                        </span>
                        <span>${escapeHtml(platform.name)}</span>
                      </button>
                    `;
                  })
                  .join("")}
              </div>
            </section>
            <section class="modal-section">
              <label class="field create-name-field" for="newWorkspaceName">
                <span>Workspace name</span>
                <input id="newWorkspaceName" type="text" value="${escapeHtml(state.createName)}" placeholder="New workspace" />
              </label>
              <div class="field-error" role="alert">${escapeHtml(state.createError)}</div>
            </section>
            <section class="modal-section defaults-section">
              <div>
                <h3>Choose Workspace Defaults</h3>
                <p>Ensure accurate taxonomy and faster setup with workspace defaults for naming, tracking, accounts, and more.</p>
              </div>
              <div class="defaults-row">
                <label class="field defaults-select-field">
                  <span>Workspace defaults</span>
                  <select>
                    <option>No defaults</option>
                  </select>
                </label>
                <button class="text-button" type="button" data-action="create-default-placeholder">Create New Default</button>
              </div>
            </section>
          </div>
          <footer class="modal-footer">
            <button class="ghost-button" type="button" data-action="close-create">Cancel</button>
            <button class="primary-button" type="button" data-action="create-workspace">Create Workspace</button>
          </footer>
        </section>
      </div>
    `;
  }

  function renderTargetingLibraryModal() {
    if (!state.libraryModal) return "";
    if (state.libraryModal.type === "audience-choice") return renderAudienceTargetingChoiceModal();
    if (state.libraryModal.type === "audience-csv") return renderAudienceCsvModal();
    return state.libraryModal.type === "schedule" ? renderDeliveryScheduleModal() : renderAudienceTargetingModal();
  }

  function renderAudienceTargetingChoiceModal() {
    return `
      <div class="modal-overlay" role="presentation" data-action="cancel-library-modal">
        <section class="modal library-choice-modal" role="dialog" aria-modal="true" aria-labelledby="audienceChoiceModalTitle">
          <header class="modal-head">
            <div>
              <h2 id="audienceChoiceModalTitle">Add audience set</h2>
              <p>Create a single set manually or import multiple DV360 Line Item ID sets from CSV.</p>
            </div>
            <button class="modal-close" type="button" aria-label="Close" data-action="cancel-library-modal">&times;</button>
          </header>
          <div class="modal-body library-modal-body">
            <div class="choice-grid">
              <button class="choice-card" type="button" data-action="choose-audience-create-manual">
                <strong>Create audience set</strong>
                <span>Enter targeting name, ID Type, and comma-separated values.</span>
              </button>
              <button class="choice-card" type="button" data-action="choose-audience-upload-csv">
                <strong>Upload CSV</strong>
                <span>Create audience sets from Segment Name and DV360 Line Item ID columns.</span>
              </button>
            </div>
          </div>
        </section>
      </div>
    `;
  }

  function renderAudienceCsvModal() {
    const modal = state.libraryModal || {};
    const draft = modal.draft || {};
    const errors = modal.errors || [];
    const rows = draft.rows || [];
    const validRows = rows.filter((row) => row.valid);
    return `
      <div class="modal-overlay" role="presentation" data-action="cancel-library-modal">
        <section class="modal library-modal csv-upload-modal" role="dialog" aria-modal="true" aria-labelledby="audienceCsvModalTitle">
          <header class="modal-head">
            <div>
              <h2 id="audienceCsvModalTitle">Upload audience sets</h2>
              <p>Upload a CSV with Segment Name and DV360 Line Item ID columns.</p>
            </div>
            <button class="modal-close" type="button" aria-label="Close" data-action="cancel-library-modal">&times;</button>
          </header>
          <div class="modal-body library-modal-body">
            ${renderLibraryModalErrors(errors)}
            <div class="csv-requirements" aria-label="Required CSV columns">
              <strong>Required columns</strong>
              <span>Segment Name</span>
              <span>DV360 Line Item ID</span>
            </div>
            <label class="field">
              <span>CSV file</span>
              <input type="file" accept=".csv,text/csv" data-action="select-audience-csv" />
              <small>${draft.fileName ? `Selected file: ${escapeHtml(draft.fileName)}` : "CSV is parsed locally in this browser. Nothing is uploaded to a server."}</small>
            </label>
            ${
              rows.length
                ? `<div class="csv-preview-shell">
                    <div class="subsection-head compact-subsection-head">
                      <div>
                        <h3>Preview</h3>
                        <p>${validRows.length} valid row${validRows.length === 1 ? "" : "s"} ready to create.</p>
                      </div>
                    </div>
                    <div class="inline-table-shell">
                      <table class="compact-table csv-preview-table">
                        <thead>
                          <tr>
                            <th style="width: 36%">Segment Name</th>
                            <th style="width: 34%">DV360 Line Item ID</th>
                            <th style="width: 30%">Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          ${rows.map((row) => renderAudienceCsvPreviewRow(row)).join("")}
                        </tbody>
                      </table>
                    </div>
                  </div>`
                : '<div class="table-empty compact-empty"><strong>No CSV preview yet.</strong><span>Choose a .csv file to preview audience sets before creating them.</span></div>'
            }
          </div>
          <footer class="modal-footer">
            <button class="ghost-button" type="button" data-action="cancel-library-modal">Cancel</button>
            <button class="primary-button" type="button" data-action="create-audience-csv-sets" ${validRows.length ? "" : "disabled"}>Create audience sets</button>
          </footer>
        </section>
      </div>
    `;
  }

  function renderAudienceCsvPreviewRow(row) {
    const status = row.valid ? (row.warning ? chip("Warning", "yellow") : chip("Valid", "green")) : chip("Invalid", "red");
    return `
      <tr>
        <td>${escapeHtml(row.segmentName || "-")}</td>
        <td>${escapeHtml(row.lineItemId || "-")}</td>
        <td>
          <div class="csv-status-cell">
            ${status}
            <span>${escapeHtml(row.message || "")}</span>
          </div>
        </td>
      </tr>
    `;
  }

  function renderAudienceTargetingModal() {
    const modal = state.libraryModal || {};
    const draft = modal.draft || {};
    const errors = modal.errors || [];
    const dynamicPlaceholder = draft.idType === "CM360 Dynamic Targeting Keys" ? "audience=movie, segment=sports" : "Add comma-separated values";
    return `
      <div class="modal-overlay" role="presentation" data-action="cancel-library-modal">
        <section class="modal library-modal" role="dialog" aria-modal="true" aria-labelledby="audienceTargetingModalTitle">
          <header class="modal-head">
            <div>
              <h2 id="audienceTargetingModalTitle">${modal.mode === "edit" ? "Edit audience set" : "Add audience set"}</h2>
              <p>Create reusable identifiers for Ad Blueprint routing.</p>
            </div>
            <button class="modal-close" type="button" aria-label="Close" data-action="cancel-library-modal">&times;</button>
          </header>
          <div class="modal-body library-modal-body">
            ${renderLibraryModalErrors(errors)}
            <label class="field">
              <span>Targeting name</span>
              <input type="text" data-action="edit-audience-modal-name" value="${escapeHtml(draft.name || "")}" placeholder="High-value shoppers" />
            </label>
            <label class="field">
              <span>ID Type</span>
              <select data-action="select-audience-modal-id-type">
                ${renderOptions(audienceTargetingIdTypes(), draft.idType, "Select ID Type")}
              </select>
            </label>
            <label class="field">
              <span>Values</span>
              <div class="audience-values-field ${state.feedMacroTargetId === "audience-modal" ? "menu-open" : ""}">
                <input type="text" data-action="edit-audience-modal-values" value="${escapeHtml(draft.values || "")}" placeholder="${escapeHtml(dynamicPlaceholder)}" />
                <button class="feed-macro-button" type="button" data-action="toggle-feed-macro-menu" data-target-id="audience-modal">From feed</button>
                ${
                  state.feedMacroTargetId === "audience-modal"
                    ? `<div class="feed-macro-popover" role="menu">
                        <button type="button" data-action="insert-feed-macro" data-target-id="audience-modal" data-macro="{{feed.Audience}}">{{feed.Audience}}</button>
                        <button type="button" data-action="insert-feed-macro" data-target-id="audience-modal" data-macro="{{feed.Geo}}">{{feed.Geo}}</button>
                      </div>`
                    : ""
                }
              </div>
              <small>${draft.idType === "CM360 Dynamic Targeting Keys" ? "Use key=value rows as comma-separated prototype values." : "Enter multiple values separated by commas."}</small>
            </label>
          </div>
          <footer class="modal-footer">
            <button class="ghost-button" type="button" data-action="cancel-library-modal">Cancel</button>
            <button class="primary-button" type="button" data-action="save-library-modal">Save audience set</button>
          </footer>
        </section>
      </div>
    `;
  }

  function renderDeliveryScheduleModal() {
    const modal = state.libraryModal || {};
    const draft = modal.draft || {};
    const errors = modal.errors || [];
    const selectedDays = new Set(arrayFromValues(draft.days));
    return `
      <div class="modal-overlay" role="presentation" data-action="cancel-library-modal">
        <section class="modal library-modal" role="dialog" aria-modal="true" aria-labelledby="deliveryScheduleModalTitle">
          <header class="modal-head">
            <div>
              <h2 id="deliveryScheduleModalTitle">${modal.mode === "edit" ? "Edit schedule" : "Add schedule"}</h2>
              <p>Create reusable delivery windows for Ad Blueprint routing.</p>
            </div>
            <button class="modal-close" type="button" aria-label="Close" data-action="cancel-library-modal">&times;</button>
          </header>
          <div class="modal-body library-modal-body">
            ${renderLibraryModalErrors(errors)}
            <label class="field">
              <span>Schedule name</span>
              <input type="text" data-action="edit-schedule-modal-name" value="${escapeHtml(draft.name || "")}" placeholder="Weekday evenings" />
            </label>
            <div class="modal-field-grid">
              <label class="field">
                <span>Timezone</span>
                <input type="text" data-action="edit-schedule-modal-timezone" value="${escapeHtml(draft.timezone || "")}" placeholder="Europe/Helsinki" />
              </label>
              <label class="field">
                <span>Quick filter</span>
                <select data-action="select-schedule-modal-quick-filter">
                  ${renderOptions(deliveryQuickFilters(), draft.quickFilter, "No quick filter")}
                </select>
              </label>
            </div>
            <div class="modal-field-grid">
              <label class="field">
                <span>Start date</span>
                <input type="date" data-action="edit-schedule-modal-start" value="${escapeHtml(draft.startDate || "")}" />
              </label>
              <label class="field">
                <span>End date</span>
                <input type="date" data-action="edit-schedule-modal-end" value="${escapeHtml(draft.endDate || "")}" />
              </label>
            </div>
            <div class="field">
              <span>Custom days</span>
              <div class="day-checkbox-grid">
                ${deliveryDays()
                  .map(
                    (day) => `
                      <label>
                        <input type="checkbox" data-action="toggle-schedule-modal-day" value="${escapeHtml(day.id)}" ${selectedDays.has(day.id) ? "checked" : ""} />
                        ${escapeHtml(day.name)}
                      </label>
                    `
                  )
                  .join("")}
              </div>
            </div>
            <label class="field">
              <span>Custom time of day</span>
              <input type="text" data-action="edit-schedule-modal-time" value="${escapeHtml(draft.timeOfDay || "")}" placeholder="18:00-23:59" />
            </label>
          </div>
          <footer class="modal-footer">
            <button class="ghost-button" type="button" data-action="cancel-library-modal">Cancel</button>
            <button class="primary-button" type="button" data-action="save-library-modal">Save schedule</button>
          </footer>
        </section>
      </div>
    `;
  }

  function renderLibraryModalErrors(errors) {
    if (!errors || !errors.length) return "";
    return `
      <div class="validation-list has-issues" role="alert">
        ${errors.map((error) => `<div class="validation-item">${escapeHtml(error)}</div>`).join("")}
      </div>
    `;
  }

  function createWorkspace() {
    const name = state.createName.trim();
    if (!name) {
      state.createError = "Workspace name is required.";
      render();
      return;
    }

    let workspace;
    if (adapter && typeof adapter.createPrototypeWorkspace === "function") {
      workspace = adapter.createPrototypeWorkspace({ name });
      refreshWorkspaces();
    } else {
      workspace = {
        id: `cm360-workspace-${Date.now()}`,
        name,
        status: "Draft",
        statusStyle: "gray",
        advertiser: "CM360 Advertiser not selected",
        campaign: "CM360 Campaign not selected",
        updatedAt: "Saved just now",
        owner: "Media Ops",
        placements: "0 selected",
        adBlueprints: "0",
        validationIssues: 2,
        campaignBlueprint: {
          id: "campaign-blueprint",
          name: "",
          status: "Needs setup",
          statusStyle: "yellow",
        },
        placementsTree: [],
        publishingStatus: "Not started",
      };
      state.workspaces.unshift(workspace);
    }

    state.selectedWorkspaceId = workspace.id;
    state.selectedNode = { type: "campaign" };
    state.expandedNodes = new Set(["campaign"]);
    state.createOpen = false;
    state.createName = "";
    state.createError = "";
    state.view = "detail";
    showToast("Workspace created.");
    render();
  }

  function deleteWorkspace(id) {
    const workspace = state.workspaces.find((item) => item.id === id);
    if (adapter && typeof adapter.deletePrototypeWorkspace === "function") {
      adapter.deletePrototypeWorkspace(id);
      refreshWorkspaces();
    } else {
      state.workspaces = state.workspaces.filter((item) => item.id !== id);
    }
    if (state.selectedWorkspaceId === id) {
      state.selectedWorkspaceId = state.workspaces[0] ? state.workspaces[0].id : "";
      state.view = "list";
    }
    showToast(workspace ? "Workspace deleted." : "Workspace removed.");
    render();
  }

  function markAutosaving() {
    setAutosaveSaving();
  }

  function updateCampaignSelection(cmAdvertiserId, cmCampaignId) {
    const workspace = currentWorkspace();
    if (!workspace) return;
    if (adapter && typeof adapter.updatePrototypeCampaign === "function") {
      adapter.updatePrototypeCampaign(workspace.id, { cmAdvertiserId, cmCampaignId });
      refreshWorkspaces();
    }
    state.selectedNode = { type: "campaign" };
    state.expandedNodes.add("campaign");
    markAutosaving();
    render();
  }

  function updateCampaignDv360Selection(input) {
    const workspace = currentWorkspace();
    if (!workspace) return;
    if (adapter && typeof adapter.updatePrototypeCampaignDv360 === "function") {
      adapter.updatePrototypeCampaignDv360(workspace.id, input);
      refreshWorkspaces();
    }
    state.selectedNode = { type: "campaign" };
    state.expandedNodes.add("campaign");
    markAutosaving();
    render();
  }

  function updatePlacementSelection(cmPlacementIds) {
    const workspace = currentWorkspace();
    if (!workspace) return;
    if (adapter && typeof adapter.updatePrototypePlacements === "function") {
      adapter.updatePrototypePlacements(workspace.id, cmPlacementIds);
      refreshWorkspaces();
    }
    syncSelectedNode(currentWorkspace());
    state.expandedNodes.add("campaign");
    markAutosaving();
    render();
  }

  function updateDv360Enabled(placementId, enabled) {
    const workspace = currentWorkspace();
    if (!workspace) return;
    if (adapter && typeof adapter.updatePrototypePlacementDv360Enabled === "function") {
      adapter.updatePrototypePlacementDv360Enabled(workspace.id, placementId, enabled);
      refreshWorkspaces();
    }
    state.selectedNode = { type: "placement", placementId };
    state.expandedNodes.add("campaign");
    state.expandedNodes.add(nodeKey("placement", placementId));
    markAutosaving();
    render();
  }

  function addDv360Row(placementId) {
    const workspace = currentWorkspace();
    if (!workspace) return;
    if (adapter && typeof adapter.addPrototypeDv360MappingRow === "function") {
      adapter.addPrototypeDv360MappingRow(workspace.id, placementId);
      refreshWorkspaces();
    }
    state.selectedNode = { type: "placement", placementId };
    markAutosaving();
    render();
  }

  function updateDv360Row(placementId, rowId, input) {
    const workspace = currentWorkspace();
    if (!workspace) return;
    if (adapter && typeof adapter.updatePrototypeDv360MappingRow === "function") {
      adapter.updatePrototypeDv360MappingRow(workspace.id, placementId, rowId, input);
      refreshWorkspaces();
    }
    state.selectedNode = { type: "placement", placementId };
    markAutosaving();
    render();
  }

  function removeDv360Row(placementId, rowId) {
    const workspace = currentWorkspace();
    if (!workspace) return;
    if (adapter && typeof adapter.removePrototypeDv360MappingRow === "function") {
      adapter.removePrototypeDv360MappingRow(workspace.id, placementId, rowId);
      refreshWorkspaces();
    }
    state.selectedNode = { type: "placement", placementId };
    markAutosaving();
    render();
  }

  function addAdBlueprint(placementId) {
    const workspace = currentWorkspace();
    if (!workspace) return;
    if (adapter && typeof adapter.addPrototypeAdBlueprint === "function") {
      const updated = adapter.addPrototypeAdBlueprint(workspace.id, placementId);
      refreshWorkspaces();
      const placement = updated?.placementsTree?.find((item) => item.id === placementId);
      const adBlueprint = placement?.adBlueprints?.[placement.adBlueprints.length - 1];
      if (adBlueprint) state.selectedNode = { type: "ad", placementId, adBlueprintId: adBlueprint.id };
    }
    state.expandedNodes.add("campaign");
    state.expandedNodes.add(nodeKey("placement", placementId));
    markAutosaving();
    render();
  }

  function duplicateAdBlueprint(placementId, adBlueprintId) {
    const workspace = currentWorkspace();
    if (!workspace) return;
    if (adapter && typeof adapter.duplicatePrototypeAdBlueprint === "function") {
      const updated = adapter.duplicatePrototypeAdBlueprint(workspace.id, placementId, adBlueprintId);
      refreshWorkspaces();
      const placement = updated?.placementsTree?.find((item) => item.id === placementId);
      const duplicate = placement?.adBlueprints?.[placement.adBlueprints.length - 1];
      if (duplicate) state.selectedNode = { type: "ad", placementId, adBlueprintId: duplicate.id };
    }
    state.expandedNodes.add("campaign");
    state.expandedNodes.add(nodeKey("placement", placementId));
    markAutosaving();
    render();
  }

  function deleteAdBlueprint(placementId, adBlueprintId) {
    const workspace = currentWorkspace();
    if (!workspace) return;
    if (adapter && typeof adapter.deletePrototypeAdBlueprint === "function") {
      adapter.deletePrototypeAdBlueprint(workspace.id, placementId, adBlueprintId);
      refreshWorkspaces();
    }
    if (state.selectedNode.type === "ad" && state.selectedNode.adBlueprintId === adBlueprintId) {
      state.selectedNode = { type: "placement", placementId };
    }
    markAutosaving();
    render();
  }

  function updateAdBlueprint(placementId, adBlueprintId, input) {
    const workspace = currentWorkspace();
    if (!workspace) return;
    if (adapter && typeof adapter.updatePrototypeAdBlueprint === "function") {
      adapter.updatePrototypeAdBlueprint(workspace.id, placementId, adBlueprintId, input);
      refreshWorkspaces();
    }
    state.selectedNode = { type: "ad", placementId, adBlueprintId };
    markAutosaving();
    render();
  }

  function currentDcoLayerMappings(placementId, adBlueprintId) {
    const workspace = currentWorkspace();
    const placement = workspace ? findPlacement(workspace, placementId) : null;
    const adBlueprint = placement ? findAdBlueprint(workspace, placementId, adBlueprintId) : null;
    return dcoLayerMappings(adBlueprint?.richMediaDcoConfig || {});
  }

  function updateDcoLayerMapping(placementId, adBlueprintId, layerId, input) {
    const currentMappings = currentDcoLayerMappings(placementId, adBlueprintId);
    const nextMappings = currentMappings.map((mapping) => {
      if (mapping.id !== layerId) return mapping;
      const next = { ...mapping, ...(input || {}) };
      if (input && Object.prototype.hasOwnProperty.call(input, "origin")) {
        const firstColumn = dcoFeedColumnsForOrigin(next.origin, "").find(Boolean);
        next.feedColumn = firstColumn?.id || "";
      }
      return next;
    });
    updateAdBlueprint(placementId, adBlueprintId, { richMediaDcoConfig: { layerMappings: nextMappings } });
  }

  function addDcoLayerMapping(placementId, adBlueprintId) {
    const currentMappings = currentDcoLayerMappings(placementId, adBlueprintId);
    const usedLayers = new Set(currentMappings.map((mapping) => mapping.templateLayer));
    const defaultMapping = defaultDcoLayerMappings().find((mapping) => !usedLayers.has(mapping.templateLayer)) || {
      templateLayer: "Title",
      origin: "product_feed",
      feedColumn: "title",
    };
    const nextMapping = {
      ...defaultMapping,
      id: `layer-${Date.now()}`,
    };
    updateAdBlueprint(placementId, adBlueprintId, { richMediaDcoConfig: { layerMappings: [...currentMappings, nextMapping] } });
  }

  function removeDcoLayerMapping(placementId, adBlueprintId, layerId) {
    const nextMappings = currentDcoLayerMappings(placementId, adBlueprintId).filter((mapping) => mapping.id !== layerId);
    updateAdBlueprint(placementId, adBlueprintId, { richMediaDcoConfig: { layerMappings: nextMappings } });
  }

  function updateCampaignAudienceTarget(targetId, input) {
    const workspace = currentWorkspace();
    if (!workspace || !adapter) return;
    if (typeof adapter.updatePrototypeAudienceTarget === "function") {
      adapter.updatePrototypeAudienceTarget(workspace.id, targetId, input);
      refreshWorkspaces();
    }
    state.selectedNode = { type: "campaign" };
    markAutosaving();
    render();
  }

  function appendFeedMacroToAudienceTarget(targetId, macro) {
    if (targetId === "audience-modal" && state.libraryModal?.type === "audience") {
      const draft = state.libraryModal.draft || {};
      const currentValues = arrayFromValues(draft.values);
      state.libraryModal.draft = {
        ...draft,
        values: [...currentValues, macro].join(", "),
      };
      state.libraryModal.errors = [];
      state.feedMacroTargetId = "";
      render();
      return;
    }
    const workspace = currentWorkspace();
    const target = workspace ? targetingLibrary(workspace).audienceTargets.find((item) => item.id === targetId) : null;
    if (!workspace || !target || !macro) return;
    const currentValues = Array.isArray(target.values) ? target.values.filter(Boolean) : [];
    if (adapter && typeof adapter.updatePrototypeAudienceTarget === "function") {
      adapter.updatePrototypeAudienceTarget(workspace.id, targetId, { values: [...currentValues, macro] });
      refreshWorkspaces();
    }
    state.feedMacroTargetId = "";
    state.selectedNode = { type: "campaign" };
    markAutosaving();
    render();
  }

  function updateCampaignDeliverySchedule(scheduleId, input) {
    const workspace = currentWorkspace();
    if (!workspace || !adapter) return;
    if (typeof adapter.updatePrototypeDeliverySchedule === "function") {
      adapter.updatePrototypeDeliverySchedule(workspace.id, scheduleId, input);
      refreshWorkspaces();
    }
    state.selectedNode = { type: "campaign" };
    markAutosaving();
    render();
  }

  function openAudienceTargetingModal(targetId) {
    const workspace = currentWorkspace();
    const target = workspace && targetId ? targetingLibrary(workspace).audienceTargets.find((item) => item.id === targetId) : null;
    state.feedMacroTargetId = "";
    state.libraryModal = {
      type: "audience",
      mode: target ? "edit" : "create",
      id: target?.id || "",
      errors: [],
      draft: {
        name: target?.name || "",
        idType: target?.idType || "DV360 Line Item ID",
        values: arrayFromValues(target?.values).join(", "),
      },
    };
    render();
  }

  function openAudienceTargetingChoiceModal() {
    state.feedMacroTargetId = "";
    state.libraryModal = {
      type: "audience-choice",
      errors: [],
    };
    render();
  }

  function openAudienceCsvModal() {
    state.feedMacroTargetId = "";
    state.libraryModal = {
      type: "audience-csv",
      errors: [],
      draft: {
        fileName: "",
        rows: [],
      },
    };
    render();
  }

  function openDeliveryScheduleModal(scheduleId) {
    const workspace = currentWorkspace();
    const schedule = workspace && scheduleId ? targetingLibrary(workspace).deliverySchedules.find((item) => item.id === scheduleId) : null;
    state.libraryModal = {
      type: "schedule",
      mode: schedule ? "edit" : "create",
      id: schedule?.id || "",
      errors: [],
      draft: {
        name: schedule?.name || "",
        timezone: schedule?.timezone || "America/New_York",
        startDate: schedule?.startDate || "",
        endDate: schedule?.endDate || "",
        quickFilter: schedule?.quickFilter || "",
        days: arrayFromValues(schedule?.days),
        timeOfDay: schedule?.timeOfDay || "",
      },
    };
    render();
  }

  function createAudienceTargetFromInput(workspaceId, input) {
    if (!adapter || typeof adapter.addPrototypeAudienceTarget !== "function") return;
    adapter.addPrototypeAudienceTarget(workspaceId, input);
  }

  function updateLibraryModalDraft(input) {
    if (!state.libraryModal) return;
    state.libraryModal.draft = { ...(state.libraryModal.draft || {}), ...(input || {}) };
    state.libraryModal.errors = [];
  }

  function validateAudienceTargetingDraft(draft) {
    const errors = [];
    if (!String(draft.name || "").trim()) errors.push("Targeting name is required.");
    if (!String(draft.idType || "").trim()) errors.push("ID Type is required.");
    if (!arrayFromValues(draft.values).length) errors.push("At least one value is required.");
    return errors;
  }

  function validateDeliveryScheduleDraft(draft) {
    const errors = [];
    if (!String(draft.name || "").trim()) errors.push("Schedule name is required.");
    if (!String(draft.timezone || "").trim()) errors.push("Timezone is required.");
    if (!String(draft.startDate || "").trim()) errors.push("Start date is required.");
    if (!String(draft.endDate || "").trim()) errors.push("End date is required.");
    if (!String(draft.quickFilter || "").trim() && !arrayFromValues(draft.days).length && !String(draft.timeOfDay || "").trim()) {
      errors.push("Add a quick filter or custom day/time selection.");
    }
    return errors;
  }

  function saveTargetingLibraryModal() {
    const workspace = currentWorkspace();
    const modal = state.libraryModal;
    if (!workspace || !modal || !adapter) return;
    if (modal.type === "audience") {
      const draft = modal.draft || {};
      const errors = validateAudienceTargetingDraft(draft);
      if (errors.length) {
        state.libraryModal.errors = errors;
        render();
        return;
      }
      const input = {
        name: String(draft.name || "").trim(),
        idType: draft.idType,
        values: arrayFromValues(draft.values),
      };
      if (modal.mode === "edit" && modal.id && typeof adapter.updatePrototypeAudienceTarget === "function") {
        adapter.updatePrototypeAudienceTarget(workspace.id, modal.id, input);
      } else {
        createAudienceTargetFromInput(workspace.id, input);
      }
    }
    if (modal.type === "schedule") {
      const draft = modal.draft || {};
      const errors = validateDeliveryScheduleDraft(draft);
      if (errors.length) {
        state.libraryModal.errors = errors;
        render();
        return;
      }
      const input = {
        name: String(draft.name || "").trim(),
        timezone: String(draft.timezone || "").trim(),
        startDate: draft.startDate,
        endDate: draft.endDate,
        quickFilter: draft.quickFilter,
        days: arrayFromValues(draft.days),
        timeOfDay: String(draft.timeOfDay || "").trim(),
      };
      if (modal.mode === "edit" && modal.id && typeof adapter.updatePrototypeDeliverySchedule === "function") {
        adapter.updatePrototypeDeliverySchedule(workspace.id, modal.id, input);
      } else if (typeof adapter.addPrototypeDeliverySchedule === "function" && typeof adapter.updatePrototypeDeliverySchedule === "function") {
        const updatedWorkspace = adapter.addPrototypeDeliverySchedule(workspace.id);
        const schedules = updatedWorkspace?.targetingLibrary?.deliverySchedules || [];
        const newSchedule = schedules[schedules.length - 1];
        if (newSchedule) adapter.updatePrototypeDeliverySchedule(workspace.id, newSchedule.id, input);
      }
    }
    refreshWorkspaces();
    state.selectedNode = { type: "campaign" };
    state.libraryModal = null;
    state.feedMacroTargetId = "";
    markAutosaving();
    render();
  }

  function readAudienceCsvFile(file) {
    if (!state.libraryModal || state.libraryModal.type !== "audience-csv") return;
    if (!file) {
      state.libraryModal.errors = ["Choose a CSV file."];
      state.libraryModal.draft = { fileName: "", rows: [] };
      render();
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const parsed = parseAudienceCsv(String(reader.result || ""));
      if (!state.libraryModal || state.libraryModal.type !== "audience-csv") return;
      state.libraryModal.errors = parsed.errors;
      state.libraryModal.draft = {
        fileName: file.name,
        rows: parsed.rows,
      };
      render();
    };
    reader.onerror = () => {
      if (!state.libraryModal || state.libraryModal.type !== "audience-csv") return;
      state.libraryModal.errors = ["Could not read the selected CSV file."];
      state.libraryModal.draft = { fileName: file.name, rows: [] };
      render();
    };
    reader.readAsText(file);
  }

  function parseAudienceCsv(csvText) {
    const parsedRows = parseCsvRows(csvText);
    const rows = parsedRows.filter((row) => row.some((value) => String(value || "").trim()));
    if (!rows.length) return { errors: ["CSV file is empty."], rows: [] };
    const headers = rows[0].map((header) => String(header || "").trim());
    const segmentIndex = headers.findIndex((header) => header.toLowerCase() === "segment name");
    const lineItemIndex = headers.findIndex((header) => header.toLowerCase() === "dv360 line item id");
    const errors = [];
    if (segmentIndex === -1) errors.push("CSV must include Segment Name column.");
    if (lineItemIndex === -1) errors.push("CSV must include DV360 Line Item ID column.");
    if (errors.length) return { errors, rows: [] };

    const workspace = currentWorkspace();
    const existingNames = new Set(targetingLibrary(workspace).audienceTargets.map((target) => String(target.name || "").trim().toLowerCase()).filter(Boolean));
    const seenNames = new Set();
    const previewRows = rows.slice(1).map((row) => {
      const segmentName = String(row[segmentIndex] || "").trim();
      const lineItemId = String(row[lineItemIndex] || "").trim();
      const missing = [];
      if (!segmentName) missing.push("Segment Name");
      if (!lineItemId) missing.push("DV360 Line Item ID");
      if (missing.length) {
        return {
          segmentName,
          lineItemId,
          valid: false,
          warning: false,
          message: `Missing ${missing.join(" and ")}.`,
        };
      }
      const key = segmentName.toLowerCase();
      const duplicate = existingNames.has(key) || seenNames.has(key);
      seenNames.add(key);
      return {
        segmentName,
        lineItemId,
        valid: true,
        warning: duplicate,
        message: duplicate ? "Duplicate Segment Name allowed." : "Ready to create.",
      };
    });
    return { errors: [], rows: previewRows };
  }

  function parseCsvRows(csvText) {
    const rows = [];
    let row = [];
    let value = "";
    let inQuotes = false;
    const text = String(csvText || "");
    for (let index = 0; index < text.length; index += 1) {
      const char = text[index];
      const nextChar = text[index + 1];
      if (char === '"' && inQuotes && nextChar === '"') {
        value += '"';
        index += 1;
      } else if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === "," && !inQuotes) {
        row.push(value);
        value = "";
      } else if ((char === "\n" || char === "\r") && !inQuotes) {
        if (char === "\r" && nextChar === "\n") index += 1;
        row.push(value);
        rows.push(row);
        row = [];
        value = "";
      } else {
        value += char;
      }
    }
    row.push(value);
    rows.push(row);
    return rows;
  }

  function saveAudienceCsvSets() {
    const workspace = currentWorkspace();
    const modal = state.libraryModal;
    if (!workspace || !modal || modal.type !== "audience-csv") return;
    const validRows = (modal.draft?.rows || []).filter((row) => row.valid);
    if (!validRows.length) {
      state.libraryModal.errors = ["At least one valid row is required before creating audience sets."];
      render();
      return;
    }
    validRows.forEach((row) => {
      createAudienceTargetFromInput(workspace.id, {
        name: row.segmentName,
        idType: "DV360 Line Item ID",
        values: [row.lineItemId],
      });
    });
    refreshWorkspaces();
    state.selectedNode = { type: "campaign" };
    state.libraryModal = null;
    markAutosaving();
    showToast(`${validRows.length} audience set${validRows.length === 1 ? "" : "s"} created.`);
    render();
  }

  function quickFilterPreset(filter) {
    if (filter === "Weekend") return { days: ["Saturday", "Sunday"], timeOfDay: "All day" };
    if (filter === "Weekdays") return { days: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"], timeOfDay: "All day" };
    if (filter === "Morning") return { days: [], timeOfDay: "06:00-12:00" };
    if (filter === "Afternoon") return { days: [], timeOfDay: "12:00-18:00" };
    if (filter === "Evening") return { days: [], timeOfDay: "18:00-23:59" };
    return null;
  }

  function updateTargetingRule(placementId, adBlueprintId, ruleId, input) {
    const workspace = currentWorkspace();
    if (!workspace || !adapter) return;
    if (typeof adapter.updatePrototypeTargetingRule === "function") {
      adapter.updatePrototypeTargetingRule(workspace.id, placementId, adBlueprintId, ruleId, input);
      refreshWorkspaces();
    }
    state.selectedNode = { type: "ad", placementId, adBlueprintId };
    markAutosaving();
    render();
  }

  function updateTargetingCondition(placementId, adBlueprintId, ruleId, conditionId, input) {
    const workspace = currentWorkspace();
    if (!workspace || !adapter) return;
    if (typeof adapter.updatePrototypeTargetingCondition === "function") {
      adapter.updatePrototypeTargetingCondition(workspace.id, placementId, adBlueprintId, ruleId, conditionId, input);
      refreshWorkspaces();
    }
    state.selectedNode = { type: "ad", placementId, adBlueprintId };
    markAutosaving();
    render();
  }

  function updateAudienceMapping(placementId, adBlueprintId, lineItemId, input) {
    const workspace = currentWorkspace();
    if (!workspace) return;
    if (adapter && typeof adapter.updatePrototypeAudienceMapping === "function") {
      adapter.updatePrototypeAudienceMapping(workspace.id, placementId, adBlueprintId, lineItemId, input);
      refreshWorkspaces();
    }
    state.selectedNode = { type: "ad", placementId, adBlueprintId };
    markAutosaving();
    render();
  }

  function clearAudienceMapping(placementId, adBlueprintId, lineItemId) {
    const workspace = currentWorkspace();
    if (!workspace) return;
    if (adapter && typeof adapter.clearPrototypeAudienceMapping === "function") {
      adapter.clearPrototypeAudienceMapping(workspace.id, placementId, adBlueprintId, lineItemId);
      refreshWorkspaces();
    }
    state.selectedNode = { type: "ad", placementId, adBlueprintId };
    markAutosaving();
    render();
  }

  function applyAudienceSuggestion(placementId, adBlueprintId, lineItemId) {
    const workspace = currentWorkspace();
    if (!workspace) return;
    if (adapter && typeof adapter.applyPrototypeAudienceSuggestion === "function") {
      adapter.applyPrototypeAudienceSuggestion(workspace.id, placementId, adBlueprintId, lineItemId);
      refreshWorkspaces();
    }
    state.selectedNode = { type: "ad", placementId, adBlueprintId };
    markAutosaving();
    render();
  }

  function markStudioMappingReviewed(placementId, adBlueprintId, rowId) {
    const workspace = currentWorkspace();
    if (!workspace) return;
    if (adapter && typeof adapter.markPrototypeStudioProfileMappingReviewed === "function") {
      adapter.markPrototypeStudioProfileMappingReviewed(workspace.id, placementId, adBlueprintId, rowId);
      refreshWorkspaces();
    }
    state.selectedNode = { type: "ad", placementId, adBlueprintId };
    markAutosaving();
    render();
  }

  function openRoutingModal(placementId, adBlueprintId) {
    const workspace = currentWorkspace();
    const adBlueprint = workspace ? findAdBlueprint(workspace, placementId, adBlueprintId) : null;
    if (!workspace || !adBlueprint) return;
    const assignments = automationFeedRowsForAdBlueprint(adBlueprint).map((row) => ({ ...variantRoutingAssignmentFor(workspace, adBlueprint, row) }));
    state.routingModal = {
      placementId,
      adBlueprintId,
      assignments,
      selectedFeedRowIds: [],
      bulkAudienceTargetingIds: [],
      bulkScheduleId: "",
    };
    state.routingAudienceMenu = null;
    state.routingAudienceSearch = "";
    render();
  }

  function updateRoutingDraftAssignment(feedRowId, input) {
    if (!state.routingModal) return;
    state.routingModal.assignments = (state.routingModal.assignments || []).map((assignment) =>
      assignment.feedRowId === feedRowId
        ? {
            ...assignment,
            ...(Object.prototype.hasOwnProperty.call(input || {}, "audienceTargetingIds") ? { audienceTargetingIds: input.audienceTargetingIds || [] } : {}),
            ...(Object.prototype.hasOwnProperty.call(input || {}, "scheduleId") ? { scheduleId: input.scheduleId } : {}),
            status: Object.prototype.hasOwnProperty.call(input || {}, "audienceTargetingIds")
              ? (input.audienceTargetingIds || []).length
                ? "Complete"
                : "Needs setup"
              : audienceTargetingIdsForAssignment(assignment).length
                ? "Complete"
                : "Needs setup",
          }
        : assignment
    );
    render();
  }

  function applyRoutingBulkAssignment() {
    if (!state.routingModal) return;
    const selectedIds = new Set(state.routingModal.selectedFeedRowIds || []);
    if (!selectedIds.size) return;
    state.routingModal.assignments = (state.routingModal.assignments || []).map((assignment) => {
      if (!selectedIds.has(assignment.feedRowId)) return assignment;
      const bulkAudienceIds = state.routingModal.bulkAudienceTargetingIds || [];
      const nextAudienceIds = bulkAudienceIds.length ? bulkAudienceIds : audienceTargetingIdsForAssignment(assignment);
      return {
        ...assignment,
        audienceTargetingIds: nextAudienceIds,
        scheduleId: state.routingModal.bulkScheduleId || "",
        status: nextAudienceIds.length ? "Complete" : "Needs setup",
      };
    });
    render();
  }

  function saveRoutingModal() {
    const workspace = currentWorkspace();
    const modal = state.routingModal;
    if (!workspace || !modal) return;
    if (adapter && typeof adapter.updatePrototypeVariantRoutingAssignments === "function") {
      adapter.updatePrototypeVariantRoutingAssignments(workspace.id, modal.placementId, modal.adBlueprintId, modal.assignments);
      refreshWorkspaces();
    }
    state.selectedNode = { type: "ad", placementId: modal.placementId, adBlueprintId: modal.adBlueprintId };
    state.routingModal = null;
    state.routingAudienceMenu = null;
    state.routingAudienceSearch = "";
    markAutosaving();
    showToast("Creative Variant Routing saved.");
    render();
  }

  function handleClick(event) {
    if (
      state.dcoActivation?.active &&
      dcoActivation?.handleClick(event, state.dcoActivation, {
        render,
        toast: showToast,
        autosave: markAutosaving,
        referenceData: referenceData(),
      })
    ) return;
    const actionTarget = event.target.closest("[data-action]");
    if (!actionTarget) {
      if (state.feedMacroTargetId) {
        state.feedMacroTargetId = "";
        render();
        return;
      }
      if (state.routingAudienceMenu) {
        state.routingAudienceMenu = null;
        state.routingAudienceSearch = "";
        render();
      }
      return;
    }
    const action = actionTarget.dataset.action;

    if (action === "show-list") {
      if (state.dcoActivation) state.dcoActivation.active = false;
      state.view = "list";
      render();
      return;
    }

    if (action === "open-workspace") {
      if (state.dcoActivation) state.dcoActivation.active = false;
      state.selectedWorkspaceId = actionTarget.dataset.id;
      state.selectedNode = { type: "campaign" };
      state.expandedNodes = new Set(["campaign"]);
      state.view = "detail";
      render();
      return;
    }

    if (action === "open-dco-activation") {
      if (state.dcoActivation && dcoActivation) {
        dcoActivation.open(state.dcoActivation, { workspace: currentWorkspace(), referenceData: referenceData() });
        render();
      }
      return;
    }

    if (action === "delete-workspace") {
      deleteWorkspace(actionTarget.dataset.id);
      return;
    }

    if (action === "select-ad-type-card") {
      updateAdBlueprint(actionTarget.dataset.placementId, actionTarget.dataset.adId, { adType: actionTarget.dataset.adType });
      return;
    }

    if (action === "add-dco-layer") {
      addDcoLayerMapping(actionTarget.dataset.placementId, actionTarget.dataset.adId);
      return;
    }

    if (action === "remove-dco-layer") {
      removeDcoLayerMapping(actionTarget.dataset.placementId, actionTarget.dataset.adId, actionTarget.dataset.layerId);
      return;
    }

    if (action === "remove-placement") {
      const workspace = currentWorkspace();
      const removeId = actionTarget.dataset.id;
      const nextIds = (workspace?.placementsTree || []).map((placement) => placement.cmPlacementId).filter((id) => id !== removeId);
      updatePlacementSelection(nextIds);
      return;
    }

    if (action === "add-audience-target") {
      openAudienceTargetingChoiceModal();
      return;
    }

    if (action === "choose-audience-create-manual") {
      openAudienceTargetingModal();
      return;
    }

    if (action === "choose-audience-upload-csv") {
      openAudienceCsvModal();
      return;
    }

    if (action === "edit-audience-target") {
      openAudienceTargetingModal(actionTarget.dataset.targetId);
      return;
    }

    if (action === "delete-audience-target") {
      const workspace = currentWorkspace();
      const targetId = actionTarget.dataset.targetId;
      if (workspace && targetId && adapter?.deletePrototypeAudienceTarget) {
        adapter.deletePrototypeAudienceTarget(workspace.id, targetId);
        refreshWorkspaces();
        state.selectedNode = { type: "campaign" };
        markAutosaving();
        render();
      }
      return;
    }

    if (action === "toggle-feed-macro-menu") {
      state.feedMacroTargetId = state.feedMacroTargetId === actionTarget.dataset.targetId ? "" : actionTarget.dataset.targetId;
      render();
      return;
    }

    if (action === "insert-feed-macro") {
      appendFeedMacroToAudienceTarget(actionTarget.dataset.targetId, actionTarget.dataset.macro);
      return;
    }

    if (action === "add-delivery-schedule") {
      openDeliveryScheduleModal();
      return;
    }

    if (action === "edit-delivery-schedule") {
      openDeliveryScheduleModal(actionTarget.dataset.scheduleId);
      return;
    }

    if (action === "delete-delivery-schedule") {
      const workspace = currentWorkspace();
      if (workspace && adapter?.deletePrototypeDeliverySchedule) {
        adapter.deletePrototypeDeliverySchedule(workspace.id, actionTarget.dataset.scheduleId);
        refreshWorkspaces();
        state.selectedNode = { type: "campaign" };
        markAutosaving();
        render();
      }
      return;
    }

    if (action === "cancel-library-modal") {
      if (actionTarget.classList.contains("modal-overlay") && event.target !== actionTarget) return;
      state.libraryModal = null;
      state.feedMacroTargetId = "";
      render();
      return;
    }

    if (action === "save-library-modal") {
      saveTargetingLibraryModal();
      return;
    }

    if (action === "create-audience-csv-sets") {
      saveAudienceCsvSets();
      return;
    }

    if (action === "open-issue-placement") {
      const placementId = actionTarget.dataset.placementId;
      state.selectedNode = { type: "placement", placementId };
      state.expandedNodes.add("campaign");
      state.expandedNodes.add(nodeKey("placement", placementId));
      render();
      return;
    }

    if (action === "add-dv360-row") {
      addDv360Row(actionTarget.dataset.placementId);
      return;
    }

    if (action === "remove-dv360-row") {
      removeDv360Row(actionTarget.dataset.placementId, actionTarget.dataset.rowId);
      return;
    }

    if (action === "add-ad-blueprint") {
      addAdBlueprint(actionTarget.dataset.placementId);
      return;
    }

    if (action === "open-ad-blueprint") {
      state.selectedNode = { type: "ad", placementId: actionTarget.dataset.placementId, adBlueprintId: actionTarget.dataset.adId };
      state.expandedNodes.add("campaign");
      state.expandedNodes.add(nodeKey("placement", actionTarget.dataset.placementId));
      render();
      return;
    }

    if (action === "duplicate-ad-blueprint") {
      duplicateAdBlueprint(actionTarget.dataset.placementId, actionTarget.dataset.adId);
      return;
    }

    if (action === "delete-ad-blueprint") {
      deleteAdBlueprint(actionTarget.dataset.placementId, actionTarget.dataset.adId);
      return;
    }

    if (action === "apply-audience-suggestion") {
      applyAudienceSuggestion(actionTarget.dataset.placementId, actionTarget.dataset.adId, actionTarget.dataset.lineItemId);
      return;
    }

    if (action === "clear-audience-mapping") {
      clearAudienceMapping(actionTarget.dataset.placementId, actionTarget.dataset.adId, actionTarget.dataset.lineItemId);
      return;
    }

    if (action === "configure-variant-routing") {
      openRoutingModal(actionTarget.dataset.placementId, actionTarget.dataset.adId);
      return;
    }

    if (action === "cancel-routing-modal") {
      if (actionTarget.classList.contains("modal-overlay") && event.target !== actionTarget) return;
      state.routingModal = null;
      state.routingAudienceMenu = null;
      state.routingAudienceSearch = "";
      render();
      return;
    }

    if (action === "save-routing-modal") {
      saveRoutingModal();
      return;
    }

    if (action === "apply-routing-bulk") {
      applyRoutingBulkAssignment();
      return;
    }

    if (action === "toggle-routing-audience-menu") {
      const scope = actionTarget.dataset.menuScope || "row";
      const feedRowId = actionTarget.dataset.feedRowId || "";
      const alreadyOpen = routingAudienceMenuOpen(scope, feedRowId);
      state.routingAudienceMenu = alreadyOpen ? null : { scope, feedRowId };
      state.routingAudienceSearch = "";
      render();
      return;
    }

    if (action === "toggle-routing-audience-option") {
      const scope = actionTarget.dataset.menuScope || "row";
      const feedRowId = actionTarget.dataset.feedRowId || "";
      const audienceId = actionTarget.dataset.audienceId;
      if (!state.routingModal || !audienceId) return;
      if (scope === "bulk") {
        const selected = new Set(state.routingModal.bulkAudienceTargetingIds || []);
        if (selected.has(audienceId)) selected.delete(audienceId);
        else selected.add(audienceId);
        state.routingModal.bulkAudienceTargetingIds = Array.from(selected);
        render();
        return;
      }
      const assignment = routingDraftAssignment(feedRowId);
      const selected = new Set(audienceTargetingIdsForAssignment(assignment));
      if (selected.has(audienceId)) selected.delete(audienceId);
      else selected.add(audienceId);
      updateRoutingDraftAssignment(feedRowId, { audienceTargetingIds: Array.from(selected) });
      return;
    }

    if (action === "add-targeting-rule") {
      const workspace = currentWorkspace();
      if (workspace && adapter?.addPrototypeTargetingRule) {
        adapter.addPrototypeTargetingRule(workspace.id, actionTarget.dataset.placementId, actionTarget.dataset.adId);
        refreshWorkspaces();
        state.selectedNode = { type: "ad", placementId: actionTarget.dataset.placementId, adBlueprintId: actionTarget.dataset.adId };
        markAutosaving();
        render();
      }
      return;
    }

    if (action === "delete-targeting-rule") {
      const workspace = currentWorkspace();
      if (workspace && adapter?.deletePrototypeTargetingRule) {
        adapter.deletePrototypeTargetingRule(workspace.id, actionTarget.dataset.placementId, actionTarget.dataset.adId, actionTarget.dataset.ruleId);
        refreshWorkspaces();
        state.selectedNode = { type: "ad", placementId: actionTarget.dataset.placementId, adBlueprintId: actionTarget.dataset.adId };
        markAutosaving();
        render();
      }
      return;
    }

    if (action === "mark-studio-mapping-reviewed") {
      markStudioMappingReviewed(actionTarget.dataset.placementId, actionTarget.dataset.adId, actionTarget.dataset.rowId);
      return;
    }

    if (action === "toggle-node") {
      const key = actionTarget.dataset.nodeKey;
      if (state.expandedNodes.has(key)) state.expandedNodes.delete(key);
      else state.expandedNodes.add(key);
      render();
      return;
    }

    if (action === "select-node") {
      const type = actionTarget.dataset.nodeType;
      const id = actionTarget.dataset.nodeId;
      if (type === "campaign") state.selectedNode = { type: "campaign" };
      if (type === "placement") state.selectedNode = { type: "placement", placementId: id };
      if (type === "ad") {
        const [placementId, adBlueprintId] = id.split(":");
        state.selectedNode = { type: "ad", placementId, adBlueprintId };
      }
      render();
      return;
    }

    if (action === "open-create") {
      state.createOpen = true;
      state.createName = "New workspace";
      state.createPlatform = "Meta";
      state.createError = "";
      render();
      const input = document.getElementById("newWorkspaceName");
      if (input) input.focus();
      return;
    }

    if (action === "select-create-platform") {
      state.createPlatform = actionTarget.dataset.platform || "Meta";
      render();
      return;
    }

    if (action === "create-default-placeholder") {
      showToast("Workspace defaults are a placeholder in this prototype.");
      return;
    }

    if (action === "close-create") {
      if (actionTarget.classList.contains("modal-overlay") && event.target !== actionTarget) return;
      state.createOpen = false;
      state.createError = "";
      render();
      return;
    }

    if (action === "create-workspace") {
      createWorkspace();
    }
  }

  function handleInput(event) {
    if (state.dcoActivation?.active && dcoActivation?.handleInput(event, state.dcoActivation, { render })) return;
    if (event.target.id === "workspaceSearch") {
      state.search = event.target.value;
      render();
      const input = document.getElementById("workspaceSearch");
      if (input) {
        input.focus();
        input.setSelectionRange(input.value.length, input.value.length);
      }
      return;
    }

    if (event.target.id === "newWorkspaceName") {
      state.createName = event.target.value;
      state.createError = "";
      return;
    }

    if (event.target.dataset.action === "edit-audience-modal-name") {
      updateLibraryModalDraft({ name: event.target.value });
      return;
    }

    if (event.target.dataset.action === "edit-audience-modal-values") {
      updateLibraryModalDraft({ values: event.target.value });
      return;
    }

    if (event.target.dataset.action === "edit-schedule-modal-name") {
      updateLibraryModalDraft({ name: event.target.value });
      return;
    }

    if (event.target.dataset.action === "edit-schedule-modal-timezone") {
      updateLibraryModalDraft({ timezone: event.target.value });
      return;
    }

    if (event.target.dataset.action === "edit-schedule-modal-start") {
      updateLibraryModalDraft({ startDate: event.target.value });
      return;
    }

    if (event.target.dataset.action === "edit-schedule-modal-end") {
      updateLibraryModalDraft({ endDate: event.target.value });
      return;
    }

    if (event.target.dataset.action === "edit-schedule-modal-time") {
      updateLibraryModalDraft({ timeOfDay: event.target.value });
      return;
    }

    if (event.target.dataset.action === "search-routing-audience") {
      state.routingAudienceSearch = event.target.value;
      render();
      const input = root.querySelector('input[data-action="search-routing-audience"]');
      if (input) {
        input.focus();
        input.setSelectionRange(input.value.length, input.value.length);
      }
      return;
    }

  }

  function handleChange(event) {
    if (
      state.dcoActivation?.active &&
      dcoActivation?.handleChange(event, state.dcoActivation, { render, toast: showToast, autosave: markAutosaving, referenceData: referenceData() })
    ) return;
    const actionTarget = event.target.closest("[data-action]");
    if (!actionTarget) return;
    const action = actionTarget.dataset.action;
    const workspace = currentWorkspace();
    if (!workspace) return;

    if (action === "select-advertiser") {
      updateCampaignSelection(actionTarget.value, "");
      return;
    }

    if (action === "select-campaign") {
      updateCampaignSelection(workspace.cmAdvertiserId, actionTarget.value);
      return;
    }

    if (action === "select-campaign-dv-advertiser") {
      updateCampaignDv360Selection({ dvAdvertiserId: actionTarget.value });
      return;
    }

    if (action === "select-campaign-dv-campaign") {
      updateCampaignDv360Selection({ dvCampaignId: actionTarget.value });
      return;
    }

    if (action === "toggle-routing-row") {
      if (!state.routingModal) return;
      const selected = new Set(state.routingModal.selectedFeedRowIds || []);
      if (actionTarget.checked) selected.add(actionTarget.value);
      else selected.delete(actionTarget.value);
      state.routingModal.selectedFeedRowIds = Array.from(selected);
      render();
      return;
    }

    if (action === "select-routing-row-schedule") {
      updateRoutingDraftAssignment(actionTarget.dataset.feedRowId, { scheduleId: actionTarget.value });
      return;
    }

    if (action === "select-routing-bulk-schedule") {
      if (state.routingModal) {
        state.routingModal.bulkScheduleId = actionTarget.value;
        render();
      }
      return;
    }

    if (action === "select-audience-csv") {
      readAudienceCsvFile(actionTarget.files?.[0]);
      return;
    }

    if (action === "select-audience-modal-id-type") {
      updateLibraryModalDraft({ idType: actionTarget.value });
      render();
      return;
    }

    if (action === "select-schedule-modal-quick-filter") {
      const preset = quickFilterPreset(actionTarget.value);
      updateLibraryModalDraft({
        quickFilter: actionTarget.value,
        ...(preset ? { days: preset.days, timeOfDay: preset.timeOfDay } : {}),
      });
      render();
      return;
    }

    if (action === "toggle-schedule-modal-day") {
      const days = new Set(arrayFromValues(state.libraryModal?.draft?.days));
      if (actionTarget.checked) days.add(actionTarget.value);
      else days.delete(actionTarget.value);
      updateLibraryModalDraft({ days: Array.from(days), quickFilter: state.libraryModal?.draft?.quickFilter || "" });
      return;
    }

    if (action === "edit-audience-target-name") {
      updateCampaignAudienceTarget(actionTarget.dataset.targetId, { name: actionTarget.value });
      return;
    }

    if (action === "select-audience-target-id-type") {
      updateCampaignAudienceTarget(actionTarget.dataset.targetId, { idType: actionTarget.value });
      return;
    }

    if (action === "edit-audience-target-values") {
      updateCampaignAudienceTarget(actionTarget.dataset.targetId, { values: actionTarget.value });
      return;
    }

    if (action === "edit-delivery-schedule-name") {
      updateCampaignDeliverySchedule(actionTarget.dataset.scheduleId, { name: actionTarget.value });
      return;
    }

    if (action === "edit-delivery-schedule-start") {
      updateCampaignDeliverySchedule(actionTarget.dataset.scheduleId, { startDate: actionTarget.value });
      return;
    }

    if (action === "edit-delivery-schedule-end") {
      updateCampaignDeliverySchedule(actionTarget.dataset.scheduleId, { endDate: actionTarget.value });
      return;
    }

    if (action === "edit-delivery-schedule-timezone") {
      updateCampaignDeliverySchedule(actionTarget.dataset.scheduleId, { timezone: actionTarget.value });
      return;
    }

    if (action === "select-delivery-schedule-quick") {
      updateCampaignDeliverySchedule(actionTarget.dataset.scheduleId, { quickFilter: actionTarget.value });
      return;
    }

    if (action === "select-delivery-schedule-days") {
      updateCampaignDeliverySchedule(actionTarget.dataset.scheduleId, { days: Array.from(actionTarget.selectedOptions).map((option) => option.value) });
      return;
    }

    if (action === "edit-delivery-schedule-time") {
      updateCampaignDeliverySchedule(actionTarget.dataset.scheduleId, { timeOfDay: actionTarget.value });
      return;
    }

    if (action === "toggle-placement") {
      const checkedIds = Array.from(root.querySelectorAll('input[data-action="toggle-placement"]:checked')).map((input) => input.value);
      updatePlacementSelection(checkedIds);
      return;
    }

    if (action === "toggle-dv360-enabled") {
      updateDv360Enabled(actionTarget.dataset.placementId, actionTarget.checked);
      return;
    }

    if (action === "select-dv-line-items") {
      const lineItemIds = Array.from(actionTarget.selectedOptions).map((option) => option.value);
      updateDv360Row(actionTarget.dataset.placementId, actionTarget.dataset.rowId, { lineItemIds });
      return;
    }

    if (action === "toggle-ad-automation") {
      updateAdBlueprint(actionTarget.dataset.placementId, actionTarget.dataset.adId, { adAutomationEnabled: actionTarget.checked });
      return;
    }

    if (action === "select-ad-producer") {
      updateAdBlueprint(actionTarget.dataset.placementId, actionTarget.dataset.adId, { producerId: actionTarget.value });
      return;
    }

    if (action === "select-ad-status") {
      updateAdBlueprint(actionTarget.dataset.placementId, actionTarget.dataset.adId, { status: actionTarget.value });
      return;
    }

    if (action === "select-ad-type") {
      updateAdBlueprint(actionTarget.dataset.placementId, actionTarget.dataset.adId, { adType: actionTarget.value });
      return;
    }

    if (action === "select-ad-type-card") {
      updateAdBlueprint(actionTarget.dataset.placementId, actionTarget.dataset.adId, { adType: actionTarget.dataset.adType });
      return;
    }

    if (action === "select-standard-media-source") {
      updateAdBlueprint(actionTarget.dataset.placementId, actionTarget.dataset.adId, {
        standardDisplayConfig: {
          mediaSource: actionTarget.value,
          templateId: "",
          uploadedBundleId: "",
          uploadedBundleName: "",
        },
      });
      return;
    }

    if (action === "select-standard-template") {
      updateAdBlueprint(actionTarget.dataset.placementId, actionTarget.dataset.adId, { standardDisplayConfig: { templateId: actionTarget.value } });
      return;
    }

    if (action === "select-upload-format") {
      updateAdBlueprint(actionTarget.dataset.placementId, actionTarget.dataset.adId, { standardDisplayConfig: { uploadedFormat: actionTarget.value } });
      return;
    }

    if (action === "select-landing-mode") {
      updateAdBlueprint(actionTarget.dataset.placementId, actionTarget.dataset.adId, { standardDisplayConfig: { landingPageMode: actionTarget.value } });
      return;
    }

    if (action === "select-url-mode") {
      updateAdBlueprint(actionTarget.dataset.placementId, actionTarget.dataset.adId, { standardDisplayConfig: { urlParameterMode: actionTarget.value } });
      return;
    }

    if (action === "select-studio-advertiser") {
      updateAdBlueprint(actionTarget.dataset.placementId, actionTarget.dataset.adId, { richMediaDcoConfig: { studioAdvertiserId: actionTarget.value } });
      return;
    }

    if (action === "select-studio-campaign") {
      updateAdBlueprint(actionTarget.dataset.placementId, actionTarget.dataset.adId, { richMediaDcoConfig: { studioCampaignId: actionTarget.value } });
      return;
    }

    if (action === "select-audience-feed-field") {
      updateAudienceMapping(actionTarget.dataset.placementId, actionTarget.dataset.adId, actionTarget.dataset.lineItemId, { feedField: actionTarget.value });
      return;
    }

    if (action === "select-audience-operator") {
      updateAudienceMapping(actionTarget.dataset.placementId, actionTarget.dataset.adId, actionTarget.dataset.lineItemId, { operator: actionTarget.value });
      return;
    }

    if (action === "edit-targeting-rule-name") {
      updateTargetingRule(actionTarget.dataset.placementId, actionTarget.dataset.adId, actionTarget.dataset.ruleId, { name: actionTarget.value });
      return;
    }

    if (action === "select-targeting-condition-values") {
      updateTargetingCondition(actionTarget.dataset.placementId, actionTarget.dataset.adId, actionTarget.dataset.ruleId, actionTarget.dataset.conditionId, {
        valueIds: Array.from(actionTarget.selectedOptions).map((option) => option.value),
      });
      return;
    }

    if (action === "select-routing-schedule") {
      updateTargetingRule(actionTarget.dataset.placementId, actionTarget.dataset.adId, actionTarget.dataset.ruleId, { scheduleId: actionTarget.value });
      return;
    }

    if (action === "select-routing-feed-field") {
      updateTargetingRule(actionTarget.dataset.placementId, actionTarget.dataset.adId, actionTarget.dataset.ruleId, {
        creativeVariantFilter: { feedField: actionTarget.value },
      });
      return;
    }

    if (action === "select-routing-operator") {
      updateTargetingRule(actionTarget.dataset.placementId, actionTarget.dataset.adId, actionTarget.dataset.ruleId, {
        creativeVariantFilter: { operator: actionTarget.value },
      });
      return;
    }

    if (action === "select-dco-secondary-feed") {
      updateAdBlueprint(actionTarget.dataset.placementId, actionTarget.dataset.adId, { richMediaDcoConfig: { dataSourceId: actionTarget.value } });
      return;
    }

    if (action === "select-secondary-match-mode") {
      updateAdBlueprint(actionTarget.dataset.placementId, actionTarget.dataset.adId, { richMediaDcoConfig: { secondaryFeedMatchMode: actionTarget.value } });
      return;
    }

    if (action === "select-content-match-column") {
      updateAdBlueprint(actionTarget.dataset.placementId, actionTarget.dataset.adId, { richMediaDcoConfig: { contentMatchColumn: actionTarget.value } });
      return;
    }

    if (action === "edit-constant-match-value") {
      updateAdBlueprint(actionTarget.dataset.placementId, actionTarget.dataset.adId, { richMediaDcoConfig: { constantMatchValue: actionTarget.value } });
      return;
    }

    if (action === "select-dco-layer-template") {
      updateDcoLayerMapping(actionTarget.dataset.placementId, actionTarget.dataset.adId, actionTarget.dataset.layerId, { templateLayer: actionTarget.value });
      return;
    }

    if (action === "select-dco-layer-origin") {
      updateDcoLayerMapping(actionTarget.dataset.placementId, actionTarget.dataset.adId, actionTarget.dataset.layerId, { origin: actionTarget.value });
      return;
    }

    if (action === "select-dco-layer-feed-column") {
      updateDcoLayerMapping(actionTarget.dataset.placementId, actionTarget.dataset.adId, actionTarget.dataset.layerId, { feedColumn: actionTarget.value });
      return;
    }

    if (action === "toggle-dco-creative") {
      const selectedTemplateIds = Array.from(
        root.querySelectorAll(`input[data-action="toggle-dco-creative"][data-placement-id="${actionTarget.dataset.placementId}"][data-ad-id="${actionTarget.dataset.adId}"]:checked:not(:disabled)`)
      ).map((input) => input.value);
      updateAdBlueprint(actionTarget.dataset.placementId, actionTarget.dataset.adId, { richMediaDcoConfig: { htmlCreativeTemplateIds: selectedTemplateIds } });
      return;
    }

    if (action === "select-dco-landing-mode") {
      updateAdBlueprint(actionTarget.dataset.placementId, actionTarget.dataset.adId, { richMediaDcoConfig: { landingPageMode: actionTarget.value } });
      return;
    }

    if (action === "select-dco-url-mode") {
      updateAdBlueprint(actionTarget.dataset.placementId, actionTarget.dataset.adId, { richMediaDcoConfig: { urlParameterMode: actionTarget.value } });
      return;
    }

    if (action === "edit-ad-name") {
      updateAdBlueprint(actionTarget.dataset.placementId, actionTarget.dataset.adId, { name: actionTarget.value });
      return;
    }

    if (action === "edit-ad-blueprint-name") {
      updateAdBlueprint(actionTarget.dataset.placementId, actionTarget.dataset.adId, { blueprintName: actionTarget.value });
      return;
    }

    if (action === "edit-ad-code") {
      updateAdBlueprint(actionTarget.dataset.placementId, actionTarget.dataset.adId, { adCode: actionTarget.value });
      return;
    }

    if (action === "edit-upload-name") {
      updateAdBlueprint(actionTarget.dataset.placementId, actionTarget.dataset.adId, {
        standardDisplayConfig: {
          uploadedBundleName: actionTarget.value,
          uploadedBundleId: actionTarget.value ? "prototype-upload-bundle" : "",
        },
      });
      return;
    }

    if (action === "edit-landing-page") {
      updateAdBlueprint(actionTarget.dataset.placementId, actionTarget.dataset.adId, { standardDisplayConfig: { landingPageValue: actionTarget.value } });
      return;
    }

    if (action === "edit-url-parameters") {
      updateAdBlueprint(actionTarget.dataset.placementId, actionTarget.dataset.adId, { standardDisplayConfig: { urlParameterValue: actionTarget.value } });
      return;
    }

    if (action === "edit-dco-landing-page") {
      updateAdBlueprint(actionTarget.dataset.placementId, actionTarget.dataset.adId, { richMediaDcoConfig: { landingPageValue: actionTarget.value } });
      return;
    }

    if (action === "edit-dco-url-parameters") {
      updateAdBlueprint(actionTarget.dataset.placementId, actionTarget.dataset.adId, { richMediaDcoConfig: { urlParameterValue: actionTarget.value } });
      return;
    }

    if (action === "edit-routing-filter-value") {
      updateTargetingRule(actionTarget.dataset.placementId, actionTarget.dataset.adId, actionTarget.dataset.ruleId, {
        creativeVariantFilter: { value: actionTarget.value },
      });
      return;
    }

    if (action === "edit-routing-priority") {
      updateTargetingRule(actionTarget.dataset.placementId, actionTarget.dataset.adId, actionTarget.dataset.ruleId, { priority: actionTarget.value });
      return;
    }

    if (action === "edit-audience-value") {
      updateAudienceMapping(actionTarget.dataset.placementId, actionTarget.dataset.adId, actionTarget.dataset.lineItemId, { value: actionTarget.value });
    }
  }

  function handleKeydown(event) {
    if (event.key === "Escape" && state.dcoActivation?.active && state.dcoActivation.modal) {
      state.dcoActivation.modal = null;
      render();
      return;
    }
    if (event.key === "Escape" && state.feedMacroTargetId) {
      state.feedMacroTargetId = "";
      render();
      return;
    }
    if (event.key === "Escape" && state.routingAudienceMenu) {
      state.routingAudienceMenu = null;
      state.routingAudienceSearch = "";
      render();
      return;
    }
    if (event.key === "Escape" && state.routingModal) {
      state.routingModal = null;
      state.routingAudienceSearch = "";
      render();
      return;
    }
    if (event.key === "Escape" && state.libraryModal) {
      state.libraryModal = null;
      render();
      return;
    }
    if (event.key === "Escape" && state.createOpen) {
      state.createOpen = false;
      state.createError = "";
      render();
    }
  }

  function render() {
    root.innerHTML = state.view === "detail" ? renderDetailView() : renderListView();
  }

  root.addEventListener("click", handleClick);
  root.addEventListener("input", handleInput);
  root.addEventListener("change", handleChange);
  document.addEventListener("keydown", handleKeydown);
  render();
})();
