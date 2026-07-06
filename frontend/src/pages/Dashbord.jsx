import { useSelector } from "react-redux"
import { disiplyPortfolio } from "../service/dashbordService";
import useFetchData from "../hooks/useFetchData";

function Dashbord() {
    const user = useSelector((state) => state.auth.user)
    const { data: portfolio, isLoading } = useFetchData(disiplyPortfolio)

    return (
        <div style={{ padding: "20px" }} className="text-white">
            <h2>התיק של {user?.username || "אורח"}</h2>

            {isLoading ? (
                <p>טוען את המניות שלך מהשרת...</p>
            ) : (
                <ul>
                    {Array.isArray(portfolio) ? (
                        portfolio.map((stock, index) => (
                            <li key={index}>
                                {stock.ticker} - ${stock.current_price || stock.currnet_price}
                            </li>
                        ))
                    ) : (
                        <li className="text-rose-400 text-sm">
                            התקבלה תשובה לא צפויה מהשרת: {JSON.stringify(portfolio)}
                        </li>
                    )}
                </ul>
            )}
        </div>
    )
}

export default Dashbord;
