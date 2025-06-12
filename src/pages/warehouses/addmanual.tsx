// src/pages/warehouses/addmanual.tsx

import { collection, getDocs } from "firebase/firestore";
import { db } from "../../firebaseApp";
import { useEffect, useState, useMemo } from "react";
import { AddManualProps, ParentItem } from "../../constants/warehouses";
import CreateNew from "./createnew";

export default function AddManual({
  visible,
  onClose,
  onAdd,
  sourceLabel,
  destLabel,
  parentItem,
}: AddManualProps) {
  const [inputValue, setInputValue] = useState("");

  const [searchQuery, setSearchQuery] = useState("");

  const [parentItems, setParentItems] = useState<ParentItem[]>([]);
  // 신규 등록 모달 상태
  const [showCreateNew, setShowCreateNew] = useState<boolean>(false);

  const [isComposing, setIsComposing] = useState(false); // 조합 중 플래그
  // ① 카테고리 리스트 (중복 제거)
  const productCategories = useMemo<string[]>(() => {
    return Array.from(
      new Set(
        parentItem
          .map((item: ParentItem) => item.category?.trim() ?? "")
          .filter((c: string) => c !== "")
      )
    );
  }, [parentItem]);

  // ② 검색 결과: barcode 또는 name 포함 여부
  const results = useMemo(() => {
    const raw = searchQuery.trim().toLowerCase();
    const num = raw.replace(/[^0-9]/g, "");
    if (!raw) return parentItems;
    return parentItems.filter((item) => {
      const byCode = num ? item.barcode.includes(num) : false;
      const byName = item.name.toLowerCase().includes(raw);
      return byCode || byName;
    });
  }, [searchQuery, parentItems]);

  // 모든 훅을 조건부 반환 전에 호출
  const getParentItems = async () => {
    const datas = await getDocs(collection(db, "parentitem"));
    const fetchedItems: ParentItem[] = [];
    datas.forEach((doc) => {
      fetchedItems.push(doc.data() as ParentItem);
    });
    setParentItems(fetchedItems);
  };

  useEffect(() => {
    getParentItems();
  }, []);

  // 조건부 반환을 모든 훅 호출 후에 배치
  if (!visible) return null;

  // 검색 결과에서 선택했을 때 호출되는 함수
  const handleAdd = (item: ParentItem) => {
    onAdd({
      ...item,
      source: sourceLabel,
      dest: destLabel,
    });
  };

  return (
    <>
      <div className="modal-overlay">
        <div className="modal">
          <header className="modal__header">
            <h1 className="modal__title">직접 추가하기</h1>
            <button type="button" className="modal-close" onClick={onClose}>
              X
            </button>
          </header>

          <div className="modal__content">
            <input
              type="text"
              value={inputValue}
              placeholder="물품명 혹은 바코드 검색"
              onCompositionStart={() => {
                setIsComposing(true);
              }}
              onCompositionEnd={(e) => {
                setIsComposing(false);
                const v = e.currentTarget.value;
                setSearchQuery(v); // 조합이 끝난 최종 값으로 검색 쿼리 업데이트
              }}
              onChange={(e) => {
                const v = e.target.value;
                setInputValue(v); // 화면엔 바로 반영
                if (!isComposing) {
                  setSearchQuery(v); // 조합 중이 아니면 즉시 검색에도 반영
                }
              }}
            />

            {searchQuery.trim() && results.length === 0 && (
              <div className="no-results">
                <button
                  type="button"
                  className="register-new"
                  onClick={() => setShowCreateNew(true)}
                >
                  + 신규 물품 등록하기
                </button>
              </div>
            )}

            <ul className="search-results">
              {results.map((item, idx) => (
                <li key={`${item.barcode}-${idx}`}>
                  <span>
                    {item.barcode} / {item.name}
                  </span>
                  <button type="button" onClick={() => handleAdd(item)}>
                    + 추가
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
      {/* 신규 등록 모달 */}
      <CreateNew
        visible={showCreateNew}
        onClose={() => setShowCreateNew(false)}
        onCreate={handleAdd}
        sourceLabel={sourceLabel}
        destLabel={destLabel}
        productCategories={productCategories}
      />
    </>
  );
}
