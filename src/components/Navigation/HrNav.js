import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import './HrNav.scss';

const HrNav = () => {
    const [user, setUser] = useState(null);
    const [showDropdown, setShowDropdown] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        const storedUser = sessionStorage.getItem('user') || localStorage.getItem('user');
        if (storedUser) {
            setUser(JSON.parse(storedUser));
        }
    }, []);

    const handleLogout = () => {
        localStorage.removeItem('user');
        sessionStorage.removeItem('user');
        toast.success('Đăng xuất thành công!');
        navigate('/login');
    };

    return (
        <nav className="hr-navbar">
            <div className="container-fluid">
                <div className="navbar-content">
                    <div className="navbar-brand">
                        <NavLink to="/hr" className="brand-link">
                            <i className="fas fa-user-tie"></i>
                            <span>HR Center</span>
                        </NavLink>
                    </div>

                    <div className="navbar-menu">
                        <NavLink 
                            to="/hr" 
                            className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}
                            end
                        >
                            <i className="fas fa-chart-line"></i>
                            Dashboard
                        </NavLink>

                        <NavLink 
                            to="/hr/jobs" 
                            className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}
                        >
                            <i className="fas fa-briefcase"></i>
                            Tin tuyển dụng
                        </NavLink>

                        <NavLink 
                            to="/hr/applications" 
                            className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}
                        >
                            <i className="fas fa-inbox"></i>
                            Đơn ứng tuyển
                        </NavLink>

                        <NavLink 
                            to="/hr/company" 
                            className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}
                        >
                            <i className="fas fa-building"></i>
                            Công ty
                        </NavLink>
                    </div>

                    <div className="navbar-user">
                        {user ? (
                            <div className="user-dropdown">
                                <div 
                                    className="user-info" 
                                    onClick={() => setShowDropdown(!showDropdown)}
                                >
                                    <div className="user-avatar">
                                        {user.Hoten ? user.Hoten.charAt(0).toUpperCase() : 'H'}
                                    </div>
                                    <div className="user-meta">
                                        <span className="user-name">{user.Hoten}</span>
                                        <small>HR Manager</small>
                                    </div>
                                    <i className={`fas fa-chevron-${showDropdown ? 'up' : 'down'}`}></i>
                                </div>

                                {showDropdown && (
                                    <div className="dropdown-menu">
                                        <NavLink to="/hr/profile" className="dropdown-item">
                                            <i className="fas fa-user"></i>
                                            Thông tin tài khoản
                                        </NavLink>
                                        <NavLink to="/hr/settings" className="dropdown-item">
                                            <i className="fas fa-cog"></i>
                                            Cài đặt
                                        </NavLink>
                                        <div className="dropdown-divider"></div>
                                        <div className="dropdown-item" onClick={handleLogout}>
                                            <i className="fas fa-sign-out-alt"></i>
                                            Đăng xuất
                                        </div>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <button 
                                className="btn-login" 
                                onClick={() => navigate('/login')}
                            >
                                Đăng nhập
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </nav>
    );
};

export default HrNav;


