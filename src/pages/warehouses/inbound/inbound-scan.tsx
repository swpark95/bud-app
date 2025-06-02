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
  // ─── 훅 선언부 ───────────────────────────────────────────────────────
  // 1) 구글 시트에서 로드된 상품 데이터
  const [googleProducts, setGoogleProducts] = useState<ProductRow[]>([]);
  const [loadingSheet, setLoadingSheet] = useState<boolean>(true);

  // 2) 스캔된 항목 목록
  const [scannedItems, setScannedItems] = useState<ScannedItem[]>(INITIAL_SCANNED_ITEMS);

  // 3) 스캔 일시정지 토글
  const [pauseScan, setPauseScan] = useState<boolean>(false);

  // 4) URL 파라미터: whId (창고 ID)와 sId (출발지 ID)
  const { whId, sId } = useParams<"whId" | "sId">();

  // 5) 참조(ref)에 상태를 저장해 두면, 콜백 안에서도 최신 값을 참조할 수 있음
  const pauseRef = useRef<boolean>(pauseScan);
  const itemsRef = useRef<ScannedItem[]>(scannedItems);

  useEffect(() => {
    pauseRef.current = pauseScan;
  }, [pauseScan]);
  useEffect(() => {
    itemsRef.current = scannedItems;
  }, [scannedItems]);

  // 6) URL 파라미터 sId에서 “출발지 라벨” 찾기
  //    (SOURCES 배열에서 id === sId인 항목의 label)
  const sourceLabel =
    SOURCES.find((src) => src.id === sId)?.label || sId || "출발지";

  // ─── 상품 데이터(CSV) 파싱 ─────────────────────────────────────────────────
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
  // ────────────────────────────────────────────────────────────────────────
  

  // 7) 바코드 인식 성공 시 호출되는 콜백
  const handleDetected = useCallback(
    (barcodeText: string) => {
      // 7-1) 스캔 일시정지 중이면 무시
      if (pauseRef.current) return;

      // 7-2) 아직 시트 파싱 중이거나 데이터가 없다면 무시
      if (loadingSheet || googleProducts.length === 0) return;

      const trimmed = barcodeText.trim();

      // 7-3) 중복 스캔 방지 (ref를 통해 최신 scannedItems 확인)
      if (itemsRef.current.find((it) => it.barcode === trimmed)) {
        pauseRef.current = true;
        setPauseScan(true);
        alert(`이미 스캔된 바코드입니다: ${trimmed}`);
        setTimeout(() => {
          pauseRef.current = false;
          setPauseScan(false);
        }, 1000);
        return;
      }

      // 7-4) 구글 시트 데이터에서 매칭
      const found = googleProducts.find((prod) => {
        const prodBarcode = prod.바코드 ?? "";
        return prodBarcode.trim() === trimmed;
      });
      if (!found) {
        pauseRef.current = true;
        setPauseScan(true);
        alert(`스프레드시트에 등록되지 않은 바코드입니다: ${trimmed}`);
        setTimeout(() => {
          pauseRef.current = false;
          setPauseScan(false);
        }, 1000);
        return;
      }

      // 7-5) 매칭되었다면 새 항목 추가
      const warehouseLabel = WAREHOUSES.find((w) => w.id === whId)?.label ?? whId ?? "";

      const newItem: ScannedItem = {
        id:       (found.ID ?? "").trim(),
        name:     (found.상품명 ?? "").trim(),
        stock:    (found.현재고 ?? "").trim(),
        size:     (found.규격 ?? "").trim(),
        barcode:  (found.바코드 ?? "").trim(),
        category: (found.카테고리 ?? "").trim(),
        source:   sourceLabel,    // “출발지” 라벨
        dest:     warehouseLabel, // “도착지” 라벨: 해당 창고의 이름
      };

      setScannedItems((prev) => {
        const updated = [newItem, ...prev];
        itemsRef.current = updated;
        return updated;
      });

      // 7-6) 정상 스캔 후 1초 일시정지
      pauseRef.current = true;
      setPauseScan(true);
      setTimeout(() => {
        pauseRef.current = false;
        setPauseScan(false);
      }, 1000);
    },
    [googleProducts, loadingSheet, sourceLabel, whId]
  );

  const handleError = useCallback((err: Error) => {
    // IndexSizeError 등 무시할 에러가 있으면 처리
    if (err.name === "IndexSizeError") return;
    console.error("[InboundScan] 스캔 에러:", err);
  }, []);

  // 8) 삭제 버튼 클릭 시
  const handleRemove = (idToRemove: string) => {
    setScannedItems((prev) => {
      const updated = removeScannedItemById(prev, idToRemove);
      itemsRef.current = updated;
      return updated;
    });
  };

  // ─── 잘못된 whId 처리 ─────────────────────────────────────────────────────
  const warehouse = WAREHOUSES.find((w) => w.id === whId);
  if (!warehouse) {
    return <Navigate to="/warehouses" replace />;
  }
  // ────────────────────────────────────────────────────────────────────────

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

      {/* — 구글 시트 로딩 상태 표시 — */}
      <div style={{ padding: "0 16px 8px" }}>
        {loadingSheet && <p>스프레드시트 데이터 불러오는 중…</p>}
        {!loadingSheet && (
          <p>총 상품 개수: {googleProducts.length}개</p>
        )}
      </div>

      {/* — Main Content — */}
      <div className="inbound-scan__content">
        {/* 1) 카메라 영역 */}
        <div className="inbound-scan__camera">
          {/* 실제 비디오(카메라) */}
          <div className="barcode-scanner__wrapper">
            <BarcodeScanner
              onDetected={handleDetected}
              onError={handleError}
            />
          </div>

          {/* 2) 반투명 마스크(화면 전체를 어둡게, 중앙만 뚫음) */}
          <div className="scan-mask"></div>

          {/* 3) 노란색 사각형 테두리 */}
          <div className="scan-border"></div>
        </div>

        {/* 2) 스캔된 항목 리스트 */}
        <div className="inbound-scan__scanned">
          <div className="inbound-scan__scanned-header">
            <span className="inbound-scan__scanned-title">스캔된 항목</span>
            <Link
              to={`/warehouses/${whId}/inbound`}
              className="inbound-scan__add-manual"
            >
              + 직접 추가하기
            </Link>
          </div>

          {/* — 테이블 헤더 — */}
          <div className="inbound-scan__table-header">
            <div className="inbound-scan__column inbound-scan__column--icon"></div>
            <div className="inbound-scan__column inbound-scan__column--no">번호</div>
            <div className="inbound-scan__column inbound-scan__column--name">물품명</div>
            <div className="inbound-scan__column inbound-scan__column--current">현재고</div>
            <div className="inbound-scan__column inbound-scan__column--size">규격</div>
            <div className="inbound-scan__column inbound-scan__column--barcode">바코드</div>
            <div className="inbound-scan__column inbound-scan__column--category">카테고리</div>
            <div className="inbound-scan__column inbound-scan__column--source">출발지</div>
            <div className="inbound-scan__column inbound-scan__column--dest">도착지</div>
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
          state={{ scannedItems}}
        >
          입고 정보 입력 →
        </Link>
      </footer>
    </div>
  );
}
