import {
  Search,
  Bell,
  ChevronDown,
  Menu,
  Plus,
  Sun,
  Moon,
} from 'lucide-react'

import { useTheme } from '../context/ThemeContext'
import './Header.css'

export default function Header() {
  const { theme, toggleTheme } = useTheme()

  return (
    <header className="dashboard-header">
      <div className="dashboard-header__left">
        <button
          className="dashboard-header__mobile-menu"
          aria-label="Open navigation"
          type="button"
        >
          <Menu size={21} />
        </button>

        <div className="dashboard-header__search">
          <Search
            size={18}
            className="dashboard-header__search-icon"
          />

          <input
            type="search"
            placeholder="Search anything..."
            aria-label="Search"
          />

          <span className="dashboard-header__shortcut">
            /
          </span>
        </div>
      </div>

      <div className="dashboard-header__right">
        <button
          className="dashboard-header__new-task"
          type="button"
        >
          <Plus size={17} />
          New Task
        </button>

        <button
          className="dashboard-header__icon-button"
          type="button"
          aria-label={
            theme === 'light'
              ? 'Switch to dark theme'
              : 'Switch to light theme'
          }
          onClick={toggleTheme}
        >
          {theme === 'light' ? (
            <Moon size={19} />
          ) : (
            <Sun size={19} />
          )}
        </button>

        <button
          className="dashboard-header__icon-button"
          type="button"
          aria-label="Notifications"
        >
          <Bell size={20} />
          <span className="dashboard-header__notification-dot" />
        </button>

        <div className="dashboard-header__divider" />

        <button
          className="dashboard-header__profile"
          type="button"
          aria-label="User profile"
        >
          <div className="dashboard-header__avatar">
            PR
          </div>

          <div className="dashboard-header__profile-info">
            <p className="dashboard-header__profile-name">
              Prem Raj
            </p>
            <p className="dashboard-header__profile-role">
              Workspace member
            </p>
          </div>

          <ChevronDown
            size={15}
            className="dashboard-header__profile-chevron"
          />
        </button>
      </div>
    </header>
  )
}