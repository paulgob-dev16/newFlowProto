(function () {
  const VALID_AUDIENCE_OPERATORS = ["equals", "contains", "starts_with", "is_not_empty"];

  function issue(id, severity, location, message, details) {
    return { id, severity, location, message, ...(details || {}) };
  }

  function placementDv360Enabled(placement) {
    return Boolean(placement.dv360Enabled ?? (placement.dv360Connections || []).some((connection) => connection.enabled));
  }

  function workspaceUsesDv360(workspace) {
    return (workspace.placementsTree || []).some(
      (placement) => placementDv360Enabled(placement) || (placement.dv360Connections || []).some((connection) => (connection.lineItemIds || []).length)
    );
  }

  function matchingVariantCount(referenceData, mapping) {
    const variants = referenceData.automationFeedRows || referenceData.producerVariants || [];
    if (!mapping.feedField || !mapping.operator) return 0;
    return variants.filter((variant) => {
      const rawValue = variant[mapping.feedField];
      const value = String(rawValue || "").toLowerCase();
      const expected = String(mapping.value || "").toLowerCase();
      if (mapping.operator === "is_not_empty") return Boolean(rawValue);
      if (!expected) return false;
      if (mapping.operator === "equals") return value === expected;
      if (mapping.operator === "contains") return value.includes(expected);
      if (mapping.operator === "starts_with") return value.startsWith(expected);
      return false;
    }).length;
  }

  function placementFormats(referenceData, placement) {
    const cmPlacement = (referenceData.cm360Placements || []).find((item) => item.id === placement.cmPlacementId);
    return cmPlacement?.formats || placement.formats || [];
  }

  function validatePrototypeAccounts(workspace, referenceData) {
    const issues = [];
    const accountState = referenceData.accountState || {};
    if (!accountState.cm360Connected) {
      issues.push(issue("account-cm360-required", "blocking", "Account", "CM360 account must be connected."));
    }
    return issues;
  }

  function validatePrototypeCampaign(workspace, referenceData) {
    const issues = [];
    if (!workspace.cmAdvertiserId) {
      issues.push(issue("campaign-advertiser-required", "blocking", "Campaign", "CM360 Advertiser is required."));
    }
    if (!workspace.cmCampaignId) {
      issues.push(issue("campaign-campaign-required", "blocking", "Campaign", "CM360 Campaign is required."));
    }
    const campaign = (referenceData.cm360Campaigns || []).find((item) => item.id === workspace.cmCampaignId);
    if (workspace.cmAdvertiserId && campaign && campaign.advertiserId !== workspace.cmAdvertiserId) {
      issues.push(issue("campaign-advertiser-mismatch", "blocking", "Campaign", "CM360 Campaign must belong to the selected CM360 Advertiser."));
    }
    if (workspaceUsesDv360(workspace)) {
      if (!workspace.dvAdvertiserId) {
        issues.push(issue("campaign-dv-advertiser-required", "blocking", "Campaign", "DV360 Advertiser is required when DV360 mapping is used."));
      }
      const dvAdvertiser = (referenceData.dv360Advertisers || []).find((item) => item.id === workspace.dvAdvertiserId);
      if (dvAdvertiser && workspace.cmAdvertiserId && !(dvAdvertiser.connectedCmAdvertiserIds || []).includes(workspace.cmAdvertiserId)) {
        issues.push(issue("campaign-dv-advertiser-link", "blocking", "Campaign", "DV360 Advertiser must be connected to the selected CM360 Advertiser."));
      }
      if (!workspace.dvCampaignId) {
        issues.push(issue("campaign-dv-campaign-required", "blocking", "Campaign", "DV360 Campaign is required when DV360 mapping is used."));
      }
      const dvCampaign = (referenceData.dv360Campaigns || []).find((item) => item.id === workspace.dvCampaignId);
      if (dvCampaign && workspace.dvAdvertiserId && dvCampaign.advertiserId !== workspace.dvAdvertiserId) {
        issues.push(issue("campaign-dv-flow", "blocking", "Campaign", "DV360 Campaign must belong to the selected DV360 Advertiser."));
      }
    }
    return issues;
  }

  function validatePrototypePlacements(workspace, referenceData) {
    const issues = [];
    const placements = workspace.placementsTree || [];
    if (!placements.length) {
      issues.push(issue("placement-required", "blocking", "Placement", "At least one CM360 Placement is required."));
    }
    placements.forEach((placement) => {
      const cmPlacement = (referenceData.cm360Placements || []).find((item) => item.id === placement.cmPlacementId);
      if (!cmPlacement) {
        issues.push(issue(`placement-missing-${placement.id}`, "blocking", "Placement", "Selected CM360 Placement was not found in prototype fixtures."));
        return;
      }
      if (workspace.cmCampaignId && cmPlacement.campaignId !== workspace.cmCampaignId) {
        issues.push(issue(`placement-campaign-${placement.id}`, "blocking", "Placement", "Placement must belong to the selected CM360 Campaign."));
      }
      if (!cmPlacement.formats || !cmPlacement.formats.length) {
        issues.push(issue(`placement-formats-${placement.id}`, "warning", "Placement", "Placement format information should be available."));
      }
    });
    return issues;
  }

  function validatePrototypeDv360(workspace, referenceData) {
    const issues = [];
    (workspace.placementsTree || []).forEach((placement) => {
      if (!placementDv360Enabled(placement)) return;
      const connections = placement.dv360Connections || [];
      if (!connections.length) {
        issues.push(issue(`dv-row-required-${placement.id}`, "blocking", "DV360", "At least one DV360 mapping row is required when DV360 is enabled."));
      }
      connections.forEach((connection) => {
        if (!connection.enabled) return;
        if (!connection.lineItemIds || !connection.lineItemIds.length) {
          issues.push(issue(`dv-line-items-${connection.id}`, "blocking", "DV360", "At least one DV360 Line Item is required."));
        }
        (connection.lineItemIds || []).forEach((lineItemId) => {
          const lineItem = (referenceData.dv360LineItems || []).find((item) => item.id === lineItemId);
          if (!lineItem || (workspace.dvCampaignId && lineItem.campaignId !== workspace.dvCampaignId) || !workspace.dvCampaignId) {
            issues.push(issue(`dv-line-item-flow-${connection.id}-${lineItemId}`, "blocking", "DV360", "DV360 Line Item must belong to the Campaign Blueprint DV360 Campaign."));
          }
        });
      });
    });
    return issues;
  }

  function validatePrototypeAdBlueprints(workspace, referenceData) {
    const issues = [];
    (workspace.placementsTree || []).forEach((placement) => {
      const compatibleFormats = placementFormats(referenceData, placement);
      (placement.adBlueprints || []).forEach((adBlueprint) => {
        const library = targetingLibrary(workspace);
        const audienceIds = new Set(library.audienceTargets.map((target) => target.id));
        const scheduleIds = new Set(library.deliverySchedules.map((schedule) => schedule.id));
        if (!adBlueprint.name) {
          issues.push(issue(`ad-name-${adBlueprint.id}`, "blocking", "Ad Blueprint", "Ad name is required."));
        }
        if (!adBlueprint.adType) {
          issues.push(issue(`ad-type-${adBlueprint.id}`, "blocking", "Ad Blueprint", "Ad type is required."));
        }
        if (adBlueprint.adAutomationEnabled && !adBlueprint.producerId) {
          issues.push(issue(`ad-producer-${adBlueprint.id}`, "blocking", "Ad Blueprint", "Automation feed is required when Ad Automation is on."));
        }
        if (adBlueprint.adAutomationEnabled && adBlueprint.producerId) {
          automationRowsForAdBlueprint(referenceData, adBlueprint).forEach((row) => {
            const savedAssignment = (adBlueprint.variantRoutingAssignments || []).find((assignment) => assignment.feedRowId === row.id);
            const audienceTargetingIds = savedAssignment
              ? savedAssignment.audienceTargetingIds || (savedAssignment.audienceTargetingId ? [savedAssignment.audienceTargetingId] : [])
              : autoMappedAudienceIdsForRow(library, row);
            if (!audienceTargetingIds.length) {
              issues.push(issue(`variant-routing-audience-${adBlueprint.id}-${row.id}`, "blocking", "Creative Variant Routing", `Audience is required for Automation feed row ${row.category || row.id}.`));
            }
            audienceTargetingIds.forEach((audienceId) => {
              if (!audienceIds.has(audienceId)) {
                issues.push(issue(`variant-routing-audience-invalid-${adBlueprint.id}-${row.id}-${audienceId}`, "blocking", "Creative Variant Routing", "Selected Audience Targeting value must exist in Campaign Blueprint."));
              }
            });
            if (savedAssignment?.scheduleId && !scheduleIds.has(savedAssignment.scheduleId)) {
              issues.push(issue(`variant-routing-schedule-invalid-${adBlueprint.id}-${row.id}`, "blocking", "Creative Variant Routing", "Selected Delivery Schedule must exist in Campaign Blueprint."));
            }
          });
        }
        if (adBlueprint.adType === "standard_display") {
          const config = adBlueprint.standardDisplayConfig || {};
          if (!config.templateId && !config.uploadedBundleId) {
            issues.push(issue(`standard-media-${adBlueprint.id}`, "blocking", "Ad Blueprint", "Standard Display requires either a template or desktop upload."));
          }
        }
        if (adBlueprint.adType === "rich_media_dco") {
          const config = adBlueprint.richMediaDcoConfig || {};
          if (!config.studioAdvertiserId) {
            issues.push(issue(`dco-studio-${adBlueprint.id}`, "blocking", "Studio Connection", "Rich Media DCO requires a Studio Advertiser."));
          }
          if (!config.studioCampaignId) {
            issues.push(issue(`dco-studio-campaign-${adBlueprint.id}`, "blocking", "Studio Connection", "Rich Media DCO requires a Studio Campaign."));
          }
          const studioAdvertiser = (referenceData.studioAdvertisers || []).find((item) => item.id === config.studioAdvertiserId);
          if (config.studioAdvertiserId && (!studioAdvertiser || studioAdvertiser.cmAdvertiserId !== workspace.cmAdvertiserId)) {
            issues.push(issue(`dco-studio-advertiser-flow-${adBlueprint.id}`, "blocking", "Studio Connection", "Studio Advertiser must belong to the selected CM360 Advertiser."));
          }
          const studioCampaign = (referenceData.studioCampaigns || []).find((item) => item.id === config.studioCampaignId);
          if (config.studioCampaignId && (!studioCampaign || (config.studioAdvertiserId && studioCampaign.studioAdvertiserId !== config.studioAdvertiserId))) {
            issues.push(issue(`dco-studio-campaign-flow-${adBlueprint.id}`, "blocking", "Studio Connection", "Studio Campaign must belong to the selected Studio Advertiser."));
          }
          if (!config.htmlCreatives || !config.htmlCreatives.length) {
            issues.push(issue(`dco-html-${adBlueprint.id}`, "blocking", "Ad Blueprint", "Rich Media DCO requires at least one HTML Creative."));
          }
          const formats = (config.htmlCreatives || []).map((creative) => creative.format).filter(Boolean);
          const duplicates = [...new Set(formats.filter((format, index) => formats.indexOf(format) !== index))];
          if (duplicates.length) {
            issues.push(issue(`dco-duplicate-formats-${adBlueprint.id}`, "blocking", "Ad Blueprint", "A Rich Media DCO Ad Blueprint can only contain one HTML Creative per format."));
          }
        }
        (adBlueprint.selectedFormats || []).forEach((format) => {
          if (compatibleFormats.length && !compatibleFormats.includes(format)) {
            issues.push(issue(`ad-format-${adBlueprint.id}-${format}`, "blocking", "Ad Blueprint", "Ad Blueprint formats must be compatible with selected Placement formats."));
          }
        });
      });
    });
    return issues;
  }

  function targetingLibrary(workspace) {
    return {
      audienceTargets: workspace.targetingLibrary?.audienceTargets || [],
      deliverySchedules: workspace.targetingLibrary?.deliverySchedules || [],
    };
  }

  function automationRowsForAdBlueprint(referenceData, adBlueprint) {
    const rows = referenceData.automationFeedRows || referenceData.producerVariants || [];
    if (!adBlueprint.producerId) return [];
    return rows.filter((row) => !row.automationFeedId || row.automationFeedId === adBlueprint.producerId || row.producerId === adBlueprint.producerId);
  }

  function autoMappedAudienceIdsForRow(library, row) {
    return audienceNamesForAutomationRow(row)
      .map((audienceName) => library.audienceTargets.find((target) => String(target.name || "").trim() === audienceName)?.id)
      .filter(Boolean);
  }

  function audienceNamesForAutomationRow(row) {
    return String(row?.audienceName || row?.audience || "")
      .split(",")
      .map((name) => name.trim())
      .filter(Boolean);
  }

  function validatePrototypeTargetingRules(workspace, referenceData) {
    const issues = [];
    const data = referenceData || {};
    const library = targetingLibrary(workspace);
    const audienceIds = new Set(library.audienceTargets.map((target) => target.id));
    const scheduleIds = new Set(library.deliverySchedules.map((schedule) => schedule.id));
    const feedFieldIds = new Set((data.producerFeedFields || []).map((field) => field.id));
    (workspace.placementsTree || []).forEach((placement) => {
      (placement.adBlueprints || []).forEach((adBlueprint) => {
        (adBlueprint.targetingRules || []).forEach((rule) => {
          if (!String(rule.name || "").trim()) {
            issues.push(issue(`targeting-rule-name-${adBlueprint.id}-${rule.id}`, "blocking", "Creative Routing Rules", "Rule name is required."));
          }
          const audienceConditions = (rule.conditions || []).filter((condition) => condition.type === "audience");
          const audienceValueIds = audienceConditions.flatMap((condition) => condition.valueIds || []);
          if (!audienceValueIds.length) {
            issues.push(issue(`targeting-rule-audience-${adBlueprint.id}-${rule.id}`, "blocking", "Creative Routing Rules", "At least one Audience Targeting value is required."));
          }
          (rule.conditions || []).forEach((condition) => {
            if (!condition.type || condition.type !== "audience") {
              issues.push(issue(`targeting-condition-type-${adBlueprint.id}-${rule.id}-${condition.id}`, "blocking", "Creative Routing Rules", "Audience Targeting is the only supported rule type in this prototype phase."));
            }
            (condition.valueIds || []).forEach((valueId) => {
              if (!audienceIds.has(valueId)) {
                issues.push(issue(`targeting-condition-audience-value-${adBlueprint.id}-${rule.id}-${condition.id}-${valueId}`, "blocking", "Creative Routing Rules", "Audience Targeting value must exist in the Campaign Blueprint targeting library."));
              }
            });
          });
          if (rule.scheduleId && !scheduleIds.has(rule.scheduleId)) {
            issues.push(issue(`targeting-rule-schedule-${adBlueprint.id}-${rule.id}`, "blocking", "Creative Routing Rules", "Delivery Schedule must exist in the Campaign Blueprint targeting library."));
          }
          const filter = rule.creativeVariantFilter || {};
          if (!filter.feedField) {
            issues.push(issue(`targeting-rule-feed-field-${adBlueprint.id}-${rule.id}`, "blocking", "Creative Routing Rules", "Automation feed field is required."));
          }
          if (filter.feedField && feedFieldIds.size && !feedFieldIds.has(filter.feedField)) {
            issues.push(issue(`targeting-rule-feed-field-invalid-${adBlueprint.id}-${rule.id}`, "blocking", "Creative Routing Rules", "Automation feed field is not available in prototype fixtures."));
          }
          if (!filter.operator) {
            issues.push(issue(`targeting-rule-operator-${adBlueprint.id}-${rule.id}`, "blocking", "Creative Routing Rules", "Creative variant filter condition is required."));
          }
          if (filter.operator && !VALID_AUDIENCE_OPERATORS.includes(filter.operator)) {
            issues.push(issue(`targeting-rule-operator-invalid-${adBlueprint.id}-${rule.id}`, "blocking", "Creative Routing Rules", "Creative variant filter condition is not supported."));
          }
          if (filter.operator !== "is_not_empty" && !String(filter.value || "").trim()) {
            issues.push(issue(`targeting-rule-filter-value-${adBlueprint.id}-${rule.id}`, "blocking", "Creative Routing Rules", "Creative variant filter value is required unless condition is is not empty."));
          }
          if (!String(rule.priority || "").trim()) {
            issues.push(issue(`targeting-rule-priority-${adBlueprint.id}-${rule.id}`, "blocking", "Creative Routing Rules", "Priority is required."));
          } else if (Number.isNaN(Number(rule.priority))) {
            issues.push(issue(`targeting-rule-priority-invalid-${adBlueprint.id}-${rule.id}`, "blocking", "Creative Routing Rules", "Priority must be a number."));
          }
          if (filter.feedField && filter.operator && (filter.value || filter.operator === "is_not_empty") && !matchingVariantCount(data, filter)) {
            issues.push(issue(`targeting-rule-no-matches-${adBlueprint.id}-${rule.id}`, "warning", "Creative Routing Rules", "Creative variant filter has no matching Automation feed rows."));
          }
        });
      });
    });
    return issues;
  }

  function validatePrototypeAudienceMappings(workspace, referenceData) {
    return validatePrototypeTargetingRules(workspace, referenceData);
  }

  function validatePrototypeWorkspace(workspace, referenceData) {
    const data = referenceData || {};
    return [
      ...validatePrototypeAccounts(workspace, data),
      ...validatePrototypeCampaign(workspace, data),
      ...validatePrototypePlacements(workspace, data),
      ...validatePrototypeDv360(workspace, data),
      ...validatePrototypeAdBlueprints(workspace, data),
      ...validatePrototypeTargetingRules(workspace, data),
    ];
  }

  window.cm360WorkspacePrototypeValidation = {
    validatePrototypeAccounts,
    validatePrototypeCampaign,
    validatePrototypePlacements,
    validatePrototypeDv360,
    validatePrototypeAdBlueprints,
    validatePrototypeAudienceMappings,
    validatePrototypeTargetingRules,
    validatePrototypeWorkspace,
  };
})();
