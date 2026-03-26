import axiosInstance from '../utils/axiosConfig';

const getDocumentsByApplication = async (applicationId, userId) => {
    try {
        const params = new URLSearchParams({ userId });
        const res = await axiosInstance.get(`/applications/${applicationId}/documents?${params.toString()}`);
        return res.data;
    } catch (error) {
        console.error('Error fetching documents:', error);
        throw error;
    }
};

const checkCanSubmitDocuments = async (applicationId, userId) => {
    try {
        const params = new URLSearchParams({ userId });
        const res = await axiosInstance.get(`/applications/${applicationId}/documents/check?${params.toString()}`);
        return res.data;
    } catch (error) {
        console.error('Error checking can submit documents:', error);
        throw error;
    }
};

const createOrUpdateDocument = async (applicationId, documentData, userId) => {
    try {
        const res = await axiosInstance.post(`/applications/${applicationId}/documents`, {
            ...documentData,
            userId
        });
        return res.data;
    } catch (error) {
        console.error('Error creating/updating document:', error);
        throw error;
    }
};

const deleteDocument = async (documentId, userId) => {
    try {
        const res = await axiosInstance.delete(`/documents/${documentId}`, {
            data: { userId }
        });
        return res.data;
    } catch (error) {
        console.error('Error deleting document:', error);
        throw error;
    }
};

const updateDocumentStatus = async (documentId, status, notes, userId) => {
    try {
        const res = await axiosInstance.put(`/documents/${documentId}/status`, {
            status,
            notes,
            userId
        });
        return res.data;
    } catch (error) {
        console.error('Error updating document status:', error);
        throw error;
    }
};

const getAllDocumentsForHr = async (userId, filters = {}) => {
    try {
        const params = new URLSearchParams({ userId, ...filters });
        const res = await axiosInstance.get(`/hr/documents?${params.toString()}`);
        return res.data;
    } catch (error) {
        console.error('Error fetching documents for HR:', error);
        throw error;
    }
};

export {
    getDocumentsByApplication,
    checkCanSubmitDocuments,
    createOrUpdateDocument,
    deleteDocument,
    updateDocumentStatus,
    getAllDocumentsForHr
};

