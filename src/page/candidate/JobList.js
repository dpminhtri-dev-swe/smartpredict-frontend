import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import CandidateNav from '../../components/Navigation/CandidateNav';
import Footer from '../../components/Footer/Footer';
import ScrollToTop from '../../components/ScrollToTop/ScrollToTop';
import ReactPaginate from 'react-paginate';
import { toast } from 'react-toastify';
import { getListJobPosting, getFilterOptions } from '../../service.js/jobPostingService';
import { findMatchingJobs } from '../../service.js/cvMatchingService';
import { getCVStatus } from '../../service.js/recordService';
import AOS from 'aos';
import 'aos/dist/aos.css';
import './JobList.scss';

const JobList = () => {
    const [jobs, setJobs] = useState([]);
    const [totalPages, setTotalPages] = useState(0);
    const [totalRows, setTotalRows] = useState(0);
    const [currentPage, setCurrentPage] = useState(1);
    const [isLoading, setIsLoading] = useState(false);
    
    // Filter options from API
    const [filterOptions, setFilterOptions] = useState({
        majors: [],
        formats: [],
        companies: [],
        locations: [],
        experiences: [],
        salaryRanges: []
    });
    const [isLoadingFilters, setIsLoadingFilters] = useState(true);
    
    // Active filters
    const [filters, setFilters] = useState({
        keyword: '',
        location: '',
        experience: '',
        salaryRange: '',
        companyId: '',
        formatId: '',
        majorId: ''
    });
    
    // Selected major tags
    const [selectedMajors, setSelectedMajors] = useState([]);
    
    // Sort option
    const [sortOption, setSortOption] = useState('all');

    // CV Matching
    const [isFindingMatchingJobs, setIsFindingMatchingJobs] = useState(false);
    const [matchingJobs, setMatchingJobs] = useState([]);
    const [isShowingMatchingJobs, setIsShowingMatchingJobs] = useState(false); // Đang hiển thị matching jobs hay normal jobs
    const [cvStatus, setCvStatus] = useState(null); // { status: 'NO_CV' | 'PENDING' | 'PROCESSING' | 'READY' | 'FAILED', hasCV: boolean }
    const [isCheckingCVStatus, setIsCheckingCVStatus] = useState(false);

    const navigate = useNavigate();

    useEffect(() => {
        // Initialize AOS
        AOS.init({
            duration: 800,
            easing: 'ease-in-out',
            once: true,
            offset: 100,
            delay: 0
        });

        fetchFilterOptions();
        fetchJobs(1);
        checkCVStatus();
    }, []);

    // Polling CV status nếu đang PROCESSING
    useEffect(() => {
        if (cvStatus?.status === 'PROCESSING') {
            const interval = setInterval(() => {
                checkCVStatus();
            }, 3000); // Poll mỗi 3 giây

            return () => clearInterval(interval);
        }
    }, [cvStatus?.status]);

    // Refresh AOS when jobs change
    useEffect(() => {
        if (!isLoading && jobs.length > 0) {
            AOS.refresh();
        }
    }, [jobs, isLoading]);

    const fetchFilterOptions = async () => {
        setIsLoadingFilters(true);
        try {
            const res = await getFilterOptions();
            if (res && res.data && res.data.EC === 0) {
                setFilterOptions(res.data.DT);
            }
        } catch (error) {
            console.log('Error fetching filter options:', error);
        } finally {
            setIsLoadingFilters(false);
        }
    };

    const fetchJobs = useCallback(async (page, currentFilters = filters, currentSortOption = sortOption) => {
        setIsLoading(true);
        try {
            // Build filter object
            const apiFilters = {
                keyword: currentFilters.keyword,
                location: currentFilters.location,
                experience: currentFilters.experience,
                companyId: currentFilters.companyId,
                formatId: currentFilters.formatId,
                majorId: currentFilters.majorId
            };

            // Handle salary range
            if (currentFilters.salaryRange) {
                const range = filterOptions.salaryRanges.find(r => r.value === currentFilters.salaryRange);
                if (range) {
                    apiFilters.minSalary = range.min;
                    if (range.max) apiFilters.maxSalary = range.max;
                }
            }

            let res = await getListJobPosting(page, 12, apiFilters);
            
            if (res && res.data && res.data.EC === 0) {
                let jobList = res.data.DT.jobs;
                const now = new Date();
                const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                const minSalary = 10000000; // 10 triệu
                
                // Filter and sort jobs based on sort option
                if (currentSortOption === 'all') {
                    // Tất cả: không filter, chỉ sort theo mới nhất
                    jobList.sort((a, b) => new Date(b.Ngaydang) - new Date(a.Ngaydang));
                } else if (currentSortOption === 'newest') {
                    // Tin mới nhất: chỉ hiển thị tin cập nhật trong vòng dưới 1 tuần trước
                    jobList = jobList.filter(job => {
                        if (!job.Ngaydang) return false;
                        const jobDate = new Date(job.Ngaydang);
                        return jobDate >= oneWeekAgo;
                    });
                    // Sort theo mới nhất
                    jobList.sort((a, b) => new Date(b.Ngaydang) - new Date(a.Ngaydang));
                } else if (currentSortOption === 'urgent') {
                    // Cần tuyển gấp: chỉ hiển thị jobs còn dưới 1 tuần để ứng tuyển
                    jobList = jobList.filter(job => {
                        if (!job.Ngayhethan) return false;
                        const deadline = new Date(job.Ngayhethan);
                        const daysRemaining = Math.ceil((deadline - now) / (1000 * 60 * 60 * 24));
                        return daysRemaining > 0 && daysRemaining <= 7;
                    });
                    // Sort theo deadline gần nhất
                    jobList.sort((a, b) => {
                        const aDeadline = new Date(a.Ngayhethan);
                        const bDeadline = new Date(b.Ngayhethan);
                        return aDeadline - bDeadline;
                    });
                } else if (currentSortOption === 'salary') {
                    // Lương cao nhất: chỉ hiển thị jobs có lương > 10 triệu
                    jobList = jobList.filter(job => {
                        const maxSalary = job.Luongtoida || 0;
                        const minSalaryJob = job.Luongtoithieu || 0;
                        // Lấy mức lương cao hơn (nếu có cả min và max thì lấy max, nếu chỉ có min thì lấy min)
                        const salary = maxSalary > 0 ? maxSalary : minSalaryJob;
                        return salary >= minSalary;
                    });
                    // Sort theo lương cao nhất
                    jobList.sort((a, b) => {
                        const aMaxSalary = a.Luongtoida || a.Luongtoithieu || 0;
                        const bMaxSalary = b.Luongtoida || b.Luongtoithieu || 0;
                        return bMaxSalary - aMaxSalary;
                    });
                }
                
                // Update total rows and pages
                // Nếu là "Tất cả", dùng giá trị từ server
                // Nếu là filter option khác, tính lại dựa trên filtered results
                if (currentSortOption === 'all') {
                    setJobs(jobList);
                    setTotalPages(res.data.DT.totalPages);
                    setTotalRows(res.data.DT.totalRows);
                } else {
                    const filteredTotalRows = jobList.length;
                    const filteredTotalPages = Math.ceil(filteredTotalRows / 12);
                    setJobs(jobList);
                    setTotalPages(filteredTotalPages);
                    setTotalRows(filteredTotalRows);
                }
                setCurrentPage(page);
            } else {
                toast.error(res.data.EM);
            }
        } catch (error) {
            console.log(error);
            toast.error('Có lỗi khi tải danh sách việc làm!');
        } finally {
            setIsLoading(false);
        }
    }, [filters, filterOptions.salaryRanges, sortOption]);

    const handleSearch = () => {
        fetchJobs(1, filters);
    };

    const handleFilterChange = (field, value) => {
        const newFilters = { ...filters, [field]: value };
        setFilters(newFilters);
        fetchJobs(1, newFilters);
    };

    const handleMajorClick = (majorId) => {
        if (selectedMajors.includes(majorId)) {
            setSelectedMajors(selectedMajors.filter(id => id !== majorId));
            handleFilterChange('majorId', '');
        } else {
            setSelectedMajors([majorId]);
            handleFilterChange('majorId', majorId);
        }
    };

    const handlePageClick = (event) => {
        fetchJobs(event.selected + 1);
        window.scrollTo(0, 0);
    };

    const handleClearFilters = () => {
        setFilters({
            keyword: '',
            location: '',
            experience: '',
            salaryRange: '',
            companyId: '',
            formatId: '',
            majorId: ''
        });
        setSelectedMajors([]);
        setIsShowingMatchingJobs(false); // Reset về normal jobs
        fetchJobs(1, {});
    };

    // Quay lại danh sách jobs bình thường
    const handleBackToNormalJobs = () => {
        setIsShowingMatchingJobs(false);
        fetchJobs(1, filters);
    };

    const formatSalary = (min, max) => {
        if (!min && !max) return 'Thỏa thuận';
        const formatNumber = (num) => {
            if (num >= 1000000) return `${num / 1000000} triệu`;
            return `${num / 1000}k`;
        };
        if (min && max) {
            return `${formatNumber(min)} - ${formatNumber(max)}`;
        }
        return min ? `Từ ${formatNumber(min)}` : `Đến ${formatNumber(max)}`;
    };

    const formatDate = (dateString) => {
        if (!dateString) return '';
        const date = new Date(dateString);
        const now = new Date();
        const diffTime = Math.abs(now - date);
        const diffMinutes = Math.floor(diffTime / (1000 * 60));
        const diffHours = Math.floor(diffTime / (1000 * 60 * 60));
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        
        if (diffMinutes < 60) return `${diffMinutes} phút trước`;
        if (diffHours < 24) return `${diffHours} giờ trước`;
        if (diffDays === 0) return 'Hôm nay';
        if (diffDays === 1) return 'Hôm qua';
        if (diffDays < 7) return `${diffDays} ngày trước`;
        if (diffDays < 30) return `${Math.floor(diffDays / 7)} tuần trước`;
        return date.toLocaleDateString('vi-VN');
    };

    const getDaysRemaining = (deadline) => {
        if (!deadline) return null;
        const now = new Date();
        const endDate = new Date(deadline);
        const diffTime = endDate - now;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays > 0 ? diffDays : 0;
    };

    const handleKeyDown = (event) => {
        if (event.key === 'Enter') {
            handleSearch();
        }
    };

    const hasActiveFilters = filters.keyword || filters.location || filters.experience || 
                            filters.salaryRange || filters.companyId || filters.formatId || 
                            filters.majorId;

    // Check CV extraction status
    const checkCVStatus = async () => {
        setIsCheckingCVStatus(true);
        try {
            const res = await getCVStatus();
            if (res && res.data && res.data.EC === 0) {
                setCvStatus(res.data.DT);
            } else {
                setCvStatus({ status: 'NO_CV', hasCV: false });
            }
        } catch (error) {
            console.error('Error checking CV status:', error);
            setCvStatus({ status: 'NO_CV', hasCV: false });
        } finally {
            setIsCheckingCVStatus(false);
        }
    };

    // Handle find matching jobs
    const handleFindMatchingJobs = async () => {
        // Check CV status trước
        if (!cvStatus || !cvStatus.hasCV) {
            toast.warning('Vui lòng upload CV trước khi tìm việc phù hợp.');
            return;
        }

        if (cvStatus.status === 'PROCESSING' || cvStatus.status === 'PENDING') {
            toast.info('CV đang được xử lý. Vui lòng đợi một chút...');
            return;
        }

        if (cvStatus.status === 'FAILED') {
            toast.error('CV xử lý thất bại. Vui lòng upload lại CV.');
            return;
        }

        if (cvStatus.status !== 'READY') {
            toast.warning('CV chưa sẵn sàng. Vui lòng upload CV trước.');
            return;
        }

        setIsFindingMatchingJobs(true);
        try {
            // Convert filters to API format
            const apiFilters = {
                location: filters.location || undefined,
                experience: filters.experience || undefined,
                majorId: filters.majorId ? parseInt(filters.majorId) : undefined
            };

            // Handle salary range
            if (filters.salaryRange) {
                const range = filterOptions.salaryRanges.find(r => r.value === filters.salaryRange);
                if (range) {
                    apiFilters.minSalary = range.min;
                    apiFilters.maxSalary = range.max;
                }
            }

            const res = await findMatchingJobs(apiFilters);
            
            if (res && res.EC === 0) {
                const matches = res.DT || [];
                setMatchingJobs(matches);
                
                // Convert matching jobs thành format jobs để hiển thị trong danh sách chính
                const matchingJobsFormatted = matches.map(match => ({
                    ...match.jobPosting,
                    matchScore: match.matchScore,
                    scoreRatio: match.scoreRatio,
                    matchReasons: match.reasons || [],
                    isMatching: true // Flag để biết đây là matching job
                }));
                
                setJobs(matchingJobsFormatted);
                setTotalPages(1); // Matching jobs không phân trang
                setTotalRows(matchingJobsFormatted.length);
                setIsShowingMatchingJobs(true);
                toast.success(`Tìm thấy ${matches.length} công việc phù hợp với CV của bạn!`);
            } else {
                toast.error(res?.EM || 'Không tìm thấy công việc phù hợp.');
            }
        } catch (error) {
            console.error('Error finding matching jobs:', error);
            toast.error('Lỗi khi tìm công việc phù hợp. Vui lòng thử lại.');
        } finally {
            setIsFindingMatchingJobs(false);
        }
    };

    return (
        <div className="job-list-page">
            <CandidateNav />
            
            <div className="job-list-container">
                {/* Hero Section */}
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
                    </div>

                    <div className="container">
                        <h1 className="page-title" data-aos="fade-down" data-aos-delay="0">Việc làm IT</h1>
                        <p className="page-subtitle" data-aos="fade-down" data-aos-delay="100">Việc làm IT xịn dành cho Developer chất</p>
                        
                        {/* Quick category tags */}
                        <div className="quick-tags" data-aos="fade-up" data-aos-delay="200">
                            <span className="quick-tag"><i className="fas fa-check-circle"></i> Backend</span>
                            <span className="quick-tag"><i className="fas fa-check-circle"></i> Frontend</span>
                            <span className="quick-tag"><i className="fas fa-check-circle"></i> Tester</span>
                            <span className="quick-tag"><i className="fas fa-check-circle"></i> Business Analyst</span>
                        </div>
                    </div>
                </div>

                {/* Search & Filter Section */}
                <div className="filter-section">
                    <div className="container">
                        {/* Main Search Row */}
                        <div className="search-row">
                            <div className="search-input-group">
                                <i className="fas fa-search"></i>
                                <input
                                    type="text"
                                    placeholder="Tên công việc, vị trí bạn muốn ứng tuyển..."
                                    value={filters.keyword}
                                    onChange={(e) => setFilters({...filters, keyword: e.target.value})}
                                    onKeyDown={handleKeyDown}
                                />
                            </div>
                            
                            <div className="search-actions">
                                <div className="find-matching-wrapper">
                                    <button 
                                        className="btn-find-matching"
                                        onClick={handleFindMatchingJobs}
                                        disabled={isFindingMatchingJobs || cvStatus?.status === 'PROCESSING' || cvStatus?.status === 'PENDING' || !cvStatus?.hasCV}
                                        title={
                                            !cvStatus?.hasCV 
                                                ? "Vui lòng upload CV trước" 
                                                : cvStatus?.status === 'PROCESSING' || cvStatus?.status === 'PENDING'
                                                ? "CV đang được xử lý..."
                                                : "Tìm công việc phù hợp với CV của bạn"
                                        }
                                    >
                                        {isFindingMatchingJobs ? (
                                            <>
                                                <i className="fas fa-spinner fa-spin"></i>
                                                Đang tìm...
                                            </>
                                        ) : cvStatus?.status === 'PROCESSING' || cvStatus?.status === 'PENDING' ? (
                                            <>
                                                <i className="fas fa-hourglass-half fa-spin"></i>
                                                CV đang xử lý...
                                            </>
                                        ) : (
                                            <>
                                                <i className="fas fa-magic"></i>
                                                Tìm việc phù hợp
                                            </>
                                        )}
                                    </button>
                                    {cvStatus?.status === 'PROCESSING' && (
                                        <div className="cv-status-indicator">
                                            <i className="fas fa-info-circle"></i>
                                            <span>CV đang được xử lý, vui lòng đợi...</span>
                                        </div>
                                    )}
                                    {cvStatus?.status === 'FAILED' && (
                                        <div className="cv-status-indicator error">
                                            <i className="fas fa-exclamation-triangle"></i>
                                            <span>CV xử lý thất bại. Vui lòng upload lại.</span>
                                        </div>
                                    )}
                                </div>

                                <button className="btn-search" onClick={handleSearch}>
                                    <i className="fas fa-search"></i>
                                    Tìm kiếm
                                </button>
                            </div>
                        </div>

                        {/* Filter Dropdowns Row */}
                        <div className="filter-row">
                            <div className="filter-group">
                                <label className="filter-label">
                                    <i className="fas fa-map-marker-alt"></i>
                                    Địa điểm
                                </label>
                                <select 
                                    className="filter-select"
                                    value={filters.location}
                                    onChange={(e) => handleFilterChange('location', e.target.value)}
                                >
                                    <option value="">Tất cả tỉnh/thành phố</option>
                                    {filterOptions.locations.map((loc, index) => (
                                        <option key={index} value={loc}>{loc}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="filter-group">
                                <label className="filter-label">
                                    <i className="fas fa-user-tie"></i>
                                    Cấp bậc
                                </label>
                                <select 
                                    className="filter-select"
                                    value={filters.experience}
                                    onChange={(e) => handleFilterChange('experience', e.target.value)}
                                >
                                    <option value="">Tất cả cấp bậc</option>
                                    {filterOptions.experiences.map((exp, index) => (
                                        <option key={index} value={exp.value}>{exp.label}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="filter-group">
                                <label className="filter-label">
                                    <i className="fas fa-dollar-sign"></i>
                                    Mức lương
                                </label>
                                <select 
                                    className="filter-select"
                                    value={filters.salaryRange}
                                    onChange={(e) => handleFilterChange('salaryRange', e.target.value)}
                                >
                                    <option value="">Tất cả mức lương</option>
                                    {filterOptions.salaryRanges.map((range, index) => (
                                        <option key={index} value={range.value}>{range.label}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="filter-group">
                                <label className="filter-label">
                                    <i className="fas fa-briefcase"></i>
                                    Hình thức
                                </label>
                                <select 
                                    className="filter-select"
                                    value={filters.formatId}
                                    onChange={(e) => handleFilterChange('formatId', e.target.value)}
                                >
                                    <option value="">Tất cả hình thức</option>
                                    {filterOptions.formats.map((format) => (
                                        <option key={format.id} value={format.id}>{format.TenHinhThuc}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* Major Tags */}
                        <div className="major-tags">
                            {!isLoadingFilters && filterOptions.majors.slice(0, 6).map((major, index) => (
                                <button 
                                    key={major.id}
                                    className={`major-tag ${selectedMajors.includes(major.id) ? 'active' : ''}`}
                                    data-aos="fade-down"
                                    data-aos-delay={index * 50}
                                    onClick={() => handleMajorClick(major.id)}
                                >
                                    {major.TenNghanhNghe}
                                    <span className="count">{major.jobCount || 0}</span>
                                </button>
                            ))}
                            {filterOptions.majors.length > 6 && (
                                <button className="major-tag more">
                                    Khác
                                    <span className="count">{filterOptions.majors.slice(6).reduce((sum, m) => sum + (m.jobCount || 0), 0)}</span>
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                {/* Sort Options */}
                <div className="sort-section">
                    <div className="container">
                        <div className="sort-options">
                            <span className="sort-label">Ưu tiên hiển thị:</span>
                            <label className={`sort-option ${sortOption === 'all' ? 'active' : ''}`}>
                                <input 
                                    type="radio" 
                                    name="sort" 
                                    checked={sortOption === 'all'}
                                    onChange={() => {
                                        setSortOption('all');
                                        fetchJobs(1, filters, 'all');
                                    }}
                                />
                                <i className="far fa-circle"></i>
                                <i className="fas fa-check-circle"></i>
                                Tất cả
                            </label>
                            <label className={`sort-option ${sortOption === 'newest' ? 'active' : ''}`}>
                                <input 
                                    type="radio" 
                                    name="sort" 
                                    checked={sortOption === 'newest'}
                                    onChange={() => {
                                        setSortOption('newest');
                                        fetchJobs(1, filters, 'newest');
                                    }}
                                />
                                <i className="far fa-circle"></i>
                                <i className="fas fa-check-circle"></i>
                                Tin mới nhất
                            </label>
                            <label className={`sort-option ${sortOption === 'urgent' ? 'active' : ''}`}>
                                <input 
                                    type="radio" 
                                    name="sort" 
                                    checked={sortOption === 'urgent'}
                                    onChange={() => {
                                        setSortOption('urgent');
                                        fetchJobs(1, filters, 'urgent');
                                    }}
                                />
                                <i className="far fa-circle"></i>
                                <i className="fas fa-check-circle"></i>
                                Cần tuyển gấp
                            </label>
                            <label className={`sort-option ${sortOption === 'salary' ? 'active' : ''}`}>
                                <input 
                                    type="radio" 
                                    name="sort" 
                                    checked={sortOption === 'salary'}
                                    onChange={() => {
                                        setSortOption('salary');
                                        fetchJobs(1, filters, 'salary');
                                    }}
                                />
                                <i className="far fa-circle"></i>
                                <i className="fas fa-check-circle"></i>
                                Lương cao nhất
                            </label>
                        </div>
                    </div>
                </div>

                {/* Main Content */}
                <div className="main-content">
                    <div className="container">
                        <div className="content-wrapper">
                            {/* Jobs List */}
                            <div className="jobs-column">
                                {/* Results count */}
                                <div className="results-info">
                                    {isShowingMatchingJobs ? (
                                        <>
                                            <p>
                                                <i className="fas fa-star" style={{ color: '#008060', marginRight: '8px' }}></i>
                                                Tìm thấy <strong>{totalRows}</strong> công việc phù hợp với CV của bạn.
                                            </p>
                                            <button className="btn-clear-filters" onClick={handleBackToNormalJobs}>
                                                <i className="fas fa-arrow-left"></i>
                                                Xem tất cả việc làm
                                            </button>
                                        </>
                                    ) : (
                                        <>
                                            <p>
                                                Tìm thấy <strong>{totalRows}</strong> việc làm phù hợp với yêu cầu của bạn.
                                            </p>
                                            {hasActiveFilters && (
                                                <button className="btn-clear-filters" onClick={handleClearFilters}>
                                                    <i className="fas fa-times"></i>
                                                    Xóa bộ lọc
                                                </button>
                                            )}
                                        </>
                                    )}
                                </div>

                                {isLoading ? (
                                    <div className="loading-container">
                                        <i className="fas fa-spinner fa-spin"></i>
                                        <p>Đang tải việc làm...</p>
                                    </div>
                                ) : jobs && jobs.length > 0 ? (
                                    <div className="jobs-list">
                                        {jobs.map((job, index) => {
                                            const daysRemaining = getDaysRemaining(job.Ngayhethan);
                                            const isMatchingJob = job.isMatching || false;
                                            return (
                                                <div 
                                                    key={job.id} 
                                                    className={`job-card ${isMatchingJob ? 'matching-job' : ''}`}
                                                    data-aos="fade-down"
                                                    data-aos-delay={index % 6 * 50}
                                                    onClick={() => navigate(`/candidate/jobs/${job.id}`)}
                                                >
                                                    {/* Match score badge (nếu là matching job) */}
                                                    {isMatchingJob && job.matchScore !== undefined && (
                                                        <div className="match-score-badge">
                                                            <i className="fas fa-check-circle"></i>
                                                            {job.matchScore}% phù hợp
                                                        </div>
                                                    )}
                                                    
                                                    {/* Hot badge */}
                                                    {job.isHot && (
                                                        <span className="hot-badge">HOT</span>
                                                    )}
                                                    
                                                    {/* Match reasons (nếu có) */}
                                                    {isMatchingJob && job.matchReasons && job.matchReasons.length > 0 && (
                                                        <div className="match-reasons">
                                                            {job.matchReasons.slice(0, 3).map((reason, idx) => (
                                                                <span key={idx} className="reason-tag">
                                                                    {reason}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    )}
                                                    
                                                    <div className="job-card-content">
                                                        <div className="company-logo">
                                                            {job.Company?.Tencongty?.charAt(0) || 'C'}
                                                        </div>
                                                        
                                                        <div className="job-info">
                                                            <h3 className="job-title">
                                                                {job.Tieude}
                                                                {job.isVerified && (
                                                                    <i className="fas fa-check-circle verified"></i>
                                                                )}
                                                            </h3>
                                                            <p className="company-name">{job.Company?.Tencongty}</p>
                                                            <p className="update-time">Cập nhật {formatDate(job.Ngaydang)}</p>
                                                            
                                                            <div className="job-tags">
                                                                {job.majors && job.majors.slice(0, 3).map((major, index) => (
                                                                    <span key={index} className="tag">{major.TenNghanhNghe}</span>
                                                                ))}
                                                                {job.majors && job.majors.length > 3 && (
                                                                    <span className="tag more">{job.majors.length - 3}+</span>
                                                                )}
                                                            </div>
                                                            
                                                            <div className="job-meta">
                                                                <span className="location">
                                                                    <i className="fas fa-map-marker-alt"></i>
                                                                    {job.Diadiem}
                                                                </span>
                                                                {job.interviewRoundsCount > 0 && (
                                                                    <span className="interview-rounds">
                                                                        <i className="fas fa-users"></i>
                                                                        {job.interviewRoundsCount} vòng phỏng vấn
                                                                    </span>
                                                                )}
                                                                {daysRemaining !== null && (
                                                                    <span className="deadline">
                                                                        <i className="far fa-clock"></i>
                                                                        Còn {daysRemaining} ngày để ứng tuyển
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                        
                                                        <div className="job-actions">
                                                            <div className="salary">
                                                                <i className="fas fa-dollar-sign"></i>
                                                                {formatSalary(job.Luongtoithieu, job.Luongtoida)}
                                                            </div>
                                                            <button className="btn-apply">Ứng tuyển</button>
                                                            <button className="btn-save">
                                                                <i className="far fa-heart"></i>
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    <div className="no-jobs">
                                        <i className="fas fa-search"></i>
                                        <p>Không tìm thấy việc làm phù hợp</p>
                                        <button className="btn-clear" onClick={handleClearFilters}>
                                            Xóa bộ lọc
                                        </button>
                                    </div>
                                )}

                                {!isShowingMatchingJobs && totalPages > 1 && (
                                    <div className="pagination-container">
                                        <ReactPaginate
                                            nextLabel="Tiếp >"
                                            onPageChange={handlePageClick}
                                            pageRangeDisplayed={3}
                                            marginPagesDisplayed={2}
                                            pageCount={totalPages}
                                            previousLabel="< Trước"
                                            pageClassName="page-item"
                                            pageLinkClassName="page-link"
                                            previousClassName="page-item"
                                            previousLinkClassName="page-link"
                                            nextClassName="page-item"
                                            nextLinkClassName="page-link"
                                            breakLabel="..."
                                            breakClassName="page-item"
                                            breakLinkClassName="page-link"
                                            containerClassName="pagination"
                                            activeClassName="active"
                                            renderOnZeroPageCount={null}
                                            forcePage={currentPage - 1}
                                        />
                                    </div>
                                )}
                            </div>

                            {/* Sidebar - Top Companies */}
                            <div className="sidebar-column">
                                <div className="sidebar-card sticky-top-companies">
                                    <h3 className="sidebar-title">Top công ty nổi bật</h3>
                                    <div className="company-list">
                                        {filterOptions.companies.slice(0, 5).map((company) => (
                                            <div 
                                                key={company.id} 
                                                className="company-item"
                                                onClick={() => handleFilterChange('companyId', company.id)}
                                            >
                                                <div className="company-logo-small">
                                                    {company.Tencongty?.charAt(0) || 'C'}
                                                </div>
                                                <div className="company-info">
                                                    <h4>{company.Tencongty}</h4>
                                                    <p>{company.jobCount} việc làm</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
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

export default JobList;
