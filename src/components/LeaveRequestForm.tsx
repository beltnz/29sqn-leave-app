"use client";

import { useState, useTransition } from "react";
import { createLeaveRequest } from "@/app/actions";
import { DEFAULT_RANKS } from "@/lib/validations";
import { Calendar, Plus, Send, Loader2, Check } from "lucide-react";
import Tooltip from "@/components/Tooltip";
import DatePicker from "@/components/DatePicker";
import HelpTrigger from "@/components/HelpTrigger";

import { getThisParadeNightString, getNextParadeNightString, addDaysToDateString } from "@/lib/dateUtils";

interface Member {
  id: number;
  name: string;
  email: string;
}

export default function LeaveRequestForm({
  defaultOpen = true,
  paradeNight = "Wednesday",
  ranks = DEFAULT_RANKS,
}: {
  members?: Member[];
  defaultOpen?: boolean;
  paradeNight?: string;
  ranks?: string[];
}) {
  const ranksList = ranks && ranks.length > 0 ? ranks : DEFAULT_RANKS;
  const [rank, setRank] = useState<string>(ranksList[0] || "CDT");
  const [surname, setSurname] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [reasonCategory, setReasonCategory] = useState<string>("");
  const [customReasonText, setCustomReasonText] = useState("");
  const [hpValue, setHpValue] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [isPending, startTransition] = useTransition();

  const resetForm = () => {
    setRank("CDT");
    setSurname("");
    setStartDate("");
    setEndDate("");
    setReasonCategory("");
    setCustomReasonText("");
    setErrorMsg("");
  };

  const handleClear = () => {
    resetForm();
  };

  const setThisParade = () => {
    const formatted = getThisParadeNightString(paradeNight);
    setStartDate(formatted);
    setEndDate(formatted);
  };

  const setNextParade = () => {
    const formatted = getNextParadeNightString(paradeNight);
    setStartDate(formatted);
    setEndDate(formatted);
  };

  const extendEndDate = (days: number) => {
    if (!startDate) return;
    setEndDate(addDaysToDateString(startDate, days));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!reasonCategory) {
      setErrorMsg("Please select a reason from the dropdown menu.");
      return;
    }

    const isCustomReason = reasonCategory.startsWith("Other") || reasonCategory.startsWith("Private/Personal");

    const finalReason = isCustomReason
      ? (customReasonText.trim() || reasonCategory.replace(/\*$/, ""))
      : reasonCategory;

    if (reasonCategory.startsWith("Other") && !customReasonText.trim()) {
      setErrorMsg("Please specify the reason for selecting 'Other*'.");
      return;
    }

    if (!surname.trim() || !startDate) {
      setErrorMsg("Please fill in all required fields.");
      return;
    }

    setErrorMsg("");

    startTransition(async () => {
      const res = await createLeaveRequest({
        rank,
        surname: surname.trim(),
        startDate,
        endDate: endDate || startDate, // Fallback to start date if not provided
        reason: finalReason,
        website_hp: hpValue,
      });

      if (res.success) {
        setShowSuccessModal(true);
        resetForm();
        setTimeout(() => setShowSuccessModal(false), 2500);
      } else {
        setErrorMsg(res.error || "Failed to submit leave request.");
      }
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLFormElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
    }
  };

  return (
    <div className="mb-6">
      {showSuccessModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white dark:bg-zinc-900 rounded-xl max-w-sm w-full p-6 text-center border border-zinc-200 dark:border-zinc-800 shadow-xl transform transition-all animate-in zoom-in-95 duration-250">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-950/50 mb-4 animate-bounce">
              <Check className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
            </div>
            <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">
              Leave Logged!
            </h3>
            <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
              Your leave notification has been logged successfully.
            </p>
          </div>
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        onKeyDown={handleKeyDown}
        className="mt-4 rounded-xl border border-zinc-200 bg-white p-4 sm:p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 space-y-4 max-w-xl w-full"
      >
        {/* Hidden Honeypot Anti-Bot Field */}
        <div className="hidden aria-hidden" aria-hidden="true" style={{ display: "none" }}>
          <input
            type="text"
            name="website_hp"
            tabIndex={-1}
            autoComplete="off"
            value={hpValue}
            onChange={(e) => setHpValue(e.target.value)}
          />
        </div>
          <div className="flex items-center justify-between gap-2 border-b border-zinc-100 dark:border-zinc-800 pb-3">
            <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
              <Calendar className="h-5 w-5 text-blue-600 shrink-0" />
              Log Leave Notification
            </h3>
            <HelpTrigger helpKey="panel_leave_form" tooltipText="Form Guidance & Input Rules" />
          </div>

          {errorMsg && (
            <div className="rounded-lg bg-rose-50 p-3 text-xs font-medium text-rose-700 dark:bg-rose-950/50 dark:text-rose-300 border border-rose-200 dark:border-rose-900">
              {errorMsg}
            </div>
          )}

          {/* Rank & Surname Input Row */}
          <div>
            <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
              Rank & Surname
            </label>
            <div className="flex gap-2 w-full">
              <select
                value={rank}
                onChange={(e) => setRank(e.target.value)}
                className="w-28 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500 font-semibold shrink-0"
              >
                {ranksList.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
              <input
                type="text"
                required
                maxLength={50}
                placeholder="Surname (e.g. Smith)"
                value={surname}
                onChange={(e) => setSurname(e.target.value)}
                className="flex-grow rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Dates Row */}
          <div className="grid grid-cols-2 gap-4 w-full">
            <div>
              <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                Start Date
              </label>
              <DatePicker
                required
                value={startDate}
                onChange={setStartDate}
                paradeNight={paradeNight}
                placeholder="Select start date"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                End Date
              </label>
              <DatePicker
                value={endDate}
                onChange={setEndDate}
                paradeNight={paradeNight}
                placeholder="Same day"
              />
            </div>
          </div>

          {/* Quick Date Presets */}
          <div className="flex flex-wrap gap-1.5 items-center bg-zinc-50 dark:bg-zinc-900/50 p-2.5 rounded-lg border border-zinc-150 dark:border-zinc-800 w-full">
            <span className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mr-1">
              Quick Presets:
            </span>
            <Tooltip content={`Set dates to the closest upcoming ${paradeNight} parade night`}>
              <button
                type="button"
                onClick={setThisParade}
                className="rounded bg-white hover:bg-zinc-50 dark:bg-zinc-900 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 px-2 py-1 text-[10px] font-semibold border border-zinc-200 dark:border-zinc-700 transition-colors cursor-pointer"
              >
                this parade night
              </button>
            </Tooltip>
            <Tooltip content={`Set dates to the ${paradeNight} parade night after next`}>
              <button
                type="button"
                onClick={setNextParade}
                className="rounded bg-white hover:bg-zinc-50 dark:bg-zinc-900 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 px-2 py-1 text-[10px] font-semibold border border-zinc-200 dark:border-zinc-700 transition-colors cursor-pointer"
              >
                next parade night
              </button>
            </Tooltip>
            <div className="h-4 w-px bg-zinc-200 dark:bg-zinc-800 mx-1.5" />
            <Tooltip content={startDate ? "Extend End Date by 1 day from Start Date" : "Set a Start Date first"}>
              <button
                type="button"
                disabled={!startDate}
                onClick={() => extendEndDate(1)}
                className="disabled:opacity-40 disabled:cursor-not-allowed rounded bg-blue-50 hover:bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:hover:bg-blue-950/70 dark:text-blue-300 px-2 py-1 text-[10px] font-bold border border-blue-150 dark:border-blue-900/60 transition-all cursor-pointer"
              >
                +1d
              </button>
            </Tooltip>
            <Tooltip content={startDate ? "Extend End Date by 2 days from Start Date" : "Set a Start Date first"}>
              <button
                type="button"
                disabled={!startDate}
                onClick={() => extendEndDate(2)}
                className="disabled:opacity-40 disabled:cursor-not-allowed rounded bg-blue-50 hover:bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:hover:bg-blue-950/70 dark:text-blue-300 px-2 py-1 text-[10px] font-bold border border-blue-150 dark:border-blue-900/60 transition-all cursor-pointer"
              >
                +2d
              </button>
            </Tooltip>
            <Tooltip content={startDate ? "Extend End Date by 1 week from Start Date" : "Set a Start Date first"}>
              <button
                type="button"
                disabled={!startDate}
                onClick={() => extendEndDate(7)}
                className="disabled:opacity-40 disabled:cursor-not-allowed rounded bg-blue-50 hover:bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:hover:bg-blue-950/70 dark:text-blue-300 px-2 py-1 text-[10px] font-bold border border-blue-150 dark:border-blue-900/60 transition-all cursor-pointer"
              >
                +1w
              </button>
            </Tooltip>
            <Tooltip content={startDate ? "Extend End Date by 2 weeks from Start Date" : "Set a Start Date first"}>
              <button
                type="button"
                disabled={!startDate}
                onClick={() => extendEndDate(14)}
                className="disabled:opacity-40 disabled:cursor-not-allowed rounded bg-blue-50 hover:bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:hover:bg-blue-950/70 dark:text-blue-300 px-2 py-1 text-[10px] font-bold border border-blue-150 dark:border-blue-900/60 transition-all cursor-pointer"
              >
                +2w
              </button>
            </Tooltip>
          </div>

          {/* Reason / Justification Field */}
          <div>
            <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
              Reason / Justification
            </label>
            <div className="space-y-2 w-full">
              <select
                value={reasonCategory}
                onChange={(e) => {
                  setReasonCategory(e.target.value);
                  setCustomReasonText(""); // clear custom text when switching
                }}
                className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500 font-semibold"
              >
                <option value="" disabled hidden>Choose one</option>
                <option value="Unwell">Unwell</option>
                <option value="School / Study">School / Study</option>
                <option value="Work">Work</option>
                <option value="Sport">Sport</option>
                <option value="Club">Club</option>
                <option value="Family">Family</option>
                <option value="Other*">Other*</option>
                <option value="Private/Personal*">Private/Personal*</option>
              </select>

              {(reasonCategory.startsWith("Other") || reasonCategory.startsWith("Private/Personal")) && (
                <div className="animate-in fade-in slide-in-from-top-1 duration-150">
                  <textarea
                    required={reasonCategory.startsWith("Other")} // Required only for Other*, optional/allow blank for Private/Personal*
                    maxLength={500}
                    rows={3}
                    placeholder={
                      reasonCategory.startsWith("Other")
                        ? "Please specify the reason (e.g. Car broke down)"
                        : "Optional: type private details (encrypted, only visible to command)"
                    }
                    value={customReasonText}
                    onChange={(e) => setCustomReasonText(e.target.value)}
                    className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col-reverse sm:flex-row justify-between items-center gap-2 pt-2 w-full">
            <div className="flex gap-2 w-full sm:w-auto">
              <button
                type="button"
                onClick={handleClear}
                className="w-full sm:w-auto rounded-lg border border-zinc-200 px-4 py-2 text-xs font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
              >
                Clear Form
              </button>
            </div>
            <button
              type="submit"
              disabled={isPending}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 rounded-lg bg-blue-600 px-5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-blue-500 disabled:opacity-50 transition-colors cursor-pointer"
            >
              {isPending ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> Logging...
                </>
              ) : (
                <>
                  <Send className="h-3.5 w-3.5" /> Log Leave Notification
                </>
              )}
            </button>
          </div>
        </form>
      </div>
  );
}
