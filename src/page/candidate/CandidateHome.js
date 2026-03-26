import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import CandidateNav from '../../components/Navigation/CandidateNav';
import Footer from '../../components/Footer/Footer';
import ScrollToTop from '../../components/ScrollToTop/ScrollToTop';
import ReactPaginate from 'react-paginate';
import { toast } from 'react-toastify';
import { getListJobPosting, getFilterOptions } from '../../service.js/jobPostingService';
import AOS from 'aos';
import 'aos/dist/aos.css';
import './CandidateHome.scss';

// Backend URL for static files
const BACKEND_URL = 'http://localhost:8082';

const CandidateHome = () => {
    const navigate = useNavigate();
    const [user, setUser] = useState(null);
    const [searchKeyword, setSearchKeyword] = useState('');
    const [searchLocation, setSearchLocation] = useState('');
    const [jobs, setJobs] = useState([]);
    const [totalPages, setTotalPages] = useState(0);
    const [currentPage, setCurrentPage] = useState(0);
    const [isLoading, setIsLoading] = useState(false);
    
    
    // Featured companies
    const [featuredCompanies, setFeaturedCompanies] = useState([]);
    
    // Popular categories
    const [popularCategories, setPopularCategories] = useState([]);

    useEffect(() => {
        // Initialize AOS
        AOS.init({
            duration: 800,
            easing: 'ease-in-out',
            once: true,
            offset: 100,
            delay: 0
        });

        const storedUser = sessionStorage.getItem('user') || localStorage.getItem('user');
        if (storedUser) {
            const parsedUser = JSON.parse(storedUser);
            setUser(parsedUser);
        }
        fetchJobs(1);
        fetchFilterOptions();
    }, []);

    // Refresh AOS when jobs change
    useEffect(() => {
        if (!isLoading && jobs.length > 0) {
            AOS.refresh();
        }
    }, [jobs, isLoading]);

    const fetchFilterOptions = async () => {
        try {
            const res = await getFilterOptions();
            if (res && res.data && res.data.EC === 0) {
                const options = res.data.DT || {};
                
                // Get popular categories (majors)
                if (options.majors && options.majors.length > 0) {
                    const popular = options.majors.slice(0, 6).map(major => ({
                        id: major.id,
                        name: major.TenChuyenNganh,
                        icon: getCategoryIcon(major.TenChuyenNganh),
                        count: 0 // Will be updated when we have job counts
                    }));
                    setPopularCategories(popular);
                }
                
                // Get featured companies
                if (options.companies && options.companies.length > 0) {
                    const featured = options.companies.slice(0, 8).map(company => ({
                        id: company.id,
                        name: company.Tencongty,
                        logo: company.Tencongty?.charAt(0) || 'C',
                        location: company.Diachi || 'N/A'
                    }));
                    setFeaturedCompanies(featured);
                }
            }
        } catch (error) {
            console.error('Error fetching filter options:', error);
        }
    };

    const getCategoryIcon = (categoryName) => {
        const icons = {
            'React': 'fab fa-react',
            'Java': 'fab fa-java',
            'Python': 'fab fa-python',
            'Node': 'fab fa-node-js',
            'Angular': 'fab fa-angular',
            'Vue': 'fab fa-vuejs',
            'PHP': 'fab fa-php',
            'C++': 'fas fa-code',
            'C#': 'fab fa-microsoft',
            'Mobile': 'fas fa-mobile-alt',
            'DevOps': 'fas fa-server',
            'UI/UX': 'fas fa-palette',
            'Full Stack': 'fas fa-layer-group',
            'Backend': 'fas fa-database',
            'Frontend': 'fas fa-desktop'
        };
        
        for (const [key, icon] of Object.entries(icons)) {
            if (categoryName.toLowerCase().includes(key.toLowerCase())) {
                return icon;
            }
        }
        return 'fas fa-code';
    };

    const fetchJobs = async (page) => {
        setIsLoading(true);
        try {
            const filters = {};
            if (searchKeyword) filters.keyword = searchKeyword;
            if (searchLocation) filters.location = searchLocation;
            
            const res = await getListJobPosting(page, 12, filters);
            if (res && res.data && res.data.EC === 0) {
                setJobs(res.data.DT?.jobs || []);
                setTotalPages(res.data.DT?.pagination?.totalPages || 0);
            } else {
                toast.error(res.data?.EM || 'Không thể tải danh sách việc làm!');
            }
        } catch (error) {
            console.error('Error fetching jobs:', error);
            toast.error('Có lỗi xảy ra khi tải việc làm!');
        } finally {
            setIsLoading(false);
        }
    };

    const handleSearch = () => {
        setCurrentPage(0);
        fetchJobs(1);
    };

    const handlePageClick = (event) => {
        setCurrentPage(event.selected);
        fetchJobs(event.selected + 1);
    };

    const formatSalary = (min, max) => {
        if (!min && !max) return 'Thỏa thuận';
        const formatNumber = (num) => {
            if (num >= 1000000) return `${(num / 1000000).toFixed(1)} triệu`;
            return `${(num / 1000).toFixed(0)}k`;
        };
        if (min && max) {
            return `${formatNumber(min)} - ${formatNumber(max)}`;
        }
        return formatNumber(min || max);
    };

    const handleKeyDown = (event) => {
        if (event.key === 'Enter') {
            handleSearch();
        }
    };

    const handleJobClick = (jobId) => {
        navigate(`/candidate/jobs/${jobId}`);
    };

    return (
        <div className="candidate-home">
            <CandidateNav />
            
            <div className="home-container">
                {/* Hero Section với Search */}
                <div className="hero-section">
                    {/* Binary Code Effect */}
                    <div className="binary-code"></div>
                    
                    {/* Floating Tech Icons */}
                    <div className="tech-elements">
                        <div className="tech-icon" data-aos="fade-in" data-aos-delay="300">
                            <i className="fab fa-react"></i>
                        </div>
                        <div className="tech-icon" data-aos="fade-in" data-aos-delay="400">
                            <i className="fab fa-node-js"></i>
                        </div>
                        <div className="tech-icon" data-aos="fade-in" data-aos-delay="500">
                            <i className="fab fa-python"></i>
                        </div>
                        <div className="tech-icon" data-aos="fade-in" data-aos-delay="600">
                            <i className="fab fa-js"></i>
                        </div>
                        <div className="tech-icon" data-aos="fade-in" data-aos-delay="700">
                            <i className="fab fa-java"></i>
                        </div>
                        <div className="tech-icon" data-aos="fade-in" data-aos-delay="800">
                            <i className="fas fa-database"></i>
                        </div>
                        <div className="tech-icon" data-aos="fade-in" data-aos-delay="900">
                            <i className="fab fa-aws"></i>
                        </div>
                        <div className="tech-icon" data-aos="fade-in" data-aos-delay="1000">
                            <i className="fab fa-docker"></i>
                        </div>
                    </div>
                    <div className="hero-content">
                        <h1 className="hero-title" data-aos="fade-down" data-aos-delay="0">
                            Tìm việc làm IT mơ ước của bạn
                        </h1>
                        <p className="hero-subtitle" data-aos="fade-down" data-aos-delay="100">
                            Hơn 1000+ việc làm IT đang chờ đợi bạn • Kết nối với các công ty hàng đầu
                        </p>

                        <div className="search-box" data-aos="fade-up" data-aos-delay="200">
                            <div className="search-input-group">
                                <i className="fas fa-search"></i>
                                <input
                                    type="text"
                                    placeholder="Vị trí tuyển dụng, kỹ năng..."
                                    value={searchKeyword}
                                    onChange={(e) => setSearchKeyword(e.target.value)}
                                    onKeyDown={handleKeyDown}
                                />
                            </div>

                            <div className="search-input-group">
                                <i className="fas fa-map-marker-alt"></i>
                                <input
                                    type="text"
                                    placeholder="Địa điểm"
                                    value={searchLocation}
                                    onChange={(e) => setSearchLocation(e.target.value)}
                                    onKeyDown={handleKeyDown}
                                />
                            </div>

                            <button className="btn-search" onClick={handleSearch}>
                                <i className="fas fa-search"></i>
                                Tìm kiếm
                            </button>
                        </div>
                    </div>
                </div>

                {/* Popular Categories */}
                {popularCategories.length > 0 && (
                    <div className="categories-section">
                        <div className="container">
                            <div className="section-header" data-aos="fade-down">
                                <h2>Ngành nghề phổ biến</h2>
                                <p>Khám phá các cơ hội việc làm theo chuyên ngành</p>
                            </div>
                            <div className="categories-grid">
                                {popularCategories.map((category, index) => (
                                    <div 
                                        key={category.id} 
                                        className="category-card"
                                        data-aos="fade-up"
                                        data-aos-delay={index * 50}
                                        onClick={() => {
                                            setSearchKeyword(category.name);
                                            handleSearch();
                                        }}
                                    >
                                        <div className="category-icon">
                                            <i className={category.icon}></i>
                                        </div>
                                        <h3>{category.name}</h3>
                                        <p>{category.count || 'Nhiều'} việc làm</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* Featured Companies */}
                {featuredCompanies.length > 0 && (
                    <div className="companies-section">
                        <div className="container">
                            <div className="section-header" data-aos="fade-down">
                                <h2>Công ty nổi bật</h2>
                                <p>Những công ty hàng đầu đang tuyển dụng</p>
                            </div>
                            <div className="companies-grid">
                                {featuredCompanies.map((company, index) => (
                                    <div 
                                        key={company.id} 
                                        className="company-card"
                                        data-aos="fade-up"
                                        data-aos-delay={index * 50}
                                        onClick={() => navigate(`/candidate/companies?companyId=${company.id}`)}
                                    >
                                        <div className="company-logo-large">
                                            {company.logo}
                                        </div>
                                        <h3>{company.name}</h3>
                                        <p>
                                            <i className="fas fa-map-marker-alt"></i>
                                            {company.location}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* Job Listing Section */}
                <div className="jobs-section">
                    <div className="container">
                        <div className="section-header" data-aos="fade-down">
                            <h2>Việc làm nổi bật</h2>
                            <p>• Cập nhật mới nhất {jobs.length > 0 && `${jobs.length}+ việc làm`} •</p>
                        </div>

                        {isLoading ? (
                            <div className="loading-container">
                                <i className="fas fa-spinner fa-spin"></i>
                                <p>Đang tải việc làm...</p>
                            </div>
                        ) : (
                            <>
                                <div className="jobs-grid">
                                    {jobs && jobs.length > 0 ? (
                                        jobs.map((job, index) => (
                                            <div 
                                                key={job.id} 
                                                className="job-card"
                                                data-aos="fade-up"
                                                data-aos-delay={index % 6 * 50}
                                                onClick={() => handleJobClick(job.id)}
                                            >
                                                <div className="job-header">
                                                    <div className="company-logo">
                                                        {job.Company?.Tencongty?.charAt(0) || 'C'}
                                                    </div>
                                                    <div className="job-info">
                                                        <h3 className="job-title">{job.Tieude}</h3>
                                                        <p className="company-name">
                                                            {job.Company?.Tencongty || 'Unknown Company'}
                                                        </p>
                                                    </div>
                                                    <button 
                                                        className="btn-save"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            // TODO: Implement save job functionality
                                                        }}
                                                    >
                                                        <i className="far fa-heart"></i>
                                                    </button>
                                                </div>

                                                <div className="job-details-compact">
                                                    <span className="salary-tag">
                                                        {formatSalary(job.Luongtoithieu, job.Luongtoida)}
                                                    </span>
                                                    <span className="location-tag">
                                                        <i className="fas fa-map-marker-alt"></i>
                                                        {job.Diadiem}
                                                    </span>
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="no-jobs">
                                            <i className="fas fa-search"></i>
                                            <p>Không tìm thấy việc làm phù hợp</p>
                                            <button 
                                                className="btn-retry"
                                                onClick={() => {
                                                    setSearchKeyword('');
                                                    setSearchLocation('');
                                                    fetchJobs(1);
                                                }}
                                            >
                                                Xem tất cả việc làm
                                            </button>
                                        </div>
                                    )}
                                </div>

                                {totalPages > 1 && (
                                    <div className="pagination-container">
                                        <ReactPaginate
                                            nextLabel={<i className="fas fa-chevron-right"></i>}
                                            onPageChange={handlePageClick}
                                            pageRangeDisplayed={0}
                                            marginPagesDisplayed={0}
                                            pageCount={totalPages}
                                            previousLabel={<i className="fas fa-chevron-left"></i>}
                                            pageClassName="page-item"
                                            pageLinkClassName="page-link"
                                            previousClassName="page-item prev"
                                            previousLinkClassName="page-link"
                                            nextClassName="page-item next"
                                            nextLinkClassName="page-link"
                                            breakLabel=""
                                            breakClassName="page-item"
                                            breakLinkClassName="page-link"
                                            containerClassName="pagination"
                                            activeClassName="active"
                                            renderOnZeroPageCount={null}
                                            forcePage={currentPage}
                                        />
                                        <div className="page-info">
                                            <span className="current-page">{currentPage + 1}</span>
                                            <span> / {totalPages} trang</span>
                                        </div>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </div>

                {/* Features Section */}
                <div className="features-section">
                    <div className="container">
                        <div className="section-header" data-aos="fade-down">
                            <h2>Công cụ vượt trội!</h2>
                            <p>Những điểm khác biệt làm nên JobPortal</p>
                        </div>
                        
                        <div className="features-layout-circular">
                            {/* Center Image */}
                            <div className="features-center" data-aos="zoom-in" data-aos-delay="250">
                                <div className="feature-image-wrapper">
                                    <img 
                                        src={`${BACKEND_URL}/images/anh-gioi-thieu-tinh-nang.png`}
                                        alt="Công cụ vượt trội" 
                                        className="feature-image"
                                        onError={(e) => {
                                            console.error('Error loading image:', e);
                                            e.target.style.display = 'none';
                                        }}
                                    />
                                </div>
                            </div>

                            {/* Circular Features */}
                            <div className="feature-card" data-aos="fade-up" data-aos-delay="100" style={{ '--angle': '0deg' }}>
                                <div className="feature-icon">
                                    <i className="fas fa-robot"></i>
                                </div>
                                <div className="feature-content">
                                    <h3>Chấm điểm tự động bằng AI</h3>
                                    <p>Hệ thống AI thông minh chấm điểm bài test nhanh chóng và chính xác</p>
                                </div>
                            </div>
                            
                            <div className="feature-card" data-aos="fade-up" data-aos-delay="150" style={{ '--angle': '45deg' }}>
                                <div className="feature-icon">
                                    <i className="fas fa-brain"></i>
                                </div>
                                <div className="feature-content">
                                    <h3>Machine Learning tiên tiến</h3>
                                    <p>Mô hình ML được huấn luyện từ dữ liệu thực tế, cải thiện liên tục</p>
                                </div>
                            </div>
                            
                            <div className="feature-card" data-aos="fade-up" data-aos-delay="200" style={{ '--angle': '90deg' }}>
                                <div className="feature-icon">
                                    <i className="fas fa-user-check"></i>
                                </div>
                                <div className="feature-content">
                                    <h3>Duyệt bởi HR chuyên nghiệp</h3>
                                    <p>Kết hợp AI và đánh giá của HR để đảm bảo công bằng</p>
                                </div>
                            </div>
                            
                            <div className="feature-card" data-aos="fade-up" data-aos-delay="250" style={{ '--angle': '135deg' }}>
                                <div className="feature-icon">
                                    <i className="fas fa-bolt"></i>
                                </div>
                                <div className="feature-content">
                                    <h3>Tốc độ xử lý nhanh</h3>
                                    <p>Nhận kết quả chấm điểm ngay sau khi hoàn thành bài test</p>
                                </div>
                            </div>
                            
                            <div className="feature-card" data-aos="fade-up" data-aos-delay="300" style={{ '--angle': '180deg' }}>
                                <div className="feature-icon">
                                    <i className="fas fa-chart-line"></i>
                                </div>
                                <div className="feature-content">
                                    <h3>Phân tích chi tiết</h3>
                                    <p>Báo cáo đánh giá toàn diện về kỹ năng và năng lực ứng viên</p>
                                </div>
                            </div>
                            
                            <div className="feature-card" data-aos="fade-up" data-aos-delay="350" style={{ '--angle': '225deg' }}>
                                <div className="feature-icon">
                                    <i className="fas fa-shield-alt"></i>
                                </div>
                                <div className="feature-content">
                                    <h3>Bảo mật cao</h3>
                                    <p>Dữ liệu được mã hóa và bảo vệ an toàn theo tiêu chuẩn quốc tế</p>
                                </div>
                            </div>
                            
                            <div className="feature-card" data-aos="fade-up" data-aos-delay="400" style={{ '--angle': '270deg' }}>
                                <div className="feature-icon">
                                    <i className="fas fa-sync-alt"></i>
                                </div>
                                <div className="feature-content">
                                    <h3>Cập nhật liên tục</h3>
                                    <p>Hệ thống tự động học và cải thiện từ phản hồi của HR</p>
                                </div>
                            </div>
                            
                            <div className="feature-card" data-aos="fade-up" data-aos-delay="450" style={{ '--angle': '315deg' }}>
                                <div className="feature-icon">
                                    <i className="fas fa-users"></i>
                                </div>
                                <div className="feature-content">
                                    <h3>Kết nối doanh nghiệp</h3>
                                    <p>Nền tảng kết nối ứng viên với các công ty IT hàng đầu</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Tips & Resources Section */}
                <div className="tips-section">
                    <div className="container">
                        <div className="section-header" data-aos="fade-down">
                            <h2>Mẹo tìm việc thành công</h2>
                            <p>Những lời khuyên hữu ích để bạn có được công việc mơ ước</p>
                        </div>
                        <div className="tips-grid">
                            <div className="tip-card" data-aos="fade-up" data-aos-delay="0">
                                <div className="tip-icon">
                                    <i className="fas fa-file-alt"></i>
                                </div>
                                <h3>CV chuyên nghiệp</h3>
                                <p>Tạo CV rõ ràng, đầy đủ thông tin và highlight các kỹ năng quan trọng</p>
                            </div>
                            <div className="tip-card" data-aos="fade-up" data-aos-delay="100">
                                <div className="tip-icon">
                                    <i className="fas fa-user-check"></i>
                                </div>
                                <h3>Chuẩn bị kỹ lưỡng</h3>
                                <p>Nghiên cứu công ty và vị trí ứng tuyển trước khi nộp đơn</p>
                            </div>
                            <div className="tip-card" data-aos="fade-up" data-aos-delay="200">
                                <div className="tip-icon">
                                    <i className="fas fa-clipboard-check"></i>
                                </div>
                                <h3>Làm tốt bài test</h3>
                                <p>Chuẩn bị kiến thức và kỹ năng để hoàn thành bài test một cách tốt nhất</p>
                            </div>
                            <div className="tip-card" data-aos="fade-up" data-aos-delay="300">
                                <div className="tip-icon">
                                    <i className="fas fa-comments"></i>
                                </div>
                                <h3>Giao tiếp hiệu quả</h3>
                                <p>Thể hiện sự chuyên nghiệp trong mọi tương tác với nhà tuyển dụng</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            
            <Footer />
            <ScrollToTop />
        </div>
    );
};

export default CandidateHome;
