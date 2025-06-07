// src/pages/warehouses/addmanual.tsx
import React, { useState, useMemo } from "react";
import { ScannedItem, ProductRow } from "../../constants/warehouses";

interface AddManualProps {
  visible: boolean;
  onClose: () => void;
  onAdd: (item: ScannedItem) => void;
  googleProducts: ProductRow[];
  sourceLabel: string;
  destLabel: string;
}

export default function AddManual({
  visible,
  onClose,
  onAdd,
  googleProducts,
  sourceLabel,
  destLabel,
}: AddManualProps) {
  const [query, setQuery] = useState("");
  const cleanQuery = query.trim().replace(/[^0-9]/g, "");

  const results = useMemo(() => {
    return googleProducts.filter((prod) => {
      const cleanProd = (prod.바코드 ?? "").trim().replace(/[^0-9]/g, "");
      return cleanProd.includes(cleanQuery);
    });
  }, [cleanQuery, googleProducts]);

  if (!visible) return null;

  return (
    <div className="modal-overlay">
      <div className="modal">
        <button className="modal-close" onClick={onClose}>
          X
        </button>
        <h2>직접 추가하기</h2>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="바코드 검색"
        />

        {cleanQuery && results.length === 0 && (
          <div className="no-results">
            <button className="register-new">+ 신규 물품 등록하기</button>
          </div>
        )}

        <ul className="search-results">
          {results.map((prod, idx) => {
            const cleanProdBarcode = (prod.바코드 ?? "")
              .trim()
              .replace(/[^0-9]/g, "");

            const item: ScannedItem = {
              id: (prod.ID ?? "").trim(),
              name: (prod.상품명 ?? "").trim(),
              stock: (prod.현재고 ?? "").trim(),
              size: (prod.규격 ?? "").trim(),
              barcode: cleanProdBarcode,
              category: (prod.카테고리 ?? "").trim(),
              source: sourceLabel,
              dest: destLabel,
            };

            return (
              <li key={`${cleanProdBarcode}-${idx}`}>
                <span>
                  {cleanProdBarcode}
                  {prod.상품명 ? ` / ${prod.상품명.trim()}` : ""}
                </span>
                <button onClick={() => onAdd(item)}>+ 추가</button>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
