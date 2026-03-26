import React, { useState, useEffect } from 'react';
import './QuestionBankDetailModal.scss';
import { updateQuestionBankItem, confirmTrainingData } from '../../service.js/questionBankService';
import { toast } from 'react-toastify';

const QuestionBankDetailModal = ({ show, onClose, bank, onUpdate, userId }) => {
    const [editingItem, setEditingItem] = useState(null);
    const [editForm, setEditForm] = useState({});
    const [loading, setLoading] = useState(false);
    const [confirming, setConfirming] = useState(false);
    const [confirmedFlag, setConfirmedFlag] = useState(bank?.Metadata?.confirmedTraining === true);

    // Sync confirmed flag when bank prop changes
    useEffect(() => {
        setConfirmedFlag(bank?.Metadata?.confirmedTraining === true);
    }, [bank]);

    if (!show || !bank) return null;

    const handleEdit = (item) => {
        setEditingItem(item.id);
        setEditForm({
            Cauhoi: item.Cauhoi,
            Dapan: item.Dapan,
            Chude: item.Chude,
            Loaicauhoi: item.Loaicauhoi,
            Diem: item.Diem,
            Dodai: item.Dodai,
            Dokho: item.Dokho
        });
    };

    const handleCancelEdit = () => {
        setEditingItem(null);
        setEditForm({});
    };

    const handleSaveEdit = async (itemId) => {
        try {
            setLoading(true);
            if (!userId) {
                toast.error('Không tìm thấy thông tin người dùng!');
                return;
            }

            const result = await updateQuestionBankItem(userId, itemId, editForm);
            
            if (result.EC === 0) {
                toast.success('Cập nhật câu hỏi thành công!');
                setEditingItem(null);
                setEditForm({});
                // Refresh data
                if (onUpdate) {
                    onUpdate();
                }
            } else {
                toast.error(result.EM || 'Có lỗi xảy ra!');
            }
        } catch (error) {
            console.error('Error updating question:', error);
            toast.error('Có lỗi xảy ra khi cập nhật câu hỏi!');
        } finally {
            setLoading(false);
        }
    };

    const handleInputChange = (field, value) => {
        setEditForm(prev => ({
            ...prev,
            [field]: value
        }));
    };

    const handleConfirmTraining = async () => {
        if (!bank?.id) return;
        if (!userId) {
            toast.error('Không tìm thấy thông tin người dùng!');
            return;
        }
        try {
            setConfirming(true);
            const res = await confirmTrainingData(userId, bank.id);
            if (res.EC === 0) {
                toast.success(res.EM || 'Đã bắt đầu sinh training data!');
                // Cập nhật flag đã xác nhận để ẩn nút
                setConfirmedFlag(true);
                if (onUpdate) onUpdate();
                // Đóng modal ngay, train chạy nền
                onClose();
            } else {
                toast.error(res.EM || 'Không thể sinh training data!');
            }
        } catch (error) {
            console.error('Error confirming training:', error);
            toast.error('Có lỗi xảy ra khi xác nhận training!');
        } finally {
            setConfirming(false);
        }
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        const date = new Date(dateString);
        return date.toLocaleDateString('vi-VN', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content question-bank-detail-modal" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h3>
                        <i className="fas fa-book"></i>
                        Chi tiết bộ đề
                    </h3>
                    <button className="close-btn" onClick={onClose}>
                        <i className="fas fa-times"></i>
                    </button>
                </div>

                <div className="modal-body">
                    <div className="review-alert">
                        <div className="alert-icon">
                            <i className="fas fa-exclamation-circle"></i>
                        </div>
                        <div className="alert-text">
                            <h4>Vui lòng rà soát phân loại trước khi train AI</h4>
                            <p>
                                Hãy kiểm tra lại loại câu hỏi và đáp án. Sau khi chắc chắn, nhấn nút "Xác nhận"
                                để LLM sinh dữ liệu và (tùy chọn) train ML ở chế độ nền.
                            </p>
                        </div>
                    </div>

                    <div className="detail-section">
                        <h4>Thông tin chung</h4>
                        <div className="info-grid">
                            <div className="info-item">
                                <label>Tên bộ đề:</label>
                                <span>{bank.Ten}</span>
                            </div>
                            {bank.Mota && (
                                <div className="info-item full-width">
                                    <label>Mô tả:</label>
                                    <span>{bank.Mota}</span>
                                </div>
                            )}
                            <div className="info-item">
                                <label>File:</label>
                                <span>{bank.FileName}</span>
                            </div>
                            <div className="info-item">
                                <label>Loại file:</label>
                                <span className="file-type-badge">{bank.FileType?.toUpperCase()}</span>
                            </div>
                            <div className="info-item">
                                <label>Ngày upload:</label>
                                <span>{formatDate(bank.createdAt)}</span>
                            </div>
                        </div>
                    </div>

                    {bank.items && bank.items.length > 0 && (
                        <div className="detail-section">
                            <h4>
                                Danh sách câu hỏi ({bank.items.length})
                            </h4>
                            <div className="questions-list">
                                {bank.items.map((item, index) => (
                                    <div key={item.id} className="question-item">
                                        <div className="question-header">
                                            <span className="question-number">Câu {index + 1}</span>
                                            <div className="question-meta">
                                                {editingItem !== item.id ? (
                                                    <>
                                                        {item.Chude && (
                                                            <span className="topic-badge">{item.Chude}</span>
                                                        )}
                                                        <span className="type-badge">
                                                            {(() => {
                                                                const type = String(item.Loaicauhoi || '').toLowerCase().trim();
                                                                // If contains "tracnghiem", prioritize it (multiple choice)
                                                                if (type.includes('tracnghiem')) return 'Trắc nghiệm';
                                                                // If contains "tuluan", it's essay
                                                                if (type.includes('tuluan')) return 'Tự luận';
                                                                // Default fallback
                                                                return type === 'tracnghiem' ? 'Trắc nghiệm' : 'Tự luận';
                                                            })()}
                                                        </span>
                                                        <span className="difficulty-badge">
                                                            {item.Dokho === 'de' ? 'Dễ' : 
                                                             item.Dokho === 'kho' ? 'Khó' : 'Trung bình'}
                                                        </span>
                                                        <span className="score-badge">{item.Diem} điểm</span>
                                                        <button 
                                                            className="edit-btn"
                                                            onClick={() => handleEdit(item)}
                                                            title="Chỉnh sửa"
                                                        >
                                                            <i className="fas fa-edit"></i>
                                                        </button>
                                                    </>
                                                ) : (
                                                    <button 
                                                        className="cancel-btn"
                                                        onClick={handleCancelEdit}
                                                        title="Hủy"
                                                    >
                                                        <i className="fas fa-times"></i>
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                        <div className="question-content">
                                            {editingItem === item.id ? (
                                                <div className="edit-form">
                                                    <div className="form-group">
                                                        <label>Câu hỏi:</label>
                                                        <textarea
                                                            value={editForm.Cauhoi || ''}
                                                            onChange={(e) => handleInputChange('Cauhoi', e.target.value)}
                                                            rows={3}
                                                        />
                                                    </div>
                                                    <div className="form-group">
                                                        <label>Đáp án:</label>
                                                        <textarea
                                                            value={editForm.Dapan || ''}
                                                            onChange={(e) => handleInputChange('Dapan', e.target.value)}
                                                            rows={3}
                                                        />
                                                    </div>
                                                    <div className="form-row">
                                                        <div className="form-group">
                                                            <label>Chủ đề:</label>
                                                            <input
                                                                type="text"
                                                                value={editForm.Chude || ''}
                                                                onChange={(e) => handleInputChange('Chude', e.target.value)}
                                                            />
                                                        </div>
                                                        <div className="form-group">
                                                            <label>Loại câu hỏi:</label>
                                                            <select
                                                                value={editForm.Loaicauhoi || 'tuluan'}
                                                                onChange={(e) => handleInputChange('Loaicauhoi', e.target.value)}
                                                            >
                                                                <option value="tuluan">Tự luận</option>
                                                                <option value="tracnghiem">Trắc nghiệm</option>
                                                            </select>
                                                        </div>
                                                        <div className="form-group">
                                                            <label>Độ dài:</label>
                                                            <select
                                                                value={editForm.Dodai || 'trungbinh'}
                                                                onChange={(e) => handleInputChange('Dodai', e.target.value)}
                                                            >
                                                                <option value="ngan">Ngắn</option>
                                                                <option value="trungbinh">Trung bình</option>
                                                                <option value="dai">Dài</option>
                                                            </select>
                                                        </div>
                                                        <div className="form-group">
                                                            <label>Độ khó:</label>
                                                            <select
                                                                value={editForm.Dokho || 'trungbinh'}
                                                                onChange={(e) => handleInputChange('Dokho', e.target.value)}
                                                            >
                                                                <option value="de">Dễ</option>
                                                                <option value="trungbinh">Trung bình</option>
                                                                <option value="kho">Khó</option>
                                                            </select>
                                                        </div>
                                                        <div className="form-group">
                                                            <label>Điểm:</label>
                                                            <input
                                                                type="number"
                                                                min="1"
                                                                max="100"
                                                                value={editForm.Diem || 10}
                                                                onChange={(e) => handleInputChange('Diem', parseInt(e.target.value))}
                                                            />
                                                        </div>
                                                    </div>
                                                    <div className="form-actions">
                                                        <button
                                                            className="btn btn-primary"
                                                            onClick={() => handleSaveEdit(item.id)}
                                                            disabled={loading}
                                                        >
                                                            {loading ? 'Đang lưu...' : 'Lưu'}
                                                        </button>
                                                        <button
                                                            className="btn btn-secondary"
                                                            onClick={handleCancelEdit}
                                                            disabled={loading}
                                                        >
                                                            Hủy
                                                        </button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <>
                                                    <p className="question-text">
                                                        <strong>Câu hỏi:</strong> {item.Cauhoi}
                                                    </p>
                                                    {/* Hiển thị options cho câu trắc nghiệm */}
                                                    {item.Options && typeof item.Options === 'object' && Object.keys(item.Options).length > 0 && (
                                                        <div className="options-list">
                                                            <strong>Các lựa chọn:</strong>
                                                            <ul className="options-ul">
                                                                {Object.entries(item.Options).map(([letter, text]) => (
                                                                    <li key={letter} className={`option-item ${item.Dapan === letter ? 'correct-answer' : ''}`}>
                                                                        <strong>{letter}.</strong> {text}
                                                                        {item.Dapan === letter && <span className="correct-badge">✓ Đáp án đúng</span>}
                                                                    </li>
                                                                ))}
                                                            </ul>
                                                        </div>
                                                    )}
                                                    {/* Hiển thị options nếu là JSON string */}
                                                    {item.Options && typeof item.Options === 'string' && (() => {
                                                        try {
                                                            const parsedOptions = JSON.parse(item.Options);
                                                            if (parsedOptions && typeof parsedOptions === 'object' && Object.keys(parsedOptions).length > 0) {
                                                                return (
                                                                    <div className="options-list">
                                                                        <strong>Các lựa chọn:</strong>
                                                                        <ul className="options-ul">
                                                                            {Object.entries(parsedOptions).map(([letter, text]) => (
                                                                                <li key={letter} className={`option-item ${item.Dapan === letter ? 'correct-answer' : ''}`}>
                                                                                    <strong>{letter}.</strong> {text}
                                                                                    {item.Dapan === letter && <span className="correct-badge">✓ Đáp án đúng</span>}
                                                                                </li>
                                                                            ))}
                                                                        </ul>
                                                                    </div>
                                                                );
                                                            }
                                                        } catch (e) {
                                                            // Không phải JSON hợp lệ
                                                        }
                                                        return null;
                                                    })()}
                                                    <p className="answer-text">
                                                        <strong>Đáp án:</strong> {item.Dapan}
                                                    </p>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {bank.Metadata && (
                        <div className="detail-section">
                            <h4>Thống kê</h4>
                            <div className="stats-grid">
                                <div className="stat-card">
                                    <i className="fas fa-question-circle"></i>
                                    <div>
                                        <span className="stat-value">{bank.Metadata.totalQuestions || bank.items?.length || 0}</span>
                                        <span className="stat-label">Tổng câu hỏi</span>
                                    </div>
                                </div>
                                {bank.Metadata.topics && (
                                    <div className="stat-card">
                                        <i className="fas fa-tags"></i>
                                        <div>
                                            <span className="stat-value">{bank.Metadata.topics.length}</span>
                                            <span className="stat-label">Chủ đề</span>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>

              
                <div className="modal-footer">
                    {!confirmedFlag && (
                        <button
                            className="btn-confirm-footer"
                            onClick={handleConfirmTraining}
                            disabled={confirming}
                        >
                            {confirming ? 'Đang xử lý...' : 'Xác nhận'}
                        </button>
                    )}
                    {/* Only one close button here */}
                    <button className="btn btn-secondary" onClick={onClose}>
                        Đóng
                    </button>
                </div>
            </div>
        </div>
    );
};

export default QuestionBankDetailModal;

