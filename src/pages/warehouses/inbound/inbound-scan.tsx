// src/pages/warehouses/inbound-scan.tsx

import React, { useState, useEffect, useCallback, useRef } from "react";
import { useParams, Navigate, useNavigate, Link } from "react-router-dom";
import Papa from "papaparse";
import {
  WAREHOUSES,
  SOURCES,
  ScannedItem,
  INITIAL_SCANNED_ITEMS,
  removeScannedItemById,
  ProductRow,
} from "../../../constants/warehouses";
import BarcodeScanner, { BarcodeScannerHandle } from "../barcodescanner";
import AddManual from "../addmanual";

export default function InboundScan() {
  const { whId, sId } = useParams<"whId" | "sId">();
  const navigate = useNavigate();

  const [googleProducts, setGoogleProducts] = useState<ProductRow[]>([]);
  const [loadingSheet, setLoadingSheet] = useState<boolean>(true);
  const [reloadKey, setReloadKey] = useState<number>(0);
  const [scannedItems, setScannedItems] = useState<ScannedItem[]>(
    INITIAL_SCANNED_ITEMS
  );

  const sourceLabel =
    SOURCES.find((src) => src.id === sId)?.label || sId || "출발지";

  const [showScanner, setShowScanner] = useState<boolean>(false);
  const pauseRef = useRef<boolean>(false);
  useEffect(() => {
    pauseRef.current = false;
  }, []);
  const scannerRef = useRef<BarcodeScannerHandle>(null);

  const [showManual, setShowManual] = useState(false);
  const handleAddManual = useCallback((item: ScannedItem) => {
    setScannedItems((prev) => [item, ...prev]);
    setShowManual(false);
    setReloadKey((k) => k + 1);
  }, []);

  useEffect(() => {
    const csvUrl = `https://docs.google.com/spreadsheets/d/e/2PACX-1vRLnytTHTeCyJyQTKSC82h7zji6PqCPmG2gz-0-gvYFeop-iEhvFXnwi-EOGHQJyVqhlIbneHLTUinL/pub?gid=0&single=true&output=csv&t=${Date.now()}`;
    setLoadingSheet(true);
    Papa.parse<ProductRow>(csvUrl, {
      download: true,
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        setGoogleProducts(results.data);
        setLoadingSheet(false);
      },
      error: () => {
        setLoadingSheet(false);
      },
    });
  }, [reloadKey]);

  const handleDetected = useCallback(
    (barcodeText: string) => {
      if (pauseRef.current) return;
      if (loadingSheet || googleProducts.length === 0) return;

      const rawScanned = barcodeText.trim();
      const cleanScanned = rawScanned.replace(/[^\d]/g, "");

      if (scannedItems.find((it) => it.barcode === cleanScanned)) {
        alert(`이미 추가된 바코드입니다: ${cleanScanned}`);
        scannerRef.current?.stop();
        setShowScanner(false);
        return;
      }

      const found = googleProducts.find((prod) => {
        const rawProd = (prod.바코드 ?? "").trim();
        const cleanProd = rawProd.replace(/[^\d]/g, "");
        return cleanProd === cleanScanned;
      });

      if (!found) {
        alert(`스프레드시트에 등록되지 않은 바코드입니다: ${cleanScanned}`);
        scannerRef.current?.stop();
        setShowScanner(false);
        return;
      }

      const warehouseLabel =
        WAREHOUSES.find((w) => w.id === whId)?.label ?? whId ?? "";

      const newItem: ScannedItem = {
        id: (found.ID ?? "").trim(),
        name: (found.상품명 ?? "").trim(),
        stock: (found.현재고 ?? "").trim(),
        size: (found.규격 ?? "").trim(),
        barcode: cleanScanned,
        category: (found.카테고리 ?? "").trim(),
        source: sourceLabel,
        dest: warehouseLabel,
      };

      setScannedItems((prev) => [newItem, ...prev]);
      scannerRef.current?.stop();
      setShowScanner(false);
    },
    [googleProducts, loadingSheet, scannedItems, sourceLabel, whId]
  );

  const handleError = useCallback((err: Error) => {
    console.error("[InboundScan] 스캔 에러:", err);
  }, []);

  const handleRemove = (idToRemove: string) => {
    setScannedItems((prev) => removeScannedItemById(prev, idToRemove));
  };

  const confirmRemove = (idToRemove: string, itemName: string) => {
    const message = `'${itemName}'\n해당 물품이 목록에서 제거됩니다.\n계속하시겠습니까?`;
    if (window.confirm(message)) {
      handleRemove(idToRemove);
    }
  };

  const warehouse = WAREHOUSES.find((w) => w.id === whId);
  if (!warehouse) {
    return <Navigate to="/warehouses" replace />;
  }

  const warehouseLabel = warehouse.label;

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
    if (scannedItems.length > 0) {
      const message =
        "현재까지 스캔한 정보가 저장되지 않았습니다.\n" +
        "이 페이지를 벗어나면 스캔한 물품이 모두 삭제됩니다.\n" +
        "그래도 나가시겠습니까?";
      if (window.confirm(message)) {
        navigate(`/warehouses/${whId}/inbound`);
      }
    } else {
      navigate(`/warehouses/${whId}/inbound`);
    }
  };

  const openManual = () => setShowManual(true);

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
          {loadingSheet ? (
            <p>스프레드시트 데이터 불러오는 중…</p>
          ) : (
            <p>총 상품 개수: {googleProducts.length}개</p>
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
              onClick={openManual}
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
                  <div key={`${item.id}-${idx}`} className="inbound-scan__row">
                    <div className="inbound-scan__cell inbound-scan__cell--icon">
                      <span
                        onClick={() => confirmRemove(item.id, item.name)}
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
        googleProducts={googleProducts}
        sourceLabel={sourceLabel}
        destLabel={warehouseLabel}
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
