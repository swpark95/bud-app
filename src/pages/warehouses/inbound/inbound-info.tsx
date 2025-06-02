import React, { useState } from "react";
import { useParams, Navigate, Link, useLocation } from "react-router-dom";
import {
  WAREHOUSES,
  ScannedItem,
  SOURCES,
} from "../../../constants/warehouses";

interface LocationState {
  scannedItems: ScannedItem[];
}

export default function InboundInfo() {
  // ─── 훅 호출 순서 지키기: 절대로 조건문 이전에 useState 등 Hook들을 모두 호출합니다. ───
  const { whId, sId } = useParams<"whId" | "sId">();
  const location = useLocation();
  const state = location.state as LocationState | null;
  const scannedItems = state?.scannedItems || [];

  const [currentIndex, setCurrentIndex] = useState<number>(0);
  // 유통기한과 제조일자를 분리하여 저장할 상태
  const [selectedDateTypeArray, setSelectedDateTypeArray] = useState<("유통기한" | "제조일자")[]>(
    Array(scannedItems.length).fill("유통기한")
  );
  const [expirationDateArray, setExpirationDateArray] = useState<string[]>(
    Array(scannedItems.length).fill("")
  );
  const [manufactureDateArray, setManufactureDateArray] = useState<string[]>(
    Array(scannedItems.length).fill("")
  );
  const [quantityArray, setQuantityArray] = useState<number[]>(
    Array(scannedItems.length).fill(0)
  );
  // ────────────────────────────────────────────────────────────────────────

  // 7) 반드시 훅 호출 이후에 “좌표(whId)에 해당하는 창고가 있는지”를 확인합니다.
  const warehouse = WAREHOUSES.find((w) => w.id === whId);
  if (!warehouse) {
    return <Navigate to="/warehouses" replace />;
  }

  // 8) URL 파라미터 sId 를 이용해 출발지(label) 찾기
  const sourceLabel =
    SOURCES.find((src) => src.id === sId)?.label || sId || "출발지";

  // ─── 각종 핸들러 ────────────────────────────────────────────────────────────

  // (a) 날짜 타입(“유통기한” or “제조일자”) 변경
  const handleDateTypeChange = (idx: number, newType: "유통기한" | "제조일자") => {
    setSelectedDateTypeArray((prev) => {
      const copy = [...prev];
      copy[idx] = newType;
      return copy;
    });
  };

  // (b) 날짜 값(“YYYY-MM-DD”) 변경: 선택된 타입에 따라 별도 배열에 저장
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

  // (c) 입고 수량 조절 (+1, -1, +5, -5 등)
  const adjustQuantity = (idx: number, delta: number) => {
    setQuantityArray((prev) => {
      const copy = [...prev];
      const next = copy[idx] + delta;
      copy[idx] = next < 0 ? 0 : next;
      return copy;
    });
  };

  // (d) 페이지 네비게이션 (이전/다음 물품 보기)
  const goPrev = () => {
    if (currentIndex > 0) setCurrentIndex((i) => i - 1);
  };
  const goNext = () => {
    if (currentIndex < scannedItems.length - 1) setCurrentIndex((i) => i + 1);
  };
  // ────────────────────────────────────────────────────────────────────────

  // 9) 현재 인덱스의 물품 정보 꺼내기
  const currentItem: ScannedItem = scannedItems[currentIndex] || {
    id:       "",
    name:     "",
    stock:    "0",
    size:     "",
    barcode:  "",
    category: "",
    source:   sourceLabel,
    dest:     warehouse.label,
  };

  // 원래 재고 수를 숫자형으로 변환
  const originalStock = parseInt(currentItem.stock, 10) || 0;
  const currentDateType = selectedDateTypeArray[currentIndex];
  const currentDateValue =
    currentDateType === "유통기한"
      ? expirationDateArray[currentIndex]
      : manufactureDateArray[currentIndex];
  const currentQuantity = quantityArray[currentIndex];
  // 합산된 재고
  const displayedStock = originalStock + currentQuantity;

  // 11) 버튼 활성화 여부: “물품 검토” 버튼은
  //     -- 선택된 날짜 필드가 비어있지 않아야 하고,
  //     -- 입고 수량 → 반드시 1 이상이어야 활성화됩니다.
  const isSubmitEnabled = currentDateValue.trim() !== "" && currentQuantity > 0;

  // ──────────────────────────────────────────────────────────────────────────

  return (
    <div className="inbound-info">
      {/* — Header — */}
      <header className="warehouse__header">
        <h1 className="warehouse__title">
          {warehouse.label} / 입고 정보
        </h1>
        <Link to="/warehouses" className="warehouse__restart-btn">
          앱 재시작
        </Link>
      </header>

      {/* — 본문: 스캔된 물품 유무에 따라 분기 — */}
      <div className="inbound-info__content">
        {scannedItems.length === 0 ? (
          <div className="inbound-info__empty">
            스캔된 물품이 없습니다.
          </div>
        ) : (
          <>
            {/* 1) 카드: 현재 물품 기본 정보 */}
            <div className="inbound-info__card">
              <div className="inbound-info__card-header">
                <span className="inbound-info__item-number">
                  {currentIndex + 1}번 물품
                </span>
                <button
                  className="inbound-info__delete-btn"
                  title="이 항목 삭제"
                  onClick={() => {
                    // 필요 시: 삭제 로직 추가
                  }}
                >
                  🗑️
                </button>
              </div>

              {/* — “물품 이름” / “현재고 (+입고수량)” 표시 */}
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

              {/* — “규격” / “유통기한(또는 제조일자 입력값)” 표시 — */}
              <div className="inbound-info__field-row">
                <div className="inbound-info__field-label">규격</div>
                <div className="inbound-info__field-value">
                  {currentItem.size}
                </div>
                <div className="inbound-info__field-label">{currentDateType}</div>
                <div className="inbound-info__field-value inbound-info__field-value--expiration">
                  {currentDateValue.trim() === "" ? "-" : currentDateValue}
                </div>
              </div>

              {/* — “바코드” / “상품분류” 표시 — */}
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

              {/* — “출발지” / “도착지” 표시 — */}
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

            {/* ─── 2) 날짜 입력 섹션 ─────────────────────────────────── */}
            <div className="inbound-info__date-section">
              <label className="inbound-info__date-label">
                날짜 입력<span className="inbound-info__required">*</span>
              </label>

              {/* (1) 날짜 종류 선택: 유통기한 OR 제조일자 */}
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

              {/* (2) 연/월/일 다이얼 세 개: 년, 월, 일 각각 선택 가능 */}
              <div className="inbound-info__date-pickers">
                {/* 년도: 2020~2030 (예시) */}
                <select
                  className="inbound-info__select inbound-info__select--year"
                  value={currentDateValue.slice(0, 4) || ""}
                  onChange={(e) => {
                    const y = e.target.value; // “YYYY”
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

                {/* 월: 01~12 */}
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

                {/* 일: 01~31 (간단히 1~31 고정) */}
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

                {/* (3) 날짜를 다시 선택하거나, 빈 상태로 되돌리기 위한 버튼 */}
                {currentDateValue && (
                  <button
                    className="inbound-info__clear-date-btn"
                    onClick={() => {
                      handleDateChange(currentIndex, "");
                    }}
                    title="날짜 초기화"
                  >
                    ✖️
                  </button>
                )}
              </div>
            </div>

            {/* ─── 3) 입고 수량 입력 섹션 ─────────────────────────────────── */}
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

            {/* ─── 4) 페이지 네비게이션 (이전 / 다음) ─────────────────────── */}
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

      {/* — Footer — */}
      <footer className="warehouse__footer">
        <Link
          to={`/warehouses/${whId}/inbound/${sId}`}
          className="warehouse__back-btn"
        >
          ← 입고 스캔
        </Link>
        <button
          className="warehouse__next-btn"
          onClick={() => {
            alert("입고 정보가 저장되었습니다.");
          }}
          disabled={!isSubmitEnabled}  /* 날짜 입력 & 수량 >0 이어야 활성화 */
        >
          물품 검토 →
        </button>
      </footer>
    </div>
  );
}
