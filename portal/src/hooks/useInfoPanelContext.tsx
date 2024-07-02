import { createContext, useContext, useState, ReactNode } from "react";
import { useBodyClassName } from "./useBodyClassName";

const useInfoPanel = () => {
    const [isOpen, setIsOpen] = useState(false);
    useBodyClassName(isOpen ? "" : "context-toggled");

    return { isOpen, setIsOpen };
};

const InfoPanelContext = createContext<ReturnType<typeof useInfoPanel> | null>(
    null
);

export const useInfoPanelContext = () => {
    const panel = useContext(InfoPanelContext);

    if (!panel) {
        throw new Error(
            "useInfoPanelContext must be used within a InfoPanelProvider component."
        );
    }
    return panel;
};

export const InfoPanelProvider = ({ children }: { children: ReactNode }) => {
    const panel = useInfoPanel();

    return (
        <InfoPanelContext.Provider value={panel}>
            {children}
        </InfoPanelContext.Provider>
    );
};
