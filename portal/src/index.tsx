import { createRoot } from "react-dom/client";
import { StrictMode } from "react";
import { FormioProvider } from "@formio/react";
import App from "./components/App";
import { InfoPanelProvider } from "./hooks/useInfoPanelContext";
import "remixicon/fonts/remixicon.css";

const el = document.getElementById("root");
if (!el) {
    throw new Error("Root element not found");
}
const root = createRoot(el);
root.render(
    <StrictMode>
        <FormioProvider baseUrl="http://localhost:3001">
            <InfoPanelProvider>
                <App />
            </InfoPanelProvider>
        </FormioProvider>
    </StrictMode>
);
