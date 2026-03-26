import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import axios from 'axios';
import './InterviewConfirm.scss';

// Create axios instance for public API calls (no JWT token)
const publicAxios = axios.create({
    baseURL: 'http://localhost:8082/api',
    timeout: 10000,
    headers: {
        'Content-Type': 'application/json'
    }
});

const InterviewConfirm = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const [isLoading, setIsLoading] = useState(false);
    const [meetingInfo, setMeetingInfo] = useState(null);
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

    const handleConfirm = async () => {
        if (!token) {
            toast.error('Token không hợp lệ!');
            return;
        }

        setIsLoading(true);
        try {
            const res = await publicAxios.post('/interview/response', {
                token: token,
                action: 'CONFIRM'
            });

            if (res.data && res.data.EC === 0) {
                toast.success(res.data.EM || 'Đã xác nhận tham gia phỏng vấn thành công!');
                // Update state to show confirmation message
                setHasResponded(true);
                // Update meeting info status
                if (meetingInfo) {
                    setMeetingInfo({
                        ...meetingInfo,
                        invitation_status: 'CONFIRMED'
                    });
                }
            } else {
                toast.error(res.data?.EM || 'Không thể xác nhận!');
            }
        } catch (error) {
            console.error('Error confirming interview:', error);
            toast.error(error.response?.data?.EM || 'Có lỗi xảy ra khi xác nhận!');
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
            <div className="interview-confirm-container">
                <div className="error-message">
                    <h2>Token không hợp lệ</h2>
                    <p>Vui lòng sử dụng link từ email để truy cập.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="interview-confirm-container">
            <div className="confirm-card">
                <div className="card-header">
                    <h2>Xác nhận tham gia phỏng vấn</h2>
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
                            {meetingInfo.hr && (
                                <div className="info-item">
                                    <strong>Người phỏng vấn:</strong> {meetingInfo.hr.Hoten || meetingInfo.hr.email}
                                </div>
                            )}
                        </div>

                        <div className="action-section">
                            {hasResponded ? (
                                <div className="response-status">
                                    {meetingInfo.invitation_status === 'CONFIRMED' && (
                                        <div className="status-message confirmed">
                                            <i className="fas fa-check-circle"></i>
                                            <h3>Xác nhận thành công!</h3>
                                            <p>Bạn đã xác nhận tham gia phỏng vấn thành công.</p>
                                            <div className="email-notice">
                                                <i className="fas fa-envelope"></i>
                                                <p>
                                                    <strong>Link tham gia phỏng vấn đã được gửi đến email của bạn.</strong>
                                                    <br />
                                                    Vui lòng kiểm tra hộp thư và tham gia đúng giờ đã hẹn.
                                                </p>
                                            </div>
                                            <button
                                                className="btn-home"
                                                onClick={() => navigate('/')}
                                            >
                                                Về trang chủ
                                            </button>
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
                                    <p className="confirm-message">
                                        Bạn có chắc chắn muốn xác nhận tham gia buổi phỏng vấn này?
                                    </p>
                                    <p className="info-message">
                                        <i className="fas fa-info-circle"></i>
                                        Sau khi xác nhận, link tham gia phỏng vấn sẽ được gửi đến email của bạn.
                                    </p>
                                    <button
                                        className="btn-confirm"
                                        onClick={handleConfirm}
                                        disabled={isLoading || hasResponded}
                                    >
                                        {isLoading ? (
                                            <>
                                                <i className="fas fa-spinner fa-spin"></i> Đang xử lý...
                                            </>
                                        ) : (
                                            <>
                                                <i className="fas fa-check"></i> Xác nhận tham gia
                                            </>
                                        )}
                                    </button>
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

export default InterviewConfirm;
