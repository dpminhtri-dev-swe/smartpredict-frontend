import React, { useState, useEffect } from 'react';
import { Modal, Timeline, Spin, Alert, Tabs, Empty } from 'antd';
import { 
    UploadOutlined, 
    TagsOutlined, 
    DatabaseOutlined, 
    RobotOutlined,
    CheckCircleOutlined,
    ClockCircleOutlined,
    LoadingOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import 'dayjs/locale/vi';
import { getTrainingStatus } from '../../service.js/questionBankService';
import './TrainingTimelineModal.scss';

const { TabPane } = Tabs;

const TrainingTimelineModal = ({ show, onClose, questionBanks = [], userId }) => {
    const [loading, setLoading] = useState(false);
    const [timelineDataMap, setTimelineDataMap] = useState({});
    const [error, setError] = useState(null);
    const [activeTab, setActiveTab] = useState('');

    useEffect(() => {
        console.log('🔍 TrainingTimelineModal useEffect:', { show, questionBanksLength: questionBanks.length, userId });
        if (show && questionBanks.length > 0 && userId) {
            console.log('✅ Bắt đầu fetch training status cho', questionBanks.length, 'bộ đề');
            fetchAllTrainingStatus();
            setActiveTab(questionBanks[0]?.id?.toString() || '');
        } else if (show) {
            console.warn('⚠️ Modal mở nhưng thiếu dữ liệu:', { 
                questionBanksLength: questionBanks.length, 
                userId 
            });
        }
    }, [show, questionBanks, userId]);

    const fetchAllTrainingStatus = async () => {
        console.log('🔄 fetchAllTrainingStatus bắt đầu');
        setLoading(true);
        setError(null);
        const dataMap = {};
        
        try {
            // Fetch training status cho tất cả các bộ đề
            const promises = questionBanks.map(async (bank) => {
                try {
                    console.log(`📡 Đang fetch training status cho bank ${bank.id} (${bank.Ten})`);
                    const res = await getTrainingStatus(userId, bank.id);
                    console.log(`📥 Response cho bank ${bank.id}:`, res);
                    if (res && res.EC === 0) {
                        dataMap[bank.id] = res.DT;
                        console.log(`✅ Đã load timeline cho bank ${bank.id}`);
                    } else {
                        console.warn(`⚠️ Bank ${bank.id} có lỗi:`, res?.EM);
                        dataMap[bank.id] = { error: res?.EM || 'Không thể tải thông tin tiến trình' };
                    }
                } catch (err) {
                    console.error(`❌ Error fetching training status for bank ${bank.id}:`, err);
                    dataMap[bank.id] = { error: 'Không thể tải thông tin tiến trình' };
                }
            });

            await Promise.all(promises);
            console.log('📊 Timeline data map:', dataMap);
            setTimelineDataMap(dataMap);
        } catch (err) {
            console.error('❌ Error fetching training statuses:', err);
            setError('Có lỗi xảy ra khi tải thông tin tiến trình!');
        } finally {
            setLoading(false);
            console.log('✅ fetchAllTrainingStatus hoàn thành');
        }
    };

    const getIcon = (iconName, status) => {
        const iconProps = {
            style: { fontSize: '16px' }
        };

        if (status === 'finish') {
            return <CheckCircleOutlined {...iconProps} style={{ ...iconProps.style, color: '#52c41a' }} />;
        } else if (status === 'process') {
            return <LoadingOutlined {...iconProps} style={{ ...iconProps.style, color: '#1890ff' }} />;
        } else {
            return <ClockCircleOutlined {...iconProps} style={{ ...iconProps.style, color: '#d9d9d9' }} />;
        }
    };

    const getStepIcon = (iconName) => {
        const iconProps = { className: 'step-icon' };
        const iconMap = {
            'upload': <UploadOutlined {...iconProps} />,
            'tags': <TagsOutlined {...iconProps} />,
            'database': <DatabaseOutlined {...iconProps} />,
            'robot': <RobotOutlined {...iconProps} />
        };
        return iconMap[iconName] || <ClockCircleOutlined {...iconProps} />;
    };

    const formatDate = (dateString) => {
        if (!dateString) return '';
        const date = new Date(dateString);
        return date.toLocaleString('vi-VN', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'finish': return '#52c41a';
            case 'process': return '#1890ff';
            case 'wait': return '#d9d9d9';
            default: return '#d9d9d9';
        }
    };

    const getStepStatusClass = (status, index, currentActiveIndex) => {
        if (status === 'finish') return 'step-completed';
        if (status === 'process') return 'step-active';
        return 'step-waiting';
    };

    const renderTimelineContent = (timelineData) => {
        if (!timelineData) {
            return (
                <div style={{ textAlign: 'center', padding: '40px' }}>
                    <Spin />
                    <p style={{ marginTop: '16px', color: '#8c8c8c' }}>Đang tải timeline...</p>
                </div>
            );
        }

        if (timelineData.error) {
            return (
                <Alert
                    message="Lỗi"
                    description={timelineData.error || 'Không thể tải thông tin tiến trình'}
                    type="error"
                    showIcon
                />
            );
        }

        // Tìm index của bước đang active (process)
        const activeIndex = timelineData.timeline.findIndex(step => step.status === 'process');
        const completedCount = timelineData.timeline.filter(step => step.status === 'finish').length;

        return (
            <div className="timeline-content">
                <div className="timeline-summary">
                    <h3>{timelineData.bankName}</h3>
                    <div className="summary-stats">
                        <div className="stat-item">
                            <span className="stat-label">Tiến độ:</span>
                            <span className="stat-value">
                                {completedCount}/{timelineData.summary.totalSteps} bước
                            </span>
                        </div>
                        <div className="stat-item">
                            <span className="stat-label">Trạng thái:</span>
                            <span className={`stat-value ${timelineData.summary.isComplete ? 'complete' : 'in-progress'}`}>
                                {timelineData.summary.isComplete ? 'Hoàn thành' : 'Đang xử lý'}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Horizontal Timeline */}
                <div className="horizontal-timeline">
                    <div className="timeline-line">
                        <div 
                            className="timeline-progress" 
                            style={{ 
                                width: `${(completedCount / timelineData.timeline.length) * 100}%` 
                            }}
                        />
                    </div>
                    
                    <div className="timeline-steps">
                        {timelineData.timeline.map((step, index) => {
                            const statusClass = getStepStatusClass(step.status, index, activeIndex);
                            const isActive = step.status === 'process';
                            const isCompleted = step.status === 'finish';
                            
                            return (
                                <div 
                                    key={index} 
                                    className={`timeline-step ${statusClass} ${isActive ? 'active-glow' : ''}`}
                                >
                                    <div className="step-node">
                                        <div className="step-icon-wrapper">
                                            {isCompleted ? (
                                                <CheckCircleOutlined className="step-icon" />
                                            ) : isActive ? (
                                                <LoadingOutlined className="step-icon spinning" />
                                            ) : (
                                                getStepIcon(step.icon)
                                            )}
                                        </div>
                                    </div>
                                    
                                    <div className="step-content">
                                        <div className="step-title">{step.title}</div>
                                        <div className="step-description">{step.description}</div>
                                        {step.timestamp && (
                                            <div className="step-timestamp">
                                                {formatDate(step.timestamp)}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        );
    };

    console.log('🎨 TrainingTimelineModal render:', { show, questionBanksLength: questionBanks.length, userId });

    if (!show) {
        console.log('⚠️ Modal không hiển thị vì show=false');
        return null;
    }

    return (
        <Modal
            title={
                <div className="timeline-modal-header">
                    <RobotOutlined style={{ marginRight: '8px', color: '#1890ff' }} />
                    <span>Tiến trình Training AI cho tất cả bộ đề</span>
                </div>
            }
            visible={show}
            onCancel={onClose}
            footer={null}
            width={1200}
            className="training-timeline-modal"
            maskClosable={true}
            destroyOnClose={false}
        >
            {loading ? (
                <div className="timeline-loading">
                    <Spin size="large" />
                    <p>Đang tải thông tin tiến trình...</p>
                </div>
            ) : error ? (
                <Alert
                    message="Lỗi"
                    description={error}
                    type="error"
                    showIcon
                    action={
                        <button 
                            className="btn-retry" 
                            onClick={fetchAllTrainingStatus}
                            style={{ 
                                background: 'none', 
                                border: '1px solid #ff4d4f', 
                                color: '#ff4d4f',
                                padding: '4px 12px',
                                borderRadius: '4px',
                                cursor: 'pointer'
                            }}
                        >
                            Thử lại
                        </button>
                    }
                />
            ) : questionBanks.length === 0 ? (
                <Empty description="Chưa có bộ đề nào" />
            ) : (
                <div>
                    {console.log('🔍 Render Tabs với:', { 
                        questionBanksCount: questionBanks.length, 
                        activeTab, 
                        timelineDataMapKeys: Object.keys(timelineDataMap) 
                    })}
                    <Tabs 
                        activeKey={activeTab} 
                        onChange={setActiveTab}
                        type="card"
                    >
                        {questionBanks.map((bank) => {
                            const timelineData = timelineDataMap[bank.id];
                            console.log(`📋 Tab ${bank.id}:`, { 
                                bankName: bank.Ten, 
                                hasTimelineData: !!timelineData,
                                timelineData 
                            });
                            return (
                                <TabPane 
                                    tab={
                                        <span>
                                            <i className="fas fa-book" style={{ marginRight: '8px' }} />
                                            {bank.Ten}
                                        </span>
                                    } 
                                    key={bank.id.toString()}
                                >
                                    {renderTimelineContent(timelineData)}
                                </TabPane>
                            );
                        })}
                    </Tabs>
                </div>
            )}
        </Modal>
    );
};

export default TrainingTimelineModal;

