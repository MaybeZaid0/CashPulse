"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LayoutDashboard, Users, FileText, Settings, LogOut, Menu } from "lucide-react";
import { useState, useEffect } from "react";

export default function WorkspaceLayout({ children }) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [user, setUser] = useState(null);

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (!storedUser) {
      router.push("/");
    } else {
      setUser(JSON.parse(storedUser));
    }
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    router.push("/");
  };

  const navItems = [
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { name: "Portfolio", href: "/portfolio", icon: Users },
    { name: "Reports", href: "/reports", icon: FileText },
    { name: "Settings", href: "/settings", icon: Settings },
  ];

  return (
    <div className={`app ${mobileMenuOpen ? "mobile-mode" : ""}`}>
      {/* Sidebar */}
      <div className={`side ${mobileMenuOpen ? "open" : ""}`}>
        <div className="brand">
          <div className="bt">CashPulse</div>
          <div className="bs">LENDING INTELLIGENCE</div>
        </div>
        
        <div className="nav">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname.startsWith(item.href);
            return (
              <Link key={item.name} href={item.href} className={isActive ? "on" : ""} onClick={() => setMobileMenuOpen(false)}>
                <div className="ic"><Icon size={18} /></div>
                {item.name}
              </Link>
            );
          })}
        </div>
        
        <div className="foot">
          <div className="avatar">{user?.name?.charAt(0) || "U"}</div>
          <div>
            <div className="nm">{user?.name || "User"}</div>
            <div className="rl">{user?.role || "RM"}</div>
          </div>
          <button style={{ marginLeft: "auto", background: "none", color: "#9fbad2" }} onClick={handleLogout} title="Logout">
            <LogOut size={16} />
          </button>
        </div>
      </div>
      
      {/* Mobile Scrim */}
      <div 
        className={`drawer-scrim ${mobileMenuOpen ? "show" : ""}`} 
        onClick={() => setMobileMenuOpen(false)}
      ></div>

      {/* Main Content Area */}
      <div className="main">
        <div className="topbar">
          <button className="burger" onClick={() => setMobileMenuOpen(true)}>
            <Menu size={20} />
          </button>
          <h2>{pathname === "/portfolio" ? "Portfolio" : pathname.includes("/dashboard") ? "Assessment Dashboard" : pathname.includes("/new-assessment") ? "New Assessment" : "CashPulse"}</h2>
          <div className="grow"></div>
          <input type="text" className="search" placeholder="Search SME..." />
          <div className="pill">Branch: Main</div>
        </div>
        
        <div className="content">
          {children}
        </div>
      </div>
    </div>
  );
}
