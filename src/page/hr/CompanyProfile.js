import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { getCompanyProfile, updateCompanyProfile } from '../../service.js/hrService';
import './CompanyProfile.scss';

const CompanyProfile = () => {
    const [user, setUser] = useState(null);
    const [companyData, setCompanyData] = useState(null);
    const [recruiterData, setRecruiterData] = useState(null);
    const [isEditing, setIsEditing] = useState(false);
    const [loading, setLoading] = useState(true);
    const [formData, setFormData] = useState({
        Tencongty: '',
        Nganhnghe: '',
        Quymo: '',
        Diachi: '',
        Website: '',
        Mota: ''
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

    useEffect(() => {
        const userStr = sessionStorage.getItem('user') || localStorage.getItem('user');
        if (userStr) {
            const parsedUser = JSON.parse(userStr);
            setUser(parsedUser);
            fetchCompanyProfile(parsedUser.id);
        }
    }, []);

    const fetchCompanyProfile = async (userId) => {
        try {
            setLoading(true);
            const res = await getCompanyProfile(userId);
            if (res.EC === 0) {
                setCompanyData(res.DT.company);
                setRecruiterData(res.DT.recruiter);
                setFormData({
                    Tencongty: res.DT.company.Tencongty || '',
                    Nganhnghe: res.DT.company.Nganhnghe || '',
                    Quymo: res.DT.company.Quymo || '',
                    Diachi: res.DT.company.Diachi || '',
                    Website: res.DT.company.Website || '',
                    Mota: res.DT.company.Mota || ''
                });
            } else {
                toast.error(res.EM);
            }
        } catch (error) {
            console.error('Error fetching company profile:', error);
            toast.error('Không thể tải thông tin công ty!');
        } finally {
            setLoading(false);
        }
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleEdit = () => {
        setIsEditing(true);
    };

    const handleCancel = () => {
        setIsEditing(false);
        // Reset form data to original
        setFormData({
            Tencongty: companyData.Tencongty || '',
            Nganhnghe: companyData.Nganhnghe || '',
            Quymo: companyData.Quymo || '',
            Diachi: companyData.Diachi || '',
            Website: companyData.Website || '',
            Mota: companyData.Mota || ''
        });
    };

    const handleSave = async () => {
        try {
            // Validation
            if (!formData.Tencongty || !formData.Nganhnghe || !formData.Diachi) {
                toast.warning('Vui lòng điền đầy đủ thông tin bắt buộc!');
                return;
            }

            const res = await updateCompanyProfile(user.id, formData);
            if (res.EC === 0) {
                toast.success(res.EM);
                setCompanyData(res.DT);
                setIsEditing(false);
            } else {
                toast.error(res.EM);
            }
        } catch (error) {
            console.error('Error updating company profile:', error);
            toast.error('Không thể cập nhật thông tin công ty!');
        }
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'Chưa cập nhật';
        const date = new Date(dateString);
        return date.toLocaleDateString('vi-VN');
    };

    if (loading) {
        return (
            <div className="company-profile-loading">
                <div className="spinner"></div>
                <p>Đang tải thông tin công ty...</p>
            </div>
        );
    }

    if (!companyData) {
        return (
            <div className="company-profile-error">
                <i className="fas fa-exclamation-circle"></i>
                <h3>Không tìm thấy thông tin công ty</h3>
                <p>Vui lòng liên hệ quản trị viên để được hỗ trợ.</p>
            </div>
        );
    }

    return (
        <div className="company-profile-container">
            {/* Header Section */}
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
                            <i className="fas fa-building"></i>
                        </div>
                        <div className="company-title">
                            <h1>{companyData.Tencongty}</h1>
                            <p className="company-industry">{companyData.Nganhnghe}</p>
                        </div>
                    </div>
                    <div className="cp-header-right">
                        {!isEditing ? (
                            <button className="btn-edit" onClick={handleEdit}>
                                <i className="fas fa-edit"></i>
                                Chỉnh sửa
                            </button>
                        ) : (
                            <div className="edit-actions">
                                <button className="btn-cancel" onClick={handleCancel}>
                                    <i className="fas fa-times"></i>
                                    Hủy
                                </button>
                                <button className="btn-save" onClick={handleSave}>
                                    <i className="fas fa-check"></i>
                                    Lưu
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Content Section */}
            <div className="cp-content">
                {/* Company Information Card */}
                <div className="cp-card">
                    <div className="card-header">
                        <i className="fas fa-info-circle"></i>
                        <h2>Thông tin công ty</h2>
                    </div>
                    <div className="card-body">
                        <div className="info-row">
                            <label>
                                <i className="fas fa-building"></i>
                                Tên công ty <span className="required">*</span>
                            </label>
                            {isEditing ? (
                                <input
                                    type="text"
                                    name="Tencongty"
                                    value={formData.Tencongty}
                                    onChange={handleInputChange}
                                    placeholder="Nhập tên công ty"
                                />
                            ) : (
                                <p>{companyData.Tencongty}</p>
                            )}
                        </div>

                        <div className="info-row">
                            <label>
                                <i className="fas fa-industry"></i>
                                Ngành nghề <span className="required">*</span>
                            </label>
                            {isEditing ? (
                                <input
                                    type="text"
                                    name="Nganhnghe"
                                    value={formData.Nganhnghe}
                                    onChange={handleInputChange}
                                    placeholder="Nhập ngành nghề"
                                />
                            ) : (
                                <p>{companyData.Nganhnghe}</p>
                            )}
                        </div>

                        <div className="info-row">
                            <label>
                                <i className="fas fa-users"></i>
                                Quy mô
                            </label>
                            {isEditing ? (
                                <select
                                    name="Quymo"
                                    value={formData.Quymo}
                                    onChange={handleInputChange}
                                >
                                    <option value="">Chọn quy mô</option>
                                    <option value="1-50">1-50 nhân viên</option>
                                    <option value="51-200">51-200 nhân viên</option>
                                    <option value="201-500">201-500 nhân viên</option>
                                    <option value="501-1000">501-1000 nhân viên</option>
                                    <option value="1000+">Trên 1000 nhân viên</option>
                                </select>
                            ) : (
                                <p>{companyData.Quymo || 'Chưa cập nhật'}</p>
                            )}
                        </div>

                        <div className="info-row">
                            <label>
                                <i className="fas fa-map-marker-alt"></i>
                                Địa chỉ <span className="required">*</span>
                            </label>
                            {isEditing ? (
                                <input
                                    type="text"
                                    name="Diachi"
                                    value={formData.Diachi}
                                    onChange={handleInputChange}
                                    placeholder="Nhập địa chỉ công ty"
                                />
                            ) : (
                                <p>{companyData.Diachi}</p>
                            )}
                        </div>

                        <div className="info-row">
                            <label>
                                <i className="fas fa-globe"></i>
                                Website
                            </label>
                            {isEditing ? (
                                <input
                                    type="url"
                                    name="Website"
                                    value={formData.Website}
                                    onChange={handleInputChange}
                                    placeholder="https://example.com"
                                />
                            ) : (
                                <p>
                                    {companyData.Website ? (
                                        <a href={companyData.Website} target="_blank" rel="noopener noreferrer">
                                            {companyData.Website}
                                        </a>
                                    ) : (
                                        'Chưa cập nhật'
                                    )}
                                </p>
                            )}
                        </div>

                        <div className="info-row full-width">
                            <label>
                                <i className="fas fa-file-alt"></i>
                                Mô tả công ty
                            </label>
                            {isEditing ? (
                                <textarea
                                    name="Mota"
                                    value={formData.Mota}
                                    onChange={handleInputChange}
                                    placeholder="Nhập mô tả về công ty..."
                                    rows="6"
                                />
                            ) : (
                                <p className="description">{companyData.Mota || 'Chưa có mô tả'}</p>
                            )}
                        </div>

                        <div className="info-row">
                            <label>
                                <i className="fas fa-calendar-alt"></i>
                                Ngày thành lập
                            </label>
                            <p>{formatDate(companyData.Ngaythanhgia)}</p>
                        </div>
                    </div>
                </div>

                {/* Recruiter Information Card */}
                <div className="cp-card">
                    <div className="card-header">
                        <i className="fas fa-user-tie"></i>
                        <h2>Thông tin người quản lý</h2>
                    </div>
                    <div className="card-body">
                        <div className="info-row">
                            <label>
                                <i className="fas fa-user"></i>
                                Họ và tên
                            </label>
                            <p>{recruiterData?.Hoten}</p>
                        </div>

                        <div className="info-row">
                            <label>
                                <i className="fas fa-envelope"></i>
                                Email
                            </label>
                            <p>{recruiterData?.email}</p>
                        </div>

                        <div className="info-row">
                            <label>
                                <i className="fas fa-phone"></i>
                                Số điện thoại
                            </label>
                            <p>{recruiterData?.SDT || 'Chưa cập nhật'}</p>
                        </div>

                        <div className="info-row">
                            <label>
                                <i className="fas fa-briefcase"></i>
                                Chức vụ
                            </label>
                            <p>{recruiterData?.Chucvu || 'Chưa cập nhật'}</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CompanyProfile;

