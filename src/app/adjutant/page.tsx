import { getLeaveRequests, getMembers, getAdjutantSession, getSystemSetting, getTermYears } from "@/app/actions";
import AdminLoginForm from "@/components/AdminLoginForm";
import AdjutantPanelsClient from "./AdjutantPanelsClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AdjutantPage() {
  const session = await getAdjutantSession();

  if (!session.authenticated) {
    return <AdminLoginForm portalTitle="Adjutant Portal Access" />;
  }

  const [requestsRes, membersRes, inactivityTimeoutSetting, paradeNightSetting, termYearsRes, pastWeeksSettingVal, futureWeeksSettingVal] = await Promise.all([
    getLeaveRequests(),
    getMembers(),
    getSystemSetting("admin_inactivity_timeout"),
    getSystemSetting("parade_night"),
    getTermYears(),
    getSystemSetting("leave_status_past_weeks"),
    getSystemSetting("leave_status_future_weeks"),
  ]);

  const allRequests = requestsRes.success ? requestsRes.data || [] : [];
  const members = membersRes.success ? membersRes.data || [] : [];
  const inactivityTimeout = parseInt(inactivityTimeoutSetting || "600", 10) || 600;
  const paradeNight = paradeNightSetting || "Wednesday";
  const termYears = termYearsRes.success ? termYearsRes.data || [] : [];
  
  const leaveStatusPastWeeks = pastWeeksSettingVal ? Math.max(1, Math.min(26, parseInt(pastWeeksSettingVal, 10) || 2)) : 2;
  const leaveStatusFutureWeeks = futureWeeksSettingVal ? Math.max(1, Math.min(26, parseInt(futureWeeksSettingVal, 10) || 4)) : 4;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-8">
      <AdjutantPanelsClient
        allRequests={allRequests}
        members={members}
        inactivityTimeout={inactivityTimeout}
        paradeNight={paradeNight}
        termYears={termYears}
        leaveStatusPastWeeks={leaveStatusPastWeeks}
        leaveStatusFutureWeeks={leaveStatusFutureWeeks}
        currentMember={session.member}
      />
    </div>
  );
}
