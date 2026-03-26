import axiosInstance from '../utils/axiosConfig';

const applyJob = async (data) => {
    return await axiosInstance.post('/job-applications', data);
};

const checkApplied = async (userId, jobPostingId) => {
    return await axiosInstance.get('/job-applications/check', {
        params: {
            userId,
            jobPostingId
        }
    });
};

const getMyApplications = async (userId) => {
    return await axiosInstance.get('/job-applications', {
        params: { userId }
    });
};

const startTest = async (userId, applicationId) => {
    return await axiosInstance.post('/job-applications/tests/start', {
        userId,
        applicationId
    });
};

const getTestSubmissionDetail = async (submissionId, userId) => {
    return await axiosInstance.get(`/job-applications/tests/submissions/${submissionId}`, {
        params: { userId }
    });
};

export {
    applyJob,
    checkApplied,
    getMyApplications,
    startTest,
    getTestSubmissionDetail
};





