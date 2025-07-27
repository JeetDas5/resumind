import {usePuterStore} from "~/lib/puter";
import {useEffect} from "react";
import {useLocation, useNavigate} from "react-router";

export const meta = () => ([{title: "Resumind | Auth"}, {name: "description", content: "Log in to your account"},])

const Auth = () => {
    const {isLoading, auth} = usePuterStore();
    const location = useLocation();
    const next = location.search.split("next=")[1];
    const navigate = useNavigate();

    useEffect(() => {
        if (auth.isAuthenticated) navigate(next);
    }, [auth.isAuthenticated, next]);

    return (<main className="bg-[url('/images/bg-main.svg')] bg-cover min-h-screen flex items-center justify-center">
        <div className="gradient-border shadow-lg">
            <section className="flex flex-col gap-8 rounded-2xl p-10">
                <div className="flex flex-col items-center gap-2 text-center">
                    <h1 className="text-4xl max-sm:text-2xl">Welcome</h1>
                    <h2 className="text-xl max-sm:text-base">Log In to Continue Your Job Journey</h2>
                </div>
                <div>
                    {isLoading ? (<button className="auth-button animate-pulse w-[500px] text-2xl py-3">
                        <p>Signing you in...</p>
                    </button>) : (<>
                        {auth.isAuthenticated ? (<button className="auth-button w-[500px] text-2xl py-3" onClick={() => auth.signOut()}>
                            <p>Log out</p></button>) : (<button className="auth-button w-[500px] text-2xl py-3" onClick={() => auth.signIn()}>
                            <p>Log in</p></button>)}
                    </>)}
                </div>
            </section>
        </div>
    </main>);
};

export default Auth;
