/* src/app/admin/AdminPanelsClient.tsx */
"use client";

import React, { useState, useEffect, useTransition } from "react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { getAuditLogs } from "@/app/actions";
import {
  AddMemberForm,
  EditMemberButton,
  DeleteMemberButton,
  SetAdjutantPasswordButton,
  AddSecurityIpForm,
  DeleteIpRuleButton,
  ParadeNightSettingDropdown,
  MemberStatusToggle,
  SendTestEmailButton,
  InactivityTimeoutSettingInput,
  UnitNameSettingInput,
  RanksListSettingInput,
  BackgroundImageSettingInput,
  AddTermYearButton,
  EditTermYearButton,
  DeleteTermYearButton,
  LeaveStatusRangeSettingInput,
  LeaveNotificationTemplateEditor,
} from "@/components/AdminForms";

import AdminInactivityGuard from "@/components/AdminInactivityGuard";
import HelpTrigger from "@/components/HelpTrigger";
import Tooltip from "@/components/Tooltip";
import { History, Users, KeyRound, Globe, Lock, Settings, ChevronDown, GripVertical, Shield, CalendarRange } from "lucide-react";
import { formatNZTime, formatNZDisplayDate, formatTermShortDate } from "@/lib/dateUtils";
import { parseRanksList } from "@/lib/validations";

interface PanelDef {
  key: string;
  title: string;
  icon: React.ReactNode;
  subtitle?: string;
  headerRight?: React.ReactNode;
  helpKey?: string;
  helpTooltip?: string;
  content: React.ReactNode;
}

export default function AdminPanelsClient({
  members,
  securityIps,
  auditLogs,
  totalPages,
  currentPage,
  totalCount,
  paradeNight,
  inactivityTimeout = 600,
  unitName = "29 Squadron",
  ranksSetting = "",
  backgroundImageSetting = "",
  termYears = [],
  leaveStatusPastWeeks = 2,
  leaveStatusFutureWeeks = 4,
  leaveNotificationTemplate = { subject: "", body: "" },
  currentAdmin,
}: {
  members: any[];
  securityIps: any[];
  auditLogs: any[];
  totalPages: number;
  currentPage: number;
  totalCount: number;
  paradeNight: string;
  inactivityTimeout?: number;
  unitName?: string;
  ranksSetting?: string;
  backgroundImageSetting?: string;
  termYears?: any[];
  leaveStatusPastWeeks?: number;
  leaveStatusFutureWeeks?: number;
  leaveNotificationTemplate?: { subject: string; body: string };
  currentAdmin?: any;
}) {
  const defaultPanelOrder = [
    "members",
    "termDates",
    "ipMaintenance",
    "globalSettings",
    "auditTrail",
  ];

  const [panelOrder, setPanelOrder] = useState<string[]>(defaultPanelOrder);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  // Audit trail client pagination state
  const [currentAuditLogs, setCurrentAuditLogs] = useState(auditLogs);
  const [auditPagination, setAuditPagination] = useState({
    currentPage,
    totalPages,
    totalCount,
  });
  const [isPendingAudit, startAuditTransition] = useTransition();

  useEffect(() => {
    setCurrentAuditLogs(auditLogs);
    setAuditPagination({ currentPage, totalPages, totalCount });
  }, [auditLogs, currentPage, totalPages, totalCount]);

  const handleAuditPageChange = (newPage: number) => {
    if (newPage < 1 || newPage > auditPagination.totalPages || isPendingAudit) return;
    startAuditTransition(async () => {
      const res = await getAuditLogs(newPage);
      if (res.success && res.data) {
        setCurrentAuditLogs(res.data);
        setAuditPagination({
          currentPage: res.currentPage,
          totalPages: res.totalPages,
          totalCount: res.totalCount,
        });
        if (typeof window !== "undefined") {
          const url = new URL(window.location.href);
          url.searchParams.set("page", newPage.toString());
          window.history.replaceState({}, "", url.toString());
        }
      }
    });
  };

  const userKey = currentAdmin?.email
    ? currentAdmin.email.toLowerCase().replace(/[^a-z0-9]/g, "_")
    : "default";

  // Load saved order and collapsed state on client mount per user
  useEffect(() => {
    const savedOrder =
      typeof window !== "undefined"
        ? localStorage.getItem(`adminPanelOrder_${userKey}`)
        : null;
    if (savedOrder) {
      try {
        setPanelOrder(JSON.parse(savedOrder));
      } catch {}
    } else {
      setPanelOrder(defaultPanelOrder);
    }

    const savedCollapsed =
      typeof window !== "undefined"
        ? localStorage.getItem(`adminPanelCollapsed_${userKey}`)
        : null;
    if (savedCollapsed) {
      try {
        setCollapsed(JSON.parse(savedCollapsed));
      } catch {}
    } else {
      setCollapsed({});
    }
  }, [userKey]);

  const toggleCollapsed = (key: string) => {
    setCollapsed((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      if (typeof window !== "undefined") {
        localStorage.setItem(`adminPanelCollapsed_${userKey}`, JSON.stringify(next));
      }
      return next;
    });
  };

  const onDragEnd = (result: any) => {
    if (!result.destination) return;
    const newOrder = Array.from(panelOrder);
    newOrder.splice(result.source.index, 1);
    newOrder.splice(result.destination.index, 0, result.draggableId);
    setPanelOrder(newOrder);
    if (typeof window !== "undefined") {
      localStorage.setItem(`adminPanelOrder_${userKey}`, JSON.stringify(newOrder));
    }
  };

  const ranksList = parseRanksList(ranksSetting);

  // Panel definitions with title/icon/subtitle separated from content
  const panelDefs: Record<string, PanelDef> = {
    members: {
      key: "members",
      title: `Members (${members.length})`,
      icon: <Users className="h-5 w-5 text-emerald-600" />,
      subtitle: "System credentials and executive roles. Minimum 1 Admin required at all times.",
      helpKey: "panel_admin_members",
      helpTooltip: "Members Roster Guide",
      content: (
        <>
          <div className="mb-6">
            <AddMemberForm ranks={ranksList} />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-zinc-600 dark:text-zinc-400">
              <thead className="border-b border-zinc-200 dark:border-zinc-800 text-xs font-semibold uppercase text-zinc-500">
                <tr>
                  <th className="py-1.5 px-4">Rank &amp; Surname</th>
                  <th className="py-1.5 px-4">Email</th>
                  <th className="py-1.5 px-4">Roles</th>
                  <th className="py-1.5 px-4 text-center">Active</th>
                  <th className="py-1.5 px-4 text-center">Email</th>
                  <th className="py-1.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {members.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-6 text-center text-xs text-zinc-500">
                      No pre-approved accounts configured.
                    </td>
                  </tr>
                ) : (
                  members.map((m) => {
                    const activeAdminCount = members.filter((item) => item.isAdmin && item.isActive).length;
                    const totalAdminCount = members.filter((item) => item.isAdmin).length;
                    const isOnlyActiveAdmin = m.isAdmin && m.isActive && activeAdminCount <= 1;
                    const isOnlyAdmin = m.isAdmin && totalAdminCount <= 1;

                    return (
                      <tr key={m.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/30">
                        <td className="py-1.5 px-4 font-medium text-zinc-900 dark:text-zinc-100">{m.rank} {m.surname}</td>
                        <td className="py-1.5 px-4 text-xs font-mono text-zinc-700 dark:text-zinc-300">{m.email}</td>
                        <td className="py-1.5 px-4">
                          <div className="flex gap-1.5 flex-wrap">
                            {m.isAdmin && (
                              <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900">Admin</span>
                            )}
                            {m.isAdjutant && (
                              <span className="rounded-full bg-purple-50 px-2 py-0.5 text-[10px] font-semibold text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-200 dark:border-purple-900">Adjutant</span>
                            )}
                            {m.isStaff && (
                              <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-900">Staff</span>
                            )}
                          </div>
                        </td>
                        <td className="py-1.5 px-4 text-center">
                          <MemberStatusToggle
                            memberId={m.id}
                            field="isActive"
                            initialValue={m.isActive}
                            disabled={isOnlyActiveAdmin}
                            disabledReason={isOnlyActiveAdmin ? "Cannot disable only admin" : undefined}
                          />
                        </td>
                        <td className="py-1.5 px-4 text-center">
                          <MemberStatusToggle memberId={m.id} field="emailEnabled" initialValue={m.emailEnabled} />
                        </td>
                        <td className="py-1.5 px-4 text-right flex items-center justify-end gap-2">
                          <EditMemberButton member={m} isOnlyAdmin={isOnlyAdmin} ranks={ranksList} />
                          <SetAdjutantPasswordButton memberId={m.id} memberName={`${m.rank} ${m.surname}`} />
                          <SendTestEmailButton memberId={m.id} memberName={`${m.rank} ${m.surname}`} memberEmail={m.email} />
                          <DeleteMemberButton
                            memberId={m.id}
                            isTargetAdmin={m.isAdmin}
                            disabled={isOnlyAdmin}
                            disabledReason={isOnlyAdmin ? "Cannot delete only admin" : undefined}
                          />
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </>
      ),
    },
    termDates: {
      key: "termDates",
      title: `Term dates (${termYears.length})`,
      icon: <CalendarRange className="h-5 w-5 text-blue-600" />,
      subtitle: "School/Unit term start and end dates for Terms 1 through 4.",
      headerRight: <AddTermYearButton />,
      helpKey: "panel_admin_term_dates",
      helpTooltip: "Term Dates Guide",
      content: (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-zinc-600 dark:text-zinc-400">
            <thead className="border-b border-zinc-200 dark:border-zinc-800 text-xs font-semibold uppercase text-zinc-500">
              <tr>
                <th className="py-2 px-3 text-center">
                  <Tooltip content="Academic or operational calendar year">Year</Tooltip>
                </th>
                <th className="py-2 px-3">
                  <Tooltip content="Term 1 official start date (first parade night)">T1 Start</Tooltip>
                </th>
                <th className="py-2 px-3">
                  <Tooltip content="Term 1 official end date (last parade night)">T1 End</Tooltip>
                </th>
                <th className="py-2 px-3">
                  <Tooltip content="Term 2 official start date (first parade night)">T2 Start</Tooltip>
                </th>
                <th className="py-2 px-3">
                  <Tooltip content="Term 2 official end date (last parade night)">T2 End</Tooltip>
                </th>
                <th className="py-2 px-3">
                  <Tooltip content="Term 3 official start date (first parade night)">T3 Start</Tooltip>
                </th>
                <th className="py-2 px-3">
                  <Tooltip content="Term 3 official end date (last parade night)">T3 End</Tooltip>
                </th>
                <th className="py-2 px-3">
                  <Tooltip content="Term 4 official start date (first parade night)">T4 Start</Tooltip>
                </th>
                <th className="py-2 px-3">
                  <Tooltip content="Term 4 official end date (last parade night)">T4 End</Tooltip>
                </th>
                <th className="py-2 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {termYears.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-6 text-center text-xs text-zinc-500">
                    No term dates configured yet. Click 'Add Year' to define school/unit term dates.
                  </td>
                </tr>
              ) : (
                termYears.map((t: any) => (
                  <tr key={t.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/30 text-xs">
                    <td className="py-2 px-3 font-bold text-center text-zinc-900 dark:text-zinc-100">{t.year}</td>
                    <td className="py-2 px-3 font-mono font-semibold text-blue-700 dark:text-blue-300">{formatTermShortDate(t.t1Start)}</td>
                    <td className="py-2 px-3 font-mono text-zinc-600 dark:text-zinc-400">{formatTermShortDate(t.t1End)}</td>
                    <td className="py-2 px-3 font-mono font-semibold text-purple-700 dark:text-purple-300">{formatTermShortDate(t.t2Start)}</td>
                    <td className="py-2 px-3 font-mono text-zinc-600 dark:text-zinc-400">{formatTermShortDate(t.t2End)}</td>
                    <td className="py-2 px-3 font-mono font-semibold text-emerald-700 dark:text-emerald-300">{formatTermShortDate(t.t3Start)}</td>
                    <td className="py-2 px-3 font-mono text-zinc-600 dark:text-zinc-400">{formatTermShortDate(t.t3End)}</td>
                    <td className="py-2 px-3 font-mono font-semibold text-amber-700 dark:text-amber-300">{formatTermShortDate(t.t4Start)}</td>
                    <td className="py-2 px-3 font-mono text-zinc-600 dark:text-zinc-400">{formatTermShortDate(t.t4End)}</td>
                    <td className="py-2 px-3 text-right flex items-center justify-end gap-1">
                      <EditTermYearButton termYear={t} />
                      <DeleteTermYearButton termYearId={t.id} year={t.year} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      ),
    },
    ipMaintenance: {
      key: "ipMaintenance",
      title: `IP Whitelist & Blacklist Maintenance (${securityIps.length})`,
      icon: <Globe className="h-5 w-5 text-emerald-600" />,
      subtitle: "Admin IPs auto-whitelisted. Blacklisted IPs automatically removed after 30 days.",
      helpKey: "panel_admin_ip_rules",
      helpTooltip: "IP Security Rules Guide",
      headerRight: <AddSecurityIpForm />,
      content: (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-zinc-600 dark:text-zinc-400">
            <thead className="border-b border-zinc-200 dark:border-zinc-800 text-xs font-semibold uppercase text-zinc-500">
              <tr>
                <th className="py-1.5 px-4">IP Address</th>
                <th className="py-1.5 px-4">Type</th>
                <th className="py-1.5 px-4">Source / Reason</th>
                <th className="py-1.5 px-4">Auto-Expiration</th>
                <th className="py-1.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {securityIps.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-6 text-center text-xs text-zinc-500">No custom IP security rules configured.</td>
                </tr>
              ) : (
                securityIps.map((rule) => {
                  const expires = rule.expiresAt
                    ? formatNZDisplayDate(rule.expiresAt)
                    : "No Expiration (Whitelist)";
                  return (
                    <tr key={rule.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/30">
                      <td className="py-1.5 px-4 font-mono text-xs font-semibold text-zinc-900 dark:text-zinc-100">{rule.ip}</td>
                      <td className="py-1.5 px-4">
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold border ${rule.type === "WHITELIST" ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200" : "bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border-rose-200"}`}>
                          {rule.type}
                        </span>
                      </td>
                      <td className="py-1.5 px-4 text-xs text-zinc-600 dark:text-zinc-400">
                        <span className="font-semibold text-zinc-900 dark:text-zinc-200">[{rule.source}]</span> {rule.reason || "N/A"}
                      </td>
                      <td className="py-1.5 px-4 text-xs text-zinc-500">{expires}</td>
                      <td className="py-1.5 px-4 text-right"><DeleteIpRuleButton ruleId={rule.id} /></td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      ),
    },
    globalSettings: {
      key: "globalSettings",
      title: "Unit Configuration Settings",
      icon: <Settings className="h-5 w-5 text-blue-600" />,
      subtitle: "Configure global unit-wide operational settings and variables.",
      helpKey: "panel_admin_unit_settings",
      helpTooltip: "Unit Settings Guide",
      content: (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-100 dark:border-zinc-800">
            <div>
              <span className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">Unit name</span>
              <p className="text-xs text-zinc-500 mt-0.5">Short verson of your unit name eg: 29 Squadron, 29 SQN, TACCU, Chatham, etc</p>
            </div>
            <div className="shrink-0">
              <UnitNameSettingInput initialValue={unitName} />
            </div>
          </div>

          <div className="space-y-3 pb-4 border-b border-zinc-100 dark:border-zinc-800">
            <div>
              <span className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">Rank options dropdown</span>
              <p className="text-xs text-zinc-500 mt-0.5">Comma-separated list of ranks for dropdown selections (e.g. RCRT, CDT, LACDT, CDTSGT, FLTLT, etc).</p>
            </div>
            <div className="w-full">
              <RanksListSettingInput initialValue={ranksSetting} />
            </div>
          </div>

          <div className="space-y-3 pb-4 border-b border-zinc-100 dark:border-zinc-800">
            <div>
              <span className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">Upload background image</span>
              <p className="text-xs text-zinc-500 mt-0.5">Upload a custom image file to set as the background across the app (anchored top-left and tiled).</p>
            </div>
            <div className="w-full">
              <BackgroundImageSettingInput initialValue={backgroundImageSetting} />
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-100 dark:border-zinc-800">
            <div>
              <span className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">Unit Parade Night</span>
              <p className="text-xs text-zinc-500 mt-0.5">Select the day of the week personnel meet. This decides the closest/next parade preset days.</p>
            </div>
            <div className="shrink-0">
              <ParadeNightSettingDropdown initialValue={paradeNight} />
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-100 dark:border-zinc-800">
            <div>
              <span className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">Logged in user time-out</span>
              <p className="text-xs text-zinc-500 mt-0.5">Duration in seconds of inactivity (no clicking or typing) before admin session automatically logs out.</p>
            </div>
            <div className="shrink-0">
              <InactivityTimeoutSettingInput initialValue={inactivityTimeout} />
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <span className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">Leave status range</span>
              <p className="text-xs text-zinc-500 mt-0.5">How many weeks into the past and future will the Unit Leave Status timeline grid show? (min 1, max 26)</p>
            </div>
            <div className="w-full">
              <LeaveStatusRangeSettingInput
                initialPastWeeks={leaveStatusPastWeeks}
                initialFutureWeeks={leaveStatusFutureWeeks}
              />
            </div>
          </div>

          <div className="space-y-3 pt-4 border-t border-zinc-100 dark:border-zinc-800">
            <div>
              <span className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">Leave notification email template</span>
              <p className="text-xs text-zinc-500 mt-0.5">
                Proforma email sent to all active members with email notifications enabled when a leave notification is submitted.
                Use placeholders (shown below) to insert submission details dynamically.
              </p>
            </div>
            <div className="w-full">
              <LeaveNotificationTemplateEditor
                initialSubject={leaveNotificationTemplate.subject}
                initialBody={leaveNotificationTemplate.body}
              />
            </div>
          </div>
        </div>
      ),
    },
    auditTrail: {
      key: "auditTrail",
      title: `System Audit Trail (${auditPagination.totalCount})`,
      icon: <History className="h-5 w-5 text-zinc-500" />,
      subtitle: "Chronological log of system-wide administrative and user activity. Auto-trimmed to the last 30 days.",
      helpKey: "panel_admin_audit_trail",
      helpTooltip: "System Audit Trail Guide",
      content: (
        <>
          <div className="overflow-x-auto border border-zinc-100 dark:border-zinc-800 rounded-lg max-h-96 overflow-y-auto mb-4">
            <table className={`w-full text-left text-sm text-zinc-600 dark:text-zinc-400 transition-opacity duration-200 ${isPendingAudit ? "opacity-40" : "opacity-100"}`}>
              <thead className="sticky top-0 bg-zinc-50 dark:bg-zinc-950 border-b border-zinc-200 dark:border-zinc-800 text-xs font-semibold uppercase text-zinc-500 z-10">
                <tr>
                  <th className="py-2 px-4">Stamp</th>
                  <th className="py-2 px-4">Action</th>
                  <th className="py-2 px-4">Actor</th>
                  <th className="py-2 px-4">IP</th>
                  <th className="py-2 px-4">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {currentAuditLogs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-xs text-zinc-500">No system events logged in the last 30 days.</td>
                  </tr>
                ) : (
                  currentAuditLogs.map((log: any) => (
                    <tr key={log.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/30 text-xs">
                      <td className="py-2 px-4 font-mono text-zinc-400 whitespace-nowrap">{formatNZTime(log.createdAt)}</td>
                      <td className="py-2 px-4">
                        <span className={`inline-block rounded-md px-1.5 py-0.5 text-[9px] font-semibold border ${
                          log.action.includes("FAIL") || log.action.includes("DELETE")
                            ? "bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border-rose-200 dark:border-rose-900"
                            : log.action.includes("SUCCESS") || log.action.includes("CREATE")
                            ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-900"
                            : log.action.includes("LOGOUT") || log.action.includes("UPDATE")
                            ? "bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200 dark:border-amber-900"
                            : "bg-zinc-50 text-zinc-700 dark:bg-zinc-950/60 dark:text-zinc-300 border-zinc-200 dark:border-zinc-900"
                        }`}>{log.action}</span>
                      </td>
                      <td className="py-2 px-4 font-semibold text-zinc-900 dark:text-zinc-100 whitespace-nowrap">{log.actor}</td>
                      <td className="py-2 px-4 font-mono text-zinc-550 dark:text-zinc-400 whitespace-nowrap">{log.ip}</td>
                      <td className="py-2 px-4 text-zinc-650 dark:text-zinc-300">{log.details}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          {auditPagination.totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-zinc-200 dark:border-zinc-800 pt-4 px-2">
              <div className="flex flex-1 justify-between sm:hidden">
                <button
                  type="button"
                  onClick={() => handleAuditPageChange(auditPagination.currentPage - 1)}
                  disabled={auditPagination.currentPage <= 1 || isPendingAudit}
                  className="relative inline-flex items-center rounded-md border border-zinc-300 bg-white px-4 py-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 disabled:opacity-40 disabled:cursor-not-allowed dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700 cursor-pointer"
                >
                  Previous
                </button>
                <button
                  type="button"
                  onClick={() => handleAuditPageChange(auditPagination.currentPage + 1)}
                  disabled={auditPagination.currentPage >= auditPagination.totalPages || isPendingAudit}
                  className="relative ml-3 inline-flex items-center rounded-md border border-zinc-300 bg-white px-4 py-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 disabled:opacity-40 disabled:cursor-not-allowed dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700 cursor-pointer"
                >
                  Next
                </button>
              </div>
              <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
                <div>
                  <p className="text-xs text-zinc-500">
                    Showing page <span className="font-semibold text-zinc-800 dark:text-zinc-200">{auditPagination.currentPage}</span> of <span className="font-semibold text-zinc-800 dark:text-zinc-200">{auditPagination.totalPages}</span> ({auditPagination.totalCount} total entries)
                  </p>
                </div>
                <div>
                  <nav className="isolate inline-flex -space-x-px rounded-md shadow-xs" aria-label="Pagination">
                    <button
                      type="button"
                      onClick={() => handleAuditPageChange(auditPagination.currentPage - 1)}
                      disabled={auditPagination.currentPage <= 1 || isPendingAudit}
                      className="relative inline-flex items-center rounded-l-md px-3 py-1.5 text-xs font-semibold text-zinc-700 ring-1 ring-zinc-300 ring-inset hover:bg-zinc-50 disabled:opacity-40 disabled:cursor-not-allowed dark:text-zinc-300 dark:ring-zinc-700 dark:hover:bg-zinc-800 cursor-pointer"
                    >
                      &larr; Previous
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAuditPageChange(auditPagination.currentPage + 1)}
                      disabled={auditPagination.currentPage >= auditPagination.totalPages || isPendingAudit}
                      className="relative inline-flex items-center rounded-r-md px-3 py-1.5 text-xs font-semibold text-zinc-700 ring-1 ring-zinc-300 ring-inset hover:bg-zinc-50 disabled:opacity-40 disabled:cursor-not-allowed dark:text-zinc-300 dark:ring-zinc-700 dark:hover:bg-zinc-800 cursor-pointer"
                    >
                      Next &rarr;
                    </button>
                  </nav>
                </div>
              </div>
            </div>
          )}
        </>
      ),
    },
  };

  return (
    <>
      <AdminInactivityGuard timeoutSeconds={inactivityTimeout} />

      {/* Header */}
      <div className="mb-6 pb-6 border-b border-zinc-200 dark:border-zinc-800 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 flex items-center gap-2 flex-wrap">
            <Shield className="h-6 w-6 text-blue-600 shrink-0" />
            <span>Admin Control Panel</span>
            {currentAdmin && (
              <span className="text-base font-normal text-zinc-500 dark:text-zinc-400">
                &ndash; {currentAdmin.rank} {currentAdmin.surname}
              </span>
            )}
          </h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            System configuration, member access controls, security rules, and audit history.
          </p>
        </div>
        <HelpTrigger helpKey="page_admin_portal" tooltipText="Admin Control Panel Guide" />
      </div>

      <DragDropContext onDragEnd={onDragEnd}>
        <Droppable droppableId="admin-panels">
        {(provided) => (
          <div {...provided.droppableProps} ref={provided.innerRef}>
            {panelOrder.map((key, index) => {
              const panel = panelDefs[key];
              if (!panel) return null;
              const isCollapsed = collapsed[key] ?? false;

              return (
                <Draggable key={key} draggableId={key} index={index}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      className={`mb-6 rounded-xl border bg-white shadow-sm dark:bg-zinc-900 transition-shadow ${
                        snapshot.isDragging
                          ? "border-blue-300 shadow-lg dark:border-blue-700"
                          : "border-zinc-200 dark:border-zinc-800"
                      }`}
                    >
                      {/* Panel Header — always visible, clickable to collapse/expand */}
                      <div
                        className="flex items-center gap-3 p-6 cursor-pointer select-none group"
                        onClick={() => toggleCollapsed(key)}
                      >
                        {/* Drag handle */}
                        <div
                          {...provided.dragHandleProps}
                          className="text-zinc-300 hover:text-zinc-500 dark:text-zinc-600 dark:hover:text-zinc-400 transition-colors cursor-grab active:cursor-grabbing"
                          onClick={(e) => e.stopPropagation()}
                          title="Drag to reorder"
                        >
                          <GripVertical className="h-5 w-5" />
                        </div>

                        {/* Icon */}
                        {panel.icon}

                        {/* Title & subtitle */}
                        <div className="flex-1 min-w-0">
                          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50 leading-tight">
                            {panel.title}
                          </h2>
                          {panel.subtitle && (
                            <p className="text-xs text-zinc-500 mt-0.5 truncate">{panel.subtitle}</p>
                          )}
                        </div>

                        {/* Header right actions & Help Trigger */}
                        <div className="flex items-center gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
                          {panel.headerRight && !isCollapsed && panel.headerRight}
                          {panel.helpKey && (
                            <HelpTrigger helpKey={panel.helpKey} tooltipText={panel.helpTooltip || "Panel Guide"} />
                          )}
                        </div>

                        {/* Collapse chevron */}
                        <ChevronDown
                          className={`h-5 w-5 text-zinc-400 dark:text-zinc-500 transition-transform duration-200 group-hover:text-zinc-600 dark:group-hover:text-zinc-300 ${
                            isCollapsed ? "-rotate-90" : ""
                          }`}
                        />
                      </div>

                      {/* Panel Content — collapsible */}
                      {!isCollapsed && (
                        <div className="px-6 pb-6 pt-0">
                          {panel.content}
                        </div>
                      )}
                    </div>
                  )}
                </Draggable>
              );
            })}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </DragDropContext>
    </>
  );
}
