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

import './Dashboard.css'

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
      <div className="dashboard-page">
        <section className="dashboard-page__heading">
          <div>
            <p className="dashboard-page__eyebrow">
              WORKSPACE OVERVIEW
            </p>

            <h1 className="dashboard-page__title">
              Dashboard
            </h1>

            <p className="dashboard-page__subtitle">
              Here's what's happening with your workspace today.
            </p>
          </div>

          <button
            className="dashboard-page__primary-button"
            type="button"
          >
            <Plus size={18} />
            Create new task
          </button>
        </section>

        <section className="dashboard-page__stats">
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

        <section className="dashboard-page__content-grid">
          <div className="dashboard-panel">
            <div className="dashboard-panel__header">
              <div>
                <h2 className="dashboard-panel__heading">
                  Recent Tasks
                </h2>

                <p className="dashboard-panel__description">
                  A quick look at your latest activities
                </p>
              </div>

              <button
                className="dashboard-panel__link"
                type="button"
              >
                View all
                <ArrowUpRight size={16} />
              </button>
            </div>

            <div>
              {sampleTasks.map((task) => (
                <TaskItem key={task.id} task={task} />
              ))}
            </div>

            <div className="dashboard-panel__footer">
              <button
                className="dashboard-panel__footer-button"
                type="button"
              >
                View all tasks
              </button>
            </div>
          </div>

          <div className="dashboard-page__side-column">
            <section className="dashboard-widget">
              <div className="dashboard-widget__header">
                <div>
                  <h2 className="dashboard-widget__title">
                    Task Progress
                  </h2>

                  <p className="dashboard-widget__subtitle">
                    Overall completion
                  </p>
                </div>

                <Activity
                  size={20}
                  className="dashboard-widget__icon"
                />
              </div>

              <div className="dashboard-progress__summary">
                <h3 className="dashboard-progress__percentage">
                  68%
                </h3>

                <span className="dashboard-progress__status">
                  On track
                </span>
              </div>

              <div
                className="dashboard-progress__track"
                role="progressbar"
                aria-label="Task completion"
                aria-valuenow={68}
                aria-valuemin={0}
                aria-valuemax={100}
              >
                <div className="dashboard-progress__bar" />
              </div>

              <div className="dashboard-progress__footer">
                <span>Completed tasks</span>
                <span>16 of 24</span>
              </div>
            </section>

            <section className="dashboard-widget">
              <div className="dashboard-summary__heading">
                <div className="dashboard-summary__icon">
                  <CircleCheck size={21} />
                </div>

                <div>
                  <h2 className="dashboard-widget__title">
                    Weekly Summary
                  </h2>

                  <p className="dashboard-widget__subtitle">
                    Your productivity snapshot
                  </p>
                </div>
              </div>

              <div className="dashboard-summary__list">
                <div className="dashboard-summary__row">
                  <span className="dashboard-summary__label">
                    Tasks completed
                  </span>

                  <span className="dashboard-summary__value">
                    12
                  </span>
                </div>

                <div className="dashboard-summary__row">
                  <span className="dashboard-summary__label">
                    Upcoming deadlines
                  </span>

                  <span className="dashboard-summary__value">
                    05
                  </span>
                </div>

                <div className="dashboard-summary__row">
                  <span className="dashboard-summary__label">
                    Active projects
                  </span>

                  <span className="dashboard-summary__value">
                    03
                  </span>
                </div>
              </div>
            </section>

            <section className="dashboard-widget">
              <div className="dashboard-upcoming__heading">
                <CalendarDays
                  size={19}
                  className="dashboard-upcoming__heading-icon"
                />

                <h2 className="dashboard-widget__title">
                  Upcoming
                </h2>
              </div>

              <div className="dashboard-upcoming__item dashboard-upcoming__item--highlight">
                <p className="dashboard-upcoming__date">
                  November 04
                </p>

                <p className="dashboard-upcoming__task">
                  Authentication flow design
                </p>

                <p className="dashboard-upcoming__type">
                  Task deadline
                </p>
              </div>

              <div className="dashboard-upcoming__item">
                <p className="dashboard-upcoming__date dashboard-upcoming__date--muted">
                  November 06
                </p>

                <p className="dashboard-upcoming__task">
                  Dashboard components
                </p>

                <p className="dashboard-upcoming__type">
                  Task deadline
                </p>
              </div>
            </section>
          </div>
        </section>
      </div>
    </DashboardLayout>
  )
}