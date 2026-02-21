import Link from 'next/link';
import { LayoutTemplate, Settings } from 'lucide-react';

export default function Navbar() {
  return (
    <nav className="sticky top-0 z-50 w-full border-b border-border-default bg-bg-card/80 backdrop-blur-xl">
      <div className="container mx-auto flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary-600 to-accent-cyan-600 shadow-sm transition-transform group-hover:scale-105">
            <LayoutTemplate className="h-5 w-5 text-text-inverse" />
          </div>
          <span className="text-xl font-bold tracking-tight text-text-primary">
            ResumeBuilder<span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-500 to-accent-cyan-500">PRO</span>
          </span>
        </Link>
        
        <div className="flex items-center gap-4 text-text-tertiary">
          <button className="rounded-lg p-2 hover:bg-surface-hover transition-colors">
             <Settings className="w-5 h-5" />
          </button>
        </div>
      </div>
    </nav>
  );
}
