/**
 * CV Matching Service (Frontend)
 * Service để gọi API tìm công việc phù hợp với CV
 */

import axiosInstance from '../utils/axiosConfig';

/**
 * Tìm công việc phù hợp với CV của user
 * 
 * @param {object} filters - Filters: { location, minSalary, maxSalary, majorId, experience }
 * @returns {Promise} Response từ API
 */
const findMatchingJobs = async (filters = {}) => {
    try {
        const response = await axiosInstance.post('/candidate/find-matching-jobs', {
            filters
        });
        return response.data;
    } catch (error) {
        console.error('Error finding matching jobs:', error);
        throw error;
    }
};

/**
 * Lấy match score của một job posting với CV của user
 * 
 * @param {number} jobPostingId - ID của job posting
 * @returns {Promise} Response từ API
 */
const getJobMatchScore = async (jobPostingId) => {
    try {
        const response = await axiosInstance.get(`/candidate/job/${jobPostingId}/match-score`);
        return response.data;
    } catch (error) {
        console.error('Error getting job match score:', error);
        throw error;
    }
};

export {
    findMatchingJobs,
    getJobMatchScore
};

