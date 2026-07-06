
function Btn({ text, onclick, type, design }) {
    const defaultDesign = "px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-medium rounded-lg transition-all duration-200 shadow-lg shadow-emerald-900/20 active:scale-95";
    return (
        <button 
            className={design || defaultDesign} 
            type={type || "button"} 
            onClick={onclick}
        >
            {text}
        </button>
    );
}

export default Btn