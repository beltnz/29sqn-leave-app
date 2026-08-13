"use client";

import React, { useState, useEffect, useRef, useTransition } from "react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import AdminInactivityGuard from "@/components/AdminInactivityGuard";
import ConfirmDeleteModal from "@/components/ConfirmDeleteModal";
import HelpTrigger from "@/components/HelpTrigger";
import Tooltip from "@/components/Tooltip";
import { deleteLeaveRequest } from "@/app/actions";
import { formatNZDisplayDate, parseLocalDate, isParadeNightDate, getParadeNightDayIndex } from "@/lib/dateUtils";
import {
  Users,
  ShieldCheck,
  Calendar,
  Clock,
  GripVertical,
  ChevronDown,
  X,
  Info,
  CalendarDays,
  User,
  Trash2,
  ChevronLeft,
  ChevronRight,
  ListOrdered,
} from "lucide-react";

interface PanelDef {
  key: string;
  title: string;
  icon: React.ReactNode;
  subtitle?: string;
  helpKey?: string;
  helpTooltip?: string;
  content: React.ReactNode;
}

interface TimelineDay {
  date: Date;
  dateStr: string;
  dayNum: number;
  dayName: string;
  monthName: string;
  isPast: boolean;
  isToday: boolean;
  isFuture: boolean;
}

function isDateInTermPeriod(dateStr: string, termYears: any[] = []): boolean {
  if (!dateStr || termYears.length === 0) return true;
  const year = parseInt(dateStr.split("-")[0], 10);
  const termData = termYears.find((t) => t.year === year);
  if (!termData) return true;

  const inT1 = dateStr >= termData.t1Start && dateStr <= termData.t1End;
  const inT2 = dateStr >= termData.t2Start && dateStr <= termData.t2End;
  const inT3 = dateStr >= termData.t3Start && dateStr <= termData.t3End;
  const inT4 = dateStr >= termData.t4Start && dateStr <= termData.t4End;

  return inT1 || inT2 || inT3 || inT4;
}

export default function AdjutantPanelsClient({
  allRequests = [],
  members = [],
  inactivityTimeout = 600,
  paradeNight = "Wednesday",
  termYears = [],
  leaveStatusPastWeeks = 2,
  leaveStatusFutureWeeks = 4,
  currentMember,
}: {
  allRequests: any[];
  members?: any[];
  inactivityTimeout?: number;
  paradeNight?: string;
  termYears?: any[];
  leaveStatusPastWeeks?: number;
  leaveStatusFutureWeeks?: number;
  currentMember?: any;
}) {
  const defaultPanelOrder = ["calendar", "upcoming", "completed", "paradeSummary"];

  const [panelOrder, setPanelOrder] = useState<string[]>(defaultPanelOrder);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [selectedRequest, setSelectedRequest] = useState<any | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeleting, startDeletingTransition] = useTransition();

  // Pagination states for lists
  const [upcomingPage, setUpcomingPage] = useState(1);
  const [completedPage, setCompletedPage] = useState(1);
  const [paradeSummaryPage, setParadeSummaryPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

  const gridScrollRef = useRef<HTMLDivElement>(null);

  const userKey = currentMember?.email
    ? currentMember.email.toLowerCase().replace(/[^a-z0-9]/g, "_")
    : "default";

  useEffect(() => {
    const savedOrder =
      typeof window !== "undefined"
        ? localStorage.getItem(`adjutantPanelOrder_${userKey}`)
        : null;
    if (savedOrder) {
      try {
        const parsed = JSON.parse(savedOrder);
        const merged = Array.from(new Set([...parsed, ...defaultPanelOrder]));
        setPanelOrder(merged);
      } catch {
        setPanelOrder(defaultPanelOrder);
      }
    } else {
      setPanelOrder(defaultPanelOrder);
    }

    const savedCollapsed =
      typeof window !== "undefined"
        ? localStorage.getItem(`adjutantPanelCollapsed_${userKey}`)
        : null;
    if (savedCollapsed) {
      try {
        setCollapsed(JSON.parse(savedCollapsed));
      } catch {}
    } else {
      setCollapsed({});
    }
  }, [userKey]);

  const pastWeeksNum = Math.max(1, Math.min(26, Number(leaveStatusPastWeeks) || 2));
  const futureWeeksNum = Math.max(1, Math.min(26, Number(leaveStatusFutureWeeks) || 4));

  // Generate timeline days
  const timelineDays: TimelineDay[] = React.useMemo(() => {
    const today = parseLocalDate(new Date());
    const pastDays = pastWeeksNum * 7;
    const futureDays = futureWeeksNum * 7;

    const start = new Date(today);
    start.setDate(today.getDate() - pastDays);

    const days: TimelineDay[] = [];
    const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const monthNames = [
      "Jan", "Feb", "Mar", "Apr", "May", "Jun",
      "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
    ];

    const totalDaysCount = pastDays + 1 + futureDays;

    for (let i = 0; i < totalDaysCount; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);

      const isToday = d.getTime() === today.getTime();
      const isPast = d.getTime() < today.getTime();
      const isFuture = d.getTime() > today.getTime();

      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      const dateStr = `${year}-${month}-${day}`;

      days.push({
        date: d,
        dateStr,
        dayNum: d.getDate(),
        dayName: dayNames[d.getDay()],
        monthName: monthNames[d.getMonth()],
        isPast,
        isToday,
        isFuture,
      });
    }
    return days;
  }, [pastWeeksNum, futureWeeksNum]);

  const today = parseLocalDate(new Date());

  // Build list of personnel WHO HAVE LEAVE SHOWING on the timeline grid
  const personnelList = React.useMemo(() => {
    if (timelineDays.length === 0) return [];
    const timelineStart = timelineDays[0].date;
    const timelineEnd = timelineDays[timelineDays.length - 1].date;

    const map = new Map<string, { rank: string; surname: string }>();

    allRequests.forEach((req) => {
      const rStart = parseLocalDate(req.startDate);
      const rEnd = parseLocalDate(req.endDate);

      // Include personnel only if leave request overlaps with the timeline window
      if (rEnd >= timelineStart && rStart <= timelineEnd) {
        const key = `${req.rank}_${req.surname}`.toLowerCase();
        if (!map.has(key)) {
          map.set(key, { rank: req.rank, surname: req.surname });
        }
      }
    });

    return Array.from(map.values()).sort((a, b) =>
      a.surname.localeCompare(b.surname)
    );
  }, [allRequests, timelineDays]);

  // Compute column widths and left pixel offsets for timeline (Wednesdays = 80px, others = 40px)
  const colOffsets = React.useMemo(() => {
    const offsets: number[] = [];
    const widths: number[] = [];
    let currentLeft = 0;

    timelineDays.forEach((d) => {
      offsets.push(currentLeft);
      const w = d.date.getDay() === 3 ? 80 : 40;
      widths.push(w);
      currentLeft += w;
    });

    return { offsets, widths, totalWidth: currentLeft };
  }, [timelineDays]);

  // Scroll to Today column on load
  useEffect(() => {
    if (gridScrollRef.current) {
      const pastDays = pastWeeksNum * 7;
      gridScrollRef.current.scrollLeft = (colOffsets.offsets[pastDays] || 0) - 100;
    }
  }, [colOffsets, pastWeeksNum]);

  // Upcoming & Active leave requests (endDate >= today)
  const upcomingList = React.useMemo(() => {
    return allRequests
      .filter((r) => parseLocalDate(r.endDate).getTime() >= today.getTime())
      .sort((a, b) => parseLocalDate(a.startDate).getTime() - parseLocalDate(b.startDate).getTime());
  }, [allRequests, today]);

  // Completed leave requests (endDate < today)
  const completedList = React.useMemo(() => {
    return allRequests
      .filter((r) => parseLocalDate(r.endDate).getTime() < today.getTime())
      .sort((a, b) => parseLocalDate(b.endDate).getTime() - parseLocalDate(a.endDate).getTime());
  }, [allRequests, today]);

  // Member parade days affected summary calculation
  const memberParadeSummary = React.useMemo(() => {
    const map = new Map<string, {
      rank: string;
      surname: string;
      totalLeaveDays: number;
      totalParadeNights: number;
      requestCount: number;
    }>();

    allRequests.forEach((req) => {
      const key = `${req.rank}_${req.surname}`.toLowerCase();
      const rStart = parseLocalDate(req.startDate);
      const rEnd = parseLocalDate(req.endDate);

      const days = Math.ceil((rEnd.getTime() - rStart.getTime()) / (1000 * 60 * 60 * 24)) + 1;

      let paradeNights = 0;
      const curr = new Date(rStart);
      while (curr <= rEnd) {
        if (isParadeNightDate(curr, paradeNight)) {
          paradeNights++;
        }
        curr.setDate(curr.getDate() + 1);
      }

      if (!map.has(key)) {
        map.set(key, {
          rank: req.rank,
          surname: req.surname,
          totalLeaveDays: days,
          totalParadeNights: paradeNights,
          requestCount: 1,
        });
      } else {
        const existing = map.get(key)!;
        existing.totalLeaveDays += days;
        existing.totalParadeNights += paradeNights;
        existing.requestCount += 1;
      }
    });

    return Array.from(map.values()).sort(
      (a, b) => b.totalParadeNights - a.totalParadeNights || a.surname.localeCompare(b.surname)
    );
  }, [allRequests]);

  // Helper to format multi-line tooltip text for a request's parade nights
  const getParadeNightsTooltipText = (req: any) => {
    const rStart = parseLocalDate(req.startDate);
    const rEnd = parseLocalDate(req.endDate);

    const targetDayIdx = getParadeNightDayIndex(paradeNight);
    const currentDayIdx = today.getDay();
    const daysBackToTarget = (currentDayIdx - targetDayIdx + 7) % 7;

    const mostRecentParade = new Date(today);
    mostRecentParade.setDate(today.getDate() - daysBackToTarget);

    const upcomingParade = new Date(mostRecentParade);
    if (daysBackToTarget > 0) {
      upcomingParade.setDate(mostRecentParade.getDate() + 7);
    } else {
      upcomingParade.setDate(today.getDate() + 7);
    }

    const list: string[] = [];
    const pCurr = new Date(rStart);
    while (pCurr <= rEnd) {
      if (isParadeNightDate(pCurr, paradeNight)) {
        const pTime = pCurr.getTime();
        let relativeTag = "";
        if (pTime === today.getTime()) {
          relativeTag = " (this Parade Night)";
        } else if (pTime < today.getTime() && pTime === mostRecentParade.getTime()) {
          relativeTag = " (last Parade Night)";
        } else if (pTime > today.getTime() && pTime === upcomingParade.getTime()) {
          relativeTag = " (next Parade Night)";
        }

        list.push(`• ${formatNZDisplayDate(pCurr)}${relativeTag}`);
      }
      pCurr.setDate(pCurr.getDate() + 1);
    }

    if (list.length === 0) return "No parade nights affected";
    return `Parade Nights Affected (${list.length}):\n` + list.join("\n");
  };

  // Helper to format multi-line tooltip text for a member's total parade nights
  const getMemberParadeNightsTooltipText = (memberSurname: string, memberRank: string) => {
    const memberRequests = allRequests.filter(
      (r) =>
        r.rank.toLowerCase() === memberRank.toLowerCase() &&
        r.surname.toLowerCase() === memberSurname.toLowerCase()
    );

    const targetDayIdx = getParadeNightDayIndex(paradeNight);
    const currentDayIdx = today.getDay();
    const daysBackToTarget = (currentDayIdx - targetDayIdx + 7) % 7;

    const mostRecentParade = new Date(today);
    mostRecentParade.setDate(today.getDate() - daysBackToTarget);

    const upcomingParade = new Date(mostRecentParade);
    if (daysBackToTarget > 0) {
      upcomingParade.setDate(mostRecentParade.getDate() + 7);
    } else {
      upcomingParade.setDate(today.getDate() + 7);
    }

    const list: string[] = [];
    memberRequests.forEach((req) => {
      const rStart = parseLocalDate(req.startDate);
      const rEnd = parseLocalDate(req.endDate);

      const pCurr = new Date(rStart);
      while (pCurr <= rEnd) {
        if (isParadeNightDate(pCurr, paradeNight)) {
          const pTime = pCurr.getTime();
          let relativeTag = "";
          if (pTime === today.getTime()) {
            relativeTag = " (this Parade Night)";
          } else if (pTime < today.getTime() && pTime === mostRecentParade.getTime()) {
            relativeTag = " (last Parade Night)";
          } else if (pTime > today.getTime() && pTime === upcomingParade.getTime()) {
            relativeTag = " (next Parade Night)";
          }

          list.push(`• ${formatNZDisplayDate(pCurr)}${relativeTag}`);
        }
        pCurr.setDate(pCurr.getDate() + 1);
      }
    });

    if (list.length === 0) return "No parade nights affected";
    return `Parade Nights Logged (${list.length}):\n` + list.join("\n");
  };

  const toggleCollapsed = (key: string) => {
    setCollapsed((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      if (typeof window !== "undefined") {
        localStorage.setItem(`adjutantPanelCollapsed_${userKey}`, JSON.stringify(next));
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
      localStorage.setItem(`adjutantPanelOrder_${userKey}`, JSON.stringify(newOrder));
    }
  };

  // Compute metrics for modal popup
  const computeModalMetrics = (req: any) => {
    if (!req) return null;
    const rStart = parseLocalDate(req.startDate);
    const rEnd = parseLocalDate(req.endDate);

    // Total days for this request
    const totalDays =
      Math.ceil((rEnd.getTime() - rStart.getTime()) / (1000 * 60 * 60 * 24)) + 1;

    // Leave elapsed vs Leave ahead
    let leaveTaken = 0;
    let leaveAhead = 0;

    const curr = new Date(rStart);
    while (curr <= rEnd) {
      if (curr.getTime() <= today.getTime()) {
        leaveTaken++;
      } else {
        leaveAhead++;
      }
      curr.setDate(curr.getDate() + 1);
    }

    // Member total YTD leave logged
    const memberRequests = allRequests.filter(
      (item) =>
        item.rank.toLowerCase() === req.rank.toLowerCase() &&
        item.surname.toLowerCase() === req.surname.toLowerCase()
    );

    let ytdLeaveTaken = 0;
    let upcomingLeave = 0;

    memberRequests.forEach((item) => {
      const iStart = parseLocalDate(item.startDate);
      const iEnd = parseLocalDate(item.endDate);

      const dCurr = new Date(iStart);
      while (dCurr <= iEnd) {
        if (dCurr.getTime() <= today.getTime()) {
          ytdLeaveTaken++;
        } else {
          upcomingLeave++;
        }
        dCurr.setDate(dCurr.getDate() + 1);
      }
    });

    // Parade Nights Affected
    const affectedParadeNights: {
      dateStr: string;
      formatted: string;
      relativeTag?: string;
    }[] = [];

    // Determine relative parade night references relative to today
    const targetDayIdx = getParadeNightDayIndex(paradeNight);
    const currentDayIdx = today.getDay();
    const daysBackToTarget = (currentDayIdx - targetDayIdx + 7) % 7;

    const mostRecentParade = new Date(today);
    mostRecentParade.setDate(today.getDate() - daysBackToTarget);

    const upcomingParade = new Date(mostRecentParade);
    if (daysBackToTarget > 0) {
      upcomingParade.setDate(mostRecentParade.getDate() + 7);
    } else {
      upcomingParade.setDate(today.getDate() + 7);
    }

    const pCurr = new Date(rStart);
    while (pCurr <= rEnd) {
      if (isParadeNightDate(pCurr, paradeNight)) {
        const pTime = pCurr.getTime();
        let relativeTag: string | undefined = undefined;

        if (pTime === today.getTime()) {
          relativeTag = "this Parade Night";
        } else if (pTime < today.getTime()) {
          if (pTime === mostRecentParade.getTime()) {
            relativeTag = "last Parade Night";
          }
        } else if (pTime > today.getTime()) {
          if (pTime === upcomingParade.getTime()) {
            relativeTag = "next Parade Night";
          }
        }

        affectedParadeNights.push({
          dateStr: `${pCurr.getFullYear()}-${String(pCurr.getMonth() + 1).padStart(2, "0")}-${String(pCurr.getDate()).padStart(2, "0")}`,
          formatted: formatNZDisplayDate(pCurr),
          relativeTag,
        });
      }
      pCurr.setDate(pCurr.getDate() + 1);
    }

    return {
      totalDays,
      leaveTaken,
      leaveAhead,
      ytdLeaveTaken,
      upcomingLeave,
      affectedParadeNights,
    };
  };

  const selectedMetrics = selectedRequest ? computeModalMetrics(selectedRequest) : null;

  // Pagination calculations
  const totalUpcomingPages = Math.max(1, Math.ceil(upcomingList.length / ITEMS_PER_PAGE));
  const paginatedUpcoming = upcomingList.slice(
    (upcomingPage - 1) * ITEMS_PER_PAGE,
    upcomingPage * ITEMS_PER_PAGE
  );

  const totalCompletedPages = Math.max(1, Math.ceil(completedList.length / ITEMS_PER_PAGE));
  const paginatedCompleted = completedList.slice(
    (completedPage - 1) * ITEMS_PER_PAGE,
    completedPage * ITEMS_PER_PAGE
  );

  const totalParadeSummaryPages = Math.max(1, Math.ceil(memberParadeSummary.length / ITEMS_PER_PAGE));
  const paginatedParadeSummary = memberParadeSummary.slice(
    (paradeSummaryPage - 1) * ITEMS_PER_PAGE,
    paradeSummaryPage * ITEMS_PER_PAGE
  );

  const panelDefs: Record<string, PanelDef> = {
    calendar: {
      key: "calendar",
      title: "Unit Leave Status",
      icon: <CalendarDays className="h-5 w-5 text-purple-600" />,
      subtitle: `Visual timeline of leave notifications: ${pastWeeksNum} weeks past, today, and ${futureWeeksNum} weeks future.`,
      helpKey: "panel_adjutant_timeline",
      helpTooltip: "Timeline Grid Guide",
      content: (
        <div className="relative rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden shadow-xs">
          <div ref={gridScrollRef} className="overflow-x-auto">
            <div className="inline-block min-w-full align-middle">
              <table className="min-w-full border-collapse text-left text-xs">
                <thead>
                  {/* Month header row */}
                  <tr className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/80">
                    <th className="sticky left-0 z-30 w-44 min-w-[175px] max-w-[175px] bg-zinc-100/90 dark:bg-zinc-800/90 backdrop-blur-md p-2 font-bold text-zinc-700 dark:text-zinc-200 border-r border-zinc-200 dark:border-zinc-700">
                      Personnel (Surname, Rank)
                    </th>
                    {timelineDays.map((d, i) => {
                      const isParade = isParadeNightDate(d.dateStr, paradeNight);
                      const isHoliday = !isDateInTermPeriod(d.dateStr, termYears);
                      const colClass = isParade ? "w-20 min-w-[80px] max-w-[80px]" : "w-10 min-w-[40px] max-w-[40px]";

                      let bgClass = "bg-white text-zinc-600 dark:bg-zinc-900 dark:text-zinc-300";
                      if (d.isToday) {
                        bgClass = "bg-purple-600 text-white font-bold";
                      } else if (isParade) {
                        bgClass = isHoliday
                          ? "bg-purple-200/80 text-purple-950 dark:bg-purple-900/60 dark:text-purple-100 font-bold"
                          : "bg-purple-100/70 text-purple-900 dark:bg-purple-950/60 dark:text-purple-200 font-bold";
                      } else if (isHoliday) {
                        bgClass = "bg-zinc-200/80 text-zinc-800 dark:bg-zinc-800/90 dark:text-zinc-200 font-semibold";
                      } else if (d.isPast) {
                        bgClass = "bg-zinc-100/80 text-zinc-500 dark:bg-zinc-800/70 dark:text-zinc-400";
                      }

                      return (
                        <th
                          key={d.dateStr}
                          title={isHoliday ? "School Holiday / Outside Term Period" : undefined}
                          className={`${colClass} text-center p-1 text-[10px] font-semibold uppercase tracking-wider border-r border-zinc-200 dark:border-zinc-800/60 ${bgClass}`}
                        >
                          {i === 0 || d.dayNum === 1 || d.isToday ? d.monthName : ""}
                        </th>
                      );
                    })}
                  </tr>
                  {/* Day number & name header row */}
                  <tr className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/80">
                    <th className="sticky left-0 z-30 w-44 min-w-[175px] max-w-[175px] bg-zinc-100/90 dark:bg-zinc-800/90 backdrop-blur-md p-2 text-zinc-500 dark:text-zinc-400 font-medium border-r border-zinc-200 dark:border-zinc-700">
                      Timeline ({pastWeeksNum + futureWeeksNum} Wks)
                    </th>
                    {timelineDays.map((d) => {
                      const isParade = isParadeNightDate(d.dateStr, paradeNight);
                      const isHoliday = !isDateInTermPeriod(d.dateStr, termYears);
                      const colClass = isParade ? "w-20 min-w-[80px] max-w-[80px]" : "w-10 min-w-[40px] max-w-[40px]";

                      let bgClass = "bg-white text-zinc-700 dark:bg-zinc-900 dark:text-zinc-300";
                      if (d.isToday) {
                        bgClass = "bg-purple-600 text-white font-bold";
                      } else if (isParade) {
                        bgClass = isHoliday
                          ? "bg-purple-200/80 text-purple-950 dark:bg-purple-900/60 dark:text-purple-100"
                          : "bg-purple-100/70 text-purple-950 dark:bg-purple-950/60 dark:text-purple-200";
                      } else if (isHoliday) {
                        bgClass = "bg-zinc-200/80 text-zinc-800 dark:bg-zinc-800/90 dark:text-zinc-200";
                      } else if (d.isPast) {
                        bgClass = "bg-zinc-100/80 text-zinc-500 dark:bg-zinc-800/70 dark:text-zinc-400";
                      }

                      return (
                        <th
                          key={d.dateStr}
                          title={isHoliday ? "School Holiday / Outside Term Period" : undefined}
                          className={`${colClass} text-center p-1 border-r border-zinc-200 dark:border-zinc-800/60 ${bgClass}`}
                        >
                          <div className={`text-[10px] leading-none ${isParade ? "font-bold text-purple-700 dark:text-purple-300" : "font-normal"}`}>
                            {isParade ? "Parade" : d.dayName}
                          </div>
                          <div className="text-xs font-bold leading-tight mt-0.5">{d.dayNum}</div>
                        </th>
                      );
                    })}
                  </tr>
                </thead>

                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
                  {personnelList.length === 0 ? (
                    <tr>
                      <td colSpan={timelineDays.length + 1} className="p-6 text-center text-zinc-500">
                        No personnel currently on leave in this {pastWeeksNum + futureWeeksNum}-week window.
                      </td>
                    </tr>
                  ) : (
                    personnelList.map((p) => {
                      const pRequests = allRequests.filter(
                        (r) =>
                          r.rank.toLowerCase() === p.rank.toLowerCase() &&
                          r.surname.toLowerCase() === p.surname.toLowerCase()
                      );

                      return (
                        <tr key={`${p.rank}_${p.surname}`} className="h-6 hover:bg-zinc-50/50 dark:hover:bg-zinc-800/20">
                          {/* Left Sticky Personnel Name Column with Frosted Glass Translucent Effect */}
                          <td className="sticky left-0 z-20 w-44 min-w-[175px] max-w-[175px] bg-white/90 dark:bg-zinc-900/90 backdrop-blur-md px-2 py-0.5 text-[11px] font-medium text-zinc-900 dark:text-zinc-100 border-r border-zinc-200 dark:border-zinc-700 truncate shadow-xs">
                            <span className="font-bold">{p.surname}</span>, {p.rank}
                          </td>

                          {/* Timeline cells with leave bars overlay */}
                          <td colSpan={timelineDays.length} className="p-0 relative h-6">
                            {/* Background grid shading (Past, Today, Future, Parade Night) */}
                            <div className="absolute inset-0 flex">
                              {timelineDays.map((d) => {
                                const isParade = isParadeNightDate(d.dateStr, paradeNight);
                                const isHoliday = !isDateInTermPeriod(d.dateStr, termYears);
                                const colClass = isParade ? "w-20 min-w-[80px] max-w-[80px]" : "w-10 min-w-[40px] max-w-[40px]";

                                let bgClass = "bg-white dark:bg-zinc-900";
                                if (d.isToday) {
                                  bgClass = "bg-purple-100/50 dark:bg-purple-950/30 border-x-2 border-x-purple-500/80";
                                } else if (isParade) {
                                  bgClass = isHoliday
                                    ? "bg-purple-150/70 dark:bg-purple-950/50"
                                    : "bg-purple-50/50 dark:bg-purple-950/20";
                                } else if (isHoliday) {
                                  bgClass = "bg-zinc-200/70 dark:bg-zinc-800/75";
                                } else if (d.isPast) {
                                  bgClass = "bg-zinc-100/40 dark:bg-zinc-900/60";
                                }

                                return (
                                  <div
                                    key={d.dateStr}
                                    className={`${colClass} h-full border-r border-zinc-100 dark:border-zinc-800/40 ${bgClass}`}
                                    title={isHoliday ? "School Holiday / Outside Term Period" : undefined}
                                  />
                                );
                              })}
                            </div>

                            {/* Leave Bars Overlay - z-10 so leave bars slide UNDER z-20 sticky column */}
                            <div className="absolute inset-y-0.5 inset-x-0 flex items-center z-10 pointer-events-none">
                              {pRequests.map((req) => {
                                const reqStart = parseLocalDate(req.startDate);
                                const reqEnd = parseLocalDate(req.endDate);

                                const timelineStart = timelineDays[0].date;
                                const timelineEnd = timelineDays[timelineDays.length - 1].date;

                                if (reqEnd < timelineStart || reqStart > timelineEnd) {
                                  return null;
                                }

                                const startCol = Math.max(
                                  0,
                                  Math.floor(
                                    (reqStart.getTime() - timelineStart.getTime()) /
                                      (1000 * 60 * 60 * 24)
                                  )
                                );

                                const endCol = Math.min(
                                  42,
                                  Math.floor(
                                    (reqEnd.getTime() - timelineStart.getTime()) /
                                      (1000 * 60 * 60 * 24)
                                  )
                                );

                                const leftPx = colOffsets.offsets[startCol] + 1;
                                const rightPx = colOffsets.offsets[endCol] + colOffsets.widths[endCol] - 1;
                                const widthPx = rightPx - leftPx;

                                return (
                                  <button
                                    key={req.id}
                                    type="button"
                                    onClick={() => setSelectedRequest(req)}
                                    style={{
                                      left: `${leftPx}px`,
                                      width: `${widthPx}px`,
                                    }}
                                    title={`${req.rank} ${req.surname}: ${req.reason} (${formatNZDisplayDate(req.startDate)} - ${formatNZDisplayDate(req.endDate)}) [Click for details]`}
                                    className="absolute h-5 rounded px-1.5 py-0 text-[10px] font-medium leading-none shadow-2xs transition-all pointer-events-auto flex items-center justify-between overflow-hidden cursor-pointer group bg-purple-600 hover:bg-purple-500 text-white dark:bg-purple-500 dark:hover:bg-purple-400"
                                  >
                                    <span className="truncate leading-none">{req.reason}</span>
                                  </button>
                                );
                              })}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Floating Circle Button: Scroll to Today */}
          <div className="absolute bottom-2.5 right-2.5 z-30">
            <Tooltip content="Today">
              <button
                type="button"
                onClick={() => {
                  if (gridScrollRef.current) {
                    const pastDays = pastWeeksNum * 7;
                    gridScrollRef.current.scrollLeft = (colOffsets.offsets[pastDays] || 0) - 100;
                  }
                }}
                className="flex h-7 w-7 items-center justify-center rounded-full bg-indigo-600 hover:bg-indigo-500 text-white shadow-md hover:scale-110 active:scale-95 transition-all cursor-pointer border border-indigo-400/40 dark:border-indigo-500/50"
                aria-label="Today"
              >
                <CalendarDays className="h-3.5 w-3.5" />
              </button>
            </Tooltip>
          </div>
        </div>
      ),
    },
    upcoming: {
      key: "upcoming",
      title: `Upcoming & Active Leave (${upcomingList.length})`,
      icon: <Clock className="h-5 w-5 text-purple-600" />,
      subtitle: "Full list of all active or future leave notifications yet to be completed.",
      helpKey: "panel_adjutant_upcoming",
      helpTooltip: "Active Leave List Guide",
      content: (
        <div className="space-y-3">
          {upcomingList.length === 0 ? (
            <div className="rounded-lg border border-dashed border-zinc-200 dark:border-zinc-800 p-6 text-center text-xs text-zinc-500">
              No upcoming or active leave notifications.
            </div>
          ) : (
            <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden shadow-2xs">
              <div className="overflow-x-auto">
                <table className="min-w-full border-collapse text-left">
                  <thead>
                    <tr className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/80 text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                      <th className="px-3 py-1.5">Personnel (Surname, Rank)</th>
                      <th className="px-3 py-1.5">Reason</th>
                      <th className="px-3 py-1.5">Date Range</th>
                      <th className="px-3 py-1.5">Total Duration</th>
                      <th className="px-3 py-1.5">Parade Nights</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
                    {paginatedUpcoming.map((req) => {
                      const rStart = parseLocalDate(req.startDate);
                      const rEnd = parseLocalDate(req.endDate);
                      const days = Math.ceil((rEnd.getTime() - rStart.getTime()) / (1000 * 60 * 60 * 24)) + 1;

                      let paradeNights = 0;
                      const curr = new Date(rStart);
                      while (curr <= rEnd) {
                        if (isParadeNightDate(curr, paradeNight)) paradeNights++;
                        curr.setDate(curr.getDate() + 1);
                      }

                      return (
                        <tr
                          key={req.id}
                          onClick={() => setSelectedRequest(req)}
                          className="h-6 hover:bg-purple-50/50 dark:hover:bg-purple-950/20 border-b border-zinc-100 dark:border-zinc-800/60 cursor-pointer text-[11px] transition-colors"
                        >
                          <td className="px-3 py-0.5 whitespace-nowrap font-medium text-zinc-900 dark:text-zinc-100">
                            <span className="font-bold">{req.surname}</span>, {req.rank}
                          </td>
                          <td className="px-3 py-0.5 whitespace-nowrap text-zinc-700 dark:text-zinc-300 truncate max-w-[220px]">
                            {req.reason}
                          </td>
                          <td className="px-3 py-0.5 whitespace-nowrap font-mono text-[10px] text-zinc-500">
                            {formatNZDisplayDate(req.startDate)} &rarr; {formatNZDisplayDate(req.endDate)}
                          </td>
                          <td className="px-3 py-0.5 whitespace-nowrap font-semibold text-purple-600 dark:text-purple-400">
                            {days} {days === 1 ? "day" : "days"}
                          </td>
                          <td className="px-3 py-0.5 whitespace-nowrap">
                            <Tooltip content={getParadeNightsTooltipText(req)} delay={150}>
                              <span className="inline-flex items-center gap-1 rounded bg-purple-100 dark:bg-purple-950 px-1.5 py-0 text-[10px] font-bold text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 cursor-help">
                                {paradeNights} {paradeNights === 1 ? "parade night" : "parade nights"}
                              </span>
                            </Tooltip>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Pagination bar */}
              {totalUpcomingPages > 1 && (
                <div className="flex items-center justify-between px-3 py-2 border-t border-zinc-100 dark:border-zinc-800 text-xs bg-zinc-50/50 dark:bg-zinc-900/50">
                  <span className="text-zinc-500">
                    Showing {(upcomingPage - 1) * ITEMS_PER_PAGE + 1} - {Math.min(upcomingPage * ITEMS_PER_PAGE, upcomingList.length)} of {upcomingList.length} entries
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      disabled={upcomingPage === 1}
                      onClick={() => setUpcomingPage((prev) => Math.max(1, prev - 1))}
                      className="inline-flex items-center gap-0.5 px-2 py-1 rounded border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 disabled:opacity-40 hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
                    >
                      <ChevronLeft className="h-3.5 w-3.5" /> Prev
                    </button>
                    <span className="px-2.5 py-1 font-semibold text-zinc-700 dark:text-zinc-300">
                      Page {upcomingPage} of {totalUpcomingPages}
                    </span>
                    <button
                      type="button"
                      disabled={upcomingPage === totalUpcomingPages}
                      onClick={() => setUpcomingPage((prev) => Math.min(totalUpcomingPages, prev + 1))}
                      className="inline-flex items-center gap-0.5 px-2 py-1 rounded border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 disabled:opacity-40 hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
                    >
                      Next <ChevronRight className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      ),
    },
    completed: {
      key: "completed",
      title: `Completed Leave History (${completedList.length})`,
      icon: <ShieldCheck className="h-5 w-5 text-emerald-600" />,
      subtitle: "Full log of all past completed leave notifications.",
      helpKey: "panel_adjutant_completed",
      helpTooltip: "Completed Leave Log Guide",
      content: (
        <div className="space-y-3">
          {completedList.length === 0 ? (
            <div className="rounded-lg border border-dashed border-zinc-200 dark:border-zinc-800 p-6 text-center text-xs text-zinc-500">
              No completed historical leave entries.
            </div>
          ) : (
            <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden shadow-2xs">
              <div className="overflow-x-auto">
                <table className="min-w-full border-collapse text-left">
                  <thead>
                    <tr className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/80 text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                      <th className="px-3 py-1.5">Personnel (Surname, Rank)</th>
                      <th className="px-3 py-1.5">Reason</th>
                      <th className="px-3 py-1.5">Date Range</th>
                      <th className="px-3 py-1.5">Total Duration</th>
                      <th className="px-3 py-1.5">Parade Nights</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
                    {paginatedCompleted.map((req) => {
                      const rStart = parseLocalDate(req.startDate);
                      const rEnd = parseLocalDate(req.endDate);
                      const days = Math.ceil((rEnd.getTime() - rStart.getTime()) / (1000 * 60 * 60 * 24)) + 1;

                      let paradeNights = 0;
                      const curr = new Date(rStart);
                      while (curr <= rEnd) {
                        if (isParadeNightDate(curr, paradeNight)) paradeNights++;
                        curr.setDate(curr.getDate() + 1);
                      }

                      return (
                        <tr
                          key={req.id}
                          onClick={() => setSelectedRequest(req)}
                          className="h-6 hover:bg-emerald-50/50 dark:hover:bg-emerald-950/20 border-b border-zinc-100 dark:border-zinc-800/60 cursor-pointer text-[11px] transition-colors"
                        >
                          <td className="px-3 py-0.5 whitespace-nowrap font-medium text-zinc-900 dark:text-zinc-100">
                            <span className="font-bold">{req.surname}</span>, {req.rank}
                          </td>
                          <td className="px-3 py-0.5 whitespace-nowrap text-zinc-700 dark:text-zinc-300 truncate max-w-[220px]">
                            {req.reason}
                          </td>
                          <td className="px-3 py-0.5 whitespace-nowrap font-mono text-[10px] text-zinc-500">
                            {formatNZDisplayDate(req.startDate)} &rarr; {formatNZDisplayDate(req.endDate)}
                          </td>
                          <td className="px-3 py-0.5 whitespace-nowrap font-semibold text-emerald-600 dark:text-emerald-400">
                            {days} {days === 1 ? "day" : "days"}
                          </td>
                          <td className="px-3 py-0.5 whitespace-nowrap">
                            <Tooltip content={getParadeNightsTooltipText(req)} delay={150}>
                              <span className="inline-flex items-center gap-1 rounded bg-emerald-100 dark:bg-emerald-950 px-1.5 py-0 text-[10px] font-bold text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 cursor-help">
                                {paradeNights} {paradeNights === 1 ? "parade night" : "parade nights"}
                              </span>
                            </Tooltip>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Pagination bar */}
              {totalCompletedPages > 1 && (
                <div className="flex items-center justify-between px-3 py-2 border-t border-zinc-100 dark:border-zinc-800 text-xs bg-zinc-50/50 dark:bg-zinc-900/50">
                  <span className="text-zinc-500">
                    Showing {(completedPage - 1) * ITEMS_PER_PAGE + 1} - {Math.min(completedPage * ITEMS_PER_PAGE, completedList.length)} of {completedList.length} entries
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      disabled={completedPage === 1}
                      onClick={() => setCompletedPage((prev) => Math.max(1, prev - 1))}
                      className="inline-flex items-center gap-0.5 px-2 py-1 rounded border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 disabled:opacity-40 hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
                    >
                      <ChevronLeft className="h-3.5 w-3.5" /> Prev
                    </button>
                    <span className="px-2.5 py-1 font-semibold text-zinc-700 dark:text-zinc-300">
                      Page {completedPage} of {totalCompletedPages}
                    </span>
                    <button
                      type="button"
                      disabled={completedPage === totalCompletedPages}
                      onClick={() => setCompletedPage((prev) => Math.min(totalCompletedPages, prev + 1))}
                      className="inline-flex items-center gap-0.5 px-2 py-1 rounded border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 disabled:opacity-40 hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
                    >
                      Next <ChevronRight className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      ),
    },
    paradeSummary: {
      key: "paradeSummary",
      title: `Member Parade Days Summary (${memberParadeSummary.length})`,
      icon: <ListOrdered className="h-5 w-5 text-blue-600" />,
      subtitle: "Total parade nights (Wednesdays) affected per member across all logged leave.",
      helpKey: "panel_adjutant_parade_summary",
      helpTooltip: "Parade Days Summary Guide",
      content: (
        <div className="space-y-3">
          {memberParadeSummary.length === 0 ? (
            <div className="rounded-lg border border-dashed border-zinc-200 dark:border-zinc-800 p-6 text-center text-xs text-zinc-500">
              No leave records found to compute member parade days.
            </div>
          ) : (
            <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden shadow-2xs">
              <div className="overflow-x-auto">
                <table className="min-w-full border-collapse text-left">
                  <thead>
                    <tr className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/80 text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                      <th className="px-3 py-1.5">Personnel (Surname, Rank)</th>
                      <th className="px-3 py-1.5">Parade Nights Affected</th>
                      <th className="px-3 py-1.5">Total Leave Days</th>
                      <th className="px-3 py-1.5">Submissions Logged</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
                    {paginatedParadeSummary.map((m) => (
                      <tr
                        key={`${m.rank}_${m.surname}`}
                        className="h-6 hover:bg-blue-50/50 dark:hover:bg-blue-950/20 border-b border-zinc-100 dark:border-zinc-800/60 text-[11px] transition-colors"
                      >
                        <td className="px-3 py-0.5 whitespace-nowrap font-medium text-zinc-900 dark:text-zinc-100">
                          <span className="font-bold">{m.surname}</span>, {m.rank}
                        </td>
                        <td className="px-3 py-0.5 whitespace-nowrap">
                          <Tooltip content={getMemberParadeNightsTooltipText(m.surname, m.rank)} delay={150}>
                            <span className="inline-flex items-center gap-1 rounded bg-blue-100 dark:bg-blue-950 px-2 py-0 text-[10px] font-bold text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 cursor-help">
                              {m.totalParadeNights} {m.totalParadeNights === 1 ? "parade night" : "parade nights"}
                            </span>
                          </Tooltip>
                        </td>
                        <td className="px-3 py-0.5 whitespace-nowrap font-semibold text-zinc-700 dark:text-zinc-300">
                          {m.totalLeaveDays} {m.totalLeaveDays === 1 ? "day" : "days"}
                        </td>
                        <td className="px-3 py-0.5 whitespace-nowrap text-zinc-500 font-mono text-[10px]">
                          {m.requestCount} {m.requestCount === 1 ? "entry" : "entries"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination bar */}
              {totalParadeSummaryPages > 1 && (
                <div className="flex items-center justify-between px-3 py-2 border-t border-zinc-100 dark:border-zinc-800 text-xs bg-zinc-50/50 dark:bg-zinc-900/50">
                  <span className="text-zinc-500">
                    Showing {(paradeSummaryPage - 1) * ITEMS_PER_PAGE + 1} - {Math.min(paradeSummaryPage * ITEMS_PER_PAGE, memberParadeSummary.length)} of {memberParadeSummary.length} entries
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      disabled={paradeSummaryPage === 1}
                      onClick={() => setParadeSummaryPage((prev) => Math.max(1, prev - 1))}
                      className="inline-flex items-center gap-0.5 px-2 py-1 rounded border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 disabled:opacity-40 hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
                    >
                      <ChevronLeft className="h-3.5 w-3.5" /> Prev
                    </button>
                    <span className="px-2.5 py-1 font-semibold text-zinc-700 dark:text-zinc-300">
                      Page {paradeSummaryPage} of {totalParadeSummaryPages}
                    </span>
                    <button
                      type="button"
                      disabled={paradeSummaryPage === totalParadeSummaryPages}
                      onClick={() => setParadeSummaryPage((prev) => Math.min(totalParadeSummaryPages, prev + 1))}
                      className="inline-flex items-center gap-0.5 px-2 py-1 rounded border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 disabled:opacity-40 hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
                    >
                      Next <ChevronRight className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
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
            <Users className="h-6 w-6 text-purple-600 shrink-0" />
            <span>Adjutant Portal</span>
            {currentMember && (
              <span className="text-base font-normal text-zinc-500 dark:text-zinc-400">
                &ndash; {currentMember.rank} {currentMember.surname}
              </span>
            )}
          </h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Review personnel leave notifications, maintain unit readiness, and inspect threat status.
          </p>
        </div>
        <HelpTrigger helpKey="page_adjutant_portal" tooltipText="Adjutant Portal Guide" />
      </div>

      <DragDropContext onDragEnd={onDragEnd}>
        <Droppable droppableId="adjutant-panels">
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
                            ? "border-purple-300 shadow-lg dark:border-purple-700"
                            : "border-zinc-200 dark:border-zinc-800"
                        }`}
                      >
                        {/* Panel Header */}
                        <div
                          className="flex items-center gap-3 p-6 cursor-pointer select-none group"
                          onClick={() => toggleCollapsed(key)}
                        >
                          {/* Drag Handle */}
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

                          {/* Title & Subtitle */}
                          <div className="flex-1 min-w-0">
                            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50 leading-tight">
                              {panel.title}
                            </h2>
                            {panel.subtitle && (
                              <p className="text-xs text-zinc-500 mt-0.5 truncate">{panel.subtitle}</p>
                            )}
                          </div>

                          {/* Help Trigger */}
                          {panel.helpKey && (
                            <div onClick={(e) => e.stopPropagation()} className="shrink-0">
                              <HelpTrigger helpKey={panel.helpKey} tooltipText={panel.helpTooltip || "Panel Guide"} />
                            </div>
                          )}

                          {/* Collapse Chevron */}
                          <ChevronDown
                            className={`h-5 w-5 text-zinc-400 dark:text-zinc-500 transition-transform duration-200 group-hover:text-zinc-600 dark:group-hover:text-zinc-300 ${
                              isCollapsed ? "-rotate-90" : ""
                            }`}
                          />
                        </div>

                        {/* Panel Content */}
                        {!isCollapsed && (
                          <div className="px-6 pb-6 pt-0 border-t border-zinc-100 dark:border-zinc-800/80 mt-1">
                            <div className="pt-4">{panel.content}</div>
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

      {/* Leave Request Detail Modal */}
      {selectedRequest && selectedMetrics && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="absolute inset-0" onClick={() => setSelectedRequest(null)} />
          <div className="relative w-full max-w-lg rounded-2xl border border-zinc-200 bg-white p-6 shadow-2xl dark:border-zinc-800 dark:bg-zinc-900 space-y-5 text-left">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-zinc-150 dark:border-zinc-800 pb-3">
              <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
                <Info className="h-5 w-5 text-purple-600" />
                Leave Notification Details &amp; Metrics
              </h3>
              <button
                type="button"
                onClick={() => setSelectedRequest(null)}
                className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 cursor-pointer p-1 rounded-lg"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Applicant Details Card */}
            <div className="rounded-xl border border-zinc-150 dark:border-zinc-800 bg-zinc-50/50 p-4 dark:bg-zinc-800/40 space-y-2">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <span className="text-base font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                  <User className="h-4 w-4 text-purple-600" />
                  {selectedRequest.rank} {selectedRequest.surname}
                </span>
              </div>
              <p className="text-xs text-zinc-600 dark:text-zinc-300 font-medium">
                Reason: <span className="font-semibold text-zinc-900 dark:text-zinc-100">{selectedRequest.reason}</span>
              </p>
              <p className="text-xs text-zinc-500 font-mono">
                {formatNZDisplayDate(selectedRequest.startDate)} &rarr; {formatNZDisplayDate(selectedRequest.endDate)} ({selectedMetrics.totalDays} {selectedMetrics.totalDays === 1 ? "day" : "days"}, {selectedMetrics.affectedParadeNights.length} {selectedMetrics.affectedParadeNights.length === 1 ? "parade night" : "parade nights"})
              </p>
            </div>

            {/* Metrics Breakdown Grid */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-800/80 p-3 text-center">
                <span className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider">TOTAL</span>
                <p className="text-xl font-bold text-zinc-900 dark:text-zinc-100 mt-1">
                  {selectedMetrics.totalDays} <span className="text-xs font-normal">days</span>
                </p>
              </div>

              <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-800/80 p-3 text-center">
                <span className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider">ELAPSED</span>
                <p className="text-xl font-bold text-amber-600 dark:text-amber-400 mt-1">
                  {selectedMetrics.leaveTaken} <span className="text-xs font-normal">days</span>
                </p>
              </div>

              <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-800/80 p-3 text-center">
                <span className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider">AHEAD</span>
                <p className="text-xl font-bold text-purple-600 dark:text-purple-400 mt-1">
                  {selectedMetrics.leaveAhead} <span className="text-xs font-normal">days</span>
                </p>
              </div>

              <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-800/80 p-3 text-center">
                <span className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider">YTD TOTAL</span>
                <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
                  {selectedMetrics.ytdLeaveTaken} <span className="text-xs font-normal">days</span>
                </p>
              </div>
            </div>

            {/* Parade Nights Affected Section */}
            <div className="rounded-xl border border-purple-200 bg-purple-50/50 dark:border-purple-900/40 dark:bg-purple-950/20 p-3 space-y-1.5">
              <div className="flex items-center justify-between text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                <span className="flex items-center gap-1.5 text-purple-900 dark:text-purple-300">
                  <CalendarDays className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                  Parade Nights Affected
                </span>
                <span className="rounded-full bg-purple-200 dark:bg-purple-900/60 px-2 py-0.5 text-[11px] font-bold text-purple-900 dark:text-purple-200 border border-purple-300 dark:border-purple-800">
                  Total: {selectedMetrics.affectedParadeNights.length}
                </span>
              </div>

              {selectedMetrics.affectedParadeNights.length === 0 ? (
                <p className="text-xs text-zinc-500 italic p-3">
                  No {paradeNight} parade nights affected by this request window.
                </p>
              ) : (
                <div className="flex flex-wrap gap-1.5 pt-0.5">
                  {selectedMetrics.affectedParadeNights.map((p) => (
                    <span
                      key={p.dateStr}
                      className="inline-flex items-center gap-1 rounded-md bg-white dark:bg-zinc-800 px-2 py-1 text-[11px] font-medium text-zinc-800 dark:text-zinc-200 border border-purple-200 dark:border-purple-800 shadow-2xs"
                    >
                      <span>{p.formatted}</span>
                      {p.relativeTag && (
                        <span className="font-bold text-purple-700 dark:text-purple-300 bg-purple-100 dark:bg-purple-950 px-1 rounded text-[10px]">
                          ({p.relativeTag})
                        </span>
                      )}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Quick Action Footer */}
            <div className="flex justify-between items-center pt-2 border-t border-zinc-100 dark:border-zinc-800">
              {currentMember?.isAdmin ? (
                <button
                  type="button"
                  onClick={() => setIsDeleteModalOpen(true)}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-rose-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-rose-500 transition-colors cursor-pointer shadow-xs"
                >
                  <Trash2 className="h-3.5 w-3.5" /> Delete Entry
                </button>
              ) : (
                <div />
              )}
              <button
                type="button"
                onClick={() => setSelectedRequest(null)}
                className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-500 transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Admin Confirm Delete Modal */}
      <ConfirmDeleteModal
        isOpen={isDeleteModalOpen}
        title="Delete Leave Entry?"
        message={`Are you sure you want to delete the leave entry for ${selectedRequest?.rank} ${selectedRequest?.surname} (${selectedRequest ? formatNZDisplayDate(selectedRequest.startDate) : ""} - ${selectedRequest ? formatNZDisplayDate(selectedRequest.endDate) : ""})? This action cannot be undone.`}
        isPending={isDeleting}
        onCancel={() => setIsDeleteModalOpen(false)}
        onConfirm={() => {
          if (!selectedRequest) return;
          startDeletingTransition(async () => {
            const res = await deleteLeaveRequest(selectedRequest.id);
            if (res.success) {
              setIsDeleteModalOpen(false);
              setSelectedRequest(null);
            } else {
              alert(res.error || "Failed to delete leave entry");
            }
          });
        }}
      />
    </>
  );
}
