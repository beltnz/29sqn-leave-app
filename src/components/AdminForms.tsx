"use client";

import { useState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  createMember,
  updateMember,
  deleteMember,
  updateMemberPassword,
  createSecurityIp,
  deleteSecurityIp,
  updateSystemSetting,
  uploadBackgroundImage,
  removeBackgroundImage,
  createTermYear,
  updateTermYear,
  deleteTermYear,
  fetchNZMagicTermDates,
  toggleMemberStatus,
  sendTestEmail,
  getLeaveNotificationTemplate,
  updateLeaveNotificationTemplate,
} from "@/app/actions";
import { DEFAULT_RANKS, parseRanksList } from "@/lib/validations";
import {
  UserPlus,
  Sliders,
  Trash2,
  Loader2,
  Plus,
  ShieldAlert,
  Globe,
  KeyRound,
  CheckCircle2,
  AlertTriangle,
  Pencil,
  Eye,
  EyeOff,
  Mail,
  Send,
  Upload,
  ImageIcon,
  Calendar,
  X,
  Wand2,
  Sparkles,
  RotateCcw,
} from "lucide-react";
import ConfirmDeleteModal from "@/components/ConfirmDeleteModal";
import Tooltip from "@/components/Tooltip";



export function AddMemberForm({ ranks = DEFAULT_RANKS }: { ranks?: string[] }) {
  const ranksList = ranks && ranks.length > 0 ? ranks : DEFAULT_RANKS;
  const [isOpen, setIsOpen] = useState(false);
  const [rank, setRank] = useState<string>(ranksList[0] || "FLTLT");
  const [surname, setSurname] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("admin");
  const [role, setRole] = useState<string>("Adjutant");
  const [isPending, startTransition] = useTransition();
  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!surname.trim() || !email.trim()) return;

    setMsg(null);
    startTransition(async () => {
      const res = await createMember({
        rank,
        surname: surname.trim(),
        email: email.trim(),
        password,
        isStaff: role === "Staff",
        isAdjutant: role === "Adjutant" || role === "Admin",
        isAdmin: role === "Admin",
      });

      if (res.success) {
        setMsg({ type: "success", text: `${role} added successfully!` });
        setSurname("");
        setEmail("");
        setPassword("admin");
        setRole("Adjutant");
        setTimeout(() => setMsg(null), 3000);
      } else {
        setMsg({ type: "error", text: res.error || "Failed to add member." });
      }
    });
  };

  return (
    <div>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-blue-500 transition-colors cursor-pointer"
      >
        <UserPlus className="h-3.5 w-3.5" />
        {isOpen ? "Cancel" : "Add Personnel"}
      </button>

      {isOpen && (
        <form
          onSubmit={handleSubmit}
          className="mt-4 rounded-lg border border-zinc-200 bg-zinc-50/50 p-4 dark:border-zinc-800 dark:bg-zinc-800/40 space-y-3"
        >
          {msg && (
            <div
              className={`rounded-lg p-2.5 text-xs font-medium ${
                msg.type === "success"
                  ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200"
                  : "bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300 border border-rose-200"
              }`}
            >
              {msg.text}
            </div>
          )}

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
            <div>
              <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                Rank &amp; Surname
              </label>
              <div className="flex gap-1.5">
                <select
                  value={rank}
                  onChange={(e) => setRank(e.target.value)}
                  className="w-24 rounded-lg border border-zinc-300 bg-white px-2 py-1.5 text-xs font-semibold text-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
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
                  placeholder="Surname"
                  value={surname}
                  onChange={(e) => setSurname(e.target.value)}
                  className="flex-1 rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-xs text-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                Email Address
              </label>
              <input
                type="email"
                required
                placeholder="e.g. staff@cadetforces.org.nz"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-xs text-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                Password
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-xs text-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                System Role
              </label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
              >
                <option value="Staff">Staff</option>
                <option value="Adjutant">Adjutant</option>
                <option value="Admin">Admin</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={isPending}
              className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-blue-500 disabled:opacity-50 cursor-pointer"
            >
              {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
              Save Account
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

export function SetAdjutantPasswordButton({
  memberId,
  memberName,
}: {
  memberId: number;
  memberName: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [password, setPassword] = useState("admin");
  const [isPending, startTransition] = useTransition();
  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) return;

    setMsg(null);
    startTransition(async () => {
      const res = await updateMemberPassword(memberId, password.trim());
      if (res.success) {
        setMsg({ type: "success", text: res.message || "Password set successfully!" });
        setTimeout(() => {
          setMsg(null);
          setIsOpen(false);
        }, 2000);
      } else {
        setMsg({ type: "error", text: res.error || "Failed to set password." });
      }
    });
  };

  return (
    <div className="relative inline-block">
      <Tooltip content={`Set password for ${memberName}`}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="p-1.5 text-zinc-400 hover:text-purple-600 dark:hover:text-purple-400 transition-colors cursor-pointer"
        >
          <KeyRound className="h-4 w-4" />
        </button>
      </Tooltip>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="absolute inset-0" onClick={() => setIsOpen(false)} />
          <div className="relative w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-6 shadow-2xl dark:border-zinc-800 dark:bg-zinc-900 space-y-4 text-left">
            <div className="flex items-center justify-between border-b border-zinc-150 dark:border-zinc-800 pb-3">
              <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
                <KeyRound className="h-4 w-4 text-purple-600" />
                Set Password: {memberName}
              </h3>
              <Tooltip content="Close">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 text-lg cursor-pointer flex items-center justify-center h-6 w-6"
                >
                  ✕
                </button>
              </Tooltip>
            </div>

            {msg && (
              <div
                className={`rounded-lg p-2.5 text-xs font-medium ${
                  msg.type === "success"
                    ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200"
                    : "bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200"
                }`}
              >
                {msg.text}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                  New Password
                </label>
                <input
                  type="text"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="e.g. SecretPass123"
                  className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-xs text-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t border-zinc-100 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="rounded-lg border border-zinc-200 px-4 py-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-purple-600 px-4 py-2 text-xs font-semibold text-white hover:bg-purple-500 disabled:opacity-50 transition-colors cursor-pointer shadow-xs"
                >
                  {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Save Password"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export function SendTestEmailButton({
  memberId,
  memberName,
  memberEmail,
}: {
  memberId: number;
  memberName: string;
  memberEmail: string;
}) {
  const [isPending, startTransition] = useTransition();
  const [statusMsg, setStatusMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const handleSend = () => {
    setStatusMsg(null);
    startTransition(async () => {
      const res = await sendTestEmail(memberId);
      if (res.success) {
        setStatusMsg({ type: "success", text: res.message || `Test email sent to ${memberEmail}` });
        setTimeout(() => setStatusMsg(null), 4000);
      } else {
        setStatusMsg({ type: "error", text: res.error || "Failed to send email." });
        setTimeout(() => setStatusMsg(null), 4000);
      }
    });
  };

  return (
    <div className="relative inline-block">
      <Tooltip content={`Send test email to ${memberEmail}`}>
        <button
          onClick={handleSend}
          disabled={isPending}
          className="p-1.5 text-zinc-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors disabled:opacity-50 cursor-pointer flex items-center justify-center"
        >
          {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
        </button>
      </Tooltip>

      {statusMsg && (
        <div className="fixed bottom-4 right-4 z-50 animate-in fade-in slide-in-from-bottom-5 duration-200">
          <div
            className={`flex items-center gap-2 rounded-xl p-3.5 text-xs font-semibold shadow-2xl border ${
              statusMsg.type === "success"
                ? "bg-emerald-900 text-emerald-100 border-emerald-700"
                : "bg-rose-900 text-rose-100 border-rose-700"
            }`}
          >
            <Mail className="h-4 w-4 text-emerald-400 shrink-0" />
            <span>{statusMsg.text}</span>
          </div>
        </div>
      )}
    </div>
  );
}

export function EditMemberButton({
  member,
  isOnlyAdmin,
  ranks = DEFAULT_RANKS,
}: {
  member: any;
  isOnlyAdmin: boolean;
  ranks?: string[];
}) {
  const ranksList = ranks && ranks.length > 0 ? ranks : DEFAULT_RANKS;
  const [isOpen, setIsOpen] = useState(false);
  const [rank, setRank] = useState<string>(member.rank || "FLTLT");
  const [surname, setSurname] = useState(member.surname || "");
  const [email, setEmail] = useState(member.email || "");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<string>(
    member.isAdmin ? "Admin" : member.isAdjutant ? "Adjutant" : "Staff"
  );
  const [isPending, startTransition] = useTransition();
  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!surname.trim() || !email.trim()) return;

    setMsg(null);
    startTransition(async () => {
      const res = await updateMember({
        id: member.id,
        rank,
        surname: surname.trim(),
        email: email.trim(),
        password: password.trim() || undefined,
        isStaff: role === "Staff",
        isAdjutant: role === "Adjutant" || role === "Admin",
        isAdmin: role === "Admin",
      });

      if (res.success) {
        setMsg({ type: "success", text: "Personnel updated successfully!" });
        setTimeout(() => {
          setMsg(null);
          setIsOpen(false);
        }, 1500);
      } else {
        setMsg({ type: "error", text: res.error || "Failed to update member." });
      }
    });
  };

  return (
    <div className="relative inline-block">
      <Tooltip content={`Edit ${member.rank} ${member.surname}`}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="p-1.5 text-zinc-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors cursor-pointer"
        >
          <Pencil className="h-4 w-4" />
        </button>
      </Tooltip>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="absolute inset-0" onClick={() => setIsOpen(false)} />
          <div className="relative w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-6 shadow-2xl dark:border-zinc-800 dark:bg-zinc-900 space-y-4 text-left">
            <div className="flex items-center justify-between border-b border-zinc-150 dark:border-zinc-800 pb-3">
              <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
                <Pencil className="h-4 w-4 text-blue-600" />
                Edit Personnel #{member.id}
              </h3>
              <Tooltip content="Close">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 text-lg cursor-pointer flex items-center justify-center h-6 w-6"
                >
                  ✕
                </button>
              </Tooltip>
            </div>

            {msg && (
              <div
                className={`rounded-lg p-2.5 text-xs font-medium ${
                  msg.type === "success"
                    ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200"
                    : "bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200"
                }`}
              >
                {msg.text}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                  Rank & Surname
                </label>
                <div className="flex gap-2">
                  <select
                    value={rank}
                    onChange={(e) => setRank(e.target.value)}
                    className="w-28 rounded-lg border border-zinc-300 bg-white px-2.5 py-1 text-xs text-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                    value={surname}
                    onChange={(e) => setSurname(e.target.value)}
                    className="flex-1 rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-xs text-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                  Email Address
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-xs text-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                  Password (leave blank to keep unchanged)
                </label>
                <input
                  type="password"
                  value={password}
                  placeholder="New password (optional)"
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-xs text-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                  System Role
                </label>
                <select
                  value={role}
                  disabled={isOnlyAdmin}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <option value="Staff">Staff</option>
                  <option value="Adjutant">Adjutant</option>
                  <option value="Admin">Admin</option>
                </select>
                {isOnlyAdmin && (
                  <p className="mt-1 text-[11px] text-amber-600 dark:text-amber-400">
                    Cannot change role of only remaining Admin. Promote another Admin first.
                  </p>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-zinc-100 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="rounded-lg border border-zinc-200 px-4 py-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-500 disabled:opacity-50 transition-colors cursor-pointer shadow-xs"
                >
                  {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export function DeleteMemberButton({
  memberId,
  isTargetAdmin,
  disabled = false,
  disabledReason,
}: {
  memberId: number;
  isTargetAdmin?: boolean;
  disabled?: boolean;
  disabledReason?: string;
}) {
  const [showModal, setShowModal] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [errorText, setErrorText] = useState("");

  const handleConfirmDelete = () => {
    if (disabled) return;
    setErrorText("");
    startTransition(async () => {
      const res = await deleteMember(memberId);
      if (!res.success) {
        setErrorText(res.error || "Cannot delete account.");
      }
      setShowModal(false);
    });
  };

  const tooltipText = disabled && disabledReason ? disabledReason : (isTargetAdmin ? "Delete Admin Account" : "Delete Account");

  return (
    <div className="inline-flex flex-col items-end">
      {errorText && (
        <span className="text-[11px] text-rose-600 font-medium bg-rose-50 p-1.5 rounded border border-rose-200 mb-1 max-w-xs text-right">
          {errorText}
        </span>
      )}
      <Tooltip content={tooltipText}>
        <button
          onClick={() => !disabled && setShowModal(true)}
          disabled={isPending || disabled}
          className={`p-1.5 transition-colors text-xs flex items-center gap-1 ${
            disabled
              ? "text-zinc-300 dark:text-zinc-600 opacity-40 cursor-not-allowed"
              : "text-zinc-400 hover:text-rose-600 dark:hover:text-rose-400 disabled:opacity-50 cursor-pointer"
          }`}
        >
          {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
        </button>
      </Tooltip>

      {!disabled && (
        <ConfirmDeleteModal
          isOpen={showModal}
          title="Delete?"
          message="Are you sure you want to delete this pre-approved account? This action cannot be undone."
          isPending={isPending}
          onConfirm={handleConfirmDelete}
          onCancel={() => setShowModal(false)}
        />
      )}
    </div>
  );
}

export function AddSecurityIpForm() {
  const [isOpen, setIsOpen] = useState(false);
  const [ip, setIp] = useState("");
  const [type, setType] = useState<"WHITELIST" | "BLACKLIST">("WHITELIST");
  const [reason, setReason] = useState("");
  const [expiresDays, setExpiresDays] = useState(30);
  const [isPending, startTransition] = useTransition();
  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ip.trim()) return;

    setMsg(null);
    startTransition(async () => {
      const res = await createSecurityIp({
        ip: ip.trim(),
        type,
        reason: reason.trim() || undefined,
        expiresDays,
      });

      if (res.success) {
        setMsg({ type: "success", text: "IP Rule configured successfully!" });
        setIp("");
        setReason("");
        setTimeout(() => setMsg(null), 3000);
      } else {
        setMsg({ type: "error", text: res.error || "Failed to configure IP rule." });
      }
    });
  };

  return (
    <div>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-emerald-500 transition-colors cursor-pointer"
      >
        <Globe className="h-3.5 w-3.5" />
        {isOpen ? "Cancel" : "Add IP Rule"}
      </button>

      {isOpen && (
        <form
          onSubmit={handleSubmit}
          className="mt-4 rounded-lg border border-zinc-200 bg-zinc-50/50 p-4 dark:border-zinc-800 dark:bg-zinc-800/40 space-y-3"
        >
          {msg && (
            <div
              className={`rounded-lg p-2.5 text-xs font-medium ${
                msg.type === "success"
                  ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300"
                  : "bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300"
              }`}
            >
              {msg.text}
            </div>
          )}

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div>
              <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                IP Address
              </label>
              <input
                type="text"
                required
                placeholder="e.g. 192.168.1.100"
                value={ip}
                onChange={(e) => setIp(e.target.value)}
                className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-xs text-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                Rule Type
              </label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as "WHITELIST" | "BLACKLIST")}
                className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
              >
                <option value="WHITELIST">WHITELIST (Allowed)</option>
                <option value="BLACKLIST">BLACKLIST (Blocked - 30 Day Auto-remove)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                Reason / Note
              </label>
              <input
                type="text"
                placeholder="e.g. Manual admin whitelist or spam IP"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-xs text-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
              />
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={isPending}
              className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-emerald-500 disabled:opacity-50 cursor-pointer"
            >
              {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
              Save IP Rule
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

export function DeleteIpRuleButton({ ruleId }: { ruleId: number }) {
  const [showModal, setShowModal] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleConfirmDelete = () => {
    startTransition(async () => {
      await deleteSecurityIp(ruleId);
      setShowModal(false);
    });
  };

  return (
    <>
      <Tooltip content="Delete IP Rule">
        <button
          onClick={() => setShowModal(true)}
          disabled={isPending}
          className="p-1.5 text-zinc-400 hover:text-rose-600 dark:hover:text-rose-400 transition-colors disabled:opacity-50 cursor-pointer"
        >
          {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
        </button>
      </Tooltip>

      <ConfirmDeleteModal
        isOpen={showModal}
        title="Delete?"
        message="Are you sure you want to delete this IP security rule?"
        isPending={isPending}
        onConfirm={handleConfirmDelete}
        onCancel={() => setShowModal(false)}
      />
    </>
  );
}





export function ParadeNightSettingDropdown({ initialValue }: { initialValue: string }) {
  const [day, setDay] = useState(initialValue || "Wednesday");
  const [isPending, startTransition] = useTransition();
  const [success, setSuccess] = useState(false);

  const handleChange = (newDay: string) => {
    setDay(newDay);
    setSuccess(false);
    startTransition(async () => {
      const res = await updateSystemSetting("parade_night", newDay);
      if (res.success) {
        setSuccess(true);
        setTimeout(() => setSuccess(false), 2000);
      }
    });
  };

  const daysOfWeek = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday"
  ];

  return (
    <div className="flex items-center gap-3">
      {success && (
        <span className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold animate-fade-in flex items-center gap-1">
          <CheckCircle2 className="h-3.5 w-3.5" /> Saved!
        </span>
      )}
      {isPending && (
        <span className="text-xs text-zinc-500 flex items-center gap-1">
          <Loader2 className="h-3.5 w-3.5 animate-spin" /> Saving...
        </span>
      )}
      <select
        value={day}
        onChange={(e) => handleChange(e.target.value)}
        disabled={isPending}
        className="w-40 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500 font-semibold cursor-pointer"
      >
        {daysOfWeek.map((d) => (
          <option key={d} value={d}>
            {d}
          </option>
        ))}
      </select>
    </div>
  );
}

export function MemberStatusToggle({
  memberId,
  field,
  initialValue,
  disabled = false,
  disabledReason,
}: {
  memberId: number;
  field: "isActive" | "emailEnabled";
  initialValue: boolean;
  disabled?: boolean;
  disabledReason?: string;
}) {
  const [checked, setChecked] = useState(initialValue);
  const [isPending, startTransition] = useTransition();

  const handleToggle = () => {
    if (disabled || isPending) return;
    const newValue = !checked;
    setChecked(newValue);
    startTransition(async () => {
      const res = await toggleMemberStatus(memberId, field, newValue);
      if (!res.success) {
        setChecked(checked);
        alert(res.error || "Failed to update status");
      }
    });
  };

  const toggleBtn = (
    <button
      onClick={handleToggle}
      disabled={isPending || disabled}
      type="button"
      className={`relative inline-flex h-5 w-9 shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
        disabled
          ? "opacity-40 cursor-not-allowed bg-zinc-300 dark:bg-zinc-700"
          : "cursor-pointer disabled:opacity-50 " + (checked ? "bg-blue-600" : "bg-zinc-200 dark:bg-zinc-700")
      }`}
    >
      <span
        className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
          checked ? "translate-x-4" : "translate-x-0"
        }`}
      />
    </button>
  );

  if (disabled && disabledReason) {
    return <Tooltip content={disabledReason}>{toggleBtn}</Tooltip>;
  }

  return toggleBtn;
}

export function InactivityTimeoutSettingInput({ initialValue }: { initialValue: number }) {
  const router = useRouter();
  const [val, setVal] = useState<string>(initialValue.toString());
  const [isPending, startTransition] = useTransition();
  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const handleSave = (targetVal: string) => {
    const num = parseInt(targetVal, 10);
    if (isNaN(num) || num < 10) {
      setMsg({ type: "error", text: "Min time-out is 10s" });
      return;
    }

    setVal(targetVal);
    setMsg(null);
    startTransition(async () => {
      const res = await updateSystemSetting("admin_inactivity_timeout", targetVal);
      if (res.success) {
        setMsg({ type: "success", text: "Time-out updated!" });
        router.refresh();
        setTimeout(() => setMsg(null), 2500);
      } else {
        setMsg({ type: "error", text: res.error || "Failed to update" });
      }
    });
  };

  return (
    <div className="flex flex-col gap-1.5 items-end">
      <div className="flex items-center gap-2">
        <div className="relative">
          <input
            type="number"
            min={10}
            max={86400}
            step={30}
            value={val}
            onChange={(e) => setVal(e.target.value)}
            className="w-28 rounded-lg border border-zinc-300 bg-white pl-3 pr-9 py-1.5 text-xs text-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono font-semibold"
          />
          <span className="absolute right-2.5 top-1.5 text-xs text-zinc-400 pointer-events-none select-none">
            sec
          </span>
        </div>
        <button
          onClick={() => handleSave(val)}
          disabled={isPending}
          type="button"
          className="inline-flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-blue-500 disabled:opacity-50 transition-colors cursor-pointer"
        >
          {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Save"}
        </button>
      </div>
      {msg && (
        <span
          className={`text-[11px] font-medium ${
            msg.type === "success"
              ? "text-emerald-600 dark:text-emerald-400"
              : "text-rose-600 dark:text-rose-400"
          }`}
        >
          {msg.text}
        </span>
      )}
    </div>
  );
}

export function UnitNameSettingInput({ initialValue }: { initialValue: string }) {
  const router = useRouter();
  const [val, setVal] = useState<string>(initialValue || "29 Squadron");
  const [isPending, startTransition] = useTransition();
  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const handleSave = () => {
    if (!val.trim()) {
      setMsg({ type: "error", text: "Unit name cannot be empty" });
      return;
    }

    setMsg(null);
    startTransition(async () => {
      const res = await updateSystemSetting("unit_name", val.trim());
      if (res.success) {
        setMsg({ type: "success", text: "Unit name updated!" });
        router.refresh();
        setTimeout(() => setMsg(null), 2500);
      } else {
        setMsg({ type: "error", text: res.error || "Failed to update" });
      }
    });
  };

  return (
    <div className="flex flex-col gap-1.5 items-end">
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={val}
          onChange={(e) => setVal(e.target.value)}
          placeholder="e.g. 29 Squadron"
          className="w-48 rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          onClick={handleSave}
          disabled={isPending}
          type="button"
          className="inline-flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-blue-500 disabled:opacity-50 transition-colors cursor-pointer"
        >
          {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Save"}
        </button>
      </div>
      {msg && (
        <span
          className={`text-[11px] font-medium ${
            msg.type === "success"
              ? "text-emerald-600 dark:text-emerald-400"
              : "text-rose-600 dark:text-rose-400"
          }`}
        >
          {msg.text}
        </span>
      )}
    </div>
  );
}

const PRESET_RANKS = {
  sea: "RCRT, NE, OCDT, ACDT, LCDT, POCDT, CPOCDT, WOCDT, OFFCDT, ENS, SLT, LT, LTCDR, MR, MS, MRS, MISS, MASTER, OTHER",
  land: "RCRT, CDTUT, CDT, CDTLCPL, CDTCPL, CDTSGT, CDTSSGT, CDTWO2, OFFCDT, 2LT, LT, CAPT, MAJ, MR, MS, MRS, MISS, MASTER, OTHER",
  air: "RCRT, CDTUT, CDT, LACDT, CDTCPL, CDTSGT, CDTFSGT, CDTWO, OFFCDT, PLTOFF, FGOFF, FLTLT, SQNLDR, MR, MS, MRS, MISS, MASTER, OTHER",
};

export function RanksListSettingInput({ initialValue }: { initialValue: string }) {
  const router = useRouter();
  const [val, setVal] = useState<string>(
    initialValue || PRESET_RANKS.air
  );
  const [isPending, startTransition] = useTransition();
  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const handleSave = () => {
    if (!val.trim()) {
      setMsg({ type: "error", text: "Rank list cannot be empty" });
      return;
    }

    setMsg(null);
    startTransition(async () => {
      const res = await updateSystemSetting("ranks_list", val.trim());
      if (res.success) {
        setMsg({ type: "success", text: "Rank options updated!" });
        router.refresh();
        setTimeout(() => setMsg(null), 2500);
      } else {
        setMsg({ type: "error", text: res.error || "Failed to update" });
      }
    });
  };

  return (
    <div className="space-y-2.5 w-full">
      <div className="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-start w-full">
        <textarea
          rows={3}
          value={val}
          onChange={(e) => setVal(e.target.value)}
          placeholder="e.g. RCRT, CDT, LACDT, CDTSGT, FLTLT"
          className="flex-1 w-full rounded-lg border border-zinc-300 bg-white p-2.5 text-xs font-mono font-semibold text-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500 leading-relaxed resize-y"
        />
        <button
          onClick={handleSave}
          disabled={isPending}
          type="button"
          className="inline-flex items-center justify-center gap-1 rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-blue-500 disabled:opacity-50 transition-colors cursor-pointer shrink-0 sm:self-start"
        >
          {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Save Options"}
        </button>
      </div>

      {/* Quick Population Presets */}
      <div className="flex flex-wrap items-center gap-2 pt-0.5">
        <span className="text-[11px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
          Quick Presets:
        </span>
        <button
          type="button"
          onClick={() => setVal(PRESET_RANKS.sea)}
          className="px-3 py-1 text-xs font-bold rounded-lg border border-zinc-200 dark:border-zinc-700/80 bg-zinc-100/80 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 hover:bg-blue-500 hover:text-white dark:hover:bg-blue-600 dark:hover:text-white transition-all cursor-pointer shadow-2xs active:scale-95"
          title="Default Sea Cadets rank options"
        >
          sea
        </button>
        <button
          type="button"
          onClick={() => setVal(PRESET_RANKS.land)}
          className="px-3 py-1 text-xs font-bold rounded-lg border border-zinc-200 dark:border-zinc-700/80 bg-zinc-100/80 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 hover:bg-emerald-500 hover:text-white dark:hover:bg-emerald-600 dark:hover:text-white transition-all cursor-pointer shadow-2xs active:scale-95"
          title="Default Land / Army Cadets rank options"
        >
          land
        </button>
        <button
          type="button"
          onClick={() => setVal(PRESET_RANKS.air)}
          className="px-3 py-1 text-xs font-bold rounded-lg border border-zinc-200 dark:border-zinc-700/80 bg-zinc-100/80 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 hover:bg-purple-500 hover:text-white dark:hover:bg-purple-600 dark:hover:text-white transition-all cursor-pointer shadow-2xs active:scale-95"
          title="Default Air Cadets rank options"
        >
          air
        </button>
      </div>

      {msg && (
        <span
          className={`block text-[11px] font-medium ${
            msg.type === "success"
              ? "text-emerald-600 dark:text-emerald-400"
              : "text-rose-600 dark:text-rose-400"
          }`}
        >
          {msg.text}
        </span>
      )}
    </div>
  );
}

export function BackgroundImageSettingInput({ initialValue }: { initialValue?: string }) {
  const [bgUrl, setBgUrl] = useState<string>(initialValue || "");
  const [isPending, startTransition] = useTransition();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setErrorMsg(null);
    setSuccessMsg(null);

    const formData = new FormData();
    formData.append("imageFile", file);

    startTransition(async () => {
      try {
        const result = await uploadBackgroundImage(formData);
        if (result.success && result.dataUrl) {
          setBgUrl(result.dataUrl);
          setSuccessMsg("Background image uploaded and applied successfully.");
          if (e.target) e.target.value = "";
        } else {
          setErrorMsg(result.error || "Failed to upload background image.");
        }
      } catch (err: any) {
        console.error("Failed to upload background image:", err);
        setErrorMsg("Failed to upload background image. Please ensure the file size is under 10MB.");
      }
    });
  };

  const handleRemove = () => {
    setErrorMsg(null);
    setSuccessMsg(null);

    startTransition(async () => {
      const result = await removeBackgroundImage();
      if (result.success) {
        setBgUrl("");
        setSuccessMsg("Background image removed.");
      } else {
        setErrorMsg(result.error || "Failed to remove background image.");
      }
    });
  };

  return (
    <div className="space-y-2.5 w-full">
      {bgUrl ? (
        <div className="flex flex-wrap items-center justify-between gap-3 p-2.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50/80 dark:bg-zinc-900/60">
          <div className="flex items-center gap-3 min-w-0">
            {/* Small thumbnail preview box */}
            <div className="h-10 w-14 rounded-md border border-zinc-300 dark:border-zinc-700 overflow-hidden bg-zinc-100 dark:bg-zinc-800 shrink-0 shadow-2xs relative">
              <img
                src={bgUrl}
                alt="Custom background thumbnail preview"
                className="h-full w-full object-cover object-top-left"
              />
            </div>
            <div className="min-w-0">
              <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 block truncate">
                Custom Background Active
              </span>
              <span className="text-[10px] text-zinc-500 block truncate">
                Anchored top-left &bull; Tiled
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <label
              htmlFor="bg-image-upload-input"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-zinc-700 dark:text-zinc-200 bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-700 cursor-pointer shadow-2xs transition-colors"
            >
              {isPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin text-blue-600 dark:text-blue-400" />
              ) : (
                <Upload className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
              )}
              <span>{isPending ? "Uploading..." : "Change Image"}</span>
            </label>
            <button
              type="button"
              disabled={isPending}
              onClick={handleRemove}
              className="px-2.5 py-1.5 text-xs font-semibold text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-900 bg-rose-50 dark:bg-rose-950/40 rounded-lg hover:bg-rose-100 dark:hover:bg-rose-900/60 transition-colors cursor-pointer disabled:opacity-50"
            >
              Remove
            </button>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-3">
          <label
            htmlFor="bg-image-upload-input"
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-zinc-800 dark:text-zinc-200 bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-700 cursor-pointer shadow-2xs transition-colors"
          >
            {isPending ? (
              <Loader2 className="h-4 w-4 animate-spin text-blue-600 dark:text-blue-400" />
            ) : (
              <Upload className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            )}
            <span>{isPending ? "Uploading..." : "Upload Background Image"}</span>
          </label>
        </div>
      )}

      <input
        id="bg-image-upload-input"
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        disabled={isPending}
        className="hidden"
      />

      {errorMsg && <p className="text-xs font-semibold text-rose-600 dark:text-rose-400">{errorMsg}</p>}
      {successMsg && <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">{successMsg}</p>}
    </div>
  );
}

export function TermYearModal({
  isOpen,
  onClose,
  initialData,
}: {
  isOpen: boolean;
  onClose: () => void;
  initialData?: any;
}) {
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState<number>(initialData?.year || currentYear);
  const [t1Start, setT1Start] = useState<string>(initialData?.t1Start || `${currentYear}-01-26`);
  const [t1End, setT1End] = useState<string>(initialData?.t1End || `${currentYear}-04-11`);
  const [t2Start, setT2Start] = useState<string>(initialData?.t2Start || `${currentYear}-04-27`);
  const [t2End, setT2End] = useState<string>(initialData?.t2End || `${currentYear}-07-04`);
  const [t3Start, setT3Start] = useState<string>(initialData?.t3Start || `${currentYear}-07-20`);
  const [t3End, setT3End] = useState<string>(initialData?.t3End || `${currentYear}-09-25`);
  const [t4Start, setT4Start] = useState<string>(initialData?.t4Start || `${currentYear}-10-12`);
  const [t4End, setT4End] = useState<string>(initialData?.t4End || `${currentYear}-12-18`);

  const [isPending, startTransition] = useTransition();
  const [isMagicPending, startMagicTransition] = useTransition();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleMagicFill = () => {
    setErrorMsg(null);
    setSuccessMsg(null);
    startMagicTransition(async () => {
      const res = await fetchNZMagicTermDates(Number(year));
      if (res.success && res.dates) {
        setT1Start(res.dates.t1Start);
        setT1End(res.dates.t1End);
        setT2Start(res.dates.t2Start);
        setT2End(res.dates.t2End);
        setT3Start(res.dates.t3Start);
        setT3End(res.dates.t3End);
        setT4Start(res.dates.t4Start);
        setT4End(res.dates.t4End);
        setSuccessMsg(`Magic! Term dates for ${year} auto-filled based on the first & last ${res.paradeNight}s of each term.`);
      } else {
        setErrorMsg(res.error || "Failed to auto-retrieve term dates.");
      }
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    const payload = {
      year: Number(year),
      t1Start,
      t1End,
      t2Start,
      t2End,
      t3Start,
      t3End,
      t4Start,
      t4End,
    };

    startTransition(async () => {
      const res = initialData
        ? await updateTermYear(initialData.id, payload)
        : await createTermYear(payload);

      if (res.success) {
        onClose();
      } else {
        setErrorMsg(res.error || "Failed to save term dates.");
      }
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="w-full max-w-xl rounded-2xl border border-zinc-200 bg-white p-6 shadow-2xl dark:border-zinc-800 dark:bg-zinc-900 my-8">
        <div className="flex items-center justify-between border-b border-zinc-100 pb-4 dark:border-zinc-800">
          <div>
            <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
              <Calendar className="h-5 w-5 text-blue-600" />
              {initialData ? `Edit Term Dates for ${initialData.year}` : "Add Term Dates for Year"}
            </h3>
            <p className="text-xs text-zinc-500 mt-0.5">
              Select start and end dates for Terms 1, 2, 3, and 4.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-300 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div className="flex items-end justify-between gap-3">
            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                Year
              </label>
              <input
                type="number"
                min={2020}
                max={2100}
                required
                value={year}
                onChange={(e) => setYear(Number(e.target.value))}
                disabled={!!initialData || isPending || isMagicPending}
                className="w-32 rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-xs font-bold text-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <Tooltip content="Auto-fill NZ Ministry of Education Secondary School term dates aligned to unit parade night">
              <button
                type="button"
                onClick={handleMagicFill}
                disabled={isMagicPending || isPending}
                className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-amber-500 via-purple-600 to-indigo-600 px-3.5 py-1.5 text-xs font-bold text-white hover:opacity-90 transition-all cursor-pointer shadow-xs border border-white/20 disabled:opacity-50"
              >
                {isMagicPending ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Wand2 className="h-3.5 w-3.5" />
                )}
                <span>Magic</span>
              </button>
            </Tooltip>
          </div>

          {successMsg && (
            <div className="flex items-center gap-2 p-2.5 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 dark:bg-emerald-950/40 dark:border-emerald-900/60 dark:text-emerald-300 text-xs font-medium">
              <Sparkles className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
              <span>{successMsg}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Term 1 */}
            <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950/40 p-3 space-y-2">
              <span className="text-xs font-bold text-blue-600 dark:text-blue-400 block uppercase tracking-wider">
                Term 1
              </span>
              <div className="space-y-1.5">
                <div>
                  <label className="block text-[10px] font-semibold text-zinc-500">Start Date</label>
                  <input
                    type="date"
                    required
                    value={t1Start}
                    onChange={(e) => setT1Start(e.target.value)}
                    className="w-full rounded-md border border-zinc-300 bg-white px-2.5 py-1 text-xs font-mono font-semibold text-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-zinc-500">End Date</label>
                  <input
                    type="date"
                    required
                    value={t1End}
                    onChange={(e) => setT1End(e.target.value)}
                    className="w-full rounded-md border border-zinc-300 bg-white px-2.5 py-1 text-xs font-mono font-semibold text-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                  />
                </div>
              </div>
            </div>

            {/* Term 2 */}
            <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950/40 p-3 space-y-2">
              <span className="text-xs font-bold text-purple-600 dark:text-purple-400 block uppercase tracking-wider">
                Term 2
              </span>
              <div className="space-y-1.5">
                <div>
                  <label className="block text-[10px] font-semibold text-zinc-500">Start Date</label>
                  <input
                    type="date"
                    required
                    value={t2Start}
                    onChange={(e) => setT2Start(e.target.value)}
                    className="w-full rounded-md border border-zinc-300 bg-white px-2.5 py-1 text-xs font-mono font-semibold text-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-zinc-500">End Date</label>
                  <input
                    type="date"
                    required
                    value={t2End}
                    onChange={(e) => setT2End(e.target.value)}
                    className="w-full rounded-md border border-zinc-300 bg-white px-2.5 py-1 text-xs font-mono font-semibold text-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                  />
                </div>
              </div>
            </div>

            {/* Term 3 */}
            <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950/40 p-3 space-y-2">
              <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 block uppercase tracking-wider">
                Term 3
              </span>
              <div className="space-y-1.5">
                <div>
                  <label className="block text-[10px] font-semibold text-zinc-500">Start Date</label>
                  <input
                    type="date"
                    required
                    value={t3Start}
                    onChange={(e) => setT3Start(e.target.value)}
                    className="w-full rounded-md border border-zinc-300 bg-white px-2.5 py-1 text-xs font-mono font-semibold text-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-zinc-500">End Date</label>
                  <input
                    type="date"
                    required
                    value={t3End}
                    onChange={(e) => setT3End(e.target.value)}
                    className="w-full rounded-md border border-zinc-300 bg-white px-2.5 py-1 text-xs font-mono font-semibold text-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                  />
                </div>
              </div>
            </div>

            {/* Term 4 */}
            <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950/40 p-3 space-y-2">
              <span className="text-xs font-bold text-amber-600 dark:text-amber-400 block uppercase tracking-wider">
                Term 4
              </span>
              <div className="space-y-1.5">
                <div>
                  <label className="block text-[10px] font-semibold text-zinc-500">Start Date</label>
                  <input
                    type="date"
                    required
                    value={t4Start}
                    onChange={(e) => setT4Start(e.target.value)}
                    className="w-full rounded-md border border-zinc-300 bg-white px-2.5 py-1 text-xs font-mono font-semibold text-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-zinc-500">End Date</label>
                  <input
                    type="date"
                    required
                    value={t4End}
                    onChange={(e) => setT4End(e.target.value)}
                    className="w-full rounded-md border border-zinc-300 bg-white px-2.5 py-1 text-xs font-mono font-semibold text-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                  />
                </div>
              </div>
            </div>
          </div>

          {errorMsg && <p className="text-xs font-semibold text-rose-600">{errorMsg}</p>}

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-100 dark:border-zinc-800">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-zinc-300 px-4 py-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-500 disabled:opacity-50 transition-colors cursor-pointer shadow-xs"
            >
              {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Save Term Dates"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function AddTermYearButton() {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <>
      <Tooltip content="Add new term dates for year">
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-500 transition-colors cursor-pointer shadow-xs"
        >
          <Plus className="h-3.5 w-3.5" />
          Add Year
        </button>
      </Tooltip>
      <TermYearModal isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  );
}

export function EditTermYearButton({ termYear }: { termYear: any }) {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <>
      <Tooltip content="Edit term dates">
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="p-1 rounded-md text-zinc-500 hover:text-blue-600 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
        >
          <Pencil className="h-3.5 w-3.5" />
        </button>
      </Tooltip>
      <TermYearModal isOpen={isOpen} onClose={() => setIsOpen(false)} initialData={termYear} />
    </>
  );
}

export function DeleteTermYearButton({ termYearId, year }: { termYearId: number; year: number }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleConfirm = () => {
    startTransition(async () => {
      await deleteTermYear(termYearId);
      setIsOpen(false);
    });
  };

  return (
    <>
      <Tooltip content="Delete term dates">
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="p-1 rounded-md text-zinc-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </Tooltip>
      <ConfirmDeleteModal
        isOpen={isOpen}
        title={`Delete Term Dates for ${year}`}
        message={`Are you sure you want to delete term dates for year ${year}?`}
        isPending={isPending}
        onConfirm={handleConfirm}
        onCancel={() => setIsOpen(false)}
      />
    </>
  );
}

export function LeaveStatusRangeSettingInput({
  initialPastWeeks = 2,
  initialFutureWeeks = 4,
}: {
  initialPastWeeks?: number;
  initialFutureWeeks?: number;
}) {
  const router = useRouter();
  const [pastWeeks, setPastWeeks] = useState<number>(initialPastWeeks);
  const [futureWeeks, setFutureWeeks] = useState<number>(initialFutureWeeks);
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    setPastWeeks(initialPastWeeks);
  }, [initialPastWeeks]);

  useEffect(() => {
    setFutureWeeks(initialFutureWeeks);
  }, [initialFutureWeeks]);

  const handleSave = () => {
    const p = Math.max(1, Math.min(26, Number(pastWeeks) || 2));
    const f = Math.max(1, Math.min(26, Number(futureWeeks) || 4));

    setErrorMsg(null);
    setSaved(false);

    startTransition(async () => {
      const res1 = await updateSystemSetting("leave_status_past_weeks", p.toString());
      const res2 = await updateSystemSetting("leave_status_future_weeks", f.toString());

      if (res1.success && res2.success) {
        setSaved(true);
        router.refresh();
        setTimeout(() => setSaved(false), 2500);
      } else {
        setErrorMsg("Failed to update leave status range settings.");
      }
    });
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <label className="text-xs font-semibold text-zinc-600 dark:text-zinc-400">Past:</label>
          <input
            type="number"
            min={1}
            max={26}
            value={pastWeeks}
            onChange={(e) => setPastWeeks(parseInt(e.target.value, 10) || 1)}
            onBlur={handleSave}
            className="w-16 rounded-lg border border-zinc-300 bg-white px-2.5 py-1 text-xs font-bold text-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
          />
          <span className="text-xs text-zinc-500">weeks before today</span>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-xs font-semibold text-zinc-600 dark:text-zinc-400">Future:</label>
          <input
            type="number"
            min={1}
            max={26}
            value={futureWeeks}
            onChange={(e) => setFutureWeeks(parseInt(e.target.value, 10) || 1)}
            onBlur={handleSave}
            className="w-16 rounded-lg border border-zinc-300 bg-white px-2.5 py-1 text-xs font-bold text-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
          />
          <span className="text-xs text-zinc-500">weeks after today</span>
        </div>

        <button
          type="button"
          onClick={handleSave}
          disabled={isPending}
          className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1 text-xs font-semibold text-white hover:bg-blue-500 disabled:opacity-50 transition-colors cursor-pointer shadow-2xs"
        >
          {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Save Range"}
        </button>
      </div>

      {saved && (
        <span className="inline-flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
          <CheckCircle2 className="h-3.5 w-3.5" />
          Leave status range saved.
        </span>
      )}
      {errorMsg && <p className="text-xs font-semibold text-rose-600">{errorMsg}</p>}
    </div>
  );
}

export function LeaveNotificationTemplateEditor({
  initialSubject,
  initialBody,
}: {
  initialSubject: string;
  initialBody: string;
}) {
  const router = useRouter();
  const DEFAULT_SUBJECT = `[{{unitName}}] Leave Notification — {{rank}} {{surname}} ({{startDate}} to {{endDate}})`;
  const DEFAULT_BODY = `============================================================
LEAVE NOTIFICATION — {{unitName}}
============================================================

A new leave notification has been submitted.

Details:
  Member:          {{rank}} {{surname}}
  From:            {{startDate}}
  To:              {{endDate}}
  Duration:        {{duration}} day(s)
  Parade nights:   {{paradenights}}
  Reason:          {{reason}}
  Logged at:       {{submittedAt}}

============================================================
This is an automated notification. Do not reply to this email.`;

  const [subject, setSubject] = useState(initialSubject || DEFAULT_SUBJECT);
  const [body, setBody] = useState(initialBody || DEFAULT_BODY);
  const [isPending, startTransition] = useTransition();
  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Sync if parent re-renders with fresh server data
  useEffect(() => { setSubject(initialSubject || DEFAULT_SUBJECT); }, [initialSubject]);
  useEffect(() => { setBody(initialBody || DEFAULT_BODY); }, [initialBody]);

  const handleSave = () => {
    setMsg(null);
    startTransition(async () => {
      const res = await updateLeaveNotificationTemplate(subject, body);
      if (res.success) {
        setMsg({ type: "success", text: "Template saved!" });
        router.refresh();
        setTimeout(() => setMsg(null), 3000);
      } else {
        setMsg({ type: "error", text: (res as any).error || "Failed to save template" });
      }
    });
  };

  const handleRestoreDefault = () => {
    setSubject(DEFAULT_SUBJECT);
    setBody(DEFAULT_BODY);
    setMsg({ type: "success", text: "Default template restored — click Save to apply." });
    setTimeout(() => setMsg(null), 4000);
  };

  const placeholders = [
    { token: "{{rank}}", desc: "Submitter's rank" },
    { token: "{{surname}}", desc: "Submitter's surname" },
    { token: "{{startDate}}", desc: "Leave start date" },
    { token: "{{endDate}}", desc: "Leave end date" },
    { token: "{{duration}}", desc: "Total calendar days of leave (inclusive)" },
    { token: "{{paradenights}}", desc: "Parade nights falling within a scheduled term during the leave period" },
    { token: "{{reason}}", desc: "Reason for leave" },
    { token: "{{submittedAt}}", desc: "Submission timestamp (NZ time)" },
    { token: "{{unitName}}", desc: "Unit name from system settings" },
  ];

  return (
    <div className="space-y-4">
      {/* Placeholder reference */}
      <div className="rounded-lg bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 p-3">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400 mb-2">Available placeholders</p>
        <div className="flex flex-wrap gap-2">
          {placeholders.map(({ token, desc }) => (
            <span
              key={token}
              title={desc}
              className="inline-flex items-center gap-1 rounded-md bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 px-2 py-0.5 font-mono text-[10px] text-blue-700 dark:text-blue-300 cursor-default select-all"
            >
              {token}
            </span>
          ))}
        </div>
      </div>

      {/* Subject */}
      <div className="space-y-1.5">
        <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
          Email Subject
        </label>
        <input
          type="text"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          maxLength={500}
          className="w-full rounded-lg border border-zinc-300 bg-white dark:border-zinc-700 dark:bg-zinc-800 px-3 py-2 text-xs text-zinc-900 dark:text-zinc-100 font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Email subject line…"
        />
        <p className="text-[10px] text-zinc-400 text-right">{subject.length}/500</p>
      </div>

      {/* Body */}
      <div className="space-y-1.5">
        <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
          Email Body
        </label>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          maxLength={10000}
          rows={14}
          className="w-full rounded-lg border border-zinc-300 bg-white dark:border-zinc-700 dark:bg-zinc-800 px-3 py-2 text-xs text-zinc-900 dark:text-zinc-100 font-mono leading-relaxed focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y"
          placeholder="Email body…"
        />
        <p className="text-[10px] text-zinc-400 text-right">{body.length}/10,000</p>
      </div>

      {/* Actions row */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <button
          type="button"
          onClick={handleRestoreDefault}
          disabled={isPending}
          className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-1.5 text-xs font-semibold text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-700 disabled:opacity-50 transition-colors cursor-pointer"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          Restore Default
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={isPending || !subject.trim() || !body.trim()}
          className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-blue-500 disabled:opacity-50 transition-colors cursor-pointer shadow-xs"
        >
          {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
          {isPending ? "Saving…" : "Save Template"}
        </button>
      </div>

      {/* Feedback message */}
      {msg && (
        <span
          className={`flex items-center gap-1.5 text-xs font-medium ${
            msg.type === "success" ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
          }`}
        >
          {msg.type === "success" ? (
            <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
          ) : (
            <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
          )}
          {msg.text}
        </span>
      )}
    </div>
  );
}
