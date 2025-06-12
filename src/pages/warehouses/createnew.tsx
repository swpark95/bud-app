// src/pages/warehouses/createnew.tsx
import React, { useState } from "react";
import { ParentItem } from "../../constants/warehouses";
import { doc, setDoc } from "firebase/firestore";
import { db } from "../../firebaseApp";

interface CreateNewProps {
  visible: boolean;
  onClose: () => void;
  onCreate: (item: ParentItem) => void;
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
  const [barcode, setBarcode] = useState<string>("");
  const [name, setName] = useState<string>("");
  const [kg, setKg] = useState<string>("");
  const [ea, setEa] = useState<string>("");
  const [category, setCategory] = useState<string>("");

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const newItem: ParentItem = {
      name,
      stock: kg || ea || "",
      size: `${kg ? kg + "kg" : ""}${kg && ea ? " * " : ""}${
        ea ? ea + "ea" : ""
      }`,
      barcode,
      category,
    };

    // Firestore에 문서 저장
    try {
      const ref = doc(db, "parentitem", name);
      await setDoc(ref, {
        ...newItem,
      });
    } catch (error) {
      console.error("Failed to save new item:", error);
    }

    onCreate(newItem);
    onClose();
  };

  if (!visible) return null;

  return (
    <div className="modal-overlay">
      <div className="modal">
        <header className="modal__header">
          <h1 className="modal__title">신규 물품 등록하기</h1>
          <button type="button" className="modal-close" onClick={onClose}>
            X
          </button>
        </header>

        <form onSubmit={onSubmit} className="form">
          <div className="modal__content">
            <div className="form-block">
              <label htmlFor="itemname">물품 이름</label>
              <input
                type="text"
                id="itemname"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="물품 이름을 입력하세요"
                required
              />
            </div>

            <div className="form-block">
              <label htmlFor="barcode">바코드</label>
              <input
                type="text"
                id="barcode"
                value={barcode}
                onChange={(e) => setBarcode(e.target.value)}
                placeholder="바코드를 입력하세요"
                required
              />
            </div>

            <div className="form-block">
              <label>규격</label>
              <div className="size-inputs">
                <input
                  type="number"
                  value={kg}
                  onChange={(e) => setKg(e.target.value)}
                  placeholder="0"
                  required={!ea}
                />
                <span>kg</span>
                <input
                  type="number"
                  value={ea}
                  onChange={(e) => setEa(e.target.value)}
                  placeholder="0"
                  required={!kg}
                />
                <span>ea</span>
              </div>
            </div>

            <div className="form-block">
              <label htmlFor="category">카테고리</label>
              <input
                type="text"
                id="category"
                list="product-categories"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="상품 분류를 선택하거나 입력하세요"
                required
              />
              <datalist id="product-categories">
                {productCategories.map((cat) => (
                  <option key={cat} value={cat} />
                ))}
              </datalist>
            </div>
          </div>

          <footer className="modal__footer">
            <button
              type="button"
              className="modal__cancel-btn"
              onClick={onClose}
            >
              취소하기
            </button>
            <button type="submit" className="modal__create-btn">
              물품정보 추가하기
            </button>
          </footer>
        </form>
      </div>
    </div>
  );
}
