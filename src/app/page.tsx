"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, FileText, ChevronRight, Briefcase, GraduationCap, Code, LayoutTemplate, X, Upload, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface Resume {
  _id: string;
  title: string;
  meta_code: string;
  current_version: number;
  updatedAt: string;
}

const SAMPLE_JSON = `{
  "meta": { "code": "SWE" },
  "basics": {
    "name": { "full": "John Doe" },
    "contact": {
      "email": "john@example.com",
      "phone": { "display": "+1 555-0100" }
    },
    "summary": "Experienced software engineer with 5+ years building scalable systems.",
    "profiles": {
      "github": { "network": "GitHub", "url": "https://github.com/johndoe" },
      "linkedin": { "network": "LinkedIn", "url": "https://linkedin.com/in/johndoe" }
    }
  },
  "work": [
    {
      "company": "Tech Corp",
      "position": "Senior Backend Engineer",
      "location": "Remote",
      "startDate": "Jan 2021",
      "endDate": "Present",
      "highlights": [
        "Scaled microservice architecture to handle 1M+ DAU.",
        "Reduced API latency by 40% through strategic caching."
      ]
    }
  ],
  "skills": [
    { "category": "Languages", "keywords": ["Python", "TypeScript", "Go"] },
    { "category": "Frameworks", "keywords": ["React", "Next.js", "FastAPI"] }
  ],
  "projects": [
    {
      "name": "Resume Builder",
      "description": "ATS-optimized resume generation system using LaTeX and AI."
    }
  ],
  "education": [
    {
      "institution": "University of Technology",
      "degree": "B.S. Computer Science",
      "completionDate": "May 2020",
      "score": { "label": "GPA", "value": "3.8/4.0" }
    }
  ]
}`;

const getRoleIcon = (code: string) => {
  switch (code.toUpperCase()) {
    case 'SWE': return <Code className="w-5 h-5" />;
    case 'PM': return <Briefcase className="w-5 h-5" />;
    case 'DATA': return <GraduationCap className="w-5 h-5" />;
    default: return <FileText className="w-5 h-5" />;
  }
};

const getRoleColor = (code: string) => {
  switch (code.toUpperCase()) {
    case 'SWE': return 'from-primary-100 to-primary-50 text-primary-600 border-primary-200';
    case 'PM': return 'from-[#D1FAE5] to-[#ECFDF5] text-[#059669] border-[#A7F3D0]';
    case 'DATA': return 'from-[#FEF3C7] to-[#FFFBEB] text-[#D97706] border-[#FDE68A]';
    default: return 'from-bg-subtle to-bg-panel text-text-tertiary border-border-default';
  }
};

export default function Home() {
  const router = useRouter();
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [jsonInput, setJsonInput] = useState("");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  const fetchResumes = () => {
    setLoading(true);
    fetch('/api/resumes')
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setResumes(data.data);
        }
        setLoading(false);
      })
      .catch(err => {
        console.error("Failed to fetch resumes", err);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchResumes();
  }, []);

  const handleUpload = async () => {
    setError("");
    setUploading(true);

    try {
      const parsed = JSON.parse(jsonInput);

      const res = await fetch('/api/resumes/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(parsed),
      });

      const result = await res.json();

      if (!result.success) {
        setError(result.error);
        setUploading(false);
        return;
      }

      setShowModal(false);
      setJsonInput("");
      fetchResumes();
      router.push(`/editor/${result.data._id}`);
    } catch (e: any) {
      setError(e.message || "Invalid JSON");
    } finally {
      setUploading(false);
    }
  };

  const handleLoadSample = () => {
    setJsonInput(SAMPLE_JSON);
    setError("");
  };

  const groupedResumes = resumes.reduce((acc, resume) => {
    const code = resume.meta_code || 'OTHER';
    if (!acc[code]) acc[code] = [];
    acc[code].push(resume);
    return acc;
  }, {} as Record<string, Resume[]>);

  const container = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.1 } }
  };

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
  };

  return (
    <div className="max-w-5xl mx-auto w-full">
      <div className="flex justify-between items-center mb-10">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight text-text-primary mb-2">
            Your Profiles
          </h1>
          <p className="text-lg text-text-tertiary">
            Manage your targeted ATS resumes in one place.
          </p>
        </div>
        <button 
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 rounded-full bg-primary-600 px-5 py-2.5 text-sm font-semibold text-text-inverse shadow-sm hover:bg-primary-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-500 transition-all active:scale-95"
        >
          <Plus className="w-4 h-4" />
          New Profile
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="w-8 h-8 rounded-full border-4 border-border-subtle border-t-primary-500 animate-spin"></div>
        </div>
      ) : Object.keys(groupedResumes).length === 0 ? (
        <div className="text-center py-24 bg-bg-subtle rounded-3xl border border-border-default border-dashed">
          <LayoutTemplate className="w-12 h-12 text-text-disabled mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-text-primary">No resumes found</h3>
          <p className="mt-2 text-text-tertiary mb-6">Get started by creating a new ATS profile.</p>
          <button
            onClick={() => setShowModal(true)}
            className="inline-flex items-center gap-2 rounded-full bg-primary-600 px-5 py-2.5 text-sm font-semibold text-text-inverse shadow-sm hover:bg-primary-500 transition-all active:scale-95"
          >
            <Plus className="w-4 h-4" />
            Create Your First Profile
          </button>
        </div>
      ) : (
        <motion.div 
          variants={container}
          initial="hidden"
          animate="show"
          className="space-y-12"
        >
          {Object.entries(groupedResumes).map(([code, groupResumes]) => (
            <motion.div variants={item} key={code} className="space-y-4">
              <div className="flex items-center gap-3 border-b border-border-default pb-3">
                <div className={`p-2 rounded-xl bg-gradient-to-br border ${getRoleColor(code)}`}>
                  {getRoleIcon(code)}
                </div>
                <h2 className="text-2xl font-bold tracking-tight text-text-primary">
                  {code} Profiles
                </h2>
                <span className="ml-auto inline-flex items-center rounded-full bg-bg-subtle px-2.5 py-0.5 text-xs font-medium text-text-secondary">
                  {groupResumes.length} Document{groupResumes.length !== 1 ? 's' : ''}
                </span>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {groupResumes.map((resume) => (
                  <Link href={`/editor/${resume._id}`} key={resume._id}>
                    <div className="group relative rounded-2xl border border-border-default bg-bg-card p-6 shadow-sm transition-all hover:shadow-md hover:border-border-strong">
                      <div className="flex justify-between items-start mb-4">
                         <div className="h-10 w-10 rounded-xl bg-bg-subtle flex items-center justify-center text-text-tertiary group-hover:scale-110 transition-transform">
                            <FileText className="w-5 h-5" />
                         </div>
                         <div className="text-xs text-text-disabled font-medium">
                           v{resume.current_version}
                         </div>
                      </div>
                      <h3 className="text-lg font-semibold text-text-primary group-hover:text-primary-600 transition-colors">
                        {resume.title}
                      </h3>
                      <p className="text-sm text-text-tertiary mt-1">
                        Updated {new Date(resume.updatedAt).toLocaleDateString()}
                      </p>
                      <div className="absolute right-6 bottom-6 opacity-0 translate-x-4 transition-all group-hover:opacity-100 group-hover:translate-x-0">
                        <ChevronRight className="w-5 h-5 text-primary-500" />
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </motion.div>
          ))}
        </motion.div>
      )}

      {/* ─── Create / Upload Modal ─── */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
            onClick={() => setShowModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="w-full max-w-2xl bg-bg-card rounded-3xl shadow-2xl overflow-hidden border border-border-default"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-5 border-b border-border-default">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary-600 to-accent-cyan-600 flex items-center justify-center">
                    <Upload className="w-5 h-5 text-text-inverse" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-text-primary">Upload Resume JSON</h2>
                    <p className="text-sm text-text-tertiary">Paste your full resume JSON payload below</p>
                  </div>
                </div>
                <button 
                  onClick={() => setShowModal(false)}
                  className="p-2 rounded-full hover:bg-surface-hover transition-colors"
                >
                  <X className="w-5 h-5 text-text-tertiary" />
                </button>
              </div>

              {/* Body */}
              <div className="p-6 space-y-4">
                <div className="flex justify-end">
                  <button
                    onClick={handleLoadSample}
                    className="flex items-center gap-1.5 text-xs font-medium text-primary-600 hover:text-primary-500 transition-colors"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    Load Sample JSON
                  </button>
                </div>

                <textarea
                  className="w-full h-72 p-4 rounded-2xl border border-border-default font-mono text-sm shadow-inner bg-bg-subtle focus:ring-2 focus:ring-primary-500 focus:border-primary-500 resize-none text-text-primary placeholder:text-text-disabled"
                  placeholder='Paste your resume JSON here... e.g. { "meta": { "code": "SWE" }, "basics": { ... } }'
                  value={jsonInput}
                  onChange={(e) => { setJsonInput(e.target.value); setError(""); }}
                />

                {error && (
                  <div className="p-3 rounded-xl bg-error-soft border border-error/20 text-error text-sm">
                    {error}
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-border-default bg-bg-panel">
                <button
                  onClick={() => setShowModal(false)}
                  className="px-5 py-2.5 rounded-full border border-border-strong text-sm font-semibold text-text-secondary hover:bg-surface-hover transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpload}
                  disabled={!jsonInput.trim() || uploading}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-gradient-to-r from-primary-600 to-accent-cyan-600 text-sm font-semibold text-text-inverse shadow-md hover:opacity-90 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {uploading ? (
                    <div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin"></div>
                  ) : (
                    <Upload className="w-4 h-4" />
                  )}
                  {uploading ? 'Uploading...' : 'Upload & Create'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
