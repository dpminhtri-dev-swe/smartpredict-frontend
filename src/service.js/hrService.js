import axiosInstance from '../utils/axiosConfig';

const getHrDashboard = async (userId) => {
    try {
        const res = await axiosInstance.get(`/hr/dashboard?userId=${userId}`);
        return res.data;
    } catch (error) {
        console.error('Error fetching HR dashboard:', error);
        throw error;
    }
};

const getMyJobPostings = async (userId, page = 1, limit = 10) => {
    try {
        const res = await axiosInstance.get(`/hr/job-postings?userId=${userId}&page=${page}&limit=${limit}`);
        return res.data;
    } catch (error) {
        console.error('Error fetching job postings:', error);
        throw error;
    }
};

const getJobPostingDetail = async (userId, jobId) => {
    try {
        const res = await axiosInstance.get(`/hr/job-postings/detail?userId=${userId}&jobId=${jobId}`);
        return res.data;
    } catch (error) {
        console.error('Error fetching job posting detail:', error);
        throw error;
    }
};

const deleteJobPosting = async (userId, jobId) => {
    try {
        const res = await axiosInstance.delete(`/hr/job-postings/${jobId}?userId=${userId}`);
        return res.data;
    } catch (error) {
        console.error('Error deleting job posting:', error);
        throw error;
    }
};

const createJobPosting = async (userId, data) => {
    try {
        const res = await axiosInstance.post(`/hr/job-postings?userId=${userId}`, data);
        return res.data;
    } catch (error) {
        console.error('Error creating job posting:', error);
        throw error;
    }
};

const updateJobPosting = async (userId, jobId, data) => {
    try {
        const res = await axiosInstance.put(`/hr/job-postings/${jobId}?userId=${userId}`, data);
        return res.data;
    } catch (error) {
        console.error('Error updating job posting:', error);
        throw error;
    }
};

const getMyCompanies = async (userId) => {
    try {
        const res = await axiosInstance.get(`/hr/my-companies?userId=${userId}`);
        return res.data;
    } catch (error) {
        console.error('Error fetching my companies:', error);
        throw error;
    }
};

const getActiveJobPostings = async (userId) => {
    try {
        const res = await axiosInstance.get(`/hr/active-jobs?userId=${userId}`);
        return res.data;
    } catch (error) {
        console.error('Error fetching active job postings:', error);
        throw error;
    }
};

const getJobApplications = async (userId, statusId = 'all', jobPostingId = 'all', page = 1, limit = 10, search = '') => {
    try {
        const res = await axiosInstance.get(`/hr/applications?userId=${userId}&statusId=${statusId}&jobPostingId=${jobPostingId}&page=${page}&limit=${limit}&search=${encodeURIComponent(search)}`);
        return res.data;
    } catch (error) {
        console.error('Error fetching job applications:', error);
        throw error;
    }
};

const getApplicationStatistics = async (userId) => {
    try {
        const res = await axiosInstance.get(`/hr/applications/statistics?userId=${userId}`);
        return res.data;
    } catch (error) {
        console.error('Error fetching application statistics:', error);
        throw error;
    }
};

const getApplicationDetail = async (userId, applicationId) => {
    try {
        const res = await axiosInstance.get(`/hr/applications/detail?userId=${userId}&applicationId=${applicationId}`);
        return res.data;
    } catch (error) {
        console.error('Error fetching application detail:', error);
        throw error;
    }
};

const updateApplicationStatus = async (userId, applicationId, statusId) => {
    try {
        const res = await axiosInstance.put(`/hr/applications/${applicationId}?userId=${userId}`, { statusId });
        return res.data;
    } catch (error) {
        console.error('Error updating application status:', error);
        throw error;
    }
};

const getCompanyProfile = async (userId) => {
    try {
        const res = await axiosInstance.get(`/hr/company-profile?userId=${userId}`);
        return res.data;
    } catch (error) {
        console.error('Error fetching company profile:', error);
        throw error;
    }
};

const updateCompanyProfile = async (userId, companyData) => {
    try {
        const res = await axiosInstance.put(`/hr/company-profile`, { userId, companyData });
        return res.data;
    } catch (error) {
        console.error('Error updating company profile:', error);
        throw error;
    }
};

const getTestSubmissions = async (userId, { status = 'all', jobPostingId = 'all', page = 1, limit = 10, search = '' } = {}) => {
    try {
        const params = new URLSearchParams({
            userId,
            status,
            jobPostingId,
            page,
            limit,
            search
        });
        const res = await axiosInstance.get(`/hr/test-submissions?${params.toString()}`);
        return res.data;
    } catch (error) {
        console.error('Error fetching test submissions:', error);
        throw error;
    }
};

export { 
    getHrDashboard, 
    getMyJobPostings, 
    getJobPostingDetail,
    deleteJobPosting,
    createJobPosting,
    updateJobPosting,
    getMyCompanies,
    getActiveJobPostings,
    getJobApplications,
    getApplicationStatistics,
    getApplicationDetail,
    updateApplicationStatus,
    getCompanyProfile,
    updateCompanyProfile,
    getTestSubmissions
};
