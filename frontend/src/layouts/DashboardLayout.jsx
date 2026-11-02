
import Sidebar from '../components/Sidebar'
import Header from '../components/Header'

export default function DashboardLayout({ children }) {
  return (
    <div className="flex min-h-screen bg-[#f7f7fa]">
      <div className="hidden lg:block">
        <Sidebar />
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        <Header />

        <main className="flex-1 px-5 py-7 sm:px-8 lg:px-10">
          <div className="mx-auto w-full max-w-[1500px]">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
