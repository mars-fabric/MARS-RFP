'use client'

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { FileText, Play, CheckCircle2, AlertCircle, Search, X, ChevronLeft, ChevronRight, Loader2, Sparkles, Upload, Layers, ClipboardList } from 'lucide-react'
import RfpProposalTask from '@/components/tasks/RfpProposalTask'
import { getApiUrl } from '@/lib/config'

interface RecentTask {
          task_id: string
          task: string
          status: string
          created_at: string | null
          current_stage: number | null
          progress_percent: number
}

const STAGE_NAMES: Record<number, string> = {
          1: 'Requirements Analysis',
          2: 'Tools & Technology',
          3: 'Cloud & Infrastructure',
          4: 'Implementation Plan',
          5: 'Architecture Design',
          6: 'Execution Strategy',
          7: 'Proposal Compilation',
}

type FilterTab = 'all' | 'running' | 'completed' | 'failed'

function formatDateTime(dateStr: string | null): string {
          if (!dateStr) return ''
          const d = new Date(dateStr)
          return d.toLocaleDateString([], { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' }) +
                    ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' }) + ' UTC'
}

function getStatusColor(status: string): string {
          switch (status) {
                    case 'completed': return '#22c55e'
                    case 'failed': return '#ef4444'
                    case 'running': return '#f59e0b'
                    default: return '#3b82f6'
          }
}

function StatusIcon({ status }: { status: string }) {
          switch (status) {
                    case 'completed':
                              return <CheckCircle2 className="w-4 h-4" style={{ color: '#22c55e' }} />
                    case 'failed':
                              return <AlertCircle className="w-4 h-4" style={{ color: '#ef4444' }} />
                    case 'running':
                              return <Loader2 className="w-4 h-4 animate-spin" style={{ color: '#f59e0b' }} />
                    default:
                              return <Play className="w-4 h-4" style={{ color: '#3b82f6' }} />
          }
}

/* ---------- Hero Landing Page ---------- */
function HeroLanding({ onStart }: { onStart: () => void }) {
          return (
                    <div className="flex-1 flex flex-col items-center justify-center px-6 py-16 select-none">
                              {/* Icon */}
                              <div
                                        className="w-20 h-20 rounded-2xl flex items-center justify-center mb-6"
                                        style={{
                                                  background: 'linear-gradient(135deg, #ec4899, #f43f5e)',
                                                  boxShadow: '0 0 40px rgba(236,72,153,0.35)',
                                        }}
                              >
                                        <Sparkles className="w-9 h-9 text-white" />
                              </div>

                              {/* Title */}
                              <h2 className="text-3xl font-bold tracking-tight mb-2"
                                        style={{ color: 'var(--mars-color-text)' }}>
                                        RFP Proposal Generator
                              </h2>

                              {/* Tagline */}
                              <p className="text-sm max-w-md text-center mb-8"
                                        style={{ color: 'var(--mars-color-text-tertiary)' }}>
                                        Generate comprehensive technical proposals from RFP documents through an automated 7-stage pipeline
                              </p>

                              {/* CTA Button */}
                              <button
                                        onClick={onStart}
                                        className="flex items-center gap-2 px-6 py-3 rounded-lg text-sm font-semibold text-white transition-all hover:brightness-110 active:scale-[0.98]"
                                        style={{
                                                  background: 'linear-gradient(135deg, #ec4899, #f43f5e)',
                                                  boxShadow: '0 4px 20px rgba(236,72,153,0.3)',
                                        }}
                              >
                                        <FileText className="w-4 h-4" />
                                        Start New Proposal
                              </button>

                              {/* Feature cards */}
                              <div className="flex gap-4 mt-12">
                                        {[
                                                  { icon: Upload, label: 'Upload RFP', desc: 'PDF, text, markdown' },
                                                  { icon: Layers, label: 'AI Pipeline', desc: '7-stage workflow' },
                                                  { icon: ClipboardList, label: 'Full Proposal', desc: 'Download-ready PDF' },
                                        ].map(({ icon: Icon, label, desc }) => (
                                                  <div
                                                            key={label}
                                                            className="flex flex-col items-center gap-2 px-8 py-5 rounded-xl border transition-colors hover:border-[var(--mars-color-border-strong)]"
                                                            style={{
                                                                      borderColor: 'var(--mars-color-border)',
                                                                      backgroundColor: 'var(--mars-color-surface-raised)',
                                                            }}
                                                  >
                                                            <Icon className="w-5 h-5" style={{ color: 'var(--mars-color-text-secondary)' }} />
                                                            <span className="text-sm font-medium" style={{ color: 'var(--mars-color-text)' }}>{label}</span>
                                                            <span className="text-[11px]" style={{ color: 'var(--mars-color-text-tertiary)' }}>{desc}</span>
                                                  </div>
                                        ))}
                              </div>
                    </div>
          )
}

function HomeContent() {
          const [activeTaskId, setActiveTaskId] = useState<string | null>(null)
          const [showTask, setShowTask] = useState(false)
          const [recentTasks, setRecentTasks] = useState<RecentTask[]>([])
          const [panelOpen, setPanelOpen] = useState(true)
          const [panelWidth, setPanelWidth] = useState(320)
          const [searchQuery, setSearchQuery] = useState('')
          const [activeFilter, setActiveFilter] = useState<FilterTab>('all')
          const isResizing = useRef(false)

          const handleMouseDown = useCallback(() => {
                    isResizing.current = true
                    document.body.style.cursor = 'col-resize'
                    document.body.style.userSelect = 'none'
                    const handleMouseMove = (e: MouseEvent) => {
                              if (!isResizing.current) return
                              const newWidth = window.innerWidth - e.clientX
                              setPanelWidth(Math.max(200, Math.min(600, newWidth)))
                    }
                    const handleMouseUp = () => {
                              isResizing.current = false
                              document.body.style.cursor = ''
                              document.body.style.userSelect = ''
                              document.removeEventListener('mousemove', handleMouseMove)
                              document.removeEventListener('mouseup', handleMouseUp)
                    }
                    document.addEventListener('mousemove', handleMouseMove)
                    document.addEventListener('mouseup', handleMouseUp)
          }, [])

          const fetchRecent = useCallback(() => {
                    fetch(getApiUrl('/api/rfp/recent'))
                              .then(r => r.ok ? r.json() : [])
                              .then((data: RecentTask[]) => setRecentTasks(data))
                              .catch(() => { })
          }, [])

          const handleStartNew = useCallback(() => {
                    setActiveTaskId(null)
                    setShowTask(true)
          }, [])

          const handleBackToHome = useCallback(() => {
                    setActiveTaskId(null)
                    setShowTask(false)
          }, [])

          useEffect(() => {
                    fetchRecent()
                    const interval = setInterval(fetchRecent, 30000)
                    return () => clearInterval(interval)
          }, [fetchRecent])

          // Listen for global new-session event dispatched by TopBar
          useEffect(() => {
                    const handler = () => handleStartNew()
                    window.addEventListener('mars:new-session', handler)
                    return () => window.removeEventListener('mars:new-session', handler)
          }, [handleStartNew])

          // Listen for global go-home event dispatched by TopBar home button
          useEffect(() => {
                    const handler = () => handleBackToHome()
                    window.addEventListener('mars:go-home', handler)
                    return () => window.removeEventListener('mars:go-home', handler)
          }, [handleBackToHome])

          const handleResume = useCallback((id: string) => {
                    setActiveTaskId(id)
                    setShowTask(true)
          }, [])

          const handleDelete = useCallback(async (id: string, e: React.MouseEvent) => {
                    e.stopPropagation()
                    if (!confirm('Delete this task? This will remove all data and files.')) return
                    try {
                              await fetch(getApiUrl(`/api/rfp/${id}`), { method: 'DELETE' })
                              setRecentTasks(prev => prev.filter(t => t.task_id !== id))
                              if (activeTaskId === id) {
                                        setActiveTaskId(null)
                                        setShowTask(false)
                              }
                    } catch { /* ignore */ }
          }, [activeTaskId])

          const filteredTasks = useMemo(() => {
                    let tasks = recentTasks
                    if (activeFilter !== 'all') {
                              tasks = tasks.filter(t => {
                                        if (activeFilter === 'running') return t.status === 'running' || t.status === 'pending' || t.status === 'executing'
                                        return t.status === activeFilter
                              })
                    }
                    if (searchQuery.trim()) {
                              const q = searchQuery.toLowerCase()
                              tasks = tasks.filter(t =>
                                        (t.task || '').toLowerCase().includes(q) ||
                                        t.task_id.toLowerCase().includes(q)
                              )
                    }
                    return tasks
          }, [recentTasks, activeFilter, searchQuery])

          const counts = useMemo(() => {
                    const all = recentTasks.length
                    const running = recentTasks.filter(t => t.status === 'running' || t.status === 'pending' || t.status === 'executing').length
                    const completed = recentTasks.filter(t => t.status === 'completed').length
                    const failed = recentTasks.filter(t => t.status === 'failed').length
                    return { all, running, completed, failed }
          }, [recentTasks])

          const filters: { key: FilterTab; label: string; count: number }[] = [
                    { key: 'all', label: 'All', count: counts.all },
                    { key: 'running', label: 'Running', count: counts.running },
                    { key: 'completed', label: 'Completed', count: counts.completed },
                    { key: 'failed', label: 'Failed', count: counts.failed },
          ]

          return (
                    <div className="flex h-full">

                              {/* Main content area */}
                              <div className="flex-1 min-h-0 overflow-auto flex flex-col">
                                        {showTask ? (
                                                  <RfpProposalTask
                                                            onBack={handleBackToHome}
                                                            resumeTaskId={activeTaskId}
                                                            key={activeTaskId || 'new'}
                                                  />
                                        ) : (
                                                  <HeroLanding onStart={handleStartNew} />
                                        )}
                              </div>

                              {/* Right Sessions panel */}
                              <div
                                        className="flex-shrink-0 border-l h-full flex flex-col relative"
                                        style={{
                                                  width: panelOpen ? `${panelWidth}px` : '40px',
                                                  backgroundColor: 'var(--mars-color-surface-raised)',
                                                  borderColor: 'var(--mars-color-border)',
                                                  transition: isResizing.current ? 'none' : 'width 0.3s',
                                        }}
                              >
                                        {/* Drag handle on left edge */}
                                        {panelOpen && (
                                                  <div
                                                            onMouseDown={handleMouseDown}
                                                            className="absolute left-0 top-0 bottom-0 w-1 cursor-col-resize z-20 hover:bg-[var(--mars-color-primary)]"
                                                            style={{ opacity: 0.5 }}
                                                  />
                                        )}
                                        {/* Left-edge collapse/expand tab */}
                                        <button
                                                  onClick={() => setPanelOpen(prev => !prev)}
                                                  className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-full z-10 w-5 h-10 flex items-center justify-center rounded-l-md border border-r-0 transition-colors hover:bg-[var(--mars-color-bg-hover)]"
                                                  style={{
                                                            backgroundColor: 'var(--mars-color-surface-raised)',
                                                            borderColor: 'var(--mars-color-border)',
                                                            color: 'var(--mars-color-text-secondary)',
                                                  }}
                                                  aria-label={panelOpen ? 'Collapse sessions' : 'Expand sessions'}
                                        >
                                                  {panelOpen ? <ChevronRight className="w-3 h-3" /> : <ChevronLeft className="w-3 h-3" />}
                                        </button>

                                        {panelOpen ? (
                                                  <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
                                                            {/* SESSIONS header */}
                                                            <div className="px-4 pb-3">
                                                                      <h3 className="text-xs font-semibold tracking-widest uppercase mb-3"
                                                                                style={{ color: 'var(--mars-color-text-secondary)' }}>
                                                                                Sessions
                                                                      </h3>

                                                                      {/* Search */}
                                                                      <div className="relative mb-3">
                                                                                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5"
                                                                                          style={{ color: 'var(--mars-color-text-tertiary)' }} />
                                                                                <input
                                                                                          type="text"
                                                                                          placeholder="Search sessions..."
                                                                                          value={searchQuery}
                                                                                          onChange={e => setSearchQuery(e.target.value)}
                                                                                          className="w-full pl-8 pr-3 py-1.5 text-xs rounded-md border outline-none transition-colors
                                                                                                    focus:border-[var(--mars-color-primary)]"
                                                                                          style={{
                                                                                                    backgroundColor: 'var(--mars-color-bg)',
                                                                                                    borderColor: 'var(--mars-color-border)',
                                                                                                    color: 'var(--mars-color-text)',
                                                                                          }}
                                                                                />
                                                                      </div>

                                                                      {/* Filter tabs */}
                                                                      <div className="flex gap-1">
                                                                                {filters.map(f => (
                                                                                          <button
                                                                                                    key={f.key}
                                                                                                    onClick={() => setActiveFilter(f.key)}
                                                                                                    className="px-2 py-1 text-[10px] font-medium rounded-md transition-colors"
                                                                                                    style={{
                                                                                                              backgroundColor: activeFilter === f.key
                                                                                                                        ? 'var(--mars-color-primary)'
                                                                                                                        : 'transparent',
                                                                                                              color: activeFilter === f.key
                                                                                                                        ? '#fff'
                                                                                                                        : 'var(--mars-color-text-secondary)',
                                                                                                    }}
                                                                                          >
                                                                                                    {f.label} ({f.count})
                                                                                          </button>
                                                                                ))}
                                                                      </div>
                                                            </div>

                                                            {/* Session list */}
                                                            <div className="flex-1 overflow-y-auto px-2 pb-2">
                                                                      {filteredTasks.length === 0 ? (
                                                                                <p className="px-3 py-6 text-xs text-center"
                                                                                          style={{ color: 'var(--mars-color-text-tertiary)' }}>
                                                                                          No sessions found.
                                                                                </p>
                                                                      ) : (
                                                                                filteredTasks.map(task => (
                                                                                          <button
                                                                                                    key={task.task_id}
                                                                                                    onClick={() => handleResume(task.task_id)}
                                                                                                    className="w-full text-left p-3 mb-1 rounded-lg transition-colors hover:bg-[var(--mars-color-bg-hover)] group"
                                                                                          >
                                                                                                    <div className="flex items-start gap-2.5">
                                                                                                              <div className="flex-shrink-0 mt-0.5">
                                                                                                                        <StatusIcon status={task.status} />
                                                                                                              </div>
                                                                                                              <div className="flex-1 min-w-0">
                                                                                                                        <p className="text-sm font-medium truncate"
                                                                                                                                  style={{ color: 'var(--mars-color-text)' }}>
                                                                                                                                  {task.task || 'RFP Proposal'}
                                                                                                                        </p>
                                                                                                                        <p className="text-[11px] mt-0.5"
                                                                                                                                  style={{ color: 'var(--mars-color-text-tertiary)' }}>
                                                                                                                                  {task.current_stage
                                                                                                                                            ? `Stage ${task.current_stage}: ${STAGE_NAMES[task.current_stage] || ''}`
                                                                                                                                            : task.status === 'completed' ? 'Proposal Completed' : 'Setup'}
                                                                                                                        </p>
                                                                                                                        {/* Progress bar */}
                                                                                                                        <div className="flex items-center gap-2 mt-2">
                                                                                                                                  <div className="flex-1 h-1.5 rounded-full overflow-hidden"
                                                                                                                                            style={{ backgroundColor: 'var(--mars-color-bg)' }}>
                                                                                                                                            <div
                                                                                                                                                      className="h-full rounded-full transition-all duration-500"
                                                                                                                                                      style={{
                                                                                                                                                                width: `${Math.round(task.progress_percent)}%`,
                                                                                                                                                                backgroundColor: getStatusColor(task.status),
                                                                                                                                                      }}
                                                                                                                                            />
                                                                                                                                  </div>
                                                                                                                                  <span className="text-[10px] font-medium w-8 text-right"
                                                                                                                                            style={{ color: getStatusColor(task.status) }}>
                                                                                                                                            {Math.round(task.progress_percent)}%
                                                                                                                                  </span>
                                                                                                                        </div>
                                                                                                                        {/* Date & start time */}
                                                                                                                        <p className="text-[10px] mt-1.5"
                                                                                                                                  style={{ color: 'var(--mars-color-text-tertiary)' }}>
                                                                                                                                  {formatDateTime(task.created_at)}
                                                                                                                        </p>
                                                                                                              </div>
                                                                                                              {/* Delete button */}
                                                                                                              <div
                                                                                                                        role="button"
                                                                                                                        tabIndex={0}
                                                                                                                        onClick={(e) => handleDelete(task.task_id, e)}
                                                                                                                        onKeyDown={(e) => { if (e.key === 'Enter') handleDelete(task.task_id, e as unknown as React.MouseEvent) }}
                                                                                                                        className="flex-shrink-0 p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity
                                                                                                                                  hover:bg-[var(--mars-color-danger-subtle,rgba(239,68,68,0.1))]"
                                                                                                                        title="Delete task"
                                                                                                              >
                                                                                                                        <X className="w-3 h-3" style={{ color: 'var(--mars-color-text-tertiary)' }} />
                                                                                                              </div>
                                                                                                    </div>
                                                                                          </button>
                                                                                ))
                                                                      )}
                                                            </div>

                                                            {/* Footer total */}
                                                            <div className="flex-shrink-0 px-4 py-2 border-t text-[10px]"
                                                                      style={{
                                                                                borderColor: 'var(--mars-color-border)',
                                                                                color: 'var(--mars-color-text-tertiary)',
                                                                      }}>
                                                                      {recentTasks.length} session{recentTasks.length !== 1 ? 's' : ''} total
                                                            </div>
                                                  </div>
                                        ) : (
                                                  <div className="flex-1 flex items-center justify-center overflow-hidden">
                                                            <span className="text-[10px] font-semibold tracking-widest uppercase select-none"
                                                                      style={{ color: 'var(--mars-color-text-secondary)', writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>
                                                                      Sessions
                                                            </span>
                                                  </div>
                                        )}
                              </div>
                    </div>
          )
}

export default function Home() {
          return <HomeContent />
}
