import axiosInstance from '../utils/axiosConfig';

const getMyRecords = async (userId) => {
    return await axiosInstance.get(`/records?userId=${userId}`);
};

const getRecordById = async (id, userId) => {
    return await axiosInstance.get(`/records/${id}?userId=${userId}`);
};

const createRecord = async (data) => {
    return await axiosInstance.post('/records', data);
};

const updateRecord = async (id, data) => {
    return await axiosInstance.put(`/records/${id}`, data);
};

const deleteRecord = async (id, userId) => {
    return await axiosInstance.delete(`/records/${id}`, {
        data: { userId: userId }
    });
};

const uploadCV = async (file, userId) => {
    const formData = new FormData();
    formData.append('cv', file);
    formData.append('userId', userId);

    return await axiosInstance.post('/upload-cv', formData, {
        headers: {
            'Content-Type': 'multipart/form-data'
        }
    });
};

const getCVStatus = async () => {
    return await axiosInstance.get('/candidate/cv-status');
};

export { 
    getMyRecords, 
    getRecordById, 
    createRecord, 
    updateRecord, 
    deleteRecord,
    uploadCV,
    getCVStatus
};

