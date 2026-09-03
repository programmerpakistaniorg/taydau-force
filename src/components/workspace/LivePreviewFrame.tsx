import React, { useState, useEffect, useRef } from 'react';
import {
  Monitor,
  Tablet,
  Smartphone,
  Play,
  Square,
  RotateCcw,
  ExternalLink,
  ShieldCheck,
  AlertTriangle,
  Clock,
  Sparkles,
  Layers,
  CheckCircle2,
  RefreshCw
} from 'lucide-react';
import { useLiveProject } from '../../context/LiveProjectContext';

interface LivePreviewFrameProps {
  projectId: string;
}

export const LivePreviewFrame: React.FC<LivePreviewFrameProps> = ({ projectId }) => {
  const { project, refreshProject } = useLiveProject();
  const [viewport, setViewport] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [previewStatus, setPreviewStatus] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [iframeKey, setIframeKey] = useState<number>(0);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const fetchStatus = async () => {
    try {
      const res = await fetch(`/api/projects/${projectId}/preview/status`);
      if (res.ok) {
        const data = await res.json();
        setPreviewStatus(data);
      }
    } catch (e) {
      console.warn('[LivePreviewFrame] Failed to fetch preview status:', e);
    }
  };

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 4000);
    return () => clearInterval(interval);
  }, [projectId]);

  const handleStart = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/preview/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      if (res.ok) {
        await fetchStatus();
        await refreshProject();
      }
    } catch (e) {
      console.error('[LivePreviewFrame] Failed to start preview:', e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleStop = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/preview/stop`, {
        method: 'POST',
      });
      if (res.ok) {
        await fetchStatus();
        await refreshProject();
      }
    } catch (e) {
      console.error('[LivePreviewFrame] Failed to stop preview:', e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleReload = () => {
    setIframeKey((prev) => prev + 1);
  };

  const isReady = previewStatus?.status === 'ready' && previewStatus?.previewUrl;
  const isStarting = previewStatus?.status === 'starting' || isLoading;
  const isStopped = !previewStatus || previewStatus.status === 'stopped' || previewStatus.status === 'expired' || previewStatus.status === 'failed';

  const viewportWidths = {
    desktop: 'w-full',
    tablet: 'w-[768px]',
    mobile: 'w-[375px]',
  };

  return (
    <div className="bg-slate-950 rounded-2xl border border-slate-800 shadow-2xl overflow-hidden flex flex-col">
      {/* Top Controls Bar */}
      <div className="bg-slate-900 border-b border-slate-800 p-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              {isReady && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>}
              <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${
                isReady ? 'bg-emerald-500' : isStarting ? 'bg-amber-500 animate-pulse' : 'bg-slate-500'
              }`}></span>
            </span>
            <span className="text-sm font-semibold text-white">
              {isReady ? 'Live Application Running' : isStarting ? 'Starting Isolated Stack...' : 'Application Sandbox Offline'}
            </span>
          </div>

          {previewStatus?.trustLabel && (
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${
              previewStatus.trustLabel === 'Verified Preview'
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                : previewStatus.trustLabel.includes('Running')
                ? 'bg-blue-500/10 text-blue-400 border-blue-500/30'
                : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
            }`}>
              {previewStatus.trustLabel}
            </span>
          )}

          {previewStatus?.revisionVersion && (
            <span className="text-xs font-mono bg-slate-800 text-slate-300 px-2 py-0.5 rounded border border-slate-700">
              Rev v{previewStatus.revisionVersion}
            </span>
          )}
        </div>

        {/* Viewport Toggles & Actions */}
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-slate-950 p-1 rounded-lg border border-slate-800">
            <button
              type="button"
              onClick={() => setViewport('desktop')}
              className={`p-1.5 rounded transition-colors ${viewport === 'desktop' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}
              title="Desktop View (100%)"
            >
              <Monitor className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setViewport('tablet')}
              className={`p-1.5 rounded transition-colors ${viewport === 'tablet' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}
              title="Tablet View (768px)"
            >
              <Tablet className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setViewport('mobile')}
              className={`p-1.5 rounded transition-colors ${viewport === 'mobile' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}
              title="Mobile View (375px)"
            >
              <Smartphone className="w-4 h-4" />
            </button>
          </div>

          {isReady && (
            <button
              type="button"
              onClick={handleReload}
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-colors"
              title="Reload Preview Frame"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          )}

          {isStopped ? (
            <button
              type="button"
              onClick={handleStart}
              disabled={isStarting}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white transition-colors shadow-sm disabled:opacity-50"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              Start Live Sandbox
            </button>
          ) : (
            <button
              type="button"
              onClick={handleStop}
              disabled={isLoading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-rose-600/20 hover:bg-rose-600/30 text-rose-400 border border-rose-500/30 transition-colors"
            >
              <Square className="w-3.5 h-3.5 fill-current" />
              Stop Sandbox
            </button>
          )}
        </div>
      </div>

      {/* Frame Container */}
      <div className="bg-slate-900/60 p-6 flex items-center justify-center min-h-[600px] overflow-x-auto">
        {isReady ? (
          <div className={`${viewportWidths[viewport]} transition-all duration-300 bg-white rounded-xl shadow-2xl overflow-hidden border border-slate-700 flex flex-col h-[650px]`}>
            {/* Mock browser header */}
            <div className="bg-slate-100 border-b border-slate-200 px-4 py-2 flex items-center gap-2">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-400"></span>
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400"></span>
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400"></span>
              </div>
              <div className="flex-1 bg-white border border-slate-200 rounded px-2.5 py-0.5 text-xs text-slate-500 font-mono truncate">
                {previewStatus.previewUrl}
              </div>
            </div>

            {/* Sandboxed iframe */}
            <iframe
              key={iframeKey}
              ref={iframeRef}
              src={previewStatus.previewUrl}
              sandbox="allow-scripts allow-forms allow-same-origin"
              title="TayDau Live Application Preview"
              className="w-full flex-1 border-0 bg-white"
            />
          </div>
        ) : isStarting ? (
          <div className="text-center py-16 space-y-4 max-w-md">
            <div className="inline-flex p-4 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 animate-spin">
              <RefreshCw className="w-8 h-8" />
            </div>
            <h4 className="text-lg font-bold text-white">Starting Multi-Service Container Stack</h4>
            <p className="text-sm text-slate-400">
              Allocating isolated network, spinning up PostgreSQL, backend API, and compiled frontend bundle...
            </p>
          </div>
        ) : (
          <div className="text-center py-16 space-y-4 max-w-md">
            <div className="inline-flex p-4 rounded-2xl bg-slate-800 border border-slate-700 text-slate-400">
              <Layers className="w-8 h-8" />
            </div>
            <h4 className="text-lg font-bold text-white">Isolated Sandbox Ready to Launch</h4>
            <p className="text-sm text-slate-400">
              Launch the genuine full-stack application stack on a dedicated loopback origin to interact with the live software.
            </p>
            <button
              type="button"
              onClick={handleStart}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition-all shadow-lg shadow-indigo-500/20"
            >
              <Play className="w-4 h-4 fill-current" />
              Launch Live Preview Stack
            </button>
          </div>
        )}
      </div>

      {/* Footer Info */}
      <div className="bg-slate-900 border-t border-slate-800 px-6 py-3 flex flex-wrap items-center justify-between text-xs text-slate-400 gap-4">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            Isolated Origin & Sandbox Network
          </span>
          <span className="flex items-center gap-1.5">
            <Clock className="w-4 h-4 text-slate-500" />
            15-Minute Inactivity Auto-Cleanup
          </span>
        </div>
        {previewStatus?.expiresAt && isReady && (
          <span className="font-mono text-slate-400">
            Expires: {new Date(previewStatus.expiresAt).toLocaleTimeString()}
          </span>
        )}
      </div>
    </div>
  );
};
