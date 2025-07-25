'use client'
import {useState} from "react";
import {useRouter} from "next/navigation";
import {authService} from "@/utils/authService";
import {createUserWithEmailAndPassword} from "firebase/auth";
import {auth} from "@/firebase/firebase-client";
import {useSupabaseAuth} from "@/utils/SupabaseAuthProvider";


export default function SignupPage(){
    // initialize states
    const [email,setEmail]=useState("");
    const [password,setPassword]=useState("");
    const [loading, setLoading] = useState(false);
    const [googleLoading, setGoogleLoading] = useState(false);
    const router=useRouter();
    // Get loginWithFirebaseToken function
    const {loginWithFirebaseToken}=useSupabaseAuth();


    // implement Functions
    async function handelEmailPasswordSignUp(e) {
        e.preventDefault(); // Prevent default form submission behavior
        setLoading(true);
        try {
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            alert('Registration successful! You are now logged in.');
            const firebaseIdToken =await userCredential.user.getIdToken();
            await loginWithFirebaseToken(firebaseIdToken);
            await router.push("/drivers");
        } catch(error) {
            console.error("Error Signin Up with Email/password",error)
        } finally {
            setLoading(false)
        }
    }

    async function handelGoogleSignUp() {
        setGoogleLoading(true);
        try {
            await authService.registerWithGoogle();
            alert('Registration successful! You are now logged in.');
            await router.push("/students")

        } catch (error) {
            console.error("Error Signin Up with Google", error);
        } finally {
            setGoogleLoading(false)

        }
    }

    // core component
    return(
        <div className="flex flex-col  justify-center items-center min-h-screen">
            <form className="w-80  " onSubmit={handelEmailPasswordSignUp}>
                <div className="mb-3">
                    <input type="email" value={email} onChange={(e)=>{setEmail(e.target.value)}} placeholder="Entrer Email" className="border rounded-sm w-full p-2"/>
                </div>
                <div className="mb-5">
                    <input type="password" value={password} onChange={(e)=>{setPassword(e.target.value)}} placeholder="Entrer password"  className="border rounded-sm w-full p-2"/>
                </div>
                <div className="mb-3">
                    <button className="signup_button" type="submit">
                         {loading ? "Insecription...": "s'inscrire"}
                    </button>
                </div>

            </form>
            {/*   S'inscrire avec Google  */}
            <button className="google_button" onClick={handelGoogleSignUp} >
                <svg width="18" height="18" viewBox="0 0 24 24">
                    <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                    <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
                 {googleLoading ? "Insecription...": "\"S'inscrire avec Google\""}
            </button>
            <div style={{ textAlign: "center", marginTop: "1rem" }}>
                <span style={{ color: "#666" }}>Déjà un compte ? </span>
                <a href="/signin" style={{ color: "#007bff", textDecoration: "none" }}>
                    Se connecter
                </a>
            </div>
        </div>
    )

}
