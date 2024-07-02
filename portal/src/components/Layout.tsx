import { useFormioContext } from "@formio/react";
import { ReactNode } from "react";
import { useHashLocation } from "wouter/use-hash-location";
export const Layout = ({
    children,
    onInfoPanelClick,
    onLogoutClick,
}: {
    children: ReactNode;
    onInfoPanelClick: () => void;
    onLogoutClick: () => void;
}) => {
    const setLocation = useHashLocation()[1];
    const { isAuthenticated } = useFormioContext();
    return (
        <main>
            <header className="remember-focus">
                <div className="header-title-wrap">
                    <a onClick={() => setLocation("/")} className="logo">
                        <img src="logo-formio-horizontal-lightbg.svg" alt="" />
                    </a>
                    <div className="header-title"></div>
                </div>
                {isAuthenticated && (
                    <div className="right-buttons">
                        <button
                            type="button"
                            onClick={onInfoPanelClick}
                            title="Show/Hide Context For This Screen"
                            className="togglecontext"
                        >
                            <i className="ri-arrow-right-s-line"></i>Info Panel
                        </button>
                        <a onClick={onLogoutClick} className="logout">
                            Logout<i className="ri-login-box-line"></i>
                        </a>
                    </div>
                )}
            </header>
            {children}
        </main>
    );
};
