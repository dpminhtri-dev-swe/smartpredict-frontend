import axios from 'axios';

const getListJobPosting = async (page, limit, filters = {}) => {
    let queryParams = `page=${page}&limit=${limit}`;
    
    if (filters.keyword) queryParams += `&keyword=${encodeURIComponent(filters.keyword)}`;
    if (filters.location) queryParams += `&location=${encodeURIComponent(filters.location)}`;
    if (filters.experience) queryParams += `&experience=${encodeURIComponent(filters.experience)}`;
    if (filters.minSalary) queryParams += `&minSalary=${filters.minSalary}`;
    if (filters.maxSalary) queryParams += `&maxSalary=${filters.maxSalary}`;
    if (filters.companyId) queryParams += `&companyId=${filters.companyId}`;
    if (filters.formatId) queryParams += `&formatId=${filters.formatId}`;
    if (filters.majorId) queryParams += `&majorId=${filters.majorId}`;
    
    return await axios.get(`http://localhost:8082/api/jobs?${queryParams}`);
};

const getFilterOptions = async () => {
    return await axios.get('http://localhost:8082/api/jobs/filters/options');
};

const getJobPostingById = async (id) => {
    return await axios.get(`http://localhost:8082/api/jobs/${id}`);
};

const createJobPosting = async (data) => {
    return await axios.post('http://localhost:8082/api/jobs', data);
};

const updateJobPosting = async (id, data) => {
    return await axios.put(`http://localhost:8082/api/jobs/${id}`, data);
};

const deleteJobPosting = async (id) => {
    return await axios.delete(`http://localhost:8082/api/jobs/${id}`);
};

export { 
    getListJobPosting, 
    getJobPostingById, 
    createJobPosting, 
    updateJobPosting, 
    deleteJobPosting,
    getFilterOptions
};

