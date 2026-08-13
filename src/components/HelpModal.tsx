"use client";

import React, { useState, useEffect, useTransition } from "react";
import { createPortal } from "react-dom";
import { HELP_REGISTRY } from "@/lib/helpContent";
import { getHelpArticle, saveHelpArticleVersion, getAdminSession } from "@/app/actions";
import {
  HelpCircle,
  X,
  Camera,
  CheckCircle2,
  AlertCircle,
  BookOpen,
  Sparkles,
  Info,
  Edit3,
  Save,
  RotateCcw,
  History,
  Check,
  Plus,
  Trash2,
  Loader2,
} from "lucide-react";

interface HelpModalProps {
  isOpen: boolean;
  helpKey: string;
  onClose: () => void;
}

export default function HelpModal({ isOpen, helpKey, onClose }: HelpModalProps) {
  const [isAdmin, setIsAdmin] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  // Article versions state
  const [versions, setVersions] = useState<any[]>([]);
  const [selectedVersionIdx, setSelectedVersionIdx] = useState(0);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Form edit state
  const [editTitle, setEditTitle] = useState("");
  const [editSubtitle, setEditSubtitle] = useState("");
  const [editBadge, setEditBadge] = useState<any>("System Guide");
  const [editPurpose, setEditPurpose] = useState("");
  const [editSections, setEditSections] = useState<any[]>([]);
  const [editBestPractices, setEditBestPractices] = useState<string[]>([]);

  // Load article and admin session on mount / open
  useEffect(() => {
    if (!isOpen) return;

    // Check admin session
    getAdminSession().then((res) => {
      if (res.authenticated) {
        setIsAdmin(true);
      } else {
        setIsAdmin(false);
      }
    });

    // Load help article data from server or registry fallback
    getHelpArticle(helpKey).then((data) => {
      if (data && data.versions && data.versions.length > 0) {
        setVersions(data.versions);
        setSelectedVersionIdx(0);
        populateEditForm(data.versions[0]);
      } else {
        const fallback = HELP_REGISTRY[helpKey] || {
          key: helpKey,
          title: "Documentation & Help",
          subtitle: "Information guide for this section.",
          badge: "System Guide",
          purpose: "Provides functional explanation and field input guidance for this module.",
          sections: [],
        };
        const initialVer = {
          versionId: "v1_init",
          savedAt: "Initial",
          savedBy: "System / Default",
          ...fallback,
        };
        setVersions([initialVer]);
        setSelectedVersionIdx(0);
        populateEditForm(initialVer);
      }
    });
  }, [isOpen, helpKey]);

  const populateEditForm = (ver: any) => {
    if (!ver) return;
    setEditTitle(ver.title || "");
    setEditSubtitle(ver.subtitle || "");
    setEditBadge(ver.badge || "System Guide");
    setEditPurpose(ver.purpose || "");
    setEditSections(ver.sections ? JSON.parse(JSON.stringify(ver.sections)) : []);
    setEditBestPractices(ver.bestPractices ? [...ver.bestPractices] : []);
  };

  if (!isOpen) return null;

  const currentVersion = versions[selectedVersionIdx] || versions[0] || {};

  // Handle Save New Version
  const handleSave = () => {
    startTransition(async () => {
      const result = await saveHelpArticleVersion(helpKey, {
        title: editTitle,
        subtitle: editSubtitle,
        badge: editBadge,
        purpose: editPurpose,
        sections: editSections,
        bestPractices: editBestPractices,
      });

      if (result.success && result.article) {
        setVersions(result.article.versions);
        setSelectedVersionIdx(0);
        setIsEditing(false);
        setSaveSuccessMsg("New version saved successfully! (Max 3 versions kept)");
        setTimeout(() => setSaveSuccessMsg(null), 4000);
      }
    });
  };

  // Handle "Go Back a Version" / Revert
  const handleGoBackAVersion = () => {
    if (versions.length <= 1) return;
    const nextIdx = selectedVersionIdx + 1 < versions.length ? selectedVersionIdx + 1 : 1;
    const priorVer = versions[nextIdx];
    if (priorVer) {
      setSelectedVersionIdx(nextIdx);
      populateEditForm(priorVer);
      setSaveSuccessMsg(`Loaded Version ${nextIdx + 1} of ${versions.length} into editor. Click 'Save New Version' to publish as current.`);
      setTimeout(() => setSaveSuccessMsg(null), 4000);
    }
  };

  // Edit form helpers for Sections
  const updateSectionTitle = (idx: number, val: string) => {
    const updated = [...editSections];
    updated[idx].title = val;
    setEditSections(updated);
  };

  const updateSectionDesc = (idx: number, val: string) => {
    const updated = [...editSections];
    updated[idx].description = val;
    setEditSections(updated);
  };

  const addSection = () => {
    setEditSections([
      ...editSections,
      {
        title: "New Section",
        description: "Section explanation...",
        fields: [],
      },
    ]);
  };

  const removeSection = (idx: number) => {
    const updated = [...editSections];
    updated.splice(idx, 1);
    setEditSections(updated);
  };

  const updateBestPractice = (idx: number, val: string) => {
    const updated = [...editBestPractices];
    updated[idx] = val;
    setEditBestPractices(updated);
  };

  const addBestPractice = () => {
    setEditBestPractices([...editBestPractices, "New tip or best practice..."]);
  };

  const removeBestPractice = (idx: number) => {
    const updated = [...editBestPractices];
    updated.splice(idx, 1);
    setEditBestPractices(updated);
  };

  return createPortal(
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 sm:p-6 md:p-8 bg-black/70 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200">
      {/* Backdrop click to close */}
      <div className="fixed inset-0" onClick={onClose} />

      {/* Modal Card */}
      <div className="relative z-10 w-full max-w-3xl max-h-[85vh] my-auto flex flex-col rounded-2xl border border-zinc-200 bg-white shadow-2xl dark:border-zinc-800 dark:bg-zinc-900 overflow-hidden text-left animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-zinc-100 dark:border-zinc-800/80 bg-zinc-50/80 dark:bg-zinc-900/80 shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-purple-100 text-purple-600 dark:bg-purple-950/60 dark:text-purple-400 border border-purple-200 dark:border-purple-900">
              <BookOpen className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-50 leading-tight">
                  {isEditing ? editTitle : currentVersion.title}
                </h2>
                <span className="rounded-full bg-purple-100 dark:bg-purple-950/80 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                  {isEditing ? editBadge : currentVersion.badge}
                </span>

                {/* Version Indicator Pill */}
                {versions.length > 0 && (
                  <span className="inline-flex items-center gap-1 rounded-md bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 text-[10px] font-mono font-bold text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700">
                    <History className="h-3 w-3 text-purple-500" />
                    Version {selectedVersionIdx + 1} of {versions.length} {selectedVersionIdx === 0 ? "(Active)" : "(Historical)"}
                  </span>
                )}
              </div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                {isEditing ? editSubtitle : currentVersion.subtitle}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Admin Edit / Mode Toggle */}
            {isAdmin && !isEditing && (
              <button
                type="button"
                onClick={() => {
                  setIsEditing(true);
                  setSelectedVersionIdx(0);
                  populateEditForm(versions[0]);
                }}
                className="inline-flex items-center gap-1.5 rounded-lg bg-purple-50 dark:bg-purple-950/50 px-3 py-1.5 text-xs font-semibold text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 hover:bg-purple-100 cursor-pointer transition-colors"
              >
                <Edit3 className="h-3.5 w-3.5" /> Edit Guide
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 cursor-pointer p-1.5 rounded-lg hover:bg-zinc-200/50 dark:hover:bg-zinc-800 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Success Banner */}
        {saveSuccessMsg && (
          <div className="bg-emerald-50 dark:bg-emerald-950/60 border-b border-emerald-200 dark:border-emerald-800 px-6 py-2 text-xs font-medium text-emerald-800 dark:text-emerald-300 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Check className="h-4 w-4 text-emerald-600" /> {saveSuccessMsg}
            </span>
            <span className="text-[10px] opacity-75 font-mono">Max 3 versions stored</span>
          </div>
        )}

        {/* Scrollable Content Body */}
        <div className="p-6 space-y-6 overflow-y-auto flex-1 text-left">
          {isEditing ? (
            /* ================= EDIT MODE FORM ================= */
            <div className="space-y-5 text-xs">
              {/* Version History Toolbar & Go Back a Version */}
              <div className="flex flex-wrap items-center justify-between gap-3 bg-zinc-50 dark:bg-zinc-800/60 p-3 rounded-xl border border-zinc-200 dark:border-zinc-700">
                <div className="text-zinc-600 dark:text-zinc-300 font-medium">
                  Editing Current Guide &bull; Saved versions kept: <strong className="text-purple-600 dark:text-purple-400">{versions.length}/3</strong>
                </div>

                {versions.length > 1 && (
                  <button
                    type="button"
                    onClick={handleGoBackAVersion}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800 font-bold hover:bg-amber-200 cursor-pointer transition-colors"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    Go Back a Version ({selectedVersionIdx + 2 <= versions.length ? `v${selectedVersionIdx + 2}` : "v2"})
                  </button>
                )}
              </div>

              {/* Title & Subtitle */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                    Guide Title
                  </label>
                  <input
                    type="text"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-1.5 text-xs text-zinc-900 dark:text-zinc-100"
                  />
                </div>
                <div>
                  <label className="block font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                    Subtitle
                  </label>
                  <input
                    type="text"
                    value={editSubtitle}
                    onChange={(e) => setEditSubtitle(e.target.value)}
                    className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-1.5 text-xs text-zinc-900 dark:text-zinc-100"
                  />
                </div>
              </div>

              {/* Purpose */}
              <div>
                <label className="block font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                  Purpose &amp; Objective
                </label>
                <textarea
                  rows={3}
                  value={editPurpose}
                  onChange={(e) => setEditPurpose(e.target.value)}
                  className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-1.5 text-xs text-zinc-900 dark:text-zinc-100"
                />
              </div>

              {/* Sections list editor */}
              <div className="space-y-4 pt-2">
                <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-2">
                  <h3 className="font-bold text-zinc-900 dark:text-zinc-100">Sections &amp; Screen Breakdowns</h3>
                  <button
                    type="button"
                    onClick={addSection}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 font-bold border border-purple-200 dark:border-purple-800 cursor-pointer"
                  >
                    <Plus className="h-3.5 w-3.5" /> Add Section
                  </button>
                </div>

                {editSections.map((sec, sIdx) => (
                  <div key={sIdx} className="p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/40 space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <input
                        type="text"
                        value={sec.title}
                        onChange={(e) => updateSectionTitle(sIdx, e.target.value)}
                        placeholder="Section Title"
                        className="font-bold w-full rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-2.5 py-1 text-xs text-zinc-900 dark:text-zinc-100"
                      />
                      <button
                        type="button"
                        onClick={() => removeSection(sIdx)}
                        className="text-rose-500 hover:text-rose-700 p-1 cursor-pointer"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>

                    <textarea
                      rows={2}
                      value={sec.description}
                      onChange={(e) => updateSectionDesc(sIdx, e.target.value)}
                      placeholder="Section Description..."
                      className="w-full rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-2.5 py-1 text-xs text-zinc-900 dark:text-zinc-100"
                    />
                  </div>
                ))}
              </div>

              {/* Tips & Best Practices Editor */}
              <div className="space-y-3 pt-4 border-t border-zinc-200 dark:border-zinc-800">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                    <Sparkles className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    Tips &amp; Best Practices
                  </h3>
                  <button
                    type="button"
                    onClick={addBestPractice}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-bold border border-blue-200 dark:border-blue-800 cursor-pointer"
                  >
                    <Plus className="h-3.5 w-3.5" /> Add Tip
                  </button>
                </div>

                {editBestPractices.map((bp, bpIdx) => (
                  <div key={bpIdx} className="flex items-center gap-2">
                    <input
                      type="text"
                      value={bp}
                      onChange={(e) => updateBestPractice(bpIdx, e.target.value)}
                      placeholder="Enter tip or best practice..."
                      className="w-full rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-1.5 text-xs text-zinc-900 dark:text-zinc-100"
                    />
                    <button
                      type="button"
                      onClick={() => removeBestPractice(bpIdx)}
                      className="text-rose-500 hover:text-rose-700 p-1 cursor-pointer shrink-0"
                      title="Remove Tip"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            /* ================= VIEW MODE ================= */
            <>
              {/* Version & Author Info Bar */}
              {currentVersion.savedBy && (
                <div className="flex items-center justify-between text-[11px] text-zinc-500 dark:text-zinc-400 bg-zinc-50 dark:bg-zinc-800/40 px-3 py-1.5 rounded-lg border border-zinc-100 dark:border-zinc-800">
                  <span>
                    Saved by <strong className="text-zinc-700 dark:text-zinc-300">{currentVersion.savedBy}</strong> on {currentVersion.savedAt}
                  </span>
                  <span className="font-mono text-[10px]">Max 3 versions stored</span>
                </div>
              )}

              {/* Purpose Box */}
              <div className="rounded-xl border border-purple-200 bg-purple-50/60 p-4 dark:border-purple-900/40 dark:bg-purple-950/20 space-y-1">
                <span className="text-xs font-bold text-purple-900 dark:text-purple-300 flex items-center gap-1.5 uppercase tracking-wider">
                  <Info className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                  Purpose &amp; Objective
                </span>
                <p className="text-xs leading-relaxed text-purple-950 dark:text-purple-200 font-medium">
                  {currentVersion.purpose}
                </p>
              </div>

              {/* Sections */}
              {(currentVersion.sections || []).map((sec: any, idx: number) => (
                <div key={idx} className="space-y-3 pt-2">
                  <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 border-b border-zinc-100 dark:border-zinc-800 pb-1 flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-blue-500 inline-block" />
                    {sec.title}
                  </h3>
                  <p className="text-xs text-zinc-600 dark:text-zinc-300 leading-relaxed">
                    {sec.description}
                  </p>

                  {/* Screenshot Display or Placeholder */}
                  {sec.screenshotPlaceholder && (
                    sec.screenshotPlaceholder.imagePath ? (
                      <div className="my-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-900 overflow-hidden shadow-md text-left">
                        <div className="px-3 py-2 bg-zinc-900 border-b border-zinc-800 flex items-center justify-between text-xs font-semibold text-zinc-200">
                          <span className="flex items-center gap-1.5">
                            <Camera className="h-4 w-4 text-purple-400 shrink-0" />
                            {sec.screenshotPlaceholder.title}
                          </span>
                          <span className="text-[10px] text-zinc-400 font-mono">Screen Capture</span>
                        </div>
                        <div className="bg-zinc-950 flex justify-center p-2">
                          <img
                            src={sec.screenshotPlaceholder.imagePath}
                            alt={sec.screenshotPlaceholder.title}
                            className="max-h-[380px] w-auto max-w-full object-contain rounded border border-zinc-800/80 shadow-sm"
                          />
                        </div>
                        {sec.screenshotPlaceholder.description && (
                          <div className="px-3 py-2 bg-zinc-900 text-[11px] text-zinc-400 italic border-t border-zinc-800">
                            {sec.screenshotPlaceholder.description}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="my-3 rounded-xl border-2 border-dashed border-purple-300 dark:border-purple-800/80 bg-purple-50/30 dark:bg-purple-950/10 p-4 text-left space-y-2">
                        <div className="flex items-center gap-2 text-xs font-bold text-purple-900 dark:text-purple-300">
                          <Camera className="h-4 w-4 text-purple-600 dark:text-purple-400 shrink-0" />
                          <span>[ 📸 SCREENSHOT PLACEHOLDER: {sec.screenshotPlaceholder.title} ]</span>
                        </div>
                        <p className="text-xs text-zinc-600 dark:text-zinc-400 italic bg-white/70 dark:bg-zinc-900/80 p-2.5 rounded-lg border border-purple-100 dark:border-purple-900/40">
                          &ldquo;{sec.screenshotPlaceholder.description}&rdquo;
                        </p>
                      </div>
                    )
                  )}

                  {/* Field Reference Table */}
                  {sec.fields && sec.fields.length > 0 && (
                    <div className="mt-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden shadow-2xs">
                      <div className="overflow-x-auto">
                        <table className="min-w-full border-collapse text-left text-xs">
                          <thead>
                            <tr className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/80 text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                              <th className="px-3 py-2 w-1/4">Element / Field</th>
                              <th className="px-3 py-2 w-2/5">Purpose &amp; Behavior</th>
                              <th className="px-3 py-2 w-1/3">Acceptable Values</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
                            {sec.fields.map((field: any, fIdx: number) => (
                              <tr key={fIdx} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/30 transition-colors">
                                <td className="px-3 py-2 font-bold text-zinc-900 dark:text-zinc-100 align-top">
                                  {field.name}
                                </td>
                                <td className="px-3 py-2 text-zinc-600 dark:text-zinc-300 leading-relaxed align-top">
                                  {field.purpose}
                                </td>
                                <td className="px-3 py-2 space-y-1 align-top">
                                  <div className="flex items-start gap-1 text-[11px] text-emerald-700 dark:text-emerald-300 font-medium">
                                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0 mt-0.5" />
                                    <span>{field.acceptableValues}</span>
                                  </div>
                                  {field.unacceptableValues && (
                                    <div className="flex items-start gap-1 text-[11px] text-rose-600 dark:text-rose-400 font-medium pt-0.5 border-t border-zinc-100 dark:border-zinc-800/40">
                                      <AlertCircle className="h-3.5 w-3.5 text-rose-500 shrink-0 mt-0.5" />
                                      <span>{field.unacceptableValues}</span>
                                    </div>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              ))}

              {/* Best Practices */}
              {currentVersion.bestPractices && currentVersion.bestPractices.length > 0 && (
                <div className="rounded-xl border border-blue-200 bg-blue-50/60 p-4 dark:border-blue-900/40 dark:bg-blue-950/20 space-y-2">
                  <span className="text-xs font-bold text-blue-900 dark:text-blue-300 flex items-center gap-1.5 uppercase tracking-wider">
                    <Sparkles className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    Tips &amp; Best Practices
                  </span>
                  <ul className="list-disc list-inside space-y-1 text-xs text-blue-950 dark:text-blue-200 font-medium leading-relaxed">
                    {currentVersion.bestPractices.map((bp: string, bpIdx: number) => (
                      <li key={bpIdx}>{bp}</li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 flex items-center justify-between shrink-0">
          <div>
            {isEditing && versions.length > 1 && (
              <button
                type="button"
                onClick={handleGoBackAVersion}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-amber-50 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800 text-xs font-semibold hover:bg-amber-100 transition-colors cursor-pointer"
              >
                <RotateCcw className="h-3.5 w-3.5" /> Go Back a Version
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            {isEditing ? (
              <>
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="rounded-lg border border-zinc-300 dark:border-zinc-700 px-3.5 py-2 text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isPending}
                  onClick={handleSave}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-purple-600 px-4 py-2 text-xs font-semibold text-white hover:bg-purple-500 disabled:opacity-50 transition-colors cursor-pointer"
                >
                  {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                  Save New Version
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-500 transition-colors cursor-pointer"
              >
                Got It, Close
              </button>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
