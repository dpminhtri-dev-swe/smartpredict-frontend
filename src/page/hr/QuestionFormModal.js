import React, { useState, useEffect } from 'react';
import './QuestionFormModal.scss';
import { addMultipleQuestions, updateQuestion } from '../../service.js/testService';
import { toast } from 'react-toastify';

const QuestionFormModal = ({ show, onClose, onSuccess, testId, userId, mode = 'create', initialData = null }) => {
    const [questions, setQuestions] = useState([{
        Cauhoi: '',
        Dapan: '',
        Loaicauhoi: 'tuluan',
        Diem: 10,
        Options: null // {A: "text", B: "text", C: "text", D: "text"}
    }]);
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (show && mode === 'edit' && initialData) {
            setQuestions([{
                Cauhoi: initialData.Cauhoi || '',
                Dapan: initialData.Dapan || '',
                Loaicauhoi: initialData.Loaicauhoi || 'tuluan',
                Diem: initialData.Diem || 10,
                Options: initialData.Options || null
            }]);
        } else if (show && mode === 'create') {
            setQuestions([{
                Cauhoi: '',
                Dapan: '',
                Loaicauhoi: 'tuluan',
                Diem: 10,
                Options: null
            }]);
        }
    }, [show, mode, initialData]);

    if (!show) return null;

    const handleAddMore = () => {
        setQuestions([...questions, {
            Cauhoi: '',
            Dapan: '',
            Loaicauhoi: 'tuluan',
            Diem: 10,
            Options: null
        }]);
    };

    const handleOptionChange = (index, letter, value) => {
        const newQuestions = [...questions];
        if (!newQuestions[index].Options) {
            newQuestions[index].Options = { A: '', B: '', C: '', D: '' };
        }
        newQuestions[index].Options[letter] = value;
        setQuestions(newQuestions);
    };

    const handleRemove = (index) => {
        if (questions.length === 1) {
            toast.warning('Phải có ít nhất 1 câu hỏi!');
            return;
        }
        const newQuestions = questions.filter((_, i) => i !== index);
        setQuestions(newQuestions);
    };

    const handleChange = (index, field, value) => {
        const newQuestions = [...questions];
        newQuestions[index][field] = value;
        setQuestions(newQuestions);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        // Validation
        for (let i = 0; i < questions.length; i++) {
            if (!questions[i].Cauhoi.trim()) {
                toast.error(`Vui lòng nhập câu hỏi ${i + 1}!`);
                return;
            }
            if (!questions[i].Dapan.trim()) {
                toast.error(`Vui lòng nhập đáp án cho câu ${i + 1}!`);
                return;
            }
            if (questions[i].Diem <= 0) {
                toast.error(`Điểm câu ${i + 1} phải lớn hơn 0!`);
                return;
            }
        }

        try {
            setIsSubmitting(true);
            let res;

            if (mode === 'edit' && initialData) {
                // Update single question
                res = await updateQuestion(userId, initialData.id, questions[0]);
            } else {
                // Add multiple questions
                res = await addMultipleQuestions(userId, testId, questions);
            }

            if (res && res.EC === 0) {
                // Reset form
                setQuestions([{
                    Cauhoi: '',
                    Dapan: '',
                    Loaicauhoi: 'tuluan',
                    Diem: 10
                }]);
                onSuccess();
                toast.success(mode === 'edit' ? 'Cập nhật câu hỏi thành công!' : 'Thêm câu hỏi thành công!');
            } else {
                toast.error(res.EM || `Không thể ${mode === 'edit' ? 'cập nhật' : 'thêm'} câu hỏi!`);
            }
        } catch (error) {
            console.error(`Error ${mode === 'edit' ? 'updating' : 'adding'} questions:`, error);
            toast.error(`Có lỗi xảy ra khi ${mode === 'edit' ? 'cập nhật' : 'thêm'} câu hỏi!`);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="question-form-modal-overlay" onClick={onClose}>
            <div className="question-form-modal-content" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>{mode === 'edit' ? 'Chỉnh Sửa Câu Hỏi' : 'Thêm Câu Hỏi'}</h2>
                    <button className="btn-close" onClick={onClose}>
                        <i className="fas fa-times"></i>
                    </button>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="modal-body">
                        {questions.map((question, index) => (
                            <div key={index} className="question-form-item">
                                <div className="question-form-header">
                                    <h4>{mode === 'edit' ? 'Câu hỏi' : `Câu hỏi ${index + 1}`}</h4>
                                    {questions.length > 1 && mode !== 'edit' && (
                                        <button
                                            type="button"
                                            className="btn-remove"
                                            onClick={() => handleRemove(index)}
                                        >
                                            <i className="fas fa-trash"></i>
                                        </button>
                                    )}
                                </div>

                                <div className="form-group">
                                    <label>Câu hỏi <span className="required">*</span></label>
                                    <textarea
                                        value={question.Cauhoi}
                                        onChange={(e) => handleChange(index, 'Cauhoi', e.target.value)}
                                        placeholder="Nhập nội dung câu hỏi..."
                                        rows="3"
                                        required
                                    />
                                </div>

                                <div className="form-group">
                                    <label>Đáp án chuẩn <span className="required">*</span></label>
                                    <textarea
                                        value={question.Dapan}
                                        onChange={(e) => handleChange(index, 'Dapan', e.target.value)}
                                        placeholder="Nhập đáp án chuẩn..."
                                        rows="3"
                                        required
                                    />
                                </div>

                                <div className="form-row">
                                    <div className="form-group">
                                        <label>Loại câu hỏi</label>
                                        <select
                                            value={question.Loaicauhoi}
                                            onChange={(e) => {
                                                handleChange(index, 'Loaicauhoi', e.target.value);
                                                // Auto initialize options for multiple choice
                                                if (e.target.value === 'tracnghiem' && !question.Options) {
                                                    const newQuestions = [...questions];
                                                    newQuestions[index].Options = { A: '', B: '', C: '', D: '' };
                                                    setQuestions(newQuestions);
                                                }
                                            }}
                                        >
                                            <option value="tuluan">Tự luận</option>
                                            <option value="tracnghiem">Trắc nghiệm</option>
                                        </select>
                                    </div>

                                    <div className="form-group">
                                        <label>Điểm <span className="required">*</span></label>
                                        <input
                                            type="number"
                                            value={question.Diem}
                                            onChange={(e) => handleChange(index, 'Diem', parseInt(e.target.value))}
                                            min="1"
                                            required
                                        />
                                    </div>
                                </div>

                                {/* Multiple choice options */}
                                {question.Loaicauhoi === 'tracnghiem' && (
                                    <div className="form-group">
                                        <label>Các lựa chọn (A, B, C, D) <span className="required">*</span></label>
                                        <div className="options-input-group">
                                            {['A', 'B', 'C', 'D'].map(letter => (
                                                <div key={letter} className="option-input-item">
                                                    <label className="option-label">{letter}.</label>
                                                    <input
                                                        type="text"
                                                        value={question.Options?.[letter] || ''}
                                                        onChange={(e) => handleOptionChange(index, letter, e.target.value)}
                                                        placeholder={`Nhập nội dung lựa chọn ${letter}...`}
                                                        required={question.Loaicauhoi === 'tracnghiem'}
                                                    />
                                                </div>
                                            ))}
                                        </div>
                                        <small className="form-hint">
                                            Đáp án chuẩn ở trên phải là một trong các chữ cái: A, B, C hoặc D
                                        </small>
                                    </div>
                                )}
                            </div>
                        ))}

                        {mode !== 'edit' && (
                            <button
                                type="button"
                                className="btn-add-more"
                                onClick={handleAddMore}
                            >
                                <i className="fas fa-plus"></i> Thêm câu hỏi
                            </button>
                        )}
                    </div>

                    <div className="modal-footer">
                        <button
                            type="button"
                            className="btn-cancel"
                            onClick={onClose}
                            disabled={isSubmitting}
                        >
                            Hủy
                        </button>
                        <button
                            type="submit"
                            className="btn-submit"
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? (
                                <>
                                    <i className="fas fa-spinner fa-spin"></i> {mode === 'edit' ? 'Đang cập nhật...' : 'Đang lưu...'}
                                </>
                            ) : (
                                <>
                                    <i className="fas fa-check"></i> {mode === 'edit' ? 'Cập nhật' : 'Lưu câu hỏi'}
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default QuestionFormModal;

