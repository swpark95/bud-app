// src/pages/warehouses/createnew.tsx
import React, { useState } from "react";
import { ScannedItem } from "../../constants/warehouses";

export interface CreateNewProps {
  visible: boolean;
  onClose: () => void;
  onCreate: (item: ScannedItem) => void;
  sourceLabel: string;
  destLabel: string;
  productCategories: string[];
}

export default function CreateNew({
  visible,
  onClose,
  onCreate,
  sourceLabel,
  destLabel,
  productCategories,
}: CreateNewProps) {
  const [barcode, setBarcode] = useState("");
  const [name, setName] = useState("");
  const [weight, setWeight] = useState("");
  const [count, setCount] = useState("");
  const [category, setCategory] = useState("");

  if (!visible) return null;

  const handleSubmit = () => {
    const cleanBarcode = barcode.trim().replace(/[^0-9]/g, "");
    const item: ScannedItem = {
      id: cleanBarcode,
      name: name.trim(),
      stock: "0",
      size: `${weight.trim()}KG ${count.trim()}EA`,
      barcode: cleanBarcode,
      category: category.trim(),
      source: sourceLabel,
      dest: destLabel,
    };

    // React 상태에만 추가
    onCreate(item);

    // 폼 초기화 및 모달 닫기
    setBarcode("");
    setName("");
    setWeight("");
    setCount("");
    setCategory("");
    onClose();
  };

  return (
    <div className="modal-overlay">
      <div className="modal">
        <header className="modal__header">
          <h1 className="modal__title">신규 물품 등록하기</h1>
          <button className="modal-close" onClick={onClose}>
            X
          </button>
        </header>
        <div className="modal__content">
          <div className="form-group">
            <label>바코드</label>
            <input
              type="text"
              value={barcode}
              onChange={(e) => setBarcode(e.target.value)}
              placeholder="바코드를 입력하세요"
            />
          </div>
          <div className="form-group">
            <label>물품 이름</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="물품 이름을 입력하세요"
            />
          </div>
          <div className="form-group">
            <label>규격</label>
            <div className="size-inputs">
              <input
                type="number"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                placeholder="0"
              />
              <span>KG</span>
              <input
                type="number"
                value={count}
                onChange={(e) => setCount(e.target.value)}
                placeholder="0"
              />
              <span>EA</span>
            </div>
          </div>
          <div className="form-group">
            <label>카테고리</label>
            <input
              list="category-list"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="상품분류를 선택하거나 입력하여 만드세요"
            />
            <datalist id="category-list">
              {productCategories.map((cat) => (
                <option key={cat} value={cat} />
              ))}
            </datalist>
          </div>
        </div>
        <footer className="modal__footer">
          <button className="modal__cancel-btn" onClick={onClose}>
            취소하기
          </button>
          <button
            className="modal__create-btn"
            onClick={handleSubmit}
            disabled={!barcode || !name || !category}
          >
            물품정보 추가하기
          </button>
        </footer>
      </div>
    </div>
  );
}
