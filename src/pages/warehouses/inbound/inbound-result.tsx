// src/pages/warehouses/inbound/inbound-result.tsx
import React from "react";
import {
  useParams,
  useLocation,
  useNavigate,
  Link,
  Navigate,
} from "react-router-dom";
import { WAREHOUSES, LocationState } from "../../../constants/warehouses";
import { db } from "../../../firebaseApp";
import {
  collection,
  doc,
  setDoc,
  getDocs,
  query,
  where,
  serverTimestamp,
} from "firebase/firestore";

export default function InboundResult() {
  // React Hooks: always at top level
  const { whId, sId } = useParams<"whId" | "sId">();
  const location = useLocation();
  const navigate = useNavigate();

  // Extract state safely
  const state = (location.state as LocationState) || {};
  const scannedItems = state.scannedItems || [];

  // Validate warehouse
  const warehouse = WAREHOUSES.find((w) => w.id === whId);
  if (!warehouse) {
    return <Navigate to="/warehouses" replace />;
  }

  // Table header labels
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

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      for (const item of scannedItems) {
        // 1) Save childitem
        const childRef = doc(collection(db, "childitem"));
        await setDoc(childRef, {
          warehouseId: whId,
          sourceWarehouseId: sId,
          barcode: item.barcode,
          name: item.name,
          expirationDate: item.expirationDate || "",
          manufactureDate: item.manufactureDate || "",
          quantity: item.quantity,
          createdAt: serverTimestamp(),
        });

        // 2) Update Parentitem
        const parentId = `${whId}_${item.barcode}`;
        const parentRef = doc(db, "Parentitem", parentId);

        // Query existing summary
        const sumQuery = query(
          collection(db, "Parentitem"),
          where("warehouseId", "==", whId),
          where("barcode", "==", item.barcode)
        );
        const snap = await getDocs(sumQuery);
        const prevStock = !snap.empty
          ? Number(snap.docs[0].data().currentStock || 0)
          : 0;
        const newStock = prevStock + item.quantity;

        // Merge update
        await setDoc(
          parentRef,
          {
            warehouseId: whId,
            barcode: item.barcode,
            name: item.name,
            size: item.size,
            category: item.category,
            currentStock: newStock,
            updatedAt: serverTimestamp(),
          },
          { merge: true }
        );
      }

      // Navigate to inventory
      navigate(`/warehouses/${whId}/inventory`);
    } catch (error) {
      console.error("Firestore write error:", error);
      alert("데이터 저장 중 오류가 발생했습니다.");
    }
  };

  return (
    <div className="inbound-result">
      <header className="warehouse__header">
        <h1 className="warehouse__title">{warehouse.label} / 입고 결과</h1>
        <Link to="/warehouses" className="warehouse__restart-btn">
          앱 재시작
        </Link>
      </header>

      <form onSubmit={onSubmit}>
        <div className="inbound-result__content">
          <div className="inbound-result__scanned">
            <div className="inbound-result__scanned-header">
              <span className="inbound-result__scanned-title">스캔된 항목</span>
            </div>
            <div className="inbound-result__table-wrapper">
              <div className="inbound-result__table">
                <div className="inbound-result__table-header">
                  {headerCols.map((col, idx) => (
                    <div
                      key={col}
                      className={
                        idx === 0
                          ? "inbound-result__column--no"
                          : idx === 1
                          ? "inbound-result__column--name"
                          : "inbound-result__column"
                      }
                    >
                      {col}
                    </div>
                  ))}
                </div>
                {scannedItems.map((item, idx) => {
                  const originalStock = Number(item.stock) || 0;
                  const qty = item.quantity;
                  const displayedStock = originalStock + qty;
                  const expiration = item.expirationDate?.trim() || "-";
                  const manufacture = item.manufactureDate?.trim() || "-";

                  return (
                    <div key={item.name} className="inbound-result__row">
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
                            (+{qty})
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
                      <div className="inbound-result__cell">
                        {item.category}
                      </div>
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
        <footer className="warehouse__footer">
          <Link
            to={`/warehouses/${whId}/inbound/${sId}/info`}
            className="warehouse__back-btn"
            state={{ scannedItems }}
          >
            ← 입고 정보
          </Link>
          <button type="submit" className="warehouse__submit-btn">
            완료
          </button>
        </footer>
      </form>
    </div>
  );
}
