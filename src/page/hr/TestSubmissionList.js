import React, { useEffect, useMemo, useState } from 'react';
import ReactPaginate from 'react-paginate';
import { toast } from 'react-toastify';
import { getTestSubmissions, updateApplicationStatus } from '../../service.js/hrService';
import GradeModal from './GradeModal';
import './TestSubmissionList.scss';

const STATUS_FILTERS = [
    { value: 'all', label: 'Tất cả' },
    { value: 'danop', label: 'Đã nộp' },
    { value: 'dacham', label: 'Đã chấm' }
];

const TestSubmissionList = ({ userId }) => {
    const [submissions, setSubmissions] = useState([]);
    const [jobOptions, setJobOptions] = useState([]);
    const [stats, setStats] = useState({ total: 0, pending: 0, graded: 0 });
    const [statusFilter, setStatusFilter] = useState('all');
    const [jobFilter, setJobFilter] = useState('all');
    const [searchKeyword, setSearchKeyword] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [pagination, setPagination] = useState({ totalRows: 0, totalPages: 0, currentPage: 1, limit: 10 });
    const [isLoading, setIsLoading] = useState(false);
    const [showGradeModal, setShowGradeModal] = useState(false);
    const [selectedSubmissionId, setSelectedSubmissionId] = useState(null);
    const [showSelectionFilter, setShowSelectionFilter] = useState(false);
    const [scoreSortOrder, setScoreSortOrder] = useState('desc'); // 'desc' = cao đến thấp, 'asc' = thấp đến cao
    const [selectedCount, setSelectedCount] = useState('');
    const [isApproving, setIsApproving] = useState(false);
    const [approvingId, setApprovingId] = useState(null);

    // Generate binary code strings (stable across renders)
    const generateBinaryCode = (length) => {
        return Array.from({ length }, () => (Math.random() > 0.5 ? '1' : '0'));
    };

    const [binaryColumns] = useState([
        generateBinaryCode(20),
        generateBinaryCode(20),
        generateBinaryCode(20)
    ]);

    useEffect(() => {
        if (!userId) return;
        fetchSubmissions();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [userId, statusFilter, jobFilter, searchKeyword, currentPage]);

    const fetchSubmissions = async () => {
        setIsLoading(true);
        try {
            const res = await getTestSubmissions(userId, {
                status: statusFilter,
                jobPostingId: jobFilter,
                search: searchKeyword.trim(),
                page: currentPage
            });

            if (res && res.EC === 0) {
                // Lọc bỏ những ứng viên đã bị từ chối (applicationStatusId = 3)
                let filteredSubmissions = (res.DT?.submissions || []).filter(sub => {
                    // Nếu không có JobApplication hoặc applicationStatusId = 3 (từ chối) thì ẩn
                    if (!sub.JobApplication || sub.JobApplication.applicationStatusId === 3) {
                        return false;
                    }
                    return true;
                });

                // Sắp xếp: ưu tiên hiển thị trạng thái "đã nộp bài" (danop) lên đầu
                filteredSubmissions.sort((a, b) => {
                    // Nếu a là "danop" và b không phải → a lên trước
                    if (a.Trangthai === 'danop' && b.Trangthai !== 'danop') {
                        return -1;
                    }
                    // Nếu b là "danop" và a không phải → b lên trước
                    if (b.Trangthai === 'danop' && a.Trangthai !== 'danop') {
                        return 1;
                    }
                    // Còn lại giữ nguyên thứ tự
                    return 0;
                });

                setSubmissions(filteredSubmissions);
                setJobOptions(res.DT?.filterOptions?.jobPostings || []);
                setStats(res.DT?.stats || { total: 0, pending: 0, graded: 0 });
                setPagination(res.DT?.pagination || { totalRows: 0, totalPages: 0, currentPage: 1, limit: 10 });
            } else {
                toast.error(res?.EM || 'Không thể tải danh sách bài test đã nộp!');
                setSubmissions([]);
            }
        } catch (error) {
            console.error('Error fetching test submissions:', error);
            toast.error('Có lỗi xảy ra khi tải danh sách bài test đã nộp!');
            setSubmissions([]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleStatusChange = (value) => {
        setStatusFilter(value);
        setCurrentPage(1);
    };

    const handleJobChange = (e) => {
        setJobFilter(e.target.value);
        setCurrentPage(1);
    };

    const handleSearchChange = (e) => {
        setSearchKeyword(e.target.value);
        setCurrentPage(1);
    };

    const handlePageClick = (event) => {
        setCurrentPage(event.selected + 1);
    };

    const formatDateTime = (value) => {
        if (!value) return 'N/A';
        return new Date(value).toLocaleString('vi-VN');
    };

    const handleOpenGradeModal = (submissionId) => {
        setSelectedSubmissionId(submissionId);
        setShowGradeModal(true);
    };

    const handleCloseGradeModal = () => {
        setShowGradeModal(false);
        setSelectedSubmissionId(null);
    };

    const handleGraded = () => {
        fetchSubmissions(); // Refresh list after grading
    };

    const handleApproveCandidate = async (submission) => {
        if (approvingId) return; // đang duyệt
        if (!submission.JobApplication?.id) {
            toast.error('Không tìm thấy đơn ứng tuyển!');
            return;
        }

        if (submission.Trangthai !== 'dacham') {
            toast.warning('Chỉ có thể duyệt ứng viên đã chấm điểm!');
            return;
        }

        try {
            setApprovingId(submission.id);
            const toastId = toast.info('Đang duyệt ứng viên...', { autoClose: false });
            const res = await updateApplicationStatus(
                userId,
                submission.JobApplication.id,
                7 // Status ID 7: Chuẩn bị phỏng vấn
            );

            toast.dismiss(toastId);

            if (res.EC === 0) {
                toast.success(`Đã duyệt ứng viên ${submission.User?.Hoten || ''} vào vòng phỏng vấn!`);
                fetchSubmissions(); // Refresh list
            } else {
                toast.error(res.EM || 'Không thể duyệt ứng viên!');
            }
        } catch (error) {
            console.error('Error approving candidate:', error);
            toast.error('Có lỗi xảy ra khi duyệt ứng viên!');
        } finally {
            setApprovingId(null);
        }
    };

    const handleRejectCandidate = async (submission) => {
        if (!submission.JobApplication?.id) {
            toast.error('Không tìm thấy đơn ứng tuyển!');
            return;
        }

        if (submission.Trangthai !== 'dacham') {
            toast.warning('Chỉ có thể từ chối ứng viên đã chấm điểm!');
            return;
        }

        if (!window.confirm(`Bạn có chắc chắn muốn từ chối ứng viên ${submission.User?.Hoten || ''}?`)) {
            return;
        }

        try {
            const res = await updateApplicationStatus(
                userId,
                submission.JobApplication.id,
                3 // Status ID 3: Từ chối
            );

            if (res.EC === 0) {
                toast.success(`Đã từ chối ứng viên ${submission.User?.Hoten || ''}!`);
                fetchSubmissions(); // Refresh list
            } else {
                toast.error(res.EM || 'Không thể từ chối ứng viên!');
            }
        } catch (error) {
            console.error('Error rejecting candidate:', error);
            toast.error('Có lỗi xảy ra khi từ chối ứng viên!');
        }
    };

    const handleToggleSelectionFilter = () => {
        if (!showSelectionFilter && jobFilter === 'all') {
            toast.warning('Vui lòng chọn tin tuyển dụng trước khi sử dụng tính năng tuyển chọn!');
            return;
        }
        setShowSelectionFilter(!showSelectionFilter);
        if (!showSelectionFilter) {
            setScoreSortOrder('desc');
            setSelectedCount('');
        }
    };

    const handleApproveCandidates = async () => {
        if (!selectedCount || parseInt(selectedCount) <= 0) {
            toast.error('Vui lòng nhập số lượng ứng viên cần duyệt!');
            return;
        }

        if (jobFilter === 'all') {
            toast.error('Vui lòng chọn tin tuyển dụng trước khi duyệt!');
            return;
        }

        // Lấy tất cả submissions đã chấm điểm của tin tuyển dụng này
        try {
            setIsApproving(true);
            const res = await getTestSubmissions(userId, {
                status: 'dacham',
                jobPostingId: jobFilter,
                search: '',
                page: 1,
                limit: 1000 // Lấy tất cả
            });

            if (res && res.EC === 0) {
                let candidates = res.DT?.submissions || [];

                // Lọc chỉ những submission đã chấm điểm và có điểm
                candidates = candidates.filter(sub => 
                    sub.Trangthai === 'dacham' && 
                    sub.Tongdiemdatduoc !== null &&
                    sub.JobApplication?.id
                );

                // Sắp xếp theo điểm
                candidates.sort((a, b) => {
                    const scoreA = a.Tongdiemdatduoc || 0;
                    const scoreB = b.Tongdiemdatduoc || 0;
                    return scoreSortOrder === 'desc' ? scoreB - scoreA : scoreA - scoreB;
                });

                // Lấy số lượng đã chọn
                const count = parseInt(selectedCount);
                const toApprove = candidates.slice(0, count);

                if (toApprove.length === 0) {
                    toast.warning('Không có ứng viên nào đủ điều kiện để duyệt!');
                    setIsApproving(false);
                    return;
                }

                // Duyệt từng ứng viên (statusId = 7: Chuẩn bị phỏng vấn)
                let successCount = 0;
                let failCount = 0;

                for (const submission of toApprove) {
                    try {
                        const approveRes = await updateApplicationStatus(
                            userId,
                            submission.JobApplication.id,
                            7 // Status ID 7: Chuẩn bị phỏng vấn
                        );
                        if (approveRes.EC === 0) {
                            successCount++;
                        } else {
                            failCount++;
                        }
                    } catch (error) {
                        console.error('Error approving candidate:', error);
                        failCount++;
                    }
                }

                if (successCount > 0) {
                    toast.success(`Đã duyệt thành công ${successCount} ứng viên vào vòng phỏng vấn!`);
                    fetchSubmissions(); // Refresh list
                    setShowSelectionFilter(false);
                    setSelectedCount('');
                }

                if (failCount > 0) {
                    toast.warning(`${failCount} ứng viên không thể duyệt. Vui lòng kiểm tra lại!`);
                }
            } else {
                toast.error(res?.EM || 'Không thể lấy danh sách ứng viên!');
            }
        } catch (error) {
            console.error('Error approving candidates:', error);
            toast.error('Có lỗi xảy ra khi duyệt ứng viên!');
        } finally {
            setIsApproving(false);
        }
    };

    const statusBadgeClass = useMemo(() => ({
        danop: 'badge-submitted',
        dacham: 'badge-graded',
        danglam: 'badge-doing',
        chuabatdau: 'badge-pending'
    }), []);

    return (
        <div className="test-submission-page">
            <div className="cp-header">
                {/* Animated Background Effects */}
                <div className="header-bg-effects">
                    <div className="animated-gradient"></div>
                    <div className="tech-grid"></div>
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
                    <div className="binary-code">
                        {binaryColumns.map((column, colIndex) => (
                            <div key={colIndex} className="binary-column">
                                {column.map((digit, i) => (
                                    <span key={i} className="binary-digit">{digit}</span>
                                ))}
                            </div>
                        ))}
                    </div>
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
                            <i className="fas fa-users"></i>
                        </div>
                        <div className="company-title">
                            <h1>Danh sách ứng viên nộp bài test</h1>
                            <p className="company-industry">Theo dõi các bài test đã nộp và chuẩn bị chấm điểm</p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="ts-stats">
                <div className="stat-card total">
                    <div>
                        <p>Tổng số bài nộp</p>
                        <h3>{stats.total}</h3>
                    </div>
                    <i className="fas fa-file-alt"></i>
                </div>
                <div className="stat-card pending">
                    <div>
                        <p>Chờ chấm</p>
                        <h3>{stats.pending}</h3>
                    </div>
                    <i className="fas fa-hourglass-half"></i>
                </div>
                <div className="stat-card graded">
                    <div>
                        <p>Đã chấm</p>
                        <h3>{stats.graded}</h3>
                    </div>
                    <i className="fas fa-check-circle"></i>
                </div>
            </div>

            <div className="ts-filters">
                <div className="search-box">
                    <i className="fas fa-search"></i>
                    <input
                        type="text"
                        placeholder="Tìm kiếm theo tên, email, số điện thoại..."
                        value={searchKeyword}
                        onChange={handleSearchChange}
                    />
                    {searchKeyword && (
                        <button className="clear-search" onClick={() => setSearchKeyword('')}>
                            <i className="fas fa-times"></i>
                        </button>
                    )}
                </div>

                <div className="filter-group">
                    <select value={jobFilter} onChange={handleJobChange}>
                        <option value="all">Tất cả tin tuyển dụng</option>
                        {jobOptions.map(job => (
                            <option key={job.id} value={job.id}>
                                {job.title} - {job.companyName}
                            </option>
                        ))}
                    </select>
                    <div className="status-filters">
                        {STATUS_FILTERS.map(option => (
                            <button
                                key={option.value}
                                className={statusFilter === option.value ? 'active' : ''}
                                onClick={() => handleStatusChange(option.value)}
                            >
                                {option.label}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="selection-section">
                    <button 
                        className="btn-selection-toggle"
                        onClick={handleToggleSelectionFilter}
                    >
                        <i className="fas fa-check-circle"></i>
                        Tuyển chọn
                    </button>

                    {showSelectionFilter && (
                        <div className="selection-filter-panel">
                            <div className="filter-row">
                                <label>
                                    <i className="fas fa-sort-amount-down"></i>
                                    Sắp xếp theo điểm:
                                </label>
                                <select 
                                    value={scoreSortOrder} 
                                    onChange={(e) => setScoreSortOrder(e.target.value)}
                                    disabled={jobFilter === 'all'}
                                >
                                    <option value="desc">Cao đến thấp</option>
                                    <option value="asc">Thấp đến cao</option>
                                </select>
                                {jobFilter === 'all' && (
                                    <span className="warning-text">
                                        <i className="fas fa-exclamation-triangle"></i>
                                        Vui lòng chọn tin tuyển dụng trước
                                    </span>
                                )}
                            </div>

                            <div className="filter-row">
                                <label>
                                    <i className="fas fa-users"></i>
                                    Số lượng ứng viên cần duyệt:
                                </label>
                                <input
                                    type="number"
                                    min="1"
                                    value={selectedCount}
                                    onChange={(e) => setSelectedCount(e.target.value)}
                                    placeholder="Nhập số lượng"
                                    disabled={jobFilter === 'all'}
                                />
                            </div>

                            <div className="filter-actions">
                                <button
                                    className="btn-approve-batch"
                                    onClick={handleApproveCandidates}
                                    disabled={!selectedCount || jobFilter === 'all' || isApproving}
                                >
                                    {isApproving ? (
                                        <>
                                            <i className="fas fa-spinner fa-spin"></i>
                                            Đang duyệt...
                                        </>
                                    ) : (
                                        <>
                                            <i className="fas fa-check"></i>
                                            Duyệt
                                        </>
                                    )}
                                </button>
                                <button
                                    className="btn-cancel-selection"
                                    onClick={() => {
                                        setShowSelectionFilter(false);
                                        setSelectedCount('');
                                        setScoreSortOrder('desc');
                                    }}
                                >
                                    <i className="fas fa-times"></i>
                                    Hủy
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <div className="ts-table-container">
                {isLoading ? (
                    <div className="loading-state">
                        <i className="fas fa-spinner fa-spin"></i>
                        <p>Đang tải dữ liệu...</p>
                    </div>
                ) : submissions.length === 0 ? (
                    <div className="empty-state">
                        <i className="fas fa-folder-open"></i>
                        <p>Chưa có ứng viên nào nộp bài test!</p>
                    </div>
                ) : (
                    <>
                        <table className="ts-table">
                            <thead>
                                <tr>
                                    <th>Ứng viên</th>
                                    <th>Bài test</th>
                                    <th>Tin tuyển dụng</th>
                                    <th>Điểm</th>
                                    <th>Trạng thái</th>
                                    <th>Cập nhật</th>
                                    <th>Thao tác</th>
                                </tr>
                            </thead>
                            <tbody>
                                {submissions.map(sub => (
                                    <tr key={sub.id}>
                                        <td>
                                            <div className="candidate-info">
                                                <div className="avatar">
                                                    {sub.User?.Hoten ? sub.User.Hoten.charAt(0).toUpperCase() : 'U'}
                                                </div>
                                                <div>
                                                    <strong>{sub.User?.Hoten || 'N/A'}</strong>
                                                    <small>{sub.User?.email}</small>
                                                    {sub.User?.SDT && <small><i className="fas fa-phone"></i> {sub.User.SDT}</small>}
                                                </div>
                                            </div>
                                        </td>
                                        <td>
                                            <div className="test-info">
                                                <strong>{sub.Test?.Tieude}</strong>
                                                <small>Mã bài: #{sub.Test?.id}</small>
                                            </div>
                                        </td>
                                        <td>
                                            <div className="job-info">
                                                <strong>{sub.Test?.JobPosting?.Tieude}</strong>
                                                <small>{sub.Test?.JobPosting?.Company?.Tencongty}</small>
                                            </div>
                                        </td>
                                        <td className="score-col">
                                            {sub.Trangthai === 'dacham'
                                                ? `${(sub.Tongdiemdatduoc || 0).toFixed(1)} / ${(sub.Test?.Tongdiem || 100)}`
                                                : '--'}
                                        </td>
                                        <td>
                                            <span className={`status-badge ${statusBadgeClass[sub.Trangthai] || ''}`}>
                                                {sub.Trangthai === 'danop' && 'Đã nộp bài'}
                                                {sub.Trangthai === 'dacham' && 'Đã chấm điểm'}
                                                {sub.Trangthai === 'danglam' && 'Đang làm bài'}
                                                {sub.Trangthai === 'chuabatdau' && 'Chưa bắt đầu'}
                                            </span>
                                        </td>
                                        <td>{formatDateTime(sub.updatedAt)}</td>
                                        <td>
                                            <div className="action-buttons">
                                                <button
                                                    className="btn-grade"
                                                    onClick={() => handleOpenGradeModal(sub.id)}
                                                    disabled={sub.Trangthai !== 'danop' && sub.Trangthai !== 'dacham'}
                                                >
                                                    <i className="fas fa-pen"></i>
                                                    {sub.Trangthai === 'dacham' ? 'Xem lại' : 'Chấm bài'}
                                                </button>
                                                {sub.Trangthai === 'dacham' && (
                                                    <>
                                                        {/* Chỉ hiển thị nút "Duyệt" nếu chưa duyệt (applicationStatusId !== 7) */}
                                                        {sub.JobApplication?.applicationStatusId !== 7 && (
                                                            <button
                                                                className="btn-approve"
                                                                onClick={() => handleApproveCandidate(sub)}
                                                                title="Duyệt vào vòng phỏng vấn"
                                                            >
                                                                <i className="fas fa-check"></i>
                                                                Duyệt
                                                            </button>
                                                        )}
                                                        {/* Chỉ hiển thị nút "Từ chối" nếu chưa duyệt và chưa từ chối */}
                                                        {sub.JobApplication?.applicationStatusId !== 7 && 
                                                         sub.JobApplication?.applicationStatusId !== 3 && (
                                                            <button
                                                                className="btn-reject"
                                                                onClick={() => handleRejectCandidate(sub)}
                                                                title="Từ chối ứng viên"
                                                            >
                                                                <i className="fas fa-times"></i>
                                                                Từ chối
                                                            </button>
                                                        )}
                                                    </>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>

                        {pagination.totalPages > 1 && (
                            <div className="ts-pagination">
                                <div className="pagination-info">
                                    Hiển thị {(pagination.currentPage - 1) * pagination.limit + 1} - {Math.min(pagination.currentPage * pagination.limit, pagination.totalRows)} / {pagination.totalRows} bài nộp
                                </div>
                                <ReactPaginate
                                    nextLabel={<i className="fas fa-chevron-right"></i>}
                                    previousLabel={<i className="fas fa-chevron-left"></i>}
                                    onPageChange={handlePageClick}
                                    forcePage={pagination.currentPage - 1}
                                    pageCount={pagination.totalPages}
                                    marginPagesDisplayed={2}
                                    pageRangeDisplayed={3}
                                    containerClassName="pagination"
                                    pageClassName="page-item"
                                    pageLinkClassName="page-link"
                                    previousClassName="page-item"
                                    previousLinkClassName="page-link"
                                    nextClassName="page-item"
                                    nextLinkClassName="page-link"
                                    activeClassName="active"
                                    breakLabel="..."
                                />
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* Grade Modal */}
            {showGradeModal && selectedSubmissionId && (
                <GradeModal
                    show={showGradeModal}
                    onClose={handleCloseGradeModal}
                    submissionId={selectedSubmissionId}
                    hrUserId={userId}
                    onGraded={handleGraded}
                />
            )}
        </div>
    );
};

export default TestSubmissionList;