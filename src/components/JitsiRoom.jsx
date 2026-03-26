import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { JitsiMeeting } from '@jitsi/react-sdk';
import { toast } from 'react-toastify';
import { getMeetingByRoomName, updateMeetingStatus, uploadRecording } from '../service.js/meetingService';
import './JitsiRoom.scss';

const JitsiRoom = () => {
    const { roomName } = useParams();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState(null);
    const [isHR, setIsHR] = useState(false);
    const [meetingConfig, setMeetingConfig] = useState(null);
    
    // Recording refs
    const mediaRecorderRef = useRef(null);
    const recordedChunksRef = useRef([]);
    const recordingStreamRef = useRef(null);
    const currentMeetingIdRef = useRef(null); // Store meeting ID for upload
    const jitsiApiRef = useRef(null); // Store Jitsi API reference
    const [isRecording, setIsRecording] = useState(false); // Track recording state

    useEffect(() => {
        console.log('🔵 ========== JITSIROOM COMPONENT MOUNTED ==========');
        console.log('   - Room Name:', roomName);
        
        // Get user from storage
        const storedUser = sessionStorage.getItem('user') || localStorage.getItem('user');
        console.log('   - Stored user found:', !!storedUser);
        
        if (storedUser) {
            try {
                const parsedUser = JSON.parse(storedUser);
                console.log('🔵 JitsiRoom - Parsed user:', parsedUser);
                console.log('   - User ID:', parsedUser?.id);
                console.log('   - User Role ID:', parsedUser?.roleId);
                console.log('   - Is HR (roleId === 2):', parsedUser?.roleId === 2);
                
                if (!parsedUser || !parsedUser.id) {
                    console.error('❌ User data invalid:', parsedUser);
                    toast.error('Thông tin người dùng không hợp lệ!');
                    navigate('/login');
                    return;
                }
                
                setUser(parsedUser);
                setIsHR(parsedUser.roleId === 2);
                console.log('🔵 State updated - isHR:', parsedUser.roleId === 2);
                
                // Fetch meeting data to verify access
                if (roomName) {
                    console.log('🔵 Fetching meeting data...');
                    fetchMeeting(parsedUser.id, parsedUser);
                }
            } catch (error) {
                console.error('❌ Error parsing user data:', error);
                toast.error('Lỗi đọc thông tin người dùng!');
                navigate('/login');
            }
        } else {
            console.error('❌ No stored user found');
            toast.error('Vui lòng đăng nhập để tham gia phỏng vấn!');
            navigate('/login');
        }
    }, [roomName, navigate]);

    const fetchMeeting = async (userId, userData) => {
        try {
            setLoading(true);
            console.log('🔵 ========== FETCHING MEETING ==========');
            console.log('   - Room Name:', roomName);
            console.log('   - User ID:', userId);
            console.log('   - User Role ID:', userData?.roleId);
            
            const res = await getMeetingByRoomName(roomName, userId);
            console.log('🔵 Meeting API Response:', res);
            console.log('   - Response EC:', res?.EC);
            console.log('   - Response EM:', res?.EM);
            console.log('   - Response DT:', res?.DT);
            
            if (res && res.EC === 0) {
                // Meeting found and user has access
                console.log('✅ ========== MEETING ACCESS GRANTED ==========');
                currentMeetingIdRef.current = res.DT?.id || null; // Store meeting ID for recording upload
                console.log('   - Meeting ID stored:', currentMeetingIdRef.current);
                console.log('   - Meeting Status:', res.DT?.status);
                console.log('   - Meeting Data:', res.DT);
                setMeetingConfig({
                    roomName: roomName,
                    domain: 'meet.jit.si',
                    configOverwrite: {
                        // ===== DISABLE PREJOIN & LOBBY COMPLETELY =====
                        prejoinPageEnabled: false,
                        enablePrejoinPage: false,
                        skipPrejoin: true,
                        enableLobby: false,
                        lobbyEnabled: false,
                        enableKnockingLobby: false,
                        enableLobbyChat: false,
                        enableWelcomePage: false,
                        enableClosePage: false,
                        disableDeepLinking: true,
                        
                        // ===== DISABLE AUTHENTICATION =====
                        enableOAuth: false,
                        enableGoogleOAuth: false,
                        enableGithubOAuth: false,
                        enableJwtAuthentication: false,
                        enableAuthentication: false,
                        
                        // ===== AUTO-JOIN IMMEDIATELY =====
                        startWithAudioMuted: false,
                        startWithVideoMuted: false,
                        
                        // ===== DISABLE MODERATOR REQUIREMENT =====
                        requireDisplayName: false,
                        disableModeratorIndicator: true,
                        enableUserRolesBasedOnToken: false,
                        
                        // ===== DISABLE UNNECESSARY FEATURES =====
                        enableInsecureRoomNameWarning: false,
                        enableDisplayNameInStats: false,
                        
                        // ===== FORCE DIRECT JOIN =====
                        enableLayerSuspension: false,
                        enableNoAudioDetection: false,
                        enableNoisyMicDetection: false,
                        
                        // ===== PREVENT TIMEOUT/AUTHENTICATION ERRORS =====
                        enableRemb: true,
                        enableTcc: true,
                        
                        // ===== ALLOW ANYONE TO JOIN =====
                        enableRemoteVideoMenu: true
                    },
                    interfaceConfigOverwrite: {
                        MOBILE_APP_PROMO: false,
                        SHOW_JITSI_WATERMARK: false,
                        SHOW_BRAND_WATERMARK: false,
                        HIDE_INVITE_MORE_HEADER: true
                    },
                    userInfo: {
                        displayName: userData?.Hoten || 'User'
                    }
                });
                setLoading(false);
            } else {
                console.error('❌ Meeting access denied:', res);
                toast.error(res?.EM || 'Không tìm thấy phòng phỏng vấn!');
                // Navigate back based on role
                if (isHR) {
                    navigate('/hr/meetings');
                } else {
                    navigate('/candidate');
                }
            }
        } catch (error) {
            console.error('Error fetching meeting:', error);
            console.error('Error details:', error.response?.data || error.message);
            toast.error('Không thể tải thông tin meeting!');
            // Navigate back based on role
            if (isHR) {
                navigate('/hr/meetings');
            } else {
                navigate('/candidate');
            }
        } finally {
            setLoading(false);
        }
    };

    /**
     * Start recording từ Jitsi meeting
     * Sử dụng getDisplayMedia để record tab (không phải toàn màn hình)
     * User sẽ được yêu cầu chọn tab để share, và bật "Share tab audio"
     */
    const startRecording = async () => {
        try {
            console.log('🎥 ========== STARTING RECORDING ==========');
            console.log('   - Room Name:', roomName);
            console.log('   - Is HR:', isHR);
            console.log('   - Meeting ID:', currentMeetingIdRef.current);
            console.log('   - User:', user?.Hoten || user?.id);
            console.log('   - User ID:', user?.id);
            console.log('   - User Role ID:', user?.roleId);
            
            if (!isHR) {
                console.warn('⚠️ startRecording called but user is not HR!');
                return;
            }
            
            if (!currentMeetingIdRef.current) {
                console.warn('⚠️ startRecording called but no meeting ID!');
            }
            
            // Yêu cầu user share tab (không phải toàn màn hình)
            // User sẽ chọn tab chứa Jitsi meeting và bật "Share tab audio"
            console.log('🎥 Requesting display media (tab sharing)...');
            toast.info('📹 Vui lòng chọn tab chứa Jitsi meeting và bật "Share tab audio" để recording!');
            
            const stream = await navigator.mediaDevices.getDisplayMedia({
                video: {
                    displaySurface: 'browser', // Chỉ share browser tab, không phải toàn màn hình
                    cursor: 'always'
                },
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    sampleRate: 44100,
                    // Quan trọng: bật capture audio từ tab
                    suppressLocalAudioPlayback: false
                }
            });
            
            console.log('✅ Display media stream obtained');
            console.log('   - Video tracks:', stream.getVideoTracks().length);
            console.log('   - Audio tracks:', stream.getAudioTracks().length);
            
            // Kiểm tra xem có audio track không (user có bật "Share tab audio" không)
            if (stream.getAudioTracks().length === 0) {
                console.warn('⚠️ No audio track found! User may not have enabled "Share tab audio"');
                toast.warning('⚠️ Không có audio! Vui lòng bật "Share tab audio" để record âm thanh.');
            }
            
            recordingStreamRef.current = stream;
            console.log('✅ Recording stream stored');
            
            // Create MediaRecorder
            const options = {
                mimeType: 'video/webm;codecs=vp9,opus',
                videoBitsPerSecond: 2500000 // 2.5 Mbps
            };
            
            // Fallback to webm if vp9 not supported
            if (!MediaRecorder.isTypeSupported(options.mimeType)) {
                options.mimeType = 'video/webm;codecs=vp8,opus';
            }
            
            // Final fallback
            if (!MediaRecorder.isTypeSupported(options.mimeType)) {
                options.mimeType = 'video/webm';
            }
            
            const mediaRecorder = new MediaRecorder(stream, options);
            mediaRecorderRef.current = mediaRecorder;
            recordedChunksRef.current = [];
            
            // Handle data available
            mediaRecorder.ondataavailable = (event) => {
                if (event.data && event.data.size > 0) {
                    recordedChunksRef.current.push(event.data);
                    console.log('📹 Chunk recorded:', event.data.size, 'bytes');
                }
            };
            
            // Handle stop - automatically upload to server
            mediaRecorder.onstop = async () => {
                console.log('🛑 ========== RECORDING STOPPED ==========');
                console.log('📊 Recording Info:');
                console.log('   - Room Name:', roomName);
                console.log('   - Is HR:', isHR);
                console.log('   - Meeting ID:', currentMeetingIdRef.current);
                console.log('   - User ID:', user?.id);
                console.log('   - Chunks count:', recordedChunksRef.current.length);
                
                // Create blob from chunks
                const blob = new Blob(recordedChunksRef.current, {
                    type: 'video/webm'
                });
                const blobSize = blob.size;
                console.log('   - Blob size:', blobSize, 'bytes (', (blobSize / 1024 / 1024).toFixed(2), 'MB)');
                
                // Generate filename with timestamp
                const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
                const filename = `meeting-${roomName}-${timestamp}.webm`;
                console.log('   - Filename:', filename);
                
                // If HR and meeting ID exists, upload to server automatically
                if (isHR && currentMeetingIdRef.current && user) {
                    try {
                        console.log('📤 ========== UPLOADING TO SERVER ==========');
                        console.log('   - Meeting ID:', currentMeetingIdRef.current);
                        console.log('   - File size:', blobSize, 'bytes');
                        toast.info('📤 Đang upload recording lên server...');
                        
                        // Create File object from blob
                        const recordingFile = new File([blob], filename, { type: 'video/webm' });
                        console.log('   - File object created:', recordingFile.name, recordingFile.size, 'bytes');
                        
                        // Upload to server
                        const uploadStartTime = Date.now();
                        const uploadRes = await uploadRecording(currentMeetingIdRef.current, recordingFile);
                        const uploadTime = Date.now() - uploadStartTime;
                        
                        console.log('📤 Upload Response:', uploadRes);
                        console.log('   - Upload time:', uploadTime, 'ms');
                        
                        if (uploadRes && uploadRes.EC === 0) {
                            console.log('✅ ========== UPLOAD SUCCESS ==========');
                            console.log('   - Recording URL:', uploadRes.DT?.recordingUrl);
                            console.log('   - File path:', uploadRes.DT?.filePath);
                            toast.success('✅ Recording đã được lưu tự động!');
                        } else {
                            console.error('❌ ========== UPLOAD FAILED ==========');
                            console.error('   - Error code:', uploadRes?.EC);
                            console.error('   - Error message:', uploadRes?.EM);
                            console.error('   - Response:', uploadRes);
                            toast.warning('⚠️ Không thể upload recording tự động. Đã tải về máy.');
                            // Fallback: download to local
                            downloadRecording(blob, filename);
                        }
                    } catch (error) {
                        console.error('❌ ========== UPLOAD ERROR ==========');
                        console.error('   - Error:', error);
                        console.error('   - Error message:', error.message);
                        console.error('   - Error stack:', error.stack);
                        if (error.response) {
                            console.error('   - Response status:', error.response.status);
                            console.error('   - Response data:', error.response.data);
                        }
                        toast.warning('⚠️ Lỗi khi upload recording. Đã tải về máy.');
                        // Fallback: download to local
                        downloadRecording(blob, filename);
                    }
                } else {
                    // Not HR or no meeting ID - just download
                    console.log('📥 ========== DOWNLOADING TO LOCAL ==========');
                    console.log('   - Reason: Not HR or no meeting ID');
                    console.log('   - Is HR:', isHR);
                    console.log('   - Meeting ID:', currentMeetingIdRef.current);
                    downloadRecording(blob, filename);
                    toast.success('✅ Đã tải video recording xuống!');
                }
                
                // Cleanup
                setIsRecording(false);
                recordedChunksRef.current = [];
                console.log('🛑 ========== RECORDING CLEANUP DONE ==========');
            };
            
            // Helper function to download recording
            const downloadRecording = (blob, filename) => {
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = filename;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
            };
            
            // Handle errors
            mediaRecorder.onerror = (event) => {
                console.error('❌ Recording error:', event.error);
                toast.error('Lỗi khi recording: ' + event.error.message);
            };
            
            // Start recording
            mediaRecorder.start(1000); // Collect data every 1 second
            setIsRecording(true); // Update state
            console.log('✅ ========== RECORDING STARTED ==========');
            console.log('   - MediaRecorder state:', mediaRecorder.state);
            console.log('   - MIME type:', options.mimeType);
            console.log('   - Stream tracks:', stream.getTracks().length);
            toast.info('🎥 Đang ghi lại cuộc họp...');
            
            // Handle stream end (user stops sharing)
            stream.getVideoTracks()[0].onended = () => {
                console.log('⚠️ User stopped sharing screen');
                stopRecording();
            };
            
        } catch (error) {
            console.error('❌ Error starting recording:', error);
            if (error.name === 'NotAllowedError') {
                toast.error('Bạn cần cho phép chia sẻ màn hình để recording!');
            } else if (error.name === 'NotFoundError') {
                toast.error('Không tìm thấy thiết bị để recording!');
            } else {
                toast.error('Không thể bắt đầu recording: ' + error.message);
            }
        }
    };
    
    /**
     * Stop recording and download video
     */
    const stopRecording = () => {
        console.log('🛑 ========== STOP RECORDING CALLED ==========');
        console.log('   - MediaRecorder exists:', !!mediaRecorderRef.current);
        if (mediaRecorderRef.current) {
            console.log('   - MediaRecorder state:', mediaRecorderRef.current.state);
        }
        
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
            console.log('🛑 Stopping recording...');
            mediaRecorderRef.current.stop();
            
            // Stop all tracks
            if (recordingStreamRef.current) {
                const tracks = recordingStreamRef.current.getTracks();
                console.log('   - Stopping', tracks.length, 'tracks');
                tracks.forEach(track => {
                    console.log('   - Stopping track:', track.kind, track.label);
                    track.stop();
                });
                recordingStreamRef.current = null;
            }
            
            mediaRecorderRef.current = null;
            setIsRecording(false);
            console.log('✅ Recording stopped and cleaned up');
        } else {
            console.log('⚠️ No active recording to stop');
        }
    };

    const handleLeaveMeeting = async () => {
        console.log('🔴 ========== HANDLE LEAVE MEETING ==========');
        console.log('   - isHR:', isHR);
        console.log('   - user:', user?.Hoten || user?.id);
        console.log('   - meeting ID:', currentMeetingIdRef.current);
        console.log('   - roomName:', roomName);
        console.log('   - isRecording state:', isRecording);
        
        // Stop recording if HR is leaving
        if (isHR) {
            console.log('🔴 HR is leaving - stopping recording...');
            stopRecording();
        } else {
            console.log('🔴 Not HR - skipping recording stop');
        }
        
        // Update meeting status to "done" if HR leaves
        if (isHR && user && roomName) {
            try {
                // Get meeting info to update status
                const meetingRes = await getMeetingByRoomName(roomName, user.id);
                if (meetingRes && meetingRes.EC === 0 && meetingRes.DT) {
                    const meeting = meetingRes.DT;
                    // Only update if meeting is still running
                    if (meeting.status === 'running' || meeting.status === 'pending') {
                        await updateMeetingStatus(meeting.id, user.id, 'done', 'hr');
                        console.log('✅ Meeting status updated to done');
                    }
                }
            } catch (error) {
                console.error('Error updating meeting status:', error);
                // Don't block navigation if update fails
            }
        }
        
        // Navigate back based on role
        if (isHR) {
            navigate('/hr/meetings');
        } else {
            navigate('/candidate');
        }
    };

    const handleApiReady = (api) => {
        console.log('🟢 ========== JITSI API READY ==========');
        console.log('   - API object:', !!api);
        console.log('   - Current isHR state:', isHR);
        console.log('   - Current user:', user?.Hoten || user?.id);
        console.log('   - Current meeting ID:', currentMeetingIdRef.current);
        console.log('   - Room Name:', roomName);
        
        // Store API reference for recording
        jitsiApiRef.current = api;
        console.log('   - Jitsi API stored in ref');
        
        // Update meeting status to "running" when meeting starts
        const updateStatusToRunning = async () => {
            console.log('🟢 updateStatusToRunning called');
            console.log('   - isHR:', isHR);
            console.log('   - user:', !!user);
            console.log('   - roomName:', roomName);
            
            if (isHR && user && roomName) {
                try {
                    console.log('🟢 Fetching meeting to update status...');
                    const meetingRes = await getMeetingByRoomName(roomName, user.id);
                    console.log('🟢 Meeting fetch result:', meetingRes);
                    
                    if (meetingRes && meetingRes.EC === 0 && meetingRes.DT) {
                        const meeting = meetingRes.DT;
                        console.log('   - Meeting status:', meeting.status);
                        // Only update if meeting is still pending
                        if (meeting.status === 'pending') {
                            await updateMeetingStatus(meeting.id, user.id, 'running', 'hr');
                            console.log('✅ Meeting status updated to running');
                        } else {
                            console.log('⚠️ Meeting status is not pending, skipping update');
                        }
                    }
                } catch (error) {
                    console.error('❌ Error updating meeting status to running:', error);
                }
            } else {
                console.log('⚠️ Cannot update status - missing conditions');
                console.log('   - isHR:', isHR);
                console.log('   - user:', !!user);
                console.log('   - roomName:', !!roomName);
            }
        };
        
        // If HR, grant moderator status, update status, and start recording
        console.log('🟢 Checking if HR... isHR =', isHR);
        if (isHR) {
            console.log('🟢 ========== HR DETECTED - SETTING UP RECORDING ==========');
            
            // Function to start recording (reusable)
            const triggerRecording = () => {
                console.log('⏰ ========== TRIGGERING RECORDING ==========');
                console.log('   - Current isHR:', isHR);
                console.log('   - Current user:', user?.Hoten || user?.id);
                console.log('   - Current meeting ID:', currentMeetingIdRef.current);
                
                // Update status to running
                updateStatusToRunning();
                
                // Start recording automatically for HR
                console.log('⏰ Scheduling auto-start recording in 2 seconds...');
                setTimeout(() => {
                    console.log('⏰ ========== AUTO-START RECORDING TRIGGERED ==========');
                    console.log('   - Calling startRecording()...');
                    startRecording();
                }, 2000); // Delay 2s to ensure meeting is fully loaded
            };
            
            // Try multiple events to catch when user joins
            console.log('🟢 Adding multiple event listeners...');
            
            // Event 1: videoConferenceJoined (standard Jitsi event)
            api.addEventListener('videoConferenceJoined', () => {
                console.log('🟢 ========== EVENT: videoConferenceJoined ==========');
                triggerRecording();
            });
            
            // Event 2: participantJoined (when any participant joins)
            api.addEventListener('participantJoined', (participant) => {
                console.log('🟢 ========== EVENT: participantJoined ==========');
                console.log('   - Participant:', participant);
                // Only trigger if it's the current user
                const myUserID = api._myUserID || api.getMyUserId();
                if (participant?.id === myUserID || participant?.participantId === myUserID) {
                    console.log('   - This is the current user, triggering recording...');
                    triggerRecording();
                }
            });
            
            // Event 3: readyToClose (when meeting is ready)
            api.addEventListener('readyToClose', () => {
                console.log('🟢 ========== EVENT: readyToClose ==========');
                // Don't trigger recording here, just log
            });
            
            // Fallback: Try to trigger recording after a delay if no event fires
            console.log('🟢 Setting up fallback timer (5 seconds)...');
            setTimeout(() => {
                console.log('🟢 ========== FALLBACK TIMER TRIGGERED ==========');
                console.log('   - Checking if recording already started...');
                if (!isRecording) {
                    console.log('   - Recording not started yet, triggering now...');
                    triggerRecording();
                } else {
                    console.log('   - Recording already started, skipping');
                }
            }, 5000);
            
            // Grant moderator
            setTimeout(() => {
                try {
                    const myUserID = api._myUserID || api.getMyUserId();
                    if (myUserID) {
                        console.log('🟢 Granting moderator to user:', myUserID);
                        api.executeCommand('grantModerator', myUserID);
                    } else {
                        console.log('🟢 Trying alternative method to grant moderator');
                        api.executeCommand('grantModerator');
                    }
                } catch (error) {
                    console.error('❌ Error granting moderator:', error);
                }
            }, 1000);
            
            console.log('🟢 All event listeners added successfully');
        } else {
            console.log('⚠️ ========== NOT HR - SKIPPING RECORDING SETUP ==========');
            console.log('   - isHR:', isHR);
            console.log('   - User roleId:', user?.roleId);
        }
    };
    
    // Cleanup recording on unmount
    useEffect(() => {
        return () => {
            stopRecording();
        };
    }, []);

    if (loading || !meetingConfig) {
        return (
            <div className="jitsi-room-page">
                <div className="loading-container">
                    <div className="spinner"></div>
                    <p>Đang tải phòng phỏng vấn...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="jitsi-room-page">
            <div className="meeting-header">
                <div className="meeting-info">
                    <h3>Phòng phỏng vấn: {roomName}</h3>
                    <span className="role-badge">{isHR ? 'HR' : 'Ứng viên'}</span>
                </div>
                <button className="btn-leave" onClick={handleLeaveMeeting}>
                    <i className="fas fa-times"></i> Rời phòng
                </button>
            </div>
            <div className="jitsi-container">
                <JitsiMeeting
                    roomName={meetingConfig.roomName}
                    domain={meetingConfig.domain}
                    configOverwrite={meetingConfig.configOverwrite}
                    interfaceConfigOverwrite={meetingConfig.interfaceConfigOverwrite}
                    userInfo={meetingConfig.userInfo}
                    getIFrameRef={(iframe) => {
                        if (iframe) {
                            iframe.style.height = 'calc(100vh - 60px)';
                            iframe.style.width = '100%';
                        }
                    }}
                    onApiReady={handleApiReady}
                    onReadyToClose={handleLeaveMeeting}
                    onVideoConferenceLeft={handleLeaveMeeting}
                />
            </div>
        </div>
    );
};

export default JitsiRoom;

