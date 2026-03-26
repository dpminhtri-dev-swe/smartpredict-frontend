import React from 'react';
import './ConfirmModal.scss';

const ConfirmModal = ({ 
    show, 
    onClose, 
    onConfirm, 
    title = "Xác nhận", 
    message = "Bạn có chắc chắn muốn thực hiện hành động này?",
    confirmText = "Xác nhận",
    cancelText = "Hủy",
    type = "danger" // danger, warning, info, success
}) => {
    if (!show) return null;

    const getIcon = () => {
        switch (type) {
            case 'danger':
                return 'fas fa-exclamation-triangle';
            case 'warning':
                return 'fas fa-exclamation-circle';
            case 'info':
                return 'fas fa-info-circle';
            case 'success':
                return 'fas fa-check-circle';
            default:
                return 'fas fa-question-circle';
        }
    };

    return (
        <div className="confirm-modal-overlay" onClick={onClose}>
            <div className="confirm-modal" onClick={(e) => e.stopPropagation()}>
                <div className={`modal-icon ${type}`}>
                    <i className={getIcon()}></i>
                </div>
                <h3 className="modal-title">{title}</h3>
                <p className="modal-message">{message}</p>
                <div className="modal-actions">
                    <button className="btn-cancel" onClick={onClose}>
                        {cancelText}
                    </button>
                    <button className={`btn-confirm ${type}`} onClick={onConfirm}>
                        {confirmText}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ConfirmModal;

