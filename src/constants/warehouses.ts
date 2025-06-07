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
  id: string;
  name: string;
  stock: string;
  size: string;
  barcode: string;
  category: string;
  source: string;
  dest: string;
}
// — 테스트용 초기 데이터 (없어도 무방, 컴포넌트에서 빈 배열로 시작해도 됩니다) —
//    나중에 실제 스캔 로직이 붙으면 컴포넌트 안에서 setScannedItems([...]) 해 줄 예정입니다.
export const INITIAL_SCANNED_ITEMS: ScannedItem[] = [
  // 필요하다면 더미 데이터를 추가로 넣으세요.
];

// — 상태 업데이트용 순수 함수 —
//    scannedItems 배열에서 특정 id를 제거한 새 배열을 반환합니다.
export function removeScannedItemById(
  items: ScannedItem[],
  idToRemove: string
): ScannedItem[] {
  return items.filter((it) => it.id !== idToRemove);
}

export interface ProductRow {
  ID: string;
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
  googleProducts: ProductRow[];
  sourceLabel: string;
  destLabel: string;
}
