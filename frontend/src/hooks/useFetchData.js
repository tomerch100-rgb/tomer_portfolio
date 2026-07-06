import { useState, useEffect } from "react";

function useFetchData(apiFunction, dependencies = []) {

    const [data, setData] = useState([])
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState(null);

    useEffect(() => {

        const fetchMyData = async () => {
            setError(null)
            try {
                const data = await apiFunction()
                setData(data)
                setIsLoading(false)
            } catch (error) {
                console.error("לא הצלחנו למשוך את התיק", error)
                setError(error.message || "משהו השתבש בטעינת הנתונים");
                setIsLoading(false);
            }
        }
        fetchMyData();
    }, [apiFunction])
    return { data, isLoading, error }

}

export default useFetchData