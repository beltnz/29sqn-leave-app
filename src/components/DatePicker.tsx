"use client";

import React, { useState, useRef, useEffect } from "react";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, ChevronUp, ChevronDown } from "lucide-react";
import { getNZTodayString, addDaysToDateString } from "@/lib/dateUtils";

const DAYS_OF_WEEK = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

export default function DatePicker({
  value,
  onChange,
  paradeNight = "Wednesday",
  placeholder = "Select date",
  required = false,
  className = "",
}: {
  value: string;
  onChange: (val: string) => void;
  paradeNight: string;
  placeholder?: string;
  required?: boolean;
  className?: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  
  // Get NZ Today as default date parsing base
  const nzTodayStr = getNZTodayString();
  const [nzY, nzM, nzD] = nzTodayStr.split("-").map(Number);

  // Parse initial view year & month from value or NZ today
  const parseVal = value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : nzTodayStr;
  const [initY, initM] = parseVal.split("-").map(Number);

  const [currentYear, setCurrentYear] = useState(initY);
  const [currentMonth, setCurrentMonth] = useState(initM - 1); // 0-indexed
  
  const containerRef = useRef<HTMLDivElement>(null);

  // Close calendar when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Update current view when value changes externally
  useEffect(() => {
    if (value && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
      const [y, m] = value.split("-").map(Number);
      setCurrentYear(y);
      setCurrentMonth(m - 1);
    }
  }, [value]);

  const targetDayIndex = DAYS_OF_WEEK.indexOf(paradeNight);

  // Calendar grid calculations
  const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay();
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
  };

  const handleGoToToday = () => {
    const todayStr = getNZTodayString();
    const [ty, tm] = todayStr.split("-").map(Number);
    setCurrentYear(ty);
    setCurrentMonth(tm - 1);
  };

  const handleSelectDay = (day: number) => {
    const mStr = String(currentMonth + 1).padStart(2, "0");
    const dStr = String(day).padStart(2, "0");
    const formatted = `${currentYear}-${mStr}-${dStr}`;
    onChange(formatted);
    setIsOpen(false);
  };

  const handleStep = (days: number) => {
    const baseStr = value || getNZTodayString();
    const nextStr = addDaysToDateString(baseStr, days);
    if (nextStr < getNZTodayString()) return;
    onChange(nextStr);
  };

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  // Helper to check if a day is today in NZ
  const isToday = (day: number) => {
    const todayStr = getNZTodayString();
    const [ty, tm, td] = todayStr.split("-").map(Number);
    return currentYear === ty && (currentMonth + 1) === tm && day === td;
  };

  // Helper to check if a day is currently selected
  const isSelected = (day: number) => {
    if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const [vy, vm, vd] = value.split("-").map(Number);
    return currentYear === vy && (currentMonth + 1) === vm && day === vd;
  };

  // Helper to check if a day is a parade night
  const isParadeNight = (day: number) => {
    const d = new Date(currentYear, currentMonth, day);
    return d.getDay() === targetDayIndex;
  };

  // Helper to check if a day is in the past relative to NZ Today
  const isPast = (day: number) => {
    const todayStr = getNZTodayString();
    const [ty, tm, td] = todayStr.split("-").map(Number);
    if (currentYear < ty) return true;
    if (currentYear > ty) return false;
    if ((currentMonth + 1) < tm) return true;
    if ((currentMonth + 1) > tm) return false;
    return day < td;
  };

  // Render empty cells for leading padding
  const emptyCells = Array.from({ length: firstDayOfMonth }, (_, i) => i);
  const dayCells = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  return (
    <div ref={containerRef} className="relative w-full">
      <div className="relative flex items-center">
        <input
          type="text"
          readOnly
          required={required}
          value={value}
          onClick={() => setIsOpen(true)}
          placeholder={placeholder}
          className={`w-full cursor-pointer rounded-lg border border-zinc-300 bg-white pl-3 pr-16 py-2 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500 ${className}`}
        />
        <div className="absolute right-8 flex flex-col -space-y-0.5">
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); handleStep(1); }}
            className="text-zinc-400 hover:text-zinc-650 dark:hover:text-zinc-200 transition-colors p-0.5 cursor-pointer"
            title="Increment 1 day"
          >
            <ChevronUp className="h-3 w-3" />
          </button>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); handleStep(-1); }}
            className="text-zinc-400 hover:text-zinc-650 dark:hover:text-zinc-200 transition-colors p-0.5 cursor-pointer"
            title="Decrement 1 day"
          >
            <ChevronDown className="h-3 w-3" />
          </button>
        </div>
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="absolute right-3 text-zinc-400 hover:text-zinc-650 dark:hover:text-zinc-300 cursor-pointer"
        >
          <CalendarIcon className="h-4 w-4" />
        </button>
      </div>

      {isOpen && (
        <div className="absolute left-0 mt-1.5 z-50 w-72 rounded-xl border border-zinc-200 bg-white p-4 shadow-xl dark:border-zinc-800 dark:bg-zinc-950 animate-in fade-in zoom-in-95 duration-100">
          {/* Header */}
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-semibold text-zinc-800 dark:text-zinc-250">
              {monthNames[currentMonth]} {currentYear}
            </span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handleGoToToday}
                className="px-2 py-0.5 text-[10px] font-bold text-purple-700 bg-purple-50 hover:bg-purple-100 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-200 dark:border-purple-800 rounded-md transition-colors cursor-pointer"
                title="Reposition calendar view to today's current month"
              >
                Today
              </button>
              <button
                type="button"
                onClick={handlePrevMonth}
                className="p-1 rounded-md text-zinc-500 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800 cursor-pointer"
                title="Previous Month"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={handleNextMonth}
                className="p-1 rounded-md text-zinc-500 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800 cursor-pointer"
                title="Next Month"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Weekdays */}
          <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-bold text-zinc-400 dark:text-zinc-550 uppercase tracking-wider mb-1">
            {WEEKDAYS.map((day) => (
              <div key={day} className="py-1">
                {day}
              </div>
            ))}
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 gap-1 text-center">
            {emptyCells.map((_, i) => (
              <div key={`empty-${i}`} />
            ))}
            {dayCells.map((day) => {
              const selected = isSelected(day);
              const parade = isParadeNight(day);
              const today = isToday(day);
              const past = isPast(day);

              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => !past && handleSelectDay(day)}
                  disabled={past}
                  className={`relative py-1.5 text-xs font-medium rounded-lg transition-all ${
                    past
                      ? "text-zinc-300 bg-zinc-50 cursor-not-allowed line-through dark:text-zinc-600 dark:bg-zinc-900/50"
                      : selected
                      ? "bg-blue-600 text-white font-bold cursor-pointer"
                      : today && parade
                      ? "bg-amber-50 text-amber-800 font-bold ring-2 ring-amber-400 border border-purple-300 cursor-pointer dark:bg-amber-950/40 dark:text-amber-200 dark:ring-amber-500 dark:border-purple-700"
                      : today
                      ? "bg-amber-50 text-amber-800 font-bold ring-2 ring-amber-400 cursor-pointer dark:bg-amber-950/40 dark:text-amber-200 dark:ring-amber-500"
                      : parade
                      ? "bg-purple-50 text-purple-700 border border-purple-200 hover:bg-purple-100 font-semibold cursor-pointer dark:bg-purple-950/30 dark:text-purple-300 dark:border-purple-900/60 dark:hover:bg-purple-900/40"
                      : "text-zinc-700 hover:bg-zinc-100 cursor-pointer dark:text-zinc-300 dark:hover:bg-zinc-850"
                  }`}
                  title={past ? "Past date" : parade ? `Parade Night (${paradeNight})` : undefined}
                >
                  {day}
                  {/* Subtle dot indicator under highlighted parading days */}
                  {parade && !selected && !past && (
                    <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-purple-500 dark:bg-purple-400" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
