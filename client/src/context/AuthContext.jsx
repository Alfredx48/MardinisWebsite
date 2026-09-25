import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { api } from "../api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
	const [user, setUser] = useState(null);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		api.get("/me")
			.then(setUser)
			.catch(() => setUser(null))
			.finally(() => setLoading(false));
	}, []);

	const login = useCallback(async (email, password) => {
		const u = await api.post("/login", { email, password });
		setUser(u);
		return u;
	}, []);

	const signup = useCallback(async (attrs) => {
		const u = await api.post("/signup", attrs);
		setUser(u);
		return u;
	}, []);

	const logout = useCallback(async () => {
		await api.delete("/logout").catch(() => {});
		setUser(null);
	}, []);

	const updateProfile = useCallback(async (attrs) => {
		const u = await api.patch("/me", attrs);
		setUser(u);
		return u;
	}, []);

	return (
		<AuthContext.Provider value={{ user, loading, login, signup, logout, updateProfile }}>
			{children}
		</AuthContext.Provider>
	);
}

export const useAuth = () => useContext(AuthContext);
