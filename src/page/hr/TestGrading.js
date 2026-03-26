import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { getSubmissionForGrading, gradeAnswer, finalizeGrading } from '../../service.js/testSubmissionService';
import './TestGrading.scss';

const TestGrading = ({ userId }) => {
    const { submissionId } = useParams();
    const navigate = useNavigate();
    const [submission, setSubmission] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [gradingAnswerId, setGradingAnswerId] = useState(null);
    const [isFinalizing, setIsFinalizing] = useState(false);

    useEffect(() => {
        fetchSubmission();
    }, [submissionId]);

    const fetchSubmission = async () => {
        setIsLoading(true);
        try {
            const res = await getSubmissionForGrading(userId, submissionId);
            if (res.data && res.data.EC === 0) {
                setSubmission(res.data.DT);
            } else {
                toast.error(res.data?.EM || 'Không thể tải thông tin bài test!');
                navigate('/hr/candidates');
            }
        } catch (error) {
            console.error('Error fetching submission:', error);
            toast.error('Có lỗi xảy ra khi tải thông tin bài test!');
            navigate('/hr/candidates');
        } finally {
            setIsLoading(false);
        }
    };

    const handleGradeAnswer = async (answerId, scoreData) => {
        setGradingAnswerId(answerId);
        try {
            const res = await gradeAnswer(userId, answerId, scoreData);
            if (res.data && res.data.EC === 0) {
                toast.success('Chấm điểm thành công!');
                await fetchSubmission(); // Refresh data
            } else {
                toast.error(res.data?.EM || 'Không thể chấm điểm!');
            }
        } catch (error) {
            console.error('Error grading answer:', error);
            toast.error('Có lỗi xảy ra khi chấm điểm!');
        } finally {
            setGradingAnswerId(null);
        }
    };

    const handleFinalizeGrading = async () => {
        const confirmed = window.confirm(
            'Bạn có chắc chắn muốn hoàn tất chấm bài?\n\n' +
            'Sau khi hoàn tất, tổng điểm sẽ được tính toán và ứng viên có thể xem kết quả.'
        );

        if (!confirmed) return;

        setIsFinalizing(true);
        try {
            const res = await finalizeGrading(userId, submissionId);
            if (res.data && res.data.EC === 0) {
                toast.success(`Hoàn tất chấm bài! Tổng điểm: ${res.data.DT.totalScore}`);
                await fetchSubmission(); // Refresh data
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

    const formatDateTime = (value) => {
        if (!value) return 'N/A';
        return new Date(value).toLocaleString('vi-VN');
    };

    const calculateCurrentTotal = () => {
        if (!submission?.Answers) return 0;
        return submission.Answers.reduce((sum, answer) => sum + (answer.Diemdatduoc || 0), 0);
    };

    if (isLoading) {
        return (
            <div className="test-grading-page">
                <div className="loading-container">
                    <i className="fas fa-spinner fa-spin"></i>
                    <p>Đang tải thông tin bài test...</p>
                </div>
            </div>
        );
    }

    if (!submission) {
        return (
            <div className="test-grading-page">
                <div className="error-container">
                    <i className="fas fa-exclamation-triangle"></i>
                    <p>Không tìm thấy thông tin bài test!</p>
                </div>
            </div>
        );
    }

    const isGraded = submission.Trangthai === 'dacham';
    const currentTotal = calculateCurrentTotal();

    return (
        <div className="test-grading-page">
            <div className="grading-header">
                <button className="btn-back" onClick={() => navigate('/hr/candidates')}>
                    <i className="fas fa-arrow-left"></i>
                    Quay lại
                </button>
                <div className="header-info">
                    <h1>Chấm bài test</h1>
                    <p className="test-title">{submission.Test?.Tieude}</p>
                    <p className="candidate-info">
                        Ứng viên: <strong>{submission.User?.Ten}</strong> ({submission.User?.Email})
                    </p>
                </div>
                <div className="header-actions">
                    <span className={`status-badge status-${submission.Trangthai}`}>
                        {submission.Trangthai === 'danop' && 'Đã nộp bài'}
                        {submission.Trangthai === 'dacham' && 'Đã chấm điểm'}
                    </span>
                    {!isGraded && (
                        <button 
                            className="btn-finalize" 
                            onClick={handleFinalizeGrading}
                            disabled={isFinalizing}
                        >
                            {isFinalizing ? (
                                <>
                                    <i className="fas fa-spinner fa-spin"></i>
                                    Đang xử lý...
                                </>
                            ) : (
                                <>
                                    <i className="fas fa-check-circle"></i>
                                    Hoàn tất chấm bài
                                </>
                            )}
                        </button>
                    )}
                </div>
            </div>

            <div className="grading-summary">
                <div className="summary-card">
                    <p>Thời gian nộp</p>
                    <h4>{formatDateTime(submission.Thoigianketthuc)}</h4>
                </div>
                <div className="summary-card">
                    <p>Số câu hỏi</p>
                    <h4>{submission.Answers?.length || 0}</h4>
                </div>
                <div className="summary-card">
                    <p>Điểm hiện tại</p>
                    <h4>{currentTotal.toFixed(1)}</h4>
                </div>
                <div className="summary-card highlight">
                    <p>Tổng điểm</p>
                    <h4>{isGraded ? submission.Tongdiemdatduoc?.toFixed(1) : '---'}</h4>
                </div>
            </div>

            <div className="answers-list">
                {submission.Answers?.map((answer, index) => (
                    <AnswerCard
                        key={answer.id}
                        answer={answer}
                        index={index}
                        isGrading={gradingAnswerId === answer.id}
                        isGraded={isGraded}
                        onGrade={handleGradeAnswer}
                    />
                ))}
            </div>
        </div>
    );
};

const AnswerCard = ({ answer, index, isGrading, isGraded, onGrade }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [scoreData, setScoreData] = useState({
        Diemdatduoc: answer.Diemdatduoc || 0,
        Nhanxet: answer.Nhanxet || '',
        Dungkhong: answer.Dungkhong || false
    });

    const handleSubmitGrade = () => {
        if (scoreData.Diemdatduoc < 0 || scoreData.Diemdatduoc > answer.Question.Diem) {
            toast.error(`Điểm phải từ 0 đến ${answer.Question.Diem}!`);
            return;
        }
        onGrade(answer.id, scoreData);
        setIsEditing(false);
    };

    return (
        <div className="answer-card">
            <div className="answer-header">
                <div className="question-info">
                    <span className="question-number">Câu {index + 1}</span>
                    <span className="question-type">
                        {answer.Question.Loaicauhoi === 'tuluan' ? 'Tự luận' : 'Trắc nghiệm'}
                    </span>
                    <span className="max-score">Điểm tối đa: {answer.Question.Diem}</span>
                </div>
                {!isGraded && (
                    <button 
                        className="btn-edit" 
                        onClick={() => setIsEditing(!isEditing)}
                    >
                        <i className={`fas fa-${isEditing ? 'times' : 'edit'}`}></i>
                        {isEditing ? 'Hủy' : 'Chấm điểm'}
                    </button>
                )}
            </div>

            <div className="question-text">
                <strong>Câu hỏi:</strong> {answer.Question.Cauhoi}
            </div>

            <div className="answer-section">
                <div className="section-title">Đáp án đúng:</div>
                <div className="correct-answer">{answer.Question.Dapan}</div>
            </div>

            <div className="answer-section">
                <div className="section-title">Câu trả lời của ứng viên:</div>
                <div className="candidate-answer">
                    {answer.Cautraloi || <em className="no-answer">Không có câu trả lời</em>}
                </div>
            </div>

            {isEditing ? (
                <div className="grading-form">
                    <div className="form-row">
                        <div className="form-group">
                            <label>Điểm đạt được</label>
                            <input
                                type="number"
                                min="0"
                                max={answer.Question.Diem}
                                step="0.5"
                                value={scoreData.Diemdatduoc}
                                onChange={(e) => setScoreData({ ...scoreData, Diemdatduoc: parseFloat(e.target.value) })}
                            />
                        </div>
                        <div className="form-group checkbox-group">
                            <label>
                                <input
                                    type="checkbox"
                                    checked={scoreData.Dungkhong}
                                    onChange={(e) => setScoreData({ ...scoreData, Dungkhong: e.target.checked })}
                                />
                                Đánh dấu là đúng
                            </label>
                        </div>
                    </div>
                    <div className="form-group">
                        <label>Nhận xét</label>
                        <textarea
                            rows="3"
                            placeholder="Nhập nhận xét cho câu trả lời này..."
                            value={scoreData.Nhanxet}
                            onChange={(e) => setScoreData({ ...scoreData, Nhanxet: e.target.value })}
                        />
                    </div>
                    <button 
                        className="btn-save-grade" 
                        onClick={handleSubmitGrade}
                        disabled={isGrading}
                    >
                        {isGrading ? (
                            <>
                                <i className="fas fa-spinner fa-spin"></i>
                                Đang lưu...
                            </>
                        ) : (
                            <>
                                <i className="fas fa-save"></i>
                                Lưu điểm
                            </>
                        )}
                    </button>
                </div>
            ) : (
                <div className="grading-result">
                    <div className="score-display">
                        <span className="label">Điểm:</span>
                        <span className="score">{answer.Diemdatduoc || 0} / {answer.Question.Diem}</span>
                        {answer.Dungkhong && <span className="correct-badge">✓ Đúng</span>}
                    </div>
                    {answer.Nhanxet && (
                        <div className="comment">
                            <strong>Nhận xét:</strong> {answer.Nhanxet}
                        </div>
                    )}
                    {answer.GradingLogs && answer.GradingLogs.length > 0 && (
                        <div className="grading-history">
                            <strong>Lịch sử chấm:</strong>
                            {answer.GradingLogs.map((log, idx) => (
                                <div key={idx} className="history-item">
                                    {log.Diemcu} → {log.Diemmoi} điểm 
                                    {log.Grader && ` bởi ${log.Grader.Ten}`}
                                    {' '}({new Date(log.createdAt).toLocaleString('vi-VN')})
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default TestGrading;

