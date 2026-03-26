import React, { useState } from 'react';
import './QuestionBankUploadModal.scss';
import { uploadQuestionBank } from '../../service.js/questionBankService';
import { toast } from 'react-toastify';

const QuestionBankUploadModal = ({ show, onClose, onSuccess, userId }) => {
    const [formData, setFormData] = useState({
        Ten: '',
        Mota: ''
    });
    const [selectedFile, setSelectedFile] = useState(null);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);

    if (!show) return null;

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            // Validate file type
            const allowedTypes = ['text/plain', 'application/pdf', 
                'application/msword', 
                'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
            const allowedExts = ['.txt', '.pdf', '.doc', '.docx'];
            const fileExt = '.' + file.name.split('.').pop().toLowerCase();
            
            if (!allowedTypes.includes(file.type) && !allowedExts.includes(fileExt)) {
                toast.error('Chỉ chấp nhận file TXT, PDF, DOC, DOCX!');
                e.target.value = '';
                return;
            }

            // Validate file size (10MB)
            if (file.size > 10 * 1024 * 1024) {
                toast.error('File không được vượt quá 10MB!');
                e.target.value = '';
                return;
            }

            setSelectedFile(file);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!formData.Ten.trim()) {
            toast.error('Vui lòng nhập tên bộ đề!');
            return;
        }

        if (!selectedFile) {
            toast.error('Vui lòng chọn file!');
            return;
        }

        try {
            setIsUploading(true);
            setUploadProgress(0);

            // Simulate progress (actual progress would come from axios upload progress)
            const progressInterval = setInterval(() => {
                setUploadProgress(prev => {
                    if (prev >= 90) {
                        clearInterval(progressInterval);
                        return prev;
                    }
                    return prev + 10;
                });
            }, 200);

            const res = await uploadQuestionBank(userId, selectedFile, formData);

            clearInterval(progressInterval);
            setUploadProgress(100);

            if (res && res.EC === 0) {
                toast.success(`Upload thành công! Đã trích xuất ${res.DT.totalQuestions} câu hỏi.`);
                
                // Reset form
                setFormData({ Ten: '', Mota: '' });
                setSelectedFile(null);
                setUploadProgress(0);
                
                if (onSuccess) {
                    onSuccess();
                }
            } else {
                toast.error(res.EM || 'Upload thất bại!');
            }
        } catch (error) {
            console.error('Error uploading question bank:', error);
            toast.error('Có lỗi xảy ra khi upload file!');
        } finally {
            setIsUploading(false);
            setUploadProgress(0);
        }
    };

    const handleClose = () => {
        if (!isUploading) {
            setFormData({ Ten: '', Mota: '' });
            setSelectedFile(null);
            setUploadProgress(0);
            onClose();
        }
    };

    return (
        <div className="modal-overlay" onClick={handleClose}>
            <div className="modal-content question-bank-upload-modal" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h3>
                        <i className="fas fa-upload"></i>
                        Upload bộ đề
                    </h3>
                    <button className="close-btn" onClick={handleClose} disabled={isUploading}>
                        <i className="fas fa-times"></i>
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="upload-form">
                    <div className="form-group">
                        <label>
                            Tên bộ đề <span className="required">*</span>
                        </label>
                        <input
                            type="text"
                            name="Ten"
                            value={formData.Ten}
                            onChange={handleInputChange}
                            placeholder="Ví dụ: Bộ đề Java OOP"
                            required
                            disabled={isUploading}
                        />
                    </div>

                    <div className="form-group">
                        <label>Mô tả (tùy chọn)</label>
                        <textarea
                            name="Mota"
                            value={formData.Mota}
                            onChange={handleInputChange}
                            placeholder="Mô tả về bộ đề này..."
                            rows="3"
                            disabled={isUploading}
                        />
                    </div>

                    <div className="form-group">
                        <label>
                            File bộ đề <span className="required">*</span>
                        </label>
                        <div className="file-upload-area">
                            <input
                                type="file"
                                id="fileInput"
                                accept=".txt,.pdf,.doc,.docx"
                                onChange={handleFileChange}
                                disabled={isUploading}
                                style={{ display: 'none' }}
                            />
                            <label htmlFor="fileInput" className="file-upload-label">
                                {selectedFile ? (
                                    <div className="file-selected">
                                        <i className="fas fa-file-check"></i>
                                        <span>{selectedFile.name}</span>
                                        <span className="file-size">
                                            ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
                                        </span>
                                    </div>
                                ) : (
                                    <div className="file-upload-placeholder">
                                        <i className="fas fa-cloud-upload-alt"></i>
                                        <span>Click để chọn file hoặc kéo thả file vào đây</span>
                                        <small>Hỗ trợ: TXT, PDF, DOC, DOCX (tối đa 10MB)</small>
                                    </div>
                                )}
                            </label>
                        </div>
                    </div>

                    {isUploading && (
                        <div className="upload-progress">
                            <div className="progress-bar">
                                <div 
                                    className="progress-fill" 
                                    style={{ width: `${uploadProgress}%` }}
                                ></div>
                            </div>
                            <p className="progress-text">
                                Đang upload và trích xuất câu hỏi... {uploadProgress}%
                            </p>
                            <p className="progress-note">
                                <i className="fas fa-info-circle"></i>
                                Quá trình này có thể mất vài phút tùy vào kích thước file
                            </p>
                        </div>
                    )}

                    <div className="form-actions">
                        <button 
                            type="button" 
                            className="btn btn-secondary"
                            onClick={handleClose}
                            disabled={isUploading}
                        >
                            Hủy
                        </button>
                        <button 
                            type="submit" 
                            className="btn btn-primary"
                            disabled={isUploading || !selectedFile || !formData.Ten.trim()}
                        >
                            {isUploading ? (
                                <>
                                    <i className="fas fa-spinner fa-spin"></i>
                                    Đang xử lý...
                                </>
                            ) : (
                                <>
                                    <i className="fas fa-upload"></i>
                                    Upload
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default QuestionBankUploadModal;

