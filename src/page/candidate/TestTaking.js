import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import CandidateNav from '../../components/Navigation/CandidateNav';
import { getTestSubmissionDetail } from '../../service.js/jobApplicationService';
import { submitTest } from '../../service.js/testSubmissionService';
import { logViolation, getViolationCount } from '../../service.js/violationService';
import { toast } from 'react-toastify';
import './TestTaking.scss';

// Toggle to enable/disable anti-cheat. Set to false to turn off.
const ANTI_CHEAT_ENABLED = true;

const MAX_VIOLATIONS = 5; // Số lần vi phạm tối đa cho phép

const VIOLATION_TYPES = {
    TAB_SWITCH: 'tab-switch',
    BLUR: 'blur',
    FULLSCREEN_EXIT: 'fullscreen-exit',
    DEVTOOLS: 'devtools',
    COPY: 'copy',
    PASTE: 'paste',
    SELECT: 'select',
    MINIMIZE: 'minimize'
};

const VIOLATION_MESSAGES = {
    [VIOLATION_TYPES.TAB_SWITCH]: 'Bạn đã chuyển sang tab khác',
    [VIOLATION_TYPES.BLUR]: 'Bạn đã chuyển sang ứng dụng khác',
    [VIOLATION_TYPES.FULLSCREEN_EXIT]: 'Bạn đã thoát chế độ toàn màn hình',
    [VIOLATION_TYPES.DEVTOOLS]: 'Bạn đã cố mở DevTools',
    [VIOLATION_TYPES.COPY]: 'Bạn đã cố sao chép nội dung',
    [VIOLATION_TYPES.PASTE]: 'Không được phép dán nội dung',
    [VIOLATION_TYPES.SELECT]: 'Không được phép bôi đen nội dung câu hỏi',
    [VIOLATION_TYPES.MINIMIZE]: 'Bạn đã thu nhỏ cửa sổ trình duyệt'
};

const TestTaking = () => {
    const { submissionId } = useParams();
    const navigate = useNavigate();
    const [user, setUser] = useState(null);
    const [submission, setSubmission] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [answers, setAnswers] = useState({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [remainingSeconds, setRemainingSeconds] = useState(null);
    const [hasAutoSubmitted, setHasAutoSubmitted] = useState(false);
    
    // Anti-cheat states
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [showFullscreenPrompt, setShowFullscreenPrompt] = useState(false);
    const [violationCount, setViolationCount] = useState(0);
    const [showViolationWarning, setShowViolationWarning] = useState(false);
    const [currentViolationMessage, setCurrentViolationMessage] = useState('');
    const [isLocked, setIsLocked] = useState(false);
    
    const isTestActive = useRef(false);
    const hasLoggedViolation = useRef({});

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
        const fetchSubmission = async () => {
            if (!user || !submissionId) return;
            setIsLoading(true);
            try {
                const res = await getTestSubmissionDetail(submissionId, user.id);
                if (res.data && res.data.EC === 0) {
                    setSubmission(res.data.DT);
                    
                    // Fetch existing violation count (disabled when anti-cheat off)
                    if (ANTI_CHEAT_ENABLED) {
                        const countRes = await getViolationCount(submissionId, user.id);
                        if (countRes.data && countRes.data.EC === 0) {
                            setViolationCount(countRes.data.DT.count || 0);
                        }
                    } else {
                        setViolationCount(0);
                    }
                } else {
                    toast.error(res.data?.EM || 'Không thể tải thông tin bài test!');
                    navigate('/candidate/applications');
                }
            } catch (error) {
                console.error(error);
                toast.error('Có lỗi xảy ra khi tải thông tin bài test!');
                navigate('/candidate/applications');
            } finally {
                setIsLoading(false);
            }
        };
        fetchSubmission();
    }, [user, submissionId, navigate]);

    useEffect(() => {
        if (submission?.Test?.Questions) {
            setAnswers(prev => {
                const nextAnswers = { ...prev };
                submission.Test.Questions.forEach(question => {
                    if (nextAnswers[question.id] === undefined) {
                        nextAnswers[question.id] = '';
                    }
                });
                return nextAnswers;
            });
        }
    }, [submission]);

    // Check if test is active (danglam status)
    useEffect(() => {
        if (submission && submission.Trangthai === 'danglam') {
            isTestActive.current = true;
            setShowFullscreenPrompt(true);
        } else {
            isTestActive.current = false;
        }
    }, [submission]);

    const handleAnswerChange = (questionId, value) => {
        setAnswers(prev => ({
            ...prev,
            [questionId]: value
        }));
    };

    // Log violation to server
    const recordViolation = useCallback(async (type, message) => {
        if (!ANTI_CHEAT_ENABLED) return;
        if (!user || !submission || !isTestActive.current || isLocked) return;
        
        // Prevent duplicate logs within short time
        const key = `${type}-${Date.now()}`;
        if (hasLoggedViolation.current[type] && Date.now() - hasLoggedViolation.current[type] < 2000) {
            return;
        }
        hasLoggedViolation.current[type] = Date.now();

        try {
            const res = await logViolation(submission.id, user.id, type, message);
            if (res.data && res.data.EC === 0) {
                const newCount = res.data.DT.totalViolations;
                setViolationCount(newCount);
                setCurrentViolationMessage(message);
                setShowViolationWarning(true);

                // Auto hide warning after 3 seconds
                setTimeout(() => {
                    setShowViolationWarning(false);
                }, 3000);

                // Check if max violations reached
                if (newCount >= MAX_VIOLATIONS) {
                    toast.error(`Bạn đã vi phạm ${MAX_VIOLATIONS} lần! Hệ thống sẽ tự động nộp bài.`);
                    setIsLocked(true);
                    handleAutoSubmit();
                }
            }
        } catch (error) {
            console.error('Error logging violation:', error);
        }
    }, [user, submission, isLocked]);

    // Enter fullscreen mode
    const enterFullscreen = useCallback(() => {
        const elem = document.documentElement;
        if (elem.requestFullscreen) {
            elem.requestFullscreen();
        } else if (elem.webkitRequestFullscreen) {
            elem.webkitRequestFullscreen();
        } else if (elem.msRequestFullscreen) {
            elem.msRequestFullscreen();
        }
    }, []);

    // Fullscreen change handler
    useEffect(() => {
        if (!ANTI_CHEAT_ENABLED) return;
        const handleFullscreenChange = () => {
            const isFs = !!(
                document.fullscreenElement ||
                document.webkitFullscreenElement ||
                document.msFullscreenElement
            );
            setIsFullscreen(isFs);

            // If exited fullscreen while test is active, log violation
            if (!isFs && isTestActive.current && !isLocked) {
                recordViolation(VIOLATION_TYPES.FULLSCREEN_EXIT, VIOLATION_MESSAGES[VIOLATION_TYPES.FULLSCREEN_EXIT]);
                setShowFullscreenPrompt(true);
            }
        };

        document.addEventListener('fullscreenchange', handleFullscreenChange);
        document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
        document.addEventListener('MSFullscreenChange', handleFullscreenChange);

        return () => {
            document.removeEventListener('fullscreenchange', handleFullscreenChange);
            document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
            document.removeEventListener('MSFullscreenChange', handleFullscreenChange);
        };
    }, [recordViolation, isLocked]);

    // Visibility change (tab switch) handler
    // DISABLED: Cho phép ứng viên chuyển tab
    useEffect(() => {
        // if (!ANTI_CHEAT_ENABLED) return;
        // const handleVisibilityChange = () => {
        //     if (document.hidden && isTestActive.current && !isLocked) {
        //         recordViolation(VIOLATION_TYPES.TAB_SWITCH, VIOLATION_MESSAGES[VIOLATION_TYPES.TAB_SWITCH]);
        //     }
        // };

        // document.addEventListener('visibilitychange', handleVisibilityChange);
        // return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
    }, [recordViolation, isLocked]);

    // Window blur (focus loss) handler
    // DISABLED: Cho phép ứng viên chuyển sang ứng dụng khác
    useEffect(() => {
        // if (!ANTI_CHEAT_ENABLED) return;
        // const handleBlur = () => {
        //     if (isTestActive.current && !isLocked) {
        //         recordViolation(VIOLATION_TYPES.BLUR, VIOLATION_MESSAGES[VIOLATION_TYPES.BLUR]);
        //     }
        // };

        // window.addEventListener('blur', handleBlur);
        // return () => window.removeEventListener('blur', handleBlur);
    }, [recordViolation, isLocked]);

    // Window resize (minimize detection) handler
    useEffect(() => {
        if (!ANTI_CHEAT_ENABLED) return;
        let lastWidth = window.innerWidth;
        let lastHeight = window.innerHeight;

        const handleResize = () => {
            const currentWidth = window.innerWidth;
            const currentHeight = window.innerHeight;
            
            // Detect significant size reduction (potential minimize)
            if (isTestActive.current && !isLocked) {
                if (currentWidth < lastWidth * 0.5 || currentHeight < lastHeight * 0.5) {
                    recordViolation(VIOLATION_TYPES.MINIMIZE, VIOLATION_MESSAGES[VIOLATION_TYPES.MINIMIZE]);
                }
            }
            
            lastWidth = currentWidth;
            lastHeight = currentHeight;
        };

        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, [recordViolation, isLocked]);

    // DevTools and keyboard shortcut prevention
    useEffect(() => {
        if (!ANTI_CHEAT_ENABLED) return;
        const handleKeyDown = (e) => {
            if (!isTestActive.current || isLocked) return;

            // Detect DevTools shortcuts
            if (
                e.key === 'F12' ||
                (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'i')) ||
                (e.ctrlKey && e.shiftKey && (e.key === 'J' || e.key === 'j')) ||
                (e.ctrlKey && e.shiftKey && (e.key === 'C' || e.key === 'c')) ||
                (e.ctrlKey && (e.key === 'U' || e.key === 'u'))
            ) {
                e.preventDefault();
                recordViolation(VIOLATION_TYPES.DEVTOOLS, VIOLATION_MESSAGES[VIOLATION_TYPES.DEVTOOLS]);
                return;
            }

            // Block copy (Ctrl+C)
            if (e.ctrlKey && (e.key === 'c' || e.key === 'C')) {
                // Allow if target is an input/textarea
                if (e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
                    e.preventDefault();
                    recordViolation(VIOLATION_TYPES.COPY, VIOLATION_MESSAGES[VIOLATION_TYPES.COPY]);
                }
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [recordViolation, isLocked]);

    // Right-click context menu prevention
    useEffect(() => {
        if (!ANTI_CHEAT_ENABLED) return;
        const handleContextMenu = (e) => {
            if (isTestActive.current && !isLocked) {
                // Allow context menu only on input/textarea
                if (e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
                    e.preventDefault();
                }
            }
        };

        document.addEventListener('contextmenu', handleContextMenu);
        return () => document.removeEventListener('contextmenu', handleContextMenu);
    }, [isLocked]);

    // Prevent copy on question text
    useEffect(() => {
        if (!ANTI_CHEAT_ENABLED) return;
        const handleCopy = (e) => {
            if (isTestActive.current && !isLocked) {
                // Allow copy only from input/textarea
                if (e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
                    e.preventDefault();
                    recordViolation(VIOLATION_TYPES.COPY, VIOLATION_MESSAGES[VIOLATION_TYPES.COPY]);
                }
            }
        };

        document.addEventListener('copy', handleCopy);
        return () => document.removeEventListener('copy', handleCopy);
    }, [recordViolation, isLocked]);

    // Handle paste in essay answers (optional - can be enabled/disabled)
    const handlePaste = (e, questionType) => {
        if (!ANTI_CHEAT_ENABLED) return;
        if (questionType === 'tuluan' && isTestActive.current && !isLocked) {
            e.preventDefault();
            recordViolation(VIOLATION_TYPES.PASTE, VIOLATION_MESSAGES[VIOLATION_TYPES.PASTE]);
            toast.warning('Không được phép dán nội dung vào câu trả lời tự luận!');
        }
    };

    const handleAutoSubmit = async () => {
        if (!user || !submission || isSubmitting) return;

        setIsSubmitting(true);
        try {
            const res = await submitTest(user.id, submission.id, answers);

            if (res.data && res.data.EC === 0) {
                if (violationCount >= MAX_VIOLATIONS) {
                    toast.error('Bài test đã được nộp do vi phạm quá nhiều lần!');
                } else {
                    toast.info('Hết thời gian, hệ thống đã tự động nộp bài của bạn.');
                }
                setSubmission(prev => prev ? { ...prev, Trangthai: 'danop' } : prev);
                isTestActive.current = false;
                
                // Exit fullscreen
                if (document.exitFullscreen) {
                    document.exitFullscreen().catch(() => {});
                }
                
                // Navigate to my tests
                setTimeout(() => {
                    navigate(`/candidate/my-tests?submissionId=${submission.id}`);
                }, 2000);
            } else {
                toast.error(res.data?.EM || 'Không thể tự động nộp bài test!');
            }
        } catch (error) {
            console.error('Error auto submitting test:', error);
            toast.error('Có lỗi xảy ra khi hệ thống tự động nộp bài!');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleSubmitAttempt = async () => {
        if (!user || !submission) return;

        if (submission.Trangthai === 'danop' || submission.Trangthai === 'dacham') {
            toast.warning('Bài test đã được nộp rồi!');
            return;
        }

        const confirmed = window.confirm(
            'Bạn có chắc chắn muốn nộp bài test?\n\n' +
            'Sau khi nộp bài, bạn sẽ không thể chỉnh sửa câu trả lời.'
        );

        if (!confirmed) return;

        setIsSubmitting(true);
        try {
            const res = await submitTest(user.id, submission.id, answers);

            if (res.data && res.data.EC === 0) {
                const updatedSubmission = res.data.DT || submission;
                toast.success('Nộp bài test thành công! HR sẽ chấm điểm và thông báo kết quả cho bạn.');
                isTestActive.current = false;
                
                // Exit fullscreen
                if (document.exitFullscreen) {
                    document.exitFullscreen().catch(() => {});
                }
                
                navigate(`/candidate/my-tests?submissionId=${updatedSubmission.id}`);
            } else {
                toast.error(res.data?.EM || 'Không thể nộp bài test!');
            }
        } catch (error) {
            console.error('Error submitting test:', error);
            toast.error('Có lỗi xảy ra khi nộp bài test!');
        } finally {
            setIsSubmitting(false);
        }
    };

    const formatRemainingTime = (seconds) => {
        if (seconds === null) return 'Đang tính...';
        if (seconds <= 0) return '00:00';

        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        const mm = m.toString().padStart(2, '0');
        const ss = s.toString().padStart(2, '0');
        return `${mm}:${ss}`;
    };

    // Timer countdown
    useEffect(() => {
        if (!submission || submission.Trangthai !== 'danglam') return;

        const durationMinutes = submission.Test?.Thoigiantoida || 60;
        const serverStartTime = submission.Thoigianbatdau
            ? new Date(submission.Thoigianbatdau).getTime()
            : Date.now();

        const endTime = serverStartTime + durationMinutes * 60 * 1000;

        const updateRemaining = () => {
            const diffMs = endTime - Date.now();
            const diffSec = Math.floor(diffMs / 1000);

            if (diffSec <= 0) {
                setRemainingSeconds(0);
                if (!hasAutoSubmitted && submission.Trangthai === 'danglam') {
                    setHasAutoSubmitted(true);
                    handleAutoSubmit();
                }
            } else {
                setRemainingSeconds(diffSec);
            }
        };

        updateRemaining();
        const intervalId = setInterval(updateRemaining, 1000);

        return () => clearInterval(intervalId);
    }, [submission, hasAutoSubmitted]);

    const formatDateTime = (value) => {
        if (!value) return 'Không giới hạn';
        return new Date(value).toLocaleString('vi-VN');
    };

    const handleEnterFullscreen = () => {
        enterFullscreen();
        setShowFullscreenPrompt(false);
    };

    if (!user) return null;

    return (
        <div className={`candidate-test-page ${isTestActive.current ? 'test-active' : ''}`}>
            {/* Fullscreen Prompt Modal */}
            {ANTI_CHEAT_ENABLED && showFullscreenPrompt && submission?.Trangthai === 'danglam' && !isFullscreen && (
                <div className="fullscreen-prompt-overlay">
                    <div className="fullscreen-prompt-modal">
                        <div className="prompt-icon">
                            <i className="fas fa-expand-arrows-alt"></i>
                        </div>
                        <h2>Chế độ toàn màn hình</h2>
                        <p>
                            Để đảm bảo tính công bằng, bạn cần bật chế độ toàn màn hình khi làm bài test.
                        </p>
                        <div className="warning-info">
                            <i className="fas fa-exclamation-triangle"></i>
                            <span>
                                Nếu bạn thoát chế độ toàn màn hình hoặc chuyển tab, hệ thống sẽ ghi nhận vi phạm.
                                Sau {MAX_VIOLATIONS} lần vi phạm, bài test sẽ tự động được nộp.
                            </span>
                        </div>
                        <button className="btn-fullscreen" onClick={handleEnterFullscreen}>
                            <i className="fas fa-expand"></i>
                            Vào chế độ toàn màn hình
                        </button>
                    </div>
                </div>
            )}

            {/* Violation Warning Toast */}
            {ANTI_CHEAT_ENABLED && showViolationWarning && (
                <div className="violation-warning">
                    <div className="warning-content">
                        <i className="fas fa-exclamation-circle"></i>
                        <div>
                            <strong>Cảnh báo vi phạm!</strong>
                            <p>{currentViolationMessage}</p>
                            <span className="violation-count">
                                Số lần vi phạm: {violationCount}/{MAX_VIOLATIONS}
                            </span>
                        </div>
                    </div>
                </div>
            )}

            {/* Violation Counter (always visible when test is active) */}
            {ANTI_CHEAT_ENABLED && submission?.Trangthai === 'danglam' && violationCount > 0 && (
                <div className={`violation-counter ${violationCount >= MAX_VIOLATIONS - 1 ? 'danger' : violationCount >= 2 ? 'warning' : ''}`}>
                    <i className="fas fa-exclamation-triangle"></i>
                    <span>Vi phạm: {violationCount}/{MAX_VIOLATIONS}</span>
                </div>
            )}

            <CandidateNav />
            <div className="test-wrapper">
                {isLoading ? (
                    <div className="loading-card">
                        <i className="fas fa-spinner fa-spin"></i>
                        Đang tải bài test...
                    </div>
                ) : !submission ? (
                    <div className="loading-card error">
                        <i className="fas fa-exclamation-triangle"></i>
                        Không tìm thấy thông tin bài test!
                    </div>
                ) : isLocked ? (
                    <div className="loading-card error">
                        <i className="fas fa-lock"></i>
                        <h3>Bài test đã bị khóa</h3>
                        <p>Bạn đã vi phạm quá số lần cho phép. Bài test đã được tự động nộp.</p>
                    </div>
                ) : (
                    <div className="test-content">
                        <div className="test-header">
                            <div>
                                <p className="job-title">{submission.JobApplication?.JobPosting?.Tieude}</p>
                                <h2>{submission.Test?.Tieude}</h2>
                                <p className="subtitle">
                                    Thời gian làm bài: {submission.Test?.Thoigiantoida || 60} phút
                                </p>
                                {submission.Trangthai === 'danglam' && (
                                    <div className="subtitle time-remaining">
                                        <div className="flip-timer">
                                            <div className="time-block">
                                                {formatRemainingTime(remainingSeconds).split(':')[0]}
                                            </div>
                                            <div className="separator">:</div>
                                            <div className="time-block">
                                                {formatRemainingTime(remainingSeconds).split(':')[1]}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                            <div className="status-box">
                                <span className={`status-badge status-${submission.Trangthai}`}>
                                    {submission.Trangthai === 'danglam' && 'Đang làm bài'}
                                    {submission.Trangthai === 'chuabatdau' && 'Chưa bắt đầu'}
                                    {submission.Trangthai === 'dacham' && 'Đã chấm điểm'}
                                    {submission.Trangthai === 'danop' && 'Đã nộp'}
                                </span>
                            </div>
                        </div>

                        <div className="info-grid">
                            <div className="info-card">
                                <p>Thời gian bắt đầu</p>
                                <h4>{submission.Thoigianbatdau ? formatDateTime(submission.Thoigianbatdau) : 'Chưa bắt đầu'}</h4>
                            </div>
                            <div className="info-card">
                                <p>Hạn hoàn thành</p>
                                <h4>{formatDateTime(submission.Hanhethan)}</h4>
                            </div>
                            <div className="info-card">
                                <p>Số câu hỏi</p>
                                <h4>{submission.Test?.Questions?.length || 0}</h4>
                            </div>
                            <div className="info-card">
                                <p>Điểm tối đa</p>
                                <h4>{submission.Test?.Tongdiem || 100}</h4>
                            </div>
                        </div>

                        <div className="test-body">
                            <div className="test-body-header">
                                <div>
                                    <h3>Bài làm của bạn</h3>
                                    <p>
                                        Vui lòng đọc kỹ từng câu hỏi và nhập câu trả lời trực tiếp vào ô tương ứng.
                                        <strong> Không được phép sao chép, dán hoặc chuyển tab trong khi làm bài.</strong>
                                    </p>
                                </div>
                            </div>

                            <div className="questions-preview">
                                {submission.Test?.Questions?.map((question, index) => {
                                    const isEssay = question.Loaicauhoi === 'tuluan';
                                    return (
                                        <div key={question.id} className="question-item">
                                            <div className="question-header">
                                                <div className="question-number">Câu {index + 1}</div>
                                                <div className="question-meta">
                                                    <span className="type">{isEssay ? 'Tự luận' : 'Trắc nghiệm'}</span>
                                                    <span className="score">{question.Diem} điểm</span>
                                                </div>
                                            </div>
                                            <div 
                                                className="question-text no-select"
                                                onCopy={(e) => e.preventDefault()}
                                                onSelectStart={(e) => e.preventDefault()}
                                            >
                                                {question.Cauhoi}
                                            </div>
                                            <div className="answer-field">
                                                {isEssay ? (
                                                    <textarea
                                                        rows="4"
                                                        placeholder="Nhập câu trả lời của bạn..."
                                                        value={answers[question.id] || ''}
                                                        onChange={(e) => handleAnswerChange(question.id, e.target.value)}
                                                        onPaste={(e) => handlePaste(e, question.Loaicauhoi)}
                                                        disabled={submission.Trangthai !== 'danglam'}
                                                    />
                                                ) : (
                                                    // Multiple choice question
                                                    (() => {
                                                        // Parse Options nếu là string JSON (có thể bị double-encoded)
                                                        let parsedOptions = null;
                                                        if (question.Options) {
                                                            if (typeof question.Options === 'string') {
                                                                try {
                                                                    // Parse lần đầu
                                                                    let parsed = JSON.parse(question.Options);
                                                                    
                                                                    // Nếu kết quả vẫn là string (double-encoded), parse thêm lần nữa
                                                                    if (typeof parsed === 'string') {
                                                                        try {
                                                                            parsed = JSON.parse(parsed);
                                                                        } catch (e2) {
                                                                            // Không phải double-encoded, giữ nguyên parsed từ lần 1
                                                                        }
                                                                    }
                                                                    
                                                                    // Chỉ chấp nhận plain object, không phải array hoặc null
                                                                    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
                                                                        parsedOptions = parsed;
                                                                    }
                                                                } catch (e) {
                                                                    console.warn('Failed to parse Options JSON:', e, 'Raw Options:', question.Options);
                                                                    parsedOptions = null;
                                                                }
                                                            } else if (typeof question.Options === 'object' && !Array.isArray(question.Options) && question.Options !== null) {
                                                                // Plain object, dùng trực tiếp
                                                                parsedOptions = question.Options;
                                                            }
                                                        }

                                                        // Debug log để kiểm tra
                                                        if (question.Loaicauhoi === 'tracnghiem' && !parsedOptions) {
                                                            console.warn('Question', question.id, 'is tracnghiem but no valid Options:', {
                                                                raw: question.Options,
                                                                type: typeof question.Options,
                                                                isArray: Array.isArray(question.Options)
                                                            });
                                                        }

                                                        // Chỉ render radio buttons nếu có parsedOptions hợp lệ (plain object với keys)
                                                        const hasValidOptions = parsedOptions && 
                                                            typeof parsedOptions === 'object' && 
                                                            !Array.isArray(parsedOptions) &&
                                                            Object.keys(parsedOptions).length > 0;

                                                        return hasValidOptions ? (
                                                            <div className="multiple-choice-options">
                                                                {Object.entries(parsedOptions).map(([letter, text]) => (
                                                                    <label key={letter} className="option-item">
                                                                        <input
                                                                            type="radio"
                                                                            name={`question-${question.id}`}
                                                                            value={letter}
                                                                            checked={answers[question.id] === letter}
                                                                            onChange={(e) => handleAnswerChange(question.id, e.target.value)}
                                                                            disabled={submission.Trangthai !== 'danglam'}
                                                                        />
                                                                        <span className="option-letter">{letter}.</span>
                                                                        <span className="option-text">{text}</span>
                                                                    </label>
                                                                ))}
                                                            </div>
                                                        ) : (
                                                            // Fallback: text input if no options defined
                                                            <input
                                                                type="text"
                                                                placeholder="Nhập đáp án (ví dụ: A, B, C hoặc nội dung ngắn gọn)"
                                                                value={answers[question.id] || ''}
                                                                onChange={(e) => handleAnswerChange(question.id, e.target.value)}
                                                                disabled={submission.Trangthai !== 'danglam'}
                                                            />
                                                        );
                                                    })()
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                                {(!submission.Test?.Questions || submission.Test?.Questions.length === 0) && (
                                    <div className="empty-questions">
                                        <p>Bài test hiện chưa có câu hỏi.</p>
                                    </div>
                                )}
                            </div>

                            <div className="submit-actions">
                                <button 
                                    className="btn-submit" 
                                    type="button" 
                                    onClick={handleSubmitAttempt}
                                    disabled={isSubmitting || submission.Trangthai === 'danop' || submission.Trangthai === 'dacham'}
                                >
                                    {isSubmitting ? (
                                        <>
                                            <i className="fas fa-spinner fa-spin"></i>
                                            Đang nộp bài...
                                        </>
                                    ) : submission.Trangthai === 'danop' || submission.Trangthai === 'dacham' ? (
                                        <>
                                            <i className="fas fa-check-circle"></i>
                                            Đã nộp bài
                                        </>
                                    ) : (
                                        <>
                                            <i className="fas fa-paper-plane"></i>
                                            Nộp bài
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default TestTaking;
