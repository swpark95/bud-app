// src/pages/warehouses/addmanual.tsx
import React, { useState, useMemo } from "react";
import {
  ScannedItem,
  AddManualProps,
  ProductRow,
} from "../../constants/warehouses";
import CreateNew from "./createnew";

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

  // 신규: CreateNew 모달 표시 상태
  const [showCreateNew, setShowCreateNew] = useState(false);

  // 신규: 카테고리 리스트 (중복 제거)
  const productCategories = useMemo(
    () =>
      Array.from(
        new Set(
          googleProducts
            .map((p: ProductRow) => (p.카테고리 ?? "").trim())
            .filter((c) => c !== "")
        )
      ),
    [googleProducts]
  );

  const results = useMemo(() => {
    return googleProducts.filter((prod) => {
      const cleanProd = (prod.바코드 ?? "").trim().replace(/[^0-9]/g, "");
      return cleanProd.includes(cleanQuery);
    });
  }, [cleanQuery, googleProducts]);

  if (!visible) return null;

  return (
    <>
      <div className="modal-overlay">
        <div className="modal">
          <header className="modal__header">
            <h1 className="modal__title">직접 추가하기</h1>
            <button className="modal-close" onClick={onClose}>
              X
            </button>
          </header>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="바코드 검색"
          />

          {cleanQuery && results.length === 0 && (
            <div className="no-results">
              <button
                className="register-new"
                onClick={() => setShowCreateNew(true)}
              >
                + 신규 물품 등록하기
              </button>
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

        {/* 신규 등록 모달 연결 */}
        <CreateNew
          visible={showCreateNew}
          onClose={() => setShowCreateNew(false)}
          onCreate={(newItem) => onAdd(newItem)}
          sourceLabel={sourceLabel}
          destLabel={destLabel}
          productCategories={productCategories}
        />
      </div>
    </>
  );
}
