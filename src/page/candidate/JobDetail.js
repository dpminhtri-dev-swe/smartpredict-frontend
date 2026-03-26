import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { getJobPostingById } from '../../service.js/jobPostingService';
import { getMyRecords } from '../../service.js/recordService';
import { applyJob as applyJobService, checkApplied as checkAppliedService } from '../../service.js/jobApplicationService';
import CandidateNav from '../../components/Navigation/CandidateNav';
import Footer from '../../components/Footer/Footer';
import ScrollToTop from '../../components/ScrollToTop/ScrollToTop';
import './JobDetail.scss';

const JobDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [job, setJob] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [user, setUser] = useState(null);
    const [records, setRecords] = useState([]);
    const [recordsLoading, setRecordsLoading] = useState(false);
    const [recordsFetched, setRecordsFetched] = useState(false);
    const [showApplyModal, setShowApplyModal] = useState(false);
    const [selectedRecordId, setSelectedRecordId] = useState('');
    const [coverLetter, setCoverLetter] = useState('');
    const [isApplying, setIsApplying] = useState(false);
    const [hasApplied, setHasApplied] = useState(false);
    const [applicantInfo, setApplicantInfo] = useState({
        fullName: '',
        email: '',
        phone: '',
        desiredLocation: ''
    });

    useEffect(() => {
        fetchJobDetail();
    }, [id]);

    useEffect(() => {
        const storedUser = sessionStorage.getItem('user') || localStorage.getItem('user');
        if (storedUser) {
            const parsedUser = JSON.parse(storedUser);
            setUser(parsedUser);
            setApplicantInfo((prev) => ({
                ...prev,
                fullName: parsedUser.Hoten || '',
                email: parsedUser.email || '',
                phone: parsedUser.SDT || '' // Tự động điền SDT nếu user đã có
            }));
            checkAppliedStatus(parsedUser.id);
        } else {
            setUser(null);
            setApplicantInfo({
                fullName: '',
                email: '',
                phone: '',
                desiredLocation: ''
            });
            setHasApplied(false);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id]);

    useEffect(() => {
        if (showApplyModal && user && !recordsFetched) {
            fetchUserRecords(user.id);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [showApplyModal, user]);

    const fetchJobDetail = async () => {
        setIsLoading(true);
        try {
            let res = await getJobPostingById(id);
            if (res && res.data && res.data.EC === 0) {
                setJob(res.data.DT);
            } else {
                toast.error(res.data.EM || 'Không tìm thấy tin tuyển dụng!');
                navigate('/candidate/jobs');
            }
        } catch (error) {
            console.error('Error fetching job detail:', error);
            toast.error('Đã xảy ra lỗi khi tải thông tin!');
            navigate('/candidate/jobs');
        } finally {
            setIsLoading(false);
        }
    };

    const fetchUserRecords = async (userId) => {
        setRecordsLoading(true);
        try {
            let res = await getMyRecords(userId);
            if (res && res.data && res.data.EC === 0) {
                const recordList = res.data.DT || [];
                setRecords(recordList);
                if (recordList.length > 0) {
                    setSelectedRecordId(recordList[0].id);
                }
            } else {
                toast.error(res.data.EM);
            }
        } catch (error) {
            console.log(error);
            toast.error('Không thể tải danh sách CV!');
        } finally {
            setRecordsLoading(false);
            setRecordsFetched(true);
        }
    };

    const checkAppliedStatus = async (userId) => {
        try {
            let res = await checkAppliedService(userId, id);
            if (res && res.data && res.data.EC === 0) {
                setHasApplied(res.data.DT.hasApplied);
            }
        } catch (error) {
            console.log(error);
        }
    };

    const formatDate = (dateString) => {
        if (!dateString) return '';
        const date = new Date(dateString);
        return date.toLocaleDateString('vi-VN');
    };

    const formatSalary = (min, max) => {
        if (!min && !max) return 'Thỏa thuận';
        if (!max) return `Từ ${min.toLocaleString('vi-VN')} VNĐ`;
        if (!min) return `Lên đến ${max.toLocaleString('vi-VN')} VNĐ`;
        return `${min.toLocaleString('vi-VN')} - ${max.toLocaleString('vi-VN')} VNĐ`;
    };

    const handleApplicantInfoChange = (field, value) => {
        setApplicantInfo((prev) => ({
            ...prev,
            [field]: value
        }));
    };

    const handleOpenApplyModal = () => {
        if (!user) {
            toast.info('Vui lòng đăng nhập để ứng tuyển!');
            navigate('/login');
            return;
        }
        if (hasApplied) {
            toast.info('Bạn đã ứng tuyển công việc này!');
            return;
        }
        // Luôn set phone từ user.SDT nếu có (để hiển thị số điện thoại đã lưu)
        setApplicantInfo((prev) => ({
            ...prev,
            phone: user.SDT || prev.phone || ''
        }));
        setShowApplyModal(true);
    };

    const handleCloseApplyModal = () => {
        setShowApplyModal(false);
        setCoverLetter('');
        setIsApplying(false);
        setRecordsFetched(false);
    };

    const handleSubmitApplication = async () => {
        if (!selectedRecordId) {
            toast.error('Vui lòng chọn CV để ứng tuyển!');
            return;
        }

        setIsApplying(true);
        try {
            let res = await applyJobService({
                userId: user.id,
                jobPostingId: job.id,
                recordId: Number(selectedRecordId),
                coverLetter,
                applicantName: applicantInfo.fullName,
                applicantEmail: applicantInfo.email,
                applicantPhone: applicantInfo.phone,
                desiredLocation: applicantInfo.desiredLocation
            });

            if (res && res.data && res.data.EC === 0) {
                toast.success('Ứng tuyển thành công!');
                setHasApplied(true);
                
                // Nếu user chưa có SDT và đã nhập SDT, cập nhật lại user trong storage
                // (Backend đã tự động update SDT vào DB, giờ chỉ cần update frontend state)
                if (!user.SDT && applicantInfo.phone) {
                    const updatedUser = {
                        ...user,
                        SDT: applicantInfo.phone
                    };
                    setUser(updatedUser);
                    // Update cả localStorage và sessionStorage để đảm bảo đồng bộ
                    const updatedUserString = JSON.stringify(updatedUser);
                    sessionStorage.setItem('user', updatedUserString);
                    localStorage.setItem('user', updatedUserString);
                }
                
                handleCloseApplyModal();
            } else {
                toast.error(res?.data?.EM || 'Ứng tuyển thất bại!');
            }
        } catch (error) {
            console.log(error);
            toast.error('Có lỗi xảy ra khi ứng tuyển!');
        } finally {
            setIsApplying(false);
        }
    };

    const handleBack = () => {
        navigate('/candidate/jobs');
    };

    if (isLoading) {
        return (
            <div className="job-detail-page">
                <CandidateNav />
                <div className="loading-container">
                    <i className="fas fa-spinner fa-spin"></i>
                    <p>Đang tải thông tin...</p>
                </div>
            </div>
        );
    }

    if (!job) {
        return null;
    }

    const isJobOpen = !job.TrangthaiId || job.TrangthaiId === 1;
    const canApply = isJobOpen && !hasApplied;

    return (
        <div className="job-detail-page">
            <CandidateNav />
            
            <div className="job-detail-container">
                {/* Header Section */}
                <div className="job-header-section">
                    <div className="container">
                        <button className="btn-back" onClick={handleBack}>
                            <i className="fas fa-arrow-left"></i>
                            Quay lại
                        </button>

                        <div className="job-header-content">
                            <div className="company-logo-large">
                                {job.Company?.Tencongty?.charAt(0) || 'C'}
                            </div>
                            <div className="job-header-info">
                                <h1 className="job-title">{job.Tieude}</h1>
                                <div className="company-info">
                                    <h3 className="company-name">
                                        <i className="fas fa-building"></i>
                                        {job.Company?.Tencongty || 'Unknown Company'}
                                    </h3>
                                    {job.Company?.Diachi && (
                                        <p className="company-address">
                                            <i className="fas fa-map-marker-alt"></i>
                                            {job.Company.Diachi}
                                        </p>
                                    )}
                                </div>
                                <div className="job-quick-info">
                                    <div className="info-item">
                                        <i className="fas fa-dollar-sign"></i>
                                        <span>{formatSalary(job.Luongtoithieu, job.Luongtoida)}</span>
                                    </div>
                                    <div className="info-item">
                                        <i className="fas fa-map-marker-alt"></i>
                                        <span>{job.Diadiem}</span>
                                    </div>
                                    <div className="info-item">
                                        <i className="fas fa-briefcase"></i>
                                        <span>{job.Kinhnghiem || 'Không yêu cầu'}</span>
                                    </div>
                                    {job.Format && (
                                        <div className="info-item">
                                            <i className="fas fa-clock"></i>
                                            <span>{job.Format.TenHinhThuc}</span>
                                        </div>
                                    )}
                                    {job.interviewRoundsCount > 0 && (
                                        <div className="info-item interview-rounds">
                                            <i className="fas fa-users"></i>
                                            <span>{job.interviewRoundsCount} vòng phỏng vấn</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Main Content */}
                <div className="job-content-section">
                    <div className="container">
                        <div className="content-wrapper">
                            {/* Left Column - Job Details */}
                            <div className="job-details-column">
                                {/* Job Description */}
                                <div className="detail-card">
                                    <h2 className="card-title">
                                        <i className="fas fa-file-alt"></i>
                                        Mô tả công việc
                                    </h2>
                                    <div className="card-content">
                                        <p className="job-description">
                                            {job.Mota || 'Không có mô tả'}
                                        </p>
                                    </div>
                                </div>

                                {/* Job Requirements */}
                                <div className="detail-card">
                                    <h2 className="card-title">
                                        <i className="fas fa-check-circle"></i>
                                        Yêu cầu công việc
                                    </h2>
                                    <div className="card-content">
                                        <div className="requirement-item">
                                            <strong>Kinh nghiệm:</strong>
                                            <span>{job.Kinhnghiem || 'Không yêu cầu'}</span>
                                        </div>
                                        {job.majors && job.majors.length > 0 && (
                                            <div className="requirement-item">
                                                <strong>Ngành nghề:</strong>
                                                <div className="majors-list">
                                                    {job.majors.map((major, index) => (
                                                        <span key={index} className="major-tag">
                                                            {major.TenNghanhNghe}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                        {job.Format && (
                                            <div className="requirement-item">
                                                <strong>Hình thức làm việc:</strong>
                                                <span>{job.Format.TenHinhThuc}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Interview Rounds */}
                                {job.interviewRounds && job.interviewRounds.length > 0 && (
                                    <div className="detail-card">
                                        <h2 className="card-title">
                                            <i className="fas fa-users"></i>
                                            Quy trình phỏng vấn ({job.interviewRoundsCount} vòng)
                                        </h2>
                                        <div className="card-content">
                                            <div className="interview-rounds-list">
                                                {job.interviewRounds.map((round, index) => (
                                                    <div key={round.id} className="round-item">
                                                        <div className="round-header">
                                                            <div className="round-number-badge">
                                                                <span className="round-number">Vòng {round.roundNumber}</span>
                                                            </div>
                                                            <h3 className="round-title">{round.title}</h3>
                                                        </div>
                                                        {round.duration && (
                                                            <div className="round-duration">
                                                                <i className="fas fa-clock"></i>
                                                                <span>Thời lượng: {round.duration} phút</span>
                                                            </div>
                                                        )}
                                                        {round.description && (
                                                            <div className="round-description">
                                                                <p>{round.description}</p>
                                                            </div>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Benefits */}
                                <div className="detail-card">
                                    <h2 className="card-title">
                                        <i className="fas fa-gift"></i>
                                        Quyền lợi
                                    </h2>
                                    <div className="card-content">
                                        <ul className="benefits-list">
                                            <li>
                                                <i className="fas fa-check"></i>
                                                Mức lương: {formatSalary(job.Luongtoithieu, job.Luongtoida)}
                                            </li>
                                            <li>
                                                <i className="fas fa-check"></i>
                                                Làm việc trong môi trường chuyên nghiệp
                                            </li>
                                            <li>
                                                <i className="fas fa-check"></i>
                                                Cơ hội phát triển nghề nghiệp
                                            </li>
                                            <li>
                                                <i className="fas fa-check"></i>
                                                Đầy đủ chế độ theo quy định
                                            </li>
                                        </ul>
                                    </div>
                                </div>
                            </div>

                            {/* Right Column - Company & Info */}
                            <div className="job-sidebar-column">
                                {/* Apply Card */}
                                <div className="sidebar-card apply-card">
                                    <button 
                                        className={`btn-apply-sidebar ${!canApply ? 'disabled' : ''}`} 
                                        onClick={handleOpenApplyModal}
                                        disabled={!canApply}
                                    >
                                        <i className="fas fa-paper-plane"></i>
                                        {hasApplied ? 'Đã ứng tuyển' : 'Ứng tuyển ngay'}
                                    </button>
                                    <div className="deadline-info">
                                        <i className="fas fa-calendar-alt"></i>
                                        <div>
                                            <p className="deadline-label">Hạn nộp CV:</p>
                                            <p className="deadline-date">
                                                {formatDate(job.Ngayhethan) || 'Không giới hạn'}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* Company Info Card */}
                                <div className="sidebar-card company-card">
                                    <h3 className="sidebar-title">
                                        <i className="fas fa-building"></i>
                                        Thông tin công ty
                                    </h3>
                                    <div className="company-details">
                                        <div className="company-logo-sidebar">
                                            {job.Company?.Tencongty?.charAt(0) || 'C'}
                                        </div>
                                        <h4 className="company-name-sidebar">
                                            {job.Company?.Tencongty}
                                        </h4>
                                        
                                        {job.Company?.Nganhnghe && (
                                            <div className="company-detail-item">
                                                <i className="fas fa-industry"></i>
                                                <span>{job.Company.Nganhnghe}</span>
                                            </div>
                                        )}
                                        
                                        {job.Company?.Quymo && (
                                            <div className="company-detail-item">
                                                <i className="fas fa-users"></i>
                                                <span>{job.Company.Quymo}</span>
                                            </div>
                                        )}
                                        
                                        {job.Company?.Diachi && (
                                            <div className="company-detail-item">
                                                <i className="fas fa-map-marker-alt"></i>
                                                <span>{job.Company.Diachi}</span>
                                            </div>
                                        )}
                                        
                                        {job.Company?.Website && (
                                            <div className="company-detail-item">
                                                <i className="fas fa-globe"></i>
                                                <a href={job.Company.Website} target="_blank" rel="noopener noreferrer">
                                                    {job.Company.Website}
                                                </a>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Job Info Card */}
                                <div className="sidebar-card info-card">
                                    <h3 className="sidebar-title">
                                        <i className="fas fa-info-circle"></i>
                                        Thông tin chung
                                    </h3>
                                    <div className="info-details">
                                        <div className="info-detail-item">
                                            <strong>Ngày đăng:</strong>
                                            <span>{formatDate(job.Ngaydang)}</span>
                                        </div>
                                        {job.JobPostingStatus && (
                                            <div className="info-detail-item">
                                                <strong>Trạng thái:</strong>
                                                <span className="status-badge">
                                                    {job.JobPostingStatus.TenTrangThai}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Contact Card */}
                                {job.Recruiter && (
                                    <div className="sidebar-card contact-card">
                                        <h3 className="sidebar-title">
                                            <i className="fas fa-user-tie"></i>
                                            Người liên hệ
                                        </h3>
                                        <div className="contact-details">
                                            {job.Recruiter.User && (
                                                <div className="contact-item">
                                                    <i className="fas fa-user"></i>
                                                    <span>{job.Recruiter.User.Hoten}</span>
                                                </div>
                                            )}
                                            {job.Recruiter.Chucvu && (
                                                <div className="contact-item">
                                                    <i className="fas fa-briefcase"></i>
                                                    <span>{job.Recruiter.Chucvu}</span>
                                                </div>
                                            )}
                                            {job.Recruiter.SDT && (
                                                <div className="contact-item">
                                                    <i className="fas fa-phone"></i>
                                                    <span>{job.Recruiter.SDT}</span>
                                                </div>
                                            )}
                                            {job.Recruiter.User?.email && (
                                                <div className="contact-item">
                                                    <i className="fas fa-envelope"></i>
                                                    <span>{job.Recruiter.User.email}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {showApplyModal && (
                <div className="apply-modal-overlay">
                    <div className="apply-modal">
                        <button className="modal-close" onClick={handleCloseApplyModal}>
                            <i className="fas fa-times"></i>
                        </button>
                        <h3>Ứng tuyển {job.Tieude}</h3>
                        <p className="modal-job-title">Vui lòng chuẩn bị đầy đủ thông tin để gửi đến nhà tuyển dụng</p>

                        <div className="modal-section cv-section">
                            <div className="section-header">
                                <h4>
                                    <i className="fas fa-file-signature"></i>
                                    Chọn CV để ứng tuyển
                                </h4>
                                <span>(*) Bắt buộc</span>
                            </div>

                            <div className="cv-card">
                                <div className="cv-icon">
                                    <i className="fas fa-file-upload"></i>
                                </div>
                                <div className="cv-content">
                                    <p>Chọn CV đã tạo để gửi tới nhà tuyển dụng.</p>
                                    <small>Hỗ trợ định dạng .doc, .docx, .pdf với kích thước dưới 5MB.</small>

                                    {recordsLoading ? (
                                        <div className="loading-inline">
                                            <i className="fas fa-spinner fa-spin"></i>
                                            <span>Đang tải CV...</span>
                                        </div>
                                    ) : records.length > 0 ? (
                                        <div className="cv-actions">
                                            <select
                                                value={selectedRecordId}
                                                onChange={(e) => setSelectedRecordId(Number(e.target.value))}
                                            >
                                                {records.map((record) => (
                                                    <option key={record.id} value={record.id}>
                                                        {record.Tieude}
                                                    </option>
                                                ))}
                                            </select>
                                            <button
                                                className="btn-manage-record"
                                                type="button"
                                                onClick={() => navigate('/candidate/my-records')}
                                            >
                                                Quản lý CV
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="no-records">
                                            <p>Bạn chưa có CV nào. Vui lòng tạo CV trước khi ứng tuyển.</p>
                                            <button 
                                                className="btn-create-record"
                                                type="button"
                                                onClick={() => navigate('/candidate/my-records')}
                                            >
                                                <i className="fas fa-plus-circle"></i>
                                                Tạo CV ngay
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="modal-section applicant-section">
                            <div className="section-header">
                                <h4>Thông tin liên hệ</h4>
                                <span>(*) Thông tin bắt buộc</span>
                            </div>

                            <div className="form-grid">
                                <div className="input-group">
                                    <label>Họ và tên *</label>
                                    <input
                                        type="text"
                                        value={applicantInfo.fullName}
                                        onChange={(e) => handleApplicantInfoChange('fullName', e.target.value)}
                                        placeholder="Họ tên hiển thị với NTD"
                                    />
                                </div>
                                <div className="input-group">
                                    <label>Email *</label>
                                    <input
                                        type="email"
                                        value={applicantInfo.email}
                                        onChange={(e) => handleApplicantInfoChange('email', e.target.value)}
                                        placeholder="Email hiển thị với NTD"
                                    />
                                </div>
                                <div className="input-group">
                                    <label>Số điện thoại *</label>
                                    <input
                                        type="tel"
                                        value={applicantInfo.phone}
                                        onChange={(e) => handleApplicantInfoChange('phone', e.target.value)}
                                        placeholder="Số điện thoại hiển thị với NTD"
                                    />
                                </div>
                                <div className="input-group">
                                    <label>Địa điểm làm việc mong muốn *</label>
                                    <input
                                        type="text"
                                        value={applicantInfo.desiredLocation}
                                        onChange={(e) => handleApplicantInfoChange('desiredLocation', e.target.value)}
                                        placeholder="Ví dụ: Quận Đống Đa - Hà Nội"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="modal-section cover-letter-section">
                            <div className="section-header">
                                <h4>Thư giới thiệu</h4>
                                <span>(Tùy chọn)</span>
                            </div>
                            <textarea
                                placeholder="Một thư giới thiệu ngắn gọn, chỉnh chu sẽ giúp bạn ghi điểm với nhà tuyển dụng..."
                                value={coverLetter}
                                onChange={(e) => setCoverLetter(e.target.value)}
                                rows={4}
                            ></textarea>
                        </div>

                        <div className="modal-actions">
                            <button className="btn-cancel" onClick={handleCloseApplyModal}>
                                Hủy
                            </button>
                            <button
                                className="btn-submit"
                                onClick={handleSubmitApplication}
                                disabled={isApplying || records.length === 0}
                            >
                                {isApplying ? 'Đang gửi...' : 'Nộp CV ứng tuyển'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
            
            <Footer />
            <ScrollToTop />
        </div>
    );
};

export default JobDetail;

