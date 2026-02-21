"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Save, User, Briefcase, GraduationCap, Code, FolderOpen,
  ArrowLeft, AlertCircle, FileText, CheckCircle2, History,
  ChevronDown, ChevronUp, RotateCcw, Clock, Eye, Upload, Pencil
} from "lucide-react";
import Link from "next/link";

type ResumeData = Record<string, any>;

interface VersionItem {
  _id: string;
  version_number: number;
  createdAt: string;
  changed_sections?: string[];
  change_summary?: string;
  change_type?: 'edit' | 'upload' | 'rollback';
}

const CHANGE_TYPE_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  edit:     { label: 'Edit',     color: 'text-primary-600 bg-primary-50',   icon: Pencil },
  upload:   { label: 'Upload',   color: 'text-[#7C3AED] bg-[#F5F3FF]',     icon: Upload },
  rollback: { label: 'Rollback', color: 'text-warning bg-warning-soft',     icon: RotateCcw },
};

const TABS = [
  { id: 'basics', label: 'Basics', icon: User },
  { id: 'work', label: 'Work Experience', icon: Briefcase },
  { id: 'education', label: 'Education', icon: GraduationCap },
  { id: 'skills', label: 'Skills', icon: Code },
  { id: 'projects', label: 'Projects', icon: FolderOpen },
];

export default function EditorPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [resumeTitle, setResumeTitle] = useState("Loading...");
  const [currentVersion, setCurrentVersion] = useState(1);
  const [data, setData] = useState<ResumeData | null>(null);
  const [activeTab, setActiveTab] = useState('basics');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [jsonText, setJsonText] = useState("");

  // Version History State
  const [showVersions, setShowVersions] = useState(false);
  const [versions, setVersions] = useState<VersionItem[]>([]);
  const [loadingVersions, setLoadingVersions] = useState(false);
  const [previewingVersion, setPreviewingVersion] = useState<number | null>(null);
  const [previewData, setPreviewData] = useState<ResumeData | null>(null);
  const [rollingBack, setRollingBack] = useState(false);

  useEffect(() => {
    fetch(`/api/resumes/${id}`)
      .then(res => res.json())
      .then(resData => {
        if (resData.success) {
          setData(resData.data.data);
          setResumeTitle(resData.data.title);
          setCurrentVersion(resData.data.current_version);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    const source = previewData || data;
    if (source) {
      const sectionData = source[activeTab];
      setJsonText(sectionData !== undefined ? JSON.stringify(sectionData, null, 2) : "null");
    }
  }, [activeTab, data, previewData]);

  const fetchVersions = useCallback(async () => {
    setLoadingVersions(true);
    try {
      const res = await fetch(`/api/resumes/${id}/versions`);
      const result = await res.json();
      if (result.success) setVersions(result.data);
    } finally {
      setLoadingVersions(false);
    }
  }, [id]);

  useEffect(() => {
    if (showVersions) fetchVersions();
  }, [showVersions, fetchVersions]);

  const handleJsonChange = (value: string) => {
    if (previewingVersion !== null) return;
    setJsonText(value);
    try {
      const parsed = JSON.parse(value);
      setData((prev: any) => ({ ...prev, [activeTab]: parsed }));
    } catch { /* ignore parse errors while typing */ }
  };

  const handleSave = async () => {
    if (previewingVersion !== null) exitPreview();
    setSaving(true);
    setSaved(false);
    try {
      const res = await fetch(`/api/resumes/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data })
      });
      const result = await res.json();
      if (result.success) {
        setCurrentVersion(result.data.current_version);
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
        if (showVersions) fetchVersions();
      } else {
        alert("Failed to save: " + result.error);
      }
    } finally {
      setSaving(false);
    }
  };

  const startGeneration = async () => {
    if (previewingVersion !== null) exitPreview();
    await handleSave();
    const res = await fetch(`/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ resume_id: id })
    });
    const result = await res.json();
    if (result.success) {
      router.push(`/preview/${result.data._id}`);
    } else {
      alert("Failed to start generation: " + result.error);
    }
  };

  const handlePreviewVersion = async (versionNumber: number) => {
    try {
      const res = await fetch(`/api/resumes/${id}/versions?version=${versionNumber}`);
      const result = await res.json();
      if (result.success) {
        setPreviewData(result.data.data);
        setPreviewingVersion(versionNumber);
      }
    } catch (err) {
      console.error("Failed to load version", err);
    }
  };

  const exitPreview = () => {
    setPreviewingVersion(null);
    setPreviewData(null);
  };

  const handleRollback = async (versionNumber: number) => {
    if (!confirm(`This will restore v${versionNumber} as a new version. Continue?`)) return;
    setRollingBack(true);
    try {
      const res = await fetch(`/api/resumes/${id}/versions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ version_number: versionNumber })
      });
      const result = await res.json();
      if (result.success) {
        setData(result.data.data);
        setCurrentVersion(result.data.current_version);
        setPreviewingVersion(null);
        setPreviewData(null);
        fetchVersions();
      } else {
        alert("Rollback failed: " + result.error);
      }
    } finally {
      setRollingBack(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-[70vh]">
        <div className="w-8 h-8 rounded-full border-4 border-border-subtle border-t-primary-500 animate-spin"></div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex flex-col justify-center items-center h-[70vh] gap-4">
        <AlertCircle className="w-10 h-10 text-error" />
        <p className="text-text-tertiary">Failed to load resume data.</p>
        <Link href="/" className="text-primary-500 hover:underline text-sm font-medium">Back to Dashboard</Link>
      </div>
    );
  }

  const activeTabData = TABS.find(t => t.id === activeTab);
  const ActiveIcon = activeTabData?.icon || FileText;
  const isPreviewMode = previewingVersion !== null;

  return (
    <div className="flex flex-col md:flex-row h-[calc(100vh-8rem)] gap-6">
      {/* Sidebar */}
      <aside className="w-full md:w-64 shrink-0 flex flex-col gap-2 overflow-y-auto">
         <div className="mb-4 flex items-center gap-2">
            <Link href="/" className="p-2 rounded-full hover:bg-surface-hover transition-colors text-text-tertiary">
               <ArrowLeft className="w-5 h-5" />
            </Link>
            <div className="min-w-0">
              <h1 className="text-xl font-bold truncate text-text-primary">{resumeTitle}</h1>
              <span className="text-xs text-text-disabled font-medium">v{currentVersion}</span>
            </div>
         </div>

         <nav className="flex flex-col gap-1">
           {TABS.map((tab) => {
             const Icon = tab.icon;
             return (
               <button
                 key={tab.id}
                 onClick={() => setActiveTab(tab.id)}
                 className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium text-sm
                   ${activeTab === tab.id
                     ? 'bg-primary-600 text-text-inverse shadow-md shadow-primary-600/10'
                     : 'text-text-secondary hover:bg-surface-hover hover:text-text-primary'
                   }
                 `}
               >
                 <Icon className="w-4 h-4" />
                 {tab.label}
               </button>
             );
           })}
         </nav>

         {/* Version History Panel */}
         <div className="mt-4 border-t border-border-default pt-4">
            <button
              onClick={() => setShowVersions(!showVersions)}
              className="w-full flex items-center justify-between px-4 py-2.5 rounded-xl text-sm font-semibold text-text-secondary hover:bg-surface-hover transition-all"
            >
              <span className="flex items-center gap-2">
                <History className="w-4 h-4" />
                Version History
              </span>
              {showVersions ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>

            <AnimatePresence>
              {showVersions && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="mt-2 space-y-1 max-h-52 overflow-y-auto pr-1">
                    {loadingVersions ? (
                      <div className="flex justify-center py-4">
                        <div className="w-5 h-5 rounded-full border-2 border-border-subtle border-t-primary-500 animate-spin"></div>
                      </div>
                    ) : versions.length === 0 ? (
                      <p className="text-xs text-text-disabled px-4 py-3">No version history yet.</p>
                    ) : (
                      versions.map((v) => {
                        const isCurrent = v.version_number === currentVersion;
                        const isPreviewing = previewingVersion === v.version_number;
                        return (
                          <div
                            key={v._id}
                            onClick={() => {
                              if (isCurrent) exitPreview();
                              else if (!isPreviewing) handlePreviewVersion(v.version_number);
                              else exitPreview();
                            }}
                            className={`group rounded-xl px-3 py-2.5 transition-all border cursor-pointer
                              ${isPreviewing
                                ? 'bg-primary-50 border-primary-200'
                                : isCurrent
                                  ? 'bg-bg-panel border-border-default'
                                  : 'border-transparent hover:bg-surface-hover'
                              }
                            `}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2 min-w-0">
                                <Clock className="w-3.5 h-3.5 text-text-disabled shrink-0" />
                                <span className="text-sm font-medium text-text-primary">
                                  v{v.version_number}
                                </span>
                                {isCurrent && (
                                  <span className="text-[10px] uppercase tracking-wider font-bold text-success bg-success-soft px-1.5 py-0.5 rounded-md">
                                    Current
                                  </span>
                                )}
                              </div>
                              {!isCurrent && (
                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <button
                                    onClick={(e) => { e.stopPropagation(); isPreviewing ? exitPreview() : handlePreviewVersion(v.version_number); }}
                                    className="p-1 rounded-md hover:bg-surface-active text-text-tertiary"
                                    title={isPreviewing ? "Exit preview" : "Preview"}
                                  >
                                    <Eye className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={(e) => { e.stopPropagation(); handleRollback(v.version_number); }}
                                    disabled={rollingBack}
                                    className="p-1 rounded-md hover:bg-primary-50 text-primary-500"
                                    title="Restore this version"
                                  >
                                    <RotateCcw className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              )}
                            </div>
                            <p className="text-[11px] text-text-disabled mt-0.5 ml-5.5">
                              {new Date(v.createdAt).toLocaleString()}
                            </p>
                            {v.change_type && (
                              <div className="mt-1.5 ml-5.5 flex flex-wrap items-center gap-1">
                                {(() => {
                                  const cfg = CHANGE_TYPE_CONFIG[v.change_type] || CHANGE_TYPE_CONFIG.edit;
                                  const TypeIcon = cfg.icon;
                                  return (
                                    <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-md ${cfg.color}`}>
                                      <TypeIcon className="w-2.5 h-2.5" />
                                      {cfg.label}
                                    </span>
                                  );
                                })()}
                              </div>
                            )}
                            {v.changed_sections && v.changed_sections.length > 0 && (
                              <div className="mt-1 ml-5.5 flex flex-wrap gap-1">
                                {v.changed_sections.slice(0, 4).map((section) => (
                                  <span key={section} className="text-[9px] font-medium text-text-tertiary bg-bg-subtle px-1.5 py-0.5 rounded">
                                    {section}
                                  </span>
                                ))}
                                {v.changed_sections.length > 4 && (
                                  <span className="text-[9px] font-medium text-text-disabled">
                                    +{v.changed_sections.length - 4} more
                                  </span>
                                )}
                              </div>
                            )}
                            {v.change_summary && (
                              <p className="text-[10px] text-text-disabled mt-0.5 ml-5.5 italic">
                                {v.change_summary}
                              </p>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
         </div>

         {/* Action Buttons */}
         <div className="mt-auto space-y-3 pt-4 border-t border-border-default">
             <button
               onClick={handleSave}
               disabled={saving || isPreviewMode}
               className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-border-strong bg-bg-card shadow-sm font-semibold text-sm text-text-primary transition-all hover:bg-surface-hover disabled:opacity-50"
             >
                {saving ? (
                  <div className="w-4 h-4 rounded-full border-2 border-border-subtle border-t-primary-500 animate-spin"></div>
                ) : saved ? (
                  <CheckCircle2 className="w-4 h-4 text-success" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                {saved ? 'Saved!' : 'Save Changes'}
             </button>

             <button
               onClick={startGeneration}
               disabled={isPreviewMode}
               className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-primary-600 to-accent-cyan-600 shadow-md font-semibold text-sm text-text-inverse transition-all hover:opacity-90 active:scale-95 disabled:opacity-50"
             >
                <FileText className="w-4 h-4" />
                Generate PDF
             </button>
         </div>
      </aside>

      {/* Editor Main Content */}
      <main className="flex-grow bg-bg-card border border-border-default shadow-sm rounded-3xl overflow-hidden flex flex-col">
         {isPreviewMode && (
           <div className="px-6 py-3 bg-primary-50 border-b border-primary-200 flex items-center justify-between">
             <div className="flex items-center gap-2 text-sm font-medium text-primary-600">
               <Eye className="w-4 h-4" />
               Previewing v{previewingVersion} — <span className="text-primary-400">Read-only</span>
             </div>
             <div className="flex items-center gap-2">
               <button
                 onClick={() => handleRollback(previewingVersion!)}
                 disabled={rollingBack}
                 className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary-600 text-text-inverse text-xs font-semibold hover:bg-primary-500 transition-colors disabled:opacity-50"
               >
                 <RotateCcw className="w-3.5 h-3.5" />
                 {rollingBack ? 'Restoring...' : 'Restore This Version'}
               </button>
               <button
                 onClick={exitPreview}
                 className="px-3 py-1.5 rounded-lg border border-primary-200 text-primary-600 text-xs font-semibold hover:bg-primary-100 transition-colors"
               >
                 Exit Preview
               </button>
             </div>
           </div>
         )}

         <div className="p-6 border-b border-border-default bg-bg-panel">
             <h2 className="text-xl font-bold flex items-center gap-2 text-text-primary">
                 <ActiveIcon className="w-5 h-5 text-primary-500" />
                 {activeTabData?.label} Settings
             </h2>
             <p className="text-sm text-text-tertiary mt-1">
                 {isPreviewMode
                   ? `Viewing v${previewingVersion} snapshot for ${activeTabData?.label.toLowerCase()}.`
                   : `Update your ${activeTabData?.label.toLowerCase()} information for this specific resume profile.`
                 }
             </p>
         </div>

         <div className="flex-grow overflow-auto p-6 md:p-8">
            <AnimatePresence mode="wait">
               <motion.div
                 key={`${activeTab}-${previewingVersion ?? 'live'}`}
                 initial={{ opacity: 0, y: 10 }}
                 animate={{ opacity: 1, y: 0 }}
                 exit={{ opacity: 0, y: -10 }}
                 transition={{ duration: 0.2 }}
                 className="max-w-3xl"
               >
                  {!isPreviewMode && (
                    <div className="mb-4 p-4 rounded-xl bg-warning-soft border border-warning/20 text-text-secondary text-sm flex gap-3">
                       <AlertCircle className="w-5 h-5 shrink-0 text-warning" />
                       <p>This editor section is currently under development. You can edit the raw JSON below directly.</p>
                    </div>
                  )}
                  <textarea
                    className={`w-full h-96 p-4 rounded-xl border font-mono text-sm shadow-inner focus:ring-2 focus:ring-primary-500 focus:border-primary-500
                      ${isPreviewMode
                        ? 'bg-primary-50 border-primary-200 text-primary-600 cursor-not-allowed'
                        : 'bg-bg-subtle border-border-default text-text-primary'
                      }
                    `}
                    value={jsonText}
                    onChange={(e) => handleJsonChange(e.target.value)}
                    readOnly={isPreviewMode}
                  />
               </motion.div>
            </AnimatePresence>
         </div>
      </main>
    </div>
  );
}
