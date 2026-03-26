import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './JobFormModal.scss';
import { getInterviewRounds } from '../../service.js/interviewRoundService';

const JobFormModal = ({ show, onClose, onSubmit, initialData, mode, companies, formats, majors, statuses, userId }) => {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        Tieude: '',
        Mota: '',
        Diadiem: '',
        Luongtoithieu: '',
        Luongtoida: '',
        Kinhnghiem: '',
        Ngayhethan: '',
        companyId: '',
        formatId: '',
        TrangthaiId: 1,
        majorIds: []
    });

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [interviewRounds, setInterviewRounds] = useState([]);
    const [isLoadingRounds, setIsLoadingRounds] = useState(false);

    useEffect(() => {
        if (initialData && mode !== 'create') {
            setFormData({
                Tieude: initialData.Tieude || '',
                Mota: initialData.Mota || '',
                Diadiem: initialData.Diadiem || '',
                Luongtoithieu: initialData.Luongtoithieu || '',
                Luongtoida: initialData.Luongtoida || '',
                Kinhnghiem: initialData.Kinhnghiem || '',
                Ngayhethan: initialData.Ngayhethan ? initialData.Ngayhethan.split('T')[0] : '',
                companyId: initialData.companyId || '',
                formatId: initialData.formatId || '',
                TrangthaiId: initialData.TrangthaiId || 1,
                majorIds: initialData.majors ? initialData.majors.map(m => m.id) : []
            });
            // Fetch interview rounds for this job posting
            if (initialData.id && userId) {
                fetchInterviewRounds(initialData.id);
            }
        } else if (mode === 'create') {
            // Reset form for create mode
            setFormData({
                Tieude: '',
                Mota: '',
                Diadiem: '',
                Luongtoithieu: '',
                Luongtoida: '',
                Kinhnghiem: '',
                Ngayhethan: '',
                companyId: companies && companies.length > 0 ? companies[0].id : '',
                formatId: formats && formats.length > 0 ? formats[0].id : '',
                TrangthaiId: 1,
                majorIds: []
            });
            setInterviewRounds([]);
        }
    }, [initialData, mode, companies, formats, userId]);

    const fetchInterviewRounds = async (jobPostingId) => {
        if (!userId || !jobPostingId) return;
        setIsLoadingRounds(true);
        try {
            const res = await getInterviewRounds(userId, { jobPostingId });
            if (res && res.EC === 0) {
                setInterviewRounds(res.DT?.rounds || []);
            }
        } catch (error) {
            console.error('Error fetching interview rounds:', error);
        } finally {
            setIsLoadingRounds(false);
        }
    };

    const handleNavigateToInterviewRounds = () => {
        onClose();
        navigate('/hr/interview-rounds');
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleMajorChange = (e) => {
        const options = e.target.options;
        const selectedMajors = [];
        for (let i = 0; i < options.length; i++) {
            if (options[i].selected) {
                selectedMajors.push(parseInt(options[i].value));
            }
        }
        setFormData(prev => ({
            ...prev,
            majorIds: selectedMajors
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        // Validation
        if (!formData.Tieude || !formData.companyId) {
            alert('Vui lòng điền đầy đủ thông tin bắt buộc!');
            return;
        }

        setIsSubmitting(true);
        try {
            await onSubmit(formData);
        } catch (error) {
            console.error('Error submitting form:', error);
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!show) return null;

    const getTitle = () => {
        if (mode === 'create') return 'Tạo tin tuyển dụng mới';
        if (mode === 'edit') return 'Chỉnh sửa tin tuyển dụng';
        return 'Chi tiết tin tuyển dụng';
    };

    const isViewMode = mode === 'view';

    return (
        <div className="job-form-modal-overlay" onClick={onClose}>
            <div className="job-form-modal" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>{getTitle()}</h2>
                    <button className="btn-close" onClick={onClose}>
                        <i className="fas fa-times"></i>
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="modal-body">
                    <div className="form-grid">
                        <div className="form-group full-width">
                            <label htmlFor="Tieude">
                                Tiêu đề <span className="required">*</span>
                            </label>
                            <input
                                type="text"
                                id="Tieude"
                                name="Tieude"
                                value={formData.Tieude}
                                onChange={handleChange}
                                disabled={isViewMode}
                                required
                                placeholder="Nhập tiêu đề công việc"
                            />
                        </div>

                        <div className="form-group full-width">
                            <label htmlFor="Mota">Mô tả công việc</label>
                            <textarea
                                id="Mota"
                                name="Mota"
                                value={formData.Mota}
                                onChange={handleChange}
                                disabled={isViewMode}
                                rows="5"
                                placeholder="Nhập mô tả chi tiết về công việc"
                            />
                        </div>

                        <div className="form-group">
                            <label htmlFor="companyId">
                                Công ty <span className="required">*</span>
                            </label>
                            <select
                                id="companyId"
                                name="companyId"
                                value={formData.companyId}
                                onChange={handleChange}
                                disabled={isViewMode || mode === 'edit'}
                                required
                            >
                                <option value="">-- Chọn công ty --</option>
                                {companies && companies.map(company => (
                                    <option key={company.id} value={company.id}>
                                        {company.Tencongty}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="form-group">
                            <label htmlFor="Diadiem">Địa điểm</label>
                            <input
                                type="text"
                                id="Diadiem"
                                name="Diadiem"
                                value={formData.Diadiem}
                                onChange={handleChange}
                                disabled={isViewMode}
                                placeholder="Ví dụ: TP.HCM, Hà Nội"
                            />
                        </div>

                        <div className="form-group">
                            <label htmlFor="Luongtoithieu">Lương tối thiểu (VNĐ)</label>
                            <input
                                type="number"
                                id="Luongtoithieu"
                                name="Luongtoithieu"
                                value={formData.Luongtoithieu}
                                onChange={handleChange}
                                disabled={isViewMode}
                                placeholder="Ví dụ: 10000000"
                            />
                        </div>

                        <div className="form-group">
                            <label htmlFor="Luongtoida">Lương tối đa (VNĐ)</label>
                            <input
                                type="number"
                                id="Luongtoida"
                                name="Luongtoida"
                                value={formData.Luongtoida}
                                onChange={handleChange}
                                disabled={isViewMode}
                                placeholder="Ví dụ: 20000000"
                            />
                        </div>

                        <div className="form-group">
                            <label htmlFor="Kinhnghiem">Kinh nghiệm</label>
                            <input
                                type="text"
                                id="Kinhnghiem"
                                name="Kinhnghiem"
                                value={formData.Kinhnghiem}
                                onChange={handleChange}
                                disabled={isViewMode}
                                placeholder="Ví dụ: 2 năm"
                            />
                        </div>

                        <div className="form-group">
                            <label htmlFor="Ngayhethan">Ngày hết hạn</label>
                            <input
                                type="date"
                                id="Ngayhethan"
                                name="Ngayhethan"
                                value={formData.Ngayhethan}
                                onChange={handleChange}
                                disabled={isViewMode}
                            />
                        </div>

                        <div className="form-group">
                            <label htmlFor="formatId">Hình thức làm việc</label>
                            <select
                                id="formatId"
                                name="formatId"
                                value={formData.formatId}
                                onChange={handleChange}
                                disabled={isViewMode}
                            >
                                <option value="">-- Chọn hình thức --</option>
                                {formats && formats.map(format => (
                                    <option key={format.id} value={format.id}>
                                        {format.TenHinhThuc}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="form-group">
                            <label htmlFor="TrangthaiId">Trạng thái</label>
                            <select
                                id="TrangthaiId"
                                name="TrangthaiId"
                                value={formData.TrangthaiId}
                                onChange={handleChange}
                                disabled={isViewMode}
                            >
                                {statuses && statuses.map(status => (
                                    <option key={status.id} value={status.id}>
                                        {status.TenTrangThai}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="form-group full-width">
                            <label htmlFor="majorIds">Ngành nghề</label>
                            <select
                                id="majorIds"
                                name="majorIds"
                                multiple
                                value={formData.majorIds}
                                onChange={handleMajorChange}
                                disabled={isViewMode}
                                size="5"
                            >
                                {majors && majors.map(major => (
                                    <option key={major.id} value={major.id}>
                                        {major.TenNghanhNghe}
                                    </option>
                                ))}
                            </select>
                            <small className="form-hint">Giữ Ctrl (Cmd trên Mac) để chọn nhiều ngành nghề</small>
                        </div>

                        {/* Interview Rounds Section */}
                        {mode === 'create' ? (
                            <div className="form-group full-width interview-rounds-section create-mode">
                                <label>
                                    Vòng phỏng vấn
                                    <span className="info-text"> (Cần tạo sau khi lưu)</span>
                                </label>
                                <div className="create-mode-message">
                                    <div className="info-icon">
                                        <i className="fas fa-info-circle"></i>
                                    </div>
                                    <p>Sau khi tạo tin tuyển dụng, bạn cần tạo các vòng phỏng vấn cho tin tuyển dụng này.</p>
                                    <p className="hint-text">Bạn có thể tạo vòng phỏng vấn ngay sau khi lưu tin tuyển dụng.</p>
                                    <button
                                        type="button"
                                        className="btn-create-interview"
                                        onClick={handleNavigateToInterviewRounds}
                                    >
                                        <i className="fas fa-plus"></i>
                                        Tạo phỏng vấn
                                    </button>
                                </div>
                            </div>
                        ) : initialData && initialData.id ? (
                            <div className="form-group full-width interview-rounds-section">
                                <label>
                                    Vòng phỏng vấn
                                    {interviewRounds.length === 0 && (
                                        <span className="warning-text"> (Chưa có vòng phỏng vấn)</span>
                                    )}
                                </label>
                                {isLoadingRounds ? (
                                    <div className="loading-rounds">
                                        <i className="fas fa-spinner fa-spin"></i> Đang tải...
                                    </div>
                                ) : interviewRounds.length > 0 ? (
                                    <div className="rounds-info">
                                        <div className="rounds-count">
                                            <i className="fas fa-users"></i>
                                            <span>Số vòng: <strong>{interviewRounds.length}</strong></span>
                                        </div>
                                        <div className="rounds-list">
                                            {interviewRounds.map((round, index) => (
                                                <div key={round.id} className="round-item">
                                                    <span className="round-number">Vòng {round.roundNumber}</span>
                                                    <span className="round-title">{round.title}</span>
                                                    {round.duration && (
                                                        <span className="round-duration">
                                                            <i className="fas fa-clock"></i> {round.duration} phút
                                                        </span>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="no-rounds-message">
                                        <div className="no-rounds-icon">
                                            <i className="fas fa-exclamation-triangle"></i>
                                        </div>
                                        <p>Tin tuyển dụng này chưa có vòng phỏng vấn nào.</p>
                                        <p className="hint-text">Vui lòng tạo vòng phỏng vấn để ứng viên có thể tham gia phỏng vấn.</p>
                                        <button
                                            type="button"
                                            className="btn-navigate-interview"
                                            onClick={handleNavigateToInterviewRounds}
                                        >
                                            <i className="fas fa-arrow-right"></i>
                                            Đi đến trang Vòng phỏng vấn
                                        </button>
                                    </div>
                                )}
                            </div>
                        ) : null}
                    </div>

                    <div className="modal-footer">
                        <button type="button" className="btn-cancel" onClick={onClose}>
                            {isViewMode ? 'Đóng' : 'Hủy'}
                        </button>
                        {!isViewMode && (
                            <button type="submit" className="btn-submit" disabled={isSubmitting}>
                                {isSubmitting ? (
                                    <>
                                        <i className="fas fa-spinner fa-spin"></i> Đang xử lý...
                                    </>
                                ) : (
                                    mode === 'create' ? 'Tạo mới' : 'Cập nhật'
                                )}
                            </button>
                        )}
                    </div>
                </form>
            </div>
        </div>
    );
};

export default JobFormModal;

