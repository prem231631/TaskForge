
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import './index.css'
import App from './App.jsx'

import { AuthProvider } from './context/AuthContext.jsx'
import { ThemeProvider } from './context/ThemeContext.jsx'
import { WorkspaceProvider } from './context/WorkspaceContext.jsx'
import { NotificationProvider } from './context/NotificationContext.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ThemeProvider>
      <AuthProvider>
        <NotificationProvider>
          <WorkspaceProvider>
            <App />
          </WorkspaceProvider>
        </NotificationProvider>
      </AuthProvider>
    </ThemeProvider>
  </StrictMode>,
)
