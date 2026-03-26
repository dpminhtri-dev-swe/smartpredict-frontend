import axiosInstance from '../utils/axiosConfig';

const getMeetingsForHr = async (userId, filters = {}) => {
    try {
        const params = new URLSearchParams({ userId });
        if (filters.status && filters.status !== 'all') {
            params.append('status', filters.status);
        }
        if (filters.jobApplicationId) {
            params.append('jobApplicationId', filters.jobApplicationId);
        }
        if (filters.jobPostingId) {
            params.append('jobPostingId', filters.jobPostingId);
        }
        const res = await axiosInstance.get(`/hr/meetings?${params.toString()}`);
        return res.data;
    } catch (error) {
        console.error('Error fetching meetings for HR:', error);
        throw error;
    }
};

const getMeetingsForCandidate = async (userId, filters = {}) => {
    try {
        const params = new URLSearchParams({ userId });
        if (filters.status && filters.status !== 'all') {
            params.append('status', filters.status);
        }
        const res = await axiosInstance.get(`/candidate/meetings?${params.toString()}`);
        return res.data;
    } catch (error) {
        console.error('Error fetching meetings for candidate:', error);
        throw error;
    }
};

const getMeetingByRoomName = async (roomName, userId) => {
    try {
        // userId is not needed in query since JWT token contains it
        // But we keep it for backward compatibility and logging
        const res = await axiosInstance.get(`/meetings/room/${roomName}`);
        return res.data;
    } catch (error) {
        console.error('Error fetching meeting by roomName:', error);
        throw error;
    }
};

const getMeetingById = async (meetingId, userId, role = 'hr') => {
    try {
        const params = new URLSearchParams({ userId, role });
        const res = await axiosInstance.get(`/meetings/${meetingId}?${params.toString()}`);
        return res.data;
    } catch (error) {
        console.error('Error fetching meeting:', error);
        throw error;
    }
};

const createMeeting = async (userId, data) => {
    try {
        const res = await axiosInstance.post(`/hr/meetings?userId=${userId}`, data);
        return res.data;
    } catch (error) {
        console.error('Error creating meeting:', error);
        throw error;
    }
};

const updateMeetingStatus = async (meetingId, userId, status, role = 'hr') => {
    try {
        const params = new URLSearchParams({ userId, status, role });
        const res = await axiosInstance.put(`/meetings/${meetingId}/status?${params.toString()}`);
        return res.data;
    } catch (error) {
        console.error('Error updating meeting status:', error);
        throw error;
    }
};

const updateMeeting = async (meetingId, data) => {
    try {
        // Get userId from storage for backward compatibility
        const storedUser = sessionStorage.getItem('user') || localStorage.getItem('user');
        const parsedUser = storedUser ? JSON.parse(storedUser) : null;
        const userId = parsedUser?.id;

        if (!userId) {
            throw new Error('User ID not found');
        }

        const res = await axiosInstance.put(`/hr/meetings/${meetingId}?userId=${userId}`, data);
        return res.data;
    } catch (error) {
        console.error('Error updating meeting:', error);
        throw error;
    }
};

const updateInvitationStatus = async (meetingId, userId, action, data = {}) => {
    try {
        const res = await axiosInstance.put(
            `/hr/meetings/${meetingId}/invitation-status?userId=${userId}`,
            { action, ...data }
        );
        return res.data;
    } catch (error) {
        console.error('Error updating invitation status:', error);
        throw error;
    }
};

const cancelMeeting = async (meetingId, userId) => {
    try {
        const res = await axiosInstance.delete(`/hr/meetings/${meetingId}?userId=${userId}`);
        return res.data;
    } catch (error) {
        console.error('Error canceling meeting:', error);
        throw error;
    }
};

const getCandidatesByJobPosting = async (userId, jobPostingId, interviewRoundId = null) => {
    try {
        let url = `/hr/meetings/candidates?userId=${userId}&jobPostingId=${jobPostingId}`;
        if (interviewRoundId) {
            url += `&interviewRoundId=${interviewRoundId}`;
        }
        const res = await axiosInstance.get(url);
        return res.data;
    } catch (error) {
        console.error('Error fetching candidates by job posting:', error);
        throw error;
    }
};

const getLatestMeetingByJobPosting = async (userId, jobPostingId) => {
    try {
        const res = await axiosInstance.get(`/hr/meetings/latest?userId=${userId}&jobPostingId=${jobPostingId}`);
        return res.data;
    } catch (error) {
        console.error('Error fetching latest meeting by job posting:', error);
        throw error;
    }
};

const startRecording = async (meetingId, userId) => {
    try {
        const res = await axiosInstance.post(`/hr/meetings/${meetingId}/recording/start?userId=${userId}`);
        return res.data;
    } catch (error) {
        console.error('Error starting recording:', error);
        throw error;
    }
};

const stopRecording = async (meetingId, userId, recordingUrl = null) => {
    try {
        const res = await axiosInstance.post(`/hr/meetings/${meetingId}/recording/stop?userId=${userId}`, {
            recordingUrl
        });
        return res.data;
    } catch (error) {
        console.error('Error stopping recording:', error);
        throw error;
    }
};

const updateRecordingUrl = async (meetingId, recordingUrl) => {
    try {
        const res = await axiosInstance.put(`/meetings/${meetingId}/recording`, {
            recordingUrl
        });
        return res.data;
    } catch (error) {
        console.error('Error updating recording URL:', error);
        throw error;
    }
};

const getRecording = async (meetingId, userId) => {
    try {
        const res = await axiosInstance.get(`/hr/meetings/${meetingId}/recording?userId=${userId}`);
        return res.data;
    } catch (error) {
        console.error('Error getting recording:', error);
        throw error;
    }
};

const uploadRecording = async (meetingId, recordingFile) => {
    try {
        const formData = new FormData();
        formData.append('recording', recordingFile);
        formData.append('meetingId', meetingId);

        const res = await axiosInstance.post(`/hr/meetings/${meetingId}/recording/upload`, formData, {
            headers: {
                'Content-Type': 'multipart/form-data'
            },
            timeout: 300000 // 5 minutes timeout for large video files
        });
        return res.data;
    } catch (error) {
        console.error('Error uploading recording:', error);
        throw error;
    }
};

export {
    getMeetingsForHr,
    getMeetingsForCandidate,
    getMeetingByRoomName,
    getMeetingById,
    createMeeting,
    updateMeetingStatus,
    updateMeeting,
    updateInvitationStatus,
    cancelMeeting,
    getCandidatesByJobPosting,
    getLatestMeetingByJobPosting,
    startRecording,
    stopRecording,
    updateRecordingUrl,
    getRecording,
    uploadRecording
};

