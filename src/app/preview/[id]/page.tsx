"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, CheckCircle2, XCircle, ExternalLink, Loader2, FileText, Clock, Hash } from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";

interface GenerationJob {
  _id: string;
  resume_id: string;
  version_number: number;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  output_filename: string;
  meta_code: string;
  drive_link?: string;
  pdf_path?: string;
  error_log?: string;
  createdAt: string;
  updatedAt: string;
}

export default function PreviewPage() {
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();

  const [job, setJob] = useState<GenerationJob | null>(null);

  useEffect(() => {
    let interval: NodeJS.Timeout;

    const fetchJob = async () => {
      try {
        const res = await fetch(`/api/generations/${id}`);
        const data = await res.json();
        if (data.success) {
          setJob(data.data);
          if (data.data.status === 'COMPLETED' || data.data.status === 'FAILED') {
            clearInterval(interval);
          }
        }
      } catch (err) {
        console.error("Failed to poll generation job", err);
      }
    };

    fetchJob();
    interval = setInterval(fetchJob, 3000);
    return () => clearInterval(interval);
  }, [id]);

  if (!job) {
    return (
      <div className="flex justify-center items-center h-[70vh]">
        <Loader2 className="w-8 h-8 animate-spin text-text-disabled" />
      </div>
    );
  }

  const statusConfig = {
    PENDING: {
      icon: Loader2,
      iconClass: 'animate-spin text-primary-500',
      bgClass: 'bg-primary-50',
      label: 'Queued',
      dotClass: 'bg-primary-500',
    },
    PROCESSING: {
      icon: Loader2,
      iconClass: 'animate-spin text-warning',
      bgClass: 'bg-warning-soft',
      label: 'Compiling',
      dotClass: 'bg-warning',
    },
    COMPLETED: {
      icon: CheckCircle2,
      iconClass: 'text-success',
      bgClass: 'bg-success-soft',
      label: 'Complete',
      dotClass: 'bg-success',
    },
    FAILED: {
      icon: XCircle,
      iconClass: 'text-error',
      bgClass: 'bg-error-soft',
      label: 'Failed',
      dotClass: 'bg-error',
    },
  };

  const config = statusConfig[job.status];
  const StatusIcon = config.icon;
  const isPending = job.status === 'PENDING' || job.status === 'PROCESSING';

  return (
    <div className="max-w-2xl mx-auto w-full pt-12">
      <Link 
        href={`/editor/${job.resume_id}`} 
        className="inline-flex items-center gap-2 text-sm font-medium text-text-tertiary hover:text-text-primary transition-colors mb-8"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Editor
      </Link>

      <div className="bg-bg-card border border-border-default shadow-sm rounded-3xl overflow-hidden">
        
        {/* Job Info Header */}
        <div className="p-6 md:p-8 border-b border-border-subtle">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2 mb-1.5">
                <div className={`w-2 h-2 rounded-full ${config.dotClass} ${isPending ? 'animate-pulse' : ''}`} />
                <span className="text-xs font-semibold uppercase tracking-wider text-text-tertiary">
                  {config.label}
                </span>
              </div>
              <h2 className="text-xl md:text-2xl font-bold tracking-tight text-text-primary break-all">
                {job.output_filename}<span className="text-text-disabled">.pdf</span>
              </h2>
            </div>
            <div className={`w-14 h-14 rounded-2xl ${config.bgClass} flex items-center justify-center shrink-0`}>
              <StatusIcon className={`w-7 h-7 ${config.iconClass}`} />
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-text-tertiary bg-bg-subtle px-2.5 py-1 rounded-lg">
              <Hash className="w-3 h-3" />
              v{job.version_number}
            </span>
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-text-tertiary bg-bg-subtle px-2.5 py-1 rounded-lg">
              <FileText className="w-3 h-3" />
              {job.meta_code}
            </span>
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-text-tertiary bg-bg-subtle px-2.5 py-1 rounded-lg">
              <Clock className="w-3 h-3" />
              {new Date(job.createdAt).toLocaleString()}
            </span>
          </div>
        </div>

        {/* Status Content */}
        <div className="p-6 md:p-8 text-center">

          {isPending && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center gap-4"
            >
              <p className="text-text-tertiary max-w-sm">
                {job.status === 'PENDING'
                  ? 'Waiting for the engine to pick up the job via CDC...'
                  : 'The LaTeX engine is compiling your resume. This usually takes 10-15 seconds.'
                }
              </p>
              <div className="w-full max-w-xs bg-bg-subtle rounded-full h-1.5 overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-primary-600 to-accent-cyan-600 rounded-full"
                  initial={{ width: '10%' }}
                  animate={{ width: job.status === 'PROCESSING' ? '70%' : '30%' }}
                  transition={{ duration: 3, ease: 'easeInOut' }}
                />
              </div>
            </motion.div>
          )}

          {job.status === 'COMPLETED' && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center gap-6"
            >
              <p className="text-text-tertiary max-w-sm">
                Your ATS-optimized resume has been compiled successfully.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-3 w-full max-w-sm">
                {job.drive_link ? (
                  <a 
                    href={job.drive_link} 
                    target="_blank" 
                    rel="noreferrer"
                    className="flex-1 flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-primary-600 shadow-md font-semibold text-text-inverse transition-all hover:bg-primary-500 active:scale-95"
                  >
                    <ExternalLink className="w-4 h-4" />
                    Open in Drive
                  </a>
                ) : (
                  <div className="flex-1 px-5 py-3 rounded-xl bg-bg-subtle text-text-tertiary font-medium text-center">
                    Drive link pending upload...
                  </div>
                )}
              </div>

              {job.pdf_path && (
                <p className="text-xs text-text-disabled font-mono break-all">
                  📁 {job.pdf_path}
                </p>
              )}
            </motion.div>
          )}

          {job.status === 'FAILED' && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center gap-5"
            >
              <p className="text-text-tertiary max-w-sm">
                LaTeX compilation failed. Check the error log below for details.
              </p>
              
              {job.error_log && (
                <div className="bg-error-soft text-error text-left p-4 rounded-xl text-sm font-mono overflow-auto max-h-48 w-full border border-error/20">
                  {job.error_log}
                </div>
              )}
              
              <button 
                onClick={() => router.push(`/editor/${job.resume_id}`)}
                className="px-6 py-3 rounded-xl border border-border-strong bg-bg-card shadow-sm font-semibold text-text-primary transition-all hover:bg-surface-hover active:scale-95"
              >
                Return to Editor
              </button>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}
