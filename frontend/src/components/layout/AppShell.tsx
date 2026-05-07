import { useEffect } from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import TopBar from './TopBar'
import { ErrorBoundary } from '@/components/common/ErrorBoundary'
import { useAppStore } from '@/store/useAppStore'

export default function AppShell() {
  const { sidebarCollapsed, toggleSidebar } = useAppStore()

  // Mobile: close sidebar on swipe-left or tap outside overlay
  useEffect(() => {
    const handleTouch = (e: TouchEvent) => {
      const target = e.target as HTMLElement
      // If sidebar is open and touch starts outside it, close it
      if (!sidebarCollapsed && !target.closest('aside')) {
        // Only on mobile widths
        if (window.innerWidth < 768) toggleSidebar()
      }
    }
    document.addEventListener('touchstart', handleTouch, { passive: true })
    return () => document.removeEventListener('touchstart', handleTouch)
  }, [sidebarCollapsed, toggleSidebar])

  return (
    <>
      {/* Skip to main content (keyboard accessibility) */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-[100] focus:px-4 focus:py-2 focus:bg-accent-cyan focus:text-bg-base focus:rounded-lg focus:text-sm focus:font-medium"
      >
        Skip to main content
      </a>
    <div className="flex h-screen overflow-hidden bg-bg-base">

      {/* Mobile overlay backdrop */}
      {!sidebarCollapsed && (
        <div
          className="md:hidden fixed inset-0 z-10 bg-black/40 backdrop-blur-sm"
          aria-hidden="true"
          onClick={toggleSidebar}
        />
      )}

      {/* Sidebar */}
      <div className={
        !sidebarCollapsed
          ? 'fixed md:relative z-20 h-full'
          : 'relative z-20 h-full'
      }>
        <Sidebar />
      </div>

      {/* Main content area */}
      <div className="flex flex-col flex-1 overflow-hidden min-w-0">
        <TopBar />
        <main
          id="main-content"
          aria-label="Main content"
          className="flex-1 overflow-y-auto p-4 lg:p-6"
        >
          <ErrorBoundary>
            <Outlet />
          </ErrorBoundary>
        </main>
      </div>
    </div>
    </>
  )
}
