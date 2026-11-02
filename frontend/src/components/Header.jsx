
import {
  Search,
  Bell,
  ChevronDown,
  Menu,
  Plus,
} from 'lucide-react'

export default function Header() {
  return (
    <header className="flex h-[76px] items-center justify-between border-b border-[#e9e9ef] bg-white px-8">
      <div className="flex items-center gap-4">
        <button
          className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 lg:hidden"
          aria-label="Open navigation"
        >
          <Menu size={21} />
        </button>

        <div className="relative hidden w-80 sm:block">
          <Search
            size={18}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          />

          <input
            type="search"
            placeholder="Search anything..."
            className="h-10 w-full rounded-lg border border-[#e9e9ef] bg-[#fafafd] pl-10 pr-4 text-sm outline-none transition placeholder:text-gray-400 focus:border-[#6755e8] focus:ring-2 focus:ring-violet-100"
          />

          <span className="absolute right-3 top-1/2 -translate-y-1/2 rounded border border-gray-200 px-1.5 py-0.5 text-[10px] text-gray-400">
            /
          </span>
        </div>
      </div>

      <div className="flex items-center gap-3 sm:gap-5">
        <button className="hidden items-center gap-2 rounded-lg bg-[#6755e8] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[#5140cc] sm:flex">
          <Plus size={17} />
          New Task
        </button>

        <button
          className="relative rounded-lg p-2 text-gray-500 transition hover:bg-gray-100"
          aria-label="Notifications"
        >
          <Bell size={20} />

          <span className="absolute right-2 top-2 h-2 w-2 rounded-full border-2 border-white bg-red-500" />
        </button>

        <div className="h-8 w-px bg-gray-200" />

        <button className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#e9e5ff] text-sm font-semibold text-[#6755e8]">
            PR
          </div>

          <div className="hidden text-left sm:block">
            <p className="text-sm font-semibold text-gray-800">
              Prem Raj
            </p>
            <p className="text-xs text-gray-400">
              Workspace member
            </p>
          </div>

          <ChevronDown
            size={15}
            className="hidden text-gray-400 sm:block"
          />
        </button>
      </div>
    </header>
  )
}
