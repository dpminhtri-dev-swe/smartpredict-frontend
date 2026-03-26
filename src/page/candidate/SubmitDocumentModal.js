import React, { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { 
    getDocumentsByApplication, 
    checkCanSubmitDocuments, 
    createOrUpdateDocument,
    deleteDocument 
} from '../../service.js/applicationDocumentService';
import { uploadCV } from '../../service.js/recordService';
import './SubmitDocumentModal.scss';

const DOCUMENT_TYPES = [
    { value: 'job_application_letter', label: 'Đơn xin việc', requiresFile: true, requiresExpiry: false },
    { value: 'id_card_copy', label: 'Bản sao Căn cước công dân (thời hạn 06 tháng)', requiresFile: true, requiresExpiry: true },
    { value: 'resume_certified', label: 'Sơ yếu lý lịch có chứng thực', requiresFile: true, requiresExpiry: false },
    { value: 'degree_certified', label: 'Bản sao bằng cấp có chứng thực', requiresFile: true, requiresExpiry: false },
    { value: 'health_certificate', label: 'Giấy khám sức khỏe (còn thời hạn 06 tháng)', requiresFile: true, requiresExpiry: true },
    { value: 'bank_account', label: 'Số tài khoản ngân hàng BIDV', requiresFile: false, requiresExpiry: false }
];

const SubmitDocumentModal = ({ isOpen, onClose, applicationId, userId }) => {
    const [documents, setDocuments] = useState([]);
    const [canSubmit, setCanSubmit] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    
    // Form data for all documents
    const [formData, setFormData] = useState(() => {
        const initial = {};
        DOCUMENT_TYPES.forEach(doc => {
            initial[doc.value] = {
                file: null,
                expiryDate: '',
                bankAccountNumber: '',
                notes: ''
            };
        });
        return initial;
    });
    
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [uploadingFiles, setUploadingFiles] = useState({});

    useEffect(() => {
        if (isOpen && applicationId && userId) {
            fetchData();
        }
    }, [isOpen, applicationId, userId]);

    const fetchData = async () => {
        setIsLoading(true);
        try {
            // Check if can submit
            const checkRes = await checkCanSubmitDocuments(applicationId, userId);
            if (checkRes && checkRes.EC === 0) {
                setCanSubmit(checkRes.DT.canSubmit);
            }

            // Fetch existing documents
            const docsRes = await getDocumentsByApplication(applicationId, userId);
            if (docsRes && docsRes.EC === 0) {
                const existingDocs = docsRes.DT || [];
                setDocuments(existingDocs);
                
                // Load existing data into form
                const newFormData = { ...formData };
                existingDocs.forEach(doc => {
                    if (newFormData[doc.documentType]) {
                        newFormData[doc.documentType] = {
                            ...newFormData[doc.documentType],
                            expiryDate: doc.expiryDate || '',
                            bankAccountNumber: doc.bankAccountNumber || '',
                            notes: doc.notes || '',
                            existingFileUrl: doc.fileUrl
                        };
                    }
                });
                setFormData(newFormData);
            }
        } catch (error) {
            console.error('Error fetching data:', error);
            toast.error('Có lỗi khi tải dữ liệu!');
        } finally {
            setIsLoading(false);
        }
    };

    const updateFormData = (docType, field, value) => {
        setFormData(prev => ({
            ...prev,
            [docType]: {
                ...prev[docType],
                [field]: value
            }
        }));
    };

    const validateAllDocuments = () => {
        const errors = [];
        
        DOCUMENT_TYPES.forEach(docType => {
            const data = formData[docType.value];
            const existingDoc = documents.find(d => d.documentType === docType.value);
            
            // Check file requirement
            if (docType.requiresFile && !data.file && !existingDoc?.fileUrl) {
                errors.push(`Vui lòng nộp: ${docType.label}`);
            }
            
            // Check bank account
            if (docType.value === 'bank_account' && !data.bankAccountNumber.trim() && !existingDoc?.bankAccountNumber) {
                errors.push(`Vui lòng nhập: ${docType.label}`);
            }
            
            // Check expiry date
            if (docType.requiresExpiry && !data.expiryDate && !existingDoc?.expiryDate) {
                errors.push(`Vui lòng nhập ngày hết hạn cho: ${docType.label}`);
            }
        });
        
        return errors;
    };

    const handleSubmitAll = async () => {
        // Validate all documents
        const errors = validateAllDocuments();
        if (errors.length > 0) {
            toast.error('Vui lòng nộp đầy đủ tất cả các tài liệu:\n' + errors.join('\n'));
            return;
        }

        setIsSubmitting(true);
        const uploadStatus = {};
        setUploadingFiles({});

        try {
            // Submit all documents
            for (const docType of DOCUMENT_TYPES) {
                const data = formData[docType.value];
                const existingDoc = documents.find(d => d.documentType === docType.value);
                
                setUploadingFiles(prev => ({ ...prev, [docType.value]: true }));
                
                let fileUrl = existingDoc?.fileUrl || null;

                // Upload file if provided
                if (data.file) {
                    try {
                        const uploadRes = await uploadCV(data.file, userId);
                        if (uploadRes && uploadRes.data && uploadRes.data.EC === 0) {
                            fileUrl = uploadRes.data.DT.filePath;
                            uploadStatus[docType.value] = 'success';
                        } else {
                            uploadStatus[docType.value] = 'error';
                            throw new Error(`Lỗi khi upload file cho ${docType.label}`);
                        }
                    } catch (uploadError) {
                        console.error(`Error uploading ${docType.label}:`, uploadError);
                        uploadStatus[docType.value] = 'error';
                        throw uploadError;
                    }
                } else if (!fileUrl && docType.requiresFile) {
                    // File required but not provided and no existing file
                    throw new Error(`Vui lòng nộp file cho ${docType.label}`);
                }

                const documentData = {
                    documentType: docType.value,
                    fileUrl: fileUrl,
                    expiryDate: docType.requiresExpiry ? (data.expiryDate || existingDoc?.expiryDate) : null,
                    bankAccountNumber: docType.value === 'bank_account' ? (data.bankAccountNumber || existingDoc?.bankAccountNumber) : null,
                    notes: data.notes || existingDoc?.notes || null
                };

                const res = await createOrUpdateDocument(applicationId, documentData, userId);
                if (res && res.EC === 0) {
                    uploadStatus[docType.value] = 'success';
                } else {
                    uploadStatus[docType.value] = 'error';
                    throw new Error(res.EM || `Lỗi khi nộp ${docType.label}`);
                }
                
                setUploadingFiles(prev => {
                    const newStatus = { ...prev };
                    delete newStatus[docType.value];
                    return newStatus;
                });
            }

            // All documents submitted successfully
            toast.success('Đã nộp đầy đủ tất cả tài liệu thành công!');
            fetchData();
            onClose();
        } catch (error) {
            console.error('Error submitting documents:', error);
            toast.error(error.message || 'Có lỗi xảy ra khi nộp tài liệu!');
        } finally {
            setIsSubmitting(false);
            setUploadingFiles({});
        }
    };

    const handleDelete = async (documentId, docType) => {
        if (!window.confirm('Bạn có chắc muốn xóa tài liệu này?')) {
            return;
        }

        try {
            const res = await deleteDocument(documentId, userId);
            if (res && res.EC === 0) {
                toast.success(res.EM);
                // Reset form data for this document type
                updateFormData(docType, 'file', null);
                updateFormData(docType, 'expiryDate', '');
                updateFormData(docType, 'bankAccountNumber', '');
                updateFormData(docType, 'notes', '');
                fetchData();
            } else {
                toast.error(res.EM || 'Có lỗi xảy ra!');
            }
        } catch (error) {
            console.error('Error deleting document:', error);
            toast.error('Có lỗi xảy ra khi xóa tài liệu!');
        }
    };

    if (!isOpen) return null;

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content document-modal" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>Nộp hồ sơ bổ sung</h2>
                    <button className="btn-close" onClick={onClose}>
                        <i className="fas fa-times"></i>
                    </button>
                </div>

                <div className="modal-body">
                    {!canSubmit ? (
                        <div className="alert alert-warning">
                            <i className="fas fa-exclamation-triangle"></i>
                            <p>Bạn chỉ có thể nộp tài liệu khi đơn ứng tuyển đã được duyệt (Đã được nhận).</p>
                        </div>
                    ) : (
                        <>
                            <div className="documents-required-notice">
                                <i className="fas fa-info-circle"></i>
                                <p><strong>Lưu ý:</strong> Bạn cần nộp đầy đủ tất cả các tài liệu sau đây:</p>
                            </div>

                            <div className="documents-form-list">
                                {DOCUMENT_TYPES.map((docType, index) => {
                                    const data = formData[docType.value];
                                    const existingDoc = documents.find(d => d.documentType === docType.value);
                                    const isUploading = uploadingFiles[docType.value];
                                    const isComplete = docType.requiresFile 
                                        ? (data.file || existingDoc?.fileUrl)
                                        : (docType.value === 'bank_account' 
                                            ? (data.bankAccountNumber.trim() || existingDoc?.bankAccountNumber)
                                            : true);
                                    
                                    return (
                                        <div key={docType.value} className={`document-form-item ${isComplete ? 'complete' : 'incomplete'}`}>
                                            <div className="document-form-header">
                                                <div className="doc-number">{index + 1}</div>
                                                <h3>{docType.label}</h3>
                                                {isComplete && (
                                                    <span className="status-badge complete-badge">
                                                        <i className="fas fa-check-circle"></i> Đã nộp
                                                    </span>
                                                )}
                                                {!isComplete && (
                                                    <span className="status-badge incomplete-badge">
                                                        <i className="fas fa-exclamation-circle"></i> Chưa nộp
                                                    </span>
                                                )}
                                            </div>

                                            <div className="document-form-body">
                                                {docType.requiresFile && (
                                                    <div className="form-group">
                                                        <label>
                                                            File tài liệu {existingDoc ? '(Để trống nếu không thay đổi)' : ''} <span className="required">*</span>
                                                        </label>
                                                        <input
                                                            type="file"
                                                            accept=".pdf,.doc,.docx"
                                                            onChange={(e) => updateFormData(docType.value, 'file', e.target.files[0])}
                                                            disabled={isUploading}
                                                        />
                                                        {existingDoc && existingDoc.fileUrl && (
                                                            <a 
                                                                href={`http://localhost:8082${existingDoc.fileUrl}`} 
                                                                target="_blank" 
                                                                rel="noopener noreferrer"
                                                                className="existing-file-link"
                                                            >
                                                                <i className="fas fa-file"></i> Xem file hiện tại
                                                            </a>
                                                        )}
                                                        {isUploading && (
                                                            <div className="uploading-indicator">
                                                                <i className="fas fa-spinner fa-spin"></i> Đang upload...
                                                            </div>
                                                        )}
                                                    </div>
                                                )}

                                                {docType.value === 'bank_account' && (
                                                    <div className="form-group">
                                                        <label>Số tài khoản BIDV <span className="required">*</span></label>
                                                        <input
                                                            type="text"
                                                            value={data.bankAccountNumber || existingDoc?.bankAccountNumber || ''}
                                                            onChange={(e) => updateFormData(docType.value, 'bankAccountNumber', e.target.value)}
                                                            placeholder="Nhập số tài khoản ngân hàng BIDV"
                                                        />
                                                    </div>
                                                )}

                                                {docType.requiresExpiry && (
                                                    <div className="form-group">
                                                        <label>Ngày hết hạn <span className="required">*</span></label>
                                                        <input
                                                            type="date"
                                                            value={data.expiryDate || existingDoc?.expiryDate || ''}
                                                            onChange={(e) => updateFormData(docType.value, 'expiryDate', e.target.value)}
                                                        />
                                                    </div>
                                                )}

                                                <div className="form-group">
                                                    <label>Ghi chú (Tùy chọn)</label>
                                                    <textarea
                                                        value={data.notes || existingDoc?.notes || ''}
                                                        onChange={(e) => updateFormData(docType.value, 'notes', e.target.value)}
                                                        rows="2"
                                                        placeholder="Ghi chú thêm về tài liệu..."
                                                    />
                                                </div>

                                                {existingDoc && (
                                                    <div className="document-actions">
                                                        <button 
                                                            className="btn-delete-doc"
                                                            onClick={() => handleDelete(existingDoc.id, docType.value)}
                                                        >
                                                            <i className="fas fa-trash"></i> Xóa
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            <div className="form-actions-submit-all">
                                <button 
                                    className="btn-submit-all" 
                                    onClick={handleSubmitAll}
                                    disabled={isSubmitting || Object.keys(uploadingFiles).length > 0}
                                >
                                    {isSubmitting || Object.keys(uploadingFiles).length > 0 ? (
                                        <>
                                            <i className="fas fa-spinner fa-spin"></i> Đang xử lý...
                                        </>
                                    ) : (
                                        <>
                                            <i className="fas fa-check-circle"></i> Nộp tất cả tài liệu
                                        </>
                                    )}
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default SubmitDocumentModal;
