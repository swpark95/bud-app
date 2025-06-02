import { Link } from "react-router-dom";
import { WAREHOUSES } from "../../constants/warehouses";

export default function WarehouseList() {
    return(
    <div className="warehouse">
        <header className="warehouse__header">
            <h1 className="warehouse__title">현재 창고 위치</h1>
            <Link to="/" className="warehouse__restart-btn">
                앱 재시작
            </Link>
        </header>

        <div className="warehouse__list">
            {WAREHOUSES.map(w=> (
                <Link key={w.id} to={`/warehouses/${w.id}`} className="warehouse__item">
                    {w.label}
                </Link>
            ))}
        </div>
    </div>
    )
}

