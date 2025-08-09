import { useEffect, useState } from "react";
import { auth, ensureAnonAuth } from "../firebase";
import { onAuthStateChanged, User } from "firebase/auth";

export function useAuth() {
    const [user, setUser] = useState<User | null>(auth.currentUser);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        ensureAnonAuth().finally(() => setLoading(false));
        const unsub = onAuthStateChanged(auth, setUser);
        return unsub;
    }, []);

    return { user, loading };
}