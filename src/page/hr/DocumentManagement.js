import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import ReactPaginate from 'react-paginate';
import { getAllDocumentsForHr, updateDocumentStatus } from '../../service.js/applicationDocumentService';
import { getActiveJobPostings } from '../../service.js/hrService';
import './DocumentManagement.scss';

const DOCUMENT_TYPES = {
    'job_application_letter': 'Đơn xin việc',
    'id_card_copy': 'Bản sao Căn cước công dân',
    'resume_certified': 'Sơ yếu lý lịch có chứng thực',
    'degree_certified': 'Bản sao bằng cấp có chứng thực',
    'health_certificate': 'Giấy khám sức khỏe',
    'bank_account': 'Số tài khoản ngân hàng BIDV'
};

const STATUS_OPTIONS = [
    { value: 'all', label: 'Tất cả trạng thái' },
    { value: 'pending', label: 'Chờ duyệt' },
    { value: 'approved', label: 'Đã duyệt' },
    { value: 'rejected', label: 'Từ chối' }
];

const DocumentManagement = ({ userId }) => {
    const [user, setUser] = useState(null);
    const [documents, setDocuments] = useState([]);
    const [loading, setLoading] = useState(false);
    const [selectedStatus, setSelectedStatus] = useState('all');
    const [selectedDocumentType, setSelectedDocumentType] = useState('all');
    const [selectedJobId, setSelectedJobId] = useState('all');
    const [activeJobs, setActiveJobs] = useState([]);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(0);
    const [totalRows, setTotalRows] = useState(0);
    const [updatingStatus, setUpdatingStatus] = useState(null);
    const [expandedApplications, setExpandedApplications] = useState(new Set());
    const [approvingAll, setApprovingAll] = useState(null); // Track which application is being approved all
    const limit = 10;

    useEffect(() => {
        const userStr = sessionStorage.getItem('user') || localStorage.getItem('user');
        if (userStr) {
            const parsedUser = JSON.parse(userStr);
            setUser(parsedUser);
            fetchJobPostings(parsedUser.id);
            fetchDocuments(parsedUser.id);
        }
    }, []);

    useEffect(() => {
        if (user) {
            fetchDocuments(user.id);
        }
    }, [selectedStatus, selectedDocumentType, selectedJobId, currentPage, user]);

    const fetchJobPostings = async (userId) => {
        try {
            const res = await getActiveJobPostings(userId);
            if (res && res.EC === 0) {
                setActiveJobs(res.DT || []);
            }
        } catch (error) {
            console.error('Error fetching job postings:', error);
        }
    };

    const fetchDocuments = async (userId) => {
        setLoading(true);
        try {
            const filters = {
                status: selectedStatus,
                documentType: selectedDocumentType,
                jobPostingId: selectedJobId,
                page: currentPage,
                limit
            };
            const res = await getAllDocumentsForHr(userId, filters);
            if (res && res.EC === 0) {
                setDocuments(res.DT?.documents || []);
                setTotalPages(res.DT?.totalPages || 0);
                setTotalRows(res.DT?.totalRows || 0);
            } else {
                toast.error(res?.EM || 'Không thể tải danh sách tài liệu!');
            }
        } catch (error) {
            console.error('Error fetching documents:', error);
            toast.error('Không thể tải danh sách tài liệu!');
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateStatus = async (documentId, status, notes = '') => {
        setUpdatingStatus(documentId);
        try {
            const res = await updateDocumentStatus(documentId, status, notes, user.id);
            if (res && res.EC === 0) {
                toast.success(res.EM);
                fetchDocuments(user.id);
            } else {
                toast.error(res.EM || 'Có lỗi xảy ra!');
            }
        } catch (error) {
            console.error('Error updating document status:', error);
            toast.error('Có lỗi xảy ra khi cập nhật trạng thái!');
        } finally {
            setUpdatingStatus(null);
        }
    };

    const handleApproveAll = async (applicationId, pendingDocuments) => {
        if (!pendingDocuments || pendingDocuments.length === 0) {
            toast.warning('Không có tài liệu nào cần duyệt!');
            return;
        }

        const confirmed = window.confirm(
            `Bạn có chắc chắn muốn duyệt tất cả ${pendingDocuments.length} tài liệu đang chờ duyệt của ứng viên này?`
        );

        if (!confirmed) return;

        setApprovingAll(applicationId);
        let successCount = 0;
        let failCount = 0;

        try {
            // Duyệt từng document
            for (const doc of pendingDocuments) {
                try {
                    const res = await updateDocumentStatus(doc.id, 'approved', '', user.id);
                    if (res && res.EC === 0) {
                        successCount++;
                    } else {
                        failCount++;
                    }
                } catch (error) {
                    console.error(`Error approving document ${doc.id}:`, error);
                    failCount++;
                }
            }

            // Refresh danh sách
            await fetchDocuments(user.id);

            if (failCount === 0) {
                toast.success(`Đã duyệt thành công ${successCount} tài liệu!`);
            } else {
                toast.warning(`Đã duyệt ${successCount} tài liệu, ${failCount} tài liệu gặp lỗi!`);
            }
        } catch (error) {
            console.error('Error in handleApproveAll:', error);
            toast.error('Có lỗi xảy ra khi duyệt tất cả!');
        } finally {
            setApprovingAll(null);
        }
    };

    const handlePageChange = ({ selected }) => {
        setCurrentPage(selected + 1);
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        const date = new Date(dateString);
        return date.toLocaleDateString('vi-VN', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    };

    const getStatusBadge = (status) => {
        const statusMap = {
            pending: { text: 'Chờ duyệt', class: 'pending', icon: 'fa-clock' },
            approved: { text: 'Đã duyệt', class: 'approved', icon: 'fa-check-circle' },
            rejected: { text: 'Từ chối', class: 'rejected', icon: 'fa-times-circle' }
        };
        const statusInfo = statusMap[status] || { text: status, class: 'default', icon: 'fa-question' };
        return (
            <span className={`status-badge ${statusInfo.class}`}>
                <i className={`fas ${statusInfo.icon}`}></i>
                {statusInfo.text}
            </span>
        );
    };

    // Group documents by application
    const groupDocumentsByApplication = () => {
        const grouped = {};
        documents.forEach(doc => {
            const appId = doc.application?.id;
            if (!appId) return;
            
            if (!grouped[appId]) {
                grouped[appId] = {
                    application: doc.application,
                    documents: []
                };
            }
            grouped[appId].documents.push(doc);
        });
        return Object.values(grouped);
    };

    const toggleApplication = (appId) => {
        const newExpanded = new Set(expandedApplications);
        if (newExpanded.has(appId)) {
            newExpanded.delete(appId);
        } else {
            newExpanded.add(appId);
        }
        setExpandedApplications(newExpanded);
    };

    const groupedApplications = groupDocumentsByApplication();

    return (
        <div className="document-management-container">
            {/* Header */}
            <div className="dm-header">
                <div className="dm-header-left">
                    <h1>
                        <i className="fas fa-file-alt"></i>
                        Quản lý Hồ sơ Bổ sung
                    </h1>
                    <p>Tổng số: {totalRows} tài liệu</p>
                </div>
            </div>

            {/* Filters */}
            <div className="dm-filters">
                <div className="filter-group">
                    <label>
                        <i className="fas fa-filter"></i>
                        Trạng thái:
                    </label>
                    <select 
                        value={selectedStatus} 
                        onChange={(e) => {
                            setSelectedStatus(e.target.value);
                            setCurrentPage(1);
                        }}
                        className="filter-select"
                    >
                        {STATUS_OPTIONS.map(opt => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                    </select>
                </div>

                <div className="filter-group">
                    <label>
                        <i className="fas fa-file"></i>
                        Loại tài liệu:
                    </label>
                    <select 
                        value={selectedDocumentType} 
                        onChange={(e) => {
                            setSelectedDocumentType(e.target.value);
                            setCurrentPage(1);
                        }}
                        className="filter-select"
                    >
                        <option value="all">Tất cả loại</option>
                        {Object.entries(DOCUMENT_TYPES).map(([key, label]) => (
                            <option key={key} value={key}>{label}</option>
                        ))}
                    </select>
                </div>

                <div className="filter-group">
                    <label>
                        <i className="fas fa-briefcase"></i>
                        Tin tuyển dụng:
                    </label>
                    <select 
                        value={selectedJobId} 
                        onChange={(e) => {
                            setSelectedJobId(e.target.value);
                            setCurrentPage(1);
                        }}
                        className="filter-select"
                    >
                        <option value="all">Tất cả tin</option>
                        {activeJobs.map(job => (
                            <option key={job.id} value={job.id}>
                                {job.Tieude}
                            </option>
                        ))}
                    </select>
                </div>

                <button 
                    className="btn-refresh" 
                    onClick={() => fetchDocuments(user?.id)}
                    disabled={loading}
                >
                    <i className="fas fa-sync-alt"></i>
                    Làm mới
                </button>
            </div>

            {/* Documents List */}
            {loading ? (
                <div className="loading-container">
                    <div className="spinner"></div>
                    <p>Đang tải danh sách tài liệu...</p>
                </div>
            ) : documents.length === 0 ? (
                <div className="empty-state">
                    <i className="fas fa-folder-open"></i>
                    <h3>Chưa có tài liệu nào</h3>
                    <p>Không tìm thấy tài liệu phù hợp với bộ lọc của bạn.</p>
                </div>
            ) : (
                <>
                    <div className="applications-list">
                        {groupedApplications.map(group => {
                            const appId = group.application?.id;
                            const isExpanded = expandedApplications.has(appId);
                            const pendingCount = group.documents.filter(d => d.status === 'pending').length;
                            const approvedCount = group.documents.filter(d => d.status === 'approved').length;
                            const rejectedCount = group.documents.filter(d => d.status === 'rejected').length;

                            const pendingDocuments = group.documents.filter(d => d.status === 'pending');
                            const isApprovingAll = approvingAll === appId;

                            return (
                                <div key={appId} className="application-group-card">
                                    <div className="application-group-header">
                                        <div 
                                            className="group-header-left clickable"
                                            onClick={() => toggleApplication(appId)}
                                        >
                                            <div className="candidate-avatar">
                                                {group.application?.candidate?.name?.charAt(0).toUpperCase() || 'U'}
                                            </div>
                                            <div className="group-info">
                                                <h3>{group.application?.candidate?.name || 'N/A'}</h3>
                                                <div className="group-meta">
                                                    <span className="job-title">
                                                        <i className="fas fa-briefcase"></i>
                                                        {group.application?.jobPosting?.title || 'N/A'}
                                                    </span>
                                                    <span className="company-name">
                                                        <i className="fas fa-building"></i>
                                                        {group.application?.jobPosting?.company?.name || 'N/A'}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="group-header-right">
                                            <div className="documents-count">
                                                <i className="fas fa-file-alt"></i>
                                                <span>{group.documents.length} giấy tờ</span>
                                                {pendingCount > 0 && (
                                                    <span className="pending-badge">{pendingCount} chờ duyệt</span>
                                                )}
                                            </div>
                                            {pendingCount > 0 && (
                                                <button 
                                                    className="btn-approve-all"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleApproveAll(appId, pendingDocuments);
                                                    }}
                                                    disabled={isApprovingAll}
                                                    title="Duyệt tất cả tài liệu đang chờ duyệt"
                                                >
                                                    {isApprovingAll ? (
                                                        <>
                                                            <i className="fas fa-spinner fa-spin"></i>
                                                            Đang duyệt...
                                                        </>
                                                    ) : (
                                                        <>
                                                            <i className="fas fa-check-double"></i>
                                                            Duyệt tất cả
                                                        </>
                                                    )}
                                                </button>
                                            )}
                                            <button 
                                                className="expand-btn"
                                                onClick={() => toggleApplication(appId)}
                                            >
                                                <i className={`fas fa-chevron-${isExpanded ? 'up' : 'down'}`}></i>
                                            </button>
                                        </div>
                                    </div>

                                    {isExpanded && (
                                        <div className="application-documents">
                                            {group.documents.map(doc => (
                                                <div key={doc.id} className="document-item">
                                                    <div className="doc-item-header">
                                                        <div className="doc-type-icon">
                                                            <i className="fas fa-file-pdf"></i>
                                                        </div>
                                                        <div className="doc-item-info">
                                                            <h4>{DOCUMENT_TYPES[doc.documentType] || doc.documentType}</h4>
                                                            <div className="doc-item-meta">
                                                                {doc.expiryDate && (
                                                                    <span>
                                                                        <i className="fas fa-calendar-times"></i>
                                                                        Hết hạn: {formatDate(doc.expiryDate)}
                                                                    </span>
                                                                )}
                                                                {doc.bankAccountNumber && (
                                                                    <span>
                                                                        <i className="fas fa-university"></i>
                                                                        Số tài khoản: {doc.bankAccountNumber}
                                                                    </span>
                                                                )}
                                                                <span>
                                                                    <i className="fas fa-calendar"></i>
                                                                    Nộp ngày: {formatDate(doc.application?.submittedDate)}
                                                                </span>
                                                            </div>
                                                            {doc.notes && (
                                                                <p className="doc-notes">
                                                                    <i className="fas fa-sticky-note"></i>
                                                                    {doc.notes}
                                                                </p>
                                                            )}
                                                        </div>
                                                        <div className="doc-item-status">
                                                            {getStatusBadge(doc.status)}
                                                        </div>
                                                    </div>

                                                    <div className="doc-item-actions">
                                                        {doc.fileUrl && (
                                                            <a 
                                                                href={`http://localhost:8082${doc.fileUrl}`}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="btn-view-file"
                                                            >
                                                                <i className="fas fa-eye"></i>
                                                                Xem file
                                                            </a>
                                                        )}
                                                        {doc.status === 'pending' && (
                                                            <>
                                                                <button 
                                                                    className="btn-approve-doc"
                                                                    onClick={() => handleUpdateStatus(doc.id, 'approved')}
                                                                    disabled={updatingStatus === doc.id}
                                                                >
                                                                    {updatingStatus === doc.id ? (
                                                                        <i className="fas fa-spinner fa-spin"></i>
                                                                    ) : (
                                                                        <i className="fas fa-check"></i>
                                                                    )}
                                                                    Duyệt
                                                                </button>
                                                                <button 
                                                                    className="btn-reject-doc"
                                                                    onClick={() => {
                                                                        const notes = window.prompt('Lý do từ chối (tùy chọn):');
                                                                        if (notes !== null) {
                                                                            handleUpdateStatus(doc.id, 'rejected', notes);
                                                                        }
                                                                    }}
                                                                    disabled={updatingStatus === doc.id}
                                                                >
                                                                    {updatingStatus === doc.id ? (
                                                                        <i className="fas fa-spinner fa-spin"></i>
                                                                    ) : (
                                                                        <i className="fas fa-times"></i>
                                                                    )}
                                                                    Từ chối
                                                                </button>
                                                            </>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div className="pagination-container">
                            <ReactPaginate
                                previousLabel={<i className="fas fa-chevron-left"></i>}
                                nextLabel={<i className="fas fa-chevron-right"></i>}
                                breakLabel="..."
                                breakClassName="break-me"
                                pageCount={totalPages}
                                marginPagesDisplayed={2}
                                pageRangeDisplayed={5}
                                onPageChange={handlePageChange}
                                containerClassName="pagination"
                                activeClassName="active"
                                pageClassName="page-item"
                                previousClassName="page-item"
                                nextClassName="page-item"
                                disabledClassName="disabled"
                            />
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

export default DocumentManagement;

