import axiosInstance from '../utils/axiosConfig';


/**
 * Tạo bài test mới
 */
const createTest = async (userId, data) => {
    try {
        const res = await axiosInstance.post(`/hr/tests?userId=${userId}`, data);
        return res.data;
    } catch (error) {
        console.error('Error creating test:', error);
        throw error;
    }
};

/**
 * Thêm câu hỏi vào bài test
 */
const addQuestion = async (userId, testId, questionData) => {
    try {
        const res = await axiosInstance.post(
            `/hr/tests/questions?userId=${userId}&testId=${testId}`,
            questionData
        );
        return res.data;
    } catch (error) {
        console.error('Error adding question:', error);
        throw error;
    }
};

/**
 * Thêm nhiều câu hỏi cùng lúc
 */
const addMultipleQuestions = async (userId, testId, questions) => {
    try {
        const res = await axiosInstance.post(
            `/hr/tests/questions/bulk?userId=${userId}&testId=${testId}`,
            { questions }
        );
        return res.data;
    } catch (error) {
        console.error('Error adding multiple questions:', error);
        throw error;
    }
};

/**
 * Lấy danh sách bài test
 */
const getMyTests = async (userId, page = 1, limit = 10, jobPostingId = null) => {
    try {
        const url = new URL(`/hr/tests`, window.location.origin);
        url.searchParams.append('userId', userId);
        url.searchParams.append('page', page);
        url.searchParams.append('limit', limit);
        if (jobPostingId) {
            url.searchParams.append('jobPostingId', jobPostingId);
        }

        const res = await axiosInstance.get(url.pathname + url.search);
        return res.data;
    } catch (error) {
        console.error('Error fetching tests:', error);
        throw error;
    }
};

/**
 * Lấy chi tiết bài test
 */
const getTestDetail = async (userId, testId) => {
    try {
        const res = await axiosInstance.get(
            `/hr/tests/detail?userId=${userId}&testId=${testId}`
        );
        return res.data;
    } catch (error) {
        console.error('Error fetching test detail:', error);
        throw error;
    }
};

/**
 * Cập nhật bài test
 */
const updateTest = async (userId, testId, data) => {
    try {
        const res = await axiosInstance.put(
            `/hr/tests/${testId}?userId=${userId}`,
            data
        );
        return res.data;
    } catch (error) {
        console.error('Error updating test:', error);
        throw error;
    }
};

/**
 * Xóa bài test
 */
const deleteTest = async (userId, testId) => {
    try {
        const res = await axiosInstance.delete(
            `/hr/tests/${testId}?userId=${userId}`
        );
        return res.data;
    } catch (error) {
        console.error('Error deleting test:', error);
        throw error;
    }
};

/**
 * Cập nhật câu hỏi
 */
const updateQuestion = async (userId, questionId, data) => {
    try {
        const res = await axiosInstance.put(
            `/hr/tests/questions/${questionId}?userId=${userId}`,
            data
        );
        return res.data;
    } catch (error) {
        console.error('Error updating question:', error);
        throw error;
    }
};

/**
 * Xóa câu hỏi
 */
const deleteQuestion = async (userId, questionId) => {
    try {
        const res = await axiosInstance.delete(
            `/hr/tests/questions/${questionId}?userId=${userId}`
        );
        return res.data;
    } catch (error) {
        console.error('Error deleting question:', error);
        throw error;
    }
};

export {
    createTest,
    addQuestion,
    addMultipleQuestions,
    getMyTests,
    getTestDetail,
    updateTest,
    deleteTest,
    updateQuestion,
    deleteQuestion
};

