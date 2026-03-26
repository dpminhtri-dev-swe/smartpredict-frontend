import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { 
    getInterviewRounds, 
    createInterviewRound, 
    updateInterviewRound, 
    deleteInterviewRound 
} from '../../service.js/interviewRoundService';
import './InterviewRoundManagement.scss';

const InterviewRoundManagement = ({ userId }) => {
    const [searchParams, setSearchParams] = useSearchParams();
    const navigate = useNavigate();
    const [rounds, setRounds] = useState([]);
    const [jobPostings, setJobPostings] = useState([]);
    const [jobFilter, setJobFilter] = useState('all');
    const [isLoading, setIsLoading] = useState(false);
    const [showFormModal, setShowFormModal] = useState(false);
    const [editingRound, setEditingRound] = useState(null);
    const [formData, setFormData] = useState({
        jobPostingId: '',
        roundNumber: '',
        title: '',
        duration: '',
        description: '',
        isActive: true
    });

    // Generate binary code strings (stable across renders)
    const generateBinaryCode = (length) => {
        return Array.from({ length }, () => (Math.random() > 0.5 ? '1' : '0'));
    };

    const [binaryColumns] = useState([
        generateBinaryCode(20),
        generateBinaryCode(20),
        generateBinaryCode(20)
    ]);

    // Check query params on mount
    useEffect(() => {
        if (userId) {
            const jobPostingId = searchParams.get('jobPostingId');
            const autoOpen = searchParams.get('autoOpen');
            
            if (jobPostingId && autoOpen === 'true') {
                // Set filter to this job posting
                setJobFilter(jobPostingId);
                // Auto open modal with this job posting after data is loaded
                setTimeout(() => {
                    setFormData(prev => ({
                        ...prev,
                        jobPostingId: jobPostingId
                    }));
                    setShowFormModal(true);
                    // Clear query params
                    navigate('/hr/interview-rounds', { replace: true });
                }, 1000);
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [userId]);

    useEffect(() => {
        if (userId) {
            fetchData();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [userId, jobFilter]);

    const fetchData = async () => {
        setIsLoading(true);
        try {
            const roundsRes = await getInterviewRounds(userId, { jobPostingId: jobFilter });

            if (roundsRes && roundsRes.EC === 0) {
                setRounds(roundsRes.DT?.rounds || []);
                setJobPostings(roundsRes.DT?.jobPostings || []);
            } else {
                toast.error(roundsRes?.EM || 'Không thể tải danh sách vòng phỏng vấn!');
                setRounds([]);
                setJobPostings([]);
            }
        } catch (error) {
            console.error('Error fetching data:', error);
            toast.error('Có lỗi xảy ra khi tải dữ liệu!');
            setRounds([]);
            setJobPostings([]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleOpenForm = (round = null) => {
        if (round) {
            setEditingRound(round);
            setFormData({
                jobPostingId: round.jobPostingId,
                roundNumber: round.roundNumber,
                title: round.title,
                duration: round.duration,
                description: round.description || '',
                isActive: round.isActive
            });
        } else {
            setEditingRound(null);
            setFormData({
                jobPostingId: jobFilter !== 'all' ? jobFilter : '',
                roundNumber: '',
                title: '',
                duration: '',
                description: '',
                isActive: true
            });
        }
        setShowFormModal(true);
    };

    const handleCloseForm = () => {
        setShowFormModal(false);
        setEditingRound(null);
        setFormData({
            jobPostingId: '',
            roundNumber: '',
            title: '',
            duration: '',
            description: '',
            isActive: true
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!formData.jobPostingId || !formData.roundNumber || !formData.title || !formData.duration) {
            toast.error('Vui lòng điền đầy đủ thông tin bắt buộc!');
            return;
        }

        try {
            let res;
            if (editingRound) {
                res = await updateInterviewRound(userId, editingRound.id, formData);
            } else {
                res = await createInterviewRound(userId, formData);
            }

            if (res && res.EC === 0) {
                toast.success(res.EM || 'Thao tác thành công!');
                handleCloseForm();
                fetchData();
            } else {
                toast.error(res?.EM || 'Thao tác thất bại!');
            }
        } catch (error) {
            console.error('Error saving interview round:', error);
            toast.error('Có lỗi xảy ra khi lưu vòng phỏng vấn!');
        }
    };

    const handleDelete = async (round) => {
        if (!window.confirm(`Bạn có chắc chắn muốn xóa vòng phỏng vấn "${round.title}"?`)) {
            return;
        }

        try {
            const res = await deleteInterviewRound(userId, round.id);
            if (res && res.EC === 0) {
                toast.success(res.EM || 'Xóa vòng phỏng vấn thành công!');
                fetchData();
            } else {
                toast.error(res?.EM || 'Không thể xóa vòng phỏng vấn!');
            }
        } catch (error) {
            console.error('Error deleting interview round:', error);
            toast.error('Có lỗi xảy ra khi xóa vòng phỏng vấn!');
        }
    };

    const handleJobFilterChange = (e) => {
        setJobFilter(e.target.value);
    };

    // Group rounds by job posting
    const groupedRounds = rounds.reduce((acc, round) => {
        const key = round.JobPosting?.id || 'unknown';
        if (!acc[key]) {
            acc[key] = {
                jobPosting: round.JobPosting,
                rounds: []
            };
        }
        acc[key].rounds.push(round);
        return acc;
    }, {});

    return (
        <div className="interview-round-management">
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
                            <i className="fas fa-video"></i>
                        </div>
                        <div className="company-title">
                            <h1>Quản lý vòng phỏng vấn</h1>
                            <p className="company-industry">Tạo và quản lý các vòng phỏng vấn cho tin tuyển dụng</p>
                        </div>
                    </div>
                    <div className="cp-header-right">
                        <button className="btn-primary" onClick={() => handleOpenForm()}>
                            <i className="fas fa-plus"></i>
                            Tạo vòng phỏng vấn
                        </button>
                    </div>
                </div>
            </div>

            <div className="filters-section">
                <div className="filter-group">
                    <label>
                        <i className="fas fa-briefcase"></i>
                        Lọc theo tin tuyển dụng:
                    </label>
                    <select value={jobFilter} onChange={handleJobFilterChange}>
                        <option value="all">Tất cả tin tuyển dụng</option>
                        {jobPostings.map(job => (
                            <option key={job.id} value={job.id}>
                                {job.title} - {job.companyName}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            <div className="content-container">
                {isLoading ? (
                    <div className="loading-state">
                        <i className="fas fa-spinner fa-spin"></i>
                        <p>Đang tải dữ liệu...</p>
                    </div>
                ) : Object.keys(groupedRounds).length === 0 ? (
                    <div className="empty-state">
                        <i className="fas fa-video-slash"></i>
                        <p>Chưa có vòng phỏng vấn nào!</p>
                        <button className="btn-primary" onClick={() => handleOpenForm()}>
                            <i className="fas fa-plus"></i>
                            Tạo vòng phỏng vấn đầu tiên
                        </button>
                    </div>
                ) : (
                    <div className="rounds-list">
                        {Object.values(groupedRounds).map((group, index) => (
                            <div key={group.jobPosting?.id || index} className="job-rounds-group">
                                <div className="group-header">
                                    <div>
                                        <h3>{group.jobPosting?.Tieude || 'N/A'}</h3>
                                        <p>{group.jobPosting?.Company?.Tencongty || 'N/A'}</p>
                                    </div>
                                    <button 
                                        className="btn-add-round"
                                        onClick={() => {
                                            setFormData(prev => ({ ...prev, jobPostingId: group.jobPosting?.id || '' }));
                                            handleOpenForm();
                                        }}
                                    >
                                        <i className="fas fa-plus"></i>
                                        Thêm vòng
                                    </button>
                                </div>
                                <div className="rounds-grid">
                                    {group.rounds
                                        .sort((a, b) => a.roundNumber - b.roundNumber)
                                        .map(round => (
                                            <div key={round.id} className="round-card">
                                                <div className="round-header">
                                                    <div className="round-number">
                                                        Vòng {round.roundNumber}
                                                    </div>
                                                    <div className="round-status">
                                                        {round.isActive ? (
                                                            <span className="status-active">Đang hoạt động</span>
                                                        ) : (
                                                            <span className="status-inactive">Tạm dừng</span>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="round-body">
                                                    <h4>{round.title}</h4>
                                                    <div className="round-info">
                                                        <div className="info-item">
                                                            <i className="fas fa-clock"></i>
                                                            <span>{round.duration} phút</span>
                                                        </div>
                                                        <div className="info-item">
                                                            <i className="fas fa-calendar-check"></i>
                                                            <span>{round.meetingCount || 0} cuộc phỏng vấn</span>
                                                        </div>
                                                    </div>
                                                    {round.description && (
                                                        <p className="round-description">{round.description}</p>
                                                    )}
                                                </div>
                                                <div className="round-actions">
                                                    <button
                                                        className="btn-edit"
                                                        onClick={() => handleOpenForm(round)}
                                                    >
                                                        <i className="fas fa-edit"></i>
                                                        Sửa
                                                    </button>
                                                    <button
                                                        className="btn-delete"
                                                        onClick={() => handleDelete(round)}
                                                    >
                                                        <i className="fas fa-trash"></i>
                                                        Xóa
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Form Modal */}
            {showFormModal && (
                <div className="modal-overlay" onClick={handleCloseForm}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>
                                {editingRound ? 'Chỉnh sửa vòng phỏng vấn' : 'Tạo vòng phỏng vấn mới'}
                            </h2>
                            <button className="btn-close" onClick={handleCloseForm}>
                                <i className="fas fa-times"></i>
                            </button>
                        </div>
                        <form onSubmit={handleSubmit} className="modal-body">
                            <div className="form-group">
                                <label>
                                    Tin tuyển dụng <span className="required">*</span>
                                </label>
                                <select
                                    value={formData.jobPostingId}
                                    onChange={(e) => setFormData({ ...formData, jobPostingId: e.target.value })}
                                    required
                                    disabled={!!editingRound}
                                >
                                    <option value="">Chọn tin tuyển dụng</option>
                                    {jobPostings.map(job => (
                                        <option key={job.id} value={job.id}>
                                            {job.title} - {job.companyName}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="form-group">
                                <label>
                                    Số vòng <span className="required">*</span>
                                </label>
                                <input
                                    type="number"
                                    min="1"
                                    value={formData.roundNumber}
                                    onChange={(e) => setFormData({ ...formData, roundNumber: e.target.value })}
                                    placeholder="Ví dụ: 1, 2, 3..."
                                    required
                                />
                            </div>

                            <div className="form-group">
                                <label>
                                    Tên vòng phỏng vấn <span className="required">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={formData.title}
                                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                    placeholder="Ví dụ: Phỏng vấn kỹ thuật, Phỏng vấn HR..."
                                    maxLength={100}
                                    required
                                />
                            </div>

                            <div className="form-group">
                                <label>
                                    Thời lượng (phút) <span className="required">*</span>
                                </label>
                                <input
                                    type="number"
                                    min="1"
                                    value={formData.duration}
                                    onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                                    placeholder="Ví dụ: 30, 60..."
                                    required
                                />
                            </div>

                            <div className="form-group">
                                <label>Mô tả / Ghi chú</label>
                                <textarea
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    placeholder="Nhập mô tả hoặc ghi chú về vòng phỏng vấn..."
                                    rows="4"
                                />
                            </div>

                            <div className="form-group">
                                <label className="checkbox-label">
                                    <input
                                        type="checkbox"
                                        checked={formData.isActive}
                                        onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                                    />
                                    <span>Vòng phỏng vấn đang hoạt động</span>
                                </label>
                            </div>

                            <div className="modal-actions">
                                <button type="button" className="btn-cancel" onClick={handleCloseForm}>
                                    Hủy
                                </button>
                                <button type="submit" className="btn-submit">
                                    {editingRound ? 'Cập nhật' : 'Tạo mới'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default InterviewRoundManagement;

