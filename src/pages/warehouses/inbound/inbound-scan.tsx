// src/pages/warehouses/inbound/inbound-scan.tsx
import React, { useState, useEffect, useCallback, useRef } from "react";
import { useParams, Navigate, useNavigate, Link } from "react-router-dom";
import { db } from "../../../firebaseApp";
import { collection, query, onSnapshot } from "firebase/firestore";
import {
  WAREHOUSES,
  SOURCES,
  ScannedItem,
  ParentItem,
  removeScannedItemById,
} from "../../../constants/warehouses";
import BarcodeScanner, { BarcodeScannerHandle } from "../barcodescanner";
import AddManual from "../addmanual";

export default function InboundScan() {
  const { whId, sId } = useParams<"whId" | "sId">();
  const navigate = useNavigate();

  // 기존 재고 요약 불러오기
  const [parentItem, setSummaryItems] = useState<ParentItem[]>([]);
  const [loadingSummary, setLoadingSummary] = useState<boolean>(true);
  useEffect(() => {
    if (!whId) return;
    setLoadingSummary(true);
    const q = query(collection(db, "parentitem"));
    const unsub = onSnapshot(
      q,
      (snap) => {
        console.log("[InboundScan] snapshot docs:", snap.docs.length);
        setSummaryItems(snap.docs.map((doc) => doc.data() as ParentItem));
        setLoadingSummary(false);
      },
      (err) => {
        console.error("[InboundScan] snapshot error:", err);
        setLoadingSummary(false);
      }
    );
    return () => unsub();
  }, [whId]);
  console.log("whId:", whId);
  // 스캔된 항목
  const [scannedItems, setScannedItems] = useState<ScannedItem[]>([]);
  const sourceLabel =
    SOURCES.find((src) => src.id === sId)?.label || sId || "출발지";

  const [showScanner, setShowScanner] = useState(false);
  const pauseRef = useRef(false);
  useEffect(() => {
    pauseRef.current = false;
  }, []);
  const scannerRef = useRef<BarcodeScannerHandle>(null);

  const [showManual, setShowManual] = useState(false);
  const handleAddManual = useCallback((item: ScannedItem) => {
    setScannedItems((prev) => [item, ...prev]);
    setShowManual(false);
  }, []);

  const handleDetected = useCallback(
    (barcodeText: string) => {
      if (pauseRef.current) return;
      const clean = barcodeText.trim().replace(/[^\d]/g, ""); // ← 수정된 정규식

      // 중복 검사
      if (scannedItems.some((it) => it.barcode === clean)) {
        alert(`이미 추가된 바코드입니다: ${clean}`);
        scannerRef.current?.stop();
        setShowScanner(false);
        return;
      }

      // 요약 재고에 있는지 확인
      const found = parentItem.find((it) => it.barcode === clean);
      if (!found) {
        alert(`존재하지 않는 제품 바코드입니다: ${clean}`);
        scannerRef.current?.stop();
        setShowScanner(false);
        return;
      }

      const warehouseLabel = WAREHOUSES.find((w) => w.id === whId)?.label || "";
      const newItem: ScannedItem = {
        name: found.name,
        stock: found.stock || "",
        size: found.size || "",
        barcode: found.barcode,
        category: found.category || "",
        source: sourceLabel,
        dest: warehouseLabel,
      };
      setScannedItems((prev) => [newItem, ...prev]);
      scannerRef.current?.stop();
      setShowScanner(false);
    },
    [parentItem, scannedItems, sourceLabel, whId]
  );

  const handleError = useCallback((err: Error) => {
    console.error("[InboundScan] 스캔 에러:", err);
  }, []);

  const handleRemove = (id: string) => {
    setScannedItems((prev) => removeScannedItemById(prev, id));
  };
  const confirmRemove = (name: string) => {
    if (window.confirm(`'${name}' 제거하시겠습니까?`)) {
      handleRemove(name);
    }
  };

  const warehouse = WAREHOUSES.find((w) => w.id === whId);
  if (!warehouse) return <Navigate to="/warehouses" replace />;

  const toggleScanner = () => {
    if (showScanner) {
      scannerRef.current?.stop();
      setShowScanner(false);
    } else {
      setShowScanner(true);
    }
  };

  const handleBackClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (
      scannedItems.length &&
      !window.confirm("지금 나가시면 스캔 데이터가 삭제됩니다. 계속?")
    ) {
      return;
    }
    navigate(`/warehouses/${whId}/inbound`);
  };

  return (
    <div className="inbound-scan">
      <header className="warehouse__header">
        <h1 className="warehouse__title">{warehouse.label} / 입고 스캔</h1>
        <Link to="/warehouses" className="warehouse__restart-btn">
          앱 재시작
        </Link>
      </header>
      <div className="inbound-scan__content">
        <div>
          {loadingSummary ? (
            <p>데이터 불러오는 중…</p>
          ) : (
            <p>총 상품 개수: {parentItem.length}개</p>
          )}
        </div>
        <button
          onClick={toggleScanner}
          style={{
            marginBottom: "8px",
            padding: "8px 12px",
            fontSize: "16px",
            backgroundColor: "#377fd3",
            color: "#fff",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
          }}
        >
          {showScanner ? "스캔 닫기" : "바코드 스캔 열기"}
        </button>

        {showScanner && (
          <div className="inbound-scan__camera">
            <BarcodeScanner
              ref={scannerRef}
              onDetected={handleDetected}
              onError={handleError}
              fallbackToFrontCameraForTest={true}
            />
          </div>
        )}

        <div className="inbound-scan__scanned">
          <div className="inbound-scan__scanned-header">
            <span className="inbound-scan__scanned-title">스캔된 항목</span>
            <span
              className="add-manual"
              style={{ cursor: "pointer", color: "#377fd3" }}
              onClick={() => setShowManual(true)}
            >
              + 직접 추가하기
            </span>
          </div>
          <div className="inbound-scan__table-wrapper">
            <div className="inbound-scan__table">
              <div className="inbound-scan__table-header">
                <div className="inbound-scan__column inbound-scan__column--icon"></div>
                <div className="inbound-scan__column inbound-scan__column--no">
                  번호
                </div>
                <div className="inbound-scan__column inbound-scan__column--name">
                  상품명
                </div>
                <div className="inbound-scan__column inbound-scan__column--current">
                  현재고
                </div>
                <div className="inbound-scan__column inbound-scan__column--size">
                  규격
                </div>
                <div className="inbound-scan__column inbound-scan__column--barcode">
                  바코드
                </div>
                <div className="inbound-scan__column inbound-scan__column--category">
                  카테고리
                </div>
                <div className="inbound-scan__column inbound-scan__column--source">
                  출발지
                </div>
                <div className="inbound-scan__column inbound-scan__column--dest">
                  도착지
                </div>
              </div>
              {scannedItems.length === 0 ? (
                <div className="inbound-scan__empty-message-wrapper">
                  <div className="inbound-scan__empty-message">
                    아직 스캔된 항목이 없습니다.
                  </div>
                </div>
              ) : (
                scannedItems.map((item, idx) => (
                  <div
                    key={item.barcode || `${item.name}-${idx}`}
                    className="inbound-scan__row"
                  >
                    <div className="inbound-scan__cell inbound-scan__cell--icon">
                      <span
                        onClick={() => confirmRemove(item.name)}
                        style={{ cursor: "pointer" }}
                      >
                        🗑️
                      </span>
                    </div>
                    <div className="inbound-scan__cell inbound-scan__cell--no">
                      {idx + 1}
                    </div>
                    <div className="inbound-scan__cell inbound-scan__cell--name">
                      {item.name}
                    </div>
                    <div className="inbound-scan__cell">{item.stock}</div>
                    <div className="inbound-scan__cell">{item.size}</div>
                    <div className="inbound-scan__cell">{item.barcode}</div>
                    <div className="inbound-scan__cell">{item.category}</div>
                    <div className="inbound-scan__cell">{item.source}</div>
                    <div className="inbound-scan__cell">{item.dest}</div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      <AddManual
        visible={showManual}
        onClose={() => setShowManual(false)}
        onAdd={handleAddManual}
        sourceLabel={sourceLabel}
        destLabel={warehouse.label}
        parentItem={parentItem}
      />

      <footer className="warehouse__footer">
        <button onClick={handleBackClick} className="warehouse__back-btn">
          ← 출발지 목록
        </button>
        <Link
          to={`/warehouses/${whId}/inbound/${sId}/info`}
          className="warehouse__next-btn"
          state={{ scannedItems }}
        >
          입고 정보 입력 →
        </Link>
      </footer>
    </div>
  );
}
