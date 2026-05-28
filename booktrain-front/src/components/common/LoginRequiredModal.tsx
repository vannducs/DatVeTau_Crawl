import "./loginRequiredModal.css";

interface Props {
    onConfirm: () => void;  
    onCancel: () => void;   
}

export default function LoginRequiredModal({ onConfirm, onCancel }: Props) {
    return (
        // Overlay tối phía sau
        <div className="modal-overlay" onClick={onCancel}>

            {/* Hộp popup - stopPropagation để click vào box không đóng */}
            <div className="modal-box" onClick={e => e.stopPropagation()}>

                {/* Icon */}
                <div className="modal-icon">🔐</div>

                {/* Nội dung */}
                <h3 className="modal-title">Bạn chưa đăng nhập</h3>
                <p className="modal-desc">
                    Vui lòng đăng nhập để tiếp tục đặt vé và sử dụng dịch vụ của DatVeTau.
                </p>

                {/* Nút */}
                <div className="modal-actions">
                    <button className="modal-btn modal-btn--cancel" onClick={onCancel}>
                        Hủy
                    </button>
                    <button className="modal-btn modal-btn--confirm" onClick={onConfirm}>
                        Đăng nhập ngay
                    </button>
                </div>
            </div>
        </div>
    );
}