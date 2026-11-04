import Sidebar from '../components/Sidebar'
import Header from '../components/Header'
import './DashboardLayout.css'

export default function DashboardLayout({ children }) {
  return (
    <div className="dashboard-layout">
      <div className="dashboard-layout__sidebar">
        <Sidebar />
      </div>

      <div className="dashboard-layout__main">
        <Header />

        <main className="dashboard-layout__content">
          <div className="dashboard-layout__content-inner">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}