import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { registerUser } from '../../service.js/loginRegister';
import ReflectiveCard from '../../components/ReflectiveCard/ReflectiveCard';
import './Register.scss';

const Register = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [hoten, setHoten] = useState('');
    const [isShowPassword, setIsShowPassword] = useState(false);
    const [isShowConfirmPassword, setIsShowConfirmPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const defaultValidInput = {
        isValidEmail: true,
        isValidPassword: true,
        isValidConfirmPassword: true,
        isValidHoten: true
    };

    const [objCheckValidInput, setObjCheckValidInput] = useState(defaultValidInput);

    const navigate = useNavigate();

    // Validate email
    const isValidInputs = () => {
        setObjCheckValidInput(defaultValidInput);

        // Check email
        if (!email) {
            toast.error('Email không được để trống!');
            setObjCheckValidInput({ ...defaultValidInput, isValidEmail: false });
            return false;
        }

        let regx = /\S+@\S+\.\S+/;
        if (!regx.test(email)) {
            toast.error('Email không đúng định dạng!');
            setObjCheckValidInput({ ...defaultValidInput, isValidEmail: false });
            return false;
        }

        // Check họ tên
        if (!hoten) {
            toast.error('Họ tên không được để trống!');
            setObjCheckValidInput({ ...defaultValidInput, isValidHoten: false });
            return false;
        }

        // Check password
        if (!password) {
            toast.error('Mật khẩu không được để trống!');
            setObjCheckValidInput({ ...defaultValidInput, isValidPassword: false });
            return false;
        }

        if (password.length < 6) {
            toast.error('Mật khẩu phải có ít nhất 6 ký tự!');
            setObjCheckValidInput({ ...defaultValidInput, isValidPassword: false });
            return false;
        }

        // Check confirm password
        if (!confirmPassword) {
            toast.error('Vui lòng xác nhận mật khẩu!');
            setObjCheckValidInput({ ...defaultValidInput, isValidConfirmPassword: false });
            return false;
        }

        if (password !== confirmPassword) {
            toast.error('Mật khẩu xác nhận không khớp!');
            setObjCheckValidInput({ ...defaultValidInput, isValidConfirmPassword: false });
            return false;
        }

        return true;
    };

    const handleRegister = async () => {
        let check = isValidInputs();
        if (check === true) {
            setIsLoading(true);

            try {
                let res = await registerUser(email, password, hoten, 3); // roleId = 3 (candidate)

                if (res && res.data && res.data.EC === 0) {
                    toast.success(res.data.EM);
                    // Reset form
                    setEmail('');
                    setPassword('');
                    setConfirmPassword('');
                    setHoten('');
                    // Navigate to login after 1.5s
                    setTimeout(() => {
                        navigate('/login');
                    }, 1500);
                } else {
                    toast.error(res.data.EM);
                }
            } catch (error) {
                console.log(error);
                if (error.response && error.response.data) {
                    toast.error(error.response.data.EM);
                } else {
                    toast.error('Có lỗi xảy ra khi đăng ký!');
                }
            } finally {
                setIsLoading(false);
            }
        }
    };

    const handleKeyDown = (event) => {
        if (event.key === 'Enter') {
            handleRegister();
        }
    };

    return (
        <div className="register-background">
            <div className="register-card-wrapper">
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
                    <div className="register-content">
                        <div className="card-header">
                            <div className="security-badge">
                                <i className="fas fa-lock security-icon"></i>
                                <span>CREATE ACCOUNT</span>
                            </div>
                            <i className="fas fa-circle-notch status-icon"></i>
                        </div>

                        <div className="card-body">
                            <div className="col-12 text-register">Đăng Ký Tài Khoản</div>

                            <div className="col-12 form-group register-input">
                                <label>
                                    Họ và tên: <span className="required">*</span>
                                </label>
                                <input
                                    type="text"
                                    className={objCheckValidInput.isValidHoten ? 'form-control' : 'form-control is-invalid'}
                                    placeholder="Nhập họ và tên của bạn"
                                    value={hoten}
                                    onChange={(event) => setHoten(event.target.value)}
                                    onKeyDown={handleKeyDown}
                                />
                            </div>

                            <div className="col-12 form-group register-input">
                                <label>
                                    Email: <span className="required">*</span>
                                </label>
                                <input
                                    type="text"
                                    className={objCheckValidInput.isValidEmail ? 'form-control' : 'form-control is-invalid'}
                                    placeholder="Nhập email của bạn"
                                    value={email}
                                    onChange={(event) => setEmail(event.target.value)}
                                    onKeyDown={handleKeyDown}
                                />
                            </div>

                            <div className="col-12 form-group register-input">
                                <label>
                                    Mật khẩu: <span className="required">*</span>
                                </label>
                                <div className="custom-input-password">
                                    <input
                                        type={isShowPassword ? 'text' : 'password'}
                                        className={objCheckValidInput.isValidPassword ? 'form-control' : 'form-control is-invalid'}
                                        placeholder="Nhập mật khẩu (ít nhất 6 ký tự)"
                                        value={password}
                                        onChange={(event) => setPassword(event.target.value)}
                                        onKeyDown={handleKeyDown}
                                    />
                                    <span onClick={() => setIsShowPassword(!isShowPassword)}>
                                        <i className={isShowPassword ? 'fas fa-eye' : 'fas fa-eye-slash'}></i>
                                    </span>
                                </div>
                            </div>

                            <div className="col-12 form-group register-input">
                                <label>
                                    Xác nhận mật khẩu: <span className="required">*</span>
                                </label>
                                <div className="custom-input-password">
                                    <input
                                        type={isShowConfirmPassword ? 'text' : 'password'}
                                        className={objCheckValidInput.isValidConfirmPassword ? 'form-control' : 'form-control is-invalid'}
                                        placeholder="Nhập lại mật khẩu"
                                        value={confirmPassword}
                                        onChange={(event) => setConfirmPassword(event.target.value)}
                                        onKeyDown={handleKeyDown}
                                    />
                                    <span onClick={() => setIsShowConfirmPassword(!isShowConfirmPassword)}>
                                        <i className={isShowConfirmPassword ? 'fas fa-eye' : 'fas fa-eye-slash'}></i>
                                    </span>
                                </div>
                            </div>

                            <div className="col-12">
                                <button
                                    className={isLoading ? 'btn-register disabled' : 'btn-register'}
                                    onClick={() => handleRegister()}
                                    disabled={isLoading}
                                >
                                    {isLoading ? (
                                        <>
                                            <i className="fas fa-spinner fa-spin"></i> Đang xử lý...
                                        </>
                                    ) : (
                                        'Đăng Ký'
                                    )}
                                </button>
                            </div>

                            <div className="col-12">
                                <div className="text-other-register">
                                    <span>Hoặc đăng ký bằng</span>
                                </div>
                            </div>

                            <div className="col-12 social-register">
                                <i className="fab fa-google google"></i>
                                <i className="fab fa-facebook-f facebook"></i>
                            </div>

                            <div className="col-12 text-center">
                                <span className="login-text">
                                    Đã có tài khoản?
                                    <span className="login-link" onClick={() => navigate('/login')}>
                                        {' '}Đăng nhập ngay
                                    </span>
                                </span>
                            </div>
                        </div>
                    </div>
                </ReflectiveCard>
            </div>
        </div>
    );
};

export default Register;

