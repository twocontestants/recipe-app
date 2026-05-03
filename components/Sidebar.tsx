'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const navItems = [
  {
    href: '/recipes',
    label: 'Recipes',
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z"/>
        <path d="M8 12h8M12 8v8"/>
      </svg>
    ),
  },
  {
    href: '/planner',
    label: 'Meal Planner',
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <rect x="3" y="4" width="18" height="18" rx="2"/>
        <path d="M16 2v4M8 2v4M3 10h18"/>
      </svg>
    ),
  },
  {
    href: '/shopping-list',
    label: 'Shopping List',
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2"/>
        <rect x="9" y="3" width="6" height="4" rx="1"/>
        <path d="M9 12h6M9 16h4"/>
      </svg>
    ),
  },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <nav className="sidebar">
      <div className="sidebar-logo">
        Mise en Place
        <span>Recipe Manager</span>
      </div>
      {navItems.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={`nav-link ${pathname.startsWith(item.href) ? 'active' : ''}`}
        >
          {item.icon}
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
