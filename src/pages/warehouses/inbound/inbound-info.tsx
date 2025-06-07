// src/pages/warehouses/inbound/inbound-info.tsx

import React, { useState } from "react";
import {
  useParams,
  Navigate,
  Link,
  useLocation,
  useNavigate,
} from "react-router-dom";
import {
  WAREHOUSES,
  SOURCES,
  ScannedItem,
} from "../../../constants/warehouses";

// InboundResult에서 사용할 ResultItem 타입을 여기에도 정의
interface ResultItem extends ScannedItem {
  expirationDate: string;
  manufactureDate: string;
  quantity: number;
}

interface LocationState {
  scannedItems: ScannedItem[];

  // 뒤로 돌아올 때 복원할 배열들
  selectedDateTypeArray?: ("유통기한" | "제조일자")[];
  expirationDateArray?: string[];
  manufactureDateArray?: string[];
  quantityArray?: number[];
}

export default function InboundInfo() {
  const { whId, sId } = useParams<"whId" | "sId">();
  const location = useLocation();
  const navigate = useNavigate();

  const state = (location.state as LocationState) || null;
  const scannedItems = state?.scannedItems || [];

  // ─── Hook 호출 시작 ──────────────────────────────────────────────────────

  const [selectedDateTypeArray, setSelectedDateTypeArray] = useState<
    ("유통기한" | "제조일자")[]
  >(() => {
    if (
      state?.selectedDateTypeArray &&
      state.selectedDateTypeArray.length === scannedItems.length
    ) {
      return [...state.selectedDateTypeArray];
    }
    return Array(scannedItems.length).fill("유통기한");
  });

  const [expirationDateArray, setExpirationDateArray] = useState<string[]>(
    () => {
      if (
        state?.expirationDateArray &&
        state.expirationDateArray.length === scannedItems.length
      ) {
        return [...state.expirationDateArray];
      }
      return Array(scannedItems.length).fill("");
    }
  );

  const [manufactureDateArray, setManufactureDateArray] = useState<string[]>(
    () => {
      if (
        state?.manufactureDateArray &&
        state.manufactureDateArray.length === scannedItems.length
      ) {
        return [...state.manufactureDateArray];
      }
      return Array(scannedItems.length).fill("");
    }
  );

  const [quantityArray, setQuantityArray] = useState<number[]>(
    () => {
      if (
        state?.quantityArray &&
        state.quantityArray.length === scannedItems.length
      ) {
        return [...state.quantityArray];
      }
      return Array(scannedItems.length).fill(0);
    }
  );

  const [currentIndex, setCurrentIndex] = useState<number>(0);

  // ─── Hook 호출 끝 ──────────────────────────────────────────────────────

  const warehouse = WAREHOUSES.find((w) => w.id === whId);
  if (!warehouse) {
    return <Navigate to="/warehouses" replace />;
  }

  const sourceLabel =
    SOURCES.find((src) => src.id === sId)?.label || sId || "출발지";

  const handleDateTypeChange = (
    idx: number,
    newType: "유통기한" | "제조일자"
  ) => {
    setSelectedDateTypeArray((prev) => {
      const copy = [...prev];
      copy[idx] = newType;
      return copy;
    });
  };

  const handleDateChange = (idx: number, newValue: string) => {
    if (selectedDateTypeArray[idx] === "유통기한") {
      setExpirationDateArray((prev) => {
        const copy = [...prev];
        copy[idx] = newValue;
        return copy;
      });
    } else {
      setManufactureDateArray((prev) => {
        const copy = [...prev];
        copy[idx] = newValue;
        return copy;
      });
    }
  };

  const adjustQuantity = (idx: number, delta: number) => {
    setQuantityArray((prev) => {
      const copy = [...prev];
      const next = copy[idx] + delta;
      copy[idx] = next < 0 ? 0 : next;
      return copy;
    });
  };

  const goPrev = () => {
    if (currentIndex > 0) setCurrentIndex((i) => i - 1);
  };
  const goNext = () => {
    if (currentIndex < scannedItems.length - 1) setCurrentIndex((i) => i + 1);
  };

  const handleDeleteClick = (idx: number) => {
    const itemName = scannedItems[idx]?.name || "해당 물품";
    const message = `'${itemName}'\n해당 물품이 목록에서 제거됩니다.\n계속하시겠습니까?`;
    if (window.confirm(message)) {
      // 삭제 로직 필요 시 구현
    }
  };

  const handleBackClick = (
    e: React.MouseEvent<HTMLAnchorElement, MouseEvent>
  ) => {
    const message =
      "현재까지 입력한 물품 정보가 저장되지 않았습니다.\n" +
      "이 페이지를 벗어나면 모든 데이터가 삭제됩니다.\n" +
      "그래도 나가시겠습니까?";
    if (!window.confirm(message)) {
      e.preventDefault();
    }
  };

  const handleReviewClick = () => {
    const resultItems: ResultItem[] = scannedItems.map((item, idx) => {
      const original = { ...item };
      const chosenDate =
        selectedDateTypeArray[idx] === "유통기한"
          ? expirationDateArray[idx]
          : manufactureDateArray[idx];
      return {
        ...original,
        expirationDate: chosenDate.trim() === "" ? "-" : chosenDate,
        manufactureDate:
          selectedDateTypeArray[idx] === "제조일자"
            ? manufactureDateArray[idx]
            : "",
        quantity: quantityArray[idx],
      };
    });

    navigate(`/warehouses/${whId}/inbound/${sId}/info/result`, {
      state: {
        scannedItems: resultItems,
        selectedDateTypeArray,
        expirationDateArray,
        manufactureDateArray,
        quantityArray,
      },
    });
  };

  const currentItem: ScannedItem = scannedItems[currentIndex] || {
    id: "",
    name: "",
    stock: "0",
    size: "",
    barcode: "",
    category: "",
    source: sourceLabel,
    dest: warehouse.label,
  };

  const originalStock = parseInt(currentItem.stock, 10) || 0;
  const currentDateType = selectedDateTypeArray[currentIndex];
  const currentDateValue =
    currentDateType === "유통기한"
      ? expirationDateArray[currentIndex]
      : manufactureDateArray[currentIndex];
  const currentQuantity = quantityArray[currentIndex];
  const displayedStock = originalStock + currentQuantity;

  const lastIndex = scannedItems.length - 1;
  const lastDateType = selectedDateTypeArray[lastIndex];
  const lastDateValue =
    lastDateType === "유통기한"
      ? expirationDateArray[lastIndex]
      : manufactureDateArray[lastIndex];
  const lastQuantity = quantityArray[lastIndex];

  const isSubmitEnabled =
    scannedItems.length > 0 && lastDateValue.trim() !== "" && lastQuantity > 0;

  return (
    <div className="inbound-info">
      <header className="warehouse__header">
        <h1 className="warehouse__title">
          {warehouse.label} / 입고 정보
        </h1>
        <Link to="/warehouses" className="warehouse__restart-btn">
          앱 재시작
        </Link>
      </header>

      <div className="inbound-info__content">
        {scannedItems.length === 0 ? (
          <div className="inbound-info__empty">스캔된 물품이 없습니다.</div>
        ) : (
          <>
            <div
              className="inbound-info__card"
              style={{
                height: "45vh",
                overflowY: "auto",
                paddingRight: "8px",
                backgroundColor: "#fff",
                borderRadius: "8px",
                padding: "16px",
                boxSizing: "border-box",
                marginBottom: "16px",
              }}
            >
              <div className="inbound-info__card-header">
                <span className="inbound-info__item-number">
                  {currentIndex + 1}번 물품
                </span>
                <button
                  className="inbound-info__delete-btn"
                  title="이 항목 삭제"
                  onClick={() => handleDeleteClick(currentIndex)}
                >
                  🗑️
                </button>
              </div>

              <div className="inbound-info__field-row">
                <div className="inbound-info__field-label">물품 이름</div>
                <div className="inbound-info__field-value">
                  {currentItem.name}
                </div>
                <div className="inbound-info__field-label">현재고</div>
                <div className="inbound-info__field-value">
                  {displayedStock}
                  {currentQuantity > 0 && (
                    <span className="inbound-info__added-quantity">
                      {` (+${currentQuantity})`}
                    </span>
                  )}
                </div>
              </div>

              <div className="inbound-info__field-row">
                <div className="inbound-info__field-label">규격</div>
                <div className="inbound-info__field-value">
                  {currentItem.size}
                </div>
                <div className="inbound-info__field-label">
                  {currentDateType}
                </div>
                <div className="inbound-info__field-value inbound-info__field-value--expiration">
                  {currentDateValue.trim() === "" ? "-" : currentDateValue}
                </div>
              </div>

              <div className="inbound-info__field-row">
                <div className="inbound-info__field-label">바코드</div>
                <div className="inbound-info__field-value">
                  {currentItem.barcode}
                </div>
                <div className="inbound-info__field-label">상품분류</div>
                <div className="inbound-info__field-value">
                  {currentItem.category}
                </div>
              </div>

              <div className="inbound-info__field-row">
                <div className="inbound-info__field-label">출발지</div>
                <div className="inbound-info__field-value">
                  {currentItem.source}
                </div>
                <div className="inbound-info__field-label">도착지</div>
                <div className="inbound-info__field-value">
                  {warehouse.label}
                </div>
              </div>
            </div>

            <div className="inbound-info__date-section">
              <label className="inbound-info__date-label">
                날짜 입력<span className="inbound-info__required">*</span>
              </label>
              <div className="inbound-info__date-options">
                <label>
                  <input
                    type="radio"
                    name={`dateType-${currentIndex}`}
                    value="유통기한"
                    checked={currentDateType === "유통기한"}
                    onChange={() =>
                      handleDateTypeChange(currentIndex, "유통기한")
                    }
                  />
                  유통기한
                </label>
                <label>
                  <input
                    type="radio"
                    name={`dateType-${currentIndex}`}
                    value="제조일자"
                    checked={currentDateType === "제조일자"}
                    onChange={() =>
                      handleDateTypeChange(currentIndex, "제조일자")
                    }
                  />
                  제조일자
                </label>
              </div>

              <div className="inbound-info__date-pickers">
                <select
                  className="inbound-info__select inbound-info__select--year"
                  value={currentDateValue.slice(0, 4) || ""}
                  onChange={(e) => {
                    const y = e.target.value;
                    const m = currentDateValue.slice(5, 7) || "01";
                    const d = currentDateValue.slice(8, 10) || "01";
                    const newVal = `${y}-${m}-${d}`;
                    handleDateChange(currentIndex, newVal);
                  }}
                >
                  <option value="">년</option>
                  {Array.from({ length: 11 }, (_, i) => 2020 + i).map((yr) => (
                    <option key={yr} value={String(yr)}>
                      {yr}
                    </option>
                  ))}
                </select>

                <select
                  className="inbound-info__select inbound-info__select--month"
                  value={currentDateValue.slice(5, 7) || ""}
                  onChange={(e) => {
                    const y = currentDateValue.slice(0, 4) || "2025";
                    const m = e.target.value.padStart(2, "0");
                    const d = currentDateValue.slice(8, 10) || "01";
                    const newVal = `${y}-${m}-${d}`;
                    handleDateChange(currentIndex, newVal);
                  }}
                >
                  <option value="">월</option>
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((mo) => {
                    const str = String(mo).padStart(2, "0");
                    return (
                      <option key={mo} value={str}>
                        {mo}
                      </option>
                    );
                  })}
                </select>

                <select
                  className="inbound-info__select inbound-info__select--day"
                  value={currentDateValue.slice(8, 10) || ""}
                  onChange={(e) => {
                    const y = currentDateValue.slice(0, 4) || "2025";
                    const m = currentDateValue.slice(5, 7) || "01";
                    const d = e.target.value.padStart(2, "0");
                    const newVal = `${y}-${m}-${d}`;
                    handleDateChange(currentIndex, newVal);
                  }}
                >
                  <option value="">일</option>
                  {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => {
                    const str = String(day).padStart(2, "0");
                    return (
                      <option key={day} value={str}>
                        {day}
                      </option>
                    );
                  })}
                </select>

                {currentDateValue && (
                  <button
                    className="inbound-info__clear-date-btn"
                    onClick={() => handleDateChange(currentIndex, "")}
                    title="날짜 초기화"
                  >
                    ✖️
                  </button>
                )}
              </div>
            </div>

            <div className="inbound-info__quantity-section">
              <label className="inbound-info__quantity-label">
                입고 수량<span className="inbound-info__required">*</span>
              </label>
              <div className="inbound-info__quantity-controls">
                <button
                  className="inbound-info__quantity-btn inbound-info__quantity-btn--minus"
                  onClick={() => adjustQuantity(currentIndex, -10)}
                >
                  -10
                </button>
                <button
                  className="inbound-info__quantity-btn inbound-info__quantity-btn--minus"
                  onClick={() => adjustQuantity(currentIndex, -5)}
                >
                  -5
                </button>
                <button
                  className="inbound-info__quantity-btn inbound-info__quantity-btn--minus"
                  onClick={() => adjustQuantity(currentIndex, -1)}
                >
                  -1
                </button>
                <span className="inbound-info__quantity-value">
                  {currentQuantity}
                </span>
                <button
                  className="inbound-info__quantity-btn inbound-info__quantity-btn--plus"
                  onClick={() => adjustQuantity(currentIndex, +1)}
                >
                  +1
                </button>
                <button
                  className="inbound-info__quantity-btn inbound-info__quantity-btn--plus"
                  onClick={() => adjustQuantity(currentIndex, +5)}
                >
                  +5
                </button>
                <button
                  className="inbound-info__quantity-btn inbound-info__quantity-btn--plus"
                  onClick={() => adjustQuantity(currentIndex, +10)}
                >
                  +10
                </button>
              </div>
            </div>

            <div className="inbound-info__pagination">
              <button
                className="inbound-info__page-btn"
                onClick={goPrev}
                disabled={currentIndex === 0}
              >
                ←
              </button>
              <span className="inbound-info__page-indicator">
                {currentIndex + 1} / {scannedItems.length}
              </span>
              <button
                className="inbound-info__page-btn"
                onClick={goNext}
                disabled={currentIndex === scannedItems.length - 1}
              >
                →
              </button>
            </div>
          </>
        )}
      </div>

      <footer className="warehouse__footer">
        <Link
          to={`/warehouses/${whId}/inbound/${sId}`}
          className="warehouse__back-btn"
          onClick={handleBackClick}
        >
          ← 입고 스캔
        </Link>
        <button
          className="warehouse__next-btn"
          onClick={handleReviewClick}
          disabled={!isSubmitEnabled}
        >
          물품 검토 →
        </button>
      </footer>
    </div>
  );
}
