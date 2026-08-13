import { getMembers, getSecurityIps, getAdminSession, getAuditLogs, getSystemSetting, getTermYears, getLeaveNotificationTemplate } from "@/app/actions";
import { writeAuditLog } from "@/lib/audit";
import { isIpBlacklisted, getCleanIp } from "@/lib/ipSecurity";
import { headers } from "next/headers";
import AdminLoginForm from "@/components/AdminLoginForm";
import AdminPanelsClient from "./AdminPanelsClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AdminPage(props: {
  searchParams: Promise<{ page?: string }>;
}) {
  const params = await props.searchParams;
  const page = parseInt(params.page || "1", 10) || 1;

  const headersList = await headers();
  const rawIp =
    headersList.get("x-forwarded-for")?.split(",")[0] ||
    headersList.get("x-real-ip") ||
    "127.0.0.1";
  const clientIp = getCleanIp(rawIp);

  const isBlocked = await isIpBlacklisted(clientIp);
  if (isBlocked) {
    await writeAuditLog(
      "IP_BLOCKED_ACCESS_REFUSED",
      "Visitor",
      `Access Refused: Blocked page load attempt from blacklisted IP: ${clientIp}`
    );
    return (
      <div className="mx-auto max-w-xl p-8 text-center bg-rose-50 border border-rose-200 text-rose-800 rounded-xl mt-12 dark:bg-rose-950/20 dark:border-rose-900/60 dark:text-rose-300">
        <h2 className="text-xl font-bold">Access Blocked</h2>
        <p className="mt-2 text-sm">
          Your IP address ({clientIp}) has been temporarily blacklisted due to
          security policy violations.
        </p>
      </div>
    );
  }

  const session = await getAdminSession();

  if (!session.authenticated) {
    return <AdminLoginForm portalTitle="Admin Portal Access" />;
  }

  const [membersRes, ipsRes, logsRes, paradeNightSetting, inactivityTimeoutSetting, unitNameSetting, ranksSettingVal, bgImageSettingVal, termYearsRes, pastWeeksSettingVal, futureWeeksSettingVal, leaveNotificationTemplateSetting] =
    await Promise.all([
      getMembers(),
      getSecurityIps(),
      getAuditLogs(page),
      getSystemSetting("parade_night"),
      getSystemSetting("admin_inactivity_timeout"),
      getSystemSetting("unit_name"),
      getSystemSetting("ranks_list"),
      getSystemSetting("background_image_url"),
      getTermYears(),
      getSystemSetting("leave_status_past_weeks"),
      getSystemSetting("leave_status_future_weeks"),
      getLeaveNotificationTemplate(),
    ]);

  const members = membersRes.success ? membersRes.data || [] : [];
  const securityIps = ipsRes.success ? ipsRes.data || [] : [];
  const auditLogs = logsRes.success ? logsRes.data || [] : [];
  const totalPages = logsRes.success ? logsRes.totalPages : 1;
  const currentPage = logsRes.success ? logsRes.currentPage : 1;
  const totalCount = logsRes.success ? logsRes.totalCount : 0;
  const paradeNight = paradeNightSetting || "Wednesday";
  const inactivityTimeout = parseInt(inactivityTimeoutSetting || "600", 10) || 600;
  const unitName = unitNameSetting || "29 Squadron";
  const ranksSetting = ranksSettingVal || "";
  const backgroundImageSetting = bgImageSettingVal || "";
  const termYears = termYearsRes.success ? termYearsRes.data || [] : [];
  
  const leaveStatusPastWeeks = pastWeeksSettingVal ? Math.max(1, Math.min(26, parseInt(pastWeeksSettingVal, 10) || 2)) : 2;
  const leaveStatusFutureWeeks = futureWeeksSettingVal ? Math.max(1, Math.min(26, parseInt(futureWeeksSettingVal, 10) || 4)) : 4;

  return (
    <AdminPanelsClient
      members={members}
      securityIps={securityIps}
      auditLogs={auditLogs}
      totalPages={totalPages}
      currentPage={currentPage}
      totalCount={totalCount}
      paradeNight={paradeNight}
      inactivityTimeout={inactivityTimeout}
      unitName={unitName}
      ranksSetting={ranksSetting}
      backgroundImageSetting={backgroundImageSetting}
      termYears={termYears}
      leaveStatusPastWeeks={leaveStatusPastWeeks}
      leaveStatusFutureWeeks={leaveStatusFutureWeeks}
      leaveNotificationTemplate={leaveNotificationTemplateSetting}
      currentAdmin={session.member}
    />
  );
}
