import { Link } from "react-router-dom";
export default function Home() {
    return(
        <div className="home">
            <div className="title">
                재고 관리앱 <br /> 
                버전 1
            </div>
            <Link to="/warehouses" className="start-button">
                시작
            </Link>
        </div>
    );
}