"use client";

import { useEffect, useState } from "react";
import { Sun, Moon } from "lucide-react";
import Tooltip from "@/components/Tooltip";

export default function ThemeToggle() {
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const savedTheme = localStorage.getItem("theme") as "dark" | "light" | null;
    const initialTheme = savedTheme || "dark";
    setTheme(initialTheme);
    if (initialTheme === "dark") {
      document.documentElement.classList.add("dark");
      document.documentElement.classList.remove("light");
    } else {
      document.documentElement.classList.remove("dark");
      document.documentElement.classList.add("light");
    }
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
    localStorage.setItem("theme", nextTheme);

    if (nextTheme === "dark") {
      document.documentElement.classList.add("dark");
      document.documentElement.classList.remove("light");
    } else {
      document.documentElement.classList.remove("dark");
      document.documentElement.classList.add("light");
    }
  };

  if (!mounted) {
    return (
      <button
        aria-label="Toggle theme"
        className="flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-200 bg-white text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400 opacity-50"
      >
        <Moon className="h-4 w-4" />
      </button>
    );
  }

  return (
    <Tooltip content={`Switch to ${theme === "dark" ? "Light" : "Dark"} mode`}>
      <button
        onClick={toggleTheme}
        aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
        className="flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800 transition-all shadow-xs cursor-pointer"
      >
        {theme === "dark" ? (
          <Sun className="h-4 w-4 text-amber-400 hover:rotate-45 transition-transform" />
        ) : (
          <Moon className="h-4 w-4 text-indigo-600 hover:-rotate-12 transition-transform" />
        )}
      </button>
    </Tooltip>
  );
}

