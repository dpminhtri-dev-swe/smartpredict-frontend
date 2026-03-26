import React, { useState, useEffect } from 'react';
import './QuestionBankSelectorModal.scss';
import { getQuestionBankItems, getQuestionBanks } from '../../service.js/questionBankService';
import { toast } from 'react-toastify';

const QuestionBankSelectorModal = ({ show, onClose, onSelect, userId }) => {
    const [questionBanks, setQuestionBanks] = useState([]);
    const [selectedBankId, setSelectedBankId] = useState('');
    const [questions, setQuestions] = useState([]);
    const [selectedQuestions, setSelectedQuestions] = useState(new Set());
    const [isLoading, setIsLoading] = useState(false);
    const [filters, setFilters] = useState({
        chude: '',
        loaicauhoi: '',
        dodai: '',
        dokho: '',
        search: ''
    });
    const [filterOptions, setFilterOptions] = useState({
        topics: [],
        questionTypes: [],
        lengths: [],
        difficulties: []
    });

    useEffect(() => {
        if (show && userId) {
            fetchQuestionBanks();
        }
    }, [show, userId]);

    useEffect(() => {
        if (show && userId) {
            fetchQuestions();
        }
    }, [show, userId, selectedBankId, filters]);

    const fetchQuestionBanks = async () => {
        try {
            const res = await getQuestionBanks(userId);
            if (res && res.EC === 0) {
                setQuestionBanks(res.DT || []);
            }
        } catch (error) {
            console.error('Error fetching question banks:', error);
        }
    };

    const fetchQuestions = async () => {
        try {
            setIsLoading(true);
            const res = await getQuestionBankItems(userId, {
                bankId: selectedBankId || null,
                ...filters,
                limit: 100
            });

            if (res && res.EC === 0) {
                setQuestions(res.DT.items || []);
                if (res.DT.filters) {
                    setFilterOptions(res.DT.filters);
                }
            } else {
                toast.error(res.EM || 'Không thể tải danh sách câu hỏi!');
            }
        } catch (error) {
            console.error('Error fetching questions:', error);
            toast.error('Có lỗi xảy ra khi tải danh sách câu hỏi!');
        } finally {
            setIsLoading(false);
        }
    };

    const handleToggleQuestion = (questionId) => {
        const newSelected = new Set(selectedQuestions);
        if (newSelected.has(questionId)) {
            newSelected.delete(questionId);
        } else {
            newSelected.add(questionId);
        }
        setSelectedQuestions(newSelected);
    };

    const handleSelectAll = () => {
        if (selectedQuestions.size === questions.length) {
            setSelectedQuestions(new Set());
        } else {
            setSelectedQuestions(new Set(questions.map(q => q.id)));
        }
    };

    const handleFilterChange = (field, value) => {
        setFilters(prev => ({
            ...prev,
            [field]: value
        }));
        setSelectedQuestions(new Set()); // Reset selection when filter changes
    };

    const handleConfirm = () => {
        const selected = questions.filter(q => selectedQuestions.has(q.id));
        if (selected.length === 0) {
            toast.warning('Vui lòng chọn ít nhất 1 câu hỏi!');
            return;
        }

        // Convert to format expected by addMultipleQuestions
        const formattedQuestions = selected.map(q => ({
            Cauhoi: q.Cauhoi,
            Dapan: q.Dapan,
            Loaicauhoi: q.Loaicauhoi,
            Options: q.Options || null, // QUAN TRỌNG: Copy Options để hiển thị radio buttons
            Diem: q.Diem || 10
        }));

        onSelect(formattedQuestions);
        handleClose();
    };

    const handleClose = () => {
        setSelectedQuestions(new Set());
        setFilters({
            chude: '',
            loaicauhoi: '',
            dodai: '',
            dokho: '',
            search: ''
        });
        setSelectedBankId('');
        onClose();
    };

    if (!show) return null;

    const getQuestionTypeLabel = (type) => {
        // Normalize type: remove any extra characters, take first valid value
        if (!type) return 'Không xác định';
        const normalized = String(type).toLowerCase().trim();
        // If contains "tracnghiem", prioritize it (multiple choice)
        if (normalized.includes('tracnghiem')) return 'Trắc nghiệm';
        // If contains "tuluan", it's essay
        if (normalized.includes('tuluan')) return 'Tự luận';
        // Default fallback
        return normalized === 'tuluan' ? 'Tự luận' : 'Trắc nghiệm';
    };

    const getDifficultyLabel = (diff) => {
        const map = { 'de': 'Dễ', 'trungbinh': 'Trung bình', 'kho': 'Khó' };
        return map[diff] || diff;
    };

    const getLengthLabel = (len) => {
        const map = { 'ngan': 'Ngắn', 'trungbinh': 'Trung bình', 'dai': 'Dài' };
        return map[len] || len;
    };

    return (
        <div className="question-bank-selector-overlay" onClick={handleClose}>
            <div className="question-bank-selector-content" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>Chọn câu hỏi từ bộ đề</h2>
                    <button className="btn-close" onClick={handleClose}>
                        <i className="fas fa-times"></i>
                    </button>
                </div>

                <div className="modal-body">
                    {/* Filters */}
                    <div className="filters-section">
                        <div className="filter-row">
                            <div className="filter-group">
                                <label>Bộ đề</label>
                                <select
                                    value={selectedBankId}
                                    onChange={(e) => {
                                        setSelectedBankId(e.target.value);
                                        setSelectedQuestions(new Set());
                                    }}
                                >
                                    <option value="">Tất cả bộ đề</option>
                                    {questionBanks.map(bank => (
                                        <option key={bank.id} value={bank.id}>
                                            {bank.Ten}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="filter-group">
                                <label>Chủ đề</label>
                                <select
                                    value={filters.chude}
                                    onChange={(e) => handleFilterChange('chude', e.target.value)}
                                >
                                    <option value="">Tất cả</option>
                                    {filterOptions.topics.map(topic => (
                                        <option key={topic} value={topic}>{topic}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="filter-group">
                                <label>Loại câu hỏi</label>
                                <select
                                    value={filters.loaicauhoi}
                                    onChange={(e) => handleFilterChange('loaicauhoi', e.target.value)}
                                >
                                    <option value="">Tất cả</option>
                                    <option value="tuluan">Tự luận</option>
                                    <option value="tracnghiem">Trắc nghiệm</option>
                                </select>
                            </div>

                            <div className="filter-group">
                                <label>Độ khó</label>
                                <select
                                    value={filters.dokho}
                                    onChange={(e) => handleFilterChange('dokho', e.target.value)}
                                >
                                    <option value="">Tất cả</option>
                                    {filterOptions.difficulties.map(diff => (
                                        <option key={diff} value={diff}>
                                            {getDifficultyLabel(diff)}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="filter-row">
                            <div className="filter-group search-group">
                                <label>Tìm kiếm</label>
                                <input
                                    type="text"
                                    placeholder="Tìm theo câu hỏi, đáp án, chủ đề..."
                                    value={filters.search}
                                    onChange={(e) => handleFilterChange('search', e.target.value)}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Questions List */}
                    <div className="questions-section">
                        <div className="questions-header">
                            <h3>
                                Danh sách câu hỏi ({questions.length})
                                {selectedQuestions.size > 0 && (
                                    <span className="selected-count">
                                        - Đã chọn: {selectedQuestions.size}
                                    </span>
                                )}
                            </h3>
                            {questions.length > 0 && (
                                <button
                                    className="btn-select-all"
                                    onClick={handleSelectAll}
                                >
                                    {selectedQuestions.size === questions.length ? 'Bỏ chọn tất cả' : 'Chọn tất cả'}
                                </button>
                            )}
                        </div>

                        {isLoading ? (
                            <div className="loading-state">
                                <i className="fas fa-spinner fa-spin"></i> Đang tải...
                            </div>
                        ) : questions.length === 0 ? (
                            <div className="empty-state">
                                <i className="fas fa-inbox"></i>
                                <p>Không tìm thấy câu hỏi nào</p>
                            </div>
                        ) : (
                            <div className="questions-list">
                                {questions.map(question => {
                                    const isSelected = selectedQuestions.has(question.id);
                                    return (
                                        <div
                                            key={question.id}
                                            className={`question-item ${isSelected ? 'selected' : ''}`}
                                            onClick={() => handleToggleQuestion(question.id)}
                                        >
                                            <div className="question-checkbox">
                                                <input
                                                    type="checkbox"
                                                    checked={isSelected}
                                                    onChange={() => handleToggleQuestion(question.id)}
                                                    onClick={(e) => e.stopPropagation()}
                                                />
                                            </div>
                                            <div className="question-content">
                                                <div className="question-badges">
                                                    {question.Chude && (
                                                        <span className="badge badge-topic">{question.Chude}</span>
                                                    )}
                                                    <span className="badge badge-type">
                                                        {getQuestionTypeLabel(question.Loaicauhoi)}
                                                    </span>
                                                    <span className="badge badge-difficulty">
                                                        {getDifficultyLabel(question.Dokho)}
                                                    </span>
                                                    <span className="badge badge-score">
                                                        {question.Diem} điểm
                                                    </span>
                                                </div>
                                                
                                                <div className="question-text">
                                                    <div className="question-label">Câu hỏi:</div>
                                                    <div className="question-value">{question.Cauhoi}</div>
                                                </div>
                                                
                                                {question.Dapan && (
                                                    <div className="question-answer">
                                                        <div className="answer-label">Đáp án:</div>
                                                        <div className="answer-value">{question.Dapan}</div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>

                <div className="modal-footer">
                    <button
                        className="btn-cancel"
                        onClick={handleClose}
                    >
                        Hủy
                    </button>
                    <button
                        className="btn-confirm"
                        onClick={handleConfirm}
                        disabled={selectedQuestions.size === 0}
                    >
                        <i className="fas fa-check"></i> Thêm {selectedQuestions.size > 0 ? `${selectedQuestions.size} ` : ''}câu hỏi
                    </button>
                </div>
            </div>
        </div>
    );
};

export default QuestionBankSelectorModal;

