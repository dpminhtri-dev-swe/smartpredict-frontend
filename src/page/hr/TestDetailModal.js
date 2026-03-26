import React, { useState, useEffect } from 'react';
import './TestDetailModal.scss';
import QuestionFormModal from './QuestionFormModal';
import TestFormModal from './TestFormModal';
import ConfirmModal from '../../components/ConfirmModal/ConfirmModal';
import QuestionBankSelectorModal from './QuestionBankSelectorModal';
import { toast } from 'react-toastify';
import { deleteQuestion, getTestDetail, addMultipleQuestions } from '../../service.js/testService';

const TestDetailModal = ({ show, onClose, test, userId, onUpdate }) => {
    const [showQuestionForm, setShowQuestionForm] = useState(false);
    const [showTestEditModal, setShowTestEditModal] = useState(false);
    const [showQuestionBankSelector, setShowQuestionBankSelector] = useState(false);
    const [editingQuestion, setEditingQuestion] = useState(null);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [questionToDelete, setQuestionToDelete] = useState(null);
    const [currentTest, setCurrentTest] = useState(test);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [hasManuallyRefreshed, setHasManuallyRefreshed] = useState(false);
    const [needsParentUpdate, setNeedsParentUpdate] = useState(false);

    useEffect(() => {
        if (show && test) {
            console.log('📥 TestDetailModal: Setting initial test data', test.id);
            // Only set from prop if we haven't manually refreshed
            if (!hasManuallyRefreshed) {
                setCurrentTest(test);
            }
        } else if (!show) {
            // When modal closes, update parent list if needed
            if (needsParentUpdate && onUpdate) {
                console.log('🔄 Modal closed, updating parent list...');
                onUpdate();
                setNeedsParentUpdate(false);
            }
            // Reset flags when modal closes
            setHasManuallyRefreshed(false);
        }
    }, [show, test, hasManuallyRefreshed, needsParentUpdate, onUpdate]);

    const refreshTestDetail = async () => {
        if (!test || !test.id) return;
        
        try {
            console.log('🔄 Refreshing test detail for test ID:', test.id);
            setIsRefreshing(true);
            const res = await getTestDetail(userId, test.id);
            console.log('📦 Received updated test data:', res);
            if (res && res.EC === 0) {
                console.log('✅ Updating currentTest state with new data');
                setCurrentTest(res.DT);
                setHasManuallyRefreshed(true); // Mark that we've manually refreshed
                // Force a small delay to ensure state update
                await new Promise(resolve => setTimeout(resolve, 100));
            } else {
                console.error('❌ Failed to fetch test detail:', res.EM);
            }
        } catch (error) {
            console.error('❌ Error refreshing test detail:', error);
        } finally {
            setIsRefreshing(false);
        }
    };

    if (!show || !currentTest) return null;

    const formatDate = (dateString) => {
        if (!dateString) return 'Không giới hạn';
        const date = new Date(dateString);
        return date.toLocaleString('vi-VN');
    };

    const handleAddQuestions = () => {
        setEditingQuestion(null);
        setShowQuestionForm(true);
    };

    const handleSelectFromBank = () => {
        setShowQuestionBankSelector(true);
    };

    const handleQuestionsSelectedFromBank = async (selectedQuestions) => {
        try {
            const res = await addMultipleQuestions(userId, currentTest.id, selectedQuestions);
            if (res && res.EC === 0) {
                toast.success(`Đã thêm ${selectedQuestions.length} câu hỏi từ bộ đề thành công!`);
                setShowQuestionBankSelector(false);
                await refreshTestDetail();
                setNeedsParentUpdate(true);
            } else {
                toast.error(res.EM || 'Không thể thêm câu hỏi từ bộ đề!');
            }
        } catch (error) {
            console.error('Error adding questions from bank:', error);
            toast.error('Có lỗi xảy ra khi thêm câu hỏi từ bộ đề!');
        }
    };

    const handleQuestionsAdded = async () => {
        console.log('🎯 Questions added/updated, refreshing...');
        setShowQuestionForm(false);
        setEditingQuestion(null);
        
        // Wait a bit for modal to close
        await new Promise(resolve => setTimeout(resolve, 150));
        
        // Refresh modal data
        await refreshTestDetail();
        
        console.log('✅ Questions refreshed successfully');
        // Mark that parent needs update when modal closes
        setNeedsParentUpdate(true);
        // Toast đã được hiển thị trong QuestionFormModal
    };

    const handleEditTest = () => {
        setShowTestEditModal(true);
    };

    const handleTestUpdated = async () => {
        console.log('🎯 Test updated, closing edit modal and refreshing...');
        setShowTestEditModal(false);
        
        // Wait a bit for modal to close
        await new Promise(resolve => setTimeout(resolve, 150));
        
        // Refresh the detail data
        await refreshTestDetail();
        
        console.log('✅ Test detail refreshed successfully');
        // Mark that parent needs update when modal closes
        setNeedsParentUpdate(true);
    };

    const handleEditQuestion = (question) => {
        setEditingQuestion(question);
        setShowQuestionForm(true);
    };

    const handleDeleteQuestion = (question) => {
        setQuestionToDelete(question);
        setShowDeleteConfirm(true);
    };

    const confirmDeleteQuestion = async () => {
        if (!questionToDelete) return;

        try {
            const res = await deleteQuestion(userId, questionToDelete.id);
            if (res && res.EC === 0) {
                toast.success('Xóa câu hỏi thành công!');
                setShowDeleteConfirm(false);
                setQuestionToDelete(null);
                
                // Wait a bit
                await new Promise(resolve => setTimeout(resolve, 150));
                
                // Refresh modal data
                await refreshTestDetail();
                
                console.log('✅ Question deleted and refreshed');
                // Mark that parent needs update when modal closes
                setNeedsParentUpdate(true);
            } else {
                toast.error(res.EM || 'Không thể xóa câu hỏi!');
            }
        } catch (error) {
            console.error('Error deleting question:', error);
            toast.error('Có lỗi xảy ra khi xóa câu hỏi!');
        }
    };

    const cancelDeleteQuestion = () => {
        setShowDeleteConfirm(false);
        setQuestionToDelete(null);
    };

    const canEdit = () => {
        if (!currentTest) return false;
        if (!currentTest.Trangthai) return false; // không hoạt động

        const now = new Date();
        const startDate = currentTest.Ngaybatdau ? new Date(currentTest.Ngaybatdau) : null;
        const endDate = currentTest.Ngayhethan ? new Date(currentTest.Ngayhethan) : null;

        // Cho phép sửa khi chưa bắt đầu hoặc đã hết hạn
        if (startDate && now < startDate) return true; // pending
        if (endDate && now > endDate) return true;     // expired

        // Nếu không có ngày bắt đầu/kết thúc, cho phép chỉnh sửa
        if (!startDate && !endDate) return true;

        return false;
    };

    const canAddQuestions = () => {
        if (!currentTest) return false;
        // Test phải ở trạng thái "Chưa bắt đầu" (pending)
        if (!currentTest.Trangthai) return false; // Không hoạt động
        
        const now = new Date();
        const startDate = currentTest.Ngaybatdau ? new Date(currentTest.Ngaybatdau) : null;
        const endDate = currentTest.Ngayhethan ? new Date(currentTest.Ngayhethan) : null;
        
        // Đã hết hạn
        if (endDate && now > endDate) return false;
        
        // Chưa bắt đầu (pending) - chỉ khi có startDate và chưa đến
        if (startDate && now < startDate) return true;
        
        // Nếu không có startDate, coi như đang hoạt động -> không cho thêm
        return false;
    };

    return (
        <>
            <div className="test-detail-modal-overlay" onClick={onClose}>
                <div className="test-detail-modal-content" onClick={(e) => e.stopPropagation()}>
                    <div className="modal-header">
                        <div className="header-left">
                            <h2>
                                {currentTest.Tieude}
                                {isRefreshing && (
                                    <span style={{marginLeft: '10px', fontSize: '14px', opacity: 0.8}}>
                                        <i className="fas fa-sync fa-spin"></i> Đang cập nhật...
                                    </span>
                                )}
                            </h2>
                        </div>
                        <div className="header-right">
                            {canEdit() && (
                                <button className="btn-edit-test" onClick={handleEditTest} title="Chỉnh sửa bài test">
                                    <i className="fas fa-edit"></i> Chỉnh sửa
                                </button>
                            )}
                            <button className="btn-close" onClick={onClose}>
                                <i className="fas fa-times"></i>
                            </button>
                        </div>
                    </div>

                    <div className="modal-body" style={{opacity: isRefreshing ? 0.6 : 1, transition: 'opacity 0.3s'}}>
                        {/* Thông tin bài test */}
                        <div className="test-info-section">
                            <h3>Thông tin bài test</h3>
                            <div className="info-grid">
                                <div className="info-item">
                                    <span className="label">Tin tuyển dụng:</span>
                                    <span className="value">{currentTest.JobPosting?.Tieude}</span>
                                </div>
                                <div className="info-item">
                                    <span className="label">Công ty:</span>
                                    <span className="value">{currentTest.JobPosting?.Company?.Tencongty}</span>
                                </div>
                                <div className="info-item">
                                    <span className="label">Thời gian làm bài:</span>
                                    <span className="value">{currentTest.Thoigiantoida} phút</span>
                                </div>
                                <div className="info-item">
                                    <span className="label">Tổng điểm:</span>
                                    <span className="value">{currentTest.Tongdiem}</span>
                                </div>
                                <div className="info-item">
                                    <span className="label">Ngày bắt đầu:</span>
                                    <span className="value">{formatDate(currentTest.Ngaybatdau)}</span>
                                </div>
                                <div className="info-item">
                                    <span className="label">Ngày hết hạn:</span>
                                    <span className="value">{formatDate(currentTest.Ngayhethan)}</span>
                                </div>
                            </div>
                            {currentTest.Mota && (
                                <div className="test-description">
                                    <span className="label">Mô tả:</span>
                                    <p>{currentTest.Mota}</p>
                                </div>
                            )}
                        </div>

                        {/* Thống kê */}
                        <div className="statistics-section">
                            <div className="stat-card">
                                <i className="fas fa-users"></i>
                                <div>
                                    <span className="stat-value">{currentTest.statistics?.submissionCount || 0}</span>
                                    <span className="stat-label">Lượt làm bài</span>
                                </div>
                            </div>
                            <div className="stat-card">
                                <i className="fas fa-check-circle"></i>
                                <div>
                                    <span className="stat-value">{currentTest.statistics?.completedCount || 0}</span>
                                    <span className="stat-label">Đã hoàn thành</span>
                                </div>
                            </div>
                            <div className="stat-card">
                                <i className="fas fa-clock"></i>
                                <div>
                                    <span className="stat-value">{currentTest.statistics?.inProgressCount || 0}</span>
                                    <span className="stat-label">Đang làm</span>
                                </div>
                            </div>
                        </div>

                        {/* Danh sách câu hỏi */}
                        <div className="questions-section">
                            <div className="section-header">
                                <h3>Danh sách câu hỏi ({currentTest.Questions?.length || 0})</h3>
                                {canAddQuestions() && (
                                    <div className="action-buttons">
                                        <button className="btn-select-from-bank" onClick={handleSelectFromBank}>
                                            <i className="fas fa-book"></i> Chọn từ bộ đề
                                        </button>
                                        <button className="btn-add-question" onClick={handleAddQuestions}>
                                            <i className="fas fa-plus"></i> Thêm câu hỏi
                                        </button>
                                    </div>
                                )}
                            </div>

                            {!currentTest.Questions || currentTest.Questions.length === 0 ? (
                                <div className="empty-questions">
                                    <i className="fas fa-question-circle"></i>
                                    <p>Chưa có câu hỏi nào</p>
                                    {canAddQuestions() ? (
                                        <button className="btn-add-first" onClick={handleAddQuestions}>
                                            Thêm câu hỏi đầu tiên
                                        </button>
                                    ) : (
                                        <p className="cannot-add-message">
                                            <i className="fas fa-info-circle"></i>
                                            Chỉ có thể thêm câu hỏi khi bài test ở trạng thái "Chưa bắt đầu"
                                        </p>
                                    )}
                                </div>
                            ) : (
                                <div className="questions-list">
                                    {currentTest.Questions.map((question, index) => (
                                        <div key={question.id} className="question-item">
                                            <div className="question-header">
                                                <span className="question-number">Câu {index + 1}</span>
                                                <div className="question-actions">
                                                    <span className="question-score">{question.Diem} điểm</span>
                                                    {canEdit() && (
                                                        <>
                                                            <button 
                                                                className="btn-edit-question"
                                                                onClick={() => handleEditQuestion(question)}
                                                                title="Chỉnh sửa"
                                                            >
                                                                <i className="fas fa-edit"></i>
                                                            </button>
                                                            <button 
                                                                className="btn-delete-question"
                                                                onClick={() => handleDeleteQuestion(question)}
                                                                title="Xóa"
                                                            >
                                                                <i className="fas fa-trash"></i>
                                                            </button>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="question-content">
                                                <div className="question-text">
                                                    <div className="question-label">Câu hỏi:</div>
                                                    <div className="question-value">{question.Cauhoi}</div>
                                                </div>
                                                <div className="question-answer">
                                                    <div className="answer-label">Đáp án:</div>
                                                    <div className="answer-value">{question.Dapan}</div>
                                                </div>
                                            </div>
                                            <div className="question-type">
                                                <span className={`type-badge ${question.Loaicauhoi}`}>
                                                    {question.Loaicauhoi === 'tuluan' ? 'Tự luận' : 'Trắc nghiệm'}
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="modal-footer">
                        <button className="btn-close-modal" onClick={onClose}>
                            Đóng
                        </button>
                    </div>
                </div>
            </div>

            {/* Question Form Modal */}
            <QuestionFormModal
                show={showQuestionForm}
                onClose={() => {
                    setShowQuestionForm(false);
                    setEditingQuestion(null);
                }}
                onSuccess={handleQuestionsAdded}
                testId={currentTest.id}
                userId={userId}
                mode={editingQuestion ? 'edit' : 'create'}
                initialData={editingQuestion}
            />

            {/* Question Bank Selector Modal */}
            <QuestionBankSelectorModal
                show={showQuestionBankSelector}
                onClose={() => setShowQuestionBankSelector(false)}
                onSelect={handleQuestionsSelectedFromBank}
                userId={userId}
            />

            <TestFormModal
                show={showTestEditModal}
                onClose={() => setShowTestEditModal(false)}
                onSuccess={handleTestUpdated}
                userId={userId}
                mode="edit"
                initialData={currentTest}
            />

            <ConfirmModal
                show={showDeleteConfirm}
                onClose={cancelDeleteQuestion}
                onConfirm={confirmDeleteQuestion}
                title="Xác nhận xóa câu hỏi"
                message={`Bạn có chắc chắn muốn xóa câu hỏi "${questionToDelete?.Cauhoi?.substring(0, 50)}..."? Hành động này không thể hoàn tác.`}
                confirmText="Xóa"
                cancelText="Hủy"
                type="danger"
            />
        </>
    );
};

export default TestDetailModal;

