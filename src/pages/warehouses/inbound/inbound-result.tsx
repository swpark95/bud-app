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

  // LocationState가 없으면 null, 있으면 캐스팅
  const state = (location.state as LocationState) || null;

  // InboundInfo에서 전달된 스캔된 아이템, 유통기한 배열, 제조일자 배열, 수량 배열 가져오기
  const scannedItems = state?.scannedItems || [];
  const expirationDateArray = state?.expirationDateArray || [];
  const manufactureDateArray = state?.manufactureDateArray || [];
  const quantityArray = state?.quantityArray || [];

  // 잘못된 창고ID면 창고 목록으로 되돌아감
  const warehouse = WAREHOUSES.find((w) => w.id === whId);
  if (!warehouse) {
    return <Navigate to="/warehouses" replace />;
  }

  // 스캔된 항목이 없으면 InboundInfo 페이지로 리다이렉트
  if (scannedItems.length === 0) {
    return <Navigate to={`/warehouses/${whId}/inbound/${sId}`} replace />;
  }

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
      <div className="inbound-result__content">
        <div className="inbound-result__scanned">
          <div className="inbound-result__scanned-header">
            <span className="inbound-result__scanned-title">스캔된 항목</span>
          </div>

          <div className="inbound-result__table-wrapper">
            <div className="inbound-result__table">
              <div className="inbound-result__table-header">
                {headerCols.map((col, idx) => {
                  if (idx === 0) {
                    return (
                      <div key={col} className="inbound-result__column--no">
                        {col}
                      </div>
                    );
                  } else if (idx === 1) {
                    return (
                      <div
                        key={col}
                        className="inbound-result__column--name"
                        style={{ textAlign: "left" }}
                      >
                        {col}
                      </div>
                    );
                  } else {
                    return (
                      <div key={col} className="inbound-result__column">
                        {col}
                      </div>
                    );
                  }
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
                    {/* 번호 */}
                    <div className="inbound-result__cell inbound-result__cell--no">
                      {idx + 1}
                    </div>

                    {/* 제품명 */}
                    <div className=" inbound-result__cell inbound-result__cell--name">
                      {item.name}
                    </div>

                    {/* 현재고 (+입고수량) */}
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

                    {/* 유통기한 */}
                    <div
                      className="inbound-result__cell"
                      style={{ color: "#2E7D32" }}
                    >
                      {expiration}
                    </div>

                    {/* 제조일자 */}
                    <div
                      className="inbound-result__cell"
                      style={{ color: "#2E7D32" }}
                    >
                      {manufacture}
                    </div>

                    {/* 규격 */}
                    <div className="inbound-result__cell">{item.size}</div>

                    {/* 바코드 */}
                    <div className="inbound-result__cell">{item.barcode}</div>

                    {/* 상품분류 */}
                    <div className="inbound-result__cell">{item.category}</div>

                    {/* 출발지 */}
                    <div className="inbound-result__cell">{item.source}</div>

                    {/* 도착지 */}
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
        {/* 완료 시 시트에 한꺼번에 POST + 페이지 이동 */}
        <button
          className="warehouse__finish-btn"
          onClick={() => {
            // 1) ResultItem 배열을 payload로 직렬화
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

            // 2) 동적 form 생성
            const form = document.createElement("form");
            form.method = "POST";
            form.action =
              "https://script.google.com/macros/s/AKfycbw59zmMpPH0fDr7-Nn5ptkDGqd4Dc5llY6HD921ahQc9uSNwOBDDRAO-n73kjYFcQB30Q/exec"; // 배포된 URL
            form.target = "hidden_iframe";

            // 3) payload input 추가
            const inp = document.createElement("input");
            inp.type = "hidden";
            inp.name = "payload";
            inp.value = payload;
            form.appendChild(inp);

            document.body.appendChild(form);
            form.submit();
            document.body.removeChild(form);

            // 4) 화면 전환
            navigate("/warehouses");
          }}
        >
          완료
        </button>
        {/* 숨은 iframe: name은 form.target과 일치 */}
        <iframe
          name="hidden_iframe"
          title="inbound-result-submission"
          style={{ display: "none" }}
        />
      </footer>
    </div>
  );
}
