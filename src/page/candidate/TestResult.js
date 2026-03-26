import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import CandidateNav from '../../components/Navigation/CandidateNav';
import { getSubmissionResult } from '../../service.js/testSubmissionService';
import './TestResult.scss';

const TestResult = () => {
    const { submissionId } = useParams();
    const navigate = useNavigate();
    const [user, setUser] = useState(null);
    const [submission, setSubmission] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const storedUser = sessionStorage.getItem('user') || localStorage.getItem('user');
        if (!storedUser) {
            navigate('/login');
            return;
        }
        const parsedUser = JSON.parse(storedUser);
        setUser(parsedUser);
    }, [navigate]);

    useEffect(() => {
        if (user && submissionId) {
            fetchResult();
        }
    }, [user, submissionId]);

    const fetchResult = async () => {
        setIsLoading(true);
        try {
            const res = await getSubmissionResult(user.id, submissionId, false);
            if (res.data && res.data.EC === 0) {
                setSubmission(res.data.DT);
            } else {
                toast.error(res.data?.EM || 'Không thể tải kết quả bài test!');
                navigate('/candidate/applications');
            }
        } catch (error) {
            console.error('Error fetching result:', error);
            toast.error('Có lỗi xảy ra khi tải kết quả bài test!');
            navigate('/candidate/applications');
        } finally {
            setIsLoading(false);
        }
    };

    const calculatePercentage = () => {
        if (!submission) return 0;
        const maxScore = submission.Test?.Tongdiem || 100;
        return ((submission.Tongdiemdatduoc / maxScore) * 100).toFixed(1);
    };

    const getGradeLevel = () => {
        const percentage = parseFloat(calculatePercentage());
        if (percentage >= 90) return { label: 'Xuất sắc', color: '#008060' };
        if (percentage >= 80) return { label: 'Giỏi', color: '#2bab60' };
        if (percentage >= 70) return { label: 'Khá', color: '#3b82f6' };
        if (percentage >= 60) return { label: 'Trung bình', color: '#f59e0b' };
        return { label: 'Yếu', color: '#ef4444' };
    };

    if (!user) return null;

    if (isLoading) {
        return (
            <div className="test-result-page">
                <CandidateNav />
                <div className="result-container">
                    <div className="loading-card">
                        <i className="fas fa-spinner fa-spin"></i>
                        <p>Đang tải kết quả...</p>
                    </div>
                </div>
            </div>
        );
    }

    if (!submission) {
        return (
            <div className="test-result-page">
                <CandidateNav />
                <div className="result-container">
                    <div className="error-card">
                        <i className="fas fa-exclamation-triangle"></i>
                        <p>Không tìm thấy kết quả bài test!</p>
                    </div>
                </div>
            </div>
        );
    }

    const gradeLevel = getGradeLevel();

    return (
        <div className="test-result-page">
            <CandidateNav />
            <div className="result-container">
                <div className="result-header">
                    <button className="btn-back" onClick={() => navigate('/candidate/applications')}>
                        <i className="fas fa-arrow-left"></i>
                        Quay lại
                    </button>
                    <div className="header-content">
                        <h1>Kết quả bài test</h1>
                        <p className="test-title">{submission.Test?.Tieude}</p>
                    </div>
                </div>

                <div className="result-summary">
                    <div className="score-circle" style={{ borderColor: gradeLevel.color }}>
                        <div className="score-value" style={{ color: gradeLevel.color }}>
                            {submission.Tongdiemdatduoc?.toFixed(1)}
                        </div>
                        <div className="score-max">/ {submission.Test?.Tongdiem || 100}</div>
                        <div className="score-percentage">{calculatePercentage()}%</div>
                    </div>
                    <div className="grade-label" style={{ color: gradeLevel.color }}>
                        {gradeLevel.label}
                    </div>
                </div>

                <div className="result-stats">
                    <div className="stat-card">
                        <i className="fas fa-check-circle"></i>
                        <div>
                            <p>Số câu đúng</p>
                            <h4>{submission.Answers?.filter(a => a.Dungkhong).length || 0}</h4>
                        </div>
                    </div>
                    <div className="stat-card">
                        <i className="fas fa-list"></i>
                        <div>
                            <p>Tổng số câu</p>
                            <h4>{submission.Answers?.length || 0}</h4>
                        </div>
                    </div>
                    <div className="stat-card">
                        <i className="fas fa-percentage"></i>
                        <div>
                            <p>Tỷ lệ đúng</p>
                            <h4>
                                {submission.Answers?.length > 0
                                    ? ((submission.Answers.filter(a => a.Dungkhong).length / submission.Answers.length) * 100).toFixed(0)
                                    : 0}%
                            </h4>
                        </div>
                    </div>
                </div>

                <div className="answers-detail">
                    <h3>Chi tiết từng câu</h3>
                    {submission.Answers?.map((answer, index) => (
                        <div key={answer.id} className="answer-detail-card">
                            <div className="answer-detail-header">
                                <span className="question-number">Câu {index + 1}</span>
                                <span className={`answer-status ${answer.Dungkhong ? 'correct' : 'incorrect'}`}>
                                    {answer.Dungkhong ? (
                                        <>
                                            <i className="fas fa-check-circle"></i>
                                            Đúng
                                        </>
                                    ) : (
                                        <>
                                            <i className="fas fa-times-circle"></i>
                                            Sai
                                        </>
                                    )}
                                </span>
                                <span className="score-badge">
                                    {answer.Diemdatduoc} / {answer.Question?.Diem} điểm
                                </span>
                            </div>

                            <div className="question-content">
                                <strong>Câu hỏi:</strong> {answer.Question?.Cauhoi}
                            </div>

                            <div className="answer-content">
                                <div className="your-answer">
                                    <strong>Câu trả lời của bạn:</strong>
                                    <div className="answer-text">
                                        {answer.Cautraloi || <em>Không có câu trả lời</em>}
                                    </div>
                                </div>
                                <div className="correct-answer">
                                    <strong>Đáp án đúng:</strong>
                                    <div className="answer-text">{answer.Question?.Dapan}</div>
                                </div>
                            </div>

                            {answer.Nhanxet && (
                                <div className="feedback">
                                    <i className="fas fa-comment-dots"></i>
                                    <strong>Nhận xét từ HR:</strong>
                                    <p>{answer.Nhanxet}</p>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default TestResult;

