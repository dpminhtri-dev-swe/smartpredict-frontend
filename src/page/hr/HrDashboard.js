import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'react-toastify';
import './HrDashboard.scss';
import JobManagement from './JobManagement';
import CandidateManagement from './CandidateManagement';
import CompanyProfile from './CompanyProfile';
import HrStatistics from './HrStatistics';
import TestManagement from './TestManagement';
import TestSubmissionList from './TestSubmissionList';
import InterviewRoundManagement from './InterviewRoundManagement';
import MeetingManagement from './MeetingManagement';
import QuestionBankManagement from './QuestionBankManagement';
import DocumentManagement from './DocumentManagement';

// Order: Thống kê, Quản lý tin tuyển dụng, QL ứng viên, Quản lý bài test,
// DS bài test đã nộp, Meet, Vòng phỏng vấn, Bộ đề, QL hồ sơ bổ sung, QL hồ sơ công ty
const sidebarItems = [
    { id: 'analytics', label: 'Thống kê', icon: 'fas fa-chart-line' },
    { id: 'jobs', label: 'Quản lý tin tuyển dụng', icon: 'fas fa-briefcase' },
    { id: 'candidates', label: 'QL ứng viên', icon: 'fas fa-user-friends' },
    { id: 'tests', label: 'Quản lý bài test', icon: 'fas fa-file-alt' },
    { id: 'test-submissions', label: 'DS bài test đã nộp', icon: 'fas fa-clipboard-check' },
    { id: 'meetings', label: 'Meet', icon: 'fas fa-video' },
    { id: 'interview-rounds', label: 'Vòng phỏng vấn', icon: 'fas fa-video' },
    { id: 'question-banks', label: 'Bộ đề', icon: 'fas fa-book' },
    { id: 'documents', label: 'QL hồ sơ bổ sung', icon: 'fas fa-file-alt' },
    { id: 'company', label: 'QL hồ sơ công ty', icon: 'fas fa-building' }
];

const HrDashboard = () => {
    const [user, setUser] = useState(null);
    const [activeMenu, setActiveMenu] = useState('analytics');
    const [sidebarWidth, setSidebarWidth] = useState(270); // Default width
    const [isResizing, setIsResizing] = useState(false);
    const sidebarRef = useRef(null);
    const navigate = useNavigate();
    const location = useLocation();

    // Set active menu based on URL
    useEffect(() => {
        const path = location.pathname;
        if (path === '/hr/jobs') {
            setActiveMenu('jobs');
        } else if (path === '/hr/candidates') {
            setActiveMenu('candidates');
        } else if (path === '/hr/company-profile') {
            setActiveMenu('company');
        } else if (path === '/hr/applications') {
            setActiveMenu('applications');
        } else if (path === '/hr/tests') {
            setActiveMenu('tests');
        } else if (path === '/hr/question-banks') {
            setActiveMenu('question-banks');
        } else if (path === '/hr/test-submissions') {
            setActiveMenu('test-submissions');
        } else if (path === '/hr/interview-rounds') {
            setActiveMenu('interview-rounds');
        } else if (path === '/hr/meetings') {
            setActiveMenu('meetings');
        } else if (path === '/hr/documents') {
            setActiveMenu('documents');
        } else if (path === '/hr') {
            // Don't override if already set to 'jobs' or 'analytics'
            // Only set to 'analytics' on initial load
            setActiveMenu(prev => (prev === 'jobs' || prev === 'analytics') ? prev : 'analytics');
        }
    }, [location.pathname]);

    useEffect(() => {
        const storedUser = sessionStorage.getItem('user') || localStorage.getItem('user');
        if (storedUser) {
            const parsedUser = JSON.parse(storedUser);
            if (parsedUser.roleId !== 2) {
                toast.error('Bạn không có quyền truy cập trang này!');
                navigate('/');
                return;
            }
            setUser(parsedUser);
            // fetchDashboard is no longer needed - HrStatistics handles its own data
        } else {
            navigate('/login');
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleMenuClick = (itemId) => {
        setActiveMenu(itemId);
        if (itemId === 'analytics') {
            navigate('/hr');
        } else if (itemId === 'jobs') {
            if (location.pathname !== '/hr/jobs') {
                navigate('/hr/jobs');
            }
        } else if (itemId === 'tests') {
            navigate('/hr/tests');
        } else if (itemId === 'question-banks') {
            navigate('/hr/question-banks');
        } else if (itemId === 'test-submissions') {
            navigate('/hr/test-submissions');
        } else if (itemId === 'interview-rounds') {
            navigate('/hr/interview-rounds');
        } else if (itemId === 'meetings') {
            navigate('/hr/meetings');
        } else if (itemId === 'candidates') {
            navigate('/hr/candidates');
        } else if (itemId === 'documents') {
            navigate('/hr/documents');
        } else if (itemId === 'company') {
            navigate('/hr/company-profile');
        } else {
            toast.info('Tính năng đang được phát triển!');
        }
    };

    const handleLogout = () => {
        sessionStorage.removeItem('user');
        localStorage.removeItem('user');
        toast.success('Đã đăng xuất thành công!');
        navigate('/login');
    };

    // Load sidebar width from localStorage on mount
    useEffect(() => {
        const savedWidth = localStorage.getItem('hr-sidebar-width');
        if (savedWidth) {
            const width = parseInt(savedWidth, 10);
            if (width >= 200 && width <= 400) { // Min 200px, Max 400px
                setSidebarWidth(width);
            }
        }
    }, []);

    // Save sidebar width to localStorage
    useEffect(() => {
        localStorage.setItem('hr-sidebar-width', sidebarWidth.toString());
    }, [sidebarWidth]);

    // Handle mouse down on resize handle
    const handleMouseDown = useCallback((e) => {
        e.preventDefault();
        setIsResizing(true);
    }, []);

    // Handle mouse move during resize
    useEffect(() => {
        const handleMouseMove = (e) => {
            if (!isResizing) return;

            const newWidth = e.clientX;
            // Min width: 200px, Max width: 400px
            if (newWidth >= 200 && newWidth <= 400) {
                setSidebarWidth(newWidth);
            }
        };

        const handleMouseUp = () => {
            setIsResizing(false);
        };

        if (isResizing) {
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
            document.body.style.cursor = 'col-resize';
            document.body.style.userSelect = 'none';
        }

        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
            document.body.style.cursor = '';
            document.body.style.userSelect = '';
        };
    }, [isResizing]);

    return (
        <div className="hr-dashboard-page">
            <div className="hr-layout">
                <aside 
                    className="hr-sidebar" 
                    ref={sidebarRef}
                    style={{ width: `${sidebarWidth}px` }}
                >
                    <div className="sidebar-brand">
                        <div className="brand-icon">
                            <i className="fas fa-user-tie"></i>
                        </div>
                        <div className="brand-text">
                            <h2>HR Center</h2>
                            <p>{user?.Hoten || 'HR Manager'}</p>
                        </div>
                    </div>
                    <nav className="sidebar-menu">
                        {sidebarItems.map(item => (
                            <button
                                key={item.id}
                                className={`sidebar-item ${activeMenu === item.id ? 'active' : ''}`}
                                onClick={() => handleMenuClick(item.id)}
                                title={item.label}
                            >
                                <i className={item.icon}></i>
                                <span className="sidebar-item-text">{item.label}</span>
                            </button>
                        ))}
                    </nav>
                    <div className="sidebar-footer">
                        <button className="logout-btn" onClick={handleLogout} title="Đăng xuất">
                            <i className="fas fa-sign-out-alt"></i>
                            <span className="sidebar-item-text">Đăng xuất</span>
                        </button>
                    </div>
                    <div 
                        className={`sidebar-resize-handle ${isResizing ? 'resizing' : ''}`}
                        onMouseDown={handleMouseDown}
                    ></div>
                </aside>

                <div className="hr-main">
                    {activeMenu === 'jobs' ? (
                        <JobManagement userId={user?.id} />
                    ) : activeMenu === 'tests' ? (
                        <TestManagement userId={user?.id} />
                    ) : activeMenu === 'question-banks' ? (
                        <QuestionBankManagement userId={user?.id} />
                    ) : activeMenu === 'test-submissions' ? (
                        <TestSubmissionList userId={user?.id} />
                    ) : activeMenu === 'interview-rounds' ? (
                        <InterviewRoundManagement userId={user?.id} />
                    ) : activeMenu === 'meetings' ? (
                        <MeetingManagement userId={user?.id} />
                    ) : activeMenu === 'candidates' ? (
                        <CandidateManagement />
                    ) : activeMenu === 'documents' ? (
                        <DocumentManagement userId={user?.id} />
                    ) : activeMenu === 'company' ? (
                        <CompanyProfile />
                    ) : activeMenu === 'analytics' ? (
                        <HrStatistics />
                    ) : (
                        <div className="feature-under-development">
                            <i className="fas fa-tools"></i>
                            <h3>Tính năng "{sidebarItems.find(item => item.id === activeMenu)?.label}" đang được phát triển!</h3>
                            <p>Vui lòng quay lại sau.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default HrDashboard;
