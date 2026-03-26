import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { loginUser } from '../../service.js/loginRegister';
import ReflectiveCard from '../../components/ReflectiveCard/ReflectiveCard';
import './Login.scss';

const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isShowPassword, setIsShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const navigate = useNavigate();

    const handleLogin = async () => {
        // Validate input
        if (!email || !password) {
            toast.error('Vui lòng nhập đầy đủ email và mật khẩu!');
            return;
        }

        setIsLoading(true);

        try {
            let res = await loginUser(email, password);

            if (res && res.data && res.data.EC === 0) {
                toast.success(res.data.EM);
                
                // Save user info and JWT token to storage
                const userData = res.data.DT;
                
                // Debug: Log response structure
                console.log('Login response DT:', userData);
                
                // Handle both old format (user object directly) and new format (user + token)
                let userDataToStore;
                if (userData.user && userData.token) {
                    // New format: { user: {...}, token: "..." }
                    userDataToStore = {
                        ...userData.user,
                        token: userData.token
                    };
                } else if (userData.token) {
                    // Format: { ...userFields, token: "..." }
                    userDataToStore = userData;
                } else {
                    // Old format: just user object (shouldn't happen with JWT)
                    userDataToStore = {
                        ...userData,
                        token: null
                    };
                    console.warn('Login response missing token!');
                }
                
                console.log('Storing user data:', userDataToStore);
                
                const userDataString = JSON.stringify(userDataToStore);
                localStorage.setItem('user', userDataString);
                sessionStorage.setItem('user', userDataString);
                
                // Navigate based on role
                if (userData.user && userData.user.roleId) {
                    switch (userData.user.roleId) {
                        case 1:
                            navigate('/admin');
                            break;
                        case 2:
                            navigate('/hr');
                            break;
                        case 3:
                            navigate('/candidate');
                            break;
                        default:
                            navigate('/home');
                    }
                }
            } else {
                toast.error(res.data.EM);
            }
        } catch (error) {
            console.log(error);
            if (error.response && error.response.data) {
                toast.error(error.response.data.EM);
            } else {
                toast.error('Có lỗi xảy ra khi đăng nhập!');
            }
        } finally {
            setIsLoading(false);
        }
    };

    const handleKeyDown = (event) => {
        if (event.key === 'Enter') {
            handleLogin();
        }
    };

    return (
        <div className="login-background">
            <div className="login-layout">
                {/* Left side - Image */}
                <div className="login-image-section">
                    <img 
                        src="http://localhost:8082/images/anh-nen.jpg" 
                        alt="IT Jobs Background" 
                        className="login-background-image"
                        onError={(e) => {
                            // Fallback to frontend public folder if backend image fails
                            e.target.src = '/images/anh-nen.jpg';
                        }}
                    />
                </div>
                
                {/* Right side - Login Form */}
                <div className="login-form-section">
                    <div className="login-card-wrapper">
                        <ReflectiveCard
                            overlayColor="rgba(0, 43, 51, 0.3)"
                            blurStrength={10}
                            glassDistortion={15}
                            metalness={0.8}
                            roughness={0.5}
                            displacementStrength={25}
                            noiseScale={1.5}
                            specularConstant={2.0}
                            grayscale={0.5}
                            color="#ffffff"
                        >
                            <div className="login-content">
                                <div className="card-header">
                                    <div className="security-badge">
                                        <i className="fas fa-lock security-icon"></i>
                                        <span>SECURE ACCESS</span>
                                    </div>
                                    <i className="fas fa-circle-notch status-icon"></i>
                                </div>

                                <div className="card-body">
                                    <div className="col-12 text-login">Đăng Nhập</div>
                            
                                    <div className="col-12 form-group login-input">
                                        <label>Email:</label>
                                        <input
                                            type="text"
                                            className="form-control"
                                            placeholder="Nhập email của bạn"
                                            value={email}
                                            onChange={(event) => setEmail(event.target.value)}
                                            onKeyDown={handleKeyDown}
                                        />
                                    </div>
                                    
                                    <div className="col-12 form-group login-input">
                                        <label>Mật khẩu:</label>
                                        <div className="custom-input-password">
                                            <input
                                                type={isShowPassword ? 'text' : 'password'}
                                                className="form-control"
                                                placeholder="Nhập mật khẩu"
                                                value={password}
                                                onChange={(event) => setPassword(event.target.value)}
                                                onKeyDown={handleKeyDown}
                                            />
                                            <span
                                                onClick={() => setIsShowPassword(!isShowPassword)}
                                            >
                                                <i className={isShowPassword ? 'fas fa-eye' : 'fas fa-eye-slash'}></i>
                                            </span>
                                        </div>
                                    </div>
                                    
                                    <div className="col-12">
                                        <button
                                            className={isLoading ? 'btn-login disabled' : 'btn-login'}
                                            onClick={() => handleLogin()}
                                            disabled={isLoading}
                                        >
                                            {isLoading ? (
                                                <>
                                                    <i className="fas fa-spinner fa-spin"></i> Đang xử lý...
                                                </>
                                            ) : (
                                                'Đăng Nhập'
                                            )}
                                        </button>
                                    </div>
                                    
                                    <div className="col-12">
                                        <span className="forgot-password">Quên mật khẩu?</span>
                                    </div>
                                    
                                    <div className="col-12">
                                        <div className="text-other-login">
                                            <span>Hoặc đăng nhập bằng</span>
                                        </div>
                                    </div>
                                    
                                    <div className="col-12 social-login">
                                        <i className="fab fa-google google"></i>
                                        <i className="fab fa-facebook-f facebook"></i>
                                    </div>
                                    
                                    <div className="col-12 text-center">
                                        <span className="register-text">
                                            Chưa có tài khoản? 
                                            <span className="register-link" onClick={() => navigate('/register')}>
                                                {' '}Đăng ký ngay
                                            </span>
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </ReflectiveCard>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Login;

