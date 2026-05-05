import { NavLink } from 'react-router-dom';

export default function BottomNav() {
  return (
    <div className="bg-surface border-t border-border fixed bottom-0 inset-x-0 max-w-md mx-auto z-50">
      {/* FAB placeholder */}
      <div className="absolute -top-6 left-1/2 -translate-x-1/2 w-13 h-13 rounded-full bg-accent-gold"></div>
      
      <div className="flex justify-around items-center h-16">
        <NavLink
          to="/"
          className={({ isActive }) =>
            `flex flex-col items-center py-2 px-4 ${isActive ? 'text-primary' : 'text-text-tertiary'}`
          }
        >
          Dashboard
        </NavLink>
        
        <NavLink
          to="/recipes"
          className={({ isActive }) =>
            `flex flex-col items-center py-2 px-4 ${isActive ? 'text-primary' : 'text-text-tertiary'}`
          }
        >
          Recipes
        </NavLink>
        
        <NavLink
          to="/profile"
          className={({ isActive }) =>
            `flex flex-col items-center py-2 px-4 ${isActive ? 'text-primary' : 'text-text-tertiary'}`
          }
        >
          Profile
        </NavLink>
      </div>
    </div>
  );
}
