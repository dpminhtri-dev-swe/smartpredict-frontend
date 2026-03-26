import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import ReactPaginate from 'react-paginate';
import { 
    getJobApplications, 
    getApplicationStatistics, 
    getApplicationDetail,
    updateApplicationStatus,
    getActiveJobPostings
} from '../../service.js/hrService';
import ApplicationDetailModal from './ApplicationDetailModal';
import ConfirmModal from '../../components/ConfirmModal/ConfirmModal';
import './CandidateManagement.scss';

const CandidateManagement = () => {
    const [user, setUser] = useState(null);
    const [applications, setApplications] = useState([]);
    const [statistics, setStatistics] = useState({
        total: 0,
        pending: 0,
        approved: 0,
        rejected: 0
    });
    const [loading, setLoading] = useState(false);
    const [selectedStatus, setSelectedStatus] = useState('all');
    const [selectedJobId, setSelectedJobId] = useState('all');
    const [activeJobs, setActiveJobs] = useState([]);
    const [searchKeyword, setSearchKeyword] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(0);
    const [totalRows, setTotalRows] = useState(0);
    const limit = 10;

    // Generate binary code strings (stable across renders)
    const generateBinaryCode = (length) => {
        return Array.from({ length }, () => (Math.random() > 0.5 ? '1' : '0'));
    };

    const [binaryColumns] = useState([
        generateBinaryCode(20),
        generateBinaryCode(20),
        generateBinaryCode(20)
    ]);

    // Modal states
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [selectedApplication, setSelectedApplication] = useState(null);
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [confirmAction, setConfirmAction] = useState(null);

    useEffect(() => {
        const storedUser = sessionStorage.getItem('user') || localStorage.getItem('user');
        if (storedUser) {
            const parsedUser = JSON.parse(storedUser);
            setUser(parsedUser);
            fetchStatistics(parsedUser.id);
            fetchActiveJobs(parsedUser.id);
            fetchApplications(parsedUser.id, selectedStatus, selectedJobId, currentPage);
        }
    }, []);

    useEffect(() => {
        if (user) {
            fetchApplications(user.id, selectedStatus, selectedJobId, currentPage, searchKeyword);
        }
    }, [selectedStatus, selectedJobId, currentPage, searchKeyword]);

    const fetchActiveJobs = async (userId) => {
        try {
            const res = await getActiveJobPostings(userId);
            if (res.EC === 0) {
                setActiveJobs(res.DT);
            } else {
                setActiveJobs([]);
            }
        } catch (error) {
            setActiveJobs([]);
        }
    };

    const fetchStatistics = async (userId) => {
        try {
            const res = await getApplicationStatistics(userId);
            if (res.EC === 0) {
                setStatistics(res.DT);
            }
        } catch (error) {
            console.error('Error fetching statistics:', error);
        }
    };

    const fetchApplications = async (userId, status, jobId, page, search = '') => {
        try {
            setLoading(true);
            const res = await getJobApplications(userId, status, jobId, page, limit, search);
            if (res.EC === 0) {
                let sortedApplications = res.DT.applications || [];
                
                // Sắp xếp: ưu tiên "Đang chờ" (statusId = 1) lên đầu
                // Khi chọn "Đang chờ" hoặc "Tất cả", các ứng viên "Đang chờ" sẽ được ưu tiên hiển thị trước
                if (status === '1' || status === 'all') {
                    sortedApplications = sortedApplications.sort((a, b) => {
                        const aStatusId = a.applicationStatusId || a.ApplicationStatus?.id;
                        const bStatusId = b.applicationStatusId || b.ApplicationStatus?.id;
                        
                        // Luôn ưu tiên "Đang chờ" (statusId = 1) lên đầu
                        if (aStatusId === 1 && bStatusId !== 1) return -1;
                        if (aStatusId !== 1 && bStatusId === 1) return 1;
                        
                        // Nếu cùng trạng thái, sắp xếp theo ngày nộp (mới nhất trước)
                        const aDate = new Date(a.Ngaynop || 0);
                        const bDate = new Date(b.Ngaynop || 0);
                        return bDate - aDate;
                    });
                } else {
                    // Các trạng thái khác, sắp xếp theo ngày nộp (mới nhất trước)
                    sortedApplications = sortedApplications.sort((a, b) => {
                        const aDate = new Date(a.Ngaynop || 0);
                        const bDate = new Date(b.Ngaynop || 0);
                        return bDate - aDate;
                    });
                }
                
                setApplications(sortedApplications);
                setTotalPages(res.DT.totalPages);
                setTotalRows(res.DT.totalRows);
                setCurrentPage(res.DT.currentPage);
            } else {
                toast.error(res.EM);
            }
        } catch (error) {
            console.error('Error fetching applications:', error);
            toast.error('Không thể tải danh sách ứng viên!');
        } finally {
            setLoading(false);
        }
    };

    const handlePageClick = (event) => {
        setCurrentPage(event.selected + 1);
    };

    const handleStatusFilter = (status) => {
        setSelectedStatus(status);
        setCurrentPage(1);
    };

    const handleSearch = (e) => {
        const value = e.target.value;
        setSearchKeyword(value);
        setCurrentPage(1);
    };

    const handleViewDetail = async (applicationId) => {
        try {
            const res = await getApplicationDetail(user.id, applicationId);
            if (res.EC === 0) {
                setSelectedApplication(res.DT);
                setShowDetailModal(true);
            } else {
                toast.error(res.EM);
            }
        } catch (error) {
            console.error('Error fetching application detail:', error);
            toast.error('Không thể tải chi tiết đơn ứng tuyển!');
        }
    };

    const handleApprove = (application) => {
        setConfirmAction({
            type: 'approve',
            application: application
        });
        setShowConfirmModal(true);
    };

    const handleReject = (application) => {
        setConfirmAction({
            type: 'reject',
            application: application
        });
        setShowConfirmModal(true);
    };

    const confirmStatusUpdate = async () => {
        if (!confirmAction) return;

        const { type, application } = confirmAction;
        const newStatusId = type === 'approve' ? 4 : 3; // 4: Đã xét duyệt, 3: Từ chối

        try {
            const res = await updateApplicationStatus(user.id, application.id, newStatusId);
            if (res.EC === 0) {
                toast.success(type === 'approve' ? 'Đã duyệt ứng viên!' : 'Đã từ chối ứng viên!');
                fetchStatistics(user.id);
                fetchApplications(user.id, selectedStatus, currentPage);
            } else {
                toast.error(res.EM);
            }
        } catch (error) {
            console.error('Error updating status:', error);
            toast.error('Không thể cập nhật trạng thái!');
        } finally {
            setShowConfirmModal(false);
            setConfirmAction(null);
        }
    };

    const formatSalary = (min, max) => {
        if (!min && !max) return 'Thỏa thuận';
        if (min && max) return `${min.toLocaleString()} - ${max.toLocaleString()} VNĐ`;
        if (min) return `Từ ${min.toLocaleString()} VNĐ`;
        return `Lên đến ${max.toLocaleString()} VNĐ`;
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        const date = new Date(dateString);
        return date.toLocaleDateString('vi-VN');
    };

    const getStatusBadge = (status) => {
        const statusMap = {
            1: { text: 'Đang chờ', class: 'pending' },
            2: { text: 'Đã được nhận', class: 'reviewing' },
            3: { text: 'Không đạt', class: 'rejected' },
            4: { text: 'Đã xét duyệt', class: 'approved' },
            5: { text: 'Đã hủy', class: 'cancelled' },
            6: { text: 'Đã phỏng vấn', class: 'interviewed' }
        };
        const statusInfo = statusMap[status?.id] || { text: status?.TenTrangThai || 'N/A', class: 'default' };
        return <span className={`status-badge ${statusInfo.class}`}>{statusInfo.text}</span>;
    };

    return (
        <div className="candidate-management">
            <div className="cp-header">
                {/* Animated Background Effects */}
                <div className="header-bg-effects">
                    {/* Animated Gradient Background */}
                    <div className="animated-gradient"></div>
                    
                    {/* Tech Grid Pattern */}
                    <div className="tech-grid"></div>
                    
                    {/* Circuit Lines & Dots */}
                    <svg className="circuit-lines" viewBox="0 0 1000 200" preserveAspectRatio="none">
                        <defs>
                            <linearGradient id="circuitGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                                <stop offset="0%" stopColor="rgba(255,255,255,0.1)" />
                                <stop offset="50%" stopColor="rgba(255,255,255,0.3)" />
                                <stop offset="100%" stopColor="rgba(255,255,255,0.1)" />
                            </linearGradient>
                        </defs>
                        <line x1="0" y1="50" x2="200" y2="50" stroke="url(#circuitGradient)" strokeWidth="2" className="circuit-line" />
                        <line x1="300" y1="100" x2="500" y2="100" stroke="url(#circuitGradient)" strokeWidth="2" className="circuit-line" />
                        <line x1="600" y1="150" x2="800" y2="150" stroke="url(#circuitGradient)" strokeWidth="2" className="circuit-line" />
                        <line x1="200" y1="50" x2="200" y2="100" stroke="url(#circuitGradient)" strokeWidth="2" className="circuit-line" />
                        <line x1="500" y1="100" x2="500" y2="150" stroke="url(#circuitGradient)" strokeWidth="2" className="circuit-line" />
                        <circle cx="200" cy="50" r="4" fill="rgba(255,255,255,0.6)" className="circuit-dot" />
                        <circle cx="500" cy="100" r="4" fill="rgba(255,255,255,0.6)" className="circuit-dot" />
                        <circle cx="800" cy="150" r="4" fill="rgba(255,255,255,0.6)" className="circuit-dot" />
                    </svg>
                    
                    {/* Binary Code Effect */}
                    <div className="binary-code">
                        {binaryColumns.map((column, colIndex) => (
                            <div key={colIndex} className="binary-column">
                                {column.map((digit, i) => (
                                    <span key={i} className="binary-digit">{digit}</span>
                                ))}
                            </div>
                        ))}
                    </div>
                    
                    {/* Floating Tech Icons */}
                    <div className="floating-tech-icons">
                        <div className="tech-icon" style={{ '--delay': '0s', '--duration': '15s', '--x': '10%', '--y': '20%' }}>
                            <i className="fab fa-react"></i>
                        </div>
                        <div className="tech-icon" style={{ '--delay': '2s', '--duration': '18s', '--x': '80%', '--y': '30%' }}>
                            <i className="fab fa-node-js"></i>
                        </div>
                        <div className="tech-icon" style={{ '--delay': '4s', '--duration': '20s', '--x': '20%', '--y': '70%' }}>
                            <i className="fab fa-python"></i>
                        </div>
                        <div className="tech-icon" style={{ '--delay': '1s', '--duration': '16s', '--x': '70%', '--y': '60%' }}>
                            <i className="fab fa-js"></i>
                        </div>
                        <div className="tech-icon" style={{ '--delay': '3s', '--duration': '17s', '--x': '50%', '--y': '15%' }}>
                            <i className="fab fa-java"></i>
                        </div>
                        <div className="tech-icon" style={{ '--delay': '5s', '--duration': '19s', '--x': '90%', '--y': '80%' }}>
                            <i className="fas fa-database"></i>
                        </div>
                        <div className="tech-icon" style={{ '--delay': '2.5s', '--duration': '21s', '--x': '15%', '--y': '50%' }}>
                            <i className="fab fa-aws"></i>
                        </div>
                        <div className="tech-icon" style={{ '--delay': '4.5s', '--duration': '14s', '--x': '85%', '--y': '10%' }}>
                            <i className="fab fa-docker"></i>
                        </div>
                    </div>
                </div>

                {/* Content */}
                <div className="cp-header-content">
                    <div className="cp-header-left">
                        <div className="company-logo">
                            <i className="fas fa-user-tie"></i>
                        </div>
                        <div className="company-title">
                            <h1>Quản lý ứng viên</h1>
                            <p className="company-industry">Theo dõi, đánh giá và duyệt hồ sơ ứng tuyển</p>
                        </div>
                    </div>
                </div>
            </div>
            {/* Statistics Cards */}
            <div className="cm-statistics">
                <div className="stat-card total">
                    <div className="stat-icon">
                        <i className="fas fa-users"></i>
                    </div>
                    <div className="stat-info">
                        <h3>{statistics.total}</h3>
                        <p>Tổng đơn ứng tuyển</p>
                    </div>
                </div>
                <div className="stat-card pending">
                    <div className="stat-icon">
                        <i className="fas fa-clock"></i>
                    </div>
                    <div className="stat-info">
                        <h3>{statistics.pending}</h3>
                        <p>Đang chờ duyệt</p>
                    </div>
                </div>
                <div className="stat-card approved">
                    <div className="stat-icon">
                        <i className="fas fa-check-circle"></i>
                    </div>
                    <div className="stat-info">
                        <h3>{statistics.approved}</h3>
                        <p>Đã xét duyệt</p>
                    </div>
                </div>
                <div className="stat-card rejected">
                    <div className="stat-icon">
                        <i className="fas fa-times-circle"></i>
                    </div>
                    <div className="stat-info">
                        <h3>{statistics.rejected}</h3>
                        <p>Đã từ chối</p>
                    </div>
                </div>
            </div>

            {/* Search and Filters */}
            <div className="cm-filters">
                <div className="search-box">
                    <i className="fas fa-search"></i>
                    <input
                        type="text"
                        placeholder="Tìm kiếm theo tên, email, SĐT, vị trí..."
                        value={searchKeyword}
                        onChange={handleSearch}
                    />
                    {searchKeyword && (
                        <button className="clear-search" onClick={() => setSearchKeyword('')}>
                            <i className="fas fa-times"></i>
                        </button>
                    )}
                </div>
                
                {/* Job Posting Filter - Only show if there are active jobs */}
                {activeJobs && activeJobs.length > 0 && (
                    <div className="job-filter-dropdown">
                        <label htmlFor="jobFilter">
                            <i className="fas fa-briefcase"></i> Lọc theo tin tuyển dụng:
                        </label>
                        <select 
                            id="jobFilter"
                            value={selectedJobId} 
                            onChange={(e) => {
                                setSelectedJobId(e.target.value);
                                setCurrentPage(1);
                            }}
                        >
                            <option value="all">Tất cả tin tuyển dụng</option>
                            {activeJobs.map(job => (
                                <option key={job.id} value={job.id}>
                                    {job.Tieude} - {job.Company?.Tencongty} ({job.Diadiem})
                                </option>
                            ))}
                        </select>
                    </div>
                )}

                <div className="filter-buttons">
                    <button 
                        className={selectedStatus === 'all' ? 'active' : ''}
                        onClick={() => handleStatusFilter('all')}
                    >
                        <i className="fas fa-list"></i> Tất cả ({statistics.total})
                    </button>
                    <button 
                        className={selectedStatus === '1' ? 'active' : ''}
                        onClick={() => handleStatusFilter('1')}
                    >
                        <i className="fas fa-clock"></i> Đang chờ ({statistics.pending})
                    </button>
                    <button 
                        className={selectedStatus === '4' ? 'active' : ''}
                        onClick={() => handleStatusFilter('4')}
                    >
                        <i className="fas fa-check-circle"></i> Đã duyệt ({statistics.approved})
                    </button>
                    <button 
                        className={selectedStatus === '3' ? 'active' : ''}
                        onClick={() => handleStatusFilter('3')}
                    >
                        <i className="fas fa-times-circle"></i> Từ chối ({statistics.rejected})
                    </button>
                </div>
            </div>

            {/* Applications Table */}
            <div className="cm-table-container">
                {loading ? (
                    <div className="loading-state">
                        <i className="fas fa-spinner fa-spin"></i>
                        <p>Đang tải dữ liệu...</p>
                    </div>
                ) : applications.length === 0 ? (
                    <div className="empty-state">
                        <i className="fas fa-inbox"></i>
                        <p>Chưa có đơn ứng tuyển nào!</p>
                    </div>
                ) : (
                    <>
                        <table className="cm-table">
                            <thead>
                                <tr>
                                    <th>STT</th>
                                    <th>Ứng viên</th>
                                    <th>Vị trí ứng tuyển</th>
                                    <th>Công ty</th>
                                    <th>CV</th>
                                    <th>Ngày nộp</th>
                                    <th>Trạng thái</th>
                                    <th>Thao tác</th>
                                </tr>
                            </thead>
                            <tbody>
                                {applications.map((app, index) => (
                                    <tr key={app.id}>
                                        <td>{(currentPage - 1) * limit + index + 1}</td>
                                        <td>
                                            <div className="candidate-info">
                                                <div className="candidate-avatar">
                                                    {app.Record?.User?.Hoten?.charAt(0).toUpperCase() || 'U'}
                                                </div>
                                                <div className="candidate-details">
                                                    <strong>{app.Record?.User?.Hoten || 'N/A'}</strong>
                                                    <small>{app.Record?.User?.email}</small>
                                                    {app.Record?.User?.SDT && (
                                                        <small><i className="fas fa-phone"></i> {app.Record?.User?.SDT}</small>
                                                    )}
                                                </div>
                                            </div>
                                        </td>
                                        <td>
                                            <div className="job-info">
                                                <strong>{app.JobPosting?.Tieude || 'N/A'}</strong>
                                                <small>{formatSalary(app.JobPosting?.Luongtoithieu, app.JobPosting?.Luongtoida)}</small>
                                            </div>
                                        </td>
                                        <td>
                                            <div className="company-info">
                                                <div className="company-logo-placeholder">
                                                    <i className="fas fa-building"></i>
                                                </div>
                                                <span>{app.JobPosting?.Company?.Tencongty || 'N/A'}</span>
                                            </div>
                                        </td>
                                        <td>
                                            {app.Record?.File_url ? (
                                                <a 
                                                    href={`http://localhost:8082${app.Record.File_url}`} 
                                                    target="_blank" 
                                                    rel="noopener noreferrer"
                                                    className="cv-link"
                                                >
                                                    <i className="fas fa-file-pdf"></i> Xem CV
                                                </a>
                                            ) : (
                                                <span className="no-cv">Chưa có CV</span>
                                            )}
                                        </td>
                                        <td>{formatDate(app.Ngaynop)}</td>
                                        <td>{getStatusBadge(app.ApplicationStatus)}</td>
                                        <td>
                                            <div className="action-buttons">
                                                <button 
                                                    className="btn-view"
                                                    onClick={() => handleViewDetail(app.id)}
                                                    title="Xem chi tiết"
                                                >
                                                    <i className="fas fa-eye"></i>
                                                </button>
                                                {app.applicationStatusId === 1 && (
                                                    <>
                                                        <button 
                                                            className="btn-approve"
                                                            onClick={() => handleApprove(app)}
                                                            title="Duyệt"
                                                        >
                                                            <i className="fas fa-check"></i>
                                                        </button>
                                                        <button 
                                                            className="btn-reject"
                                                            onClick={() => handleReject(app)}
                                                            title="Từ chối"
                                                        >
                                                            <i className="fas fa-times"></i>
                                                        </button>
                                                    </>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>

                        {/* Pagination */}
                        {totalPages > 1 && (
                            <div className="cm-pagination">
                                <div className="pagination-info">
                                    Hiển thị {(currentPage - 1) * limit + 1} - {Math.min(currentPage * limit, totalRows)} / {totalRows} ứng viên
                                </div>
                                <ReactPaginate
                                    nextLabel={<i className="fas fa-chevron-right"></i>}
                                    onPageChange={handlePageClick}
                                    pageRangeDisplayed={3}
                                    marginPagesDisplayed={2}
                                    pageCount={totalPages}
                                    previousLabel={<i className="fas fa-chevron-left"></i>}
                                    pageClassName="page-item"
                                    pageLinkClassName="page-link"
                                    previousClassName="page-item"
                                    previousLinkClassName="page-link"
                                    nextClassName="page-item"
                                    nextLinkClassName="page-link"
                                    breakLabel="..."
                                    breakClassName="page-item"
                                    breakLinkClassName="page-link"
                                    containerClassName="pagination"
                                    activeClassName="active"
                                    forcePage={currentPage - 1}
                                />
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* Application Detail Modal */}
            {showDetailModal && selectedApplication && (
                <ApplicationDetailModal
                    application={selectedApplication}
                    userId={user?.id}
                    onClose={() => {
                        setShowDetailModal(false);
                        setSelectedApplication(null);
                    }}
                    onApprove={() => {
                        setShowDetailModal(false);
                        handleApprove(selectedApplication);
                    }}
                    onReject={() => {
                        setShowDetailModal(false);
                        handleReject(selectedApplication);
                    }}
                />
            )}

            {/* Confirm Modal */}
            {showConfirmModal && confirmAction && (
                <ConfirmModal
                    show={showConfirmModal}
                    onClose={() => {
                        setShowConfirmModal(false);
                        setConfirmAction(null);
                    }}
                    onConfirm={confirmStatusUpdate}
                    title={confirmAction.type === 'approve' ? 'Xác nhận duyệt ứng viên' : 'Xác nhận từ chối ứng viên'}
                    message={
                        confirmAction.type === 'approve' 
                            ? `Bạn có chắc chắn muốn duyệt ứng viên "${confirmAction.application.Record?.User?.Hoten}" cho vị trí "${confirmAction.application.JobPosting?.Tieude}"?`
                            : `Bạn có chắc chắn muốn từ chối ứng viên "${confirmAction.application.Record?.User?.Hoten}" cho vị trí "${confirmAction.application.JobPosting?.Tieude}"?`
                    }
                    type={confirmAction.type === 'approve' ? 'success' : 'danger'}
                />
            )}
        </div>
    );
};

export default CandidateManagement;

