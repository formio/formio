import { createRoot } from "react-dom/client";
import { StrictMode } from "react";
import { Formio } from "@formio/js";
import { FormioProvider } from "@formio/react";

import { AdditionalComponentsModule } from "./module";
import App from "./components/App";
import { InfoPanelProvider } from "./hooks/useInfoPanelContext";
import "remixicon/fonts/remixicon.css";

Formio.use(AdditionalComponentsModule);
const el = document.getElementById("root");
if (!el) {
    throw new Error("Root element not found");
}
const root = createRoot(el);
root.render(
    <StrictMode>
        {/* Since this portal is built to be hosted by the OSS Form.io server, we set baseUrl to a whitespace character to ensure that all calls to the API use relative URL paths */}
        <FormioProvider Formio={Formio} baseUrl=" ">
            <InfoPanelProvider>
                <App />
            </InfoPanelProvider>
        </FormioProvider>
    </StrictMode>
);
