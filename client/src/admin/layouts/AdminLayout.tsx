import { useMemo, type PropsWithChildren } from 'react'
import { Menu, Settings, Users, LibraryBig, FileText, Image, Sticker, Palette, Droplets, LayoutTemplate, FlaskConical, PaintbrushVertical, LayoutPanelLeft } from 'lucide-react'
import { NavLink, useLocation } from 'react-router-dom'
import { Button, Sheet, SheetContent, SheetTrigger } from '../../components/ui'
import { useAuth } from '../../context/auth-context'
import { cn } from '../../lib/utils'

export function AdminLayout({ children }: PropsWithChildren) {
  const location = useLocation()
  const { user } = useAuth()

  const navItems = useMemo(
    () => [
      {
        label: 'Users',
        to: '/admin/users',
        icon: Users,
        description: 'Manage roles, invitations & status',
      },
      {
        label: 'Books',
        to: '/admin/books',
        icon: LibraryBig,
        description: 'Books, collaborations & assets',
      },
      {
        label: 'Pages',
        to: '/admin/pages',
        icon: FileText,
        description: 'Page progress & assignments',
      },
      {
        label: 'Background Images',
        to: '/admin/background-images',
        icon: Image,
        description: 'Manage & upload background images',
      },
      {
        label: 'Stickers',
        to: '/admin/stickers',
        icon: Sticker,
        description: 'Manage & upload stickers',
      },
      {
        label: 'Themes',
        to: '/admin/themes',
        icon: PaintbrushVertical,
        description: 'View & edit theme definitions',
      },
      {
        label: 'Color Palettes',
        to: '/admin/color-palettes',
        icon: Palette,
        description: 'View & edit color palettes',
      },
      {
        label: 'Layouts',
        to: '/admin/layouts',
        icon: LayoutPanelLeft,
        description: 'View & edit layout templates',
      },
      {
        label: 'Sandbox',
        to: '/admin/sandbox',
        icon: FlaskConical,
        description: 'Theme & palette export sandbox',
      },
    ],
    [],
  )

  const renderNav = (variant: 'desktop' | 'mobile') => (
    <nav className={cn('flex flex-1 flex-col gap-1 px-3 py-4', variant === 'desktop' ? 'pt-8' : 'pt-2')}>
      {navItems.map((item) => {
        const Icon = item.icon
        return (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              cn(
                'group rounded-lg px-3 py-2 transition-colors',
                isActive
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:bg-muted/80 hover:text-foreground',
              )
            }
          >
            {({ isActive }) => (
              <div className="flex items-center gap-3">
                {/* <div className="flex h-9 w-9 items-center justify-center rounded-md bg-background/70 text-foreground transition-colors group-hover:bg-background group-hover:text-foreground"> */}
                  <Icon className="h-6 w-6" />
                {/* </div> */}
                <div className="flex flex-col">
                  <span className="text-sm font-medium leading-tight">{item.label}</span>
                  <span
                    className={cn(
                      'text-xs',
                      isActive ? 'text-primary-foreground' : 'text-muted-foreground group-hover:text-muted-foreground/80',
                    )}
                  >
                    {item.description}
                  </span>
                </div>
              </div>
            )}
          </NavLink>
        )
      })}
    </nav>
  )

  const isSandbox = location.pathname.startsWith('/admin/sandbox');

  return (
    <div className="h-full min-h-0 overflow-hidden flex flex-col bg-muted/30 text-foreground">
      <div className={cn('grid w-full lg:grid-cols-[260px_1fr] min-h-0', isSandbox ? 'flex-1' : 'flex-1')}>
        <aside className="hidden border-r bg-background/90 lg:flex lg:flex-col lg:h-full lg:min-h-0 lg:overflow-y-auto">
          <div className="flex h-16 items-center gap-2 border-b px-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10 text-primary">
              <Settings className="h-6 w-6" />
            </div>
            <div>
              <div className="text-sm font-semibold">Admin Console</div>
              <div className="text-xs text-muted-foreground">Control center</div>
            </div>
          </div>
          {renderNav('desktop')}
        </aside>
        <div className="flex flex-col min-w-0 min-h-0 h-full">
          <header className="sticky top-0 z-30 border-b bg-background/80 backdrop-blur">
            <div className="flex h-16 items-center justify-between gap-3 px-4">
              <div className="flex items-center gap-2">
                <Sheet>
                  <SheetTrigger asChild>
                    <Button variant="ghost" size="icon" className="lg:hidden">
                      <Menu className="h-5 w-5" />
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="left" className="w-72 p-0">
                    <div className="border-b px-6 py-4">
                      <div className="text-sm font-semibold">Admin Console</div>
                      <div className="text-xs text-muted-foreground">Navigation</div>
                    </div>
                    {renderNav('mobile')}
                  </SheetContent>
                </Sheet>
                <div className="flex flex-col">
                  <span className="text-sm font-semibold">
                    {location.pathname.startsWith('/admin/users')
                      ? 'User Management'
                      : location.pathname.startsWith('/admin/books')
                        ? 'Book Management'
                        : location.pathname.startsWith('/admin/pages')
                          ? 'Page Status'
                          : location.pathname.startsWith('/admin/background-images')
                            ? 'Background Images'
                            : location.pathname.startsWith('/admin/stickers')
                              ? 'Stickers'
                              : location.pathname.startsWith('/admin/themes')
                                ? 'Themes'
                                : location.pathname.startsWith('/admin/color-palettes')
                                  ? 'Color Palettes'
                                  : location.pathname.startsWith('/admin/layouts')
                                    ? 'Layouts'
                                    : location.pathname.startsWith('/admin/sandbox')
                                      ? 'Sandbox'
                                      : 'Overview'}
                  </span>
                  <span className="text-xs text-muted-foreground">System-wide administration & monitoring</span>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Button variant="ghost" size="sm" className="hidden sm:inline-flex gap-2">
                  <Settings className="h-6 w-6" />
                  Settings
                </Button>
                {user ? (
                  <div className="flex items-center gap-3 rounded-full border bg-background px-3 py-1">
                    <div className="flex flex-col leading-tight">
                      <span className="text-xs font-semibold">{user.name}</span>
                      <span className="text-[11px] text-muted-foreground uppercase tracking-wide">{user.role}</span>
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          </header>
          <main className={`flex-1 flex flex-col min-h-0 min-w-0 ${location.pathname.startsWith('/admin/sandbox') ? 'overflow-hidden p-0' : 'overflow-y-auto bg-muted/20'}`}>
            {location.pathname.startsWith('/admin/sandbox') ? (
              <div className="flex-1 min-h-0 min-w-0 flex flex-col overflow-hidden">{children}</div>
            ) : (
              <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-6">{children}</div>
            )}
          </main>
        </div>
      </div>
    </div>
  )
}

