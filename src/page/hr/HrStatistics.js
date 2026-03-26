import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
    ArcElement,
    Title,
    Tooltip,
    Legend,
    Filler
} from 'chart.js';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import { getDashboardStatistics } from '../../service.js/statisticsHrService';
import './HrStatistics.scss';

// Register ChartJS components
ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
    ArcElement,
    Title,
    Tooltip,
    Legend,
    Filler
);

const HrStatistics = () => {
    const [user, setUser] = useState(null);
    const [statistics, setStatistics] = useState(null);
    const [loading, setLoading] = useState(true);
    const [timeFilter, setTimeFilter] = useState('6months'); // 7days, 30days, 3months, 6months, 12months

    useEffect(() => {
        let isMounted = true;
        const userStr = sessionStorage.getItem('user') || localStorage.getItem('user');
        if (userStr) {
            const parsedUser = JSON.parse(userStr);
            if (isMounted) {
                setUser(parsedUser);
                fetchStatistics(parsedUser.id, isMounted);
            }
        }
        return () => {
            isMounted = false;
        };
    }, []);

    useEffect(() => {
        let isMounted = true;
        if (user) {
            fetchStatistics(user.id, isMounted);
        }
        return () => {
            isMounted = false;
        };
    }, [timeFilter]);

    const fetchStatistics = async (userId, isMounted = true) => {
        try {
            if (isMounted) {
                setLoading(true);
            }
            const res = await getDashboardStatistics(userId, timeFilter);
            if (isMounted) {
                if (res && res.EC === 0) {
                    setStatistics(res.DT);
                } else {
                    toast.error(res?.EM || 'Không thể tải dữ liệu thống kê!');
                }
            }
        } catch (error) {
            if (isMounted) {
                console.error('Error fetching statistics:', error);
                toast.error('Không thể tải dữ liệu thống kê!');
            }
        } finally {
            if (isMounted) {
                setLoading(false);
            }
        }
    };

    const handleTimeFilterChange = (filter) => {
        setTimeFilter(filter);
    };

    // Prepare chart data
    const getPeriodLabels = () => {
        if (!statistics?.charts?.applicationsByPeriod) return [];
        
        const usesDays = statistics.charts.usesDays;
        
        return statistics.charts.applicationsByPeriod.map(item => {
            if (usesDays) {
                // Format: DD/MM
                const [year, month, day] = item.period.split('-');
                return `${day}/${month}`;
            } else {
                // Format: Tháng MM/YYYY
                const [year, month] = item.period.split('-');
                return `Tháng ${month}/${year}`;
            }
        });
    };

    const applicationsByMonthData = {
        labels: getPeriodLabels(),
        datasets: [
            {
                label: 'Số lượng ứng tuyển',
                data: statistics?.charts?.applicationsByPeriod?.map(item => item.count) || [],
                borderColor: 'rgb(0, 128, 96)',
                backgroundColor: 'rgba(0, 128, 96, 0.1)',
                fill: true,
                tension: 0.4,
                pointRadius: 5,
                pointHoverRadius: 7,
                pointBackgroundColor: 'rgb(0, 128, 96)',
                pointBorderColor: '#fff',
                pointBorderWidth: 2
            }
        ]
    };

    const getTimeFilterLabel = () => {
        switch (timeFilter) {
            case '7days': return '7 ngày gần đây';
            case '30days': return '30 ngày gần đây';
            case '3months': return '3 tháng gần đây';
            case '6months': return '6 tháng gần đây';
            case '12months': return '12 tháng gần đây';
            default: return '6 tháng gần đây';
        }
    };

    const statusDistributionData = {
        labels: statistics?.charts?.statusDistribution?.map(item => item.status) || [],
        datasets: [
            {
                data: statistics?.charts?.statusDistribution?.map(item => item.count) || [],
                backgroundColor: [
                    'rgba(255, 193, 7, 0.8)',   // Đang chờ - yellow
                    'rgba(40, 167, 69, 0.8)',   // Đã xét duyệt - green
                    'rgba(220, 53, 69, 0.8)',   // Không đạt - red
                    'rgba(0, 123, 255, 0.8)'    // Đã phỏng vấn - blue
                ],
                borderColor: [
                    'rgb(255, 193, 7)',
                    'rgb(40, 167, 69)',
                    'rgb(220, 53, 69)',
                    'rgb(0, 123, 255)'
                ],
                borderWidth: 2
            }
        ]
    };

    const topJobPostingsData = {
        labels: statistics?.charts?.topJobPostings?.map(item => 
            item.Tieude.length > 30 ? item.Tieude.substring(0, 30) + '...' : item.Tieude
        ) || [],
        datasets: [
            {
                label: 'Số lượng ứng tuyển',
                data: statistics?.charts?.topJobPostings?.map(item => item.applicationCount) || [],
                backgroundColor: 'rgba(43, 171, 96, 0.8)',
                borderColor: 'rgb(43, 171, 96)',
                borderWidth: 2,
                borderRadius: 8
            }
        ]
    };

    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                display: true,
                position: 'top',
                labels: {
                    font: {
                        size: 12,
                        family: "'Inter', sans-serif"
                    },
                    padding: 15,
                    usePointStyle: true
                }
            },
            tooltip: {
                backgroundColor: 'rgba(0, 0, 0, 0.8)',
                padding: 12,
                titleFont: {
                    size: 14,
                    weight: 'bold'
                },
                bodyFont: {
                    size: 13
                },
                borderColor: 'rgba(255, 255, 255, 0.2)',
                borderWidth: 1,
                displayColors: true,
                callbacks: {
                    label: function(context) {
                        let label = context.dataset.label || '';
                        if (label) {
                            label += ': ';
                        }
                        label += context.parsed.y || context.parsed;
                        return label;
                    }
                }
            }
        },
        scales: {
            y: {
                beginAtZero: true,
                ticks: {
                    precision: 0,
                    font: {
                        size: 11
                    }
                },
                grid: {
                    color: 'rgba(0, 0, 0, 0.05)'
                }
            },
            x: {
                ticks: {
                    font: {
                        size: 11
                    }
                },
                grid: {
                    display: false
                }
            }
        }
    };

    const doughnutOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                position: 'right',
                labels: {
                    font: {
                        size: 12,
                        family: "'Inter', sans-serif"
                    },
                    padding: 15,
                    usePointStyle: true,
                    generateLabels: (chart) => {
                        const data = chart.data;
                        if (data.labels.length && data.datasets.length) {
                            return data.labels.map((label, i) => {
                                const value = data.datasets[0].data[i];
                                return {
                                    text: `${label}: ${value}`,
                                    fillStyle: data.datasets[0].backgroundColor[i],
                                    hidden: false,
                                    index: i
                                };
                            });
                        }
                        return [];
                    }
                }
            },
            tooltip: {
                backgroundColor: 'rgba(0, 0, 0, 0.8)',
                padding: 12,
                callbacks: {
                    label: function(context) {
                        const label = context.label || '';
                        const value = context.parsed || 0;
                        const total = context.dataset.data.reduce((a, b) => a + b, 0);
                        const percentage = ((value / total) * 100).toFixed(1);
                        return `${label}: ${value} (${percentage}%)`;
                    }
                }
            }
        }
    };

    if (loading) {
        return (
            <div className="hr-statistics-loading">
                <div className="spinner"></div>
                <p>Đang tải dữ liệu thống kê...</p>
            </div>
        );
    }

    if (!statistics) {
        return (
            <div className="hr-statistics-error">
                <i className="fas fa-exclamation-circle"></i>
                <h3>Không thể tải dữ liệu thống kê</h3>
                <p>Vui lòng thử lại sau.</p>
            </div>
        );
    }

    return (
        <div className="hr-statistics-container">
            {/* Header */}
            <div className="stats-header">
                <div className="header-content">
                    <h1>
                        <i className="fas fa-chart-line"></i>
                        Dashboard Thống Kê
                    </h1>
                    <p>Tổng quan về hoạt động tuyển dụng của bạn</p>
                </div>
                <div className="header-actions">
                    <div className="time-filter-group">
                        <label>
                            <i className="fas fa-calendar-alt"></i>
                            Khoảng thời gian:
                        </label>
                        <select 
                            value={timeFilter} 
                            onChange={(e) => handleTimeFilterChange(e.target.value)}
                            className="time-filter-select"
                        >
                            <option value="7days">7 ngày gần đây</option>
                            <option value="30days">30 ngày gần đây</option>
                            <option value="3months">3 tháng gần đây</option>
                            <option value="6months">6 tháng gần đây</option>
                            <option value="12months">12 tháng gần đây</option>
                        </select>
                    </div>
                    <button className="btn-refresh" onClick={() => fetchStatistics(user.id)}>
                        <i className="fas fa-sync-alt"></i>
                        Làm mới
                    </button>
                </div>
            </div>

            {/* Key Metrics Cards */}
            <div className="metrics-grid">
                <div className="metric-card primary">
                    <div className="metric-icon">
                        <i className="fas fa-briefcase"></i>
                    </div>
                    <div className="metric-content">
                        <h3>{statistics.jobPostings.total}</h3>
                        <p>Tổng tin tuyển dụng</p>
                        <div className="metric-detail">
                            <span className="active">{statistics.jobPostings.active} đang tuyển</span>
                            <span className="inactive">{statistics.jobPostings.inactive} đã đóng</span>
                        </div>
                    </div>
                </div>

                <div className="metric-card success">
                    <div className="metric-icon">
                        <i className="fas fa-users"></i>
                    </div>
                    <div className="metric-content">
                        <h3>{statistics.applications.total}</h3>
                        <p>Tổng ứng viên</p>
                        <div className="metric-detail">
                            <span className="recent">
                                <i className="fas fa-arrow-up"></i>
                                {statistics.applications.recent} trong 7 ngày
                            </span>
                        </div>
                    </div>
                </div>

                <div className="metric-card warning">
                    <div className="metric-icon">
                        <i className="fas fa-clock"></i>
                    </div>
                    <div className="metric-content">
                        <h3>{statistics.applications.pending}</h3>
                        <p>Đang chờ xét duyệt</p>
                        <div className="metric-detail">
                            <span>Cần xử lý sớm</span>
                        </div>
                    </div>
                </div>

                <div className="metric-card info">
                    <div className="metric-icon">
                        <i className="fas fa-percentage"></i>
                    </div>
                    <div className="metric-content">
                        <h3>{statistics.metrics.conversionRate}%</h3>
                        <p>Tỷ lệ chuyển đổi</p>
                        <div className="metric-detail">
                            <span>{statistics.metrics.avgApplicationsPerJob} ứng viên/tin</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Charts Section */}
            <div className="charts-grid">
                {/* Applications Trend */}
                <div className="chart-card full-width">
                    <div className="chart-header">
                        <h2>
                            <i className="fas fa-chart-area"></i>
                            Xu hướng ứng tuyển
                        </h2>
                        <span className="chart-subtitle">{getTimeFilterLabel()}</span>
                    </div>
                    <div className="chart-body">
                        <Line data={applicationsByMonthData} options={chartOptions} />
                    </div>
                </div>

                {/* Status Distribution */}
                <div className="chart-card">
                    <div className="chart-header">
                        <h2>
                            <i className="fas fa-chart-pie"></i>
                            Phân bố trạng thái
                        </h2>
                        <span className="chart-subtitle">Tất cả ứng viên</span>
                    </div>
                    <div className="chart-body">
                        <Doughnut data={statusDistributionData} options={doughnutOptions} />
                    </div>
                </div>

                {/* Top Job Postings */}
                <div className="chart-card">
                    <div className="chart-header">
                        <h2>
                            <i className="fas fa-trophy"></i>
                            Top tin tuyển dụng
                        </h2>
                        <span className="chart-subtitle">Theo số lượng ứng tuyển</span>
                    </div>
                    <div className="chart-body">
                        <Bar data={topJobPostingsData} options={chartOptions} />
                    </div>
                </div>
            </div>

            {/* Additional Stats */}
            <div className="additional-stats">
                <div className="stat-item">
                    <div className="stat-icon approved">
                        <i className="fas fa-check-circle"></i>
                    </div>
                    <div className="stat-info">
                        <h4>{statistics.applications.approved}</h4>
                        <p>Đã xét duyệt</p>
                    </div>
                </div>
                <div className="stat-item">
                    <div className="stat-icon rejected">
                        <i className="fas fa-times-circle"></i>
                    </div>
                    <div className="stat-info">
                        <h4>{statistics.applications.rejected}</h4>
                        <p>Không đạt</p>
                    </div>
                </div>
                <div className="stat-item">
                    <div className="stat-icon interviewed">
                        <i className="fas fa-user-check"></i>
                    </div>
                    <div className="stat-info">
                        <h4>{statistics.applications.interviewed}</h4>
                        <p>Đã phỏng vấn</p>
                    </div>
                </div>
                <div className="stat-item">
                    <div className="stat-icon expired">
                        <i className="fas fa-calendar-times"></i>
                    </div>
                    <div className="stat-info">
                        <h4>{statistics.jobPostings.expired}</h4>
                        <p>Tin đã hết hạn</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default HrStatistics;

