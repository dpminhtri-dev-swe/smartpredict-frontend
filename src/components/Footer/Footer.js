import React from 'react';
import { Link } from 'react-router-dom';
import './Footer.scss';

const Footer = () => {
    return (
        <footer className="candidate-footer">
            <div className="footer-container">
                <div className="footer-content">
                    {/* About Section */}
                    <div className="footer-section">
                        <h3 className="footer-title">Về chúng tôi</h3>
                        <p className="footer-description">
                            JobPortal - Nền tảng kết nối ứng viên với các cơ hội việc làm tốt nhất
                        </p>
                        <div className="social-links">
                            <a href="#" className="social-link" aria-label="Facebook">
                                <i className="fab fa-facebook-f"></i>
                            </a>
                            <a href="#" className="social-link" aria-label="LinkedIn">
                                <i className="fab fa-linkedin-in"></i>
                            </a>
                            <a href="#" className="social-link" aria-label="Twitter">
                                <i className="fab fa-twitter"></i>
                            </a>
                            <a href="#" className="social-link" aria-label="Instagram">
                                <i className="fab fa-instagram"></i>
                            </a>
                        </div>
                    </div>

                    {/* Quick Links */}
                    <div className="footer-section">
                        <h3 className="footer-title">Liên kết nhanh</h3>
                        <ul className="footer-links">
                            <li>
                                <Link to="/candidate">Trang chủ</Link>
                            </li>
                            <li>
                                <Link to="/candidate/jobs">Tin tuyển dụng</Link>
                            </li>
                            <li>
                                <Link to="/candidate/companies">Danh sách công ty</Link>
                            </li>
                            <li>
                                <Link to="/candidate/my-records">Hồ sơ của tôi</Link>
                            </li>
                            <li>
                                <Link to="/candidate/my-applications">Đơn ứng tuyển</Link>
                            </li>
                        </ul>
                    </div>

                    {/* Support */}
                    <div className="footer-section">
                        <h3 className="footer-title">Hỗ trợ</h3>
                        <ul className="footer-links">
                            <li>
                                <a href="#">Câu hỏi thường gặp</a>
                            </li>
                            <li>
                                <a href="#">Hướng dẫn sử dụng</a>
                            </li>
                            <li>
                                <a href="#">Chính sách bảo mật</a>
                            </li>
                            <li>
                                <a href="#">Điều khoản sử dụng</a>
                            </li>
                            <li>
                                <a href="#">Liên hệ</a>
                            </li>
                        </ul>
                    </div>

                    {/* Contact Info */}
                    <div className="footer-section">
                        <h3 className="footer-title">Liên hệ</h3>
                        <ul className="footer-contact">
                            <li>
                                <i className="fas fa-map-marker-alt"></i>
                                <span>123 Đường ABC, Quận XYZ, TP.HCM</span>
                            </li>
                            <li>
                                <i className="fas fa-phone"></i>
                                <span>0123 456 789</span>
                            </li>
                            <li>
                                <i className="fas fa-envelope"></i>
                                <span>contact@jobportal.com</span>
                            </li>
                        </ul>
                    </div>
                </div>

                {/* Footer Bottom */}
                <div className="footer-bottom">
                    <p>&copy; {new Date().getFullYear()} JobPortal. Tất cả quyền được bảo lưu.</p>
                </div>
            </div>
        </footer>
    );
};

export default Footer;

