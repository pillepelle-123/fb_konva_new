import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/auth-context';
import { Button } from '../ui/primitives/button';
import { BookOpen, Home, Archive, LogOut, User, Menu, Image } from 'lucide-react';
import { useState } from 'react';

export default function Navigation() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const isActive = (path: string) => location.pathname === path;

  const navItems = user ? [
    { path: '/dashboard', label: 'Dashboard', icon: Home },
    { path: '/books', label: 'My Books', icon: BookOpen },
    { path: '/photos', label: 'Photos', icon: Image },
    { path: '/books/archive', label: 'Archive', icon: Archive },
  ] : [
    { path: '/', label: 'Home', icon: Home },
    { path: '/login', label: 'Login', icon: User },
    { path: '/register', label: 'Register', icon: User },
  ];

  return (
    <nav className="border-b bg-primary sticky top-0 z-50">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link to={user ? '/dashboard' : '/'} className="flex items-center space-x-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white">
              <BookOpen className="h-5 w-5 text-primary" />
            </div>
            <span className="text-xl font-semibold text-white">freundebuch.io</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-4">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link key={item.path} to={item.path}>
                  <Button
                    variant={isActive(item.path) ? "secondary" : "ghost"}
                    size="sm"
                    className={`flex items-center space-x-2 ${
                      isActive(item.path) 
                        ? 'bg-white text-primary hover:bg-white/90 hover:text-primary' 
                        : 'text-white hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{item.label}</span>
                  </Button>
                </Link>
              );
            })}
          </div>

          {/* User Section */}
          <div className="hidden md:flex items-center space-x-4">
            {user && (
              <>
                <div className="flex items-center space-x-2 text-sm text-white/80">
                  <User className="h-4 w-4" />
                  <span>{user.name}</span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={logout}
                  className="flex items-center space-x-2 text-white hover:bg-white/10 hover:text-white"
                >
                  <LogOut className="h-4 w-4" />
                  <span>Logout</span>
                </Button>
              </>
            )}
          </div>

          {/* Mobile Menu Button */}
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden text-white hover:bg-white/10"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            <Menu className="h-5 w-5" />
          </Button>
        </div>

        {/* Mobile Navigation */}
        {isMobileMenuOpen && (
          <div className="md:hidden border-t border-white/20 py-4 space-y-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <Button
                    variant={isActive(item.path) ? "default" : "ghost"}
                    className={`w-full justify-start space-x-2 ${
                      isActive(item.path) 
                        ? 'bg-white text-primary hover:bg-white/90 hover:text-primary' 
                        : 'text-white hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{item.label}</span>
                  </Button>
                </Link>
              );
            })}
            {user && (
              <div className="pt-4 border-t">
                <div className="px-4 py-2 text-sm text-white/80 flex items-center space-x-2">
                  <User className="h-4 w-4" />
                  <span>{user.name}</span>
                </div>
                <Button
                  variant="ghost"
                  className="w-full justify-start space-x-2 text-white hover:bg-white/10 hover:text-white"
                  onClick={() => {
                    logout();
                    setIsMobileMenuOpen(false);
                  }}
                >
                  <LogOut className="h-4 w-4" />
                  <span>Logout</span>
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </nav>
  );
}