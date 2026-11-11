
import { useState } from 'react'
import {
  Search,
  Bell,
  ChevronDown,
  Menu,
  Plus,
  Sun,
  Moon,
  LogOut,
  UserRound,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'

import { useTheme } from '../context/useTheme'
import { useAuth } from '../context/useAuth'
import './Header.css'

export default function Header() {
  const { theme, toggleTheme } = useTheme()
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const [isProfileOpen, setIsProfileOpen] = useState(false)

  const fullName = user?.full_name || user?.name || 'TaskForge User'

  const initials = fullName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join('')

  function handleLogout() {
    logout()
    setIsProfileOpen(false)
    navigate('/login', { replace: true })
  }

  function handleAccount() {
    setIsProfileOpen(false)
    navigate('/profile')
  }

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

        <div className="dashboard-header__profile-wrapper">
          <button
            className="dashboard-header__profile"
            type="button"
            aria-label="User profile menu"
            aria-expanded={isProfileOpen}
            onClick={() => setIsProfileOpen((previous) => !previous)}
          >
            <div className="dashboard-header__avatar">
              {initials || 'TF'}
            </div>

            <div className="dashboard-header__profile-info">
              <p className="dashboard-header__profile-name">
                {fullName}
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

          {isProfileOpen && (
            <div className="dashboard-header__dropdown">
              <div className="dashboard-header__dropdown-user">
                <div className="dashboard-header__dropdown-name">
                  {fullName}
                </div>

                <div className="dashboard-header__dropdown-email">
                  {user?.email || ''}
                </div>
              </div>

              <div className="dashboard-header__dropdown-divider" />

              <button
                className="dashboard-header__dropdown-item"
                type="button"
                onClick={handleAccount}
              >
                <UserRound size={17} />
                Account
              </button>

              <button
                className="dashboard-header__dropdown-item dashboard-header__dropdown-logout"
                type="button"
                onClick={handleLogout}
              >
                <LogOut size={17} />
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
