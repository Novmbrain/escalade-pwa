'use client'

import { useRouter } from 'next/navigation'
import { ChevronLeft, User, Settings, Info, LogIn } from 'lucide-react'
import { AppTabbar } from '@/components/app-tabbar'

export default function ProfilePage() {
  const router = useRouter()

  const menuItems = [
    { icon: LogIn, label: '登录 / 注册', description: '登录后可发表评论' },
    { icon: Settings, label: '设置', description: '应用设置与偏好' },
    { icon: Info, label: '关于', description: '关于罗源野抱 TOPO' },
  ]

  return (
    <div className="flex flex-col min-h-screen bg-[var(--m3-surface)]">
      {/* 头部 */}
      <header className="pt-12 px-4 pb-6">
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => router.back()}
            className="w-10 h-10 rounded-full bg-[var(--m3-surface-variant)] flex items-center justify-center"
          >
            <ChevronLeft className="w-5 h-5 text-[var(--m3-on-surface)]" />
          </button>
          <h1 className="text-2xl font-bold text-[var(--m3-on-surface)]">我的</h1>
        </div>

        {/* 用户信息卡片 */}
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-[var(--m3-surface-variant)] flex items-center justify-center">
              <User className="w-8 h-8 text-[var(--m3-on-surface-variant)]" />
            </div>
            <div>
              <p className="text-lg font-semibold text-[var(--m3-on-surface)]">
                未登录
              </p>
              <p className="text-sm text-[var(--m3-on-surface-variant)]">
                点击登录以解锁更多功能
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* 菜单列表 */}
      <main className="flex-1 px-4 pb-20">
        <div className="space-y-2">
          {menuItems.map((item, index) => {
            const Icon = item.icon
            return (
              <button
                key={index}
                className="w-full flex items-center gap-4 p-4 bg-white rounded-xl shadow-sm hover:shadow-md transition-all active:scale-[0.98]"
              >
                <div className="w-10 h-10 rounded-full bg-[var(--m3-primary-container)] flex items-center justify-center">
                  <Icon className="w-5 h-5 text-[var(--m3-primary)]" />
                </div>
                <div className="flex-1 text-left">
                  <p className="text-base font-medium text-[var(--m3-on-surface)]">
                    {item.label}
                  </p>
                  <p className="text-xs text-[var(--m3-on-surface-variant)]">
                    {item.description}
                  </p>
                </div>
              </button>
            )
          })}
        </div>

        {/* 版本信息 */}
        <div className="mt-8 text-center">
          <p className="text-xs text-[var(--m3-outline)]">罗源野抱 TOPO v1.0.0</p>
          <p className="text-xs text-[var(--m3-outline)] mt-1">
            福州罗源攀岩线路分享
          </p>
        </div>
      </main>

      {/* 底部导航栏 */}
      <AppTabbar />
    </div>
  )
}
