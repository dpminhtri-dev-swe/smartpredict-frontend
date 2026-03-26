import React, { useState, useEffect, useRef } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import TextType from '../TextType/TextType';
import './CandidateNav.scss';

const CandidateNav = () => {
    const [user, setUser] = useState(null);
    const [showDropdown, setShowDropdown] = useState(false);
    const [showOptionsDropdown, setShowOptionsDropdown] = useState(false);
    const [isTextPaused, setIsTextPaused] = useState(false);
    const navigate = useNavigate();
    const optionsDropdownRef = useRef(null);
    const userDropdownRef = useRef(null);

    useEffect(() => {
        // Get user from sessionStorage or localStorage
        const userData = sessionStorage.getItem('user') || localStorage.getItem('user');
        if (userData) {
            setUser(JSON.parse(userData));
        }
    }, []);

    // Handle click outside for options dropdown
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (optionsDropdownRef.current && !optionsDropdownRef.current.contains(event.target)) {
                setShowOptionsDropdown(false);
            }
            if (userDropdownRef.current && !userDropdownRef.current.contains(event.target)) {
                setShowDropdown(false);
            }
        };

        if (showOptionsDropdown || showDropdown) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [showOptionsDropdown, showDropdown]);

    const handleLogout = () => {
        sessionStorage.removeItem('user');
        localStorage.removeItem('user');
        toast.success('Đăng xuất thành công!');
        navigate('/login');
    };

    return (
        <nav className="candidate-navbar">
            <div 
                className="container-fluid"
                onMouseEnter={() => setIsTextPaused(true)}
                onMouseLeave={() => setIsTextPaused(false)}
            >
                <div className="navbar-content">
                    {/* Logo */}
                    <div className="navbar-brand">
                        <NavLink to="/candidate" className="brand-link">
                            <i className="fas fa-briefcase"></i>
                            <TextType 
                                text={["JobPortal"]}
                                typingSpeed={75}
                                pauseDuration={1500}
                                showCursor={true}
                                cursorCharacter="|"
                                as="span"
                                isPaused={isTextPaused}
                            />
                        </NavLink>
                    </div>

                    {/* Menu chính */}
                    <div className="navbar-menu">
                        <NavLink 
                            to="/candidate" 
                            className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}
                            end
                        >
                            <i className="fas fa-home"></i>
                            Trang chủ
                        </NavLink>
                        
                        <NavLink 
                            to="/candidate/jobs" 
                            className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}
                        >
                            <i className="fas fa-briefcase"></i>
                            Tin tuyển dụng
                        </NavLink>
                        
                        <NavLink 
                            to="/candidate/companies" 
                            className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}
                        >
                            <i className="fas fa-building"></i>
                            Công ty
                        </NavLink>
                        
                        <div 
                            className="nav-dropdown"
                            ref={optionsDropdownRef}
                        >
                            <div 
                                className={`nav-link ${showOptionsDropdown ? 'active' : ''}`}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setShowOptionsDropdown(!showOptionsDropdown);
                                }}
                            >
                                <i className="fas fa-list"></i>
                                Tùy chọn
                                <i className={`fas fa-chevron-${showOptionsDropdown ? 'up' : 'down'}`}></i>
                            </div>
                            {showOptionsDropdown && (
                                <div 
                                    className="dropdown-menu options-dropdown-menu"
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    <NavLink 
                                        to="/candidate/my-records" 
                                        className={({ isActive }) => isActive ? "dropdown-item active" : "dropdown-item"}
                                        onClick={() => {
                                            setShowOptionsDropdown(false);
                                        }}
                                    >
                                        <i className="fas fa-file-alt"></i>
                                        <span>CV của tôi</span>
                                    </NavLink>
                                    <NavLink 
                                        to="/candidate/my-applications" 
                                        className={({ isActive }) => isActive ? "dropdown-item active" : "dropdown-item"}
                                        onClick={() => {
                                            setShowOptionsDropdown(false);
                                        }}
                                    >
                                        <i className="fas fa-paper-plane"></i>
                                        <span>Đơn ứng tuyển của tôi</span>
                                    </NavLink>
                                    <NavLink 
                                        to="/candidate/my-tests" 
                                        className={({ isActive }) => isActive ? "dropdown-item active" : "dropdown-item"}
                                        onClick={() => {
                                            setShowOptionsDropdown(false);
                                        }}
                                    >
                                        <i className="fas fa-clipboard-check"></i>
                                        <span>Xem bài test</span>
                                    </NavLink>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* User profile */}
                    <div className="navbar-user">
                        {user ? (
                            <>
                                <div className="user-dropdown" ref={userDropdownRef}>
                                    <div 
                                        className="user-info" 
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setShowDropdown(!showDropdown);
                                        }}
                                    >
                                        <div className="user-avatar">
                                            {user.Hoten ? user.Hoten.charAt(0).toUpperCase() : 'U'}
                                        </div>
                                        <span className="user-name">{user.Hoten}</span>
                                        <i className={`fas fa-chevron-${showDropdown ? 'up' : 'down'}`}></i>
                                    </div>

                                    {showDropdown && (
                                        <div 
                                            className="dropdown-menu user-dropdown-menu"
                                            onClick={(e) => e.stopPropagation()}
                                        >
                                            <NavLink 
                                                to="/candidate/profile" 
                                                className={({ isActive }) => isActive ? "dropdown-item active" : "dropdown-item"}
                                                onClick={() => {
                                                    setShowDropdown(false);
                                                }}
                                            >
                                                <i className="fas fa-user"></i>
                                                <span>Thông tin cá nhân</span>
                                            </NavLink>
                                            <NavLink 
                                                to="/candidate/settings" 
                                                className={({ isActive }) => isActive ? "dropdown-item active" : "dropdown-item"}
                                                onClick={() => {
                                                    setShowDropdown(false);
                                                }}
                                            >
                                                <i className="fas fa-cog"></i>
                                                <span>Cài đặt</span>
                                            </NavLink>
                                        </div>
                                    )}
                                </div>
                                <button className="btn-logout" onClick={handleLogout}>
                                    <i className="fas fa-sign-out-alt"></i>
                                    <span>Đăng xuất</span>
                                </button>
                            </>
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

export default CandidateNav;

