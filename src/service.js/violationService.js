import axiosInstance from '../utils/axiosConfig';

/**
 * Log a violation during test taking
 */
const logViolation = async (testSubmissionId, userId, violation_type, message) => {
    return await axiosInstance.post(`/violations/log`, {
        testSubmissionId,
        userId,
        violation_type,
        message
    });
};

/**
 * Get violation count for a submission
 */
const getViolationCount = async (submissionId, userId) => {
    return await axiosInstance.get(`/violations/${submissionId}/count`, {
        params: { userId }
    });
};

/**
 * Get all violations for a submission (HR view)
 */
const getViolationsForSubmission = async (submissionId) => {
    return await axiosInstance.get(`/violations/${submissionId}`);
};

export {
    logViolation,
    getViolationCount,
    getViolationsForSubmission
};

