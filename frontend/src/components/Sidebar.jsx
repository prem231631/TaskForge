import {
  LayoutDashboard,
  CheckSquare,
  FolderKanban,
  Users,
  Settings,
  Plus,
  ChevronDown,
  Zap,
  CircleHelp,
} from 'lucide-react'

import './Sidebar.css'

const navigation = [
  {
    title: 'WORKSPACE',
    items: [
      { label: 'Overview', icon: LayoutDashboard, active: true },
      { label: 'My Tasks', icon: CheckSquare },
      { label: 'Projects', icon: FolderKanban },
      { label: 'Members', icon: Users },
    ],
  },
]

export default function Sidebar() {
  return (
    <aside className="task-sidebar">
      <div className="task-sidebar__brand">
        <div className="task-sidebar__brand-icon">
          <Zap size={23} fill="white" />
        </div>

        <div>
          <h1>TaskForge</h1>
          <p>Workspace platform</p>
        </div>
      </div>

      <button className="task-sidebar__workspace">
        <div className="task-sidebar__workspace-info">
          <div className="task-sidebar__workspace-avatar">
            TF
          </div>

          <div>
            <p className="task-sidebar__workspace-name">
              My Workspace
            </p>
            <p className="task-sidebar__workspace-plan">
              Free plan
            </p>
          </div>
        </div>

        <ChevronDown
          size={16}
          className="task-sidebar__workspace-chevron"
        />
      </button>

      <div className="task-sidebar__navigation">
        {navigation.map((group) => (
          <div key={group.title} className="task-sidebar__group">
            <p className="task-sidebar__group-title">
              {group.title}
            </p>

            <nav className="task-sidebar__nav-list">
              {group.items.map((item) => {
                const Icon = item.icon

                return (
                  <button
                    key={item.label}
                    className={`task-sidebar__nav-item ${
                      item.active
                        ? 'task-sidebar__nav-item--active'
                        : ''
                    }`}
                  >
                    <Icon size={18} />
                    {item.label}
                  </button>
                )
              })}
            </nav>
          </div>
        ))}

        <button className="task-sidebar__nav-item">
          <Plus size={18} />
          Create workspace
        </button>
      </div>

      <div className="task-sidebar__footer">
        <button className="task-sidebar__nav-item">
          <CircleHelp size={18} />
          Help & Support
        </button>

        <button className="task-sidebar__nav-item">
          <Settings size={18} />
          Settings
        </button>
      </div>
    </aside>
  )
}