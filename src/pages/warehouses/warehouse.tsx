import { useParams, Navigate, Link } from "react-router-dom";
import { WAREHOUSES } from "../../constants/warehouses";

export default function Warehouse() {
  const { whId } = useParams<"whId">();
  const warehouse = WAREHOUSES.find((w) => w.id === whId);

  // 잘못된 ID 접근 시 리스트로 보내기
  if (!warehouse) return <Navigate to="/warehouses" replace />;

  return (
    <div className="warehouse-detail">
      <header className="warehouse__header">
        <h1 className="warehouse__title">{warehouse.label} / 작업선택</h1>
        <Link to="/" className="warehouse__restart-btn">
          앱 재시작
        </Link>
      </header>
      <div className="warehouse-detail__list">
        <Link
          to={`/warehouses/${whId}/inbound`}
          className="warehouse-detail__item"
        >
          입고
        </Link>
        <Link
          to={`/warehouses/${whId}/outbound`}
          className="warehouse-detail__item"
        >
          출고
        </Link>
        <Link
          to={`/warehouses/${whId}/inventory`}
          className="warehouse-detail__item"
        >
          창고 재고 현황
        </Link>
      </div>
      {/* — Footer — */}
      <footer className="warehouse__footer">
        <Link to={`/warehouses/`} className="warehouse__back-btn">
          ← 현재 창고 위치
        </Link>
      </footer>
    </div>
  );
}
