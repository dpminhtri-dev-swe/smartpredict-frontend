import React, { useState, useEffect, useCallback } from 'react';
import './QuestionBankManagement.scss';
import { getQuestionBanks, deleteQuestionBank, getQuestionBankDetail } from '../../service.js/questionBankService';
import { toast } from 'react-toastify';
import QuestionBankUploadModal from './QuestionBankUploadModal';
import QuestionBankDetailModal from './QuestionBankDetailModal';
import TrainingTimelineModal from './TrainingTimelineModal';
import ConfirmModal from '../../components/ConfirmModal/ConfirmModal';

const QuestionBankManagement = ({ userId }) => {
    const [questionBanks, setQuestionBanks] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showNotice, setShowNotice] = useState(true);
    
    // Modal states
    const [showUploadModal, setShowUploadModal] = useState(false);
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [showTimelineModal, setShowTimelineModal] = useState(false);
    const [selectedBank, setSelectedBank] = useState(null);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [bankToDelete, setBankToDelete] = useState(null);

    const fetchQuestionBanks = useCallback(async () => {
        if (!userId) return;
        
        try {
            setIsLoading(true);
            const res = await getQuestionBanks(userId);

            if (res && res.EC === 0) {
                setQuestionBanks(res.DT || []);
            } else {
                toast.error(res.EM || 'Không thể tải danh sách bộ đề!');
            }
        } catch (error) {
            console.error('Error fetching question banks:', error);
            toast.error('Có lỗi xảy ra khi tải danh sách bộ đề!');
        } finally {
            setIsLoading(false);
        }
    }, [userId]);

    useEffect(() => {
        fetchQuestionBanks();
    }, [fetchQuestionBanks]);

    const handleUpload = () => {
        setShowUploadModal(true);
    };

    const handleUploadSuccess = () => {
        setShowUploadModal(false);
        fetchQuestionBanks();
        toast.success('Upload bộ đề thành công!');
    };

    const handleViewDetail = async (bank) => {
        try {
            const res = await getQuestionBankDetail(userId, bank.id);
            if (res && res.EC === 0) {
                setSelectedBank(res.DT);
                setShowDetailModal(true);
            } else {
                toast.error(res.EM || 'Không thể tải chi tiết bộ đề!');
            }
        } catch (error) {
            console.error('Error fetching question bank detail:', error);
            toast.error('Có lỗi xảy ra!');
        }
    };

    const handleUpdateQuestion = async () => {
        // Refresh detail when question is updated
        if (selectedBank) {
            try {
                const res = await getQuestionBankDetail(userId, selectedBank.id);
                if (res && res.EC === 0) {
                    setSelectedBank(res.DT);
                }
            } catch (error) {
                console.error('Error refreshing question bank detail:', error);
            }
        }
    };

    const handleDelete = (bank) => {
        setBankToDelete(bank);
        setShowDeleteConfirm(true);
    };


    const confirmDelete = async () => {
        if (!bankToDelete) return;

        try {
            const res = await deleteQuestionBank(userId, bankToDelete.id);
            if (res && res.EC === 0) {
                toast.success('Xóa bộ đề thành công!');
                fetchQuestionBanks();
            } else {
                toast.error(res.EM || 'Không thể xóa bộ đề!');
            }
        } catch (error) {
            console.error('Error deleting question bank:', error);
            toast.error('Có lỗi xảy ra khi xóa bộ đề!');
        } finally {
            setShowDeleteConfirm(false);
            setBankToDelete(null);
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
        <div className="question-bank-management">
            <div className="qb-header">
                <div className="qb-header-left">
                    <div className="qb-icon">
                        <i className="fas fa-book"></i>
                    </div>
                    <div className="qb-title">
                        <h1>Quản lý bộ đề</h1>
                        <p>Tạo, theo dõi và tái sử dụng bộ câu hỏi</p>
                    </div>
                </div>
                <div className="qb-header-right">
                    <button 
                        className="btn-timeline-qb" 
                        onClick={() => {
                            console.log('🔘 Click nút Tiến trình');
                            console.log('📊 questionBanks:', questionBanks);
                            console.log('👤 userId:', userId);
                            setShowTimelineModal(true);
                            console.log('✅ Đã set showTimelineModal = true');
                        }}
                    >
                        <i className="fas fa-tasks"></i> Tiến trình
                    </button>
                    <button className="btn-upload-qb" onClick={handleUpload}>
                        <i className="fas fa-upload"></i> Upload bộ đề
                    </button>
                </div>
            </div>

            {isLoading ? (
                <div className="loading-container">
                    <div className="spinner"></div>
                    <p>Đang tải danh sách bộ đề...</p>
                </div>
            ) : questionBanks.length === 0 ? (
                <div className="empty-state">
                    <i className="fas fa-folder-open"></i>
                    <h3>Chưa có bộ đề nào</h3>
                    <p>Hãy upload file bộ đề để bắt đầu sử dụng</p>
                    <button className="btn btn-primary" onClick={handleUpload}>
                        <i className="fas fa-upload"></i>
                        Upload bộ đề đầu tiên
                    </button>
                </div>
            ) : (
                <div className="question-banks-grid">
                    {questionBanks.map((bank) => (
                        <div key={bank.id} className="question-bank-card">
                            <div className="card-header">
                                <div className="file-icon">
                                    {bank.FileType === 'pdf' && <i className="fas fa-file-pdf"></i>}
                                    {bank.FileType === 'docx' && <i className="fas fa-file-word"></i>}
                                    {bank.FileType === 'txt' && <i className="fas fa-file-alt"></i>}
                                </div>
                                <div className="card-title">
                                    <h3>{bank.Ten}</h3>
                                    <span className="file-name">{bank.FileName}</span>
                                </div>
                            </div>

                            <div className="card-body">
                                {bank.Mota && (
                                    <p className="description">{bank.Mota}</p>
                                )}
                                
                                <div className="bank-stats">
                                    <div className="stat-item">
                                        <i className="fas fa-question-circle"></i>
                                        <span>{bank.totalQuestions} câu hỏi</span>
                                    </div>
                                    {bank.topics && bank.topics.length > 0 && (
                                        <div className="stat-item">
                                            <i className="fas fa-tags"></i>
                                            <span>{bank.topics.length} chủ đề</span>
                                        </div>
                                    )}
                                </div>

                                {bank.topics && bank.topics.length > 0 && (
                                    <div className="topics">
                                        {bank.topics.slice(0, 3).map((topic, idx) => (
                                            <span key={idx} className="topic-tag">{topic}</span>
                                        ))}
                                        {bank.topics.length > 3 && (
                                            <span className="topic-tag">+{bank.topics.length - 3}</span>
                                        )}
                                    </div>
                                )}

                                <div className="card-footer">
                                    <span className="upload-date">
                                        <i className="fas fa-calendar"></i>
                                        {formatDate(bank.createdAt)}
                                    </span>
                                </div>
                            </div>

                            <div className="card-actions">
                                <button 
                                    className="btn btn-info"
                                    onClick={() => handleViewDetail(bank)}
                                >
                                    <i className="fas fa-eye"></i>
                                    Xem chi tiết
                                </button>
                                <button 
                                    className="btn btn-danger"
                                    onClick={() => handleDelete(bank)}
                                >
                                    <i className="fas fa-trash"></i>
                                    Xóa
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Upload Modal */}
            <QuestionBankUploadModal
                show={showUploadModal}
                onClose={() => setShowUploadModal(false)}
                onSuccess={handleUploadSuccess}
                userId={userId}
            />

            {/* Detail Modal */}
            <QuestionBankDetailModal
                show={showDetailModal}
                onClose={() => {
                    setShowDetailModal(false);
                    setSelectedBank(null);
                }}
                bank={selectedBank}
                onUpdate={handleUpdateQuestion}
                userId={userId}
            />

            {/* Training Timeline Modal */}
            {console.log('🔍 Render TrainingTimelineModal:', { 
                showTimelineModal, 
                questionBanksCount: questionBanks.length,
                userId 
            })}
            <TrainingTimelineModal
                show={showTimelineModal}
                onClose={() => {
                    console.log('❌ Đóng modal');
                    setShowTimelineModal(false);
                }}
                questionBanks={questionBanks}
                userId={userId}
            />

            {/* Delete Confirm Modal */}
            <ConfirmModal
                show={showDeleteConfirm}
                onClose={() => {
                    setShowDeleteConfirm(false);
                    setBankToDelete(null);
                }}
                onConfirm={confirmDelete}
                title="Xác nhận xóa bộ đề"
                message={`Bạn có chắc chắn muốn xóa bộ đề "${bankToDelete?.Ten}"? Hành động này không thể hoàn tác!`}
            />

            {/* Notice modal: remind HR to upload early for AI training */}
            {showNotice && (
                <div className="qb-notice-backdrop">
                    <div className="qb-notice-modal">
                        <div className="notice-icon">
                            <i className="fas fa-info-circle"></i>
                        </div>
                        <h3>Lưu ý khi upload bộ đề</h3>
                        <p>
                            Nên upload bộ đề trước vài ngày để AI có thời gian sinh dữ liệu huấn luyện
                            và train mô hình chấm nhanh. Việc này giúp tốc độ chấm và độ chính xác cao hơn
                            khi ứng viên làm bài.
                        </p>
                        <div className="notice-actions">
                            <button className="btn btn-primary" onClick={() => setShowNotice(false)}>
                                Đã hiểu
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default QuestionBankManagement;

