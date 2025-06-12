// src/pages/inventory/inventory.tsx
import React, { useState, useEffect } from "react";
import { useParams, Navigate, Link } from "react-router-dom";
import { WAREHOUSES } from "../../constants/warehouses";
import { db } from "../../firebaseApp";
import {
  collection,
  query,
  where,
  onSnapshot,
  getDocs,
  DocumentData,
} from "firebase/firestore";

interface ParentItem extends DocumentData {
  warehouseId: string;
  barcode: string;
  name: string;
  size?: string;
  category?: string;
  currentStock: number;
  updatedAt: any;
}

interface ChildItem extends DocumentData {
  warehouseId: string;
  sourceWarehouseId?: string;
  barcode: string;
  name?: string;
  expirationDate?: string;
  manufactureDate?: string;
  quantity: number;
  createdAt: any;
}

export default function Inventory() {
  // Hooks at top level
  const { whId } = useParams<"whId">();
  const [summary, setSummary] = useState<ParentItem[]>([]);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [details, setDetails] = useState<Record<string, ChildItem[]>>({});

  // Subscribe to Parentitem collection
  useEffect(() => {
    const summaryQuery = query(
      collection(db, "Parentitem"),
      where("warehouseId", "==", whId)
    );
    const unsub = onSnapshot(summaryQuery, (snap) => {
      const items = snap.docs.map((doc) => ({
        id: doc.id,
        ...(doc.data() as ParentItem),
      }));
      setSummary(items);
    });
    return () => unsub();
  }, [whId]);

  // After hooks, handle conditional return
  const warehouse = WAREHOUSES.find((w) => w.id === whId);
  if (!warehouse) {
    return <Navigate to="/warehouses" replace />;
  }

  // Toggle expand and fetch childitem
  const toggleExpand = async (barcode: string) => {
    const next = new Set(expanded);
    if (next.has(barcode)) {
      next.delete(barcode);
      setExpanded(next);
      return;
    }
    next.add(barcode);
    setExpanded(next);
    if (!details[barcode]) {
      const childQuery = query(
        collection(db, "childitem"),
        where("warehouseId", "==", whId),
        where("barcode", "==", barcode)
      );
      const snap = await getDocs(childQuery);
      const rows = snap.docs.map((doc) => ({
        id: doc.id,
        ...(doc.data() as ChildItem),
      }));
      setDetails((prev) => ({ ...prev, [barcode]: rows }));
    }
  };

  return (
    <div className="inventory">
      <header className="warehouse__header">
        <h1 className="warehouse__title">{warehouse.label} / 재고 현황</h1>
        <Link to="/warehouses" className="warehouse__back-btn">
          ← 창고 위치
        </Link>
      </header>

      {summary.length === 0 ? (
        <div className="inventory__empty">현재 재고가 없습니다.</div>
      ) : (
        <div className="inventory__table-wrapper">
          <div className="inventory__table">
            <div className="inventory__table-header">
              <div className="inventory__col-expand" />
              <div className="inventory__col-no">번호</div>
              <div className="inventory__col-name">제품명</div>
              <div className="inventory__col">현재고</div>
              <div className="inventory__col">규격</div>
              <div className="inventory__col">바코드</div>
              <div className="inventory__col">상품분류</div>
            </div>
            {summary.map((item, idx) => (
              <React.Fragment key={item.id}>
                {/* Parent Row */}
                <div className="inventory__row">
                  <button
                    className="inventory__expand-btn"
                    onClick={() => toggleExpand(item.barcode)}
                  >
                    {expanded.has(item.barcode) ? "▼" : "▶"}
                  </button>
                  <div className="inventory__cell inventory__cell--no">
                    {idx + 1}
                  </div>
                  <div className="inventory__cell inventory__cell--name">
                    {item.name}
                  </div>
                  <div className="inventory__cell">{item.currentStock}</div>
                  <div className="inventory__cell">{item.size || "-"}</div>
                  <div className="inventory__cell">{item.barcode}</div>
                  <div className="inventory__cell">{item.category || "-"}</div>
                </div>

                {/* Child Rows */}
                {expanded.has(item.barcode) &&
                  details[item.barcode]?.map((row) => (
                    <div
                      key={row.id}
                      className="inventory__row inventory__row--detail"
                    >
                      <div className="inventory__cell inventory__cell--indent" />
                      <div className="inventory__cell inventory__cell--no">
                        –
                      </div>
                      <div className="inventory__cell inventory__cell--name">
                        {row.name || item.name}
                      </div>
                      <div className="inventory__cell">{row.quantity}</div>
                      <div className="inventory__cell">
                        {row.expirationDate || row.manufactureDate || "-"}
                      </div>
                      <div className="inventory__cell">{item.size || "-"}</div>
                      <div className="inventory__cell">{item.barcode}</div>
                      <div className="inventory__cell">
                        {item.category || "-"}
                      </div>
                    </div>
                  ))}
              </React.Fragment>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
