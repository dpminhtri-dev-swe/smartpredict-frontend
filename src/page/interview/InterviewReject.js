import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import axios from 'axios';
import './InterviewReject.scss';

// Create axios instance for public API calls (no JWT token)
const publicAxios = axios.create({
    baseURL: 'http://localhost:8082/api',
    timeout: 10000,
    headers: {
        'Content-Type': 'application/json'
    }
});

const InterviewReject = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const [isLoading, setIsLoading] = useState(false);
    const [meetingInfo, setMeetingInfo] = useState(null);
    const [reason, setReason] = useState('');
    const [hasResponded, setHasResponded] = useState(false);
    const token = searchParams.get('token');

    useEffect(() => {
        if (!token) {
            toast.error('Token không hợp lệ!');
            return;
        }

        // Verify token and get meeting info
        const verifyToken = async () => {
            try {
                const res = await publicAxios.get(`/interview/verify/${token}`);
                if (res.data && res.data.EC === 0) {
                    const meeting = res.data.DT.meeting;
                    setMeetingInfo(meeting);
                    // Check if already responded
                    if (meeting.invitation_status && meeting.invitation_status !== 'SENT') {
                        setHasResponded(true);
                        if (meeting.invitation_status === 'CONFIRMED') {
                            toast.info('Bạn đã xác nhận tham gia phỏng vấn rồi!');
                        } else if (meeting.invitation_status === 'RESCHEDULE_REQUESTED') {
                            toast.info('Bạn đã gửi yêu cầu đổi lịch. Vui lòng chờ HR phản hồi!');
                        } else if (meeting.invitation_status === 'CANCELLED') {
                            toast.warning('Lời mời này đã bị hủy!');
                        }
                    }
                } else {
                    toast.error(res.data?.EM || 'Token không hợp lệ!');
                }
            } catch (error) {
                console.error('Error verifying token:', error);
                toast.error(error.response?.data?.EM || 'Không thể xác thực token!');
            }
        };

        verifyToken();
    }, [token]);

    const handleReject = async () => {
        if (!token) {
            toast.error('Token không hợp lệ!');
            return;
        }

        setIsLoading(true);
        try {
            const res = await publicAxios.post('/interview/response', {
                token: token,
                action: 'REJECT',
                reason: reason || null
            });

            if (res.data && res.data.EC === 0) {
                toast.success(res.data.EM || 'Đã gửi yêu cầu đổi lịch thành công!');
                
                // Show remaining chances if available
                if (res.data.DT?.remaining_chances !== undefined) {
                    toast.info(`Bạn còn ${res.data.DT.remaining_chances} lần cơ hội đổi lịch.`);
                }

                setTimeout(() => {
                    navigate('/');
                }, 3000);
            } else {
                toast.error(res.data?.EM || 'Không thể gửi yêu cầu!');
            }
        } catch (error) {
            console.error('Error rejecting interview:', error);
            toast.error(error.response?.data?.EM || 'Có lỗi xảy ra khi gửi yêu cầu!');
        } finally {
            setIsLoading(false);
        }
    };

    const formatDate = (dateString) => {
        if (!dateString) return '';
        const date = new Date(dateString);
        return date.toLocaleString('vi-VN', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    if (!token) {
        return (
            <div className="interview-reject-container">
                <div className="error-message">
                    <h2>Token không hợp lệ</h2>
                    <p>Vui lòng sử dụng link từ email để truy cập.</p>
                </div>
            </div>
        );
    }

    // Calculate remaining chances: can reject if current count < 3
    const currentRejectionCount = meetingInfo ? (meetingInfo.rejection_count || 0) : 0;
    const remainingChances = Math.max(0, 3 - currentRejectionCount);
    const canReject = currentRejectionCount < 3;

    return (
        <div className="interview-reject-container">
            <div className="reject-card">
                <div className="card-header">
                    <h2>Từ chối / Đổi lịch phỏng vấn</h2>
                </div>

                {meetingInfo ? (
                    <div className="card-body">
                        <div className="meeting-info">
                            <h3>Thông tin buổi phỏng vấn</h3>
                            <div className="info-item">
                                <strong>Vị trí:</strong> {meetingInfo.jobPosting?.Tieude || 'N/A'}
                            </div>
                            <div className="info-item">
                                <strong>Thời gian:</strong> {formatDate(meetingInfo.scheduledAt)}
                            </div>
                            {meetingInfo.interviewRound && (
                                <div className="info-item">
                                    <strong>Vòng phỏng vấn:</strong> Vòng {meetingInfo.interviewRound.roundNumber} - {meetingInfo.interviewRound.title}
                                </div>
                            )}
                        </div>

                        <div className="warning-section">
                            <div className={`warning-box ${!canReject ? 'error-box' : ''}`}>
                                <strong>⚠️ Lưu ý quan trọng:</strong>
                                <p>
                                    Bạn có thể từ chối/đổi lịch tối đa 3 lần. 
                                    Sau lần thứ 3, đơn ứng tuyển sẽ bị hủy.
                                </p>
                                <p className="chances-info">
                                    Số lần đã từ chối: <strong>{currentRejectionCount}/3</strong>
                                    <br />
                                    {canReject ? (
                                        <>Còn lại: <strong>{remainingChances} lần</strong></>
                                    ) : (
                                        <span className="error-text">Đã vượt quá giới hạn! Đơn ứng tuyển sẽ bị hủy nếu từ chối thêm.</span>
                                    )}
                                </p>
                            </div>
                        </div>

                        <div className="reason-section">
                            <label htmlFor="reason">
                                <strong>Lý do từ chối/đổi lịch (tùy chọn):</strong>
                            </label>
                            <textarea
                                id="reason"
                                className="reason-input"
                                rows="4"
                                placeholder="Vui lòng nhập lý do bạn không thể tham gia buổi phỏng vấn này..."
                                value={reason}
                                onChange={(e) => setReason(e.target.value)}
                                disabled={isLoading}
                            />
                        </div>

                        <div className="action-section">
                            {hasResponded ? (
                                <div className="response-status">
                                    {meetingInfo.invitation_status === 'CONFIRMED' && (
                                        <div className="status-message confirmed">
                                            <i className="fas fa-check-circle"></i>
                                            <p>Bạn đã xác nhận tham gia phỏng vấn!</p>
                                        </div>
                                    )}
                                    {meetingInfo.invitation_status === 'RESCHEDULE_REQUESTED' && (
                                        <div className="status-message pending">
                                            <i className="fas fa-clock"></i>
                                            <p>Bạn đã gửi yêu cầu đổi lịch. Vui lòng chờ HR phản hồi!</p>
                                        </div>
                                    )}
                                    {meetingInfo.invitation_status === 'CANCELLED' && (
                                        <div className="status-message cancelled">
                                            <i className="fas fa-times-circle"></i>
                                            <p>Lời mời này đã bị hủy!</p>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <>
                                    <button
                                        className="btn-reject"
                                        onClick={handleReject}
                                        disabled={isLoading || !canReject || hasResponded}
                                    >
                                        {isLoading ? 'Đang xử lý...' : '✗ Gửi yêu cầu đổi lịch'}
                                    </button>
                                    {!canReject && (
                                        <p className="error-text">
                                            Bạn đã vượt quá số lần đổi lịch cho phép (3 lần)! Đơn ứng tuyển sẽ bị hủy.
                                        </p>
                                    )}
                                </>
                            )}
                        </div>
                    </div>
                ) : (
                    <div className="card-body">
                        <div className="loading-message">
                            <p>Đang tải thông tin phỏng vấn...</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default InterviewReject;

