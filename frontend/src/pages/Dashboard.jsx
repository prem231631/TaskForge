import {
  CheckSquare,
  Clock3,
  FolderKanban,
  Users,
  Plus,
  ArrowUpRight,
  CalendarDays,
  Activity,
  CircleCheck,
} from 'lucide-react'

import DashboardLayout from '../layouts/DashboardLayout'
import StatCard from '../components/StatCard'
import TaskItem from '../components/TaskItem'

const sampleTasks = [
  {
    id: 1,
    title: 'Design the authentication flow',
    description: 'Prepare login and registration screens',
    status: 'in_progress',
    priority: 'high',
    due_date: '2026-11-04',
  },
  {
    id: 2,
    title: 'Set up project workspace',
    description: 'Configure workspace settings and members',
    status: 'done',
    priority: 'medium',
    due_date: '2026-11-02',
  },
  {
    id: 3,
    title: 'Build dashboard components',
    description: 'Create reusable dashboard UI components',
    status: 'todo',
    priority: 'medium',
    due_date: '2026-11-06',
  },
  {
    id: 4,
    title: 'Review API integration',
    description: 'Connect frontend services with backend endpoints',
    status: 'todo',
    priority: 'low',
    due_date: null,
  },
]

export default function Dashboard() {
  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Page heading */}
        <section className="flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
          <div>
            <p className="text-sm font-medium text-[#6755e8]">
              WORKSPACE OVERVIEW
            </p>

            <h1 className="mt-2 text-2xl font-bold tracking-tight text-[#20202a] sm:text-3xl">
              Dashboard
            </h1>

            <p className="mt-2 text-sm text-gray-500">
              Here's what's happening with your workspace today.
            </p>
          </div>

          <button className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#6755e8] px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-violet-200 transition hover:-translate-y-0.5 hover:bg-[#5140cc]">
            <Plus size={18} />
            Create new task
          </button>
        </section>

        {/* Statistics */}
        <section className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            title="Total Tasks"
            value="24"
            change="+12%"
            description="from last month"
            icon={CheckSquare}
          />

          <StatCard
            title="In Progress"
            value="08"
            change="+4%"
            description="from last month"
            icon={Clock3}
          />

          <StatCard
            title="Projects"
            value="06"
            change="+2"
            description="new this month"
            icon={FolderKanban}
          />

          <StatCard
            title="Team Members"
            value="12"
            change="+3"
            description="new members"
            icon={Users}
          />
        </section>

        {/* Main content */}
        <section className="grid grid-cols-1 gap-6 xl:grid-cols-3">
          {/* Task list */}
          <div className="overflow-hidden rounded-2xl border border-[#e9e9ef] bg-white xl:col-span-2">
            <div className="flex items-center justify-between border-b border-[#f0f0f4] px-5 py-5 sm:px-6">
              <div>
                <h2 className="text-base font-semibold text-[#20202a]">
                  Recent Tasks
                </h2>

                <p className="mt-1 text-xs text-gray-400">
                  A quick look at your latest activities
                </p>
              </div>

              <button className="flex items-center gap-1 text-sm font-medium text-[#6755e8] transition hover:text-[#5140cc]">
                View all
                <ArrowUpRight size={16} />
              </button>
            </div>

            <div>
              {sampleTasks.map((task) => (
                <TaskItem key={task.id} task={task} />
              ))}
            </div>

            <div className="border-t border-[#f0f0f4] px-5 py-4 text-center sm:px-6">
              <button className="text-sm font-medium text-gray-500 transition hover:text-[#6755e8]">
                View all tasks
              </button>
            </div>
          </div>

          {/* Right column */}
          <div className="space-y-6">
            {/* Progress card */}
            <div className="rounded-2xl border border-[#e9e9ef] bg-white p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-semibold text-[#20202a]">
                    Task Progress
                  </h2>

                  <p className="mt-1 text-xs text-gray-400">
                    Overall completion
                  </p>
                </div>

                <Activity size={20} className="text-[#6755e8]" />
              </div>

              <div className="mt-7 flex items-end justify-between">
                <h3 className="text-4xl font-bold tracking-tight text-[#20202a]">
                  68%
                </h3>

                <span className="mb-1 text-xs font-medium text-emerald-600">
                  On track
                </span>
              </div>

              <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-[#f0efff]">
                <div className="h-full w-[68%] rounded-full bg-[#6755e8]" />
              </div>

              <div className="mt-5 flex justify-between text-xs text-gray-400">
                <span>Completed tasks</span>
                <span>16 of 24</span>
              </div>
            </div>

            {/* Weekly summary */}
            <div className="rounded-2xl border border-[#e9e9ef] bg-white p-6">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                  <CircleCheck size={21} />
                </div>

                <div>
                  <h2 className="text-base font-semibold text-[#20202a]">
                    Weekly Summary
                  </h2>

                  <p className="text-xs text-gray-400">
                    Your productivity snapshot
                  </p>
                </div>
              </div>

              <div className="mt-6 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">
                    Tasks completed
                  </span>

                  <span className="text-sm font-semibold text-[#20202a]">
                    12
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">
                    Upcoming deadlines
                  </span>

                  <span className="text-sm font-semibold text-[#20202a]">
                    05
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">
                    Active projects
                  </span>

                  <span className="text-sm font-semibold text-[#20202a]">
                    03
                  </span>
                </div>
              </div>
            </div>

            {/* Upcoming activity */}
            <div className="rounded-2xl border border-[#e9e9ef] bg-white p-6">
              <div className="flex items-center gap-2">
                <CalendarDays size={19} className="text-[#6755e8]" />

                <h2 className="text-base font-semibold text-[#20202a]">
                  Upcoming
                </h2>
              </div>

              <div className="mt-5 rounded-xl bg-[#f8f7ff] p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-[#6755e8]">
                  November 04
                </p>

                <p className="mt-2 text-sm font-medium text-gray-800">
                  Authentication flow design
                </p>

                <p className="mt-1 text-xs text-gray-400">
                  Task deadline
                </p>
              </div>

              <div className="mt-3 rounded-xl bg-[#fafafd] p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                  November 06
                </p>

                <p className="mt-2 text-sm font-medium text-gray-800">
                  Dashboard components
                </p>

                <p className="mt-1 text-xs text-gray-400">
                  Task deadline
                </p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </DashboardLayout>
  )
}