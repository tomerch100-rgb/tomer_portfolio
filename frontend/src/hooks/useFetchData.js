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
            } catch (error) {
                console.error("לא הצלחנו למשוך את התיק", error)
                setError(error.message || "משהו השתבש בטעינת הנתונים");
            }
            finally {
                 setIsLoading(false)


            }
        }
        fetchMyData();
    }, [...dependencies])
    return { data, isLoading, error }

}

export default useFetchData