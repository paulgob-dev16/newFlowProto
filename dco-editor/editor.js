(function () {
  const root = document.getElementById("dcoEditorApp");
  const query = new URLSearchParams(window.location.search);
  const formats = ["300x250", "300x600", "728x90", "160x600", "120x600"];
  const variants = [
    { id: "city-wool-coat", name: "City wool coat", eyebrow: "Cold-weather polish", headline: "Wool, for the city cold", subtitle: "A new season, built with considered essentials.", cta: "Shop coats", cta2: "Learn more", logo: "Smartly.io", price: "$229", shapeColor: "#DF3A31", tone: "stone" },
    { id: "relaxed-chinos", name: "Relaxed chinos", eyebrow: "Off-duty tailoring", headline: "Chinos, off duty", subtitle: "Sand cotton with room to move.", cta: "Shop now", cta2: "Learn more", logo: "Smartly.io", price: "$229", shapeColor: "#DF3A31", tone: "sand" },
    { id: "utility-overshirt", name: "Utility overshirt", eyebrow: "Layered utility", headline: "Utility, refined", subtitle: "An olive overshirt built to layer.", cta: "Shop outerwear", cta2: "Learn more", logo: "Smartly.io", price: "$229", shapeColor: "#DF3A31", tone: "slate" },
    { id: "merino-knit", name: "Merino knit", eyebrow: "Lightweight warmth", headline: "Merino, lighter warmth", subtitle: "Camel knit for the first cold mornings.", cta: "Shop knitwear", cta2: "Learn more", logo: "Smartly.io", price: "$229", shapeColor: "#DF3A31", tone: "warm" },
    { id: "tailored-trousers", name: "Tailored trousers", eyebrow: "Refined essentials", headline: "Trousers, tailored easy", subtitle: "Charcoal wool with a cleaner line.", cta: "Shop trousers", cta2: "Learn more", logo: "Smartly.io", price: "$229", shapeColor: "#DF3A31", tone: "cream" },
    { id: "oxford-shirt", name: "Oxford shirt", eyebrow: "Everyday structure", headline: "Oxford, every day", subtitle: "Crisp cotton for everyday structure.", cta: "Shop shirts", cta2: "Learn more", logo: "Smartly.io", price: "$229", shapeColor: "#DF3A31", tone: "pale" },
  ];
  const renditions = variants.flatMap((variant, variantIndex) => formats.map((format, formatIndex) => ({
    ...variant,
    id: `${variant.id}-${format}`,
    variantId: variant.id,
    templateId: `wool-coat-template-${format}`,
    templateName: `Wool Coat Template - ${format}`,
    variantIndex,
    formatIndex,
    format,
    displayId: 13 + (variantIndex * formats.length) + formatIndex,
    backgroundImage: `/catalog-images/creative-${variant.id}-${format}.webp`,
    backgroundImageName: `creative-${variant.id}-${format}.webp`,
  })));
  const initiallyApproved = new Set([
    "city-wool-coat-300x250",
    "relaxed-chinos-300x600",
    "utility-overshirt-728x90",
    "merino-knit-160x600",
    "tailored-trousers-120x600",
  ]);
  const state = {
    tab: ["editor", "content", "assets"].includes(query.get("tab")) ? query.get("tab") : "editor",
    selectedLayer: "Background image",
    selectedVariantId: variants[0].id,
    selectedRenditionId: renditions[0].id,
    selectedRenditionIds: [],
    bulkReviewMenuOpen: false,
    reviewStatuses: Object.fromEntries(renditions.map((rendition) => [rendition.id, initiallyApproved.has(rendition.id) ? "approved" : "work_in_progress"])),
    toast: "",
  };

  function escapeHtml(value) {
    return String(value == null ? "" : value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
  }

  function selectedVariant() {
    return variants.find((variant) => variant.id === state.selectedVariantId) || variants[0];
  }

  function variantRenditions(variantId) {
    return renditions.filter((rendition) => rendition.variantId === variantId);
  }

  function selectVariant(variantId, preferredFormat) {
    const variant = variants.find((item) => item.id === variantId) || variants[0];
    const nextRenditions = variantRenditions(variant.id);
    const rendition = nextRenditions.find((item) => item.format === preferredFormat) || nextRenditions[0];
    state.selectedVariantId = variant.id;
    state.selectedRenditionId = rendition.id;
  }

  function creativeArt(item, compact) {
    return `<div class="creative-art ${item.tone} ${compact ? "compact" : ""}" data-format="${item.format}"><span class="art-label">${escapeHtml(item.eyebrow)}</span><span class="art-brand">SMARTLY.IO</span><div class="model"><i></i></div><div class="art-copy"><strong>${escapeHtml(item.headline)}</strong><small>${escapeHtml(item.subtitle)}</small><b>${escapeHtml(item.cta)}</b><em>${escapeHtml(item.price)}</em></div></div>`;
  }

  function reviewStatus(renditionId) {
    return state.reviewStatuses[renditionId] || "work_in_progress";
  }

  function approvedRenditions() {
    return renditions.filter((rendition) => reviewStatus(rendition.id) === "approved");
  }

  function selectedRenditionIds() {
    return new Set(state.selectedRenditionIds);
  }

  function applyBulkReviewStatus(status) {
    const selectedIds = selectedRenditionIds();
    if (!selectedIds.size) return;
    selectedIds.forEach((renditionId) => { state.reviewStatuses[renditionId] = status; });
    state.bulkReviewMenuOpen = false;
    state.toast = `${selectedIds.size} preview${selectedIds.size === 1 ? "" : "s"} ${status === "approved" ? "approved" : "rejected"}.`;
    render();
    window.setTimeout(() => { state.toast = ""; render(); }, 2200);
  }

  function reviewStatusSelect(rendition) {
    const status = reviewStatus(rendition.id);
    return `<select class="review-status-select ${status}" data-action="review-status" data-rendition-id="${rendition.id}" aria-label="Review status for ${escapeHtml(rendition.name)} ${rendition.format}"><option class="approved" value="approved" ${status === "approved" ? "selected" : ""}>✓ Approved</option><option class="rejected" value="rejected" ${status === "rejected" ? "selected" : ""}>Rejected</option><option class="work-in-progress" value="work_in_progress" ${status === "work_in_progress" ? "selected" : ""}>Work in Progress</option></select>`;
  }

  function variantPager() {
    const index = variants.findIndex((variant) => variant.id === state.selectedVariantId);
    return `<span class="variant-pager"><button type="button" data-action="previous-variant" ${index <= 0 ? "disabled" : ""} aria-label="Previous variant">‹</button><strong>${index + 1}</strong><button type="button" data-action="next-variant" ${index >= variants.length - 1 ? "disabled" : ""} aria-label="Next variant">›</button><span>of ${variants.length}</span></span>`;
  }

  function formatPreview(rendition) {
    return `<button class="format-preview ${state.selectedRenditionId === rendition.id ? "selected" : ""}" type="button" data-action="rendition" data-rendition-id="${rendition.id}"><span><strong>${escapeHtml(rendition.templateName)}</strong><small><span>Platform</span><span>Ad format</span><em>${rendition.format}</em></small></span>${creativeArt(rendition, true)}</button>`;
  }

  function header() {
    const approvedCount = approvedRenditions().length;
    return `<header class="editor-header"><div class="editor-identity"><span class="brand-disc">↪</span><div><div class="editor-breadcrumb"><strong>Autumn Collection 2026</strong><span>›</span><span>Men's essentials</span><button aria-label="Edit title">✎</button></div><small>${renditions.length} creatives · Last updated 4 days ago</small></div></div><nav class="editor-tabs" aria-label="Template Editor areas">${["editor", "content", "assets"].map((tab) => `<button class="${state.tab === tab ? "active" : ""}" data-action="tab" data-tab="${tab}">${tab[0].toUpperCase() + tab.slice(1)}</button>`).join("")}</nav><div class="editor-actions"><span class="connection-status">✓ 1 connected</span><button class="secondary" data-action="manage-data">▦ &nbsp; Manage Data</button><button class="activate-button" type="button" data-action="activate" ${approvedCount ? "" : 'disabled title="Set at least one creative to Approve before activation."'}>Activate Creatives →</button></div></header>`;
  }

  function editorView() {
    const layers = ["Background image", "Eyebrow", "Headline", "Subtitle", "CTA", "CTA 2", "Logo", "Price", "Shape color"];
    const variant = selectedVariant();
    return `<main class="editor-view"><aside class="tool-rail"><button class="active">A+</button><button>⌁</button><button>▧</button><button>▦</button><button>◉</button><button>◫</button></aside><aside class="layer-tree"><div>⌄ &nbsp;▣ Essentials · Story</div><div class="tree-indent">⌄ &nbsp;□ Frame 1</div>${layers.map((layer) => `<button class="${state.selectedLayer === layer ? "active" : ""}" data-action="layer" data-layer="${escapeHtml(layer)}">${layer === "Price" ? "$" : layer === "Background image" || layer === "Logo" ? "▧" : layer === "Shape color" ? "■" : "A"} ${escapeHtml(layer)}</button>`).join("")}</aside><section class="canvas"><div class="canvas-toolbar"><span>↶ &nbsp; ↷</span>${variantPager()}<strong class="canvas-variant-name">${escapeHtml(variant.name)}</strong></div><div class="format-stage">${variantRenditions(variant.id).map(formatPreview).join("")}</div></section><aside class="properties"><h2>Properties</h2><div class="property-body"><small>${escapeHtml(state.selectedLayer)}<br>${escapeHtml(variant.name)}</small><label><span>Layer name</span><input value="${escapeHtml(state.selectedLayer)}"></label><label><span>Content source</span><textarea rows="3">${escapeHtml(state.selectedLayer === "Background image" ? renditions.find((item) => item.id === state.selectedRenditionId)?.backgroundImage || "" : "Automation Feed")}</textarea><small>Type {{ to add feed or dynamic content.</small></label><div class="property-block"><span>Make dynamic</span><b>${escapeHtml(state.selectedLayer)} &nbsp; ×</b></div><div class="property-title"><strong>Conditional rendering</strong><button>+</button></div><p>Hide this layer when a feed field does not match a value.</p><div class="property-toggle"><span><strong>Manage in content table</strong><small>Show this layer as an editable column in Content.</small></span><i></i></div>${["Position", "Size", "Typography or appearance"].map((label, index) => `<label><span>${label}</span><select><option>${["Top left", "Medium", "Image fill"][index]}</option></select></label>`).join("")}<div class="property-toggle simple"><i></i><strong>Visible</strong></div></div></aside></main>`;
  }

  function managedHeading(label) {
    return `${escapeHtml(label)} <span class="managed-column-icon" aria-label="Managed in Content">▦</span>`;
  }

  function contentRow(item) {
    return `<tr class="${state.selectedRenditionId === item.id ? "selected" : ""}" data-action="content-row" data-rendition-id="${item.id}"><td>□</td><td><strong>${item.displayId}</strong></td><td>${escapeHtml(item.name)}</td><td><span class="neutral-chip">⌛ Draft</span></td><td><span class="blue-chip">Static image</span></td><td><span class="neutral-chip">${item.format}</span></td><td><button class="purple-text">+ Add platform</button></td><td><button class="purple-text">+ Add format</button></td><td><span class="image-cell"><i class="${item.tone}"></i><span title="${escapeHtml(item.backgroundImage)}">${escapeHtml(item.backgroundImageName)}</span></span></td><td class="content-text-cell" title="${escapeHtml(item.eyebrow)}">${escapeHtml(item.eyebrow)}</td><td class="content-text-cell" title="${escapeHtml(item.headline)}">${escapeHtml(item.headline)}</td><td class="content-text-cell" title="${escapeHtml(item.subtitle)}">${escapeHtml(item.subtitle)}</td><td class="content-text-cell" title="${escapeHtml(item.cta)}">${escapeHtml(item.cta)}</td><td class="content-text-cell" title="${escapeHtml(item.cta2)}">${escapeHtml(item.cta2)}</td><td><span class="logo-cell"><i>S</i><span>${escapeHtml(item.logo)}</span></span></td><td>${escapeHtml(item.price)}</td><td><span class="shape-color-cell"><i style="background:${item.shapeColor}"></i>${escapeHtml(item.shapeColor)}</span></td></tr>`;
  }

  function contentView() {
    const variant = selectedVariant();
    const dynamicColumns = ["Background image", "Eyebrow", "Headline", "Subtitle", "CTA", "CTA 2", "Logo", "Price", "Shape color"];
    return `<main class="content-view"><section class="content-preview"><div class="canvas-toolbar"><span>↶ &nbsp; ↷</span>${variantPager()}<strong class="canvas-variant-name">${escapeHtml(variant.name)}</strong></div><div class="content-preview-row">${variantRenditions(variant.id).map(formatPreview).join("")}</div></section><section class="content-table"><div class="table-toolbar"><input placeholder="⌕  Search"><button>▦ &nbsp; Columns⌄</button><button>▱ &nbsp; Group by: None⌄</button><button>☰ &nbsp; Filters⌄</button><button>⋮</button></div><div class="table-group-title">TEMPLATE DETAILS &nbsp; ⓘ &nbsp; ⋮</div><table><thead><tr><th>□</th><th>ID</th><th>Variant</th><th>Status</th><th>Type</th><th>Format</th><th>Platform</th><th>Ad format</th>${dynamicColumns.map((column) => `<th>${managedHeading(column)}</th>`).join("")}</tr></thead><tbody>${renditions.map(contentRow).join("")}</tbody></table><footer><button>＋ &nbsp; New view</button><button class="active">⌂ &nbsp; All templates</button></footer></section></main>`;
  }

  function assetsView() {
    const approvedCount = approvedRenditions().length;
    const excludedCount = renditions.length - approvedCount;
    const selectedIds = selectedRenditionIds();
    const allSelected = selectedIds.size === renditions.length;
    return `<main class="assets-view"><div class="assets-toolbar"><div class="asset-selection-controls"><label class="select-all-control"><input type="checkbox" data-action="select-all-assets" ${allSelected ? "checked" : ""}> <span>Select all</span></label>${selectedIds.size ? `<span class="selection-count">${selectedIds.size} selected</span><div class="bulk-review-control"><button class="bulk-review-trigger" type="button" data-action="toggle-bulk-review" aria-expanded="${state.bulkReviewMenuOpen}">Update status ▾</button>${state.bulkReviewMenuOpen ? `<div class="bulk-review-menu" role="menu"><button type="button" data-action="bulk-review-status" data-status="approved" role="menuitem"><span class="bulk-status-dot approved"></span><span><strong>Approve All</strong><small>Approve ${selectedIds.size} selected preview${selectedIds.size === 1 ? "" : "s"}</small></span></button><button type="button" data-action="bulk-review-status" data-status="rejected" role="menuitem"><span class="bulk-status-dot rejected"></span><span><strong>Reject All</strong><small>Reject ${selectedIds.size} selected preview${selectedIds.size === 1 ? "" : "s"}</small></span></button></div>` : ""}</div>` : ""}</div><input placeholder="⌕  Search assets..."><span></span><span class="render-status">◔ 25/${renditions.length} previews rendering</span><button>▱ &nbsp; Group by: ID⌄</button><button>☰ &nbsp; Filters⌄</button><button>▦ &nbsp; Export as Feed</button></div><section class="handoff-banner"><div><span>Workspace activation package</span><strong>Summer Campaign Dynamic Creative</strong><p>${approvedCount} approved preview${approvedCount === 1 ? "" : "s"} will be included. ${excludedCount} preview${excludedCount === 1 ? " is" : "s are"} not approved and will be excluded without blocking activation.</p></div><div>${approvedCount ? `<span class="approved-chip">✓ ${approvedCount} approved</span>` : '<span class="approval-empty">0 approved</span>'}<button class="activate-button" type="button" data-action="activate" ${approvedCount ? "" : 'disabled title="Set at least one creative to Approve before activation."'}>Activate Creatives →</button></div></section><section class="asset-grid">${renditions.map((item) => `<article class="asset-card ${selectedIds.has(item.id) ? "selected" : ""}"><label class="asset-select-control" aria-label="Select ${escapeHtml(item.name)} ${item.format}"><input type="checkbox" data-action="select-asset" data-rendition-id="${item.id}" ${selectedIds.has(item.id) ? "checked" : ""}></label>${creativeArt(item, false)}<div class="asset-meta">${reviewStatusSelect(item)}<h3 title="${escapeHtml(item.name)} · ${item.format}">${escapeHtml(item.name)} · Essentials · ${item.format}</h3><dl><div><dt>Platform</dt><dd>—</dd></div><div><dt>Ad format</dt><dd>—</dd></div></dl><div><span class="blue-chip">Static image</span><span class="neutral-chip">${item.format}</span></div></div></article>`).join("")}</section></main>`;
  }

  function activateInWorkspace() {
    const approvedPreviewRows = approvedRenditions();
    if (!approvedPreviewRows.length) return;
    const approvedVariants = variants.map((variant) => {
      const approvedFormats = approvedPreviewRows.filter((rendition) => rendition.variantId === variant.id);
      if (!approvedFormats.length) return null;
      return {
        id: `approved-${variant.id}`,
        name: variant.name,
        headline: variant.headline,
        subtitle: variant.subtitle,
        cta: variant.cta,
        cta2: variant.cta2,
        logo: variant.logo,
        price: variant.price,
        shapeColor: variant.shapeColor,
        formats: approvedFormats.map((rendition) => rendition.format),
        renditions: approvedFormats.map((rendition) => ({ id: rendition.id, templateId: rendition.templateId, templateName: rendition.templateName, format: rendition.format, backgroundImage: rendition.backgroundImage, approvalStatus: "approved" })),
        approvalStatus: "approved",
      };
    }).filter(Boolean).map((variant, index) => ({ ...variant, isDefault: index === 0 }));
    window.sessionStorage.setItem("cm360-approved-activation-package", JSON.stringify({
      name: "Summer Campaign Dynamic Creative",
      approvedVariants,
      approvedPreviewCount: approvedPreviewRows.length,
      excludedPreviewCount: renditions.length - approvedPreviewRows.length,
      totalPreviewCount: renditions.length,
    }));
    window.location.href = "../cm360-workspace/index.html?source=editor&workspace=retail-evergreen-display&view=dco&section=overview";
  }

  function render() {
    root.innerHTML = `<div class="editor-app">${header()}${state.tab === "editor" ? editorView() : state.tab === "content" ? contentView() : assetsView()}<div class="editor-toast ${state.toast ? "show" : ""}">${escapeHtml(state.toast)}</div></div>`;
  }

  root.addEventListener("click", (event) => {
    const target = event.target.closest("[data-action]");
    if (!target) { if (state.bulkReviewMenuOpen) { state.bulkReviewMenuOpen = false; render(); } return; }
    if (target.dataset.action === "tab") { state.tab = target.dataset.tab; history.replaceState(null, "", `?tab=${state.tab}`); render(); }
    if (target.dataset.action === "layer") { state.selectedLayer = target.dataset.layer; render(); }
    if (["rendition", "content-row"].includes(target.dataset.action)) {
      const rendition = renditions.find((item) => item.id === target.dataset.renditionId);
      if (rendition) { state.selectedVariantId = rendition.variantId; state.selectedRenditionId = rendition.id; render(); }
    }
    if (["previous-variant", "next-variant"].includes(target.dataset.action)) {
      const currentIndex = variants.findIndex((variant) => variant.id === state.selectedVariantId);
      const currentFormat = renditions.find((rendition) => rendition.id === state.selectedRenditionId)?.format;
      const nextIndex = target.dataset.action === "previous-variant" ? Math.max(0, currentIndex - 1) : Math.min(variants.length - 1, currentIndex + 1);
      selectVariant(variants[nextIndex].id, currentFormat);
      render();
    }
    if (target.dataset.action === "manage-data") { state.toast = "Automation Feed is connected: 30 rendition rows."; render(); window.setTimeout(() => { state.toast = ""; render(); }, 2200); }
    if (target.dataset.action === "toggle-bulk-review") { state.bulkReviewMenuOpen = !state.bulkReviewMenuOpen; render(); }
    if (target.dataset.action === "bulk-review-status") applyBulkReviewStatus(target.dataset.status);
    if (target.dataset.action === "activate") activateInWorkspace();
  });

  root.addEventListener("change", (event) => {
    const target = event.target.closest("[data-action]");
    if (!target) return;
    if (target.dataset.action === "review-status") { state.reviewStatuses[target.dataset.renditionId] = target.value; render(); }
    if (target.dataset.action === "select-all-assets") { state.selectedRenditionIds = target.checked ? renditions.map((rendition) => rendition.id) : []; state.bulkReviewMenuOpen = false; render(); }
    if (target.dataset.action === "select-asset") { const selectedIds = selectedRenditionIds(); target.checked ? selectedIds.add(target.dataset.renditionId) : selectedIds.delete(target.dataset.renditionId); state.selectedRenditionIds = [...selectedIds]; if (!selectedIds.size) state.bulkReviewMenuOpen = false; render(); }
  });

  render();
})();
