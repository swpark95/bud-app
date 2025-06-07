// src/pages/warehouses/inbound-result.tsx

import React from "react";
import {
  useParams,
  Link,
  useLocation,
  useNavigate,
  Navigate,
} from "react-router-dom";
import { WAREHOUSES, ScannedItem } from "../../../constants/warehouses";

// ResultItem: ScannedItem에 유통기한, 제조일자, 수량 정보를 추가한 타입
interface ResultItem extends ScannedItem {
  expirationDate: string;
  manufactureDate: string;
  quantity: number;
}

// InboundInfo로부터 넘어올 때 받게 될 state 정의
interface LocationState {
  scannedItems: ResultItem[];
  expirationDateArray?: string[];
  manufactureDateArray?: string[];
  quantityArray?: number[];
}

export default function InboundResult() {
  const { whId, sId } = useParams<"whId" | "sId">();
  const location = useLocation();
  const navigate = useNavigate();

  const state = (location.state as LocationState) || null;
  const scannedItems = state?.scannedItems || [];
  const expirationDateArray = state?.expirationDateArray || [];
  const manufactureDateArray = state?.manufactureDateArray || [];
  const quantityArray = state?.quantityArray || [];

  const warehouse = WAREHOUSES.find((w) => w.id === whId);
  if (!warehouse) return <Navigate to="/warehouses" replace />;
  if (scannedItems.length === 0)
    return <Navigate to={`/warehouses/${whId}/inbound/${sId}`} replace />;

  // Apps Script 웹앱 배포 URL (doPost가 handle)
  const SCRIPT_URL =
    "https://script.google.com/macros/s/AKfycbygm9gZPiVR_CQgc02YvM9DEZvOHxeCGp9T0TGU93OM0q-3O5X_mkZD3sl9tdu6APx4vQ/exec";

  // 완료 버튼 클릭 시 실행될 함수 (hidden iframe + load 이벤트)
  const handleFinish = () => {
    const payload = JSON.stringify(
      scannedItems.map((item) => ({
        id: item.id,
        name: item.name,
        stock: item.stock,
        expirationDate: item.expirationDate,
        manufactureDate: item.manufactureDate,
        size: item.size,
        barcode: item.barcode,
        category: item.category,
        source: item.source,
        dest: warehouse.label,
        quantity: item.quantity,
      }))
    );

    // 1) 동적 form 생성
    const form = document.createElement("form");
    form.method = "POST";
    form.action = SCRIPT_URL;
    form.target = "hidden_iframe";

    // payload input 추가
    const inp = document.createElement("input");
    inp.type = "hidden";
    inp.name = "payload";
    inp.value = payload;
    form.appendChild(inp);

    document.body.appendChild(form);

    // 2) hidden iframe 찾기
    const iframe = document.querySelector<HTMLIFrameElement>(
      'iframe[name="hidden_iframe"]'
    )!;

    // 3) POST 요청이 끝나면 load 이벤트 발생 → 라우팅
    iframe.addEventListener("load", () => {
      document.body.removeChild(form);
      navigate("/warehouses");
    });

    // 4) 폼 제출
    form.submit();
  };

  // 테이블 헤더 텍스트 (10개 컬럼)
  const headerCols = [
    "번호",
    "제품명",
    "현재고",
    "유통기한",
    "제조일자",
    "규격",
    "바코드",
    "상품분류",
    "출발지",
    "도착지",
  ];

  return (
    <div className="inbound-result">
      {/* — Header — */}
      <header className="warehouse__header">
        <h1 className="warehouse__title">{warehouse.label} / 입고 결과</h1>
        <Link to="/warehouses" className="warehouse__restart-btn">
          앱 재시작
        </Link>
      </header>

      {/* — Content — */}
      <div className="inbound-result__content">
        <div className="inbound-result__scanned">
          <div className="inbound-result__scanned-header">
            <span className="inbound-result__scanned-title">스캔된 항목</span>
          </div>
          <div className="inbound-result__table-wrapper">
            <div className="inbound-result__table">
              <div className="inbound-result__table-header">
                {headerCols.map((col, idx) => {
                  if (idx === 0)
                    return (
                      <div key={col} className="inbound-result__column--no">
                        {col}
                      </div>
                    );
                  if (idx === 1)
                    return (
                      <div
                        key={col}
                        className="inbound-result__column--name"
                        style={{ textAlign: "left" }}
                      >
                        {col}
                      </div>
                    );
                  return (
                    <div key={col} className="inbound-result__column">
                      {col}
                    </div>
                  );
                })}
              </div>
              {scannedItems.map((item, idx) => {
                const originalStock = Number(item.stock) || 0;
                const qty = item.quantity;
                const displayedStock = originalStock + qty;
                const expiration = item.expirationDate?.trim() || "-";
                const manufacture = item.manufactureDate?.trim() || "-";

                return (
                  <div key={item.id} className="inbound-result__row">
                    <div className="inbound-result__cell inbound-result__cell--no">
                      {idx + 1}
                    </div>
                    <div className="inbound-result__cell inbound-result__cell--name">
                      {item.name}
                    </div>
                    <div
                      className="inbound-result__cell"
                      style={{ color: "#2E7D32" }}
                    >
                      {displayedStock}
                      {qty > 0 && (
                        <span className="inbound-result__added-quantity">
                          {`(+${qty})`}
                        </span>
                      )}
                    </div>
                    <div
                      className="inbound-result__cell"
                      style={{ color: "#2E7D32" }}
                    >
                      {expiration}
                    </div>
                    <div
                      className="inbound-result__cell"
                      style={{ color: "#2E7D32" }}
                    >
                      {manufacture}
                    </div>
                    <div className="inbound-result__cell">{item.size}</div>
                    <div className="inbound-result__cell">{item.barcode}</div>
                    <div className="inbound-result__cell">{item.category}</div>
                    <div className="inbound-result__cell">{item.source}</div>
                    <div className="inbound-result__cell">
                      {warehouse.label}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* — Footer: 뒤로가기 + 완료 버튼 — */}
      <footer className="warehouse__footer">
        <Link
          to={`/warehouses/${whId}/inbound/${sId}/info`}
          className="warehouse__back-btn"
          state={{
            scannedItems,
            expirationDateArray,
            manufactureDateArray,
            quantityArray,
          }}
        >
          ← 입고 정보
        </Link>
        <button className="warehouse__finish-btn" onClick={handleFinish}>
          완료
        </button>
        {/* hidden iframe: form.target과 name을 일치시킵니다 */}
        <iframe
          name="hidden_iframe"
          title="inbound-result-submission"
          style={{ display: "none" }}
        />
      </footer>
    </div>
  );
}
