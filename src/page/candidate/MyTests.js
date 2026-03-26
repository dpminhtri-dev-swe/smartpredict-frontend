import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import CandidateNav from '../../components/Navigation/CandidateNav';
import Footer from '../../components/Footer/Footer';
import ScrollToTop from '../../components/ScrollToTop/ScrollToTop';
import { getMyTestSubmissions } from '../../service.js/testSubmissionService';
import { startTest } from '../../service.js/jobApplicationService';
import { toast } from 'react-toastify';
import AOS from 'aos';
import 'aos/dist/aos.css';
import './MyTests.scss';

const STATUS_OPTIONS = [
    { value: 'all', label: 'Tất cả' },
    { value: 'chuabatdau', label: 'Chưa làm bài' },
    { value: 'danglam', label: 'Đang làm' },
    { value: 'danop', label: 'Đã nộp' },
    { value: 'dacham', label: 'Đã chấm' }
];

const MyTests = () => {
    const [user, setUser] = useState(null);
    const [submissions, setSubmissions] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [statusFilter, setStatusFilter] = useState('all');
    const [jobPostingFilter, setJobPostingFilter] = useState('all');
    const [jobPostingOptions, setJobPostingOptions] = useState([]);
    const [stats, setStats] = useState({ total: 0, pending: 0, graded: 0, inProgress: 0 });
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const submissionRefs = useRef({});

    useEffect(() => {
        AOS.init({
            duration: 800,
            easing: 'ease-in-out',
            once: true,
            offset: 100,
        });
    }, []);

    useEffect(() => {
        const storedUser = sessionStorage.getItem('user') || localStorage.getItem('user');
        if (storedUser) {
            const parsedUser = JSON.parse(storedUser);
            setUser(parsedUser);
            fetchTests(parsedUser.id);
        }
    }, [statusFilter, jobPostingFilter]);

    useEffect(() => {
        AOS.refresh();
    }, [submissions, stats]);

    // Scroll to specific submission if provided in URL
    useEffect(() => {
        const submissionId = searchParams.get('submissionId');
        if (submissionId && submissions.length > 0) {
            // Wait for DOM to render
            setTimeout(() => {
                const element = submissionRefs.current[submissionId];
                if (element) {
                    element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    // Highlight the card temporarily
                    element.style.transition = 'all 0.3s ease';
                    element.style.boxShadow = '0 8px 32px rgba(0, 128, 96, 0.4)';
                    element.style.border = '2px solid #008060';
                    setTimeout(() => {
                        element.style.boxShadow = '';
                        element.style.border = '';
                    }, 2000);
                }
            }, 300);
        }
    }, [submissions, searchParams]);

    const fetchTests = async (userId) => {
        setIsLoading(true);
        try {
            const res = await getMyTestSubmissions(userId, { 
                status: statusFilter,
                jobPostingId: jobPostingFilter
            });
            if (res && res.data && res.data.EC === 0) {
                setSubmissions(res.data.DT.submissions || []);
                setStats(res.data.DT.stats || { total: 0, pending: 0, graded: 0, inProgress: 0 });
                // Update job posting options
                if (res.data.DT.filterOptions && res.data.DT.filterOptions.jobPostings) {
                    setJobPostingOptions(res.data.DT.filterOptions.jobPostings);
                }
            } else {
                toast.error(res.data?.EM || 'Không thể tải danh sách bài test!');
                setSubmissions([]);
            }
        } catch (error) {
            console.error(error);
            toast.error('Có lỗi khi tải danh sách bài test!');
            setSubmissions([]);
        } finally {
            setIsLoading(false);
        }
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        return new Date(dateString).toLocaleDateString('vi-VN');
    };

    const formatDateTime = (dateString) => {
        if (!dateString) return 'N/A';
        return new Date(dateString).toLocaleString('vi-VN');
    };

    const getStatusBadge = (status) => {
        const statusMap = {
            'chuabatdau': { label: 'Chưa làm bài', class: 'status-not-started', icon: 'fa-circle' },
            'danglam': { label: 'Đang làm', class: 'status-in-progress', icon: 'fa-clock' },
            'danop': { label: 'Đã nộp', class: 'status-submitted', icon: 'fa-check-circle' },
            'dacham': { label: 'Đã chấm', class: 'status-graded', icon: 'fa-star' }
        };
        return statusMap[status] || { label: 'Không xác định', class: 'status-unknown', icon: 'fa-question' };
    };

    const handleStartFromMyTests = async (submission) => {
        if (!user) return;

        const applicationId = submission.JobApplication?.id;
        if (!applicationId) {
            toast.error('Không tìm thấy đơn ứng tuyển cho bài test này!');
            return;
        }

        try {
            const res = await startTest(user.id, applicationId);
            if (res.data && res.data.EC === 0 && res.data.DT) {
                const newSubmission = res.data.DT;
                toast.success('Bắt đầu bài test thành công!');
                navigate(`/candidate/tests/${newSubmission.id}?userId=${user.id}`);
            } else {
                toast.error(res.data?.EM || 'Không thể bắt đầu bài test!');
            }
        } catch (error) {
            console.error('Error starting test from MyTests:', error);
            toast.error('Có lỗi xảy ra khi bắt đầu bài test!');
        }
    };

    const handleViewTest = (submission) => {
        if (submission.Trangthai === 'danglam') {
            navigate(`/candidate/tests/${submission.id}?userId=${user.id}`);
        } else if (submission.Trangthai === 'dacham') {
            navigate(`/candidate/test-results/${submission.id}`);
        } else {
            toast.info('Bài test đang được chấm điểm, vui lòng đợi!');
        }
    };

    return (
        <div className="my-tests-page">
            <CandidateNav />
            <div className="tests-container">
                <div className="container">
                    <div className="page-header" data-aos="fade-down">
                        <div>
                            <h1>Bài test của tôi</h1>
                            <p>Danh sách các bài test đã được gửi cho bạn</p>
                        </div>
                        {submissions.length > 0 && (
                            <div className="header-stats">
                                <div className="stat-item" data-aos="fade-down" data-aos-delay="100">
                                    <span className="stat-number">{stats.total}</span>
                                    <span className="stat-label">Tổng bài test</span>
                                </div>
                                <div className="stat-item" data-aos="fade-down" data-aos-delay="200">
                                    <span className="stat-number">{stats.inProgress}</span>
                                    <span className="stat-label">Đang làm</span>
                                </div>
                                <div className="stat-item" data-aos="fade-down" data-aos-delay="300">
                                    <span className="stat-number">{stats.pending}</span>
                                    <span className="stat-label">Đã nộp</span>
                                </div>
                                <div className="stat-item" data-aos="fade-down" data-aos-delay="400">
                                    <span className="stat-number">{stats.graded}</span>
                                    <span className="stat-label">Đã chấm</span>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="filters-section" data-aos="fade-down" data-aos-delay="200">
                        <div className="filter-group">
                            <label>Lọc theo trạng thái:</label>
                            <select 
                                value={statusFilter} 
                                onChange={(e) => setStatusFilter(e.target.value)}
                                className="filter-select"
                            >
                                {STATUS_OPTIONS.map(option => (
                                    <option key={option.value} value={option.value}>
                                        {option.label}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className="filter-group">
                            <label>Lọc theo bài đăng:</label>
                            <select 
                                value={jobPostingFilter} 
                                onChange={(e) => setJobPostingFilter(e.target.value)}
                                className="filter-select"
                            >
                                <option value="all">Tất cả bài đăng</option>
                                {jobPostingOptions.map(job => (
                                    <option key={job.id} value={job.id}>
                                        {job.Tieude}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {isLoading ? (
                        <div className="loading-state">
                            <i className="fas fa-spinner fa-spin"></i>
                            <p>Đang tải dữ liệu...</p>
                        </div>
                    ) : submissions.length > 0 ? (
                        <div className="tests-list">
                            {submissions.map((submission, index) => {
                                const statusInfo = getStatusBadge(submission.Trangthai);
                                const maxScore = submission.Test?.Tongdiem || 100;
                                const achievedScore = submission.Tongdiemdatduoc || 0;
                                const percentage = maxScore > 0 ? ((achievedScore / maxScore) * 100).toFixed(1) : 0;

                                return (
                                    <div 
                                        key={submission.id} 
                                        className="test-card"
                                        data-aos="fade-down"
                                        data-aos-delay={index % 6 * 50}
                                        ref={(el) => {
                                            if (el) submissionRefs.current[submission.id] = el;
                                        }}
                                    >
                                        <div className="test-header">
                                            <div className="test-title-section">
                                                <h3>{submission.Test?.Tieude || 'Bài test không có tiêu đề'}</h3>
                                                <span className={`status-badge ${statusInfo.class}`}>
                                                    <i className={`fas ${statusInfo.icon}`}></i>
                                                    {statusInfo.label}
                                                </span>
                                            </div>
                                        </div>

                                        <div className="test-info">
                                            <div className="info-row">
                                                <span className="info-label">
                                                    <i className="fas fa-building"></i>
                                                    Công ty:
                                                </span>
                                                <span className="info-value">
                                                    {submission.Test?.JobPosting?.Company?.Tencongty || 'N/A'}
                                                </span>
                                            </div>
                                            <div className="info-row">
                                                <span className="info-label">
                                                    <i className="fas fa-briefcase"></i>
                                                    Vị trí:
                                                </span>
                                                <span className="info-value">
                                                    {submission.Test?.JobPosting?.Tieude || 'N/A'}
                                                </span>
                                            </div>
                                            <div className="info-row">
                                                <span className="info-label">
                                                    <i className="fas fa-calendar"></i>
                                                    Ngày bắt đầu:
                                                </span>
                                                <span className="info-value">
                                                    {formatDate(submission.Test?.Ngaybatdau)}
                                                </span>
                                            </div>
                                            <div className="info-row">
                                                <span className="info-label">
                                                    <i className="fas fa-calendar-check"></i>
                                                    Ngày hết hạn:
                                                </span>
                                                <span className="info-value">
                                                    {formatDate(submission.Test?.Ngayhethan)}
                                                </span>
                                            </div>
                                            {submission.Trangthai === 'dacham' && (
                                                <div className="score-section">
                                                    <div className="score-display">
                                                        <span className="score-label">Điểm đạt được:</span>
                                                        <span className="score-value">
                                                            {achievedScore.toFixed(1)} / {maxScore}
                                                        </span>
                                                        <span className="score-percentage">({percentage}%)</span>
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        <div className="test-actions">
                                            {submission.Trangthai === 'chuabatdau' && (
                                                <button 
                                                    className="btn-start"
                                                    onClick={() => handleStartFromMyTests(submission)}
                                                >
                                                    <i className="fas fa-clipboard-check"></i>
                                                    Bắt đầu làm bài
                                                </button>
                                            )}
                                            {submission.Trangthai === 'danglam' && (
                                                <button 
                                                    className="btn-continue"
                                                    onClick={() => handleViewTest(submission)}
                                                >
                                                    <i className="fas fa-play"></i>
                                                    Tiếp tục làm bài
                                                </button>
                                            )}
                                            {submission.Trangthai === 'danop' && (
                                                <button className="btn-waiting grading" disabled>
                                                    <i className="fas fa-clock"></i>
                                                    Đang chấm điểm
                                                </button>
                                            )}
                                            {submission.Trangthai === 'dacham' && (
                                                <button 
                                                    className="btn-view-result"
                                                    onClick={() => handleViewTest(submission)}
                                                >
                                                    <i className="fas fa-eye"></i>
                                                    Xem kết quả
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="empty-state" data-aos="fade-down">
                            <img src="https://cdn-icons-png.flaticon.com/512/4076/4076549.png" alt="empty" />
                            <h3>Bạn chưa có bài test nào</h3>
                            <p>Khi có bài test được gửi cho bạn, nó sẽ hiển thị ở đây</p>
                        </div>
                    )}
                </div>
            </div>
            <Footer />
            <ScrollToTop />
        </div>
    );
};

export default MyTests;

