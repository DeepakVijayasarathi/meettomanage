# Traffic growth: resource release

## What is prepared

- `/resources`: a free template library.
- `/resources/coaching-centre-fee-tracker`: a CSV download, fictional worked examples, partial-payment and credit instructions.
- `/resources/teacher-handover-checklist`: an editable checklist and a before/during/after-class handover guide.
- Contextual links from the homepage, blog, fee-management, attendance and live-class pages, plus the shared footer.
- Dedicated titles, descriptions, canonicals, breadcrumbs, article metadata and sitemap entries. The resource pages are included in HTML prerendering.
- Page views use the site's existing analytics. A download emits `resource_download` through the existing Google Analytics tag, with the resource slug and filename, when that tag is configured. No new tracking service is installed.

The resources are manual tools. They do not import records into Meet to Manage, reconcile payments or update schedules automatically. All example records are fictional.

## Release and measure

1. Publish the reviewed website build through the normal deployment process.
2. Inspect all three resource URLs in Google Search Console and submit the existing sitemap index at `https://meettomanage.cloud/sitemap.xml`.
3. Record the current baseline before evaluating changes: organic clicks and impressions by landing page and query; website enquiries and walkthrough bookings; resource downloads.
4. Compare equivalent periods after indexing, allowing for seasonality and changes to other campaigns. Use query and landing-page data to decide what to improve next. A new page or sitemap entry does not guarantee indexing or rankings.
5. In GA4, inspect `resource_download` by `resource_slug` and compare visits with actual enquiries. Register the slug as an event-scoped custom dimension if needed for reporting.

## Distribution that needs account access

- Share each guide in an appropriate existing academy newsletter or social account with a clear description of the template. No messages or posts have been sent.
- Ask existing customers whether they want to link to a useful resource or contribute an approved quote. No quotes, numerical outcomes or endorsements have been invented.
- The suggested Windsor.ai connection can provide Search Console and GA4 reporting after the relevant accounts are connected. No search-performance data was available for this release.

## Next evidence to collect

- Top organic queries, countries and landing pages from Search Console.
- Which resource downloads lead to enquiries and walkthroughs.
- Approved customer-specific workflows, quotes and measurable results.
- Questions real academy teams ask after using the templates.

Use these observations to improve the existing guides before expanding the library. Proposed search topics are hypotheses until actual search data is available.
