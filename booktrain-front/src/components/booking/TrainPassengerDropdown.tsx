import { Minus, Plus, AlertTriangle, ChevronRight } from "lucide-react";
import type { TrainPassengerCount } from "../../types/passenger";

interface TrainPassengerDropdownProps {
  count: TrainPassengerCount;
  onChange: (c: TrainPassengerCount) => void;
  onConfirm: () => void;
}

function dec<K extends keyof TrainPassengerCount>(
  key: K,
  min: number,
  count: TrainPassengerCount,
  onChange: (c: TrainPassengerCount) => void
) {
  if (count[key] > min) onChange({ ...count, [key]: count[key] - 1 });
}

function inc<K extends keyof TrainPassengerCount>(
  key: K,
  count: TrainPassengerCount,
  onChange: (c: TrainPassengerCount) => void
) {
  onChange({ ...count, [key]: count[key] + 1 });
}

function CounterRow({
  value,
  min,
  onDec,
  onInc,
}: {
  value: number;
  min: number;
  onDec: () => void;
  onInc: () => void;
}) {
  return (
    <div className="train-pax-counter">
      <button
        type="button"
        className="train-counter-btn train-counter-minus"
        disabled={value <= min}
        onClick={onDec}
        aria-label="Giảm"
      >
        <Minus size={14} strokeWidth={2.5} />
      </button>
      <span className="train-counter-val">{value}</span>
      <button type="button" className="train-counter-btn train-counter-plus" onClick={onInc} aria-label="Tăng">
        <Plus size={14} strokeWidth={2.5} />
      </button>
    </div>
  );
}

export default function TrainPassengerDropdown({ count, onChange, onConfirm }: TrainPassengerDropdownProps) {
  const total =
    count.adult + count.child + count.elderly + count.student + count.union;

  return (
    <div className="train-passenger-dropdown">
      <div className="train-pax-grid">
        <div className="train-pax-col">
          <div className="train-pax-block">
            <div className="train-pax-head">
              <span className="train-pax-title">Người lớn</span>
            </div>
            <p className="train-pax-desc">
              Từ trên 10 - 59 tuổi vào ngày khởi hành với công dân Việt Nam. Hoặc người nước ngoài từ 10 tuổi trở lên.
            </p>
            <CounterRow
              value={count.adult}
              min={1}
              onDec={() => dec("adult", 1, count, onChange)}
              onInc={() => inc("adult", count, onChange)}
            />
          </div>

          <div className="train-pax-divider" />

          <div className="train-pax-block">
            <div className="train-pax-head">
              <span className="train-pax-title">Trẻ em</span>
              <span className="discount-badge">GIẢM 25%</span>
            </div>
            <p className="train-pax-desc">
              Từ 0 - 10 tuổi vào ngày khởi hành, dưới 6 tuổi ngồi cùng người lớn (tối đa 1 trẻ), trẻ thứ 2 trở đi phải mua thêm vé{" "}
              <ChevronRight size={14} className="train-pax-chevron" />
            </p>
            <CounterRow
              value={count.child}
              min={0}
              onDec={() => dec("child", 0, count, onChange)}
              onInc={() => inc("child", count, onChange)}
            />
          </div>
        </div>

        <div className="train-pax-col">
          <p className="train-pax-vn-only">CHỈ ÁP DỤNG CHO CÔNG DÂN VIỆT NAM</p>
          <div className="train-pax-warn">
            <AlertTriangle size={18} className="train-pax-warn-icon" />
            <p>
              Vui lòng chọn đúng <strong>đối tượng được giảm giá</strong>. Trường hợp chọn sai sẽ bị phụ thu khi lên tàu.
            </p>
          </div>

          <div className="train-pax-block">
            <div className="train-pax-head">
              <span className="train-pax-title">Người cao tuổi</span>
              <span className="discount-badge">GIẢM 15%</span>
              <span className="train-pax-star" aria-hidden>
                ★
              </span>
            </div>
            <p className="train-pax-desc">
              Từ 60 tuổi trở lên vào ngày khởi hành <ChevronRight size={14} className="train-pax-chevron" />
            </p>
            <CounterRow
              value={count.elderly}
              min={0}
              onDec={() => dec("elderly", 0, count, onChange)}
              onInc={() => inc("elderly", count, onChange)}
            />
          </div>

          <div className="train-pax-divider" />

          <div className="train-pax-block">
            <div className="train-pax-head">
              <span className="train-pax-title">Sinh viên</span>
              <span className="discount-badge">GIẢM 10%</span>
              <span className="train-pax-star" aria-hidden>
                ★
              </span>
            </div>
            <p className="train-pax-desc">
              Có đem theo Thẻ Sinh viên khi đi tàu <ChevronRight size={14} className="train-pax-chevron" />
            </p>
            <CounterRow
              value={count.student}
              min={0}
              onDec={() => dec("student", 0, count, onChange)}
              onInc={() => inc("student", count, onChange)}
            />
          </div>

          <div className="train-pax-divider" />

          <div className="train-pax-block">
            <div className="train-pax-head">
              <span className="train-pax-title">Đoàn viên Công Đoàn</span>
              <span className="discount-badge">GIẢM 5%</span>
              <span className="train-pax-star" aria-hidden>
                ★
              </span>
            </div>
            <p className="train-pax-desc">
              Có đem theo Thẻ Đoàn viên hợp lệ khi đi tàu <ChevronRight size={14} className="train-pax-chevron" />
            </p>
            <CounterRow
              value={count.union}
              min={0}
              onDec={() => dec("union", 0, count, onChange)}
              onInc={() => inc("union", count, onChange)}
            />
          </div>
        </div>
      </div>

      <div className="train-pax-footer">
        <button type="button" className="train-pax-confirm-btn" onClick={onConfirm}>
          Xác nhận {total} hành khách
        </button>
      </div>
    </div>
  );
}
