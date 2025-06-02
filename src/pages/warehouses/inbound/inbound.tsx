import { useParams, Navigate, Link} from "react-router-dom";
import { WAREHOUSES,SOURCES } from "../../../constants/warehouses";


export default function Inbound() {
    // 이 페이지엔 sId가 없고 whId만 존재
    const { whId } = useParams<"whId">();
    const warehouse = WAREHOUSES.find(w => w.id === whId);
  
    // 잘못된 whId면 창고 목록으로
    if (!warehouse) return <Navigate to="/warehouses" replace />;
  
    return (
      <div className="inbound">
        <header className="warehouse__header">
        <h1 className="warehouse__title">{warehouse.label} / 출발지 설정</h1>
        <Link to="/" className="warehouse__restart-btn">
          앱 재시작
        </Link >  
        </header>
  
        <div className="inbound__list">
          {SOURCES.map(s => (
            <Link
              key={s.id}
              to={`/warehouses/${whId}/inbound/${s.id}`}
              className="inbound__item"
            >
              {s.label}
            </Link>
          ))}
        </div>
        {/* — Footer — */}
        <footer className="warehouse__footer">
          <Link
          to={`/warehouses/${whId}`}
          className="warehouse__back-btn"
          >
          ← 작업선택
          </Link>
        </footer>
      </div>
    );
  }