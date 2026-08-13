import { Calendar } from "lucide-react";
import LeaveRequestForm from "@/components/LeaveRequestForm";
import { getSystemSetting } from "@/app/actions";
import { parseRanksList } from "@/lib/validations";
import HelpTrigger from "@/components/HelpTrigger";

export const dynamic = "force-dynamic";

export default async function Home() {
  const [paradeNightSetting, ranksSetting] = await Promise.all([
    getSystemSetting("parade_night"),
    getSystemSetting("ranks_list"),
  ]);

  const paradeNight = paradeNightSetting || "Wednesday";
  const ranks = parseRanksList(ranksSetting);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Header Banner */}
      <div className="pb-6 border-b border-zinc-200 dark:border-zinc-800 mb-8 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
            <Calendar className="h-6 w-6 text-blue-600" />
            Apply for Leave
          </h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Submit new leave applications.
          </p>
        </div>
        <HelpTrigger helpKey="page_apply_leave" tooltipText="Apply for Leave Page Guide" />
      </div>

      {/* Primary Application Form */}
      <div>
        <LeaveRequestForm defaultOpen={true} paradeNight={paradeNight} ranks={ranks} />
      </div>
    </div>
  );
}
