import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { getMeetingByRoomName } from '../../service.js/meetingService';
import './MeetingRoom.scss';

const MeetingRoom = () => {
    const { roomName } = useParams();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState(null);
    const [isHR, setIsHR] = useState(false);
    const [hasJoined, setHasJoined] = useState(false); // Track if user has actually joined
    const containerRef = useRef(null);
    const apiRef = useRef(null);
    const reloadAttemptsRef = useRef(0); // Track reload attempts to prevent infinite loop
    const isReloadingRef = useRef(false); // Prevent concurrent reloads

    useEffect(() => {
        // Get user from storage
        const storedUser = sessionStorage.getItem('user') || localStorage.getItem('user');
        if (storedUser) {
            try {
                const parsedUser = JSON.parse(storedUser);
                console.log('MeetingRoom - Parsed user:', parsedUser);
                
                if (!parsedUser || !parsedUser.id) {
                    console.error('User data invalid:', parsedUser);
                    toast.error('Thông tin người dùng không hợp lệ!');
                    navigate('/login');
                    return;
                }
                
                setUser(parsedUser);
                setIsHR(parsedUser.roleId === 2);
                
                // Fetch meeting data to verify access
                if (roomName) {
                    fetchMeeting(parsedUser.id);
                }
            } catch (error) {
                console.error('Error parsing user data:', error);
                toast.error('Lỗi đọc thông tin người dùng!');
                navigate('/login');
            }
        } else {
            toast.error('Vui lòng đăng nhập để tham gia phỏng vấn!');
            navigate('/login');
        }
    }, [roomName]);

    const fetchMeeting = async (userId) => {
        try {
            setLoading(true);
            console.log('Fetching meeting - roomName:', roomName, 'userId:', userId);
            
            const res = await getMeetingByRoomName(roomName, userId);
            console.log('Meeting response:', res);
            
            if (res && res.EC === 0) {
                // Meeting found and user has access
                console.log('✅ Meeting access granted');
                setLoading(false);
                // Load Jitsi after confirming access
              
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

    useEffect(() => {
        if (user && roomName && !loading) {
            loadJitsi();
        }

        return () => {
            if (apiRef.current) {
                try {
                    apiRef.current.dispose();
                } catch (e) {
                    console.log('Error disposing Jitsi:', e);
                }
            }
        };
    }, [user, roomName, loading]);

    const loadJitsi = () => {
        if (!window.JitsiMeetExternalAPI) {
            console.error('Jitsi Meet External API not loaded!');
            toast.error('Không thể tải Jitsi Meet. Vui lòng tải lại trang!');
            return;
        }

        // Prevent concurrent reloads
        if (isReloadingRef.current) {
            console.log('Already reloading, skipping...');
            return;
        }

        // Clear container
        if (containerRef.current) {
            containerRef.current.innerHTML = '';
        }

        // Dispose existing API
        if (apiRef.current) {
            try {
                apiRef.current.dispose();
            } catch (e) {
                console.log('Error disposing Jitsi:', e);
            }
            apiRef.current = null;
        }
        
        // Reset hasJoined when reloading
        setHasJoined(false);

        const domain = 'meet.jit.si';
        
        const options = {
            roomName: roomName,
            parentNode: containerRef.current,
            width: '100%',
            height: '100%',
            configOverwrite: {
                // ===== DISABLE PREJOIN & LOBBY COMPLETELY =====
                prejoinPageEnabled: false,
                enablePrejoinPage: false,
                skipPrejoin: true, // Force skip prejoin
                enableLobby: false,
                lobbyEnabled: false,
                enableKnockingLobby: false, // Disable knocking lobby
                enableLobbyChat: false, // Disable lobby chat
                enableWelcomePage: false,
                enableClosePage: false,
                disableDeepLinking: true,
                
                // ===== DISABLE AUTHENTICATION (Google/GitHub) =====
                enableOAuth: false, // Disable OAuth login
                enableGoogleOAuth: false, // Disable Google login
                enableGithubOAuth: false, // Disable GitHub login
                enableJwtAuthentication: false, // Disable JWT authentication
                enableAuthentication: false, // Disable all authentication
                
                // ===== AUTO-JOIN IMMEDIATELY =====
                startWithAudioMuted: false,
                startWithVideoMuted: false,
                
                // ===== DISABLE MODERATOR REQUIREMENT =====
                requireDisplayName: false,
                disableModeratorIndicator: true,
                enableUserRolesBasedOnToken: false, // Don't require token for roles
                
                // ===== DISABLE UNNECESSARY FEATURES =====
                enableInsecureRoomNameWarning: false,
                enableDisplayNameInStats: false,
                
                // ===== FORCE DIRECT JOIN (no prejoin) =====
                enableLayerSuspension: false,
                enableNoAudioDetection: false,
                enableNoisyMicDetection: false,
                
                // ===== PREVENT TIMEOUT/AUTHENTICATION ERRORS =====
                enableRemb: true, // Enable bandwidth estimation
                enableTcc: true, // Enable transport congestion control
                
                // ===== ALLOW ANYONE TO JOIN (no moderator required) =====
                enableRemoteVideoMenu: true
            },
            interfaceConfigOverwrite: {
                MOBILE_APP_PROMO: false,
                SHOW_JITSI_WATERMARK: false,
                SHOW_BRAND_WATERMARK: false,
                HIDE_INVITE_MORE_HEADER: true,
                // Hide buttons that might redirect
                TOOLBAR_BUTTONS: [
                    'microphone',
                    'camera',
                    'closedcaptions',
                    'desktop',
                    'fullscreen',
                    'fodeviceselection',
                    'hangup',
                    'profile',
                    'chat',
                    'recording',
                    'livestreaming',
                    'settings',
                    'raisehand',
                    'videoquality',
                    'filmstrip',
                    'feedback',
                    'stats',
                    'shortcuts',
                    'tileview',
                    'videobackgroundblur',
                    'download',
                    'help',
                    'mute-everyone',
                    'mute-everyone-entry'
                ],
                // Hide settings that might redirect
                SETTINGS_SECTIONS: ['devices', 'language', 'moderator', 'profile'],
                DISABLE_DOMINANT_SPEAKER_INDICATOR: false,
                DISABLE_PRESENCE_STATUS: false,
                DISABLE_FOCUS_INDICATOR: false,
                DISABLE_JOIN_LEAVE_NOTIFICATIONS: false
            },
            userInfo: {
                displayName: user?.Hoten || 'User'
            }
        };

        try {
            apiRef.current = new window.JitsiMeetExternalAPI(domain, options);

            // Event listeners
            apiRef.current.addEventListeners({
                readyToClose: () => {
                    console.log('Jitsi readyToClose event');
                    // Don't navigate automatically - let user click "Rời phòng" button
                    // Don't auto-reload on readyToClose to prevent loops
                    // Just dispose if needed
                    if (!hasJoined && apiRef.current) {
                        console.log('User not yet joined, disposing...');
                        try {
                            apiRef.current.dispose();
                        } catch (e) {
                            console.log('Error disposing:', e);
                        }
                        apiRef.current = null;
                    }
                    // Don't navigate - user might be trying to join or clicking "Mình là quản trị viên"
                },
                videoConferenceJoined: (participant) => {
                    console.log('✅ Video conference joined:', participant);
                    setHasJoined(true); // Mark as joined
                    reloadAttemptsRef.current = 0; // Reset reload attempts on successful join
                    isReloadingRef.current = false; // Reset reloading flag
                    
                    // HR automatically becomes moderator when joining first
                    if (isHR) {
                        console.log('✅ HR joined - Setting as moderator');
                        // Grant moderator status to HR user
                        setTimeout(() => {
                            if (apiRef.current) {
                                try {
                                    // Get current user ID
                                    const myUserID = apiRef.current._myUserID || apiRef.current.getMyUserId();
                                    if (myUserID) {
                                        console.log('Granting moderator to user:', myUserID);
                                        apiRef.current.executeCommand('grantModerator', myUserID);
                                    } else {
                                        // If _myUserID is not available, try alternative method
                                        console.log('Trying alternative method to grant moderator');
                                        apiRef.current.executeCommand('grantModerator');
                                    }
                                } catch (error) {
                                    console.error('Error granting moderator:', error);
                                }
                            }
                        }, 500); // Small delay to ensure user is fully joined
                    }
                },
                videoConferenceLeft: () => {
                    console.log('Video conference left event');
                    // Don't navigate automatically - user might be trying to rejoin
                    // Only reload if we haven't joined and haven't exceeded reload attempts
                    if (!hasJoined && !isReloadingRef.current && reloadAttemptsRef.current < 3) {
                        reloadAttemptsRef.current += 1;
                        isReloadingRef.current = true;
                        console.log(`User left before joining - reload attempt ${reloadAttemptsRef.current}/3...`);
                        
                        setTimeout(() => {
                            if (apiRef.current) {
                                try {
                                    apiRef.current.dispose();
                                } catch (e) {
                                    console.log('Error disposing:', e);
                                }
                                apiRef.current = null;
                            }
                            // Reload Jitsi to try joining again
                            isReloadingRef.current = false;
                            loadJitsi();
                        }, 2000); // Increase delay to 2 seconds
                    } else if (!hasJoined && reloadAttemptsRef.current >= 3) {
                        console.log('Max reload attempts reached. Stopping auto-reload.');
                        toast.error('Không thể kết nối đến phòng họp. Vui lòng thử lại sau!');
                        // Don't reload anymore, just dispose
                        if (apiRef.current) {
                            try {
                                apiRef.current.dispose();
                            } catch (e) {
                                console.log('Error disposing:', e);
                            }
                            apiRef.current = null;
                        }
                    } else {
                        console.log('User had joined, disposing but not navigating');
                        if (apiRef.current) {
                            try {
                                apiRef.current.dispose();
                            } catch (e) {
                                console.log('Error disposing:', e);
                            }
                            apiRef.current = null;
                            setHasJoined(false);
                        }
                    }
                    // Don't navigate - let user click "Rời phòng" button instead
                },
                participantJoined: (participant) => {
                    console.log('Participant joined:', participant);
                },
                participantLeft: (participant) => {
                    console.log('Participant left:', participant);
                },
                conferenceError: (error) => {
                    console.error('❌ Conference error:', error);
                    const errorMsg = error?.error || error;
                    
                    // Handle lobby/moderator errors
                    if (errorMsg === 'conference.connectionError.membersOnly' || 
                        errorMsg === 'conference.connectionError.membersOnly') {
                        console.log('⚠️ Lobby error detected, trying to reload...');
                        toast.warning('Đang thử kết nối lại...');
                        setTimeout(() => {
                            if (apiRef.current) {
                                loadJitsi();
                            }
                        }, 2000);
                    } else {
                        // Don't navigate on other errors, just log
                        console.error('Conference error details:', error);
                    }
                },
                ready: () => {
                    console.log('✅ Jitsi API ready');
                    // Try to join immediately if not already joined
                    if (apiRef.current && !hasJoined) {
                        try {
                            // Check if we're in prejoin page and try to skip it
                            const isInPrejoin = apiRef.current.isInPrejoinPage && apiRef.current.isInPrejoinPage();
                            if (isInPrejoin) {
                                console.log('⚠️ Still in prejoin page, trying to join directly...');
                                // Try to executeCommand to join
                                setTimeout(() => {
                                    try {
                                        apiRef.current.executeCommand('toggleAudio');
                                        apiRef.current.executeCommand('toggleVideo');
                                    } catch (e) {
                                        console.log('Error toggling media:', e);
                                    }
                                }, 500);
                            }
                        } catch (e) {
                            console.log('Error checking prejoin status:', e);
                        }
                    }
                },
                prejoinPageDisplayed: () => {
                    console.log('⚠️ Prejoin page displayed - trying to skip...');
                    // Force join immediately without reloading
                    setTimeout(() => {
                        if (apiRef.current) {
                            try {
                                // Try to execute join command directly
                                apiRef.current.executeCommand('joinConference');
                            } catch (e) {
                                console.log('Error trying to join directly:', e);
                                // If that fails, reload with stronger config
                                loadJitsi();
                            }
                        }
                    }, 500);
                },
                videoConferenceReady: () => {
                    console.log('✅ Video conference ready - user should be in room');
                    setHasJoined(true);
                    reloadAttemptsRef.current = 0; // Reset reload attempts
                    isReloadingRef.current = false; // Reset reloading flag
                    
                    // If HR, ensure moderator status after ready
                    if (isHR) {
                        setTimeout(() => {
                            if (apiRef.current) {
                                try {
                                    const myUserID = apiRef.current._myUserID || apiRef.current.getMyUserId();
                                    if (myUserID) {
                                        console.log('Video conference ready - Granting moderator to HR:', myUserID);
                                        apiRef.current.executeCommand('grantModerator', myUserID);
                                    } else {
                                        apiRef.current.executeCommand('grantModerator');
                                    }
                                } catch (error) {
                                    console.error('Error granting moderator on ready:', error);
                                }
                            }
                        }, 1000); // Delay to ensure conference is fully ready
                    }
                },
                authenticationRequired: () => {
                    console.log('⚠️ Authentication required - but we disabled it, trying to skip...');
                    // Don't allow authentication redirect
                    // Try to join anyway without authentication
                    setTimeout(() => {
                        if (apiRef.current) {
                            try {
                                // Try to join without authentication
                                apiRef.current.executeCommand('joinConference');
                            } catch (e) {
                                console.log('Error trying to join after auth:', e);
                            }
                        }
                    }, 500);
                }
            });
        } catch (error) {
            console.error('Error initializing Jitsi:', error);
            toast.error('Không thể khởi tạo Jitsi Meet!');
        }
    };

    const handleLeaveMeeting = () => {
        console.log('handleLeaveMeeting called - isHR:', isHR);
        
        if (apiRef.current) {
            try {
                apiRef.current.dispose();
            } catch (e) {
                console.log('Error disposing Jitsi:', e);
            }
            apiRef.current = null;
        }
        
        // Only navigate if user explicitly left (not on errors)
        // Navigate back based on role
        if (isHR) {
            navigate('/hr/meetings');
        } else {
            navigate('/candidate');
        }
    };

    if (loading) {
        return (
            <div className="meeting-room-page">
                <div className="loading-container">
                    <div className="spinner"></div>
                    <p>Đang tải phòng phỏng vấn...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="meeting-room-page">
            <div className="meeting-header">
                <div className="meeting-info">
                    <h3>Phòng phỏng vấn: {roomName}</h3>
                    <span className="role-badge">{isHR ? 'HR' : 'Ứng viên'}</span>
                </div>
                <button className="btn-leave" onClick={handleLeaveMeeting}>
                    <i className="fas fa-times"></i> Rời phòng
                </button>
            </div>
            <div ref={containerRef} className="jitsi-container" style={{ width: '100%', height: 'calc(100vh - 60px)' }} />
        </div>
    );
};

export default MeetingRoom;
