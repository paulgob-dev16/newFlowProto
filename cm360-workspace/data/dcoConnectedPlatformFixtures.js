(function () {
  window.cm360DcoConnectedPlatformFixtures = {
    lastSyncedLabel: "Last synced just now",
    accounts: {
      CM360: { name: "Nike EMEA", state: "Connected" },
      DV360: { name: "Nike EMEA", state: "Connected" },
      Studio: { name: "Nike EMEA Studio Advertiser", state: "Connected" },
    },
    cm360Placements: [
      { id: "detected-cm-74182031", name: "Retail Homepage MPU", platformId: "74182031", campaignId: "cmcamp-evergreen-retail-2026", campaign: "Evergreen Retail 2026", site: "Retail Homepage", format: "300x250", source: "Connected CM360" },
      { id: "detected-cm-74182032", name: "Product Detail MPU", platformId: "74182032", campaignId: "cmcamp-evergreen-retail-2026", campaign: "Evergreen Retail 2026", site: "Product Detail", format: "300x250", source: "Connected CM360" },
      { id: "detected-cm-74182033", name: "Summer Skyscraper", platformId: "74182033", campaignId: "cmcamp-evergreen-retail-2026", campaign: "Evergreen Retail 2026", site: "Retail Homepage", format: "300x600", source: "Connected CM360" },
      { id: "detected-cm-74182034", name: "Promotional Skyscraper", platformId: "74182034", campaignId: "cmcamp-evergreen-retail-2026", campaign: "Evergreen Retail 2026", site: "Offers", format: "300x600", source: "Connected CM360" },
      { id: "detected-cm-74182035", name: "News Leaderboard", platformId: "74182035", campaignId: "cmcamp-evergreen-retail-2026", campaign: "Evergreen Retail 2026", site: "News Network", format: "728x90", source: "Connected CM360" },
      { id: "detected-cm-74182036", name: "Sports Leaderboard", platformId: "74182036", campaignId: "cmcamp-evergreen-retail-2026", campaign: "Evergreen Retail 2026", site: "Sports Network", format: "728x90", source: "Connected CM360" },
      { id: "detected-cm-74182037", name: "Category Wide Skyscraper", platformId: "74182037", campaignId: "cmcamp-evergreen-retail-2026", campaign: "Evergreen Retail 2026", site: "Category Pages", format: "160x600", source: "Connected CM360" },
      { id: "detected-cm-74182038", name: "Retargeting Wide Skyscraper", platformId: "74182038", campaignId: "cmcamp-evergreen-retail-2026", campaign: "Evergreen Retail 2026", site: "Product Network", format: "160x600", source: "Connected CM360" },
      { id: "detected-cm-74182039", name: "Sidebar Small Skyscraper", platformId: "74182039", campaignId: "cmcamp-evergreen-retail-2026", campaign: "Evergreen Retail 2026", site: "Retail Sidebar", format: "120x600", source: "Connected CM360" },
      { id: "detected-cm-74182040", name: "Legacy Sidebar", platformId: "74182040", campaignId: "cmcamp-evergreen-retail-2026", campaign: "Evergreen Retail 2026", site: "Legacy Network", format: "120x600", source: "Connected CM360" },
    ],
    dv360LineItems: [
      { id: "detected-dv-51232116512", name: "Prospecting - Professionals", platformId: "51232116512", campaign: "Evergreen Retail 2026", compatibility: "All supported formats", source: "Connected DV360" },
      { id: "detected-dv-51232116513", name: "Prospecting - Young Adults", platformId: "51232116513", campaign: "Evergreen Retail 2026", compatibility: "All supported formats", source: "Connected DV360" },
      { id: "detected-dv-51232116514", name: "Retargeting - Product Viewers", platformId: "51232116514", campaign: "Retargeting Campaign", compatibility: "All supported formats", source: "Connected DV360" },
      { id: "detected-dv-51232116515", name: "Retargeting - Cart Abandoners", platformId: "51232116515", campaign: "Retargeting Campaign", compatibility: "All supported formats", source: "Connected DV360" },
      { id: "detected-dv-51232116516", name: "Loyalty Customers", platformId: "51232116516", campaign: "Evergreen Retail 2026", compatibility: "All supported formats", source: "Connected DV360" },
      { id: "detected-dv-51232116517", name: "High Value Shoppers", platformId: "51232116517", campaign: "Evergreen Retail 2026", compatibility: "All supported formats", source: "Connected DV360" },
      { id: "detected-dv-51232116518", name: "Regional Prospecting", platformId: "51232116518", campaign: "Regional Campaign", compatibility: "All supported formats", source: "Connected DV360" },
      { id: "detected-dv-51232116519", name: "Regional Retargeting", platformId: "51232116519", campaign: "Regional Campaign", compatibility: "All supported formats", source: "Connected DV360" },
      { id: "detected-dv-51232116520", name: "Always-on Prospecting", platformId: "51232116520", campaign: "Always-on Campaign", compatibility: "All supported formats", source: "Connected DV360" },
      { id: "detected-dv-51232116521", name: "Weekend Retargeting", platformId: "51232116521", campaign: "Weekend Campaign", compatibility: "All supported formats", source: "Connected DV360" },
    ],
    segmentSeeds: [],
    segmentAutomationFeeds: [
      {
        id: "feed-audience-targeting",
        name: "Audience targeting feed",
        columns: ["Audience Name", "DV360 Line Item ID", "CM360 Placement ID", "Geo", "Schedule"],
        rows: [
          { "Audience Name": "New Parents", "DV360 Line Item ID": "51232116513", "CM360 Placement ID": "74182031", Geo: "Greater London", Schedule: "Afternoon" },
          { "Audience Name": "Sports Commuters", "DV360 Line Item ID": "51232116517", "CM360 Placement ID": "74182036", Geo: "Manchester", Schedule: "Evening" },
          { "Audience Name": "Lapsed Buyers", "DV360 Line Item ID": "51232116515", "CM360 Placement ID": "74182038", Geo: "United Kingdom", Schedule: "Weekday Morning" },
        ],
      },
      {
        id: "feed-regional-targeting",
        name: "Regional activation feed",
        columns: ["Segment", "DV ID", "Placement ID", "Region", "Daypart"],
        rows: [
          { Segment: "Northern Prospecting", "DV ID": "51232116518", "Placement ID": "74182035", Region: "North West", Daypart: "Afternoon" },
          { Segment: "Weekend Loyalty", "DV ID": "51232116516", "Placement ID": "74182040", Region: "Scotland", Daypart: "Weekend All Day" },
        ],
      },
    ],
  };
})();
