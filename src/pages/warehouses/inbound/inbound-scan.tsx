// src/pages/warehouses/inbound-scan.tsx

import React, { useState, useEffect, useCallback, useRef } from "react";
import { useParams, Navigate, Link } from "react-router-dom";
import Papa from "papaparse";
import {
  WAREHOUSES,
  SOURCES,
  ScannedItem,
  INITIAL_SCANNED_ITEMS,
  removeScannedItemById,
} from "../../../constants/warehouses";
import BarcodeScanner from "../barcodescanner";

interface ProductRow {
  ID: string;
  상품명: string;
  현재고: string;
  유통기한: string;
  제조일자: string;
  규격: string;
  바코드: string;
  카테고리: string;
}

export default function InboundScan() {
  const { whId, sId } = useParams<"whId" | "sId">();

  // 1) 상품 데이터
  const [googleProducts, setGoogleProducts] = useState<ProductRow[]>([]);
  const [loadingSheet, setLoadingSheet] = useState<boolean>(true);

  // 2) 스캔된 항목 목록
  const [scannedItems, setScannedItems] = useState<ScannedItem[]>(
    INITIAL_SCANNED_ITEMS
  );

  // 3) 출발지 라벨
  const sourceLabel =
    SOURCES.find((src) => src.id === sId)?.label || sId || "출발지";

  // 4) 스캐너 표시 여부
  const [showScanner, setShowScanner] = useState<boolean>(false);

  // 5) 스캔 일시정지 플래그
  const pauseRef = useRef<boolean>(false);
  useEffect(() => {
    pauseRef.current = false;
  }, []);

  // ─── 상품 데이터(CSV) 파싱 ─────────────────────────
  useEffect(() => {
    const csvUrl =
      "https://docs.google.com/spreadsheets/d/e/2PACX-1vRLnytTHTeCyJyQTKSC82h7zji6PqCPmG2gz-0-gvYFeop-iEhvFXnwi-EOGHQJyVqhlIbneHLTUinL/pub?gid=0&single=true&output=csv";

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
  }, []);

  // ─── 바코드 감지 시 호출 ───────────────────────────────
  const handleDetected = useCallback(
    (barcodeText: string) => {
      if (pauseRef.current) return;
      if (loadingSheet || googleProducts.length === 0) return;

      const trimmed = barcodeText.trim();

      if (scannedItems.find((it) => it.barcode === trimmed)) {
        alert(`이미 추가된 바코드입니다: ${trimmed}`);
        return;
      }

      const found = googleProducts.find((prod) => {
        const prodBarcode = prod.바코드 ?? "";
        return prodBarcode.trim() === trimmed;
      });
      if (!found) {
        alert(`스프레드시트에 등록되지 않은 바코드입니다: ${trimmed}`);
        return;
      }

      const warehouseLabel =
        WAREHOUSES.find((w) => w.id === whId)?.label ?? whId ?? "";

      const newItem: ScannedItem = {
        id: (found.ID ?? "").trim(),
        name: (found.상품명 ?? "").trim(),
        stock: (found.현재고 ?? "").trim(),
        size: (found.규격 ?? "").trim(),
        barcode: (found.바코드 ?? "").trim(),
        category: (found.카테고리 ?? "").trim(),
        source: sourceLabel,
        dest: warehouseLabel,
      };

      setScannedItems((prev) => [newItem, ...prev]);
      setShowScanner(false);

      pauseRef.current = true;
      setTimeout(() => {
        pauseRef.current = false;
      }, 1000);
    },
    [googleProducts, loadingSheet, scannedItems, sourceLabel, whId]
  );

  const handleError = useCallback((err: Error) => {
    console.error("[InboundScan] 스캔 에러:", err);
  }, []);

  // 6) 삭제 버튼
  const handleRemove = (idToRemove: string) => {
    setScannedItems((prev) => removeScannedItemById(prev, idToRemove));
  };

  // ─── 잘못된 whId 처리 ─────────────────────────────────
  const warehouse = WAREHOUSES.find((w) => w.id === whId);
  if (!warehouse) {
    return <Navigate to="/warehouses" replace />;
  }

  return (
    <div className="inbound-scan">
      {/* — Header — */}
      <header className="warehouse__header">
        <h1 className="warehouse__title">
          {warehouse.label} / 입고 스캔
        </h1>
        <Link to="/warehouses" className="warehouse__restart-btn">
          앱 재시작
        </Link>
      </header>

      {/* — 구글 시트 로딩 상태 — */}
      <div style={{ padding: "0 16px 8px" }}>
        {loadingSheet && <p>스프레드시트 데이터 불러오는 중…</p>}
        {!loadingSheet && (
          <p>총 상품 개수: {googleProducts.length}개</p>
        )}
      </div>

      {/* — Main Content — */}
      <div className="inbound-scan__content">
        {/* 1) 바코드 스캔 토글 버튼 */}
        <button
          onClick={() => setShowScanner((prev) => !prev)}
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

        {/* 2) 카메라 영역 (showScanner가 true일 때만) */}
        {showScanner && (
          <div className="inbound-scan__camera">
            <BarcodeScanner
              onDetected={handleDetected}
              onError={handleError}
            />
          </div>
        )}

        {/* 3) 스캔된 항목 리스트 */}
        <div className="inbound-scan__scanned">
          <div className="inbound-scan__scanned-header">
            <span className="inbound-scan__scanned-title">
              스캔된 항목
            </span>
            <span
              className="inbound-scan__add-manual"
              style={{ cursor: "default", color: "#999" }}
            >
              + 직접 추가하기
            </span>
          </div>

          {/* — 테이블 헤더 — */}
          <div className="inbound-scan__table-header">
            <div className="inbound-scan__column inbound-scan__column--icon"></div>
            <div className="inbound-scan__column inbound-scan__column--no">
              번호
            </div>
            <div className="inbound-scan__column inbound-scan__column--name">
              물품명
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

          {/* — 테이블 바디 — */}
          <div className="inbound-scan__table-body">
            {scannedItems.length === 0 ? (
              <div
                style={{
                  textAlign: "center",
                  padding: "16px",
                  color: "#666",
                }}
              >
                아직 스캔된 항목이 없습니다.
              </div>
            ) : (
              scannedItems.map((item, idx) => (
                <div key={item.id} className="inbound-scan__row">
                  {/* 휴지통 아이콘 */}
                  <div className="inbound-scan__cell inbound-scan__cell--icon">
                    <span
                      className="inbound-scan__icon"
                      onClick={() => handleRemove(item.id)}
                    >
                      🗑️
                    </span>
                  </div>

                  {/* 번호 */}
                  <div className="inbound-scan__cell inbound-scan__cell--no">
                    {idx + 1}
                  </div>

                  {/* 물품명 */}
                  <div className="inbound-scan__cell inbound-scan__cell--name">
                    {item.name}
                  </div>

                  {/* 현재고 */}
                  <div className="inbound-scan__cell inbound-scan__cell--current">
                    {item.stock}
                  </div>

                  {/* 규격 */}
                  <div className="inbound-scan__cell inbound-scan__cell--size">
                    {item.size}
                  </div>

                  {/* 바코드 */}
                  <div className="inbound-scan__cell inbound-scan__cell--barcode">
                    {item.barcode}
                  </div>

                  {/* 카테고리 */}
                  <div className="inbound-scan__cell inbound-scan__cell--category">
                    {item.category}
                  </div>

                  {/* 출발지 */}
                  <div className="inbound-scan__cell inbound-scan__cell--source">
                    {item.source}
                  </div>

                  {/* 도착지 */}
                  <div className="inbound-scan__cell inbound-scan__cell--dest">
                    {item.dest}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* — Footer — */}
      <footer className="warehouse__footer">
        <Link
          to={`/warehouses/${whId}/inbound`}
          className="warehouse__back-btn"
        >
          ← 출발지 목록
        </Link>
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
