import { NavLink } from 'react-router-dom';

export const Sidebar = () => {
    return (
        <aside className="w-64 bg-white border-r border-stripe-border hidden md:flex flex-col shrink-0">
            <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
                <NavLink
                    to="/dashboard"
                    className={({ isActive }) => 
                        `flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                            isActive 
                                ? 'bg-indigo-50 text-stripe-primary' 
                                : 'text-stripe-textLight hover:bg-gray-50 hover:text-stripe-textDark'
                        }`
                    }
                >
                    Workspaces
                </NavLink>
                {/* Additional navigation links can be added here */}
            </nav>
            <div className="p-4 border-t border-stripe-border">
                <div className="text-xs text-stripe-textLight mb-2">Workspace Actions</div>
                <button className="w-full text-left px-3 py-2 text-sm font-medium text-stripe-textLight hover:bg-gray-50 hover:text-stripe-textDark rounded-md transition-colors">
                    Settings
                </button>
            </div>
        </aside>
    );
};
