import axios from 'axios';

const getAllMajors = async () => {
    try {
        const res = await axios.get('http://localhost:8082/api/majors');
        return res.data;
    } catch (error) {
        console.error('Error fetching majors:', error);
        throw error;
    }
};

const getAllFormats = async () => {
    try {
        const res = await axios.get('http://localhost:8082/api/formats');
        return res.data;
    } catch (error) {
        console.error('Error fetching formats:', error);
        throw error;
    }
};

const getAllJobPostingStatuses = async () => {
    try {
        const res = await axios.get('http://localhost:8082/api/job-posting-statuses');
        return res.data;
    } catch (error) {
        console.error('Error fetching job posting statuses:', error);
        throw error;
    }
};

export { getAllMajors, getAllFormats, getAllJobPostingStatuses };

