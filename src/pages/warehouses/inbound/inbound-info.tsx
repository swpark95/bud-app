// src/pages/warehouses/inbound/inbound-info.tsx
import React, { useState, useEffect, useMemo } from "react";
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
  ResultItem,
  LocationState,
} from "../../../constants/warehouses";
import { db } from "../../../firebaseApp";
import { collection, query, where, getDocs } from "firebase/firestore";

export default function InboundInfo() {
  // Hooks must always be at top
  const { whId, sId } = useParams<"whId" | "sId">();
  const location = useLocation();
  const navigate = useNavigate();

  // Extract state
  const state = (location.state as LocationState) || {};

  // Memoize scannedItems to stabilize reference
  const scannedItems = useMemo<ScannedItem[]>(
    () => state.scannedItems || [],
    [state.scannedItems]
  );

  // Date type and values
  const [selectedDate, setSelectedDate] = useState<("유통기한" | "제조일자")[]>(
    () =>
      state.selectedDate?.length === scannedItems.length
        ? [...state.selectedDate!]
        : Array(scannedItems.length).fill("유통기한")
  );
  const [expirationDate, setExpirationDate] = useState<string[]>(() =>
    state.expirationDate?.length === scannedItems.length
      ? [...state.expirationDate!]
      : Array(scannedItems.length).fill("")
  );
  const [manufactureDate, setManufactureDate] = useState<string[]>(() =>
    state.manufactureDate?.length === scannedItems.length
      ? [...state.manufactureDate!]
      : Array(scannedItems.length).fill("")
  );

  // Input quantities
  const [quantity, setQuantity] = useState<number[]>(() =>
    state.quantity?.length === scannedItems.length
      ? [...state.quantity!]
      : Array(scannedItems.length).fill(0)
  );

  const [currentIndex, setCurrentIndex] = useState<number>(0);

  // Store grouped stock sums
  const [groupStockList, setGroupStockList] = useState<number[]>(() =>
    Array(scannedItems.length).fill(0)
  );

  // Fetch child sums when any key prop changes
  useEffect(() => {
    if (scannedItems.length === 0) return;

    const idx = currentIndex;
    const item = scannedItems[idx];
    const dateType = selectedDate[idx];
    const dateValue =
      dateType === "유통기한" ? expirationDate[idx] : manufactureDate[idx];

    if (!dateValue) {
      setGroupStockList((prev) => {
        const copy = [...prev];
        copy[idx] = 0;
        return copy;
      });
      return;
    }

    const fetchSum = async () => {
      const colRef = collection(db, "childitem");
      const q = query(
        colRef,
        where("warehouseId", "==", whId),
        where("barcode", "==", item.barcode),
        where(
          dateType === "유통기한" ? "expirationDate" : "manufactureDate",
          "==",
          dateValue
        )
      );
      const snapshot = await getDocs(q);
      const sum = snapshot.docs.reduce((acc, doc) => {
        const data = doc.data();
        return acc + (data.quantity || 0);
      }, 0);
      setGroupStockList((prev) => {
        const copy = [...prev];
        copy[idx] = sum;
        return copy;
      });
    };
    fetchSum();
  }, [
    currentIndex,
    selectedDate,
    expirationDate,
    manufactureDate,
    scannedItems,
    whId,
  ]);

  // Validate warehouse
  const warehouse = WAREHOUSES.find((w) => w.id === whId);
  if (!warehouse) return <Navigate to="/warehouses" replace />;
  const sourceLabel = SOURCES.find((src) => src.id === sId)?.label || sId!;

  // Handlers for navigation
  const goPrev = () => setCurrentIndex((i) => Math.max(0, i - 1));
  const goNext = () =>
    setCurrentIndex((i) => Math.min(scannedItems.length - 1, i + 1));

  const handleReviewClick = () => {
    const resultItems: ResultItem[] = scannedItems.map((item, i) => ({
      ...item,
      expirationDate: selectedDate[i] === "유통기한" ? expirationDate[i] : "",
      manufactureDate: selectedDate[i] === "제조일자" ? manufactureDate[i] : "",
      quantity: quantity[i],
    }));
    navigate(`/warehouses/${whId}/inbound/${sId}/info/result`, {
      state: {
        scannedItems: resultItems,
        selectedDate,
        expirationDate,
        manufactureDate,
        quantity,
      },
    });
  };

  // Compute UI values
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
  const baseStock = groupStockList[currentIndex] || 0;
  const addedQty = quantity[currentIndex] || 0;
  const displayedStock = baseStock + addedQty;
  const lastIdx = scannedItems.length - 1;
  const isLastValid =
    scannedItems.length > 0 &&
    (selectedDate[lastIdx] === "유통기한"
      ? expirationDate[lastIdx]
      : manufactureDate[lastIdx]) !== "" &&
    quantity[lastIdx] > 0;

  return (
    <div className="inbound-info">
      <header className="warehouse__header">
        <h1 className="warehouse__title">{warehouse.label} / 입고 정보</h1>
        <Link to="/warehouses" className="warehouse__restart-btn">
          앱 재시작
        </Link>
      </header>
      <div className="inbound-info__content">
        {scannedItems.length === 0 ? (
          <div className="inbound-info__empty">스캔된 물품이 없습니다.</div>
        ) : (
          <>
            {/* 상세 UI 구현: 카드, 필드, 날짜 선택, 수량 버튼, 페이지네이션 */}
            {/* 물품 정보 카드 */}
            <div className="inbound-info__card">
              <div>
                물품 {currentIndex + 1} / {scannedItems.length}
              </div>
              <div>이름: {currentItem.name}</div>
              <div>현재고: {displayedStock}</div>
              <div>규격: {currentItem.size}</div>
              <div>바코드: {currentItem.barcode}</div>
              <div>분류: {currentItem.category}</div>
              <div>출발: {currentItem.source}</div>
              <div>도착: {warehouse.label}</div>
            </div>
            {/* 날짜 & 수량 */}
            <div className="inbound-info__controls">
              {/* 날짜 타입 & 값 */}
              <div>
                <label>
                  <input
                    type="radio"
                    checked={selectedDate[currentIndex] === "유통기한"}
                    onChange={() =>
                      setSelectedDate((sd) =>
                        sd.map((v, i) => (i === currentIndex ? "유통기한" : v))
                      )
                    }
                  />{" "}
                  유통기한
                </label>
                <label>
                  <input
                    type="radio"
                    checked={selectedDate[currentIndex] === "제조일자"}
                    onChange={() =>
                      setSelectedDate((sd) =>
                        sd.map((v, i) => (i === currentIndex ? "제조일자" : v))
                      )
                    }
                  />{" "}
                  제조일자
                </label>
                <input
                  type="date"
                  value={
                    selectedDate[currentIndex] === "유통기한"
                      ? expirationDate[currentIndex]
                      : manufactureDate[currentIndex]
                  }
                  onChange={(e) => {
                    const val = e.target.value;
                    if (selectedDate[currentIndex] === "유통기한")
                      setExpirationDate((ed) =>
                        ed.map((v, i) => (i === currentIndex ? val : v))
                      );
                    else
                      setManufactureDate((md) =>
                        md.map((v, i) => (i === currentIndex ? val : v))
                      );
                  }}
                />
              </div>
              {/* 수량 조정 */}
              <div>
                <button
                  onClick={() =>
                    setQuantity((q) =>
                      q.map((v, i) =>
                        i === currentIndex ? Math.max(0, v - 1) : v
                      )
                    )
                  }
                >
                  -
                </button>
                <span>{quantity[currentIndex]}</span>
                <button
                  onClick={() =>
                    setQuantity((q) =>
                      q.map((v, i) => (i === currentIndex ? v + 1 : v))
                    )
                  }
                >
                  +
                </button>
              </div>
              {/* 페이지네이션 */}
              <div>
                <button onClick={goPrev} disabled={currentIndex === 0}>
                  ←
                </button>
                <button
                  onClick={goNext}
                  disabled={currentIndex === scannedItems.length - 1}
                >
                  →
                </button>
              </div>
            </div>
            {/* 다음 버튼 */}
            <button
              className="warehouse__next-btn"
              onClick={handleReviewClick}
              disabled={!isLastValid}
            >
              물품 검토 →
            </button>
          </>
        )}
      </div>
    </div>
  );
}
