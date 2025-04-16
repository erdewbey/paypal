import { useAuth } from "@/hooks/use-auth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import NotificationsDropdown from "@/components/notifications-dropdown";
import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import {
  Home,
  RefreshCw,
  Wallet,
  History,
  User,
  Settings,
  LogOut,
  X,
  Users,
  LineChart,
  BarChart4,
  Menu,
  ChevronLeft,
  Store
} from "lucide-react";

interface SidebarProps {
  isMobile: boolean;
  showMobileSidebar: boolean;
  onCloseMobileSidebar: () => void;
  onToggleMobileSidebar?: () => void;
  activePage?: string;
  setShowMobileSidebar?: (show: boolean) => void;
}

export default function Sidebar({
  isMobile,
  showMobileSidebar,
  onCloseMobileSidebar,
  onToggleMobileSidebar,
  setShowMobileSidebar,
  activePage = "dashboard"
}: SidebarProps) {
  const { user, logoutMutation } = useAuth();
  const [location] = useLocation();

  const NavItem = ({ href, icon, children, isActive, onClick }: { 
    href: string; 
    icon: React.ReactNode; 
    children: React.ReactNode; 
    isActive?: boolean;
    onClick?: () => void;
  }) => {
    const handleClick = () => {
      if (typeof onClick === 'function') {
        onClick();
      }
    };
    
    return (
      <Link href={href}>
        <div
          className={cn(
            "group flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors duration-150 cursor-pointer",
            isActive
              ? "bg-primary-50 text-primary-700"
              : "text-gray-700 hover:bg-gray-50 hover:text-gray-900"
          )}
          onClick={handleClick}
        >
          <div className={cn(
            "mr-3 flex-shrink-0",
            isActive ? "text-primary-500" : "text-gray-500 group-hover:text-gray-500"
          )}>
            {icon}
          </div>
          <span className="truncate">{children}</span>
        </div>
      </Link>
    );
  };

  const renderSidebarContent = () => (
    <>
      <div className="flex flex-col flex-grow pt-5 pb-4 overflow-y-auto">
        <div className="flex items-center flex-shrink-0 px-4 mb-5">
          <div className="h-10 w-10 rounded bg-primary-700 flex items-center justify-center text-white">
            <RefreshCw size={20} />
          </div>
          <span className="ml-3 font-bold text-lg text-primary-600">ebupay</span>
          
          {isMobile && (
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={onCloseMobileSidebar}
              className="ml-auto rounded-md text-gray-500 hover:text-gray-700"
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
          )}
        </div>
        
        {/* User info */}
        <div className="px-4 mb-6">
          <div className="bg-gray-50 rounded-lg p-3 flex items-center space-x-3">
            <Avatar className="h-10 w-10 flex-shrink-0">
              <AvatarImage src={`https://ui-avatars.com/api/?name=${user?.firstName}+${user?.lastName}`} />
              <AvatarFallback>{user?.firstName?.[0]}{user?.lastName?.[0]}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">
                {user?.firstName} {user?.lastName}
              </p>
              <p className="text-xs text-gray-500 truncate">{user?.email}</p>
            </div>
            
            <div className="flex-shrink-0">
              <NotificationsDropdown />
            </div>
          </div>
        </div>
        
        {/* Navigation */}
        <nav className="mt-2 flex-1 px-2 space-y-1">
          <NavItem 
            href="/dashboard" 
            icon={<Home size={20} />} 
            isActive={activePage === "dashboard" || location === "/dashboard"}
            onClick={isMobile ? onCloseMobileSidebar : undefined}
          >
            Dashboard
          </NavItem>
          <NavItem 
            href="/convert" 
            icon={<RefreshCw size={20} />} 
            isActive={activePage === "convert"}
            onClick={isMobile ? onCloseMobileSidebar : undefined}
          >
            Dönüştür
          </NavItem>
          <NavItem 
            href="/wallet" 
            icon={<Wallet size={20} />} 
            isActive={activePage === "wallet"}
            onClick={isMobile ? onCloseMobileSidebar : undefined}
          >
            Cüzdan
          </NavItem>
          <NavItem 
            href="/history" 
            icon={<History size={20} />} 
            isActive={activePage === "history"}
            onClick={isMobile ? onCloseMobileSidebar : undefined}
          >
            İşlem Geçmişi
          </NavItem>
          <NavItem 
            href="/profile" 
            icon={<User size={20} />} 
            isActive={activePage === "profile"}
            onClick={isMobile ? onCloseMobileSidebar : undefined}
          >
            Profil
          </NavItem>
          
          {/* Admin links */}
          {user?.isAdmin && (
            <>
              <div className="pt-4 mt-4 border-t border-gray-200">
                <h3 className="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Admin
                </h3>
              </div>
              <NavItem 
                href="/admin" 
                icon={<BarChart4 size={20} />} 
                isActive={activePage === "admin-dashboard" || location === "/admin"}
                onClick={isMobile ? onCloseMobileSidebar : undefined}
              >
                Kontrol Paneli
              </NavItem>
              <NavItem 
                href="/admin/users" 
                icon={<Users size={20} />} 
                isActive={activePage === "admin-users"}
                onClick={isMobile ? onCloseMobileSidebar : undefined}
              >
                Kullanıcılar
              </NavItem>
              <NavItem 
                href="/admin/transactions" 
                icon={<History size={20} />} 
                isActive={activePage === "admin-transactions"}
                onClick={isMobile ? onCloseMobileSidebar : undefined}
              >
                İşlemler
              </NavItem>
              <NavItem 
                href="/admin/identity-verification" 
                icon={<User size={20} />} 
                isActive={activePage === "admin-identity-verification"}
                onClick={isMobile ? onCloseMobileSidebar : undefined}
              >
                Kimlik Doğrulama
              </NavItem>
              <NavItem 
                href="/admin/rates" 
                icon={<LineChart size={20} />} 
                isActive={activePage === "admin-rates"}
                onClick={isMobile ? onCloseMobileSidebar : undefined}
              >
                Kurlar
              </NavItem>
              <NavItem 
                href="/admin/payment-accounts" 
                icon={<Wallet size={20} />} 
                isActive={activePage === "admin-payment-accounts"}
                onClick={isMobile ? onCloseMobileSidebar : undefined}
              >
                Ödeme Hesapları
              </NavItem>
            </>
          )}
        </nav>
      </div>
      
      {/* Logout button */}
      <div className="flex-shrink-0 border-t border-gray-200 p-4">
        <Button 
          variant="outline" 
          className="flex items-center justify-center w-full text-sm font-medium"
          onClick={() => logoutMutation.mutate()}
          disabled={logoutMutation.isPending}
        >
          <LogOut className="mr-2 h-4 w-4" />
          Çıkış Yap
        </Button>
      </div>
    </>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex lg:flex-shrink-0 transition-all duration-300">
        <div className="flex flex-col w-64 border-r border-gray-200 bg-white">
          {renderSidebarContent()}
        </div>
      </aside>

      {/* Mobile navbar */}
      {isMobile && (
        <div className="fixed top-0 left-0 right-0 z-20 bg-white shadow-md h-16 flex items-center px-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              className="text-gray-600"
              onClick={() => {
                if (typeof setShowMobileSidebar === 'function') {
                  setShowMobileSidebar(true);
                } else if (typeof onToggleMobileSidebar === 'function') {
                  onToggleMobileSidebar();
                }
              }}
            >
              <Menu className="h-6 w-6" />
            </Button>
            
            <div className="flex items-center">
              <div className="h-8 w-8 rounded bg-primary-700 flex items-center justify-center text-white">
                <RefreshCw size={16} />
              </div>
              <span className="ml-2 font-bold text-lg text-primary-600">ebupay</span>
            </div>
          </div>
          
          <div className="ml-auto flex items-center space-x-2">
            <NotificationsDropdown />
            <Avatar className="h-8 w-8">
              <AvatarImage src={`https://ui-avatars.com/api/?name=${user?.firstName}+${user?.lastName}`} />
              <AvatarFallback>{user?.firstName?.[0]}{user?.lastName?.[0]}</AvatarFallback>
            </Avatar>
          </div>
        </div>
      )}

      {/* Mobile sidebar overlay */}
      {isMobile && showMobileSidebar && (
        <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true">
          <div className="fixed inset-0 bg-gray-600 bg-opacity-75" onClick={onCloseMobileSidebar}></div>
          <div className="relative flex flex-col w-full max-w-xs bg-white h-full">
            {renderSidebarContent()}
          </div>
        </div>
      )}
    </>
  );
}
