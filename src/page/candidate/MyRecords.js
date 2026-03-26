import React, { useState, useEffect } from 'react';
import CandidateNav from '../../components/Navigation/CandidateNav';
import Footer from '../../components/Footer/Footer';
import ScrollToTop from '../../components/ScrollToTop/ScrollToTop';
import { toast } from 'react-toastify';
import { 
    getMyRecords, 
    createRecord, 
    updateRecord, 
    deleteRecord,
    uploadCV 
} from '../../service.js/recordService';
import AOS from 'aos';
import 'aos/dist/aos.css';
import './MyRecords.scss';

const MyRecords = () => {
    const [records, setRecords] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [currentRecord, setCurrentRecord] = useState(null);
    const [user, setUser] = useState(null);

    // Form state
    const [tieude, setTieude] = useState('');
    const [cvFile, setCvFile] = useState(null);
    const [isUploading, setIsUploading] = useState(false);

    useEffect(() => {
        // Initialize AOS
        AOS.init({
            duration: 800,
            easing: 'ease-in-out',
            once: true,
            offset: 100,
            delay: 0
        });

        // Prefer sessionStorage, fallback to localStorage
        const storedUser = sessionStorage.getItem('user') || localStorage.getItem('user');
        if (storedUser) {
            const parsedUser = JSON.parse(storedUser);
            setUser(parsedUser);
            fetchRecords(parsedUser.id);
        }
    }, []);

    // Refresh AOS when records change
    useEffect(() => {
        if (!isLoading && records.length > 0) {
            AOS.refresh();
        }
    }, [records, isLoading]);

    const fetchRecords = async (userId) => {
        setIsLoading(true);
        try {
            let res = await getMyRecords(userId);
            
            if (res && res.data && res.data.EC === 0) {
                setRecords(res.data.DT);
            } else {
                toast.error(res.data.EM);
            }
        } catch (error) {
            console.log(error);
            toast.error('Có lỗi khi tải danh sách CV!');
        } finally {
            setIsLoading(false);
        }
    };

    const handleOpenModal = (record = null) => {
        if (record) {
            // Edit mode
            setIsEditing(true);
            setCurrentRecord(record);
            setTieude(record.Tieude);
        } else {
            // Create mode
            setIsEditing(false);
            setCurrentRecord(null);
            setTieude('');
            setCvFile(null);
        }
        setShowModal(true);
    };

    const handleCloseModal = () => {
        setShowModal(false);
        setIsEditing(false);
        setCurrentRecord(null);
        setTieude('');
        setCvFile(null);
    };

    const handleFileChange = (event) => {
        const file = event.target.files[0];
        if (file) {
            // Validate file type
            const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
            if (!allowedTypes.includes(file.type)) {
                toast.error('Chỉ chấp nhận file PDF, DOC, DOCX!');
                event.target.value = '';
                return;
            }
            
            // Validate file size (5MB)
            if (file.size > 5 * 1024 * 1024) {
                toast.error('File không được vượt quá 5MB!');
                event.target.value = '';
                return;
            }

            setCvFile(file);
        }
    };

    const handleSubmit = async () => {
        // Validate
        if (!tieude.trim()) {
            toast.error('Vui lòng nhập tiêu đề CV!');
            return;
        }

        if (!isEditing && !cvFile) {
            toast.error('Vui lòng chọn file CV!');
            return;
        }

        setIsUploading(true);

        try {
            let fileUrl = currentRecord?.File_url || null;

            // Upload file if selected
            if (cvFile) {
                let uploadRes = await uploadCV(cvFile, user.id);
                if (uploadRes && uploadRes.data && uploadRes.data.EC === 0) {
                    fileUrl = uploadRes.data.DT.filePath;
                } else {
                    toast.error('Lỗi khi upload file!');
                    setIsUploading(false);
                    return;
                }
            }

            // Create or Update record
            let res;
            if (isEditing) {
                res = await updateRecord(currentRecord.id, {
                    userId: user.id,
                    Tieude: tieude,
                    File_url: fileUrl
                });
            } else {
                res = await createRecord({
                    userId: user.id,
                    Tieude: tieude,
                    File_url: fileUrl
                });
            }

            if (res && res.data && res.data.EC === 0) {
                toast.success(res.data.EM);
                handleCloseModal();
                fetchRecords(user.id);
            } else {
                toast.error(res.data.EM);
            }
        } catch (error) {
            console.log(error);
            toast.error('Có lỗi xảy ra!');
        } finally {
            setIsUploading(false);
        }
    };

    const handleDelete = async (id) => {
        if (window.confirm('Bạn có chắc muốn xóa CV này?')) {
            try {
                let res = await deleteRecord(id, user.id);
                
                if (res && res.data && res.data.EC === 0) {
                    toast.success(res.data.EM);
                    fetchRecords(user.id);
                } else {
                    toast.error(res.data.EM);
                }
            } catch (error) {
                console.log(error);
                toast.error('Có lỗi khi xóa CV!');
            }
        }
    };

    const formatDate = (dateString) => {
        if (!dateString) return '';
        return new Date(dateString).toLocaleDateString('vi-VN');
    };

    return (
        <div className="my-records-page">
            <CandidateNav />
            
            <div className="records-container">
                <div className="container">
                    {/* Header */}
                    <div className="page-header" data-aos="fade-down" data-aos-delay="0">
                        <div>
                            <h1 className="page-title">CV của tôi</h1>
                            <p className="page-subtitle">Quản lý CV xin việc</p>
                        </div>
                        <button className="btn-create" onClick={() => handleOpenModal()}>
                            <i className="fas fa-plus"></i>
                            Tạo CV mới
                        </button>
                    </div>

                    {/* Statistics */}
                    {records && records.length > 0 && (
                        <div className="stats-section">
                            <div className="stat-card" data-aos="fade-down" data-aos-delay="100">
                                <div className="stat-icon">
                                    <i className="fas fa-file-alt"></i>
                                </div>
                                <div className="stat-info">
                                    <div className="stat-value">{records.length}</div>
                                    <div className="stat-label">Tổng số CV</div>
                                </div>
                            </div>
                            <div className="stat-card" data-aos="fade-down" data-aos-delay="200">
                                <div className="stat-icon">
                                    <i className="fas fa-paper-plane"></i>
                                </div>
                                <div className="stat-info">
                                    <div className="stat-value">
                                        {records.reduce((sum, r) => sum + (r.applicationCount || 0), 0)}
                                    </div>
                                    <div className="stat-label">Lượt ứng tuyển</div>
                                </div>
                            </div>
                            <div className="stat-card" data-aos="fade-down" data-aos-delay="300">
                                <div className="stat-icon">
                                    <i className="fas fa-check-circle"></i>
                                </div>
                                <div className="stat-info">
                                    <div className="stat-value">
                                        {records.filter(r => r.File_url).length}
                                    </div>
                                    <div className="stat-label">CV có file</div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Records List */}
                    {isLoading ? (
                        <div className="loading-container">
                            <i className="fas fa-spinner fa-spin"></i>
                            <p>Đang tải CV...</p>
                        </div>
                    ) : (
                        <>
                            {records && records.length > 0 ? (
                                <div className="records-grid">
                                    {records.map((record, index) => (
                                        <div 
                                            key={record.id} 
                                            className="record-card"
                                            data-aos="fade-down"
                                            data-aos-delay={index % 6 * 50}
                                        >
                                            <div className="record-icon">
                                                <i className="fas fa-file-alt"></i>
                                            </div>
                                            
                                            <div className="record-content">
                                                <h3 className="record-title">{record.Tieude}</h3>
                                                <div className="record-info">
                                                    <span className="record-date">
                                                        <i className="far fa-calendar"></i>
                                                        Tạo ngày: {formatDate(record.Ngaytao)}
                                                    </span>
                                                    {record.File_url && (
                                                        <span className="record-file">
                                                            <i className="fas fa-paperclip"></i>
                                                            Có file đính kèm
                                                        </span>
                                                    )}
                                                    {record.applicationCount > 0 && (
                                                        <span className="record-usage">
                                                            <i className="fas fa-paper-plane"></i>
                                                            Đã dùng {record.applicationCount} lần
                                                        </span>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="record-actions">
                                                {record.File_url && (
                                                    <a 
                                                        href={`http://localhost:8082${record.File_url}`} 
                                                        target="_blank" 
                                                        rel="noopener noreferrer"
                                                        className="btn-action btn-view"
                                                        title="Xem CV"
                                                    >
                                                        <i className="fas fa-eye"></i>
                                                    </a>
                                                )}
                                                <button 
                                                    className="btn-action btn-edit"
                                                    onClick={() => handleOpenModal(record)}
                                                    title="Chỉnh sửa"
                                                >
                                                    <i className="fas fa-edit"></i>
                                                </button>
                                                <button 
                                                    className="btn-action btn-delete"
                                                    onClick={() => handleDelete(record.id)}
                                                    title="Xóa"
                                                >
                                                    <i className="fas fa-trash"></i>
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="empty-state" data-aos="fade-down" data-aos-delay="0">
                                    <i className="fas fa-folder-open"></i>
                                    <h3>Chưa có CV nào</h3>
                                    <p>Hãy tạo CV đầu tiên để bắt đầu ứng tuyển</p>
                                    <button className="btn-create-empty" onClick={() => handleOpenModal()}>
                                        <i className="fas fa-plus"></i>
                                        Tạo CV ngay
                                    </button>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>

            {/* Modal Create/Edit */}
            {showModal && (
                <div className="modal-overlay" onClick={handleCloseModal}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>{isEditing ? 'Chỉnh sửa CV' : 'Tạo CV mới'}</h2>
                            <button className="btn-close" onClick={handleCloseModal}>
                                <i className="fas fa-times"></i>
                            </button>
                        </div>

                        <div className="modal-body">
                            <div className="form-group">
                                <label>
                                    Tiêu đề CV <span className="required">*</span>
                                </label>
                                <input
                                    type="text"
                                    className="form-control"
                                    placeholder="VD: CV Backend Developer 2025"
                                    value={tieude}
                                    onChange={(e) => setTieude(e.target.value)}
                                />
                            </div>

                            <div className="form-group">
                                <label>
                                    Upload CV {!isEditing && <span className="required">*</span>}
                                </label>
                                <div className="file-upload-wrapper">
                                    <input
                                        type="file"
                                        id="cv-file"
                                        className="file-input"
                                        accept=".pdf,.doc,.docx"
                                        onChange={handleFileChange}
                                    />
                                    <label htmlFor="cv-file" className="file-label">
                                        <i className="fas fa-cloud-upload-alt"></i>
                                        <span>
                                            {cvFile 
                                                ? cvFile.name 
                                                : (isEditing 
                                                    ? 'Chọn file mới để thay thế (tùy chọn)' 
                                                    : 'Chọn file CV (PDF, DOC, DOCX - tối đa 5MB)'
                                                )
                                            }
                                        </span>
                                    </label>
                                </div>
                                {currentRecord?.File_url && (
                                    <div className="current-file">
                                        <i className="fas fa-file-pdf"></i>
                                        <span>File hiện tại: {currentRecord.File_url.split('/').pop()}</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="modal-footer">
                            <button className="btn-cancel" onClick={handleCloseModal}>
                                Hủy
                            </button>
                            <button 
                                className="btn-submit" 
                                onClick={handleSubmit}
                                disabled={isUploading}
                            >
                                {isUploading ? (
                                    <>
                                        <i className="fas fa-spinner fa-spin"></i>
                                        Đang xử lý...
                                    </>
                                ) : (
                                    <>
                                        <i className="fas fa-save"></i>
                                        {isEditing ? 'Cập nhật' : 'Tạo hồ sơ'}
                                    </>
                                )}
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

export default MyRecords;

