import React, { useState } from 'react';
import { toast } from 'react-toastify';
import { updateMeeting } from '../../service.js/meetingService';
import { updateApplicationStatus } from '../../service.js/hrService';
import './MeetingEvaluationModal.scss';

const MeetingEvaluationModal = ({ meeting, isOpen, onClose, onSuccess }) => {
    const [score, setScore] = useState(meeting?.score || '');
    const [feedback, setFeedback] = useState(meeting?.feedback || '');
    const [notes, setNotes] = useState(meeting?.notes || '');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [approveCandidate, setApproveCandidate] = useState(false);

    // Check if evaluation is locked (already evaluated or approved)
    const isLocked = meeting?.evaluation_locked || false;
    const isEvaluated = meeting?.score !== null && meeting?.score !== undefined && meeting?.feedback !== null && meeting?.feedback !== undefined;

    if (!isOpen || !meeting) return null;

    const handleSubmit = async () => {
        // Check if locked
        if (isLocked) {
            toast.error('Đánh giá đã bị khóa! Không thể chỉnh sửa.');
            return;
        }

        // Validate
        if (score === '' || score < 0 || score > 100) {
            toast.error('Vui lòng nhập điểm từ 0-100!');
            return;
        }

        if (!feedback.trim()) {
            toast.error('Vui lòng nhập nhận xét!');
            return;
        }

        setIsSubmitting(true);
        try {
            // Get userId from storage
            const storedUser = sessionStorage.getItem('user') || localStorage.getItem('user');
            const parsedUser = storedUser ? JSON.parse(storedUser) : null;
            const userId = parsedUser?.id;

            if (!userId) {
                toast.error('Không tìm thấy thông tin người dùng!');
                setIsSubmitting(false);
                return;
            }

            // Update meeting with score, feedback, and approveCandidate flag
            const updateRes = await updateMeeting(meeting.id, {
                score: parseFloat(score),
                feedback: feedback.trim(),
                notes: notes.trim() || null,
                approveCandidate: approveCandidate // Pass flag to backend
            });

            if (updateRes && updateRes.EC === 0) {
                // If approve candidate, update application status
                if (approveCandidate) {
                    const approveRes = await updateApplicationStatus(
                        userId,
                        meeting.jobApplicationId,
                        7 // Status ID = 7: "Chuẩn bị phỏng vấn"
                    );

                    if (approveRes && approveRes.EC === 0) {
                        toast.success('Đánh giá và duyệt ứng viên thành công! Email đã được gửi đến ứng viên.');
                    } else {
                        toast.warning('Đánh giá thành công nhưng không thể duyệt ứng viên!');
                    }
                } else {
                    toast.success('Đánh giá meeting thành công!');
                }

                if (onSuccess) {
                    onSuccess();
                }
                onClose();
            } else {
                toast.error(updateRes?.EM || 'Không thể cập nhật đánh giá!');
            }
        } catch (error) {
            console.error('Error submitting evaluation:', error);
            toast.error('Có lỗi xảy ra khi đánh giá!');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleClose = () => {
        if (!isSubmitting) {
            onClose();
        }
    };

    return (
        <div className="meeting-evaluation-modal-overlay" onClick={handleClose}>
            <div className="meeting-evaluation-modal" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h3>
                        <i className="fas fa-star"></i>
                        {isLocked ? 'Xem đánh giá phỏng vấn' : 'Đánh giá phỏng vấn'}
                        {isLocked && (
                            <span className="locked-badge" style={{ marginLeft: '10px', fontSize: '14px', color: '#ff6b6b' }}>
                                <i className="fas fa-lock"></i> Đã khóa
                            </span>
                        )}
                    </h3>
                    <button className="btn-close" onClick={handleClose} disabled={isSubmitting}>
                        <i className="fas fa-times"></i>
                    </button>
                </div>

                <div className="modal-body">
                    <div className="meeting-info">
                        <div className="info-item">
                            <span className="label">Ứng viên:</span>
                            <span className="value">
                                {meeting.Candidate?.Hoten || meeting.candidateUserId}
                            </span>
                        </div>
                        <div className="info-item">
                            <span className="label">Vị trí:</span>
                            <span className="value">
                                {meeting.JobApplication?.JobPosting?.Tieude || 'N/A'}
                            </span>
                        </div>
                        <div className="info-item">
                            <span className="label">Vòng phỏng vấn:</span>
                            <span className="value">
                                {meeting.InterviewRound?.title || `Vòng ${meeting.InterviewRound?.roundNumber || 'N/A'}`}
                            </span>
                        </div>
                    </div>

                    <div className="form-group">
                        <label htmlFor="score">
                            Điểm đánh giá <span className="required">*</span>
                        </label>
                        <div className="score-input-group">
                            <input
                                type="number"
                                id="score"
                                min="0"
                                max="100"
                                step="0.5"
                                value={score}
                                onChange={(e) => setScore(e.target.value)}
                                placeholder="Nhập điểm từ 0-100"
                                disabled={isSubmitting || isLocked}
                            />
                            <span className="score-hint">/ 100</span>
                        </div>
                    </div>

                    <div className="form-group">
                        <label htmlFor="feedback">
                            Nhận xét <span className="required">*</span>
                        </label>
                        <textarea
                            id="feedback"
                            rows="5"
                            value={feedback}
                            onChange={(e) => setFeedback(e.target.value)}
                            placeholder="Nhập nhận xét về ứng viên..."
                            disabled={isSubmitting || isLocked}
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="notes">Ghi chú thêm</label>
                        <textarea
                            id="notes"
                            rows="3"
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="Ghi chú thêm (tùy chọn)..."
                            disabled={isSubmitting || isLocked}
                        />
                    </div>

                    {!isLocked && (
                        <div className="approve-section">
                            <label className="checkbox-label">
                                <input
                                    type="checkbox"
                                    checked={approveCandidate}
                                    onChange={(e) => setApproveCandidate(e.target.checked)}
                                    disabled={isSubmitting}
                                />
                                <span>Duyệt ứng viên vào vòng tiếp theo</span>
                            </label>
                            <p className="approve-hint">
                                Khi chọn, ứng viên sẽ được chuyển sang vòng phỏng vấn tiếp theo và email sẽ được gửi đến ứng viên
                            </p>
                        </div>
                    )}

                    {isLocked && (
                        <div className="locked-message" style={{ 
                            padding: '12px', 
                            backgroundColor: '#fff3cd', 
                            border: '1px solid #ffc107', 
                            borderRadius: '4px',
                            marginTop: '16px'
                        }}>
                            <i className="fas fa-info-circle" style={{ marginRight: '8px' }}></i>
                            <span>Đánh giá đã bị khóa. Không thể chỉnh sửa sau khi đã đánh giá hoặc đã duyệt ứng viên.</span>
                        </div>
                    )}
                </div>

                <div className="modal-footer">
                    <button
                        className="btn-cancel"
                        onClick={handleClose}
                        disabled={isSubmitting}
                    >
                        Hủy
                    </button>
                    {!isLocked && (
                        <button
                            className="btn-submit"
                            onClick={handleSubmit}
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? (
                                <>
                                    <i className="fas fa-spinner fa-spin"></i> Đang xử lý...
                                </>
                            ) : (
                                <>
                                    <i className="fas fa-check"></i> Lưu đánh giá
                                </>
                            )}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default MeetingEvaluationModal;

