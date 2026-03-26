import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { 
    getSubmissionForGrading, 
    autoGradeSubmission, 
    gradeAnswer, 
    finalizeGrading 
} from '../../service.js/testSubmissionService';
import './GradeModal.scss';

// Helper function to get similarity status
const getSimilarityStatus = (similarity) => {
    if (similarity > 0.75) {
        return {
            level: 'good',
            label: 'Đúng phần lớn',
            emoji: '🟢',
            color: 'green'
        };
    } else if (similarity >= 0.50) {
        return {
            level: 'review',
            label: 'Cần xem lại',
            emoji: '🟡',
            color: 'yellow'
        };
    } else {
        return {
            level: 'problem',
            label: 'Có vấn đề',
            emoji: '🔴',
            color: 'red'
        };
    }
};

// Helper function to round score to nearest 0.5
const roundToHalf = (score) => {
    return Math.round(score * 2) / 2;
};

const GradeModal = ({ show, onClose, submissionId, hrUserId, onGraded }) => {
    const [submission, setSubmission] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isAutoGrading, setIsAutoGrading] = useState(false);
    const [isFinalizing, setIsFinalizing] = useState(false);
    const [editingAnswerId, setEditingAnswerId] = useState(null);
    const [editScores, setEditScores] = useState({});

    useEffect(() => {
        if (show && submissionId && hrUserId) {
            fetchAndAutoGrade();
        }
    }, [show, submissionId, hrUserId]);

    const fetchAndAutoGrade = async () => {
        setIsLoading(true);
        
        try {
            // Step 1: Get submission details
            const submissionRes = await getSubmissionForGrading(hrUserId, submissionId);
            
            if (submissionRes.data && submissionRes.data.EC === 0) {
                const submissionData = submissionRes.data.DT;
                setSubmission(submissionData);

                // Nếu đã chấm (dacham) thì chỉ xem lại, không gọi AI chấm lại
                if (submissionData.Trangthai === 'dacham') {
                    setIsAutoGrading(false);
                    return;
                }

                // Step 2: Auto-grade with AI cho bài đã nộp (danop)
                setIsAutoGrading(true);
                toast.info('🤖 AI đang chấm điểm tự động...');
                const gradeRes = await autoGradeSubmission(submissionId);
                
                if (gradeRes.data && gradeRes.data.EC === 0) {
                    toast.success(`✅ AI đã chấm xong ${gradeRes.data.DT.totalQuestions} câu hỏi!`);
                    
                    // Refresh submission to get updated scores
                    const refreshRes = await getSubmissionForGrading(hrUserId, submissionId);
                    if (refreshRes.data && refreshRes.data.EC === 0) {
                        setSubmission(refreshRes.data.DT);
                    }
                } else {
                    toast.error(gradeRes.data?.EM || 'AI chấm điểm thất bại!');
                }
            } else {
                toast.error(submissionRes.data?.EM || 'Không thể tải thông tin bài test!');
                onClose();
            }
        } catch (error) {
            console.error('Error in fetchAndAutoGrade:', error);
            toast.error('Có lỗi xảy ra khi tải và chấm bài!');
            onClose();
        } finally {
            setIsLoading(false);
            setIsAutoGrading(false);
        }
    };

    const handleEditScore = (answerId, currentScore, maxScore) => {
        setEditingAnswerId(answerId);
        const roundedScore = roundToHalf(currentScore || 0);
        setEditScores({
            ...editScores,
            [answerId]: {
                Diemdatduoc: roundedScore,
                Nhanxet: '',
                Dungkhong: roundedScore === maxScore
            }
        });
    };

    const handleScoreChange = (answerId, field, value) => {
        setEditScores({
            ...editScores,
            [answerId]: {
                ...editScores[answerId],
                [field]: value
            }
        });
    };

    const handleSaveScore = async (answerId, maxScore) => {
        const scoreData = editScores[answerId];
        
        if (!scoreData) return;

        // Round score to nearest 0.5
        const roundedScore = roundToHalf(scoreData.Diemdatduoc || 0);
        
        if (roundedScore < 0 || roundedScore > maxScore) {
            toast.error(`Điểm phải từ 0 đến ${maxScore}!`);
            return;
        }
        
        // Update score data with rounded value
        scoreData.Diemdatduoc = roundedScore;
        scoreData.Dungkhong = roundedScore === maxScore;

        try {
            const res = await gradeAnswer(hrUserId, answerId, scoreData);
            
            if (res.data && res.data.EC === 0) {
                toast.success('Cập nhật điểm thành công!');
                
                // Refresh submission
                const refreshRes = await getSubmissionForGrading(hrUserId, submissionId);
                if (refreshRes.data && refreshRes.data.EC === 0) {
                    setSubmission(refreshRes.data.DT);
                }
                
                setEditingAnswerId(null);
            } else {
                toast.error(res.data?.EM || 'Không thể cập nhật điểm!');
            }
        } catch (error) {
            console.error('Error saving score:', error);
            toast.error('Có lỗi xảy ra khi lưu điểm!');
        }
    };

    const handleFinalize = async () => {
        const confirmed = window.confirm(
            'Bạn có chắc chắn muốn hoàn tất chấm bài?\n\n' +
            'Sau khi hoàn tất, tổng điểm sẽ được tính toán và ứng viên có thể xem kết quả.'
        );

        if (!confirmed) return;

        setIsFinalizing(true);
        try {
            const res = await finalizeGrading(hrUserId, submissionId);
            
            if (res.data && res.data.EC === 0) {
                toast.success(`✅ Hoàn tất chấm bài! Tổng điểm: ${res.data.DT.totalScore}`);
                if (onGraded) onGraded();
                onClose();
            } else {
                toast.error(res.data?.EM || 'Không thể hoàn tất chấm bài!');
            }
        } catch (error) {
            console.error('Error finalizing grading:', error);
            toast.error('Có lỗi xảy ra khi hoàn tất chấm bài!');
        } finally {
            setIsFinalizing(false);
        }
    };

    const calculateCurrentTotal = () => {
        if (!submission?.Answers) return 0;
        return submission.Answers.reduce((sum, answer) => sum + (answer.Diemdatduoc || 0), 0);
    };

    if (!show) return null;

    return (
        <div className="grade-modal-overlay" onClick={onClose}>
            <div className="grade-modal-content" onClick={(e) => e.stopPropagation()}>
                <div className="grade-modal-header">
                    <div>
                        <h2>Chấm bài test - Phương pháp Hybrid (AI + NLP)</h2>
                        {submission && (
                            <p className="submission-info">
                                Ứng viên: <strong>{submission.User?.Hoten}</strong> | 
                                Bài test: <strong>{submission.Test?.Tieude}</strong>
                            </p>
                        )}
                    </div>
                    <button className="btn-close" onClick={onClose}>
                        <i className="fas fa-times"></i>
                    </button>
                </div>

                {isLoading ? (
                    <div className="grade-modal-body loading">
                        <i className="fas fa-spinner fa-spin"></i>
                        <p>{isAutoGrading ? '🤖 AI đang phân tích và chấm điểm...' : 'Đang tải...'}</p>
                    </div>
                ) : !submission ? (
                    <div className="grade-modal-body error">
                        <i className="fas fa-exclamation-triangle"></i>
                        <p>Không tìm thấy thông tin bài test!</p>
                    </div>
                ) : (
                    <>
                        <div className="grade-summary">
                            <div className="summary-item">
                                <span>Số câu hỏi:</span>
                                <strong>{submission.Answers?.length || 0}</strong>
                            </div>
                            <div className="summary-item">
                                <span>Điểm hiện tại:</span>
                                <strong className="current-score">{calculateCurrentTotal().toFixed(1)}</strong>
                            </div>
                            <div className="summary-item">
                                <span>Điểm tối đa:</span>
                                <strong>{submission.Test?.Tongdiem || 100}</strong>
                            </div>
                            <div className="summary-item highlight">
                                <span>Phương pháp:</span>
                                <strong>Hybrid (AI + NLP + HR)</strong>
                            </div>
                        </div>

                        <div className="grade-modal-body">
                            <div className="ai-notice">
                                <i className="fas fa-robot"></i>
                                <p>AI đã tự động chấm điểm dựa trên độ tương đồng với đáp án. Bạn có thể xem lại và điều chỉnh điểm cho từng câu.</p>
                            </div>

                            <div className="answers-list">
                                {submission.Answers?.map((answer, index) => {
                                    const isEditing = editingAnswerId === answer.id;
                                    const editData = editScores[answer.id];
                                    const maxScore = answer.Question?.Diem || 10;
                                    const similarity = answer.Dosattinhcua_ai || answer.Dosattinhcua_nlp || 0;
                                    const status = getSimilarityStatus(similarity);
                                    const currentScore = roundToHalf(answer.Diemdatduoc || 0);

                                    return (
                                        <div key={answer.id} className="answer-card">
                                            <div className="answer-header">
                                                <div className="question-info">
                                                    <span className="question-number">Câu {index + 1}</span>
                                                    <span className="question-type">
                                                        {answer.Question?.Loaicauhoi === 'tuluan' ? 'Tự luận' : 'Trắc nghiệm'}
                                                    </span>
                                                    <span className="max-score">Tối đa: {maxScore} điểm</span>
                                                    {similarity > 0 && (
                                                        <span className={`similarity-status status-${status.level}`}>
                                                            <span className="status-emoji">{status.emoji}</span>
                                                            <span className="status-label">{status.label}</span>
                                                            <span className="similarity-percent">({(similarity * 100).toFixed(0)}%)</span>
                                                        </span>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="question-text">
                                                <strong>Câu hỏi:</strong> {answer.Question?.Cauhoi}
                                            </div>

                                            <div className="answer-section">
                                                <div className="section-title">Đáp án đúng:</div>
                                                <div className="correct-answer">{answer.Question?.Dapan}</div>
                                            </div>

                                            <div className="answer-section">
                                                <div className="section-title">Câu trả lời của ứng viên:</div>
                                                <div className="candidate-answer">
                                                    {answer.Cautraloi || <em className="no-answer">Không có câu trả lời</em>}
                                                </div>
                                            </div>

                                            {isEditing ? (
                                                <div className="edit-score-form">
                                                    <div className="form-row">
                                                        <div className="form-group">
                                                            <label>Điểm đạt được</label>
                                                            <input
                                                                type="number"
                                                                min="0"
                                                                max={maxScore}
                                                                step="0.5"
                                                                value={editData?.Diemdatduoc || 0}
                                                                onChange={(e) => handleScoreChange(answer.id, 'Diemdatduoc', parseFloat(e.target.value))}
                                                            />
                                                        </div>
                                                        <div className="form-group checkbox">
                                                            <label>
                                                                <input
                                                                    type="checkbox"
                                                                    checked={editData?.Dungkhong || false}
                                                                    onChange={(e) => handleScoreChange(answer.id, 'Dungkhong', e.target.checked)}
                                                                />
                                                                Đánh dấu là đúng
                                                            </label>
                                                        </div>
                                                    </div>
                                                    <div className="form-group">
                                                        <label>Nhận xét</label>
                                                        <textarea
                                                            rows="2"
                                                            placeholder="Nhập nhận xét..."
                                                            value={editData?.Nhanxet || ''}
                                                            onChange={(e) => handleScoreChange(answer.id, 'Nhanxet', e.target.value)}
                                                        />
                                                    </div>
                                                    <div className="form-actions">
                                                        <button 
                                                            className="btn-save" 
                                                            onClick={() => handleSaveScore(answer.id, maxScore)}
                                                        >
                                                            <i className="fas fa-check"></i>
                                                            Lưu
                                                        </button>
                                                        <button 
                                                            className="btn-cancel" 
                                                            onClick={() => setEditingAnswerId(null)}
                                                        >
                                                            <i className="fas fa-times"></i>
                                                            Hủy
                                                        </button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="score-display">
                                                    <div className="score-info">
                                                        <span className="label">Điểm AI gợi ý:</span>
                                                        <span className="score-value">{currentScore.toFixed(1)} / {maxScore}</span>
                                                        {answer.Dungkhong && <span className="correct-badge">✓ Đúng</span>}
                                                    </div>
                                                    {answer.Nhanxet && (
                                                        <div className="comment">
                                                            <strong>Nhận xét:</strong> {answer.Nhanxet}
                                                        </div>
                                                    )}
                                                    <div className="score-actions">
                                                        <button 
                                                            className="btn-edit" 
                                                            onClick={() => handleEditScore(answer.id, answer.Diemdatduoc, maxScore)}
                                                        >
                                                            <i className="fas fa-edit"></i>
                                                            Điều chỉnh điểm
                                                        </button>
                                                        <button 
                                                            className="btn-regrade" 
                                                            disabled
                                                            title="Tính năng chấm lại sẽ được triển khai sau"
                                                        >
                                                            <i className="fas fa-redo"></i>
                                                            Chấm lại
                                                        </button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        <div className="grade-modal-footer">
                            <div className="footer-info">
                                <i className="fas fa-info-circle"></i>
                                <span>Tổng điểm hiện tại: <strong>{calculateCurrentTotal().toFixed(1)}</strong> / {submission.Test?.Tongdiem || 100}</span>
                            </div>
                            <div className="footer-actions">
                                <button className="btn-cancel-modal" onClick={onClose}>
                                    Đóng
                                </button>
                                <button 
                                    className="btn-finalize" 
                                    onClick={handleFinalize}
                                    disabled={isFinalizing || submission.Trangthai === 'dacham'}
                                >
                                    {isFinalizing ? (
                                        <>
                                            <i className="fas fa-spinner fa-spin"></i>
                                            Đang xử lý...
                                        </>
                                    ) : submission.Trangthai === 'dacham' ? (
                                        <>
                                            <i className="fas fa-check-circle"></i>
                                            Đã hoàn tất
                                        </>
                                    ) : (
                                        <>
                                            <i className="fas fa-check-double"></i>
                                            Hoàn tất chấm bài
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default GradeModal;

