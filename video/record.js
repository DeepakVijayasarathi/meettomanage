// Full continuous recording for the "full feature end-to-end" Meet to Manage tour.
// - Onboarding tone: hook -> one login/portal-select reveal -> all 8 role portals in
//   turn -> live classroom -> differentiator -> sign-in close.
// - Theme forced light throughout (localStorage 'trn.theme'='light'), independent of
//   the recording machine's OS color-scheme.
// - Demo-mode role switching via /portal-select (setRole + client-side navigate) --
//   no real backend/credentials needed, but each role change must go back through
//   /portal-select and click that role's card (RequireAuth checks session role
//   against the route).
// - Beat durations are paced from voiceover/manifest.json (actual TTS length); the
//   exact real screen-time per beat is measured via the returned beatLog and then
//   padded/trimmed frame-accurately in assemble.py -- the waits below just need to be
//   in the right ballpark (>= vo_duration + planned buffer), not frame-perfect.
async page => {
  const PRIMARY = "#1F3B61"; // real site --primary (214 52% 25%)
  const ACCENT = "#E63228"; // real site --brand-accent (3 79% 53%)
  const ORANGE = "#F97316"; // the actual logo's warm orange -- the light card family's pop color
  const ROLE_HEX = {
    admin: "#1F6FE0",
    teacher: "#F08A1D",
    parent: "#23A455",
    student: "#3B82F6",
    subadmin: "#0E9C8C",
    admission: "#8356E7",
    coordinator: "#B8860B",
    management: "#4F46E5",
  };

  await page.addInitScript(() => {
    try {
      localStorage.setItem("trn.theme", "light");
    } catch {
      /* storage unavailable -- theme still defaults light on first paint */
    }
  });

  // Measures the tooltip's *actual* rendered width (same font/padding as the real
  // callout) instead of estimating from character count.
  async function measureCalloutWidth(text) {
    return page.evaluate(t => {
      const d = document.createElement("div");
      d.style.cssText =
        "position:fixed; left:-9999px; top:-9999px; padding:10px 18px; " +
        "font:700 15px/1.3 'Segoe UI', system-ui, sans-serif; white-space:nowrap;";
      d.textContent = t;
      document.body.appendChild(d);
      const w = d.getBoundingClientRect().width;
      d.remove();
      return w;
    }, text);
  }

  // Returns the first *visible* match for a locator -- plain .first() can land on a
  // hidden duplicate (e.g. inactive-tab content still mounted in the DOM).
  async function firstVisible(locator) {
    const n = await locator.count();
    for (let i = 0; i < n; i++) {
      const el = locator.nth(i);
      if (await el.isVisible()) return el;
    }
    return null;
  }

  // (centerX, targetTopY) -- anchors the tooltip's pointer directly above the
  // target's horizontal center, `gap` px above its top edge. `color` lets each
  // portal beat tint its callout with that role's own brand hex (matching the
  // app's own role color-coding) instead of one flat accent everywhere.
  function callout(centerX, targetTopY, text, boxWidth, color = ACCENT, gap = 20) {
    const viewportW = 1920;
    const margin = 20;
    const halfWidth = boxWidth / 2;
    const boxCenterX = Math.min(Math.max(centerX, halfWidth + margin), viewportW - halfWidth - margin);
    const pointerShift = Math.max(Math.min(centerX - boxCenterX, halfWidth - 14), -(halfWidth - 14));
    return `
      <div style="position:fixed; left:${boxCenterX}px; top:${targetTopY - gap}px;
        transform: translate(-50%, -100%);">
        <div style="display:flex; flex-direction:column; align-items:center;
          animation: mtmCalloutIn .32s cubic-bezier(.16,1,.3,1) both;">
          <style>
            @keyframes mtmCalloutIn {
              from { opacity: 0; transform: translateY(8px) scale(.9); }
              to   { opacity: 1; transform: translateY(0) scale(1); }
            }
          </style>
          <div style="padding:10px 18px; border-radius:10px;
            background: ${color};
            color:#fff; font:700 15px/1.3 'Segoe UI', system-ui, sans-serif; white-space:nowrap;
            box-shadow: 0 12px 26px rgba(0,0,0,.4), inset 0 1px 0 rgba(255,255,255,.25);">
            ${text}
          </div>
          <div style="width:0; height:0; border-left:7px solid transparent; border-right:7px solid transparent;
            border-top:8px solid ${color}; margin-top:-1px; transform: translateX(${pointerShift}px);
            filter: drop-shadow(0 3px 3px rgba(0,0,0,.25));"></div>
        </div>
      </div>`;
  }

  // Chapter beats now use finished design-mockup images (video/beat image/*.png,
  // copied into public/video-assets/ so the dev server can serve them -- deleted
  // again after the recording per the cleanup note at the bottom of this file)
  // instead of hand-built CSS/SVG cards. 1672x941 source, essentially exact 16:9,
  // so object-fit:cover shows the whole image with no meaningful crop.
  function imageCard(name) {
    return `
      <div style="position:fixed; inset:0; overflow:hidden; background:#eef1f7;">
        <img src="/video-assets/${name}.png" style="position:absolute; inset:0; width:100%; height:100%; object-fit:cover;" />
      </div>`;
  }


  // Enters a role portal from /portal-select and returns once the client-side
  // navigation has settled. Card titles are the exact ROLE_META labels.
  async function enterPortal(cardText) {
    await page.goto("http://localhost:5173/portal-select", { waitUntil: "networkidle" });
    await page.waitForTimeout(400);
    const card = page.getByText(cardText, { exact: true }).first();
    await card.hover();
    await page.waitForTimeout(250);
    await card.click();
    await page.waitForTimeout(1400); // let the portal's own data-load skeleton resolve
    // The OS cursor position persists across this client-side navigation. If it
    // happens to land on a chart bar in the new portal, recharts shows its own hover
    // tooltip unprompted, clashing with our custom callout (seen on the admission and
    // management beats). Park it somewhere inert first.
    await page.mouse.move(24, 24);
  }

  async function calloutOn(locatorOrGetter, label, color, holdMs = 2200, gap = 20) {
    try {
      const loc = typeof locatorOrGetter === "function" ? await locatorOrGetter() : locatorOrGetter;
      const bounds = loc && (await loc.boundingBox());
      if (!bounds) return;
      const w = await measureCalloutWidth(label);
      const cal = await page.screencast.showOverlay(
        callout(bounds.x + bounds.width / 2, bounds.y, label, w, color, gap)
      );
      await page.waitForTimeout(holdMs);
      await cal.dispose();
    } catch {
      /* target not found -- hold on the plain screen rather than fail the take */
    }
  }

  await page.screencast.start({ path: "recordings/full-take.webm", size: { width: 1920, height: 1080 } });
  const t0 = Date.now();
  const beatLog = [];
  const mark = id => beatLog.push({ id, t: Date.now() - t0 });

  // ---- 01_hook (4.37s VO + 1.2s buffer) ----
  // A real same-origin page (fully hidden behind the full-bleed image overlay) instead
  // of about:blank -- about:blank has no valid base URI, so the overlay's relative
  // /video-assets/*.png src would fail to resolve there.
  await page.goto("http://localhost:5173/portal-select", { waitUntil: "networkidle" });
  await page.waitForTimeout(200);
  mark("01_hook");
  const hookCard = await page.screencast.showOverlay(imageCard("hook"));
  await page.waitForTimeout(6400);
  await hookCard.dispose();

  // ---- 02_one_login (5.21s VO + 1.5s buffer) ----
  await page.goto("http://localhost:5173/login", { waitUntil: "networkidle" });
  await page.waitForTimeout(500);
  mark("02_one_login");
  const signInCard = page.getByText("Welcome back", { exact: true });
  try {
    await signInCard.hover({ timeout: 2000 });
  } catch {
    /* ignore */
  }
  await page.waitForTimeout(1600);
  await page.goto("http://localhost:5173/portal-select", { waitUntil: "networkidle" });
  await page.waitForTimeout(600);
  await page.mouse.move(960, 480);
  await page.waitForTimeout(3800);

  // ---- 03_admin (9.31s VO + 3.0s buffer) ----
  await enterPortal("Admin Portal");
  mark("03_admin");
  await calloutOn(
    async () => {
      // "Attendance Rate" appears twice on this dashboard (a primary KPI card and a
      // secondary metrics-grid card) -- .first() is required or boundingBox() throws
      // a strict-mode violation (silently swallowed by calloutOn's catch, which is
      // why this callout was going missing entirely).
      const el = page.getByText("Attendance Rate").first().locator("..").locator("..");
      return (await el.count()) ? el : null;
    },
    "Real-time attendance",
    ROLE_HEX.admin,
    2000
  );
  await page.mouse.wheel(0, 380);
  await page.waitForTimeout(1400); // trimmed: was letting the reports/CSV visual land
    // noticeably after the VO had already moved on to describing it
  await page.goto("http://localhost:5173/admin/reports", { waitUntil: "networkidle" });
  await page.waitForTimeout(500);
  const generateBtn = page.getByRole("button", { name: "Generate" });
  await generateBtn.hover();
  await page.waitForTimeout(250);
  await generateBtn.click();
  await page.waitForTimeout(1300);
  await calloutOn(
    page.getByRole("button", { name: /Export CSV/i }),
    "Export as CSV",
    ROLE_HEX.admin,
    2200
  );
  await page.waitForTimeout(1400);

  // ---- 04_teacher (7.63s VO + 2.5s buffer) ----
  await enterPortal("Teacher Portal");
  mark("04_teacher");
  await calloutOn(
    page.getByText("Student Attendance").first().locator("..").locator(".."),
    "Attendance, tracked automatically",
    ROLE_HEX.teacher,
    2000
  );
  await page.waitForTimeout(1200);
  await page.goto("http://localhost:5173/teacher/recordings", { waitUntil: "networkidle" });
  await page.waitForTimeout(700);
  await page.waitForTimeout(3600);

  // ---- 05_classroom (9.79s VO + 2.5s buffer) ----
  mark("05_classroom");
  await page.goto("http://localhost:5173/teacher", { waitUntil: "networkidle" });
  await page.waitForTimeout(600);
  const startClassBtn = page.getByText("Start Class", { exact: true }).first();
  await startClassBtn.hover();
  await page.waitForTimeout(250);
  await startClassBtn.click();
  await page.waitForTimeout(2200); // classroom mounts: video tiles + leaderboard seed in
  const whiteboardBtn = page.getByRole("button", { name: "Open whiteboard" });
  try {
    await whiteboardBtn.hover({ timeout: 2000 });
    await page.waitForTimeout(250);
    await whiteboardBtn.click();
    await page.waitForTimeout(2600);
  } catch {
    /* ignore */
  }
  const quizBtn = page.getByRole("button", { name: "Launch live quiz" });
  try {
    await quizBtn.hover({ timeout: 2000 });
    await page.waitForTimeout(250);
    await quizBtn.click();
    await page.waitForTimeout(2600);
  } catch {
    /* ignore */
  }
  await page.waitForTimeout(2200);

  // ---- 06_student (9.17s VO + 2.0s buffer) ----
  await enterPortal("Student Experience");
  mark("06_student");
  await calloutOn(
    page.getByText("My Badges", { exact: true }).first(),
    "Badges for showing up",
    ROLE_HEX.student,
    2200
  );
  await page.mouse.wheel(0, 260);
  await page.waitForTimeout(6600);

  // ---- 07_parent (8.93s VO + 2.5s buffer) ----
  await enterPortal("Parent Portal");
  mark("07_parent");
  await calloutOn(
    page.getByText("Fee Status", { exact: true }).first(),
    "Payments, always visible",
    ROLE_HEX.parent,
    2000
  );
  await page.waitForTimeout(1200);
  await page.goto("http://localhost:5173/parent/notifications", { waitUntil: "networkidle" });
  await page.waitForTimeout(700);
  await page.waitForTimeout(4400);

  // ---- 08_coordinator (9.36s VO + 2.5s buffer) ----
  await enterPortal("Academic Coordinator");
  mark("08_coordinator");
  await calloutOn(
    page.getByText("Today's Sessions", { exact: true }).first(),
    "Sessions, teachers and batches",
    ROLE_HEX.coordinator,
    2200,
    8 // measured: default gap(20)+tooltip height(~46.5px) collided with the KPI row
      // above (its bottom edge sits only ~66px above this heading) -- 8px clears it
  );
    await page.waitForTimeout(1100);
    await page.goto("http://localhost:5173/coordinator/availability", { waitUntil: "networkidle" });
  await page.waitForTimeout(700);
  await page.waitForTimeout(4600);

  // ---- 09_admission (9.24s VO + 2.5s buffer) ----
  await enterPortal("Admission Team Portal");
  mark("09_admission");
  await calloutOn(
    page.getByText("Conversion Funnel", { exact: true }).first(),
    "Lead to enrollment, tracked",
    ROLE_HEX.admission,
    2200
  );
  await page.waitForTimeout(1100);
  await page.goto("http://localhost:5173/admission/demo-scheduling", { waitUntil: "networkidle" });
  await page.waitForTimeout(700);
  await page.waitForTimeout(4400);

  // ---- 10_subadmin (8.86s VO + 2.5s buffer) ----
  await enterPortal("Parent Relationship Manager");
  mark("10_subadmin");
  await calloutOn(
    // Not the "You have access to..." banner line itself: measured, the paragraph
    // right above it leaves negative clearance (tooltip would overlap the paragraph
    // text at any gap >= 0). "My assigned modules" sits in the same delegated-access
    // section with a full 85px of clear space above it.
    page.getByText("My assigned modules", { exact: true }).first(),
    "Permission-scoped, always",
    ROLE_HEX.subadmin,
    2200,
    8 // default gap(20) still clipped the KPI row's "vs last month" badge above it
  );
  await page.waitForTimeout(1200);
  await page.goto("http://localhost:5173/subadmin/audit-log", { waitUntil: "networkidle" });
  await page.waitForTimeout(700);
  await page.waitForTimeout(5400);

  // ---- 11_management (10.1s VO + 2.0s buffer) ----
  await enterPortal("Management Dashboard");
  mark("11_management");
  await calloutOn(
    page.getByText("Conversion Rate", { exact: true }).first(),
    "Every KPI, one screen",
    ROLE_HEX.management,
    2000
  );
  const revenueChart = page.getByText("Revenue Trend", { exact: true }).locator("..").locator("..");
  try {
    const bounds = await revenueChart.boundingBox();
    if (bounds) await page.mouse.move(bounds.x + bounds.width * 0.55, bounds.y + bounds.height * 0.5);
  } catch {
    /* ignore */
  }
  await page.waitForTimeout(2600);
  await page.mouse.wheel(0, 420);
  await page.waitForTimeout(4300);

  // ---- 12_differentiator (5.02s VO + 3.3s buffer) ----
  mark("12_differentiator");
  const diffCard = await page.screencast.showOverlay(imageCard("role"));
  await page.waitForTimeout(8300);
  await diffCard.dispose();

  // ---- 13_cta (4.94s VO + 4.0s buffer, held long per QA rule) ----
  await page.waitForTimeout(200);
  mark("13_cta");
  const ctaCard = await page.screencast.showOverlay(imageCard("cta"));
  await page.waitForTimeout(9000);
  await ctaCard.dispose();

  await page.screencast.stop();
  // run-code's Node-side console.log isn't surfaced in the CLI's textual response and
  // there's no `require`/fs access from this sandboxed snippet -- stash the measured
  // offsets in the page's own localStorage instead, then pull them back out afterward
  // with `playwright-cli localstorage-get`. localStorage throws on the opaque
  // about:blank origin the take ends on, so hop back to a real same-origin page first.
  await page.goto("http://localhost:5173/portal-select", { waitUntil: "networkidle" });
  await page.evaluate(log => localStorage.setItem("mtm_beatlog", JSON.stringify(log)), beatLog);
  return beatLog;
}
