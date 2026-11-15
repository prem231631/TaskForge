
import {
  ArrowRight,
  ArrowUpRight,
  Bell,
  CalendarDays,
  Check,
  CheckCircle2,
  ClipboardCheck,
  Layers3,
  ListTodo,
  Moon,
  ShieldCheck,
  Sun,
  Users,
  Zap,
} from 'lucide-react'
import { Link, Navigate } from 'react-router-dom'

import { useAuth } from '../context/useAuth'
import { useTheme } from '../context/useTheme'

import './Home.css'

const features = [
  {
    icon: Layers3,
    title: 'Organized workspaces',
    description:
      'Create dedicated workspaces to keep projects, people, and tasks organized in one place.',
    number: '01',
  },
  {
    icon: ListTodo,
    title: 'Task management',
    description:
      'Create tasks, assign responsibilities, set priorities, and keep track of progress.',
    number: '02',
  },
  {
    icon: Users,
    title: 'Team collaboration',
    description:
      'Bring your team together with workspace membership and clear task ownership.',
    number: '03',
  },
  {
    icon: Bell,
    title: 'Activity notifications',
    description:
      'Stay informed about task assignments and workspace updates through notifications.',
    number: '04',
  },
]

const workflow = [
  {
    number: '01',
    title: 'Create a workspace',
    description:
      'Set up a dedicated space for your project or team.',
  },
  {
    number: '02',
    title: 'Bring your team in',
    description:
      'Add members and make responsibilities clear.',
  },
  {
    number: '03',
    title: 'Get work done',
    description:
      'Create tasks, track progress, and stay on top of deadlines.',
  },
]

function HomeLoading() {
  return (
    <main className="home-loading">
      <div className="home-loading__icon">
        <Zap size={25} fill="currentColor" />
      </div>
      <span className="home-loading__spinner" />
      <p>Preparing your workspace...</p>
    </main>
  )
}

export default function Home() {
  const { isAuthenticated, isLoading } = useAuth()
  const { theme, toggleTheme } = useTheme()

  if (isLoading) {
    return <HomeLoading />
  }

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />
  }

  return (
    <main className="home-page">
      <header className="home-header">
        <div className="home-header__inner">
          <Link to="/" className="home-brand" aria-label="TaskForge home">
            <span className="home-brand__icon">
              <Zap size={21} fill="currentColor" />
            </span>
            <span className="home-brand__name">TaskForge</span>
          </Link>

          <nav className="home-nav" aria-label="Main navigation">
            <a href="#features">Features</a>
            <a href="#workflow">How it works</a>
          </nav>

          <div className="home-header__actions">
            <button
              type="button"
              className="home-theme-toggle"
              onClick={toggleTheme}
              aria-label={
                theme === 'light'
                  ? 'Switch to dark theme'
                  : 'Switch to light theme'
              }
            >
              {theme === 'light' ? (
                <Moon size={19} />
              ) : (
                <Sun size={19} />
              )}
            </button>

            <Link to="/login" className="home-login-link">
              Sign in
            </Link>

            <Link to="/register" className="home-header__cta">
              Get started
              <ArrowUpRight size={16} />
            </Link>
          </div>
        </div>
      </header>

      <section className="home-hero">
        <div className="home-hero__inner">
          <div className="home-hero__content">
            <div className="home-eyebrow">
              <span className="home-eyebrow__dot" />
              A clearer way to work together
            </div>

            <h1>
              Turn team plans into
              <span> meaningful progress.</span>
            </h1>

            <p className="home-hero__description">
              TaskForge brings your workspaces, tasks, and team
              collaboration together. Organize the work, understand
              the priorities, and move forward with confidence.
            </p>

            <div className="home-hero__actions">
              <Link to="/register" className="home-button home-button--primary">
                Start building
                <ArrowRight size={18} />
              </Link>

              <a href="#features" className="home-button home-button--secondary">
                Explore features
              </a>
            </div>

            <div className="home-hero__trust">
              <span className="home-hero__trust-icon">
                <ShieldCheck size={17} />
              </span>
              <span>Designed for organized, focused teamwork</span>
            </div>
          </div>

          <div className="home-hero__visual">
            <div className="home-visual-glow" />

            <div className="home-dashboard-preview">
              <div className="home-preview__topbar">
                <div className="home-preview__brand">
                  <span className="home-preview__brand-icon">
                    <Zap size={13} fill="currentColor" />
                  </span>
                  TaskForge
                </div>
                <span className="home-preview__avatar">TF</span>
              </div>

              <div className="home-preview__body">
                <div className="home-preview__sidebar">
                  <span className="home-preview__side-active">
                    <Layers3 size={15} />
                  </span>
                  <span><ListTodo size={15} /></span>
                  <span><Users size={15} /></span>
                  <span><Bell size={15} /></span>
                </div>

                <div className="home-preview__main">
                  <div className="home-preview__heading">
                    <div>
                      <span className="home-preview__eyebrow">
                        WORKSPACE OVERVIEW
                      </span>
                      <h3>Good work starts here.</h3>
                    </div>
                    <span className="home-preview__status">
                      <span />
                      Active
                    </span>
                  </div>

                  <div className="home-preview__stats">
                    <div className="home-preview__stat">
                      <span>Total tasks</span>
                      <strong>24</strong>
                      <small><ClipboardCheck size={12} /> Organized</small>
                    </div>
                    <div className="home-preview__stat">
                      <span>In progress</span>
                      <strong>08</strong>
                      <small><Layers3 size={12} /> Underway</small>
                    </div>
                    <div className="home-preview__stat">
                      <span>Completed</span>
                      <strong>16</strong>
                      <small><CheckCircle2 size={12} /> Finished</small>
                    </div>
                  </div>

                  <div className="home-preview__task-panel">
                    <div className="home-preview__panel-heading">
                      <div>
                        <strong>Recent tasks</strong>
                        <span>Your team's latest activity</span>
                      </div>
                      <ArrowUpRight size={16} />
                    </div>

                    <div className="home-preview__task">
                      <span className="home-preview__task-check">
                        <Check size={12} />
                      </span>
                      <div>
                        <strong>Plan project milestones</strong>
                        <span>Project planning</span>
                      </div>
                      <span className="home-preview__task-tag home-preview__task-tag--done">
                        Done
                      </span>
                    </div>

                    <div className="home-preview__task">
                      <span className="home-preview__task-check home-preview__task-check--active" />
                      <div>
                        <strong>Prepare design review</strong>
                        <span>Design team</span>
                      </div>
                      <span className="home-preview__task-tag home-preview__task-tag--progress">
                        In progress
                      </span>
                    </div>

                    <div className="home-preview__task">
                      <span className="home-preview__task-check home-preview__task-check--active" />
                      <div>
                        <strong>Review team feedback</strong>
                        <span>Product planning</span>
                      </div>
                      <span className="home-preview__task-tag home-preview__task-tag--todo">
                        To do
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="home-floating-card home-floating-card--top">
              <span className="home-floating-card__icon">
                <CalendarDays size={18} />
              </span>
              <span>
                <strong>Stay on schedule</strong>
                <small>Keep deadlines in view</small>
              </span>
            </div>

            <div className="home-floating-card home-floating-card--bottom">
              <span className="home-floating-card__icon home-floating-card__icon--green">
                <CheckCircle2 size={18} />
              </span>
              <span>
                <strong>Progress, together</strong>
                <small>One team. Clear priorities.</small>
              </span>
            </div>
          </div>
        </div>

        <div className="home-hero__bottom">
          <span>PLAN WITH PURPOSE</span>
          <span className="home-hero__bottom-line" />
          <span>WORK WITH CLARITY</span>
          <span className="home-hero__bottom-line" />
          <span>MAKE PROGRESS</span>
        </div>
      </section>

      <section className="home-features" id="features">
        <div className="home-section-container">
          <div className="home-section-heading">
            <span className="home-section-eyebrow">THE TASKFORGE TOOLKIT</span>
            <h2>
              Everything your team needs
              <span> to stay in sync.</span>
            </h2>
            <p>
              A practical set of tools to organize responsibilities,
              coordinate people, and keep work moving.
            </p>
          </div>

          <div className="home-feature-grid">
            {features.map((feature) => {
              const Icon = feature.icon

              return (
                <article className="home-feature-card" key={feature.number}>
                  <div className="home-feature-card__top">
                    <span className="home-feature-card__icon">
                      <Icon size={22} />
                    </span>
                    <span className="home-feature-card__number">
                      {feature.number}
                    </span>
                  </div>

                  <h3>{feature.title}</h3>
                  <p>{feature.description}</p>

                  <span className="home-feature-card__line" />
                </article>
              )
            })}
          </div>
        </div>
      </section>

      <section className="home-workflow" id="workflow">
        <div className="home-section-container home-workflow__inner">
          <div className="home-workflow__intro">
            <span className="home-section-eyebrow">A SIMPLE WORKFLOW</span>
            <h2>
              Less confusion.
              <span> More momentum.</span>
            </h2>
            <p>
              Get your team organized with a straightforward workflow
              that keeps everyone focused on what matters.
            </p>

            <Link to="/register" className="home-text-link">
              Create your workspace
              <ArrowRight size={17} />
            </Link>
          </div>

          <div className="home-workflow__steps">
            {workflow.map((step) => (
              <article className="home-workflow-step" key={step.number}>
                <span className="home-workflow-step__number">
                  {step.number}
                </span>
                <div>
                  <h3>{step.title}</h3>
                  <p>{step.description}</p>
                </div>
                <ArrowUpRight
                  size={19}
                  className="home-workflow-step__arrow"
                />
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="home-cta">
        <div className="home-cta__inner">
          <div className="home-cta__decoration">
            <Zap size={42} />
          </div>

          <span className="home-section-eyebrow">YOUR NEXT CHAPTER STARTS HERE</span>
          <h2>
            Make room for
            <span> better teamwork.</span>
          </h2>
          <p>
            Bring your projects and people together with TaskForge.
          </p>

          <Link to="/register" className="home-button home-button--cta">
            Get started with TaskForge
            <ArrowRight size={18} />
          </Link>
        </div>
      </section>

      <footer className="home-footer">
        <div className="home-footer__inner">
          <Link to="/" className="home-brand">
            <span className="home-brand__icon">
              <Zap size={19} fill="currentColor" />
            </span>
            <span className="home-brand__name">TaskForge</span>
          </Link>

          <p>
            A clearer way to organize work and collaborate.
          </p>

          <div className="home-footer__right">
            <Link to="/login">Sign in</Link>
            <Link to="/register">Create account</Link>
            <span>© {new Date().getFullYear()} TaskForge</span>
          </div>
        </div>
      </footer>
    </main>
  )
}
