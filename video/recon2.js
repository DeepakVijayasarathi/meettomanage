// Recon pass for the new full-portal-tour storyboard: force light theme, switch into
// each demo role via /portal-select (RequireAuth needs the matching session role, so we
// can't just deep-link), then walk sub-routes and screenshot for selector accuracy.
async page => {
  await page.addInitScript(() => {
    try { localStorage.setItem('trn.theme', 'light'); } catch {}
  });

  async function enterPortal(cardText) {
    await page.goto('http://localhost:5173/portal-select', { waitUntil: 'networkidle', timeout: 15000 });
    await page.getByText(cardText, { exact: false }).first().click();
    await page.waitForTimeout(1200);
  }

  async function shot(path, file) {
    try {
      if (path) {
        await page.goto(`http://localhost:5173${path}`, { waitUntil: 'networkidle', timeout: 15000 });
        await page.waitForTimeout(800);
      }
      await page.screenshot({ path: file, fullPage: false });
      console.log('OK ->', file, page.url());
    } catch (e) {
      console.log('FAIL', file, e.message);
    }
  }

  await shot('/portal-select', 'recon2_portal_select.png');

  await enterPortal('Admin Portal');
  await shot(null, 'recon2_admin_dashboard.png');
  await shot('/admin/reports', 'recon2_admin_reports.png');

  await enterPortal('Teacher Portal');
  await shot(null, 'recon2_teacher_myclasses.png');
  await shot('/teacher/recordings', 'recon2_teacher_recordings.png');

  await enterPortal('Student Experience');
  await shot(null, 'recon2_student_dashboard.png');

  await enterPortal('Parent Portal');
  await shot(null, 'recon2_parent_dashboard.png');
  await shot('/parent/notifications', 'recon2_parent_notifications.png');

  await enterPortal('Academic Coordinator');
  await shot(null, 'recon2_coordinator_calendar.png');
  await shot('/coordinator/availability', 'recon2_coordinator_availability.png');

  await enterPortal('Admission Team Portal');
  await shot(null, 'recon2_admission_leads.png');
  await shot('/admission/demo-scheduling', 'recon2_admission_demoscheduling.png');

  await enterPortal('Parent Relationship Manager');
  await shot(null, 'recon2_subadmin_dashboard.png');
  await shot('/subadmin/permissions', 'recon2_subadmin_permissions.png');
  await shot('/subadmin/audit-log', 'recon2_subadmin_auditlog.png');

  await enterPortal('Management Dashboard');
  await shot(null, 'recon2_management_dashboard.png');
}
