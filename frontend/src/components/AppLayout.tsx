// @ts-nocheck
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { LayoutDashboard, LogOut, Briefcase } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import styles from './AppLayout.module.css';

export const AppLayout = () => {
    const { email, logout } = useAuth();
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const userInitial = email ? email.charAt(0).toUpperCase() : 'U';

    return (
        <div className={styles.layout}>
            <aside className={styles.sidebar}>
                <div className={styles.brand}>
                    <div className={styles.brandIcon}>
                        <Briefcase size={22} />
                    </div>
                    <div className={styles.brandText}>
                        <h1>AgileTrack</h1>
                        <p>Task Management</p>
                    </div>
                </div>

                <nav className={styles.nav}>
                    <NavLink 
                        to="/dashboard" 
                        end
                        className={({ isActive }) => `${styles.navLink} ${isActive ? styles.active : ''}`}
                    >
                        <LayoutDashboard size={18} className={styles.navIcon} />
                        Dashboard
                    </NavLink>
                    {/* Add more nav links here in the future if needed */}
                </nav>

                <div className={styles.userSection}>
                    <div className={styles.userInfo}>
                        <div className={styles.userAvatar}>
                            {userInitial}
                        </div>
                        <div className={styles.userEmail} title={email}>
                            {email}
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={handleLogout}
                        className={styles.logoutBtn}
                    >
                        <LogOut size={16} />
                        Logout
                    </button>
                </div>
            </aside>

            <div className={styles.mainContent}>
                <Outlet />
            </div>
        </div>
    );
};

