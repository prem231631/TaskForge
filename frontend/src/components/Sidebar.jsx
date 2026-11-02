
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
    <aside className="flex h-screen w-64 shrink-0 flex-col bg-[#171722] px-5 py-6 text-white">
      <div className="mb-10 flex items-center gap-3 px-1">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#6755e8]">
          <Zap size={23} fill="white" />
        </div>

        <div>
          <h1 className="text-lg font-bold tracking-tight">TaskForge</h1>
          <p className="text-xs text-gray-400">Workspace platform</p>
        </div>
      </div>

      <button className="mb-8 flex items-center justify-between rounded-xl border border-white/10 bg-white/5 p-3 text-left transition hover:bg-white/10">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet-500/20 text-sm font-semibold text-violet-300">
            TF
          </div>

          <div>
            <p className="text-sm font-medium">My Workspace</p>
            <p className="text-xs text-gray-400">Free plan</p>
          </div>
        </div>

        <ChevronDown size={16} className="text-gray-400" />
      </button>

      <div className="flex-1">
        {navigation.map((group) => (
          <div key={group.title} className="mb-8">
            <p className="mb-3 px-3 text-[10px] font-semibold tracking-[0.16em] text-gray-500">
              {group.title}
            </p>

            <nav className="space-y-1">
              {group.items.map((item) => {
                const Icon = item.icon

                return (
                  <button
                    key={item.label}
                    className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition ${
                      item.active
                        ? 'bg-[#6755e8] font-medium text-white'
                        : 'text-gray-400 hover:bg-white/5 hover:text-white'
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

        <button className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-gray-400 transition hover:bg-white/5 hover:text-white">
          <Plus size={18} />
          Create workspace
        </button>
      </div>

      <div className="space-y-1 border-t border-white/10 pt-5">
        <button className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-gray-400 transition hover:bg-white/5 hover:text-white">
          <CircleHelp size={18} />
          Help & Support
        </button>

        <button className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-gray-400 transition hover:bg-white/5 hover:text-white">
          <Settings size={18} />
          Settings
        </button>
      </div>
    </aside>
  )
}
