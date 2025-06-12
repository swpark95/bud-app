export const WAREHOUSES = [
  { id: "main", label: "본점 창고" },
  { id: "tongyeong", label: "통영점 창고" },
];

export const SOURCES = [
  { id: "store-main", label: "본점 매장" },
  { id: "store-aju", label: "아주점 매장" },
  { id: "store-tongyeong", label: "통영점 매장" },
  { id: "warehouse-tongyeong", label: "통영점 창고" },
];

export interface ScannedItem {
  name: string;
  stock: string;
  size: string;
  barcode: string;
  category: string;
  source: string;
  dest: string;
}

export interface ParentItem {
  name: string;
  stock: string;
  size: string;
  barcode: string;
  category: string;
}

export interface ResultItem extends ScannedItem {
  expirationDate: string;
  manufactureDate: string;
  quantity: number;
}

export function removeScannedItemById(
  items: ScannedItem[],
  idToRemove: string
): ScannedItem[] {
  return items.filter((it) => it.name !== idToRemove);
}

export interface ProductRow {
  상품명: string;
  현재고: string;
  유통기한: string;
  제조일자: string;
  규격: string;
  바코드: string;
  카테고리: string;
}

export interface AddManualProps {
  visible: boolean;
  onClose: () => void;
  onAdd: (item: ScannedItem) => void;
  sourceLabel: string;
  destLabel: string;
  parentItem: ParentItem[];
}

export interface CreateNewProps {
  visible: boolean;
  onClose: () => void;
  onCreate: (item: ScannedItem) => void;
  sourceLabel: string;
  destLabel: string;
  productCategories: string[];
}

// ResultItem: ScannedItem에 유통기한, 제조일자, 수량 정보를 추가한 타입

// InboundInfo로부터 넘어올 때 받게 될 state 정의
export interface LocationState {
  scannedItems: ResultItem[];
  selectedDate?: ("유통기한" | "제조일자")[];
  expirationDate?: string[];
  manufactureDate?: string[];
  quantity?: number[];
}
