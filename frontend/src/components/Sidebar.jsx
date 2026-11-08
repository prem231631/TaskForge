
import { useState } from 'react'

import {
  LayoutDashboard,
  CheckSquare,
  FolderKanban,
  Users,
  Settings,
  Plus,
  ChevronDown,
  Check,
  Zap,
  CircleHelp,
} from 'lucide-react'

import { useWorkspace } from '../context/useWorkspace'
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

function getWorkspaceInitials(name = '') {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word.charAt(0).toUpperCase())
    .join('') || 'WS'
}

export default function Sidebar() {
  const [isWorkspaceMenuOpen, setIsWorkspaceMenuOpen] = useState(false)

  const {
    workspaces,
    selectedWorkspace,
    selectedWorkspaceId,
    selectWorkspace,
    isLoading,
  } = useWorkspace()

  function handleWorkspaceSelect(workspaceId) {
    selectWorkspace(workspaceId)
    setIsWorkspaceMenuOpen(false)
  }

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

      <div className="task-sidebar__workspace-wrapper">
        <button
          type="button"
          className={`task-sidebar__workspace ${
            isWorkspaceMenuOpen
              ? 'task-sidebar__workspace--open'
              : ''
          }`}
          onClick={() =>
            setIsWorkspaceMenuOpen((current) => !current)
          }
          aria-expanded={isWorkspaceMenuOpen}
          aria-haspopup="listbox"
          aria-label="Select workspace"
        >
          <div className="task-sidebar__workspace-info">
            <div className="task-sidebar__workspace-avatar">
              {selectedWorkspace
                ? getWorkspaceInitials(selectedWorkspace.name)
                : 'WS'}
            </div>

            <div className="task-sidebar__workspace-text">
              <p className="task-sidebar__workspace-name">
                {isLoading
                  ? 'Loading workspaces...'
                  : selectedWorkspace?.name || 'No workspace'}
              </p>

              <p className="task-sidebar__workspace-plan">
                {selectedWorkspace?.role
                  ? selectedWorkspace.role === 'owner'
                    ? 'Workspace owner'
                    : 'Workspace member'
                  : 'Workspace'}
              </p>
            </div>
          </div>

          <ChevronDown
            size={16}
            className={`task-sidebar__workspace-chevron ${
              isWorkspaceMenuOpen
                ? 'task-sidebar__workspace-chevron--open'
                : ''
            }`}
          />
        </button>

        {isWorkspaceMenuOpen && (
          <div
            className="task-sidebar__workspace-menu"
            role="listbox"
            aria-label="Available workspaces"
          >
            <p className="task-sidebar__workspace-menu-heading">
              YOUR WORKSPACES
            </p>

            {isLoading ? (
              <p className="task-sidebar__workspace-empty">
                Loading your workspaces...
              </p>
            ) : workspaces.length > 0 ? (
              workspaces.map((workspace) => {
                const isSelected =
                  String(workspace.id) ===
                  String(selectedWorkspaceId)

                return (
                  <button
                    type="button"
                    key={workspace.id}
                    role="option"
                    aria-selected={isSelected}
                    className={`task-sidebar__workspace-option ${
                      isSelected
                        ? 'task-sidebar__workspace-option--active'
                        : ''
                    }`}
                    onClick={() =>
                      handleWorkspaceSelect(workspace.id)
                    }
                  >
                    <span className="task-sidebar__workspace-option-avatar">
                      {getWorkspaceInitials(workspace.name)}
                    </span>

                    <span className="task-sidebar__workspace-option-info">
                      <span className="task-sidebar__workspace-option-name">
                        {workspace.name}
                      </span>

                      <span className="task-sidebar__workspace-option-role">
                        {workspace.role === 'owner'
                          ? 'Owner'
                          : 'Member'}
                      </span>
                    </span>

                    {isSelected && (
                      <Check
                        size={16}
                        className="task-sidebar__workspace-option-check"
                      />
                    )}
                  </button>
                )
              })
            ) : (
              <p className="task-sidebar__workspace-empty">
                You haven't joined any workspaces yet.
              </p>
            )}
          </div>
        )}
      </div>

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
                    type="button"
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

        <button
          type="button"
          className="task-sidebar__nav-item"
          disabled
          title="Workspace creation will be available in the workspace management page."
        >
          <Plus size={18} />
          Create workspace
        </button>
      </div>

      <div className="task-sidebar__footer">
        <button type="button" className="task-sidebar__nav-item">
          <CircleHelp size={18} />
          Help & Support
        </button>

        <button type="button" className="task-sidebar__nav-item">
          <Settings size={18} />
          Settings
        </button>
      </div>
    </aside>
  )
}
