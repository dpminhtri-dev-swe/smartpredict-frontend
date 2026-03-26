import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import CandidateNav from '../../components/Navigation/CandidateNav';
import Footer from '../../components/Footer/Footer';
import ScrollToTop from '../../components/ScrollToTop/ScrollToTop';
import { getMyApplications, startTest } from '../../service.js/jobApplicationService';
import { 
    getDocumentsByApplication, 
    checkCanSubmitDocuments, 
    createOrUpdateDocument,
    deleteDocument 
} from '../../service.js/applicationDocumentService';
import { uploadCV } from '../../service.js/recordService';
import SubmitDocumentModal from './SubmitDocumentModal';
import { toast } from 'react-toastify';
import AOS from 'aos';
import 'aos/dist/aos.css';
import './MyApplications.scss';

const TEST_STATUS_MESSAGES = {
    pending: 'Bài test chưa đến thời gian bắt đầu.',
    expired: 'Bài test đã kết thúc.',
    inactive: 'Bài test hiện không khả dụng.'
};

const getTestStatusInfo = (test) => {
    if (!test) return { status: 'inactive' };

    if (test.Trangthai === 0) {
        return { status: 'inactive' };
    }

    const now = new Date();
    const startDate = test.Ngaybatdau ? new Date(test.Ngaybatdau) : null;
    const endDate = test.Ngayhethan ? new Date(test.Ngayhethan) : null;

    if (startDate && now < startDate) {
        return { status: 'pending', startDate };
    }

    if (endDate && now > endDate) {
        return { status: 'expired', endDate };
    }

    return { status: 'active' };
};

const MyApplications = () => {
    const [user, setUser] = useState(null);
    const [applications, setApplications] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [startingTestId, setStartingTestId] = useState(null);
    const [showDocumentModal, setShowDocumentModal] = useState(false);
    const [selectedApplication, setSelectedApplication] = useState(null);
    const [documents, setDocuments] = useState([]);
    const [canSubmit, setCanSubmit] = useState(false);
    const [documentForm, setDocumentForm] = useState({
        documentType: '',
        file: null,
        expiryDate: '',
        bankAccountNumber: '',
        notes: ''
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        // Initialize AOS
        AOS.init({
            duration: 800,
            easing: 'ease-in-out',
            once: true,
            offset: 100,
            delay: 0
        });

        const storedUser = sessionStorage.getItem('user') || localStorage.getItem('user');
        if (storedUser) {
            const parsedUser = JSON.parse(storedUser);
            setUser(parsedUser);
            fetchApplications(parsedUser.id);
        }
    }, []);

    // Refresh AOS when applications change
    useEffect(() => {
        if (!isLoading && applications.length > 0) {
            AOS.refresh();
        }
    }, [applications, isLoading]);

    const fetchApplications = async (userId) => {
        setIsLoading(true);
        try {
            let res = await getMyApplications(userId);
            if (res && res.data && res.data.EC === 0) {
                setApplications(res.data.DT);
            } else {
                toast.error(res.data.EM);
            }
        } catch (error) {
            console.log(error);
            toast.error('Có lỗi khi tải danh sách ứng tuyển!');
        } finally {
            setIsLoading(false);
        }
    };

    const formatDate = (dateString) => {
        if (!dateString) return '';
        return new Date(dateString).toLocaleDateString('vi-VN');
    };

    const canStartTest = (app) => {
        const statusId = app.applicationStatusId || app.ApplicationStatus?.id;
        const testInfo = getTestStatusInfo(app.JobPosting?.Test);
        const hasTest = app.JobPosting?.Test;
        if (statusId !== 4 || !hasTest) return { show: false, testStatus: testInfo.status };

        const submission = app.TestSubmissions && app.TestSubmissions.length > 0 ? app.TestSubmissions[0] : null;

        if (submission && submission.Trangthai === 'dacham') {
            return { 
                show: true, 
                disabled: false, 
                label: 'Xem kết quả', 
                variant: 'completed', 
                testStatus: testInfo.status,
                submissionId: submission.id
            };
        }

        if (submission && submission.Trangthai === 'danglam') {
            return {
                show: true,
                disabled: false,
                label: 'Xem bài test',
                variant: 'resume',
                submissionId: submission.id,
                testStatus: testInfo.status
            };
        }

        if (submission && submission.Trangthai === 'danop') {
            return { show: true, disabled: true, label: 'Đang chấm điểm', variant: 'pending', testStatus: testInfo.status };
        }

        return {
            show: true,
            disabled: false,
            label: 'Xem bài test',
            variant: 'start',
            submissionId: submission?.id,
            testStatus: testInfo.status
        };
    };

    const handleStartTest = async (application) => {
        if (!user) return;
        const status = canStartTest(application);
        if (!status.show) return;
        if (status.disabled && !status.submissionId) return;

        // Navigate to MyTests page and scroll to the test for all cases with submissionId
        // This ensures consistent behavior for all test states (in progress, completed, etc.)
        if (status.submissionId && (status.variant === 'resume' || status.variant === 'start' || status.variant === 'completed')) {
            navigate(`/candidate/my-tests?submissionId=${status.submissionId}`);
            return;
        }

        // If test status is not active, show message
        if (status.testStatus && status.testStatus !== 'active') {
            const message = TEST_STATUS_MESSAGES[status.testStatus] || 'Bài test hiện không khả dụng.';
            if (status.testStatus === 'pending') {
                toast.info(message);
            } else {
                toast.error(message);
            }
            return;
        }

        // Create new test submission if needed
        setStartingTestId(application.id);
        try {
            const response = await startTest(user.id, application.id);
            if (response.data && response.data.EC === 0) {
                const submission = response.data.DT;
                toast.success('Bắt đầu bài test thành công!');
                navigate(`/candidate/my-tests?submissionId=${submission.id}`);
            } else {
                toast.error(response.data?.EM || 'Không thể bắt đầu bài test!');
            }
        } catch (error) {
            console.error(error);
            toast.error('Có lỗi xảy ra khi bắt đầu bài test!');
        } finally {
            setStartingTestId(null);
            fetchApplications(user.id);
        }
    };

    const formatSalary = (min, max) => {
        if (!min && !max) return 'Thỏa thuận';
        if (!max) return `Từ ${min.toLocaleString('vi-VN')} VNĐ`;
        if (!min) return `Lên đến ${max.toLocaleString('vi-VN')} VNĐ`;
        return `${min.toLocaleString('vi-VN')} - ${max.toLocaleString('vi-VN')} VNĐ`;
    };

    // Calculate statistics
    const getStatistics = () => {
        const total = applications.length;
        const pending = applications.filter(app => {
            const statusId = app.applicationStatusId || app.ApplicationStatus?.id;
            return statusId === 1 || statusId === 2; // Chờ xét duyệt, Đang xét duyệt
        }).length;
        const approved = applications.filter(app => {
            const statusId = app.applicationStatusId || app.ApplicationStatus?.id;
            return statusId === 4; // Đã xét duyệt
        }).length;
        const rejected = applications.filter(app => {
            const statusId = app.applicationStatusId || app.ApplicationStatus?.id;
            return statusId === 3; // Từ chối
        }).length;
        return { total, pending, approved, rejected };
    };

    const stats = getStatistics();

    return (
        <div className="my-applications-page">
            <CandidateNav />
            <div className="applications-container">
                <div className="container">
                    <div className="page-header" data-aos="fade-down" data-aos-delay="0">
                        <div>
                            <h1>Đơn ứng tuyển của tôi</h1>
                            <p>Theo dõi những công việc bạn đã nộp hồ sơ</p>
                        </div>
                        {applications.length > 0 && (
                            <div className="header-stats">
                                <div className="stat-item" data-aos="fade-down" data-aos-delay="100">
                                    <span className="stat-number">{stats.total}</span>
                                    <span className="stat-label">Tổng đơn</span>
                                </div>
                                <div className="stat-item" data-aos="fade-down" data-aos-delay="200">
                                    <span className="stat-number">{stats.pending}</span>
                                    <span className="stat-label">Đang chờ</span>
                                </div>
                                <div className="stat-item" data-aos="fade-down" data-aos-delay="300">
                                    <span className="stat-number">{stats.approved}</span>
                                    <span className="stat-label">Đã duyệt</span>
                                </div>
                                <div className="stat-item" data-aos="fade-down" data-aos-delay="400">
                                    <span className="stat-number">{stats.rejected}</span>
                                    <span className="stat-label">Từ chối</span>
                                </div>
                            </div>
                        )}
                    </div>

                    {isLoading ? (
                        <div className="loading-state">
                            <i className="fas fa-spinner fa-spin"></i>
                            <p>Đang tải dữ liệu...</p>
                        </div>
                    ) : applications.length > 0 ? (
                        <div className="applications-list">
                            {applications.map((app, index) => (
                                <div 
                                    className="application-card" 
                                    key={app.id}
                                    data-aos="fade-down"
                                    data-aos-delay={index % 6 * 50}
                                >
                                    <div className="ticket-hole-bottom"></div>
                                    <div className="job-info">
                                        <div className="job-title-row">
                                            <h3>{app.JobPosting?.Tieude}</h3>
                                            <span className={`status-badge status-${app.ApplicationStatus?.id || 0}`}>
                                                {app.ApplicationStatus?.TenTrangThai || 'Chưa xác định'}
                                            </span>
                                        </div>
                                        <p className="company-name">{app.JobPosting?.Company?.Tencongty}</p>
                                        <div className="job-meta">
                                            <span>
                                                <i className="fas fa-map-marker-alt"></i>
                                                {app.JobPosting?.Diadiem}
                                            </span>
                                            <span>
                                                <i className="fas fa-dollar-sign"></i>
                                                {formatSalary(app.JobPosting?.Luongtoithieu, app.JobPosting?.Luongtoida)}
                                            </span>
                                            {app.JobPosting?.Format && (
                                                <span>
                                                    <i className="fas fa-clock"></i>
                                                    {app.JobPosting?.Format?.TenHinhThuc}
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    <div className="application-meta">
                                        <p>
                                            <span>Ngày nộp:</span>
                                            {formatDate(app.Ngaynop)}
                                        </p>
                                        <p>
                                            <span>CV đã dùng:</span>
                                            {app.Record?.Tieude}
                                        </p>
                                        <div className="actions">
                                            <a href={app.Record?.File_url} target="_blank" rel="noopener noreferrer">
                                                Xem CV
                                            </a>
                                            <a href={`/candidate/jobs/${app.JobPosting?.id}`}>
                                                Xem chi tiết job
                                            </a>
                                            {(() => {
                                                const testState = canStartTest(app);
                                                if (!testState.show) return null;
                                                const isLoadingBtn = startingTestId === app.id;
                                                const btnLabel = isLoadingBtn ? 'Đang mở bài test...' : testState.label;
                                                const isDisabled = testState.disabled || isLoadingBtn;
                                                return (
                                                    <button
                                                        className={`btn-test btn-${testState.variant || 'start'} ${testState.variant === 'pending' ? 'grading' : ''}`}
                                                        disabled={isDisabled}
                                                        onClick={() => handleStartTest(app)}
                                                    >
                                                        {testState.variant === 'completed' ? (
                                                            <i className="fas fa-eye"></i>
                                                        ) : testState.variant === 'pending' ? (
                                                            <i className="fas fa-clock"></i>
                                                        ) : (
                                                            <i className="fas fa-clipboard-check"></i>
                                                        )}
                                                        {btnLabel}
                                                    </button>
                                                );
                                            })()}
                                            
                                            {/* Button Nộp Hồ Sơ - Chỉ hiển thị khi status = 2 (Đã được nhận) */}
                                            {(app.applicationStatusId === 2 || app.ApplicationStatus?.id === 2) && (
                                                <button 
                                                    className="btn-submit-documents"
                                                    onClick={() => {
                                                        setSelectedApplication(app);
                                                        setShowDocumentModal(true);
                                                    }}
                                                >
                                                    <i className="fas fa-file-upload"></i>
                                                    Nộp Hồ Sơ
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="empty-state" data-aos="fade-down" data-aos-delay="0">
                            <img src="https://cdn-icons-png.flaticon.com/512/4076/4076549.png" alt="empty" />
                            <h3>Bạn chưa ứng tuyển công việc nào</h3>
                            <p>Hãy khám phá các cơ hội việc làm phù hợp và nộp hồ sơ ngay hôm nay!</p>
                            <a className="btn-explore" href="/candidate/jobs">
                                Khám phá việc làm
                            </a>
                        </div>
                    )}
                </div>
            </div>
            
            {/* Submit Document Modal */}
            {selectedApplication && (
                <SubmitDocumentModal
                    isOpen={showDocumentModal}
                    onClose={() => {
                        setShowDocumentModal(false);
                        setSelectedApplication(null);
                    }}
                    applicationId={selectedApplication.id}
                    userId={user?.id}
                />
            )}
            
            <Footer />
            <ScrollToTop />
        </div>
    );
};

export default MyApplications;


