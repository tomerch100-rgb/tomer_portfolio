import { createSlice } from "@reduxjs/toolkit";

const initialState = {
    user: null,
    isAuthenticated: false,
    isVerifying: true
}

const authSlice = createSlice({
    name: "auth",
    initialState,
    reducers: {
        loginSuccess: (state, action) => {
            state.isAuthenticated = true;
            state.user = action.payload;
            state.isVerifying = false;
        },
        logout: (state) => {
            state.isAuthenticated = false;
            state.user = null;
            state.isVerifying = false;
        },
        verificationCompleted: (state) => {
            state.isVerifying = false;
        }
    }
});

export const { loginSuccess, logout, verificationCompleted } = authSlice.actions;
export default authSlice.reducer;