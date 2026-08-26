import { useForm } from "react-hook-form";
import { useState } from "react";
import { registerCheck, login } from "../services/authService";
import { useNavigate, Link } from "react-router-dom";
import { useDispatch } from "react-redux";
import { loginSuccess } from "../store/authSlice";
import Btn from "../components/Btn";
import { TrendingUp, User, Lock, Mail, Eye, EyeOff, AlertCircle, Loader2, ArrowRight } from "lucide-react";

function RegisterForm() {
    const [show, setshow] = useState(false);
    const [authError, setAuthError] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    const dispatch = useDispatch();
    const navigate = useNavigate();

    const showPassword = () => {
        setshow(!show);
    };

    const newUser = () => {
        navigate("/login");
    };

    const { register, handleSubmit, formState: { errors } } = useForm();

    const onSubmit = async (data) => {
        setIsLoading(true);
        setAuthError("");

        try {
            const regResponse = await registerCheck(data);
            console.log("תשובת הרשמה:", regResponse);

            if (typeof regResponse === "string" && regResponse.includes("Username already exists")) {
                setAuthError("שם המשתמש כבר קיים במערכת. נא לבחור שם משתמש אחר.");
                return;
            }

            // Auto-login immediately after registration with the provided credentials
            const loginResponse = await login({
                username: data.username,
                password: data.password,
            });

            if (loginResponse?.access_token) {
                localStorage.setItem("access_token", loginResponse.access_token);
            }

            dispatch(loginSuccess(loginResponse));
            navigate('/dashbord', {
                replace: true,
                state: { message: "נרשמת והתחברת בהצלחה!" }
            });

        } catch (error) {
            console.error("ההרשמה או ההתחברות האוטומטית נכשלה:", error);
            const detail = error.response?.data?.detail;
            if (!error.response) {
                setAuthError("שגיאת תקשורת: השרת אינו מגיב.");
            } else {
                setAuthError(typeof detail === "string" ? detail : "שגיאה ברישום החשבון. נא לנסות שנית.");
            }
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950 flex items-center justify-center p-4 selection:bg-emerald-500/30 selection:text-emerald-400">
            <div className="w-full max-w-md bg-zinc-900/40 backdrop-blur-xl border border-zinc-800/80 rounded-2xl p-6 sm:p-8 shadow-2xl shadow-black/40">

                {/* Back to Home Navigation */}
                <div className="mb-6 flex justify-start" dir="rtl">
                    <Link
                        to="/"
                        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-zinc-900/80 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 text-xs sm:text-sm font-medium text-zinc-400 hover:text-white transition-all duration-200 group shadow-sm cursor-pointer"
                    >
                        <ArrowRight className="w-4 h-4 text-zinc-400 group-hover:text-emerald-400 transition-transform group-hover:translate-x-0.5" />
                        <span>חזרה לדף הבית</span>
                    </Link>
                </div>

                {/* Brand Header */}
                <div className="flex flex-col items-center mb-8">
                    <div className="w-12 h-12 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center justify-center mb-3 shadow-inner">
                        <TrendingUp className="w-6 h-6 text-emerald-500" />
                    </div>
                    <h1 className="text-3xl font-extrabold tracking-tight text-white">
                        Tomer<span className="text-emerald-500">Vest</span>
                    </h1>
                    <p className="text-sm text-zinc-400 mt-1.5 font-medium">יצירת חשבון חדש</p>
                </div>

                {/* Dynamic Auth Error Message Alert Banner */}
                {authError && (
                    <div className="mb-6 bg-rose-950/40 border border-rose-800/60 rounded-xl p-3.5 flex items-center gap-3 text-rose-300 text-xs font-medium animate-fadeIn shadow-lg shadow-rose-950/20" dir="rtl">
                        <AlertCircle className="w-5 h-5 text-rose-400 flex-shrink-0" />
                        <span className="leading-relaxed">{authError}</span>
                    </div>
                )}

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">

                    {/* Username Field */}
                    <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider block">Username</label>
                        <div className="relative">
                            <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                                <User className="h-5 w-5 text-zinc-500" />
                            </span>
                            <input
                                {...register("username", {
                                    required: "username is required",
                                    minLength: {
                                        value: 4,
                                        message: "username must be at least 4 characters long"
                                    }
                                })}
                                type="text"
                                placeholder="שם משתמש חדש"
                                className="w-full pl-10 pr-4 py-3 bg-zinc-900/60 border border-zinc-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-xl text-zinc-100 placeholder-zinc-600 focus:outline-none transition-all duration-200"
                            />
                        </div>
                        {errors.username && (
                            <p className="text-xs text-rose-500 font-medium mt-1">{errors.username.message}</p>
                        )}
                    </div>

                    {/* Email Field */}
                    <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider block">Email Address</label>
                        <div className="relative">
                            <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                                <Mail className="h-5 w-5 text-zinc-500" />
                            </span>
                            <input
                                {...register("email", {
                                    required: "Email is required",
                                    pattern: {
                                        value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                                        message: "invalid email address"
                                    }
                                })}
                                type="email"
                                placeholder="example@domain.com"
                                className="w-full pl-10 pr-4 py-3 bg-zinc-900/60 border border-zinc-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-xl text-zinc-100 placeholder-zinc-600 focus:outline-none transition-all duration-200"
                            />
                        </div>
                        {errors.email && (
                            <p className="text-xs text-rose-500 font-medium mt-1">{errors.email.message}</p>
                        )}
                    </div>

                    {/* Password Field */}
                    <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider block">Password</label>
                        <div className="relative">
                            <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                                <Lock className="h-5 w-5 text-zinc-500" />
                            </span>
                            <input
                                {...register("password", {
                                    required: "Password is required",
                                    minLength: {
                                        value: 8,
                                        message: "Password must be at least 8 characters long"
                                    },
                                    validate: {
                                        hasLettersAndNumbers: (value) =>
                                            (/[a-zA-Z]/.test(value) && /\d/.test(value)) ||
                                            "הסיסמה חייבת לכלול לפחות אות אחת ומספר אחד"
                                    }
                                })}
                                type={show ? "text" : "password"}
                                placeholder="בחר סיסמה מאובטחת"
                                className="w-full pl-10 pr-12 py-3 bg-zinc-900/60 border border-zinc-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-xl text-zinc-100 placeholder-zinc-600 focus:outline-none transition-all duration-200"
                            />
                            <button
                                type="button"
                                onClick={showPassword}
                                className="absolute inset-y-0 right-0 pr-3 flex items-center text-zinc-500 hover:text-zinc-300 transition-colors cursor-pointer"
                            >
                                {show ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                            </button>
                        </div>
                        {errors.password && (
                            <p className="text-xs text-rose-500 font-medium mt-1">{errors.password.message}</p>
                        )}
                    </div>

                    {/* Action Buttons */}
                    <div className="pt-2 space-y-3">
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 active:scale-[0.98] disabled:bg-zinc-800 disabled:text-zinc-500 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-all duration-200 shadow-lg shadow-emerald-950/20 cursor-pointer flex items-center justify-center gap-2"
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    <span>יוצר חשבון...</span>
                                </>
                            ) : (
                                <span>יצירת חשבון</span>
                            )}
                        </button>

                        <div className="relative flex py-2 items-center">
                            <div className="flex-grow border-t border-zinc-800"></div>
                            <span className="flex-shrink mx-4 text-zinc-500 text-xs font-semibold uppercase tracking-wider">או</span>
                            <div className="flex-grow border-t border-zinc-800"></div>
                        </div>

                        <Btn
                            text="יש לך כבר משתמש? לחץ כאן"
                            onclick={newUser}
                            type="button"
                            design="w-full py-3 bg-zinc-800/80 hover:bg-zinc-800 text-zinc-200 hover:text-white font-medium rounded-xl transition-all duration-200 border border-zinc-700/50 cursor-pointer"
                        />
                    </div>

                </form>
            </div>
        </div>
    );
}

export default RegisterForm;