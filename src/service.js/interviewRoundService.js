import axiosInstance from '../utils/axiosConfig';

const getInterviewRounds = async (userId, filters = {}) => {
    try {
        const params = new URLSearchParams({ userId });
        if (filters.jobPostingId && filters.jobPostingId !== 'all') {
            params.append('jobPostingId', filters.jobPostingId);
        }
        if (filters.isActive !== undefined) {
            params.append('isActive', filters.isActive);
        }
        const res = await axiosInstance.get(`/hr/interview-rounds?${params.toString()}`);
        return res.data;
    } catch (error) {
        console.error('Error fetching interview rounds:', error);
        throw error;
    }
};

const createInterviewRound = async (userId, data) => {
    try {
        const res = await axiosInstance.post(`/hr/interview-rounds?userId=${userId}`, data);
        return res.data;
    } catch (error) {
        console.error('Error creating interview round:', error);
        throw error;
    }
};

const updateInterviewRound = async (userId, roundId, data) => {
    try {
        const res = await axiosInstance.put(`/hr/interview-rounds/${roundId}?userId=${userId}`, data);
        return res.data;
    } catch (error) {
        console.error('Error updating interview round:', error);
        throw error;
    }
};

const deleteInterviewRound = async (userId, roundId) => {
    try {
        const res = await axiosInstance.delete(`/hr/interview-rounds/${roundId}?userId=${userId}`);
        return res.data;
    } catch (error) {
        console.error('Error deleting interview round:', error);
        throw error;
    }
};

export {
    getInterviewRounds,
    createInterviewRound,
    updateInterviewRound,
    deleteInterviewRound
};

